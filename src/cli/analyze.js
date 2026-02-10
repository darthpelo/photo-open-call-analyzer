#!/usr/bin/env node

import { Command } from 'commander';
import { analyzePhoto } from '../analysis/photo-analyzer.js';
import { processBatch, validatePhotos } from '../processing/batch-processor.js';
import { aggregateScores, integrateSmartTiering } from '../analysis/score-aggregator.js';
import { exportReports } from '../output/report-generator.js';
import { displayTierSummary, displayTierDetails, displayTierRecommendations } from './tier-display.js';
import { generateAnalysisPrompt } from '../analysis/prompt-generator.js';
import { analyzeSet, analyzeSetWithTimeout } from '../analysis/set-analyzer.js';
import { aggregateSetScores, rankSets } from '../analysis/set-score-aggregator.js';
import { selectCandidateSets, countCombinations } from '../processing/combination-generator.js';
import { exportSetReports } from '../output/set-report-generator.js';
import { logger } from '../utils/logger.js';
import { readJson, fileExists, writeJson, projectPath, resolveOutputDir, resolvePhotoSelection } from '../utils/file-utils.js';
import { SUPPORTED_FORMATS } from '../processing/photo-validator.js';
import { loadOpenCallConfig, formatValidationErrors } from '../config/validator.js';
import { validateProjectPrompt } from '../validation/prompt-quality-validator.js';
import { comparePrompts } from '../validation/ab-testing-framework.js';
import { runInitWizard } from './init-wizard.js';
import { join, basename } from 'path';
import ora from 'ora';

const program = new Command();

program.name('photo-analyzer').description('AI-powered photo analysis for photography competitions').version('1.0.0');

/**
 * Project initialization wizard (FR-3.4)
 */
program
  .command('init [project-name]')
  .description('Create a new open call project with guided setup')
  .option('-t, --template <type>', 'Use template (portrait, landscape, conceptual, street, custom)')
  .option('--non-interactive', 'Skip interactive prompts (requires --template)')
  .action(async (projectName, options) => {
    try {
      if (options.nonInteractive && !options.template) {
        logger.error('--non-interactive requires --template option');
        process.exit(1);
      }

      const result = await runInitWizard({
        projectName,
        template: options.template,
        interactive: !options.nonInteractive
      });

      if (!result.success) {
        process.exit(1);
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
 * Main analyze command
 */
program
  .command('analyze <project-dir>')
  .description('Analyze photos in a project directory')
  .option('-o, --output <dir>', 'Output directory for results (relative to project)', 'results')
  .option('-p, --parallel <n>', 'Number of parallel analyses', '3')
  .option('--skip-prompt', 'Skip prompt generation (use existing)')
  .option('--checkpoint-interval <n>', 'Save checkpoint every N photos (1-50)', '10')
  .option('--clear-checkpoint', 'Clear existing checkpoint before starting')
  .option('--photo-timeout <seconds>', 'Timeout per photo analysis in seconds (30-300)', '60')
  .option('--show-tiers', 'Display tier breakdown in terminal')
  .option('--analysis-mode <mode>', 'Analysis mode: single, multi, or auto (default: auto)', 'auto')
  .action(async (projectDir, options) => {
    try {
      logger.section('PHOTO ANALYSIS');

      // Validate photo timeout (FR-2.3)
      const photoTimeout = parseInt(options.photoTimeout, 10) * 1000; // Convert to milliseconds
      if (isNaN(photoTimeout) || photoTimeout < 30000 || photoTimeout > 300000) {
        logger.error('Invalid --photo-timeout value. Must be between 30 and 300 seconds.');
        process.exit(1);
      }

      // Check project structure
      const photosDir = join(projectDir, 'photos');
      const promptFile = join(projectDir, 'analysis-prompt.json');
      const configFile = join(projectDir, 'open-call.json');

      if (!fileExists(photosDir)) {
        logger.error(`Photos directory not found: ${photosDir}`);
        process.exit(1);
      }

      if (!fileExists(configFile)) {
        logger.error(`Configuration file not found: ${configFile}`);
        logger.info('Please create open-call.json with competition details');
        logger.info('Use: npm run analyze validate <project-dir> --config');
        process.exit(1);
      }

      // Validate configuration
      logger.info('Validating configuration...');
      const configResult = await loadOpenCallConfig(configFile);

      if (!configResult.success) {
        logger.error('Configuration validation failed:');
        const formattedErrors = formatValidationErrors(configResult.validation.errors);
        console.log(formattedErrors);
        process.exit(1);
      }

      const config = configResult.data;

      // Load or generate analysis prompt
      let analysisPrompt;

      if (fileExists(promptFile) && options.skipPrompt) {
        logger.info('Loading existing analysis prompt');
        analysisPrompt = readJson(promptFile);
      } else {
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

      // Parse and validate checkpoint interval
      const checkpointInterval = Math.max(1, Math.min(50, parseInt(options.checkpointInterval) || 10));
      if (checkpointInterval !== parseInt(options.checkpointInterval)) {
        logger.warn(`Checkpoint interval clamped to valid range: ${checkpointInterval}`);
      }

      // Resolve output directory relative to project (FR-3.12)
      const outputDir = resolveOutputDir(projectDir, options.output);
      logger.info(`Results will be saved to: ${outputDir}`);

      const batchResults = await processBatch(
        photosDir,
        analysisPrompt,
        {
          outputDir,
          parallel: parseInt(options.parallel),
          checkpointInterval,
          clearCheckpoint: options.clearCheckpoint || false,
          photoTimeout, // Pass timeout to batch processor (FR-2.3)
          analysisMode: options.analysisMode // Pass analysis mode (FR-2.4 Phase 2)
        },
        config  // Pass config for checkpoint validation
      );

      spinner.stop();

      if (!batchResults.success) {
        logger.warn(`${batchResults.failed} photos failed to process`);
      }

      // DEBUG: Log structure of batchResults
      logger.debug(`batchResults keys: ${Object.keys(batchResults).join(', ')}`);
      logger.debug(`batchResults.results type: ${typeof batchResults.results}, length: ${Array.isArray(batchResults.results) ? batchResults.results.length : 'N/A'}`);

      // Aggregate scores
      logger.section('AGGREGATION');
      const successfulResults = batchResults.results
        .filter((r) => r.success)
        .map((r) => ({
          photoPath: r.photo,
          scores: r.scores
        }));

      if (!Array.isArray(successfulResults)) {
        logger.error(`Error: successfulResults is not an array. Type: ${typeof successfulResults}, Value: ${JSON.stringify(successfulResults)}`);
        process.exit(1);
      }

      if (successfulResults.length === 0) {
        logger.error('No successful analyses to aggregate');
        process.exit(1);
      }

      const aggregation = aggregateScores(successfulResults, analysisPrompt.criteria || []);
      const smartTiers = integrateSmartTiering(aggregation);

      // Generate and export reports
      logger.section('REPORT GENERATION');
      exportReports(outputDir, aggregation, aggregation.tiers, aggregation.statistics, {
        formats: ['markdown', 'json', 'csv'],
        basename: 'photo-analysis',
        title: `${analysisPrompt.title} - Analysis Report`,
        theme: analysisPrompt.theme,
        smartTiers: smartTiers, // Pass tier data for tier-specific reports (M3)
        failedPhotos: batchResults.failedPhotos || [] // Include failed photos in reports (FR-2.3)
      });

      // Summary
      logger.section('SUMMARY');
      logger.info(`Total photos: ${aggregation.total_photos}`);
      logger.info(`Successfully analyzed: ${successfulResults.length}`);
      if (batchResults.failedPhotos && batchResults.failedPhotos.length > 0) {
        logger.warn(`Failed to analyze: ${batchResults.failedPhotos.length}`);
      }
      logger.info(`Average score: ${aggregation.statistics.average}/10`);
      logger.info(`Score range: ${aggregation.statistics.min.toFixed(1)} - ${aggregation.statistics.max.toFixed(1)}`);

      // Display tier breakdown if requested
      if (options.showTiers && smartTiers) {
        logger.section('TIER BREAKDOWN');
        displayTierSummary(smartTiers);
        displayTierDetails(smartTiers);
        displayTierRecommendations(smartTiers);
      }

      logger.success(`Analysis complete! Results saved to: ${outputDir}`);
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
  .description('Validate photos in a directory or open-call.json configuration')
  .option('--config', 'Validate open-call.json configuration instead of photos')
  .action(async (directory, options) => {
    try {
      logger.section('VALIDATION');

      if (options.config) {
        // Validate configuration file
        const configPath = join(directory, 'open-call.json');

        if (!fileExists(configPath)) {
          logger.error(`Configuration file not found: ${configPath}`);
          logger.info('Expected location: <project-dir>/open-call.json');
          process.exit(1);
        }

        const result = await loadOpenCallConfig(configPath);

        if (!result.validation.valid) {
          logger.error('Configuration validation failed:');
          const formattedErrors = formatValidationErrors(result.validation.errors);
          console.log(formattedErrors);
          process.exit(1);
        }

        logger.success('✅ Configuration is valid!');
        logger.info(`Title: ${result.data.title}`);
        logger.info(`Theme: ${result.data.theme}`);
        logger.info(`Jury members: ${result.data.jury.length}`);
        if (result.data.customCriteria) {
          logger.info(`Custom criteria: ${result.data.customCriteria.length}`);
        }
      } else {
        // Validate photos
        const results = validatePhotos(directory);
        logger.success(`Validation complete: ${results.valid.length} valid photos`);
      }
    } catch (error) {
      logger.error(error.message);
      process.exit(1);
    }
  });

/**
 * Validate analysis prompt quality (FR-2.4 Phase 3)
 */
program
  .command('validate-prompt <project-dir>')
  .description('Validate quality of generated analysis prompt')
  .option('--verbose', 'Show detailed validation information')
  .option('--no-auto-fix', 'Disable automatic fixes')
  .action(async (projectDir, options) => {
    try {
      logger.section('PROMPT QUALITY VALIDATION');

      const result = await validateProjectPrompt(projectDir, {
        verbose: options.verbose || false,
        autoFix: options.autoFix !== false
      });

      if (!result.valid) {
        process.exit(1);
      }

      logger.success('✅ Prompt quality validation passed!');
    } catch (error) {
      logger.error(error.message);
      if (process.env.NODE_ENV === 'development') {
        console.error(error);
      }
      process.exit(1);
    }
  });

/**
 * A/B test prompt variants (FR-2.4 Phase 3 Story 3.2)
 */
program
  .command('test-prompt')
  .description('A/B test two prompt variants on a photo sample')
  .requiredOption('--baseline <path>', 'Path to baseline prompt JSON')
  .requiredOption('--variant <path>', 'Path to variant prompt JSON')
  .requiredOption('--photos <dir>', 'Directory containing photos')
  .option('--sample <n>', 'Number of photos to test (default: 3)', '3')
  .option('--output <path>', 'Output path for report (default: ./ab-test-report.json)', './ab-test-report.json')
  .option('--timeout <seconds>', 'Timeout per photo in seconds (default: 60)', '60')
  .action(async (options) => {
    try {
      logger.section('A/B TESTING');

      const sampleSize = parseInt(options.sample, 10);
      const timeout = parseInt(options.timeout, 10) * 1000;

      if (isNaN(sampleSize) || sampleSize < 1 || sampleSize > 50) {
        logger.error('Sample size must be between 1 and 50');
        process.exit(1);
      }

      logger.info(`Comparing prompts on ${sampleSize} photos`);
      logger.info(`Baseline: ${options.baseline}`);
      logger.info(`Variant:  ${options.variant}`);

      const report = await comparePrompts(
        options.baseline,
        options.variant,
        options.photos,
        {
          sample: sampleSize,
          timeout,
          analysisMode: 'single' // Use single-stage for speed
        }
      );

      // Display summary
      logger.section('RESULTS');
      logger.info(`Winner: ${report.winner.winner.toUpperCase()} (confidence: ${report.winner.confidence})`);
      logger.info(`Baseline avg: ${report.baseline.avgScore}, Variant avg: ${report.variant.avgScore}`);
      logger.info(`Score delta: ${report.comparison.scoreDelta > 0 ? '+' : ''}${report.comparison.scoreDelta}`);

      console.log('\nRecommendations:');
      report.recommendations.forEach(rec => console.log(`  ${rec}`));

      // Export report
      writeJson(options.output, report);
      logger.success(`Full report saved to: ${options.output}`);

    } catch (error) {
      logger.error(error.message);
      if (process.env.NODE_ENV === 'development') {
        console.error(error);
      }
      process.exit(1);
    }
  });

/**
 * Analyze a specific set of photos as a group (FR-3.11)
 */
program
  .command('analyze-set <project-dir>')
  .description('Analyze a predefined set of photos as a cohesive group (Polaroid mode)')
  .option('--photos [paths...]', 'Photo filenames or glob patterns (omit to auto-select if count matches set size)')
  .option('-o, --output <dir>', 'Output directory for results (relative to project)', 'results')
  .option('--skip-individual', 'Skip individual analysis (use existing results)')
  .option('--timeout <seconds>', 'Timeout per analysis in seconds (30-300)', '120')
  .action(async (projectDir, options) => {
    try {
      logger.section('SET ANALYSIS (Polaroid Mode)');

      const configFile = join(projectDir, 'open-call.json');
      const photosDir = join(projectDir, 'photos');
      const promptFile = join(projectDir, 'analysis-prompt.json');

      if (!fileExists(configFile)) {
        logger.error(`Configuration file not found: ${configFile}`);
        process.exit(1);
      }

      // Load and validate config
      const configResult = await loadOpenCallConfig(configFile);
      if (!configResult.success) {
        logger.error('Configuration validation failed:');
        console.log(formatValidationErrors(configResult.validation.errors));
        process.exit(1);
      }

      const config = configResult.data;
      const setConfig = config.setMode || { enabled: true, setSize: 4 };

      if (!setConfig.setCriteria) {
        const { getDefaultSetCriteria } = await import('../analysis/set-prompt-builder.js');
        setConfig.setCriteria = getDefaultSetCriteria();
      }

      // Resolve photo selection (FR-3.13: Smart Defaults + Glob Patterns)
      const expectedSize = setConfig.setSize || 4;
      const selection = resolvePhotoSelection({
        photosDir,
        photoArgs: options.photos,
        setSize: expectedSize,
        supportedFormats: SUPPORTED_FORMATS
      });

      if (!selection.success) {
        logger.error(selection.error);
        process.exit(1);
      }

      const modeLabel = {
        'smart-default': 'Auto-selected (all photos in directory)',
        'glob': 'Matched via glob pattern(s)',
        'explicit': 'Explicitly specified'
      };
      logger.info(`Photo selection: ${modeLabel[selection.mode]}`);
      logger.info(`Selected ${selection.filenames.length} photos: ${selection.filenames.join(', ')}`);

      if (selection.filenames.length !== expectedSize) {
        logger.warn(`Expected ${expectedSize} photos for set, got ${selection.filenames.length}`);
      }

      const photoPaths = selection.photos;

      // Load or generate analysis prompt
      let analysisPrompt;
      if (fileExists(promptFile)) {
        analysisPrompt = readJson(promptFile);
      } else {
        logger.info('Generating analysis prompt...');
        analysisPrompt = await generateAnalysisPrompt(config);
        writeJson(promptFile, analysisPrompt);
      }

      // Phase 1: Individual analysis (unless skipped)
      let individualResults = [];
      if (!options.skipIndividual) {
        logger.section('INDIVIDUAL ANALYSIS');
        for (const photoPath of photoPaths) {
          const spinner = ora(`Analyzing ${basename(photoPath)}...`).start();
          try {
            const result = await analyzePhoto(photoPath, analysisPrompt);
            const score = result.scores?.summary?.weighted_average || result.scores?.summary?.average || 0;
            individualResults.push({
              filename: basename(photoPath),
              score,
              scores: result.scores
            });
            spinner.succeed(`${basename(photoPath)}: ${score.toFixed(1)}/10`);
          } catch (err) {
            spinner.fail(`${basename(photoPath)}: failed (${err.message})`);
            individualResults.push({ filename: basename(photoPath), score: 0 });
          }
        }
      } else {
        // Try to load from existing results
        const resultsFile = join(projectDir, 'results', 'batch-results.json');
        if (fileExists(resultsFile)) {
          const batchResults = readJson(resultsFile);
          const photoNames = options.photos.map(p => basename(p));
          individualResults = (batchResults.results || [])
            .filter(r => r.success && photoNames.includes(basename(r.photo)))
            .map(r => ({
              filename: basename(r.photo),
              score: r.scores?.summary?.weighted_average || r.scores?.summary?.average || 0,
              scores: r.scores
            }));
        }
        logger.info(`Loaded ${individualResults.length} existing individual results`);
      }

      // Phase 2: Set analysis
      logger.section('SET-LEVEL ANALYSIS');
      const timeout = parseInt(options.timeout, 10) * 1000;
      const spinner = ora('Analyzing photo set coherence...').start();

      const setResult = await analyzeSetWithTimeout(
        photoPaths, analysisPrompt, setConfig,
        { timeout },
        individualResults
      );

      if (!setResult.success) {
        spinner.fail(setResult.timedOut ? 'Set analysis timed out' : `Set analysis failed: ${setResult.error}`);
        process.exit(1);
      }

      spinner.succeed('Set analysis complete');

      // Aggregate scores
      const aggregated = aggregateSetScores(individualResults, setResult.data, setConfig);

      // Display results
      logger.section('SET RESULTS');
      logger.info(`Composite Score: ${aggregated.compositeScore.toFixed(2)}/10`);
      logger.info(`  Individual Average: ${aggregated.individualAverage.toFixed(2)}/10 (weight: ${aggregated.individualWeight}%)`);
      logger.info(`  Set Score: ${aggregated.setWeightedAverage.toFixed(2)}/10 (weight: ${aggregated.setWeight}%)`);
      logger.info(`Recommendation: ${aggregated.recommendation}`);

      if (aggregated.suggestedOrder.length > 0) {
        logger.info(`Suggested viewing order: ${aggregated.suggestedOrder.join(', ')}`);
      }

      // Set criteria scores
      logger.section('SET CRITERIA SCORES');
      for (const [name, data] of Object.entries(aggregated.setScores)) {
        logger.info(`  ${name}: ${data.score}/10 (${data.weight}%)`);
        if (data.reasoning) {
          logger.info(`    ${data.reasoning}`);
        }
      }

      // Export reports (FR-3.12: timestamped output directory)
      const outputDir = resolveOutputDir(projectDir, options.output);
      exportSetReports(outputDir, [aggregated], null, setConfig, {
        title: analysisPrompt.title,
        theme: analysisPrompt.theme
      });

      logger.success(`Set analysis complete! Results saved to: ${outputDir}`);
    } catch (error) {
      logger.error(error.message);
      if (process.env.NODE_ENV === 'development') {
        console.error(error);
      }
      process.exit(1);
    }
  });

/**
 * Suggest optimal photo sets from analyzed photos (FR-3.11)
 */
program
  .command('suggest-sets <project-dir>')
  .description('Find optimal photo sets from previously analyzed photos')
  .option('-n, --top <n>', 'Number of top sets to suggest', '5')
  .option('-o, --output <dir>', 'Output directory for results (relative to project)', 'results')
  .option('--skip-vision', 'Skip vision-based set evaluation (use pre-scoring only)')
  .option('--max-candidates <n>', 'Max sets to evaluate with vision model', '10')
  .option('--timeout <seconds>', 'Timeout per set evaluation in seconds (30-300)', '120')
  .action(async (projectDir, options) => {
    try {
      logger.section('SET SUGGESTION (Polaroid Mode)');

      const configFile = join(projectDir, 'open-call.json');
      const resultsFile = join(projectDir, 'results', 'batch-results.json');
      const promptFile = join(projectDir, 'analysis-prompt.json');

      if (!fileExists(configFile)) {
        logger.error(`Configuration file not found: ${configFile}`);
        process.exit(1);
      }

      if (!fileExists(resultsFile)) {
        logger.error(`No batch results found. Run 'analyze' first.`);
        logger.info(`Expected: ${resultsFile}`);
        process.exit(1);
      }

      // Load config
      const configResult = await loadOpenCallConfig(configFile);
      if (!configResult.success) {
        logger.error('Configuration validation failed:');
        console.log(formatValidationErrors(configResult.validation.errors));
        process.exit(1);
      }

      const config = configResult.data;
      const setConfig = config.setMode || { enabled: true, setSize: 4 };
      const setSize = setConfig.setSize || 4;

      if (!setConfig.setCriteria) {
        const { getDefaultSetCriteria } = await import('../analysis/set-prompt-builder.js');
        setConfig.setCriteria = getDefaultSetCriteria();
      }

      // Load analysis prompt
      let analysisPrompt;
      if (fileExists(promptFile)) {
        analysisPrompt = readJson(promptFile);
      } else {
        analysisPrompt = { title: config.title, theme: config.theme };
      }

      // Load individual results
      const batchResults = readJson(resultsFile);
      const rankedPhotos = (batchResults.results || [])
        .filter(r => r.success)
        .map(r => {
          const score = r.scores?.summary?.weighted_average || r.scores?.summary?.average || 0;
          const scores = {};
          if (r.scores?.individual) {
            for (const [name, data] of Object.entries(r.scores.individual)) {
              scores[name] = data.score || 0;
            }
          }
          return {
            filename: basename(r.photo),
            path: r.photo,
            score,
            scores
          };
        })
        .sort((a, b) => b.score - a.score);

      if (rankedPhotos.length < setSize) {
        logger.error(`Need at least ${setSize} analyzed photos, found ${rankedPhotos.length}`);
        process.exit(1);
      }

      const totalCombos = countCombinations(rankedPhotos.length, setSize);
      logger.info(`Found ${rankedPhotos.length} analyzed photos`);
      logger.info(`Set size: ${setSize} photos`);
      logger.info(`Total possible combinations: ${totalCombos}`);

      // Phase 1: Pre-filter and score combinations
      logger.section('CANDIDATE SELECTION');
      const maxCandidates = parseInt(options.maxCandidates, 10);
      const preFilterTopN = Math.min(rankedPhotos.length, 12);

      const spinner = ora(`Pre-scoring combinations from top ${preFilterTopN} photos...`).start();
      const candidates = selectCandidateSets(rankedPhotos, setSize, {
        maxSetsToEvaluate: maxCandidates,
        preFilterTopN
      });
      spinner.succeed(`Selected ${candidates.length} candidate sets`);

      // Phase 2: Vision-based evaluation (unless skipped)
      const topN = parseInt(options.top, 10);
      let evaluatedSets = [];

      if (!options.skipVision) {
        logger.section('SET EVALUATION');
        const timeout = parseInt(options.timeout, 10) * 1000;
        const setsToEvaluate = candidates.slice(0, maxCandidates);

        for (let i = 0; i < setsToEvaluate.length; i++) {
          const candidate = setsToEvaluate[i];
          const photoNames = candidate.photos.map(p => p.filename).join(', ');
          const evalSpinner = ora(`[${i + 1}/${setsToEvaluate.length}] Evaluating: ${photoNames}`).start();

          const photoPaths = candidate.photos.map(p => {
            if (p.path) return p.path;
            return join(projectDir, 'photos', p.filename);
          });

          const setResult = await analyzeSetWithTimeout(
            photoPaths, analysisPrompt, setConfig,
            { timeout },
            candidate.photos
          );

          if (setResult.success) {
            const aggregated = aggregateSetScores(candidate.photos, setResult.data, setConfig);
            aggregated.setId = `set-${i + 1}`;
            evaluatedSets.push(aggregated);
            evalSpinner.succeed(`Set ${i + 1}: ${aggregated.compositeScore.toFixed(2)}/10 - ${aggregated.recommendation}`);
          } else {
            evalSpinner.fail(`Set ${i + 1}: ${setResult.timedOut ? 'timeout' : setResult.error}`);
          }
        }
      } else {
        // Use pre-scores without vision evaluation
        evaluatedSets = candidates.slice(0, topN).map((c, i) => ({
          setId: `set-${i + 1}`,
          compositeScore: c.preScore / setSize,
          individualAverage: c.sumIndividualScore / setSize,
          setWeightedAverage: 0,
          photos: c.photos,
          recommendation: 'Pre-scored (no vision evaluation)',
          setScores: {},
          suggestedOrder: [],
          photoRoles: {}
        }));
      }

      if (evaluatedSets.length === 0) {
        logger.error('No sets were successfully evaluated');
        process.exit(1);
      }

      // Rank and display
      const ranked = rankSets(evaluatedSets);

      logger.section('TOP SETS');
      ranked.ranking.slice(0, topN).forEach(set => {
        const photos = set.photos.map(p => p.filename).join(', ');
        logger.info(`#${set.rank} [${set.compositeScore.toFixed(2)}/10] ${photos}`);
        if (set.recommendation) {
          logger.info(`   Recommendation: ${set.recommendation}`);
        }
      });

      // Statistics
      if (ranked.statistics.total > 1) {
        logger.section('STATISTICS');
        logger.info(`Sets evaluated: ${ranked.statistics.total}`);
        logger.info(`Average score: ${ranked.statistics.average.toFixed(2)}`);
        logger.info(`Score range: ${ranked.statistics.min.toFixed(2)} - ${ranked.statistics.max.toFixed(2)}`);
      }

      // Export reports (FR-3.12: timestamped output directory)
      const outputDir = resolveOutputDir(projectDir, options.output);
      exportSetReports(outputDir, ranked.ranking, ranked.statistics, setConfig, {
        title: analysisPrompt.title,
        theme: analysisPrompt.theme
      });

      logger.success(`Set suggestions saved to: ${outputDir}`);
    } catch (error) {
      logger.error(error.message);
      if (process.env.NODE_ENV === 'development') {
        console.error(error);
      }
      process.exit(1);
    }
  });

program.on('command:*', (unknownCommand) => {
  logger.error(`Unknown command: ${unknownCommand[0]}`);
  logger.info("Did you mean 'npm run analyze <command>'?");
  logger.info("Available commands: init, analyze, analyze-single, analyze-set, suggest-sets, validate, validate-prompt, test-prompt");
  process.exit(1);
});

program.parse(process.argv);
