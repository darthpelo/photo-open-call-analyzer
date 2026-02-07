import { describe, it, expect } from 'vitest';
import {
  buildSetAnalysisPrompt,
  getDefaultSetCriteria
} from '../src/analysis/set-prompt-builder.js';

describe('set-prompt-builder', () => {
  describe('getDefaultSetCriteria', () => {
    it('should return 4 default set criteria', () => {
      const criteria = getDefaultSetCriteria();
      expect(criteria).toHaveLength(4);
    });

    it('should have weights summing to 100', () => {
      const criteria = getDefaultSetCriteria();
      const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
      expect(totalWeight).toBe(100);
    });

    it('should include Visual Coherence, Thematic Dialogue, Narrative Arc, Complementarity', () => {
      const criteria = getDefaultSetCriteria();
      const names = criteria.map(c => c.name);
      expect(names).toContain('Visual Coherence');
      expect(names).toContain('Thematic Dialogue');
      expect(names).toContain('Narrative Arc');
      expect(names).toContain('Complementarity');
    });

    it('should have name, weight, and description for each criterion', () => {
      const criteria = getDefaultSetCriteria();
      criteria.forEach(c => {
        expect(c).toHaveProperty('name');
        expect(c).toHaveProperty('weight');
        expect(c).toHaveProperty('description');
        expect(typeof c.name).toBe('string');
        expect(typeof c.weight).toBe('number');
        expect(typeof c.description).toBe('string');
        expect(c.description.length).toBeGreaterThan(10);
      });
    });
  });

  describe('buildSetAnalysisPrompt', () => {
    const analysisPrompt = {
      title: 'Polaroid Open Call 2026',
      theme: 'Boundaries & Transitions',
      criteria: [
        { name: 'Theme Interpretation', weight: 25 },
        { name: 'Technical Quality', weight: 25 }
      ]
    };

    const setConfig = {
      enabled: true,
      setSize: 4,
      setCriteria: [
        { name: 'Visual Coherence', weight: 25, description: 'Style consistency' },
        { name: 'Thematic Dialogue', weight: 30, description: 'Inter-photo conversation' },
        { name: 'Narrative Arc', weight: 25, description: 'Story across photos' },
        { name: 'Complementarity', weight: 20, description: 'Unique contributions' }
      ]
    };

    it('should include competition title and theme', () => {
      const prompt = buildSetAnalysisPrompt(analysisPrompt, setConfig);
      expect(prompt).toContain('Polaroid Open Call 2026');
      expect(prompt).toContain('Boundaries & Transitions');
    });

    it('should include all set criteria with weights', () => {
      const prompt = buildSetAnalysisPrompt(analysisPrompt, setConfig);
      expect(prompt).toContain('Visual Coherence');
      expect(prompt).toContain('Thematic Dialogue');
      expect(prompt).toContain('Narrative Arc');
      expect(prompt).toContain('Complementarity');
      expect(prompt).toContain('25%');
      expect(prompt).toContain('30%');
      expect(prompt).toContain('20%');
    });

    it('should include SET_SCORE response format', () => {
      const prompt = buildSetAnalysisPrompt(analysisPrompt, setConfig);
      expect(prompt).toContain('SET_SCORE:');
    });

    it('should include PHOTO_ROLE format', () => {
      const prompt = buildSetAnalysisPrompt(analysisPrompt, setConfig);
      expect(prompt).toContain('PHOTO_ROLE:');
    });

    it('should include SET_RECOMMENDATION format', () => {
      const prompt = buildSetAnalysisPrompt(analysisPrompt, setConfig);
      expect(prompt).toContain('SET_RECOMMENDATION:');
    });

    it('should include SUGGESTED_ORDER format', () => {
      const prompt = buildSetAnalysisPrompt(analysisPrompt, setConfig);
      expect(prompt).toContain('SUGGESTED_ORDER:');
    });

    it('should reference set size', () => {
      const prompt = buildSetAnalysisPrompt(analysisPrompt, setConfig);
      expect(prompt).toContain('4');
    });

    it('should include individual results context when provided', () => {
      const individualResults = [
        { filename: 'photo1.jpg', score: 8.2 },
        { filename: 'photo2.jpg', score: 7.5 },
        { filename: 'photo3.jpg', score: 9.0 },
        { filename: 'photo4.jpg', score: 6.8 }
      ];

      const prompt = buildSetAnalysisPrompt(analysisPrompt, setConfig, individualResults);
      expect(prompt).toContain('photo1.jpg');
      expect(prompt).toContain('8.2');
      expect(prompt).toContain('photo2.jpg');
    });

    it('should use default criteria when setCriteria not provided', () => {
      const minConfig = { enabled: true, setSize: 4 };
      const prompt = buildSetAnalysisPrompt(analysisPrompt, minConfig);
      expect(prompt).toContain('Visual Coherence');
      expect(prompt).toContain('Thematic Dialogue');
    });

    it('should include curator role instruction', () => {
      const prompt = buildSetAnalysisPrompt(analysisPrompt, setConfig);
      expect(prompt.toLowerCase()).toContain('curator');
    });

    it('should instruct to evaluate as a group', () => {
      const prompt = buildSetAnalysisPrompt(analysisPrompt, setConfig);
      const lower = prompt.toLowerCase();
      expect(lower).toMatch(/group|set|together|cohesive/);
    });
  });
});
