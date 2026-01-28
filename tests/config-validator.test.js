import { validateOpenCall, loadOpenCallConfig, formatValidationErrors } from '../src/config/validator.js';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import os from 'os';

describe('Configuration Validator (EC-004: Config Invalid Cases)', () => {
  let testDir;

  beforeAll(() => {
    // Create temporary directory for test files
    testDir = join(os.tmpdir(), `test-config-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  describe('validateOpenCall - Valid Configurations', () => {
    it('should accept valid minimal configuration', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Photography of nature and landscapes',
        jury: ['Photographer 1', 'Photographer 2'],
        pastWinners: 'Previous winners featured strong compositions with excellent lighting'
      };

      const result = validateOpenCall(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid configuration with optional fields', () => {
      const config = {
        title: 'Portrait Excellence Awards',
        theme: 'Human portraiture exploring emotion and character',
        jury: ['Annie Leibovitz', 'Paolo Roversi'],
        pastWinners: 'Winners showcased authentic human moments with excellent lighting',
        context: 'Celebrating the power of portraiture',
        customCriteria: [
          {
            name: 'Emotional Impact',
            description: 'Does the portrait evoke feeling?',
            weight: 40
          }
        ]
      };

      const result = validateOpenCall(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept configuration with multiple jury members', () => {
      const config = {
        title: 'International Photography Award',
        theme: 'Landscape and environmental photography',
        jury: [
          'Jury Member 1',
          'Jury Member 2',
          'Jury Member 3',
          'Jury Member 4'
        ],
        pastWinners: 'Past winners demonstrated technical excellence and compelling narratives'
      };

      const result = validateOpenCall(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept configuration with custom criteria', () => {
      const config = {
        title: 'Fine Art Photography Biennial',
        theme: 'Conceptual and experimental photography',
        jury: ['Cindy Sherman', 'Trevor Paglen'],
        pastWinners: 'Winners pushed boundaries with innovative approaches',
        customCriteria: [
          {
            name: 'Conceptual Strength',
            weight: 40
          },
          {
            name: 'Visual Execution',
            weight: 30
          },
          {
            name: 'Innovation',
            weight: 30
          }
        ]
      };

      const result = validateOpenCall(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateOpenCall - Invalid Configurations', () => {
    it('should reject configuration with missing title', () => {
      const config = {
        theme: 'Photography competition',
        jury: ['Photographer'],
        pastWinners: 'Winners had excellent lighting'
      };

      const result = validateOpenCall(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Missing required field');
      expect(result.errors[0].message).toContain('title');
      expect(result.errors[0].suggestion).toBeTruthy();
    });

    it('should reject configuration with missing theme', () => {
      const config = {
        title: 'Test Competition',
        jury: ['Photographer'],
        pastWinners: 'Winners were excellent'
      };

      const result = validateOpenCall(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('theme'))).toBe(true);
    });

    it('should reject configuration with missing jury', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Photography',
        pastWinners: 'Winners were excellent'
      };

      const result = validateOpenCall(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('jury'))).toBe(true);
    });

    it('should reject configuration with missing pastWinners', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Photography',
        jury: ['Photographer']
      };

      const result = validateOpenCall(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('pastWinners'))).toBe(true);
    });

    it('should reject configuration with title too short', () => {
      const config = {
        title: 'AB',
        theme: 'Photography competition with good themes',
        jury: ['Photographer'],
        pastWinners: 'Winners featured excellent work'
      };

      const result = validateOpenCall(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('too short'))).toBe(true);
    });

    it('should reject configuration with theme too short', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Phot', // Less than 5 characters
        jury: ['Photographer'],
        pastWinners: 'Winners featured excellent work'
      };

      const result = validateOpenCall(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('too short'))).toBe(true);
    });

    it('should reject configuration with empty jury array', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Photography competition',
        jury: [],
        pastWinners: 'Winners had excellent work'
      };

      const result = validateOpenCall(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('must have') || e.message.includes('minItems'))).toBe(
        true
      );
    });

    it('should reject configuration with jury member as wrong type', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Photography competition',
        jury: ['Photographer 1', 123], // 123 is not a string
        pastWinners: 'Winners had excellent work'
      };

      const result = validateOpenCall(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('type'))).toBe(true);
    });

    it('should reject configuration with jury as string instead of array', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Photography competition',
        jury: 'Single Photographer',
        pastWinners: 'Winners had excellent work'
      };

      const result = validateOpenCall(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('type'))).toBe(true);
    });

    it('should reject configuration with pastWinners too short', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Photography competition',
        jury: ['Photographer'],
        pastWinners: 'short'
      };

      const result = validateOpenCall(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('too short'))).toBe(true);
    });

    it('should reject non-object input', () => {
      const result1 = validateOpenCall(null);
      expect(result1.valid).toBe(false);
      expect(result1.errors[0].message).toContain('valid JSON object');

      const result2 = validateOpenCall('string');
      expect(result2.valid).toBe(false);

      const result3 = validateOpenCall(['array']);
      expect(result3.valid).toBe(false);
    });

    it('should reject configuration with invalid custom criteria', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Photography competition',
        jury: ['Photographer'],
        pastWinners: 'Winners had excellent work',
        customCriteria: [
          {
            description: 'Missing name field',
            weight: 40
          }
        ]
      };

      const result = validateOpenCall(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('loadOpenCallConfig - File Operations', () => {
    it('should load valid configuration file', async () => {
      const configPath = join(testDir, 'valid-config.json');
      const config = {
        title: 'Test Competition',
        theme: 'Photography competition',
        jury: ['Photographer 1'],
        pastWinners: 'Winners had excellent lighting and composition'
      };

      writeFileSync(configPath, JSON.stringify(config));

      const result = await loadOpenCallConfig(configPath);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(config);
      expect(result.validation.valid).toBe(true);

      unlinkSync(configPath);
    });

    it('should handle invalid JSON file', async () => {
      const configPath = join(testDir, 'invalid-json.json');
      writeFileSync(configPath, '{ invalid json }');

      const result = await loadOpenCallConfig(configPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
      expect(result.validation.valid).toBe(false);

      unlinkSync(configPath);
    });

    it('should handle non-existent file', async () => {
      const configPath = join(testDir, 'non-existent.json');

      const result = await loadOpenCallConfig(configPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to read config file');
    });

    it('should detect validation errors from file', async () => {
      const configPath = join(testDir, 'invalid-config.json');
      const config = {
        title: 'AB', // Too short
        theme: 'Photo', // Too short
        jury: [], // Empty array
        pastWinners: 'short' // Too short
      };

      writeFileSync(configPath, JSON.stringify(config));

      const result = await loadOpenCallConfig(configPath);

      expect(result.success).toBe(false);
      expect(result.validation.valid).toBe(false);
      expect(result.validation.errors.length).toBeGreaterThan(0);

      unlinkSync(configPath);
    });
  });

  describe('formatValidationErrors - Error Display', () => {
    it('should format validation errors for CLI display', () => {
      const errors = [
        {
          field: 'title',
          message: 'Missing required field: "title"',
          suggestion: 'Add "title" field with competition name'
        },
        {
          field: 'jury',
          message: 'Field must have at least 1 items',
          suggestion: 'Add at least 1 jury member'
        }
      ];

      const formatted = formatValidationErrors(errors);

      expect(formatted).toContain('Configuration Validation Errors');
      expect(formatted).toContain('Missing required field: "title"');
      expect(formatted).toContain('Add "title" field');
      expect(formatted).toContain('Field must have at least 1 items');
      expect(formatted).toContain('github.com/darthpelo/photo-open-call-analyzer');
    });

    it('should handle empty errors array', () => {
      const formatted = formatValidationErrors([]);

      expect(formatted).toBe('');
    });

    it('should handle null errors', () => {
      const formatted = formatValidationErrors(null);

      expect(formatted).toBe('');
    });
  });

  describe('Unit Test: Config Validator (UT-003)', () => {
    it('UT-003.1: Valid config passes all validation checks', () => {
      const validConfigs = [
        {
          title: 'Portrait Photography Prize',
          theme: 'Human portraiture exploring emotion and character development',
          jury: ['Annie Leibovitz', 'Paolo Roversi', 'Platon'],
          pastWinners: 'Previous winners featured compelling character studies with strong emotional resonance and technical excellence'
        },
        {
          title: 'Landscape Masters',
          theme: 'Nature, landscape, and wildlife photography',
          jury: ['Frans Lanting'],
          pastWinners: 'Winners showcased stunning natural environments with exceptional technical precision'
        }
      ];

      validConfigs.forEach((config) => {
        const result = validateOpenCall(config);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('UT-003.2: Missing field detected with field name in error', () => {
      const missingFields = ['title', 'theme', 'jury', 'pastWinners'];

      missingFields.forEach((field) => {
        const config = {
          title: 'Test',
          theme: 'Photography theme description',
          jury: ['Photographer'],
          pastWinners: 'Winners had good work'
        };

        delete config[field];

        const result = validateOpenCall(config);
        expect(result.valid).toBe(false);
        expect(
          result.errors.some(
            (e) => e.message.includes(field) || e.message.toLowerCase().includes(field.toLowerCase())
          )
        ).toBe(true);
      });
    });

    it('UT-003.3: Wrong type detected (jury as string)', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Photography competition theme',
        jury: 'Single Photographer', // Wrong: string instead of array
        pastWinners: 'Winners had excellent work'
      };

      const result = validateOpenCall(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('type') || e.message.includes('array'))).toBe(true);
    });

    it('UT-003.4: Error messages are actionable (suggest fix)', () => {
      const config = {
        title: 'A', // Too short
        theme: 'Ph', // Too short
        jury: [], // Empty
        pastWinners: 'x' // Too short
      };

      const result = validateOpenCall(config);

      expect(result.valid).toBe(false);
      result.errors.forEach((error) => {
        expect(error.suggestion).toBeTruthy();
        expect(error.suggestion.length).toBeGreaterThan(10); // Actual helpful suggestion
      });
    });
  });
});
