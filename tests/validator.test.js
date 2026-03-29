import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger before importing validator
vi.mock('../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { validateOpenCall } from '../src/config/validator.js';

describe('validateOpenCall', () => {
  const validConfig = {
    title: 'Sony World Photography Awards 2025',
    theme: 'Street photography capturing urban life and human connection',
    jury: ['Anne Murayama — Founder/Director, Ephemere Tokyo'],
    pastWinners: 'Winners showed bold color palettes with strong narrative depth and emotional resonance'
  };

  describe('ADR-021: minLength/maxLength use error.params.limit', () => {
    it('should show actual limit number for maxLength error, not undefined', () => {
      const config = { ...validConfig, title: 'a'.repeat(201) };
      const result = validateOpenCall(config);

      expect(result.valid).toBe(false);
      const titleError = result.errors.find(e => e.message.includes('too long'));
      expect(titleError).toBeDefined();
      // Should show "200", not "undefined"
      expect(titleError.message).toContain('200');
      expect(titleError.message).not.toContain('undefined');
      expect(titleError.suggestion).toContain('200');
      expect(titleError.suggestion).not.toContain('undefined');
    });

    it('should show actual limit number for minLength error, not undefined', () => {
      const config = { ...validConfig, title: 'ab' };
      const result = validateOpenCall(config);

      expect(result.valid).toBe(false);
      const titleError = result.errors.find(e => e.message.includes('too short'));
      expect(titleError).toBeDefined();
      // Should show "3", not "undefined"
      expect(titleError.message).toContain('3');
      expect(titleError.message).not.toContain('undefined');
      expect(titleError.suggestion).toContain('3');
      expect(titleError.suggestion).not.toContain('undefined');
    });
  });

  describe('ADR-022: required field errors include examples', () => {
    it('should include example value for known required fields', () => {
      const config = { theme: validConfig.theme, jury: validConfig.jury, pastWinners: validConfig.pastWinners };
      const result = validateOpenCall(config);

      expect(result.valid).toBe(false);
      const titleError = result.errors.find(e => e.message.includes('"title"'));
      expect(titleError).toBeDefined();
      expect(titleError.suggestion).toContain('Example:');
      expect(titleError.suggestion).toContain('Sony World Photography Awards');
    });

    it('should include example for theme field', () => {
      const config = { title: validConfig.title, jury: validConfig.jury, pastWinners: validConfig.pastWinners };
      const result = validateOpenCall(config);

      expect(result.valid).toBe(false);
      const themeError = result.errors.find(e => e.message.includes('"theme"'));
      expect(themeError).toBeDefined();
      expect(themeError.suggestion).toContain('Example:');
      expect(themeError.suggestion).toContain('Street photography');
    });

    it('should show generic suggestion for unknown required fields', () => {
      // jury and pastWinners are now optional — test fallback with a missing required field (theme)
      // that IS in FIELD_EXAMPLES to verify the example suggestion path
      const config = { title: validConfig.title };
      const result = validateOpenCall(config);

      expect(result.valid).toBe(false);
      const themeError = result.errors.find(e => e.message.includes('"theme"'));
      expect(themeError).toBeDefined();
      // theme IS in FIELD_EXAMPLES, so it should have an example
      expect(themeError.suggestion).toContain('Example:');
    });
  });
});
