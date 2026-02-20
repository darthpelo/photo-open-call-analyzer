/**
 * Combination generator and candidate set selection for set analysis.
 * Implements the combinatorial optimization for finding optimal K-from-N photo sets.
 * Part of FR-3.11: Polaroid Set Analysis (ADR-015).
 */

/**
 * Count total combinations C(n, k).
 * @param {number} n - Total items
 * @param {number} k - Items to choose
 * @returns {number} Number of combinations
 */
export function countCombinations(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  if (k === 1) return n;

  // Use symmetry: C(n,k) = C(n, n-k)
  if (k > n - k) k = n - k;

  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }
  return Math.round(result);
}

/**
 * Generate all combinations of k items from array.
 * Uses iterative approach for memory efficiency.
 * @param {Array} items - Array of items
 * @param {number} k - Number of items per combination
 * @yields {Array} A combination of k items
 */
export function* generateCombinations(items, k) {
  const n = items.length;
  if (k > n || k <= 0) return;

  const indices = Array.from({ length: k }, (_, i) => i);

  yield indices.map(i => items[i]);

  while (true) {
    let i = k - 1;
    while (i >= 0 && indices[i] === i + n - k) {
      i--;
    }
    if (i < 0) return;

    indices[i]++;
    for (let j = i + 1; j < k; j++) {
      indices[j] = indices[j - 1] + 1;
    }

    yield indices.map(i => items[i]);
  }
}

/**
 * Calculate diversity score for a set of photos based on criterion score profiles.
 * Higher diversity means photos have different strengths/weaknesses.
 * @param {Object[]} photos - Photos with scores property { criterion: score }
 * @returns {number} Diversity score 0-1
 */
export function calculateDiversity(photos) {
  if (!photos || photos.length < 2) return 0;

  const scoreMaps = photos.map(p => p.scores || {});
  const allCriteria = [...new Set(scoreMaps.flatMap(s => Object.keys(s)))];

  if (allCriteria.length === 0) return 0;

  // Calculate pairwise distance between score profiles
  let totalDistance = 0;
  let pairCount = 0;

  for (let i = 0; i < photos.length; i++) {
    for (let j = i + 1; j < photos.length; j++) {
      let sumSquaredDiff = 0;
      for (const criterion of allCriteria) {
        const scoreA = scoreMaps[i][criterion] || 0;
        const scoreB = scoreMaps[j][criterion] || 0;
        sumSquaredDiff += (scoreA - scoreB) ** 2;
      }
      totalDistance += Math.sqrt(sumSquaredDiff / allCriteria.length);
      pairCount++;
    }
  }

  if (pairCount === 0) return 0;

  const avgDistance = totalDistance / pairCount;
  // Normalize to 0-1 range (max possible distance with scores 0-10 is 10)
  return Math.min(avgDistance / 10, 1);
}

const MAX_SAFE_COMBINATIONS = 10000;

/**
 * Select top candidate sets using multi-phase pre-filtering.
 *
 * Phase 1: Pre-filter to top N photos (by individual score)
 * Phase 2: Score all C(N,K) combinations by sum of individual scores + diversity bonus
 * Phase 3: Return top M candidates sorted by pre-score
 *
 * @param {Object[]} rankedPhotos - Photos sorted by individual score (desc), with filename, score, scores
 * @param {number} setSize - Number of photos per set
 * @param {Object} options - Selection options
 * @param {number} [options.maxSetsToEvaluate=10] - Max sets to return
 * @param {number} [options.preFilterTopN=12] - Consider only top N photos
 * @param {number} [options.maxCombinations=10000] - Safety limit for total combinations
 * @returns {Object[]} Top candidate sets with { photos, preScore, diversityBonus }
 */
export function selectCandidateSets(rankedPhotos, setSize, options = {}) {
  const { maxSetsToEvaluate = 10, preFilterTopN = 12, maxCombinations = MAX_SAFE_COMBINATIONS } = options;

  if (!rankedPhotos || rankedPhotos.length < setSize) {
    return [];
  }

  // Phase 1: Pre-filter to top N photos
  const topPhotos = rankedPhotos.slice(0, preFilterTopN);

  if (topPhotos.length < setSize) {
    return [];
  }

  // Safety check: prevent memory exhaustion from excessive combinations
  const totalCombinations = countCombinations(topPhotos.length, setSize);
  if (totalCombinations > maxCombinations) {
    throw new Error(
      `Too many combinations: C(${topPhotos.length},${setSize}) = ${totalCombinations} exceeds limit of ${maxCombinations}. ` +
      `Reduce photo count or increase set size.`
    );
  }

  // Phase 2: Score all combinations
  const scoredSets = [];

  for (const combo of generateCombinations(topPhotos, setSize)) {
    const sumScore = combo.reduce((sum, p) => sum + (p.score || 0), 0);
    const diversity = calculateDiversity(combo);
    const diversityBonus = diversity * 2; // Up to 2 bonus points
    const preScore = sumScore + diversityBonus;

    scoredSets.push({
      photos: combo,
      preScore: Math.round(preScore * 1000) / 1000,
      sumIndividualScore: Math.round(sumScore * 1000) / 1000,
      diversityBonus: Math.round(diversityBonus * 1000) / 1000
    });
  }

  // Phase 3: Sort by pre-score and return top M
  scoredSets.sort((a, b) => b.preScore - a.preScore);
  return scoredSets.slice(0, maxSetsToEvaluate);
}
