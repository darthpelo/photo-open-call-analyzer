/**
 * Sebastiano — Strategic curatorial analyzer.
 * Orchestrates prompt building, Ollama text model call, and output parsing.
 * Part of FR-B3 (strategic analysis) and FR-B7 (structured output).
 */

import { Ollama } from 'ollama';
import { getApiClient } from '../utils/api-client.js';
import { resolveTextModel, ensureModelAvailable } from '../utils/model-manager.js';
import { buildSystemPrompt, buildAnalysisPrompt, getDefaultProfile } from './strategic-prompt-builder.js';
import { parseStrategicOutput, validateEvaluation } from './strategic-output-parser.js';
import { logger } from '../utils/logger.js';

/**
 * Create an Ollama client for strategic analysis.
 * Uses streaming mode to avoid undici headersTimeout (phi3:mini may take
 * minutes to process the full prompt before emitting the first token).
 * @returns {Ollama}
 */
function createOllamaClient() {
  const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
  return new Ollama({ host });
}

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
 * @param {Object} [options._client] - Injectable client for testing
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

  // Use injected client (tests) or dedicated client (production)
  const client = options._client || createOllamaClient();

  // Stream to avoid undici headersTimeout — headers arrive immediately with
  // chunked responses, then tokens trickle in as the model generates them.
  const stream = await client.chat({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    options: {
      temperature: options.temperature ?? 0.5,
      num_predict: options.maxTokens ?? 2000
    },
    stream: true
  });

  let rawText = '';
  for await (const chunk of stream) {
    rawText += chunk.message.content;
  }
  const { markdown, json } = parseStrategicOutput(rawText);
  const validation = json ? validateEvaluation(json) : { valid: false, errors: ['No JSON extracted'] };

  if (!validation.valid) {
    logger.warn(`Sebastiano output validation: ${validation.errors.join(', ')}`);
  }

  return { markdown, json, model, validation };
}
