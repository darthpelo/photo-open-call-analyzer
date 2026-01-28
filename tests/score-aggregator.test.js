import { aggregateScores, generateTiers, generateStatistics, integrateSmartTiering } from '../src/analysis/score-aggregator.js';

describe('Score Aggregator', () => {
  const mockAnalyses = [
    {
      photoPath: '/path/photo1.jpg',
      scores: {
        individual: {
          'Theme Alignment': { score: 9, weight: 30 },
          'Technical Quality': { score: 8, weight: 20 },
          Originality: { score: 8, weight: 25 },
          'Emotional Impact': { score: 9, weight: 15 },
          'Jury Fit': { score: 7, weight: 10 },
        },
        summary: { weighted_average: 8.3 },
      },
    },
    {
      photoPath: '/path/photo2.jpg',
      scores: {
        individual: {
          'Theme Alignment': { score: 7, weight: 30 },
          'Technical Quality': { score: 7, weight: 20 },
          Originality: { score: 6, weight: 25 },
          'Emotional Impact': { score: 7, weight: 15 },
          'Jury Fit': { score: 6, weight: 10 },
        },
        summary: { weighted_average: 6.8 },
      },
    },
    {
      photoPath: '/path/photo3.jpg',
      scores: {
        individual: {
          'Theme Alignment': { score: 5, weight: 30 },
          'Technical Quality': { score: 5, weight: 20 },
          Originality: { score: 4, weight: 25 },
          'Emotional Impact': { score: 5, weight: 15 },
          'Jury Fit': { score: 4, weight: 10 },
        },
        summary: { weighted_average: 4.8 },
      },
    },
  ];

  const mockCriteria = [
    { name: 'Theme Alignment', weight: 30 },
    { name: 'Technical Quality', weight: 20 },
    { name: 'Originality', weight: 25 },
    { name: 'Emotional Impact', weight: 15 },
    { name: 'Jury Fit', weight: 10 },
  ];

  test('should aggregate scores and create ranking', () => {
    const aggregation = aggregateScores(mockAnalyses, mockCriteria);

    expect(aggregation.total_photos).toBe(3);
    expect(aggregation.photos.length).toBe(3);
    expect(aggregation.photos[0].rank).toBe(1);
    expect(aggregation.photos[0].overall_score).toBe(8.3);
  });

  test('should sort photos by score in descending order', () => {
    const aggregation = aggregateScores(mockAnalyses, mockCriteria);

    expect(aggregation.photos[0].overall_score).toBeGreaterThan(aggregation.photos[1].overall_score);
    expect(aggregation.photos[1].overall_score).toBeGreaterThan(aggregation.photos[2].overall_score);
  });

  test('should generate tiers', () => {
    const aggregation = aggregateScores(mockAnalyses, mockCriteria);
    const tiers = generateTiers(aggregation);

    expect(tiers.tiers).toBeDefined();
    expect(tiers.summary).toBeDefined();
    expect(Object.keys(tiers.tiers).length).toBeGreaterThan(0);
  });

  test('should generate statistics', () => {
    const aggregation = aggregateScores(mockAnalyses, mockCriteria);
    const stats = generateStatistics(aggregation);

    expect(stats.average).toBeDefined();
    expect(stats.median).toBeDefined();
    expect(stats.min).toBeLessThanOrEqual(stats.max);
    expect(stats.count).toBe(3);
  });

  test('should integrate smart tiering with aggregated scores', () => {
    const aggregation = aggregateScores(mockAnalyses, mockCriteria);
    const tiered = integrateSmartTiering(aggregation);

    expect(tiered).toHaveProperty('tier1');
    expect(tiered).toHaveProperty('tier2');
    expect(tiered).toHaveProperty('tier3');
    expect(tiered).toHaveProperty('summary');
    expect(tiered.summary.total).toBe(3);
  });

  test('should respect custom tier thresholds in integration', () => {
    const aggregation = aggregateScores(mockAnalyses, mockCriteria);
    const tiered = integrateSmartTiering(aggregation, { high: 8.0, medium: 7.0 });

    expect(tiered.summary.tier1_count + tiered.summary.tier2_count + tiered.summary.tier3_count).toBe(3);
  });

  test('should handle empty aggregation in tiering', () => {
    const emptyAggregation = { photos: [], total_photos: 0 };
    const tiered = integrateSmartTiering(emptyAggregation);

    expect(tiered.summary.total).toBe(0);
    expect(tiered.tier1).toEqual([]);
    expect(tiered.tier2).toEqual([]);
    expect(tiered.tier3).toEqual([]);
  });
});
