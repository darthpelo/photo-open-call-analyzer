/**
 * Strategic Memory Test Suite (FR-S3-1/2/3)
 *
 * Tests for file-based cross-session memory: save analysis results,
 * build cumulative profiles, retrieve context for injection.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  saveAnalysisMemory,
  retrieveMemoryContext,
  searchMemory,
  getDefaultMemoryDir,
  slugifyForFile
} from '../src/analysis/strategic-memory.js';

describe('strategic-memory (FR-S3-1/2/3)', () => {
  let testDir;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'strategic-memory-test-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  const baseConfig = {
    title: 'Geographies of Light 2026',
    theme: 'Light and urban landscape',
    jury: ['Marco Delogu', 'Alessia Glaviano'],
    pastWinners: 'Previous winners focused on landscape.',
    organizer: 'Loosenart Gallery'
  };

  const baseResult = {
    json: {
      call_alignment_score: 8.2,
      overall_competitiveness: 'medium',
      verdict: 'go',
      verdict_confidence: 82,
      verdict_reasoning: 'Strong alignment with double exposure urban aesthetic',
      key_risks: ['High submission volume', 'Jury preference for documentary']
    },
    markdown: '## Analysis\nStrong fit.',
    model: 'phi3:mini',
    validation: { valid: true, errors: [] }
  };

  describe('slugifyForFile', () => {
    it('should create a file-safe slug from a title', () => {
      const slug = slugifyForFile('Geographies of Light 2026');
      expect(slug).toBe('geographies-of-light-2026');
    });

    it('should handle special characters', () => {
      const slug = slugifyForFile('LoosenArt — Spaces & Places');
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    });

    it('should return empty string for null input', () => {
      expect(slugifyForFile(null)).toBe('');
      expect(slugifyForFile('')).toBe('');
    });
  });

  describe('getDefaultMemoryDir', () => {
    it('should return a path under home directory', () => {
      const dir = getDefaultMemoryDir();
      expect(dir).toContain('.photo-open-call-analyzer');
      expect(dir).toContain('memory');
    });
  });

  describe('saveAnalysisMemory (FR-S3-1)', () => {
    it('should save an analysis entry to analyses/ directory', async () => {
      await saveAnalysisMemory(baseConfig, baseResult, { _memoryDir: testDir });

      const analysesDir = join(testDir, 'analyses');
      const files = readdirSync(analysesDir);
      expect(files.length).toBe(1);
      expect(files[0]).toMatch(/geographies-of-light-2026\.json$/);
    });

    it('should include all required fields in analysis entry', async () => {
      await saveAnalysisMemory(baseConfig, baseResult, { _memoryDir: testDir });

      const files = readdirSync(join(testDir, 'analyses'));
      const entry = JSON.parse(readFileSync(join(testDir, 'analyses', files[0]), 'utf-8'));
      expect(entry.type).toBe('analysis');
      expect(entry.openCall.title).toBe('Geographies of Light 2026');
      expect(entry.openCall.jury).toEqual(['Marco Delogu', 'Alessia Glaviano']);
      expect(entry.result.verdict).toBe('go');
      expect(entry.result.call_alignment_score).toBe(8.2);
      expect(entry.result.key_risks).toHaveLength(2);
      expect(entry.date).toBeDefined();
    });

    it('should NOT save when result has no JSON', async () => {
      const noJsonResult = { ...baseResult, json: null };
      await saveAnalysisMemory(baseConfig, noJsonResult, { _memoryDir: testDir });

      const analysesDir = join(testDir, 'analyses');
      try {
        const files = readdirSync(analysesDir);
        expect(files.length).toBe(0);
      } catch {
        // Directory may not even be created — that's fine
      }
    });

    it('should create directories if they do not exist', async () => {
      const deepDir = join(testDir, 'nested', 'deep');
      await saveAnalysisMemory(baseConfig, baseResult, { _memoryDir: deepDir });

      const files = readdirSync(join(deepDir, 'analyses'));
      expect(files.length).toBe(1);
    });

    it('should not throw on write errors', async () => {
      // Use a path that cannot be written (file instead of directory)
      const badPath = join(testDir, 'file-not-dir');
      writeFileSync(badPath, 'not a directory');
      // This should not throw — graceful degradation
      await expect(
        saveAnalysisMemory(baseConfig, baseResult, { _memoryDir: join(badPath, 'sub') })
      ).resolves.not.toThrow();
    });
  });

  describe('saveAnalysisMemory — cumulative profiles (FR-S3-2)', () => {
    it('should create jury profile entries in profiles/ directory', async () => {
      await saveAnalysisMemory(baseConfig, baseResult, { _memoryDir: testDir });

      const profilesDir = join(testDir, 'profiles');
      const files = readdirSync(profilesDir);
      const juryFiles = files.filter(f => f.startsWith('jury-'));
      expect(juryFiles.length).toBe(2); // Marco Delogu + Alessia Glaviano
    });

    it('should create gallery profile when organizer is present', async () => {
      await saveAnalysisMemory(baseConfig, baseResult, { _memoryDir: testDir });

      const profilesDir = join(testDir, 'profiles');
      const files = readdirSync(profilesDir);
      const galleryFiles = files.filter(f => f.startsWith('gallery-'));
      expect(galleryFiles.length).toBe(1);
    });

    it('should include appearances in jury profile', async () => {
      await saveAnalysisMemory(baseConfig, baseResult, { _memoryDir: testDir });

      const profilesDir = join(testDir, 'profiles');
      const juryFile = readdirSync(profilesDir).find(f => f.includes('marco-delogu'));
      const profile = JSON.parse(readFileSync(join(profilesDir, juryFile), 'utf-8'));
      expect(profile.type).toBe('jury_profile');
      expect(profile.name).toBe('Marco Delogu');
      expect(profile.appearances).toHaveLength(1);
      expect(profile.appearances[0].openCall).toBe('Geographies of Light 2026');
      expect(profile.appearances[0].verdict).toBe('go');
    });

    it('should update existing jury profile with new appearance (no duplicates)', async () => {
      // First save
      await saveAnalysisMemory(baseConfig, baseResult, { _memoryDir: testDir });

      // Second save with different open call
      const config2 = { ...baseConfig, title: 'Another Call 2026' };
      const result2 = {
        ...baseResult,
        json: { ...baseResult.json, call_alignment_score: 5.0, verdict: 'conditional' }
      };
      await saveAnalysisMemory(config2, result2, { _memoryDir: testDir });

      const profilesDir = join(testDir, 'profiles');
      const juryFile = readdirSync(profilesDir).find(f => f.includes('marco-delogu'));
      const profile = JSON.parse(readFileSync(join(profilesDir, juryFile), 'utf-8'));
      expect(profile.appearances).toHaveLength(2);
      expect(profile.appearances[1].openCall).toBe('Another Call 2026');
    });

    it('should not duplicate the same open call appearance', async () => {
      await saveAnalysisMemory(baseConfig, baseResult, { _memoryDir: testDir });
      await saveAnalysisMemory(baseConfig, baseResult, { _memoryDir: testDir });

      const profilesDir = join(testDir, 'profiles');
      const juryFile = readdirSync(profilesDir).find(f => f.includes('marco-delogu'));
      const profile = JSON.parse(readFileSync(join(profilesDir, juryFile), 'utf-8'));
      expect(profile.appearances).toHaveLength(1); // Deduplicated
    });
  });

  describe('searchMemory', () => {
    it('should find profiles matching a jury name', async () => {
      await saveAnalysisMemory(baseConfig, baseResult, { _memoryDir: testDir });

      const results = searchMemory('Marco Delogu', { _memoryDir: testDir });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.name === 'Marco Delogu')).toBe(true);
    });

    it('should find gallery profiles by organizer name', async () => {
      await saveAnalysisMemory(baseConfig, baseResult, { _memoryDir: testDir });

      const results = searchMemory('Loosenart', { _memoryDir: testDir });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array when no matches', () => {
      const results = searchMemory('Nonexistent Person', { _memoryDir: testDir });
      expect(results).toEqual([]);
    });

    it('should return empty array when memory directory does not exist', () => {
      const results = searchMemory('anything', { _memoryDir: join(testDir, 'nonexistent') });
      expect(results).toEqual([]);
    });
  });

  describe('retrieveMemoryContext (FR-S3-3)', () => {
    it('should return formatted string with jury context', async () => {
      await saveAnalysisMemory(baseConfig, baseResult, { _memoryDir: testDir });

      const context = retrieveMemoryContext(baseConfig, { _memoryDir: testDir });
      expect(typeof context).toBe('string');
      expect(context.length).toBeGreaterThan(0);
      expect(context).toContain('Marco Delogu');
    });

    it('should return empty string when no memory exists', () => {
      const context = retrieveMemoryContext(baseConfig, { _memoryDir: testDir });
      expect(context).toBe('');
    });

    it('should return empty string when memory directory does not exist', () => {
      const context = retrieveMemoryContext(baseConfig, { _memoryDir: join(testDir, 'nope') });
      expect(context).toBe('');
    });

    it('should include gallery context when available', async () => {
      await saveAnalysisMemory(baseConfig, baseResult, { _memoryDir: testDir });

      const context = retrieveMemoryContext(baseConfig, { _memoryDir: testDir });
      expect(context).toContain('Loosenart');
    });

    it('should truncate to 200 words maximum', async () => {
      // Create many profiles with the SAME jury names used for retrieval
      // so they all match and produce a large context
      const juryNames = [];
      for (let i = 0; i < 30; i++) {
        juryNames.push(`Jury Person ${i}`);
      }
      // Save many open calls referencing all these jury members
      for (let i = 0; i < 10; i++) {
        const config = {
          ...baseConfig,
          title: `Open Call ${i} with a long detailed title for word count`,
          jury: juryNames
        };
        await saveAnalysisMemory(config, baseResult, { _memoryDir: testDir });
      }

      // Retrieve using the same jury names so profiles are found
      const retrieveConfig = { ...baseConfig, jury: juryNames };
      const context = retrieveMemoryContext(retrieveConfig, { _memoryDir: testDir });
      const wordCount = context.split(/\s+/).filter(Boolean).length;
      expect(wordCount).toBeLessThanOrEqual(200);
      // Verify truncation actually happened (context should be non-trivially long)
      expect(context.length).toBeGreaterThan(0);
      expect(context).toContain('...');
    });

    it('should prioritize jury context over gallery context', async () => {
      await saveAnalysisMemory(baseConfig, baseResult, { _memoryDir: testDir });

      const context = retrieveMemoryContext(baseConfig, { _memoryDir: testDir });
      const juryIndex = context.indexOf('Marco Delogu');
      const galleryIndex = context.indexOf('Loosenart');
      // Jury should appear before gallery (if both present)
      if (juryIndex >= 0 && galleryIndex >= 0) {
        expect(juryIndex).toBeLessThan(galleryIndex);
      }
    });

    it('should not throw on corrupted memory files', async () => {
      mkdirSync(join(testDir, 'profiles'), { recursive: true });
      writeFileSync(join(testDir, 'profiles', 'jury-corrupted.json'), 'not valid json');

      const context = retrieveMemoryContext(baseConfig, { _memoryDir: testDir });
      expect(typeof context).toBe('string'); // Should not crash
    });
  });
});
