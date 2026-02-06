/**
 * Prompt Quality Validator (FR-2.4 Phase 3)
 *
 * Validates quality of generated analysis prompts and criteria.
 * Provides CLI-friendly quality reports and post-analysis validation.
 *
 * This module wraps and extends criteria-refinement.js with:
 * - CLI orchestration
 * - Score coherence checking (post-analysis)
 * - Quality report generation
 */

import { validateCriteria, checkAlignment, normalizeWeights } from '../prompts/criteria-refinement.js';
import { logger } from '../utils/logger.js';
import { readJson, fileExists } from '../utils/file-utils.js';
import { join } from 'path';

/**
 * Validate prompt quality for a project directory
 *
 * Entry point for CLI validate-prompt command.
 * Loads project config and analysis prompt, runs validation, generates report.
 *
 * @param {string} projectDir - Project directory path
 * @param {Object} options - Validation options
 * @param {boolean} options.verbose - Show detailed validation info
 * @param {boolean} options.autoFix - Auto-apply fixes (weight normalization)
 * @returns {Promise<Object>} Validation results
 */
export async function validateProjectPrompt(projectDir, options = {}) {
  const verbose = options.verbose || false;
  const autoFix = options.autoFix !== false; // Default true

  logger.info('Validating project prompt quality...');

  // Load project files
  const promptFile = join(projectDir, 'analysis-prompt.json');
  const configFile = join(projectDir, 'open-call.json');

  if (!fileExists(promptFile)) {
    logger.error(`Analysis prompt not found: ${promptFile}`);
    logger.info('Generate prompt first: npm run analyze analyze <project-dir>');
    return {
      valid: false,
      error: 'Prompt file not found'
    };
  }

  const analysisPrompt = readJson(promptFile);

  if (!analysisPrompt.criteria || analysisPrompt.criteria.length === 0) {
    logger.error('No criteria found in analysis prompt');
    return {
      valid: false,
      error: 'No criteria'
    };
  }

  // Load open call config for alignment check
  let openCallData = null;
  if (fileExists(configFile)) {
    openCallData = readJson(configFile);
  } else {
    logger.warn('No open-call.json found - skipping theme alignment check');
  }

  // Run validation
  const validation = validateCriteria(analysisPrompt.criteria);

  // Check theme alignment if config available
  let alignment = null;
  if (openCallData) {
    alignment = checkAlignment(analysisPrompt.criteria, openCallData);
  }

  // Generate report
  const report = generateQualityReport(validation, alignment, {
    verbose,
    autoFix
  });

  // Display report
  console.log(report.formatted);

  // Auto-fix if enabled and issues found
  if (autoFix && !validation.valid) {
    logger.info('Applying automatic fixes...');

    // Currently only weight normalization is auto-fixable
    if (validation.issues.some(i => i.type === 'weight_total')) {
      const normalized = normalizeWeights(analysisPrompt.criteria);
      logger.success('✓ Weights normalized to 100%');

      // Note: In real implementation, would save back to file
      // For now, just log the suggestion
      logger.info('To apply fixes, regenerate prompt or edit manually');
    }
  }

  return {
    valid: validation.valid,
    validation,
    alignment,
    report,
    autoFixApplied: autoFix && !validation.valid
  };
}

/**
 * Check score coherence after photo analysis
 *
 * Validates that LLM-generated scores are internally consistent:
 * - Scores match reasoning sentiment
 * - Weighted average calculated correctly
 * - No outliers (e.g., all 9-10 but final 3/10)
 *
 * @param {Object} analysisResult - Photo analysis result
 * @param {Object} analysisResult.scores - Score object with individual + summary
 * @param {Object} analysisResult.scores.individual - Per-criterion scores
 * @param {Object} analysisResult.scores.summary - Summary scores (weighted_average, etc.)
 * @returns {Object} Coherence check result
 */
export function checkScoreCoherence(analysisResult) {
  const { scores } = analysisResult;

  if (!scores || !scores.individual) {
    return {
      coherent: false,
      issues: [{
        type: 'missing_data',
        severity: 'high',
        message: 'Missing scores data'
      }]
    };
  }

  const issues = [];
  const individual = scores.individual;
  const summary = scores.summary || {};

  // 1. Check weighted average calculation
  const criteriaScores = Object.values(individual);

  if (criteriaScores.length > 0) {
    const totalWeight = criteriaScores.reduce((sum, c) => sum + (c.weight || 0), 0);
    const weightedSum = criteriaScores.reduce((sum, c) => sum + (c.score || 0) * (c.weight || 0), 0);

    const expectedAvg = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const actualAvg = summary.weighted_average || summary.average || 0;

    // Allow 0.2 tolerance for rounding
    if (Math.abs(expectedAvg - actualAvg) > 0.2) {
      issues.push({
        type: 'weighted_average_mismatch',
        severity: 'medium',
        message: `Weighted average mismatch: expected ${expectedAvg.toFixed(1)}, got ${actualAvg.toFixed(1)}`,
        expected: expectedAvg,
        actual: actualAvg
      });
    }
  }

  // 2. Check for score outliers
  const scoreValues = criteriaScores.map(c => c.score || 0).filter(s => s > 0);

  if (scoreValues.length > 2) {
    const mean = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length;
    const stdDev = Math.sqrt(
      scoreValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / scoreValues.length
    );

    // Flag if standard deviation is very high (inconsistent scoring)
    if (stdDev > 3.0) {
      issues.push({
        type: 'high_score_variance',
        severity: 'low',
        message: `High score variance (σ=${stdDev.toFixed(1)}). Scores may be inconsistent.`,
        standardDeviation: stdDev,
        mean: mean
      });
    }

    // Check for extreme outliers (>2 std dev from mean)
    scoreValues.forEach((score, idx) => {
      if (Math.abs(score - mean) > 2 * stdDev) {
        const criterion = Object.keys(individual)[idx];
        issues.push({
          type: 'score_outlier',
          severity: 'low',
          message: `Criterion "${criterion}" score (${score}) is outlier (mean=${mean.toFixed(1)}, σ=${stdDev.toFixed(1)})`,
          criterion,
          score,
          mean,
          standardDeviation: stdDev
        });
      }
    });
  }

  // 3. Check reasoning consistency (if full_analysis available)
  if (scores.full_analysis) {
    const analysisText = scores.full_analysis.toLowerCase();

    // Simple sentiment heuristics
    const negativeWords = ['poor', 'weak', 'lacking', 'fails', 'disappointing', 'mediocre'];
    const positiveWords = ['excellent', 'strong', 'outstanding', 'impressive', 'exceptional'];

    const negativeCount = negativeWords.filter(word => analysisText.includes(word)).length;
    const positiveCount = positiveWords.filter(word => analysisText.includes(word)).length;

    const avgScore = summary.weighted_average || summary.average || 0;

    // If average is high (>7) but text is negative
    if (avgScore > 7 && negativeCount > positiveCount) {
      issues.push({
        type: 'reasoning_score_mismatch',
        severity: 'medium',
        message: `High score (${avgScore.toFixed(1)}) but reasoning contains negative language`,
        negativeWords: negativeCount,
        positiveWords: positiveCount
      });
    }

    // If average is low (<5) but text is positive
    if (avgScore < 5 && positiveCount > negativeCount) {
      issues.push({
        type: 'reasoning_score_mismatch',
        severity: 'medium',
        message: `Low score (${avgScore.toFixed(1)}) but reasoning contains positive language`,
        negativeWords: negativeCount,
        positiveWords: positiveCount
      });
    }
  }

  return {
    coherent: issues.length === 0,
    issues,
    statistics: {
      criteriaCount: criteriaScores.length,
      averageScore: summary.weighted_average || summary.average || 0,
      scoreRange: scoreValues.length > 0
        ? [Math.min(...scoreValues), Math.max(...scoreValues)]
        : [0, 0]
    }
  };
}

/**
 * Generate human-readable quality report
 *
 * @param {Object} validation - Validation result from validateCriteria()
 * @param {Object|null} alignment - Alignment result from checkAlignment()
 * @param {Object} options - Report options
 * @returns {Object} Report with formatted output
 */
export function generateQualityReport(validation, alignment, options = {}) {
  const verbose = options.verbose || false;
  const lines = [];

  // Header
  lines.push('');
  lines.push('═══════════════════════════════════════════════');
  lines.push('         PROMPT QUALITY VALIDATION REPORT      ');
  lines.push('═══════════════════════════════════════════════');
  lines.push('');

  // Overall status
  const statusIcon = validation.valid ? '✓' : '✗';
  const statusColor = validation.valid ? 'PASS' : 'FAIL';
  lines.push(`Overall Status: [${statusColor}] ${statusIcon}`);
  lines.push('');

  // Quality scores
  lines.push('Quality Scores:');
  lines.push(`  Specificity:  ${validation.scores.specificity.toFixed(1)}/10 ${getScoreBar(validation.scores.specificity)}`);
  lines.push(`  Alignment:    ${validation.scores.alignment.toFixed(1)}/10 ${getScoreBar(validation.scores.alignment)}`);
  lines.push(`  Overall:      ${validation.scores.overall.toFixed(1)}/10 ${getScoreBar(validation.scores.overall)}`);
  lines.push('');

  // Issues
  if (validation.issues.length > 0) {
    lines.push('Issues Found:');

    const highIssues = validation.issues.filter(i => i.severity === 'high');
    const mediumIssues = validation.issues.filter(i => i.severity === 'medium');
    const lowIssues = validation.issues.filter(i => i.severity === 'low');

    if (highIssues.length > 0) {
      lines.push(`  🔴 HIGH (${highIssues.length}):`);
      highIssues.forEach(issue => {
        lines.push(`     • ${issue.message}`);
        if (verbose && issue.criterion) {
          lines.push(`       Criterion: "${issue.criterion}"`);
        }
      });
    }

    if (mediumIssues.length > 0) {
      lines.push(`  🟡 MEDIUM (${mediumIssues.length}):`);
      mediumIssues.forEach(issue => {
        lines.push(`     • ${issue.message}`);
      });
    }

    if (verbose && lowIssues.length > 0) {
      lines.push(`  🟢 LOW (${lowIssues.length}):`);
      lowIssues.forEach(issue => {
        lines.push(`     • ${issue.message}`);
      });
    }

    lines.push('');
  } else {
    lines.push('✓ No issues found!');
    lines.push('');
  }

  // Theme alignment (if available)
  if (alignment) {
    lines.push('Theme Alignment:');
    lines.push(`  Overall: ${alignment.overallAlignment.toFixed(1)}/10 ${getScoreBar(alignment.overallAlignment)}`);

    if (alignment.missingElements && alignment.missingElements.length > 0 && verbose) {
      lines.push('  Missing Elements:');
      alignment.missingElements.forEach(elem => {
        lines.push(`    - ${elem}`);
      });
    }

    lines.push('');
  }

  // Suggestions
  if (validation.suggestions && validation.suggestions.length > 0) {
    lines.push('Suggestions:');
    validation.suggestions.slice(0, 3).forEach((suggestion, idx) => {
      lines.push(`  ${idx + 1}. ${suggestion.suggestion}`);
      if (verbose && suggestion.criterion) {
        lines.push(`     For: "${suggestion.criterion}"`);
      }
    });

    if (validation.suggestions.length > 3 && !verbose) {
      lines.push(`  ... and ${validation.suggestions.length - 3} more (use --verbose)`);
    }

    lines.push('');
  }

  // Footer
  lines.push('═══════════════════════════════════════════════');

  if (!validation.valid) {
    lines.push('');
    lines.push('Recommendation: Regenerate prompt with refined criteria');
    lines.push('Command: npm run analyze analyze <project-dir>');
  }

  return {
    formatted: lines.join('\n'),
    validation,
    alignment
  };
}

/**
 * Generate visual score bar
 * @param {number} score - Score 0-10
 * @returns {string} Visual bar
 */
function getScoreBar(score) {
  const filled = Math.round(score);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Batch validate multiple analysis results for coherence
 *
 * @param {Array<Object>} analysisResults - Array of photo analysis results
 * @returns {Object} Batch coherence report
 */
export function batchCheckCoherence(analysisResults) {
  const results = analysisResults.map(result => ({
    photo: result.photoPath || result.filename,
    coherence: checkScoreCoherence(result)
  }));

  const incoherentCount = results.filter(r => !r.coherence.coherent).length;
  const totalIssues = results.reduce((sum, r) => sum + r.coherence.issues.length, 0);

  return {
    totalPhotos: results.length,
    coherentPhotos: results.length - incoherentCount,
    incoherentPhotos: incoherentCount,
    totalIssues,
    results: results.filter(r => !r.coherence.coherent) // Only return problematic ones
  };
}
