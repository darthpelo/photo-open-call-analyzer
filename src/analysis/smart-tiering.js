/**
 * Smart Tiering Analysis Module - M3 Feature
 * Automatically classify photos into confidence tiers based on scores
 * 
 * Provides deterministic, percentile-based tier classification for photo analysis.
 * Tier1: High confidence (top 20%)
 * Tier2: Good confidence (middle 25%)
 * Tier3: Low confidence (bottom 55%)
 * 
 * @module smart-tiering
 */

/**
 * Clamp a numerical score to valid range [1-10]
 * @private
 * @param {number} score - Raw score to clamp
 * @returns {number} Clamped score or NaN if invalid
 */
function clampScore(score) {
  if (typeof score !== 'number' || isNaN(score)) {
    return NaN;
  }
  return Math.max(1, Math.min(10, score));
}

/**
 * Validate photo data structure for tiering
 * Ensures object contains required fields: filename (string) and score (number)
 * 
 * @param {*} photo - Photo object to validate
 * @returns {boolean} True if valid photo object, false otherwise
 * 
 * @example
 * validateTierData({ filename: 'photo.jpg', score: 7.5 }) // true
 * validateTierData({ filename: 'photo.jpg' }) // false (missing score)
 */
export function validateTierData(photo) {
  if (!photo || typeof photo !== 'object') {
    return false;
  }
  if (typeof photo.filename !== 'string' || !photo.filename.trim()) {
    return false;
  }
  if (typeof photo.score !== 'number' || isNaN(photo.score)) {
    return false;
  }
  return true;
}

/**
 * Calculate tier boundaries based on score distribution
 * Uses percentile-based calculation for dynamic thresholds based on actual data
 * 
 * Percentile method:
 * - high: 80th percentile (top 20% threshold)
 * - medium: 55th percentile (top 45% threshold)
 * 
 * @param {number[]} scores - Array of numerical scores
 * @param {string} [method='percentile'] - Calculation method ('percentile' or 'fixed')
 * @returns {Object} Boundaries object {high: number, medium: number}
 * 
 * @example
 * calculateBoundaries([1,2,3,4,5,6,7,8,9,10], 'percentile')
 * // Returns { high: 8.0, medium: 5.5 }
 */
export function calculateBoundaries(scores, method = 'percentile') {
  if (!Array.isArray(scores) || scores.length === 0) {
    return { high: 8.0, medium: 6.5 };
  }

  if (method === 'percentile') {
    const sorted = [...scores].sort((a, b) => b - a);
    
    // 80th percentile (top 20% for Tier 1)
    const highIndex = Math.floor(sorted.length * 0.2);
    const high = sorted[Math.min(highIndex, sorted.length - 1)];
    
    // 55th percentile (top 45% for Tiers 1+2)
    const mediumIndex = Math.floor(sorted.length * 0.45);
    const medium = sorted[Math.min(mediumIndex, sorted.length - 1)];
    
    return { high: Math.round(high * 10) / 10, medium: Math.round(medium * 10) / 10 };
  }

  // Fixed method defaults
  return { high: 8.0, medium: 6.5 };
}

/**
 * Generate tier classification for photos
 * Classifies photos into three tiers based on score thresholds
 * Results are deterministically sorted by score (desc), then filename (asc) for tie-breaking
 * 
 * Default thresholds (fixed):
 * - Tier 1: score > 8.0 (high confidence)
 * - Tier 2: 6.5 < score <= 8.0 (good confidence)
 * - Tier 3: score <= 6.5 (low confidence)
 * 
 * @param {Object[]} photos - Array of photo objects with {filename, score, ...otherProps}
 * @param {Object} [thresholds=null] - Custom thresholds {high: number, medium: number}
 * @returns {Object} Tiers object containing:
 *   - tier1: Array of high-confidence photos (score > high)
 *   - tier2: Array of good-confidence photos (medium < score <= high)
 *   - tier3: Array of low-confidence photos (score <= medium)
 *   - summary: Metadata {total, tier1_count, tier2_count, tier3_count, high_threshold, medium_threshold, average_score}
 * 
 * @example
 * const result = generateTiers(
 *   [
 *     { filename: 'photo1.jpg', score: 8.5 },
 *     { filename: 'photo2.jpg', score: 7.0 }
 *   ],
 *   { high: 8.0, medium: 6.5 }
 * );
 * // Returns {
 * //   tier1: [{ filename: 'photo1.jpg', score: 8.5 }],
 * //   tier2: [{ filename: 'photo2.jpg', score: 7.0 }],
 * //   tier3: [],
 * //   summary: { total: 2, tier1_count: 1, ... }
 * // }
 */
export function generateTiers(photos, thresholds = null) {
  // Default thresholds
  let high = 8.0;
  let medium = 6.5;

  // Apply custom thresholds if provided
  if (thresholds && typeof thresholds === 'object') {
    if (typeof thresholds.high === 'number') high = thresholds.high;
    if (typeof thresholds.medium === 'number') medium = thresholds.medium;
  }

  // Filter and validate photos
  const validPhotos = [];
  const validScores = [];

  for (const photo of photos) {
    if (!validateTierData(photo)) {
      // Skip invalid photos but continue processing
      continue;
    }

    const clampedScore = clampScore(photo.score);
    if (!isNaN(clampedScore)) {
      validPhotos.push({
        ...photo,
        score: clampedScore
      });
      validScores.push(clampedScore);
    }
  }

  // Sort by score descending, then by filename ascending for deterministic tie-breaking
  // This ensures reproducible results across runs
  validPhotos.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.filename.localeCompare(b.filename);
  });

  // Classify into tiers
  const tier1 = [];
  const tier2 = [];
  const tier3 = [];

  for (const photo of validPhotos) {
    if (photo.score > high) {
      tier1.push(photo);
    } else if (photo.score > medium) {
      tier2.push(photo);
    } else {
      tier3.push(photo);
    }
  }

  // Generate summary with calculated average
  const summary = {
    total: validPhotos.length,
    tier1_count: tier1.length,
    tier2_count: tier2.length,
    tier3_count: tier3.length,
    high_threshold: high,
    medium_threshold: medium,
    average_score: validScores.length > 0 
      ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10
      : null
  };

  return {
    tier1,
    tier2,
    tier3,
    summary
  };
}

export default {
  generateTiers,
  calculateBoundaries,
  validateTierData
};
