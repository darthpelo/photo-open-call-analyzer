import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import {
  validateResearchBrief,
  validateCriteriaReasoning,
  validateExcirePrompts
} from '../src/config/discovery-validator.js';

describe('validateResearchBrief', () => {
  const valid = {
    callName: 'Instants d\'Arles 2026',
    url: 'https://example.com/open-call',
    deadline: '2026-06-15',
    themeAnalysis: 'The call asks for intimate moments of daily life in the Arles region',
    juryProfile: 'Three curators from Rencontres d\'Arles with documentary focus',
    pastWinnersPatterns: 'Previous winners favored warm tones and human presence',
    strategicAngles: [
      { angle: 'Documentary intimacy', rationale: 'Aligns with jury documentary background' }
    ],
    suggestedQuestionsForArtCritic: [
      { question: 'Do you have a body of work on daily life?', why: 'Theme requires existing material' }
    ]
  };

  it('accepts a valid research brief', () => {
    const result = validateResearchBrief(valid);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('requires callName', () => {
    const { callName, ...missing } = valid;
    const result = validateResearchBrief(missing);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('callName'))).toBe(true);
  });

  it('requires url', () => {
    const { url, ...missing } = valid;
    const result = validateResearchBrief(missing);
    expect(result.valid).toBe(false);
  });

  it('requires themeAnalysis', () => {
    const { themeAnalysis, ...missing } = valid;
    const result = validateResearchBrief(missing);
    expect(result.valid).toBe(false);
  });

  it('requires at least one strategic angle', () => {
    const result = validateResearchBrief({ ...valid, strategicAngles: [] });
    expect(result.valid).toBe(false);
  });

  it('allows optional fields to be missing', () => {
    const { juryProfile, pastWinnersPatterns, ...minimal } = valid;
    const result = validateResearchBrief(minimal);
    expect(result.valid).toBe(true);
  });

  it('validates deadline format (YYYY-MM-DD)', () => {
    const result = validateResearchBrief({ ...valid, deadline: '15/06/2026' });
    expect(result.valid).toBe(false);
  });

  it('rejects non-object input', () => {
    expect(validateResearchBrief(null).valid).toBe(false);
    expect(validateResearchBrief('string').valid).toBe(false);
  });
});

describe('validateCriteriaReasoning', () => {
  const valid = {
    criteria: [
      { name: 'Narrative Depth', weight: 30, motivation: 'Jury values storytelling' },
      { name: 'Technical Quality', weight: 25, motivation: 'High resolution required' }
    ],
    userContext: {
      bodyOfWork: 'Street photography in Southern France',
      intention: 'Show the invisible routines of daily life',
      constraints: 'Only 4 photos, Polaroid format'
    },
    openCallJsonPath: 'data/open-calls/instants-arles/open-call.json'
  };

  it('accepts valid criteria reasoning', () => {
    const result = validateCriteriaReasoning(valid);
    expect(result.valid).toBe(true);
  });

  it('requires at least one criterion', () => {
    const result = validateCriteriaReasoning({ ...valid, criteria: [] });
    expect(result.valid).toBe(false);
  });

  it('requires motivation for each criterion', () => {
    const bad = {
      ...valid,
      criteria: [{ name: 'Test', weight: 50 }]
    };
    const result = validateCriteriaReasoning(bad);
    expect(result.valid).toBe(false);
  });

  it('requires userContext', () => {
    const { userContext, ...missing } = valid;
    const result = validateCriteriaReasoning(missing);
    expect(result.valid).toBe(false);
  });

  it('requires openCallJsonPath', () => {
    const { openCallJsonPath, ...missing } = valid;
    const result = validateCriteriaReasoning(missing);
    expect(result.valid).toBe(false);
  });

  it('validates weight range (1-100)', () => {
    const bad = {
      ...valid,
      criteria: [{ name: 'Test', weight: 150, motivation: 'Too much' }]
    };
    const result = validateCriteriaReasoning(bad);
    expect(result.valid).toBe(false);
  });
});

describe('validateExcirePrompts', () => {
  const valid = {
    strategies: [
      {
        strategy: 'direct',
        prompts: [
          {
            prompt: 'person walking alone on cobblestone street',
            strictnessHint: 'medium',
            rationale: 'Literal interpretation of daily life theme'
          }
        ]
      },
      {
        strategy: 'metaphorical',
        prompts: [
          {
            prompt: 'warm light through old window with dust particles',
            strictnessHint: 'low',
            keywordRefinement: 'portrait',
            rationale: 'Poetic take on intimacy and routine'
          }
        ]
      }
    ]
  };

  it('accepts valid excire prompts', () => {
    const result = validateExcirePrompts(valid);
    expect(result.valid).toBe(true);
  });

  it('requires at least one strategy', () => {
    const result = validateExcirePrompts({ strategies: [] });
    expect(result.valid).toBe(false);
  });

  it('validates strategy enum values', () => {
    const bad = {
      strategies: [{
        strategy: 'invalid_strategy',
        prompts: [{ prompt: 'test', strictnessHint: 'low', rationale: 'test' }]
      }]
    };
    const result = validateExcirePrompts(bad);
    expect(result.valid).toBe(false);
  });

  it('validates strictnessHint enum values', () => {
    const bad = {
      strategies: [{
        strategy: 'direct',
        prompts: [{ prompt: 'test', strictnessHint: 'extreme', rationale: 'test' }]
      }]
    };
    const result = validateExcirePrompts(bad);
    expect(result.valid).toBe(false);
  });

  it('allows keywordRefinement to be optional', () => {
    const minimal = {
      strategies: [{
        strategy: 'bold',
        prompts: [{ prompt: 'abstract shapes in concrete', strictnessHint: 'high', rationale: 'Unexpected angle' }]
      }]
    };
    const result = validateExcirePrompts(minimal);
    expect(result.valid).toBe(true);
  });

  it('requires prompt text to be non-empty', () => {
    const bad = {
      strategies: [{
        strategy: 'direct',
        prompts: [{ prompt: '', strictnessHint: 'low', rationale: 'test' }]
      }]
    };
    const result = validateExcirePrompts(bad);
    expect(result.valid).toBe(false);
  });

  it('accepts cascade strategy', () => {
    const cascade = {
      strategies: [{
        strategy: 'cascade',
        prompts: [
          { prompt: 'emotional scene with strong contrast', strictnessHint: 'low', rationale: 'Broad first pass' },
          { prompt: 'intimate portrait in natural light', strictnessHint: 'high', rationale: 'Narrowing to portraits' }
        ]
      }]
    };
    const result = validateExcirePrompts(cascade);
    expect(result.valid).toBe(true);
  });
});
