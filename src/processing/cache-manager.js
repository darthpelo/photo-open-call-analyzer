/**
 * Cache Manager (FR-3.7 / ADR-017)
 *
 * Provides per-project analysis caching to avoid re-analyzing
 * identical photos with the same config and model.
 *
 * Key Features:
 * - SHA-256 cache keys: photo bytes + config hash + model name
 * - Per-project file storage in {projectDir}/.analysis-cache/
 * - Atomic writes (temp file + rename) following checkpoint-manager pattern
 * - Cache stats reporting (entries, size)
 *
 * @module cache-manager
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

const CACHE_DIR_NAME = '.analysis-cache';
const CACHE_VERSION = '1.0';

/**
 * Compute SHA-256 hash of a photo file's bytes.
 *
 * @param {string} photoPath - Absolute path to the photo file
 * @returns {Promise<string>} SHA-256 hex string (64 characters)
 * @throws {Error} If file does not exist or cannot be read
 */
export async function computePhotoHash(photoPath) {
  const fileBuffer = fs.readFileSync(photoPath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Compute a composite cache key from photo hash, config hash, and model name.
 *
 * @param {string} photoHash - SHA-256 of photo file bytes
 * @param {string} configHash - SHA-256 of open-call.json config
 * @param {string} model - Ollama model name (e.g. 'llava:7b')
 * @returns {string} SHA-256 hex string (64 characters)
 */
export function computeCacheKey(photoHash, configHash, model) {
  const combined = `${photoHash}:${configHash}:${model}`;
  return crypto.createHash('sha256').update(combined, 'utf8').digest('hex');
}

/**
 * Retrieve a cached analysis result.
 *
 * @param {string} projectDir - Project root directory
 * @param {string} cacheKey - Cache key (64 hex chars)
 * @returns {Object|null} Cached entry object or null on miss / corrupted data
 */
export function getCachedResult(projectDir, cacheKey) {
  try {
    const entryPath = path.join(projectDir, CACHE_DIR_NAME, `${cacheKey}.json`);

    if (!fs.existsSync(entryPath)) {
      return null;
    }

    const raw = fs.readFileSync(entryPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    logger.debug(`Cache read failed for key ${cacheKey}: ${error.message}`);
    return null;
  }
}

/**
 * Store an analysis result in the cache using atomic write.
 *
 * @param {string} projectDir - Project root directory
 * @param {string} cacheKey - Cache key (64 hex chars)
 * @param {Object} result - The analysis result to cache
 * @param {Object} metadata - Additional metadata
 * @param {string} metadata.photoFilename - Original photo filename
 * @param {string} [metadata.photoHash] - Photo content hash
 * @param {string} [metadata.configHash] - Config hash
 * @param {string} [metadata.model] - Model name
 * @returns {boolean} True if stored successfully
 */
export function setCachedResult(projectDir, cacheKey, result, metadata = {}) {
  try {
    const cacheDir = path.join(projectDir, CACHE_DIR_NAME);
    fs.mkdirSync(cacheDir, { recursive: true });

    const entry = {
      version: CACHE_VERSION,
      cacheKey,
      photoFilename: metadata.photoFilename || '',
      photoHash: metadata.photoHash || '',
      configHash: metadata.configHash || '',
      model: metadata.model || '',
      result,
      createdAt: new Date().toISOString(),
      hitCount: 0
    };

    const entryPath = path.join(cacheDir, `${cacheKey}.json`);
    const tempPath = `${entryPath}.tmp`;

    const jsonString = JSON.stringify(entry, null, 2);
    fs.writeFileSync(tempPath, jsonString, 'utf8');
    fs.renameSync(tempPath, entryPath);

    logger.debug(`Cached result for ${metadata.photoFilename || cacheKey}`);
    return true;
  } catch (error) {
    logger.error(`Cache write failed for key ${cacheKey}: ${error.message}`);
    return false;
  }
}

/**
 * Delete all cached results for a project.
 *
 * @param {string} projectDir - Project root directory
 * @returns {boolean} True if cleared successfully (or nothing to clear)
 */
export function clearCache(projectDir) {
  try {
    const cacheDir = path.join(projectDir, CACHE_DIR_NAME);

    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      logger.debug('Analysis cache cleared');
    }

    return true;
  } catch (error) {
    logger.error(`Failed to clear cache: ${error.message}`);
    return false;
  }
}

/**
 * Get statistics about the project's analysis cache.
 *
 * @param {string} projectDir - Project root directory
 * @returns {Object} Cache statistics
 * @returns {number} returns.totalEntries - Number of cached entries
 * @returns {number} returns.totalSizeBytes - Total size of cache files in bytes
 */
export function getCacheStats(projectDir) {
  const cacheDir = path.join(projectDir, CACHE_DIR_NAME);

  if (!fs.existsSync(cacheDir)) {
    return { totalEntries: 0, totalSizeBytes: 0 };
  }

  try {
    const files = fs.readdirSync(cacheDir).filter(f => f.endsWith('.json'));
    let totalSize = 0;

    for (const file of files) {
      const stat = fs.statSync(path.join(cacheDir, file));
      totalSize += stat.size;
    }

    return {
      totalEntries: files.length,
      totalSizeBytes: totalSize
    };
  } catch (error) {
    logger.debug(`Failed to get cache stats: ${error.message}`);
    return { totalEntries: 0, totalSizeBytes: 0 };
  }
}
