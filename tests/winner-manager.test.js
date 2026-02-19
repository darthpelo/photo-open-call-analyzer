/**
 * Unit Tests for Winner Manager (FR-3.10 / ADR-020)
 *
 * TDD: Tests written BEFORE implementation (RED phase).
 *
 * Tests:
 * - tagWinner(): Store winner entry with atomic write
 * - loadWinners(): Read winner entries from project
 * - extractPatterns(): Derive patterns from winners
 * - computeWinnerSimilarity(): Cosine similarity scoring
 * - getWinnerInsights(): Full insights report
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  tagWinner,
  loadWinners,
  extractPatterns,
  computeWinnerSimilarity,
  getWinnerInsights
} from '../src/analysis/winner-manager.js';

describe('Winner Manager - Unit Tests', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'winner-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // ============================================
  // tagWinner()
  // ============================================

  describe('tagWinner()', () => {
    const mockPhotoResult = {
      filename: 'sunset.jpg',
      scores: {
        individual: {
          'Composition': { score: 9, weight: 25 },
          'Technical Quality': { score: 8, weight: 25 },
          'Creativity': { score: 7, weight: 25 },
          'Impact': { score: 9, weight: 25 }
        },
        summary: { weighted_average: 8.25 }
      }
    };

    it('should create winners directory and file if they do not exist', () => {
      const result = tagWinner(testDir, mockPhotoResult, {
        placement: '1st',
        competition: 'Nature 2025'
      });

      expect(result).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'winners', 'winners.json'))).toBe(true);
    });

    it('should store winner entry with correct structure', () => {
      tagWinner(testDir, mockPhotoResult, {
        placement: '1st',
        competition: 'Nature 2025',
        notes: 'Strong composition'
      });

      const winners = loadWinners(testDir);
      expect(winners).toHaveLength(1);

      const entry = winners[0];
      expect(entry.filename).toBe('sunset.jpg');
      expect(entry.competition).toBe('Nature 2025');
      expect(entry.placement).toBe('1st');
      expect(entry.notes).toBe('Strong composition');
      expect(entry.scores).toEqual(mockPhotoResult.scores);
      expect(entry.taggedAt).toBeDefined();
      expect(entry.id).toMatch(/^win-/);
    });

    it('should append to existing winners', () => {
      tagWinner(testDir, mockPhotoResult, { placement: '1st' });

      const secondResult = {
        filename: 'mountain.jpg',
        scores: {
          individual: {
            'Composition': { score: 8, weight: 25 },
            'Technical Quality': { score: 9, weight: 25 },
            'Creativity': { score: 8, weight: 25 },
            'Impact': { score: 7, weight: 25 }
          },
          summary: { weighted_average: 8.0 }
        }
      };

      tagWinner(testDir, secondResult, { placement: '2nd' });

      const winners = loadWinners(testDir);
      expect(winners).toHaveLength(2);
      expect(winners[0].filename).toBe('sunset.jpg');
      expect(winners[1].filename).toBe('mountain.jpg');
    });

    it('should use atomic write (no .tmp files left)', () => {
      tagWinner(testDir, mockPhotoResult, { placement: '1st' });

      const winnersDir = path.join(testDir, 'winners');
      const files = fs.readdirSync(winnersDir);
      const tmpFiles = files.filter(f => f.endsWith('.tmp'));
      expect(tmpFiles).toHaveLength(0);
    });

    it('should default missing metadata fields', () => {
      tagWinner(testDir, mockPhotoResult, {});

      const winners = loadWinners(testDir);
      expect(winners[0].placement).toBe('');
      expect(winners[0].competition).toBe('');
      expect(winners[0].notes).toBe('');
    });
  });

  // ============================================
  // loadWinners()
  // ============================================

  describe('loadWinners()', () => {
    it('should return empty array when no winners directory exists', () => {
      const winners = loadWinners(testDir);
      expect(winners).toEqual([]);
    });

    it('should return empty array when winners.json is corrupted', () => {
      const winnersDir = path.join(testDir, 'winners');
      fs.mkdirSync(winnersDir, { recursive: true });
      fs.writeFileSync(path.join(winnersDir, 'winners.json'), 'not json{{{');

      const winners = loadWinners(testDir);
      expect(winners).toEqual([]);
    });

    it('should return entries from valid winners.json', () => {
      const mockPhotoResult = {
        filename: 'test.jpg',
        scores: { individual: {}, summary: { weighted_average: 7.0 } }
      };
      tagWinner(testDir, mockPhotoResult, { placement: '3rd' });

      const winners = loadWinners(testDir);
      expect(winners).toHaveLength(1);
      expect(winners[0].filename).toBe('test.jpg');
    });
  });

  // ============================================
  // extractPatterns()
  // ============================================

  describe('extractPatterns()', () => {
    const winners = [
      {
        filename: 'w1.jpg',
        scores: {
          individual: {
            'Composition': { score: 9, weight: 25 },
            'Technical Quality': { score: 7, weight: 25 },
            'Creativity': { score: 8, weight: 25 },
            'Impact': { score: 9, weight: 25 }
          },
          summary: { weighted_average: 8.25 }
        }
      },
      {
        filename: 'w2.jpg',
        scores: {
          individual: {
            'Composition': { score: 8, weight: 25 },
            'Technical Quality': { score: 9, weight: 25 },
            'Creativity': { score: 6, weight: 25 },
            'Impact': { score: 8, weight: 25 }
          },
          summary: { weighted_average: 7.75 }
        }
      }
    ];

    it('should return null when no winners provided', () => {
      expect(extractPatterns([])).toBeNull();
    });

    it('should compute average score profile', () => {
      const patterns = extractPatterns(winners);
      expect(patterns.avgScoreProfile['Composition']).toBe(8.5);
      expect(patterns.avgScoreProfile['Technical Quality']).toBe(8);
      expect(patterns.avgScoreProfile['Creativity']).toBe(7);
      expect(patterns.avgScoreProfile['Impact']).toBe(8.5);
    });

    it('should identify dominant criteria (top scoring)', () => {
      const patterns = extractPatterns(winners);
      expect(patterns.dominantCriteria).toContain('Composition');
      expect(patterns.dominantCriteria).toContain('Impact');
      expect(patterns.dominantCriteria.length).toBeLessThanOrEqual(3);
    });

    it('should compute minimum scores per criterion', () => {
      const patterns = extractPatterns(winners);
      expect(patterns.minScores['Composition']).toBe(8);
      expect(patterns.minScores['Technical Quality']).toBe(7);
      expect(patterns.minScores['Creativity']).toBe(6);
      expect(patterns.minScores['Impact']).toBe(8);
    });

    it('should compute overall average', () => {
      const patterns = extractPatterns(winners);
      expect(patterns.overallAverage).toBe(8);
    });

    it('should include winner count', () => {
      const patterns = extractPatterns(winners);
      expect(patterns.count).toBe(2);
    });

    it('should work with a single winner', () => {
      const patterns = extractPatterns([winners[0]]);
      expect(patterns).not.toBeNull();
      expect(patterns.count).toBe(1);
      expect(patterns.avgScoreProfile['Composition']).toBe(9);
    });
  });

  // ============================================
  // computeWinnerSimilarity()
  // ============================================

  describe('computeWinnerSimilarity()', () => {
    const patterns = {
      avgScoreProfile: {
        'Composition': 9,
        'Technical Quality': 8,
        'Creativity': 7,
        'Impact': 9
      },
      count: 2
    };

    it('should return 0 when patterns is null', () => {
      const score = computeWinnerSimilarity({}, null);
      expect(score).toBe(0);
    });

    it('should return 0 when patterns has no data', () => {
      const score = computeWinnerSimilarity({}, { avgScoreProfile: {}, count: 0 });
      expect(score).toBe(0);
    });

    it('should return high similarity for matching score profile', () => {
      const photoScores = {
        'Composition': 9,
        'Technical Quality': 8,
        'Creativity': 7,
        'Impact': 9
      };

      const similarity = computeWinnerSimilarity(photoScores, patterns);
      expect(similarity).toBeGreaterThanOrEqual(9);
      expect(similarity).toBeLessThanOrEqual(10);
    });

    it('should return lower similarity for different score profile', () => {
      const photoScores = {
        'Composition': 3,
        'Technical Quality': 2,
        'Creativity': 9,
        'Impact': 2
      };

      const similarity = computeWinnerSimilarity(photoScores, patterns);
      expect(similarity).toBeLessThan(8);
    });

    it('should return a score between 0 and 10', () => {
      const photoScores = {
        'Composition': 5,
        'Technical Quality': 5,
        'Creativity': 5,
        'Impact': 5
      };

      const similarity = computeWinnerSimilarity(photoScores, patterns);
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(10);
    });

    it('should handle missing criteria in photo scores', () => {
      const photoScores = {
        'Composition': 9
        // Missing other criteria
      };

      const similarity = computeWinnerSimilarity(photoScores, patterns);
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(10);
    });
  });

  // ============================================
  // getWinnerInsights()
  // ============================================

  describe('getWinnerInsights()', () => {
    it('should return null when no winners exist', () => {
      const insights = getWinnerInsights(testDir);
      expect(insights).toBeNull();
    });

    it('should return full insights with patterns', () => {
      const mockResult = {
        filename: 'winner.jpg',
        scores: {
          individual: {
            'Composition': { score: 9, weight: 50 },
            'Impact': { score: 8, weight: 50 }
          },
          summary: { weighted_average: 8.5 }
        }
      };

      tagWinner(testDir, mockResult, { placement: '1st', competition: 'Test' });

      const insights = getWinnerInsights(testDir);
      expect(insights).not.toBeNull();
      expect(insights.patterns).toBeDefined();
      expect(insights.patterns.count).toBe(1);
      expect(insights.winners).toHaveLength(1);
    });
  });
});
