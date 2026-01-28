 * Unit Tests for Checkpoint Manager
 * 
 * Tests all 7 checkpoint functions from checkpoint-manager.js
 * Following Phase 3 test design (Section 10, test-design.md)
 * 
 * P0 Critical Tests (must pass):
 * - UT-CP-001: computeConfigHash() consistency and uniqueness
 * - UT-CP-002: saveCheckpoint/loadCheckpoint round-trip
 * - UT-CP-003: validateCheckpoint() config hash validation
 * 
 * P1 Important Tests:
 * - UT-CP-004: initializeCheckpoint() schema compliance
 * - UT-CP-005: updateCheckpoint() incremental updates
 * - UT-CP-006: deleteCheckpoint() cleanup
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  computeConfigHash,
  loadCheckpoint,
  saveCheckpoint,
  validateCheckpoint,
  deleteCheckpoint,
  initializeCheckpoint,
  updateCheckpoint
} from '../src/processing/checkpoint-manager.js';

describe('Checkpoint Manager - Unit Tests', () => {
  let testDir;
  
  beforeEach(() => {
    // Create temp directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkpoint-test-'));
  });
  
  afterEach(() => {
    // Cleanup temp directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
  
  // ============================================
  // UT-CP-001: computeConfigHash()
  // Risk: P1 (important for config change detection)
  // ============================================
  
  describe('UT-CP-001: computeConfigHash()', () => {
    test('should produce consistent hash for same config', () => {
      const config1 = {
        title: 'Nature Photography',
        theme: 'Wildlife in natural habitat',
        jury: ['John Doe', 'Jane Smith']
      };
      
      const config2 = {
        title: 'Nature Photography',
        theme: 'Wildlife in natural habitat',
        jury: ['John Doe', 'Jane Smith']
      };
      
      const hash1 = computeConfigHash(config1);
      const hash2 = computeConfigHash(config2);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 produces 64 hex characters
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // Hex format
    });
    
    test('should produce different hash for different configs', () => {
      const config1 = {
        title: 'Nature Photography',
        theme: 'Wildlife'
      };
      
      const config2 = {
        title: 'Nature Photography',
        theme: 'Landscape' // Changed theme
      };
      
      const hash1 = computeConfigHash(config1);
      const hash2 = computeConfigHash(config2);
      
      expect(hash1).not.toBe(hash2);
    });
    
    test('should handle configs with different key orders (sorted internally)', () => {
      const config1 = {
        theme: 'Wildlife',
        title: 'Nature Photography',
        jury: ['John']
      };
      
      const config2 = {
        title: 'Nature Photography',
        jury: ['John'],
        theme: 'Wildlife'
      };
      
      const hash1 = computeConfigHash(config1);
      const hash2 = computeConfigHash(config2);
      
      // Should produce SAME hash because keys are sorted
      expect(hash1).toBe(hash2);
    });
    
    test('should detect nested object changes', () => {
      const config1 = {
        title: 'Test',
        metadata: { version: 1 }
      };
      
      const config2 = {
        title: 'Test',
        metadata: { version: 2 } // Changed nested value
      };
      
      const hash1 = computeConfigHash(config1);
      const hash2 = computeConfigHash(config2);
      
      expect(hash1).not.toBe(hash2);
    });
  });
  
  // ============================================
  // UT-CP-002: saveCheckpoint/loadCheckpoint
  // Risk: P0 CRITICAL (data integrity)
  // ============================================
  
  describe('UT-CP-002: saveCheckpoint/loadCheckpoint round-trip', () => {
    test('should save and load checkpoint with data integrity', () => {
      const checkpoint = {
        version: '1.0',
        projectDir: testDir,
        configHash: 'abc123',
        analysisPrompt: {
          criteria: [
            { name: 'Composition', weight: 25 }
          ]
        },
        batchMetadata: {
          parallelSetting: 3,
          checkpointInterval: 10,
          totalPhotosInBatch: 50
        },
        progress: {
          analyzedPhotos: ['photo-001.jpg', 'photo-002.jpg'],
          photosCount: 2,
          failedPhotos: [],
          status: 'in_progress'
        },
        results: {
          scores: {
            'photo-001.jpg': { Composition: 8.5 },
            'photo-002.jpg': { Composition: 7.0 }
          },
          statistics: null,
          lastUpdateTime: '2026-01-28T10:00:00Z'
        },
        metadata: {
          createdAt: '2026-01-28T09:00:00Z',
          lastResumedAt: '2026-01-28T10:00:00Z',
          resumeCount: 1
        }
      };
      
      const saved = saveCheckpoint(checkpoint, testDir);
      expect(saved).toBe(true);
      
      const loaded = loadCheckpoint(testDir);
      expect(loaded).toBeTruthy();
      expect(loaded.version).toBe('1.0');
      expect(loaded.configHash).toBe('abc123');
      expect(loaded.progress.analyzedPhotos).toEqual(['photo-001.jpg', 'photo-002.jpg']);
      expect(loaded.results.scores['photo-001.jpg'].Composition).toBe(8.5);
    });
    
    test('should return null if checkpoint does not exist', () => {
      const loaded = loadCheckpoint(testDir);
      expect(loaded).toBeNull();
    });
    
    test('should return null if checkpoint file is corrupted (invalid JSON)', () => {
      const checkpointPath = path.join(testDir, '.analysis-checkpoint.json');
      fs.writeFileSync(checkpointPath, 'NOT VALID JSON{{{', 'utf8');
      
      const loaded = loadCheckpoint(testDir);
      expect(loaded).toBeNull();
    });
    
    test('should overwrite existing checkpoint on save', () => {
      const checkpoint1 = initializeCheckpoint(
        testDir,
        { title: 'Test' },
        { criteria: [] },
        50,
        3,
        10,
        path.join(testDir, 'photos')
      );
      
      saveCheckpoint(checkpoint1, testDir);
      
      const checkpoint2 = { ...checkpoint1, configHash: 'modified' };
      saveCheckpoint(checkpoint2, testDir);
      
      const loaded = loadCheckpoint(testDir);
      expect(loaded.configHash).toBe('modified');
    });
    
    test('should handle large checkpoint data (1000+ photos)', () => {
      const largePhotos = Array.from({ length: 1000 }, (_, i) => `photo-${String(i + 1).padStart(4, '0')}.jpg`);
      
      const checkpoint = initializeCheckpoint(
        testDir,
        { title: 'Large Batch' },
        { criteria: [] },
        1000,
        3,
        10,
        path.join(testDir, 'photos')
      );
      
      checkpoint.progress.analyzedPhotos = largePhotos;
      checkpoint.progress.photosCount = 1000;
      
      const saved = saveCheckpoint(checkpoint, testDir);
      expect(saved).toBe(true);
      
      const loaded = loadCheckpoint(testDir);
      expect(loaded.progress.analyzedPhotos).toHaveLength(1000);
      expect(loaded.progress.analyzedPhotos[999]).toBe('photo-1000.jpg');
    });
  });
  
  // ============================================
  // UT-CP-003: validateCheckpoint()
  // Risk: P0 CRITICAL (config change detection)
  // ============================================
  
  describe('UT-CP-003: validateCheckpoint()', () => {
    test('should validate checkpoint with matching config hash', () => {
      const config = {
        title: 'Nature Photography',
        theme: 'Wildlife'
      };
      
      const checkpoint = initializeCheckpoint(
        testDir,
        config,
        { criteria: [] },
        50,
        3,
        10,
        path.join(testDir, 'photos')
      );
      
      const result = validateCheckpoint(checkpoint, config);
      expect(result.valid).toBe(true);
      expect(result.reason).toBe('Checkpoint valid');
    });
    
    test('should invalidate checkpoint with mismatched config hash', () => {
      const config1 = {
        title: 'Nature Photography',
        theme: 'Wildlife'
      };
      
      const config2 = {
        title: 'Nature Photography',
        theme: 'Landscape' // Changed theme
      };
      
      const checkpoint = initializeCheckpoint(
        testDir,
        config1,
        { criteria: [] },
        50,
        3,
        10,
        path.join(testDir, 'photos')
      );
      
      const result = validateCheckpoint(checkpoint, config2);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Config changed');
    });
    
    test('should invalidate null checkpoint', () => {
      const result = validateCheckpoint(null, { title: 'Test' });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('null or not an object');
    });
    
    test('should invalidate checkpoint with missing required fields', () => {
      const invalidCheckpoint = {
        version: '1.0'
        // Missing configHash, progress, metadata
      };
      
      const result = validateCheckpoint(invalidCheckpoint, { title: 'Test' });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Missing');
    });
    
    test('should invalidate checkpoint with wrong version', () => {
      const checkpoint = initializeCheckpoint(
        testDir,
        { title: 'Test' },
        { criteria: [] },
        50,
        3,
        10,
        path.join(testDir, 'photos')
      );
      
      checkpoint.version = '2.0'; // Future version
      
      const result = validateCheckpoint(checkpoint, { title: 'Test' });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Unsupported checkpoint version');
    });
    
    test('should invalidate checkpoint older than 7 days', () => {
      const config = { title: 'Test' };
      const checkpoint = initializeCheckpoint(
        testDir,
        config,
        { criteria: [] },
        50,
        3,
        10,
        path.join(testDir, 'photos')
      );
      
      // Set createdAt to 8 days ago
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      checkpoint.metadata.createdAt = eightDaysAgo.toISOString();
      
      const result = validateCheckpoint(checkpoint, config);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('too old');
    });
    
    test('should validate checkpoint with age < 7 days', () => {
      const config = { title: 'Test' };
      const checkpoint = initializeCheckpoint(
        testDir,
        config,
        { criteria: [] },
        50,
        3,
        10,
        path.join(testDir, 'photos')
      );
      
      // Set createdAt to 3 days ago
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      checkpoint.metadata.createdAt = threeDaysAgo.toISOString();
      
      const result = validateCheckpoint(checkpoint, config);
      expect(result.valid).toBe(true);
    });
  });
  
  // ============================================
  // UT-CP-004: initializeCheckpoint()
  // Risk: Low (schema compliance)
  // ============================================
  
  describe('UT-CP-004: initializeCheckpoint()', () => {
    test('should create checkpoint with all required fields', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Nature'
      };
      
      const analysisPrompt = {
        criteria: [
          { name: 'Composition', weight: 30 },
          { name: 'Lighting', weight: 25 }
        ]
      };
      
      const checkpoint = initializeCheckpoint(
        testDir,
        config,
        analysisPrompt,
        100,
        3,
        10,
        path.join(testDir, 'photos')
      );
      
      // Check structure
      expect(checkpoint.version).toBe('1.0');
      expect(checkpoint.projectDir).toBe(testDir);
      expect(checkpoint.configHash).toBeTruthy();
      expect(checkpoint.configHash).toHaveLength(64);
      
      expect(checkpoint.analysisPrompt).toEqual(analysisPrompt);
      
      expect(checkpoint.batchMetadata.parallelSetting).toBe(3);
      expect(checkpoint.batchMetadata.checkpointInterval).toBe(10);
      expect(checkpoint.batchMetadata.totalPhotosInBatch).toBe(100);
      
      expect(checkpoint.progress.analyzedPhotos).toEqual([]);
      expect(checkpoint.progress.photosCount).toBe(0);
      expect(checkpoint.progress.failedPhotos).toEqual([]);
      expect(checkpoint.progress.status).toBe('in_progress');
      
      expect(checkpoint.results.scores).toEqual({});
      expect(checkpoint.results.statistics).toBeNull();
      
      expect(checkpoint.metadata.createdAt).toBeTruthy();
      expect(checkpoint.metadata.lastResumedAt).toBeTruthy();
      expect(checkpoint.metadata.resumeCount).toBe(0);
    });
    
    test('should create valid timestamps in ISO 8601 format', () => {
      const checkpoint = initializeCheckpoint(
        testDir,
        { title: 'Test' },
        { criteria: [] },
        50,
        3,
        10,
        path.join(testDir, 'photos')
      );
      
      // Test ISO 8601 format (e.g., "2026-01-28T10:30:00.000Z")
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(checkpoint.metadata.createdAt).toMatch(isoRegex);
      expect(checkpoint.metadata.lastResumedAt).toMatch(isoRegex);
    });
  });
  
  // ============================================
  // UT-CP-005: updateCheckpoint()
  // Risk: Low (incremental updates)
  // ============================================
  
  describe('UT-CP-005: updateCheckpoint()', () => {
    test('should add new photos to analyzed list', () => {
      const checkpoint = initializeCheckpoint(
        testDir,
        { title: 'Test' },
        { criteria: [] },
        50,
        3,
        10,
        path.join(testDir, 'photos')
      );
      
      const newPhotos = ['photo-001.jpg', 'photo-002.jpg'];
      const newResults = {
        'photo-001.jpg': { Composition: 8.5 },
        'photo-002.jpg': { Composition: 7.0 }
      };
      
      const updated = updateCheckpoint(checkpoint, newPhotos, newResults);
      
      expect(updated.progress.analyzedPhotos).toEqual(newPhotos);
      expect(updated.progress.photosCount).toBe(2);
      expect(updated.results.scores['photo-001.jpg'].Composition).toBe(8.5);
    });
    
    test('should handle incremental updates without data loss', () => {
      const checkpoint = initializeCheckpoint(
        testDir,
        { title: 'Test' },
        { criteria: [] },
        50,
        3,
        10,
        path.join(testDir, 'photos')
      );
      
      // First batch
      updateCheckpoint(
        checkpoint,
        ['photo-001.jpg', 'photo-002.jpg'],
        {
          'photo-001.jpg': { Composition: 8.5 },
          'photo-002.jpg': { Composition: 7.0 }
        }
      );
      
      // Second batch
      updateCheckpoint(
        checkpoint,
        ['photo-003.jpg', 'photo-004.jpg'],
        {
          'photo-003.jpg': { Composition: 9.0 },
          'photo-004.jpg': { Composition: 6.5 }
        }
      );
      
      expect(checkpoint.progress.analyzedPhotos).toHaveLength(4);
      expect(checkpoint.progress.photosCount).toBe(4);
      expect(checkpoint.results.scores['photo-001.jpg'].Composition).toBe(8.5);
      expect(checkpoint.results.scores['photo-003.jpg'].Composition).toBe(9.0);
    });
    
    test('should track failed photos', () => {
      const checkpoint = initializeCheckpoint(
        testDir,
        { title: 'Test' },
        { criteria: [] },
        50,
        3,
        10,
        path.join(testDir, 'photos')
      );
      
      updateCheckpoint(
        checkpoint,
        ['photo-001.jpg'],
        { 'photo-001.jpg': { Composition: 8.5 } },
        ['photo-002.jpg'] // Failed photo
      );
      
      expect(checkpoint.progress.failedPhotos).toContain('photo-002.jpg');
    });
    
    test('should increment resume count on each update', () => {
      const checkpoint = initializeCheckpoint(
        testDir,
        { title: 'Test' },
        { criteria: [] },
        50,
        3,
        10,
        path.join(testDir, 'photos')
      );
      
      expect(checkpoint.metadata.resumeCount).toBe(0);
      
      updateCheckpoint(checkpoint, ['photo-001.jpg'], {});
      expect(checkpoint.metadata.resumeCount).toBe(1);
      
      updateCheckpoint(checkpoint, ['photo-002.jpg'], {});
      expect(checkpoint.metadata.resumeCount).toBe(2);
    });
    
    test('should handle large arrays (1000+ photos) without performance issues', () => {
      const checkpoint = initializeCheckpoint(
        testDir,
        { title: 'Large Batch' },
        { criteria: [] },
        1500,
        3,
        10,
        path.join(testDir, 'photos')
      );
      
      const largePhotos = Array.from({ length: 1000 }, (_, i) => `photo-${i + 1}.jpg`);
      const largeResults = {};
      largePhotos.forEach(photo => {
        largeResults[photo] = { Composition: Math.random() * 10 };
      });
      
      const startTime = Date.now();
      updateCheckpoint(checkpoint, largePhotos, largeResults);
      const duration = Date.now() - startTime;
      
      expect(checkpoint.progress.analyzedPhotos).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete in < 1 second
    });
  });
  
  // ============================================
  // UT-CP-006: deleteCheckpoint()
  // Risk: Low (cleanup)
  // ============================================
  
  describe('UT-CP-006: deleteCheckpoint()', () => {
    test('should delete checkpoint file successfully', () => {
      const checkpoint = initializeCheckpoint(
        testDir,
        { title: 'Test' },
        { criteria: [] },
        50,
        3,
        10,
        path.join(testDir, 'photos')
      );
      
      saveCheckpoint(checkpoint, testDir);
      
      const checkpointPath = path.join(testDir, '.analysis-checkpoint.json');
      expect(fs.existsSync(checkpointPath)).toBe(true);
      
      const deleted = deleteCheckpoint(testDir);
      expect(deleted).toBe(true);
      expect(fs.existsSync(checkpointPath)).toBe(false);
    });
    
    test('should return true if checkpoint does not exist (idempotent)', () => {
      const deleted = deleteCheckpoint(testDir);
      expect(deleted).toBe(true);
    });
    
    test('should not throw error if directory does not exist', () => {
      const nonExistentDir = path.join(testDir, 'does-not-exist');
      
      expect(() => {
        deleteCheckpoint(nonExistentDir);
      }).not.toThrow();
    });
  });
});
