import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

vi.mock('../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), success: vi.fn() }
}));

import { writeResearchBrief, readResearchBrief } from '../src/discovery/research-brief-writer.js';

describe('research-brief-writer', () => {
  let testDir;

  const validBrief = {
    callName: 'Instants d\'Arles 2026',
    url: 'https://example.com/open-call',
    deadline: '2026-06-15',
    themeAnalysis: 'The call asks for intimate moments of daily life in the Arles region',
    juryProfile: 'Three curators from Rencontres d\'Arles with documentary focus',
    pastWinnersPatterns: 'Previous winners favored warm tones and human presence',
    strategicAngles: [
      { angle: 'Documentary intimacy', rationale: 'Aligns with jury documentary background' }
    ],
    suggestedQuestionsForArtCritic: [
      { question: 'Do you have a body of work on daily life?', why: 'Theme requires existing material' }
    ]
  };

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'test-rbw-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('writeResearchBrief', () => {
    it('writes JSON and MD files to strategic directory', () => {
      const result = writeResearchBrief(testDir, validBrief);

      expect(result.success).toBe(true);
      expect(existsSync(join(testDir, 'strategic', 'research-brief.json'))).toBe(true);
      expect(existsSync(join(testDir, 'strategic', 'research-brief.md'))).toBe(true);
    });

    it('JSON file is valid and matches input', () => {
      writeResearchBrief(testDir, validBrief);

      const json = JSON.parse(readFileSync(join(testDir, 'strategic', 'research-brief.json'), 'utf-8'));
      expect(json.callName).toBe(validBrief.callName);
      expect(json.url).toBe(validBrief.url);
      expect(json.strategicAngles).toHaveLength(1);
    });

    it('MD file contains key sections', () => {
      writeResearchBrief(testDir, validBrief);

      const md = readFileSync(join(testDir, 'strategic', 'research-brief.md'), 'utf-8');
      expect(md).toContain('Instants d\'Arles 2026');
      expect(md).toContain('Theme Analysis');
      expect(md).toContain('Strategic Angles');
      expect(md).toContain('Suggested Questions');
    });

    it('rejects invalid data', () => {
      const result = writeResearchBrief(testDir, { callName: 'x' });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(existsSync(join(testDir, 'strategic', 'research-brief.json'))).toBe(false);
    });

    it('creates strategic directory if missing', () => {
      expect(existsSync(join(testDir, 'strategic'))).toBe(false);
      writeResearchBrief(testDir, validBrief);
      expect(existsSync(join(testDir, 'strategic'))).toBe(true);
    });
  });

  describe('readResearchBrief', () => {
    it('reads and validates a written brief', () => {
      writeResearchBrief(testDir, validBrief);
      const result = readResearchBrief(testDir);

      expect(result.success).toBe(true);
      expect(result.data.callName).toBe(validBrief.callName);
    });

    it('returns error if file does not exist', () => {
      const result = readResearchBrief(testDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('returns error if JSON is invalid against schema', async () => {
      const { mkdirSync, writeFileSync } = await import('fs');
      mkdirSync(join(testDir, 'strategic'), { recursive: true });
      writeFileSync(join(testDir, 'strategic', 'research-brief.json'), '{"bad": true}', 'utf-8');

      const result = readResearchBrief(testDir);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
