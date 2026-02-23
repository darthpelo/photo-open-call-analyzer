import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  generateCombinations,
  countCombinations,
  selectCandidateSets,
  calculateDiversity,
  selectCandidateSetsByGroup
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

describe('selectCandidateSetsByGroup', () => {
  let testDir, photosDir;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'combo-group-test-'));
    photosDir = join(testDir, 'photos');
    mkdirSync(photosDir);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  function createTestPhotos(...filenames) {
    for (const f of filenames) {
      writeFileSync(join(photosDir, f), 'fake');
    }
  }

  const makePhoto = (name, score, scores = {}) => ({
    filename: name, score, scores
  });

  it('should behave like selectCandidateSets when photoGroups is undefined', () => {
    const photos = Array.from({ length: 8 }, (_, i) =>
      makePhoto(`photo${i}.jpg`, 9 - i * 0.5, { Theme: 9 - i * 0.5 })
    );
    const result = selectCandidateSetsByGroup(photos, 4, undefined, photosDir, {
      maxSetsToEvaluate: 5, preFilterTopN: 8
    });
    expect(result.grouped).toBe(false);
    expect(result.candidates.length).toBeGreaterThan(0);
  });

  it('should behave like selectCandidateSets when photoGroups is empty', () => {
    const photos = Array.from({ length: 8 }, (_, i) =>
      makePhoto(`photo${i}.jpg`, 9 - i * 0.5)
    );
    const result = selectCandidateSetsByGroup(photos, 4, [], photosDir, {
      maxSetsToEvaluate: 5, preFilterTopN: 8
    });
    expect(result.grouped).toBe(false);
  });

  it('should generate candidates per group independently', () => {
    createTestPhotos('r-1.jpg', 'r-2.jpg', 'r-3.jpg', 'r-4.jpg',
                     'o-1.jpg', 'o-2.jpg', 'o-3.jpg', 'o-4.jpg');
    const photos = [
      makePhoto('r-1.jpg', 9, { T: 9 }), makePhoto('r-2.jpg', 8, { T: 8 }),
      makePhoto('r-3.jpg', 7, { T: 7 }), makePhoto('r-4.jpg', 6, { T: 6 }),
      makePhoto('o-1.jpg', 8.5, { T: 8.5 }), makePhoto('o-2.jpg', 7.5, { T: 7.5 }),
      makePhoto('o-3.jpg', 6.5, { T: 6.5 }), makePhoto('o-4.jpg', 5.5, { T: 5.5 })
    ];
    const groups = [
      { name: 'Rotterdam', pattern: 'r-*.jpg' },
      { name: 'October', pattern: 'o-*.jpg' }
    ];
    const result = selectCandidateSetsByGroup(photos, 4, groups, photosDir, {
      maxSetsToEvaluate: 3, preFilterTopN: 4
    });
    expect(result.grouped).toBe(true);
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0].name).toBe('Rotterdam');
    expect(result.groups[1].name).toBe('October');
    expect(result.groups[0].candidates.length).toBeGreaterThan(0);
    expect(result.groups[1].candidates.length).toBeGreaterThan(0);
  });

  it('should not mix photos across groups', () => {
    createTestPhotos('a-1.jpg', 'a-2.jpg', 'a-3.jpg', 'a-4.jpg',
                     'b-1.jpg', 'b-2.jpg', 'b-3.jpg', 'b-4.jpg');
    const photos = [
      makePhoto('a-1.jpg', 9), makePhoto('a-2.jpg', 8),
      makePhoto('a-3.jpg', 7), makePhoto('a-4.jpg', 6),
      makePhoto('b-1.jpg', 10), makePhoto('b-2.jpg', 9),
      makePhoto('b-3.jpg', 8), makePhoto('b-4.jpg', 7)
    ];
    const groups = [
      { name: 'A', pattern: 'a-*.jpg' },
      { name: 'B', pattern: 'b-*.jpg' }
    ];
    const result = selectCandidateSetsByGroup(photos, 4, groups, photosDir, {
      maxSetsToEvaluate: 3, preFilterTopN: 4
    });
    for (const candidate of result.groups[0].candidates) {
      for (const photo of candidate.photos) {
        expect(photo.filename).toMatch(/^a-/);
      }
    }
    for (const candidate of result.groups[1].candidates) {
      for (const photo of candidate.photos) {
        expect(photo.filename).toMatch(/^b-/);
      }
    }
  });

  it('should skip groups with fewer photos than setSize', () => {
    createTestPhotos('a-1.jpg', 'a-2.jpg',
                     'b-1.jpg', 'b-2.jpg', 'b-3.jpg', 'b-4.jpg');
    const photos = [
      makePhoto('a-1.jpg', 9), makePhoto('a-2.jpg', 8),
      makePhoto('b-1.jpg', 7), makePhoto('b-2.jpg', 6),
      makePhoto('b-3.jpg', 5), makePhoto('b-4.jpg', 4)
    ];
    const groups = [
      { name: 'A', pattern: 'a-*.jpg' },
      { name: 'B', pattern: 'b-*.jpg' }
    ];
    const result = selectCandidateSetsByGroup(photos, 4, groups, photosDir, {
      maxSetsToEvaluate: 3, preFilterTopN: 4
    });
    expect(result.groups[0].skipped).toBe(true);
    expect(result.groups[0].candidates).toHaveLength(0);
    expect(result.groups[0].skipReason).toBeTruthy();
    expect(result.groups[1].skipped).toBe(false);
  });

  it('should throw when group resolution fails', () => {
    createTestPhotos('a-1.jpg');
    const photos = [makePhoto('a-1.jpg', 9)];
    const groups = [{ name: 'Empty', pattern: 'nonexistent-*.jpg' }];
    expect(() => selectCandidateSetsByGroup(photos, 4, groups, photosDir))
      .toThrow(/resolution failed/i);
  });

  it('should include warnings from group resolution', () => {
    createTestPhotos('a-1.jpg', 'a-2.jpg', 'a-3.jpg', 'a-4.jpg', 'orphan.jpg');
    const photos = [
      makePhoto('a-1.jpg', 9), makePhoto('a-2.jpg', 8),
      makePhoto('a-3.jpg', 7), makePhoto('a-4.jpg', 6),
      makePhoto('orphan.jpg', 5)
    ];
    const groups = [{ name: 'A', pattern: 'a-*.jpg' }];
    const result = selectCandidateSetsByGroup(photos, 4, groups, photosDir, {
      maxSetsToEvaluate: 3, preFilterTopN: 4
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('orphan.jpg');
  });
});
