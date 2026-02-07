/**
 * Interactive CLI wizard for creating open call projects
 * Implements FR-3.4: Guided Project Initialization
 */

import { input, select, editor, confirm } from '@inquirer/prompts';
import { getTemplate, getTemplateChoices } from '../config/templates.js';
import { validateOpenCall } from '../config/validator.js';
import { createProjectStructure, validateProjectName, projectExists, sanitizeProjectName } from '../utils/project-scaffold.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

/**
 * Main entry point for the initialization wizard
 * @param {Object} options - Wizard options
 * @param {string} options.projectName - Pre-specified project name (optional)
 * @param {string} options.template - Pre-specified template ID (optional)
 * @param {boolean} options.interactive - Whether to run in interactive mode (default: true)
 * @returns {Promise<Object>} { success: boolean, projectPath?: string, error?: string }
 */
export async function runInitWizard(options = {}) {
  try {
    logger.section('PROJECT INITIALIZATION WIZARD');

    const isInteractive = options.interactive !== false;

    if (isInteractive) {
      logger.info('This wizard will guide you through creating a new open call project.\n');
    }

    // Step 1: Project Name
    const projectName = await promptProjectName(options.projectName, isInteractive);
    logger.info(`✓ Project name: ${chalk.cyan(projectName)}\n`);

    // Step 2: Template Selection
    const templateId = options.template || (isInteractive ? await promptTemplateSelection() : null);

    if (!templateId) {
      logger.error('Template is required in non-interactive mode. Use --template <type>');
      return {
        success: false,
        error: 'Missing required template'
      };
    }

    let config;

    if (templateId === 'custom') {
      if (!isInteractive) {
        logger.error('Custom template requires interactive mode');
        return {
          success: false,
          error: 'Custom template not supported in non-interactive mode'
        };
      }
      logger.info('✓ Starting with blank template\n');
      config = await promptCustomConfig();
    } else {
      logger.info(`✓ Using template: ${chalk.cyan(templateId)}\n`);
      const template = getTemplate(templateId);

      if (!template) {
        logger.error(`Unknown template: ${templateId}`);
        logger.info('Available templates: portrait, landscape, conceptual, street, custom');
        return {
          success: false,
          error: `Unknown template: ${templateId}`
        };
      }

      config = await promptTemplateCustomization(template, isInteractive);
    }

    // Step 3: Validate Configuration
    logger.section('VALIDATION');
    const validation = validateOpenCall(config);

    if (!validation.valid) {
      logger.error('Configuration validation failed:');
      validation.errors.forEach(err => {
        logger.error(`  ${err.field}: ${err.message}`);
        if (err.suggestion) {
          logger.info(`    → ${err.suggestion}`);
        }
      });
      return {
        success: false,
        error: 'Configuration validation failed'
      };
    }

    logger.success('✓ Configuration is valid\n');

    // Step 4: Review & Confirmation
    logger.section('CONFIGURATION REVIEW');
    displayConfigSummary(config);

    if (isInteractive) {
      const confirmed = await confirm({
        message: 'Create this project?',
        default: true
      });

      if (!confirmed) {
        logger.warn('Project creation cancelled by user');
        return {
          success: false,
          error: 'Cancelled by user'
        };
      }
    } else {
      logger.info('Auto-confirming in non-interactive mode\n');
    }

    // Step 5: Create Project
    logger.section('PROJECT CREATION');
    const result = createProjectStructure(projectName, config);

    if (!result.success) {
      logger.error(result.error);
      return result;
    }

    // Success!
    logger.section('SUCCESS');
    logger.success(`Project created: ${chalk.green(result.projectPath)}`);
    logger.info('\nNext steps:');
    logger.info(`  1. Add photos to: ${chalk.cyan(result.projectPath + '/photos/')}`);
    logger.info(`  2. Run analysis: ${chalk.cyan(`npm run analyze analyze ${result.projectPath}/`)}`);
    logger.info(`  3. View results in: ${chalk.cyan(result.projectPath + '/results/')}`);
    logger.info(`\nFor detailed instructions, see: ${chalk.cyan(result.projectPath + '/README.md')}`);

    return result;

  } catch (error) {
    if (error.name === 'ExitPromptError') {
      logger.warn('\nWizard cancelled by user (Ctrl+C)');
      return {
        success: false,
        error: 'Cancelled by user'
      };
    }
    logger.error(`Wizard failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Prompt for project name with validation
 * @param {string} initialName - Pre-specified name (optional)
 * @param {boolean} isInteractive - Whether to prompt interactively
 * @returns {Promise<string>} Valid project name
 */
async function promptProjectName(initialName, isInteractive = true) {
  if (initialName) {
    const validation = validateProjectName(initialName);
    if (validation.valid && !projectExists(initialName)) {
      return initialName;
    }
    if (projectExists(initialName)) {
      if (!isInteractive) {
        throw new Error(`Project '${initialName}' already exists`);
      }
      logger.warn(`Project '${initialName}' already exists. Please choose a different name.`);
    } else if (!validation.valid) {
      if (!isInteractive) {
        throw new Error(`Invalid project name: ${validation.error}`);
      }
      logger.warn(`Invalid project name: ${validation.error}`);
    }
  } else if (!isInteractive) {
    throw new Error('Project name is required in non-interactive mode');
  }

  // Interactive prompt with validation
  return await input({
    message: 'Project name:',
    default: initialName || '',
    validate: (value) => {
      const validation = validateProjectName(value);
      if (!validation.valid) {
        return validation.error;
      }
      if (projectExists(value)) {
        return `Project '${sanitizeProjectName(value)}' already exists. Choose a different name.`;
      }
      return true;
    },
    transformer: (value) => {
      // Show sanitized version as user types
      return value ? `${value} → ${chalk.dim(sanitizeProjectName(value))}` : value;
    }
  });
}

/**
 * Prompt for template selection
 * @returns {Promise<string>} Selected template ID
 */
async function promptTemplateSelection() {
  return await select({
    message: 'Choose a template (or start blank):',
    choices: getTemplateChoices(),
    pageSize: 10
  });
}

/**
 * Prompt for custom configuration (blank template)
 * @returns {Promise<Object>} Open call configuration
 */
async function promptCustomConfig() {
  logger.section('COMPETITION DETAILS');

  const title = await input({
    message: 'Competition title:',
    validate: (value) => {
      if (!value || value.trim().length < 3) {
        return 'Title must be at least 3 characters';
      }
      if (value.length > 200) {
        return 'Title must be 200 characters or less';
      }
      return true;
    }
  });

  const theme = await editor({
    message: 'Photography theme (editor will open):',
    default: 'Describe the photography theme, style, and focus for this competition...',
    validate: (value) => {
      if (!value || value.trim().length < 5) {
        return 'Theme must be at least 5 characters';
      }
      if (value.length > 1000) {
        return 'Theme must be 1000 characters or less';
      }
      return true;
    },
    postfix: '.txt'
  });

  const jury = await promptJuryMembers([]);

  const pastWinners = await editor({
    message: 'Past winners description (editor will open):',
    default: 'Describe past winning photos: their style, themes, technical qualities, common characteristics...',
    validate: (value) => {
      if (!value || value.trim().length < 10) {
        return 'Past winners description must be at least 10 characters';
      }
      if (value.length > 2000) {
        return 'Description must be 2000 characters or less';
      }
      return true;
    },
    postfix: '.txt'
  });

  const addContext = await confirm({
    message: 'Add additional context? (optional)',
    default: false
  });

  let context = undefined;
  if (addContext) {
    context = await editor({
      message: 'Additional context (editor will open):',
      default: 'Add any additional context, mission statement, or special focus areas...',
      validate: (value) => {
        if (value && value.length > 2000) {
          return 'Context must be 2000 characters or less';
        }
        return true;
      },
      postfix: '.txt'
    });
  }

  const addCriteria = await confirm({
    message: 'Define custom evaluation criteria? (optional)',
    default: false
  });

  let customCriteria = undefined;
  if (addCriteria) {
    customCriteria = await promptCustomCriteria([]);
  }

  const setMode = await promptSetMode();

  return {
    title,
    theme,
    jury,
    pastWinners,
    ...(context && { context }),
    ...(customCriteria && customCriteria.length > 0 && { customCriteria }),
    ...(setMode && { setMode })
  };
}

/**
 * Prompt for template customization
 * @param {Object} template - Template object
 * @param {boolean} isInteractive - Whether to prompt interactively
 * @returns {Promise<Object>} Customized configuration
 */
async function promptTemplateCustomization(template, isInteractive = true) {
  const config = { ...template.config };

  // In non-interactive mode, use template as-is
  if (!isInteractive) {
    logger.info('Using template defaults (non-interactive mode)\n');
    return config;
  }

  logger.info('Template loaded. You can customize the default values or press Enter to keep them.\n');

  const customize = await confirm({
    message: 'Customize template values?',
    default: false
  });

  if (!customize) {
    return config;
  }

  logger.section('CUSTOMIZE TEMPLATE');

  // Allow customization of key fields
  const title = await input({
    message: 'Competition title:',
    default: config.title,
    validate: (value) => value.length >= 3 && value.length <= 200 || 'Title must be 3-200 characters'
  });

  const customizeTheme = await confirm({
    message: 'Customize theme?',
    default: false
  });

  let theme = config.theme;
  if (customizeTheme) {
    theme = await editor({
      message: 'Photography theme (editor will open):',
      default: config.theme,
      validate: (value) => (value.length >= 5 && value.length <= 1000) || 'Theme must be 5-1000 characters',
      postfix: '.txt'
    });
  }

  const customizeJury = await confirm({
    message: 'Customize jury members?',
    default: false
  });

  let jury = config.jury;
  if (customizeJury) {
    jury = await promptJuryMembers(config.jury);
  }

  const customizePastWinners = await confirm({
    message: 'Customize past winners description?',
    default: false
  });

  let pastWinners = config.pastWinners;
  if (customizePastWinners) {
    pastWinners = await editor({
      message: 'Past winners description (editor will open):',
      default: config.pastWinners,
      validate: (value) => (value.length >= 10 && value.length <= 2000) || 'Description must be 10-2000 characters',
      postfix: '.txt'
    });
  }

  return {
    title,
    theme,
    jury,
    pastWinners,
    ...(config.context && { context: config.context }),
    ...(config.customCriteria && { customCriteria: config.customCriteria }),
    ...(config.setMode && { setMode: config.setMode })
  };
}

/**
 * Prompt for jury members (repeating input)
 * @param {Array<string>} existing - Existing jury members (for template customization)
 * @returns {Promise<Array<string>>} Array of jury member names
 */
async function promptJuryMembers(existing = []) {
  const jury = [...existing];

  logger.info('Add jury members (one at a time). Press Enter with empty value when done.');

  while (jury.length < 50) {
    const member = await input({
      message: `Jury member ${jury.length + 1} (or press Enter to finish):`,
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          if (jury.length === 0) {
            return 'At least one jury member is required';
          }
          return true; // Empty input ends the loop
        }
        if (value.length < 2) {
          return 'Name must be at least 2 characters';
        }
        if (value.length > 100) {
          return 'Name must be 100 characters or less';
        }
        return true;
      }
    });

    if (!member || member.trim().length === 0) {
      break; // User pressed Enter without input
    }

    jury.push(member.trim());
    logger.success(`✓ Added: ${member}`);
  }

  if (jury.length >= 50) {
    logger.warn('Maximum jury size (50) reached');
  }

  return jury;
}

/**
 * Prompt for custom criteria (repeating input)
 * @param {Array<Object>} existing - Existing criteria (for template customization)
 * @returns {Promise<Array<Object>>} Array of criteria objects
 */
async function promptCustomCriteria(existing = []) {
  const criteria = [...existing];

  logger.info('Define custom evaluation criteria (up to 10). You will be prompted for each criterion.');

  while (criteria.length < 10) {
    const addMore = criteria.length === 0 || await confirm({
      message: `Add ${criteria.length === 0 ? 'a' : 'another'} criterion?`,
      default: criteria.length < 4
    });

    if (!addMore) {
      break;
    }

    const name = await input({
      message: 'Criterion name:',
      validate: (value) => {
        if (!value || value.trim().length < 2) {
          return 'Name must be at least 2 characters';
        }
        if (value.length > 50) {
          return 'Name must be 50 characters or less';
        }
        return true;
      }
    });

    const addDescription = await confirm({
      message: 'Add description? (optional)',
      default: false
    });

    let description = undefined;
    if (addDescription) {
      description = await input({
        message: 'Description:',
        validate: (value) => {
          if (value && (value.length < 5 || value.length > 500)) {
            return 'Description must be 5-500 characters';
          }
          return true;
        }
      });
    }

    const addWeight = await confirm({
      message: 'Set custom weight? (optional, auto-normalized)',
      default: false
    });

    let weight = undefined;
    if (addWeight) {
      const weightStr = await input({
        message: 'Weight (1-100):',
        default: '25',
        validate: (value) => {
          const num = parseInt(value, 10);
          if (isNaN(num) || num < 1 || num > 100) {
            return 'Weight must be a number between 1 and 100';
          }
          return true;
        }
      });
      weight = parseInt(weightStr, 10);
    }

    criteria.push({
      name: name.trim(),
      ...(description && { description: description.trim() }),
      ...(weight && { weight })
    });

    logger.success(`✓ Added criterion: ${name}`);
  }

  if (criteria.length >= 10) {
    logger.warn('Maximum criteria count (10) reached');
  }

  return criteria.length > 0 ? criteria : undefined;
}

/**
 * Prompt for set mode configuration (Polaroid-style photo sets)
 * @returns {Promise<Object|undefined>} Set mode configuration or undefined if not enabled
 */
async function promptSetMode() {
  const enableSetMode = await confirm({
    message: 'Does this competition require submitting a set/group of photos?',
    default: false
  });

  if (!enableSetMode) {
    return undefined;
  }

  logger.section('SET MODE CONFIGURATION');

  const setSizeStr = await input({
    message: 'How many photos per set?',
    default: '4',
    validate: (value) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 2 || num > 10) {
        return 'Set size must be a number between 2 and 10';
      }
      return true;
    }
  });
  const setSize = parseInt(setSizeStr, 10);

  const useDefaultSetCriteria = await confirm({
    message: 'Use default set criteria (Visual Coherence, Thematic Dialogue, Narrative Arc, Complementarity)?',
    default: true
  });

  let setCriteria;
  if (!useDefaultSetCriteria) {
    setCriteria = await promptCustomCriteria([]);
  } else {
    setCriteria = [
      { name: 'Visual Coherence', weight: 25, description: 'Consistency of style, color palette, tonal quality, and aesthetic approach across all photos' },
      { name: 'Thematic Dialogue', weight: 30, description: 'How the photos converse with each other, building upon or contrasting themes meaningfully' },
      { name: 'Narrative Arc', weight: 25, description: 'Whether the set tells a story or creates a journey from first to last photo' },
      { name: 'Complementarity', weight: 20, description: 'How each photo adds unique value to the set without redundancy' }
    ];
  }

  logger.success(`Set mode enabled: ${setSize} photos per set`);

  return {
    enabled: true,
    setSize,
    ...(setCriteria && setCriteria.length > 0 && { setCriteria }),
    individualWeight: 40,
    setWeight: 60,
    maxSetsToEvaluate: 10
  };
}

/**
 * Display formatted configuration summary
 * @param {Object} config - Open call configuration
 */
function displayConfigSummary(config) {
  logger.info(chalk.bold('Title: ') + config.title);
  logger.info(chalk.bold('Theme: ') + (config.theme.length > 100 ? config.theme.substring(0, 100) + '...' : config.theme));
  logger.info(chalk.bold('Jury: ') + `${config.jury.length} members`);
  config.jury.forEach((member, i) => {
    logger.info(`  ${i + 1}. ${member}`);
  });
  logger.info(chalk.bold('Past Winners: ') + (config.pastWinners.length > 100 ? config.pastWinners.substring(0, 100) + '...' : config.pastWinners));

  if (config.context) {
    logger.info(chalk.bold('Context: ') + (config.context.length > 100 ? config.context.substring(0, 100) + '...' : config.context));
  }

  if (config.customCriteria && config.customCriteria.length > 0) {
    logger.info(chalk.bold('Custom Criteria: ') + `${config.customCriteria.length} defined`);
    config.customCriteria.forEach((criterion, i) => {
      const weightStr = criterion.weight ? ` (weight: ${criterion.weight})` : '';
      logger.info(`  ${i + 1}. ${criterion.name}${weightStr}`);
    });
  }

  if (config.setMode && config.setMode.enabled) {
    logger.info(chalk.bold('Set Mode: ') + chalk.green('Enabled'));
    logger.info(`  Photos per set: ${config.setMode.setSize || 4}`);
    logger.info(`  Scoring: ${config.setMode.individualWeight || 40}% individual + ${config.setMode.setWeight || 60}% set`);
    if (config.setMode.setCriteria && config.setMode.setCriteria.length > 0) {
      logger.info(`  Set Criteria: ${config.setMode.setCriteria.length} defined`);
      config.setMode.setCriteria.forEach((criterion, i) => {
        const weightStr = criterion.weight ? ` (weight: ${criterion.weight})` : '';
        logger.info(`    ${i + 1}. ${criterion.name}${weightStr}`);
      });
    }
  }

  console.log(); // Empty line for spacing
}
