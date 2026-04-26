/**
 * CLI discover command — Entry point for the conversational discovery flow.
 * Creates project scaffold and prints agent workflow instructions.
 * Part of Conversational Discovery Layer, Cycle 1 (T6).
 */

import { join } from 'path';
import { logger } from '../utils/logger.js';
import { sanitizeProjectName, validateDiscoverUrl, scaffoldDiscoverProject } from '../discovery/discovery-orchestrator.js';

const DATA_DIR = 'data/open-calls';

/**
 * Register the discover command with a Commander program.
 *
 * @param {import('commander').Command} program - Commander program instance
 */
export function registerDiscoverCommand(program) {
  program
    .command('discover <url>')
    .description('Discover and research an open call (conversational flow)')
    .option('--name <name>', 'Project name (auto-derived from URL if omitted)')
    .action(async (url, options) => {
      try {
        logger.section('DISCOVER OPEN CALL');

        // F1: Validate URL
        const urlCheck = validateDiscoverUrl(url);
        if (!urlCheck.valid) {
          logger.error(`Invalid URL: ${urlCheck.error}`);
          process.exit(1);
        }

        // F2: Sanitize project name
        const projectName = sanitizeProjectName(options.name || null, url);
        const projectDir = join(DATA_DIR, projectName);

        // Scaffold project
        const scaffold = scaffoldDiscoverProject(projectDir, url);
        if (!scaffold.success) {
          logger.error(scaffold.error);
          process.exit(1);
        }

        logger.success(`Project created: ${projectDir}`);
        logger.info(`Open call URL: ${url}`);
        logger.info('');
        logger.info('Discovery workflow — run these steps in Claude Code:');
        logger.info('');
        logger.info('  1. Research the open call (Sebastiano):');
        logger.info(`     "Research this open call: ${url}"`);
        logger.info(`     "Save the research brief to ${projectDir}/strategic/"`);
        logger.info('');
        logger.info('  2. Build evaluation config (Art Critic):');
        logger.info(`     "Configure the open call from ${projectDir}/strategic/research-brief.json"`);
        logger.info('');
        logger.info('  3. Generate Excire search prompts (Sebastiano):');
        logger.info(`     "Generate Excire prompts for ${projectDir}/"`);
        logger.info('');
        logger.info('  4. Search in Excire with the generated prompts');
        logger.info(`     Export photos to: ${projectDir}/photos/`);
        logger.info('');
        logger.info('  5. Run analysis:');
        logger.info(`     node src/cli/analyze.js analyze ${projectDir}/`);

      } catch (error) {
        logger.error(error.message);
        process.exit(1);
      }
    });
}
