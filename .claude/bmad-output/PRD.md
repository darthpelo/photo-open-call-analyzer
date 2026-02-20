# Product Requirements Document — M4

**Project**: Photo Open Call Analyzer
**Version**: 4.0
**Date**: 2026-02-20
**Owner**: Alessio (Solo developer / primary user)

---

## Executive Summary

M4 extends the Photo Open Call Analyzer from a photo evaluation tool into a complete submission assistant. Two new modules — Title/Description Generator and Benchmarking & Calibration — join five enhancements to existing functionality: expanded compliance checking, configurable scoring weights, open call templates, optimized prompts, and an operational checklist. All features run locally via Ollama with no cloud dependencies.

---

## User Stories

### US-1: Generate Submission Texts

**As a** photographer preparing a submission
**I want** AI-generated titles and descriptions for my photos
**So that** my submission texts align with the open call theme and jury expectations

**Acceptance Criteria**:
- [ ] GIVEN an analyzed photo with scores, WHEN I run `generate-texts`, THEN I receive a title (max 100 chars) and description (max 500 chars) in English
- [ ] GIVEN an open call config with theme and jury, WHEN generating texts, THEN the output reflects theme keywords and jury style
- [ ] GIVEN multiple analyzed photos, WHEN I run `generate-texts` for the batch, THEN each photo gets unique, non-repetitive texts
- [ ] GIVEN Ollama is unavailable, WHEN generating texts, THEN a clear error is shown (no silent failure)

### US-2: Calibrate Evaluator Accuracy

**As a** photographer who wants reliable scores
**I want** to calibrate the evaluator against known baseline photos
**So that** I can trust the scoring consistency across different open calls

**Acceptance Criteria**:
- [ ] GIVEN a baseline directory with photos and expected scores JSON, WHEN I run `calibrate`, THEN I see a drift report comparing actual vs expected
- [ ] GIVEN a drift > 1.5 points on any criterion, WHEN calibration runs, THEN it flags a warning with the affected criteria
- [ ] GIVEN no baseline directory configured, WHEN I run `calibrate`, THEN a clear error explains how to set up baselines

### US-3: Validate Submission Compliance

**As a** photographer about to submit
**I want** the tool to check all submission rules (not just photo format)
**So that** I don't get disqualified for exceeding photo count or missing metadata

**Acceptance Criteria**:
- [ ] GIVEN `open-call.json` specifies `maxPhotos: 10`, WHEN batch has 12 photos, THEN compliance check warns about excess
- [ ] GIVEN `open-call.json` specifies a deadline, WHEN deadline is past, THEN compliance check warns about expiry
- [ ] GIVEN `open-call.json` specifies required format/size limits, WHEN photos don't match, THEN each violation is listed

### US-4: Configure Scoring Weights

**As a** photographer analyzing for a specific open call
**I want** to set custom weights for the 5 default evaluation criteria
**So that** the scoring reflects what matters most for this particular competition

**Acceptance Criteria**:
- [ ] GIVEN `open-call.json` includes `criteriaWeights` with 5 values, WHEN analysis runs, THEN `weighted_average` uses those weights
- [ ] GIVEN no `criteriaWeights` in config, WHEN analysis runs, THEN default weights apply (40/20/15/15/10)
- [ ] GIVEN weights that don't sum to 100, WHEN loading config, THEN weights are auto-normalized with an info log

### US-5: Use Pre-built Templates

**As a** photographer setting up a new open call project
**I want** pre-built templates for common competition types
**So that** I don't have to write `open-call.json` from scratch every time

**Acceptance Criteria**:
- [ ] GIVEN I run `init my-project --template portrait`, THEN `open-call.json` is pre-filled with portrait-optimized jury patterns and criteria weights
- [ ] GIVEN I run `list-templates`, THEN I see at least 3 templates: portrait, documentary, polaroid
- [ ] GIVEN a template, WHEN generated config is loaded, THEN it passes schema validation

### US-6: Track Submission Progress

**As a** photographer managing multiple open calls
**I want** a per-project progress checklist
**So that** I can see what steps are complete and what remains

**Acceptance Criteria**:
- [ ] GIVEN a project directory, WHEN I run `checklist`, THEN I see status for each step (theme, requirements, jury, evaluation, set, texts, compliance, report)
- [ ] GIVEN photos have been analyzed, WHEN viewing checklist, THEN "evaluation" step shows as complete
- [ ] GIVEN texts have not been generated, WHEN viewing checklist, THEN "texts" step shows as pending

---

## Functional Requirements

### FR-4.1: Title/Description Generator

**Description**: New module that generates submission titles and descriptions using Ollama text models, informed by the open call theme, jury profile, and photo analysis scores.

**Priority**: Must Have

**Acceptance Criteria**:
- [ ] Module at `src/output/title-description-generator.js` exports `generateTexts(photoAnalysis, openCallConfig)` returning `{ title, description }`
- [ ] Uses Ollama API (same client as vision) with a text model for generation
- [ ] Title: max 100 characters, thematic, non-generic
- [ ] Description: max 500 characters, references photo content and theme alignment
- [ ] CLI command: `generate-texts <project-dir> [--photo <filename>]`
- [ ] Batch mode: generates texts for all analyzed photos in a project
- [ ] Output saved to results directory alongside analysis reports
- [ ] Handles Ollama connection errors gracefully

### FR-4.2: Benchmarking & Calibration

**Description**: New module that calibrates evaluator accuracy by comparing analysis results against user-provided baseline photo sets with known expected scores.

**Priority**: Must Have

**Acceptance Criteria**:
- [ ] Module at `src/analysis/benchmarking-manager.js` exports `runCalibration(baselineDir)` and `generateDriftReport(results)`
- [ ] Baseline directory structure: `baselines/{set-name}/photos/` + `baselines/{set-name}/expected-scores.json`
- [ ] `expected-scores.json` schema: array of `{ photo, scores: { theme_fit, technical_quality, originality, narrative_strength, jury_fit } }`
- [ ] Drift report shows per-criterion: expected avg, actual avg, delta, status (OK / WARNING / CRITICAL)
- [ ] WARNING threshold: delta > 1.5 points; CRITICAL threshold: delta > 3.0 points
- [ ] CLI command: `calibrate <baseline-dir> [--model <model>]`
- [ ] Calibration results saved as JSON to baseline directory

### FR-4.3: Compliance Checker Expansion

**Description**: Extend `photo-validator.js` to check submission-level rules beyond individual photo format/size.

**Priority**: Must Have

**Acceptance Criteria**:
- [ ] New fields in `open-call.json` schema: `submissionRules.maxPhotos` (integer), `submissionRules.deadline` (ISO date string), `submissionRules.requiredFormat` (string), `submissionRules.maxSizeMB` (number)
- [ ] `validateSubmission(projectDir)` checks: photo count vs maxPhotos, current date vs deadline, each photo vs requiredFormat and maxSizeMB
- [ ] Returns structured result: `{ passed: boolean, violations: [{ rule, expected, actual, severity }] }`
- [ ] CLI integration: `validate <project-dir>` now includes submission-level checks
- [ ] Severity levels: ERROR (blocks submission), WARNING (proceed with caution)

### FR-4.4: Configurable Scoring Weights

**Description**: Allow per-open-call configuration of the 5 default evaluation criteria weights.

**Priority**: Should Have

**Acceptance Criteria**:
- [ ] New optional field in `open-call.json` schema: `criteriaWeights` object with keys `themeFit`, `technicalQuality`, `originality`, `narrativeStrength`, `juryFit` (each 0-100)
- [ ] `prompt-generator.js` injects weights into analysis prompt when present
- [ ] `photo-analyzer.js` uses weights when computing `weighted_average`
- [ ] Default weights when not specified: `{ themeFit: 40, technicalQuality: 20, originality: 15, narrativeStrength: 15, juryFit: 10 }`
- [ ] Weights auto-normalize to 100% if sum differs
- [ ] Existing projects without `criteriaWeights` behave identically to current behavior

### FR-4.5: Open Call Templates Library

**Description**: Pre-built JSON templates for common open call types with optimized jury patterns, criteria weights, and context.

**Priority**: Should Have

**Acceptance Criteria**:
- [ ] Templates directory at `data/templates/` containing at least: `portrait.json`, `documentary.json`, `polaroid.json`
- [ ] Each template is a valid `open-call.json` with pre-filled: theme description, jury patterns, criteriaWeights, context hints
- [ ] `init <name> --template <type>` copies template to new project directory
- [ ] CLI command: `list-templates` shows available templates with descriptions
- [ ] Templates pass schema validation
- [ ] Existing `--template polaroid` continues to work (backward compatible)

### FR-4.6: Optimized Analysis Prompts

**Description**: Refine theme analysis and jury profiling prompts based on patterns documented in `improvements.md` appendices.

**Priority**: Could Have

**Acceptance Criteria**:
- [ ] Theme analysis prompt extracts: key concepts, visual keywords, interpretive ambiguities
- [ ] Jury profiling prompt identifies: recurring patterns (documentary, fashion, sociocultural, conceptual)
- [ ] Prompts produce structured JSON output: `{ key_concepts: [], visual_keywords: [] }` and `{ patterns: [] }`
- [ ] Updated prompts in `prompt-generator.js` produce more specific analysis vs current baseline
- [ ] No regression: existing test scenarios produce equal or better scores

### FR-4.7: Operational Checklist

**Description**: Per-open-call progress tracking checklist accessible via CLI.

**Priority**: Could Have

**Acceptance Criteria**:
- [ ] CLI command: `checklist <project-dir>` displays progress table
- [ ] Checklist steps auto-detected from project state: config exists, photos validated, photos analyzed, set created, texts generated, compliance checked, report generated
- [ ] Each step shows: status icon, step name, detail (e.g., "12/15 photos analyzed")
- [ ] Checklist state is computed dynamically (no separate state file needed)
- [ ] Output format: colored CLI table with checkmarks

### FR-4.8: Photo Groups / Series Support

**Description**: Allow photographers to define sub-groups (series) of photos within a project, so that `suggest-sets` generates set combinations only within each group and ranks the best set per group. Discovered during real-world testing of instantart-arles-2026, where two distinct Polaroid series (Rotterdam, October) were incorrectly mixed in suggested sets.

**Priority**: Should Have

**Acceptance Criteria**:
- [ ] GIVEN `open-call.json` includes `photoGroups: [{ name, pattern }]`, WHEN running `suggest-sets`, THEN combinations are generated only within each group
- [ ] GIVEN two groups "Rotterdam" (4 photos) and "October" (4 photos), WHEN `suggest-sets --top 3` runs, THEN output shows best 3 sets per group separately
- [ ] GIVEN no `photoGroups` in config, WHEN running `suggest-sets`, THEN behavior is unchanged (all photos mixed as today)
- [ ] New optional schema field `photoGroups` in `open-call.json`: array of `{ name: string, pattern: string }`
- [ ] Pattern supports glob syntax (e.g., `rotterdam*.jpg`, `2025-10-*.jpg`)
- [ ] CLI output clearly labels each group: "Best set from Rotterdam: 7.82 | Best set from October: 6.90"

---

## Non-Functional Requirements

### NFR-1: Performance

- Title/description generation: < 30s per photo via Ollama
- Calibration run: < 5 minutes for 20-photo baseline set
- Checklist computation: < 1s (filesystem checks only)

### NFR-2: Reliability

- All new modules handle Ollama unavailability with clear error messages
- Calibration tolerates missing/corrupt baseline photos (skip with warning)
- Compliance checker works offline (no network required for rule checks)

### NFR-3: Testability

- All new modules: >= 80% statement coverage, >= 70% branch coverage
- TDD enforced: tests written before implementation (ADR-013)
- Integration tests for CLI commands with mock Ollama responses

---

## Technical Constraints

- **Ollama only**: No cloud LLM APIs — all text generation via local Ollama
- **ESM modules**: All new code uses ES module syntax
- **Existing patterns**: Follow conventions in `CLAUDE.md` (naming, error handling, logging)
- **Schema backward compatibility**: New `open-call.json` fields must be optional

---

## Prioritization (MoSCoW)

| Priority | Features |
|----------|----------|
| **Must Have** | FR-4.1 (Title/Desc Generator), FR-4.2 (Calibration), FR-4.3 (Compliance) |
| **Should Have** | FR-4.4 (Scoring Weights), FR-4.5 (Templates Library), FR-4.8 (Photo Groups) |
| **Could Have** | FR-4.6 (Optimized Prompts), FR-4.7 (Checklist) |
| **Won't Have** | PDF export, Web UI, Multi-language, Cloud APIs |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Generated title relevance | Titles contain >= 1 theme keyword |
| Calibration drift detection | Flags delta > 1.5 correctly in 100% of test cases |
| Compliance accuracy | Catches all configured rule violations |
| Test coverage | >= 80% across all new modules |
| Templates usable | 3 templates pass validation and produce valid configs |

---

## Out of Scope

- PDF report generation
- GUI / web interface
- Multi-language text generation (English only for M4)
- Cloud LLM API integration
- Automated deadline notifications/reminders
- Real-time competition scraping
