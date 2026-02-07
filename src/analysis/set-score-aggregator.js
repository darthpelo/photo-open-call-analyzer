/**
 * Set score aggregation for combining individual and set-level scores.
 * Part of FR-3.11: Polaroid Set Analysis (ADR-015).
 */

/**
 * Aggregate individual photo scores and set-level scores into a composite set score.
 * @param {Object[]} individualResults - Array of { filename, score }
 * @param {Object} setAnalysis - Set-level analysis from analyzeSet()
 * @param {Object} setConfig - Set mode configuration
 * @returns {Object} Aggregated set result with composite score
 */
export function aggregateSetScores(individualResults, setAnalysis, setConfig) {
  const individualWeight = setConfig.individualWeight ?? 40;
  const setWeight = setConfig.setWeight ?? 60;

  // Calculate average individual score
  const individualScores = individualResults.map(r => r.score || 0);
  const individualAverage = individualScores.length > 0
    ? individualScores.reduce((sum, s) => sum + s, 0) / individualScores.length
    : 0;

  // Calculate weighted set-level score
  const setScores = setAnalysis.setScores || {};
  let setWeightedSum = 0;
  let setWeightTotal = 0;

  for (const [, data] of Object.entries(setScores)) {
    const score = data.score || 0;
    const weight = data.weight || 0;
    setWeightedSum += score * weight;
    setWeightTotal += weight;
  }

  const setWeightedAverage = setWeightTotal > 0
    ? setWeightedSum / setWeightTotal
    : 0;

  // Compute composite score
  const compositeScore = (individualWeight * individualAverage + setWeight * setWeightedAverage) / 100;

  return {
    compositeScore: Math.round(compositeScore * 1000) / 1000,
    individualAverage: Math.round(individualAverage * 1000) / 1000,
    setWeightedAverage: Math.round(setWeightedAverage * 1000) / 1000,
    individualWeight,
    setWeight,
    photos: individualResults.map(r => ({ ...r })),
    setScores: { ...setScores },
    recommendation: setAnalysis.recommendation || '',
    suggestedOrder: setAnalysis.suggestedOrder || [],
    photoRoles: setAnalysis.photoRoles || {},
    weakestLink: setAnalysis.weakestLink || '',
    fullAnalysis: setAnalysis.fullAnalysis || ''
  };
}

/**
 * Rank multiple candidate sets by composite score.
 * @param {Object[]} setResults - Array of aggregated set results with compositeScore and setId
 * @returns {Object} { ranking, statistics }
 */
export function rankSets(setResults) {
  if (!setResults || setResults.length === 0) {
    return {
      ranking: [],
      statistics: { total: 0, average: 0, min: 0, max: 0, median: 0 }
    };
  }

  // Sort by composite score descending
  const sorted = [...setResults].sort((a, b) => b.compositeScore - a.compositeScore);

  // Assign ranks
  const ranking = sorted.map((set, index) => ({
    ...set,
    rank: index + 1
  }));

  // Calculate statistics
  const scores = sorted.map(s => s.compositeScore);
  const average = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const sortedScores = [...scores].sort((a, b) => a - b);
  const median = sortedScores.length % 2 === 0
    ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
    : sortedScores[Math.floor(sortedScores.length / 2)];

  return {
    ranking,
    statistics: {
      total: setResults.length,
      average: Math.round(average * 1000) / 1000,
      min: Math.min(...scores),
      max: Math.max(...scores),
      median: Math.round(median * 1000) / 1000
    }
  };
}

/**
 * Compare two sets and determine which is stronger.
 * @param {Object} setA - First set result
 * @param {Object} setB - Second set result
 * @returns {Object} Comparison with winner, differences per criterion
 */
export function compareSets(setA, setB) {
  const scoreDelta = Math.round((setA.compositeScore - setB.compositeScore) * 1000) / 1000;

  let winner;
  if (scoreDelta > 0) {
    winner = setA.setId;
  } else if (scoreDelta < 0) {
    winner = setB.setId;
  } else {
    winner = 'tie';
  }

  // Per-criterion differences
  const criterionDiffs = {};
  const allCriteria = new Set([
    ...Object.keys(setA.setScores || {}),
    ...Object.keys(setB.setScores || {})
  ]);

  for (const criterion of allCriteria) {
    const scoreA = setA.setScores?.[criterion]?.score || 0;
    const scoreB = setB.setScores?.[criterion]?.score || 0;
    criterionDiffs[criterion] = scoreA - scoreB;
  }

  return {
    winner,
    scoreDelta: Math.abs(scoreDelta),
    criterionDiffs,
    setA: { setId: setA.setId, compositeScore: setA.compositeScore },
    setB: { setId: setB.setId, compositeScore: setB.compositeScore }
  };
}
