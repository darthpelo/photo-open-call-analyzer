/**
 * Strategic CLI Test Suite (FR-SI-3, FR-SI-4, FR-S2-4/5/6)
 *
 * Tests for strategic CLI commands:
 * - FR-SI-3: Markdown fallback summary when JSON extraction fails
 * - FR-SI-4: Directory/config validation and Ollama connectivity checks
 * - FR-S2-4: strategic-research command
 * - FR-S2-5: strategic-advise command
 * - FR-S2-6: strategic-analyze research integration
 */

import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Helper: run CLI command and capture output
 */
function runCli(args, { timeout = 10000 } = {}) {
  return new Promise((resolve) => {
    const cliPath = join(__dirname, '../src/cli/analyze.js');
    const child = spawn('node', [cliPath, ...args], {
      stdio: 'pipe',
      cwd: __dirname
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      child.kill();
      resolve({ code: null, stdout, stderr, timedOut: true });
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut: false });
    });
  });
}

describe('strategic-analyze CLI (FR-SI-3, FR-SI-4)', () => {
  describe('FR-SI-4: Edge case validation', () => {
    it('should exit with error for non-existent project directory', async () => {
      const result = await runCli(['strategic-analyze', '/tmp/nonexistent-project-dir-xyz']);
      expect(result.code).toBe(1);
      // logger.error writes to stdout via console.log
      expect(result.stdout).toContain('Project directory not found');
    });

    it('should exit with error when open-call.json is missing', async () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'strategic-cli-test-'));
      try {
        const result = await runCli(['strategic-analyze', tempDir]);
        expect(result.code).toBe(1);
        expect(result.stdout).toContain('Configuration file not found');
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should exit with error for invalid open-call.json', async () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'strategic-cli-test-'));
      try {
        // Write an invalid config (missing required fields)
        writeFileSync(join(tempDir, 'open-call.json'), JSON.stringify({}), 'utf-8');
        const result = await runCli(['strategic-analyze', tempDir]);
        expect(result.code).toBe(1);
        expect(result.stdout).toContain('Configuration validation failed');
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('FR-S2-4: strategic-research command', () => {
    it('should exit with error for non-existent project directory', async () => {
      const result = await runCli(['strategic-research', '/tmp/nonexistent-project-dir-xyz']);
      expect(result.code).toBe(1);
      expect(result.stdout).toContain('Project directory not found');
    });

    it('should exit with error when open-call.json is missing', async () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'strategic-cli-test-'));
      try {
        const result = await runCli(['strategic-research', tempDir]);
        expect(result.code).toBe(1);
        expect(result.stdout).toContain('Configuration file not found');
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should handle config with no researchUrls gracefully', async () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'strategic-cli-test-'));
      try {
        const config = {
          title: 'Test Call',
          theme: 'Nature photography',
          jury: ['Test Juror'],
          pastWinners: 'Previous winners focused on landscape.'
        };
        writeFileSync(join(tempDir, 'open-call.json'), JSON.stringify(config), 'utf-8');
        const result = await runCli(['strategic-research', tempDir]);
        expect(result.code).toBe(0);
        expect(result.stdout).toMatch(/no research urls|0 sources/i);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('FR-S2-5: strategic-advise command', () => {
    it('should exit with error for non-existent project directory', async () => {
      const result = await runCli(['strategic-advise', '/tmp/nonexistent-project-dir-xyz']);
      expect(result.code).toBe(1);
      expect(result.stdout).toContain('Project directory not found');
    });

    it('should exit with error when open-call.json is missing', async () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'strategic-cli-test-'));
      try {
        const result = await runCli(['strategic-advise', tempDir]);
        expect(result.code).toBe(1);
        expect(result.stdout).toContain('Configuration file not found');
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should exit with error for invalid open-call.json', async () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'strategic-cli-test-'));
      try {
        writeFileSync(join(tempDir, 'open-call.json'), JSON.stringify({}), 'utf-8');
        const result = await runCli(['strategic-advise', tempDir]);
        expect(result.code).toBe(1);
        expect(result.stdout).toContain('Configuration validation failed');
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('FR-SI-3: Markdown fallback regex patterns', () => {
    // Unit-test the regex patterns used in the CLI markdown fallback.
    // These don't run the CLI — they verify the regex logic directly.

    const scoreRegex = /(\d+(?:\.\d+)?)\s*\/\s*10/;
    const compRegex1 = /competitiveness[^)]*?(low|medium|high)/i;
    const compRegex2 = /(low|medium|high)\s+competitiveness/i;

    it('should extract integer score from "8/10" pattern', () => {
      const text = 'The call alignment score is 8/10 based on the analysis.';
      const match = text.match(scoreRegex);
      expect(match).not.toBeNull();
      expect(match[1]).toBe('8');
    });

    it('should extract decimal score from "7.5/10" pattern', () => {
      const text = 'Overall alignment: 7.5 / 10';
      const match = text.match(scoreRegex);
      expect(match).not.toBeNull();
      expect(match[1]).toBe('7.5');
    });

    it('should extract competitiveness from "competitiveness: high" pattern', () => {
      const text = 'The overall competitiveness is high given the strong portfolio.';
      const match = text.match(compRegex1);
      expect(match).not.toBeNull();
      expect(match[1].toLowerCase()).toBe('high');
    });

    it('should extract competitiveness from "medium competitiveness" pattern', () => {
      const text = 'This submission has medium competitiveness in the field.';
      const match = text.match(compRegex2);
      expect(match).not.toBeNull();
      expect(match[1].toLowerCase()).toBe('medium');
    });

    it('should return null when no score pattern is found', () => {
      const text = 'The analysis is complete but no numeric score was given.';
      expect(text.match(scoreRegex)).toBeNull();
    });

    it('should return null when no competitiveness pattern is found', () => {
      const text = 'The photographer shows great promise.';
      expect(text.match(compRegex1)).toBeNull();
      expect(text.match(compRegex2)).toBeNull();
    });
  });
});
