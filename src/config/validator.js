import Ajv from 'ajv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ajv = new Ajv({ allErrors: true, verbose: true });

// Load schema from file
let schema = null;

function loadSchema() {
  if (schema) return schema;
  try {
    const schemaPath = join(__dirname, 'open-call.schema.json');
    const schemaContent = readFileSync(schemaPath, 'utf8');
    schema = JSON.parse(schemaContent);
    return schema;
  } catch (error) {
    logger.error(`Failed to load schema: ${error.message}`);
    throw new Error('Configuration schema not found');
  }
}

/**
 * Validates an open call configuration object against the schema.
 * Returns structured validation result with errors if any.
 *
 * Implements ADR-007: Configuration Validation Schema
 *
 * @param {Object} config - The open call configuration to validate
 * @returns {Object} { valid: boolean, errors: Array<{field: string, message: string, suggestion: string}> }
 */
export function validateOpenCall(config) {
  if (!config || typeof config !== 'object') {
    return {
      valid: false,
      errors: [
        {
          field: 'root',
          message: 'Configuration must be a valid JSON object',
          suggestion: 'Ensure open-call.json is valid JSON and is an object (not array or null)'
        }
      ]
    };
  }

  const schema = loadSchema();
  const validate = ajv.compile(schema);
  const isValid = validate(config);

  if (isValid) {
    return { valid: true, errors: [] };
  }

  // Format AJV errors into user-friendly messages
  const errors = (validate.errors || []).map((error) => {
    const field = error.instancePath || 'root';
    let message = '';
    let suggestion = '';

    switch (error.keyword) {
      case 'required':
        message = `Missing required field: "${error.params.missingProperty}"`;
        suggestion = `Add "${error.params.missingProperty}" field to open-call.json. Check the template for format.`;
        break;

      case 'type':
        message = `Field "${field}" must be of type "${error.params.type}", but got ${Array.isArray(config[field.split('/').pop()]) ? 'array' : typeof config[field.split('/').pop()]}`;
        suggestion = `Ensure "${field}" is a valid ${error.params.type} (check your JSON syntax and quotes)`;
        break;

      case 'minLength':
        message = `Field "${field}" is too short (minimum ${error.params.minLength} characters)`;
        suggestion = `Provide a longer value for "${field}" (at least ${error.params.minLength} characters)`;
        break;

      case 'maxLength':
        message = `Field "${field}" is too long (maximum ${error.params.maxLength} characters)`;
        suggestion = `Shorten the value for "${field}" to ${error.params.maxLength} characters or less`;
        break;

      case 'minItems':
        message = `Field "${field}" must have at least ${error.params.minItems} items`;
        suggestion = `Add at least ${error.params.minItems} items to "${field}" (e.g., jury members)`;
        break;

      case 'minimum':
        message = `Field "${field}" must be at least ${error.params.minimum}`;
        suggestion = `Use a value of ${error.params.minimum} or greater for "${field}"`;
        break;

      case 'maximum':
        message = `Field "${field}" must be at most ${error.params.maximum}`;
        suggestion = `Use a value of ${error.params.maximum} or less for "${field}"`;
        break;

      case 'additionalProperties':
        message = `Field "${error.params.additionalProperty}" is not recognized in this context`;
        suggestion = `Remove "${error.params.additionalProperty}" or check the template for correct field names`;
        break;

      default:
        message = `Validation error at "${field}": ${error.message}`;
        suggestion = 'Check the template example for correct format';
        break;
    }

    return {
      field: field || 'root',
      message,
      suggestion
    };
  });

  return { valid: false, errors };
}

/**
 * Load and parse an open call configuration from a JSON file.
 * Validates it against schema.
 *
 * @param {string} filePath - Path to the JSON file
 * @returns {Object} { success: boolean, data: Object|null, error: string|null, validation: Object }
 */
export async function loadOpenCallConfig(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    let config;

    try {
      config = JSON.parse(content);
    } catch (parseError) {
      return {
        success: false,
        data: null,
        error: `Invalid JSON in ${filePath}: ${parseError.message}`,
        validation: { valid: false, errors: [] }
      };
    }

    const validation = validateOpenCall(config);

    if (!validation.valid) {
      return {
        success: false,
        data: null,
        error: 'Configuration validation failed',
        validation
      };
    }

    return {
      success: true,
      data: config,
      error: null,
      validation: { valid: true, errors: [] }
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: `Failed to read config file: ${error.message}`,
      validation: { valid: false, errors: [] }
    };
  }
}

/**
 * Format validation errors for CLI display
 *
 * @param {Array} errors - Array of error objects from validateOpenCall()
 * @returns {string} Formatted error message for terminal output
 */
export function formatValidationErrors(errors) {
  if (!errors || errors.length === 0) {
    return '';
  }

  let output = '\n❌ Configuration Validation Errors:\n';

  errors.forEach((error, index) => {
    output += `\n  ${index + 1}. ${error.message}\n`;
    output += `     💡 ${error.suggestion}\n`;
  });

  output += '\n  📋 See https://github.com/darthpelo/photo-open-call-analyzer#configuration for template and examples\n';

  return output;
}
