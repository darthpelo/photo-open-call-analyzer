import { describe, it, expect } from 'vitest';
import {
  parseStrategicOutput,
  validateEvaluation
} from '../src/analysis/bmed-output-parser.js';

describe('bmed-output-parser', () => {
  describe('parseStrategicOutput', () => {
    const wellFormedOutput = `## Open Call Positioning

This call targets emerging photographers with a documentary sensibility. The jury composition suggests a preference for conceptual rigor over pure aesthetics.

## Strategic Assessment

The photographer's double exposure language creates a distinctive positioning advantage. Urban architecture aligns well with the stated theme.

## Risks

- Jury may view double exposure as gimmick if not contextualized
- Competition likely heavy in straight documentary

## Recommendation

Submit with emphasis on architectural series. Lead with strongest conceptual image.

\`\`\`json
{
  "call_alignment_score": 7.8,
  "overall_competitiveness": "high",
  "strategic_positioning": "distinctive technique advantage",
  "key_risks": ["double exposure may be seen as gimmick", "heavy documentary competition"],
  "recommended_approach": "lead with architectural conceptual work",
  "scoring": {
    "visual_impact_fit": 8,
    "conceptual_coherence_fit": 7,
    "editorial_fit": 8,
    "distinctiveness_potential": 9,
    "dialogue_potential": 6,
    "risk_level": "medium"
  }
}
\`\`\``;

    it('should extract both markdown and json from well-formed output', () => {
      const result = parseStrategicOutput(wellFormedOutput);
      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('json');
      expect(typeof result.markdown).toBe('string');
      expect(typeof result.json).toBe('object');
    });

    it('should extract markdown section with headings', () => {
      const result = parseStrategicOutput(wellFormedOutput);
      expect(result.markdown).toContain('## Open Call Positioning');
      expect(result.markdown).toContain('## Strategic Assessment');
      expect(result.markdown).toContain('## Recommendation');
    });

    it('should extract valid JSON with expected fields', () => {
      const result = parseStrategicOutput(wellFormedOutput);
      expect(result.json).toHaveProperty('call_alignment_score');
      expect(result.json).toHaveProperty('overall_competitiveness');
      expect(result.json.call_alignment_score).toBe(7.8);
      expect(result.json.overall_competitiveness).toBe('high');
    });

    it('should extract scoring dimensions from JSON', () => {
      const result = parseStrategicOutput(wellFormedOutput);
      expect(result.json.scoring).toHaveProperty('visual_impact_fit');
      expect(result.json.scoring).toHaveProperty('editorial_fit');
      expect(result.json.scoring).toHaveProperty('risk_level');
    });

    it('should handle output with no JSON block', () => {
      const noJson = '## Analysis\n\nSome strategic analysis without JSON.';
      const result = parseStrategicOutput(noJson);
      expect(result.markdown).toContain('Some strategic analysis');
      expect(result.json).toBeNull();
    });

    it('should handle output with malformed JSON', () => {
      const badJson = '## Analysis\n\nSome text\n\n```json\n{ bad json here }\n```';
      const result = parseStrategicOutput(badJson);
      expect(result.markdown).toContain('Some text');
      expect(result.json).toBeNull();
    });

    it('should handle empty input', () => {
      const result = parseStrategicOutput('');
      expect(result.markdown).toBe('');
      expect(result.json).toBeNull();
    });

    it('should strip JSON block from markdown section', () => {
      const result = parseStrategicOutput(wellFormedOutput);
      expect(result.markdown).not.toContain('```json');
      expect(result.markdown).not.toContain('call_alignment_score');
    });

    it('should handle JSON without code fence markers', () => {
      const inlineJson = `## Analysis\n\nStrategic text here.\n\n{"call_alignment_score": 6.5, "overall_competitiveness": "medium"}`;
      const result = parseStrategicOutput(inlineJson);
      expect(result.json).not.toBeNull();
      expect(result.json.call_alignment_score).toBe(6.5);
    });
  });

  describe('validateEvaluation', () => {
    it('should validate a correct evaluation object', () => {
      const valid = {
        call_alignment_score: 7.8,
        overall_competitiveness: 'high'
      };
      const result = validateEvaluation(valid);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing call_alignment_score', () => {
      const invalid = { overall_competitiveness: 'high' };
      const result = validateEvaluation(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject missing overall_competitiveness', () => {
      const invalid = { call_alignment_score: 7.0 };
      const result = validateEvaluation(invalid);
      expect(result.valid).toBe(false);
    });

    it('should reject score out of range (> 10)', () => {
      const invalid = { call_alignment_score: 11, overall_competitiveness: 'high' };
      const result = validateEvaluation(invalid);
      expect(result.valid).toBe(false);
    });

    it('should reject score out of range (< 0)', () => {
      const invalid = { call_alignment_score: -1, overall_competitiveness: 'high' };
      const result = validateEvaluation(invalid);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid competitiveness value', () => {
      const invalid = { call_alignment_score: 7, overall_competitiveness: 'extreme' };
      const result = validateEvaluation(invalid);
      expect(result.valid).toBe(false);
    });

    it('should accept all valid competitiveness levels', () => {
      for (const level of ['low', 'medium', 'high', 'very_high']) {
        const result = validateEvaluation({ call_alignment_score: 5, overall_competitiveness: level });
        expect(result.valid).toBe(true);
      }
    });

    it('should return valid for null input', () => {
      const result = validateEvaluation(null);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate optional scoring dimensions when present', () => {
      const withScoring = {
        call_alignment_score: 8,
        overall_competitiveness: 'high',
        scoring: {
          visual_impact_fit: 8,
          conceptual_coherence_fit: 7,
          editorial_fit: 9,
          distinctiveness_potential: 8,
          dialogue_potential: 6,
          risk_level: 'medium'
        }
      };
      const result = validateEvaluation(withScoring);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid risk_level in scoring', () => {
      const invalid = {
        call_alignment_score: 8,
        overall_competitiveness: 'high',
        scoring: { risk_level: 'extreme' }
      };
      const result = validateEvaluation(invalid);
      expect(result.valid).toBe(false);
    });
  });
});
