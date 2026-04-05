import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

vi.mock('../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), success: vi.fn() }
}));

import { writeExcirePrompts, readExcirePrompts } from '../src/discovery/excire-prompt-writer.js';

describe('excire-prompt-writer', () => {
  let testDir;

  const validPrompts = {
    strategies: [
      {
        strategy: 'direct',
        prompts: [
          {
            prompt: 'person walking alone on cobblestone street',
            strictnessHint: 'medium',
            rationale: 'Literal interpretation of daily life theme'
          }
        ]
      },
      {
        strategy: 'metaphorical',
        prompts: [
          {
            prompt: 'warm light through old window with dust particles',
            strictnessHint: 'low',
            keywordRefinement: 'portrait',
            rationale: 'Poetic take on intimacy and routine'
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'test-epw-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('writeExcirePrompts', () => {
    it('writes JSON and MD files to strategic directory', () => {
      const result = writeExcirePrompts(testDir, validPrompts);
      expect(result.success).toBe(true);
      expect(existsSync(join(testDir, 'strategic', 'excire-prompts.json'))).toBe(true);
      expect(existsSync(join(testDir, 'strategic', 'excire-prompts.md'))).toBe(true);
    });

    it('MD file is formatted for user readability', () => {
      writeExcirePrompts(testDir, validPrompts);
      const md = readFileSync(join(testDir, 'strategic', 'excire-prompts.md'), 'utf-8');
      expect(md).toContain('Direct');
      expect(md).toContain('person walking alone on cobblestone street');
      expect(md).toContain('Strictness');
      expect(md).toContain('medium');
    });

    it('MD file shows keyword refinement when present', () => {
      writeExcirePrompts(testDir, validPrompts);
      const md = readFileSync(join(testDir, 'strategic', 'excire-prompts.md'), 'utf-8');
      expect(md).toContain('portrait');
    });

    it('rejects invalid data', () => {
      const result = writeExcirePrompts(testDir, { strategies: [] });
      expect(result.success).toBe(false);
    });
  });

  describe('readExcirePrompts', () => {
    it('reads and validates written prompts', () => {
      writeExcirePrompts(testDir, validPrompts);
      const result = readExcirePrompts(testDir);
      expect(result.success).toBe(true);
      expect(result.data.strategies).toHaveLength(2);
    });

    it('returns error if file does not exist', () => {
      const result = readExcirePrompts(testDir);
      expect(result.success).toBe(false);
    });
  });
});
