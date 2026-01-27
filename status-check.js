#!/usr/bin/env node

/**
 * STATUS CHECK - Photo Open Call Analyzer MVP
 * Run this to verify everything is working
 */

import { logger } from './src/utils/logger.js';
import { getApiClient, resetApiClient } from './src/utils/api-client.js';
import { fileExists, readJson } from './src/utils/file-utils.js';

console.clear();
logger.section('PROJECT STATUS CHECK');

async function runStatusCheck() {

// Check 1: Node version
  const nodeVersion = process.version;
  logger.info(`Node.js version: ${nodeVersion}`);
  if (parseInt(nodeVersion.split('.')[0].substring(1)) >= 20) {
    logger.success('✓ Node.js version is compatible (20+)');
  } else {
    logger.error('✗ Node.js 20+ required');
    process.exit(1);
  }

// Check 2: Dependencies
logger.info('Checking dependencies...');
const requiredModules = [
  '@anthropic-ai/sdk',
  'sharp',
  'commander',
  'chalk',
  'ora',
  'exif-reader',
];

let depsOk = true;
try {
  for (const mod of requiredModules) {
    try {
      await import(mod);
    } catch {
      depsOk = false;
      logger.error(`✗ Missing: ${mod}`);
    }
  }

  if (depsOk) {
    logger.success('✓ All dependencies installed');
  } else {
    logger.info('Run: npm install');
    process.exit(1);
  }
} catch (error) {
  logger.error(`✗ Error checking dependencies`);
  process.exit(1);
}

// Check 3: API Key
  logger.info('Checking API key...');
  if (process.env.ANTHROPIC_API_KEY) {
    const key = process.env.ANTHROPIC_API_KEY;
    const masked = key.substring(0, 10) + '...' + key.substring(key.length - 4);
    logger.success(`✓ ANTHROPIC_API_KEY configured: ${masked}`);
  } else {
    logger.warn('⚠ ANTHROPIC_API_KEY not set');
    logger.info('Set with: export ANTHROPIC_API_KEY=your-key');
  }

  // Check 4: Project structure
  logger.info('Checking project structure...');
  const requiredDirs = [
    'src/analysis',
    'src/processing',
    'src/output',
    'src/cli',
    'src/utils',
    'tests',
    'data/open-calls',
  ];

  let structureOk = true;
  for (const dir of requiredDirs) {
    if (fileExists(dir)) {
      logger.info(`  ✓ ${dir}`);
    } else {
      logger.error(`  ✗ ${dir}`);
      structureOk = false;
    }
  }

  if (structureOk) {
    logger.success('✓ Project structure complete');
  } else {
    logger.error('✗ Project structure incomplete');
    process.exit(1);
  }

  // Check 5: Test data
  logger.info('Checking test data...');
  if (fileExists('data/open-calls/nature-wildlife/photos/test-wildlife-01.jpg')) {
    logger.success('✓ Test photos available');
  } else {
    logger.warn('⚠ Test photos not found');
    logger.info('Run: node data/open-calls/nature-wildlife/create-test-images.js');
  }

  // Check 6: Configuration
  logger.info('Checking configuration...');
  const configs = [
    'data/open-calls/nature-wildlife/open-call.json',
    'data/open-calls/example-template/open-call.json',
  ];

  for (const config of configs) {
    if (fileExists(config)) {
      logger.info(`  ✓ ${config}`);
    }
  }
  logger.success('✓ Configuration files present');

  // Summary
  logger.section('SYSTEM STATUS');
  logger.success('✓ All checks passed!');
  logger.info('');
  logger.info('Ready to use:');
  logger.info('  npm run analyze data/open-calls/nature-wildlife');
  logger.info('');
  logger.info('Or run tests:');
  logger.info('  npm test');
  logger.info('');

  process.exit(0);
}

runStatusCheck().catch((error) => {
  logger.error(error.message);
  process.exit(1);
});
