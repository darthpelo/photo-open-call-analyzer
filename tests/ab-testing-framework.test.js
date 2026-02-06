/**
 * Unit tests for A/B Testing Framework (FR-2.4 Phase 3 Story 3.2)
 * Tests prompt comparison, metrics calculation, and winner determination
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptVariantTester } from '../src/validation/ab-testing-framework.js';

describe('A/B Testing Framework - Metrics Calculation', () => {
  let tester;

  beforeEach(() => {
    tester = new PromptVariantTester({ sample: 3 });
  });

  it('should calculate metrics correctly', () => {
    const results = [
      {
        photo: 'photo1.jpg',
        scores: {
          individual: {
            'Criterion 1': { score: 8, weight: 50, reasoning: 'Good' },
            'Criterion 2': { score: 7, weight: 50, reasoning: 'Good' }
          },
          summary: { weighted_average: 7.5 },
          full_analysis: 'This is a detailed analysis with specific feedback about composition and lighting.'
        }
      },
      {
        photo: 'photo2.jpg',
        scores: {
          individual: {
            'Criterion 1': { score: 9, weight: 50, reasoning: 'Excellent' },
            'Criterion 2': { score: 8, weight: 50, reasoning: 'Great' }
          },
          summary: { weighted_average: 8.5 },
          full_analysis: 'Another detailed analysis.'
        }
      },
      {
        photo: 'photo3.jpg',
        scores: {
          individual: {
            'Criterion 1': { score: 6, weight: 50, reasoning: 'Average' },
            'Criterion 2': { score: 7, weight: 50, reasoning: 'Good' }
          },
          summary: { weighted_average: 6.5 },
          full_analysis: 'Short.'
        }
      }
    ];

    const metrics = tester.calculateMetrics(results, 'Test');

    expect(metrics.label).toBe('Test');
    expect(metrics.count).toBe(3);
    expect(metrics.avgScore).toBeCloseTo(7.5, 1);
    expect(metrics.scoreStdDev).toBeGreaterThan(0);
    expect(metrics.scoreRange).toEqual([6.5, 8.5]);
    expect(metrics.coherenceRate).toBeGreaterThanOrEqual(0);
    expect(metrics.coherenceRate).toBeLessThanOrEqual(100);
    expect(metrics.avgFeedbackLength).toBeGreaterThan(0);
  });

  it('should handle empty results', () => {
    const metrics = tester.calculateMetrics([], 'Empty');

    expect(metrics.count).toBe(0);
    expect(metrics.avgScore).toBe(0);
    expect(metrics.scoreStdDev).toBe(0);
    expect(metrics.coherenceRate).toBe(0);
  });

  it('should calculate standard deviation correctly', () => {
    const results = [
      {
        photo: 'photo1.jpg',
        scores: {
          individual: { 'C1': { score: 5, weight: 100, reasoning: 'Test' } },
          summary: { weighted_average: 5 }
        }
      },
      {
        photo: 'photo2.jpg',
        scores: {
          individual: { 'C1': { score: 5, weight: 100, reasoning: 'Test' } },
          summary: { weighted_average: 5 }
        }
      },
      {
        photo: 'photo3.jpg',
        scores: {
          individual: { 'C1': { score: 5, weight: 100, reasoning: 'Test' } },
          summary: { weighted_average: 5 }
        }
      }
    ];

    const metrics = tester.calculateMetrics(results, 'Uniform');

    // All scores identical, std dev should be 0
    expect(metrics.scoreStdDev).toBe(0);
  });

  it('should calculate feedback length correctly', () => {
    const results = [
      {
        photo: 'photo1.jpg',
        scores: {
          individual: {},
          summary: { weighted_average: 7 },
          full_analysis: 'Short'
        }
      },
      {
        photo: 'photo2.jpg',
        scores: {
          individual: {},
          summary: { weighted_average: 7 },
          full_analysis: 'This is a much longer analysis with more detail.'
        }
      }
    ];

    const metrics = tester.calculateMetrics(results, 'Test');

    expect(metrics.avgFeedbackLength).toBeGreaterThan(5); // Should be average of lengths
  });
});

describe('A/B Testing Framework - Comparison', () => {
  let tester;

  beforeEach(() => {
    tester = new PromptVariantTester();
  });

  it('should compare baseline and variant metrics', () => {
    const baseline = {
      avgScore: 7.0,
      scoreStdDev: 1.5,
      coherenceRate: 80.0,
      avgFeedbackLength: 100
    };

    const variant = {
      avgScore: 7.5,
      scoreStdDev: 1.0,
      coherenceRate: 90.0,
      avgFeedbackLength: 150
    };

    const comparison = tester.compareMetrics(baseline, variant);

    expect(comparison.scoreDelta).toBe(0.5);
    expect(comparison.stdDevDelta).toBe(-0.5); // Variant more consistent
    expect(comparison.coherenceDelta).toBe(10.0);
    expect(comparison.feedbackLengthDelta).toBe(50);

    expect(comparison.scoreImprovement).toBe(true);
    expect(comparison.moreConsistent).toBe(true);
    expect(comparison.moreCoherent).toBe(true);
    expect(comparison.moreDetailed).toBe(true);
  });

  it('should detect when baseline is better', () => {
    const baseline = {
      avgScore: 8.0,
      scoreStdDev: 0.5, // More consistent
      coherenceRate: 95.0, // More coherent
      avgFeedbackLength: 200 // More detailed
    };

    const variant = {
      avgScore: 7.0,
      scoreStdDev: 2.0,
      coherenceRate: 70.0,
      avgFeedbackLength: 100
    };

    const comparison = tester.compareMetrics(baseline, variant);

    expect(comparison.scoreImprovement).toBe(false);
    expect(comparison.moreConsistent).toBe(false);
    expect(comparison.moreCoherent).toBe(false);
    expect(comparison.moreDetailed).toBe(false);
  });
});

describe('A/B Testing Framework - Winner Determination', () => {
  let tester;

  beforeEach(() => {
    tester = new PromptVariantTester();
  });

  it('should determine variant as winner when clearly better', () => {
    const baseline = {
      scoreStdDev: 2.0,
      coherenceRate: 60.0,
      avgFeedbackLength: 100
    };

    const variant = {
      scoreStdDev: 1.0, // Better consistency (3 points)
      coherenceRate: 90.0, // Better coherence (2 points)
      avgFeedbackLength: 150 // More detailed (1 point)
    };

    const comparison = {
      moreConsistent: true,
      moreCoherent: true,
      moreDetailed: true
    };

    const winner = tester.determineWinner(baseline, variant, comparison);

    expect(winner.winner).toBe('variant');
    expect(winner.points.variant).toBe(6); // 3 + 2 + 1
    expect(winner.points.baseline).toBe(0);
    expect(winner.confidence).toBe('high'); // Delta >= 2
  });

  it('should determine baseline as winner when better', () => {
    const baseline = {
      scoreStdDev: 0.8, // Better
      coherenceRate: 95.0, // Better
      avgFeedbackLength: 200 // Better
    };

    const variant = {
      scoreStdDev: 2.5,
      coherenceRate: 70.0,
      avgFeedbackLength: 100
    };

    const comparison = {
      moreConsistent: false,
      moreCoherent: false,
      moreDetailed: false
    };

    const winner = tester.determineWinner(baseline, variant, comparison);

    expect(winner.winner).toBe('baseline');
    expect(winner.points.baseline).toBeGreaterThan(winner.points.variant);
    expect(winner.confidence).toBe('high');
  });

  it('should declare tie when evenly matched', () => {
    const baseline = {
      scoreStdDev: 1.5,
      coherenceRate: 80.0,
      avgFeedbackLength: 150
    };

    const variant = {
      scoreStdDev: 1.4, // Slightly better (3 points)
      coherenceRate: 75.0, // Worse (-2 points baseline)
      avgFeedbackLength: 140 // Worse (-1 point baseline)
    };

    const comparison = {
      moreConsistent: true, // +3 variant
      moreCoherent: false, // +2 baseline
      moreDetailed: false // +1 baseline
    };

    const winner = tester.determineWinner(baseline, variant, comparison);

    expect(winner.winner).toBe('tie');
    expect(winner.points.variant).toBe(3);
    expect(winner.points.baseline).toBe(3);
    expect(winner.confidence).toBe('low'); // Delta < 2
  });

  it('should have low confidence for close matches', () => {
    const baseline = {
      scoreStdDev: 1.5,
      coherenceRate: 80.0,
      avgFeedbackLength: 100
    };

    const variant = {
      scoreStdDev: 1.6,
      coherenceRate: 85.0,
      avgFeedbackLength: 100
    };

    const comparison = {
      moreConsistent: false,
      moreCoherent: true,
      moreDetailed: false
    };

    const winner = tester.determineWinner(baseline, variant, comparison);

    // Baseline: 3 (consistency) + 1 (detail tie) = 4? Actually no, tied detail gives neither
    // Variant: 2 (coherence)
    // Actually baseline wins with consistency (3) vs variant coherence (2)
    // But delta is only 1, so low confidence

    expect(winner.confidence).toBe('low');
  });
});

describe('A/B Testing Framework - Recommendations', () => {
  let tester;

  beforeEach(() => {
    tester = new PromptVariantTester();
  });

  it('should recommend checking leniency for high score delta', () => {
    const comparison = {
      scoreDelta: 1.5, // Significant increase
      moreConsistent: false,
      moreCoherent: false,
      moreDetailed: false
    };

    const recommendations = tester.generateRecommendations(comparison);

    expect(recommendations.some(r => r.includes('too lenient'))).toBe(true);
  });

  it('should recommend checking harshness for low score delta', () => {
    const comparison = {
      scoreDelta: -1.8, // Significant decrease
      moreConsistent: false,
      moreCoherent: false,
      moreDetailed: false
    };

    const recommendations = tester.generateRecommendations(comparison);

    expect(recommendations.some(r => r.includes('too harsh'))).toBe(true);
  });

  it('should highlight positive improvements', () => {
    const comparison = {
      scoreDelta: 0.2,
      moreConsistent: true,
      moreCoherent: true,
      moreDetailed: true
    };

    const recommendations = tester.generateRecommendations(comparison);

    expect(recommendations.some(r => r.includes('better score consistency'))).toBe(true);
    expect(recommendations.some(r => r.includes('more coherent'))).toBe(true);
    expect(recommendations.some(r => r.includes('more detailed'))).toBe(true);
  });

  it('should suggest more samples when no differences', () => {
    const comparison = {
      scoreDelta: 0.1,
      moreConsistent: false,
      moreCoherent: false,
      moreDetailed: false
    };

    const recommendations = tester.generateRecommendations(comparison);

    expect(recommendations.some(r => r.includes('No significant differences'))).toBe(true);
  });
});

describe('A/B Testing Framework - Report Generation', () => {
  let tester;

  beforeEach(() => {
    tester = new PromptVariantTester({ sample: 2 });
    tester.results = {
      baseline: [
        {
          photo: 'photo1.jpg',
          scores: {
            individual: { 'C1': { score: 7, weight: 100, reasoning: 'Test' } },
            summary: { weighted_average: 7.0 },
            full_analysis: 'Baseline analysis'
          }
        },
        {
          photo: 'photo2.jpg',
          scores: {
            individual: { 'C1': { score: 8, weight: 100, reasoning: 'Test' } },
            summary: { weighted_average: 8.0 },
            full_analysis: 'Another baseline'
          }
        }
      ],
      variant: [
        {
          photo: 'photo1.jpg',
          scores: {
            individual: { 'C1': { score: 8, weight: 100, reasoning: 'Test' } },
            summary: { weighted_average: 8.0 },
            full_analysis: 'Variant analysis'
          }
        },
        {
          photo: 'photo2.jpg',
          scores: {
            individual: { 'C1': { score: 9, weight: 100, reasoning: 'Test' } },
            summary: { weighted_average: 9.0 },
            full_analysis: 'Another variant'
          }
        }
      ]
    };
  });

  it('should generate complete comparison report', () => {
    const report = tester.generateComparisonReport();

    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('baseline');
    expect(report).toHaveProperty('variant');
    expect(report).toHaveProperty('comparison');
    expect(report).toHaveProperty('winner');
    expect(report).toHaveProperty('recommendations');

    expect(report.summary.photosAnalyzed).toBe(2);
    expect(report.baseline.count).toBe(2);
    expect(report.variant.count).toBe(2);
  });

  it('should calculate success rates correctly', () => {
    const report = tester.generateComparisonReport();

    expect(report.summary.baselineSuccessRate).toBe(100); // 2/2
    expect(report.summary.variantSuccessRate).toBe(100); // 2/2
  });

  it('should handle partial failures', () => {
    tester.results.baseline = [
      {
        photo: 'photo1.jpg',
        scores: {
          individual: { 'C1': { score: 7, weight: 100, reasoning: 'Test' } },
          summary: { weighted_average: 7.0 }
        }
      }
    ]; // Only 1 out of 2

    const report = tester.generateComparisonReport();

    expect(report.summary.baselineSuccessRate).toBe(50); // 1/2
  });
});

describe('A/B Testing Framework - Edge Cases', () => {
  let tester;

  beforeEach(() => {
    tester = new PromptVariantTester();
  });

  it('should handle zero variance scores', () => {
    const results = [
      {
        photo: 'photo1.jpg',
        scores: {
          individual: {},
          summary: { weighted_average: 7.0 }
        }
      },
      {
        photo: 'photo2.jpg',
        scores: {
          individual: {},
          summary: { weighted_average: 7.0 }
        }
      }
    ];

    const metrics = tester.calculateMetrics(results, 'Identical');

    expect(metrics.scoreStdDev).toBe(0);
    expect(metrics.scoreRange).toEqual([7.0, 7.0]);
  });

  it('should handle missing full_analysis', () => {
    const results = [
      {
        photo: 'photo1.jpg',
        scores: {
          individual: {},
          summary: { weighted_average: 7.0 }
          // No full_analysis
        }
      }
    ];

    const metrics = tester.calculateMetrics(results, 'NoAnalysis');

    expect(metrics.avgFeedbackLength).toBe(0);
  });

  it('should handle very small differences in deltas', () => {
    const baseline = {
      avgScore: 7.001,
      scoreStdDev: 1.001,
      coherenceRate: 80.1,
      avgFeedbackLength: 100
    };

    const variant = {
      avgScore: 7.002,
      scoreStdDev: 1.002,
      coherenceRate: 80.2,
      avgFeedbackLength: 101
    };

    const comparison = tester.compareMetrics(baseline, variant);

    // Should handle rounding correctly
    expect(typeof comparison.scoreDelta).toBe('number');
    expect(typeof comparison.stdDevDelta).toBe('number');
  });
});
