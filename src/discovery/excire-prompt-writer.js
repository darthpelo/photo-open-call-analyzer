/**
 * Excire Prompt Writer — File I/O for Sebastiano's excire-prompts artifact.
 * Writes and reads excire-prompts.json + .md with schema validation.
 * Part of Conversational Discovery Layer, Cycle 1 (T4).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { validateExcirePrompts } from '../config/discovery-validator.js';
import { logger } from '../utils/logger.js';

const STRATEGY_LABELS = {
  direct: 'Direct Match',
  metaphorical: 'Metaphorical / Poetic',
  bold: 'Bold / Surprise',
  jury_informed: 'Jury-Informed',
  cascade: 'Cascade (Broad → Narrow)'
};

function toMarkdown(data) {
  const lines = [];

  lines.push('# Excire Search Prompts');
  lines.push('');
  lines.push('Copy these prompts into Excire\'s X-Prompt AI search. Adjust strictness via the cogwheel.');
  lines.push('');

  for (const strategy of data.strategies) {
    const label = STRATEGY_LABELS[strategy.strategy] || strategy.strategy;
    lines.push(`## ${label}`);
    lines.push('');

    for (const p of strategy.prompts) {
      lines.push(`> **${p.prompt}**`);
      lines.push(`> Strictness: ${p.strictnessHint}`);
      if (p.keywordRefinement) {
        lines.push(`> Keyword refinement: \`${p.keywordRefinement}\``);
      }
      lines.push(`> _${p.rationale}_`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Write Excire prompts to the project's strategic directory.
 *
 * @param {string} projectDir - Project directory path
 * @param {Object} data - Excire prompts data
 * @returns {{ success: boolean, errors?: Array }}
 */
export function writeExcirePrompts(projectDir, data) {
  const validation = validateExcirePrompts(data);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  const strategicDir = join(projectDir, 'strategic');
  mkdirSync(strategicDir, { recursive: true });

  writeFileSync(join(strategicDir, 'excire-prompts.json'), JSON.stringify(data, null, 2), 'utf-8');
  writeFileSync(join(strategicDir, 'excire-prompts.md'), toMarkdown(data), 'utf-8');

  logger.success(`Excire prompts saved: ${join(strategicDir, 'excire-prompts.json')}`);
  return { success: true };
}

/**
 * Read Excire prompts from the project's strategic directory.
 *
 * @param {string} projectDir - Project directory path
 * @returns {{ success: boolean, data?: Object, error?: string, errors?: Array }}
 */
export function readExcirePrompts(projectDir) {
  const jsonPath = join(projectDir, 'strategic', 'excire-prompts.json');

  if (!existsSync(jsonPath)) {
    return { success: false, error: `Excire prompts not found: ${jsonPath}` };
  }

  try {
    const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    const validation = validateExcirePrompts(data);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: `Failed to read Excire prompts: ${err.message}` };
  }
}
