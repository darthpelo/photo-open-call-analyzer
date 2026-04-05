/**
 * Research Brief Writer — File I/O for Sebastiano's research-brief artifact.
 * Writes and reads research-brief.json + .md with schema validation.
 * Part of Conversational Discovery Layer, Cycle 1 (T2).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { validateResearchBrief } from '../config/discovery-validator.js';
import { logger } from '../utils/logger.js';

/**
 * Convert a research brief object to a human-readable Markdown string.
 *
 * @param {Object} data - Validated research brief data
 * @returns {string} Markdown content
 */
function toMarkdown(data) {
  const lines = [];

  lines.push(`# Research Brief: ${data.callName}`);
  lines.push('');
  lines.push(`**URL**: ${data.url}`);
  if (data.deadline) lines.push(`**Deadline**: ${data.deadline}`);
  lines.push('');

  lines.push('## Theme Analysis');
  lines.push('');
  lines.push(data.themeAnalysis);
  lines.push('');

  if (data.juryProfile) {
    lines.push('## Jury Profile');
    lines.push('');
    lines.push(data.juryProfile);
    lines.push('');
  }

  if (data.pastWinnersPatterns) {
    lines.push('## Past Winners Patterns');
    lines.push('');
    lines.push(data.pastWinnersPatterns);
    lines.push('');
  }

  lines.push('## Strategic Angles');
  lines.push('');
  for (const angle of data.strategicAngles) {
    lines.push(`### ${angle.angle}`);
    lines.push('');
    lines.push(angle.rationale);
    lines.push('');
  }

  lines.push('## Suggested Questions for Art Critic');
  lines.push('');
  for (const q of data.suggestedQuestionsForArtCritic) {
    lines.push(`- **${q.question}**`);
    lines.push(`  _Why_: ${q.why}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Write a research brief to the project's strategic directory.
 * Validates against schema before writing. Creates directory if needed.
 *
 * @param {string} projectDir - Project directory path
 * @param {Object} data - Research brief data
 * @returns {{ success: boolean, errors?: Array<{field: string, message: string}> }}
 */
export function writeResearchBrief(projectDir, data) {
  const validation = validateResearchBrief(data);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  const strategicDir = join(projectDir, 'strategic');
  mkdirSync(strategicDir, { recursive: true });

  const jsonPath = join(strategicDir, 'research-brief.json');
  const mdPath = join(strategicDir, 'research-brief.md');

  writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
  writeFileSync(mdPath, toMarkdown(data), 'utf-8');

  logger.success(`Research brief saved: ${jsonPath}`);
  return { success: true };
}

/**
 * Read a research brief from the project's strategic directory.
 * Validates against schema after reading.
 *
 * @param {string} projectDir - Project directory path
 * @returns {{ success: boolean, data?: Object, error?: string, errors?: Array }}
 */
export function readResearchBrief(projectDir) {
  const jsonPath = join(projectDir, 'strategic', 'research-brief.json');

  if (!existsSync(jsonPath)) {
    return { success: false, error: `Research brief not found: ${jsonPath}` };
  }

  try {
    const raw = readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(raw);

    const validation = validateResearchBrief(data);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: `Failed to read research brief: ${err.message}` };
  }
}
