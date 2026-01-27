import { describe, test, expect } from '@jest/globals';
import { generateMarkdownReport, generateJsonReport, generateCsvReport } from '../src/output/report-generator.js';

describe('Report Generator', () => {
  const mockAggregation = {
    timestamp: '2026-01-27T10:00:00.000Z',
    total_photos: 2,
    photos: [
      {
        rank: 1,
        photo: '/path/photo1.jpg',
        overall_score: 8.5,
        individual_scores: {
          'Theme Alignment': { score: 9, weight: 30 },
          'Technical Quality': { score: 8, weight: 20 },
        },
        summary: { recommendation: 'Strong Yes' },
      },
      {
        rank: 2,
        photo: '/path/photo2.jpg',
        overall_score: 6.5,
        individual_scores: {
          'Theme Alignment': { score: 7, weight: 30 },
          'Technical Quality': { score: 6, weight: 20 },
        },
        summary: { recommendation: 'Maybe' },
      },
    ],
  };

  const mockTiers = {
    timestamp: '2026-01-27T10:00:00.000Z',
    summary: {
      strong_yes: { count: 1, percentage: 50 },
      maybe: { count: 1, percentage: 50 },
    },
    tiers: {},
  };

  const mockStats = {
    count: 2,
    average: 7.5,
    median: 7.5,
    min: 6.5,
    max: 8.5,
    std_dev: 1.0,
  };

  test('should generate markdown report', () => {
    const report = generateMarkdownReport(mockAggregation, mockTiers, mockStats);

    expect(report).toContain('# Photo Analysis Report');
    expect(report).toContain('photo1.jpg');
    expect(report).toContain('8.5');
    expect(report).toContain('Strong Yes');
  });

  test('should generate JSON report', () => {
    const report = generateJsonReport(mockAggregation, mockTiers, mockStats);

    expect(report.metadata).toBeDefined();
    expect(report.statistics).toBeDefined();
    expect(report.ranking).toBeDefined();
    expect(report.ranking.length).toBe(2);
  });

  test('should generate CSV report', () => {
    const csv = generateCsvReport(mockAggregation);

    expect(csv).toContain('Rank,Photo,Overall Score,Recommendation');
    expect(csv).toContain('photo1.jpg');
    expect(csv).toContain('8.5');
  });
});
