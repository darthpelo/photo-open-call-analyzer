/**
 * Title/Description Generator Module (FR-4.1)
 *
 * Generates submission titles and descriptions for analyzed photos
 * using Ollama text generation. Aligns text with open call theme
 * and jury expectations based on photo analysis results.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, basename } from 'path';
import { getApiClient, getModelName } from '../utils/api-client.js';

/**
 * Compute Jaccard similarity between two strings (word-level)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Similarity between 0.0 and 1.0
 */
export function jaccardSimilarity(a, b) {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Build the text generation prompt for a photo
 * @param {Object} photoAnalysis - Photo analysis result with scores
 * @param {Object} openCallConfig - Open call configuration
 * @returns {string} The prompt for Ollama
 */
export function buildTextPrompt(photoAnalysis, openCallConfig) {
  const scores = photoAnalysis.scores || {};
  const individual = scores.individual || {};
  const summary = scores.summary || {};

  // Extract top criteria (sorted by score descending)
  const topCriteria = Object.entries(individual)
    .sort((a, b) => (b[1].score || 0) - (a[1].score || 0))
    .slice(0, 3)
    .map(([name, data]) => `${name}: ${data.score}/10`)
    .join(', ');

  // Build jury description
  const juryDescription = (openCallConfig.jury || [])
    .map(j => `${j.name} (${j.style || ''}, ${j.focus || ''})`)
    .join('; ');

  const overallScore = summary.weighted_average || summary.average || 0;
  const keyStrength = summary.keyStrength || summary.recommendation || '';

  return `You are an expert photography curator. Generate a title and description for a photo submitted to a photography open call.

Open Call Theme: ${openCallConfig.theme || ''}
Jury Profile: ${juryDescription}

Photo Analysis:
- Overall Score: ${overallScore}/10
- Top Criteria: ${topCriteria}
- Key Strength: ${keyStrength}

Generate:
1. A title (max 100 characters): evocative, thematic, not generic
2. A description (max 500 characters): connects the photo's strengths to the competition theme

Respond ONLY with valid JSON:
{"title": "...", "description": "..."}`;
}

/**
 * Generate title and description for a single photo
 * @param {Object} photoAnalysis - Photo analysis result
 * @param {Object} openCallConfig - Open call configuration
 * @param {Object} [options={}] - Options
 * @param {string} [options.textModel] - Override text model
 * @param {string} [options.retryPromptSuffix] - Additional prompt for retries
 * @returns {Promise<Object>} { title, description } or { error }
 */
export async function generateTexts(photoAnalysis, openCallConfig, options = {}) {
  try {
    const client = getApiClient();
    const model = options.textModel || openCallConfig.textModel || getModelName();

    let prompt = buildTextPrompt(photoAnalysis, openCallConfig);
    if (options.retryPromptSuffix) {
      prompt += '\n\n' + options.retryPromptSuffix;
    }

    const response = await client.chat({
      model,
      messages: [{ role: 'user', content: prompt }],
      options: { temperature: 0.7, num_predict: 800 }
    });

    const content = response.message.content;
    const parsed = parseJsonResponse(content);

    if (!parsed) {
      return { error: 'Failed to parse JSON response from model' };
    }

    // Enforce length constraints
    return {
      title: (parsed.title || '').slice(0, 100),
      description: (parsed.description || '').slice(0, 500)
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Generate titles and descriptions for all analyzed photos in a project
 * @param {string} projectDir - Project directory path
 * @param {Object} [options={}] - Options
 * @param {string} [options.textModel] - Override text model
 * @param {number} [options.similarityThreshold=0.7] - Jaccard threshold for dedup
 * @param {number} [options.maxRetries=1] - Max retries for similar titles
 * @returns {Promise<Array<{ photo, title, description }>>}
 */
export async function generateBatchTexts(projectDir, options = {}) {
  const configPath = join(projectDir, 'open-call.json');
  if (!existsSync(configPath)) {
    throw new Error(`open-call.json not found in ${projectDir}`);
  }

  const config = JSON.parse(readFileSync(configPath, 'utf-8'));

  // Try results/latest/ first, fall back to results/
  let resultsPath = join(projectDir, 'results', 'latest', 'batch-results.json');
  if (!existsSync(resultsPath)) {
    resultsPath = join(projectDir, 'results', 'batch-results.json');
  }

  if (!existsSync(resultsPath)) {
    throw new Error(`No batch results found. Run 'analyze' first.`);
  }

  const batchResults = JSON.parse(readFileSync(resultsPath, 'utf-8'));
  const photos = (batchResults.results || []).filter(r => r.success);

  const threshold = options.similarityThreshold ?? 0.7;
  const maxRetries = options.maxRetries ?? 1;
  const generatedTitles = [];
  const results = [];

  for (const photoResult of photos) {
    const photoAnalysis = {
      photo: basename(photoResult.photo),
      scores: photoResult.scores
    };

    let result = await generateTexts(photoAnalysis, config, options);

    // Deduplication check
    if (result.title && !result.error) {
      let retries = 0;
      while (retries < maxRetries) {
        const isSimilar = generatedTitles.some(
          prev => jaccardSimilarity(prev, result.title) > threshold
        );
        if (!isSimilar) break;

        retries++;
        result = await generateTexts(photoAnalysis, config, {
          ...options,
          retryPromptSuffix: 'IMPORTANT: The previous title was too similar to another photo. Be more creative and use a completely different approach.'
        });
      }

      if (result.title) {
        generatedTitles.push(result.title);
      }
    }

    results.push({
      photo: basename(photoResult.photo),
      title: result.title,
      description: result.description,
      ...(result.error ? { error: result.error } : {})
    });
  }

  // Save to the same directory where results were read from
  const outputDir = join(resultsPath, '..');
  writeFileSync(
    join(outputDir, 'generated-texts.json'),
    JSON.stringify(results, null, 2)
  );

  return results;
}

/**
 * Parse JSON from model response, handling common formatting issues
 * @param {string} content - Raw model response
 * @returns {Object|null} Parsed object or null
 */
function parseJsonResponse(content) {
  if (content == null || typeof content !== 'string') return null;
  try {
    return JSON.parse(content);
  } catch {
    // Try extracting JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        return null;
      }
    }

    // Try extracting JSON object pattern
    const objMatch = content.match(/\{[\s\S]*"title"[\s\S]*"description"[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch {
        return null;
      }
    }

    return null;
  }
}
