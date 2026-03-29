/**
 * Unit Tests for Thumbnail Service
 *
 * TDD: Tests written before implementation.
 *
 * Tests all thumbnails.js exports:
 * - generateThumbnail(): On-demand Sharp thumbnail generation with caching
 * - validateWidth(): Width parameter validation (50-800)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { generateThumbnail, validateWidth } from '../src/web/thumbnails.js';

describe('Thumbnail Service - Unit Tests', () => {
  let testDir;
  let testPhotoPath;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thumb-test-'));
    testPhotoPath = path.join(testDir, 'photo.jpg');
    // Create a real tiny JPEG with sharp
    await sharp({
      create: { width: 100, height: 80, channels: 3, background: { r: 255, g: 0, b: 0 } }
    }).jpeg().toFile(testPhotoPath);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // ============================================
  // validateWidth()
  // ============================================

  describe('validateWidth()', () => {
    it('should accept valid integer widths', () => {
      expect(validateWidth(300)).toBe(300);
      expect(validateWidth(50)).toBe(50);
      expect(validateWidth(800)).toBe(800);
    });

    it('should accept string numbers and parse them', () => {
      expect(validateWidth('300')).toBe(300);
      expect(validateWidth('50')).toBe(50);
    });

    it('should use default width when undefined', () => {
      expect(validateWidth(undefined)).toBe(300);
    });

    it('should reject widths below 50', () => {
      expect(() => validateWidth(49)).toThrow();
      expect(() => validateWidth(0)).toThrow();
      expect(() => validateWidth(-1)).toThrow();
    });

    it('should reject widths above 800', () => {
      expect(() => validateWidth(801)).toThrow();
      expect(() => validateWidth(9999)).toThrow();
    });

    it('should reject non-integer values', () => {
      expect(() => validateWidth(300.5)).toThrow();
      expect(() => validateWidth('abc')).toThrow();
      expect(() => validateWidth('300.5')).toThrow();
    });
  });

  // ============================================
  // generateThumbnail()
  // ============================================

  describe('generateThumbnail()', () => {
    it('should generate a thumbnail at requested width', async () => {
      const thumbPath = await generateThumbnail(testPhotoPath, 50, testDir);
      expect(fs.existsSync(thumbPath)).toBe(true);
      const meta = await sharp(thumbPath).metadata();
      expect(meta.width).toBe(50);
    });

    it('should cache thumbnails in .thumbs directory', async () => {
      const thumbPath = await generateThumbnail(testPhotoPath, 50, testDir);
      expect(thumbPath).toContain('.thumbs');
    });

    it('should return cached thumbnail on second call', async () => {
      const thumbPath1 = await generateThumbnail(testPhotoPath, 50, testDir);
      const stat1 = fs.statSync(thumbPath1);

      // Small delay to ensure mtime would differ if regenerated
      await new Promise(r => setTimeout(r, 50));

      const thumbPath2 = await generateThumbnail(testPhotoPath, 50, testDir);
      const stat2 = fs.statSync(thumbPath2);

      expect(thumbPath1).toBe(thumbPath2);
      expect(stat1.mtimeMs).toBe(stat2.mtimeMs);
    });

    it('should generate different thumbnails for different widths', async () => {
      const thumb50 = await generateThumbnail(testPhotoPath, 50, testDir);
      const thumb100 = await generateThumbnail(testPhotoPath, 100, testDir);
      expect(thumb50).not.toBe(thumb100);
    });

    it('should throw for non-existent photo', async () => {
      await expect(
        generateThumbnail(path.join(testDir, 'nope.jpg'), 300, testDir)
      ).rejects.toThrow();
    });
  });
});
