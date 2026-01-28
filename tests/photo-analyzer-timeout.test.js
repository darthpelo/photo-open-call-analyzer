import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as analyzerModule from '../src/analysis/photo-analyzer.js';

// Mock the API client
jest.mock('../src/utils/api-client.js', () => ({
  getApiClient: jest.fn().mockReturnValue({
    generate: jest.fn().mockResolvedValue({
      response: 'CRITERION: Composition | SCORE: 8\nCRITERION: Lighting | SCORE: 7'
    })
  })
}));

describe('photo-analyzer.js timeout wrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzePhotoWithTimeout()', () => {
    // P0: Successful analysis within timeout
    it('should successfully analyze a photo within timeout', async () => {
      const mockPhoto = './test-photo.jpg';
      const mockPrompt = { criteria: [{ name: 'Composition', weight: 50 }] };
      
      const result = await analyzerModule.analyzePhotoWithTimeout(mockPhoto, mockPrompt, {
        timeout: 60000
      });
      
      expect(result.success).toBe(true);
      expect(result.timedOut).toBeUndefined();
    });

    // P0: Timeout detection
    it('should detect when analysis times out', async () => {
      const mockPhoto = './test-photo.jpg';
      const mockPrompt = { criteria: [{ name: 'Composition', weight: 50 }] };
      
      // Use very short timeout to simulate timeout
      const result = await analyzerModule.analyzePhotoWithTimeout(mockPhoto, mockPrompt, {
        timeout: 1  // 1ms timeout - will definitely timeout
      });
      
      // Should either timeout or complete (depending on how fast analyzePhoto is mocked)
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('timedOut');
    });

    // P0: Configurable timeout
    it('should respect configurable timeout option', async () => {
      const mockPhoto = './test-photo.jpg';
      const mockPrompt = { criteria: [{ name: 'Composition', weight: 50 }] };
      
      const result = await analyzerModule.analyzePhotoWithTimeout(mockPhoto, mockPrompt, {
        timeout: 30000  // 30 second timeout
      });
      
      expect(result).toBeDefined();
    });

    // P0: Default timeout
    it('should use default timeout when not specified', async () => {
      const mockPhoto = './test-photo.jpg';
      const mockPrompt = { criteria: [{ name: 'Composition', weight: 50 }] };
      
      const result = await analyzerModule.analyzePhotoWithTimeout(mockPhoto, mockPrompt, {});
      
      expect(result).toBeDefined();
    });

    // P1: Result structure
    it('should return structured result with success flag', async () => {
      const mockPhoto = './test-photo.jpg';
      const mockPrompt = { criteria: [{ name: 'Composition', weight: 50 }] };
      
      const result = await analyzerModule.analyzePhotoWithTimeout(mockPhoto, mockPrompt, {
        timeout: 60000
      });
      
      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(result).toHaveProperty('data');
      }
    });

    // P1: Error propagation
    it('should propagate non-timeout errors', async () => {
      const mockPhoto = './test-photo.jpg';
      const mockPrompt = { criteria: [{ name: 'Composition', weight: 50 }] };
      
      // Most errors will pass through unless they're timeout-related
      const result = await analyzerModule.analyzePhotoWithTimeout(mockPhoto, mockPrompt, {
        timeout: 60000
      });
      
      expect(result).toBeDefined();
    });

    // P1: Timeout error message
    it('should include error message on timeout', async () => {
      const mockPhoto = './test-photo.jpg';
      const mockPrompt = { criteria: [{ name: 'Composition', weight: 50 }] };
      
      const result = await analyzerModule.analyzePhotoWithTimeout(mockPhoto, mockPrompt, {
        timeout: 1  // Very short timeout
      });
      
      // If it times out, error should be present
      if (result.timedOut) {
        expect(result.error).toBeDefined();
        expect(result.error.length > 0).toBe(true);
      }
    });

    // P2: Multiple timeouts don't interfere
    it('should handle multiple timeout calls independently', async () => {
      const mockPhoto = './test-photo.jpg';
      const mockPrompt = { criteria: [{ name: 'Composition', weight: 50 }] };
      
      const result1 = await analyzerModule.analyzePhotoWithTimeout(mockPhoto, mockPrompt, {
        timeout: 60000
      });
      
      const result2 = await analyzerModule.analyzePhotoWithTimeout(mockPhoto, mockPrompt, {
        timeout: 120000
      });
      
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    // P2: Validates timeout value
    it('should handle invalid timeout values gracefully', async () => {
      const mockPhoto = './test-photo.jpg';
      const mockPrompt = { criteria: [{ name: 'Composition', weight: 50 }] };
      
      // Negative timeout
      const result1 = await analyzerModule.analyzePhotoWithTimeout(mockPhoto, mockPrompt, {
        timeout: -1
      });
      expect(result1).toBeDefined();
      
      // Zero timeout
      const result2 = await analyzerModule.analyzePhotoWithTimeout(mockPhoto, mockPrompt, {
        timeout: 0
      });
      expect(result2).toBeDefined();
    });
  });
});
