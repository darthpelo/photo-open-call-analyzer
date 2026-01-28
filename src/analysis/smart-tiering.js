/**
 * Smart Tiering Analysis Module - M3 Feature
 * Automatically classify photos into confidence tiers based on scores
 */

/**
 * Clamp a value between min and max
 * @private
 */
function clampScore(score) {
  if (typeof score !== 'number' || isNaN(score)) {
    return NaN;
  }
  return Math.max(1, Math.min(10, score));
}

/**
 * Validate photo data structure
 * @param {Object} photo - Photo object to validate
 * @returns {boolean} True if valid
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
 * Calculate tier boundaries based on scores
 * @param {number[]} scores - Array of scores
 * @param {string} method - Calculation method ('percentile' or 'fixed')
 * @returns {Object} Boundaries {high, medium}
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
 * @param {Object[]} photos - Array of photo objects with {filename, score, ...}
 * @param {Object} thresholds - Custom thresholds {high, medium} (optional)
 * @returns {Object} Tiers {tier1, tier2, tier3, summary}
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
      // Skip invalid photos but continue
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

  // Sort by score descending, then by filename ascending for tie-breaking
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

  // Generate summary
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
