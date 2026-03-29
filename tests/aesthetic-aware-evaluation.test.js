/**
 * Tests for aesthetic-aware evaluation (description + criteria injection)
 *
 * Ensures that open-call description and user-defined criteria flow
 * into prompts so the system does not penalize intentional analog
 * imperfections when the open call explicitly values them.
 */

import { describe, it, expect } from 'vitest';
import {
  buildSingleStagePrompt,
  buildMultiStagePrompts,
  buildMetaPrompt
} from '../src/prompts/prompt-builder.js';
import { buildEnhancedMetaPrompt, selectTemplate } from '../src/prompts/template-library.js';

// --- buildEnhancedMetaPrompt: description injection ---

describe('buildEnhancedMetaPrompt - description injection', () => {
  it('should include description in Competition Context when present', () => {
    const openCallData = {
      title: 'Grainy Mountains',
      theme: 'Analog mountain photography',
      description: 'Exploration of mountains through analog imperfections and grain.'
    };
    const templateSelection = selectTemplate(openCallData);
    const prompt = buildEnhancedMetaPrompt(openCallData, templateSelection);

    expect(prompt).toContain('Description: Exploration of mountains through analog imperfections and grain.');
  });

  it('should not include description line when description is absent', () => {
    const openCallData = {
      title: 'Clean Contest',
      theme: 'Landscape'
    };
    const templateSelection = selectTemplate(openCallData);
    const prompt = buildEnhancedMetaPrompt(openCallData, templateSelection);

    expect(prompt).not.toContain('Description:');
  });
});

// --- buildEnhancedMetaPrompt: user-defined criteria injection ---

describe('buildEnhancedMetaPrompt - user-defined criteria', () => {
  it('should inject user-defined criteria and skip generate-from-scratch instruction', () => {
    const openCallData = {
      title: 'Grainy Mountains',
      theme: 'Analog mountain photography',
      criteria: [
        { name: 'Grain and Texture', weight: 30, description: 'Visible film grain density' },
        { name: 'Analog Imperfection', weight: 25 }
      ]
    };
    const templateSelection = selectTemplate(openCallData);
    const prompt = buildEnhancedMetaPrompt(openCallData, templateSelection);

    expect(prompt).toContain('Grain and Texture (weight: 30%)');
    expect(prompt).toContain('Visible film grain density');
    expect(prompt).toContain('Analog Imperfection (weight: 25%)');
    expect(prompt).toContain('Do NOT replace these criteria');
    expect(prompt).not.toContain('Generate 5 evaluation criteria');
  });

  it('should use default generate instruction when no criteria provided', () => {
    const openCallData = {
      title: 'Open Contest',
      theme: 'General Photography'
    };
    const templateSelection = selectTemplate(openCallData);
    const prompt = buildEnhancedMetaPrompt(openCallData, templateSelection);

    expect(prompt).toContain('Generate 5 evaluation criteria');
    expect(prompt).not.toContain('Do NOT replace these criteria');
  });
});

// --- buildSingleStagePrompt: aesthetic context injection ---

describe('buildSingleStagePrompt - aesthetic context', () => {
  it('should inject AESTHETIC CONTEXT when description is present', () => {
    const analysisPrompt = {
      title: 'Grainy Mountains',
      theme: 'Analog mountain photography',
      description: 'Exploration of mountains through analog imperfections.',
      criteria: [
        { name: 'Grain', description: 'Film grain quality', weight: 50 },
        { name: 'Mood', description: 'Atmospheric quality', weight: 50 }
      ]
    };

    const prompt = buildSingleStagePrompt(analysisPrompt);

    expect(prompt).toContain('**AESTHETIC CONTEXT (CRITICAL)**');
    expect(prompt).toContain('Exploration of mountains through analog imperfections.');
    expect(prompt).toContain('POSITIVE, not defects');
  });

  it('should inject aestheticContext over description when both present', () => {
    const analysisPrompt = {
      title: 'Grainy Mountains',
      theme: 'Analog mountain',
      description: 'General description.',
      aestheticContext: 'Film grain and light leaks are POSITIVE signals.',
      criteria: [
        { name: 'Grain', description: 'Film grain quality', weight: 100 }
      ]
    };

    const prompt = buildSingleStagePrompt(analysisPrompt);

    expect(prompt).toContain('Film grain and light leaks are POSITIVE signals.');
  });

  it('should not inject aesthetic context when neither description nor aestheticContext present', () => {
    const analysisPrompt = {
      title: 'Clean Contest',
      theme: 'Landscape',
      criteria: [
        { name: 'Composition', description: 'Visual arrangement', weight: 100 }
      ]
    };

    const prompt = buildSingleStagePrompt(analysisPrompt);

    expect(prompt).not.toContain('AESTHETIC CONTEXT');
  });
});

// --- buildMultiStagePrompts: aesthetic context in stage 1 ---

describe('buildMultiStagePrompts - aesthetic context', () => {
  it('should inject aesthetic context into stage 1 understanding prompt', () => {
    const analysisPrompt = {
      title: 'Grainy Mountains',
      theme: 'Analog mountains',
      description: 'Analog imperfections are valued.',
      criteria: [
        { name: 'Grain', description: 'Film grain quality', weight: 100 }
      ]
    };

    const result = buildMultiStagePrompts(analysisPrompt);

    expect(result.stage1.prompt).toContain('AESTHETIC CONTEXT');
    expect(result.stage1.prompt).toContain('Analog imperfections are valued.');
  });

  it('should inject aesthetic context into stage 2 criterion prompts', () => {
    const analysisPrompt = {
      title: 'Grainy Mountains',
      theme: 'Analog mountains',
      aestheticContext: 'Grain is a positive quality.',
      criteria: [
        { name: 'Grain', description: 'Film grain quality', weight: 50 },
        { name: 'Mood', description: 'Atmosphere', weight: 50 }
      ]
    };

    const result = buildMultiStagePrompts(analysisPrompt);

    result.stage2.forEach(s2 => {
      expect(s2.prompt).toContain('AESTHETIC CONTEXT');
      expect(s2.prompt).toContain('Grain is a positive quality.');
    });
  });

  it('should not inject aesthetic context when absent', () => {
    const analysisPrompt = {
      title: 'Clean Contest',
      theme: 'Landscape',
      criteria: [
        { name: 'Composition', description: 'Visual arrangement', weight: 100 }
      ]
    };

    const result = buildMultiStagePrompts(analysisPrompt);

    expect(result.stage1.prompt).not.toContain('AESTHETIC CONTEXT');
  });
});

// --- Schema: aestheticContext and criteria description fields ---

describe('Open call schema - new fields', () => {
  // We test that the schema file includes the new fields by importing and checking
  it('should accept aestheticContext in open-call.json', async () => {
    const { default: schema } = await import('../src/config/open-call.schema.json', { with: { type: 'json' } });

    expect(schema.properties).toHaveProperty('aestheticContext');
    expect(schema.properties.aestheticContext.type).toBe('string');
    expect(schema.properties.aestheticContext.maxLength).toBe(500);
  });

  it('should accept description field in criteria items', async () => {
    const { default: schema } = await import('../src/config/open-call.schema.json', { with: { type: 'json' } });

    // criteria items (top-level criteria, not customCriteria which already has description)
    expect(schema.properties).toHaveProperty('criteria');
    const criteriaItemProps = schema.properties.criteria.items.properties;
    expect(criteriaItemProps).toHaveProperty('description');
  });

  it('should accept description field at top level', async () => {
    const { default: schema } = await import('../src/config/open-call.schema.json', { with: { type: 'json' } });

    expect(schema.properties).toHaveProperty('description');
    expect(schema.properties.description.type).toBe('string');
  });
});
