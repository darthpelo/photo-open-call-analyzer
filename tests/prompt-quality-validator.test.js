/**
 * Unit tests for Prompt Quality Validator (FR-2.4 Phase 3 Story 3.1)
 * Tests validation, score coherence, and quality reporting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkScoreCoherence,
  generateQualityReport,
  batchCheckCoherence
} from '../src/validation/prompt-quality-validator.js';

describe('Prompt Quality Validator - Score Coherence', () => {
  it('should validate coherent scores', () => {
    const analysisResult = {
      scores: {
        individual: {
          'Composition': { score: 8, weight: 30, reasoning: 'Strong visual balance' },
          'Technical Quality': { score: 7, weight: 30, reasoning: 'Good exposure' },
          'Originality': { score: 9, weight: 40, reasoning: 'Unique perspective' }
        },
        summary: {
          weighted_average: 8.1
        }
      }
    };

    const result = checkScoreCoherence(analysisResult);

    expect(result.coherent).toBe(true);
    expect(result.issues.length).toBe(0);
    expect(result.statistics.criteriaCount).toBe(3);
    expect(result.statistics.averageScore).toBe(8.1);
  });

  it('should detect weighted average mismatch', () => {
    const analysisResult = {
      scores: {
        individual: {
          'Criterion 1': { score: 8, weight: 50, reasoning: 'Good' },
          'Criterion 2': { score: 6, weight: 50, reasoning: 'Average' }
        },
        summary: {
          weighted_average: 9.0 // Should be 7.0
        }
      }
    };

    const result = checkScoreCoherence(analysisResult);

    expect(result.coherent).toBe(false);
    expect(result.issues.some(i => i.type === 'weighted_average_mismatch')).toBe(true);
    const issue = result.issues.find(i => i.type === 'weighted_average_mismatch');
    expect(issue.severity).toBe('medium');
    expect(issue.expected).toBeCloseTo(7.0, 1);
  });

  it('should handle missing scores data', () => {
    const analysisResult = {
      scores: {}
    };

    const result = checkScoreCoherence(analysisResult);

    expect(result.coherent).toBe(false);
    expect(result.issues.some(i => i.type === 'missing_data')).toBe(true);
  });

  it('should detect high score variance', () => {
    const analysisResult = {
      scores: {
        individual: {
          'Criterion 1': { score: 10, weight: 25, reasoning: 'Excellent' },
          'Criterion 2': { score: 2, weight: 25, reasoning: 'Poor' },
          'Criterion 3': { score: 9, weight: 25, reasoning: 'Great' },
          'Criterion 4': { score: 3, weight: 25, reasoning: 'Weak' }
        },
        summary: {
          weighted_average: 6.0
        }
      }
    };

    const result = checkScoreCoherence(analysisResult);

    expect(result.issues.some(i => i.type === 'high_score_variance')).toBe(true);
    const issue = result.issues.find(i => i.type === 'high_score_variance');
    expect(issue.severity).toBe('low');
  });

  it('should detect score outliers with extreme variance', () => {
    const analysisResult = {
      scores: {
        individual: {
          'Criterion 1': { score: 10, weight: 20, reasoning: 'Excellent' },
          'Criterion 2': { score: 1, weight: 20, reasoning: 'Poor' },
          'Criterion 3': { score: 10, weight: 20, reasoning: 'Excellent' },
          'Criterion 4': { score: 1, weight: 20, reasoning: 'Poor' },
          'Criterion 5': { score: 10, weight: 20, reasoning: 'Excellent' }
        },
        summary: {
          weighted_average: 6.4
        }
      }
    };

    const result = checkScoreCoherence(analysisResult);

    // With extreme variance (alternating 10 and 1), should definitely be detected
    expect(result.issues.some(i => i.type === 'score_outlier' || i.type === 'high_score_variance')).toBe(true);
  });

  it('should detect reasoning-score mismatch (positive text, low score)', () => {
    const analysisResult = {
      scores: {
        individual: {
          'Criterion 1': { score: 3, weight: 100, reasoning: 'Excellent composition' }
        },
        summary: {
          weighted_average: 3.0
        },
        full_analysis: 'This photograph is excellent, outstanding, impressive, and exceptional in every way.'
      }
    };

    const result = checkScoreCoherence(analysisResult);

    expect(result.issues.some(i => i.type === 'reasoning_score_mismatch')).toBe(true);
    const issue = result.issues.find(i => i.type === 'reasoning_score_mismatch');
    expect(issue.severity).toBe('medium');
  });

  it('should detect reasoning-score mismatch (negative text, high score)', () => {
    const analysisResult = {
      scores: {
        individual: {
          'Criterion 1': { score: 9, weight: 100, reasoning: 'Poor execution' }
        },
        summary: {
          weighted_average: 9.0
        },
        full_analysis: 'This photograph is poor, weak, lacking, and disappointing. It fails to deliver.'
      }
    };

    const result = checkScoreCoherence(analysisResult);

    expect(result.issues.some(i => i.type === 'reasoning_score_mismatch')).toBe(true);
  });

  it('should calculate statistics correctly', () => {
    const analysisResult = {
      scores: {
        individual: {
          'Criterion 1': { score: 5, weight: 50, reasoning: 'Average' },
          'Criterion 2': { score: 9, weight: 50, reasoning: 'Excellent' }
        },
        summary: {
          weighted_average: 7.0
        }
      }
    };

    const result = checkScoreCoherence(analysisResult);

    expect(result.statistics.criteriaCount).toBe(2);
    expect(result.statistics.averageScore).toBe(7.0);
    expect(result.statistics.scoreRange).toEqual([5, 9]);
  });
});

describe('Prompt Quality Validator - Quality Report', () => {
  it('should generate formatted report for valid criteria', () => {
    const validation = {
      valid: true,
      scores: {
        specificity: 8.5,
        alignment: 7.8,
        overall: 8.2
      },
      issues: [],
      suggestions: []
    };

    const report = generateQualityReport(validation, null);

    expect(report.formatted).toContain('PROMPT QUALITY VALIDATION REPORT');
    expect(report.formatted).toContain('[PASS]');
    expect(report.formatted).toContain('Specificity:  8.5/10');
    expect(report.formatted).toContain('No issues found');
  });

  it('should generate report with issues', () => {
    const validation = {
      valid: false,
      scores: {
        specificity: 4.5,
        alignment: 5.0,
        overall: 4.8
      },
      issues: [
        {
          type: 'generic_name',
          severity: 'high',
          message: 'Criterion "Quality" is too generic',
          criterion: 'Quality'
        },
        {
          type: 'weight_total',
          severity: 'medium',
          message: 'Total weight is 120%, should be 100%'
        }
      ],
      suggestions: [
        {
          type: 'name_refinement',
          criterion: 'Quality',
          suggestion: 'Replace "Quality" with "Technical Excellence" or "Image Quality"'
        }
      ]
    };

    const report = generateQualityReport(validation, null);

    expect(report.formatted).toContain('[FAIL]');
    expect(report.formatted).toContain('Issues Found');
    expect(report.formatted).toContain('HIGH (1)');
    expect(report.formatted).toContain('MEDIUM (1)');
    expect(report.formatted).toContain('too generic');
    expect(report.formatted).toContain('Suggestions');
  });

  it('should include alignment info when provided', () => {
    const validation = {
      valid: true,
      scores: {
        specificity: 8.0,
        alignment: 7.5,
        overall: 7.8
      },
      issues: [],
      suggestions: []
    };

    const alignment = {
      overallAlignment: 7.5,
      missingElements: ['lighting', 'emotion']
    };

    const report = generateQualityReport(validation, alignment, { verbose: true });

    expect(report.formatted).toContain('Theme Alignment');
    expect(report.formatted).toContain('7.5/10');
    expect(report.formatted).toContain('Missing Elements');
    expect(report.formatted).toContain('lighting');
  });

  it('should respect verbose option', () => {
    const validation = {
      valid: false,
      scores: {
        specificity: 5.0,
        alignment: 5.0,
        overall: 5.0
      },
      issues: [
        {
          type: 'low_issue',
          severity: 'low',
          message: 'Minor issue'
        }
      ],
      suggestions: []
    };

    // Non-verbose should not show low issues
    const reportNonVerbose = generateQualityReport(validation, null, { verbose: false });
    expect(reportNonVerbose.formatted).not.toContain('LOW');

    // Verbose should show low issues
    const reportVerbose = generateQualityReport(validation, null, { verbose: true });
    expect(reportVerbose.formatted).toContain('LOW (1)');
    expect(reportVerbose.formatted).toContain('Minor issue');
  });

  it('should generate score bars correctly', () => {
    const validation = {
      valid: true,
      scores: {
        specificity: 7.0,
        alignment: 3.0,
        overall: 5.0
      },
      issues: [],
      suggestions: []
    };

    const report = generateQualityReport(validation, null);

    // 7/10 should be 7 filled, 3 empty
    expect(report.formatted).toMatch(/Specificity:\s+7\.0\/10\s+█{7}░{3}/);

    // 3/10 should be 3 filled, 7 empty
    expect(report.formatted).toMatch(/Alignment:\s+3\.0\/10\s+█{3}░{7}/);
  });

  it('should include recommendations for failed validation', () => {
    const validation = {
      valid: false,
      scores: {
        specificity: 4.0,
        alignment: 4.0,
        overall: 4.0
      },
      issues: [
        {
          type: 'generic_name',
          severity: 'high',
          message: 'Generic criterion name'
        }
      ],
      suggestions: []
    };

    const report = generateQualityReport(validation, null);

    expect(report.formatted).toContain('Recommendation');
    expect(report.formatted).toContain('Regenerate prompt');
  });
});

describe('Prompt Quality Validator - Batch Coherence', () => {
  it('should check coherence for multiple photos', () => {
    const analysisResults = [
      {
        photoPath: 'photo1.jpg',
        scores: {
          individual: {
            'Criterion 1': { score: 8, weight: 50, reasoning: 'Good' },
            'Criterion 2': { score: 7, weight: 50, reasoning: 'Good' }
          },
          summary: { weighted_average: 7.5 }
        }
      },
      {
        photoPath: 'photo2.jpg',
        scores: {
          individual: {
            'Criterion 1': { score: 9, weight: 50, reasoning: 'Excellent' },
            'Criterion 2': { score: 8, weight: 50, reasoning: 'Great' }
          },
          summary: { weighted_average: 8.5 }
        }
      },
      {
        photoPath: 'photo3.jpg',
        scores: {
          individual: {
            'Criterion 1': { score: 6, weight: 50, reasoning: 'Average' },
            'Criterion 2': { score: 5, weight: 50, reasoning: 'Average' }
          },
          summary: { weighted_average: 2.0 } // Mismatch!
        }
      }
    ];

    const result = batchCheckCoherence(analysisResults);

    expect(result.totalPhotos).toBe(3);
    expect(result.coherentPhotos).toBe(2);
    expect(result.incoherentPhotos).toBe(1);
    expect(result.totalIssues).toBeGreaterThan(0);
    expect(result.results.length).toBe(1); // Only photo3 returned
    expect(result.results[0].photo).toBe('photo3.jpg');
  });

  it('should handle all coherent photos', () => {
    const analysisResults = [
      {
        photoPath: 'photo1.jpg',
        scores: {
          individual: {
            'Criterion 1': { score: 8, weight: 100, reasoning: 'Good' }
          },
          summary: { weighted_average: 8.0 }
        }
      },
      {
        photoPath: 'photo2.jpg',
        scores: {
          individual: {
            'Criterion 1': { score: 7, weight: 100, reasoning: 'Good' }
          },
          summary: { weighted_average: 7.0 }
        }
      }
    ];

    const result = batchCheckCoherence(analysisResults);

    expect(result.totalPhotos).toBe(2);
    expect(result.coherentPhotos).toBe(2);
    expect(result.incoherentPhotos).toBe(0);
    expect(result.totalIssues).toBe(0);
    expect(result.results.length).toBe(0);
  });

  it('should handle empty batch', () => {
    const result = batchCheckCoherence([]);

    expect(result.totalPhotos).toBe(0);
    expect(result.coherentPhotos).toBe(0);
    expect(result.incoherentPhotos).toBe(0);
    expect(result.totalIssues).toBe(0);
    expect(result.results.length).toBe(0);
  });
});

describe('Prompt Quality Validator - Edge Cases', () => {
  it('should handle analysis with no individual scores', () => {
    const analysisResult = {
      scores: {
        individual: {},
        summary: { weighted_average: 0 }
      }
    };

    const result = checkScoreCoherence(analysisResult);

    expect(result.coherent).toBe(true);
    expect(result.statistics.criteriaCount).toBe(0);
    expect(result.statistics.scoreRange).toEqual([0, 0]);
  });

  it('should handle analysis with missing summary', () => {
    const analysisResult = {
      scores: {
        individual: {
          'Criterion 1': { score: 8, weight: 100, reasoning: 'Good' }
        }
      }
    };

    const result = checkScoreCoherence(analysisResult);

    // Should still work, but summary score will be 0
    expect(result.statistics.averageScore).toBe(0);
  });

  it('should handle scores with zero weights', () => {
    const analysisResult = {
      scores: {
        individual: {
          'Criterion 1': { score: 8, weight: 0, reasoning: 'Good' },
          'Criterion 2': { score: 7, weight: 0, reasoning: 'Good' }
        },
        summary: { weighted_average: 0 }
      }
    };

    const result = checkScoreCoherence(analysisResult);

    // Should not crash with division by zero
    expect(result.coherent).toBe(true);
  });

  it('should handle very small score differences', () => {
    const analysisResult = {
      scores: {
        individual: {
          'Criterion 1': { score: 7.8, weight: 50, reasoning: 'Good' },
          'Criterion 2': { score: 7.9, weight: 50, reasoning: 'Good' }
        },
        summary: { weighted_average: 7.85 }
      }
    };

    const result = checkScoreCoherence(analysisResult);

    // 0.2 tolerance should allow this
    expect(result.coherent).toBe(true);
    expect(result.issues.length).toBe(0);
  });
});
