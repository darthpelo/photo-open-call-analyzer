import { generateMarkdownReport, generateJsonReport, generateCsvReport, generateTierMarkdownReport, generateTierJsonReport, generateTierCsvReport } from '../src/output/report-generator.js';

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

  // Smart Tiering Report Tests
  describe('Smart Tiering Reports', () => {
    const mockSmartTiers = {
      tier1: [
        { filename: 'strong1.jpg', score: 9.2, name: 'strong1.jpg' },
        { filename: 'strong2.jpg', score: 8.8, name: 'strong2.jpg' }
      ],
      tier2: [
        { filename: 'good1.jpg', score: 7.5, name: 'good1.jpg' }
      ],
      tier3: [
        { filename: 'borderline1.jpg', score: 5.0, name: 'borderline1.jpg' }
      ],
      summary: {
        total: 4,
        tier1_count: 2,
        tier2_count: 1,
        tier3_count: 1,
        high_threshold: 8.0,
        medium_threshold: 6.5,
        average_score: 7.6
      }
    };

    test('should generate tier-specific markdown report', () => {
      const report = generateTierMarkdownReport(mockSmartTiers, mockStats);

      expect(report).toContain('# Smart Tiering Report');
      expect(report).toContain('🟢 Tier 1');
      expect(report).toContain('🟡 Tier 2');
      expect(report).toContain('🟠 Tier 3');
      expect(report).toContain('strong1.jpg');
      expect(report).toContain('good1.jpg');
      expect(report).toContain('borderline1.jpg');
      expect(report).toContain('Ready for submission');
      expect(report).toContain('Good candidate');
      expect(report).toContain('Review recommended');
    });

    test('should generate tier-specific JSON report', () => {
      const report = generateTierJsonReport(mockSmartTiers, mockStats);

      expect(report.metadata).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.tiers).toBeDefined();
      expect(report.tiers.tier1).toHaveLength(2);
      expect(report.tiers.tier2).toHaveLength(1);
      expect(report.tiers.tier3).toHaveLength(1);
      expect(report.tiers.tier1[0].label).toBe('🟢 Strong');
    });

    test('should generate tier-specific CSV report', () => {
      const csv = generateTierCsvReport(mockSmartTiers);

      expect(csv).toContain('Filename,Score,Tier,Label,Recommendation');
      expect(csv).toContain('strong1.jpg');
      expect(csv).toContain('Tier1');
      expect(csv).toContain('🟢 Strong');
      expect(csv).toContain('Submit');
      expect(csv).toContain('good1.jpg');
      expect(csv).toContain('Tier2');
      expect(csv).toContain('Consider');
      expect(csv).toContain('borderline1.jpg');
      expect(csv).toContain('Tier3');
      expect(csv).toContain('🟠 Borderline');
      expect(csv).toContain('Review');
    });

    test('should handle empty tiers gracefully', () => {
      const emptyTiers = {
        tier1: [],
        tier2: [],
        tier3: [],
        summary: {
          total: 0,
          tier1_count: 0,
          tier2_count: 0,
          tier3_count: 0,
          high_threshold: 8.0,
          medium_threshold: 6.5,
          average_score: 0
        }
      };

      const markdown = generateTierMarkdownReport(emptyTiers, mockStats);
      const json = generateTierJsonReport(emptyTiers, mockStats);
      const csv = generateTierCsvReport(emptyTiers);

      expect(markdown).toContain('Smart Tiering Report');
      expect(json.summary.total).toBe(0);
      expect(csv).toContain('Filename,Score,Tier,Label,Recommendation');
    });
  });
});
