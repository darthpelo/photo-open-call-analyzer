/**
 * Prompt Builder for Enhanced Prompt Engineering (FR-2.4)
 *
 * Centralizes prompt construction logic using templates and context
 * to generate optimized prompts for both criteria generation and photo analysis.
 *
 * Part of Milestone 2: Enhanced Prompt Engineering
 */

import {
  selectTemplate,
  buildEnhancedMetaPrompt,
  EVALUATION_STAGES,
  VISION_MODEL_GUIDANCE
} from './template-library.js';

/**
 * Build meta-prompt for criteria generation using template library
 *
 * @param {Object} openCallData - Open call metadata
 * @param {Object} options - Additional options
 * @param {string} options.juryStyle - Optional jury style/tone (e.g., "minimalist", "bold")
 * @param {string} options.forcedTemplate - Force specific template type
 * @returns {Object} Enhanced meta-prompt with metadata
 */
export function buildMetaPrompt(openCallData, options = {}) {
  // Select appropriate template
  const templateSelection = options.forcedTemplate
    ? {
        type: options.forcedTemplate,
        template: selectTemplate({ theme: options.forcedTemplate }).template,
        confidence: 'forced'
      }
    : selectTemplate(openCallData);

  // Build enhanced prompt with few-shot examples
  let prompt = buildEnhancedMetaPrompt(openCallData, templateSelection);

  // Add jury style context if provided (FR-2.4 requirement)
  if (options.juryStyle) {
    prompt += `\n**JURY STYLE PREFERENCE**: ${options.juryStyle}\n`;
    prompt += `Ensure criteria reflect this aesthetic: `;

    switch (options.juryStyle.toLowerCase()) {
      case 'minimalist':
        prompt += 'Favor simplicity, restraint, negative space, subtle expression over drama.\n';
        break;
      case 'bold':
        prompt += 'Favor strong colors, dramatic contrast, powerful compositions, high impact.\n';
        break;
      case 'experimental':
        prompt += 'Favor innovation, unconventional techniques, boundary-pushing concepts.\n';
        break;
      case 'traditional':
        prompt += 'Favor classical composition, technical perfection, timeless aesthetics.\n';
        break;
      default:
        prompt += `${options.juryStyle}\n`;
    }
  }

  return {
    prompt,
    metadata: {
      competitionType: templateSelection.type,
      templateConfidence: templateSelection.confidence,
      juryStyle: options.juryStyle || null,
      temperature: VISION_MODEL_GUIDANCE.llava.temperatureRecommendations.criteriaGeneration,
      maxTokens: VISION_MODEL_GUIDANCE.llava.tokenBudget.criteriaGeneration
    }
  };
}

/**
 * Build single-stage photo analysis prompt (legacy compatibility)
 *
 * @param {Object} analysisPrompt - Analysis configuration with criteria
 * @returns {string} Complete analysis prompt
 */
export function buildSingleStagePrompt(analysisPrompt) {
  const visionGuidance = VISION_MODEL_GUIDANCE.llava.optimizedInstructions;

  let prompt = `You are an expert photography critic and competition juror. Analyze this photograph for a photography open call.\n\n`;

  if (analysisPrompt.title) {
    prompt += `**Competition**: ${analysisPrompt.title}\n`;
  }

  if (analysisPrompt.theme) {
    prompt += `**Theme**: ${analysisPrompt.theme}\n`;
  }

  if (analysisPrompt.criteria && analysisPrompt.criteria.length > 0) {
    prompt += '\n**Evaluation Criteria**:\n';
    analysisPrompt.criteria.forEach((criterion) => {
      const weight = criterion.weight ? ` (${criterion.weight}%)` : '';
      prompt += `- ${criterion.name}${weight}: ${criterion.description}\n`;
    });
  }

  // Add vision model guidance
  prompt += '\n' + visionGuidance + '\n';

  prompt += `
**RESPONSE FORMAT**:

OVERALL ASSESSMENT:
[Brief overall assessment in 2-3 sentences]

SCORES:
`;

  // Add score lines for each criterion
  if (analysisPrompt.criteria && analysisPrompt.criteria.length > 0) {
    analysisPrompt.criteria.forEach((criterion) => {
      prompt += `SCORE: ${criterion.name}: [X]/10 - [justification with specific visual evidence]\n`;
    });
  }

  prompt += `
STRENGTHS:
- [strength 1 - specific visible element]
- [strength 2 - specific visible element]

IMPROVEMENTS:
- [suggestion 1 - concrete actionable advice]
- [suggestion 2 - concrete actionable advice]

RECOMMENDATION: [Strong Yes / Yes / Maybe / No]
`;

  return prompt;
}

/**
 * Build multi-stage photo analysis prompts
 *
 * @param {Object} analysisPrompt - Analysis configuration with criteria
 * @param {Object} options - Additional options
 * @returns {Object} Object containing all three stage prompts
 */
export function buildMultiStagePrompts(analysisPrompt, options = {}) {
  const stages = EVALUATION_STAGES;

  // Stage 1: Understanding (no scoring)
  const stage1 = {
    prompt: stages.stage1_understanding.prompt,
    temperature: stages.stage1_understanding.temperature,
    maxTokens: stages.stage1_understanding.maxTokens,
    purpose: stages.stage1_understanding.purpose
  };

  // Stage 2: Per-criterion evaluation (will be called once per criterion)
  const stage2Template = stages.stage2_evaluation.promptTemplate;
  const stage2Prompts = (analysisPrompt.criteria || []).map(criterion => ({
    criterion: criterion.name,
    prompt: stage2Template
      .replace('{criterion_name}', criterion.name)
      .replace('{criterion_name}', criterion.name) // Replace both occurrences
      .replace('{criterion_weight}', criterion.weight || 20)
      .replace('{criterion_description}', criterion.description),
    temperature: stages.stage2_evaluation.temperature,
    maxTokens: stages.stage2_evaluation.maxTokens
  }));

  // Stage 3: Consistency check (requires stage 1 output and all stage 2 scores)
  const stage3Template = stages.stage3_consistency.promptTemplate;

  return {
    stage1: stage1,
    stage2: stage2Prompts,
    stage3Template: stage3Template,
    metadata: {
      totalStages: 3,
      criteriaCount: (analysisPrompt.criteria || []).length,
      estimatedTokens:
        stage1.maxTokens +
        (stage2Prompts.length * stages.stage2_evaluation.maxTokens) +
        stages.stage3_consistency.maxTokens
    }
  };
}

/**
 * Inject stage 1 output into stage 2 prompts
 *
 * @param {Array} stage2Prompts - Stage 2 prompt templates
 * @param {string} stage1Output - Output from stage 1 understanding
 * @returns {Array} Stage 2 prompts with stage 1 output injected
 */
export function injectStage1Output(stage2Prompts, stage1Output) {
  return stage2Prompts.map(promptObj => ({
    ...promptObj,
    prompt: promptObj.prompt.replace('{stage1_output}', stage1Output)
  }));
}

/**
 * Build stage 3 consistency check prompt with all scores
 *
 * @param {string} stage3Template - Template from stage 3
 * @param {Array} scores - Array of {criterion, score, reasoning} objects
 * @param {number} calculatedScore - Weighted average score
 * @returns {Object} Complete stage 3 prompt
 */
export function buildStage3Prompt(stage3Template, scores, calculatedScore) {
  // Build scores summary
  const scoresSummary = scores.map(s =>
    `- ${s.criterion}: ${s.score}/10 - ${s.reasoning}`
  ).join('\n');

  const prompt = stage3Template
    .replace('{scores_summary}', scoresSummary)
    .replace('{calculated_score}', calculatedScore.toFixed(1));

  return {
    prompt,
    temperature: EVALUATION_STAGES.stage3_consistency.temperature,
    maxTokens: EVALUATION_STAGES.stage3_consistency.maxTokens
  };
}

/**
 * Enhance prompt with additional context
 *
 * @param {string} basePrompt - Base prompt to enhance
 * @param {Object} contextData - Additional context
 * @param {string} contextData.pastWinnersAnalysis - Analysis of past winners
 * @param {Array} contextData.juryQuotes - Quotes from jury members
 * @param {Array} contextData.redFlags - Common mistakes to avoid
 * @returns {string} Enhanced prompt
 */
export function enhancePromptWithContext(basePrompt, contextData = {}) {
  let enhanced = basePrompt;

  if (contextData.pastWinnersAnalysis) {
    enhanced += `\n**PAST WINNERS PATTERN**:\n`;
    enhanced += `${contextData.pastWinnersAnalysis}\n`;
    enhanced += `Consider if this photo fits the pattern of previous winning work.\n\n`;
  }

  if (contextData.juryQuotes && contextData.juryQuotes.length > 0) {
    enhanced += `\n**JURY PERSPECTIVES**:\n`;
    contextData.juryQuotes.forEach(quote => {
      enhanced += `- "${quote.text}" - ${quote.juryMember}\n`;
    });
    enhanced += `\nConsider how this photo aligns with these jury perspectives.\n\n`;
  }

  if (contextData.redFlags && contextData.redFlags.length > 0) {
    enhanced += `\n**COMMON MISTAKES TO WATCH FOR**:\n`;
    contextData.redFlags.forEach(flag => {
      enhanced += `- ${flag}\n`;
    });
    enhanced += `\n`;
  }

  return enhanced;
}

/**
 * Build validation prompt for criteria quality checking
 *
 * @param {Array} criteria - Generated criteria to validate
 * @param {Object} openCallData - Original open call data
 * @returns {string} Validation prompt
 */
export function buildCriteriaValidationPrompt(criteria, openCallData) {
  let prompt = `You are an expert in photography competition design and evaluation frameworks.

Review these generated evaluation criteria for quality and relevance:

**Competition Context**:
- Title: ${openCallData.title || 'Not specified'}
- Theme: ${openCallData.theme || 'Not specified'}
- Past Winners: ${openCallData.pastWinners || 'Not specified'}

**Generated Criteria**:
`;

  criteria.forEach((c, idx) => {
    prompt += `${idx + 1}. ${c.name} (${c.weight}%): ${c.description}\n`;
  });

  prompt += `
**Validation Checklist**:

For each criterion, assess:

1. **Specificity**: Is it concrete and measurable, or vague and generic?
   - ❌ Bad: "Quality", "Good composition", "Nice photo"
   - ✅ Good: "Emotional Authenticity", "Behavioral Significance", "Light & Atmosphere"

2. **Actionability**: Does it provide clear guidance on what to evaluate?
   - ❌ Bad: "Overall quality of the photograph"
   - ✅ Good: "Sharp focus on eyes, accurate skin tones, catch lights present"

3. **Relevance**: Does it relate to the competition theme and type?
   - Check if criteria match the theme: ${openCallData.theme}
   - Check if criteria reflect past winner patterns

4. **Redundancy**: Do any criteria significantly overlap?
   - Each criterion should evaluate a distinct aspect

5. **Weight Balance**: Are weights distributed reasonably?
   - No single criterion >50% (too dominant)
   - No criterion <5% (too insignificant)
   - Total should equal 100%

**Output Format**:

For each criterion, provide:
CRITERION: [name]
SPECIFICITY: [1-10 score]
ACTIONABILITY: [1-10 score]
RELEVANCE: [1-10 score]
ISSUES: [list any problems]
SUGGESTIONS: [how to improve if needed]

OVERALL ASSESSMENT: [pass/needs improvement/fail]
OVERALL SCORE: [average of all specificity/actionability/relevance scores]
RECOMMENDATIONS: [summary of key improvements needed]
`;

  return prompt;
}

/**
 * Build A/B testing comparison prompt
 *
 * @param {Object} baselinePrompt - Current/baseline prompt
 * @param {Object} variantPrompt - New/variant prompt to test
 * @param {Array} testPhotos - Sample photos for comparison
 * @returns {string} A/B testing analysis prompt
 */
export function buildABTestingPrompt(baselinePrompt, variantPrompt, testPhotos) {
  let prompt = `You are an expert in prompt engineering and evaluation framework design.

Compare these two evaluation frameworks for a photography competition:

**BASELINE FRAMEWORK**:
Criteria:
`;

  baselinePrompt.criteria.forEach(c => {
    prompt += `- ${c.name} (${c.weight}%): ${c.description}\n`;
  });

  prompt += `\n**VARIANT FRAMEWORK**:
Criteria:
`;

  variantPrompt.criteria.forEach(c => {
    prompt += `- ${c.name} (${c.weight}%): ${c.description}\n`;
  });

  prompt += `
**Comparison Dimensions**:

1. **Specificity**: Which framework provides more concrete, measurable criteria?
2. **Coverage**: Which framework covers the relevant aspects more comprehensively?
3. **Clarity**: Which framework gives clearer guidance to evaluators?
4. **Theme Alignment**: Which framework better reflects the competition theme?
5. **Actionability**: Which framework produces more actionable feedback?

**Analysis**:

For each dimension, rate both frameworks 1-10 and explain:
- Which is stronger and why
- Specific examples of differences
- Impact on evaluation quality

**Recommendation**:
- Which framework should be used? [Baseline / Variant / Neither - create new]
- Key strengths to preserve
- Key weaknesses to address
- Estimated improvement in evaluation quality

**Quantitative Metrics**:
- Baseline avg specificity: [score]
- Variant avg specificity: [score]
- Estimated evaluation quality improvement: [percentage]
`;

  return prompt;
}

/**
 * Build refinement suggestion prompt
 *
 * @param {Object} currentPrompt - Current analysis prompt
 * @param {Array} userIssues - User-reported issues
 * @param {Array} userGoals - User's goals for refinement
 * @returns {string} Refinement suggestion prompt
 */
export function buildRefinementPrompt(currentPrompt, userIssues = [], userGoals = []) {
  let prompt = `You are an expert in photography competition evaluation and prompt engineering.

**Current Evaluation Framework**:
`;

  currentPrompt.criteria.forEach(c => {
    prompt += `- ${c.name} (${c.weight}%): ${c.description}\n`;
  });

  if (userIssues.length > 0) {
    prompt += `\n**User-Reported Issues**:\n`;
    userIssues.forEach((issue, idx) => {
      prompt += `${idx + 1}. ${issue}\n`;
    });
  }

  if (userGoals.length > 0) {
    prompt += `\n**User's Refinement Goals**:\n`;
    userGoals.forEach((goal, idx) => {
      prompt += `${idx + 1}. ${goal}\n`;
    });
  }

  prompt += `
**Your Task**: Suggest specific improvements to address these issues and achieve the goals.

For each suggested change, provide:

**CHANGE #[N]**:
TYPE: [Add criterion / Modify criterion / Remove criterion / Adjust weight / Refine description]
CRITERION: [name]
CURRENT: [current state if modifying]
PROPOSED: [new state]
RATIONALE: [why this change addresses the issues/goals]
IMPACT: [expected effect on evaluation quality]

**Summary**:
- Total changes proposed: [number]
- Expected outcome: [how the refined framework will work better]
- Potential risks: [any trade-offs or concerns]
`;

  return prompt;
}

/**
 * Get recommended temperature for a given prompt type
 *
 * @param {string} promptType - Type of prompt (criteria, understanding, evaluation, consistency)
 * @returns {number} Recommended temperature
 */
export function getRecommendedTemperature(promptType) {
  const recommendations = VISION_MODEL_GUIDANCE.llava.temperatureRecommendations;

  switch (promptType) {
    case 'criteria':
      return recommendations.criteriaGeneration;
    case 'understanding':
      return recommendations.photoUnderstanding;
    case 'evaluation':
      return recommendations.photoEvaluation;
    case 'consistency':
      return recommendations.consistencyCheck;
    default:
      return 0.3; // Safe default
  }
}

/**
 * Get recommended max tokens for a given prompt type
 *
 * @param {string} promptType - Type of prompt
 * @returns {number} Recommended max tokens
 */
export function getRecommendedMaxTokens(promptType) {
  const budget = VISION_MODEL_GUIDANCE.llava.tokenBudget;

  switch (promptType) {
    case 'criteria':
      return budget.criteriaGeneration;
    case 'understanding':
      return budget.photoUnderstanding;
    case 'evaluation':
      return budget.photoEvaluationPerCriterion;
    case 'consistency':
      return budget.consistencyCheck;
    default:
      return 1500; // Safe default
  }
}
