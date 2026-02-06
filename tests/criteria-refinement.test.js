/**
 * Unit tests for Criteria Refinement (FR-2.4 Phase 1)
 * Tests validation, normalization, and refinement of evaluation criteria
 */

import { describe, it, expect } from 'vitest';
import {
  validateCriteria,
  normalizeWeights,
  refineCriteria,
  checkAlignment
} from '../src/prompts/criteria-refinement.js';

describe('Criteria Refinement - Validation', () => {
  it('should validate good criteria without issues', () => {
    const criteria = [
      {
        name: 'Emotional Authenticity',
        description: 'Genuine expression revealing inner emotional state, not posed or forced',
        weight: 30
      },
      {
        name: 'Technical Excellence',
        description: 'Sharp focus on eyes, accurate skin tones, proper exposure and lighting',
        weight: 25
      },
      {
        name: 'Compositional Strength',
        description: 'Strong visual arrangement with clear focal point and balanced elements',
        weight: 25
      },
      {
        name: 'Contextual Relevance',
        description: 'Photo relates meaningfully to competition theme and requirements',
        weight: 20
      }
    ];

    const result = validateCriteria(criteria);

    expect(result.valid).toBe(true);
    expect(result.scores.specificity).toBeGreaterThan(7);
    expect(result.issues.filter(i => i.severity === 'high').length).toBe(0);
  });

  it('should detect generic criterion names', () => {
    const criteria = [
      {
        name: 'Quality',
        description: 'Overall quality of the photograph',
        weight: 50
      },
      {
        name: 'Good Composition',
        description: 'Well composed image',
        weight: 50
      }
    ];

    const result = validateCriteria(criteria);

    expect(result.valid).toBe(false);
    expect(result.scores.specificity).toBeLessThan(6);
    expect(result.issues.some(i => i.type === 'generic_name')).toBe(true);
  });

  it('should detect too short criterion names', () => {
    const criteria = [
      {
        name: 'Light',
        description: 'Quality of lighting in the photograph with attention to direction and mood',
        weight: 100
      }
    ];

    const result = validateCriteria(criteria);

    expect(result.issues.some(i => i.type === 'name_too_short')).toBe(true);
  });

  it('should detect too short descriptions', () => {
    const criteria = [
      {
        name: 'Technical Quality',
        description: 'Good technique',
        weight: 100
      }
    ];

    const result = validateCriteria(criteria);

    expect(result.issues.some(i => i.type === 'description_too_short')).toBe(true);
  });

  it('should detect criteria count issues', () => {
    const toofew = [
      { name: 'Criterion 1', description: 'Description of first criterion with enough detail', weight: 50 },
      { name: 'Criterion 2', description: 'Description of second criterion with enough detail', weight: 50 }
    ];

    const result = validateCriteria(toofew);

    expect(result.issues.some(i => i.type === 'count' && i.severity === 'high')).toBe(true);
  });

  it('should detect weight distribution issues', () => {
    const criteria = [
      {
        name: 'Dominant Criterion',
        description: 'This criterion dominates the evaluation with too much weight',
        weight: 70
      },
      {
        name: 'Minor Criterion',
        description: 'This criterion has too little weight to matter significantly',
        weight: 30
      }
    ];

    const result = validateCriteria(criteria);

    expect(result.issues.some(i => i.type === 'weight_too_high')).toBe(true);
  });

  it('should detect incorrect total weight', () => {
    const criteria = [
      { name: 'Criterion 1', description: 'First evaluation criterion with detailed description', weight: 30 },
      { name: 'Criterion 2', description: 'Second evaluation criterion with detailed description', weight: 30 },
      { name: 'Criterion 3', description: 'Third evaluation criterion with detailed description', weight: 30 },
      { name: 'Criterion 4', description: 'Fourth evaluation criterion with detailed description', weight: 30 }
    ];

    const result = validateCriteria(criteria);

    expect(result.issues.some(i => i.type === 'weight_total')).toBe(true);
  });

  it('should detect overlapping criteria', () => {
    const criteria = [
      {
        name: 'Technical Quality Assessment',
        description: 'Evaluation of sharp focus proper exposure accurate colors excellent lighting direction shadow management highlight control dynamic range tonal balance clarity sharpness detail capture',
        weight: 30
      },
      {
        name: 'Technical Excellence Review',
        description: 'Assessment sharp focus proper exposure accurate colors excellent lighting direction shadow management highlight control dynamic range tonal balance clarity sharpness detail capture',
        weight: 30
      },
      {
        name: 'Composition',
        description: 'Visual arrangement and balance of elements in the frame',
        weight: 20
      },
      {
        name: 'Theme Alignment',
        description: 'How well the photo matches the competition theme',
        weight: 20
      }
    ];

    const result = validateCriteria(criteria);

    // With very similar descriptions, overlap should be detected
    expect(result.issues.some(i => i.type === 'overlap')).toBe(true);
  });

  it('should provide suggestions for issues', () => {
    const criteria = [
      {
        name: 'Quality',
        description: 'Good quality photo',
        weight: 100
      }
    ];

    const result = validateCriteria(criteria);

    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0]).toHaveProperty('criterion');
    expect(result.suggestions[0]).toHaveProperty('suggestion');
  });

  it('should calculate overall quality scores', () => {
    const criteria = [
      { name: 'Specific Criterion Name', description: 'Detailed measurable description with concrete photography terms like focus, exposure, lighting', weight: 25 },
      { name: 'Another Specific Name', description: 'Another detailed description with photography terminology and clear evaluation guidance', weight: 25 },
      { name: 'Third Criterion', description: 'Third detailed criterion with measurable elements and specific photography concepts', weight: 25 },
      { name: 'Fourth Criterion', description: 'Fourth criterion with clear measurable photography aspects and technical details', weight: 25 }
    ];

    const result = validateCriteria(criteria);

    expect(result.scores).toHaveProperty('specificity');
    expect(result.scores).toHaveProperty('alignment');
    expect(result.scores).toHaveProperty('overall');
    expect(result.scores.overall).toBeGreaterThanOrEqual(0);
    expect(result.scores.overall).toBeLessThanOrEqual(10);
  });
});

describe('Criteria Refinement - Weight Normalization', () => {
  it('should normalize weights to sum to 100%', () => {
    const criteria = [
      { name: 'Criterion 1', description: 'First criterion', weight: 30 },
      { name: 'Criterion 2', description: 'Second criterion', weight: 30 },
      { name: 'Criterion 3', description: 'Third criterion', weight: 30 },
      { name: 'Criterion 4', description: 'Fourth criterion', weight: 30 }
    ];

    const normalized = normalizeWeights(criteria);
    const total = normalized.reduce((sum, c) => sum + c.weight, 0);

    expect(total).toBe(100);
  });

  it('should handle zero weights with equal distribution', () => {
    const criteria = [
      { name: 'Criterion 1', description: 'First criterion', weight: 0 },
      { name: 'Criterion 2', description: 'Second criterion', weight: 0 },
      { name: 'Criterion 3', description: 'Third criterion', weight: 0 },
      { name: 'Criterion 4', description: 'Fourth criterion', weight: 0 }
    ];

    const normalized = normalizeWeights(criteria);
    const total = normalized.reduce((sum, c) => sum + c.weight, 0);

    expect(total).toBe(100);
    // Should be roughly equal (25 each, with rounding)
    expect(normalized[0].weight).toBeGreaterThanOrEqual(24);
    expect(normalized[0].weight).toBeLessThanOrEqual(26);
  });

  it('should preserve relative proportions', () => {
    const criteria = [
      { name: 'Criterion 1', description: 'First criterion', weight: 20 },
      { name: 'Criterion 2', description: 'Second criterion', weight: 40 }
    ];

    const normalized = normalizeWeights(criteria);

    // Weight ratio should be preserved (1:2)
    expect(normalized[1].weight).toBeGreaterThan(normalized[0].weight);
    expect(Math.round(normalized[1].weight / normalized[0].weight)).toBe(2);
  });

  it('should round weights to integers', () => {
    const criteria = [
      { name: 'Criterion 1', description: 'First criterion', weight: 33 },
      { name: 'Criterion 2', description: 'Second criterion', weight: 33 },
      { name: 'Criterion 3', description: 'Third criterion', weight: 33 }
    ];

    const normalized = normalizeWeights(criteria);

    normalized.forEach(c => {
      expect(Number.isInteger(c.weight)).toBe(true);
    });
  });
});

describe('Criteria Refinement - Criteria Refinement', () => {
  it('should auto-apply weight normalization', () => {
    const criteria = [
      { name: 'Criterion 1', description: 'Detailed description of first criterion', weight: 30 },
      { name: 'Criterion 2', description: 'Detailed description of second criterion', weight: 30 },
      { name: 'Criterion 3', description: 'Detailed description of third criterion', weight: 50 }
    ];

    const validation = validateCriteria(criteria);
    const result = refineCriteria(criteria, validation, { theme: 'Photography' });

    expect(result.refinedCriteria).toBeDefined();
    expect(result.autoApplied.length).toBeGreaterThan(0);
    expect(result.autoApplied.some(r => r.type === 'weight_normalization')).toBe(true);
  });

  it('should suggest refinements for generic names', () => {
    const criteria = [
      { name: 'Quality', description: 'Overall photograph quality assessment', weight: 50 },
      { name: 'Composition', description: 'Visual arrangement of elements', weight: 50 }
    ];

    const validation = validateCriteria(criteria);
    const result = refineCriteria(criteria, validation, { theme: 'Portrait Photography' });

    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions.some(s => s.type === 'name_refinement')).toBe(true);
  });

  it('should suggest splitting dominant criteria', () => {
    const criteria = [
      { name: 'Technical Aspects', description: 'All technical elements of photography', weight: 70 },
      { name: 'Theme', description: 'Alignment with competition theme', weight: 30 }
    ];

    const validation = validateCriteria(criteria);
    const result = refineCriteria(criteria, validation, { theme: 'Photography' });

    expect(result.suggestions.some(s => s.type === 'split_criterion')).toBe(true);
  });

  it('should return both applied and suggested refinements', () => {
    const criteria = [
      { name: 'Quality', description: 'Overall quality metric', weight: 35 },
      { name: 'Composition', description: 'Visual layout', weight: 35 }
    ];

    const validation = validateCriteria(criteria);
    const result = refineCriteria(criteria, validation, { theme: 'Wildlife' });

    expect(result).toHaveProperty('refinedCriteria');
    expect(result).toHaveProperty('refinements');
    expect(result).toHaveProperty('autoApplied');
    expect(result).toHaveProperty('suggestions');
  });
});

describe('Criteria Refinement - Theme Alignment', () => {
  it('should check alignment with competition theme', () => {
    const criteria = [
      { name: 'Behavioral Significance', description: 'Captures meaningful animal behavior in natural setting', weight: 30 },
      { name: 'Environmental Context', description: 'Shows animal in natural habitat with ecological context', weight: 30 },
      { name: 'Technical Quality', description: 'Sharp focus, proper exposure, good composition', weight: 40 }
    ];

    const openCallData = {
      theme: 'Wildlife Behavior in Natural Habitat',
      pastWinners: 'Focus on animal interactions and ecological context'
    };

    const result = checkAlignment(criteria, openCallData);

    expect(result).toHaveProperty('overallAlignment');
    expect(result).toHaveProperty('criteriaAlignment');
    expect(result).toHaveProperty('missingElements');
    expect(result.overallAlignment).toBeGreaterThanOrEqual(0);
    expect(result.overallAlignment).toBeLessThanOrEqual(10);
  });

  it('should identify missing important elements', () => {
    const criteria = [
      { name: 'Composition', description: 'Visual arrangement of elements', weight: 50 },
      { name: 'Color', description: 'Color harmony and balance', weight: 50 }
    ];

    const openCallData = {
      theme: 'Emotional Storytelling through Light',
      pastWinners: 'Previous winners used dramatic lighting to convey emotion'
    };

    const result = checkAlignment(criteria, openCallData);

    // Should identify that 'light' and 'emotion' are missing
    expect(result.missingElements.length).toBeGreaterThan(0);
  });

  it('should score individual criterion alignment', () => {
    const criteria = [
      { name: 'Portrait Lighting', description: 'Quality and direction of portrait lighting', weight: 40 },
      { name: 'Subject Expression', description: 'Emotional expression of portrait subject', weight: 30 },
      { name: 'Background Blur', description: 'Quality of background bokeh', weight: 30 }
    ];

    const openCallData = {
      theme: 'Portrait Photography',
      pastWinners: 'Focus on lighting and expression'
    };

    const result = checkAlignment(criteria, openCallData);

    expect(result.criteriaAlignment.length).toBe(3);
    result.criteriaAlignment.forEach(alignment => {
      expect(alignment).toHaveProperty('criterion');
      expect(alignment).toHaveProperty('score');
      expect(alignment.score).toBeGreaterThanOrEqual(0);
      expect(alignment.score).toBeLessThanOrEqual(10);
    });

    // Lighting and expression should score higher
    const lightingAlignment = result.criteriaAlignment.find(a => a.criterion === 'Portrait Lighting');
    expect(lightingAlignment).toBeDefined();
  });
});
