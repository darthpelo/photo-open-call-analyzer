import Ajv from 'ajv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ajv = new Ajv({ allErrors: true, verbose: true });

const schemaCache = {};

function loadSchema(name) {
  if (schemaCache[name]) return schemaCache[name];
  try {
    const schemaPath = join(__dirname, 'schemas', `${name}.schema.json`);
    const content = readFileSync(schemaPath, 'utf8');
    schemaCache[name] = JSON.parse(content);
    return schemaCache[name];
  } catch (error) {
    logger.error(`Failed to load schema ${name}: ${error.message}`);
    throw new Error(`Schema ${name} not found`);
  }
}

function validate(schemaName, data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'Input must be a valid JSON object' }]
    };
  }

  const schema = loadSchema(schemaName);
  const validateFn = ajv.compile(schema);
  const isValid = validateFn(data);

  if (isValid) {
    return { valid: true, errors: [] };
  }

  const errors = (validateFn.errors || []).map((error) => {
    const field = error.instancePath || 'root';
    let message;

    switch (error.keyword) {
      case 'required':
        message = `Missing required field: "${error.params.missingProperty}"`;
        break;
      case 'enum':
        message = `Field "${field}" must be one of: ${error.params.allowedValues.join(', ')}`;
        break;
      case 'minItems':
        message = `Field "${field}" must have at least ${error.params.limit} items`;
        break;
      case 'minLength':
        message = `Field "${field}" is too short (minimum ${error.params.limit} characters)`;
        break;
      case 'pattern':
        message = `Field "${field}" has invalid format`;
        break;
      case 'maximum':
        message = `Field "${field}" must be at most ${error.params.limit}`;
        break;
      case 'minimum':
        message = `Field "${field}" must be at least ${error.params.limit}`;
        break;
      default:
        message = `Validation error at "${field}": ${error.message}`;
        break;
    }

    return { field, message };
  });

  return { valid: false, errors };
}

export function validateResearchBrief(data) {
  return validate('research-brief', data);
}

export function validateCriteriaReasoning(data) {
  return validate('criteria-reasoning', data);
}

export function validateExcirePrompts(data) {
  return validate('excire-prompts', data);
}
