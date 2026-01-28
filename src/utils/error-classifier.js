/**
 * Error Classification Module
 * 
 * Classifies errors and provides actionable user messages.
 * Part of FR-2.3: Edge Case Robustness
 */

import { logger } from './logger.js';

/**
 * Error types for classification
 */
export const ErrorType = {
  CORRUPTED_FILE: 'corrupted_file',
  INVALID_FORMAT: 'invalid_format',
  TIMEOUT: 'timeout',
  OLLAMA_CONNECTION: 'ollama_connection',
  FILE_SYSTEM: 'file_system',
  UNKNOWN: 'unknown'
};

/**
 * Classifies an error based on error message and context
 * 
 * @param {Error} error - The error object
 * @param {Object} context - Additional context (e.g., { photo: 'path.jpg' })
 * @returns {Object} Classification result
 *   - type: ErrorType - Classified error type
 *   - message: string - Technical error message
 *   - actionable: string - User-friendly action to take
 * 
 * @example
 * try {
 *   // ... some operation
 * } catch (error) {
 *   const classified = classifyError(error, { photo: 'photo.jpg' });
 *   console.log(classified.actionable); // What user should do
 * }
 */
export function classifyError(error, context = {}) {
  const message = error.message || String(error);
  const code = error.code;

  // Timeout errors
  if (message.includes('TIMEOUT') || message.includes('timeout')) {
    return {
      type: ErrorType.TIMEOUT,
      message: message,
      actionable: 'Reduce image size or increase --photo-timeout value'
    };
  }

  // Ollama connection errors
  if (code === 'ECONNREFUSED' || 
      code === 'ENOTFOUND' ||
      message.includes('connect ECONNREFUSED') ||
      message.includes('Ollama') ||
      message.includes('fetch failed')) {
    return {
      type: ErrorType.OLLAMA_CONNECTION,
      message: 'Ollama connection lost',
      actionable: 'Ensure Ollama is running (ollama serve) and try again'
    };
  }

  // File system errors
  if (code === 'ENOENT') {
    return {
      type: ErrorType.FILE_SYSTEM,
      message: 'File not found',
      actionable: 'Check that the file exists and path is correct'
    };
  }

  if (code === 'EACCES' || message.includes('permission denied')) {
    return {
      type: ErrorType.FILE_SYSTEM,
      message: 'Permission denied',
      actionable: 'Check file/directory permissions (chmod)'
    };
  }

  if (code === 'ENOSPC') {
    return {
      type: ErrorType.FILE_SYSTEM,
      message: 'Disk full',
      actionable: 'Free up disk space and try again'
    };
  }

  // Sharp/Image processing errors (corrupted or invalid format)
  if (message.includes('Invalid') || 
      message.includes('unsupported') ||
      message.includes('Input buffer') ||
      message.includes('VipsJpeg') ||
      message.includes('premature')) {
    return {
      type: ErrorType.CORRUPTED_FILE,
      message: 'Corrupted or invalid image file',
      actionable: 'Re-export image from original source or use different file'
    };
  }

  // Format-specific errors
  if (message.includes('format')) {
    return {
      type: ErrorType.INVALID_FORMAT,
      message: message,
      actionable: 'Convert to supported format (JPG, PNG, GIF, WebP, HEIC)'
    };
  }

  // Unknown error
  return {
    type: ErrorType.UNKNOWN,
    message: message,
    actionable: 'Check logs for details or report issue if problem persists'
  };
}

/**
 * Gets a user-friendly error message with suggested action
 * 
 * @param {string} errorType - ErrorType enum value
 * @param {string} photoPath - Path to photo that failed
 * @param {Object} details - Additional details (e.g., timeout duration)
 * @returns {string} Formatted error message
 * 
 * @example
 * const msg = getActionableMessage(ErrorType.TIMEOUT, 'photo.jpg', { timeout: 60 });
 * // "photo.jpg: Analysis timeout after 60s. Reduce image size or increase --photo-timeout value"
 */
export function getActionableMessage(errorType, photoPath, details = {}) {
  const filename = photoPath.split('/').pop();

  switch (errorType) {
    case ErrorType.CORRUPTED_FILE:
      return `${filename}: Corrupted file. Re-export from original source.`;

    case ErrorType.INVALID_FORMAT:
      return `${filename}: Invalid or unsupported format. Convert to JPG, PNG, GIF, WebP, or HEIC.`;

    case ErrorType.TIMEOUT:
      const timeoutSec = details.timeout ? `${details.timeout}s` : '60s';
      return `${filename}: Analysis timeout after ${timeoutSec}. Try --photo-timeout with higher value or reduce image size.`;

    case ErrorType.OLLAMA_CONNECTION:
      return `Ollama connection lost during analysis of ${filename}. Ensure Ollama is running and restart analysis.`;

    case ErrorType.FILE_SYSTEM:
      return `${filename}: File system error (${details.code || 'unknown'}). Check permissions and disk space.`;

    case ErrorType.UNKNOWN:
    default:
      return `${filename}: Unexpected error. Check logs for details.`;
  }
}

/**
 * Formats error for logging with appropriate level
 * 
 * @param {Error} error - The error
 * @param {Object} context - Error context
 */
export function logError(error, context = {}) {
  const classified = classifyError(error, context);
  
  // Log based on severity
  if (classified.type === ErrorType.OLLAMA_CONNECTION) {
    logger.error(`❌ ${classified.message}`);
  } else if (classified.type === ErrorType.TIMEOUT) {
    logger.warn(`⚠️ ${context.photo}: ${classified.message}`);
  } else {
    logger.debug(`⚠️ ${context.photo || 'Unknown'}: ${classified.message}`);
  }

  return classified;
}
