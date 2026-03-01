import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  researchOpenCall,
  fetchUrl,
  extractText,
  structureContext,
  readCachedResearch,
  writeCachedResearch
} from '../src/analysis/strategic-researcher.js';

describe('strategic-researcher', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strategic-research-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('fetchUrl', () => {
    it('should fetch and return HTML content', async () => {
      const mockFetch = async () => ({
        ok: true,
        status: 200,
        text: async () => '<html><body><p>Hello world</p></body></html>'
      });
      const result = await fetchUrl('https://example.com', { _fetch: mockFetch });
      expect(result.status).toBe('ok');
      expect(result.html).toContain('Hello world');
    });

    it('should handle HTTP errors gracefully', async () => {
      const mockFetch = async () => ({
        ok: false,
        status: 404,
        text: async () => 'Not Found'
      });
      const result = await fetchUrl('https://example.com/404', { _fetch: mockFetch });
      expect(result.status).toBe('error');
      expect(result.error).toContain('404');
    });

    it('should handle network errors gracefully', async () => {
      const mockFetch = async () => { throw new Error('ECONNREFUSED'); };
      const result = await fetchUrl('https://down.example.com', { _fetch: mockFetch });
      expect(result.status).toBe('error');
      expect(result.error).toContain('ECONNREFUSED');
    });

    it('should handle timeout via AbortSignal', async () => {
      const mockFetch = async (url, opts) => {
        if (opts?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        throw new DOMException('Aborted', 'AbortError');
      };
      const result = await fetchUrl('https://slow.example.com', { _fetch: mockFetch, timeoutMs: 100 });
      expect(result.status).toBe('error');
      expect(result.error).toMatch(/abort|timeout/i);
    });
  });

  describe('extractText', () => {
    it('should extract visible text from HTML', () => {
      const html = `<html><head><title>Test</title></head>
        <body><h1>Main Heading</h1><p>Some paragraph text.</p>
        <nav>Skip nav</nav><footer>Footer stuff</footer></body></html>`;
      const text = extractText(html);
      expect(text).toContain('Main Heading');
      expect(text).toContain('Some paragraph text');
    });

    it('should strip script and style tags', () => {
      const html = `<html><body>
        <script>var x = 1;</script>
        <style>.foo { color: red; }</style>
        <p>Visible content</p></body></html>`;
      const text = extractText(html);
      expect(text).toContain('Visible content');
      expect(text).not.toContain('var x');
      expect(text).not.toContain('.foo');
    });

    it('should return empty string for empty HTML', () => {
      expect(extractText('')).toBe('');
    });

    it('should handle malformed HTML gracefully', () => {
      const html = '<div><p>Unclosed paragraph<div>Another div</div>';
      const text = extractText(html);
      expect(text).toContain('Unclosed paragraph');
    });
  });

  describe('structureContext', () => {
    it('should group sources by label into sections', () => {
      const sources = [
        { label: 'jury portfolio', url: 'https://a.com', text: 'Jury member bio here.', status: 'ok' },
        { label: 'gallery about', url: 'https://b.com', text: 'Gallery history info.', status: 'ok' }
      ];
      const context = structureContext(sources);
      expect(context.juryProfiles).toContain('Jury member bio');
      expect(context.galleryHistory).toContain('Gallery history');
    });

    it('should skip sources with error status', () => {
      const sources = [
        { label: 'jury portfolio', url: 'https://a.com', text: '', status: 'error', error: 'timeout' },
        { label: 'gallery about', url: 'https://b.com', text: 'Gallery info.', status: 'ok' }
      ];
      const context = structureContext(sources);
      expect(context.galleryHistory).toContain('Gallery info');
      expect(context.juryProfiles).toBeUndefined();
    });

    it('should truncate sections that exceed word limit', () => {
      const longText = Array(300).fill('word').join(' ');
      const sources = [
        { label: 'jury portfolio', url: 'https://a.com', text: longText, status: 'ok' }
      ];
      const context = structureContext(sources);
      const wordCount = context.juryProfiles.split(/\s+/).length;
      expect(wordCount).toBeLessThanOrEqual(160);
    });

    it('should handle empty sources array', () => {
      const context = structureContext([]);
      expect(Object.keys(context)).toHaveLength(0);
    });

    it('should map unknown labels to a general section', () => {
      const sources = [
        { label: 'something custom', url: 'https://c.com', text: 'Custom info.', status: 'ok' }
      ];
      const context = structureContext(sources);
      expect(context.additionalContext).toContain('Custom info');
    });
  });

  describe('cache operations', () => {
    it('should write and read cached research', () => {
      const context = { juryProfiles: 'Test jury info' };
      writeCachedResearch(testDir, context);

      const cached = readCachedResearch(testDir);
      expect(cached).not.toBeNull();
      expect(cached.juryProfiles).toBe('Test jury info');
    });

    it('should return null when no cache exists', () => {
      const cached = readCachedResearch(testDir);
      expect(cached).toBeNull();
    });

    it('should detect stale cache (> 24h)', () => {
      const context = { juryProfiles: 'Old info' };
      writeCachedResearch(testDir, context);

      // Backdate the file mtime by 25 hours
      const cachePath = path.join(testDir, 'strategic', 'research-context.json');
      const oldTime = Date.now() - (25 * 60 * 60 * 1000);
      fs.utimesSync(cachePath, new Date(oldTime), new Date(oldTime));

      const cached = readCachedResearch(testDir, { maxAgeMs: 24 * 60 * 60 * 1000 });
      expect(cached).toBeNull();
    });

    it('should return fresh cache (< 24h)', () => {
      const context = { galleryHistory: 'Recent info' };
      writeCachedResearch(testDir, context);

      const cached = readCachedResearch(testDir, { maxAgeMs: 24 * 60 * 60 * 1000 });
      expect(cached).not.toBeNull();
      expect(cached.galleryHistory).toBe('Recent info');
    });

    it('should use atomic write (temp + rename)', () => {
      const context = { juryProfiles: 'Atomic test' };
      writeCachedResearch(testDir, context);

      const strategicDir = path.join(testDir, 'strategic');
      const files = fs.readdirSync(strategicDir);
      expect(files).toContain('research-context.json');
      expect(files.filter(f => f.endsWith('.tmp'))).toHaveLength(0);
    });
  });

  describe('researchOpenCall', () => {
    const baseConfig = {
      title: 'Test Open Call 2026',
      theme: 'Urban landscapes',
      jury: ['Jane Doe (photographer, NYC)'],
      pastWinners: 'Previous winner used documentary style.',
      researchUrls: [
        { label: 'jury portfolio', url: 'https://janedoe.com' },
        { label: 'gallery about', url: 'https://gallery.com/about' }
      ]
    };

    it('should fetch all URLs and return structured context', async () => {
      const mockFetch = async (url) => ({
        ok: true,
        status: 200,
        text: async () => url.includes('janedoe')
          ? '<html><body><p>Jane Doe is a documentary photographer based in NYC.</p></body></html>'
          : '<html><body><p>Our gallery has been open since 2010, focusing on contemporary art.</p></body></html>'
      });

      const result = await researchOpenCall(baseConfig, {
        projectDir: testDir,
        _fetch: mockFetch
      });

      expect(result.context.juryProfiles).toContain('documentary photographer');
      expect(result.context.galleryHistory).toContain('contemporary art');
      expect(result.sources).toHaveLength(2);
      expect(result.cached).toBe(false);
    });

    it('should continue when individual URLs fail', async () => {
      const mockFetch = async (url) => {
        if (url.includes('janedoe')) throw new Error('ECONNREFUSED');
        return {
          ok: true,
          status: 200,
          text: async () => '<html><body><p>Gallery info here.</p></body></html>'
        };
      };

      const result = await researchOpenCall(baseConfig, {
        projectDir: testDir,
        _fetch: mockFetch
      });

      expect(result.sources).toHaveLength(2);
      expect(result.sources[0].status).toBe('error');
      expect(result.sources[1].status).toBe('ok');
      expect(result.context.galleryHistory).toContain('Gallery info');
    });

    it('should use cached research when fresh', async () => {
      // Pre-populate cache
      const cachedContext = { juryProfiles: 'Cached jury data' };
      writeCachedResearch(testDir, cachedContext);

      const mockFetch = async () => { throw new Error('Should not be called'); };

      const result = await researchOpenCall(baseConfig, {
        projectDir: testDir,
        _fetch: mockFetch
      });

      expect(result.cached).toBe(true);
      expect(result.context.juryProfiles).toBe('Cached jury data');
    });

    it('should skip cache when freshResearch is true', async () => {
      // Pre-populate cache
      writeCachedResearch(testDir, { juryProfiles: 'Old data' });

      const mockFetch = async () => ({
        ok: true,
        status: 200,
        text: async () => '<html><body><p>Fresh jury info.</p></body></html>'
      });

      const result = await researchOpenCall(baseConfig, {
        projectDir: testDir,
        _fetch: mockFetch,
        freshResearch: true
      });

      expect(result.cached).toBe(false);
      expect(result.context.juryProfiles).toContain('Fresh jury');
    });

    it('should handle config with no researchUrls', async () => {
      const noUrlsConfig = {
        title: 'Test Call',
        theme: 'Nature',
        jury: ['John Smith'],
        pastWinners: 'Landscape photography.'
      };

      const result = await researchOpenCall(noUrlsConfig, {
        projectDir: testDir
      });

      expect(result.sources).toHaveLength(0);
      expect(Object.keys(result.context)).toHaveLength(0);
      expect(result.cached).toBe(false);
    });

    it('should save research to cache after fetching', async () => {
      const mockFetch = async () => ({
        ok: true,
        status: 200,
        text: async () => '<html><body><p>Content to cache.</p></body></html>'
      });

      await researchOpenCall(baseConfig, {
        projectDir: testDir,
        _fetch: mockFetch
      });

      const cached = readCachedResearch(testDir);
      expect(cached).not.toBeNull();
    });
  });
});
