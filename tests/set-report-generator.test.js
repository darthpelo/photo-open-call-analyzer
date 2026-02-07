import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateSetMarkdownReport,
  generateSetJsonReport,
  generateSetCsvReport,
  exportSetReports
} from '../src/output/set-report-generator.js';
import { existsSync, writeFileSync, mkdirSync } from 'fs';

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn()
}));

describe('set-report-generator', () => {
  const mockSetConfig = {
    setSize: 4,
    individualWeight: 40,
    setWeight: 60,
    setCriteria: [
      { name: 'Visual Coherence', weight: 25 },
      { name: 'Thematic Dialogue', weight: 30 }
    ]
  };

  const mockRankedSets = [
    {
      rank: 1,
      setId: 'set-1',
      compositeScore: 8.5,
      individualAverage: 8.0,
      setWeightedAverage: 8.8,
      recommendation: 'Strong Set',
      suggestedOrder: [1, 3, 2, 4],
      photos: [
        { filename: 'photo1.jpg', score: 8.5 },
        { filename: 'photo2.jpg', score: 7.5 },
        { filename: 'photo3.jpg', score: 9.0 },
        { filename: 'photo4.jpg', score: 7.0 }
      ],
      setScores: {
        'Visual Coherence': { score: 9, weight: 25, reasoning: 'Excellent consistency' },
        'Thematic Dialogue': { score: 8, weight: 30, reasoning: 'Strong conversation' }
      },
      photoRoles: {
        'Photo 1': 'Opening statement',
        'Photo 2': 'Contrast element'
      },
      weakestLink: 'Photo 4 - needs more impact'
    },
    {
      rank: 2,
      setId: 'set-2',
      compositeScore: 7.2,
      individualAverage: 7.0,
      setWeightedAverage: 7.3,
      recommendation: 'Good Set',
      photos: [
        { filename: 'photo5.jpg', score: 7.0 },
        { filename: 'photo6.jpg', score: 7.0 },
        { filename: 'photo7.jpg', score: 7.0 },
        { filename: 'photo8.jpg', score: 7.0 }
      ],
      setScores: {},
      suggestedOrder: [],
      photoRoles: {}
    }
  ];

  const mockStatistics = {
    total: 2,
    average: 7.85,
    min: 7.2,
    max: 8.5,
    median: 7.85
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSetMarkdownReport', () => {
    it('should include title and theme', () => {
      const md = generateSetMarkdownReport(mockRankedSets, mockStatistics, mockSetConfig, {
        title: 'Polaroid Open Call',
        theme: 'Boundaries'
      });
      expect(md).toContain('Polaroid Open Call');
      expect(md).toContain('Boundaries');
    });

    it('should include recommended set section', () => {
      const md = generateSetMarkdownReport(mockRankedSets, mockStatistics, mockSetConfig);
      expect(md).toContain('Recommended Set');
      expect(md).toContain('8.50');
      expect(md).toContain('Strong Set');
    });

    it('should include photo table in recommended set', () => {
      const md = generateSetMarkdownReport(mockRankedSets, mockStatistics, mockSetConfig);
      expect(md).toContain('photo1.jpg');
      expect(md).toContain('photo3.jpg');
    });

    it('should include set criteria scores', () => {
      const md = generateSetMarkdownReport(mockRankedSets, mockStatistics, mockSetConfig);
      expect(md).toContain('Visual Coherence');
      expect(md).toContain('9/10');
      expect(md).toContain('Excellent consistency');
    });

    it('should include suggested order', () => {
      const md = generateSetMarkdownReport(mockRankedSets, mockStatistics, mockSetConfig);
      expect(md).toMatch(/1.*→.*3.*→.*2.*→.*4/);
    });

    it('should include all sets ranking table when multiple sets', () => {
      const md = generateSetMarkdownReport(mockRankedSets, mockStatistics, mockSetConfig);
      expect(md).toContain('All Sets Ranking');
      expect(md).toContain('photo5.jpg');
    });

    it('should include statistics section', () => {
      const md = generateSetMarkdownReport(mockRankedSets, mockStatistics, mockSetConfig);
      expect(md).toContain('Statistics');
      expect(md).toContain('7.85');
    });

    it('should include scoring weights', () => {
      const md = generateSetMarkdownReport(mockRankedSets, mockStatistics, mockSetConfig);
      expect(md).toContain('40%');
      expect(md).toContain('60%');
    });

    it('should handle empty sets', () => {
      const md = generateSetMarkdownReport([], null, mockSetConfig);
      expect(md).toContain('Set Analysis Report');
      expect(md).toContain('Sets evaluated**: 0');
    });
  });

  describe('generateSetJsonReport', () => {
    it('should include metadata', () => {
      const json = generateSetJsonReport(mockRankedSets, mockStatistics, mockSetConfig, {
        title: 'Test Call',
        theme: 'Test Theme'
      });
      expect(json.metadata.title).toBe('Test Call');
      expect(json.metadata.theme).toBe('Test Theme');
      expect(json.metadata.setSize).toBe(4);
      expect(json.metadata.totalSets).toBe(2);
    });

    it('should include ranking array', () => {
      const json = generateSetJsonReport(mockRankedSets, mockStatistics, mockSetConfig);
      expect(json.ranking).toHaveLength(2);
      expect(json.ranking[0].rank).toBe(1);
      expect(json.ranking[0].compositeScore).toBe(8.5);
    });

    it('should include photos in ranking', () => {
      const json = generateSetJsonReport(mockRankedSets, mockStatistics, mockSetConfig);
      expect(json.ranking[0].photos).toHaveLength(4);
      expect(json.ranking[0].photos[0].filename).toBe('photo1.jpg');
    });

    it('should include statistics', () => {
      const json = generateSetJsonReport(mockRankedSets, mockStatistics, mockSetConfig);
      expect(json.statistics.total).toBe(2);
      expect(json.statistics.average).toBe(7.85);
    });
  });

  describe('generateSetCsvReport', () => {
    it('should include header row', () => {
      const csv = generateSetCsvReport(mockRankedSets);
      expect(csv.split('\n')[0]).toContain('Rank');
      expect(csv.split('\n')[0]).toContain('Composite Score');
    });

    it('should include data rows for each set', () => {
      const csv = generateSetCsvReport(mockRankedSets);
      const lines = csv.trim().split('\n');
      expect(lines.length).toBe(3); // header + 2 sets
    });

    it('should include photo filenames in quotes', () => {
      const csv = generateSetCsvReport(mockRankedSets);
      expect(csv).toContain('photo1.jpg');
      expect(csv).toContain('photo5.jpg');
    });

    it('should handle empty sets', () => {
      const csv = generateSetCsvReport([]);
      const lines = csv.trim().split('\n');
      expect(lines.length).toBe(1); // header only
    });
  });

  describe('exportSetReports', () => {
    it('should create output directory if not exists', () => {
      existsSync.mockReturnValue(false);
      exportSetReports('/tmp/output', mockRankedSets, mockStatistics, mockSetConfig);
      expect(mkdirSync).toHaveBeenCalledWith('/tmp/output', { recursive: true });
    });

    it('should write three files (md, json, csv)', () => {
      exportSetReports('/tmp/output', mockRankedSets, mockStatistics, mockSetConfig);
      expect(writeFileSync).toHaveBeenCalledTimes(3);

      const paths = writeFileSync.mock.calls.map(c => c[0]);
      expect(paths).toContain('/tmp/output/set-analysis.md');
      expect(paths).toContain('/tmp/output/set-analysis.json');
      expect(paths).toContain('/tmp/output/set-analysis.csv');
    });

    it('should not create directory if it exists', () => {
      existsSync.mockReturnValue(true);
      exportSetReports('/tmp/output', mockRankedSets, mockStatistics, mockSetConfig);
      expect(mkdirSync).not.toHaveBeenCalled();
    });
  });
});
