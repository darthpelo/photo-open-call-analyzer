# Photo Open Call Analyzer

Multi-agent system to analyze photos submitted to photography open calls and generate rankings based on competition-specific evaluation criteria.

## Project Description

This tool helps photographers select their best photos to submit to open calls by analyzing:
- The open call theme and requirements
- Jury preferences (based on past winners)
- Each submitted photo against identified criteria
- **Set-level coherence** for Polaroid-style exhibitions requiring photo groups in dialogue (FR-3.11)

**Stack**: Node.js + Ollama (LLaVA) for local, free vision analysis.

## Available Agents

| Agent | File | Role |
|-------|------|------|
| **Art Critic** | `.claude/agents/art-critic.md` | Analyzes open calls, generates criteria, evaluates photos |
| **Project Owner** | `.claude/agents/project-owner.md` | Coordinates project, manages priorities |
| **Dev** | `.claude/agents/dev.md` | Implements analysis logic, APIs, automation |
| **Designer** | `.claude/agents/designer.md` | UX/UI for results visualization |
| **QA** | `.claude/agents/qa.md` | Testing, validation, quality assurance |
| **Sebastiano (BMed)** | `.claude/agents/bmed.md` | Strategic curatorial advisor for open call positioning |

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
# Then run (results saved to data/open-calls/my-oc/results/{timestamp}/):
node src/cli/analyze.js analyze data/open-calls/my-oc/

# View latest results:
ls data/open-calls/my-oc/results/latest/
```

### 5. Set Analysis (Polaroid Mode)
```bash
# Initialize with Polaroid template (setMode pre-configured)
node src/cli/analyze.js init my-polaroid --template polaroid

# Smart default: auto-selects all photos if count matches setSize
node src/cli/analyze.js analyze-set data/open-calls/my-polaroid/

# Use glob patterns to select photos
node src/cli/analyze.js analyze-set data/open-calls/my-polaroid/ \
  --photos "urban-*.jpg"

# Explicit filenames (original syntax, still works)
node src/cli/analyze.js analyze-set data/open-calls/my-polaroid/ \
  --photos photo1.jpg photo2.jpg photo3.jpg photo4.jpg

# Find optimal sets from already-analyzed photos
node src/cli/analyze.js suggest-sets data/open-calls/my-polaroid/ --top 5

# Photo Groups (FR-4.8): constrain sets to series
# Add to open-call.json: "photoGroups": [{ "name": "Rotterdam", "pattern": "rotterdam*.jpg" }]
# Then suggest-sets generates combinations only within each group:
node src/cli/analyze.js suggest-sets data/open-calls/my-polaroid/ --top 3

# All results are saved to data/open-calls/my-polaroid/results/{timestamp}/
# with a 'latest' symlink pointing to the most recent run
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
│   │   ├── score-aggregator.js
│   │   ├── set-analyzer.js       # Multi-image set analysis (FR-3.11)
│   │   ├── set-prompt-builder.js # Set-level prompt generation
│   │   ├── set-score-aggregator.js # Composite set scoring
│   │   ├── winner-manager.js     # Historical winner learning (FR-3.10)
│   │   ├── strategic-analyzer.js    # Sebastiano curatorial reasoning orchestrator
│   │   ├── bmed-prompt-builder.js   # Sebastiano system prompt + context builder
│   │   └── bmed-output-parser.js    # Dual output parser (MD + JSON)
│   ├── processing/           # Batch processing
│   │   ├── batch-processor.js    # Batch photo processing with caching & concurrency
│   │   ├── cache-manager.js      # Per-project analysis cache (FR-3.7)
│   │   ├── concurrency-manager.js # Slot-based adaptive concurrency (FR-3.8)
│   │   ├── combination-generator.js # C(N,K) set combinations + group-aware selection (FR-4.8)
│   │   └── photo-group-resolver.js  # Photo series/group resolution via glob (FR-4.8)
│   ├── output/               # Report generation
│   │   └── set-report-generator.js  # Set reports (MD/JSON/CSV)
│   ├── cli/                  # CLI commands
│   └── utils/
│       ├── api-client.js     # Ollama client (getModelName supports override)
│       ├── model-manager.js  # Model selection & auto-pull (FR-3.9)
│       ├── file-utils.js
│       └── logger.js
├── data/
│   ├── open-calls/           # Open call projects
│   │   └── {call-name}/
│   │       ├── open-call.json # Config
│   │       ├── photos/       # Photos to analyze
│   │       └── results/      # Timestamped results (FR-3.12)
│   │           ├── {ISO-timestamp}/  # e.g. 2026-02-08T14-30-45
│   │           └── latest            # Symlink to most recent run
│   └── test-photos/          # Test photos
├── tests/                    # Automated tests
└── docs/
    └── architecture/
        ├── ADR-015-set-analysis.md  # Set analysis architecture decision
        ├── ADR-016-results-location.md  # Timestamped results (FR-3.12)
        ├── ADR-017-analysis-caching.md  # Per-project cache (FR-3.7)
        ├── ADR-018-parallel-processing-optimization.md  # Slot-based concurrency (FR-3.8)
        ├── ADR-019-model-selection-management.md  # Model resolution chain (FR-3.9)
        └── ADR-020-historical-winner-learning.md  # Winner patterns (FR-3.10)
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

### TDD Enforcement (ADR-013)

**MANDATORY**: All new code MUST follow Test-Driven Development.

1. **RED**: Write failing tests FIRST (before any implementation code)
2. **GREEN**: Write the minimum code to make tests pass
3. **REFACTOR**: Clean up while keeping tests green

**Rules for all agents (especially /bmad-dev)**:
- NEVER write implementation code before its test file exists and has been verified to fail
- Test file MUST be created and committed (or at least written) before the module it tests
- Coverage thresholds enforced: statements 80%, branches 70%, functions 80%, lines 80%
- Pre-commit hooks run `vitest related` on staged files - tests must pass to commit
- Every new module `src/foo/bar.js` requires `tests/bar.test.js`

**Test conventions**:
- Framework: Vitest (not Jest) with `import { describe, it, expect } from 'vitest'`
- Temp directories for file-based tests: `fs.mkdtempSync(path.join(os.tmpdir(), 'test-'))`
- Clean up in `afterEach` with `fs.rmSync(testDir, { recursive: true, force: true })`
- Follow existing test patterns in `tests/checkpoint-manager.test.js`
- Use `performance.now()` (not `Date.now()`) for sub-millisecond timing in code tested by fast unit tests
- Mock external services (`vi.mock`) before importing modules that depend on them (see `tests/model-manager.test.js`)

**Reference**: `docs/development/TDD-BEST-PRACTICES.md`, `docs/development/TDD-QUICK-REFERENCE.md`

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

# Analysis (results saved to {project}/results/{timestamp}/, FR-3.12)
node src/cli/analyze.js analyze-single ./photo.jpg
node src/cli/analyze.js analyze ./data/open-calls/my-oc/
node src/cli/analyze.js validate ./data/open-calls/my-oc/photos/

# Set Analysis (Polaroid Mode)
node src/cli/analyze.js analyze-set ./data/open-calls/my-oc/ --photos p1.jpg p2.jpg p3.jpg p4.jpg
node src/cli/analyze.js suggest-sets ./data/open-calls/my-oc/ --top 5

# View latest results
ls ./data/open-calls/my-oc/results/latest/

# Model management (FR-3.9)
node src/cli/analyze.js list-models
node src/cli/analyze.js analyze ./data/open-calls/my-oc/ --model llava:13b
node src/cli/analyze.js analyze ./data/open-calls/my-oc/ --parallel auto

# Winner learning (FR-3.10)
node src/cli/analyze.js tag-winner ./data/open-calls/my-oc/ --photo winner.jpg --placement "1st"
node src/cli/analyze.js winner-insights ./data/open-calls/my-oc/
node src/cli/analyze.js analyze ./data/open-calls/my-oc/ --compare-winners

# Strategic Curatorial Analysis (Sebastiano/BMed)
node src/cli/analyze.js bmed-analyze ./data/open-calls/my-oc/
node src/cli/analyze.js bmed-analyze ./data/open-calls/my-oc/ --text-model llama3:8b

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

### Sebastiano (BMed)
- Strategic curatorial advisor — does NOT analyze photos
- Analyzes open calls, jury, positioning strategy
- Two-phase: Claude Code (research) + Ollama phi3:mini (reasoning)
- Output saved to `data/open-calls/{name}/bmed/`
- Cross-session memory via claude-mem

### Project Owner
- Tracking in [ROADMAP.md](ROADMAP.md), [BACKLOG.md](BACKLOG.md)
- Coordinate between agents
- Document decisions

## BMAD Context

Domain: software
Phase: analysis

Available agents:
- /bmad-analyst - Analysis and discovery
- /bmad-pm - Detailed requirements
- /bmad-architect - Solution design
- /bmad-dev - Implementation
- /bmad-qa - Testing and validation
- /bmad-security - Security audit and threat modeling
- /bmad-sm - Sprint planning and backlog management
- /bmad-ux - UX design, wireframes, user flows

Workflow:
1. /bmad-analyst - Create brief
2. /bmad-pm - Create requirements
3. /bmad-architect - Create design
4. /bmad-dev - Implement
5. /bmad-qa - Validate

## Language Guidelines

**IMPORTANT**: All documentation and code comments MUST be in English only.

- ✅ **DO**: Write all documentation in English
- ✅ **DO**: Write all inline code comments in English
- ✅ **DO**: Use English for commit messages
- ✅ **DO**: Use English for issue descriptions
- ❌ **DON'T**: Use Italian or any other language in documentation
- ❌ **DON'T**: Use Italian in code comments
- ❌ **DON'T**: Use Italian in variable/function names
