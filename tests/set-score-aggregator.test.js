import { describe, it, expect } from 'vitest';
import {
  aggregateSetScores,
  rankSets,
  compareSets
} from '../src/analysis/set-score-aggregator.js';

describe('set-score-aggregator', () => {
  describe('aggregateSetScores', () => {
    const individualResults = [
      { filename: 'photo1.jpg', score: 8.0 },
      { filename: 'photo2.jpg', score: 7.0 },
      { filename: 'photo3.jpg', score: 9.0 },
      { filename: 'photo4.jpg', score: 6.0 }
    ];

    const setAnalysis = {
      setScores: {
        'Visual Coherence': { score: 8, weight: 25, reasoning: 'Good consistency' },
        'Thematic Dialogue': { score: 7, weight: 30, reasoning: 'Nice conversation' },
        'Narrative Arc': { score: 9, weight: 25, reasoning: 'Strong story' },
        'Complementarity': { score: 6, weight: 20, reasoning: 'Some redundancy' }
      },
      recommendation: 'Good Set',
      suggestedOrder: [3, 1, 4, 2],
      photoRoles: {
        'photo1.jpg': 'Establishes tone',
        'photo2.jpg': 'Adds contrast',
        'photo3.jpg': 'Peak moment',
        'photo4.jpg': 'Resolution'
      }
    };

    const setConfig = {
      individualWeight: 40,
      setWeight: 60
    };

    it('should compute composite score with correct weights', () => {
      const result = aggregateSetScores(individualResults, setAnalysis, setConfig);

      // avgIndividual = (8 + 7 + 9 + 6) / 4 = 7.5
      // setWeighted = (8*25 + 7*30 + 9*25 + 6*20) / 100 = (200 + 210 + 225 + 120) / 100 = 7.55
      // composite = (40 * 7.5 + 60 * 7.55) / 100 = (300 + 453) / 100 = 7.53
      expect(result.compositeScore).toBeCloseTo(7.53, 1);
    });

    it('should include individual average', () => {
      const result = aggregateSetScores(individualResults, setAnalysis, setConfig);
      expect(result.individualAverage).toBeCloseTo(7.5, 1);
    });

    it('should include set weighted average', () => {
      const result = aggregateSetScores(individualResults, setAnalysis, setConfig);
      expect(result.setWeightedAverage).toBeCloseTo(7.55, 1);
    });

    it('should preserve set analysis metadata', () => {
      const result = aggregateSetScores(individualResults, setAnalysis, setConfig);
      expect(result.recommendation).toBe('Good Set');
      expect(result.suggestedOrder).toEqual([3, 1, 4, 2]);
      expect(result.photoRoles).toHaveProperty('photo1.jpg');
    });

    it('should include photos with individual scores', () => {
      const result = aggregateSetScores(individualResults, setAnalysis, setConfig);
      expect(result.photos).toHaveLength(4);
      expect(result.photos[0]).toHaveProperty('filename');
      expect(result.photos[0]).toHaveProperty('score');
    });

    it('should use default weights (40/60) when not specified', () => {
      const result = aggregateSetScores(individualResults, setAnalysis, {});
      expect(result.compositeScore).toBeCloseTo(7.53, 1);
    });

    it('should handle 100% individual weight', () => {
      const result = aggregateSetScores(individualResults, setAnalysis, {
        individualWeight: 100,
        setWeight: 0
      });
      expect(result.compositeScore).toBeCloseTo(7.5, 1);
    });

    it('should handle 100% set weight', () => {
      const result = aggregateSetScores(individualResults, setAnalysis, {
        individualWeight: 0,
        setWeight: 100
      });
      expect(result.compositeScore).toBeCloseTo(7.55, 1);
    });
  });

  describe('rankSets', () => {
    it('should rank sets by composite score descending', () => {
      const sets = [
        { setId: 'set-1', compositeScore: 7.0 },
        { setId: 'set-2', compositeScore: 9.0 },
        { setId: 'set-3', compositeScore: 8.0 }
      ];

      const ranked = rankSets(sets);
      expect(ranked.ranking[0].rank).toBe(1);
      expect(ranked.ranking[0].setId).toBe('set-2');
      expect(ranked.ranking[1].rank).toBe(2);
      expect(ranked.ranking[1].setId).toBe('set-3');
      expect(ranked.ranking[2].rank).toBe(3);
      expect(ranked.ranking[2].setId).toBe('set-1');
    });

    it('should include statistics', () => {
      const sets = [
        { setId: 'set-1', compositeScore: 6.0 },
        { setId: 'set-2', compositeScore: 8.0 },
        { setId: 'set-3', compositeScore: 10.0 }
      ];

      const ranked = rankSets(sets);
      expect(ranked.statistics.average).toBe(8);
      expect(ranked.statistics.min).toBe(6);
      expect(ranked.statistics.max).toBe(10);
      expect(ranked.statistics.total).toBe(3);
    });

    it('should handle single set', () => {
      const sets = [{ setId: 'set-1', compositeScore: 7.5 }];
      const ranked = rankSets(sets);
      expect(ranked.ranking.length).toBe(1);
      expect(ranked.ranking[0].rank).toBe(1);
    });

    it('should handle empty array', () => {
      const ranked = rankSets([]);
      expect(ranked.ranking).toEqual([]);
      expect(ranked.statistics.total).toBe(0);
    });
  });

  describe('compareSets', () => {
    it('should identify the winner', () => {
      const setA = {
        setId: 'set-A',
        compositeScore: 8.5,
        setScores: {
          'Visual Coherence': { score: 9 },
          'Thematic Dialogue': { score: 8 }
        }
      };
      const setB = {
        setId: 'set-B',
        compositeScore: 7.0,
        setScores: {
          'Visual Coherence': { score: 7 },
          'Thematic Dialogue': { score: 7 }
        }
      };

      const comparison = compareSets(setA, setB);
      expect(comparison.winner).toBe('set-A');
      expect(comparison.scoreDelta).toBeCloseTo(1.5, 1);
    });

    it('should show per-criterion differences', () => {
      const setA = {
        setId: 'set-A',
        compositeScore: 8.0,
        setScores: {
          'Visual Coherence': { score: 9 },
          'Thematic Dialogue': { score: 7 }
        }
      };
      const setB = {
        setId: 'set-B',
        compositeScore: 7.5,
        setScores: {
          'Visual Coherence': { score: 6 },
          'Thematic Dialogue': { score: 9 }
        }
      };

      const comparison = compareSets(setA, setB);
      expect(comparison.criterionDiffs).toHaveProperty('Visual Coherence');
      expect(comparison.criterionDiffs['Visual Coherence']).toBe(3);
      expect(comparison.criterionDiffs['Thematic Dialogue']).toBe(-2);
    });

    it('should handle tie', () => {
      const setA = { setId: 'set-A', compositeScore: 7.5, setScores: {} };
      const setB = { setId: 'set-B', compositeScore: 7.5, setScores: {} };

      const comparison = compareSets(setA, setB);
      expect(comparison.winner).toBe('tie');
      expect(comparison.scoreDelta).toBe(0);
    });
  });
});
