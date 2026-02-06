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

## Git Workflow & Branch Protection

**CRITICAL**: Direct commits to `main` are NOT permitted. All changes must use feature branches and pull requests.

### Quick Workflow
1. Create branch: `git checkout -b feature/m2-task-name`
2. Make changes and test: `npm test`
3. Commit: `git commit -m "feat(scope): description"`
4. Push: `git push origin feature/m2-task-name`
5. Create PR using body-file method (see below)
6. Merge with admin bypass: `gh pr merge <number> --merge --admin`

> **Solo development note**: Since GitHub does not allow a PR author to approve their own PR, we use `--admin` to bypass the approval requirement while still keeping the PR-based workflow for traceability.

**Creating Pull Requests** (REQUIRED method):
```bash
# Create PR description file
cat > .pr-body.txt << 'EOF'
## Summary
Brief description of changes

## Implementation
- Key changes

## Testing
- Test results
EOF

# Create PR with body-file (avoids line break issues)
gh pr create --base main --head feature/m2-task-name \
  --title "feat(scope): description" \
  --body-file .pr-body.txt

# Clean up
rm .pr-body.txt

# Merge with admin bypass (solo development)
gh pr merge <PR_NUMBER> --merge --admin
```

**IMPORTANT**: Always use `--body-file` instead of `--body` to avoid shell quoting issues with complex descriptions.

**IMPORTANT**: Always use `--admin` flag when merging PRs, as the sole maintainer cannot approve their own PRs.

**See COPILOT.md for detailed workflow.**

## Useful Commands

```bash
# Git workflow
git checkout -b feature/m2-task-name
git push origin feature/m2-task-name
# Then create PR on GitHub

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
- Specifications in `../design/` (when created)
- Do not write code, only specifications
- Focus on results visualization

### QA
- Tests in `tests/` (project root)
- Bug reports in `../bugs/` (when needed)
- Coverage target: 80%+

### Project Owner
- Tracking in [ROADMAP.md](ROADMAP.md), [BACKLOG.md](BACKLOG.md)
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
