import { aggregateScores, generateTiers, generateStatistics } from '../src/analysis/score-aggregator.js';
import { exportReports } from '../src/output/report-generator.js';
import { logger } from '../src/utils/logger.js';
import { mkdir } from 'fs/promises';

/**
 * Test the complete workflow with mock data
 */
async function runWorkflowTest() {
  logger.section('WORKFLOW TEST - Mock Analysis');

  // Create output directory
  const outputDir = './results-test';
  await mkdir(outputDir, { recursive: true });

  // Mock analyses (simulating Claude API results)
  const mockAnalyses = [
    {
      photoPath: './data/open-calls/nature-wildlife/photos/test-wildlife-01.jpg',
      scores: {
        individual: {
          'Theme Alignment': { score: 9, weight: 30 },
          'Technical Quality': { score: 8, weight: 20 },
          Originality: { score: 8, weight: 25 },
          'Emotional Impact': { score: 9, weight: 15 },
          'Jury Fit': { score: 7, weight: 10 },
        },
        summary: {
          weighted_average: 8.3,
          average: 8.2,
          recommendation: 'Strong Yes',
        },
      },
    },
    {
      photoPath: './data/open-calls/nature-wildlife/photos/test-wildlife-02.jpg',
      scores: {
        individual: {
          'Theme Alignment': { score: 7, weight: 30 },
          'Technical Quality': { score: 7, weight: 20 },
          Originality: { score: 6, weight: 25 },
          'Emotional Impact': { score: 7, weight: 15 },
          'Jury Fit': { score: 6, weight: 10 },
        },
        summary: {
          weighted_average: 6.8,
          average: 6.6,
          recommendation: 'Maybe',
        },
      },
    },
  ];

  const criteria = [
    { name: 'Theme Alignment', weight: 30 },
    { name: 'Technical Quality', weight: 20 },
    { name: 'Originality', weight: 25 },
    { name: 'Emotional Impact', weight: 15 },
    { name: 'Jury Fit', weight: 10 },
  ];

  logger.info('Aggregating scores...');
  const aggregation = aggregateScores(mockAnalyses, criteria);

  logger.info('Generating tiers...');
  const tiers = generateTiers(aggregation);

  logger.info('Computing statistics...');
  const stats = generateStatistics(aggregation);

  logger.info('Exporting reports...');
  exportReports(outputDir, aggregation, tiers, stats, {
    formats: ['markdown', 'json', 'csv'],
    basename: 'photo-analysis-test',
    title: 'Nature Wildlife Open Call - Test Analysis',
    theme: 'Wildlife in Natural Habitat',
  });

  logger.section('RESULTS SUMMARY');
  logger.success(`✓ Total photos analyzed: ${aggregation.total_photos}`);
  logger.info(`✓ Average score: ${stats.average}/10`);
  logger.info(`✓ Score range: ${stats.min.toFixed(1)} - ${stats.max.toFixed(1)}`);
  logger.info(`✓ Std deviation: ${stats.std_dev.toFixed(2)}`);

  logger.success(`✓ Reports generated in: ${outputDir}`);

  return {
    success: true,
    aggregation,
    tiers,
    stats,
  };
}

// Run the test
runWorkflowTest().catch((error) => {
  logger.error(error.message);
  process.exit(1);
});
