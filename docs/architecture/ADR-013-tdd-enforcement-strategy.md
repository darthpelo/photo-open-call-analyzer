# ADR-013: TDD Enforcement Strategy

**Status**: Proposed
**Date**: 2026-02-07
**Deciders**: Development Team, Architect, Product Owner
**Context**: Project Restructuring - TDD Operationalization

---

## Context and Problem Statement

The project has a mature Vitest setup (438 tests, 2.7s execution, v8 coverage provider) but TDD enforcement is purely aspirational. Three critical gaps exist:

1. **No coverage thresholds**: The `vitest.config.js` configures coverage reporters (`text`, `json`, `html`, `lcov`) and exclusions but has no `thresholds` block. Tests never fail due to coverage drops, meaning coverage can silently regress from 69% to 50% without any build failure.

2. **No pre-commit hooks**: No `.husky/` directory exists. No `lint-staged` or `husky` appear in `package.json`. Developers can commit untested code freely. The `package.json` has `"lint"` and `"format"` scripts but these are never automatically invoked.

3. **Critical modules unprotected**: `photo-analyzer.js` (534 lines, core analysis engine) has 0% test coverage with no test file. `api-client.js` (70 lines) has only 35% coverage (3 basic tests covering `getApiClient()`, default host, and singleton pattern -- missing `getModelName()`, `checkOllamaStatus()`, error handling, and env var configuration).

---

## Decision Drivers

### Technical Requirements
- Coverage must fail the build when it drops below established minimums
- The core analysis pipeline (`photo-analyzer.js`) is the most critical untested code
- Pre-commit hooks provide the earliest possible feedback (before code leaves the developer's machine)
- Must work with the existing ESM (`"type": "module"`) setup
- Must not significantly slow down the commit workflow (target: <10s for pre-commit)

### Project Constraints
- The `npm run lint` and `npm run format` scripts already exist but are never enforced
- Node.js >= 20 required (husky v9 compatible)
- Solo developer workflow (pre-commit is the only enforcement point)

---

## Considered Options

### Option 1: CI-Only Enforcement (GitHub Actions thresholds)

**Overview**: Add coverage thresholds in a CI pipeline YAML file only.

**Pros**:
- No local tooling changes, zero commit overhead

**Cons**:
- Late feedback (broken commits pushed to remote)
- No local enforcement
- CI pipeline not yet configured for this project

**Verdict**: Insufficient -- does not prevent untested code from being committed and pushed

---

### Option 2: husky + lint-staged + vitest coverage thresholds

**Overview**: Pre-commit hooks run related tests; coverage thresholds enforce minimums.

**Pros**:
- Catches issues at commit time
- Lightweight (2 devDependencies)
- Works with ESM
- Fast for incremental changes (`vitest related --run`)

**Cons**:
- Adds ~5-8s to each commit
- Requires `npm install` to set up hooks
- Bypassable with `--no-verify` (acceptable escape hatch)

**Verdict**: Best balance of enforcement and developer experience

---

### Option 3: Full TDD Toolchain (husky + lint-staged + Stryker mutation testing)

**Overview**: Everything in Option 2 plus Stryker.js mutation testing.

**Pros**:
- Catches weak tests (high coverage but low mutation score)
- Highest quality guarantee

**Cons**:
- Stryker adds 5+ minutes to test runs
- Complex configuration, heavy devDependency
- Overkill for project size

**Verdict**: Over-engineered for current scope; can be added later as ADR-015

---

## Decision Outcome

**Chosen option: Option 2 - husky + lint-staged + vitest coverage thresholds**

---

## Implementation Design

### 1. vitest.config.js - Coverage Thresholds

Add `thresholds` block inside existing `coverage` configuration:

```javascript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov'],
  exclude: [
    'node_modules/',
    'tests/',
    '**/*.config.js',
    'dist/'
  ],
  thresholds: {
    statements: 80,
    branches: 70,
    functions: 80,
    lines: 80
  }
}
```

**Rationale**: Current coverage is 69%. Setting statements/functions/lines at 80 creates a clear +11% target. Branches at 70 is lower because `photo-analyzer.js` has many fallback branches that are hard to unit test without Ollama.

### 2. package.json - Dependencies and Scripts

```json
{
  "scripts": {
    "prepare": "husky",
    "test:changed": "vitest related --run"
  },
  "devDependencies": {
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0"
  },
  "lint-staged": {
    "src/**/*.js": [
      "npx vitest related --run"
    ]
  }
}
```

### 3. Pre-commit Hook

New file `.husky/pre-commit`:
```bash
npx lint-staged
```

### 4. Critical Module Test Plan

**photo-analyzer.js** (0% -> 80%+), new `tests/photo-analyzer.test.js`:
- Mock `ollama` module with `vi.mock()` (no running Ollama required)
- Test `analyzePhoto()`: successful analysis, error handling, empty response
- Test `parseAnalysisResponse()`: score extraction, weighted average, recommendations
- Test `analyzePhotoMultiStage()`: 3-stage flow with mocked responses, fallback
- Test `analyzePhotoWithTimeout()`: success path, timeout path, mode selection, multiplier
- Test `getDefaultCriteria()`: returns expected criteria with correct weights

**api-client.js** (35% -> 80%+), extend `tests/api-client.test.js`:
- Test `getModelName()`: default and `OLLAMA_MODEL` env var
- Test `checkOllamaStatus()`: connected/disconnected states
- Test `resetApiClient()`: verify new instance creation
- Test environment variables: `OLLAMA_HOST` custom value

### 5. batch-processor.js Default Fix

Line 32: Change `analysisMode = 'multi'` to `analysisMode = 'single'` (immediate, later to `'auto'` per ADR-014).

---

## Consequences

### Positive

- Coverage can never silently regress below 80/70/80/80 thresholds
- Pre-commit hooks enforce test execution before every commit
- `photo-analyzer.js` goes from 0% to 80%+ coverage, protecting the core analysis pipeline
- `api-client.js` goes from 35% to 80%+, covering error paths and configuration
- Existing `lint` and `format` scripts can be integrated into lint-staged in the future

### Negative

- Two new devDependencies (`husky`, `lint-staged`) -- both lightweight and well-maintained
- Pre-commit adds ~5-8s per commit (only runs tests related to changed files)
- Bypassable with `git commit --no-verify` (acceptable escape hatch for emergency fixes)
- Initial coverage push requires significant test writing effort (~40 tests for photo-analyzer.js)

### Neutral

- Coverage thresholds can be gradually increased (80 -> 85 -> 90) as tests mature
- lint-staged config can be extended to include linting and formatting in the future
- The `npm run test:coverage` command becomes a CI gate candidate

---

## Related Decisions

- **ADR-009**: Multi-stage prompting code currently at 0% coverage
- **ADR-011**: Criteria validation system depends on tested analysis pipeline
- **ADR-014**: Smart auto-selection will need tests from day one

---

## References

- **Vitest Config**: `vitest.config.js`
- **Package Config**: `package.json`
- **Photo Analyzer**: `src/analysis/photo-analyzer.js` (534 lines, 0% coverage)
- **API Client**: `src/utils/api-client.js` (70 lines, 35% coverage)
- **Existing Tests**: `tests/api-client.test.js`
- **Implementation Plan**: `/Users/alessioroberto/.claude/plans/federated-baking-iverson.md`

---

## Approval & Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Architect | BMAD Architect | 2026-02-07 | Proposed |
| Development Lead | Dev | 2026-02-07 | Pending Review |
| Product Owner | Project Owner | 2026-02-07 | Pending Review |
