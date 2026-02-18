/**
 * Winner Manager (FR-3.10 / ADR-020)
 *
 * Per-project winner tagging, pattern extraction, and
 * cosine similarity scoring for historical winner learning.
 *
 * Winner data is stored in {projectDir}/winners/winners.json
 * as a versioned JSON file with atomic writes.
 *
 * @module winner-manager
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

const WINNERS_DIR = 'winners';
const WINNERS_FILE = 'winners.json';
const WINNERS_VERSION = '1.0';

/**
 * Tag a photo as a competition winner.
 *
 * @param {string} projectDir - Project root directory
 * @param {Object} photoResult - Photo analysis result with filename and scores
 * @param {Object} metadata - Winner metadata
 * @param {string} [metadata.placement] - Placement (e.g., '1st', '2nd')
 * @param {string} [metadata.competition] - Competition name
 * @param {string} [metadata.notes] - User notes
 * @returns {boolean} True if stored successfully
 */
export function tagWinner(projectDir, photoResult, metadata = {}) {
  try {
    const winnersDir = path.join(projectDir, WINNERS_DIR);
    fs.mkdirSync(winnersDir, { recursive: true });

    const existing = loadWinnersRaw(projectDir);
    const entries = existing.entries || [];

    const entry = {
      id: `win-${String(entries.length + 1).padStart(3, '0')}`,
      filename: photoResult.filename,
      competition: metadata.competition || '',
      placement: metadata.placement || '',
      scores: photoResult.scores,
      taggedAt: new Date().toISOString(),
      notes: metadata.notes || ''
    };

    entries.push(entry);

    const data = {
      version: WINNERS_VERSION,
      entries
    };

    const filePath = path.join(winnersDir, WINNERS_FILE);
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);

    logger.debug(`Tagged winner: ${photoResult.filename} (${metadata.placement || 'unranked'})`);
    return true;
  } catch (error) {
    logger.error(`Failed to tag winner: ${error.message}`);
    return false;
  }
}

/**
 * Load all winner entries for a project.
 *
 * @param {string} projectDir - Project root directory
 * @returns {Array<Object>} Array of winner entries (empty if none)
 */
export function loadWinners(projectDir) {
  const raw = loadWinnersRaw(projectDir);
  return raw.entries || [];
}

/**
 * Internal: load raw winners.json data.
 */
function loadWinnersRaw(projectDir) {
  try {
    const filePath = path.join(projectDir, WINNERS_DIR, WINNERS_FILE);
    if (!fs.existsSync(filePath)) return { version: WINNERS_VERSION, entries: [] };
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return { version: WINNERS_VERSION, entries: [] };
  }
}

/**
 * Extract scoring patterns from a set of winners.
 *
 * @param {Array<Object>} winners - Array of winner entries
 * @returns {Object|null} Patterns object, or null if no winners
 */
export function extractPatterns(winners) {
  if (!winners || winners.length === 0) return null;

  const criteriaScores = {};
  const criteriaMin = {};
  let overallSum = 0;

  for (const winner of winners) {
    const individual = winner.scores?.individual || {};
    for (const [name, data] of Object.entries(individual)) {
      const score = data.score || 0;
      if (!criteriaScores[name]) {
        criteriaScores[name] = [];
        criteriaMin[name] = score;
      }
      criteriaScores[name].push(score);
      criteriaMin[name] = Math.min(criteriaMin[name], score);
    }
    overallSum += winner.scores?.summary?.weighted_average || 0;
  }

  // Average score profile
  const avgScoreProfile = {};
  for (const [name, scores] of Object.entries(criteriaScores)) {
    avgScoreProfile[name] = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
  }

  // Dominant criteria (top 3 by avg score)
  const sorted = Object.entries(avgScoreProfile).sort((a, b) => b[1] - a[1]);
  const dominantCriteria = sorted.slice(0, 3).map(([name]) => name);

  // Overall average
  const overallAverage = Math.round((overallSum / winners.length) * 100) / 100;

  return {
    avgScoreProfile,
    dominantCriteria,
    minScores: criteriaMin,
    overallAverage,
    count: winners.length
  };
}

/**
 * Compute cosine similarity between a photo's scores and winner patterns.
 *
 * @param {Object} photoScores - Map of criterion name → score
 * @param {Object|null} patterns - Patterns from extractPatterns()
 * @returns {number} Similarity score 0-10
 */
export function computeWinnerSimilarity(photoScores, patterns) {
  if (!patterns || !patterns.avgScoreProfile || Object.keys(patterns.avgScoreProfile).length === 0) {
    return 0;
  }

  const criteria = Object.keys(patterns.avgScoreProfile);
  const vecA = [];
  const vecB = [];

  for (const name of criteria) {
    vecA.push(photoScores[name] || 0);
    vecB.push(patterns.avgScoreProfile[name]);
  }

  // Cosine similarity
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) return 0;

  const cosineSim = dotProduct / (magA * magB);

  // Scale to 0-10
  return Math.round(cosineSim * 10 * 100) / 100;
}

/**
 * Get full winner insights for a project.
 *
 * @param {string} projectDir - Project root directory
 * @returns {Object|null} Insights with patterns and winners, or null if no winners
 */
export function getWinnerInsights(projectDir) {
  const winners = loadWinners(projectDir);
  if (winners.length === 0) return null;

  const patterns = extractPatterns(winners);

  return {
    winners,
    patterns
  };
}
