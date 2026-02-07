/**
 * Project scaffolding utilities for creating open call project structures
 * Implements FR-3.4: Guided Project Initialization
 */

import { join } from 'path';
import { mkdirSync } from 'fs';
import { writeJson, writeText, fileExists } from './file-utils.js';
import { logger } from './logger.js';

/**
 * Create complete project directory structure
 * @param {string} projectName - Name of the project (will be used as directory name)
 * @param {Object} config - Open call configuration object
 * @param {string} baseDir - Base directory for projects (default: data/open-calls)
 * @returns {Object} { success: boolean, projectPath: string, error?: string }
 */
export function createProjectStructure(projectName, config, baseDir = 'data/open-calls') {
  try {
    // Sanitize project name
    const sanitizedName = sanitizeProjectName(projectName);
    const projectPath = join(baseDir, sanitizedName);

    // Check if project already exists
    if (fileExists(projectPath)) {
      return {
        success: false,
        projectPath,
        error: `Project already exists at: ${projectPath}`
      };
    }

    // Create directory structure
    logger.info(`Creating project structure at: ${projectPath}`);

    mkdirSync(projectPath, { recursive: true });
    mkdirSync(join(projectPath, 'photos'), { recursive: true });
    mkdirSync(join(projectPath, 'results'), { recursive: true });

    // Write configuration file
    const configPath = join(projectPath, 'open-call.json');
    writeJson(configPath, config);
    logger.success(`Created configuration: ${configPath}`);

    // Generate and write README
    const readmePath = join(projectPath, 'README.md');
    const readmeContent = generateProjectReadme(sanitizedName, config);
    writeText(readmePath, readmeContent);
    logger.success(`Generated README: ${readmePath}`);

    return {
      success: true,
      projectPath
    };

  } catch (error) {
    return {
      success: false,
      projectPath: '',
      error: `Failed to create project structure: ${error.message}`
    };
  }
}

/**
 * Generate project README with usage instructions
 * @param {string} projectName - Name of the project
 * @param {Object} config - Open call configuration
 * @returns {string} README markdown content
 */
export function generateProjectReadme(projectName, config) {
  const criteriaSection = config.customCriteria && config.customCriteria.length > 0
    ? `\n### Custom Evaluation Criteria\n\n${config.customCriteria.map(c => `- **${c.name}** (weight: ${c.weight || 'auto'}): ${c.description || 'No description'}`).join('\n')}\n`
    : '';

  return `# ${config.title}

## Competition Details

**Theme**: ${config.theme}

**Jury Members**:
${config.jury.map(member => `- ${member}`).join('\n')}

### Past Winners Characteristics

${config.pastWinners}
${config.context ? `\n### Additional Context\n\n${config.context}` : ''}
${criteriaSection}

---

## Usage Instructions

### 1. Add Your Photos

Place the photos you want to analyze in the \`photos/\` directory:

\`\`\`bash
cp /path/to/your/photos/*.jpg photos/
\`\`\`

**Supported formats**: JPEG, PNG
**Recommended**: Use high-quality images (1920px+ on longest side)

### 2. Run Analysis

Analyze all photos in the project:

\`\`\`bash
npm run analyze analyze data/open-calls/${projectName}/
\`\`\`

**Options**:
- \`--parallel <n>\`: Number of parallel analyses (default: 3)
- \`--checkpoint-interval <n>\`: Save progress every N photos (default: 10)
- \`--photo-timeout <seconds>\`: Timeout per photo (default: 60)
- \`--show-tiers\`: Display tier breakdown in terminal
- \`--analysis-mode <mode>\`: Analysis mode (single or multi, default: multi)

### 3. View Results

Results will be saved in the \`results/\` directory:

- \`photo-analysis.md\`: Human-readable ranking and analysis
- \`photo-analysis.json\`: Machine-readable detailed results
- \`photo-analysis.csv\`: Spreadsheet-compatible format

### 4. Validate Configuration (Optional)

To validate your configuration before running analysis:

\`\`\`bash
npm run analyze validate data/open-calls/${projectName}/ --config
\`\`\`

### 5. Validate Generated Prompt (Optional)

To check the quality of the generated analysis prompt:

\`\`\`bash
npm run analyze validate-prompt data/open-calls/${projectName}/
\`\`\`

---

## Project Structure

\`\`\`
${projectName}/
├── open-call.json          # Competition configuration (this was auto-generated)
├── README.md               # This file
├── photos/                 # Place your photos here
├── results/                # Analysis results will be saved here
└── analysis-prompt.json    # Generated analysis prompt (created on first run)
\`\`\`

---

## Tips for Best Results

1. **Photo Quality**: Use high-resolution images (at least 1920px on the longest side)
2. **File Names**: Use descriptive file names for easier identification in results
3. **Batch Size**: For large collections (50+ photos), consider using \`--parallel 5\` to speed up processing
4. **Checkpoints**: Enable checkpointing with \`--checkpoint-interval\` to prevent data loss on long runs
5. **Review Prompt**: After the first analysis, review \`analysis-prompt.json\` to understand how your photos are being evaluated

---

## Troubleshooting

**Analysis fails or times out**:
- Increase timeout: \`--photo-timeout 120\` (2 minutes)
- Reduce parallelism: \`--parallel 1\`
- Check Ollama is running: \`ollama list\`

**Configuration errors**:
- Run validation: \`npm run analyze validate data/open-calls/${projectName}/ --config\`
- Check \`open-call.json\` syntax (must be valid JSON)

**Poor results**:
- Review and refine \`open-call.json\` (especially theme and pastWinners)
- Run prompt validation: \`npm run analyze validate-prompt data/open-calls/${projectName}/\`
- Consider adding custom criteria for more specific evaluation

---

**Generated by**: Photo Open Call Analyzer
**Date**: ${new Date().toISOString().split('T')[0]}
`;
}

/**
 * Sanitize project name to be filesystem-safe
 * @param {string} name - Raw project name
 * @returns {string} Sanitized name (alphanumeric + dashes, lowercase)
 */
export function sanitizeProjectName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')  // Replace non-alphanumeric with dashes
    .replace(/-+/g, '-')           // Collapse multiple dashes
    .replace(/^-|-$/g, '');        // Remove leading/trailing dashes
}

/**
 * Validate project name format
 * @param {string} name - Project name to validate
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateProjectName(name) {
  if (!name || name.trim().length === 0) {
    return {
      valid: false,
      error: 'Project name cannot be empty'
    };
  }

  if (name.trim().length < 3) {
    return {
      valid: false,
      error: 'Project name must be at least 3 characters'
    };
  }

  if (name.length > 50) {
    return {
      valid: false,
      error: 'Project name must be 50 characters or less'
    };
  }

  // Check if sanitized name would be empty
  const sanitized = sanitizeProjectName(name);
  if (sanitized.length === 0) {
    return {
      valid: false,
      error: 'Project name must contain at least one alphanumeric character'
    };
  }

  return { valid: true };
}

/**
 * Check if a project already exists
 * @param {string} projectName - Name to check
 * @param {string} baseDir - Base directory for projects
 * @returns {boolean} True if project exists
 */
export function projectExists(projectName, baseDir = 'data/open-calls') {
  const sanitizedName = sanitizeProjectName(projectName);
  const projectPath = join(baseDir, sanitizedName);
  return fileExists(projectPath);
}
