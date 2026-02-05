/**
 * Template Library for Enhanced Prompt Engineering (FR-2.4)
 *
 * Provides competition-specific templates, few-shot examples, and
 * vision model-optimized instructions for better AI analysis quality.
 *
 * Part of Milestone 2: Enhanced Prompt Engineering
 */

/**
 * Competition-specific templates with optimized prompts for each type
 */
export const COMPETITION_TEMPLATES = {
  portrait: {
    systemPrompt: `You are an expert portrait photography competition analyst with deep understanding of:
- Human expression and emotion capture
- Portrait lighting techniques (Rembrandt, butterfly, split, broad, short)
- Subject-photographer connection and intimacy
- Contemporary portrait aesthetics and storytelling`,

    specificGuidance: `When evaluating portrait photography, prioritize:
1. Emotional authenticity and depth of expression
2. Technical mastery: catch lights, skin tones, focus on eyes
3. Lighting quality and mood creation
4. Subject's comfort and natural presence
5. Composition that enhances the subject's story`,

    criteriaKeywords: ['expression', 'emotion', 'lighting', 'connection', 'intimacy', 'character', 'personality'],

    avoidGeneric: ['quality', 'good photo', 'nice shot'],

    exampleCriteria: {
      good: [
        'Emotional Authenticity (25%) - Genuine expression that reveals subject\'s inner state',
        'Technical Portrait Mastery (20%) - Catch lights, focus precision, skin tone accuracy',
        'Lighting Artistry (25%) - Purposeful light direction, mood creation, shadow management',
        'Subject Connection (20%) - Evidence of trust and rapport between photographer and subject',
        'Narrative Depth (10%) - Story conveyed through pose, expression, environment'
      ],
      bad: [
        'Quality (30%)',
        'Good composition (25%)',
        'Nice colors (20%)',
        'Technical skill (25%)'
      ]
    }
  },

  landscape: {
    systemPrompt: `You are an expert landscape photography competition analyst specializing in:
- Natural light conditions (golden hour, blue hour, storm light, harsh midday)
- Environmental storytelling and sense of place
- Landscape composition rules (foreground/midground/background, leading lines)
- Contemporary landscape aesthetics beyond traditional postcards`,

    specificGuidance: `When evaluating landscape photography, prioritize:
1. Light quality and atmospheric conditions
2. Strong foreground interest and depth creation
3. Unique perspective or timing beyond obvious viewpoints
4. Environmental storytelling - not just beauty, but meaning
5. Technical execution: hyperfocal distance, dynamic range management`,

    criteriaKeywords: ['light quality', 'atmosphere', 'depth', 'perspective', 'environment', 'foreground', 'sense of place'],

    avoidGeneric: ['beautiful', 'nice view', 'good scenery'],

    exampleCriteria: {
      good: [
        'Light & Atmosphere (30%) - Exceptional light quality, mood, atmospheric conditions',
        'Compositional Depth (20%) - Strong foreground, midground, background relationship',
        'Unique Vision (25%) - Fresh perspective beyond typical viewpoints',
        'Environmental Story (15%) - Sense of place, ecological context, meaning beyond beauty',
        'Technical Excellence (10%) - Focus stacking, exposure blending, dynamic range'
      ],
      bad: [
        'Beautiful scenery (30%)',
        'Good composition (25%)',
        'Nice colors (25%)',
        'Sharp focus (20%)'
      ]
    }
  },

  conceptual: {
    systemPrompt: `You are an expert conceptual photography competition analyst focusing on:
- Idea strength and originality
- Visual metaphor and symbolism
- Execution that serves the concept
- Contemporary art photography discourse
- Balance between accessibility and depth`,

    specificGuidance: `When evaluating conceptual photography, prioritize:
1. Concept clarity and originality - not just clever, but meaningful
2. Visual execution that amplifies the idea
3. Layers of meaning - works on multiple levels
4. Technical choices that serve (not distract from) the concept
5. Relevance to contemporary conversations`,

    criteriaKeywords: ['concept', 'idea', 'metaphor', 'symbolism', 'meaning', 'originality', 'execution'],

    avoidGeneric: ['creative', 'unique', 'interesting'],

    exampleCriteria: {
      good: [
        'Concept Strength (35%) - Original idea with clear thesis and meaningful message',
        'Visual Execution (25%) - Technical choices that amplify the conceptual intent',
        'Metaphorical Depth (20%) - Layers of meaning, works on multiple interpretation levels',
        'Contemporary Relevance (15%) - Engages with current artistic or social discourse',
        'Accessibility vs. Depth (5%) - Balance between immediate impact and contemplative depth'
      ],
      bad: [
        'Creativity (40%)',
        'Uniqueness (30%)',
        'Technical quality (20%)',
        'Interesting idea (10%)'
      ]
    }
  },

  documentary: {
    systemPrompt: `You are an expert documentary photography competition analyst with expertise in:
- Journalistic ethics and authenticity
- Storytelling through decisive moments
- Social and cultural context
- Visual narrative strength
- Balance between objectivity and point of view`,

    specificGuidance: `When evaluating documentary photography, prioritize:
1. Authenticity and journalistic integrity
2. Decisive moment - timing that reveals truth
3. Context provision through composition and framing
4. Emotional engagement without manipulation
5. Contribution to understanding of subject matter`,

    criteriaKeywords: ['authenticity', 'storytelling', 'context', 'decisive moment', 'truth', 'social impact'],

    avoidGeneric: ['real', 'true story', 'good moment'],

    exampleCriteria: {
      good: [
        'Authentic Storytelling (30%) - Genuine moment that reveals truth about subject',
        'Decisive Moment (25%) - Timing and composition that crystallizes the narrative',
        'Contextual Clarity (20%) - Visual elements that provide necessary understanding',
        'Emotional Resonance (15%) - Engages viewer without manipulation or exploitation',
        'Documentary Impact (10%) - Contributes to understanding, awareness, or dialogue'
      ],
      bad: [
        'Good story (35%)',
        'Real moment (30%)',
        'Emotional (20%)',
        'Quality (15%)'
      ]
    }
  },

  wildlife: {
    systemPrompt: `You are an expert wildlife photography competition analyst specializing in:
- Animal behavior and natural history accuracy
- Field craft and ethical wildlife photography practices
- Technical challenges (long lens work, fast action, low light)
- Environmental storytelling and conservation context
- Contemporary wildlife aesthetics beyond trophy shots`,

    specificGuidance: `When evaluating wildlife photography, prioritize:
1. Behavioral significance - not just presence, but revealing action
2. Natural context and environmental storytelling
3. Technical mastery of challenging field conditions
4. Ethical approach - no stress, baiting, or manipulation evident
5. Fresh perspective on commonly photographed species`,

    criteriaKeywords: ['behavior', 'action', 'natural history', 'environment', 'habitat', 'conservation', 'ethics'],

    avoidGeneric: ['nice animal', 'good shot', 'beautiful wildlife'],

    exampleCriteria: {
      good: [
        'Behavioral Significance (30%) - Reveals natural behavior, interaction, or ecological moment',
        'Environmental Context (25%) - Shows animal in habitat, tells environmental story',
        'Technical Field Mastery (20%) - Captures action, handles challenging light/distance',
        'Ethical Approach (15%) - No signs of stress, baiting, or manipulation',
        'Fresh Perspective (10%) - New angle on common subjects or rare species/behavior'
      ],
      bad: [
        'Good animal photo (35%)',
        'Sharp focus (25%)',
        'Beautiful animal (25%)',
        'Nice background (15%)'
      ]
    }
  },

  generic: {
    systemPrompt: `You are an expert photography competition analyst with broad knowledge of:
- Photographic aesthetics across genres
- Technical excellence and intentional execution
- Visual storytelling and emotional impact
- Contemporary photography discourse`,

    specificGuidance: `When evaluating photography, prioritize:
1. Clear intent and execution that serves the concept
2. Technical choices that enhance the message
3. Emotional or intellectual engagement
4. Originality in approach or subject matter
5. Professional execution quality`,

    criteriaKeywords: ['intent', 'execution', 'storytelling', 'impact', 'originality', 'craftsmanship'],

    avoidGeneric: ['good photo', 'quality', 'nice'],

    exampleCriteria: {
      good: [
        'Intentional Execution (25%) - Clear purpose with technical choices that support it',
        'Visual Storytelling (25%) - Communicates idea, emotion, or narrative effectively',
        'Technical Excellence (20%) - Mastery of focus, exposure, color, composition',
        'Originality (20%) - Fresh approach, unique perspective, or innovative technique',
        'Emotional/Intellectual Impact (10%) - Engages viewer on meaningful level'
      ],
      bad: [
        'Quality (30%)',
        'Good composition (25%)',
        'Technical skill (25%)',
        'Nice photo (20%)'
      ]
    }
  }
};

/**
 * Few-shot examples for criteria generation
 * These examples help the LLM understand what makes good vs. bad criteria
 */
export const FEW_SHOT_EXAMPLES = [
  {
    competitionType: 'portrait',
    theme: 'Human Connection',
    goodCriteria: {
      criteria: [
        {
          name: 'Emotional Authenticity',
          description: 'Genuine expression revealing inner emotional state, not posed or forced',
          weight: 25
        },
        {
          name: 'Technical Portrait Excellence',
          description: 'Sharp focus on eyes, accurate skin tones, catch lights present, proper exposure',
          weight: 20
        },
        {
          name: 'Intimate Connection',
          description: 'Evidence of trust between subject and photographer, relaxed natural presence',
          weight: 25
        }
      ],
      reasoning: 'Criteria are specific, measurable, and directly related to portrait photography excellence'
    },
    badCriteria: {
      criteria: [
        {
          name: 'Quality',
          description: 'Overall quality of the photograph',
          weight: 40
        },
        {
          name: 'Good composition',
          description: 'Well composed image',
          weight: 30
        }
      ],
      reasoning: 'Criteria are too generic, not measurable, and don\'t provide actionable guidance'
    }
  },
  {
    competitionType: 'wildlife',
    theme: 'Animal Behavior in Wild',
    goodCriteria: {
      criteria: [
        {
          name: 'Behavioral Significance',
          description: 'Captures meaningful action: hunting, mating, parenting, territorial display, or ecological interaction',
          weight: 30
        },
        {
          name: 'Environmental Storytelling',
          description: 'Shows animal in natural habitat with context about ecosystem and environment',
          weight: 25
        }
      ],
      reasoning: 'Specific to wildlife photography, includes behavioral and ecological dimensions'
    },
    badCriteria: {
      criteria: [
        {
          name: 'Nice animal',
          description: 'Animal looks good in the photo',
          weight: 35
        }
      ],
      reasoning: 'Vague, not specific to wildlife photography, no guidance on what "looks good" means'
    }
  }
];

/**
 * Vision model-specific guidance (LLaVA optimization)
 */
export const VISION_MODEL_GUIDANCE = {
  llava: {
    optimizedInstructions: `IMPORTANT INSTRUCTIONS FOR VISION ANALYSIS:

1. OBSERVE BEFORE JUDGING: First describe what you see, then evaluate
2. BE SPECIFIC: Avoid generic terms - name specific techniques, elements, qualities
3. USE CONCRETE EVIDENCE: Reference visible elements in the photo to support scores
4. EXPLAIN SCORES: Every score must have clear reasoning based on visible evidence
5. USE FULL SCALE: Scores should range from 1-10, not cluster around 7-9
6. BE CRITICAL: High scores (8+) only for exceptional work, not merely competent work

SCORING CALIBRATION:
- 1-3: Significant technical or conceptual problems
- 4-5: Basic competence but notable weaknesses
- 6-7: Solid work with room for improvement (most photos should fall here)
- 8-9: Exceptional work demonstrating mastery
- 10: Nearly perfect, competition-winning quality`,

    temperatureRecommendations: {
      criteriaGeneration: 0.3, // Lower for consistent, structured output
      photoUnderstanding: 0.4, // Slightly higher for descriptive richness
      photoEvaluation: 0.2, // Very low for consistent scoring
      consistencyCheck: 0.3 // Moderate for balanced review
    },

    tokenBudget: {
      criteriaGeneration: 2000,
      photoUnderstanding: 500,
      photoEvaluationPerCriterion: 300,
      consistencyCheck: 400
    }
  }
};

/**
 * Multi-stage evaluation instructions
 */
export const EVALUATION_STAGES = {
  stage1_understanding: {
    name: 'Photo Understanding',
    purpose: 'Observe without judgment to build comprehensive understanding',
    prompt: `Examine this photograph carefully and describe what you observe:

**Subject & Content**:
- What is the main subject?
- What secondary elements are present?
- What is happening in the frame?

**Technical Observation**:
- Lighting: Direction, quality, color temperature
- Focus: What's sharp, what's soft, depth of field
- Exposure: Brightness, shadow/highlight detail
- Color: Palette, saturation, color harmony
- Composition: Arrangement, balance, visual flow

**Mood & Context**:
- What emotion or atmosphere does this convey?
- What story elements are present?
- Any unique or notable aspects?

DO NOT score or judge yet - just observe and describe accurately.`,
    temperature: 0.4,
    maxTokens: 500
  },

  stage2_evaluation: {
    name: 'Criterion-by-Criterion Evaluation',
    purpose: 'Focused assessment against each specific criterion',
    promptTemplate: `Based on your observation:
"{stage1_output}"

Now evaluate this photo for the criterion:

**{criterion_name}** ({criterion_weight}%)
Definition: {criterion_description}

Consider:
- How strongly does this photo demonstrate this quality?
- What specific visible elements support your assessment?
- What could be improved related to this criterion?

Provide:
SCORE: {criterion_name}: X/10
REASONING: [2-3 specific sentences citing visible evidence]`,
    temperature: 0.2,
    maxTokens: 300
  },

  stage3_consistency: {
    name: 'Consistency Check & Final Recommendation',
    purpose: 'Verify score coherence and provide holistic assessment',
    promptTemplate: `Review your evaluations:

{scores_summary}

**Consistency Check**:
1. Do the scores logically align with each other?
2. Does the overall profile match the photo's actual quality?
3. Are high scores supported by multiple strengths?
4. Are low scores explained by clear weaknesses?

**Final Assessment**:
OVERALL WEIGHTED SCORE: {calculated_score}/10
RECOMMENDATION: [Strong Yes / Yes / Maybe / No]
CONFIDENCE: [High / Medium / Low]
KEY STRENGTH: [One sentence - the photo's greatest asset]
MAIN CONCERN: [One sentence - the most significant limitation]`,
    temperature: 0.3,
    maxTokens: 400
  }
};

/**
 * Detect competition type from theme and context
 * @param {string} theme - Competition theme
 * @param {string} context - Additional context
 * @returns {string} Detected competition type (portrait, landscape, etc.)
 */
export function detectCompetitionType(theme, context = '') {
  const text = `${theme} ${context}`.toLowerCase();

  // Portrait indicators
  if (text.match(/portrait|people|person|human|face|expression|emotion|headshot|character/)) {
    return 'portrait';
  }

  // Wildlife indicators
  if (text.match(/wildlife|animal|bird|nature|behavior|habitat|species|conservation|ecological/)) {
    return 'wildlife';
  }

  // Landscape indicators
  if (text.match(/landscape|scenery|environment|terrain|vista|mountain|ocean|sky|sunset|nature scene/)) {
    return 'landscape';
  }

  // Documentary indicators
  if (text.match(/documentary|photojournalism|story|reportage|social|cultural|reality|authentic|truth/)) {
    return 'documentary';
  }

  // Conceptual indicators
  if (text.match(/conceptual|abstract|idea|metaphor|symbolic|art|contemporary|experimental|concept/)) {
    return 'conceptual';
  }

  // Default to generic
  return 'generic';
}

/**
 * Select appropriate template for a competition
 * @param {Object} openCallData - Open call metadata
 * @returns {Object} Selected template with competition type
 */
export function selectTemplate(openCallData) {
  const theme = openCallData.theme || '';
  const context = openCallData.context || '';
  const pastWinners = openCallData.pastWinners || '';

  const competitionType = detectCompetitionType(theme, `${context} ${pastWinners}`);
  const template = COMPETITION_TEMPLATES[competitionType];

  return {
    type: competitionType,
    template: template,
    confidence: competitionType === 'generic' ? 'low' : 'high'
  };
}

/**
 * Get few-shot examples for a competition type
 * @param {string} competitionType - Type of competition
 * @returns {Array} Relevant few-shot examples
 */
export function getFewShotExamples(competitionType) {
  // Find examples matching the competition type
  const typeExamples = FEW_SHOT_EXAMPLES.filter(ex => ex.competitionType === competitionType);

  // If no specific examples, use generic examples
  if (typeExamples.length === 0) {
    return FEW_SHOT_EXAMPLES.slice(0, 1); // Return first example as generic guidance
  }

  return typeExamples;
}

/**
 * Build enhanced meta-prompt for criteria generation
 * @param {Object} openCallData - Open call data
 * @param {Object} template - Selected template
 * @returns {string} Enhanced prompt with few-shot examples
 */
export function buildEnhancedMetaPrompt(openCallData, template) {
  const fewShots = getFewShotExamples(template.type);
  const visionGuidance = VISION_MODEL_GUIDANCE.llava;

  let prompt = template.template.systemPrompt + '\n\n';

  prompt += `**Competition Context**:\n`;
  prompt += `Title: ${openCallData.title || 'Not specified'}\n`;
  prompt += `Theme: ${openCallData.theme || 'Not specified'}\n`;
  prompt += `Jury: ${openCallData.jury?.join(', ') || 'Not specified'}\n`;
  prompt += `Past Winners Context: ${openCallData.pastWinners || 'No information'}\n\n`;

  prompt += template.template.specificGuidance + '\n\n';

  // Add few-shot examples
  if (fewShots.length > 0) {
    prompt += `**EXAMPLES OF GOOD VS. BAD CRITERIA**:\n\n`;
    fewShots.forEach((example, idx) => {
      prompt += `Example ${idx + 1} - ${example.theme}:\n\n`;
      prompt += `✅ GOOD CRITERIA:\n`;
      example.goodCriteria.criteria.forEach(c => {
        prompt += `- ${c.name} (${c.weight}%): ${c.description}\n`;
      });
      prompt += `Why good: ${example.goodCriteria.reasoning}\n\n`;

      prompt += `❌ BAD CRITERIA (avoid these patterns):\n`;
      example.badCriteria.criteria.forEach(c => {
        prompt += `- ${c.name} (${c.weight}%): ${c.description}\n`;
      });
      prompt += `Why bad: ${example.badCriteria.reasoning}\n\n`;
    });
  }

  prompt += `**YOUR TASK**:\n`;
  prompt += `Generate 5 evaluation criteria for this competition following the GOOD examples above.\n`;
  prompt += `Each criterion must:\n`;
  prompt += `1. Be SPECIFIC and MEASURABLE (avoid: ${template.template.avoidGeneric.join(', ')})\n`;
  prompt += `2. Use concrete photography terminology\n`;
  prompt += `3. Relate to the competition theme and jury preferences\n`;
  prompt += `4. Provide clear guidance on what to look for\n`;
  prompt += `5. Have a weight percentage (total must equal 100%)\n\n`;

  prompt += `Format each criterion as:\n`;
  prompt += `CRITERION: [Specific Name]\n`;
  prompt += `DESCRIPTION: [Detailed, measurable description]\n`;
  prompt += `WEIGHT: [numeric percentage]\n`;
  prompt += `---\n`;

  return prompt;
}
