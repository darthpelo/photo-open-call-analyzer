/**
 * Report generator for set analysis results.
 * Generates Markdown, JSON, and CSV reports for photo set rankings.
 * Part of FR-3.11: Polaroid Set Analysis (ADR-015).
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';

/**
 * Generate Markdown report for set analysis results.
 * @param {Object[]} rankedSets - Sets ranked by composite score
 * @param {Object} [statistics=null] - Overall statistics
 * @param {Object} setConfig - Set mode configuration
 * @param {Object} [options={}] - Report options (title, theme)
 * @returns {string} Markdown report content
 */
export function generateSetMarkdownReport(rankedSets, statistics, setConfig, options = {}) {
  const title = options.title || 'Photo Set Analysis';
  const theme = options.theme || '';
  const now = new Date().toISOString();

  let md = `# ${title} - Set Analysis Report\n\n`;
  md += `**Generated**: ${now}\n`;
  if (theme) md += `**Theme**: ${theme}\n`;
  md += `**Sets evaluated**: ${rankedSets.length}\n`;
  md += `**Photos per set**: ${setConfig.setSize || 4}\n`;
  md += `**Scoring**: ${setConfig.individualWeight || 40}% individual + ${setConfig.setWeight || 60}% set\n\n`;

  // Best set recommendation
  if (rankedSets.length > 0) {
    const best = rankedSets[0];
    md += `## Recommended Set\n\n`;
    md += `**Composite Score**: ${best.compositeScore?.toFixed(2) || 'N/A'}/10\n`;
    md += `**Recommendation**: ${best.recommendation || 'N/A'}\n\n`;

    if (best.photos) {
      md += `| # | Photo | Individual Score |\n`;
      md += `|---|-------|------------------|\n`;
      best.photos.forEach((p, i) => {
        md += `| ${i + 1} | ${p.filename} | ${p.score?.toFixed(1) || 'N/A'}/10 |\n`;
      });
      md += '\n';
    }

    if (best.suggestedOrder && best.suggestedOrder.length > 0) {
      md += `**Suggested viewing order**: ${best.suggestedOrder.join(' → ')}\n\n`;
    }

    // Set criteria scores
    if (best.setScores && Object.keys(best.setScores).length > 0) {
      md += `### Set Criteria Scores\n\n`;
      md += `| Criterion | Score | Weight | Reasoning |\n`;
      md += `|-----------|-------|--------|----------|\n`;
      for (const [name, data] of Object.entries(best.setScores)) {
        md += `| ${name} | ${data.score}/10 | ${data.weight}% | ${data.reasoning || '-'} |\n`;
      }
      md += '\n';
    }

    // Photo roles
    if (best.photoRoles && Object.keys(best.photoRoles).length > 0) {
      md += `### Photo Roles\n\n`;
      for (const [photo, role] of Object.entries(best.photoRoles)) {
        md += `- **${photo}**: ${role}\n`;
      }
      md += '\n';
    }

    if (best.weakestLink) {
      md += `**Weakest link**: ${best.weakestLink}\n\n`;
    }
  }

  // All sets ranking
  if (rankedSets.length > 1) {
    md += `## All Sets Ranking\n\n`;
    md += `| Rank | Photos | Composite | Individual Avg | Set Score | Recommendation |\n`;
    md += `|------|--------|-----------|----------------|-----------|----------------|\n`;
    rankedSets.forEach(set => {
      const photos = set.photos ? set.photos.map(p => p.filename).join(', ') : 'N/A';
      md += `| ${set.rank || '-'} | ${photos} | ${set.compositeScore?.toFixed(2) || '-'} | ${set.individualAverage?.toFixed(2) || '-'} | ${set.setWeightedAverage?.toFixed(2) || '-'} | ${set.recommendation || '-'} |\n`;
    });
    md += '\n';
  }

  // Statistics
  if (statistics && statistics.total > 0) {
    md += `## Statistics\n\n`;
    md += `- **Total sets**: ${statistics.total}\n`;
    md += `- **Average score**: ${statistics.average?.toFixed(2)}\n`;
    md += `- **Score range**: ${statistics.min?.toFixed(2)} - ${statistics.max?.toFixed(2)}\n`;
    md += `- **Median**: ${statistics.median?.toFixed(2)}\n`;
  }

  return md;
}

/**
 * Generate JSON report for set analysis.
 * @param {Object[]} rankedSets
 * @param {Object} [statistics=null]
 * @param {Object} setConfig
 * @param {Object} [options={}]
 * @returns {Object} JSON-serializable report
 */
export function generateSetJsonReport(rankedSets, statistics, setConfig, options = {}) {
  return {
    metadata: {
      title: options.title || 'Photo Set Analysis',
      theme: options.theme || '',
      generatedAt: new Date().toISOString(),
      setSize: setConfig.setSize || 4,
      individualWeight: setConfig.individualWeight || 40,
      setWeight: setConfig.setWeight || 60,
      totalSets: rankedSets.length
    },
    ranking: rankedSets.map(set => ({
      rank: set.rank,
      setId: set.setId,
      compositeScore: set.compositeScore,
      individualAverage: set.individualAverage,
      setWeightedAverage: set.setWeightedAverage,
      recommendation: set.recommendation,
      suggestedOrder: set.suggestedOrder,
      photos: set.photos?.map(p => ({
        filename: p.filename,
        individualScore: p.score
      })),
      setScores: set.setScores,
      photoRoles: set.photoRoles,
      weakestLink: set.weakestLink
    })),
    statistics: statistics || {}
  };
}

/**
 * Generate CSV report for set analysis.
 * @param {Object[]} rankedSets
 * @returns {string} CSV content
 */
export function generateSetCsvReport(rankedSets) {
  let csv = 'Rank,Set ID,Photos,Composite Score,Individual Avg,Set Score,Recommendation\n';

  rankedSets.forEach(set => {
    const photos = set.photos ? set.photos.map(p => p.filename).join(' | ') : '';
    csv += `${set.rank || ''},${set.setId || ''},"${photos}",${set.compositeScore?.toFixed(3) || ''},${set.individualAverage?.toFixed(3) || ''},${set.setWeightedAverage?.toFixed(3) || ''},"${set.recommendation || ''}"\n`;
  });

  return csv;
}

/**
 * Export all set reports to disk.
 * @param {string} outputDir
 * @param {Object[]} rankedSets
 * @param {Object} [statistics=null]
 * @param {Object} setConfig
 * @param {Object} [options={}]
 */
export function exportSetReports(outputDir, rankedSets, statistics, setConfig, options = {}) {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const mdContent = generateSetMarkdownReport(rankedSets, statistics, setConfig, options);
  const jsonContent = generateSetJsonReport(rankedSets, statistics, setConfig, options);
  const csvContent = generateSetCsvReport(rankedSets);

  writeFileSync(join(outputDir, 'set-analysis.md'), mdContent);
  writeFileSync(join(outputDir, 'set-analysis.json'), JSON.stringify(jsonContent, null, 2));
  writeFileSync(join(outputDir, 'set-analysis.csv'), csvContent);

  logger.info('Set reports exported:');
  logger.info(`  ${join(outputDir, 'set-analysis.md')}`);
  logger.info(`  ${join(outputDir, 'set-analysis.json')}`);
  logger.info(`  ${join(outputDir, 'set-analysis.csv')}`);
}
