import Anthropic from '@anthropic-ai/sdk';

let client = null;

/**
 * Initializes and returns the Anthropic API client
 * @returns {Anthropic} The Anthropic API client
 * @throws {Error} If ANTHROPIC_API_KEY is not set
 */
export function getApiClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * Resets the API client (useful for testing)
 */
export function resetApiClient() {
  client = null;
}
