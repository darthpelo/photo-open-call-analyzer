import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { getApiClient, resetApiClient } from '../src/utils/api-client.js';

describe('API Client', () => {
  beforeEach(() => {
    resetApiClient();
  });

  test('should initialize API client with valid key', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key-123';
    const client = getApiClient();
    expect(client).toBeDefined();
    expect(client).not.toBeNull();
  });

  test('should throw error if API key is missing', () => {
    delete process.env.ANTHROPIC_API_KEY;
    resetApiClient();
    expect(() => getApiClient()).toThrow('ANTHROPIC_API_KEY environment variable is not set');
  });

  test('should return same client instance on multiple calls', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key-123';
    const client1 = getApiClient();
    const client2 = getApiClient();
    expect(client1).toBe(client2);
  });

  afterEach(() => {
    resetApiClient();
  });
});
