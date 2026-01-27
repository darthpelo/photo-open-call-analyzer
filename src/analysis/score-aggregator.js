import { logger } from '../utils/logger.js';

/**
 * Aggregate scores from multiple photo analyses
 * @param {Array<Object>} analyses - Array of photo analysis results
 * @param {Object} criteria - Criteria configuration with weights
 * @returns {Object} Aggregated scoring and ranking
 */
export function aggregateScores(analyses, criteria = []) {
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
 * Generate ranking tiers based on scores
 * @param {Object} aggregation - Aggregated scores from aggregateScores()
 * @param {Object} tierConfig - Tier configuration (optional)
 * @returns {Object} Photos organized by tier
 */
export function generateTiers(aggregation, tierConfig = {}) {
  const defaultTiers = {
    strong_yes: { min: 8.0, label: '🟢 Strong Yes' },
    yes: { min: 7.0, label: '🟡 Yes' },
    maybe: { min: 6.0, label: '🟠 Maybe' },
    no: { min: 0, label: '🔴 No' },
  };

  const tiers = { ...defaultTiers, ...tierConfig };

  const result = {
    timestamp: aggregation.timestamp,
    tiers: {},
    summary: {},
  };

  // Organize photos into tiers
  Object.keys(tiers).forEach((tierKey) => {
    result.tiers[tierKey] = [];
  });

  aggregation.photos.forEach((photo) => {
    const score = photo.overall_score || 0;

    for (const [tierKey, tierConfig] of Object.entries(tiers)) {
      if (score >= tierConfig.min) {
        result.tiers[tierKey].push(photo);
        break;
      }
    }
  });

  // Generate summary
  Object.entries(result.tiers).forEach(([tierKey, photos]) => {
    result.summary[tierKey] = {
      count: photos.length,
      percentage: Math.round((photos.length / aggregation.total_photos) * 100),
    };
  });

  return result;
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
