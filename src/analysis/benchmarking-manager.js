/**
 * Benchmarking Manager Module (FR-4.2)
 *
 * Validates evaluator accuracy by comparing analysis results against
 * user-provided baselines with known expected scores. Generates drift
 * reports with OK/WARNING/CRITICAL thresholds.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, basename, extname } from 'path';
import { analyzePhoto } from './photo-analyzer.js';
import { getModelName } from '../utils/api-client.js';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * Validate baseline directory structure
 * @param {string} baselineDir - Path to baseline directory
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBaselineStructure(baselineDir) {
  const errors = [];

  if (!existsSync(baselineDir)) {
    return { valid: false, errors: ['Baseline directory does not exist'] };
  }

  const photosDir = join(baselineDir, 'photos');
  const scoresFile = join(baselineDir, 'expected-scores.json');

  if (!existsSync(photosDir)) {
    errors.push('Missing photos/ directory');
  } else {
    const photos = readdirSync(photosDir).filter(f =>
      IMAGE_EXTENSIONS.includes(extname(f).toLowerCase())
    );
    if (photos.length === 0) {
      errors.push('No photos found in photos/ directory');
    }
  }

  if (!existsSync(scoresFile)) {
    errors.push('Missing expected-scores.json file');
  } else {
    try {
      const scores = JSON.parse(readFileSync(scoresFile, 'utf-8'));
      if (!Array.isArray(scores)) {
        errors.push('expected-scores.json must be a JSON array of { photo, scores } objects');
      } else if (existsSync(photosDir)) {
        const photoFiles = readdirSync(photosDir);
        for (const entry of scores) {
          if (!photoFiles.includes(entry.photo)) {
            errors.push(`expected-scores.json references '${entry.photo}' but it's not in photos/`);
          }
        }
      }
    } catch {
      errors.push('expected-scores.json is not valid JSON');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Load baseline photos and expected scores
 * @param {string} baselineDir - Path to baseline directory
 * @returns {{ photos: string[], expectedScores: Array<{ photo: string, scores: Object }> }}
 */
export function loadBaseline(baselineDir) {
  const validation = validateBaselineStructure(baselineDir);
  if (!validation.valid) {
    throw new Error(`Invalid baseline: ${validation.errors.join(', ')}`);
  }

  const scoresFile = join(baselineDir, 'expected-scores.json');
  const expectedScores = JSON.parse(readFileSync(scoresFile, 'utf-8'));

  const photos = expectedScores.map(entry =>
    join(baselineDir, 'photos', entry.photo)
  );

  return { photos, expectedScores };
}

/**
 * Generate a drift report comparing actual vs expected scores
 * @param {Array<{ photo: string, scores: Object }>} actualScores - Actual analysis results
 * @param {Array<{ photo: string, scores: Object }>} expectedScores - Expected baseline scores
 * @returns {{ criteria: Object, overall_status: string, recommendations: string[] }}
 */
export function generateDriftReport(actualScores, expectedScores) {
  if (actualScores.length === 0 || expectedScores.length === 0) {
    return { criteria: {}, overall_status: 'OK', recommendations: [] };
  }

  // Collect all criteria names
  const allCriteria = new Set();
  for (const entry of expectedScores) {
    for (const key of Object.keys(entry.scores || {})) {
      allCriteria.add(key);
    }
  }

  const criteria = {};
  let worstStatus = 'OK';

  for (const criterion of allCriteria) {
    // Calculate averages
    const expectedValues = expectedScores
      .filter(e => e.scores[criterion] !== undefined)
      .map(e => e.scores[criterion]);

    const actualValues = actualScores
      .filter(a => a.scores[criterion] !== undefined)
      .map(a => a.scores[criterion]);

    if (expectedValues.length === 0 || actualValues.length === 0) continue;

    const expectedAvg = expectedValues.reduce((a, b) => a + b, 0) / expectedValues.length;
    const actualAvg = actualValues.reduce((a, b) => a + b, 0) / actualValues.length;
    const delta = Math.abs(actualAvg - expectedAvg);

    let status = 'OK';
    if (delta > 3.0) {
      status = 'CRITICAL';
    } else if (delta > 1.5) {
      status = 'WARNING';
    }

    criteria[criterion] = {
      expected_avg: expectedAvg,
      actual_avg: actualAvg,
      delta: Math.round(delta * 100) / 100,
      status
    };

    // Track worst status
    if (status === 'CRITICAL') worstStatus = 'CRITICAL';
    else if (status === 'WARNING' && worstStatus !== 'CRITICAL') worstStatus = 'WARNING';
  }

  // Generate recommendations
  const recommendations = [];
  for (const [name, data] of Object.entries(criteria)) {
    if (data.status === 'CRITICAL') {
      recommendations.push(`${name} scoring has critical drift (delta: ${data.delta}) — consider model upgrade or prompt tuning`);
    } else if (data.status === 'WARNING') {
      recommendations.push(`${name} scoring appears ${data.actual_avg < data.expected_avg ? 'low' : 'high'} (delta: ${data.delta}) — consider prompt adjustment`);
    }
  }

  return { criteria, overall_status: worstStatus, recommendations };
}

/**
 * Run calibration against a baseline
 * @param {string} baselineDir - Path to baseline directory
 * @param {Object} [options={}] - Options
 * @param {string} [options.model] - Model override
 * @returns {Promise<Object>} Calibration report
 */
export async function runCalibration(baselineDir, options = {}) {
  const validation = validateBaselineStructure(baselineDir);
  if (!validation.valid) {
    throw new Error(`Invalid baseline: ${validation.errors.join(', ')}`);
  }

  const baseline = loadBaseline(baselineDir);
  const model = options.model || getModelName();

  // Build a minimal analysis prompt for calibration
  const analysisPrompt = {
    title: 'Calibration Run',
    theme: 'General photography evaluation',
    criteria: Object.keys(baseline.expectedScores[0]?.scores || {})
  };

  // Analyze each baseline photo
  const actualScores = [];
  for (let i = 0; i < baseline.photos.length; i++) {
    const photoPath = baseline.photos[i];

    const result = await analyzePhoto(photoPath, analysisPrompt);
    const scores = {};

    // Extract scores from analysis result — match expected criteria names
    if (result.scores?.individual) {
      for (const [name, data] of Object.entries(result.scores.individual)) {
        scores[name] = data.score || 0;
      }
    }

    actualScores.push({ photo: basename(photoPath), scores });
  }

  // Generate drift report
  const driftReport = generateDriftReport(actualScores, baseline.expectedScores);

  const report = {
    timestamp: new Date().toISOString(),
    model,
    baselineSet: basename(baselineDir),
    photosEvaluated: baseline.photos.length,
    ...driftReport
  };

  // Save report
  writeFileSync(
    join(baselineDir, 'calibration-report.json'),
    JSON.stringify(report, null, 2)
  );

  return report;
}
