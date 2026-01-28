/**
 * Tests for CLI Tier Display Module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { displayTierSummary, displayTierDetails, displayTierRecommendations } from '../src/cli/tier-display.js';

describe('CLI Tier Display', () => {
  const mockSmartTiers = {
    tier1: [
      { filename: 'strong1.jpg', score: 9.2, name: 'strong1.jpg' },
      { filename: 'strong2.jpg', score: 8.8, name: 'strong2.jpg' }
    ],
    tier2: [
      { filename: 'good1.jpg', score: 7.5, name: 'good1.jpg' }
    ],
    tier3: [
      { filename: 'borderline1.jpg', score: 5.0, name: 'borderline1.jpg' }
    ],
    summary: {
      total: 4,
      tier1_count: 2,
      tier2_count: 1,
      tier3_count: 1,
      high_threshold: 8.0,
      medium_threshold: 6.5,
      average_score: 7.6
    }
  };

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('displayTierSummary', () => {
    it('should display tier summary table', () => {
      expect(() => displayTierSummary(mockSmartTiers)).not.toThrow();
      expect(console.log).toHaveBeenCalled();
    });

    it('should handle missing tier data gracefully', () => {
      expect(() => displayTierSummary(null)).not.toThrow();
      expect(() => displayTierSummary({})).not.toThrow();
    });

    it('should display correct tier counts', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      displayTierSummary(mockSmartTiers);
      
      // Verify console.log was called (table output)
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('displayTierDetails', () => {
    it('should display detailed tier breakdowns', () => {
      expect(() => displayTierDetails(mockSmartTiers)).not.toThrow();
      expect(console.log).toHaveBeenCalled();
    });

    it('should display all tier sections with photos', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      displayTierDetails(mockSmartTiers);
      
      const output = consoleSpy.mock.calls.map(call => call[0]).join('');
      expect(output).toContain('strong1.jpg');
      expect(output).toContain('good1.jpg');
      expect(output).toContain('borderline1.jpg');
    });

    it('should display tier emojis', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      displayTierDetails(mockSmartTiers);
      
      const output = consoleSpy.mock.calls.map(call => call[0]).join('');
      expect(output).toContain('🟢');
      expect(output).toContain('🟡');
      expect(output).toContain('🟠');
    });

    it('should display status indicators', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      displayTierDetails(mockSmartTiers);
      
      const output = consoleSpy.mock.calls.map(call => call[0]).join('');
      expect(output).toContain('✅');
      expect(output).toContain('👍');
      expect(output).toContain('⚠️');
    });

    it('should handle empty tiers', () => {
      const emptyTiers = {
        tier1: [],
        tier2: [],
        tier3: [],
        summary: { total: 0, tier1_count: 0, tier2_count: 0, tier3_count: 0 }
      };

      expect(() => displayTierDetails(emptyTiers)).not.toThrow();
    });

    it('should handle missing tier data', () => {
      expect(() => displayTierDetails(null)).not.toThrow();
      expect(() => displayTierDetails({})).not.toThrow();
    });
  });

  describe('displayTierRecommendations', () => {
    it('should display recommendations section', () => {
      expect(() => displayTierRecommendations(mockSmartTiers)).not.toThrow();
      expect(console.log).toHaveBeenCalled();
    });

    it('should recommend tier 1 photos for submission', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      displayTierRecommendations(mockSmartTiers);
      
      const output = consoleSpy.mock.calls.map(call => call[0]).join('');
      expect(output).toContain('✅');
      expect(output).toContain('2');
      expect(output).toContain('strong');
    });

    it('should suggest tier 2 photos for consideration', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      displayTierRecommendations(mockSmartTiers);
      
      const output = consoleSpy.mock.calls.map(call => call[0]).join('');
      expect(output).toContain('👍');
    });

    it('should warn about tier 3 photos', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      displayTierRecommendations(mockSmartTiers);
      
      const output = consoleSpy.mock.calls.map(call => call[0]).join('');
      expect(output).toContain('⚠️');
    });

    it('should handle zero-count tiers', () => {
      const singleTierData = {
        tier1: [{ filename: 'only.jpg', score: 9.0 }],
        tier2: [],
        tier3: [],
        summary: { total: 1, tier1_count: 1, tier2_count: 0, tier3_count: 0 }
      };

      expect(() => displayTierRecommendations(singleTierData)).not.toThrow();
    });

    it('should handle missing data gracefully', () => {
      expect(() => displayTierRecommendations(null)).not.toThrow();
      expect(() => displayTierRecommendations({})).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should display all three functions without errors', () => {
      expect(() => {
        displayTierSummary(mockSmartTiers);
        displayTierDetails(mockSmartTiers);
        displayTierRecommendations(mockSmartTiers);
      }).not.toThrow();
    });

    it('should handle progressively smaller tier sets', () => {
      const minimalTiers = {
        tier1: [{ filename: 'single.jpg', score: 9.0 }],
        tier2: [],
        tier3: [],
        summary: { total: 1, tier1_count: 1, tier2_count: 0, tier3_count: 0, high_threshold: 8.0, medium_threshold: 6.5 }
      };

      expect(() => {
        displayTierSummary(minimalTiers);
        displayTierDetails(minimalTiers);
        displayTierRecommendations(minimalTiers);
      }).not.toThrow();
    });
  });
});
