/**
 * Template Tests
 *
 * Tests for template retrieval, validation, and listing (FR-3.4)
 * Coverage: Template module utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  getTemplate,
  listTemplates,
  getTemplateChoices,
  isValidTemplate
} from '../src/config/templates.js';

describe('Templates (FR-3.4 Utility Functions)', () => {
  describe('getTemplate', () => {
    it('should return portrait template', () => {
      const template = getTemplate('portrait');
      expect(template).not.toBeNull();
      expect(template.id).toBe('portrait');
      expect(template.name).toBe('Portrait Photography');
      expect(template.description).toContain('portrait');
      expect(template.config.title).toBe('Portrait Photography Competition');
    });

    it('should return landscape template', () => {
      const template = getTemplate('landscape');
      expect(template).not.toBeNull();
      expect(template.id).toBe('landscape');
      expect(template.name).toBe('Landscape Photography');
      expect(template.config.title).toBe('Landscape Photography Competition');
    });

    it('should return conceptual template', () => {
      const template = getTemplate('conceptual');
      expect(template).not.toBeNull();
      expect(template.id).toBe('conceptual');
      expect(template.name).toBe('Conceptual Photography');
      expect(template.config.title).toBe('Conceptual Photography Competition');
    });

    it('should return street template', () => {
      const template = getTemplate('street');
      expect(template).not.toBeNull();
      expect(template.id).toBe('street');
      expect(template.name).toBe('Street Photography');
      expect(template.config.title).toBe('Street Photography Competition');
    });

    it('should return null for unknown template', () => {
      const template = getTemplate('unknown');
      expect(template).toBeNull();
    });

    it('should return null for empty string', () => {
      const template = getTemplate('');
      expect(template).toBeNull();
    });

    it('should have complete config structure in each template', () => {
      const templateIds = ['portrait', 'landscape', 'conceptual', 'street'];
      templateIds.forEach(id => {
        const template = getTemplate(id);
        expect(template.config).toHaveProperty('title');
        expect(template.config).toHaveProperty('theme');
        expect(template.config).toHaveProperty('jury');
        expect(template.config).toHaveProperty('pastWinners');
        expect(Array.isArray(template.config.jury)).toBe(true);
        expect(template.config.jury.length).toBeGreaterThan(0);
      });
    });

    it('should have customCriteria in each template', () => {
      const templateIds = ['portrait', 'landscape', 'conceptual', 'street'];
      templateIds.forEach(id => {
        const template = getTemplate(id);
        expect(template.config).toHaveProperty('customCriteria');
        expect(Array.isArray(template.config.customCriteria)).toBe(true);
        expect(template.config.customCriteria.length).toBeGreaterThan(0);
      });
    });

    it('should have valid criteria structure', () => {
      const template = getTemplate('portrait');
      template.config.customCriteria.forEach(criterion => {
        expect(criterion).toHaveProperty('name');
        expect(criterion).toHaveProperty('weight');
        expect(typeof criterion.name).toBe('string');
        expect(typeof criterion.weight).toBe('number');
        expect(criterion.weight).toBeGreaterThanOrEqual(1);
        expect(criterion.weight).toBeLessThanOrEqual(100);
      });
    });

    it('should have optional context in portrait template', () => {
      const template = getTemplate('portrait');
      expect(template.config.context).toBeDefined();
      expect(typeof template.config.context).toBe('string');
      expect(template.config.context.length).toBeGreaterThan(0);
    });
  });

  describe('listTemplates', () => {
    it('should return array of templates', () => {
      const templates = listTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should return exactly 5 templates', () => {
      const templates = listTemplates();
      expect(templates.length).toBe(5);
    });

    it('should include portrait template', () => {
      const templates = listTemplates();
      const portrait = templates.find(t => t.id === 'portrait');
      expect(portrait).toBeDefined();
      expect(portrait.name).toBe('Portrait Photography');
    });

    it('should include landscape template', () => {
      const templates = listTemplates();
      const landscape = templates.find(t => t.id === 'landscape');
      expect(landscape).toBeDefined();
      expect(landscape.name).toBe('Landscape Photography');
    });

    it('should include conceptual template', () => {
      const templates = listTemplates();
      const conceptual = templates.find(t => t.id === 'conceptual');
      expect(conceptual).toBeDefined();
      expect(conceptual.name).toBe('Conceptual Photography');
    });

    it('should include street template', () => {
      const templates = listTemplates();
      const street = templates.find(t => t.id === 'street');
      expect(street).toBeDefined();
      expect(street.name).toBe('Street Photography');
    });

    it('should have metadata for each template', () => {
      const templates = listTemplates();
      templates.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(typeof template.id).toBe('string');
        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
      });
    });

    it('should not include config property in list', () => {
      const templates = listTemplates();
      templates.forEach(template => {
        expect(template).not.toHaveProperty('config');
      });
    });
  });

  describe('getTemplateChoices', () => {
    it('should return array of choices', () => {
      const choices = getTemplateChoices();
      expect(Array.isArray(choices)).toBe(true);
      expect(choices.length).toBeGreaterThan(0);
    });

    it('should return 6 choices (5 templates + custom)', () => {
      const choices = getTemplateChoices();
      expect(choices.length).toBe(6);
    });

    it('should have correct choice structure', () => {
      const choices = getTemplateChoices();
      choices.forEach(choice => {
        expect(choice).toHaveProperty('name');
        expect(choice).toHaveProperty('value');
        expect(choice).toHaveProperty('description');
        expect(typeof choice.name).toBe('string');
        expect(typeof choice.value).toBe('string');
        expect(typeof choice.description).toBe('string');
      });
    });

    it('should include portrait choice', () => {
      const choices = getTemplateChoices();
      const portrait = choices.find(c => c.value === 'portrait');
      expect(portrait).toBeDefined();
      expect(portrait.name).toBe('Portrait Photography');
    });

    it('should include landscape choice', () => {
      const choices = getTemplateChoices();
      const landscape = choices.find(c => c.value === 'landscape');
      expect(landscape).toBeDefined();
      expect(landscape.name).toBe('Landscape Photography');
    });

    it('should include conceptual choice', () => {
      const choices = getTemplateChoices();
      const conceptual = choices.find(c => c.value === 'conceptual');
      expect(conceptual).toBeDefined();
      expect(conceptual.name).toBe('Conceptual Photography');
    });

    it('should include street choice', () => {
      const choices = getTemplateChoices();
      const street = choices.find(c => c.value === 'street');
      expect(street).toBeDefined();
      expect(street.name).toBe('Street Photography');
    });

    it('should include custom choice', () => {
      const choices = getTemplateChoices();
      const custom = choices.find(c => c.value === 'custom');
      expect(custom).toBeDefined();
      expect(custom.name).toContain('Custom');
    });
  });

  describe('isValidTemplate', () => {
    it('should validate portrait template', () => {
      expect(isValidTemplate('portrait')).toBe(true);
    });

    it('should validate landscape template', () => {
      expect(isValidTemplate('landscape')).toBe(true);
    });

    it('should validate conceptual template', () => {
      expect(isValidTemplate('conceptual')).toBe(true);
    });

    it('should validate street template', () => {
      expect(isValidTemplate('street')).toBe(true);
    });

    it('should validate custom template', () => {
      expect(isValidTemplate('custom')).toBe(true);
    });

    it('should reject unknown template', () => {
      expect(isValidTemplate('unknown')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidTemplate('')).toBe(false);
    });

    it('should reject null', () => {
      expect(isValidTemplate(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isValidTemplate(undefined)).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isValidTemplate('Portrait')).toBe(false);
      expect(isValidTemplate('LANDSCAPE')).toBe(false);
    });
  });

  describe('Template Content Quality', () => {
    it('portrait template should have meaningful descriptions', () => {
      const template = getTemplate('portrait');
      expect(template.config.theme.length).toBeGreaterThan(50);
      expect(template.config.pastWinners.length).toBeGreaterThan(100);
    });

    it('landscape template should have meaningful descriptions', () => {
      const template = getTemplate('landscape');
      expect(template.config.theme.length).toBeGreaterThan(50);
      expect(template.config.pastWinners.length).toBeGreaterThan(100);
    });

    it('conceptual template should have meaningful descriptions', () => {
      const template = getTemplate('conceptual');
      expect(template.config.theme.length).toBeGreaterThan(50);
      expect(template.config.pastWinners.length).toBeGreaterThan(100);
    });

    it('street template should have meaningful descriptions', () => {
      const template = getTemplate('street');
      expect(template.config.theme.length).toBeGreaterThan(50);
      expect(template.config.pastWinners.length).toBeGreaterThan(100);
    });

    it('all criteria should have descriptions', () => {
      const templateIds = ['portrait', 'landscape', 'conceptual', 'street'];
      templateIds.forEach(id => {
        const template = getTemplate(id);
        template.config.customCriteria.forEach(criterion => {
          expect(criterion.description).toBeDefined();
          expect(typeof criterion.description).toBe('string');
          expect(criterion.description.length).toBeGreaterThan(0);
        });
      });
    });

    it('all jury members should have meaningful names', () => {
      const templateIds = ['portrait', 'landscape', 'conceptual', 'street'];
      templateIds.forEach(id => {
        const template = getTemplate(id);
        template.config.jury.forEach(member => {
          expect(member).toBeDefined();
          expect(typeof member).toBe('string');
          expect(member.length).toBeGreaterThan(2);
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle getTemplate with undefined', () => {
      const template = getTemplate(undefined);
      expect(template).toBeNull();
    });

    it('should handle getTemplate with null', () => {
      const template = getTemplate(null);
      expect(template).toBeNull();
    });

    it('should handle getTemplate with numeric input', () => {
      const template = getTemplate(123);
      expect(template).toBeNull();
    });

    it('should not mutate template when accessed multiple times', () => {
      const template1 = getTemplate('portrait');
      const template2 = getTemplate('portrait');
      // Templates should be same reference or at least have same content
      expect(template1.id).toBe(template2.id);
      expect(template1.config.title).toBe(template2.config.title);
    });
  });
});
