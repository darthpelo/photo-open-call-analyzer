/**
 * Sebastiano — Strategic web researcher for open call context.
 * Fetches URLs, extracts text, structures research context.
 * Part of FR-S2-1 (research pipeline).
 */

import { load as cheerioLoad } from 'cheerio';
import { existsSync, statSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_WORDS_PER_SECTION = 150;

/** Label prefix → context key mapping */
const LABEL_MAP = {
  jury: 'juryProfiles',
  gallery: 'galleryHistory',
  past: 'pastEditions',
  curatorial: 'curatorialTendency',
  curator: 'curatorialTendency',
  publisher: 'galleryHistory'
};

/**
 * Fetch a single URL and return its HTML content.
 *
 * @param {string} url - URL to fetch
 * @param {Object} [options]
 * @param {function} [options._fetch] - Injectable fetch for testing
 * @param {number} [options.timeoutMs=10000] - Request timeout
 * @returns {Promise<{ url: string, html: string, status: string, error?: string }>}
 */
export async function fetchUrl(url, options = {}) {
  const fetchFn = options._fetch || globalThis.fetch;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  try {
    const response = await fetchFn(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'User-Agent': 'PhotoOpenCallAnalyzer/1.0 (research)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });

    if (!response.ok) {
      return { url, html: '', status: 'error', error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    return { url, html, status: 'ok' };
  } catch (error) {
    const message = error.name === 'AbortError' || error.name === 'TimeoutError'
      ? 'timeout'
      : error.message;
    return { url, html: '', status: 'error', error: message };
  }
}

/**
 * Extract visible text from HTML, stripping scripts, styles, nav, and footer.
 *
 * @param {string} html - Raw HTML string
 * @returns {string} Extracted text
 */
export function extractText(html) {
  if (!html) return '';

  const $ = cheerioLoad(html);

  // Remove non-content elements
  $('script, style, noscript, iframe, svg').remove();

  // Get body text (or whole document if no body)
  const text = $('body').text() || $.text();

  // Normalize whitespace
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Structure raw source data into keyed context sections.
 * Groups by label prefix, truncates to word limit.
 *
 * @param {Array<{ label: string, url: string, text: string, status: string }>} sources
 * @returns {Object} Keyed context (e.g., { juryProfiles: "...", galleryHistory: "..." })
 */
export function structureContext(sources) {
  const sections = {};

  for (const source of sources) {
    if (source.status !== 'ok' || !source.text) continue;

    const key = mapLabelToKey(source.label);
    if (!sections[key]) {
      sections[key] = [];
    }
    sections[key].push(source.text);
  }

  const result = {};
  for (const [key, texts] of Object.entries(sections)) {
    const combined = texts.join(' ');
    result[key] = truncateToWords(combined, MAX_WORDS_PER_SECTION);
  }

  return result;
}

/**
 * Map a source label to a context key.
 * @param {string} label
 * @returns {string}
 */
function mapLabelToKey(label) {
  if (!label) return 'additionalContext';
  const lower = label.toLowerCase();
  for (const [prefix, key] of Object.entries(LABEL_MAP)) {
    if (lower.includes(prefix)) return key;
  }
  return 'additionalContext';
}

/**
 * Truncate text to a maximum word count.
 * @param {string} text
 * @param {number} maxWords
 * @returns {string}
 */
function truncateToWords(text, maxWords) {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
}

/**
 * Read cached research context from disk.
 *
 * @param {string} projectDir - Project directory
 * @param {Object} [options]
 * @param {number} [options.maxAgeMs=86400000] - Maximum cache age in ms
 * @returns {Object|null} Cached context or null if stale/missing
 */
export function readCachedResearch(projectDir, options = {}) {
  const maxAge = options.maxAgeMs ?? CACHE_MAX_AGE_MS;
  const cachePath = join(projectDir, 'strategic', 'research-context.json');

  if (!existsSync(cachePath)) return null;

  const stat = statSync(cachePath);
  const age = Date.now() - stat.mtimeMs;
  if (age > maxAge) return null;

  try {
    return JSON.parse(readFileSync(cachePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Write research context to cache (atomic write).
 *
 * @param {string} projectDir - Project directory
 * @param {Object} context - Research context to cache
 */
export function writeCachedResearch(projectDir, context) {
  const strategicDir = join(projectDir, 'strategic');
  mkdirSync(strategicDir, { recursive: true });

  const cachePath = join(strategicDir, 'research-context.json');
  const tempPath = `${cachePath}.tmp`;
  writeFileSync(tempPath, JSON.stringify(context, null, 2), 'utf-8');
  renameSync(tempPath, cachePath);
}

/**
 * Run web research for an open call.
 *
 * @param {Object} openCallData - Open call configuration
 * @param {Object} [options]
 * @param {string} [options.projectDir] - For cache read/write
 * @param {boolean} [options.freshResearch=false] - Skip cache
 * @param {number} [options.timeoutMs=10000] - Per-URL timeout
 * @param {function} [options._fetch] - Injectable fetch for testing
 * @returns {Promise<{ context: Object, sources: Array, cached: boolean }>}
 */
export async function researchOpenCall(openCallData, options = {}) {
  const { projectDir, freshResearch = false, _fetch } = options;

  // Check cache first (unless freshResearch requested)
  if (projectDir && !freshResearch) {
    const cached = readCachedResearch(projectDir);
    if (cached) {
      logger.debug('Using cached research context');
      return { context: cached, sources: [], cached: true };
    }
  }

  const urls = openCallData.researchUrls || [];
  if (urls.length === 0) {
    return { context: {}, sources: [], cached: false };
  }

  // Fetch all URLs in parallel
  const fetchResults = await Promise.all(
    urls.map(async ({ label, url }) => {
      const result = await fetchUrl(url, { _fetch, timeoutMs: options.timeoutMs });
      const text = result.status === 'ok' ? extractText(result.html) : '';
      const chars = text.length;

      if (result.status === 'error') {
        logger.warn(`Research fetch failed for ${url}: ${result.error}`);
      }

      return { label: label || '', url, text, status: result.status, error: result.error, chars };
    })
  );

  const context = structureContext(fetchResults);

  // Cache results if projectDir provided and we got any content
  if (projectDir && Object.keys(context).length > 0) {
    writeCachedResearch(projectDir, context);
  }

  return { context, sources: fetchResults, cached: false };
}
