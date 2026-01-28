/**
 * CLI Tier Display Module
 * Provides formatted terminal output for tiering results
 */

import Table from 'cli-table3';
import { logger } from '../utils/logger.js';

/**
 * Display tier summary as a colored table in terminal
 * Shows tier counts and percentages
 * 
 * @param {Object} smartTiers - Output from integrateSmartTiering()
 * @returns {void} Prints to console
 */
export function displayTierSummary(smartTiers) {
  if (!smartTiers || !smartTiers.summary) {
    logger.warn('No tier data to display');
    return;
  }

  const table = new Table({
    head: ['Tier', 'Count', 'Percentage', 'Score Range'],
    style: { head: [], border: ['cyan'] },
    colWidths: [25, 10, 15, 25]
  });

  const total = smartTiers.summary.total || 1;

  if (smartTiers.tier1 && smartTiers.tier1.length > 0) {
    table.push([
      '🟢 Tier 1 (Strong)',
      smartTiers.summary.tier1_count,
      `${Math.round((smartTiers.summary.tier1_count / total) * 100)}%`,
      `> ${smartTiers.summary.high_threshold}`
    ]);
  }

  if (smartTiers.tier2 && smartTiers.tier2.length > 0) {
    table.push([
      '🟡 Tier 2 (Good)',
      smartTiers.summary.tier2_count,
      `${Math.round((smartTiers.summary.tier2_count / total) * 100)}%`,
      `> ${smartTiers.summary.medium_threshold}`
    ]);
  }

  if (smartTiers.tier3 && smartTiers.tier3.length > 0) {
    table.push([
      '🟠 Tier 3 (Borderline)',
      smartTiers.summary.tier3_count,
      `${Math.round((smartTiers.summary.tier3_count / total) * 100)}%`,
      `≤ ${smartTiers.summary.medium_threshold}`
    ]);
  }

  console.log('\n' + table.toString());
}

/**
 * Display detailed tier breakdown with photo filenames
 * Shows all photos grouped by tier with scores
 * 
 * @param {Object} smartTiers - Output from integrateSmartTiering()
 * @returns {void} Prints to console
 */
export function displayTierDetails(smartTiers) {
  if (!smartTiers) {
    logger.warn('No tier data to display');
    return;
  }

  console.log('\n');

  // Tier 1
  if (smartTiers.tier1 && smartTiers.tier1.length > 0) {
    console.log('╔════════════════════════════════════════╗');
    console.log('║ 🟢 TIER 1: STRONG SUBMISSIONS         ║');
    console.log('╚════════════════════════════════════════╝\n');

    const tier1Table = new Table({
      head: ['Rank', 'Filename', 'Score', 'Status'],
      style: { head: [], border: ['green'] },
      colWidths: [8, 40, 10, 20]
    });

    smartTiers.tier1.forEach((photo, idx) => {
      const filename = (photo.filename || photo.name || 'unknown').substring(0, 37);
      tier1Table.push([
        idx + 1,
        filename,
        photo.score.toFixed(2),
        '✅ Ready'
      ]);
    });

    console.log(tier1Table.toString());
  }

  // Tier 2
  if (smartTiers.tier2 && smartTiers.tier2.length > 0) {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║ 🟡 TIER 2: GOOD SUBMISSIONS           ║');
    console.log('╚════════════════════════════════════════╝\n');

    const tier2Table = new Table({
      head: ['Rank', 'Filename', 'Score', 'Status'],
      style: { head: [], border: ['yellow'] },
      colWidths: [8, 40, 10, 20]
    });

    smartTiers.tier2.forEach((photo, idx) => {
      const filename = (photo.filename || photo.name || 'unknown').substring(0, 37);
      tier2Table.push([
        idx + 1,
        filename,
        photo.score.toFixed(2),
        '👍 Consider'
      ]);
    });

    console.log(tier2Table.toString());
  }

  // Tier 3
  if (smartTiers.tier3 && smartTiers.tier3.length > 0) {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║ 🟠 TIER 3: BORDERLINE SUBMISSIONS     ║');
    console.log('╚════════════════════════════════════════╝\n');

    const tier3Table = new Table({
      head: ['Rank', 'Filename', 'Score', 'Status'],
      style: { head: [], border: ['yellow'] },
      colWidths: [8, 40, 10, 20]
    });

    smartTiers.tier3.forEach((photo, idx) => {
      const filename = (photo.filename || photo.name || 'unknown').substring(0, 37);
      tier3Table.push([
        idx + 1,
        filename,
        photo.score.toFixed(2),
        '⚠️ Review'
      ]);
    });

    console.log(tier3Table.toString());
  }

  console.log('');
}

/**
 * Display recommendations based on tier breakdown
 * Shows actionable insights for photographer
 * 
 * @param {Object} smartTiers - Output from integrateSmartTiering()
 * @returns {void} Prints to console
 */
export function displayTierRecommendations(smartTiers) {
  if (!smartTiers || !smartTiers.summary) {
    return;
  }

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║ 📋 RECOMMENDATIONS                   ║');
  console.log('╚════════════════════════════════════════╝\n');

  const tier1Count = smartTiers.summary.tier1_count || 0;
  const tier2Count = smartTiers.summary.tier2_count || 0;
  const tier3Count = smartTiers.summary.tier3_count || 0;

  if (tier1Count > 0) {
    logger.success(`✅ You have ${tier1Count} strong submission(s) ready to submit!`);
  }

  if (tier2Count > 0) {
    logger.info(`👍 Consider submitting ${tier2Count} additional good submission(s).`);
  }

  if (tier3Count > 0) {
    logger.warn(`⚠️ ${tier3Count} submission(s) may benefit from revision or different framing.`);
  }

  if (tier1Count === 0 && tier2Count > 0) {
    logger.info('💡 Tip: Try different crops, angles, or lighting adjustments to improve scores.');
  }

  console.log('');
}

export default {
  displayTierSummary,
  displayTierDetails,
  displayTierRecommendations
};
