/**
 * Model Manager (FR-3.9 / ADR-019)
 *
 * Manages vision model selection with a resolution chain,
 * model discovery, and auto-pull for missing models.
 *
 * Resolution chain (highest priority first):
 * 1. CLI --model flag
 * 2. open-call.json "model" field
 * 3. OLLAMA_MODEL environment variable
 * 4. Default: llava:7b
 *
 * @module model-manager
 */

import { getApiClient, checkOllamaStatus } from './api-client.js';
import { logger } from './logger.js';

const DEFAULT_MODEL = 'llava:7b';
const VISION_MODEL_PATTERNS = ['llava', 'bakllava', 'moondream'];

/**
 * Resolve the model to use based on the priority chain.
 *
 * @param {Object} options
 * @param {string|null|undefined} [options.cliModel] - Model from CLI --model flag
 * @param {string|null|undefined} [options.configModel] - Model from open-call.json
 * @param {string|null|undefined} [options.envModel] - Model from OLLAMA_MODEL env var
 * @returns {string} Resolved model name
 */
export function resolveModel({ cliModel, configModel, envModel } = {}) {
  return cliModel || configModel || envModel || DEFAULT_MODEL;
}

/**
 * Check if a model name corresponds to a vision-capable model.
 *
 * @param {string} modelName - Model name to check
 * @returns {boolean} True if the model is vision-capable
 */
export function isVisionModel(modelName) {
  if (!modelName) return false;
  const lower = modelName.toLowerCase();
  return VISION_MODEL_PATTERNS.some(pattern => lower.includes(pattern));
}

/**
 * List installed vision-capable models from Ollama.
 *
 * @returns {Promise<string[]>} Array of installed vision model names
 * @throws {Error} If Ollama is not running
 */
export async function listVisionModels() {
  const status = await checkOllamaStatus();
  if (!status.connected) {
    throw new Error('Ollama is not running');
  }
  return status.visionModels || [];
}

/**
 * Ensure a model is available locally, pulling it if necessary.
 *
 * @param {string} modelName - Model name to ensure availability
 * @returns {Promise<boolean>} True if model is available
 * @throws {Error} If Ollama is not running or pull fails
 */
export async function ensureModelAvailable(modelName) {
  const status = await checkOllamaStatus();
  if (!status.connected) {
    throw new Error('Ollama is not running');
  }

  const installedModels = status.models || [];
  if (installedModels.includes(modelName)) {
    return true;
  }

  logger.info(`Model ${modelName} not found locally. Pulling...`);
  const client = getApiClient();
  await client.pull({ model: modelName });
  logger.success(`Model ${modelName} pulled successfully`);
  return true;
}
