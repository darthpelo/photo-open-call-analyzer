/**
 * CLI Test Suite
 *
 * Tests for command-line interface error handling
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('CLI Error Handling', () => {
  const cliPath = join(__dirname, '../src/cli/analyze.js');

  /**
   * Test unknown command handling
   */
  it('should show helpful error for unknown command', (done) => {
    const child = spawn('node', [cliPath, 'unknown-command'], {
      stdio: 'pipe',
      cwd: __dirname
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      expect(code).toBe(1);
      expect(stderr).toContain('Unknown command: unknown-command');
      expect(stderr).toContain("Did you mean 'npm run analyze analyze <project-dir>'?");
      expect(stderr).toContain('Available commands: analyze, validate');
      done();
    });
  });

  /**
   * Test missing subcommand with path-like argument
   */
  it('should show helpful error for path-like argument without subcommand', (done) => {
    const child = spawn('node', [cliPath, 'data/open-calls/arles2026'], {
      stdio: 'pipe',
      cwd: __dirname
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      expect(code).toBe(1);
      expect(stderr).toContain('Unknown command: data/open-calls/arles2026');
      expect(stderr).toContain("Did you mean 'npm run analyze analyze <project-dir>'?");
      done();
    });
  });
});