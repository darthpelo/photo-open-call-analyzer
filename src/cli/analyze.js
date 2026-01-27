#!/usr/bin/env node

import { Command } from 'commander';
import { analyzePhoto } from '../analysis/photo-analyzer.js';
import { processBatch, validatePhotos } from '../processing/batch-processor.js';
import { aggregateScores, generateTiers, generateStatistics } from '../analysis/score-aggregator.js';
import { exportReports } from '../output/report-generator.js';
import { generateAnalysisPrompt } from '../analysis/prompt-generator.js';
import { logger } from '../utils/logger.js';
import { readJson, fileExists, writeJson, projectPath } from '../utils/file-utils.js';
import { join } from 'path';
import ora from 'ora';

const program = new Command();

program.name('photo-analyzer').description('AI-powered photo analysis for photography competitions').version('1.0.0');

/**
 * Main analyze command
 */
program
  .command('analyze <project-dir>')
  .description('Analyze photos in a project directory')
  .option('-o, --output <dir>', 'Output directory for results', './results')
  .option('-p, --parallel <n>', 'Number of parallel analyses', '3')
  .option('--skip-prompt', 'Skip prompt generation (use existing)')
  .action(async (projectDir, options) => {
    try {
      logger.section('PHOTO ANALYSIS');

      // Check project structure
      const photosDir = join(projectDir, 'photos');
      const promptFile = join(projectDir, 'analysis-prompt.json');

      if (!fileExists(photosDir)) {
        logger.error(`Photos directory not found: ${photosDir}`);
        process.exit(1);
      }

      // Load or generate analysis prompt
      let analysisPrompt;

      if (fileExists(promptFile) && options.skipPrompt) {
        logger.info('Loading existing analysis prompt');
        analysisPrompt = readJson(promptFile);
      } else {
        const configFile = join(projectDir, 'open-call.json');
        if (!fileExists(configFile)) {
          logger.error(`Configuration file not found: ${configFile}`);
          logger.info('Please create open-call.json with competition details');
          process.exit(1);
        }

        const config = readJson(configFile);
        logger.info(`Generating analysis prompt for: ${config.title}`);
        analysisPrompt = await generateAnalysisPrompt(config);

        // Save generated prompt
        writeJson(promptFile, analysisPrompt);
        logger.success(`Prompt saved to: ${promptFile}`);
      }

      // Validate photos
      logger.section('VALIDATION');
      const validation = validatePhotos(photosDir);

      if (validation.valid.length === 0) {
        logger.error('No valid photos found');
        process.exit(1);
      }

      // Process batch
      logger.section('BATCH PROCESSING');
      const spinner = ora('Processing photos...').start();

      const batchResults = await processBatch(photosDir, analysisPrompt, {
        outputDir: options.output,
        parallel: parseInt(options.parallel),
      });

      spinner.stop();

      if (!batchResults.success) {
        logger.warn(`${batchResults.failed} photos failed to process`);
      }

      // Aggregate scores
      logger.section('AGGREGATION');
      const successfulResults = batchResults.results
        .filter((r) => r.success)
        .map((r) => r.data);

      if (successfulResults.length === 0) {
        logger.error('No successful analyses to aggregate');
        process.exit(1);
      }

      const aggregation = aggregateScores(successfulResults, analysisPrompt.criteria);
      const tiers = generateTiers(aggregation);
      const stats = generateStatistics(aggregation);

      // Generate and export reports
      logger.section('REPORT GENERATION');
      exportReports(options.output, aggregation, tiers, stats, {
        formats: ['markdown', 'json', 'csv'],
        basename: 'photo-analysis',
        title: `${analysisPrompt.title} - Analysis Report`,
        theme: analysisPrompt.theme,
      });

      // Summary
      logger.section('SUMMARY');
      logger.info(`Total photos: ${aggregation.total_photos}`);
      logger.info(`Successfully analyzed: ${successfulResults.length}`);
      logger.info(`Average score: ${stats.average}/10`);
      logger.info(`Score range: ${stats.min.toFixed(1)} - ${stats.max.toFixed(1)}`);

      logger.success(`Analysis complete! Results saved to: ${options.output}`);
    } catch (error) {
      logger.error(error.message);
      if (process.env.NODE_ENV === 'development') {
        console.error(error);
      }
      process.exit(1);
    }
  });

/**
 * Single photo analysis
 */
program
  .command('analyze-single <photo-path> [prompt-file]')
  .description('Analyze a single photo')
  .action(async (photoPath, promptFile) => {
    try {
      logger.section('SINGLE PHOTO ANALYSIS');

      let prompt = {
        title: 'Photo Analysis',
        theme: 'General Photography',
        criteria: [
          { name: 'Composition', weight: 25, description: 'Visual arrangement and balance' },
          { name: 'Technical Quality', weight: 25, description: 'Sharpness, exposure, color' },
          { name: 'Creativity', weight: 25, description: 'Originality and uniqueness' },
          { name: 'Impact', weight: 25, description: 'Emotional and visual impact' },
        ],
      };

      if (promptFile && fileExists(promptFile)) {
        prompt = readJson(promptFile);
      }

      const result = await analyzePhoto(photoPath, prompt);

      logger.success(`Photo analyzed: ${photoPath}`);
      logger.info(`Overall Score: ${result.scores.summary.weighted_average || result.scores.summary.average}/10`);

      // Print scores
      if (result.scores.individual) {
        logger.info('Criterion Scores:');
        Object.entries(result.scores.individual).forEach(([criterion, data]) => {
          logger.info(`  ${criterion}: ${data.score}/10`);
        });
      }

      // Print recommendation
      if (result.scores.summary.recommendation) {
        logger.info(`Recommendation: ${result.scores.summary.recommendation}`);
      }
    } catch (error) {
      logger.error(error.message);
      if (process.env.NODE_ENV === 'development') {
        console.error(error);
      }
      process.exit(1);
    }
  });

/**
 * Validate photos in directory
 */
program
  .command('validate <directory>')
  .description('Validate photos in a directory')
  .action((directory) => {
    try {
      logger.section('VALIDATION');
      const results = validatePhotos(directory);
      logger.success(`Validation complete: ${results.valid.length} valid photos`);
    } catch (error) {
      logger.error(error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
