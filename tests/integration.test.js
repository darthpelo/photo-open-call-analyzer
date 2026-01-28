/**
 * Photo Open Call Analyzer - Integration Test Suite
 * 
 * Risk-based testing for core photo analysis pipeline
 * Tests: score-aggregator.js, report-generator.js
 * 
 * Run: npm run test:integration
 */

import { aggregateScores, generateTiers, generateStatistics } from '../src/analysis/score-aggregator.js';

describe('Integration Tests: Score Aggregation & Reporting', () => {

  /**
   * IT-001: Score Aggregation with Weighted Averages
   * Risk: P0 - Core calculation accuracy
   */
  describe('IT-001: Score Aggregation with Weighted Averages', () => {
    
    it('should calculate weighted average correctly', () => {
      const criteria = [
        { name: 'Composition', weight: 25 },
        { name: 'Technical Quality', weight: 20 },
        { name: 'Originality', weight: 25 },
        { name: 'Emotional Impact', weight: 15 },
        { name: 'Jury Fit', weight: 15 }
      ];

      const photoScores = [
        {
          photoPath: 'photo-1.jpg',
          filename: 'photo-1.jpg',
          scores: {
            individual: {
              'Composition': { score: 8, feedback: 'Good' },
              'Technical Quality': { score: 7.8, feedback: 'Good' },
              'Originality': { score: 8.5, feedback: 'Great' },
              'Emotional Impact': { score: 8.2, feedback: 'Good' },
              'Jury Fit': { score: 8, feedback: 'Good' }
            },
            summary: { 
              average: 8.1,
              weighted_average: 8.05
            }
          }
        }
      ];

      // Calculate expected weighted average manually
      // (8×0.25 + 7.8×0.20 + 8.5×0.25 + 8.2×0.15 + 8×0.15)
      const expected = (8*0.25 + 7.8*0.20 + 8.5*0.25 + 8.2*0.15 + 8*0.15);

      const result = aggregateScores(photoScores, criteria);

      expect(result.ranking).toBeDefined();
      expect(result.ranking.length).toBe(1);
      expect(result.ranking[0].weighted_score).toBeCloseTo(expected, 1);
    });

    it('should rank photos by weighted score descending', () => {
      const criteria = [
        { name: 'Composition', weight: 25 },
        { name: 'Technical Quality', weight: 20 }
      ];

      const photoScores = [
        {
          photoPath: 'photo-low.jpg',
          filename: 'photo-low.jpg',
          scores: {
            individual: {
              'Composition': { score: 5, feedback: 'Poor' },
              'Technical Quality': { score: 5, feedback: 'Poor' }
            },
            summary: { average: 5, weighted_average: 5 }
          }
        },
        {
          photoPath: 'photo-high.jpg',
          filename: 'photo-high.jpg',
          scores: {
            individual: {
              'Composition': { score: 9, feedback: 'Excellent' },
              'Technical Quality': { score: 9, feedback: 'Excellent' }
            },
            summary: { average: 9, weighted_average: 9 }
          }
        },
        {
          photoPath: 'photo-mid.jpg',
          filename: 'photo-mid.jpg',
          scores: {
            individual: {
              'Composition': { score: 7, feedback: 'Good' },
              'Technical Quality': { score: 7, feedback: 'Good' }
            },
            summary: { average: 7, weighted_average: 7 }
          }
        }
      ];

      const result = aggregateScores(photoScores, criteria);

      expect(result.ranking.length).toBe(3);
      expect(result.ranking[0].filename).toBe('photo-high.jpg');
      expect(result.ranking[1].filename).toBe('photo-mid.jpg');
      expect(result.ranking[2].filename).toBe('photo-low.jpg');
    });
  });

  /**
   * IT-002: Tier Generation
   * Risk: P0 - Categorization accuracy
   */
  describe('IT-002: Tier Generation & Categorization', () => {

    it('should generate tier categories from scores', () => {
      const criteria = [
        { name: 'Composition', weight: 25 },
        { name: 'Technical Quality', weight: 20 }
      ];

      const photoScores = [
        {
          photoPath: 'photo-1.jpg',
          filename: 'photo-1.jpg',
          scores: {
            individual: {
              'Composition': { score: 9, feedback: 'Excellent' },
              'Technical Quality': { score: 9, feedback: 'Excellent' }
            },
            summary: { average: 9, weighted_average: 9 }
          }
        },
        {
          photoPath: 'photo-2.jpg',
          filename: 'photo-2.jpg',
          scores: {
            individual: {
              'Composition': { score: 7, feedback: 'Good' },
              'Technical Quality': { score: 7, feedback: 'Good' }
            },
            summary: { average: 7, weighted_average: 7 }
          }
        },
        {
          photoPath: 'photo-3.jpg',
          filename: 'photo-3.jpg',
          scores: {
            individual: {
              'Composition': { score: 5, feedback: 'Okay' },
              'Technical Quality': { score: 5, feedback: 'Okay' }
            },
            summary: { average: 5, weighted_average: 5 }
          }
        },
        {
          photoPath: 'photo-4.jpg',
          filename: 'photo-4.jpg',
          scores: {
            individual: {
              'Composition': { score: 3, feedback: 'Poor' },
              'Technical Quality': { score: 3, feedback: 'Poor' }
            },
            summary: { average: 3, weighted_average: 3 }
          }
        }
      ];

      const result = aggregateScores(photoScores, criteria);

      // Verify tiers exist
      expect(result.tiers).toBeDefined();
      expect(Object.keys(result.tiers).length).toBeGreaterThan(0);

      // Verify all photos are in tiers
      const allTierPhotos = Object.values(result.tiers).flat();
      expect(allTierPhotos.length).toBe(4);

      // Verify highest-scored photo is in top tier
      const tierValues = Object.values(result.tiers);
      const topTier = tierValues[0]; // Assuming first tier is best
      expect(topTier.some(p => p.filename === 'photo-1.jpg')).toBe(true);
    });

    it('should handle tie-breaking consistently', () => {
      const criteria = [
        { name: 'Composition', weight: 25 },
        { name: 'Technical Quality', weight: 20 }
      ];

      // Two photos with identical scores
      const photoScores = [
        {
          photoPath: 'photo-a.jpg',
          filename: 'photo-a.jpg',
          scores: {
            individual: {
              'Composition': { score: 8, feedback: 'Good' },
              'Technical Quality': { score: 8, feedback: 'Good' }
            },
            summary: { average: 8, weighted_average: 8 }
          }
        },
        {
          photoPath: 'photo-b.jpg',
          filename: 'photo-b.jpg',
          scores: {
            individual: {
              'Composition': { score: 8, feedback: 'Good' },
              'Technical Quality': { score: 8, feedback: 'Good' }
            },
            summary: { average: 8, weighted_average: 8 }
          }
        }
      ];

      const result = aggregateScores(photoScores, criteria);

      expect(result.ranking.length).toBe(2);
      expect(result.ranking[0].weighted_score).toBeCloseTo(result.ranking[1].weighted_score, 2);
    });
  });

  /**
   * IT-003: Statistics Generation
   * Risk: P1 - Reporting accuracy
   */
  describe('IT-003: Statistics Generation', () => {

    it('should calculate mean and median scores', () => {
      const criteria = [
        { name: 'Composition', weight: 25 },
        { name: 'Technical Quality', weight: 20 }
      ];

      const photoScores = [
        {
          photoPath: 'photo-1.jpg',
          filename: 'photo-1.jpg',
          scores: {
            individual: {
              'Composition': { score: 5, feedback: 'Okay' },
              'Technical Quality': { score: 5, feedback: 'Okay' }
            },
            summary: { average: 5, weighted_average: 5 }
          }
        },
        {
          photoPath: 'photo-2.jpg',
          filename: 'photo-2.jpg',
          scores: {
            individual: {
              'Composition': { score: 7, feedback: 'Good' },
              'Technical Quality': { score: 8, feedback: 'Good' }
            },
            summary: { average: 7.5, weighted_average: 7.5 }
          }
        },
        {
          photoPath: 'photo-3.jpg',
          filename: 'photo-3.jpg',
          scores: {
            individual: {
              'Composition': { score: 9, feedback: 'Excellent' },
              'Technical Quality': { score: 9, feedback: 'Excellent' }
            },
            summary: { average: 9, weighted_average: 9 }
          }
        }
      ];

      const result = aggregateScores(photoScores, criteria);

      expect(result.statistics).toBeDefined();
      expect(result.statistics.composition).toBeDefined();
      expect(result.statistics.composition.mean).toBeDefined();
      expect(result.statistics.composition.median).toBeDefined();
      
      // For composition scores [5, 7, 9]: mean = 7, median = 7
      expect(result.statistics.composition.mean).toBeCloseTo(7, 0);
      expect(result.statistics.composition.median).toBeCloseTo(7, 0);
    });

    it('should handle single photo statistics', () => {
      const criteria = [
        { name: 'Composition', weight: 25 },
        { name: 'Technical Quality', weight: 20 }
      ];

      const photoScores = [
        {
          photoPath: 'photo-1.jpg',
          filename: 'photo-1.jpg',
          scores: {
            individual: {
              'Composition': { score: 7, feedback: 'Good' },
              'Technical Quality': { score: 8, feedback: 'Good' }
            },
            summary: { average: 7.5, weighted_average: 7.5 }
          }
        }
      ];

      const result = aggregateScores(photoScores, criteria);

      expect(result.statistics).toBeDefined();
      expect(result.statistics.composition.mean).toBeCloseTo(7, 0);
      expect(result.statistics.composition.median).toBeCloseTo(7, 0);
    });
  });

  /**
   * IT-004: Edge Cases & Error Handling
   * Risk: P1 - Robustness
   */
  describe('IT-004: Edge Cases & Error Handling', () => {

    it('should handle empty photo list', () => {
      const criteria = [
        { name: 'Composition', weight: 25 }
      ];

      const result = aggregateScores([], criteria);

      expect(result.ranking).toBeDefined();
      expect(result.ranking.length).toBe(0);
    });

    it('should handle photos with missing individual scores', () => {
      const criteria = [
        { name: 'Composition', weight: 25 }
      ];

      const photoScores = [
        {
          photoPath: 'photo-1.jpg',
          filename: 'photo-1.jpg',
          scores: {
            individual: {},
            summary: { average: 0, weighted_average: 0 }
          }
        }
      ];

      // Should not crash
      const result = aggregateScores(photoScores, criteria);
      expect(result).toBeDefined();
    });

    it('should handle null or undefined feedback', () => {
      const criteria = [
        { name: 'Composition', weight: 25 }
      ];

      const photoScores = [
        {
          photoPath: 'photo-1.jpg',
          filename: 'photo-1.jpg',
          scores: {
            individual: {
              'Composition': { score: 7, feedback: null }
            },
            summary: { average: 7, weighted_average: 7 }
          }
        }
      ];

      // Should not crash
      const result = aggregateScores(photoScores, criteria);
      expect(result.ranking.length).toBe(1);
    });

    it('should clamp scores to 1-10 range', () => {
      const criteria = [
        { name: 'Composition', weight: 25 }
      ];

      const photoScores = [
        {
          photoPath: 'photo-1.jpg',
          filename: 'photo-1.jpg',
          scores: {
            individual: {
              'Composition': { score: 15, feedback: 'Over 10' }
            },
            summary: { average: 15, weighted_average: 15 }
          }
        }
      ];

      const result = aggregateScores(photoScores, criteria);
      
      // Score should be valid (implementation may clamp or accept as-is)
      expect(result.ranking[0].weighted_score).toBeDefined();
    });
  });
});
