import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { analyzePhoto, analyzePhotoWithTimeout, smartSelectAnalysisMode } from '../analysis/photo-analyzer.js';
import { logger } from '../utils/logger.js';
import { writeJson } from '../utils/file-utils.js';
import {
  loadCheckpoint,
  saveCheckpoint,
  validateCheckpoint,
  deleteCheckpoint,
  initializeCheckpoint,
  updateCheckpoint
} from './checkpoint-manager.js';
import { validatePhoto, SUPPORTED_FORMATS } from './photo-validator.js';
import { classifyError, ErrorType, getActionableMessage } from '../utils/error-classifier.js';

/**
 * Process a batch of photos in a directory
 * @param {string} photosDirectory - Directory containing photos
 * @param {Object} analysisPrompt - Analysis prompt with criteria
 * @param {Object} options - Processing options
 * @param {Object} openCallConfig - Open call configuration (for checkpoint validation)
 * @returns {Promise<Object>} Batch processing results
 */
export async function processBatch(photosDirectory, analysisPrompt, options = {}, openCallConfig = null) {
  const {
    outputDir = null,
    parallel = 3,
    skipExisting = false,
    checkpointInterval = 10,
    clearCheckpoint = false,
    analysisMode = 'auto' // ADR-014: smart auto-selection as default
  } = options;

  // Determine project directory (parent of photos directory)
  const projectDir = dirname(photosDirectory);

  // Handle --clear-checkpoint flag
  if (clearCheckpoint) {
    deleteCheckpoint(projectDir);
    logger.info('Existing checkpoint cleared');
  }

  // Try to load existing checkpoint
  let checkpoint = loadCheckpoint(projectDir);
  let resuming = false;
  let analyzedPhotoNames = [];

  if (checkpoint && openCallConfig) {
    const validation = validateCheckpoint(checkpoint, openCallConfig);
    if (validation.valid) {
      resuming = true;
      analyzedPhotoNames = checkpoint.progress.analyzedPhotos;
      logger.info(`✓ Resuming analysis: ${checkpoint.progress.photosCount} photos already analyzed`);
    } else {
      logger.info(`Checkpoint invalid (${validation.reason}), starting fresh analysis`);
      checkpoint = null;
    }
  }

  logger.info(`Starting batch processing of photos from: ${photosDirectory}`);

  // Get list of photos
  const photos = getPhotoFiles(photosDirectory);

  if (photos.length === 0) {
    logger.warn('No photos found in directory');
    return { success: false, processed: 0, failed: 0, results: [] };
  }

  // Filter out already analyzed photos if resuming
  let photosToAnalyze = photos;
  if (resuming && analyzedPhotoNames.length > 0) {
    photosToAnalyze = photos.filter(photo => !analyzedPhotoNames.includes(photo.name));
    logger.info(`Found ${photos.length} total photos, ${analyzedPhotoNames.length} already analyzed, ${photosToAnalyze.length} remaining`);
  } else {
    logger.info(`Found ${photos.length} photos to process`);
  }

  // Initialize checkpoint if starting fresh and config provided
  if (!resuming && openCallConfig) {
    checkpoint = initializeCheckpoint(
      projectDir,
      openCallConfig,
      analysisPrompt,
      photos.length,
      parallel,
      checkpointInterval,
      photosDirectory
    );
  }

  const results = [];
  const errors = [];
  const failedPhotos = []; // Track failed photos with details (FR-2.3)
  let processed = resuming ? analyzedPhotoNames.length : 0;

  // If resuming, include previous results
  if (resuming && checkpoint) {
    for (const [photoName, scores] of Object.entries(checkpoint.results.scores)) {
      results.push({
        success: true,
        data: {
          filename: photoName,
          photoPath: join(photosDirectory, photoName),
          scores,
          analysisText: '(resumed from checkpoint)'
        }
      });
    }
    
    // Include previous failed photos
    if (checkpoint.progress.failedPhotos) {
      failedPhotos.push(...checkpoint.progress.failedPhotos.map(name => ({
        photo: name,
        reason: 'Failed in previous run',
        type: 'unknown',
        action: 'Check previous logs'
      })));
    }
  }

  // Get timeout from options (FR-2.3)
  const photoTimeout = options.photoTimeout || 60000; // Default 60s

  // Resolve analysis mode: auto-select if mode is 'auto' (ADR-014)
  let effectiveMode = analysisMode;
  if (analysisMode === 'auto') {
    effectiveMode = smartSelectAnalysisMode({
      photoCount: photosToAnalyze.length,
      timeoutMs: photoTimeout,
      criteriaCount: analysisPrompt.criteria?.length || 5
    });
    logger.info(`Auto-selected analysis mode: ${effectiveMode} ` +
      `(${photosToAnalyze.length} photos, ${analysisPrompt.criteria?.length || 5} criteria, ` +
      `${photoTimeout / 1000}s timeout)`);
  }

  // Process photos in parallel batches
  for (let i = 0; i < photosToAnalyze.length; i += parallel) {
    const batch = photosToAnalyze.slice(i, i + parallel);
    const batchPromises = batch.map(async (photo) => {
      try {
        // 1. VALIDATE PHOTO (FR-2.3)
        const validation = await validatePhoto(photo.path);
        
        if (!validation.valid) {
          // Invalid photo - skip with error
          failedPhotos.push({
            photo: photo.name,
            reason: validation.error,
            type: ErrorType.INVALID_FORMAT,
            action: 'Convert to supported format or remove from directory'
          });
          logger.warn(`⚠️ Skipping ${photo.name}: ${validation.error}`);
          return { success: false, error: validation.error, photoName: photo.name, skipped: true };
        }

        // Log warning for large files
        if (validation.warning) {
          logger.debug(`⚠️ ${photo.name}: ${validation.warning}`);
        }

        // 2. ANALYZE WITH TIMEOUT (FR-2.3) + MULTI-STAGE (FR-2.4) + AUTO (ADR-014)
        const analysisResult = await analyzePhotoWithTimeout(photo.path, analysisPrompt, {
          timeout: photoTimeout,
          analysisMode: effectiveMode // Pass resolved mode (never 'auto')
        });

        if (analysisResult.success) {
          processed++;
          logger.success(`[${processed}/${photos.length}] Analyzed: ${photo.name}`);
          return { success: true, data: analysisResult.data, photoName: photo.name };
        } else if (analysisResult.timedOut) {
          // Timeout - add to failed
          failedPhotos.push({
            photo: photo.name,
            reason: analysisResult.error,
            type: ErrorType.TIMEOUT,
            action: 'Reduce image size or increase --photo-timeout'
          });
          logger.warn(`⚠️ ${photo.name}: ${analysisResult.error}`);
          return { success: false, error: analysisResult.error, photoName: photo.name, timedOut: true };
        }
        
      } catch (error) {
        // 3. CLASSIFY ERROR (FR-2.3)
        const classified = classifyError(error, { photo: photo.name });
        
        // 4. HANDLE BASED ON TYPE
        if (classified.type === ErrorType.OLLAMA_CONNECTION) {
          // Save checkpoint and exit gracefully
          logger.error('❌ Ollama connection lost. Saving checkpoint...');
          if (checkpoint) {
            await saveCheckpoint(checkpoint, projectDir);
            logger.info('✓ Progress saved. Restart Ollama and re-run to resume.');
          }
          process.exit(1);
        }
        
        // Other errors: add to failed, continue
        failedPhotos.push({
          photo: photo.name,
          reason: classified.message,
          type: classified.type,
          action: classified.actionable
        });
        
        logger.error(`[${processed + 1}/${photos.length}] Failed: ${photo.name} - ${classified.message}`);
        errors.push({ photo: photo.name, error: classified.message });
        return { success: false, error: classified.message, photoName: photo.name };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Save checkpoint after each batch (if checkpoint enabled)
    if (checkpoint && openCallConfig) {
      const successfulInBatch = batchResults.filter(r => r.success);
      const failedInBatch = batchResults.filter(r => !r.success).map(r => r.photoName);
      
      if (successfulInBatch.length > 0) {
        const newPhotos = successfulInBatch.map(r => r.photoName);
        const newResults = {};
        successfulInBatch.forEach(r => {
          newResults[r.photoName] = r.data.scores;
        });
        
        updateCheckpoint(checkpoint, newPhotos, newResults, failedInBatch);
        
        // Also store failedPhotos details in checkpoint (FR-2.3)
        checkpoint.progress.failedPhotos = failedPhotos.map(f => f.photo);
        
        // Save checkpoint every N photos (configurable interval)
        if (processed % checkpointInterval === 0 || i + parallel >= photosToAnalyze.length) {
          saveCheckpoint(checkpoint, projectDir);
        }
      }
    }
  }

  // Delete checkpoint on successful completion
  if (checkpoint && errors.length === 0) {
    deleteCheckpoint(projectDir);
    logger.info('Analysis complete, checkpoint cleaned up');
  }

  // Save results to file if output directory specified
  if (outputDir) {
    const summaryFile = join(outputDir, 'batch-results.json');
    const batchSummary = {
      timestamp: new Date().toISOString(),
      total: photos.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results: results.map((r) => (r.success ? { success: true, photo: r.data.photoPath, scores: r.data.scores } : { success: false, error: r.error })),
      errors,
      failedPhotos, // Include detailed failure information (FR-2.3)
    };

    writeJson(summaryFile, batchSummary);
    logger.success(`Results saved to: ${summaryFile}`);
  }

  // Map results to consistent structure for both file and return
  const mappedResults = results.map((r) => 
    r.success 
      ? { success: true, photo: r.data.photoPath, scores: r.data.scores } 
      : { success: false, error: r.error }
  );

  return {
    success: errors.length === 0,
    total: photos.length,
    processed: results.filter((r) => r.success).length,
    failed: errors.length,
    results: mappedResults,
    errors,
    failedPhotos, // Include failed photos with details (FR-2.3)
  };
}

/**
 * Get list of photo files in a directory
 * @param {string} directory - Directory to scan
 * @returns {Array<Object>} Array of photo file objects
 */
function getPhotoFiles(directory) {
  const photos = [];

  try {
    const files = readdirSync(directory);

    for (const file of files) {
      const filePath = join(directory, file);
      const stat = statSync(filePath);

      if (stat.isFile()) {
        const ext = file.split('.').pop().toLowerCase();
        if (SUPPORTED_FORMATS.includes(ext)) {
          photos.push({
            name: file,
            path: filePath,
            size: stat.size,
            ext,
          });
        }
      }
    }
  } catch (error) {
    logger.error(`Failed to read directory ${directory}: ${error.message}`);
  }

  return photos.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Validate photos in a directory
 * @param {string} directory - Directory to validate
 * @returns {Object} Validation results
 */
export function validatePhotos(directory) {
  logger.info(`Validating photos in: ${directory}`);

  const photos = getPhotoFiles(directory);
  const results = {
    total: photos.length,
    valid: [],
    warnings: [],
  };

  photos.forEach((photo) => {
    // Check file size (warn if over 10MB)
    if (photo.size > 10 * 1024 * 1024) {
      results.warnings.push(`${photo.name}: File size ${(photo.size / 1024 / 1024).toFixed(2)}MB (consider resizing for faster processing)`);
    }

    results.valid.push(photo.name);
  });

  logger.info(`Validation complete: ${results.valid.length} valid photos`);
  if (results.warnings.length > 0) {
    results.warnings.forEach((w) => logger.warn(w));
  }

  return results;
}
