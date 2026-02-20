import { describe, it, expect, afterEach } from 'vitest';
import { resolveOutputDir, resolvePhotoSelection, validatePathContainment } from '../src/utils/file-utils.js';
import { existsSync, rmSync, readlinkSync, readdirSync, readFileSync, lstatSync, mkdirSync, writeFileSync } from 'fs';
import { join, isAbsolute, resolve } from 'path';
import { tmpdir } from 'os';
import fs from 'fs';

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

describe('validatePathContainment', () => {
  it('should reject path traversal with ../', () => {
    const base = '/some/base/dir';
    expect(() => validatePathContainment('../../etc/passwd', base))
      .toThrow('Path traversal detected');
  });

  it('should reject absolute paths outside base', () => {
    const base = '/some/base/dir';
    expect(() => validatePathContainment('/etc/passwd', base))
      .toThrow('Path traversal detected');
  });

  it('should allow valid filenames within base', () => {
    const base = '/some/base/dir';
    const result = validatePathContainment('photo.jpg', base);
    expect(result).toBe(resolve(base, 'photo.jpg'));
  });

  it('should allow subdirectory paths within base', () => {
    const base = '/some/base/dir';
    const result = validatePathContainment('subdir/photo.jpg', base);
    expect(result).toBe(resolve(base, 'subdir/photo.jpg'));
  });

  it('should reject paths that resolve outside base despite looking valid', () => {
    const base = '/some/base/dir';
    expect(() => validatePathContainment('subdir/../../outside.jpg', base))
      .toThrow('Path traversal detected');
  });
});

describe('resolvePhotoSelection - path traversal protection', () => {
  let testDir;

  afterEach(() => {
    if (testDir && existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should reject explicit filenames with path traversal', () => {
    testDir = fs.mkdtempSync(join(tmpdir(), 'test-traversal-'));
    const photosDir = join(testDir, 'photos');
    mkdirSync(photosDir, { recursive: true });
    writeFileSync(join(photosDir, 'legit.jpg'), 'fake');

    const result = resolvePhotoSelection({
      photosDir,
      photoArgs: ['../../etc/passwd'],
      setSize: 1,
      supportedFormats: ['jpg']
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/path traversal/i);
  });

  it('should reject glob results that escape photosDir', () => {
    testDir = fs.mkdtempSync(join(tmpdir(), 'test-traversal-'));
    const photosDir = join(testDir, 'photos');
    mkdirSync(photosDir, { recursive: true });
    // Place a .jpg outside photosDir so the glob ../escape.jpg can match
    writeFileSync(join(testDir, 'escape.jpg'), 'fake');
    writeFileSync(join(photosDir, 'legit.jpg'), 'fake');

    const result = resolvePhotoSelection({
      photosDir,
      photoArgs: ['../*.jpg'],
      setSize: 1,
      supportedFormats: ['jpg']
    });

    // Glob matched files outside photosDir; they must be filtered out.
    // Either the result fails (no valid files left) or only contains files within photosDir.
    if (result.success) {
      result.photos.forEach(p => {
        expect(p.startsWith(resolve(photosDir))).toBe(true);
      });
    } else {
      // The escaped matches were filtered, leaving no valid files
      expect(result.error).toMatch(/matched 0 files|no supported photo/i);
    }
  });

  it('should still resolve valid explicit filenames', () => {
    testDir = fs.mkdtempSync(join(tmpdir(), 'test-traversal-'));
    const photosDir = join(testDir, 'photos');
    mkdirSync(photosDir, { recursive: true });
    writeFileSync(join(photosDir, 'photo1.jpg'), 'fake');
    writeFileSync(join(photosDir, 'photo2.jpg'), 'fake');

    const result = resolvePhotoSelection({
      photosDir,
      photoArgs: ['photo1.jpg', 'photo2.jpg'],
      setSize: 2,
      supportedFormats: ['jpg']
    });

    expect(result.success).toBe(true);
    expect(result.photos.length).toBe(2);
  });
});
