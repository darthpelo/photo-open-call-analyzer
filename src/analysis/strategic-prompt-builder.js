/**
 * Sebastiano — Strategic prompt builder for curatorial analysis.
 * Builds token-efficient prompts for Ollama text model reasoning.
 * Part of FR-B9 (token-efficient prompt) and FR-B4 (photographer profile).
 */

/**
 * Returns the default photographer profile.
 * @returns {Object} Profile with coreLanguage, orientation, context
 */
export function getDefaultProfile() {
  return {
    coreLanguage: 'double exposure, urban architecture',
    technique: 'in-camera double exposure (analog and digital), layering urban structures and textures',
    subjects: 'city architecture, building facades, urban geometry, structural patterns, construction sites',
    aesthetic: 'high contrast, geometric composition, architectural abstraction, both b&w and color',
    strengths: 'formal tension through layering, visual complexity from superimposed urban elements, distinctive recognizable style',
    orientation: 'photobook-oriented thinking, sequential narrative through images',
    context: 'independent publishing, European photography open calls, emerging photographer'
  };
}

/**
 * Builds the system prompt for Sebastiano's curatorial reasoning.
 * Target: < 800 tokens (estimated as words * 1.3).
 *
 * @param {Object} profile - Photographer profile
 * @param {string} profile.coreLanguage - Core photographic language
 * @param {string} profile.orientation - Creative orientation
 * @param {string} profile.context - Professional context
 * @returns {string} System prompt
 */
export function buildSystemPrompt(profile) {
  return `You are Sebastiano, a decisive photography curator and strategic advisor.

ROLE: Analyze open calls strategically. No reassurance. No hedging. Clear decisions.

THE PHOTOGRAPHER (evaluate the open call FOR this specific artist — do NOT confuse with jury themes):
- Visual language: ${profile.coreLanguage}
- Technique: ${profile.technique || 'not specified'}
- Subjects: ${profile.subjects || 'not specified'}
- Aesthetic: ${profile.aesthetic || 'not specified'}
- Strengths: ${profile.strengths || 'not specified'}
- Orientation: ${profile.orientation}
- Context: ${profile.context}

SCORING WEIGHTS (apply implicitly):
Visual Impact 25% | Conceptual Coherence 20% | Editorial Fit 20% | Distinctiveness 15% | Dialogue Potential 10% | Risk Factor 10%

OUTPUT FORMAT:
Section A — Markdown analysis with these headings:
## Open Call Positioning
## Strategic Assessment
## Risks
## Recommendation

Section B — JSON block with:
{"call_alignment_score": 0-10, "overall_competitiveness": "low|medium|high|very_high", "strategic_positioning": "", "key_risks": [], "recommended_approach": "", "verdict": "go|no-go|conditional", "verdict_confidence": 0-100, "verdict_reasoning": "one sentence", "scoring": {"visual_impact_fit": 0-10, "conceptual_coherence_fit": 0-10, "editorial_fit": 0-10, "distinctiveness_potential": 0-10, "dialogue_potential": 0-10, "risk_level": "low|medium|high"}}

VERDICT RULES:
- "go" if alignment >= 7 and no critical risks
- "no-go" if alignment < 4 or multiple critical risks
- "conditional" otherwise — state specific conditions
- verdict_confidence: your certainty in the verdict (0-100)
- verdict_reasoning: one decisive sentence

RULES:
- Evaluate from the photographer's specific practice, not generically
- Identify hidden jury preferences beyond stated theme
- Flag strategic risks explicitly
- Provide decisive recommendations with reasoning`;
}

/**
 * Builds the user message with open call context for analysis.
 *
 * @param {Object} openCallData - Open call configuration
 * @param {string} openCallData.title - Open call title
 * @param {string} openCallData.theme - Theme description
 * @param {string[]} [openCallData.jury] - Jury members
 * @param {string} [openCallData.pastWinners] - Past winners description
 * @param {string} [openCallData.context] - Additional context
 * @param {Object} [researchContext] - Research phase output (Sprint 2)
 * @param {string} [memoryContext] - Cross-session memory context (Sprint 3)
 * @returns {string} User prompt
 */
export function buildAnalysisPrompt(openCallData, researchContext = null, memoryContext = null) {
  const parts = [];

  parts.push(`Analyze this open call strategically for the photographer's practice.`);

  parts.push(`\nOPEN CALL:\nTitle: ${openCallData.title}\nTheme: ${openCallData.theme}`);

  if (openCallData.jury && openCallData.jury.length > 0) {
    parts.push(`Jury: ${Array.isArray(openCallData.jury) ? openCallData.jury.join(', ') : openCallData.jury}`);
  }

  if (openCallData.pastWinners) {
    parts.push(`Past Winners: ${openCallData.pastWinners}`);
  }

  if (openCallData.context) {
    parts.push(`Context: ${openCallData.context}`);
  }

  if (openCallData.submissionRules) {
    const rules = openCallData.submissionRules;
    const rulesParts = [];
    if (rules.maxPhotos) rulesParts.push(`max ${rules.maxPhotos} photos`);
    if (rules.deadline) rulesParts.push(`deadline: ${rules.deadline}`);
    if (rules.requiredFormat) rulesParts.push(`format: ${rules.requiredFormat}`);
    if (rulesParts.length > 0) {
      parts.push(`Submission: ${rulesParts.join(', ')}`);
    }
  }

  if (researchContext) {
    parts.push('\nRESEARCH CONTEXT:');
    if (typeof researchContext === 'string') {
      parts.push(researchContext);
    } else {
      for (const [key, value] of Object.entries(researchContext)) {
        if (value) parts.push(`${key}: ${value}`);
      }
    }
  }

  if (memoryContext) {
    parts.push(`\nHISTORICAL MEMORY:\n${memoryContext}`);
  }

  parts.push('\nProvide curatorial positioning analysis with Section A (Markdown) and Section B (JSON).');

  return parts.join('\n');
}
