/**
 * URL Discoverer — Heuristic URL suggestion generator for strategic research.
 * Generates research URL candidates from jury/gallery names using slug patterns.
 * Part of FR-S3-5 (URL Auto-Discovery).
 */

const PLATFORM_TEMPLATES = [
  { pattern: (slug) => `https://${slug}.com`, labelSuffix: 'portfolio', source: 'jury' },
  { pattern: (slug) => `https://www.instagram.com/${slug}/`, labelSuffix: 'instagram', source: 'jury' }
];

const ORGANIZER_TEMPLATES = [
  { pathSuffix: '/about', labelSuffix: 'about' },
  { pathSuffix: '/past-editions', labelSuffix: 'past editions' }
];

/**
 * Generate slug variants from a person's name.
 * "Marco Delogu" → ["marcodelogu", "marco-delogu", "marco_delogu", "marco.delogu"]
 *
 * @param {string} name - Person's full name
 * @returns {string[]} Array of slug variants
 */
export function slugifyName(name) {
  if (!name || typeof name !== 'string') return [];

  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ');

  if (!normalized) return [];

  const words = normalized.split(/[\s-]+/).filter(Boolean);
  if (words.length === 0) return [];

  const joined = words.join('');
  const hyphenated = words.join('-');
  const underscored = words.join('_');
  const dotted = words.join('.');

  const slugs = [...new Set([joined, hyphenated, underscored, dotted])];
  return slugs;
}

/**
 * Extract a base domain from a URL string.
 *
 * @param {string} urlStr - Full URL
 * @returns {string|null} Base domain (e.g., "loosenart.com") or null
 */
function extractDomain(urlStr) {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Generate research URL suggestions from open call data.
 *
 * @param {Object} openCallData - Open call configuration
 * @returns {Array<{ label: string, url: string, source: 'jury'|'organizer' }>}
 */
export function generateUrlSuggestions(openCallData) {
  const suggestions = [];
  const seenUrls = new Set();

  function addSuggestion(label, url, source) {
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      suggestions.push({ label, url, source });
    }
  }

  // Jury member URLs
  const jury = openCallData.jury || [];
  for (const juryName of jury) {
    const slugs = slugifyName(juryName);
    if (slugs.length === 0) continue;

    // Use the hyphenated slug for Instagram and personal site
    const primarySlug = slugs.find(s => s.includes('-')) || slugs[0];

    for (const template of PLATFORM_TEMPLATES) {
      const url = template.pattern(primarySlug);
      const label = `jury ${template.labelSuffix}`;
      addSuggestion(label, url, template.source);
    }
  }

  // Organizer URLs from organizer field
  if (openCallData.organizer) {
    const orgSlugs = slugifyName(openCallData.organizer);
    if (orgSlugs.length > 0) {
      const orgSlug = orgSlugs.find(s => s.includes('-')) || orgSlugs[0];
      const orgDomain = `https://www.${orgSlug}.com`;
      for (const template of ORGANIZER_TEMPLATES) {
        addSuggestion(`gallery ${template.labelSuffix}`, `${orgDomain}${template.pathSuffix}`, 'organizer');
      }
    }
  }

  // Organizer URLs from submissionUrl domain
  if (openCallData.submissionUrl) {
    const domain = extractDomain(openCallData.submissionUrl);
    if (domain) {
      const baseDomain = `https://${domain}`;
      for (const template of ORGANIZER_TEMPLATES) {
        addSuggestion(`gallery ${template.labelSuffix}`, `${baseDomain}${template.pathSuffix}`, 'organizer');
      }
    }
  }

  return suggestions;
}

/**
 * Validate URL suggestions by sending HEAD requests.
 *
 * @param {Array<{ label: string, url: string, source: string }>} suggestions
 * @param {Object} [options={}]
 * @param {function} [options._fetch] - Injectable fetch for testing
 * @param {number} [options.timeoutMs=5000] - Timeout per URL
 * @returns {Promise<Array<{ label: string, url: string, source: string, reachable: boolean, status?: number }>>}
 */
export async function validateUrls(suggestions, options = {}) {
  if (!suggestions || suggestions.length === 0) return [];

  const fetchFn = options._fetch || globalThis.fetch;
  const timeoutMs = options.timeoutMs || 5000;

  const results = await Promise.all(
    suggestions.map(async (suggestion) => {
      try {
        const response = await fetchFn(suggestion.url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(timeoutMs),
          headers: { 'User-Agent': 'PhotoOpenCallAnalyzer/1.0 (URL Discovery)' }
        });
        return { ...suggestion, reachable: response.ok, status: response.status };
      } catch {
        return { ...suggestion, reachable: false };
      }
    })
  );

  return results;
}
