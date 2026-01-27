import { getApiClient, getModelName } from '../utils/api-client.js';
import { logger } from '../utils/logger.js';

/**
 * Generate analysis prompt for a specific open call using Ollama
 * @param {Object} openCallData - Open call information
 * @returns {Promise<Object>} Analysis prompt with criteria and questions
 */
export async function generateAnalysisPrompt(openCallData) {
  logger.info('Generating analysis prompt for open call');

  const client = getApiClient();
  const model = getModelName();

  const prompt = `Sei un esperto analista di competizioni fotografiche.
Analizza questa open call e crea un framework di valutazione strutturato.

**Titolo Competizione**: ${openCallData.title || 'Non specificato'}
**Tema**: ${openCallData.theme || 'Non specificato'}
**Membri Giuria**: ${openCallData.jury?.join(', ') || 'Non specificato'}
**Vincitori Passati**: ${openCallData.pastWinners || 'Nessuna informazione'}
**Contesto Aggiuntivo**: ${openCallData.context || 'Nessuno'}

Fornisci:
1. I 5 criteri di valutazione principali per questa competizione (nome, descrizione, peso %)
2. Pattern o temi chiave dai vincitori passati
3. 5 domande specifiche da porsi quando si valuta ogni foto
4. Stile/estetica preferiti dalla giuria

Formatta i criteri così:
CRITERION: [nome]
DESCRIPTION: [descrizione]
WEIGHT: [percentuale numerica]
---`;

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
        temperature: 0.5,
        num_predict: 2000
      }
    });

    const analysisText = response.message.content;
    const parsedPrompt = parseAnalysisPrompt(analysisText, openCallData);

    logger.success('Analysis prompt generated');

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
