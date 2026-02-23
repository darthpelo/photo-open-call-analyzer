/**
 * Unit Tests for Photo Group Resolver (FR-4.8)
 *
 * TDD: Tests written BEFORE implementation (RED phase).
 *
 * Tests resolvePhotoGroups() which partitions analyzed photos into named groups
 * using glob patterns resolved against the filesystem.
 *
 * Happy path:
 * - Partition photos into groups by glob pattern
 * - Match simple wildcard patterns
 * - Preserve all properties of matched photo objects
 *
 * Warnings:
 * - Warn about photos not in any group (orphans)
 * - Warn when a photo matches multiple groups (overlapping patterns)
 *
 * Errors:
 * - Fail when a group pattern matches zero photos
 * - Fail when group names are duplicated
 * - Fail with empty photoGroups array
 * - Fail with null/undefined photoGroups
 * - Fail with empty availablePhotos
 * - Fail when group is missing name
 * - Fail when group is missing pattern
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolvePhotoGroups } from '../src/processing/photo-group-resolver.js';

describe('Photo Group Resolver - Unit Tests', () => {
  let testDir;
  let photosDir;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'photo-groups-test-'));
    photosDir = join(testDir, 'photos');
    mkdirSync(photosDir);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  /**
   * Helper to create empty test files on disk.
   * These files are needed so that globSync can find them.
   */
  function createTestPhotos(...filenames) {
    for (const f of filenames) {
      writeFileSync(join(photosDir, f), 'fake-image');
    }
  }

  // ============================================
  // Happy Path
  // ============================================

  describe('Happy path', () => {
    it('should partition photos into groups by glob pattern', () => {
      createTestPhotos(
        'rotterdam-01.jpg', 'rotterdam-02.jpg', 'rotterdam-03.jpg', 'rotterdam-04.jpg',
        'october-01.jpg', 'october-02.jpg', 'october-03.jpg', 'october-04.jpg'
      );

      const photos = [
        { filename: 'rotterdam-01.jpg', score: 8.5 },
        { filename: 'rotterdam-02.jpg', score: 7.2 },
        { filename: 'rotterdam-03.jpg', score: 6.9 },
        { filename: 'rotterdam-04.jpg', score: 8.1 },
        { filename: 'october-01.jpg', score: 7.0 },
        { filename: 'october-02.jpg', score: 6.5 },
        { filename: 'october-03.jpg', score: 9.0 },
        { filename: 'october-04.jpg', score: 7.8 },
      ];

      const groups = [
        { name: 'Rotterdam Series', pattern: 'rotterdam-*.jpg' },
        { name: 'October Series', pattern: 'october-*.jpg' },
      ];

      const result = resolvePhotoGroups(groups, photos, photosDir);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(result.groups).toBeInstanceOf(Map);
      expect(result.groups.size).toBe(2);

      const rotterdamGroup = result.groups.get('Rotterdam Series');
      expect(rotterdamGroup).toHaveLength(4);
      expect(rotterdamGroup.map(p => p.filename).sort()).toEqual([
        'rotterdam-01.jpg', 'rotterdam-02.jpg', 'rotterdam-03.jpg', 'rotterdam-04.jpg',
      ]);

      const octoberGroup = result.groups.get('October Series');
      expect(octoberGroup).toHaveLength(4);
      expect(octoberGroup.map(p => p.filename).sort()).toEqual([
        'october-01.jpg', 'october-02.jpg', 'october-03.jpg', 'october-04.jpg',
      ]);

      expect(result.warnings).toHaveLength(0);
    });

    it('should match simple wildcard patterns', () => {
      createTestPhotos(
        'urban-dawn.jpg', 'urban-night.jpg',
        'rural-meadow.jpg', 'rural-barn.jpg'
      );

      const photos = [
        { filename: 'urban-dawn.jpg', score: 8 },
        { filename: 'urban-night.jpg', score: 7 },
        { filename: 'rural-meadow.jpg', score: 6 },
        { filename: 'rural-barn.jpg', score: 9 },
      ];

      const groups = [
        { name: 'Urban', pattern: 'urban-*.jpg' },
        { name: 'Rural', pattern: 'rural-*.jpg' },
      ];

      const result = resolvePhotoGroups(groups, photos, photosDir);

      expect(result.success).toBe(true);

      const urbanPhotos = result.groups.get('Urban');
      expect(urbanPhotos).toHaveLength(2);
      expect(urbanPhotos.every(p => p.filename.startsWith('urban-'))).toBe(true);

      const ruralPhotos = result.groups.get('Rural');
      expect(ruralPhotos).toHaveLength(2);
      expect(ruralPhotos.every(p => p.filename.startsWith('rural-'))).toBe(true);
    });

    it('should preserve all properties of matched photo objects', () => {
      createTestPhotos('alpha-01.jpg', 'beta-01.jpg');

      const photos = [
        {
          filename: 'alpha-01.jpg',
          score: 8.5,
          scores: { Composition: 9, Light: 8 },
          path: '/some/path/alpha-01.jpg',
          analysisText: 'Strong composition',
        },
        {
          filename: 'beta-01.jpg',
          score: 7.0,
          scores: { Composition: 7, Light: 7 },
          path: '/some/path/beta-01.jpg',
          analysisText: 'Decent light',
        },
      ];

      const groups = [
        { name: 'Alpha', pattern: 'alpha-*.jpg' },
        { name: 'Beta', pattern: 'beta-*.jpg' },
      ];

      const result = resolvePhotoGroups(groups, photos, photosDir);

      expect(result.success).toBe(true);

      const alphaPhotos = result.groups.get('Alpha');
      expect(alphaPhotos).toHaveLength(1);
      const alphaPhoto = alphaPhotos[0];

      // All original properties must be preserved
      expect(alphaPhoto.filename).toBe('alpha-01.jpg');
      expect(alphaPhoto.score).toBe(8.5);
      expect(alphaPhoto.scores).toEqual({ Composition: 9, Light: 8 });
      expect(alphaPhoto.path).toBe('/some/path/alpha-01.jpg');
      expect(alphaPhoto.analysisText).toBe('Strong composition');
    });
  });

  // ============================================
  // Warnings
  // ============================================

  describe('Warnings', () => {
    it('should warn about photos not in any group', () => {
      createTestPhotos('series-a-01.jpg', 'series-a-02.jpg', 'orphan.jpg');

      const photos = [
        { filename: 'series-a-01.jpg', score: 8 },
        { filename: 'series-a-02.jpg', score: 7 },
        { filename: 'orphan.jpg', score: 6 },
      ];

      const groups = [
        { name: 'Series A', pattern: 'series-a-*.jpg' },
      ];

      const result = resolvePhotoGroups(groups, photos, photosDir);

      expect(result.success).toBe(true);
      expect(result.groups.get('Series A')).toHaveLength(2);
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      expect(result.warnings.some(w => w.includes('orphan.jpg'))).toBe(true);
    });

    it('should warn when a photo matches multiple groups', () => {
      createTestPhotos('urban-night-01.jpg', 'urban-day-01.jpg', 'night-rural-01.jpg');

      const photos = [
        { filename: 'urban-night-01.jpg', score: 8 },
        { filename: 'urban-day-01.jpg', score: 7 },
        { filename: 'night-rural-01.jpg', score: 6 },
      ];

      // Both patterns match 'urban-night-01.jpg'
      const groups = [
        { name: 'Urban', pattern: 'urban-*.jpg' },
        { name: 'Night', pattern: '*night*.jpg' },
      ];

      const result = resolvePhotoGroups(groups, photos, photosDir);

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      expect(result.warnings.some(w => w.includes('urban-night-01.jpg'))).toBe(true);
      expect(result.warnings.some(w => w.includes('multiple'))).toBe(true);
    });
  });

  // ============================================
  // Errors
  // ============================================

  describe('Errors', () => {
    it('should fail when a group pattern matches zero photos', () => {
      createTestPhotos('existing-01.jpg');

      const photos = [
        { filename: 'existing-01.jpg', score: 8 },
      ];

      const groups = [
        { name: 'Existing', pattern: 'existing-*.jpg' },
        { name: 'NonExistent', pattern: 'ghost-*.jpg' },
      ];

      const result = resolvePhotoGroups(groups, photos, photosDir);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error).toContain('NonExistent');
      expect(result.error).toContain('ghost-*.jpg');
      expect(result.error).toContain('0');
    });

    it('should fail when group names are duplicated', () => {
      createTestPhotos('a-01.jpg', 'b-01.jpg');

      const photos = [
        { filename: 'a-01.jpg', score: 8 },
        { filename: 'b-01.jpg', score: 7 },
      ];

      const groups = [
        { name: 'Duplicated', pattern: 'a-*.jpg' },
        { name: 'Duplicated', pattern: 'b-*.jpg' },
      ];

      const result = resolvePhotoGroups(groups, photos, photosDir);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error.toLowerCase()).toContain('duplicate');
    });

    it('should fail with empty photoGroups array', () => {
      const photos = [{ filename: 'photo.jpg', score: 8 }];

      const result = resolvePhotoGroups([], photos, photosDir);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should fail with null photoGroups', () => {
      const photos = [{ filename: 'photo.jpg', score: 8 }];

      const result = resolvePhotoGroups(null, photos, photosDir);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should fail with undefined photoGroups', () => {
      const photos = [{ filename: 'photo.jpg', score: 8 }];

      const result = resolvePhotoGroups(undefined, photos, photosDir);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should fail with empty availablePhotos', () => {
      const groups = [{ name: 'Group A', pattern: 'a-*.jpg' }];

      const result = resolvePhotoGroups(groups, [], photosDir);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should fail with null availablePhotos', () => {
      const groups = [{ name: 'Group A', pattern: 'a-*.jpg' }];

      const result = resolvePhotoGroups(groups, null, photosDir);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should fail when group is missing name', () => {
      createTestPhotos('a-01.jpg');
      const photos = [{ filename: 'a-01.jpg', score: 8 }];

      const groups = [
        { pattern: 'a-*.jpg' },
      ];

      const result = resolvePhotoGroups(groups, photos, photosDir);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error.toLowerCase()).toContain('name');
    });

    it('should fail when group is missing pattern', () => {
      createTestPhotos('a-01.jpg');
      const photos = [{ filename: 'a-01.jpg', score: 8 }];

      const groups = [
        { name: 'Group A' },
      ];

      const result = resolvePhotoGroups(groups, photos, photosDir);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error.toLowerCase()).toContain('pattern');
    });
  });
});
