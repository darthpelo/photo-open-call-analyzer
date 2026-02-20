import { describe, it, expect } from 'vitest';
import {
  generateCombinations,
  countCombinations,
  selectCandidateSets,
  calculateDiversity
} from '../src/processing/combination-generator.js';

describe('combination-generator', () => {
  describe('countCombinations', () => {
    it('should return correct C(n,k) values', () => {
      expect(countCombinations(4, 2)).toBe(6);
      expect(countCombinations(5, 3)).toBe(10);
      expect(countCombinations(10, 4)).toBe(210);
      expect(countCombinations(12, 4)).toBe(495);
      expect(countCombinations(20, 4)).toBe(4845);
    });

    it('should return 1 for C(n,0) and C(n,n)', () => {
      expect(countCombinations(5, 0)).toBe(1);
      expect(countCombinations(5, 5)).toBe(1);
    });

    it('should return n for C(n,1)', () => {
      expect(countCombinations(5, 1)).toBe(5);
      expect(countCombinations(10, 1)).toBe(10);
    });

    it('should return 0 when k > n', () => {
      expect(countCombinations(3, 5)).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(countCombinations(0, 0)).toBe(1);
      expect(countCombinations(1, 1)).toBe(1);
    });
  });

  describe('generateCombinations', () => {
    it('should generate all C(4,2) = 6 combinations', () => {
      const items = ['a', 'b', 'c', 'd'];
      const combos = [...generateCombinations(items, 2)];
      expect(combos.length).toBe(6);
      expect(combos).toContainEqual(['a', 'b']);
      expect(combos).toContainEqual(['a', 'c']);
      expect(combos).toContainEqual(['a', 'd']);
      expect(combos).toContainEqual(['b', 'c']);
      expect(combos).toContainEqual(['b', 'd']);
      expect(combos).toContainEqual(['c', 'd']);
    });

    it('should generate all C(5,3) = 10 combinations', () => {
      const items = [1, 2, 3, 4, 5];
      const combos = [...generateCombinations(items, 3)];
      expect(combos.length).toBe(10);
    });

    it('should generate C(n,n) = 1 combination (all items)', () => {
      const items = ['a', 'b', 'c'];
      const combos = [...generateCombinations(items, 3)];
      expect(combos.length).toBe(1);
      expect(combos[0]).toEqual(['a', 'b', 'c']);
    });

    it('should generate C(n,1) = n combinations (each item)', () => {
      const items = ['a', 'b', 'c'];
      const combos = [...generateCombinations(items, 1)];
      expect(combos.length).toBe(3);
    });

    it('should return empty for k > n', () => {
      const items = ['a', 'b'];
      const combos = [...generateCombinations(items, 3)];
      expect(combos.length).toBe(0);
    });

    it('should return empty for empty array', () => {
      const combos = [...generateCombinations([], 2)];
      expect(combos.length).toBe(0);
    });

    it('should work with object items', () => {
      const items = [
        { filename: 'a.jpg', score: 8 },
        { filename: 'b.jpg', score: 7 },
        { filename: 'c.jpg', score: 9 }
      ];
      const combos = [...generateCombinations(items, 2)];
      expect(combos.length).toBe(3);
      expect(combos[0][0]).toHaveProperty('filename');
    });

    it('should generate correct count for typical Polaroid use case C(12,4)', () => {
      const items = Array.from({ length: 12 }, (_, i) => ({ id: i }));
      const combos = [...generateCombinations(items, 4)];
      expect(combos.length).toBe(495);
    });
  });

  describe('calculateDiversity', () => {
    it('should return high diversity for photos with varied criterion profiles', () => {
      const photos = [
        { filename: 'a.jpg', scores: { 'Theme': 9, 'Technical': 5, 'Creativity': 3 } },
        { filename: 'b.jpg', scores: { 'Theme': 3, 'Technical': 9, 'Creativity': 5 } },
        { filename: 'c.jpg', scores: { 'Theme': 5, 'Technical': 3, 'Creativity': 9 } },
        { filename: 'd.jpg', scores: { 'Theme': 7, 'Technical': 7, 'Creativity': 7 } }
      ];
      const diversity = calculateDiversity(photos);
      expect(diversity).toBeGreaterThan(0.3);
    });

    it('should return low diversity for photos with identical profiles', () => {
      const photos = [
        { filename: 'a.jpg', scores: { 'Theme': 7, 'Technical': 7, 'Creativity': 7 } },
        { filename: 'b.jpg', scores: { 'Theme': 7, 'Technical': 7, 'Creativity': 7 } },
        { filename: 'c.jpg', scores: { 'Theme': 7, 'Technical': 7, 'Creativity': 7 } },
        { filename: 'd.jpg', scores: { 'Theme': 7, 'Technical': 7, 'Creativity': 7 } }
      ];
      const diversity = calculateDiversity(photos);
      expect(diversity).toBe(0);
    });

    it('should return value between 0 and 1', () => {
      const photos = [
        { filename: 'a.jpg', scores: { 'Theme': 8, 'Technical': 6 } },
        { filename: 'b.jpg', scores: { 'Theme': 6, 'Technical': 8 } },
        { filename: 'c.jpg', scores: { 'Theme': 7, 'Technical': 7 } },
        { filename: 'd.jpg', scores: { 'Theme': 5, 'Technical': 9 } }
      ];
      const diversity = calculateDiversity(photos);
      expect(diversity).toBeGreaterThanOrEqual(0);
      expect(diversity).toBeLessThanOrEqual(1);
    });

    it('should handle photos without scores gracefully', () => {
      const photos = [
        { filename: 'a.jpg' },
        { filename: 'b.jpg' }
      ];
      const diversity = calculateDiversity(photos);
      expect(diversity).toBe(0);
    });
  });

  describe('selectCandidateSets - safety limit', () => {
    const makePhoto = (name, score, scores = {}) => ({
      filename: name, score, scores
    });

    it('should throw when combinations exceed MAX_SAFE_COMBINATIONS', () => {
      // C(30, 6) = 593,775 - way over default 10,000 limit
      const photos = Array.from({ length: 30 }, (_, i) =>
        makePhoto(`photo${i}.jpg`, 9 - i * 0.1, { Theme: 9 - i * 0.1 })
      );

      expect(() => selectCandidateSets(photos, 6, { preFilterTopN: 30 }))
        .toThrow(/too many combinations/i);
    });

    it('should allow combinations under the limit', () => {
      // C(8, 4) = 70 - well under limit
      const photos = Array.from({ length: 8 }, (_, i) =>
        makePhoto(`photo${i}.jpg`, 9 - i * 0.5, { Theme: 9 - i * 0.5 })
      );

      const candidates = selectCandidateSets(photos, 4, {
        maxSetsToEvaluate: 5,
        preFilterTopN: 8
      });

      expect(candidates.length).toBeGreaterThan(0);
    });

    it('should respect custom maxCombinations option', () => {
      // C(10, 4) = 210 - over custom limit of 100
      const photos = Array.from({ length: 10 }, (_, i) =>
        makePhoto(`photo${i}.jpg`, 9 - i * 0.3, { Theme: 9 - i * 0.3 })
      );

      expect(() => selectCandidateSets(photos, 4, {
        preFilterTopN: 10,
        maxCombinations: 100
      })).toThrow(/too many combinations/i);
    });

    it('should allow C(23,4) = 8855 under default limit of 10000', () => {
      const photos = Array.from({ length: 23 }, (_, i) =>
        makePhoto(`photo${i}.jpg`, 9 - i * 0.1, { Theme: 9 - i * 0.1 })
      );

      const candidates = selectCandidateSets(photos, 4, { preFilterTopN: 23 });
      expect(candidates.length).toBeGreaterThan(0);
    });

    it('should throw for C(24,4) = 10626 over default limit of 10000', () => {
      const photos = Array.from({ length: 24 }, (_, i) =>
        makePhoto(`photo${i}.jpg`, 9 - i * 0.1, { Theme: 9 - i * 0.1 })
      );

      expect(() => selectCandidateSets(photos, 4, { preFilterTopN: 24 }))
        .toThrow(/too many combinations/i);
    });

    it('should use default limit of 10000 when maxCombinations not specified', () => {
      // C(24,4) = 10626 > 10000 default
      const photos = Array.from({ length: 24 }, (_, i) =>
        makePhoto(`photo${i}.jpg`, 9 - i * 0.1, { Theme: 9 - i * 0.1 })
      );

      // No maxCombinations passed - should use default and throw
      expect(() => selectCandidateSets(photos, 4, { preFilterTopN: 24 }))
        .toThrow(/exceeds limit of 10000/);
    });
  });

  describe('selectCandidateSets', () => {
    const makePhoto = (name, score, scores = {}) => ({
      filename: name,
      score,
      scores
    });

    it('should return top candidates sorted by pre-score', () => {
      const photos = [
        makePhoto('a.jpg', 9.0, { Theme: 9, Technical: 9 }),
        makePhoto('b.jpg', 8.5, { Theme: 8, Technical: 9 }),
        makePhoto('c.jpg', 8.0, { Theme: 8, Technical: 8 }),
        makePhoto('d.jpg', 7.5, { Theme: 7, Technical: 8 }),
        makePhoto('e.jpg', 7.0, { Theme: 7, Technical: 7 }),
        makePhoto('f.jpg', 6.5, { Theme: 6, Technical: 7 }),
        makePhoto('g.jpg', 6.0, { Theme: 6, Technical: 6 }),
        makePhoto('h.jpg', 5.5, { Theme: 5, Technical: 6 })
      ];

      const candidates = selectCandidateSets(photos, 4, {
        maxSetsToEvaluate: 5,
        preFilterTopN: 8
      });

      expect(candidates.length).toBeLessThanOrEqual(5);
      expect(candidates.length).toBeGreaterThan(0);

      // Each candidate should have exactly 4 photos
      candidates.forEach(candidate => {
        expect(candidate.photos.length).toBe(4);
        expect(candidate).toHaveProperty('preScore');
      });

      // First candidate should have highest pre-score
      for (let i = 1; i < candidates.length; i++) {
        expect(candidates[i - 1].preScore).toBeGreaterThanOrEqual(candidates[i].preScore);
      }
    });

    it('should respect maxSetsToEvaluate limit', () => {
      const photos = Array.from({ length: 10 }, (_, i) =>
        makePhoto(`photo${i}.jpg`, 8 - i * 0.2, { Theme: 8 - i * 0.2 })
      );

      const candidates = selectCandidateSets(photos, 4, {
        maxSetsToEvaluate: 3,
        preFilterTopN: 10
      });

      expect(candidates.length).toBeLessThanOrEqual(3);
    });

    it('should respect preFilterTopN to limit search space', () => {
      const photos = Array.from({ length: 20 }, (_, i) =>
        makePhoto(`photo${i}.jpg`, 9 - i * 0.3, { Theme: 9 - i * 0.3 })
      );

      const candidates = selectCandidateSets(photos, 4, {
        maxSetsToEvaluate: 5,
        preFilterTopN: 8
      });

      // All photos in candidates should be from top 8
      const topPhotos = photos.slice(0, 8).map(p => p.filename);
      candidates.forEach(candidate => {
        candidate.photos.forEach(photo => {
          expect(topPhotos).toContain(photo.filename);
        });
      });
    });

    it('should return empty array if fewer photos than set size', () => {
      const photos = [
        makePhoto('a.jpg', 9),
        makePhoto('b.jpg', 8)
      ];

      const candidates = selectCandidateSets(photos, 4, {});
      expect(candidates).toEqual([]);
    });

    it('should return single candidate when photos equals set size', () => {
      const photos = [
        makePhoto('a.jpg', 9, { Theme: 9 }),
        makePhoto('b.jpg', 8, { Theme: 8 }),
        makePhoto('c.jpg', 7, { Theme: 7 }),
        makePhoto('d.jpg', 6, { Theme: 6 })
      ];

      const candidates = selectCandidateSets(photos, 4, { maxSetsToEvaluate: 5 });
      expect(candidates.length).toBe(1);
      expect(candidates[0].photos.length).toBe(4);
    });
  });
});
