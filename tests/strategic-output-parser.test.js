import { describe, it, expect } from 'vitest';
import {
  parseStrategicOutput,
  validateEvaluation,
  repairJson,
  normalizeEvaluation
} from '../src/analysis/strategic-output-parser.js';

describe('strategic-output-parser', () => {
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

    it('should handle output with irreparably malformed JSON', () => {
      const badJson = '## Analysis\n\nSome text\n\n```json\n{ bad json here }\n```';
      const result = parseStrategicOutput(badJson);
      expect(result.markdown).toContain('Some text');
      expect(result.json).toBeNull();
    });

    it('should repair and parse JSON with trailing commas', () => {
      const trailingComma = '## Analysis\n\n```json\n{"call_alignment_score": 8, "overall_competitiveness": "high",}\n```';
      const result = parseStrategicOutput(trailingComma);
      expect(result.json).not.toBeNull();
      expect(result.json.call_alignment_score).toBe(8);
    });

    it('should repair and parse JSON with unclosed braces', () => {
      const unclosed = '## Analysis\n\n```json\n{"call_alignment_score": 7, "overall_competitiveness": "medium", "scoring": {"visual_impact_fit": 8}\n```';
      const result = parseStrategicOutput(unclosed);
      expect(result.json).not.toBeNull();
      expect(result.json.call_alignment_score).toBe(7);
    });

    it('should repair real phi3:mini malformed output (Lyricalmyrical pattern)', () => {
      const phi3Output = `## Analysis\n\n\`\`\`json
{
  "call_alignment_score": 9,
  "overall_competitiveness": "medium",
  "key_risks": [
    {
      "description": "Some risk here"
    },
      "strategy": "Some strategy"
    }
  ],
  "recommended_approach": {
    "visual_impact_fit": 9,
    "conceptual_coherence_fit": 8.5,
    "editorial_fit": 9,
    "distinctiveness_potential": 8,
    "dialogue_potential": 7.5,
    "risk_level": "medium"
  }
}
\`\`\``;
      const result = parseStrategicOutput(phi3Output);
      expect(result.json).not.toBeNull();
      expect(result.json.call_alignment_score).toBe(9);
    });

    it('should normalize scoring fields from recommended_approach', () => {
      const misShaped = `## Analysis\n\n\`\`\`json
{
  "call_alignment_score": 8,
  "overall_competitiveness": "high",
  "recommended_approach": {
    "visual_impact_fit": 9,
    "editorial_fit": 8,
    "risk_level": "medium"
  }
}
\`\`\``;
      const result = parseStrategicOutput(misShaped);
      expect(result.json).not.toBeNull();
      expect(result.json.scoring).toBeDefined();
      expect(result.json.scoring.visual_impact_fit).toBe(9);
      expect(typeof result.json.recommended_approach).toBe('string');
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

  describe('repairJson', () => {
    it('should fix trailing commas before closing brace', () => {
      const repaired = repairJson('{"a": 1, "b": 2,}');
      expect(JSON.parse(repaired)).toEqual({ a: 1, b: 2 });
    });

    it('should fix trailing commas before closing bracket', () => {
      const repaired = repairJson('{"arr": [1, 2, 3,]}');
      expect(JSON.parse(repaired)).toEqual({ arr: [1, 2, 3] });
    });

    it('should close unclosed braces', () => {
      const repaired = repairJson('{"a": 1, "b": {"c": 2}');
      expect(JSON.parse(repaired)).toEqual({ a: 1, b: { c: 2 } });
    });

    it('should close unclosed brackets', () => {
      const repaired = repairJson('{"arr": [1, 2, 3}');
      const parsed = JSON.parse(repaired);
      expect(parsed.arr).toContain(1);
    });

    it('should return original string if already valid', () => {
      const valid = '{"a": 1}';
      expect(repairJson(valid)).toBe(valid);
    });

    it('should handle single quotes around values', () => {
      const repaired = repairJson("{'a': 'hello'}");
      expect(JSON.parse(repaired)).toEqual({ a: 'hello' });
    });

    it('should handle mixed issues (trailing comma + unclosed)', () => {
      const repaired = repairJson('{"a": 1, "b": [1, 2,]');
      const parsed = JSON.parse(repaired);
      expect(parsed.a).toBe(1);
    });

    it('should handle empty string', () => {
      expect(repairJson('')).toBe('');
    });

    it('should fix wrong closer type (] instead of })', () => {
      const repaired = repairJson('{"a": {"b": 1]}');
      const parsed = JSON.parse(repaired);
      expect(parsed.a.b).toBe(1);
    });
  });

  describe('normalizeEvaluation', () => {
    it('should return object unchanged when already correct', () => {
      const correct = {
        call_alignment_score: 8,
        overall_competitiveness: 'high',
        recommended_approach: 'lead with conceptual work',
        scoring: { visual_impact_fit: 9 }
      };
      const result = normalizeEvaluation(correct);
      expect(result.recommended_approach).toBe('lead with conceptual work');
      expect(result.scoring.visual_impact_fit).toBe(9);
    });

    it('should move scoring fields from recommended_approach to scoring', () => {
      const misplaced = {
        call_alignment_score: 8,
        overall_competitiveness: 'high',
        recommended_approach: {
          visual_impact_fit: 9,
          editorial_fit: 8,
          risk_level: 'medium'
        }
      };
      const result = normalizeEvaluation(misplaced);
      expect(result.scoring.visual_impact_fit).toBe(9);
      expect(result.scoring.editorial_fit).toBe(8);
      expect(result.scoring.risk_level).toBe('medium');
      expect(typeof result.recommended_approach).toBe('string');
    });

    it('should flatten key_risks objects to strings', () => {
      const objectRisks = {
        call_alignment_score: 7,
        overall_competitiveness: 'medium',
        key_risks: [
          { description: 'heavy competition' },
          { description: 'theme misalignment' }
        ]
      };
      const result = normalizeEvaluation(objectRisks);
      expect(result.key_risks).toEqual(['heavy competition', 'theme misalignment']);
    });

    it('should keep key_risks unchanged when already strings', () => {
      const stringRisks = {
        call_alignment_score: 7,
        overall_competitiveness: 'medium',
        key_risks: ['risk one', 'risk two']
      };
      const result = normalizeEvaluation(stringRisks);
      expect(result.key_risks).toEqual(['risk one', 'risk two']);
    });

    it('should move root-level scoring fields into scoring object', () => {
      const rootScoring = {
        call_alignment_score: 8,
        overall_competitiveness: 'high',
        visual_impact_fit: 9,
        conceptual_coherence_fit: 7,
        risk_level: 'low'
      };
      const result = normalizeEvaluation(rootScoring);
      expect(result.scoring.visual_impact_fit).toBe(9);
      expect(result.scoring.conceptual_coherence_fit).toBe(7);
      expect(result.scoring.risk_level).toBe('low');
      expect(result.visual_impact_fit).toBeUndefined();
    });

    it('should not mutate the input object', () => {
      const input = {
        call_alignment_score: 8,
        overall_competitiveness: 'high',
        recommended_approach: { visual_impact_fit: 9 }
      };
      const original = JSON.parse(JSON.stringify(input));
      normalizeEvaluation(input);
      expect(input).toEqual(original);
    });

    it('should handle null input gracefully', () => {
      expect(normalizeEvaluation(null)).toBeNull();
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
