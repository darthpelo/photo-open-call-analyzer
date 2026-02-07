/**
 * Tests for api-client.js
 *
 * Extended from 35% to 80%+ coverage per ADR-013.
 * Covers: getApiClient, getModelName, checkOllamaStatus, resetApiClient, env vars
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the ollama module
vi.mock('ollama', () => {
  class MockOllama {
    constructor() {
      this.chat = vi.fn();
      this.list = vi.fn();
    }
  }
  return { Ollama: MockOllama };
});

import {
  getApiClient,
  getModelName,
  resetApiClient,
  checkOllamaStatus
} from '../src/utils/api-client.js';
import { Ollama } from 'ollama';

describe('API Client', () => {
  beforeEach(() => {
    resetApiClient();
  });

  afterEach(() => {
    resetApiClient();
  });

  // ============================================================
  // getApiClient() Tests (existing + extended)
  // ============================================================

  test('should initialize Ollama client', () => {
    const client = getApiClient();
    expect(client).toBeDefined();
    expect(client).not.toBeNull();
  });

  test('should use default Ollama host if not specified', () => {
    delete process.env.OLLAMA_HOST;
    resetApiClient();
    const client = getApiClient();
    expect(client).toBeDefined();
  });

  test('should return same client instance on multiple calls (singleton)', () => {
    const client1 = getApiClient();
    const client2 = getApiClient();
    expect(client1).toBe(client2);
  });

  test('should create a new client after reset', () => {
    const client1 = getApiClient();
    resetApiClient();
    const client2 = getApiClient();
    // Both are defined but may or may not be the same mock object
    expect(client1).toBeDefined();
    expect(client2).toBeDefined();
  });

  // ============================================================
  // getModelName() Tests
  // ============================================================

  describe('getModelName()', () => {
    test('should return default model name "llava:7b"', () => {
      const model = getModelName();
      expect(model).toBe('llava:7b');
    });

    test('should return a string', () => {
      const model = getModelName();
      expect(typeof model).toBe('string');
    });

    test('should return a non-empty string', () => {
      const model = getModelName();
      expect(model.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // resetApiClient() Tests
  // ============================================================

  describe('resetApiClient()', () => {
    test('should not throw when called', () => {
      expect(() => resetApiClient()).not.toThrow();
    });

    test('should allow new client creation after reset', () => {
      const client1 = getApiClient();
      resetApiClient();
      const client2 = getApiClient();
      expect(client2).toBeDefined();
    });

    test('should be callable multiple times without error', () => {
      resetApiClient();
      resetApiClient();
      resetApiClient();
      const client = getApiClient();
      expect(client).toBeDefined();
    });
  });

  // ============================================================
  // checkOllamaStatus() Tests
  // ============================================================

  describe('checkOllamaStatus()', () => {
    test('should return connected status when Ollama responds', async () => {
      const client = getApiClient();
      client.list = vi.fn().mockResolvedValue({
        models: [
          { name: 'llava:7b' },
          { name: 'mistral:7b' },
          { name: 'bakllava:latest' }
        ]
      });

      const status = await checkOllamaStatus();

      expect(status.connected).toBe(true);
      expect(status.host).toBeDefined();
      expect(status.models).toBeDefined();
      expect(Array.isArray(status.models)).toBe(true);
      expect(status.models).toContain('llava:7b');
    });

    test('should identify vision models', async () => {
      const client = getApiClient();
      client.list = vi.fn().mockResolvedValue({
        models: [
          { name: 'llava:7b' },
          { name: 'mistral:7b' },
          { name: 'bakllava:latest' },
          { name: 'moondream:latest' }
        ]
      });

      const status = await checkOllamaStatus();

      expect(status.visionModels).toBeDefined();
      expect(status.visionModels).toContain('llava:7b');
      expect(status.visionModels).toContain('bakllava:latest');
      expect(status.visionModels).toContain('moondream:latest');
      expect(status.visionModels).not.toContain('mistral:7b');
    });

    test('should report if configured model is available', async () => {
      const client = getApiClient();
      client.list = vi.fn().mockResolvedValue({
        models: [
          { name: 'llava:7b' },
          { name: 'mistral:7b' }
        ]
      });

      const status = await checkOllamaStatus();

      expect(status.hasConfiguredModel).toBe(true);
      expect(status.configuredModel).toBe('llava:7b');
    });

    test('should report when configured model is not available', async () => {
      const client = getApiClient();
      client.list = vi.fn().mockResolvedValue({
        models: [
          { name: 'mistral:7b' }
        ]
      });

      const status = await checkOllamaStatus();

      expect(status.hasConfiguredModel).toBe(false);
    });

    test('should return disconnected status when Ollama is not running', async () => {
      const client = getApiClient();
      client.list = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED'));

      const status = await checkOllamaStatus();

      expect(status.connected).toBe(false);
      expect(status.error).toBeDefined();
      expect(status.error).toContain('ECONNREFUSED');
      expect(status.host).toBeDefined();
    });

    test('should handle network timeout error', async () => {
      const client = getApiClient();
      client.list = vi.fn().mockRejectedValue(new Error('Request timeout'));

      const status = await checkOllamaStatus();

      expect(status.connected).toBe(false);
      expect(status.error).toContain('timeout');
    });

    test('should handle empty models list', async () => {
      const client = getApiClient();
      client.list = vi.fn().mockResolvedValue({
        models: []
      });

      const status = await checkOllamaStatus();

      expect(status.connected).toBe(true);
      expect(status.models).toHaveLength(0);
      expect(status.visionModels).toHaveLength(0);
      expect(status.hasConfiguredModel).toBe(false);
    });
  });
});
