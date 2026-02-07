import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  analyzeSet,
  analyzeSetWithTimeout,
  parseSetAnalysisResponse,
  getDefaultSetCriteria
} from '../src/analysis/set-analyzer.js';

// Mock the api-client module
vi.mock('../src/utils/api-client.js', () => ({
  getApiClient: vi.fn(),
  getModelName: vi.fn(() => 'llava:7b')
}));

// Mock fs for readFileSync
vi.mock('fs', () => ({
  readFileSync: vi.fn(() => Buffer.from('fake-image-data'))
}));

import { getApiClient } from '../src/utils/api-client.js';

describe('set-analyzer', () => {
  const mockSetConfig = {
    enabled: true,
    setSize: 4,
    setCriteria: [
      { name: 'Visual Coherence', weight: 25, description: 'Style consistency' },
      { name: 'Thematic Dialogue', weight: 30, description: 'Inter-photo conversation' },
      { name: 'Narrative Arc', weight: 25, description: 'Story across photos' },
      { name: 'Complementarity', weight: 20, description: 'Unique contributions' }
    ]
  };

  const mockAnalysisPrompt = {
    title: 'Test Open Call',
    theme: 'Urban Life',
    criteria: []
  };

  const mockPhotoPaths = [
    '/path/to/photo1.jpg',
    '/path/to/photo2.jpg',
    '/path/to/photo3.jpg',
    '/path/to/photo4.jpg'
  ];

  const mockOllamaResponse = `SET OVERVIEW:
This set presents a cohesive view of urban life through four distinct perspectives.

SET SCORES:
SET_SCORE: Visual Coherence: 8/10 - Consistent warm tones and urban palette
SET_SCORE: Thematic Dialogue: 7/10 - Photos converse about solitude in crowds
SET_SCORE: Narrative Arc: 9/10 - Clear progression from dawn to dusk
SET_SCORE: Complementarity: 6/10 - Photo 2 and 4 overlap slightly

PHOTO ROLES:
PHOTO_ROLE: Photo 1: Opening scene, establishes the empty morning city
PHOTO_ROLE: Photo 2: Introduces human presence, midday rush
PHOTO_ROLE: Photo 3: Peak tension, crowded intersection
PHOTO_ROLE: Photo 4: Resolution, quiet evening scene

SUGGESTED_ORDER: 1, 3, 2, 4

SET STRENGTHS:
- Strong color consistency across all photos
- Clear narrative progression

SET WEAKNESSES:
- Photo 2 and 4 share similar compositions

WEAKEST LINK: Photo 4 - Similar framing to Photo 2, could be replaced

REPLACEMENT SUGGESTION: A nighttime scene with artificial lighting would complete the day cycle

SET_RECOMMENDATION: Good Set`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseSetAnalysisResponse', () => {
    it('should extract all SET_SCORE values', () => {
      const result = parseSetAnalysisResponse(mockOllamaResponse, mockSetConfig);
      expect(result.setScores).toHaveProperty('Visual Coherence');
      expect(result.setScores['Visual Coherence'].score).toBe(8);
      expect(result.setScores['Thematic Dialogue'].score).toBe(7);
      expect(result.setScores['Narrative Arc'].score).toBe(9);
      expect(result.setScores['Complementarity'].score).toBe(6);
    });

    it('should extract reasoning for each score', () => {
      const result = parseSetAnalysisResponse(mockOllamaResponse, mockSetConfig);
      expect(result.setScores['Visual Coherence'].reasoning).toContain('warm tones');
    });

    it('should extract photo roles', () => {
      const result = parseSetAnalysisResponse(mockOllamaResponse, mockSetConfig);
      expect(result.photoRoles).toHaveProperty('Photo 1');
      expect(result.photoRoles['Photo 1']).toContain('morning');
    });

    it('should extract suggested order', () => {
      const result = parseSetAnalysisResponse(mockOllamaResponse, mockSetConfig);
      expect(result.suggestedOrder).toEqual([1, 3, 2, 4]);
    });

    it('should extract recommendation', () => {
      const result = parseSetAnalysisResponse(mockOllamaResponse, mockSetConfig);
      expect(result.recommendation).toBe('Good Set');
    });

    it('should extract weakest link', () => {
      const result = parseSetAnalysisResponse(mockOllamaResponse, mockSetConfig);
      expect(result.weakestLink).toContain('Photo 4');
    });

    it('should include weights from config', () => {
      const result = parseSetAnalysisResponse(mockOllamaResponse, mockSetConfig);
      expect(result.setScores['Visual Coherence'].weight).toBe(25);
      expect(result.setScores['Thematic Dialogue'].weight).toBe(30);
    });

    it('should handle partial responses gracefully', () => {
      const partial = `SET_SCORE: Visual Coherence: 7/10 - Okay
SET_RECOMMENDATION: Needs Work`;
      const result = parseSetAnalysisResponse(partial, mockSetConfig);
      expect(result.setScores['Visual Coherence'].score).toBe(7);
      expect(result.recommendation).toBe('Needs Work');
    });

    it('should handle missing scores with default 0', () => {
      const incomplete = 'SET_SCORE: Visual Coherence: 8/10 - Great\nSET_RECOMMENDATION: Good Set';
      const result = parseSetAnalysisResponse(incomplete, mockSetConfig);
      expect(result.setScores['Visual Coherence'].score).toBe(8);
      expect(result.setScores['Thematic Dialogue'].score).toBe(0);
    });
  });

  describe('analyzeSet', () => {
    it('should send all photos to Ollama in a single call', async () => {
      const mockChat = vi.fn().mockResolvedValue({
        message: { content: mockOllamaResponse }
      });
      getApiClient.mockReturnValue({ chat: mockChat });

      await analyzeSet(mockPhotoPaths, mockAnalysisPrompt, mockSetConfig);

      expect(mockChat).toHaveBeenCalledTimes(1);
      const callArgs = mockChat.mock.calls[0][0];
      expect(callArgs.messages[0].images).toHaveLength(4);
    });

    it('should return parsed set scores', async () => {
      const mockChat = vi.fn().mockResolvedValue({
        message: { content: mockOllamaResponse }
      });
      getApiClient.mockReturnValue({ chat: mockChat });

      const result = await analyzeSet(mockPhotoPaths, mockAnalysisPrompt, mockSetConfig);
      expect(result.setScores).toHaveProperty('Visual Coherence');
      expect(result.recommendation).toBe('Good Set');
    });

    it('should include individual results context when provided', async () => {
      const mockChat = vi.fn().mockResolvedValue({
        message: { content: mockOllamaResponse }
      });
      getApiClient.mockReturnValue({ chat: mockChat });

      const individualResults = [
        { filename: 'photo1.jpg', score: 8 },
        { filename: 'photo2.jpg', score: 7 }
      ];

      await analyzeSet(mockPhotoPaths, mockAnalysisPrompt, mockSetConfig, {}, individualResults);

      const callArgs = mockChat.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('photo1.jpg');
    });

    it('should throw on Ollama error', async () => {
      const mockChat = vi.fn().mockRejectedValue(new Error('Connection refused'));
      getApiClient.mockReturnValue({ chat: mockChat });

      await expect(
        analyzeSet(mockPhotoPaths, mockAnalysisPrompt, mockSetConfig)
      ).rejects.toThrow('Connection refused');
    });
  });

  describe('analyzeSetWithTimeout', () => {
    it('should return success result within timeout', async () => {
      const mockChat = vi.fn().mockResolvedValue({
        message: { content: mockOllamaResponse }
      });
      getApiClient.mockReturnValue({ chat: mockChat });

      const result = await analyzeSetWithTimeout(
        mockPhotoPaths, mockAnalysisPrompt, mockSetConfig,
        { timeout: 120000 }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('setScores');
      expect(result.timedOut).toBe(false);
    });

    it('should return timedOut result on timeout', async () => {
      const mockChat = vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 5000))
      );
      getApiClient.mockReturnValue({ chat: mockChat });

      const result = await analyzeSetWithTimeout(
        mockPhotoPaths, mockAnalysisPrompt, mockSetConfig,
        { timeout: 50 }
      );

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
    });

    it('should return error result on failure', async () => {
      const mockChat = vi.fn().mockRejectedValue(new Error('Model not found'));
      getApiClient.mockReturnValue({ chat: mockChat });

      const result = await analyzeSetWithTimeout(
        mockPhotoPaths, mockAnalysisPrompt, mockSetConfig,
        { timeout: 120000 }
      );

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(false);
      expect(result.error).toContain('Model not found');
    });
  });

  describe('getDefaultSetCriteria', () => {
    it('should return 4 criteria', () => {
      const criteria = getDefaultSetCriteria();
      expect(criteria).toHaveLength(4);
    });

    it('should have weights summing to 100', () => {
      const criteria = getDefaultSetCriteria();
      const total = criteria.reduce((sum, c) => sum + c.weight, 0);
      expect(total).toBe(100);
    });
  });
});
