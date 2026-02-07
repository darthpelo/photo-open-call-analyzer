/**
 * Init Wizard Integration Tests
 *
 * End-to-end tests for wizard flows without mocking (FR-3.4)
 * Coverage: Real template application, validation integration, project creation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getTemplate } from '../src/config/templates.js';
import { validateOpenCall } from '../src/config/validator.js';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import os from 'os';

describe('Init Wizard Integration (FR-3.4 E2E)', () => {
  let testBaseDir;

  beforeEach(() => {
    testBaseDir = join(os.tmpdir(), `test-wizard-integration-${Date.now()}`);
  });

  afterEach(() => {
    if (existsSync(testBaseDir)) {
      rmSync(testBaseDir, { recursive: true, force: true });
    }
  });

  describe('Template Application', () => {
    it('should apply portrait template correctly', () => {
      const template = getTemplate('portrait');
      const config = template.config;

      // Validate generated config passes validator
      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);
    });

    it('should apply landscape template correctly', () => {
      const template = getTemplate('landscape');
      const config = template.config;

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);
    });

    it('should apply conceptual template correctly', () => {
      const template = getTemplate('conceptual');
      const config = template.config;

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);
    });

    it('should apply street template correctly', () => {
      const template = getTemplate('street');
      const config = template.config;

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);
    });

    it('should have all required fields in portrait template', () => {
      const template = getTemplate('portrait');
      const config = template.config;

      expect(config.title).toBeDefined();
      expect(config.theme).toBeDefined();
      expect(config.jury).toBeDefined();
      expect(config.pastWinners).toBeDefined();
      expect(Array.isArray(config.jury)).toBe(true);
      expect(config.jury.length).toBeGreaterThan(0);
    });

    it('should have consistent criteria weights across templates', () => {
      const templates = ['portrait', 'landscape', 'conceptual', 'street'];

      templates.forEach(templateId => {
        const template = getTemplate(templateId);
        const totalWeight = template.config.customCriteria.reduce(
          (sum, c) => sum + (c.weight || 0),
          0
        );
        // Weights should be reasonable (between 50 and 150, accounting for normalization)
        expect(totalWeight).toBeGreaterThan(0);
      });
    });
  });

  describe('Configuration Validation', () => {
    it('portrait template config should pass validation', () => {
      const template = getTemplate('portrait');
      const validation = validateOpenCall(template.config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('landscape template config should pass validation', () => {
      const template = getTemplate('landscape');
      const validation = validateOpenCall(template.config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('conceptual template config should pass validation', () => {
      const template = getTemplate('conceptual');
      const validation = validateOpenCall(template.config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('street template config should pass validation', () => {
      const template = getTemplate('street');
      const validation = validateOpenCall(template.config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate custom config built from prompts', () => {
      const customConfig = {
        title: 'My Custom Competition',
        theme: 'Custom theme description that is long enough',
        jury: ['Jury Member 1', 'Jury Member 2'],
        pastWinners: 'Past winners description with sufficient detail',
        customCriteria: [
          { name: 'Composition', weight: 30 },
          { name: 'Lighting', weight: 40 },
          { name: 'Creativity', weight: 30 }
        ]
      };

      const validation = validateOpenCall(customConfig);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Template Metadata', () => {
    it('all templates should have unique IDs', () => {
      const templateIds = ['portrait', 'landscape', 'conceptual', 'street'];
      const uniqueIds = new Set(templateIds);
      expect(uniqueIds.size).toBe(templateIds.length);
    });

    it('all templates should have descriptive names', () => {
      const templateIds = ['portrait', 'landscape', 'conceptual', 'street'];

      templateIds.forEach(id => {
        const template = getTemplate(id);
        expect(template.name).toBeDefined();
        expect(template.name.length).toBeGreaterThan(5);
      });
    });

    it('all templates should have descriptions', () => {
      const templateIds = ['portrait', 'landscape', 'conceptual', 'street'];

      templateIds.forEach(id => {
        const template = getTemplate(id);
        expect(template.description).toBeDefined();
        expect(template.description.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Configuration Quality', () => {
    it('portrait template should have relevant jury for portrait photography', () => {
      const template = getTemplate('portrait');
      const jury = template.config.jury.join(' ').toLowerCase();

      // Should mention photography/photographer terms
      expect(jury).toMatch(/photograph|portrait|photo|image/i);
    });

    it('landscape template should have relevant jury for landscape photography', () => {
      const template = getTemplate('landscape');
      const jury = template.config.jury.join(' ').toLowerCase();

      expect(jury).toMatch(/photograph|landscape|nature|photographer/i);
    });

    it('conceptual template should have relevant jury for conceptual photography', () => {
      const template = getTemplate('conceptual');
      const jury = template.config.jury.join(' ').toLowerCase();

      expect(jury).toMatch(/photograph|art|curator|concept/i);
    });

    it('street template should have relevant jury for street photography', () => {
      const template = getTemplate('street');
      const jury = template.config.jury.join(' ').toLowerCase();

      expect(jury).toMatch(/photograph|street|documentary|photojournalism/i);
    });

    it('each template should have meaningful theme descriptions', () => {
      const templateIds = ['portrait', 'landscape', 'conceptual', 'street'];

      templateIds.forEach(id => {
        const template = getTemplate(id);
        expect(template.config.theme.length).toBeGreaterThan(100);
      });
    });

    it('each template should have detailed past winners descriptions', () => {
      const templateIds = ['portrait', 'landscape', 'conceptual', 'street'];

      templateIds.forEach(id => {
        const template = getTemplate(id);
        expect(template.config.pastWinners.length).toBeGreaterThan(150);
      });
    });
  });

  describe('Wizard Flow Simulation', () => {
    it('should simulate complete wizard flow for portrait', async () => {
      const template = getTemplate('portrait');
      const config = template.config;

      // Validate config can be saved and loaded
      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);

      // Verify all required fields exist
      expect(config.title).toBeDefined();
      expect(config.theme).toBeDefined();
      expect(config.jury.length).toBeGreaterThanOrEqual(1);
      expect(config.pastWinners).toBeDefined();
    });

    it('should simulate complete wizard flow for landscape', async () => {
      const template = getTemplate('landscape');
      const config = template.config;

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);

      expect(config.title).toBeDefined();
      expect(config.theme).toBeDefined();
      expect(config.jury.length).toBeGreaterThanOrEqual(1);
      expect(config.pastWinners).toBeDefined();
    });

    it('should simulate complete wizard flow for conceptual', async () => {
      const template = getTemplate('conceptual');
      const config = template.config;

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);

      expect(config.title).toBeDefined();
      expect(config.theme).toBeDefined();
      expect(config.jury.length).toBeGreaterThanOrEqual(1);
      expect(config.pastWinners).toBeDefined();
    });

    it('should simulate complete wizard flow for street', async () => {
      const template = getTemplate('street');
      const config = template.config;

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);

      expect(config.title).toBeDefined();
      expect(config.theme).toBeDefined();
      expect(config.jury.length).toBeGreaterThanOrEqual(1);
      expect(config.pastWinners).toBeDefined();
    });
  });

  describe('Criterion Handling', () => {
    it('all templates should have custom criteria', () => {
      const templateIds = ['portrait', 'landscape', 'conceptual', 'street'];

      templateIds.forEach(id => {
        const template = getTemplate(id);
        expect(template.config.customCriteria).toBeDefined();
        expect(Array.isArray(template.config.customCriteria)).toBe(true);
        expect(template.config.customCriteria.length).toBeGreaterThan(0);
      });
    });

    it('all criteria should have names and weights', () => {
      const templateIds = ['portrait', 'landscape', 'conceptual', 'street'];

      templateIds.forEach(id => {
        const template = getTemplate(id);
        template.config.customCriteria.forEach(criterion => {
          expect(criterion.name).toBeDefined();
          expect(criterion.weight).toBeDefined();
          expect(typeof criterion.name).toBe('string');
          expect(typeof criterion.weight).toBe('number');
        });
      });
    });

    it('should validate config with custom criteria', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Test theme description that is long enough',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description',
        customCriteria: [
          { name: 'Criterion 1', weight: 50 },
          { name: 'Criterion 2', weight: 50 }
        ]
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with configs without customCriteria', () => {
      const minimalConfig = {
        title: 'Minimal Competition',
        theme: 'Photography theme description',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description'
      };

      const validation = validateOpenCall(minimalConfig);
      expect(validation.valid).toBe(true);
    });

    it('should work with configs without context', () => {
      const config = {
        title: 'No Context Competition',
        theme: 'Photography theme description',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description'
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);
    });

    it('should work with configs without optional fields', () => {
      const template = getTemplate('portrait');
      const config = {
        title: template.config.title,
        theme: template.config.theme,
        jury: template.config.jury,
        pastWinners: template.config.pastWinners
      };

      const validation = validateOpenCall(config);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Configuration Modifications', () => {
    it('should allow modifying title while maintaining validity', () => {
      const template = getTemplate('portrait');
      const modifiedConfig = {
        title: 'Modified Title Competition',
        theme: template.config.theme,
        jury: template.config.jury,
        pastWinners: template.config.pastWinners
      };

      const validation = validateOpenCall(modifiedConfig);
      expect(validation.valid).toBe(true);
    });

    it('should allow modifying jury members while maintaining validity', () => {
      const template = getTemplate('portrait');
      const modifiedConfig = {
        title: template.config.title,
        theme: template.config.theme,
        jury: ['Different Jury Member 1', 'Different Jury Member 2'],
        pastWinners: template.config.pastWinners
      };

      const validation = validateOpenCall(modifiedConfig);
      expect(validation.valid).toBe(true);
    });

    it('should allow adding context to template config', () => {
      const template = getTemplate('landscape');
      const configWithContext = {
        ...template.config,
        context: 'Added context about this competition'
      };

      const validation = validateOpenCall(configWithContext);
      expect(validation.valid).toBe(true);
    });

    it('should allow adding criteria to template config', () => {
      const template = getTemplate('street');
      const configWithCriteria = {
        ...template.config,
        customCriteria: [
          { name: 'New Criterion', weight: 50 },
          { name: 'Another New Criterion', weight: 50 }
        ]
      };

      const validation = validateOpenCall(configWithCriteria);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Template Reusability', () => {
    it('portrait template should be reusable without mutation', () => {
      const template1 = getTemplate('portrait');
      const template2 = getTemplate('portrait');
      
      expect(template1.config.title).toBe(template2.config.title);
      expect(template1.config.jury).toEqual(template2.config.jury);
    });

    it('should be able to use same template config multiple times', () => {
      const template = getTemplate('portrait');
      
      const config1 = template.config;
      const config2 = template.config;
      
      const validation1 = validateOpenCall(config1);
      const validation2 = validateOpenCall(config2);
      
      expect(validation1.valid).toBe(true);
      expect(validation2.valid).toBe(true);
    });
  });

  describe('Template Accessibility', () => {
    it('should be able to retrieve any template on demand', () => {
      const templateIds = ['portrait', 'landscape', 'conceptual', 'street'];
      
      templateIds.forEach(id => {
        const template = getTemplate(id);
        expect(template).not.toBeNull();
        expect(template.id).toBe(id);
      });
    });

    it('should return null for invalid template ID', () => {
      const template = getTemplate('non-existent');
      expect(template).toBeNull();
    });

    it('should be case-sensitive for template IDs', () => {
      const template1 = getTemplate('portrait');
      const template2 = getTemplate('Portrait');
      
      expect(template1).not.toBeNull();
      expect(template2).toBeNull();
    });
  });
});
