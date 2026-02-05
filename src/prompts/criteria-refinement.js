/**
 * Criteria Refinement for Enhanced Prompt Engineering (FR-2.4)
 *
 * Validates and refines generated evaluation criteria to ensure
 * specificity, measurability, and relevance to competition context.
 *
 * Part of Milestone 2: Enhanced Prompt Engineering
 */

/**
 * Generic/vague terms that indicate low-quality criteria
 */
const GENERIC_TERMS = [
  'quality', 'good', 'nice', 'beautiful', 'great', 'excellent',
  'well', 'properly', 'adequately', 'appropriate', 'suitable',
  'interesting', 'appealing', 'attractive', 'pleasing', 'impressive'
];

/**
 * Minimum length thresholds for quality criteria
 */
const LENGTH_THRESHOLDS = {
  name: { min: 10, max: 50 },
  description: { min: 30, max: 200 }
};

/**
 * Weight distribution rules
 */
const WEIGHT_RULES = {
  minCriteriaCount: 4,
  maxCriteriaCount: 7,
  minWeight: 5,
  maxWeight: 50,
  totalWeight: 100
};

/**
 * Validate criteria for specificity, measurability, and quality
 *
 * @param {Array} criteria - Array of criterion objects
 * @returns {Object} Validation results with issues and suggestions
 */
export function validateCriteria(criteria) {
  const issues = [];
  const suggestions = [];
  let specificityScores = [];
  let alignmentScores = [];

  // Check criteria count
  if (criteria.length < WEIGHT_RULES.minCriteriaCount) {
    issues.push({
      type: 'count',
      severity: 'high',
      message: `Too few criteria (${criteria.length}). Minimum ${WEIGHT_RULES.minCriteriaCount} recommended.`,
      suggestion: 'Add more criteria to cover different aspects of evaluation'
    });
  }

  if (criteria.length > WEIGHT_RULES.maxCriteriaCount) {
    issues.push({
      type: 'count',
      severity: 'medium',
      message: `Too many criteria (${criteria.length}). Maximum ${WEIGHT_RULES.maxCriteriaCount} recommended.`,
      suggestion: 'Consolidate overlapping criteria or remove less important ones'
    });
  }

  // Validate each criterion
  criteria.forEach((criterion, idx) => {
    const criterionIssues = validateSingleCriterion(criterion, idx);
    issues.push(...criterionIssues.issues);
    suggestions.push(...criterionIssues.suggestions);
    specificityScores.push(criterionIssues.specificityScore);
    alignmentScores.push(criterionIssues.alignmentScore);
  });

  // Check for overlap between criteria
  const overlapIssues = checkCriteriaOverlap(criteria);
  issues.push(...overlapIssues);

  // Validate weight distribution
  const weightIssues = validateWeightDistribution(criteria);
  issues.push(...weightIssues.issues);
  suggestions.push(...weightIssues.suggestions);

  // Calculate overall scores
  const avgSpecificity = specificityScores.reduce((a, b) => a + b, 0) / specificityScores.length;
  const avgAlignment = alignmentScores.reduce((a, b) => a + b, 0) / alignmentScores.length;

  return {
    valid: issues.filter(i => i.severity === 'high').length === 0,
    issues: issues,
    suggestions: suggestions,
    scores: {
      specificity: Math.round(avgSpecificity * 10) / 10,
      alignment: Math.round(avgAlignment * 10) / 10,
      overall: Math.round((avgSpecificity + avgAlignment) / 2 * 10) / 10
    }
  };
}

/**
 * Validate a single criterion
 *
 * @param {Object} criterion - Single criterion object
 * @param {number} index - Index in criteria array
 * @returns {Object} Validation results for this criterion
 */
function validateSingleCriterion(criterion, index) {
  const issues = [];
  const suggestions = [];
  let specificityScore = 10;
  let alignmentScore = 10;

  // Check name length
  if (criterion.name.length < LENGTH_THRESHOLDS.name.min) {
    issues.push({
      type: 'name_too_short',
      severity: 'medium',
      criterion: criterion.name,
      message: `Criterion "${criterion.name}" name is too short (${criterion.name.length} chars)`
    });
    suggestions.push({
      criterion: criterion.name,
      suggestion: 'Use more descriptive name that clearly indicates what is being evaluated'
    });
    specificityScore -= 2;
  }

  if (criterion.name.length > LENGTH_THRESHOLDS.name.max) {
    issues.push({
      type: 'name_too_long',
      severity: 'low',
      criterion: criterion.name,
      message: `Criterion "${criterion.name}" name is too long (${criterion.name.length} chars)`
    });
    suggestions.push({
      criterion: criterion.name,
      suggestion: 'Shorten name to be more concise, put details in description'
    });
    specificityScore -= 1;
  }

  // Check for generic terms in name
  const nameLower = criterion.name.toLowerCase();
  const genericTermsInName = GENERIC_TERMS.filter(term => nameLower.includes(term));
  if (genericTermsInName.length > 0) {
    issues.push({
      type: 'generic_name',
      severity: 'high',
      criterion: criterion.name,
      message: `Criterion "${criterion.name}" uses generic terms: ${genericTermsInName.join(', ')}`
    });
    suggestions.push({
      criterion: criterion.name,
      suggestion: 'Replace generic terms with specific photography terminology'
    });
    specificityScore -= 4;
  }

  // Check description length
  if (criterion.description.length < LENGTH_THRESHOLDS.description.min) {
    issues.push({
      type: 'description_too_short',
      severity: 'medium',
      criterion: criterion.name,
      message: `Description for "${criterion.name}" is too short (${criterion.description.length} chars)`
    });
    suggestions.push({
      criterion: criterion.name,
      suggestion: 'Add more detail about what to look for and how to measure this criterion'
    });
    specificityScore -= 2;
  }

  // Check for generic terms in description
  const descLower = criterion.description.toLowerCase();
  const genericTermsInDesc = GENERIC_TERMS.filter(term => descLower.includes(term));
  if (genericTermsInDesc.length > 2) {
    issues.push({
      type: 'generic_description',
      severity: 'medium',
      criterion: criterion.name,
      message: `Description for "${criterion.name}" uses too many generic terms`
    });
    suggestions.push({
      criterion: criterion.name,
      suggestion: 'Use concrete, measurable language with specific examples'
    });
    specificityScore -= 2;
  }

  // Check for measurability indicators
  const measurabilityIndicators = [
    'sharp', 'focus', 'exposure', 'contrast', 'color', 'composition',
    'lighting', 'tone', 'balance', 'clarity', 'detail', 'technique'
  ];
  const hasMeasurableTerms = measurabilityIndicators.some(term =>
    descLower.includes(term)
  );

  if (!hasMeasurableTerms && descLower.length > 50) {
    issues.push({
      type: 'not_measurable',
      severity: 'medium',
      criterion: criterion.name,
      message: `Description for "${criterion.name}" lacks concrete measurable elements`
    });
    suggestions.push({
      criterion: criterion.name,
      suggestion: 'Include specific visual elements or technical aspects to evaluate'
    });
    specificityScore -= 2;
  }

  return {
    issues,
    suggestions,
    specificityScore: Math.max(0, Math.min(10, specificityScore)),
    alignmentScore: Math.max(0, Math.min(10, alignmentScore))
  };
}

/**
 * Check for overlap between criteria
 *
 * @param {Array} criteria - All criteria
 * @returns {Array} Issues found
 */
function checkCriteriaOverlap(criteria) {
  const issues = [];

  for (let i = 0; i < criteria.length; i++) {
    for (let j = i + 1; j < criteria.length; j++) {
      const similarity = calculateSimilarity(
        criteria[i].name + ' ' + criteria[i].description,
        criteria[j].name + ' ' + criteria[j].description
      );

      if (similarity > 0.6) {
        issues.push({
          type: 'overlap',
          severity: 'medium',
          criterion: `${criteria[i].name} & ${criteria[j].name}`,
          message: `Criteria "${criteria[i].name}" and "${criteria[j].name}" appear to overlap significantly`,
          suggestion: `Consider consolidating these criteria or making their focus more distinct`
        });
      }
    }
  }

  return issues;
}

/**
 * Simple word-based similarity calculation
 *
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} Similarity score 0-1
 */
function calculateSimilarity(text1, text2) {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Validate weight distribution
 *
 * @param {Array} criteria - All criteria with weights
 * @returns {Object} Issues and suggestions
 */
function validateWeightDistribution(criteria) {
  const issues = [];
  const suggestions = [];

  // Calculate total weight
  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);

  if (Math.abs(totalWeight - WEIGHT_RULES.totalWeight) > 1) {
    issues.push({
      type: 'weight_total',
      severity: 'high',
      message: `Total weight is ${totalWeight}%, must equal ${WEIGHT_RULES.totalWeight}%`
    });
    suggestions.push({
      suggestion: `Normalize weights to sum to ${WEIGHT_RULES.totalWeight}%`
    });
  }

  // Check for dominant criteria
  criteria.forEach(criterion => {
    if (criterion.weight > WEIGHT_RULES.maxWeight) {
      issues.push({
        type: 'weight_too_high',
        severity: 'medium',
        criterion: criterion.name,
        message: `Weight for "${criterion.name}" is ${criterion.weight}% (max recommended: ${WEIGHT_RULES.maxWeight}%)`
      });
      suggestions.push({
        criterion: criterion.name,
        suggestion: 'Reduce weight or split into multiple criteria'
      });
    }

    if (criterion.weight < WEIGHT_RULES.minWeight) {
      issues.push({
        type: 'weight_too_low',
        severity: 'low',
        criterion: criterion.name,
        message: `Weight for "${criterion.name}" is ${criterion.weight}% (min recommended: ${WEIGHT_RULES.minWeight}%)`
      });
      suggestions.push({
        criterion: criterion.name,
        suggestion: 'Increase weight or consider if this criterion is necessary'
      });
    }
  });

  return { issues, suggestions };
}

/**
 * Normalize weights to sum to 100%
 *
 * @param {Array} criteria - Criteria with weights
 * @returns {Array} Criteria with normalized weights
 */
export function normalizeWeights(criteria) {
  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);

  if (totalWeight === 0) {
    // Equal distribution if all weights are 0
    const equalWeight = Math.floor(100 / criteria.length);
    const remainder = 100 - (equalWeight * criteria.length);

    return criteria.map((c, idx) => ({
      ...c,
      weight: idx === 0 ? equalWeight + remainder : equalWeight
    }));
  }

  // Normalize to 100%
  return criteria.map(c => ({
    ...c,
    weight: Math.round((c.weight / totalWeight) * 100)
  }));
}

/**
 * Refine criteria based on validation results
 *
 * @param {Array} criteria - Original criteria
 * @param {Object} validationResults - Results from validateCriteria
 * @param {Object} openCallData - Competition context
 * @returns {Object} Refined criteria with explanations
 */
export function refineCriteria(criteria, validationResults, openCallData) {
  const refinements = [];

  // Auto-fix weight issues
  if (validationResults.issues.some(i => i.type === 'weight_total')) {
    const normalized = normalizeWeights(criteria);
    refinements.push({
      type: 'weight_normalization',
      description: 'Normalized weights to sum to 100%',
      before: criteria.map(c => ({ name: c.name, weight: c.weight })),
      after: normalized.map(c => ({ name: c.name, weight: c.weight }))
    });
    criteria = normalized;
  }

  // Suggest more specific names for generic criteria
  validationResults.issues
    .filter(i => i.type === 'generic_name')
    .forEach(issue => {
      refinements.push({
        type: 'name_refinement',
        criterion: issue.criterion,
        description: 'Replace generic criterion name with specific terminology',
        suggestion: generateSpecificName(issue.criterion, openCallData)
      });
    });

  // Suggest splitting overly dominant criteria
  validationResults.issues
    .filter(i => i.type === 'weight_too_high')
    .forEach(issue => {
      const criterion = criteria.find(c => c.name === issue.criterion);
      refinements.push({
        type: 'split_criterion',
        criterion: issue.criterion,
        description: `Split "${issue.criterion}" (${criterion.weight}%) into multiple criteria`,
        suggestion: suggestCriterionSplit(criterion, openCallData)
      });
    });

  return {
    refinedCriteria: criteria,
    refinements: refinements,
    autoApplied: refinements.filter(r => r.type === 'weight_normalization'),
    suggestions: refinements.filter(r => r.type !== 'weight_normalization')
  };
}

/**
 * Generate more specific name suggestion
 *
 * @param {string} genericName - Original generic name
 * @param {Object} openCallData - Competition context
 * @returns {string} Suggested specific name
 */
function generateSpecificName(genericName, openCallData) {
  const theme = (openCallData.theme || '').toLowerCase();

  // Context-based suggestions
  if (genericName.toLowerCase().includes('quality')) {
    if (theme.includes('portrait')) {
      return 'Technical Portrait Excellence';
    } else if (theme.includes('landscape')) {
      return 'Technical Execution & Clarity';
    } else {
      return 'Technical Mastery';
    }
  }

  if (genericName.toLowerCase().includes('composition')) {
    return 'Compositional Strength & Visual Flow';
  }

  return `${genericName} (needs more specificity)`;
}

/**
 * Suggest how to split an overly dominant criterion
 *
 * @param {Object} criterion - Criterion to split
 * @param {Object} openCallData - Competition context
 * @returns {Array} Suggested split criteria
 */
function suggestCriterionSplit(criterion, openCallData) {
  // Generic split suggestion
  const halfWeight = Math.floor(criterion.weight / 2);

  return [
    {
      name: `${criterion.name} - Part A`,
      description: 'First aspect of ' + criterion.description,
      weight: halfWeight
    },
    {
      name: `${criterion.name} - Part B`,
      description: 'Second aspect of ' + criterion.description,
      weight: criterion.weight - halfWeight
    }
  ];
}

/**
 * Check alignment with competition theme and past winners
 *
 * @param {Array} criteria - Criteria to check
 * @param {Object} openCallData - Competition data
 * @returns {Object} Alignment analysis
 */
export function checkAlignment(criteria, openCallData) {
  const theme = (openCallData.theme || '').toLowerCase();
  const pastWinners = (openCallData.pastWinners || '').toLowerCase();
  const context = `${theme} ${pastWinners}`;

  const alignmentScores = criteria.map(criterion => {
    const criterionText = `${criterion.name} ${criterion.description}`.toLowerCase();

    // Extract key terms from context
    const contextTerms = context.split(/\s+/).filter(w => w.length > 4);
    const criterionTerms = criterionText.split(/\s+/).filter(w => w.length > 4);

    // Calculate overlap
    const commonTerms = contextTerms.filter(term =>
      criterionTerms.some(cTerm => cTerm.includes(term) || term.includes(cTerm))
    );

    const alignmentScore = Math.min(10, (commonTerms.length / Math.max(contextTerms.length, 1)) * 20);

    return {
      criterion: criterion.name,
      score: Math.round(alignmentScore * 10) / 10,
      commonTerms: commonTerms.slice(0, 3)
    };
  });

  const avgAlignment = alignmentScores.reduce((sum, s) => sum + s.score, 0) / alignmentScores.length;

  return {
    overallAlignment: Math.round(avgAlignment * 10) / 10,
    criteriaAlignment: alignmentScores,
    missingElements: identifyMissingElements(criteria, openCallData)
  };
}

/**
 * Identify important elements from competition that aren't in criteria
 *
 * @param {Array} criteria - Current criteria
 * @param {Object} openCallData - Competition data
 * @returns {Array} Missing elements
 */
function identifyMissingElements(criteria, openCallData) {
  const missing = [];
  const theme = (openCallData.theme || '').toLowerCase();
  const pastWinners = (openCallData.pastWinners || '').toLowerCase();
  const criteriaText = criteria.map(c => `${c.name} ${c.description}`.toLowerCase()).join(' ');

  // Check for important theme elements not in criteria
  const importantTerms = ['emotion', 'story', 'light', 'behavior', 'context', 'technical'];

  importantTerms.forEach(term => {
    if ((theme.includes(term) || pastWinners.includes(term)) && !criteriaText.includes(term)) {
      missing.push({
        element: term,
        source: theme.includes(term) ? 'theme' : 'past winners',
        suggestion: `Consider adding criterion related to "${term}"`
      });
    }
  });

  return missing;
}
