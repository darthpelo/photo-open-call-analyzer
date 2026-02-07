/**
 * Set-level photo analysis using multi-image vision model calls.
 * Evaluates groups of photos as cohesive sets for Polaroid-style exhibitions.
 * Part of FR-3.11: Polaroid Set Analysis (ADR-015).
 */

import { readFileSync } from 'fs';
import { getApiClient, getModelName } from '../utils/api-client.js';
import { buildSetAnalysisPrompt, getDefaultSetCriteria as getDefaultCriteria } from './set-prompt-builder.js';

/**
 * Get default set evaluation criteria.
 * @returns {Object[]} Default set criteria
 */
export function getDefaultSetCriteria() {
  return getDefaultCriteria();
}

/**
 * Parse set analysis response and extract scores.
 * @param {string} analysisText - Raw Ollama response
 * @param {Object} setConfig - Set criteria for matching
 * @returns {Object} Parsed set scores with metadata
 */
export function parseSetAnalysisResponse(analysisText, setConfig) {
  const setCriteria = setConfig.setCriteria || getDefaultCriteria();

  // Initialize scores with defaults
  const setScores = {};
  for (const criterion of setCriteria) {
    setScores[criterion.name] = {
      score: 0,
      weight: criterion.weight,
      reasoning: ''
    };
  }

  // Extract SET_SCORE lines
  const scoreRegex = /SET_SCORE:\s*(.+?):\s*(\d+(?:\.\d+)?)\s*\/\s*10\s*-?\s*(.*)/gi;
  let match;
  while ((match = scoreRegex.exec(analysisText)) !== null) {
    const name = match[1].trim();
    const score = parseFloat(match[2]);
    const reasoning = match[3].trim();

    if (setScores[name] !== undefined) {
      setScores[name].score = score;
      setScores[name].reasoning = reasoning;
    }
  }

  // Extract PHOTO_ROLE lines
  const photoRoles = {};
  const roleRegex = /PHOTO_ROLE:\s*(Photo \d+):\s*(.*)/gi;
  while ((match = roleRegex.exec(analysisText)) !== null) {
    photoRoles[match[1].trim()] = match[2].trim();
  }

  // Extract SUGGESTED_ORDER
  let suggestedOrder = [];
  const orderMatch = analysisText.match(/SUGGESTED_ORDER:\s*([\d,\s]+)/i);
  if (orderMatch) {
    suggestedOrder = orderMatch[1].split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
  }

  // Extract SET_RECOMMENDATION
  let recommendation = '';
  const recMatch = analysisText.match(/SET_RECOMMENDATION:\s*(.+)/i);
  if (recMatch) {
    recommendation = recMatch[1].trim();
  }

  // Extract WEAKEST LINK
  let weakestLink = '';
  const weakMatch = analysisText.match(/WEAKEST LINK:\s*(.*)/i);
  if (weakMatch) {
    weakestLink = weakMatch[1].trim();
  }

  return {
    setScores,
    photoRoles,
    suggestedOrder,
    recommendation,
    weakestLink,
    fullAnalysis: analysisText
  };
}

/**
 * Analyze a set of photos as a group using multi-image vision analysis.
 * @param {string[]} photoPaths - Array of photo file paths
 * @param {Object} analysisPrompt - Analysis prompt with title, theme, criteria
 * @param {Object} setConfig - Set mode configuration
 * @param {Object} [options={}] - Analysis options
 * @param {Object[]} [individualResults=[]] - Pre-computed individual results
 * @returns {Promise<Object>} Set analysis result
 */
export async function analyzeSet(photoPaths, analysisPrompt, setConfig, options = {}, individualResults = []) {
  const client = getApiClient();
  const model = getModelName();

  // Read all images as base64
  const base64Images = photoPaths.map(photoPath => {
    const imageBuffer = readFileSync(photoPath);
    return imageBuffer.toString('base64');
  });

  // Build set analysis prompt
  const prompt = buildSetAnalysisPrompt(analysisPrompt, setConfig, individualResults);

  // Send all images in a single Ollama call
  const response = await client.chat({
    model,
    messages: [
      {
        role: 'user',
        content: prompt,
        images: base64Images
      }
    ],
    options: {
      temperature: 0.3,
      num_predict: 2000
    }
  });

  const analysisText = response.message.content;
  return parseSetAnalysisResponse(analysisText, setConfig);
}

/**
 * Analyze a set with timeout protection.
 * @param {string[]} photoPaths
 * @param {Object} analysisPrompt
 * @param {Object} setConfig
 * @param {Object} [options={}] - includes timeout (ms)
 * @param {Object[]} [individualResults=[]]
 * @returns {Promise<Object>} { success, data, timedOut, error }
 */
export async function analyzeSetWithTimeout(photoPaths, analysisPrompt, setConfig, options = {}, individualResults = []) {
  const timeout = options.timeout || 120000;

  try {
    const result = await Promise.race([
      analyzeSet(photoPaths, analysisPrompt, setConfig, options, individualResults),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SET_ANALYSIS_TIMEOUT')), timeout)
      )
    ]);

    return {
      success: true,
      data: result,
      timedOut: false,
      error: null
    };
  } catch (error) {
    if (error.message === 'SET_ANALYSIS_TIMEOUT') {
      return {
        success: false,
        data: null,
        timedOut: true,
        error: `Set analysis timed out after ${timeout}ms`
      };
    }

    return {
      success: false,
      data: null,
      timedOut: false,
      error: error.message
    };
  }
}
