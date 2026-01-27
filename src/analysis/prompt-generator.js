import { getApiClient } from '../utils/api-client.js';
import { logger } from '../utils/logger.js';

/**
 * Generate analysis prompt for a specific open call
 * Extracts key criteria and evaluation questions from open call details
 * @param {Object} openCallData - Open call information
 * @returns {Promise<Object>} Analysis prompt with criteria and questions
 */
export async function generateAnalysisPrompt(openCallData) {
  logger.info('Generating analysis prompt for open call');

  const client = getApiClient();

  const systemPrompt = `You are an expert photography competition analyst. 
Your task is to analyze open call details and create a structured evaluation framework.
Generate specific, measurable criteria that align with the competition's goals and apparent jury preferences.`;

  const userPrompt = `Analyze this photography open call and create an evaluation framework:

**Competition Title**: ${openCallData.title || 'Unknown'}
**Theme**: ${openCallData.theme || 'Not specified'}
**Jury Members**: ${openCallData.jury?.join(', ') || 'Not specified'}
**Past Winners**: ${openCallData.pastWinners || 'No information'}
**Additional Context**: ${openCallData.context || 'None'}

Please provide:
1. Top 5 evaluation criteria for this competition (name, description, weight %)
2. Key themes or patterns from past winners
3. 5 specific questions to ask when evaluating each photo
4. Expected style/aesthetic preferences of the jury

Format the criteria as:
CRITERION: [name]
DESCRIPTION: [description]
WEIGHT: [percentage]
---`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          text: userPrompt,
        },
      ],
    });

    const analysisText = response.content[0].text;
    const parsedPrompt = parseAnalysisPrompt(analysisText, openCallData);

    logger.success('Analysis prompt generated');

    return parsedPrompt;
  } catch (error) {
    logger.error(`Failed to generate analysis prompt: ${error.message}`);
    throw error;
  }
}

/**
 * Parse the analysis prompt response from Claude
 * @param {string} analysisText - Raw response from Claude
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
    prompt.criteria = [
      { name: 'Theme Alignment', description: 'How well the photo matches the competition theme', weight: 30 },
      { name: 'Technical Quality', description: 'Composition, focus, exposure, and color grading', weight: 20 },
      { name: 'Originality', description: 'Uniqueness of perspective, concept, or execution', weight: 25 },
      { name: 'Emotional Impact', description: 'Power to engage and move the viewer', weight: 15 },
      { name: 'Jury Fit', description: 'Alignment with apparent jury preferences', weight: 10 },
    ];
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
 * Load analysis prompt from file
 * @param {string} filePath - Path to prompt file (JSON)
 * @returns {Object} Analysis prompt
 */
export function loadAnalysisPrompt(filePath) {
  const { readJson } = require('../utils/file-utils.js');
  return readJson(filePath);
}
