# Photo Open Call Analyzer

Multi-agent system to analyze photos submitted to photography open calls and generate rankings based on competition-specific evaluation criteria.

## Project Description

This tool helps photographers select their best photos to submit to open calls by analyzing:
- The open call theme and requirements
- Jury preferences (based on past winners)
- Each submitted photo against identified criteria

**Stack**: Node.js + Ollama (LLaVA) for local, free vision analysis.

## Available Agents

| Agent | File | Role |
|-------|------|------|
| **Art Critic** | `.claude/agents/art-critic.md` | Analyzes open calls, generates criteria, evaluates photos |
| **Project Owner** | `.claude/agents/project-owner.md` | Coordinates project, manages priorities |
| **Dev** | `.claude/agents/dev.md` | Implements analysis logic, APIs, automation |
| **Designer** | `.claude/agents/designer.md` | UX/UI for results visualization |
| **QA** | `.claude/agents/qa.md` | Testing, validation, quality assurance |

## Main Workflow

See `.claude/workflows/analyze-open-call.md` for the complete flow.

```
1. Setup      → Project Owner initializes, Art Critic analyzes open call
2. Analysis   → Dev processes photos with Ollama/LLaVA
3. Ranking    → Art Critic generates final ranking
```

## Quick Start

### 1. Verify Ollama
```bash
ollama list  # Should show llava:7b
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Analyze a Single Photo
```bash
node src/cli/analyze.js analyze-single ./path/to/photo.jpg
```

### 4. Analyze a Batch
```bash
# Create structure
mkdir -p data/open-calls/my-oc/photos

# Add photos and config
# Then run:
node src/cli/analyze.js analyze data/open-calls/my-oc/
```

## Project Structure

```
photo-open-call-analyzer/
├── CLAUDE.md                 # This file
├── package.json              # Node.js dependencies
├── .claude/
│   ├── agents/               # Agent definitions
│   │   ├── art-critic.md
│   │   ├── project-owner.md
│   │   ├── dev.md
│   │   ├── designer.md
│   │   └── qa.md
│   └── workflows/            # Reusable workflows
│       └── analyze-open-call.md
├── src/                      # Source code
│   ├── analysis/             # Photo analysis logic
│   │   ├── photo-analyzer.js # Core with Ollama/LLaVA
│   │   ├── prompt-generator.js
│   │   └── score-aggregator.js
│   ├── processing/           # Batch processing
│   ├── output/               # Report generation
│   ├── cli/                  # CLI commands
│   └── utils/
│       ├── api-client.js     # Ollama client
│       ├── file-utils.js
│       └── logger.js
├── data/
│   ├── open-calls/           # Open call projects
│   │   └── {call-name}/
│   │       ├── open-call.json # Config
│   │       ├── photos/       # Photos to analyze
│   │       └── results/      # Results
│   └── test-photos/          # Test photos
├── tests/                    # Automated tests
└── docs/                     # Documentation
```

## Conventions

### Naming
- Files: kebab-case (`photo-analyzer.js`)
- Variables/functions: camelCase (`analyzePhoto`)
- Classes: PascalCase (`PhotoAnalyzer`)
- Constants: UPPER_SNAKE (`MAX_CONCURRENT`)

### Code
- JavaScript with ESM (type: module)
- Async/await for asynchronous operations
- Explicit error handling
- Structured logging with chalk

### Commits
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`
- Messages in English
- Reference issue if applicable

## Main Dependencies

```json
{
  "ollama": "Client for Ollama (LLaVA vision)",
  "sharp": "Image processing",
  "commander": "CLI",
  "chalk": "Colored output",
  "ora": "Spinners"
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama URL |
| `OLLAMA_MODEL` | `llava:7b` | Vision model |

## Useful Commands

```bash
# Analysis
node src/cli/analyze.js analyze-single ./photo.jpg
node src/cli/analyze.js analyze ./data/open-calls/my-oc/
node src/cli/analyze.js validate ./data/open-calls/my-oc/photos/

# Tests
npm test
```

## Notes for Agents

### Art Critic
- Focus on qualitative analysis and criteria
- Do not modify code
- Save output to `data/open-calls/{name}/`

### Dev
- Implement in `src/`
- Write tests for each critical module
- Document public APIs
- Use Ollama for image analysis

### Designer
- Specifications in `docs/design/`
- Do not write code, only specifications
- Focus on results visualization

### QA
- Tests in `tests/`
- Bug reports in `docs/bugs/`
- Coverage target: 80%+

### Project Owner
- Tracking in `ROADMAP.md`, `BACKLOG.md`
- Coordinate between agents
- Document decisions

## Language Guidelines

**IMPORTANT**: All documentation and code comments MUST be in English only.

- ✅ **DO**: Write all documentation in English
- ✅ **DO**: Write all inline code comments in English
- ✅ **DO**: Use English for commit messages
- ✅ **DO**: Use English for issue descriptions
- ❌ **DON'T**: Use Italian or any other language in documentation
- ❌ **DON'T**: Use Italian in code comments
- ❌ **DON'T**: Use Italian in variable/function names
