/**
 * Thumbnail Service
 *
 * On-demand Sharp thumbnail generation with filesystem caching.
 * Thumbnails are cached in a .thumbs/ directory alongside the source.
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DEFAULT_WIDTH = 300;
const MIN_WIDTH = 50;
const MAX_WIDTH = 800;

/**
 * Validate and parse thumbnail width parameter.
 * @param {number|string|undefined} w - Width value
 * @returns {number} Validated integer width
 * @throws {Error} If width is invalid
 */
export function validateWidth(w) {
  if (w === undefined || w === null) {
    return DEFAULT_WIDTH;
  }

  const parsed = Number(w);

  if (!Number.isInteger(parsed) || String(parsed) !== String(Number(w))) {
    // Reject floats and non-numeric strings
    if (typeof w === 'string' && w.includes('.')) {
      throw new Error(`Invalid thumbnail width: must be an integer between ${MIN_WIDTH} and ${MAX_WIDTH}`);
    }
    if (isNaN(parsed) || !Number.isInteger(parsed)) {
      throw new Error(`Invalid thumbnail width: must be an integer between ${MIN_WIDTH} and ${MAX_WIDTH}`);
    }
  }

  if (parsed < MIN_WIDTH || parsed > MAX_WIDTH) {
    throw new Error(`Invalid thumbnail width: must be an integer between ${MIN_WIDTH} and ${MAX_WIDTH}`);
  }

  return parsed;
}

/**
 * Generate a thumbnail for a photo, using cache if available.
 * @param {string} photoPath - Absolute path to source photo
 * @param {number} width - Target width in pixels
 * @param {string} cacheBaseDir - Base directory for .thumbs/ cache
 * @returns {Promise<string>} Absolute path to thumbnail file
 */
export async function generateThumbnail(photoPath, width, cacheBaseDir) {
  if (!fs.existsSync(photoPath)) {
    throw new Error('Source photo not found');
  }

  const thumbsDir = path.join(cacheBaseDir, '.thumbs');
  if (!fs.existsSync(thumbsDir)) {
    fs.mkdirSync(thumbsDir, { recursive: true });
  }

  const filename = path.basename(photoPath);
  const thumbName = `${path.parse(filename).name}_w${width}.jpg`;
  const thumbPath = path.join(thumbsDir, thumbName);

  // Return cached if exists
  if (fs.existsSync(thumbPath)) {
    return thumbPath;
  }

  // Generate thumbnail
  await sharp(photoPath)
    .resize(width)
    .jpeg({ quality: 80 })
    .toFile(thumbPath);

  return thumbPath;
}
