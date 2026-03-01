/**
 * Strategic Memory — File-based cross-session memory for Sebastiano.
 * Stores analysis results and cumulative jury/gallery profiles.
 * Part of FR-S3-1/2/3 (Cross-Session Memory).
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, renameSync } from 'fs';
import { join } from 'path';
import { tmpdir, homedir } from 'os';
import { logger } from '../utils/logger.js';

const MAX_MEMORY_WORDS = 200;

/**
 * Get the default memory directory path.
 *
 * @returns {string} Path to ~/.photo-open-call-analyzer/memory/
 */
export function getDefaultMemoryDir() {
  return join(homedir(), '.photo-open-call-analyzer', 'memory');
}

/**
 * Create a file-safe slug from a string.
 *
 * @param {string} text - Input text
 * @returns {string} Lowercase slug with hyphens
 */
export function slugifyForFile(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Safely read and parse a JSON file. Returns null on failure.
 *
 * @param {string} filePath
 * @returns {Object|null}
 */
function safeReadJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Atomically write a JSON file (temp + rename).
 *
 * @param {string} filePath
 * @param {Object} data
 */
function atomicWriteJson(filePath, data) {
  const tempPath = join(tmpdir(), `strategic-memory-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  renameSync(tempPath, filePath);
}

/**
 * Save analysis results and cumulative profiles to memory.
 *
 * @param {Object} openCallData - Open call configuration
 * @param {Object} result - Analysis result from analyzeStrategically()
 * @param {Object} [options={}]
 * @param {string} [options._memoryDir] - Override memory directory for testing
 */
export async function saveAnalysisMemory(openCallData, result, options = {}) {
  if (!result || !result.json) return;

  const memoryDir = options._memoryDir || getDefaultMemoryDir();

  try {
    const analysesDir = join(memoryDir, 'analyses');
    const profilesDir = join(memoryDir, 'profiles');
    mkdirSync(analysesDir, { recursive: true });
    mkdirSync(profilesDir, { recursive: true });

    const titleSlug = slugifyForFile(openCallData.title);
    const date = new Date().toISOString().slice(0, 10);

    // Save analysis entry
    const analysisEntry = {
      type: 'analysis',
      title: `${openCallData.title}`,
      date,
      openCall: {
        title: openCallData.title,
        theme: openCallData.theme,
        jury: openCallData.jury || [],
        organizer: openCallData.organizer || ''
      },
      result: {
        verdict: result.json.verdict,
        verdict_confidence: result.json.verdict_confidence,
        verdict_reasoning: result.json.verdict_reasoning,
        call_alignment_score: result.json.call_alignment_score,
        overall_competitiveness: result.json.overall_competitiveness,
        key_risks: (result.json.key_risks || []).slice(0, 3)
      }
    };
    atomicWriteJson(join(analysesDir, `${date}-${titleSlug}.json`), analysisEntry);

    // Update jury profiles
    const jury = openCallData.jury || [];
    for (const juryName of jury) {
      const slug = slugifyForFile(juryName);
      if (!slug) continue;
      updateProfile(profilesDir, 'jury', juryName, slug, openCallData, result);
    }

    // Update gallery profile
    if (openCallData.organizer) {
      const slug = slugifyForFile(openCallData.organizer);
      if (slug) {
        updateProfile(profilesDir, 'gallery', openCallData.organizer, slug, openCallData, result);
      }
    }

    logger.debug(`Memory saved: analysis + ${jury.length} jury profiles`);
  } catch (error) {
    logger.warn(`Memory save failed: ${error.message}`);
  }
}

/**
 * Update or create a profile entry with a new appearance.
 */
function updateProfile(profilesDir, type, name, slug, openCallData, result) {
  const filename = `${type}-${slug}.json`;
  const filePath = join(profilesDir, filename);

  let profile = safeReadJson(filePath);
  if (!profile) {
    profile = {
      type: `${type}_profile`,
      name,
      slug,
      appearances: []
    };
  }

  const appearance = {
    openCall: openCallData.title,
    date: new Date().toISOString().slice(0, 10),
    verdict: result.json.verdict,
    alignment_score: result.json.call_alignment_score
  };

  // Deduplicate by open call title
  const existingIndex = profile.appearances.findIndex(a => a.openCall === openCallData.title);
  if (existingIndex >= 0) {
    profile.appearances[existingIndex] = appearance;
  } else {
    profile.appearances.push(appearance);
  }

  // Update notes
  const count = profile.appearances.length;
  const avgScore = profile.appearances.reduce((sum, a) => sum + (a.alignment_score || 0), 0) / count;
  profile.notes = `Appeared in ${count} open call${count > 1 ? 's' : ''}. Average alignment: ${avgScore.toFixed(1)}/10.`;

  atomicWriteJson(filePath, profile);
}

/**
 * Search memory entries matching a query string.
 *
 * @param {string} query - Search query (matched against name, slug, notes)
 * @param {Object} [options={}]
 * @param {string} [options._memoryDir] - Override memory directory
 * @returns {Object[]} Matching memory entries
 */
export function searchMemory(query, options = {}) {
  const memoryDir = options._memoryDir || getDefaultMemoryDir();
  const profilesDir = join(memoryDir, 'profiles');

  if (!existsSync(profilesDir)) return [];

  const results = [];
  const queryLower = query.toLowerCase();

  try {
    const files = readdirSync(profilesDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const entry = safeReadJson(join(profilesDir, file));
      if (!entry) continue;

      const searchable = [
        entry.name || '',
        entry.slug || '',
        entry.notes || ''
      ].join(' ').toLowerCase();

      if (searchable.includes(queryLower)) {
        results.push(entry);
      }
    }
  } catch {
    // Directory read error — return empty
  }

  return results;
}

/**
 * Retrieve formatted memory context for injection into Ollama analysis.
 * Searches by jury names, organizer, and returns a truncated string.
 *
 * @param {Object} openCallData - Open call configuration
 * @param {Object} [options={}]
 * @param {string} [options._memoryDir] - Override memory directory
 * @returns {string} Formatted memory context (max 200 words) or ''
 */
export function retrieveMemoryContext(openCallData, options = {}) {
  try {
    const memoryDir = options._memoryDir || getDefaultMemoryDir();
    const profilesDir = join(memoryDir, 'profiles');

    if (!existsSync(profilesDir)) return '';

    const jurySections = [];
    const gallerySections = [];

    // Search for jury profiles
    const jury = openCallData.jury || [];
    for (const juryName of jury) {
      const slug = slugifyForFile(juryName);
      if (!slug) continue;

      const filePath = join(profilesDir, `jury-${slug}.json`);
      const profile = safeReadJson(filePath);
      if (profile && profile.appearances && profile.appearances.length > 0) {
        const lines = [`${profile.name}: ${profile.notes || ''}`];
        for (const app of profile.appearances.slice(-3)) {
          lines.push(`  - ${app.openCall}: ${app.verdict} (${app.alignment_score}/10)`);
        }
        jurySections.push(lines.join('\n'));
      }
    }

    // Search for gallery profile
    if (openCallData.organizer) {
      const slug = slugifyForFile(openCallData.organizer);
      if (slug) {
        const filePath = join(profilesDir, `gallery-${slug}.json`);
        const profile = safeReadJson(filePath);
        if (profile && profile.appearances && profile.appearances.length > 0) {
          const lines = [`${profile.name}: ${profile.notes || ''}`];
          for (const app of profile.appearances.slice(-3)) {
            lines.push(`  - ${app.openCall}: ${app.verdict} (${app.alignment_score}/10)`);
          }
          gallerySections.push(lines.join('\n'));
        }
      }
    }

    if (jurySections.length === 0 && gallerySections.length === 0) return '';

    // Combine with priority: jury first, then gallery
    const parts = [];
    if (jurySections.length > 0) {
      parts.push('JURY HISTORY:\n' + jurySections.join('\n'));
    }
    if (gallerySections.length > 0) {
      parts.push('GALLERY HISTORY:\n' + gallerySections.join('\n'));
    }

    let combined = parts.join('\n\n');

    // Truncate to MAX_MEMORY_WORDS
    const words = combined.split(/\s+/).filter(Boolean);
    if (words.length > MAX_MEMORY_WORDS) {
      combined = words.slice(0, MAX_MEMORY_WORDS).join(' ') + '...';
    }

    return combined;
  } catch (error) {
    logger.warn(`Memory retrieval failed: ${error.message}`);
    return '';
  }
}
