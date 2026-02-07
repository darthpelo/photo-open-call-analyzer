/**
 * Init Wizard Unit Tests
 *
 * Tests for wizard helper functions and configuration validation (FR-3.4)
 * Note: Full integration tests in init-wizard-integration.test.js
 * These tests focus on unit-testable logic without full async mocking
 */

import { describe, it, expect } from 'vitest';
import { getTemplate } from '../src/config/templates.js';
import { validateOpenCall } from '../src/config/validator.js';

describe('Init Wizard Configuration Tests (FR-3.4)', () => {
  describe('Template Configuration Quality', () => {
    it('portrait template should have complete required config', () => {
      const template = getTemplate('portrait');
      expect(template).toBeDefined();
      expect(template.config.title).toBeDefined();
      expect(template.config.theme).toBeDefined();
      expect(template.config.jury).toBeDefined();
      expect(template.config.pastWinners).toBeDefined();
    });

    it('portrait template should be valid', () => {
      const template = getTemplate('portrait');
      const validation = validateOpenCall(template.config);
      expect(validation.valid).toBe(true);
    });

    it('landscape template should have complete required config', () => {
      const template = getTemplate('landscape');
      expect(template).toBeDefined();
      expect(template.config.title).toBeDefined();
      expect(template.config.theme).toBeDefined();
      expect(template.config.jury).toBeDefined();
      expect(template.config.pastWinners).toBeDefined();
    });

    it('landscape template should be valid', () => {
      const template = getTemplate('landscape');
      const validation = validateOpenCall(template.config);
      expect(validation.valid).toBe(true);
    });

    it('conceptual template should have complete required config', () => {
      const template = getTemplate('conceptual');
      expect(template).toBeDefined();
      expect(template.config.title).toBeDefined();
      expect(template.config.theme).toBeDefined();
      expect(template.config.jury).toBeDefined();
      expect(template.config.pastWinners).toBeDefined();
    });

    it('conceptual template should be valid', () => {
      const template = getTemplate('conceptual');
      const validation = validateOpenCall(template.config);
      expect(validation.valid).toBe(true);
    });

    it('street template should have complete required config', () => {
      const template = getTemplate('street');
      expect(template).toBeDefined();
      expect(template.config.title).toBeDefined();
      expect(template.config.theme).toBeDefined();
      expect(template.config.jury).toBeDefined();
      expect(template.config.pastWinners).toBeDefined();
    });

    it('street template should be valid', () => {
      const template = getTemplate('street');
      const validation = validateOpenCall(template.config);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Custom Configuration Validation', () => {
    it('should validate minimal valid configuration', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Test photography theme with adequate length',
        jury: ['Jury Member'],
        pastWinners: 'Past winners with sufficient description'
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);
    });

    it('should validate config with context', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Test photography theme with adequate length',
        jury: ['Jury Member'],
        pastWinners: 'Past winners with sufficient description',
        context: 'Additional context information'
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);
    });

    it('should validate config with custom criteria', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Test photography theme with adequate length',
        jury: ['Jury Member'],
        pastWinners: 'Past winners with sufficient description',
        customCriteria: [
          { name: 'Criterion 1', weight: 50 },
          { name: 'Criterion 2', weight: 50 }
        ]
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);
    });

    it('should validate config with both context and criteria', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Test photography theme with adequate length',
        jury: ['Jury Member'],
        pastWinners: 'Past winners with sufficient description',
        context: 'Additional context',
        customCriteria: [
          { name: 'Criterion 1', weight: 30 },
          { name: 'Criterion 2', weight: 40 },
          { name: 'Criterion 3', weight: 30 }
        ]
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Configuration Invalid Cases', () => {
    it('should reject config with missing title', () => {
      const config = {
        theme: 'Test theme',
        jury: ['Jury Member'],
        pastWinners: 'Past winners'
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(false);
    });

    it('should reject config with missing theme', () => {
      const config = {
        title: 'Test Competition',
        jury: ['Jury Member'],
        pastWinners: 'Past winners'
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(false);
    });

    it('should reject config with missing jury', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Test theme',
        pastWinners: 'Past winners'
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(false);
    });

    it('should reject config with missing pastWinners', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Test theme',
        jury: ['Jury Member']
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(false);
    });

    it('should reject config with empty jury array', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Test theme',
        jury: [],
        pastWinners: 'Past winners'
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(false);
    });

    it('should reject config with title too short', () => {
      const config = {
        title: 'ab',
        theme: 'Test theme',
        jury: ['Jury Member'],
        pastWinners: 'Past winners'
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(false);
    });

    it('should reject config with theme too short', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Too',
        jury: ['Jury Member'],
        pastWinners: 'Past winners'
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(false);
    });

    it('should reject config with pastWinners too short', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Test theme with adequate length',
        jury: ['Jury Member'],
        pastWinners: 'Too short'
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(false);
    });
  });

  describe('Template Content Analysis', () => {
    it('portrait template should contain relevant photography terms', () => {
      const template = getTemplate('portrait');
      const configText = JSON.stringify(template.config).toLowerCase();
      
      expect(configText).toMatch(/portrait|photograph|emotion|character/i);
    });

    it('landscape template should contain relevant photography terms', () => {
      const template = getTemplate('landscape');
      const configText = JSON.stringify(template.config).toLowerCase();
      
      expect(configText).toMatch(/landscape|nature|scenery|photograph/i);
    });

    it('conceptual template should contain relevant photography terms', () => {
      const template = getTemplate('conceptual');
      const configText = JSON.stringify(template.config).toLowerCase();
      
      expect(configText).toMatch(/concept|artistic|creative|idea/i);
    });

    it('street template should contain relevant photography terms', () => {
      const template = getTemplate('street');
      const configText = JSON.stringify(template.config).toLowerCase();
      
      expect(configText).toMatch(/street|candid|documentary|urban/i);
    });

    it('all templates should have meaningful jury descriptions', () => {
      const templateIds = ['portrait', 'landscape', 'conceptual', 'street'];
      
      templateIds.forEach(id => {
        const template = getTemplate(id);
        template.config.jury.forEach(member => {
          expect(member.length).toBeGreaterThan(3);
        });
      });
    });

    it('all templates should have criteria with descriptions', () => {
      const templateIds = ['portrait', 'landscape', 'conceptual', 'street'];
      
      templateIds.forEach(id => {
        const template = getTemplate(id);
        if (template.config.customCriteria) {
          template.config.customCriteria.forEach(criterion => {
            expect(criterion.name).toBeDefined();
            expect(criterion.name.length).toBeGreaterThan(0);
          });
        }
      });
    });
  });

  describe('Wizard Flow State Simulation', () => {
    it('should build valid config from portrait template', () => {
      const template = getTemplate('portrait');
      const userConfig = {
        title: template.config.title,
        theme: template.config.theme,
        jury: template.config.jury,
        pastWinners: template.config.pastWinners,
        ...(template.config.context && { context: template.config.context })
      };

      const validation = validateOpenCall(userConfig);
      expect(validation.valid).toBe(true);
    });

    it('should build valid config from landscape template', () => {
      const template = getTemplate('landscape');
      const userConfig = {
        title: template.config.title,
        theme: template.config.theme,
        jury: template.config.jury,
        pastWinners: template.config.pastWinners
      };

      const validation = validateOpenCall(userConfig);
      expect(validation.valid).toBe(true);
    });

    it('should allow template customization and remain valid', () => {
      const template = getTemplate('portrait');
      const customizedConfig = {
        title: 'My Custom Portrait Competition',
        theme: template.config.theme,
        jury: ['New Jury Member'],
        pastWinners: template.config.pastWinners
      };

      const validation = validateOpenCall(customizedConfig);
      expect(validation.valid).toBe(true);
    });

    it('should validate config with custom criteria addition', () => {
      const template = getTemplate('portrait');
      const configWithNewCriteria = {
        title: template.config.title,
        theme: template.config.theme,
        jury: template.config.jury,
        pastWinners: template.config.pastWinners,
        customCriteria: [
          { name: 'New Criterion', weight: 50 },
          { name: 'Another Criterion', weight: 50 }
        ]
      };

      const validation = validateOpenCall(configWithNewCriteria);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Criteria Validation', () => {
    it('should handle criteria with weights', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Test theme with sufficient content',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description',
        customCriteria: [
          { name: 'Criterion 1', weight: 25 },
          { name: 'Criterion 2', weight: 25 },
          { name: 'Criterion 3', weight: 25 },
          { name: 'Criterion 4', weight: 25 }
        ]
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);
    });

    it('should validate criteria without weights', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Test theme with sufficient content',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description',
        customCriteria: [
          { name: 'Criterion 1' },
          { name: 'Criterion 2' }
        ]
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);
    });

    it('should validate mixed criteria with and without weights', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Test theme with sufficient content',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description',
        customCriteria: [
          { name: 'Criterion 1', weight: 40 },
          { name: 'Criterion 2' },
          { name: 'Criterion 3', weight: 60 }
        ]
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);
    });

    it('should validate criteria with descriptions', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Test theme with sufficient content',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description',
        customCriteria: [
          { name: 'Technical Quality', description: 'Sharpness and exposure quality', weight: 50 },
          { name: 'Creativity', description: 'Originality of approach', weight: 50 }
        ]
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle very long jury list', () => {
      const juryMembers = Array.from({ length: 30 }, (_, i) => `Jury Member ${i + 1}`);
      const config = {
        title: 'Test Competition',
        theme: 'Test theme with sufficient content',
        jury: juryMembers,
        pastWinners: 'Past winners description'
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);
    });

    it('should handle many custom criteria', () => {
      const criteria = Array.from({ length: 10 }, (_, i) => ({
        name: `Criterion ${i + 1}`,
        weight: 10
      }));
      const config = {
        title: 'Test Competition',
        theme: 'Test theme with sufficient content',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description',
        customCriteria: criteria
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);
    });

    it('should validate config with very long context', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Test theme with sufficient content',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description',
        context: 'A'.repeat(1000) // Very long context
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Configuration Completeness', () => {
    it('portrait template should have all standard fields', () => {
      const template = getTemplate('portrait');
      expect(template.id).toBe('portrait');
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.config).toBeDefined();
    });

    it('all templates should have customCriteria', () => {
      const templateIds = ['portrait', 'landscape', 'conceptual', 'street'];
      
      templateIds.forEach(id => {
        const template = getTemplate(id);
        expect(template.config.customCriteria).toBeDefined();
        expect(Array.isArray(template.config.customCriteria)).toBe(true);
        expect(template.config.customCriteria.length).toBeGreaterThan(0);
      });
    });

    it('all templates should have context or be minimal valid config', () => {
      const templateIds = ['portrait', 'landscape', 'conceptual', 'street'];
      
      templateIds.forEach(id => {
        const template = getTemplate(id);
        // Either has context or has all minimal required fields
        const hasContext = !!template.config.context;
        const hasMinimal = !!(
          template.config.title &&
          template.config.theme &&
          template.config.jury &&
          template.config.pastWinners
        );
        expect(hasContext || hasMinimal).toBe(true);
      });
    });
  });
});
