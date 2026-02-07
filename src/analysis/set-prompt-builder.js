/**
 * Set-level prompt builder for multi-image vision analysis.
 * Generates prompts for evaluating photo sets as cohesive groups.
 * Part of FR-3.11: Polaroid Set Analysis (ADR-015).
 */

/**
 * Get default set evaluation criteria.
 * Used when setCriteria is not provided in config.
 * @returns {Object[]} Default set criteria
 */
export function getDefaultSetCriteria() {
  return [
    {
      name: 'Visual Coherence',
      weight: 25,
      description: 'Consistency of style, color palette, tonal quality, and aesthetic approach across all photos'
    },
    {
      name: 'Thematic Dialogue',
      weight: 30,
      description: 'How the photos converse with each other, building upon or contrasting themes meaningfully'
    },
    {
      name: 'Narrative Arc',
      weight: 25,
      description: 'Whether the set tells a story or creates a journey from first to last photo'
    },
    {
      name: 'Complementarity',
      weight: 20,
      description: 'How each photo adds unique value to the set without redundancy'
    }
  ];
}

/**
 * Build the prompt for set-level analysis.
 * Sent along with multiple images to the vision model.
 *
 * @param {Object} analysisPrompt - Analysis prompt with title, theme, criteria
 * @param {Object} setConfig - Set mode configuration
 * @param {Object[]} [individualResults=[]] - Individual photo scores for context
 * @returns {string} Complete set analysis prompt
 */
export function buildSetAnalysisPrompt(analysisPrompt, setConfig, individualResults = []) {
  const title = analysisPrompt.title || 'Photography Competition';
  const theme = analysisPrompt.theme || '';
  const setSize = setConfig.setSize || 4;
  const setCriteria = setConfig.setCriteria || getDefaultSetCriteria();

  let prompt = `You are an expert photography exhibition curator evaluating a SET of ${setSize} photographs for a cohesive group submission.

**Exhibition**: ${title}
**Theme**: ${theme}

You are viewing ${setSize} photographs that are being considered as a cohesive set for exhibition.
Photo 1 is the first image, Photo 2 is the second, and so on.

Your task is to evaluate these photos AS A GROUP — how well they work together, their visual dialogue, and their collective impact.

---

**SET EVALUATION CRITERIA**:
`;

  setCriteria.forEach(criterion => {
    prompt += `- **${criterion.name}** (${criterion.weight}%): ${criterion.description || 'No description provided'}\n`;
  });

  if (individualResults.length > 0) {
    prompt += `\n---\n\n**INDIVIDUAL PHOTO CONTEXT** (previously scored):\n`;
    individualResults.forEach((result, index) => {
      const filename = result.filename || `Photo ${index + 1}`;
      const score = result.score !== undefined ? result.score.toFixed(1) : 'N/A';
      prompt += `- Photo ${index + 1} (${filename}): Individual score ${score}/10\n`;
    });
  }

  prompt += `
---

**RESPONSE FORMAT** (follow this format exactly):

SET OVERVIEW:
[2-3 sentences about the set as a whole — first impression, overall feel]

SET SCORES:
`;

  setCriteria.forEach(criterion => {
    prompt += `SET_SCORE: ${criterion.name}: X/10 - [reasoning]\n`;
  });

  prompt += `
PHOTO ROLES:
`;

  for (let i = 1; i <= setSize; i++) {
    prompt += `PHOTO_ROLE: Photo ${i}: [role this photo plays in the set]\n`;
  }

  prompt += `
SUGGESTED_ORDER: [comma-separated numbers for optimal viewing order, e.g., 1, 3, 2, 4]

SET STRENGTHS:
- [strength 1]
- [strength 2]

SET WEAKNESSES:
- [weakness 1]

WEAKEST LINK: Photo [N] - [why this photo weakens the set]
REPLACEMENT SUGGESTION: [what kind of photo would strengthen the set]

SET_RECOMMENDATION: [Strong Set / Good Set / Needs Work / Weak Set]
`;

  return prompt;
}
