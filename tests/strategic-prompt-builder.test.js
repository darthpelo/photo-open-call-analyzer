import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  buildAnalysisPrompt,
  getDefaultProfile
} from '../src/analysis/strategic-prompt-builder.js';

describe('strategic-prompt-builder', () => {
  describe('getDefaultProfile', () => {
    it('should return a photographer profile object', () => {
      const profile = getDefaultProfile();
      expect(profile).toHaveProperty('coreLanguage');
      expect(profile).toHaveProperty('technique');
      expect(profile).toHaveProperty('subjects');
      expect(profile).toHaveProperty('aesthetic');
      expect(profile).toHaveProperty('strengths');
      expect(profile).toHaveProperty('orientation');
      expect(profile).toHaveProperty('context');
    });

    it('should include double exposure and urban architecture', () => {
      const profile = getDefaultProfile();
      expect(profile.coreLanguage).toMatch(/double exposure/i);
      expect(profile.coreLanguage).toMatch(/urban architecture/i);
    });

    it('should include technique details', () => {
      const profile = getDefaultProfile();
      expect(profile.technique).toMatch(/double exposure/i);
      expect(profile.subjects).toMatch(/architecture/i);
    });

    it('should include photobook orientation', () => {
      const profile = getDefaultProfile();
      expect(profile.orientation).toMatch(/photobook/i);
    });

    it('should include independent publishing context', () => {
      const profile = getDefaultProfile();
      expect(profile.context).toMatch(/independent publishing/i);
    });
  });

  describe('buildSystemPrompt', () => {
    it('should return a string', () => {
      const prompt = buildSystemPrompt(getDefaultProfile());
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should be under 800 tokens (estimated as words * 1.3)', () => {
      const prompt = buildSystemPrompt(getDefaultProfile());
      const wordCount = prompt.split(/\s+/).length;
      const estimatedTokens = Math.ceil(wordCount * 1.3);
      expect(estimatedTokens).toBeLessThan(800);
    });

    it('should include Sebastiano identity', () => {
      const prompt = buildSystemPrompt(getDefaultProfile());
      expect(prompt).toContain('Sebastiano');
    });

    it('should include scoring weights', () => {
      const prompt = buildSystemPrompt(getDefaultProfile());
      expect(prompt).toMatch(/visual impact/i);
      expect(prompt).toMatch(/25%/);
      expect(prompt).toMatch(/conceptual coherence/i);
      expect(prompt).toMatch(/20%/);
      expect(prompt).toMatch(/editorial fit/i);
      expect(prompt).toMatch(/distinctiveness/i);
      expect(prompt).toMatch(/15%/);
      expect(prompt).toMatch(/dialogue potential/i);
      expect(prompt).toMatch(/10%/);
      expect(prompt).toMatch(/risk factor/i);
    });

    it('should include photographer profile', () => {
      const prompt = buildSystemPrompt(getDefaultProfile());
      expect(prompt).toMatch(/double exposure/i);
      expect(prompt).toMatch(/urban architecture/i);
      expect(prompt).toMatch(/photobook/i);
    });

    it('should include output format instructions', () => {
      const prompt = buildSystemPrompt(getDefaultProfile());
      expect(prompt).toMatch(/section a/i);
      expect(prompt).toMatch(/section b/i);
      expect(prompt).toMatch(/json/i);
    });

    it('should include decisive tone instructions', () => {
      const prompt = buildSystemPrompt(getDefaultProfile());
      const lower = prompt.toLowerCase();
      expect(lower).toMatch(/decisive|direct|no reassurance|no hedging/);
    });

    it('should include verdict instructions', () => {
      const prompt = buildSystemPrompt(getDefaultProfile());
      const lower = prompt.toLowerCase();
      expect(lower).toContain('verdict');
      expect(lower).toMatch(/go.*no-go.*conditional|go\|no-go\|conditional/);
      expect(lower).toContain('verdict_confidence');
      expect(lower).toContain('verdict_reasoning');
    });

    it('should still be under 800 tokens with verdict instructions', () => {
      const prompt = buildSystemPrompt(getDefaultProfile());
      const wordCount = prompt.split(/\s+/).length;
      const estimatedTokens = Math.ceil(wordCount * 1.3);
      expect(estimatedTokens).toBeLessThan(800);
    });

    it('should accept custom profile', () => {
      const customProfile = {
        coreLanguage: 'street photography, black and white',
        orientation: 'gallery exhibition',
        context: 'fine art market'
      };
      const prompt = buildSystemPrompt(customProfile);
      expect(prompt).toContain('street photography');
      expect(prompt).toContain('gallery exhibition');
      expect(prompt).toContain('fine art market');
    });
  });

  describe('buildAnalysisPrompt', () => {
    const openCallData = {
      title: 'Lyricalmyrical Books Open Call 2026',
      theme: 'Urban Narratives — exploring city life through photography',
      jury: ['Ian Willms', 'Silvia Clo Di Gregorio'],
      pastWinners: 'Previous editions favored documentary and intimate storytelling',
      context: 'Independent photobook publisher based in Italy'
    };

    it('should return a string', () => {
      const prompt = buildAnalysisPrompt(openCallData);
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should include open call title and theme', () => {
      const prompt = buildAnalysisPrompt(openCallData);
      expect(prompt).toContain('Lyricalmyrical Books Open Call 2026');
      expect(prompt).toContain('Urban Narratives');
    });

    it('should include jury information', () => {
      const prompt = buildAnalysisPrompt(openCallData);
      expect(prompt).toContain('Ian Willms');
      expect(prompt).toContain('Silvia Clo Di Gregorio');
    });

    it('should include past winners context', () => {
      const prompt = buildAnalysisPrompt(openCallData);
      expect(prompt).toContain('documentary');
    });

    it('should include publisher/organizer context', () => {
      const prompt = buildAnalysisPrompt(openCallData);
      expect(prompt).toContain('Independent photobook publisher');
    });

    it('should include research context when provided', () => {
      const researchContext = {
        juryDetails: 'Ian Willms is a Canadian documentary photographer known for environmental stories',
        publisherInsights: 'Lyricalmyrical publishes emerging European photographers'
      };
      const prompt = buildAnalysisPrompt(openCallData, researchContext);
      expect(prompt).toContain('Canadian documentary photographer');
      expect(prompt).toContain('emerging European photographers');
    });

    it('should include memory context when provided', () => {
      const memoryContext = 'Previously analyzed 3 similar open calls. Jury tends to favor conceptual work over straight documentary.';
      const prompt = buildAnalysisPrompt(openCallData, null, memoryContext);
      expect(prompt).toContain('conceptual work over straight documentary');
    });

    it('should work with minimal open call data', () => {
      const minimal = { title: 'Test Call', theme: 'Test Theme' };
      const prompt = buildAnalysisPrompt(minimal);
      expect(prompt).toContain('Test Call');
      expect(prompt).toContain('Test Theme');
    });

    it('should include task instruction for strategic analysis', () => {
      const prompt = buildAnalysisPrompt(openCallData);
      const lower = prompt.toLowerCase();
      expect(lower).toMatch(/strategic|positioning|curatorial/);
    });
  });
});
