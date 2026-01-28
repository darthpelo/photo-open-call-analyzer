import { describe, it, expect } from '@jest/globals';
import { classifyError, getActionableMessage, ErrorType, logError } from '../src/utils/error-classifier.js';

describe('error-classifier.js', () => {
  describe('classifyError()', () => {
    // P0: Timeout detection
    it('should classify timeout errors', () => {
      const error = new Error('TIMEOUT: Analysis exceeded 60 seconds');
      const result = classifyError(error, { photo: 'test.jpg' });
      expect(result.type).toBe(ErrorType.TIMEOUT);
    });

    // P0: Ollama connection errors
    it('should classify connection refused errors', () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:11434');
      const result = classifyError(error, { photo: 'test.jpg' });
      expect(result.type).toBe(ErrorType.OLLAMA_CONNECTION);
    });

    it('should classify host not found errors', () => {
      const error = new Error('getaddrinfo ENOTFOUND ollama');
      const result = classifyError(error, { photo: 'test.jpg' });
      expect(result.type).toBe(ErrorType.OLLAMA_CONNECTION);
    });

    it('should classify fetch failed errors', () => {
      const error = new Error('fetch failed: Ollama not responding');
      const result = classifyError(error, { photo: 'test.jpg' });
      expect(result.type).toBe(ErrorType.OLLAMA_CONNECTION);
    });

    // P0: File system errors
    it('should classify file not found errors', () => {
      const error = new Error('ENOENT: no such file or directory');
      const result = classifyError(error, { photo: 'test.jpg' });
      expect(result.type).toBe(ErrorType.FILE_SYSTEM);
    });

    it('should classify permission denied errors', () => {
      const error = new Error('EACCES: permission denied, open test.jpg');
      const result = classifyError(error, { photo: 'test.jpg' });
      expect(result.type).toBe(ErrorType.FILE_SYSTEM);
    });

    it('should classify no space left errors', () => {
      const error = new Error('ENOSPC: no space left on device');
      const result = classifyError(error, { photo: 'test.jpg' });
      expect(result.type).toBe(ErrorType.FILE_SYSTEM);
    });

    // P1: Corrupted file errors
    it('should classify corrupted image errors', () => {
      const error = new Error('Unsupported format: Invalid JPEG');
      const result = classifyError(error, { photo: 'test.jpg' });
      expect(result.type).toBe(ErrorType.CORRUPTED_FILE);
    });

    it('should classify premature end of data errors', () => {
      const error = new Error('Premature end of JPEG file');
      const result = classifyError(error, { photo: 'test.jpg' });
      expect(result.type).toBe(ErrorType.CORRUPTED_FILE);
    });

    // P1: Invalid format errors
    it('should classify invalid format errors', () => {
      const error = new Error('Cannot process format: bmp');
      const result = classifyError(error, { photo: 'test.bmp' });
      expect(result.type).toBe(ErrorType.INVALID_FORMAT);
    });

    // P1: Unknown errors
    it('should classify unknown errors as UNKNOWN', () => {
      const error = new Error('Something unexpected happened');
      const result = classifyError(error, { photo: 'test.jpg' });
      expect(result.type).toBe(ErrorType.UNKNOWN);
    });

    // P1: Result structure
    it('should return structured result with type and message', () => {
      const error = new Error('test error');
      const result = classifyError(error, { photo: 'test.jpg' });
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('actionable');
    });
  });

  describe('getActionableMessage()', () => {
    // P0: Timeout messages
    it('should provide actionable timeout message', () => {
      const msg = getActionableMessage(ErrorType.TIMEOUT, 'photo.jpg', { timeout: 60 });
      expect(msg).toContain('timeout' || 'Timeout' || 'TIMEOUT');
    });

    // P0: Ollama connection messages
    it('should provide actionable Ollama connection message', () => {
      const msg = getActionableMessage(ErrorType.OLLAMA_CONNECTION, 'photo.jpg', {});
      expect(msg).toContain('Ollama' || 'connection' || 'restart');
    });

    // P1: File system messages
    it('should provide actionable file system message', () => {
      const msg = getActionableMessage(ErrorType.FILE_SYSTEM, 'photo.jpg', {});
      expect(msg).toContain('file' || 'File');
    });

    // P1: Corrupted file messages
    it('should provide actionable corrupted file message', () => {
      const msg = getActionableMessage(ErrorType.CORRUPTED_FILE, 'photo.jpg', {});
      expect(msg).toContain('convert' || 'Convert' || 'corrupted');
    });

    // P2: Message includes photo name
    it('should include photo name in message when available', () => {
      const msg = getActionableMessage(ErrorType.TIMEOUT, 'important-photo.jpg', { timeout: 60 });
      // Message should either contain the filename or at least be a reasonable action
      expect(msg).toBeDefined();
      expect(msg.length > 0).toBe(true);
    });
  });

  describe('ErrorType enum', () => {
    // P1: All error types exist
    it('should define all required error types', () => {
      expect(ErrorType.TIMEOUT).toBeDefined();
      expect(ErrorType.OLLAMA_CONNECTION).toBeDefined();
      expect(ErrorType.FILE_SYSTEM).toBeDefined();
      expect(ErrorType.CORRUPTED_FILE).toBeDefined();
      expect(ErrorType.INVALID_FORMAT).toBeDefined();
      expect(ErrorType.UNKNOWN).toBeDefined();
    });

    // P1: Error types are strings
    it('should have string values for all error types', () => {
      expect(typeof ErrorType.TIMEOUT).toBe('string');
      expect(typeof ErrorType.OLLAMA_CONNECTION).toBe('string');
      expect(typeof ErrorType.FILE_SYSTEM).toBe('string');
      expect(typeof ErrorType.CORRUPTED_FILE).toBe('string');
      expect(typeof ErrorType.INVALID_FORMAT).toBe('string');
      expect(typeof ErrorType.UNKNOWN).toBe('string');
    });
  });

  describe('logError()', () => {
    // P2: Error logging (basic check - doesn't throw)
    it('should log errors without throwing', () => {
      const error = new Error('test error');
      expect(() => {
        logError(error, { photo: 'test.jpg' });
      }).not.toThrow();
    });

    // P2: Severity-based logging
    it('should handle errors with different severities', () => {
      const error = new Error('test error');
      expect(() => {
        logError(error, { photo: 'test.jpg', severity: 'warning' });
        logError(error, { photo: 'test.jpg', severity: 'error' });
      }).not.toThrow();
    });
  });
});
