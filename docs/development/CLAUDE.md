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
| **Architect** | `.claude/agents/architect.md` | Solution design, architecture decisions |
| **Sebastiano** | `.claude/agents/strategic-curator.md` | Strategic curatorial advisor for open call positioning |

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

### 5. Feedback Loop — Validate AI Rankings
```bash
# 1. Record your personal ranking (best photo first)
node src/cli/analyze.js human-ranking data/open-calls/my-oc/ \
  --photos best.jpg second.jpg third.jpg fourth.jpg

# 2. Compare AI ranking against yours
node src/cli/analyze.js compare data/open-calls/my-oc/
# Output: Spearman's rho, top-N overlap, biggest disagreements
# Report saved to: data/open-calls/my-oc/results/latest/comparison-report.md

# Cross-run consistency is auto-analyzed when multiple runs exist
```

### 6. Set Analysis (Polaroid Mode)
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

### 7. Discovery Flow (Conversational Pre-Analysis)
```bash
# Discover and research an open call — scaffolds project + prints workflow
node src/cli/analyze.js discover https://example.com/open-call

# The command creates data/open-calls/{name}/ and guides you through:
# 1. Research the open call (Sebastiano agent)
# 2. Build evaluation config (Art Critic agent)
# 3. Generate Excire search prompts (Sebastiano agent)
# 4. Search in Excire, export photos
# 5. Run analysis with the existing pipeline
```

## Project Structure

```
photo-open-call-analyzer/
├── CLAUDE.md                 # This file
├── package.json              # Node.js dependencies
├── .claude/
│   ├── agents/               # Agent definitions
│   │   ├── art-critic.md
│   │   ├── architect.md
│   │   ├── project-owner.md
│   │   ├── dev.md
│   │   ├── designer.md
│   │   ├── qa.md
│   │   └── strategic-curator.md
│   └── workflows/            # Reusable workflows
│       └── analyze-open-call.md
├── src/                      # Source code
│   ├── discovery/            # Conversational discovery layer
│   │   ├── discovery-orchestrator.js   # URL validation, project scaffolding
│   │   ├── research-brief-writer.js    # Structured research brief generation
│   │   ├── criteria-reasoning-writer.js # Evaluation criteria with reasoning
│   │   └── excire-prompt-writer.js     # Excire X-Prompt search queries (75-char limit)
│   ├── analysis/             # Photo analysis logic
│   │   ├── photo-analyzer.js       # Core with Ollama/LLaVA
│   │   ├── prompt-generator.js
│   │   ├── score-aggregator.js
│   │   ├── smart-tiering.js        # Tier classification (top/mid/low)
│   │   ├── benchmarking-manager.js # Model benchmarking
│   │   ├── set-analyzer.js         # Multi-image set analysis (FR-3.11)
│   │   ├── set-prompt-builder.js   # Set-level prompt generation
│   │   ├── set-score-aggregator.js # Composite set scoring
│   │   ├── winner-manager.js       # Historical winner learning (FR-3.10)
│   │   ├── strategic-analyzer.js       # Sebastiano curatorial reasoning orchestrator
│   │   ├── strategic-prompt-builder.js # Sebastiano system prompt + context builder
│   │   ├── strategic-output-parser.js  # Sebastiano dual output parser (MD + JSON)
│   │   ├── strategic-researcher.js     # Sebastiano open call web research (Sprint 3)
│   │   ├── strategic-memory.js         # Cross-session curatorial memory (Sprint 3)
│   │   ├── url-discoverer.js           # Open call URL discovery (Sprint 3)
│   │   └── comparison-engine.js        # AI vs Human ranking comparison (FR-B.3, FR-B.4)
│   ├── processing/           # Batch processing
│   │   ├── batch-processor.js      # Batch photo processing with caching & concurrency
│   │   ├── cache-manager.js        # Per-project analysis cache (FR-3.7)
│   │   ├── checkpoint-manager.js   # Crash recovery checkpoints
│   │   ├── concurrency-manager.js  # Slot-based adaptive concurrency (FR-3.8)
│   │   ├── combination-generator.js # C(N,K) set combinations + group-aware selection (FR-4.8)
│   │   ├── photo-group-resolver.js # Photo series/group resolution via glob (FR-4.8)
│   │   ├── photo-validator.js      # Photo file validation
│   │   └── submission-validator.js # Open call submission rules validation
│   ├── output/               # Report generation
│   │   ├── report-generator.js          # Single-photo reports
│   │   ├── set-report-generator.js      # Set reports (MD/JSON/CSV)
│   │   └── title-description-generator.js # AI-generated titles/descriptions
│   ├── cli/                  # CLI commands
│   ├── config/
│   │   ├── validator.js            # Configuration schema validation (Sprint 5)
│   │   ├── discovery-validator.js  # Discovery artifact validation
│   │   └── schemas/               # JSON schemas for discovery artifacts
│   ├── validation/
│   │   ├── prompt-quality-validator.js  # Prompt quality pre-analysis checks (Sprint 5)
│   │   └── ab-testing-framework.js     # A/B prompt comparison framework (Sprint 5)
│   └── utils/
│       ├── api-client.js       # Ollama client (getModelName supports override)
│       ├── model-manager.js    # Model selection & auto-pull (FR-3.9)
│       ├── error-classifier.js # Error categorization
│       ├── project-scaffold.js # Project init scaffolding
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
        ├── ADR-020-historical-winner-learning.md  # Winner patterns (FR-3.10)
        ├── ADR-021-strategic-memory.md  # Cross-session curatorial memory (Sprint 3)
        ├── ADR-022-url-discovery.md     # Open call URL discovery (Sprint 3)
        ├── ADR-023-strategic-researcher.md  # Web research integration (Sprint 3)
        ├── ADR-024-smart-concurrency-default.md  # RAM-based concurrency default (Sprint 5)
        └── ADR-025-dx-reliability.md    # DX and reliability improvements (Sprint 5)
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

### Data Privacy

**CRITICAL**: Everything under `data/open-calls/` is personal research data — open call configs, photos, results, strategic briefs, jury research, rankings, Excire prompts, etc. These files MUST NEVER be committed.

The only exception is `data/open-calls/example-template/`, which is a public reference template.

`.gitignore` enforces this with an inversive rule: `data/open-calls/*` is ignored, with `example-template/` and `.gitkeep` whitelisted. Do not weaken this rule — if you create new sample data meant to ship publicly, add an explicit whitelist entry rather than narrowing the block.

If you ever notice tracked files leaking under `data/open-calls/`, untrack them with `git rm --cached <path>` and verify `.gitignore` covers the case.

## Main Dependencies

```json
{
  "ollama": "Client for Ollama (LLaVA vision)",
  "sharp": "Image processing",
  "commander": "CLI",
  "chalk": "Colored output",
  "ora": "Spinners",
  "ajv": "JSON schema validation",
  "@inquirer/prompts": "Interactive CLI prompts",
  "cli-table3": "CLI table formatting"
}
```

Dev: `vitest` (test framework), `@vitest/coverage-v8`, `husky` + `lint-staged` (pre-commit hooks).

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

**Creating PRs**: Always use `gh pr create --body-file .pr-body.txt` (not `--body`) to avoid shell quoting issues. Use `gh pr merge <N> --merge --admin` since the sole maintainer cannot self-approve.

See `docs/development/COPILOT.md` for detailed PR workflow and body template.

## Useful Commands

```bash
# Git workflow
git checkout -b feature/m2-task-name
git push origin feature/m2-task-name
# Then create PR on GitHub

# Discovery (conversational pre-analysis)
node src/cli/analyze.js discover https://example.com/open-call

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

# Strategic Curatorial Analysis (Sebastiano)
node src/cli/analyze.js strategic-analyze ./data/open-calls/my-oc/
node src/cli/analyze.js strategic-analyze ./data/open-calls/my-oc/ --text-model llama3:8b

# Feedback Loop — validate AI rankings against your judgment (FR-B)
node src/cli/analyze.js human-ranking ./data/open-calls/my-oc/ --photos best.jpg second.jpg third.jpg
node src/cli/analyze.js compare ./data/open-calls/my-oc/

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

### Sebastiano
- Strategic curatorial advisor — does NOT analyze photos
- Analyzes open calls, jury, positioning strategy
- Two-phase: Claude Code (research) + Ollama phi3:mini (reasoning)
- Output saved to `data/open-calls/{name}/strategic/`
- Cross-session memory via claude-mem

### Project Owner
- Coordinate between agents
- Document decisions

## BMAD Context

Uses Circle plugin for structured development workflow: `/circle:scope` -> `/circle:prioritize` -> `/circle:arch` -> `/circle:impl` -> `/circle:qa`. See available `/circle:*` skills for full list.

## Language Guidelines

**IMPORTANT**: All code, comments, documentation, and commit messages MUST be in English only. Never use Italian or other languages.
