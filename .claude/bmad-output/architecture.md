# Architecture: M4 — Enhanced Workflow & Calibration

**Status**: Proposed
**Date**: 2026-02-20
**Scope**: FR-4.1, FR-4.2, FR-4.3, FR-4.4, FR-4.5, FR-4.6, FR-4.7
**Related ADRs**: ADR-021, ADR-022, ADR-023

---

## Overview

M4 adds seven capabilities organized into three architectural layers:

1. **Output Layer** (new): Title/Description Generator (FR-4.1), Operational Checklist (FR-4.7)
2. **Analysis Layer** (extended): Benchmarking & Calibration (FR-4.2), Optimized Prompts (FR-4.6), Configurable Weights (FR-4.4)
3. **Config Layer** (extended): Compliance Checker (FR-4.3), Templates Library (FR-4.5)

All features integrate into the existing pipeline and follow established patterns (ESM, async/await, structured logging, TDD).

---

## Architecture Principles

- **Follow existing patterns**: Reuse `api-client.js` for Ollama calls, `file-utils.js` for I/O, `logger.js` for output
- **Backward compatible**: All new `open-call.json` fields are optional; existing projects work unchanged
- **TDD-first**: Every new module gets a test file before implementation (ADR-013)
- **Local-first**: Text generation uses the same Ollama instance as vision analysis
- **Minimal new dependencies**: No new npm packages required

---

## FR-4.1: Title/Description Generator

### Problem

After photo analysis, users must manually write submission titles and descriptions. This is time-consuming and users struggle to align text with the open call theme and jury expectations.

### Design

**New module**: `src/output/title-description-generator.js`

**Text generation strategy**: Use Ollama chat API with a text model (not vision model). The existing `api-client.js` already wraps the Ollama client; we reuse it with a different model parameter.

**Model selection**: Text generation uses a separate model from vision analysis:
- Default: same model as vision (LLaVA can do text)
- Override via `open-call.json` field `textModel` or CLI `--text-model`
- Resolution: CLI flag > config `textModel` > vision model fallback

**Prompt composition**:
```
Input:
  - open call theme (from config)
  - jury profile (from config)
  - photo analysis scores + summary (from results)
  - photo filename (for context)

Output (JSON):
  { "title": "...", "description": "..." }
```

**Prompt template** (injected into Ollama chat):
```
You are an expert photography curator. Generate a title and description for a photo submitted to a photography open call.

Open Call Theme: {theme}
Jury Profile: {juryDescription}

Photo Analysis:
- Overall Score: {overallScore}/10
- Top Criteria: {topCriteria}
- Summary: {analysisSummary}

Generate:
1. A title (max 100 characters): evocative, thematic, not generic
2. A description (max 500 characters): connects the photo's strengths to the competition theme

Respond ONLY with valid JSON:
{"title": "...", "description": "..."}
```

**Batch mode**: Iterates through all analyzed photos in `results/latest/`, generating texts sequentially. Includes a deduplication check — if a generated title is too similar to a previous one (Jaccard similarity > 0.7 on word set), regenerate with a "be more creative" retry.

**Output**: Saved as `generated-texts.json` in the results directory alongside existing reports.

**API**:
```javascript
// title-description-generator.js exports
export async function generateTexts(photoAnalysis, openCallConfig, options = {})
  // Returns: { title: string, description: string }

export async function generateBatchTexts(projectDir, options = {})
  // Returns: Array<{ photo: string, title: string, description: string }>

export function buildTextPrompt(photoAnalysis, openCallConfig)
  // Returns: string (the prompt for Ollama)
```

**CLI command**:
```bash
node src/cli/analyze.js generate-texts <project-dir> [--photo <filename>] [--text-model <model>]
```

### Decisions

→ See **ADR-021: Text Generation via Ollama**

---

## FR-4.2: Benchmarking & Calibration

### Problem

Users cannot verify evaluator accuracy. Different models or prompt changes may cause scoring drift, but there's no way to measure it.

### Design

**New module**: `src/analysis/benchmarking-manager.js`

**Baseline structure**:
```
data/baselines/
├── {set-name}/
│   ├── photos/
│   │   ├── baseline-01.jpg
│   │   └── baseline-02.jpg
│   └── expected-scores.json
```

**Expected scores schema**:
```json
[
  {
    "photo": "baseline-01.jpg",
    "scores": {
      "theme_fit": 8,
      "technical_quality": 7,
      "originality": 6,
      "narrative_strength": 7,
      "jury_fit": 5
    }
  }
]
```

**Calibration process**:
1. Load baseline photos and expected scores
2. Run standard photo analysis on each baseline photo (reuses `photo-analyzer.js`)
3. Compare actual scores vs expected scores per criterion
4. Generate drift report with thresholds:
   - OK: delta <= 1.5
   - WARNING: 1.5 < delta <= 3.0
   - CRITICAL: delta > 3.0

**Drift report format** (saved as `calibration-report.json`):
```json
{
  "timestamp": "2026-02-20T10:00:00Z",
  "model": "llava:7b",
  "baselineSet": "documentary-basics",
  "photosEvaluated": 5,
  "criteria": {
    "theme_fit": { "expected_avg": 7.2, "actual_avg": 6.8, "delta": 0.4, "status": "OK" },
    "technical_quality": { "expected_avg": 8.0, "actual_avg": 5.5, "delta": 2.5, "status": "WARNING" }
  },
  "overall_status": "WARNING",
  "recommendations": ["Technical quality scoring appears low — consider model upgrade or prompt tuning"]
}
```

**Integration**: Calibration is a standalone command, not part of the analysis pipeline. It reuses `photo-analyzer.js` but with a temporary open call config built from the baseline.

**API**:
```javascript
// benchmarking-manager.js exports
export async function runCalibration(baselineDir, options = {})
  // Returns: CalibrationReport object

export function generateDriftReport(actualScores, expectedScores)
  // Returns: { criteria: {...}, overall_status, recommendations }

export function loadBaseline(baselineDir)
  // Returns: { photos: [...], expectedScores: [...] }

export function validateBaselineStructure(baselineDir)
  // Returns: { valid: boolean, errors: string[] }
```

**CLI command**:
```bash
node src/cli/analyze.js calibrate <baseline-dir> [--model <model>]
```

### Decisions

→ See **ADR-022: Benchmarking via User Baselines**

---

## FR-4.3: Compliance Checker Expansion

### Problem

`photo-validator.js` only checks individual photo format/size. Users need submission-level validation: photo count limits, deadlines, format requirements from the open call rules.

### Design

**New module**: `src/processing/submission-validator.js` (separate from `photo-validator.js` to respect SRP)

**Rationale for new file**: `photo-validator.js` validates individual photos at the file level (format, dimensions, corruption). Submission validation operates at the project level (count, deadline, rule compliance). Different concerns, different module.

**Schema extension** — new optional `submissionRules` field in `open-call.json`:
```json
{
  "submissionRules": {
    "maxPhotos": 10,
    "minPhotos": 1,
    "deadline": "2026-03-15",
    "requiredFormat": "jpg",
    "maxSizeMB": 10
  }
}
```

**Validation checks**:
| Rule | Severity | Logic |
|------|----------|-------|
| Photo count > maxPhotos | ERROR | Count files in photos/ dir |
| Photo count < minPhotos | WARNING | Count files in photos/ dir |
| Current date > deadline | ERROR | Compare ISO dates |
| Deadline within 3 days | WARNING | Date diff check |
| Photo format mismatch | ERROR | Check each file extension |
| Photo size > maxSizeMB | WARNING | Check each file stat |

**API**:
```javascript
// submission-validator.js exports
export function validateSubmission(projectDir, openCallConfig)
  // Returns: { passed: boolean, violations: [{ rule, expected, actual, severity }] }

export function checkDeadline(deadline)
  // Returns: { status: 'ok'|'warning'|'expired', daysRemaining: number }

export function checkPhotoCount(photosDir, rules)
  // Returns: { status: 'ok'|'error'|'warning', count: number, limit: number }
```

**CLI integration**: Extend existing `validate` command to include submission-level checks when `submissionRules` is present in config.

---

## FR-4.4: Configurable Scoring Weights

### Problem

The 5 default evaluation criteria (Theme Fit, Technical Quality, Originality, Narrative Strength, Jury Fit) have weights baked into the AI-generated prompt. Different open calls emphasize different criteria, but users can't control this.

### Design

**Schema extension** — new optional `criteriaWeights` field in `open-call.json`:
```json
{
  "criteriaWeights": {
    "themeFit": 40,
    "technicalQuality": 20,
    "originality": 15,
    "narrativeStrength": 15,
    "juryFit": 10
  }
}
```

**Integration flow**:
1. `loadOpenCallConfig()` reads `criteriaWeights` (optional)
2. If present, `normalizeWeights()` from `criteria-refinement.js` auto-normalizes to 100%
3. `prompt-generator.js` → `buildMetaPrompt()` injects explicit weight instructions into the analysis prompt: "Score each criterion. Theme Fit is worth 40%, Technical Quality 20%..."
4. `photo-analyzer.js` uses per-criterion weights when computing `weighted_average` (already supported — the `individual` scores object contains `{score, weight}` pairs)

**Key insight**: The infrastructure already exists. `customCriteria` in the schema supports weights, and `normalizeWeights()` handles normalization. FR-4.4 adds a simpler `criteriaWeights` shorthand for the 5 standard criteria, mapping to the existing weight pipeline.

**Backward compatibility**: When `criteriaWeights` is absent, the prompt generator continues to let the AI determine weights (current behavior). No existing results change.

---

## FR-4.5: Open Call Templates Library

### Problem

Setting up a new project requires manual creation of `open-call.json`. Users repeatedly configure similar competition types.

### Design

**New directory**: `data/templates/`

**Template files**:
- `portrait.json` — portrait/fashion competitions (emphasizes originality, jury fit)
- `documentary.json` — documentary/reportage (emphasizes narrative, theme fit)
- `polaroid.json` — Polaroid/set-based (includes setMode config, emphasizes coherence)

**Each template** is a complete, valid `open-call.json` with:
- Placeholder `title` and `theme` (user fills in)
- Pre-configured `criteriaWeights` optimized for the genre
- Sample `jury` patterns
- Sample `pastWinners` description
- `context` hints specific to the competition type
- `submissionRules` with common defaults

**Integration**: Extend `init-wizard.js` to:
1. Accept `--template` flag (already supported for some types)
2. Copy template to project dir, prompt user to fill in title/theme
3. New `list-templates` command reads `data/templates/*.json` and displays name + description

**API**: No new module needed — template loading is a file copy operation in `init-wizard.js`.

---

## FR-4.6: Optimized Analysis Prompts

### Problem

Current prompts are generic. The `improvements.md` appendices document specific prompt patterns for theme extraction and jury profiling that could improve analysis quality.

### Design

**Modified module**: `src/prompts/prompt-builder.js`

**Changes**:
- Theme analysis prompt now explicitly requests: `key_concepts`, `visual_keywords`, `interpretive_ambiguities`
- Jury profiling prompt now maps to pattern categories: documentary, fashion, sociocultural, conceptual
- Both prompts request structured JSON output for consistency

**No new modules**. This is a prompt text refinement within existing infrastructure.

**Validation**: Use existing `ab-testing-framework.js` to compare old vs new prompts on test photos before merging.

---

## FR-4.7: Operational Checklist

### Problem

Users managing multiple open calls lose track of which steps are complete.

### Design

**New module**: `src/cli/checklist.js`

**Checklist steps** (auto-detected from filesystem state):

| Step | Detection Logic |
|------|----------------|
| Config exists | `open-call.json` present and valid |
| Photos added | `photos/` dir has >= 1 supported image |
| Photos validated | `results/latest/` contains validation output |
| Photos analyzed | `results/latest/` contains analysis JSON |
| Set created | `results/latest/` contains set report |
| Texts generated | `results/latest/` contains `generated-texts.json` |
| Compliance checked | `results/latest/` contains compliance report |
| Report complete | `results/latest/` contains markdown report |

**Output**: Colored table using `chalk`:
```
Open Call Checklist: my-project
═══════════════════════════════════
 ✓ Config exists          (open-call.json valid)
 ✓ Photos added           (12 photos)
 ✓ Photos validated       (12/12 passed)
 ✓ Photos analyzed        (12/12 scored)
 ○ Set created            (not yet)
 ○ Texts generated        (not yet)
 ○ Compliance checked     (not yet)
 ✓ Report complete        (ranking.md)
═══════════════════════════════════
 Progress: 5/8 steps complete
```

**No state file**: All detection is dynamic from the filesystem. This avoids state synchronization issues.

**CLI command**:
```bash
node src/cli/analyze.js checklist <project-dir>
```

---

## FR-4.8: Photo Groups / Series Support

### Problem

When a project contains photos from distinct series (e.g., "Rotterdam" street shots and "October" portraits), `suggest-sets` mixes them into hybrid sets. This produces incoherent suggestions — a Polaroid set should come from a single series. Discovered during real-world testing on instantart-arles-2026.

### Design

**Schema extension** — new optional `photoGroups` field in `open-call.json`:
```json
{
  "photoGroups": [
    { "name": "Rotterdam", "pattern": "rotterdam*.jpg" },
    { "name": "October", "pattern": "2025-10-*.jpg" }
  ]
}
```

**Modified module**: `src/processing/combination-generator.js`

**Changes to `selectCandidateSets()`**:
1. Accept optional `photoGroups` from config
2. If `photoGroups` is defined:
   - Resolve each group's pattern against `photos/` directory using glob
   - Generate combinations independently per group
   - Return results tagged with group name
3. If `photoGroups` is not defined: unchanged behavior (all photos mixed)

**Integration flow**:
```
open-call.json (photoGroups)
       │
       ▼
combination-generator.js
  ├─ Group A photos → C(nA, k) combinations → ranked sets
  └─ Group B photos → C(nB, k) combinations → ranked sets
       │
       ▼
set-analyzer.js (evaluates each group's top sets separately)
       │
       ▼
set-report-generator.js (outputs per-group rankings)
```

**CLI output change** for `suggest-sets`:
```
━━━ TOP SETS: Rotterdam ━━━
  #1 [7.82] rotterdam1, rotterdam2, rotterdam3, rotterdam4

━━━ TOP SETS: October ━━━
  #1 [6.90] 2025-10-07-0022, 2025-10-21-0010, 2025-10-21-0011, 2025-10-21-0012

━━━ RECOMMENDATION ━━━
  Best group: Rotterdam (7.82 vs 6.90)
```

**API changes**:
```javascript
// combination-generator.js — extended signature
export function selectCandidateSets(rankedPhotos, setSize, options = {})
  // options.photoGroups: Array<{ name, pattern }> (optional)
  // Returns: { groups: [{ name, sets }] } when groups defined
  //          { sets: [...] } when no groups (backward compatible)
```

### Decisions

→ See **ADR-024: Photo Groups for Set Generation**

---

## ADR-024: Photo Groups for Set Generation

**Status**: Proposed
**Context**: FR-4.8 requires constraining set combinations to photo sub-groups. Should we modify `combination-generator.js` or create a separate grouping layer?
**Decision**: Extend `selectCandidateSets()` in `combination-generator.js` with an optional `photoGroups` parameter. When present, iterate over groups and generate combinations per group. The function returns a grouped result structure.
**Alternatives Considered**:
1. **Separate photo-grouper.js module**: Rejected — over-engineering for a filter + loop operation
2. **Subdirectories instead of patterns**: Rejected — forces users to reorganize photo files; glob patterns are more flexible
3. **Tags on individual photos**: More powerful but heavier; deferred to future if needed
**Consequences**:
- (+) Minimal code change, reuses existing combination logic
- (+) Backward compatible (no groups = current behavior)
- (+) Glob patterns are familiar and flexible
- (-) Groups are project-level config, not per-photo metadata
**Testability Impact**: Test with mock photo lists partitioned into groups. Verify no cross-group contamination. Test backward compat with undefined `photoGroups`.

---

## ADR-021: Text Generation via Ollama

**Status**: Proposed
**Context**: FR-4.1 requires generating submission titles and descriptions. We need a text generation strategy.
**Decision**: Reuse the existing Ollama client (`api-client.js`) with the chat API for text generation. Use the same model as vision by default (LLaVA handles text), with an optional `textModel` override for dedicated text models (e.g., `llama3`).
**Alternatives Considered**:
1. **Separate text generation library**: Rejected — adds dependency, Ollama already supports text
2. **Cloud API (OpenAI/Anthropic)**: Rejected — violates local-only constraint
3. **Template-based generation (no AI)**: Rejected — too rigid, can't adapt to diverse themes
**Consequences**:
- (+) No new dependencies
- (+) Works offline, same infrastructure
- (-) LLaVA text quality may be lower than dedicated text models
- (-) Users with only vision models installed may get suboptimal text
**Testability Impact**: Mock Ollama chat response in tests. Export `buildTextPrompt()` for unit testing prompt composition separately from generation.

---

## ADR-022: Benchmarking via User Baselines

**Status**: Proposed
**Context**: FR-4.2 requires calibration of evaluator accuracy. We need a reference standard.
**Decision**: Users provide baseline photo sets with manually assigned expected scores. The system runs standard analysis and compares results, producing a drift report.
**Alternatives Considered**:
1. **Winner history as baseline** (FR-3.10 data): Rejected for now — winner data has competition-specific bias, not suitable as general calibration reference
2. **Pre-packaged baseline sets**: Rejected — distributing copyrighted photos is problematic; users must supply their own
3. **Self-calibration (track score stability over time)**: Interesting but deferred — requires multiple runs to build statistical significance
**Consequences**:
- (+) User controls the ground truth
- (+) Works with any model or prompt configuration
- (-) Requires user effort to create baseline sets
- (-) Subjective expected scores may vary between users
**Testability Impact**: Mock `photo-analyzer.js` in calibration tests. Test drift thresholds with deterministic score fixtures.

---

## ADR-023: Submission Validator as Separate Module

**Status**: Proposed
**Context**: FR-4.3 extends compliance checking. Should we modify `photo-validator.js` or create a new module?
**Decision**: Create `src/processing/submission-validator.js` as a separate module. `photo-validator.js` handles file-level validation (format, dimensions, corruption). Submission validation handles project-level rules (count, deadline, format requirements).
**Alternatives Considered**:
1. **Extend photo-validator.js**: Rejected — mixes file-level and project-level concerns, violates SRP
2. **Add to batch-processor.js**: Rejected — batch-processor handles processing, not validation
**Consequences**:
- (+) Clean separation of concerns
- (+) Each module is independently testable
- (-) One more file to maintain
**Testability Impact**: Pure functions for date/count checks. No external dependencies needed — mock filesystem for integration tests.

---

## Implementation Sequence

```
Phase 1 (Must Have):
FR-4.3 (Compliance) → FR-4.1 (Title/Desc) → FR-4.2 (Calibration)
     │                      │                      │
     ├─ submission-validator ├─ title-desc-gen      ├─ benchmarking-mgr
     ├─ open-call.schema    ├─ api-client (reuse)  ├─ photo-analyzer (reuse)
     └─ analyze.js (cmd)    └─ analyze.js (cmd)    └─ analyze.js (cmd)

Phase 2 (Should Have):
FR-4.4 (Weights) → FR-4.5 (Templates) → FR-4.8 (Photo Groups)
     │                   │                      │
     ├─ open-call.schema ├─ data/templates/     ├─ combination-generator
     ├─ prompt-builder   ├─ init-wizard.js      ├─ open-call.schema
     └─ criteria-refine  └─ analyze.js (cmd)    └─ set-report-generator

Phase 3 (Could Have):
FR-4.6 (Prompts) → FR-4.7 (Checklist)
     │                   │
     ├─ prompt-builder   ├─ checklist.js
     └─ a/b testing      └─ analyze.js (cmd)
```

**Rationale**:
1. FR-4.3 (Compliance) is self-contained, no Ollama needed — quick win
2. FR-4.1 (Title/Desc) is the highest user-value feature
3. FR-4.2 (Calibration) depends on understanding the analysis pipeline
4. FR-4.4 (Weights) is a schema + prompt change, pairs naturally with FR-4.5
5. FR-4.6 (Prompts) and FR-4.7 (Checklist) are independent quality-of-life features

---

## New Files Summary

| File | Feature | Purpose |
|------|---------|---------|
| `src/output/title-description-generator.js` | FR-4.1 | Text generation for titles & descriptions |
| `src/analysis/benchmarking-manager.js` | FR-4.2 | Calibration against user baselines |
| `src/processing/submission-validator.js` | FR-4.3 | Submission-level compliance checking |
| `src/cli/checklist.js` | FR-4.7 | Progress tracking display logic |
| `data/templates/portrait.json` | FR-4.5 | Portrait competition template |
| `data/templates/documentary.json` | FR-4.5 | Documentary competition template |
| `data/templates/polaroid.json` | FR-4.5 | Polaroid set competition template |
| `data/baselines/README.md` | FR-4.2 | Instructions for creating baseline sets |
| `tests/title-description-generator.test.js` | FR-4.1 | TDD tests |
| `tests/benchmarking-manager.test.js` | FR-4.2 | TDD tests |
| `tests/submission-validator.test.js` | FR-4.3 | TDD tests |
| `tests/checklist.test.js` | FR-4.7 | TDD tests |

## Modified Files Summary

| File | Features | Changes |
|------|----------|---------|
| `src/config/open-call.schema.json` | FR-4.3, FR-4.4, FR-4.8 | Add `submissionRules`, `criteriaWeights`, `textModel`, `photoGroups` |
| `src/processing/combination-generator.js` | FR-4.8 | Per-group combination generation in `selectCandidateSets()` |
| `src/output/set-report-generator.js` | FR-4.8 | Per-group set ranking output |
| `src/prompts/prompt-builder.js` | FR-4.4, FR-4.6 | Inject weight instructions, refine prompts |
| `src/prompts/criteria-refinement.js` | FR-4.4 | Map `criteriaWeights` shorthand to existing pipeline |
| `src/cli/analyze.js` | All | New commands: `generate-texts`, `calibrate`, `checklist`, `list-templates` |
| `src/cli/init-wizard.js` | FR-4.5 | Template loading from `data/templates/` |

---

## Data Flow Diagram

```
                    ┌──────────────┐
                    │ open-call.json│
                    │ + submRules  │
                    │ + critWeights│
                    │ + textModel  │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
     ┌────────────┐ ┌──────────┐ ┌───────────────┐
     │ submission  │ │ prompt   │ │ title-desc    │
     │ validator   │ │ generator│ │ generator     │
     │ (FR-4.3)   │ │(FR-4.4/6)│ │ (FR-4.1)      │
     └────────────┘ └────┬─────┘ └───────┬───────┘
                         │               │
                         ▼               │
                  ┌─────────────┐        │
                  │ photo       │        │
                  │ analyzer    │        │
                  └──────┬──────┘        │
                         │               │
                         ▼               ▼
                  ┌─────────────┐ ┌───────────────┐
                  │ score       │ │ generated-    │
                  │ aggregator  │ │ texts.json    │
                  └──────┬──────┘ └───────────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
     ┌──────────┐ ┌──────────┐ ┌───────────┐
     │ report   │ │ benchmark│ │ checklist  │
     │ generator│ │ manager  │ │ (FR-4.7)  │
     │          │ │ (FR-4.2) │ │           │
     └──────────┘ └──────────┘ └───────────┘
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLaVA text generation quality | Medium | Export `buildTextPrompt()` for iterative prompt tuning; `textModel` override for dedicated text models |
| Schema migration for existing projects | Low | All new fields optional; no breaking changes |
| Baseline creation effort for users | Medium | Provide `data/baselines/README.md` with clear instructions and example structure |
| Prompt changes in FR-4.6 causing regression | Medium | A/B test old vs new prompts using existing `ab-testing-framework.js` before merging |
| Checklist false positives/negatives | Low | Detection is based on file existence, which is reliable; document edge cases |
