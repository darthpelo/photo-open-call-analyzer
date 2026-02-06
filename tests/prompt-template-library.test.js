/**
 * Unit tests for Template Library (FR-2.4 Phase 1)
 * Tests template selection, competition type detection, and prompt building
 */

import { describe, it, expect } from 'vitest';
import {
  detectCompetitionType,
  selectTemplate,
  getFewShotExamples,
  buildEnhancedMetaPrompt,
  COMPETITION_TEMPLATES,
  FEW_SHOT_EXAMPLES
} from '../src/prompts/template-library.js';

describe('Template Library - Competition Type Detection', () => {
  it('should detect portrait type from theme', () => {
    const type = detectCompetitionType('Portrait Photography Awards', '');
    expect(type).toBe('portrait');
  });

  it('should detect wildlife type from theme', () => {
    const type = detectCompetitionType('Wildlife Behavior Photography', '');
    expect(type).toBe('wildlife');
  });

  it('should detect landscape type from theme', () => {
    const type = detectCompetitionType('Mountain Landscape Scenery', '');
    expect(type).toBe('landscape');
  });

  it('should detect documentary type from context', () => {
    const type = detectCompetitionType('Photography Contest', 'photojournalism and documentary storytelling');
    expect(type).toBe('documentary');
  });

  it('should detect conceptual type from theme', () => {
    const type = detectCompetitionType('Contemporary Art Photography', 'conceptual metaphor');
    expect(type).toBe('conceptual');
  });

  it('should default to generic for unclear themes', () => {
    const type = detectCompetitionType('Photography Competition', '');
    expect(type).toBe('generic');
  });

  it('should handle case insensitivity', () => {
    const type = detectCompetitionType('PORTRAIT PHOTOGRAPHY', '');
    expect(type).toBe('portrait');
  });

  it('should prioritize wildlife over nature for animal keywords', () => {
    const type = detectCompetitionType('Animal Behavior in Nature', '');
    expect(type).toBe('wildlife');
  });
});

describe('Template Library - Template Selection', () => {
  it('should select correct template based on theme', () => {
    const result = selectTemplate({
      theme: 'Portrait Photography',
      context: '',
      pastWinners: ''
    });

    expect(result.type).toBe('portrait');
    expect(result.template).toBeDefined();
    expect(result.template.systemPrompt).toContain('portrait');
    expect(result.confidence).toBe('high');
  });

  it('should include template metadata', () => {
    const result = selectTemplate({
      theme: 'Landscape Photography',
      context: ''
    });

    expect(result.template).toHaveProperty('systemPrompt');
    expect(result.template).toHaveProperty('specificGuidance');
    expect(result.template).toHaveProperty('criteriaKeywords');
    expect(result.template).toHaveProperty('exampleCriteria');
  });

  it('should return generic template with low confidence for unclear themes', () => {
    const result = selectTemplate({
      theme: 'General Photography',
      context: ''
    });

    expect(result.type).toBe('generic');
    expect(result.confidence).toBe('low');
  });

  it('should use past winners context for type detection', () => {
    const result = selectTemplate({
      theme: 'Photography Contest',
      context: '',
      pastWinners: 'Previous winners showed exceptional wildlife behavior captures'
    });

    expect(result.type).toBe('wildlife');
  });
});

describe('Template Library - Few-Shot Examples', () => {
  it('should return examples for specific competition type', () => {
    const examples = getFewShotExamples('portrait');

    expect(Array.isArray(examples)).toBe(true);
    expect(examples.length).toBeGreaterThan(0);
  });

  it('should return wildlife examples when available', () => {
    const examples = getFewShotExamples('wildlife');

    expect(examples.length).toBeGreaterThan(0);
    expect(examples[0]).toHaveProperty('competitionType');
    expect(examples[0]).toHaveProperty('goodCriteria');
    expect(examples[0]).toHaveProperty('badCriteria');
  });

  it('should return fallback examples for unknown types', () => {
    const examples = getFewShotExamples('unknown-type');

    expect(Array.isArray(examples)).toBe(true);
    expect(examples.length).toBeGreaterThan(0);
  });

  it('should include reasoning for good vs bad criteria', () => {
    const examples = getFewShotExamples('wildlife');

    if (examples.length > 0) {
      expect(examples[0].goodCriteria).toHaveProperty('reasoning');
      expect(examples[0].badCriteria).toHaveProperty('reasoning');
    }
  });
});

describe('Template Library - Enhanced Meta-Prompt Building', () => {
  it('should build complete meta-prompt with template', () => {
    const openCallData = {
      title: 'Nature Photography Awards',
      theme: 'Wildlife in Natural Habitat',
      jury: ['John Doe', 'Jane Smith'],
      pastWinners: 'Focus on animal behavior'
    };

    const template = selectTemplate(openCallData);
    const prompt = buildEnhancedMetaPrompt(openCallData, template);

    expect(typeof prompt).toBe('string');
    expect(prompt).toContain('Wildlife in Natural Habitat');
    expect(prompt).toContain('John Doe');
    expect(prompt).toContain('Jane Smith');
  });

  it('should include few-shot examples in prompt', () => {
    const openCallData = {
      title: 'Wildlife Contest',
      theme: 'Animal Behavior',
      jury: ['Expert'],
      pastWinners: ''
    };

    const template = selectTemplate(openCallData);
    const prompt = buildEnhancedMetaPrompt(openCallData, template);

    expect(prompt).toContain('GOOD CRITERIA');
    expect(prompt).toContain('BAD CRITERIA');
    expect(prompt).toContain('Why good');
    expect(prompt).toContain('Why bad');
  });

  it('should include specific guidance from template', () => {
    const openCallData = {
      title: 'Portrait Awards',
      theme: 'Human Expression',
      jury: ['Photographer'],
      pastWinners: ''
    };

    const template = selectTemplate(openCallData);
    const prompt = buildEnhancedMetaPrompt(openCallData, template);

    expect(prompt).toContain(template.template.specificGuidance);
  });

  it('should format criteria requirements clearly', () => {
    const openCallData = {
      title: 'Photo Contest',
      theme: 'Landscape',
      jury: [],
      pastWinners: ''
    };

    const template = selectTemplate(openCallData);
    const prompt = buildEnhancedMetaPrompt(openCallData, template);

    expect(prompt).toContain('CRITERION:');
    expect(prompt).toContain('DESCRIPTION:');
    expect(prompt).toContain('WEIGHT:');
    expect(prompt).toContain('5 evaluation criteria');
  });

  it('should list terms to avoid', () => {
    const openCallData = {
      title: 'Photo Contest',
      theme: 'Wildlife',
      jury: [],
      pastWinners: ''
    };

    const template = selectTemplate(openCallData);
    const prompt = buildEnhancedMetaPrompt(openCallData, template);

    const avoidTerms = template.template.avoidGeneric;
    avoidTerms.forEach(term => {
      expect(prompt).toContain(term);
    });
  });
});

describe('Template Library - Template Content Quality', () => {
  it('should have all required templates defined', () => {
    const requiredTypes = ['portrait', 'landscape', 'conceptual', 'documentary', 'wildlife', 'generic'];

    requiredTypes.forEach(type => {
      expect(COMPETITION_TEMPLATES[type]).toBeDefined();
      expect(COMPETITION_TEMPLATES[type].systemPrompt).toBeDefined();
      expect(COMPETITION_TEMPLATES[type].specificGuidance).toBeDefined();
    });
  });

  it('should have non-empty system prompts', () => {
    Object.values(COMPETITION_TEMPLATES).forEach(template => {
      expect(template.systemPrompt.length).toBeGreaterThan(50);
    });
  });

  it('should have example criteria with good and bad examples', () => {
    Object.values(COMPETITION_TEMPLATES).forEach(template => {
      expect(template.exampleCriteria.good).toBeDefined();
      expect(template.exampleCriteria.bad).toBeDefined();
      expect(Array.isArray(template.exampleCriteria.good)).toBe(true);
      expect(Array.isArray(template.exampleCriteria.bad)).toBe(true);
    });
  });

  it('should have criteria keywords defined', () => {
    Object.values(COMPETITION_TEMPLATES).forEach(template => {
      expect(Array.isArray(template.criteriaKeywords)).toBe(true);
      expect(template.criteriaKeywords.length).toBeGreaterThan(0);
    });
  });
});

describe('Template Library - Few-Shot Examples Structure', () => {
  it('should have structured few-shot examples', () => {
    expect(Array.isArray(FEW_SHOT_EXAMPLES)).toBe(true);
    expect(FEW_SHOT_EXAMPLES.length).toBeGreaterThan(0);
  });

  it('should have complete example structure', () => {
    FEW_SHOT_EXAMPLES.forEach(example => {
      expect(example).toHaveProperty('competitionType');
      expect(example).toHaveProperty('theme');
      expect(example).toHaveProperty('goodCriteria');
      expect(example).toHaveProperty('badCriteria');

      expect(example.goodCriteria).toHaveProperty('criteria');
      expect(example.goodCriteria).toHaveProperty('reasoning');
      expect(example.badCriteria).toHaveProperty('criteria');
      expect(example.badCriteria).toHaveProperty('reasoning');
    });
  });

  it('should have valid criterion structure in examples', () => {
    FEW_SHOT_EXAMPLES.forEach(example => {
      example.goodCriteria.criteria.forEach(criterion => {
        expect(criterion).toHaveProperty('name');
        expect(criterion).toHaveProperty('description');
        expect(criterion).toHaveProperty('weight');
        expect(typeof criterion.weight).toBe('number');
      });
    });
  });
});
