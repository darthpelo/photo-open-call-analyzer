import { logger } from '../utils/logger.js';
import { generateTiers } from './smart-tiering.js';

/**
 * Aggregate scores from multiple photo analyses
 * @param {Array<Object>} analyses - Array of photo analysis results with structure: 
 *   [{ photoPath: string, scores: { individual: {...}, summary: {...} } }, ...]
 * @param {Object} criteria - Criteria configuration with weights
 * @returns {Object} Aggregated scoring and ranking
 * @throws {Error} If analyses is not an array or malformed
 */
export function aggregateScores(analyses, criteria = []) {
  // Guard clause - validate input is array
  if (!Array.isArray(analyses)) {
    const errorMsg = `Invalid aggregateScores input: analyses must be an array. Received type: ${typeof analyses}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (analyses.length === 0) {
    throw new Error('No analyses provided to aggregateScores');
  }

  logger.info(`Aggregating scores from ${analyses.length} photos`);

  const photoScores = [];
  const criteriaStats = {};

  // Initialize criteria statistics
  criteria.forEach((criterion) => {
    criteriaStats[criterion.name] = {
      scores: [],
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      weight: criterion.weight || 0,
    };
  });

  // Extract scores from each analysis
  analyses.forEach((analysis) => {
    const photoScore = {
      photo: analysis.photoPath || analysis.photo,
      individual_scores: analysis.scores?.individual || {},
      summary: analysis.scores?.summary || {},
    };

    // Collect individual criterion scores
    if (analysis.scores?.individual) {
      Object.entries(analysis.scores.individual).forEach(([criterionName, scoreData]) => {
        if (criteriaStats[criterionName]) {
          criteriaStats[criterionName].scores.push(scoreData.score);
        }
      });
    }

    // Add overall scores
    if (analysis.scores?.summary?.weighted_average) {
      photoScore.overall_score = analysis.scores.summary.weighted_average;
    } else if (analysis.scores?.summary?.average) {
      photoScore.overall_score = analysis.scores.summary.average;
    }

    photoScores.push(photoScore);
  });

  // Calculate statistics for each criterion
  Object.entries(criteriaStats).forEach(([criterionName, stats]) => {
    if (stats.scores.length > 0) {
      stats.scores.sort((a, b) => a - b);
      stats.average = Math.round((stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) * 10) / 10;
      stats.min = stats.scores[0];
      stats.max = stats.scores[stats.scores.length - 1];
      stats.median = stats.scores[Math.floor(stats.scores.length / 2)];
    }
  });

  // Sort photos by overall score
  photoScores.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0));

  // Add ranking
  photoScores.forEach((photo, index) => {
    photo.rank = index + 1;
  });

  return {
    timestamp: new Date().toISOString(),
    total_photos: analyses.length,
    photos: photoScores,
    criteria_statistics: criteriaStats,
  };
}

/**
 * Generate statistics about the scoring distribution
 * @param {Object} aggregation - Aggregated scores
 * @returns {Object} Statistical analysis
 */
export function generateStatistics(aggregation) {
  const overallScores = aggregation.photos.map((p) => p.overall_score || 0).filter((s) => s > 0);

  if (overallScores.length === 0) {
    return { message: 'No scores available' };
  }

  overallScores.sort((a, b) => a - b);

  const sum = overallScores.reduce((a, b) => a + b, 0);
  const average = sum / overallScores.length;
  const median = overallScores[Math.floor(overallScores.length / 2)];

  const variance = overallScores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / overallScores.length;
  const stdDev = Math.sqrt(variance);

  return {
    count: overallScores.length,
    average: Math.round(average * 10) / 10,
    median: Math.round(median * 10) / 10,
    min: overallScores[0],
    max: overallScores[overallScores.length - 1],
    std_dev: Math.round(stdDev * 10) / 10,
    q1: overallScores[Math.floor(overallScores.length / 4)],
    q3: overallScores[Math.floor((overallScores.length * 3) / 4)],
  };
}

/**
 * Integrate Smart Tiering with aggregated scores
 * Classifies ranked photos into confidence tiers
 * 
 * @param {Object} aggregation - Aggregated scores from aggregateScores()
 * @param {Object} tierThresholds - Custom tier thresholds {high, medium}
 * @returns {Object} Tiered classification with metadata
 */
export function integrateSmartTiering(aggregation, tierThresholds = null) {
  if (!aggregation || !aggregation.photos || aggregation.photos.length === 0) {
    logger.warn('No photos available for tiering');
    return {
      tier1: [],
      tier2: [],
      tier3: [],
      summary: { total: 0, tier1_count: 0, tier2_count: 0, tier3_count: 0 }
    };
  }

  // Convert aggregated photos to tiering format
  const photoData = aggregation.photos.map(photo => ({
    filename: photo.photo || photo.photoPath,
    score: photo.overall_score || 0,
    // Preserve original metadata for downstream processing
    _original: photo
  }));

  // Generate tiers using smart-tiering module
  const tiers = generateTiers(photoData, tierThresholds);

  logger.info(`Tiering complete: ${tiers.summary.tier1_count} tier1, ${tiers.summary.tier2_count} tier2, ${tiers.summary.tier3_count} tier3`);

  return tiers;
}
