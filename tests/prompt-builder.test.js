/**
 * Unit tests for Prompt Builder (FR-2.4 Phase 1)
 * Tests prompt construction, multi-stage generation, and enhancement
 */

import { describe, it, expect } from 'vitest';
import {
  buildMetaPrompt,
  buildSingleStagePrompt,
  buildMultiStagePrompts,
  injectStage1Output,
  buildStage3Prompt,
  enhancePromptWithContext,
  getRecommendedTemperature,
  getRecommendedMaxTokens
} from '../src/prompts/prompt-builder.js';

describe('Prompt Builder - Meta-Prompt Construction', () => {
  it('should build meta-prompt with template selection', () => {
    const openCallData = {
      title: 'Wildlife Photography Awards',
      theme: 'Animal Behavior',
      jury: ['Expert 1', 'Expert 2'],
      pastWinners: 'Focus on natural behaviors'
    };

    const result = buildMetaPrompt(openCallData);

    expect(result).toHaveProperty('prompt');
    expect(result).toHaveProperty('metadata');
    expect(typeof result.prompt).toBe('string');
    expect(result.prompt.length).toBeGreaterThan(500);
  });

  it('should include competition metadata', () => {
    const openCallData = {
      title: 'Portrait Contest',
      theme: 'Human Expression',
      jury: ['Photographer A'],
      pastWinners: 'Emotional depth'
    };

    const result = buildMetaPrompt(openCallData);

    expect(result.metadata).toHaveProperty('competitionType');
    expect(result.metadata).toHaveProperty('templateConfidence');
    expect(result.metadata).toHaveProperty('temperature');
    expect(result.metadata).toHaveProperty('maxTokens');
  });

  it('should support jury style option', () => {
    const openCallData = {
      title: 'Art Photography',
      theme: 'Minimalist Aesthetics',
      jury: ['Curator'],
      pastWinners: ''
    };

    const result = buildMetaPrompt(openCallData, { juryStyle: 'minimalist' });

    expect(result.prompt).toContain('minimalist');
    expect(result.metadata.juryStyle).toBe('minimalist');
  });

  it('should support forced template option', () => {
    const openCallData = {
      title: 'Photo Contest',
      theme: 'General Photography',
      jury: [],
      pastWinners: ''
    };

    const result = buildMetaPrompt(openCallData, { forcedTemplate: 'portrait' });

    expect(result.metadata.competitionType).toBe('portrait');
    expect(result.metadata.templateConfidence).toBe('forced');
  });

  it('should include few-shot examples in prompt', () => {
    const openCallData = {
      title: 'Wildlife Awards',
      theme: 'Animal Behavior',
      jury: [],
      pastWinners: ''
    };

    const result = buildMetaPrompt(openCallData);

    expect(result.prompt).toContain('GOOD CRITERIA');
    expect(result.prompt).toContain('BAD CRITERIA');
  });

  it('should provide temperature recommendations', () => {
    const openCallData = {
      title: 'Photography Contest',
      theme: 'Landscape',
      jury: [],
      pastWinners: ''
    };

    const result = buildMetaPrompt(openCallData);

    expect(result.metadata.temperature).toBeGreaterThan(0);
    expect(result.metadata.temperature).toBeLessThan(1);
    expect(result.metadata.temperature).toBe(0.3); // Should match LLaVA recommendation
  });
});

describe('Prompt Builder - Single-Stage Prompt', () => {
  it('should build complete single-stage analysis prompt', () => {
    const analysisPrompt = {
      title: 'Photo Contest',
      theme: 'Nature Photography',
      criteria: [
        { name: 'Composition', description: 'Visual arrangement', weight: 30 },
        { name: 'Technical Quality', description: 'Focus and exposure', weight: 40 },
        { name: 'Originality', description: 'Unique perspective', weight: 30 }
      ]
    };

    const prompt = buildSingleStagePrompt(analysisPrompt);

    expect(typeof prompt).toBe('string');
    expect(prompt).toContain('Photo Contest');
    expect(prompt).toContain('Nature Photography');
    expect(prompt).toContain('Composition');
    expect(prompt).toContain('Technical Quality');
    expect(prompt).toContain('Originality');
  });

  it('should include vision model guidance', () => {
    const analysisPrompt = {
      title: 'Contest',
      theme: 'Photography',
      criteria: [
        { name: 'Test', description: 'Test criterion', weight: 100 }
      ]
    };

    const prompt = buildSingleStagePrompt(analysisPrompt);

    expect(prompt).toContain('OBSERVE BEFORE JUDGING');
    expect(prompt).toContain('BE SPECIFIC');
    expect(prompt).toContain('SCORING CALIBRATION');
  });

  it('should format response requirements', () => {
    const analysisPrompt = {
      title: 'Contest',
      theme: 'Photo',
      criteria: [
        { name: 'Criterion', description: 'Description', weight: 100 }
      ]
    };

    const prompt = buildSingleStagePrompt(analysisPrompt);

    expect(prompt).toContain('OVERALL ASSESSMENT:');
    expect(prompt).toContain('SCORES:');
    expect(prompt).toContain('STRENGTHS:');
    expect(prompt).toContain('IMPROVEMENTS:');
    expect(prompt).toContain('RECOMMENDATION:');
  });
});

describe('Prompt Builder - Multi-Stage Prompts', () => {
  it('should generate all three stages', () => {
    const analysisPrompt = {
      title: 'Photo Contest',
      theme: 'Landscape',
      criteria: [
        { name: 'Composition', description: 'Visual elements', weight: 35 },
        { name: 'Light Quality', description: 'Lighting conditions', weight: 35 },
        { name: 'Originality', description: 'Unique vision', weight: 30 }
      ]
    };

    const result = buildMultiStagePrompts(analysisPrompt);

    expect(result).toHaveProperty('stage1');
    expect(result).toHaveProperty('stage2');
    expect(result).toHaveProperty('stage3Template');
    expect(result).toHaveProperty('metadata');
  });

  it('should create one stage2 prompt per criterion', () => {
    const analysisPrompt = {
      title: 'Contest',
      theme: 'Photo',
      criteria: [
        { name: 'Criterion 1', description: 'First', weight: 25 },
        { name: 'Criterion 2', description: 'Second', weight: 25 },
        { name: 'Criterion 3', description: 'Third', weight: 25 },
        { name: 'Criterion 4', description: 'Fourth', weight: 25 }
      ]
    };

    const result = buildMultiStagePrompts(analysisPrompt);

    expect(result.stage2.length).toBe(4);
    expect(result.metadata.criteriaCount).toBe(4);
  });

  it('should include temperature settings per stage', () => {
    const analysisPrompt = {
      title: 'Contest',
      theme: 'Photo',
      criteria: [
        { name: 'Test', description: 'Test criterion', weight: 100 }
      ]
    };

    const result = buildMultiStagePrompts(analysisPrompt);

    expect(result.stage1.temperature).toBeDefined();
    expect(result.stage2[0].temperature).toBeDefined();
    expect(result.stage1.temperature).toBeGreaterThan(result.stage2[0].temperature);
  });

  it('should include max tokens per stage', () => {
    const analysisPrompt = {
      title: 'Contest',
      theme: 'Photo',
      criteria: [
        { name: 'Test', description: 'Test criterion', weight: 100 }
      ]
    };

    const result = buildMultiStagePrompts(analysisPrompt);

    expect(result.stage1.maxTokens).toBeDefined();
    expect(result.stage2[0].maxTokens).toBeDefined();
    expect(result.metadata.estimatedTokens).toBeGreaterThan(0);
  });

  it('should handle empty criteria gracefully', () => {
    const analysisPrompt = {
      title: 'Contest',
      theme: 'Photo',
      criteria: []
    };

    const result = buildMultiStagePrompts(analysisPrompt);

    expect(result.stage2.length).toBe(0);
    expect(result.metadata.criteriaCount).toBe(0);
  });
});

describe('Prompt Builder - Stage Integration', () => {
  it('should inject stage 1 output into stage 2 prompts', () => {
    const stage2Prompts = [
      {
        criterion: 'Composition',
        prompt: 'Based on your observation:\n"{stage1_output}"\n\nEvaluate composition...',
        temperature: 0.2,
        maxTokens: 300
      }
    ];

    const stage1Output = 'This photograph shows a mountain landscape with dramatic lighting...';

    const injected = injectStage1Output(stage2Prompts, stage1Output);

    expect(injected[0].prompt).toContain(stage1Output);
    expect(injected[0].prompt).not.toContain('{stage1_output}');
  });

  it('should preserve other prompt properties', () => {
    const stage2Prompts = [
      {
        criterion: 'Test',
        prompt: '{stage1_output}',
        temperature: 0.25,
        maxTokens: 250
      }
    ];

    const injected = injectStage1Output(stage2Prompts, 'Output text');

    expect(injected[0].temperature).toBe(0.25);
    expect(injected[0].maxTokens).toBe(250);
    expect(injected[0].criterion).toBe('Test');
  });

  it('should build stage 3 prompt with scores', () => {
    const scores = [
      { criterion: 'Composition', score: 8, reasoning: 'Strong visual balance' },
      { criterion: 'Light', score: 9, reasoning: 'Excellent golden hour light' },
      { criterion: 'Originality', score: 7, reasoning: 'Unique perspective' }
    ];

    const result = buildStage3Prompt('Template with {scores_summary} and {calculated_score}', scores, 8.1);

    expect(result.prompt).toContain('Composition: 8/10');
    expect(result.prompt).toContain('Light: 9/10');
    expect(result.prompt).toContain('Originality: 7/10');
    expect(result.prompt).toContain('8.1');
    expect(result).toHaveProperty('temperature');
    expect(result).toHaveProperty('maxTokens');
  });
});

describe('Prompt Builder - Context Enhancement', () => {
  it('should enhance prompt with past winners analysis', () => {
    const basePrompt = 'Evaluate this photo...';
    const context = {
      pastWinnersAnalysis: 'Previous winners showed strong use of dramatic lighting and environmental storytelling'
    };

    const enhanced = enhancePromptWithContext(basePrompt, context);

    expect(enhanced).toContain(basePrompt);
    expect(enhanced).toContain('PAST WINNERS PATTERN');
    expect(enhanced).toContain('dramatic lighting');
  });

  it('should enhance prompt with jury quotes', () => {
    const basePrompt = 'Evaluate this photo...';
    const context = {
      juryQuotes: [
        { text: 'I look for emotional authenticity', juryMember: 'John Doe' },
        { text: 'Technical perfection is secondary to vision', juryMember: 'Jane Smith' }
      ]
    };

    const enhanced = enhancePromptWithContext(basePrompt, context);

    expect(enhanced).toContain('JURY PERSPECTIVES');
    expect(enhanced).toContain('emotional authenticity');
    expect(enhanced).toContain('John Doe');
  });

  it('should enhance prompt with red flags', () => {
    const basePrompt = 'Evaluate this photo...';
    const context = {
      redFlags: [
        'Avoid over-processed HDR look',
        'Watch for clichéd sunset compositions',
        'Be wary of excessive post-processing'
      ]
    };

    const enhanced = enhancePromptWithContext(basePrompt, context);

    expect(enhanced).toContain('COMMON MISTAKES TO WATCH FOR');
    expect(enhanced).toContain('over-processed HDR');
    expect(enhanced).toContain('clichéd sunset');
  });

  it('should handle empty context gracefully', () => {
    const basePrompt = 'Evaluate this photo...';
    const enhanced = enhancePromptWithContext(basePrompt, {});

    expect(enhanced).toBe(basePrompt);
  });

  it('should handle all context types together', () => {
    const basePrompt = 'Base prompt';
    const context = {
      pastWinnersAnalysis: 'Winner analysis',
      juryQuotes: [{ text: 'Quote', juryMember: 'Member' }],
      redFlags: ['Red flag 1']
    };

    const enhanced = enhancePromptWithContext(basePrompt, context);

    expect(enhanced).toContain('PAST WINNERS PATTERN');
    expect(enhanced).toContain('JURY PERSPECTIVES');
    expect(enhanced).toContain('COMMON MISTAKES');
  });
});

describe('Prompt Builder - Temperature & Token Recommendations', () => {
  it('should provide temperature for criteria generation', () => {
    const temp = getRecommendedTemperature('criteria');
    expect(temp).toBe(0.3);
  });

  it('should provide temperature for understanding stage', () => {
    const temp = getRecommendedTemperature('understanding');
    expect(temp).toBe(0.4);
  });

  it('should provide temperature for evaluation stage', () => {
    const temp = getRecommendedTemperature('evaluation');
    expect(temp).toBe(0.2);
  });

  it('should provide temperature for consistency stage', () => {
    const temp = getRecommendedTemperature('consistency');
    expect(temp).toBe(0.3);
  });

  it('should provide safe default for unknown type', () => {
    const temp = getRecommendedTemperature('unknown');
    expect(temp).toBe(0.3);
  });

  it('should provide max tokens for criteria generation', () => {
    const tokens = getRecommendedMaxTokens('criteria');
    expect(tokens).toBe(2000);
  });

  it('should provide max tokens for understanding stage', () => {
    const tokens = getRecommendedMaxTokens('understanding');
    expect(tokens).toBe(500);
  });

  it('should provide max tokens for evaluation', () => {
    const tokens = getRecommendedMaxTokens('evaluation');
    expect(tokens).toBe(300);
  });

  it('should provide safe default tokens', () => {
    const tokens = getRecommendedMaxTokens('unknown');
    expect(tokens).toBe(1500);
  });
});
