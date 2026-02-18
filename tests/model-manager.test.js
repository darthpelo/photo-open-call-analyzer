/**
 * Unit Tests for Model Manager (FR-3.9 / ADR-019)
 *
 * TDD: Tests written BEFORE implementation (RED phase).
 *
 * Tests:
 * - resolveModel(): Resolution chain priority
 * - isVisionModel(): Model name classification
 * - listVisionModels(): Discovery from Ollama
 * - ensureModelAvailable(): Auto-pull logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock api-client before importing model-manager
vi.mock('../src/utils/api-client.js', () => ({
  getApiClient: vi.fn(),
  getModelName: vi.fn(() => 'llava:7b'),
  checkOllamaStatus: vi.fn(),
}));

import {
  resolveModel,
  isVisionModel,
  listVisionModels,
  ensureModelAvailable
} from '../src/utils/model-manager.js';
import { getApiClient, checkOllamaStatus } from '../src/utils/api-client.js';

describe('Model Manager - Unit Tests', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // resolveModel()
  // ============================================

  describe('resolveModel()', () => {
    it('should return CLI model when provided (highest priority)', () => {
      const result = resolveModel({
        cliModel: 'llava:13b',
        configModel: 'moondream',
        envModel: 'llava:7b'
      });
      expect(result).toBe('llava:13b');
    });

    it('should return config model when CLI model is not provided', () => {
      const result = resolveModel({
        cliModel: null,
        configModel: 'moondream',
        envModel: 'llava:7b'
      });
      expect(result).toBe('moondream');
    });

    it('should return env model when CLI and config are not provided', () => {
      const result = resolveModel({
        cliModel: null,
        configModel: null,
        envModel: 'bakllava'
      });
      expect(result).toBe('bakllava');
    });

    it('should return default llava:7b when nothing is provided', () => {
      const result = resolveModel({
        cliModel: null,
        configModel: null,
        envModel: null
      });
      expect(result).toBe('llava:7b');
    });

    it('should return default when called with empty object', () => {
      const result = resolveModel({});
      expect(result).toBe('llava:7b');
    });

    it('should skip undefined values in chain', () => {
      const result = resolveModel({
        cliModel: undefined,
        configModel: undefined,
        envModel: 'llava:13b'
      });
      expect(result).toBe('llava:13b');
    });

    it('should skip empty string values in chain', () => {
      const result = resolveModel({
        cliModel: '',
        configModel: '',
        envModel: 'moondream'
      });
      expect(result).toBe('moondream');
    });
  });

  // ============================================
  // isVisionModel()
  // ============================================

  describe('isVisionModel()', () => {
    it('should identify llava models as vision-capable', () => {
      expect(isVisionModel('llava:7b')).toBe(true);
      expect(isVisionModel('llava:13b')).toBe(true);
      expect(isVisionModel('llava:latest')).toBe(true);
    });

    it('should identify bakllava as vision-capable', () => {
      expect(isVisionModel('bakllava')).toBe(true);
      expect(isVisionModel('bakllava:latest')).toBe(true);
    });

    it('should identify moondream as vision-capable', () => {
      expect(isVisionModel('moondream')).toBe(true);
      expect(isVisionModel('moondream:latest')).toBe(true);
    });

    it('should return false for non-vision models', () => {
      expect(isVisionModel('llama2')).toBe(false);
      expect(isVisionModel('mistral')).toBe(false);
      expect(isVisionModel('codellama')).toBe(false);
    });

    it('should handle empty or null input', () => {
      expect(isVisionModel('')).toBe(false);
      expect(isVisionModel(null)).toBe(false);
      expect(isVisionModel(undefined)).toBe(false);
    });
  });

  // ============================================
  // listVisionModels()
  // ============================================

  describe('listVisionModels()', () => {
    it('should return array of installed vision models', async () => {
      checkOllamaStatus.mockResolvedValue({
        connected: true,
        visionModels: ['llava:7b', 'moondream:latest']
      });

      const models = await listVisionModels();
      expect(models).toEqual(['llava:7b', 'moondream:latest']);
    });

    it('should return empty array when no vision models installed', async () => {
      checkOllamaStatus.mockResolvedValue({
        connected: true,
        visionModels: []
      });

      const models = await listVisionModels();
      expect(models).toEqual([]);
    });

    it('should throw when Ollama is not running', async () => {
      checkOllamaStatus.mockResolvedValue({
        connected: false,
        error: 'Connection refused'
      });

      await expect(listVisionModels()).rejects.toThrow('Ollama is not running');
    });
  });

  // ============================================
  // ensureModelAvailable()
  // ============================================

  describe('ensureModelAvailable()', () => {
    it('should return true when model is already installed', async () => {
      checkOllamaStatus.mockResolvedValue({
        connected: true,
        visionModels: ['llava:7b', 'moondream:latest'],
        models: ['llava:7b', 'moondream:latest', 'llama2:7b']
      });

      const result = await ensureModelAvailable('llava:7b');
      expect(result).toBe(true);
    });

    it('should pull model when not installed', async () => {
      const mockPull = vi.fn().mockResolvedValue(undefined);
      getApiClient.mockReturnValue({ pull: mockPull });

      checkOllamaStatus.mockResolvedValue({
        connected: true,
        visionModels: ['llava:7b'],
        models: ['llava:7b']
      });

      const result = await ensureModelAvailable('llava:13b');
      expect(result).toBe(true);
      expect(mockPull).toHaveBeenCalledWith({ model: 'llava:13b' });
    });

    it('should throw when Ollama is not running', async () => {
      checkOllamaStatus.mockResolvedValue({
        connected: false,
        error: 'Connection refused'
      });

      await expect(ensureModelAvailable('llava:7b')).rejects.toThrow('Ollama is not running');
    });

    it('should throw when model pull fails', async () => {
      const mockPull = vi.fn().mockRejectedValue(new Error('model not found'));
      getApiClient.mockReturnValue({ pull: mockPull });

      checkOllamaStatus.mockResolvedValue({
        connected: true,
        visionModels: [],
        models: []
      });

      await expect(ensureModelAvailable('nonexistent:model')).rejects.toThrow('model not found');
    });

    it('should not attempt pull when model is already available', async () => {
      const mockPull = vi.fn();
      getApiClient.mockReturnValue({ pull: mockPull });

      checkOllamaStatus.mockResolvedValue({
        connected: true,
        visionModels: ['llava:7b'],
        models: ['llava:7b']
      });

      await ensureModelAvailable('llava:7b');
      expect(mockPull).not.toHaveBeenCalled();
    });
  });
});
