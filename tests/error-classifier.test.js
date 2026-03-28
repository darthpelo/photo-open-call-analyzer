/**
 * Tests for Error Classification Module
 * TDD: Covers classifyError, getActionableMessage, logError
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger before importing module
vi.mock('../src/utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn()
  }
}));

import { classifyError, getActionableMessage, logError, ErrorType } from '../src/utils/error-classifier.js';

describe('Error Classifier', () => {
  describe('classifyError', () => {
    it('should classify timeout errors by message containing TIMEOUT', () => {
      const result = classifyError(new Error('TIMEOUT after 60s'));
      expect(result.type).toBe(ErrorType.TIMEOUT);
      expect(result.actionable).toContain('timeout');
    });

    it('should classify timeout errors by message containing lowercase timeout', () => {
      const result = classifyError(new Error('Request timeout'));
      expect(result.type).toBe(ErrorType.TIMEOUT);
    });

    it('should classify ECONNREFUSED as Ollama connection error', () => {
      const err = new Error('connect ECONNREFUSED');
      err.code = 'ECONNREFUSED';
      const result = classifyError(err);
      expect(result.type).toBe(ErrorType.OLLAMA_CONNECTION);
    });

    it('should classify ENOTFOUND as Ollama connection error', () => {
      const err = new Error('getaddrinfo ENOTFOUND');
      err.code = 'ENOTFOUND';
      const result = classifyError(err);
      expect(result.type).toBe(ErrorType.OLLAMA_CONNECTION);
    });

    it('should classify Ollama keyword as connection error', () => {
      const result = classifyError(new Error('Ollama server unavailable'));
      expect(result.type).toBe(ErrorType.OLLAMA_CONNECTION);
    });

    it('should classify fetch failed as connection error', () => {
      const result = classifyError(new Error('fetch failed'));
      expect(result.type).toBe(ErrorType.OLLAMA_CONNECTION);
    });

    it('should classify ENOENT as file system error', () => {
      const err = new Error('no such file');
      err.code = 'ENOENT';
      const result = classifyError(err);
      expect(result.type).toBe(ErrorType.FILE_SYSTEM);
      expect(result.actionable).toContain('exists');
    });

    it('should classify EACCES as file system error', () => {
      const err = new Error('access denied');
      err.code = 'EACCES';
      const result = classifyError(err);
      expect(result.type).toBe(ErrorType.FILE_SYSTEM);
      expect(result.actionable).toContain('permissions');
    });

    it('should classify permission denied message as file system error', () => {
      const result = classifyError(new Error('permission denied'));
      expect(result.type).toBe(ErrorType.FILE_SYSTEM);
    });

    it('should classify ENOSPC as file system error', () => {
      const err = new Error('no space left');
      err.code = 'ENOSPC';
      const result = classifyError(err);
      expect(result.type).toBe(ErrorType.FILE_SYSTEM);
      expect(result.actionable).toContain('disk space');
    });

    it('should classify Invalid image as corrupted file', () => {
      const result = classifyError(new Error('Invalid input'));
      expect(result.type).toBe(ErrorType.CORRUPTED_FILE);
    });

    it('should classify unsupported as corrupted file', () => {
      const result = classifyError(new Error('unsupported image format'));
      expect(result.type).toBe(ErrorType.CORRUPTED_FILE);
    });

    it('should classify Input buffer as corrupted file', () => {
      const result = classifyError(new Error('Input buffer contains unsupported'));
      expect(result.type).toBe(ErrorType.CORRUPTED_FILE);
    });

    it('should classify VipsJpeg as corrupted file', () => {
      const result = classifyError(new Error('VipsJpeg: premature end'));
      expect(result.type).toBe(ErrorType.CORRUPTED_FILE);
    });

    it('should classify premature as corrupted file', () => {
      const result = classifyError(new Error('premature end of data'));
      expect(result.type).toBe(ErrorType.CORRUPTED_FILE);
    });

    it('should classify format keyword as invalid format', () => {
      const result = classifyError(new Error('unknown format detected'));
      expect(result.type).toBe(ErrorType.INVALID_FORMAT);
    });

    it('should classify unknown errors', () => {
      const result = classifyError(new Error('something weird happened'));
      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.actionable).toContain('logs');
    });

    it('should handle non-Error objects', () => {
      const result = classifyError('string error');
      expect(result.type).toBe(ErrorType.UNKNOWN);
    });
  });

  describe('getActionableMessage', () => {
    it('should format corrupted file message', () => {
      const msg = getActionableMessage(ErrorType.CORRUPTED_FILE, '/photos/bad.jpg');
      expect(msg).toContain('bad.jpg');
      expect(msg).toContain('Corrupted');
    });

    it('should format invalid format message', () => {
      const msg = getActionableMessage(ErrorType.INVALID_FORMAT, '/photos/bad.bmp');
      expect(msg).toContain('bad.bmp');
      expect(msg).toContain('format');
    });

    it('should format timeout with custom duration', () => {
      const msg = getActionableMessage(ErrorType.TIMEOUT, '/photos/big.jpg', { timeout: 120 });
      expect(msg).toContain('120s');
    });

    it('should format timeout with default duration', () => {
      const msg = getActionableMessage(ErrorType.TIMEOUT, '/photos/big.jpg');
      expect(msg).toContain('60s');
    });

    it('should format Ollama connection message', () => {
      const msg = getActionableMessage(ErrorType.OLLAMA_CONNECTION, '/photos/test.jpg');
      expect(msg).toContain('Ollama');
    });

    it('should format file system error with code', () => {
      const msg = getActionableMessage(ErrorType.FILE_SYSTEM, '/photos/test.jpg', { code: 'ENOENT' });
      expect(msg).toContain('ENOENT');
    });

    it('should format file system error without code', () => {
      const msg = getActionableMessage(ErrorType.FILE_SYSTEM, '/photos/test.jpg');
      expect(msg).toContain('unknown');
    });

    it('should format unknown error', () => {
      const msg = getActionableMessage(ErrorType.UNKNOWN, '/photos/test.jpg');
      expect(msg).toContain('Unexpected');
    });

    it('should handle default case', () => {
      const msg = getActionableMessage('nonexistent_type', '/photos/test.jpg');
      expect(msg).toContain('Unexpected');
    });
  });

  describe('logError', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should log Ollama errors at error level', async () => {
      const { logger } = await import('../src/utils/logger.js');
      const err = new Error('connect ECONNREFUSED');
      err.code = 'ECONNREFUSED';
      const result = logError(err, { photo: 'test.jpg' });
      expect(result.type).toBe(ErrorType.OLLAMA_CONNECTION);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should log timeout errors at warn level', async () => {
      const { logger } = await import('../src/utils/logger.js');
      const result = logError(new Error('TIMEOUT'), { photo: 'test.jpg' });
      expect(result.type).toBe(ErrorType.TIMEOUT);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should log other errors at debug level', async () => {
      const { logger } = await import('../src/utils/logger.js');
      const result = logError(new Error('something'), { photo: 'test.jpg' });
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should handle missing photo context', async () => {
      const { logger } = await import('../src/utils/logger.js');
      const result = logError(new Error('something'));
      expect(logger.debug).toHaveBeenCalled();
    });
  });
});
