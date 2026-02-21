import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, statSync } from 'fs';
import { join } from 'path';
import os from 'os';
import {
  checkPhotoCount,
  checkDeadline,
  validateSubmission
} from '../src/processing/submission-validator.js';

describe('Submission Validator (FR-4.3)', () => {
  let testDir;
  let photosDir;

  beforeEach(() => {
    testDir = join(os.tmpdir(), `test-submission-${Date.now()}`);
    photosDir = join(testDir, 'photos');
    mkdirSync(photosDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  // Helper: create dummy photo files
  function createPhotos(count, format = 'jpg') {
    for (let i = 1; i <= count; i++) {
      writeFileSync(join(photosDir, `photo-${i}.${format}`), Buffer.alloc(1024));
    }
  }

  // Helper: create a large photo file
  function createLargePhoto(name, sizeMB) {
    writeFileSync(join(photosDir, name), Buffer.alloc(sizeMB * 1024 * 1024));
  }

  describe('checkPhotoCount', () => {
    it('should return ok when count is within limits', () => {
      createPhotos(5);
      const result = checkPhotoCount(photosDir, { maxPhotos: 10, minPhotos: 1 });
      expect(result.status).toBe('ok');
      expect(result.count).toBe(5);
    });

    it('should return ok when count equals maxPhotos exactly', () => {
      createPhotos(10);
      const result = checkPhotoCount(photosDir, { maxPhotos: 10 });
      expect(result.status).toBe('ok');
      expect(result.count).toBe(10);
    });

    it('should return error when exceeding maxPhotos', () => {
      createPhotos(12);
      const result = checkPhotoCount(photosDir, { maxPhotos: 10 });
      expect(result.status).toBe('error');
      expect(result.count).toBe(12);
      expect(result.limit).toBe(10);
    });

    it('should return warning when below minPhotos', () => {
      createPhotos(0);
      const result = checkPhotoCount(photosDir, { maxPhotos: 10, minPhotos: 3 });
      expect(result.status).toBe('warning');
      expect(result.count).toBe(0);
    });

    it('should return ok when count equals minPhotos (boundary)', () => {
      createPhotos(3);
      const result = checkPhotoCount(photosDir, { maxPhotos: 10, minPhotos: 3 });
      expect(result.status).toBe('ok');
      expect(result.count).toBe(3);
    });

    it('should only count supported image files', () => {
      createPhotos(3, 'jpg');
      writeFileSync(join(photosDir, 'readme.txt'), 'not a photo');
      writeFileSync(join(photosDir, '.DS_Store'), '');
      const result = checkPhotoCount(photosDir, { maxPhotos: 10 });
      expect(result.count).toBe(3);
    });

    it('should handle non-existent directory', () => {
      const result = checkPhotoCount('/nonexistent/path', { maxPhotos: 10 });
      expect(result.status).toBe('error');
      expect(result.count).toBe(0);
    });
  });

  describe('checkDeadline', () => {
    it('should return ok for future deadlines', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const result = checkDeadline(futureDate.toISOString().split('T')[0]);
      expect(result.status).toBe('ok');
      expect(result.daysRemaining).toBeGreaterThan(3);
    });

    it('should return expired for past deadlines', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const result = checkDeadline(pastDate.toISOString().split('T')[0]);
      expect(result.status).toBe('expired');
      expect(result.daysRemaining).toBeLessThan(0);
    });

    it('should return warning when deadline is within 3 days', () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 2);
      const result = checkDeadline(soonDate.toISOString().split('T')[0]);
      expect(result.status).toBe('warning');
      expect(result.daysRemaining).toBeLessThanOrEqual(3);
      expect(result.daysRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should return ok for today (deadline day itself)', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = checkDeadline(today);
      expect(result.status).toBe('warning');
      expect(result.daysRemaining).toBe(0);
    });

    it('should handle invalid date string', () => {
      const result = checkDeadline('not-a-date');
      expect(result.status).toBe('error');
    });
  });

  describe('validateSubmission', () => {
    function writeConfig(config) {
      writeFileSync(join(testDir, 'open-call.json'), JSON.stringify(config));
    }

    const baseConfig = {
      title: 'Test Competition',
      theme: 'Test theme for photography',
      jury: ['Judge A'],
      pastWinners: 'Previous winners had great composition and lighting'
    };

    it('should pass when no submission rules are violated', () => {
      createPhotos(5);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const config = {
        ...baseConfig,
        submissionRules: {
          maxPhotos: 10,
          deadline: futureDate.toISOString().split('T')[0],
          requiredFormat: 'jpg',
          maxSizeMB: 20
        }
      };
      writeConfig(config);

      const result = validateSubmission(testDir, config);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect photo count violation', () => {
      createPhotos(12);
      const config = {
        ...baseConfig,
        submissionRules: { maxPhotos: 10 }
      };

      const result = validateSubmission(testDir, config);
      expect(result.passed).toBe(false);
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          rule: 'maxPhotos',
          severity: 'ERROR'
        })
      );
    });

    it('should detect expired deadline', () => {
      createPhotos(3);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const config = {
        ...baseConfig,
        submissionRules: {
          deadline: pastDate.toISOString().split('T')[0]
        }
      };

      const result = validateSubmission(testDir, config);
      expect(result.passed).toBe(false);
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          rule: 'deadline',
          severity: 'ERROR'
        })
      );
    });

    it('should warn about approaching deadline', () => {
      createPhotos(3);
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 2);
      const config = {
        ...baseConfig,
        submissionRules: {
          deadline: soonDate.toISOString().split('T')[0]
        }
      };

      const result = validateSubmission(testDir, config);
      expect(result.passed).toBe(true); // warnings don't fail
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          rule: 'deadline',
          severity: 'WARNING'
        })
      );
    });

    it('should detect format violations', () => {
      createPhotos(3, 'png');
      const config = {
        ...baseConfig,
        submissionRules: { requiredFormat: 'jpg' }
      };

      const result = validateSubmission(testDir, config);
      expect(result.passed).toBe(false);
      expect(result.violations.filter(v => v.rule === 'requiredFormat')).toHaveLength(3);
    });

    it('should detect size violations', () => {
      createLargePhoto('big-photo.jpg', 15);
      createPhotos(2); // small ones
      const config = {
        ...baseConfig,
        submissionRules: { maxSizeMB: 10 }
      };

      const result = validateSubmission(testDir, config);
      // Should have at least one size violation
      const sizeViolations = result.violations.filter(v => v.rule === 'maxSizeMB');
      expect(sizeViolations.length).toBeGreaterThanOrEqual(1);
      expect(sizeViolations[0].severity).toBe('WARNING');
    });

    it('should return passed=true when no submissionRules present', () => {
      createPhotos(5);
      const config = { ...baseConfig };

      const result = validateSubmission(testDir, config);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should aggregate multiple violations', () => {
      createPhotos(12, 'png'); // too many + wrong format
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const config = {
        ...baseConfig,
        submissionRules: {
          maxPhotos: 10,
          deadline: pastDate.toISOString().split('T')[0],
          requiredFormat: 'jpg'
        }
      };

      const result = validateSubmission(testDir, config);
      expect(result.passed).toBe(false);
      // At least: 1 count error + 1 deadline error + 12 format errors
      expect(result.violations.length).toBeGreaterThanOrEqual(3);
    });

    it('should return structured violation objects', () => {
      createPhotos(12);
      const config = {
        ...baseConfig,
        submissionRules: { maxPhotos: 10 }
      };

      const result = validateSubmission(testDir, config);
      const violation = result.violations[0];
      expect(violation).toHaveProperty('rule');
      expect(violation).toHaveProperty('expected');
      expect(violation).toHaveProperty('actual');
      expect(violation).toHaveProperty('severity');
    });
  });
});
