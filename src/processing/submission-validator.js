/**
 * Submission Validator Module (FR-4.3)
 *
 * Validates submission-level rules for open call compliance.
 * Checks: photo count, deadline, required format, max file size.
 * Complements photo-validator.js which handles individual file validation.
 */

import { readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { logger } from '../utils/logger.js';
import { SUPPORTED_FORMATS } from './photo-validator.js';

/**
 * Image file extensions considered as photos
 */
const IMAGE_EXTENSIONS = SUPPORTED_FORMATS.map(f => `.${f}`);

/**
 * Count image files in a directory
 * @param {string} dir - Directory path
 * @returns {number} Count of image files
 */
function countImageFiles(dir) {
  if (!existsSync(dir)) return 0;
  try {
    const files = readdirSync(dir);
    return files.filter(f => {
      const ext = extname(f).toLowerCase();
      return IMAGE_EXTENSIONS.includes(ext);
    }).length;
  } catch {
    return 0;
  }
}

/**
 * List image files in a directory
 * @param {string} dir - Directory path
 * @returns {string[]} Array of filenames
 */
function listImageFiles(dir) {
  if (!existsSync(dir)) return [];
  try {
    const files = readdirSync(dir);
    return files.filter(f => {
      const ext = extname(f).toLowerCase();
      return IMAGE_EXTENSIONS.includes(ext);
    });
  } catch {
    return [];
  }
}

/**
 * Check photo count against submission rules
 * @param {string} photosDir - Path to photos directory
 * @param {Object} rules - Submission rules
 * @param {number} [rules.maxPhotos] - Maximum number of photos
 * @param {number} [rules.minPhotos] - Minimum number of photos
 * @returns {Object} { status: 'ok'|'error'|'warning', count: number, limit: number }
 */
export function checkPhotoCount(photosDir, rules) {
  const count = countImageFiles(photosDir);

  if (!existsSync(photosDir)) {
    return { status: 'error', count: 0, limit: rules.maxPhotos || 0 };
  }

  if (rules.maxPhotos && count > rules.maxPhotos) {
    return { status: 'error', count, limit: rules.maxPhotos };
  }

  if (rules.minPhotos && count < rules.minPhotos) {
    return { status: 'warning', count, limit: rules.minPhotos };
  }

  return { status: 'ok', count, limit: rules.maxPhotos || 0 };
}

/**
 * Check if deadline has passed or is approaching
 * @param {string} deadline - ISO date string (YYYY-MM-DD)
 * @returns {Object} { status: 'ok'|'warning'|'expired'|'error', daysRemaining: number }
 */
export function checkDeadline(deadline) {
  const deadlineDate = new Date(deadline + 'T23:59:59');

  if (isNaN(deadlineDate.getTime())) {
    return { status: 'error', daysRemaining: 0 };
  }

  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    return { status: 'expired', daysRemaining };
  }

  if (daysRemaining <= 3) {
    return { status: 'warning', daysRemaining };
  }

  return { status: 'ok', daysRemaining };
}

/**
 * Validate a submission against open call rules
 * @param {string} projectDir - Project directory path
 * @param {Object} config - Open call configuration (with optional submissionRules)
 * @returns {Object} { passed: boolean, violations: Array<{ rule, expected, actual, severity }> }
 */
export function validateSubmission(projectDir, config) {
  const violations = [];
  const rules = config.submissionRules;

  if (!rules) {
    return { passed: true, violations: [] };
  }

  const photosDir = join(projectDir, 'photos');

  // Check photo count
  if (rules.maxPhotos || rules.minPhotos) {
    const countResult = checkPhotoCount(photosDir, rules);
    if (countResult.status === 'error') {
      violations.push({
        rule: 'maxPhotos',
        expected: rules.maxPhotos,
        actual: countResult.count,
        severity: 'ERROR'
      });
    } else if (countResult.status === 'warning' && rules.minPhotos) {
      violations.push({
        rule: 'minPhotos',
        expected: rules.minPhotos,
        actual: countResult.count,
        severity: 'WARNING'
      });
    }
  }

  // Check deadline
  if (rules.deadline) {
    const deadlineResult = checkDeadline(rules.deadline);
    if (deadlineResult.status === 'expired') {
      violations.push({
        rule: 'deadline',
        expected: rules.deadline,
        actual: 'expired',
        severity: 'ERROR'
      });
    } else if (deadlineResult.status === 'warning') {
      violations.push({
        rule: 'deadline',
        expected: rules.deadline,
        actual: `${deadlineResult.daysRemaining} days remaining`,
        severity: 'WARNING'
      });
    }
  }

  // Check format requirements
  if (rules.requiredFormat) {
    const photos = listImageFiles(photosDir);
    const requiredExt = `.${rules.requiredFormat.toLowerCase()}`;
    for (const photo of photos) {
      const ext = extname(photo).toLowerCase();
      // Normalize jpeg/jpg
      const normalizedExt = ext === '.jpeg' ? '.jpg' : ext;
      const normalizedRequired = requiredExt === '.jpeg' ? '.jpg' : requiredExt;
      if (normalizedExt !== normalizedRequired) {
        violations.push({
          rule: 'requiredFormat',
          expected: rules.requiredFormat,
          actual: ext.slice(1),
          severity: 'ERROR'
        });
      }
    }
  }

  // Check file size
  if (rules.maxSizeMB) {
    const photos = listImageFiles(photosDir);
    const maxBytes = rules.maxSizeMB * 1024 * 1024;
    for (const photo of photos) {
      try {
        const filePath = join(photosDir, photo);
        const stats = statSync(filePath);
        if (stats.size > maxBytes) {
          violations.push({
            rule: 'maxSizeMB',
            expected: `${rules.maxSizeMB}MB`,
            actual: `${(stats.size / (1024 * 1024)).toFixed(1)}MB`,
            severity: 'WARNING'
          });
        }
      } catch {
        // Skip files that can't be stat'd
      }
    }
  }

  // Determine overall pass/fail (only ERRORs cause failure, WARNINGs don't)
  const hasErrors = violations.some(v => v.severity === 'ERROR');

  return {
    passed: !hasErrors,
    violations
  };
}
