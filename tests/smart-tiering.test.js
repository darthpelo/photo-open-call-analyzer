/**
 * Smart Tiering Tests - M3 Feature
 * TDD-first test suite for photo confidence classification
 */

import { describe, it, expect } from 'vitest';
import { generateTiers, calculateBoundaries, validateTierData } from '../src/analysis/smart-tiering.js';

describe('Smart Tiering - M3 Feature', () => {
  describe('generateTiers - Basic Classification', () => {
    it('should create 3 tiers with default thresholds', () => {
      const photos = [
        { filename: 'strong.jpg', score: 9.1 },
        { filename: 'good.jpg', score: 8.0 },
        { filename: 'decent.jpg', score: 7.0 },
        { filename: 'weak.jpg', score: 5.5 }
      ];

      const result = generateTiers(photos);

      expect(result).toHaveProperty('tier1');
      expect(result).toHaveProperty('tier2');
      expect(result).toHaveProperty('tier3');
      expect(result.tier1).toContainEqual(
        expect.objectContaining({ filename: 'strong.jpg' })
      );
      expect(result.tier1).toHaveLength(1); // 9.1
      expect(result.tier2).toHaveLength(2); // 8.0, 7.0
      expect(result.tier3).toHaveLength(1); // 5.5
    });

    it('should sort photos within tiers by score descending', () => {
      const photos = [
        { filename: 'a.jpg', score: 8.5 },
        { filename: 'b.jpg', score: 8.9 },
        { filename: 'c.jpg', score: 8.1 }
      ];

      const result = generateTiers(photos);

      expect(result.tier1[0].score).toBe(8.9);
      expect(result.tier1[1].score).toBe(8.5);
      expect(result.tier1[2].score).toBe(8.1);
    });

    it('should classify using correct default thresholds (8.0, 6.5)', () => {
      const photos = [
        { filename: 'tier1.jpg', score: 9.0 },
        { filename: 'tier2a.jpg', score: 8.0 },
        { filename: 'tier2b.jpg', score: 7.0 },
        { filename: 'tier3a.jpg', score: 6.5 },
        { filename: 'tier3b.jpg', score: 5.0 }
      ];

      const result = generateTiers(photos);

      expect(result.tier1).toHaveLength(1); // 9.0
      expect(result.tier2).toHaveLength(2); // 8.0, 7.0
      expect(result.tier3).toHaveLength(2); // 6.5, 5.0
    });

    it('should return correct summary metadata', () => {
      const photos = [
        { filename: 'photo1.jpg', score: 8.5 },
        { filename: 'photo2.jpg', score: 7.0 },
        { filename: 'photo3.jpg', score: 5.0 }
      ];

      const result = generateTiers(photos);

      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBe(3);
      expect(result.summary.tier1_count).toBe(1);
      expect(result.summary.tier2_count).toBe(1);
      expect(result.summary.tier3_count).toBe(1);
      expect(result.summary.high_threshold).toBe(8.0);
      expect(result.summary.medium_threshold).toBe(6.5);
    });

    it('should account for all photos in tiers', () => {
      const photos = Array(20).fill(null).map((_, i) => ({
        filename: `photo-${i}.jpg`,
        score: Math.random() * 10
      }));

      const result = generateTiers(photos);

      const totalTiered = result.tier1.length + result.tier2.length + result.tier3.length;
      expect(totalTiered).toBe(20);
    });
  });

  describe('Tie-Breaking', () => {
    it('should break ties by sorting alphabetically', () => {
      const photos = [
        { filename: 'zebra.jpg', score: 9.0 },
        { filename: 'apple.jpg', score: 9.0 },
        { filename: 'banana.jpg', score: 9.0 }
      ];

      const result = generateTiers(photos);

      expect(result.tier1[0].filename).toBe('apple.jpg');
      expect(result.tier1[1].filename).toBe('banana.jpg');
      expect(result.tier1[2].filename).toBe('zebra.jpg');
    });

    it('should handle multiple ties consistently', () => {
      const photos = [
        { filename: 'first.jpg', score: 9.5 },
        { filename: 'second.jpg', score: 9.5 },
        { filename: 'third.jpg', score: 7.5 },
        { filename: 'fourth.jpg', score: 7.5 }
      ];

      const result = generateTiers(photos);

      // All 9.5s sorted alphabetically in tier1 (both > 8.0)
      expect(result.tier1[0].filename).toBe('first.jpg');
      expect(result.tier1[1].filename).toBe('second.jpg');
      // All 7.5s sorted alphabetically in tier2 (both between 6.5 and 8.0)
      expect(result.tier2[0].filename).toBe('fourth.jpg');
      expect(result.tier2[1].filename).toBe('third.jpg');
    });
  });

  describe('Edge Cases - Empty & Single', () => {
    it('should handle empty array', () => {
      const result = generateTiers([]);

      expect(result.tier1).toEqual([]);
      expect(result.tier2).toEqual([]);
      expect(result.tier3).toEqual([]);
      expect(result.summary.total).toBe(0);
    });

    it('should handle single photo', () => {
      const result = generateTiers([
        { filename: 'only.jpg', score: 7.5 }
      ]);

      expect(result.tier1).toHaveLength(0);
      expect(result.tier2).toHaveLength(1);
      expect(result.tier3).toHaveLength(0);
    });

    it('should handle all photos in single tier (high scores)', () => {
      const photos = [
        { filename: 'photo1.jpg', score: 9.0 },
        { filename: 'photo2.jpg', score: 8.5 },
        { filename: 'photo3.jpg', score: 8.2 }
      ];

      const result = generateTiers(photos);

      expect(result.tier1).toHaveLength(3);
      expect(result.tier2).toHaveLength(0);
      expect(result.tier3).toHaveLength(0);
    });

    it('should handle all photos in single tier (low scores)', () => {
      const photos = [
        { filename: 'photo1.jpg', score: 3.0 },
        { filename: 'photo2.jpg', score: 2.5 },
        { filename: 'photo3.jpg', score: 1.0 }
      ];

      const result = generateTiers(photos);

      expect(result.tier1).toHaveLength(0);
      expect(result.tier2).toHaveLength(0);
      expect(result.tier3).toHaveLength(3);
    });
  });

  describe('Edge Cases - Score Clamping', () => {
    it('should clamp scores above 10 to 10', () => {
      const photos = [
        { filename: 'high.jpg', score: 15.0 }
      ];

      const result = generateTiers(photos);

      // Should still be classified even if score was out of range
      expect(result.tier1.length + result.tier2.length + result.tier3.length).toBe(1);
      expect(result.tier1).toHaveLength(1); // clamped to 10, still tier1
    });

    it('should clamp scores below 1 to 1', () => {
      const photos = [
        { filename: 'low.jpg', score: -5.0 }
      ];

      const result = generateTiers(photos);

      // Should still be classified
      expect(result.tier1.length + result.tier2.length + result.tier3.length).toBe(1);
      expect(result.tier3).toHaveLength(1); // clamped to 1, tier3
    });

    it('should handle NaN scores', () => {
      const photos = [
        { filename: 'valid.jpg', score: 7.5 },
        { filename: 'invalid.jpg', score: NaN }
      ];

      const result = generateTiers(photos);

      // Should gracefully handle NaN (treat as default or skip)
      expect(result.tier1.length + result.tier2.length + result.tier3.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle null scores', () => {
      const photos = [
        { filename: 'valid.jpg', score: 8.0 },
        { filename: 'no-score.jpg', score: null }
      ];

      const result = generateTiers(photos);

      // Should handle gracefully
      expect(result.tier1.length + result.tier2.length + result.tier3.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle undefined scores', () => {
      const photos = [
        { filename: 'valid.jpg', score: 8.0 },
        { filename: 'no-score.jpg', score: undefined }
      ];

      const result = generateTiers(photos);

      // Should handle gracefully
      expect(result.tier1.length + result.tier2.length + result.tier3.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Configuration - Custom Thresholds', () => {
    it('should respect custom tier thresholds', () => {
      const photos = [
        { filename: 'photo1.jpg', score: 9.5 },
        { filename: 'photo2.jpg', score: 8.0 },
        { filename: 'photo3.jpg', score: 6.0 },
        { filename: 'photo4.jpg', score: 4.0 }
      ];

      const customThresholds = { high: 9.0, medium: 7.0 };
      const result = generateTiers(photos, customThresholds);

      expect(result.tier1).toHaveLength(1); // 9.5 >= 9.0
      expect(result.tier2).toHaveLength(1); // 8.0 >= 7.0
      expect(result.tier3).toHaveLength(2); // 6.0, 4.0
    });

    it('should store thresholds in summary', () => {
      const photos = [{ filename: 'photo.jpg', score: 7.5 }];
      const customThresholds = { high: 9.0, medium: 6.0 };

      const result = generateTiers(photos, customThresholds);

      expect(result.summary.high_threshold).toBe(9.0);
      expect(result.summary.medium_threshold).toBe(6.0);
    });
  });

  describe('Large Dataset Performance', () => {
    it('should handle large batch (100+ photos)', () => {
      const photos = Array(100).fill(null).map((_, i) => ({
        filename: `photo-${String(i).padStart(3, '0')}.jpg`,
        score: Math.random() * 10
      }));

      const result = generateTiers(photos);

      expect(result.tier1.length + result.tier2.length + result.tier3.length).toBe(100);
      expect(result.summary.total).toBe(100);
    });

    it('should handle very large batch (250+ photos)', () => {
      const photos = Array(250).fill(null).map((_, i) => ({
        filename: `photo-${String(i).padStart(3, '0')}.jpg`,
        score: Math.random() * 10
      }));

      const result = generateTiers(photos);

      expect(result.tier1.length + result.tier2.length + result.tier3.length).toBe(250);
    });

    it('should maintain sort order within large batches', () => {
      const photos = Array(50).fill(null).map((_, i) => ({
        filename: `photo-${String(i).padStart(2, '0')}.jpg`,
        score: Math.random() * 10
      }));

      const result = generateTiers(photos);

      // Check tier1 is sorted descending
      for (let i = 0; i < result.tier1.length - 1; i++) {
        expect(result.tier1[i].score).toBeGreaterThanOrEqual(result.tier1[i + 1].score);
      }
    });
  });

  describe('calculateBoundaries', () => {
    it('should calculate percentile-based boundaries', () => {
      const scores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const boundaries = calculateBoundaries(scores, 'percentile');

      expect(boundaries).toHaveProperty('high');
      expect(boundaries).toHaveProperty('medium');
      expect(boundaries.high).toBeGreaterThan(boundaries.medium);
    });

    it('should return defaults for empty array', () => {
      const boundaries = calculateBoundaries([]);

      expect(boundaries.high).toBe(8.0);
      expect(boundaries.medium).toBe(6.5);
    });
  });

  describe('validateTierData', () => {
    it('should validate correct photo object', () => {
      const photo = { filename: 'photo.jpg', score: 7.5 };

      const isValid = validateTierData(photo);

      expect(isValid).toBe(true);
    });

    it('should reject photo without filename', () => {
      const photo = { score: 7.5 };

      const isValid = validateTierData(photo);

      expect(isValid).toBe(false);
    });

    it('should reject photo without score', () => {
      const photo = { filename: 'photo.jpg' };

      const isValid = validateTierData(photo);

      expect(isValid).toBe(false);
    });

    it('should reject null photo', () => {
      const isValid = validateTierData(null);

      expect(isValid).toBe(false);
    });

    it('should reject non-object', () => {
      const isValid = validateTierData('not an object');

      expect(isValid).toBe(false);
    });
  });

  describe('Statistical Edge Cases', () => {
    it('should handle bimodal distribution (two distinct clusters)', () => {
      const photos = [
        { filename: 'high1.jpg', score: 9.5 },
        { filename: 'high2.jpg', score: 9.3 },
        { filename: 'low1.jpg', score: 2.5 },
        { filename: 'low2.jpg', score: 2.3 }
      ];

      const result = generateTiers(photos);

      expect(result.tier1.length + result.tier2.length + result.tier3.length).toBe(4);
      expect(result.summary.total).toBe(4);
    });

    it('should handle uniform distribution (all same score)', () => {
      const photos = [
        { filename: 'a.jpg', score: 7.0 },
        { filename: 'b.jpg', score: 7.0 },
        { filename: 'c.jpg', score: 7.0 }
      ];

      const result = generateTiers(photos);

      expect(result.tier1.length + result.tier2.length + result.tier3.length).toBe(3);
      expect(result.tier2).toHaveLength(3);
    });

    it('should handle normal distribution curve correctly', () => {
      const photos = [
        { filename: 'p1.jpg', score: 9.0 },
        { filename: 'p2.jpg', score: 7.5 },
        { filename: 'p3.jpg', score: 7.0 },
        { filename: 'p4.jpg', score: 7.0 },
        { filename: 'p5.jpg', score: 7.0 },
        { filename: 'p6.jpg', score: 6.5 },
        { filename: 'p7.jpg', score: 5.0 }
      ];

      const result = generateTiers(photos);

      expect(result.summary.total).toBe(7);
      expect(result.summary.average_score).toBeDefined();
    });

    it('should preserve average_score precision', () => {
      const photos = [
        { filename: 'a.jpg', score: 8.3 },
        { filename: 'b.jpg', score: 8.7 }
      ];

      const result = generateTiers(photos);

      const avg = (8.3 + 8.7) / 2;
      expect(result.summary.average_score).toBe(Math.round(avg * 10) / 10);
    });
  });

  describe('Performance & Stability', () => {
    it('should maintain deterministic order across multiple runs', () => {
      const photos = [
        { filename: 'z.jpg', score: 7.5 },
        { filename: 'a.jpg', score: 7.5 },
        { filename: 'm.jpg', score: 7.5 }
      ];

      const result1 = generateTiers(photos);
      const result2 = generateTiers(photos);

      const order1 = result1.tier2.map(p => p.filename).join(',');
      const order2 = result2.tier2.map(p => p.filename).join(',');

      expect(order1).toBe(order2);
    });

    it('should handle memory efficiently with 1000 photos', () => {
      const photos = Array(1000).fill(null).map((_, i) => ({
        filename: `photo-${String(i).padStart(4, '0')}.jpg`,
        score: Math.random() * 10
      }));

      const result = generateTiers(photos);

      expect(result.summary.total).toBe(1000);
      expect(result.tier1.length + result.tier2.length + result.tier3.length).toBe(1000);
    });

    it('should handle extreme threshold values', () => {
      const photos = [
        { filename: 'p1.jpg', score: 5.0 },
        { filename: 'p2.jpg', score: 5.0 }
      ];

      const result = generateTiers(photos, { high: 1.0, medium: 0.5 });

      expect(result.tier1).toHaveLength(2);
      expect(result.tier2).toHaveLength(0);
      expect(result.tier3).toHaveLength(0);
    });
  });
});
