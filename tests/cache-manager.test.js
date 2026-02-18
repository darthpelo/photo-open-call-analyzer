/**
 * Unit Tests for Cache Manager (FR-3.7 / ADR-017)
 *
 * TDD: Tests written before implementation.
 *
 * Tests all cache-manager.js exports:
 * - computePhotoHash(): SHA-256 of file bytes
 * - computeCacheKey(): Combined hash of photo + config + model
 * - getCachedResult(): Cache lookup
 * - setCachedResult(): Cache storage with atomic writes
 * - clearCache(): Delete all cache entries
 * - getCacheStats(): Cache metrics
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  computePhotoHash,
  computeCacheKey,
  getCachedResult,
  setCachedResult,
  clearCache,
  getCacheStats
} from '../src/processing/cache-manager.js';

describe('Cache Manager - Unit Tests', () => {
  let testDir;
  let testPhotoPath;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-test-'));
    // Create a fake photo file for hashing tests
    testPhotoPath = path.join(testDir, 'test-photo.jpg');
    fs.writeFileSync(testPhotoPath, 'fake-photo-content-bytes');
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // ============================================
  // computePhotoHash()
  // ============================================

  describe('computePhotoHash()', () => {
    it('should return SHA-256 hex string (64 characters)', async () => {
      const hash = await computePhotoHash(testPhotoPath);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should return consistent hash for same file', async () => {
      const hash1 = await computePhotoHash(testPhotoPath);
      const hash2 = await computePhotoHash(testPhotoPath);
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different file content', async () => {
      const otherPhotoPath = path.join(testDir, 'other-photo.jpg');
      fs.writeFileSync(otherPhotoPath, 'different-content-bytes');

      const hash1 = await computePhotoHash(testPhotoPath);
      const hash2 = await computePhotoHash(otherPhotoPath);
      expect(hash1).not.toBe(hash2);
    });

    it('should match expected SHA-256 of file bytes', async () => {
      const fileBytes = fs.readFileSync(testPhotoPath);
      const expected = crypto.createHash('sha256').update(fileBytes).digest('hex');
      const hash = await computePhotoHash(testPhotoPath);
      expect(hash).toBe(expected);
    });

    it('should throw for non-existent file', async () => {
      await expect(computePhotoHash('/no/such/file.jpg')).rejects.toThrow();
    });
  });

  // ============================================
  // computeCacheKey()
  // ============================================

  describe('computeCacheKey()', () => {
    it('should return SHA-256 hex string', () => {
      const key = computeCacheKey('photohash123', 'confighash456', 'llava:7b');
      expect(key).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should return consistent key for same inputs', () => {
      const key1 = computeCacheKey('aaa', 'bbb', 'llava:7b');
      const key2 = computeCacheKey('aaa', 'bbb', 'llava:7b');
      expect(key1).toBe(key2);
    });

    it('should return different key when photo hash differs', () => {
      const key1 = computeCacheKey('photo1', 'config', 'llava:7b');
      const key2 = computeCacheKey('photo2', 'config', 'llava:7b');
      expect(key1).not.toBe(key2);
    });

    it('should return different key when config hash differs', () => {
      const key1 = computeCacheKey('photo', 'config1', 'llava:7b');
      const key2 = computeCacheKey('photo', 'config2', 'llava:7b');
      expect(key1).not.toBe(key2);
    });

    it('should return different key when model differs', () => {
      const key1 = computeCacheKey('photo', 'config', 'llava:7b');
      const key2 = computeCacheKey('photo', 'config', 'llava:13b');
      expect(key1).not.toBe(key2);
    });
  });

  // ============================================
  // setCachedResult() + getCachedResult()
  // ============================================

  describe('setCachedResult() and getCachedResult()', () => {
    const mockResult = {
      photoPath: '/path/to/photo.jpg',
      filename: 'photo.jpg',
      scores: {
        individual: { Composition: { score: 8, weight: 25 } },
        summary: { weighted_average: 8.0 }
      },
      analysisText: 'Great composition'
    };

    const cacheKey = 'abc123def456abc123def456abc123def456abc123def456abc123def456abcd';

    it('should store and retrieve a cached result', () => {
      const stored = setCachedResult(testDir, cacheKey, mockResult, { photoFilename: 'photo.jpg' });
      expect(stored).toBe(true);

      const cached = getCachedResult(testDir, cacheKey);
      expect(cached).not.toBeNull();
      expect(cached.result).toEqual(mockResult);
    });

    it('should return null for cache miss', () => {
      const cached = getCachedResult(testDir, 'nonexistent-key');
      expect(cached).toBeNull();
    });

    it('should create .analysis-cache directory if it does not exist', () => {
      const cacheDir = path.join(testDir, '.analysis-cache');
      expect(fs.existsSync(cacheDir)).toBe(false);

      setCachedResult(testDir, cacheKey, mockResult, { photoFilename: 'photo.jpg' });
      expect(fs.existsSync(cacheDir)).toBe(true);
    });

    it('should store version, cacheKey, and metadata in the entry', () => {
      setCachedResult(testDir, cacheKey, mockResult, {
        photoFilename: 'photo.jpg',
        photoHash: 'phash123',
        configHash: 'chash456',
        model: 'llava:7b'
      });

      const cached = getCachedResult(testDir, cacheKey);
      expect(cached.version).toBe('1.0');
      expect(cached.cacheKey).toBe(cacheKey);
      expect(cached.photoFilename).toBe('photo.jpg');
      expect(cached.createdAt).toBeDefined();
    });

    it('should use atomic write (temp file + rename)', () => {
      setCachedResult(testDir, cacheKey, mockResult, { photoFilename: 'photo.jpg' });

      // Verify no .tmp files remain
      const cacheDir = path.join(testDir, '.analysis-cache');
      const files = fs.readdirSync(cacheDir);
      const tmpFiles = files.filter(f => f.endsWith('.tmp'));
      expect(tmpFiles).toHaveLength(0);
    });

    it('should overwrite existing cache entry', () => {
      setCachedResult(testDir, cacheKey, mockResult, { photoFilename: 'photo.jpg' });

      const updatedResult = { ...mockResult, analysisText: 'Updated analysis' };
      setCachedResult(testDir, cacheKey, updatedResult, { photoFilename: 'photo.jpg' });

      const cached = getCachedResult(testDir, cacheKey);
      expect(cached.result.analysisText).toBe('Updated analysis');
    });

    it('should return null when cache file is corrupted JSON', () => {
      const cacheDir = path.join(testDir, '.analysis-cache');
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(path.join(cacheDir, `${cacheKey}.json`), 'not valid json{{{');

      const cached = getCachedResult(testDir, cacheKey);
      expect(cached).toBeNull();
    });
  });

  // ============================================
  // clearCache()
  // ============================================

  describe('clearCache()', () => {
    it('should delete all cache entries', () => {
      setCachedResult(testDir, 'key1', { data: 1 }, { photoFilename: 'p1.jpg' });
      setCachedResult(testDir, 'key2', { data: 2 }, { photoFilename: 'p2.jpg' });

      const cleared = clearCache(testDir);
      expect(cleared).toBe(true);

      expect(getCachedResult(testDir, 'key1')).toBeNull();
      expect(getCachedResult(testDir, 'key2')).toBeNull();
    });

    it('should succeed when no cache directory exists', () => {
      const cleared = clearCache(testDir);
      expect(cleared).toBe(true);
    });

    it('should remove the .analysis-cache directory', () => {
      setCachedResult(testDir, 'key1', { data: 1 }, { photoFilename: 'p1.jpg' });
      clearCache(testDir);

      const cacheDir = path.join(testDir, '.analysis-cache');
      expect(fs.existsSync(cacheDir)).toBe(false);
    });
  });

  // ============================================
  // getCacheStats()
  // ============================================

  describe('getCacheStats()', () => {
    it('should return zero stats when no cache exists', () => {
      const stats = getCacheStats(testDir);
      expect(stats.totalEntries).toBe(0);
      expect(stats.totalSizeBytes).toBe(0);
    });

    it('should count cache entries correctly', () => {
      setCachedResult(testDir, 'key1', { data: 1 }, { photoFilename: 'p1.jpg' });
      setCachedResult(testDir, 'key2', { data: 2 }, { photoFilename: 'p2.jpg' });
      setCachedResult(testDir, 'key3', { data: 3 }, { photoFilename: 'p3.jpg' });

      const stats = getCacheStats(testDir);
      expect(stats.totalEntries).toBe(3);
    });

    it('should report total size greater than zero with entries', () => {
      setCachedResult(testDir, 'key1', { data: 'some content' }, { photoFilename: 'p1.jpg' });

      const stats = getCacheStats(testDir);
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
    });
  });
});
