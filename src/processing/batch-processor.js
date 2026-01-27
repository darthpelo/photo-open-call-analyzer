import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { analyzePhoto } from '../analysis/photo-analyzer.js';
import { logger } from '../utils/logger.js';
import { writeJson } from '../utils/file-utils.js';

const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

/**
 * Process a batch of photos in a directory
 * @param {string} photosDirectory - Directory containing photos
 * @param {Object} analysisPrompt - Analysis prompt with criteria
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Batch processing results
 */
export async function processBatch(photosDirectory, analysisPrompt, options = {}) {
  const { outputDir = null, parallel = 3, skipExisting = false } = options;

  logger.info(`Starting batch processing of photos from: ${photosDirectory}`);

  // Get list of photos
  const photos = getPhotoFiles(photosDirectory);

  if (photos.length === 0) {
    logger.warn('No photos found in directory');
    return { success: false, processed: 0, failed: 0, results: [] };
  }

  logger.info(`Found ${photos.length} photos to process`);

  const results = [];
  const errors = [];
  let processed = 0;

  // Process photos in parallel batches
  for (let i = 0; i < photos.length; i += parallel) {
    const batch = photos.slice(i, i + parallel);
    const batchPromises = batch.map((photo) =>
      analyzePhoto(photo.path, analysisPrompt)
        .then((result) => {
          processed++;
          logger.success(`[${processed}/${photos.length}] Analyzed: ${photo.name}`);
          return { success: true, data: result };
        })
        .catch((error) => {
          logger.error(`[${processed + 1}/${photos.length}] Failed: ${photo.name}`);
          errors.push({ photo: photo.name, error: error.message });
          return { success: false, error: error.message };
        })
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
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
    };

    writeJson(summaryFile, batchSummary);
    logger.success(`Results saved to: ${summaryFile}`);
  }

  return {
    success: errors.length === 0,
    total: photos.length,
    processed: results.filter((r) => r.success).length,
    failed: errors.length,
    results,
    errors,
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
