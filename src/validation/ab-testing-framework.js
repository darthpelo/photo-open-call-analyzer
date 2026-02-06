/**
 * A/B Testing Framework for Prompt Variants (FR-2.4 Phase 3 Story 3.2)
 *
 * Enables comparative testing of different analysis prompts.
 * Runs parallel analyses with variant prompts and generates comparison reports.
 */

import { analyzePhotoWithTimeout } from '../analysis/photo-analyzer.js';
import { logger } from '../utils/logger.js';
import { readJson, writeJson, fileExists } from '../utils/file-utils.js';
import { checkScoreCoherence } from './prompt-quality-validator.js';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Prompt Variant Tester
 *
 * Compares two analysis prompts (baseline vs variant) on a sample of photos.
 * Generates comparative metrics to determine which prompt performs better.
 */
export class PromptVariantTester {
  constructor(options = {}) {
    this.baselinePrompt = null;
    this.variantPrompt = null;
    this.results = {
      baseline: [],
      variant: []
    };
    this.options = {
      sample: options.sample || 3,
      timeout: options.timeout || 60000,
      analysisMode: options.analysisMode || 'single', // Use single for speed in A/B testing
      parallel: false // Run sequentially for fairness
    };
  }

  /**
   * Load baseline and variant prompts
   *
   * @param {string} baselinePath - Path to baseline prompt JSON
   * @param {string} variantPath - Path to variant prompt JSON
   */
  loadPrompts(baselinePath, variantPath) {
    if (!fileExists(baselinePath)) {
      throw new Error(`Baseline prompt not found: ${baselinePath}`);
    }

    if (!fileExists(variantPath)) {
      throw new Error(`Variant prompt not found: ${variantPath}`);
    }

    this.baselinePrompt = readJson(baselinePath);
    this.variantPrompt = readJson(variantPath);

    logger.info(`Loaded baseline: ${this.baselinePrompt.title || 'Unnamed'}`);
    logger.info(`Loaded variant: ${this.variantPrompt.title || 'Unnamed'}`);
  }

  /**
   * Select photo sample from directory
   *
   * @param {string} photosDir - Directory containing photos
   * @param {number} sampleSize - Number of photos to sample
   * @returns {Array<string>} Array of photo paths
   */
  selectPhotoSample(photosDir, sampleSize) {
    if (!fileExists(photosDir)) {
      throw new Error(`Photos directory not found: ${photosDir}`);
    }

    const files = readdirSync(photosDir)
      .map(file => join(photosDir, file))
      .filter(file => {
        const stat = statSync(file);
        return stat.isFile() && /\.(jpg|jpeg|png)$/i.test(file);
      });

    if (files.length === 0) {
      throw new Error('No photos found in directory');
    }

    // Random sample
    const shuffled = files.sort(() => 0.5 - Math.random());
    const sample = shuffled.slice(0, Math.min(sampleSize, files.length));

    logger.info(`Selected ${sample.length} photos for A/B testing`);

    return sample;
  }

  /**
   * Run comparison test
   *
   * Analyzes sample photos with both prompts and collects results.
   *
   * @param {string} photosDir - Directory containing photos
   * @returns {Promise<Object>} Comparison results
   */
  async runComparison(photosDir) {
    if (!this.baselinePrompt || !this.variantPrompt) {
      throw new Error('Prompts not loaded. Call loadPrompts() first.');
    }

    const photoSample = this.selectPhotoSample(photosDir, this.options.sample);

    logger.section('A/B TESTING');
    logger.info(`Testing ${photoSample.length} photos with 2 prompts`);

    // Reset results
    this.results = {
      baseline: [],
      variant: []
    };

    // Analyze with baseline
    logger.info('Running baseline analysis...');
    for (const photoPath of photoSample) {
      try {
        const result = await analyzePhotoWithTimeout(photoPath, this.baselinePrompt, {
          timeout: this.options.timeout,
          analysisMode: this.options.analysisMode
        });

        if (result.success) {
          this.results.baseline.push({
            photo: photoPath,
            ...result.data
          });
        } else {
          logger.warn(`Baseline failed for ${photoPath}: ${result.error}`);
        }
      } catch (error) {
        logger.error(`Baseline error for ${photoPath}: ${error.message}`);
      }
    }

    // Analyze with variant
    logger.info('Running variant analysis...');
    for (const photoPath of photoSample) {
      try {
        const result = await analyzePhotoWithTimeout(photoPath, this.variantPrompt, {
          timeout: this.options.timeout,
          analysisMode: this.options.analysisMode
        });

        if (result.success) {
          this.results.variant.push({
            photo: photoPath,
            ...result.data
          });
        } else {
          logger.warn(`Variant failed for ${photoPath}: ${result.error}`);
        }
      } catch (error) {
        logger.error(`Variant error for ${photoPath}: ${error.message}`);
      }
    }

    logger.success('A/B testing complete');

    return this.generateComparisonReport();
  }

  /**
   * Generate comparison report
   *
   * Calculates metrics comparing baseline vs variant performance.
   *
   * @returns {Object} Comparison report
   */
  generateComparisonReport() {
    const baselineMetrics = this.calculateMetrics(this.results.baseline, 'Baseline');
    const variantMetrics = this.calculateMetrics(this.results.variant, 'Variant');

    const comparison = this.compareMetrics(baselineMetrics, variantMetrics);

    const report = {
      summary: {
        photosAnalyzed: this.results.baseline.length,
        baselineSuccessRate: (this.results.baseline.length / this.options.sample) * 100,
        variantSuccessRate: (this.results.variant.length / this.options.sample) * 100
      },
      baseline: baselineMetrics,
      variant: variantMetrics,
      comparison,
      winner: this.determineWinner(baselineMetrics, variantMetrics, comparison),
      recommendations: this.generateRecommendations(comparison)
    };

    return report;
  }

  /**
   * Calculate metrics for a set of results
   *
   * @param {Array<Object>} results - Analysis results
   * @param {string} label - Label for this variant
   * @returns {Object} Metrics
   */
  calculateMetrics(results, label) {
    if (results.length === 0) {
      return {
        count: 0,
        avgScore: 0,
        scoreStdDev: 0,
        coherenceRate: 0,
        avgFeedbackLength: 0
      };
    }

    const scores = results.map(r => r.scores?.summary?.weighted_average || r.scores?.summary?.average || 0);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Standard deviation
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
    const scoreStdDev = Math.sqrt(variance);

    // Check coherence for each result
    const coherenceChecks = results.map(r => checkScoreCoherence(r));
    const coherentCount = coherenceChecks.filter(c => c.coherent).length;
    const coherenceRate = (coherentCount / results.length) * 100;

    // Average feedback length (as proxy for detail)
    const feedbackLengths = results.map(r => {
      const text = r.scores?.full_analysis || '';
      return text.length;
    });
    const avgFeedbackLength = feedbackLengths.reduce((a, b) => a + b, 0) / feedbackLengths.length;

    return {
      label,
      count: results.length,
      avgScore: parseFloat(avgScore.toFixed(2)),
      scoreStdDev: parseFloat(scoreStdDev.toFixed(2)),
      scoreRange: scores.length > 0 ? [Math.min(...scores), Math.max(...scores)] : [0, 0],
      coherenceRate: parseFloat(coherenceRate.toFixed(1)),
      avgFeedbackLength: Math.round(avgFeedbackLength)
    };
  }

  /**
   * Compare baseline and variant metrics
   *
   * @param {Object} baseline - Baseline metrics
   * @param {Object} variant - Variant metrics
   * @returns {Object} Comparison deltas
   */
  compareMetrics(baseline, variant) {
    return {
      scoreDelta: parseFloat((variant.avgScore - baseline.avgScore).toFixed(2)),
      stdDevDelta: parseFloat((variant.scoreStdDev - baseline.scoreStdDev).toFixed(2)),
      coherenceDelta: parseFloat((variant.coherenceRate - baseline.coherenceRate).toFixed(1)),
      feedbackLengthDelta: variant.avgFeedbackLength - baseline.avgFeedbackLength,

      // Interpretations
      scoreImprovement: variant.avgScore > baseline.avgScore,
      moreConsistent: variant.scoreStdDev < baseline.scoreStdDev,
      moreCoherent: variant.coherenceRate > baseline.coherenceRate,
      moreDetailed: variant.avgFeedbackLength > baseline.avgFeedbackLength
    };
  }

  /**
   * Determine winner
   *
   * @param {Object} baseline - Baseline metrics
   * @param {Object} variant - Variant metrics
   * @param {Object} comparison - Comparison deltas
   * @returns {Object} Winner determination
   */
  determineWinner(baseline, variant, comparison) {
    let points = {
      baseline: 0,
      variant: 0
    };

    // Consistency (lower std dev is better) - Weight: 3
    if (comparison.moreConsistent) {
      points.variant += 3;
    } else if (baseline.scoreStdDev < variant.scoreStdDev) {
      points.baseline += 3;
    }

    // Coherence rate (higher is better) - Weight: 2
    if (comparison.moreCoherent) {
      points.variant += 2;
    } else if (baseline.coherenceRate > variant.coherenceRate) {
      points.baseline += 2;
    }

    // Feedback detail (more is usually better) - Weight: 1
    if (comparison.moreDetailed) {
      points.variant += 1;
    } else if (baseline.avgFeedbackLength > variant.avgFeedbackLength) {
      points.baseline += 1;
    }

    // Note: We DON'T use avgScore as a criterion because higher scores aren't necessarily better
    // (could indicate leniency rather than quality)

    const winner = points.variant > points.baseline ? 'variant' :
                   points.baseline > points.variant ? 'baseline' : 'tie';

    return {
      winner,
      points,
      confidence: Math.abs(points.variant - points.baseline) >= 2 ? 'high' : 'low'
    };
  }

  /**
   * Generate recommendations
   *
   * @param {Object} comparison - Comparison results
   * @returns {Array<string>} Recommendations
   */
  generateRecommendations(comparison) {
    const recommendations = [];

    if (Math.abs(comparison.scoreDelta) > 1.0) {
      if (comparison.scoreDelta > 0) {
        recommendations.push('⚠️ Variant produces significantly higher scores. Check if it\'s too lenient.');
      } else {
        recommendations.push('⚠️ Variant produces significantly lower scores. Check if it\'s too harsh.');
      }
    }

    if (comparison.moreConsistent) {
      recommendations.push('✓ Variant shows better score consistency (lower std dev)');
    }

    if (comparison.moreCoherent) {
      recommendations.push('✓ Variant produces more coherent analyses');
    }

    if (comparison.moreDetailed) {
      recommendations.push('✓ Variant generates more detailed feedback');
    }

    if (recommendations.length === 0) {
      recommendations.push('No significant differences detected. More samples may be needed.');
    }

    return recommendations;
  }

  /**
   * Export report to file
   *
   * @param {string} outputPath - Output file path (JSON or Markdown)
   * @param {Object} report - Report to export
   */
  exportReport(outputPath, report = null) {
    if (!report) {
      report = this.generateComparisonReport();
    }

    if (outputPath.endsWith('.json')) {
      writeJson(outputPath, report);
      logger.success(`Report exported to JSON: ${outputPath}`);
    } else if (outputPath.endsWith('.md')) {
      const markdown = this.formatReportAsMarkdown(report);
      writeJson(outputPath.replace('.md', '.json'), report); // Also save JSON

      // For now, just save JSON. Markdown formatting can be added later
      logger.success(`Report exported to: ${outputPath.replace('.md', '.json')}`);
    } else {
      // Default to JSON
      writeJson(outputPath + '.json', report);
      logger.success(`Report exported to: ${outputPath}.json`);
    }
  }

  /**
   * Format report as Markdown
   *
   * @param {Object} report - Comparison report
   * @returns {string} Markdown formatted report
   */
  formatReportAsMarkdown(report) {
    const lines = [];

    lines.push('# A/B Testing Report\n');
    lines.push(`**Photos Analyzed**: ${report.summary.photosAnalyzed}\n`);
    lines.push(`**Baseline Success Rate**: ${report.summary.baselineSuccessRate.toFixed(1)}%`);
    lines.push(`**Variant Success Rate**: ${report.summary.variantSuccessRate.toFixed(1)}%\n`);

    lines.push('## Metrics Comparison\n');
    lines.push('| Metric | Baseline | Variant | Delta |');
    lines.push('|--------|----------|---------|-------|');
    lines.push(`| Avg Score | ${report.baseline.avgScore} | ${report.variant.avgScore} | ${report.comparison.scoreDelta > 0 ? '+' : ''}${report.comparison.scoreDelta} |`);
    lines.push(`| Std Dev | ${report.baseline.scoreStdDev} | ${report.variant.scoreStdDev} | ${report.comparison.stdDevDelta > 0 ? '+' : ''}${report.comparison.stdDevDelta} |`);
    lines.push(`| Coherence | ${report.baseline.coherenceRate}% | ${report.variant.coherenceRate}% | ${report.comparison.coherenceDelta > 0 ? '+' : ''}${report.comparison.coherenceDelta}% |`);
    lines.push(`| Feedback Length | ${report.baseline.avgFeedbackLength} | ${report.variant.avgFeedbackLength} | ${report.comparison.feedbackLengthDelta > 0 ? '+' : ''}${report.comparison.feedbackLengthDelta} |\n`);

    lines.push('## Winner\n');
    lines.push(`**${report.winner.winner.toUpperCase()}** (Confidence: ${report.winner.confidence})\n`);
    lines.push(`Points: Baseline ${report.winner.points.baseline}, Variant ${report.winner.points.variant}\n`);

    lines.push('## Recommendations\n');
    report.recommendations.forEach(rec => {
      lines.push(`- ${rec}`);
    });

    return lines.join('\n');
  }
}

/**
 * Quick comparison helper
 *
 * Convenience function for CLI usage.
 *
 * @param {string} baselinePath - Baseline prompt path
 * @param {string} variantPath - Variant prompt path
 * @param {string} photosDir - Photos directory
 * @param {Object} options - Test options
 * @returns {Promise<Object>} Comparison report
 */
export async function comparePrompts(baselinePath, variantPath, photosDir, options = {}) {
  const tester = new PromptVariantTester(options);
  tester.loadPrompts(baselinePath, variantPath);
  return await tester.runComparison(photosDir);
}
