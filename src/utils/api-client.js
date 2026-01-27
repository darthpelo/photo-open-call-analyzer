import { Ollama } from 'ollama';

let client = null;

/**
 * Configuration for Ollama
 */
const config = {
  host: process.env.OLLAMA_HOST || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'llava:7b',
};

/**
 * Initializes and returns the Ollama client
 * @returns {Ollama} The Ollama client
 */
export function getApiClient() {
  if (!client) {
    client = new Ollama({ host: config.host });
  }
  return client;
}

/**
 * Get the configured model name
 * @returns {string} Model name
 */
export function getModelName() {
  return config.model;
}

/**
 * Resets the API client (useful for testing)
 */
export function resetApiClient() {
  client = null;
}

/**
 * Check if Ollama is running and has a vision model
 * @returns {Promise<Object>} Connection status
 */
export async function checkOllamaStatus() {
  try {
    const ollama = getApiClient();
    const models = await ollama.list();

    const visionModels = models.models.filter(m =>
      m.name.includes('llava') ||
      m.name.includes('bakllava') ||
      m.name.includes('moondream')
    );

    return {
      connected: true,
      host: config.host,
      models: models.models.map(m => m.name),
      visionModels: visionModels.map(m => m.name),
      configuredModel: config.model,
      hasConfiguredModel: models.models.some(m => m.name === config.model)
    };
  } catch (error) {
    return {
      connected: false,
      host: config.host,
      error: error.message
    };
  }
}
