/**
 * Sebastiano (BMed) — Output parser for strategic curatorial analysis.
 * Extracts dual-format output: Markdown (Section A) + JSON (Section B).
 * Includes JSON repair for common phi3:mini malformations and schema normalization.
 */

const VALID_COMPETITIVENESS = ['low', 'medium', 'high', 'very_high'];
const VALID_RISK_LEVELS = ['low', 'medium', 'high'];

const SCORING_FIELDS = [
  'visual_impact_fit', 'conceptual_coherence_fit', 'editorial_fit',
  'distinctiveness_potential', 'dialogue_potential', 'risk_level'
];

/**
 * Attempt to repair common JSON syntax errors from small language models.
 *
 * @param {string} str - Potentially malformed JSON string
 * @returns {string} Repaired string (caller still needs JSON.parse)
 */
export function repairJson(str) {
  if (!str) return str;

  let repaired = str;

  // 1. Replace single quotes with double quotes
  repaired = repaired.replace(/'/g, '"');

  // 2. Remove trailing commas before } or ]
  repaired = repaired.replace(/,\s*([\]}])/g, '$1');

  // 3. Remove stray key:value pairs outside objects within arrays
  // Pattern: }, "key": "value" } ] — the stray key:value after the object close
  repaired = repaired.replace(/\}\s*,\s*"[^"]*"\s*:\s*"[^"]*"\s*\}/g, '}');

  // 4. Close unclosed brackets/braces — insert missing closers at mismatch points
  let result = '';
  const stack = [];
  let inString = false;
  let escape = false;
  for (const ch of repaired) {
    if (escape) { escape = false; result += ch; continue; }
    if (ch === '\\') { escape = true; result += ch; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString) { result += ch; continue; }

    if (ch === '{') { stack.push('}'); result += ch; }
    else if (ch === '[') { stack.push(']'); result += ch; }
    else if (ch === '}' || ch === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop();
        result += ch;
      } else if (stack.length > 1 && stack[stack.length - 2] === ch) {
        // Mismatch: insert the expected closer first, then consume this one
        result += stack.pop(); // close inner (e.g. ']')
        stack.pop();           // then match outer (e.g. '}')
        result += ch;
      } else if (stack.length > 0) {
        // Wrong closer type — output expected closer instead (e.g. ']' → '}')
        result += stack.pop();
      } else {
        result += ch;
      }
    } else {
      result += ch;
    }
  }
  if (stack.length > 0) {
    result += stack.reverse().join('');
  }
  repaired = result;

  return repaired;
}

/**
 * Normalize a parsed evaluation object to match the expected schema.
 * Handles common phi3:mini structural deviations without mutating the input.
 *
 * @param {Object|null} json - Parsed evaluation object
 * @returns {Object|null} Normalized copy, or null if input is null
 */
export function normalizeEvaluation(json) {
  if (!json || typeof json !== 'object') return json;

  const result = JSON.parse(JSON.stringify(json));

  // 1. If recommended_approach is an object with scoring fields, extract them
  if (result.recommended_approach && typeof result.recommended_approach === 'object') {
    const approach = result.recommended_approach;
    const scoringFromApproach = {};
    const nonScoringParts = [];

    for (const [key, value] of Object.entries(approach)) {
      if (SCORING_FIELDS.includes(key)) {
        scoringFromApproach[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        // Extract description from nested objects, or flatten to string
        if (value.description) {
          nonScoringParts.push(value.description);
        } else {
          nonScoringParts.push(`${key}: ${JSON.stringify(value)}`);
        }
      } else {
        nonScoringParts.push(`${key}: ${value}`);
      }
    }

    if (Object.keys(scoringFromApproach).length > 0) {
      result.scoring = { ...(result.scoring || {}), ...scoringFromApproach };
    }

    result.recommended_approach = nonScoringParts.length > 0
      ? nonScoringParts.join('; ')
      : 'See strategic brief for details';
  }

  // 2. Flatten key_risks objects to strings
  if (Array.isArray(result.key_risks)) {
    result.key_risks = result.key_risks.map(risk => {
      if (typeof risk === 'string') return risk;
      if (risk && typeof risk === 'object' && risk.description) return risk.description;
      if (risk && typeof risk === 'object') return JSON.stringify(risk);
      return String(risk);
    });
  }

  // 3. Move root-level scoring fields into scoring object
  const rootScoringFields = {};
  for (const field of SCORING_FIELDS) {
    if (result[field] !== undefined) {
      rootScoringFields[field] = result[field];
      delete result[field];
    }
  }
  if (Object.keys(rootScoringFields).length > 0) {
    result.scoring = { ...(result.scoring || {}), ...rootScoringFields };
  }

  return result;
}

/**
 * Parse raw model output into structured sections.
 * Extracts Markdown (Section A) and JSON (Section B).
 * Applies JSON repair and schema normalization.
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
    const extracted = fencedMatch[1].trim();
    json = tryParseJson(extracted);
    if (json) {
      markdown = rawText.replace(/```(?:json)?\s*\n?[\s\S]*?\n?```/, '').trim();
    }
  }

  // Fallback: try to find inline JSON object at the end
  if (!json) {
    const inlineMatch = rawText.match(/(\{[\s\S]*"call_alignment_score"[\s\S]*\})\s*$/);
    if (inlineMatch) {
      json = tryParseJson(inlineMatch[1].trim());
      if (json) {
        markdown = rawText.replace(inlineMatch[0], '').trim();
      }
    }
  }

  // Normalize schema if JSON was extracted
  if (json) {
    json = normalizeEvaluation(json);
  }

  return { markdown, json };
}

/**
 * Try to parse a JSON string, applying repair if initial parse fails.
 *
 * @param {string} str - JSON string to parse
 * @returns {Object|null} Parsed object or null
 */
function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    // Try repair
    try {
      return JSON.parse(repairJson(str));
    } catch {
      return null;
    }
  }
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
