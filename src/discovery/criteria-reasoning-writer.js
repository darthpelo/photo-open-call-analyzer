/**
 * Criteria Reasoning Writer — File I/O for Art Critic's criteria-reasoning artifact.
 * Writes and reads criteria-reasoning.json + .md with schema validation.
 * Part of Conversational Discovery Layer, Cycle 1 (T3).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { validateCriteriaReasoning } from '../config/discovery-validator.js';
import { logger } from '../utils/logger.js';

function toMarkdown(data) {
  const lines = [];

  lines.push('# Criteria Reasoning');
  lines.push('');

  lines.push('## Evaluation Criteria');
  lines.push('');
  lines.push('| Criterion | Weight | Motivation |');
  lines.push('|-----------|--------|------------|');
  for (const c of data.criteria) {
    lines.push(`| ${c.name} | ${c.weight}% | ${c.motivation} |`);
  }
  lines.push('');

  lines.push('## User Context');
  lines.push('');
  lines.push(`**Body of Work**: ${data.userContext.bodyOfWork}`);
  lines.push(`**Intention**: ${data.userContext.intention}`);
  if (data.userContext.constraints) {
    lines.push(`**Constraints**: ${data.userContext.constraints}`);
  }
  lines.push('');

  lines.push(`**Config path**: \`${data.openCallJsonPath}\``);

  return lines.join('\n');
}

/**
 * Write criteria reasoning to the project's strategic directory.
 *
 * @param {string} projectDir - Project directory path
 * @param {Object} data - Criteria reasoning data
 * @returns {{ success: boolean, errors?: Array }}
 */
export function writeCriteriaReasoning(projectDir, data) {
  const validation = validateCriteriaReasoning(data);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  const strategicDir = join(projectDir, 'strategic');
  mkdirSync(strategicDir, { recursive: true });

  writeFileSync(join(strategicDir, 'criteria-reasoning.json'), JSON.stringify(data, null, 2), 'utf-8');
  writeFileSync(join(strategicDir, 'criteria-reasoning.md'), toMarkdown(data), 'utf-8');

  logger.success(`Criteria reasoning saved: ${join(strategicDir, 'criteria-reasoning.json')}`);
  return { success: true };
}

/**
 * Read criteria reasoning from the project's strategic directory.
 *
 * @param {string} projectDir - Project directory path
 * @returns {{ success: boolean, data?: Object, error?: string, errors?: Array }}
 */
export function readCriteriaReasoning(projectDir) {
  const jsonPath = join(projectDir, 'strategic', 'criteria-reasoning.json');

  if (!existsSync(jsonPath)) {
    return { success: false, error: `Criteria reasoning not found: ${jsonPath}` };
  }

  try {
    const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    const validation = validateCriteriaReasoning(data);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: `Failed to read criteria reasoning: ${err.message}` };
  }
}
