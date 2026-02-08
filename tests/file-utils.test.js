import { describe, it, expect, afterEach } from 'vitest';
import { resolveOutputDir } from '../src/utils/file-utils.js';
import { existsSync, rmSync, readlinkSync, readdirSync, readFileSync, lstatSync } from 'fs';
import { join, isAbsolute } from 'path';
import { tmpdir } from 'os';

describe('resolveOutputDir', () => {
  const testBase = join(tmpdir(), 'photo-analyzer-test-resolve-output');

  afterEach(() => {
    if (existsSync(testBase)) {
      rmSync(testBase, { recursive: true, force: true });
    }
  });

  it('should return a path inside {projectDir}/{outputPath}/{timestamp}/', () => {
    const result = resolveOutputDir(testBase, 'results');

    expect(result).toContain(join(testBase, 'results'));
    // Should contain a timestamp pattern: YYYY-MM-DDTHH-MM-SS
    expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/);
  });

  it('should create the timestamped directory on disk', () => {
    const result = resolveOutputDir(testBase, 'results');

    expect(existsSync(result)).toBe(true);
  });

  it('should create a latest symlink pointing to the timestamp directory', () => {
    const result = resolveOutputDir(testBase, 'results');
    const latestLink = join(testBase, 'results', 'latest');

    expect(existsSync(latestLink)).toBe(true);

    const stat = lstatSync(latestLink);
    expect(stat.isSymbolicLink()).toBe(true);

    const target = readlinkSync(latestLink);
    // The symlink target is the timestamp directory name (relative)
    expect(result.endsWith(target)).toBe(true);
  });

  it('should handle absolute path in outputPath (skips join with projectDir)', () => {
    const absoluteOutput = join(testBase, 'absolute-output');
    const result = resolveOutputDir('/unused-project-dir', absoluteOutput);

    expect(result).toContain(absoluteOutput);
    expect(result).not.toContain('/unused-project-dir');
    expect(existsSync(result)).toBe(true);
  });

  it('should update the latest symlink on subsequent calls', async () => {
    const first = resolveOutputDir(testBase, 'results');

    // Wait briefly to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 1100));

    const second = resolveOutputDir(testBase, 'results');
    const latestLink = join(testBase, 'results', 'latest');

    expect(first).not.toBe(second);

    const target = readlinkSync(latestLink);
    expect(second.endsWith(target)).toBe(true);

    // Both timestamp directories should still exist
    expect(existsSync(first)).toBe(true);
    expect(existsSync(second)).toBe(true);
  });

  it('should return an absolute path', () => {
    const result = resolveOutputDir(testBase, 'results');

    expect(isAbsolute(result)).toBe(true);
  });

  it('should handle nested output paths', () => {
    const result = resolveOutputDir(testBase, 'output/reports/results');

    expect(result).toContain(join(testBase, 'output', 'reports', 'results'));
    expect(existsSync(result)).toBe(true);
  });

  it('should handle outputPath with leading ./', () => {
    const result = resolveOutputDir(testBase, './results');

    expect(result).toContain(join(testBase, 'results'));
    expect(existsSync(result)).toBe(true);
  });

  it('should create results directory with correct timestamp entries', () => {
    resolveOutputDir(testBase, 'results');

    const entries = readdirSync(join(testBase, 'results'));
    const timestampDirs = entries.filter(e => /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/.test(e));
    const hasLatest = entries.includes('latest');

    expect(timestampDirs.length).toBe(1);
    expect(hasLatest).toBe(true);
  });
});
