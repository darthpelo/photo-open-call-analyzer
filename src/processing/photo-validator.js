/**
 * Photo Validation Module
 * 
 * Validates photo files before analysis to catch errors early.
 * Supports: JPEG, PNG, GIF, WebP, HEIC
 * 
 * Part of FR-2.3: Edge Case Robustness
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * Supported image formats
 * HEIC added in FR-2.3 for iOS photo support
 */
export const SUPPORTED_FORMATS = [
  'jpeg',
  'jpg',
  'png',
  'gif',
  'webp',
  'heic'
];

/**
 * Maximum recommended file size (20MB)
 * Larger files may cause timeout or memory issues
 */
export const MAX_RECOMMENDED_SIZE = 20 * 1024 * 1024;

/**
 * Validates a photo file before analysis
 * 
 * Checks:
 * - File exists
 * - File is readable (permissions)
 * - File is valid image format (via sharp)
 * - Format is supported
 * - File size (warning if >20MB)
 * 
 * @param {string} photoPath - Absolute path to photo file
 * @returns {Promise<Object>} Validation result
 *   - valid: boolean - Whether photo can be analyzed
 *   - error: string - Error message if invalid
 *   - metadata: Object - Sharp metadata if valid
 *   - warning: string - Warning message (e.g., large file)
 * 
 * @example
 * const result = await validatePhoto('/path/to/photo.jpg');
 * if (result.valid) {
 *   // Proceed with analysis
 * } else {
 *   logger.error(result.error);
 * }
 */
export async function validatePhoto(photoPath) {
  try {
    // 1. Check file exists
    if (!fs.existsSync(photoPath)) {
      return {
        valid: false,
        error: 'File not found'
      };
    }

    // 2. Check file permissions
    try {
      fs.accessSync(photoPath, fs.constants.R_OK);
    } catch (error) {
      return {
        valid: false,
        error: 'Permission denied - cannot read file'
      };
    }

    // 3. Check file size
    const stats = fs.statSync(photoPath);
    const warning = stats.size > MAX_RECOMMENDED_SIZE
      ? `Large file (${(stats.size / 1024 / 1024).toFixed(1)}MB) may cause timeout`
      : null;

    // 4. Validate with sharp.metadata()
    // This catches corrupted files and non-image formats
    let metadata;
    try {
      metadata = await sharp(photoPath).metadata();
    } catch (error) {
      // Sharp failed to read - corrupted or invalid format
      if (error.message.includes('unsupported') || error.message.includes('Invalid')) {
        return {
          valid: false,
          error: 'Invalid image format or corrupted file'
        };
      }
      return {
        valid: false,
        error: `Corrupted file: ${error.message}`
      };
    }

    // 5. Check format is supported
    const format = metadata.format?.toLowerCase();
    if (!format || !SUPPORTED_FORMATS.includes(format)) {
      return {
        valid: false,
        error: `Unsupported format: ${format || 'unknown'}. Supported: ${SUPPORTED_FORMATS.join(', ')}`
      };
    }

    // All validations passed
    return {
      valid: true,
      metadata,
      warning
    };

  } catch (error) {
    // Unexpected error
    logger.error(`Validation error for ${photoPath}: ${error.message}`);
    return {
      valid: false,
      error: `Validation failed: ${error.message}`
    };
  }
}

/**
 * Validates multiple photos in batch
 * 
 * @param {string[]} photoPaths - Array of photo paths
 * @returns {Promise<Object>} Validation results
 *   - valid: string[] - Paths of valid photos
 *   - invalid: Object[] - Invalid photos with errors
 * 
 * @example
 * const { valid, invalid } = await validatePhotoBatch(paths);
 * console.log(`${valid.length} valid, ${invalid.length} invalid`);
 */
export async function validatePhotoBatch(photoPaths) {
  const results = {
    valid: [],
    invalid: []
  };

  for (const photoPath of photoPaths) {
    const validation = await validatePhoto(photoPath);
    
    if (validation.valid) {
      results.valid.push(photoPath);
      
      // Log warnings for large files
      if (validation.warning) {
        logger.debug(`⚠️ ${path.basename(photoPath)}: ${validation.warning}`);
      }
    } else {
      results.invalid.push({
        path: photoPath,
        error: validation.error
      });
    }
  }

  return results;
}
