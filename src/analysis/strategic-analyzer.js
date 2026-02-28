/**
 * Sebastiano (BMed) — Strategic curatorial analyzer.
 * Orchestrates prompt building, Ollama text model call, and output parsing.
 * Part of FR-B3 (strategic analysis) and FR-B7 (structured output).
 */

import { getApiClient } from '../utils/api-client.js';
import { resolveTextModel, ensureModelAvailable } from '../utils/model-manager.js';
import { buildSystemPrompt, buildAnalysisPrompt, getDefaultProfile } from './bmed-prompt-builder.js';
import { parseStrategicOutput, validateEvaluation } from './bmed-output-parser.js';
import { logger } from '../utils/logger.js';

/**
 * Run strategic curatorial analysis on an open call.
 *
 * @param {Object} openCallData - Open call configuration
 * @param {Object} [options={}] - Analysis options
 * @param {string} [options.textModel] - Override text model
 * @param {Object} [options.researchContext] - Research phase output
 * @param {string} [options.memoryContext] - Cross-session memory context
 * @param {Object} [options.photographerProfile] - Custom profile (or default)
 * @param {number} [options.temperature=0.5] - Model temperature
 * @param {number} [options.maxTokens=2000] - Max response tokens
 * @returns {Promise<{ markdown: string, json: Object|null, model: string, validation: Object }>}
 */
export async function analyzeStrategically(openCallData, options = {}) {
  const model = resolveTextModel({
    cliModel: options.textModel,
    configModel: openCallData.textModel
  });

  await ensureModelAvailable(model);

  const profile = options.photographerProfile || getDefaultProfile();
  const systemPrompt = buildSystemPrompt(profile);
  const userPrompt = buildAnalysisPrompt(
    openCallData,
    options.researchContext || null,
    options.memoryContext || null
  );

  logger.debug(`Sebastiano using model: ${model}`);
  logger.debug(`System prompt length: ${systemPrompt.split(/\s+/).length} words`);

  const client = getApiClient();
  const response = await client.chat({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    options: {
      temperature: options.temperature ?? 0.5,
      num_predict: options.maxTokens ?? 2000
    }
  });

  const rawText = response.message.content;
  const { markdown, json } = parseStrategicOutput(rawText);
  const validation = json ? validateEvaluation(json) : { valid: false, errors: ['No JSON extracted'] };

  if (!validation.valid) {
    logger.warn(`Sebastiano output validation: ${validation.errors.join(', ')}`);
  }

  return { markdown, json, model, validation };
}
