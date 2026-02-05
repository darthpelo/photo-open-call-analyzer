import { getApiClient, getModelName } from '../utils/api-client.js';
import { logger } from '../utils/logger.js';
import { buildMetaPrompt } from '../prompts/prompt-builder.js';
import { validateCriteria, normalizeWeights } from '../prompts/criteria-refinement.js';

/**
 * Generate analysis prompt for a specific open call using Ollama
 * Enhanced with template library and validation (FR-2.4)
 *
 * @param {Object} openCallData - Open call information
 * @param {Object} options - Generation options
 * @param {string} options.juryStyle - Optional jury style (e.g., "minimalist", "bold")
 * @param {string} options.template - Force specific template type
 * @param {boolean} options.validate - Validate criteria before returning (default: true)
 * @returns {Promise<Object>} Analysis prompt with criteria and questions
 */
export async function generateAnalysisPrompt(openCallData, options = {}) {
  logger.info('Generating enhanced analysis prompt for open call');

  const client = getApiClient();
  const model = getModelName();

  // Build enhanced meta-prompt using template library
  const { prompt, metadata } = buildMetaPrompt(openCallData, {
    juryStyle: options.juryStyle,
    forcedTemplate: options.template
  });

  logger.debug(`Using ${metadata.competitionType} template (confidence: ${metadata.templateConfidence})`);

  try {
    const response = await client.chat({
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      options: {
        temperature: metadata.temperature, // Lowered from 0.5 to 0.3 for consistency
        num_predict: metadata.maxTokens
      }
    });

    const analysisText = response.message.content;
    const parsedPrompt = parseAnalysisPrompt(analysisText, openCallData);

    // Validate and normalize criteria (FR-2.4)
    if (options.validate !== false && parsedPrompt.criteria.length > 0) {
      const validation = validateCriteria(parsedPrompt.criteria);

      if (validation.scores.specificity < 6) {
        logger.warn(`Criteria specificity score: ${validation.scores.specificity}/10 - consider regenerating`);
      }

      // Auto-normalize weights
      parsedPrompt.criteria = normalizeWeights(parsedPrompt.criteria);

      // Add validation metadata
      parsedPrompt.validation = {
        specificityScore: validation.scores.specificity,
        alignmentScore: validation.scores.alignment,
        overallScore: validation.scores.overall,
        issues: validation.issues.filter(i => i.severity === 'high'),
        validated: true
      };

      if (validation.issues.filter(i => i.severity === 'high').length > 0) {
        logger.warn(`${validation.issues.filter(i => i.severity === 'high').length} high-severity issues found in criteria`);
      }
    }

    // Add generation metadata
    parsedPrompt.metadata = {
      competitionType: metadata.competitionType,
      templateUsed: metadata.competitionType,
      juryStyle: options.juryStyle || null,
      generatedAt: new Date().toISOString()
    };

    logger.success(`Analysis prompt generated (${metadata.competitionType} template, score: ${parsedPrompt.validation?.overallScore || 'N/A'}/10)`);

    return parsedPrompt;
  } catch (error) {
    logger.error(`Failed to generate analysis prompt: ${error.message}`);
    // Return default prompt on error
    return getDefaultPrompt(openCallData);
  }
}

/**
 * Parse the analysis prompt response
 * @param {string} analysisText - Raw response
 * @param {Object} openCallData - Original open call data
 * @returns {Object} Parsed analysis prompt
 */
function parseAnalysisPrompt(analysisText, openCallData) {
  const prompt = {
    title: openCallData.title || 'Photography Competition',
    theme: openCallData.theme || '',
    context: analysisText,
    criteria: [],
    evaluation_questions: [],
  };

  // Parse criteria from response
  const criterionPattern = /CRITERION:\s*([^\n]+)\nDESCRIPTION:\s*([^\n]+)\nWEIGHT:\s*(\d+)/gi;
  let match;

  while ((match = criterionPattern.exec(analysisText)) !== null) {
    prompt.criteria.push({
      name: match[1].trim(),
      description: match[2].trim(),
      weight: parseInt(match[3], 10),
    });
  }

  // If no criteria found, use defaults
  if (prompt.criteria.length === 0) {
    prompt.criteria = getDefaultCriteria();
  }

  // Normalize weights to sum to 100
  const totalWeight = prompt.criteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight !== 100 && totalWeight > 0) {
    prompt.criteria = prompt.criteria.map(c => ({
      ...c,
      weight: Math.round((c.weight / totalWeight) * 100)
    }));
  }

  // Extract evaluation questions
  const questionsMatch = analysisText.match(/questions?.*?(?=\n\n|$)/is);
  if (questionsMatch) {
    const questionText = questionsMatch[0];
    const questions = questionText.match(/\d+\.\s*([^\n]+)/g) || [];
    prompt.evaluation_questions = questions.map((q) => q.replace(/^\d+\.\s*/, '').trim());
  }

  return prompt;
}

/**
 * Get default criteria
 * @returns {Array} Default evaluation criteria
 */
function getDefaultCriteria() {
  return [
    { name: 'Theme Alignment', description: 'How well the photo matches the competition theme', weight: 30 },
    { name: 'Technical Quality', description: 'Composition, focus, exposure, and color grading', weight: 20 },
    { name: 'Originality', description: 'Uniqueness of perspective, concept, or execution', weight: 25 },
    { name: 'Emotional Impact', description: 'Power to engage and move the viewer', weight: 15 },
    { name: 'Jury Fit', description: 'Alignment with apparent jury preferences', weight: 10 },
  ];
}

/**
 * Get default prompt when AI generation fails
 * @param {Object} openCallData - Open call data
 * @returns {Object} Default prompt
 */
function getDefaultPrompt(openCallData) {
  return {
    title: openCallData.title || 'Photography Competition',
    theme: openCallData.theme || 'General',
    context: '',
    criteria: getDefaultCriteria(),
    evaluation_questions: [
      'Does this photo effectively communicate the theme?',
      'Is the technical execution professional quality?',
      'Does this offer a unique perspective?',
      'Does this photo evoke an emotional response?',
      'Would this appeal to the jury based on past selections?'
    ]
  };
}

/**
 * Create a simple prompt without AI (manual mode)
 * @param {Object} openCallData - Open call data
 * @returns {Object} Manual prompt
 */
export function createManualPrompt(openCallData) {
  return {
    title: openCallData.title || 'Photography Competition',
    theme: openCallData.theme || '',
    criteria: openCallData.criteria || getDefaultCriteria(),
    evaluation_questions: openCallData.questions || [],
    context: openCallData.context || ''
  };
}

export { getDefaultCriteria };
