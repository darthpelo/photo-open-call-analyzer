import { readFileSync } from 'fs';
import { getApiClient } from '../utils/api-client.js';
import { logger } from '../utils/logger.js';

/**
 * Analyzes a photo using Claude Vision API with competition-specific criteria
 * @param {string} photoPath - Path to the photo file
 * @param {Object} analysisPrompt - Analysis prompt with criteria and questions
 * @returns {Promise<Object>} Analysis results with scores and feedback
 */
export async function analyzePhoto(photoPath, analysisPrompt) {
  try {
    logger.debug(`Analyzing photo: ${photoPath}`);

    // Read the image file and convert to base64
    const imageBuffer = readFileSync(photoPath);
    const base64Image = imageBuffer.toString('base64');

    // Determine media type from file extension
    const ext = photoPath.toLowerCase().split('.').pop();
    const mediaTypeMap = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    const mediaType = mediaTypeMap[ext] || 'image/jpeg';

    // Get the API client
    const client = getApiClient();

    // Build the analysis prompt
    const systemPrompt = buildSystemPrompt(analysisPrompt);
    const userPrompt = buildUserPrompt(analysisPrompt);

    // Call Claude Vision API
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
    });

    // Parse the response
    const analysisText = response.content[0].text;
    const scores = parseAnalysisResponse(analysisText, analysisPrompt);

    logger.debug(`Photo analysis complete: ${photoPath}`);

    return {
      photoPath,
      analysisText,
      scores,
      timestamp: new Date().toISOString(),
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    };
  } catch (error) {
    logger.error(`Failed to analyze photo ${photoPath}: ${error.message}`);
    throw error;
  }
}

/**
 * Build the system prompt for photo analysis
 * @param {Object} analysisPrompt - Analysis configuration
 * @returns {string} System prompt
 */
function buildSystemPrompt(analysisPrompt) {
  return `You are an expert art critic and photography juror evaluating photos for a photography competition.
Your role is to assess each photo against specific criteria and provide detailed, objective feedback.

Focus Areas:
- Theme Alignment: How well the photo matches the competition theme
- Technical Quality: Composition, focus, exposure, color grading
- Originality: Uniqueness of perspective, concept, or execution
- Emotional Impact: Power to engage and move the viewer
- Jury Fit: How well the photo aligns with apparent jury preferences

Evaluation Style:
- Be constructive but honest
- Consider both strengths and areas for improvement
- Provide actionable feedback
- Rate on a scale of 1-10 for each criterion`;
}

/**
 * Build the user prompt for photo analysis
 * @param {Object} analysisPrompt - Analysis configuration
 * @returns {string} User prompt
 */
function buildUserPrompt(analysisPrompt) {
  let prompt = 'Analyze this photo for the following competition:\n\n';

  if (analysisPrompt.title) {
    prompt += `**Competition**: ${analysisPrompt.title}\n`;
  }

  if (analysisPrompt.theme) {
    prompt += `**Theme**: ${analysisPrompt.theme}\n`;
  }

  if (analysisPrompt.criteria) {
    prompt += '\n**Evaluation Criteria**:\n';
    analysisPrompt.criteria.forEach((criterion) => {
      const weight = criterion.weight ? ` (${criterion.weight}%)` : '';
      prompt += `- ${criterion.name}${weight}: ${criterion.description}\n`;
    });
  }

  prompt += `\nProvide:
1. A brief overall assessment
2. Detailed score (1-10) for each criterion with justification
3. Key strengths
4. Areas for improvement
5. Final recommendation (Strong Yes / Yes / Maybe / No)

Format your scores clearly so they can be parsed programmatically. Use "SCORE: [criterion name]: [number]/10" format.`;

  return prompt;
}

/**
 * Parse the analysis response from Claude and extract scores
 * @param {string} analysisText - The full analysis text from Claude
 * @param {Object} analysisPrompt - Analysis configuration with criteria
 * @returns {Object} Parsed scores and feedback
 */
function parseAnalysisResponse(analysisText, analysisPrompt) {
  const scores = {
    individual: {},
    summary: {},
  };

  // Extract individual criterion scores using regex
  const scorePattern = /SCORE:\s*([^:]+):\s*(\d+)\/10/gi;
  let match;

  const criteria = analysisPrompt.criteria || [];
  const criteriaMap = new Map(criteria.map((c) => [c.name.toLowerCase(), c]));

  while ((match = scorePattern.exec(analysisText)) !== null) {
    const criterionName = match[1].trim();
    const score = parseInt(match[2], 10);

    const criterion = criteria.find((c) => c.name.toLowerCase() === criterionName.toLowerCase());

    if (criterion) {
      scores.individual[criterion.name] = {
        score,
        weight: criterion.weight || 0,
      };
    }
  }

  // Calculate weighted average if criteria have weights
  const weightedScores = Object.entries(scores.individual)
    .filter(([_, data]) => data.weight > 0)
    .map(([_, data]) => data.score * data.weight);

  const totalWeight = Object.values(scores.individual)
    .filter((data) => data.weight > 0)
    .reduce((sum, data) => sum + data.weight, 0);

  if (totalWeight > 0) {
    scores.summary.weighted_average = Math.round((weightedScores.reduce((a, b) => a + b, 0) / totalWeight) * 10) / 10;
  }

  // Calculate simple average
  const allScores = Object.values(scores.individual).map((data) => data.score);
  if (allScores.length > 0) {
    scores.summary.average = Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10;
  }

  // Extract recommendation
  const recommendationMatch = analysisText.match(/Final recommendation:\s*([^\n]+)/i);
  if (recommendationMatch) {
    scores.summary.recommendation = recommendationMatch[1].trim();
  }

  // Store full analysis
  scores.full_analysis = analysisText;

  return scores;
}
