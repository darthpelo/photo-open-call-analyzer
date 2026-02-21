import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock photo-analyzer at module scope before importing dependent modules (CLAUDE.md convention)
vi.mock('../src/analysis/photo-analyzer.js', () => ({
  analyzePhoto: vi.fn().mockResolvedValue({
    scores: {
      individual: {
        'theme_fit': { score: 7, weight: 20 },
        'technical_quality': { score: 8, weight: 20 }
      },
      summary: { weighted_average: 7.5 }
    }
  })
}));

describe('Benchmarking Manager (FR-4.2)', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-bench-'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // Helper: create a valid baseline directory structure
  function createBaseline(baseDir, photos = ['baseline-01.jpg', 'baseline-02.jpg'], scores = null) {
    const photosDir = path.join(baseDir, 'photos');
    fs.mkdirSync(photosDir, { recursive: true });

    for (const photo of photos) {
      // Create minimal JPEG files (just enough to exist)
      fs.writeFileSync(path.join(photosDir, photo), Buffer.alloc(100));
    }

    const expectedScores = scores || [
      {
        photo: 'baseline-01.jpg',
        scores: {
          theme_fit: 8,
          technical_quality: 7,
          originality: 6,
          narrative_strength: 7,
          jury_fit: 5
        }
      },
      {
        photo: 'baseline-02.jpg',
        scores: {
          theme_fit: 6,
          technical_quality: 8,
          originality: 7,
          narrative_strength: 5,
          jury_fit: 6
        }
      }
    ];

    fs.writeFileSync(
      path.join(baseDir, 'expected-scores.json'),
      JSON.stringify(expectedScores, null, 2)
    );

    return { photosDir, expectedScores };
  }

  describe('validateBaselineStructure', () => {
    it('should return valid for a correct baseline directory', async () => {
      createBaseline(testDir);
      const { validateBaselineStructure } = await import('../src/analysis/benchmarking-manager.js');
      const result = validateBaselineStructure(testDir);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when photos/ directory is missing', async () => {
      fs.writeFileSync(path.join(testDir, 'expected-scores.json'), '[]');
      const { validateBaselineStructure } = await import('../src/analysis/benchmarking-manager.js');
      const result = validateBaselineStructure(testDir);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /photos/i.test(e))).toBe(true);
    });

    it('should return invalid when expected-scores.json is missing', async () => {
      fs.mkdirSync(path.join(testDir, 'photos'));
      fs.writeFileSync(path.join(testDir, 'photos', 'test.jpg'), Buffer.alloc(10));
      const { validateBaselineStructure } = await import('../src/analysis/benchmarking-manager.js');
      const result = validateBaselineStructure(testDir);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /expected-scores/i.test(e))).toBe(true);
    });

    it('should return invalid when photos/ is empty', async () => {
      fs.mkdirSync(path.join(testDir, 'photos'));
      fs.writeFileSync(path.join(testDir, 'expected-scores.json'), '[]');
      const { validateBaselineStructure } = await import('../src/analysis/benchmarking-manager.js');
      const result = validateBaselineStructure(testDir);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /no.*photo/i.test(e))).toBe(true);
    });

    it('should return invalid when baseline directory does not exist', async () => {
      const { validateBaselineStructure } = await import('../src/analysis/benchmarking-manager.js');
      const result = validateBaselineStructure('/nonexistent/path');
      expect(result.valid).toBe(false);
    });

    it('should return invalid when expected-scores.json references photos not in photos/', async () => {
      fs.mkdirSync(path.join(testDir, 'photos'));
      fs.writeFileSync(path.join(testDir, 'photos', 'baseline-01.jpg'), Buffer.alloc(10));
      fs.writeFileSync(path.join(testDir, 'expected-scores.json'), JSON.stringify([
        { photo: 'baseline-01.jpg', scores: { theme_fit: 8 } },
        { photo: 'missing-photo.jpg', scores: { theme_fit: 5 } }
      ]));
      const { validateBaselineStructure } = await import('../src/analysis/benchmarking-manager.js');
      const result = validateBaselineStructure(testDir);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /missing-photo/i.test(e))).toBe(true);
    });
  });

  describe('loadBaseline', () => {
    it('should load photos list and expected scores', async () => {
      createBaseline(testDir);
      const { loadBaseline } = await import('../src/analysis/benchmarking-manager.js');
      const baseline = loadBaseline(testDir);
      expect(baseline.photos).toHaveLength(2);
      expect(baseline.expectedScores).toHaveLength(2);
      expect(baseline.expectedScores[0].photo).toBe('baseline-01.jpg');
    });

    it('should include full photo paths', async () => {
      createBaseline(testDir);
      const { loadBaseline } = await import('../src/analysis/benchmarking-manager.js');
      const baseline = loadBaseline(testDir);
      expect(baseline.photos[0]).toContain(path.join('photos', 'baseline-01.jpg'));
    });

    it('should throw on invalid baseline', async () => {
      const { loadBaseline } = await import('../src/analysis/benchmarking-manager.js');
      expect(() => loadBaseline('/nonexistent')).toThrow();
    });
  });

  describe('generateDriftReport', () => {
    it('should return OK when deltas are within 1.5', async () => {
      const { generateDriftReport } = await import('../src/analysis/benchmarking-manager.js');
      const actual = [
        { photo: 'p1.jpg', scores: { theme_fit: 7.5, technical_quality: 7 } }
      ];
      const expected = [
        { photo: 'p1.jpg', scores: { theme_fit: 8, technical_quality: 7 } }
      ];
      const report = generateDriftReport(actual, expected);
      expect(report.overall_status).toBe('OK');
      expect(report.criteria.theme_fit.status).toBe('OK');
    });

    it('should return WARNING when delta is between 1.5 and 3.0', async () => {
      const { generateDriftReport } = await import('../src/analysis/benchmarking-manager.js');
      const actual = [
        { photo: 'p1.jpg', scores: { theme_fit: 5, technical_quality: 7 } }
      ];
      const expected = [
        { photo: 'p1.jpg', scores: { theme_fit: 8, technical_quality: 7 } }
      ];
      const report = generateDriftReport(actual, expected);
      expect(report.overall_status).toBe('WARNING');
      expect(report.criteria.theme_fit.status).toBe('WARNING');
      expect(report.criteria.theme_fit.delta).toBeCloseTo(3.0);
    });

    it('should return CRITICAL when delta exceeds 3.0', async () => {
      const { generateDriftReport } = await import('../src/analysis/benchmarking-manager.js');
      const actual = [
        { photo: 'p1.jpg', scores: { theme_fit: 2, technical_quality: 7 } }
      ];
      const expected = [
        { photo: 'p1.jpg', scores: { theme_fit: 8, technical_quality: 7 } }
      ];
      const report = generateDriftReport(actual, expected);
      expect(report.overall_status).toBe('CRITICAL');
      expect(report.criteria.theme_fit.status).toBe('CRITICAL');
    });

    it('should average scores across multiple photos', async () => {
      const { generateDriftReport } = await import('../src/analysis/benchmarking-manager.js');
      const actual = [
        { photo: 'p1.jpg', scores: { theme_fit: 7 } },
        { photo: 'p2.jpg', scores: { theme_fit: 9 } }
      ];
      const expected = [
        { photo: 'p1.jpg', scores: { theme_fit: 8 } },
        { photo: 'p2.jpg', scores: { theme_fit: 8 } }
      ];
      const report = generateDriftReport(actual, expected);
      // actual avg = 8, expected avg = 8, delta = 0
      expect(report.criteria.theme_fit.expected_avg).toBe(8);
      expect(report.criteria.theme_fit.actual_avg).toBe(8);
      expect(report.criteria.theme_fit.delta).toBeCloseTo(0);
    });

    it('should generate recommendations for WARNING and CRITICAL criteria', async () => {
      const { generateDriftReport } = await import('../src/analysis/benchmarking-manager.js');
      const actual = [
        { photo: 'p1.jpg', scores: { theme_fit: 3, technical_quality: 7 } }
      ];
      const expected = [
        { photo: 'p1.jpg', scores: { theme_fit: 8, technical_quality: 7 } }
      ];
      const report = generateDriftReport(actual, expected);
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations[0]).toContain('theme_fit');
    });

    it('should handle empty arrays gracefully', async () => {
      const { generateDriftReport } = await import('../src/analysis/benchmarking-manager.js');
      const report = generateDriftReport([], []);
      expect(report.overall_status).toBe('OK');
      expect(report.criteria).toEqual({});
    });

    it('should use absolute delta (not signed)', async () => {
      const { generateDriftReport } = await import('../src/analysis/benchmarking-manager.js');
      const actual = [
        { photo: 'p1.jpg', scores: { theme_fit: 9 } }
      ];
      const expected = [
        { photo: 'p1.jpg', scores: { theme_fit: 6 } }
      ];
      const report = generateDriftReport(actual, expected);
      expect(report.criteria.theme_fit.delta).toBeCloseTo(3.0);
      expect(report.criteria.theme_fit.status).toBe('WARNING');
    });
  });

  describe('runCalibration', () => {
    it('should validate baseline and return a calibration report', async () => {
      createBaseline(testDir, ['baseline-01.jpg'], [
        { photo: 'baseline-01.jpg', scores: { theme_fit: 8, technical_quality: 7 } }
      ]);

      const { runCalibration } = await import('../src/analysis/benchmarking-manager.js');
      const report = await runCalibration(testDir);

      expect(report.baselineSet).toBe(path.basename(testDir));
      expect(report.photosEvaluated).toBe(1);
      expect(report.criteria).toBeDefined();
      expect(report.overall_status).toBeDefined();
      expect(report.timestamp).toBeDefined();
    });

    it('should throw on invalid baseline structure', async () => {
      const { runCalibration } = await import('../src/analysis/benchmarking-manager.js');
      await expect(runCalibration('/nonexistent')).rejects.toThrow();
    });

    it('should save calibration-report.json to baseline directory', async () => {
      createBaseline(testDir, ['baseline-01.jpg'], [
        { photo: 'baseline-01.jpg', scores: { theme_fit: 8 } }
      ]);

      const { runCalibration } = await import('../src/analysis/benchmarking-manager.js');
      await runCalibration(testDir);

      const reportPath = path.join(testDir, 'calibration-report.json');
      expect(fs.existsSync(reportPath)).toBe(true);
    });
  });
});
