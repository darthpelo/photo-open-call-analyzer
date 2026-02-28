/**
 * Sebastiano (BMed) — Output parser for strategic curatorial analysis.
 * Extracts dual-format output: Markdown (Section A) + JSON (Section B).
 */

const VALID_COMPETITIVENESS = ['low', 'medium', 'high', 'very_high'];
const VALID_RISK_LEVELS = ['low', 'medium', 'high'];

/**
 * Parse raw model output into structured sections.
 * Extracts Markdown (Section A) and JSON (Section B).
 *
 * @param {string} rawText - Raw text from Ollama model
 * @returns {{ markdown: string, json: Object|null }}
 */
export function parseStrategicOutput(rawText) {
  if (!rawText) {
    return { markdown: '', json: null };
  }

  let json = null;
  let markdown = rawText;

  // Try extracting JSON from fenced code block
  const fencedMatch = rawText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fencedMatch) {
    try {
      json = JSON.parse(fencedMatch[1].trim());
      // Remove the JSON block from markdown
      markdown = rawText.replace(/```(?:json)?\s*\n?[\s\S]*?\n?```/, '').trim();
    } catch {
      // Malformed JSON in fence — keep as markdown, json stays null
    }
  }

  // Fallback: try to find inline JSON object at the end
  if (!json) {
    const inlineMatch = rawText.match(/(\{[\s\S]*"call_alignment_score"[\s\S]*\})\s*$/);
    if (inlineMatch) {
      try {
        json = JSON.parse(inlineMatch[1].trim());
        markdown = rawText.replace(inlineMatch[0], '').trim();
      } catch {
        // Not valid JSON
      }
    }
  }

  return { markdown, json };
}

/**
 * Validate a parsed evaluation JSON against expected schema.
 *
 * @param {Object|null} json - Parsed evaluation object
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateEvaluation(json) {
  const errors = [];

  if (!json || typeof json !== 'object') {
    return { valid: false, errors: ['Evaluation is null or not an object'] };
  }

  // Required fields
  if (json.call_alignment_score === undefined) {
    errors.push('Missing required field: call_alignment_score');
  } else if (typeof json.call_alignment_score !== 'number' || json.call_alignment_score < 0 || json.call_alignment_score > 10) {
    errors.push('call_alignment_score must be a number between 0 and 10');
  }

  if (!json.overall_competitiveness) {
    errors.push('Missing required field: overall_competitiveness');
  } else if (!VALID_COMPETITIVENESS.includes(json.overall_competitiveness)) {
    errors.push(`overall_competitiveness must be one of: ${VALID_COMPETITIVENESS.join(', ')}`);
  }

  // Optional scoring dimensions
  if (json.scoring) {
    if (json.scoring.risk_level && !VALID_RISK_LEVELS.includes(json.scoring.risk_level)) {
      errors.push(`scoring.risk_level must be one of: ${VALID_RISK_LEVELS.join(', ')}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
