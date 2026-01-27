import { readFileSync } from 'fs';
import path from 'path';
import { getApiClient, getModelName } from '../utils/api-client.js';
import { logger } from '../utils/logger.js';

/**
 * Analyzes a photo using Ollama with LLaVA vision model
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

    // Get the Ollama client
    const client = getApiClient();
    const model = getModelName();

    // Build the analysis prompt
    const prompt = buildAnalysisPrompt(analysisPrompt);

    // Call Ollama with vision model
    const response = await client.chat({
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt,
          images: [base64Image]
        }
      ],
      options: {
        temperature: 0.3,  // Lower for more consistent scoring
        num_predict: 1500
      }
    });

    // Parse the response
    const analysisText = response.message.content;
    const scores = parseAnalysisResponse(analysisText, analysisPrompt);

    logger.debug(`Photo analysis complete: ${photoPath}`);

    return {
      photoPath,
      filename: path.basename(photoPath),
      analysisText,
      scores,
      timestamp: new Date().toISOString(),
      model: model
    };
  } catch (error) {
    logger.error(`Failed to analyze photo ${photoPath}: ${error.message}`);
    return {
      photoPath,
      filename: path.basename(photoPath),
      error: error.message,
      scores: null,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Build the analysis prompt for photo evaluation
 * @param {Object} analysisPrompt - Analysis configuration
 * @returns {string} Complete prompt
 */
function buildAnalysisPrompt(analysisPrompt) {
  let prompt = `Sei un esperto critico fotografico e giurato di competizioni. Analizza questa fotografia per una open call.

`;

  if (analysisPrompt.title) {
    prompt += `**Competizione**: ${analysisPrompt.title}\n`;
  }

  if (analysisPrompt.theme) {
    prompt += `**Tema**: ${analysisPrompt.theme}\n`;
  }

  if (analysisPrompt.criteria && analysisPrompt.criteria.length > 0) {
    prompt += '\n**Criteri di Valutazione**:\n';
    analysisPrompt.criteria.forEach((criterion) => {
      const weight = criterion.weight ? ` (${criterion.weight}%)` : '';
      prompt += `- ${criterion.name}${weight}: ${criterion.description}\n`;
    });
  } else {
    prompt += `
**Criteri di Valutazione**:
- Theme Alignment (30%): Quanto la foto corrisponde al tema della competizione
- Technical Quality (20%): Composizione, fuoco, esposizione, colore
- Originality (25%): Unicità della prospettiva e del concetto
- Emotional Impact (15%): Capacità di coinvolgere ed emozionare
- Jury Fit (10%): Allineamento con le preferenze della giuria
`;
  }

  prompt += `
**ISTRUZIONI IMPORTANTI**:
1. Valuta ogni criterio con un punteggio da 1 a 10
2. Usa il formato ESATTO: "SCORE: [nome criterio]: [numero]/10"
3. Fornisci una breve motivazione per ogni punteggio
4. Identifica i punti di forza principali
5. Suggerisci aree di miglioramento
6. Concludi con una raccomandazione: Strong Yes / Yes / Maybe / No

**FORMATO RISPOSTA**:

OVERALL ASSESSMENT:
[Breve valutazione complessiva in 2-3 frasi]

SCORES:
SCORE: Theme Alignment: [X]/10 - [motivazione]
SCORE: Technical Quality: [X]/10 - [motivazione]
SCORE: Originality: [X]/10 - [motivazione]
SCORE: Emotional Impact: [X]/10 - [motivazione]
SCORE: Jury Fit: [X]/10 - [motivazione]

STRENGTHS:
- [punto di forza 1]
- [punto di forza 2]

IMPROVEMENTS:
- [suggerimento 1]
- [suggerimento 2]

Final recommendation: [Strong Yes / Yes / Maybe / No]
`;

  return prompt;
}

/**
 * Parse the analysis response and extract scores
 * @param {string} analysisText - The full analysis text
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

  const criteria = analysisPrompt.criteria || getDefaultCriteria();

  while ((match = scorePattern.exec(analysisText)) !== null) {
    const criterionName = match[1].trim();
    const score = parseInt(match[2], 10);

    const criterion = criteria.find(
      (c) => c.name.toLowerCase() === criterionName.toLowerCase()
    );

    if (criterion) {
      scores.individual[criterion.name] = {
        score,
        weight: criterion.weight || 20,
      };
    } else {
      // Store even if not in predefined criteria
      scores.individual[criterionName] = {
        score,
        weight: 20,
      };
    }
  }

  // If no scores found, try alternative patterns
  if (Object.keys(scores.individual).length === 0) {
    const altPattern = /(\w+(?:\s+\w+)?)\s*[:=]\s*(\d+)\s*(?:\/10|out of 10)?/gi;
    while ((match = altPattern.exec(analysisText)) !== null) {
      const name = match[1].trim();
      const score = parseInt(match[2], 10);
      if (score >= 1 && score <= 10) {
        scores.individual[name] = { score, weight: 20 };
      }
    }
  }

  // Calculate weighted average
  const weightedScores = Object.entries(scores.individual)
    .filter(([_, data]) => data.weight > 0)
    .map(([_, data]) => data.score * data.weight);

  const totalWeight = Object.values(scores.individual)
    .filter((data) => data.weight > 0)
    .reduce((sum, data) => sum + data.weight, 0);

  if (totalWeight > 0) {
    scores.summary.weighted_average =
      Math.round((weightedScores.reduce((a, b) => a + b, 0) / totalWeight) * 10) / 10;
  }

  // Calculate simple average
  const allScores = Object.values(scores.individual).map((data) => data.score);
  if (allScores.length > 0) {
    scores.summary.average =
      Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10;
  }

  // Extract recommendation
  const recommendationMatch = analysisText.match(
    /(?:final\s+)?recommendation[:\s]+([^\n]+)/i
  );
  if (recommendationMatch) {
    scores.summary.recommendation = recommendationMatch[1].trim();
  }

  // Extract strengths
  const strengthsMatch = analysisText.match(/STRENGTHS?:\s*([\s\S]*?)(?=IMPROVEMENT|$)/i);
  if (strengthsMatch) {
    scores.strengths = strengthsMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean);
  }

  // Extract improvements
  const improvementsMatch = analysisText.match(/IMPROVEMENTS?:\s*([\s\S]*?)(?=Final|$)/i);
  if (improvementsMatch) {
    scores.improvements = improvementsMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean);
  }

  // Store full analysis
  scores.full_analysis = analysisText;

  return scores;
}

/**
 * Get default criteria if none provided
 * @returns {Array} Default criteria
 */
function getDefaultCriteria() {
  return [
    { name: 'Theme Alignment', description: 'How well the photo matches the theme', weight: 30 },
    { name: 'Technical Quality', description: 'Composition, focus, exposure', weight: 20 },
    { name: 'Originality', description: 'Uniqueness of vision', weight: 25 },
    { name: 'Emotional Impact', description: 'Power to engage viewers', weight: 15 },
    { name: 'Jury Fit', description: 'Alignment with jury preferences', weight: 10 },
  ];
}

export { getDefaultCriteria };
