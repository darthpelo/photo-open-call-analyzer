/**
 * Comparison engine for AI vs Human ranking analysis (FR-B.3, FR-B.4)
 *
 * Pure functions, no side effects, no I/O.
 * All file reading is done by the caller (CLI command).
 */

/**
 * Compute Spearman's rank correlation coefficient between two rankings.
 * Only considers photos present in both rankings.
 *
 * @param {Array<{photo: string, rank: number}>} ranking1
 * @param {Array<{photo: string, rank: number}>} ranking2
 * @returns {number|null} rho in [-1, 1], or null if fewer than 2 common photos
 */
export function computeSpearmanRho(ranking1, ranking2) {
  const map1 = new Map(ranking1.map(r => [r.photo, r.rank]));
  const map2 = new Map(ranking2.map(r => [r.photo, r.rank]));

  // Find common photos
  const common = [...map1.keys()].filter(p => map2.has(p));
  const n = common.length;

  if (n < 2) return null;

  const sumD2 = common.reduce((sum, photo) => {
    const d = map1.get(photo) - map2.get(photo);
    return sum + d * d;
  }, 0);

  return 1 - (6 * sumD2) / (n * (n * n - 1));
}

/**
 * Compute top-N overlap between two rankings.
 *
 * @param {Array<{photo: string, rank: number}>} ranking1
 * @param {Array<{photo: string, rank: number}>} ranking2
 * @param {number} n - Number of top items to compare
 * @returns {{overlap: number, percentage: number, n: number, photos: string[]}}
 */
export function computeTopNOverlap(ranking1, ranking2, n) {
  const effectiveN = Math.min(n, ranking1.length, ranking2.length);

  const top1 = new Set(
    ranking1.filter(r => r.rank <= effectiveN).map(r => r.photo)
  );
  const top2 = new Set(
    ranking2.filter(r => r.rank <= effectiveN).map(r => r.photo)
  );

  const common = [...top1].filter(p => top2.has(p));

  return {
    overlap: common.length,
    percentage: effectiveN > 0 ? Math.round((common.length / effectiveN) * 1000) / 10 : 0,
    n: effectiveN,
    photos: common,
  };
}

/**
 * Find photos where rank differs by more than threshold.
 *
 * @param {Array<{photo: string, rank: number}>} ranking1
 * @param {Array<{photo: string, rank: number}>} ranking2
 * @param {number} threshold - Minimum rank difference to flag
 * @returns {Array<{photo: string, rank1: number, rank2: number, rankDiff: number}>}
 */
export function findDisagreements(ranking1, ranking2, threshold) {
  const map1 = new Map(ranking1.map(r => [r.photo, r.rank]));
  const map2 = new Map(ranking2.map(r => [r.photo, r.rank]));

  const common = [...map1.keys()].filter(p => map2.has(p));

  return common
    .map(photo => ({
      photo,
      rank1: map1.get(photo),
      rank2: map2.get(photo),
      rankDiff: Math.abs(map1.get(photo) - map2.get(photo)),
    }))
    .filter(d => d.rankDiff > threshold)
    .sort((a, b) => b.rankDiff - a.rankDiff);
}

/**
 * Analyze ranking consistency across multiple analysis runs.
 *
 * @param {Array<Array<{photo: string, rank: number}>>} runs - Array of ranking arrays
 * @returns {{photoStats: Object, topNStability: Object, highVolatility: Array}}
 */
export function analyzeConsistency(runs) {
  if (runs.length === 0) {
    return { photoStats: {}, topNStability: { percentage: 0, n: 5 }, highVolatility: [] };
  }

  // Collect ranks per photo across all runs
  const ranksByPhoto = {};
  for (const run of runs) {
    for (const { photo, rank } of run) {
      if (!ranksByPhoto[photo]) ranksByPhoto[photo] = [];
      ranksByPhoto[photo].push(rank);
    }
  }

  // Compute stats per photo
  const photoStats = {};
  for (const [photo, ranks] of Object.entries(ranksByPhoto)) {
    const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;
    const variance = ranks.reduce((sum, r) => sum + (r - mean) ** 2, 0) / ranks.length;
    photoStats[photo] = {
      ranks,
      meanRank: Math.round(mean * 10) / 10,
      rankStdDev: Math.round(Math.sqrt(variance) * 10) / 10,
    };
  }

  // Top-N stability: percentage of photos that appear in top-5 across ALL runs
  const n = 5;
  const topNSets = runs.map(run =>
    new Set(run.filter(r => r.rank <= n).map(r => r.photo))
  );

  let stableCount = 0;
  if (topNSets.length > 0) {
    const firstTopN = topNSets[0];
    for (const photo of firstTopN) {
      if (topNSets.every(set => set.has(photo))) stableCount++;
    }
  }

  const effectiveN = Math.min(n, runs[0]?.length || 0);

  // Flag high-volatility photos (rank std dev > 5)
  const highVolatility = Object.entries(photoStats)
    .filter(([, stats]) => stats.rankStdDev > 5)
    .map(([photo, stats]) => ({ photo, ...stats }))
    .sort((a, b) => b.rankStdDev - a.rankStdDev);

  return {
    photoStats,
    topNStability: {
      percentage: effectiveN > 0 ? Math.round((stableCount / effectiveN) * 100) : 0,
      n: effectiveN,
      stablePhotos: stableCount,
    },
    highVolatility,
  };
}

/**
 * Generate a markdown comparison report.
 *
 * @param {Array<{photo: string, rank: number, overall_score?: number}>} aiRanking
 * @param {Array<{photo: string, rank: number}>} humanRanking
 * @param {Array<Array<{photo: string, rank: number}>>} runs - Historical runs for consistency
 * @returns {string} Markdown report
 */
export function generateComparisonReport(aiRanking, humanRanking, runs) {
  const lines = [];
  lines.push('# Comparison Report');
  lines.push('');
  lines.push(`**Generated**: ${new Date().toISOString()}`);
  lines.push(`**AI photos**: ${aiRanking.length} | **Human photos**: ${humanRanking.length}`);
  lines.push('');

  // AI vs Human comparison
  if (humanRanking.length === 0) {
    lines.push('## AI vs Human Ranking');
    lines.push('');
    lines.push('No human ranking provided. Run `human-ranking` command first.');
    lines.push('');
  } else {
    const rho = computeSpearmanRho(aiRanking, humanRanking);

    lines.push('## AI vs Human Ranking');
    lines.push('');
    lines.push(`**Spearman\'s rho**: ${rho !== null ? rho.toFixed(3) : 'N/A (insufficient overlap)'}`);

    if (rho !== null) {
      let interpretation;
      if (rho >= 0.8) interpretation = 'Strong agreement';
      else if (rho >= 0.5) interpretation = 'Moderate agreement';
      else if (rho >= 0.2) interpretation = 'Weak agreement';
      else if (rho >= -0.2) interpretation = 'No agreement';
      else interpretation = 'Inverse relationship';
      lines.push(`**Interpretation**: ${interpretation}`);
    }
    lines.push('');

    // Top-N overlap
    for (const n of [3, 5, 10]) {
      if (aiRanking.length >= n || humanRanking.length >= n) {
        const overlap = computeTopNOverlap(aiRanking, humanRanking, n);
        lines.push(`**Top-${overlap.n} overlap**: ${overlap.overlap}/${overlap.n} (${overlap.percentage}%)`);
      }
    }
    lines.push('');

    // Disagreements
    const disagreements = findDisagreements(aiRanking, humanRanking, 5);
    if (disagreements.length > 0) {
      lines.push('### Biggest Disagreements (rank diff > 5)');
      lines.push('');
      lines.push('| Photo | AI Rank | Human Rank | Difference |');
      lines.push('|-------|---------|------------|------------|');
      for (const d of disagreements.slice(0, 10)) {
        lines.push(`| ${d.photo} | ${d.rank1} | ${d.rank2} | ${d.rankDiff} |`);
      }
      lines.push('');
    }
  }

  // Cross-run consistency
  if (runs.length >= 2) {
    const consistency = analyzeConsistency(runs);

    lines.push('## Cross-Run Consistency');
    lines.push('');
    lines.push(`**Runs analyzed**: ${runs.length}`);
    lines.push(`**Top-${consistency.topNStability.n} stability**: ${consistency.topNStability.stablePhotos}/${consistency.topNStability.n} (${consistency.topNStability.percentage}%)`);
    lines.push('');

    if (consistency.highVolatility.length > 0) {
      lines.push('### High Volatility Photos (rank σ > 5)');
      lines.push('');
      lines.push('| Photo | Mean Rank | Rank σ |');
      lines.push('|-------|-----------|--------|');
      for (const p of consistency.highVolatility.slice(0, 10)) {
        lines.push(`| ${p.photo} | ${p.meanRank} | ${p.rankStdDev} |`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
