import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

vi.mock('../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), success: vi.fn() }
}));

import { writeCriteriaReasoning, readCriteriaReasoning } from '../src/discovery/criteria-reasoning-writer.js';

describe('criteria-reasoning-writer', () => {
  let testDir;

  const validReasoning = {
    criteria: [
      { name: 'Narrative Depth', weight: 30, motivation: 'Jury values storytelling above all' },
      { name: 'Technical Quality', weight: 25, motivation: 'High resolution required by submission rules' }
    ],
    userContext: {
      bodyOfWork: 'Street photography in Southern France',
      intention: 'Show the invisible routines of daily life',
      constraints: 'Only 4 photos, Polaroid format'
    },
    openCallJsonPath: 'data/open-calls/instants-arles/open-call.json'
  };

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'test-crw-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('writeCriteriaReasoning', () => {
    it('writes JSON and MD files to strategic directory', () => {
      const result = writeCriteriaReasoning(testDir, validReasoning);
      expect(result.success).toBe(true);
      expect(existsSync(join(testDir, 'strategic', 'criteria-reasoning.json'))).toBe(true);
      expect(existsSync(join(testDir, 'strategic', 'criteria-reasoning.md'))).toBe(true);
    });

    it('MD file contains criteria with weights and motivations', () => {
      writeCriteriaReasoning(testDir, validReasoning);
      const md = readFileSync(join(testDir, 'strategic', 'criteria-reasoning.md'), 'utf-8');
      expect(md).toContain('Narrative Depth');
      expect(md).toContain('30');
      expect(md).toContain('Jury values storytelling');
    });

    it('rejects invalid data', () => {
      const result = writeCriteriaReasoning(testDir, { criteria: [] });
      expect(result.success).toBe(false);
    });
  });

  describe('readCriteriaReasoning', () => {
    it('reads and validates written reasoning', () => {
      writeCriteriaReasoning(testDir, validReasoning);
      const result = readCriteriaReasoning(testDir);
      expect(result.success).toBe(true);
      expect(result.data.criteria).toHaveLength(2);
    });

    it('returns error if file does not exist', () => {
      const result = readCriteriaReasoning(testDir);
      expect(result.success).toBe(false);
    });
  });
});
