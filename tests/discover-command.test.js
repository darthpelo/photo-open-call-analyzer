import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

vi.mock('../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), success: vi.fn(), section: vi.fn() }
}));

import { sanitizeProjectName, validateDiscoverUrl, scaffoldDiscoverProject } from '../src/discovery/discovery-orchestrator.js';

describe('sanitizeProjectName', () => {
  it('converts to lowercase kebab-case', () => {
    expect(sanitizeProjectName('My Open Call')).toBe('my-open-call');
  });

  it('strips path separators and dots', () => {
    expect(sanitizeProjectName('../../../etc')).toBe('etc');
    expect(sanitizeProjectName('foo/bar\\baz')).toBe('foobarbaz');
  });

  it('strips non-alphanumeric characters except hyphens', () => {
    expect(sanitizeProjectName('Café d\'Art!')).toBe('cafe-d-art');
  });

  it('collapses multiple hyphens', () => {
    expect(sanitizeProjectName('foo---bar')).toBe('foo-bar');
  });

  it('trims leading/trailing hyphens', () => {
    expect(sanitizeProjectName('-foo-bar-')).toBe('foo-bar');
  });

  it('derives name from URL if no name given', () => {
    expect(sanitizeProjectName(null, 'https://gallery.com/open-call/summer-2026')).toBe('summer-2026');
  });

  it('falls back to "discovery" for unparseable URL', () => {
    expect(sanitizeProjectName(null, 'https://example.com/')).toBe('discovery');
  });
});

describe('validateDiscoverUrl', () => {
  it('accepts https URLs', () => {
    expect(validateDiscoverUrl('https://example.com/open-call')).toEqual({ valid: true });
  });

  it('rejects http URLs', () => {
    const result = validateDiscoverUrl('http://example.com/open-call');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('HTTPS');
  });

  it('rejects localhost', () => {
    const result = validateDiscoverUrl('https://localhost:11434/api');
    expect(result.valid).toBe(false);
  });

  it('rejects private IPs', () => {
    expect(validateDiscoverUrl('https://192.168.1.1/admin').valid).toBe(false);
    expect(validateDiscoverUrl('https://10.0.0.1/admin').valid).toBe(false);
    expect(validateDiscoverUrl('https://127.0.0.1/admin').valid).toBe(false);
  });

  it('rejects non-URL strings', () => {
    expect(validateDiscoverUrl('not a url').valid).toBe(false);
  });
});

describe('scaffoldDiscoverProject', () => {
  let testDir;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'test-disc-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('creates project directory structure', () => {
    const projectDir = join(testDir, 'test-project');
    const result = scaffoldDiscoverProject(projectDir, 'https://example.com/call');

    expect(result.success).toBe(true);
    expect(existsSync(join(projectDir, 'strategic'))).toBe(true);
    expect(existsSync(join(projectDir, 'photos'))).toBe(true);
  });

  it('does not overwrite existing project', () => {
    const projectDir = join(testDir, 'test-project');
    scaffoldDiscoverProject(projectDir, 'https://example.com/call');
    const result = scaffoldDiscoverProject(projectDir, 'https://example.com/call');

    expect(result.success).toBe(false);
    expect(result.error).toContain('already exists');
  });
});
