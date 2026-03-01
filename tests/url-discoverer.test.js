/**
 * URL Discoverer Test Suite (FR-S3-5)
 *
 * Tests for heuristic URL suggestion generation from jury/gallery names.
 * Pure function tests — no mocks needed for generation, _fetch for validation.
 */

import { describe, it, expect } from 'vitest';
import {
  slugifyName,
  generateUrlSuggestions,
  validateUrls
} from '../src/analysis/url-discoverer.js';

describe('url-discoverer (FR-S3-5)', () => {
  describe('slugifyName', () => {
    it('should generate slug variants from a two-word name', () => {
      const slugs = slugifyName('Marco Delogu');
      expect(slugs).toContain('marcodelogu');
      expect(slugs).toContain('marco-delogu');
      expect(slugs).toContain('marco_delogu');
      expect(slugs).toContain('marco.delogu');
    });

    it('should handle single-word names', () => {
      const slugs = slugifyName('Banksy');
      expect(slugs).toContain('banksy');
      expect(slugs.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle three-word names', () => {
      const slugs = slugifyName('Anna Maria Rossi');
      expect(slugs).toContain('annamariarossi');
      expect(slugs).toContain('anna-maria-rossi');
      expect(slugs).toContain('anna_maria_rossi');
    });

    it('should normalize accented characters', () => {
      const slugs = slugifyName('José García');
      expect(slugs).toContain('jose-garcia');
      expect(slugs).toContain('josegarcia');
    });

    it('should handle hyphens in names', () => {
      const slugs = slugifyName('Jean-Pierre Blanc');
      expect(slugs).toContain('jean-pierre-blanc');
      expect(slugs).toContain('jeanpierreblanc');
    });

    it('should return empty array for empty input', () => {
      expect(slugifyName('')).toEqual([]);
      expect(slugifyName(null)).toEqual([]);
      expect(slugifyName(undefined)).toEqual([]);
    });

    it('should strip extra whitespace', () => {
      const slugs = slugifyName('  Marco   Delogu  ');
      expect(slugs).toContain('marco-delogu');
    });
  });

  describe('generateUrlSuggestions', () => {
    const baseConfig = {
      title: 'Test Call',
      theme: 'Nature photography',
      jury: ['Marco Delogu', 'Alessia Glaviano'],
      pastWinners: 'Previous winners focused on landscape.'
    };

    it('should generate URL suggestions for jury members', () => {
      const suggestions = generateUrlSuggestions(baseConfig);
      expect(suggestions.length).toBeGreaterThan(0);
      const juryUrls = suggestions.filter(s => s.source === 'jury');
      expect(juryUrls.length).toBeGreaterThan(0);
    });

    it('should include Instagram URLs for jury members', () => {
      const suggestions = generateUrlSuggestions(baseConfig);
      const instagramUrls = suggestions.filter(s => s.url.includes('instagram.com'));
      expect(instagramUrls.length).toBeGreaterThan(0);
    });

    it('should include personal site URLs for jury members', () => {
      const suggestions = generateUrlSuggestions(baseConfig);
      const personalUrls = suggestions.filter(s => s.url.endsWith('.com') && !s.url.includes('instagram'));
      expect(personalUrls.length).toBeGreaterThan(0);
    });

    it('should include labels for each suggestion', () => {
      const suggestions = generateUrlSuggestions(baseConfig);
      for (const s of suggestions) {
        expect(s.label).toBeDefined();
        expect(typeof s.label).toBe('string');
        expect(s.label.length).toBeGreaterThan(0);
      }
    });

    it('should include source field (jury or organizer)', () => {
      const suggestions = generateUrlSuggestions(baseConfig);
      for (const s of suggestions) {
        expect(['jury', 'organizer']).toContain(s.source);
      }
    });

    it('should generate organizer URLs when organizer field is present', () => {
      const config = { ...baseConfig, organizer: 'Loosenart Gallery' };
      const suggestions = generateUrlSuggestions(config);
      const orgUrls = suggestions.filter(s => s.source === 'organizer');
      expect(orgUrls.length).toBeGreaterThan(0);
    });

    it('should generate organizer URLs from submissionUrl domain', () => {
      const config = { ...baseConfig, submissionUrl: 'https://www.loosenart.com/apply' };
      const suggestions = generateUrlSuggestions(config);
      const orgUrls = suggestions.filter(s => s.source === 'organizer');
      expect(orgUrls.some(s => s.url.includes('loosenart.com'))).toBe(true);
    });

    it('should return empty array when no jury is provided', () => {
      const config = { title: 'Test', theme: 'Test', pastWinners: 'None' };
      const suggestions = generateUrlSuggestions(config);
      expect(suggestions).toEqual([]);
    });

    it('should deduplicate identical URLs', () => {
      const suggestions = generateUrlSuggestions(baseConfig);
      const urls = suggestions.map(s => s.url);
      const uniqueUrls = [...new Set(urls)];
      expect(urls.length).toBe(uniqueUrls.length);
    });

    it('should not generate URLs with empty slugs', () => {
      const suggestions = generateUrlSuggestions(baseConfig);
      for (const s of suggestions) {
        expect(s.url).not.toContain('//.');
        expect(s.url).not.toMatch(/\/\/\s*\./);
      }
    });

    it('should handle jury with special characters gracefully', () => {
      const config = { ...baseConfig, jury: ['François Hébel', 'Müller König'] };
      const suggestions = generateUrlSuggestions(config);
      expect(suggestions.length).toBeGreaterThan(0);
      for (const s of suggestions) {
        expect(s.url).toMatch(/^https?:\/\//);
      }
    });
  });

  describe('validateUrls', () => {
    it('should annotate reachable URLs with status', async () => {
      const suggestions = [{ label: 'test', url: 'https://example.com', source: 'jury' }];
      const mockFetch = async () => ({ ok: true, status: 200 });
      const results = await validateUrls(suggestions, { _fetch: mockFetch });
      expect(results[0].reachable).toBe(true);
      expect(results[0].status).toBe(200);
    });

    it('should annotate unreachable URLs', async () => {
      const suggestions = [{ label: 'test', url: 'https://nonexistent.invalid', source: 'jury' }];
      const mockFetch = async () => { throw new Error('ECONNREFUSED'); };
      const results = await validateUrls(suggestions, { _fetch: mockFetch });
      expect(results[0].reachable).toBe(false);
    });

    it('should annotate 404 URLs as unreachable', async () => {
      const suggestions = [{ label: 'test', url: 'https://example.com/404', source: 'jury' }];
      const mockFetch = async () => ({ ok: false, status: 404 });
      const results = await validateUrls(suggestions, { _fetch: mockFetch });
      expect(results[0].reachable).toBe(false);
      expect(results[0].status).toBe(404);
    });

    it('should validate all URLs in parallel', async () => {
      let callCount = 0;
      const suggestions = [
        { label: 'a', url: 'https://a.com', source: 'jury' },
        { label: 'b', url: 'https://b.com', source: 'jury' }
      ];
      const mockFetch = async () => { callCount++; return { ok: true, status: 200 }; };
      await validateUrls(suggestions, { _fetch: mockFetch });
      expect(callCount).toBe(2);
    });

    it('should return empty array for empty input', async () => {
      const results = await validateUrls([], {});
      expect(results).toEqual([]);
    });
  });
});
