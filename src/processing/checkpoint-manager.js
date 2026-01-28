/**
 * Checkpoint Manager
 * 
 * Handles checkpoint persistence for resuming interrupted photo analysis batches.
 * Implements ADR-008: Checkpoint Invalidation Strategy
 * 
 * Key Features:
 * - SHA256 config hash validation (prevents stale criteria)
 * - Atomic file writes (temp file + rename)
 * - Configurable checkpoint interval (default 10 photos)
 * - Auto-cleanup on completion
 * 
 * @module checkpoint-manager
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

const CHECKPOINT_FILENAME = '.analysis-checkpoint.json';
const CHECKPOINT_VERSION = '1.0';

// Maximum checkpoint age: 7 days (in milliseconds)
const MAX_CHECKPOINT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Compute SHA256 hash of open-call.json config
 * 
 * Hash is computed on sorted keys to ensure deterministic output.
 * Used to detect configuration changes that would invalidate checkpoint.
 * 
 * @param {Object} openCallConfig - Contents of open-call.json
 * @returns {string} SHA256 hash (64 hex characters)
 * 
 * @example
 * const hash = computeConfigHash({ title: "Wildlife", theme: "Nature" });
 * // Returns: "a1b2c3d4e5f6..."
 */
export function computeConfigHash(openCallConfig) {
  // Sort keys to ensure deterministic hash
  const sortedKeys = Object.keys(openCallConfig).sort();
  const sortedConfig = {};
  
  for (const key of sortedKeys) {
    sortedConfig[key] = openCallConfig[key];
  }
  
  const configString = JSON.stringify(sortedConfig);
  const hash = crypto.createHash('sha256').update(configString, 'utf8').digest('hex');
  
  return hash;
}

/**
 * Load checkpoint from project directory
 * 
 * Returns null if checkpoint doesn't exist or is corrupted.
 * Logs errors at DEBUG level for troubleshooting.
 * 
 * @param {string} projectDir - Project root directory (absolute path)
 * @returns {Object|null} Checkpoint object or null if doesn't exist/invalid
 * 
 * @example
 * const checkpoint = loadCheckpoint('/path/to/project');
 * if (checkpoint) {
 *   console.log(`Resuming: ${checkpoint.progress.photosCount} photos analyzed`);
 * }
 */
export function loadCheckpoint(projectDir) {
  try {
    const checkpointPath = path.join(projectDir, CHECKPOINT_FILENAME);
    
    if (!fs.existsSync(checkpointPath)) {
      return null;
    }
    
    const fileContents = fs.readFileSync(checkpointPath, 'utf8');
    const checkpoint = JSON.parse(fileContents);
    
    return checkpoint;
  } catch (error) {
    // File doesn't exist or is invalid JSON
    logger.debug(`Failed to load checkpoint: ${error.message}`);
    return null;
  }
}

/**
 * Save checkpoint to disk atomically
 * 
 * Uses temp file + rename strategy to prevent corruption if process
 * dies mid-write. Ensures checkpoint is always valid JSON.
 * 
 * @param {Object} checkpoint - Checkpoint object matching schema
 * @param {string} projectDir - Project root directory (absolute path)
 * @returns {boolean} True if saved successfully, false on error
 * 
 * @example
 * const success = saveCheckpoint(checkpointData, '/path/to/project');
 * if (!success) {
 *   console.warn('Failed to save checkpoint, but analysis continues...');
 * }
 */
export function saveCheckpoint(checkpoint, projectDir) {
  try {
    const checkpointPath = path.join(projectDir, CHECKPOINT_FILENAME);
    const tempPath = `${checkpointPath}.tmp`;
    
    // Update last update time
    checkpoint.results.lastUpdateTime = new Date().toISOString();
    checkpoint.metadata.lastResumedAt = new Date().toISOString();
    
    // Write to temp file first
    const jsonString = JSON.stringify(checkpoint, null, 2);
    fs.writeFileSync(tempPath, jsonString, 'utf8');
    
    // Atomic rename (if process dies here, temp file exists but main is untouched)
    fs.renameSync(tempPath, checkpointPath);
    
    logger.debug(`Checkpoint saved: ${checkpoint.progress.photosCount} photos analyzed`);
    return true;
  } catch (error) {
    // Don't stop batch if checkpoint save fails
    logger.error(`Failed to save checkpoint: ${error.message}`);
    return false;
  }
}

/**
 * Validate checkpoint against current config
 * 
 * Checks:
 * - Config hash matches current open-call.json (prevents stale criteria)
 * - Required fields present (schema validation)
 * - Checkpoint age < 7 days (prevents very old checkpoints)
 * 
 * @param {Object} checkpoint - Loaded checkpoint object
 * @param {Object} currentConfig - Current open-call.json config
 * @returns {Object} Validation result: { valid: boolean, reason: string }
 * 
 * @example
 * const result = validateCheckpoint(checkpoint, currentConfig);
 * if (!result.valid) {
 *   console.log(`Checkpoint invalid: ${result.reason}`);
 *   // Start fresh analysis
 * }
 */
export function validateCheckpoint(checkpoint, currentConfig) {
  // Check required fields
  if (!checkpoint || typeof checkpoint !== 'object') {
    return { valid: false, reason: 'Checkpoint is null or not an object' };
  }
  
  if (!checkpoint.version || checkpoint.version !== CHECKPOINT_VERSION) {
    return { valid: false, reason: `Unsupported checkpoint version: ${checkpoint.version}` };
  }
  
  if (!checkpoint.configHash) {
    return { valid: false, reason: 'Missing configHash field' };
  }
  
  if (!checkpoint.progress || !Array.isArray(checkpoint.progress.analyzedPhotos)) {
    return { valid: false, reason: 'Missing or invalid progress.analyzedPhotos array' };
  }
  
  if (!checkpoint.metadata || !checkpoint.metadata.createdAt) {
    return { valid: false, reason: 'Missing metadata.createdAt timestamp' };
  }
  
  // Check config hash (most important validation)
  const currentHash = computeConfigHash(currentConfig);
  if (checkpoint.configHash !== currentHash) {
    return { 
      valid: false, 
      reason: 'Config changed since checkpoint (open-call.json modified)' 
    };
  }
  
  // Check checkpoint age (prevent using very old checkpoints)
  const checkpointAge = Date.now() - new Date(checkpoint.metadata.createdAt).getTime();
  if (checkpointAge > MAX_CHECKPOINT_AGE_MS) {
    return { 
      valid: false, 
      reason: `Checkpoint too old (${Math.floor(checkpointAge / (24 * 60 * 60 * 1000))} days)` 
    };
  }
  
  return { valid: true, reason: 'Checkpoint valid' };
}

/**
 * Delete checkpoint file
 * 
 * Called after successful batch completion to cleanup.
 * Silent if file doesn't exist.
 * 
 * @param {string} projectDir - Project root directory (absolute path)
 * @returns {boolean} True if deleted (or didn't exist), false on error
 * 
 * @example
 * deleteCheckpoint('/path/to/project');
 * // Checkpoint cleaned up after successful analysis
 */
export function deleteCheckpoint(projectDir) {
  try {
    const checkpointPath = path.join(projectDir, CHECKPOINT_FILENAME);
    
    if (fs.existsSync(checkpointPath)) {
      fs.unlinkSync(checkpointPath);
      logger.debug('Checkpoint deleted after successful completion');
    }
    
    return true;
  } catch (error) {
    logger.error(`Failed to delete checkpoint: ${error.message}`);
    return false;
  }
}

/**
 * Initialize new checkpoint for batch start
 * 
 * Creates initial checkpoint structure with empty progress.
 * Used when starting fresh analysis (no existing checkpoint).
 * 
 * @param {string} projectDir - Project root directory
 * @param {Object} openCallConfig - Contents of open-call.json
 * @param {Object} analysisPrompt - Generated analysis prompt with criteria
 * @param {number} totalPhotos - Total number of photos in batch
 * @param {number} parallelSetting - Parallel processing setting (1-10)
 * @param {number} checkpointInterval - Save checkpoint every N photos
 * @param {string} photoDirectory - Directory containing photos
 * @returns {Object} Initial checkpoint object
 * 
 * @example
 * const checkpoint = initializeCheckpoint(
 *   '/path/to/project',
 *   openCallConfig,
 *   analysisPrompt,
 *   120,
 *   3,
 *   10,
 *   '/path/to/project/photos'
 * );
 */
export function initializeCheckpoint(
  projectDir,
  openCallConfig,
  analysisPrompt,
  totalPhotos,
  parallelSetting,
  checkpointInterval,
  photoDirectory
) {
  const now = new Date().toISOString();
  
  return {
    version: CHECKPOINT_VERSION,
    projectDir,
    configHash: computeConfigHash(openCallConfig),
    analysisPrompt,
    batchMetadata: {
      parallelSetting,
      checkpointInterval,
      totalPhotosInBatch: totalPhotos,
      photoDirectory
    },
    progress: {
      analyzedPhotos: [],
      photosCount: 0,
      failedPhotos: [],
      status: 'in_progress'
    },
    results: {
      scores: {},
      statistics: null,
      lastUpdateTime: now
    },
    metadata: {
      createdAt: now,
      lastResumedAt: now,
      resumeCount: 0
    }
  };
}

/**
 * Update checkpoint with new analyzed photos
 * 
 * Adds newly analyzed photos to checkpoint progress.
 * Handles both successful analyses and failed photos.
 * 
 * @param {Object} checkpoint - Current checkpoint object
 * @param {Array<string>} newPhotos - Array of newly analyzed photo filenames
 * @param {Object} newResults - New analysis results to merge (photo -> scores map)
 * @param {Array<string>} failedPhotos - Optional array of failed photo filenames
 * @returns {Object} Updated checkpoint object
 * 
 * @example
 * const updated = updateCheckpoint(
 *   checkpoint,
 *   ['photo-011.jpg', 'photo-012.jpg'],
 *   { 'photo-011.jpg': { Composition: 8.5 }, 'photo-012.jpg': { Composition: 7.0 } },
 *   []
 * );
 */
export function updateCheckpoint(checkpoint, newPhotos, newResults, failedPhotos = []) {
  // Add new photos to analyzed list
  checkpoint.progress.analyzedPhotos.push(...newPhotos);
  checkpoint.progress.photosCount = checkpoint.progress.analyzedPhotos.length;
  
  // Add failed photos to failed list
  if (failedPhotos.length > 0) {
    checkpoint.progress.failedPhotos.push(...failedPhotos);
  }
  
  // Merge new results
  Object.assign(checkpoint.results.scores, newResults);
  
  // Increment resume count (for tracking how many times checkpoint was resumed)
  checkpoint.metadata.resumeCount = (checkpoint.metadata.resumeCount || 0) + 1;
  
  return checkpoint;
}
