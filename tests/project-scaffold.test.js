/**
 * Project Scaffold Tests
 *
 * Tests for directory creation, README generation, and project initialization (FR-3.4)
 * Coverage: Filesystem operations and scaffolding utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createProjectStructure,
  generateProjectReadme,
  sanitizeProjectName,
  validateProjectName,
  projectExists
} from '../src/utils/project-scaffold.js';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import os from 'os';

describe('Project Scaffold (FR-3.4 Filesystem Operations)', () => {
  let testBaseDir;

  beforeEach(() => {
    testBaseDir = join(os.tmpdir(), `test-scaffold-${Date.now()}`);
    mkdirSync(testBaseDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testBaseDir)) {
      rmSync(testBaseDir, { recursive: true, force: true });
    }
  });

  describe('sanitizeProjectName', () => {
    it('should convert uppercase to lowercase', () => {
      expect(sanitizeProjectName('MyProject')).toBe('myproject');
    });

    it('should remove spaces and replace with dashes', () => {
      expect(sanitizeProjectName('My Project')).toBe('my-project');
    });

    it('should replace special characters with dashes', () => {
      expect(sanitizeProjectName('my@project!')).toBe('my-project');
    });

    it('should collapse multiple dashes', () => {
      expect(sanitizeProjectName('my---project')).toBe('my-project');
    });

    it('should remove leading dashes', () => {
      expect(sanitizeProjectName('-my-project')).toBe('my-project');
    });

    it('should remove trailing dashes', () => {
      expect(sanitizeProjectName('my-project-')).toBe('my-project');
    });

    it('should handle empty string after sanitization', () => {
      expect(sanitizeProjectName('!!!')).toBe('');
    });

    it('should handle real-world project names', () => {
      expect(sanitizeProjectName('Portrait Competition 2024')).toBe('portrait-competition-2024');
    });

    it('should keep valid alphanumeric and dash characters', () => {
      expect(sanitizeProjectName('my-project-123')).toBe('my-project-123');
    });

    it('should handle unicode characters', () => {
      const result = sanitizeProjectName('café-photo');
      expect(result).not.toContain('é');
      expect(result).toContain('caf');
    });
  });

  describe('validateProjectName', () => {
    it('should accept valid project name', () => {
      const result = validateProjectName('my-project');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept name with numbers', () => {
      const result = validateProjectName('project123');
      expect(result.valid).toBe(true);
    });

    it('should accept name with dashes', () => {
      const result = validateProjectName('my-valid-project');
      expect(result.valid).toBe(true);
    });

    it('should reject empty name', () => {
      const result = validateProjectName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject whitespace-only name', () => {
      const result = validateProjectName('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject name shorter than 3 characters', () => {
      const result = validateProjectName('ab');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('3 characters');
    });

    it('should reject name longer than 50 characters', () => {
      const result = validateProjectName('a'.repeat(51));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('50 characters');
    });

    it('should reject name that sanitizes to empty', () => {
      const result = validateProjectName('!!!***');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('alphanumeric');
    });

    it('should accept exactly 3 characters', () => {
      const result = validateProjectName('abc');
      expect(result.valid).toBe(true);
    });

    it('should accept exactly 50 characters', () => {
      const result = validateProjectName('a'.repeat(50));
      expect(result.valid).toBe(true);
    });
  });

  describe('projectExists', () => {
    it('should return false for non-existent project', () => {
      const exists = projectExists('non-existent', testBaseDir);
      expect(exists).toBe(false);
    });

    it('should return true for existing project', () => {
      const projectName = 'existing-project';
      const projectPath = join(testBaseDir, projectName);
      mkdirSync(projectPath, { recursive: true });

      const exists = projectExists(projectName, testBaseDir);
      expect(exists).toBe(true);
    });

    it('should check with sanitized name', () => {
      const projectName = 'Existing Project';
      const sanitized = 'existing-project';
      const projectPath = join(testBaseDir, sanitized);
      mkdirSync(projectPath, { recursive: true });

      const exists = projectExists(projectName, testBaseDir);
      expect(exists).toBe(true);
    });
  });

  describe('createProjectStructure', () => {
    it('should create project directory', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description'
      };

      const result = createProjectStructure('test-project', config, testBaseDir);

      expect(result.success).toBe(true);
      expect(result.projectPath).toBeDefined();
      expect(existsSync(result.projectPath)).toBe(true);
    });

    it('should create photos subdirectory', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description'
      };

      const result = createProjectStructure('test-project', config, testBaseDir);
      const photosDir = join(result.projectPath, 'photos');

      expect(existsSync(photosDir)).toBe(true);
    });

    it('should create results subdirectory', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description'
      };

      const result = createProjectStructure('test-project', config, testBaseDir);
      const resultsDir = join(result.projectPath, 'results');

      expect(existsSync(resultsDir)).toBe(true);
    });

    it('should create open-call.json', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description'
      };

      const result = createProjectStructure('test-project', config, testBaseDir);
      const configFile = join(result.projectPath, 'open-call.json');

      expect(existsSync(configFile)).toBe(true);
    });

    it('should create README.md', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description'
      };

      const result = createProjectStructure('test-project', config, testBaseDir);
      const readmeFile = join(result.projectPath, 'README.md');

      expect(existsSync(readmeFile)).toBe(true);
    });

    it('should sanitize project name in path', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description'
      };

      const result = createProjectStructure('My Test Project', config, testBaseDir);
      expect(result.projectPath).toContain('my-test-project');
    });

    it('should return error if project already exists', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description'
      };

      // Create first project
      const result1 = createProjectStructure('test-project', config, testBaseDir);
      expect(result1.success).toBe(true);

      // Try to create again
      const result2 = createProjectStructure('test-project', config, testBaseDir);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already exists');
    });

    it('should handle special characters in project name', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description'
      };

      const result = createProjectStructure('My@Special!Project', config, testBaseDir);
      expect(result.success).toBe(true);
      expect(result.projectPath).not.toContain('@');
      expect(result.projectPath).not.toContain('!');
    });

    it('should preserve config data in open-call.json', () => {
      const config = {
        title: 'Portrait Excellence Awards',
        theme: 'Capturing human emotion',
        jury: ['Photographer 1', 'Photographer 2', 'Photographer 3'],
        pastWinners: 'Winners showed strong emotional connection',
        context: 'Focus on authentic portraits'
      };

      const result = createProjectStructure('test-project', config, testBaseDir);
      const configFile = join(result.projectPath, 'open-call.json');
      const savedConfig = JSON.parse(readFileSync(configFile, 'utf-8'));

      expect(savedConfig.title).toBe(config.title);
      expect(savedConfig.theme).toBe(config.theme);
      expect(savedConfig.jury).toEqual(config.jury);
      expect(savedConfig.pastWinners).toBe(config.pastWinners);
      expect(savedConfig.context).toBe(config.context);
    });
  });

  describe('generateProjectReadme', () => {
    it('should generate README with title', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description'
      };

      const readme = generateProjectReadme('test-project', config);
      expect(readme).toContain(config.title);
      expect(readme).toContain('# Test Competition');
    });

    it('should include theme in README', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description'
      };

      const readme = generateProjectReadme('test-project', config);
      expect(readme).toContain(config.theme);
    });

    it('should list jury members', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['John Doe', 'Jane Smith'],
        pastWinners: 'Past winners description'
      };

      const readme = generateProjectReadme('test-project', config);
      expect(readme).toContain('John Doe');
      expect(readme).toContain('Jane Smith');
    });

    it('should include past winners description', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Winners showed excellent technique'
      };

      const readme = generateProjectReadme('test-project', config);
      expect(readme).toContain('Winners showed excellent technique');
    });

    it('should include usage instructions', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description'
      };

      const readme = generateProjectReadme('test-project', config);
      expect(readme).toContain('Add Your Photos');
      expect(readme).toContain('Run Analysis');
      expect(readme).toContain('View Results');
    });

    it('should include context when provided', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description',
        context: 'Special focus on environmental photography'
      };

      const readme = generateProjectReadme('test-project', config);
      expect(readme).toContain('Additional Context');
      expect(readme).toContain('Special focus on environmental photography');
    });

    it('should not include context section when not provided', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description'
      };

      const readme = generateProjectReadme('test-project', config);
      expect(readme).not.toContain('Additional Context');
    });

    it('should include custom criteria when provided', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description',
        customCriteria: [
          { name: 'Composition', weight: 30, description: 'Visual arrangement' },
          { name: 'Technical Quality', weight: 25, description: 'Focus and exposure' }
        ]
      };

      const readme = generateProjectReadme('test-project', config);
      expect(readme).toContain('Custom Evaluation Criteria');
      expect(readme).toContain('Composition');
      expect(readme).toContain('Technical Quality');
      expect(readme).toContain('weight: 30');
      expect(readme).toContain('weight: 25');
    });

    it('should include project commands', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description'
      };

      const readme = generateProjectReadme('test-project', config);
      expect(readme).toContain('npm run analyze analyze');
      expect(readme).toContain('npm run analyze validate');
    });

    it('should include troubleshooting section', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description'
      };

      const readme = generateProjectReadme('test-project', config);
      expect(readme).toContain('Troubleshooting');
    });

    it('should include date in README', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description'
      };

      const readme = generateProjectReadme('test-project', config);
      const today = new Date().toISOString().split('T')[0];
      expect(readme).toContain(today);
    });

    it('should format jury list properly', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Member A', 'Member B', 'Member C'],
        pastWinners: 'Past winners description'
      };

      const readme = generateProjectReadme('test-project', config);
      expect(readme).toContain('- Member A');
      expect(readme).toContain('- Member B');
      expect(readme).toContain('- Member C');
    });

    it('should handle multiple criteria with different weights', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description',
        customCriteria: [
          { name: 'Criteria 1', weight: 10 },
          { name: 'Criteria 2', weight: 20 },
          { name: 'Criteria 3', weight: 30 },
          { name: 'Criteria 4' } // No weight specified
        ]
      };

      const readme = generateProjectReadme('test-project', config);
      expect(readme).toContain('Criteria 1');
      expect(readme).toContain('Criteria 2');
      expect(readme).toContain('Criteria 3');
      expect(readme).toContain('Criteria 4');
      expect(readme).toContain('weight: 10');
      expect(readme).toContain('weight: 20');
      expect(readme).toContain('weight: 30');
      expect(readme).toContain('weight: auto');
    });
  });

  describe('Edge Cases', () => {
    it('should handle project name with all numbers', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description'
      };

      const result = createProjectStructure('123456', config, testBaseDir);
      expect(result.success).toBe(true);
    });

    it('should handle very long valid project name', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description'
      };

      const longName = 'a'.repeat(50);
      const result = createProjectStructure(longName, config, testBaseDir);
      expect(result.success).toBe(true);
    });

    it('should handle empty custom criteria array', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: ['Jury Member'],
        pastWinners: 'Past winners description',
        customCriteria: []
      };

      const readme = generateProjectReadme('test-project', config);
      expect(readme).not.toContain('Custom Evaluation Criteria');
    });

    it('should handle large jury list', () => {
      const config = {
        title: 'Test Competition',
        theme: 'Testing photography',
        jury: Array.from({ length: 30 }, (_, i) => `Jury Member ${i + 1}`),
        pastWinners: 'Past winners description'
      };

      const readme = generateProjectReadme('test-project', config);
      expect(readme).toContain('Jury Member 1');
      expect(readme).toContain('Jury Member 30');
    });
  });
});
