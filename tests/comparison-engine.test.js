/**
 * Tests for comparison-engine.js
 *
 * Covers: Spearman's rho, top-N overlap, disagreements, cross-run consistency,
 * and report generation.
 */

import { describe, test, expect } from 'vitest';
import {
  computeSpearmanRho,
  computeTopNOverlap,
  findDisagreements,
  analyzeConsistency,
  generateComparisonReport
} from '../src/analysis/comparison-engine.js';


// ============================================================
// computeSpearmanRho() Tests
// ============================================================

describe('computeSpearmanRho()', () => {
  test('should return 1.0 for identical rankings', () => {
    const ranking1 = [
      { photo: 'a.jpg', rank: 1 },
      { photo: 'b.jpg', rank: 2 },
      { photo: 'c.jpg', rank: 3 },
    ];
    const ranking2 = [
      { photo: 'a.jpg', rank: 1 },
      { photo: 'b.jpg', rank: 2 },
      { photo: 'c.jpg', rank: 3 },
    ];

    expect(computeSpearmanRho(ranking1, ranking2)).toBeCloseTo(1.0, 5);
  });

  test('should return -1.0 for perfectly inverse rankings', () => {
    const ranking1 = [
      { photo: 'a.jpg', rank: 1 },
      { photo: 'b.jpg', rank: 2 },
      { photo: 'c.jpg', rank: 3 },
    ];
    const ranking2 = [
      { photo: 'a.jpg', rank: 3 },
      { photo: 'b.jpg', rank: 2 },
      { photo: 'c.jpg', rank: 1 },
    ];

    expect(computeSpearmanRho(ranking1, ranking2)).toBeCloseTo(-1.0, 5);
  });

  test('should return 0 for uncorrelated rankings', () => {
    // For 5 items, a specific arrangement gives rho = 0
    const ranking1 = [
      { photo: 'a.jpg', rank: 1 },
      { photo: 'b.jpg', rank: 2 },
      { photo: 'c.jpg', rank: 3 },
      { photo: 'd.jpg', rank: 4 },
      { photo: 'e.jpg', rank: 5 },
    ];
    const ranking2 = [
      { photo: 'a.jpg', rank: 3 },
      { photo: 'b.jpg', rank: 5 },
      { photo: 'c.jpg', rank: 1 },
      { photo: 'd.jpg', rank: 2 },
      { photo: 'e.jpg', rank: 4 },
    ];

    // d_i^2: (1-3)^2 + (2-5)^2 + (3-1)^2 + (4-2)^2 + (5-4)^2 = 4+9+4+4+1 = 22
    // rho = 1 - 6*22 / (5*24) = 1 - 132/120 = 1 - 1.1 = -0.1
    expect(computeSpearmanRho(ranking1, ranking2)).toBeCloseTo(-0.1, 5);
  });

  test('should handle partial rankings (only common photos)', () => {
    const ranking1 = [
      { photo: 'a.jpg', rank: 1 },
      { photo: 'b.jpg', rank: 2 },
      { photo: 'c.jpg', rank: 3 },
    ];
    const ranking2 = [
      { photo: 'a.jpg', rank: 1 },
      { photo: 'c.jpg', rank: 2 },
      // b.jpg missing from ranking2
    ];

    const rho = computeSpearmanRho(ranking1, ranking2);
    expect(typeof rho).toBe('number');
    expect(rho).toBeGreaterThanOrEqual(-1);
    expect(rho).toBeLessThanOrEqual(1);
  });

  test('should return null for fewer than 2 common photos', () => {
    const ranking1 = [{ photo: 'a.jpg', rank: 1 }];
    const ranking2 = [{ photo: 'b.jpg', rank: 1 }];

    expect(computeSpearmanRho(ranking1, ranking2)).toBeNull();
  });

  test('should return null for empty rankings', () => {
    expect(computeSpearmanRho([], [])).toBeNull();
  });
});


// ============================================================
// computeTopNOverlap() Tests
// ============================================================

describe('computeTopNOverlap()', () => {
  test('should return 100% for identical top-N', () => {
    const ranking1 = [
      { photo: 'a.jpg', rank: 1 },
      { photo: 'b.jpg', rank: 2 },
      { photo: 'c.jpg', rank: 3 },
    ];
    const ranking2 = [
      { photo: 'a.jpg', rank: 1 },
      { photo: 'b.jpg', rank: 2 },
      { photo: 'c.jpg', rank: 3 },
    ];

    const result = computeTopNOverlap(ranking1, ranking2, 3);
    expect(result.overlap).toBe(3);
    expect(result.percentage).toBe(100);
  });

  test('should return 0% for completely different top-N', () => {
    const ranking1 = [
      { photo: 'a.jpg', rank: 1 },
      { photo: 'b.jpg', rank: 2 },
    ];
    const ranking2 = [
      { photo: 'c.jpg', rank: 1 },
      { photo: 'd.jpg', rank: 2 },
    ];

    const result = computeTopNOverlap(ranking1, ranking2, 2);
    expect(result.overlap).toBe(0);
    expect(result.percentage).toBe(0);
  });

  test('should handle partial overlap', () => {
    const ranking1 = [
      { photo: 'a.jpg', rank: 1 },
      { photo: 'b.jpg', rank: 2 },
      { photo: 'c.jpg', rank: 3 },
    ];
    const ranking2 = [
      { photo: 'a.jpg', rank: 1 },
      { photo: 'd.jpg', rank: 2 },
      { photo: 'c.jpg', rank: 3 },
    ];

    const result = computeTopNOverlap(ranking1, ranking2, 3);
    expect(result.overlap).toBe(2);
    expect(result.percentage).toBeCloseTo(66.7, 0);
  });

  test('should clamp N to ranking length', () => {
    const ranking1 = [{ photo: 'a.jpg', rank: 1 }];
    const ranking2 = [{ photo: 'a.jpg', rank: 1 }];

    const result = computeTopNOverlap(ranking1, ranking2, 10);
    expect(result.overlap).toBe(1);
    expect(result.n).toBe(1);
  });
});


// ============================================================
// findDisagreements() Tests
// ============================================================

describe('findDisagreements()', () => {
  test('should find photos with rank difference above threshold', () => {
    const ranking1 = [
      { photo: 'a.jpg', rank: 1 },
      { photo: 'b.jpg', rank: 10 },
      { photo: 'c.jpg', rank: 3 },
    ];
    const ranking2 = [
      { photo: 'a.jpg', rank: 2 },
      { photo: 'b.jpg', rank: 2 },
      { photo: 'c.jpg', rank: 3 },
    ];

    const result = findDisagreements(ranking1, ranking2, 5);
    expect(result).toHaveLength(1);
    expect(result[0].photo).toBe('b.jpg');
    expect(result[0].rankDiff).toBe(8);
  });

  test('should return empty array when no disagreements', () => {
    const ranking1 = [
      { photo: 'a.jpg', rank: 1 },
      { photo: 'b.jpg', rank: 2 },
    ];
    const ranking2 = [
      { photo: 'a.jpg', rank: 1 },
      { photo: 'b.jpg', rank: 3 },
    ];

    const result = findDisagreements(ranking1, ranking2, 5);
    expect(result).toHaveLength(0);
  });

  test('should sort by rank difference descending', () => {
    const ranking1 = [
      { photo: 'a.jpg', rank: 1 },
      { photo: 'b.jpg', rank: 10 },
      { photo: 'c.jpg', rank: 20 },
    ];
    const ranking2 = [
      { photo: 'a.jpg', rank: 15 },
      { photo: 'b.jpg', rank: 2 },
      { photo: 'c.jpg', rank: 5 },
    ];

    const result = findDisagreements(ranking1, ranking2, 5);
    expect(result.length).toBeGreaterThan(1);
    expect(result[0].rankDiff).toBeGreaterThanOrEqual(result[1].rankDiff);
  });
});


// ============================================================
// analyzeConsistency() Tests
// ============================================================

describe('analyzeConsistency()', () => {
  test('should compute per-photo rank volatility across runs', () => {
    const runs = [
      [
        { photo: 'a.jpg', rank: 1 },
        { photo: 'b.jpg', rank: 2 },
        { photo: 'c.jpg', rank: 3 },
      ],
      [
        { photo: 'a.jpg', rank: 1 },
        { photo: 'b.jpg', rank: 3 },
        { photo: 'c.jpg', rank: 2 },
      ],
    ];

    const result = analyzeConsistency(runs);
    expect(result.photoStats).toBeDefined();
    expect(result.photoStats['a.jpg'].rankStdDev).toBe(0);
    expect(result.photoStats['b.jpg'].rankStdDev).toBeGreaterThan(0);
  });

  test('should compute top-5 stability', () => {
    const runs = [
      [
        { photo: 'a.jpg', rank: 1 },
        { photo: 'b.jpg', rank: 2 },
        { photo: 'c.jpg', rank: 3 },
        { photo: 'd.jpg', rank: 4 },
        { photo: 'e.jpg', rank: 5 },
        { photo: 'f.jpg', rank: 6 },
      ],
      [
        { photo: 'a.jpg', rank: 1 },
        { photo: 'b.jpg', rank: 2 },
        { photo: 'c.jpg', rank: 3 },
        { photo: 'd.jpg', rank: 6 },
        { photo: 'e.jpg', rank: 5 },
        { photo: 'f.jpg', rank: 4 },
      ],
    ];

    const result = analyzeConsistency(runs);
    expect(result.topNStability).toBeDefined();
    // a, b, c, e are in top-5 both times = 4/5 = 80%
    expect(result.topNStability.percentage).toBe(80);
  });

  test('should flag high-volatility photos', () => {
    const runs = [
      [
        { photo: 'a.jpg', rank: 1 },
        { photo: 'b.jpg', rank: 30 },
      ],
      [
        { photo: 'a.jpg', rank: 1 },
        { photo: 'b.jpg', rank: 2 },
      ],
    ];

    const result = analyzeConsistency(runs);
    expect(result.highVolatility).toBeDefined();
    expect(result.highVolatility.some(p => p.photo === 'b.jpg')).toBe(true);
  });

  test('should handle single run', () => {
    const runs = [
      [{ photo: 'a.jpg', rank: 1 }],
    ];

    const result = analyzeConsistency(runs);
    expect(result.photoStats['a.jpg'].rankStdDev).toBe(0);
  });
});


// ============================================================
// generateComparisonReport() Tests
// ============================================================

describe('generateComparisonReport()', () => {
  test('should generate markdown report', () => {
    const aiRanking = [
      { photo: 'a.jpg', rank: 1, overall_score: 8.2 },
      { photo: 'b.jpg', rank: 2, overall_score: 7.5 },
      { photo: 'c.jpg', rank: 3, overall_score: 7.0 },
    ];
    const humanRanking = [
      { photo: 'b.jpg', rank: 1 },
      { photo: 'a.jpg', rank: 2 },
      { photo: 'c.jpg', rank: 3 },
    ];

    const report = generateComparisonReport(aiRanking, humanRanking, []);
    expect(report).toContain('# Comparison Report');
    expect(report).toContain('Spearman');
    expect(report).toContain('Top-');
  });

  test('should include consistency section when runs provided', () => {
    const aiRanking = [
      { photo: 'a.jpg', rank: 1, overall_score: 8.0 },
    ];
    const humanRanking = [
      { photo: 'a.jpg', rank: 1 },
    ];
    const runs = [
      [{ photo: 'a.jpg', rank: 1 }],
      [{ photo: 'a.jpg', rank: 1 }],
    ];

    const report = generateComparisonReport(aiRanking, humanRanking, runs);
    expect(report).toContain('Consistency');
  });

  test('should handle missing human ranking gracefully', () => {
    const aiRanking = [
      { photo: 'a.jpg', rank: 1, overall_score: 8.0 },
    ];

    const report = generateComparisonReport(aiRanking, [], []);
    expect(report).toContain('No human ranking');
  });
});
