# Project Brief: M4 — Open Call Analyzer Improvements

**Domain**: Software
**Phase**: M4 (Enhanced Workflow & Calibration)
**Generated**: 2026-02-20
**Source**: `docs/improvements.md` gap analysis

---

## Vision

Evolve the Photo Open Call Analyzer into a more complete end-to-end submission assistant by adding AI-powered text generation, evaluator calibration, enhanced compliance checking, and refined scoring mechanics — all running locally via Ollama.

**Core principles**: Local-first, free & open, privacy-preserving, transparent scoring.

---

## Current State

| Milestone | Status | Key Deliverables |
|-----------|--------|------------------|
| M1: MVP | Complete | End-to-end analysis, CLI, multi-format export |
| M2: Enhanced Analysis | Complete | Templates, multi-stage prompting, resume, edge cases |
| M3 Phase 1 | Complete | TDD enforcement, smart mode, Polaroid sets, timestamped results |
| M3 Phase 2 | Complete | Caching, parallel optimization, model selection, winner learning |
| **M4** | **Next** | **Title/description generation, calibration, compliance, scoring weights** |

---

## Scope: M4

### New Modules

| Feature | ID | Priority | Description |
|---------|----|----------|-------------|
| Title/Description Generator | FR-4.1 | P1 | AI-generated submission titles and descriptions via Ollama (English only) |
| Benchmarking & Calibration | FR-4.2 | P1 | User-provided baseline photo sets to calibrate evaluator accuracy |

### Enhancements to Existing Modules

| Feature | ID | Priority | Description |
|---------|----|----------|-------------|
| Compliance Checker expansion | FR-4.3 | P1 | Submission-level rules: quantity limits, deadline, metadata |
| Configurable scoring weights | FR-4.4 | P2 | Per-open-call weight config (default: 40/20/15/15/10) |
| Open call templates library | FR-4.5 | P2 | Pre-built JSON templates (portrait, documentary, Polaroid) |
| Optimized analysis prompts | FR-4.6 | P3 | Refined theme/jury prompts from improvements.md appendices |
| Operational checklist | FR-4.7 | P3 | Per-open-call progress tracking via CLI |

### Out of Scope (M4)

- PDF report export (keep MD/JSON/CSV)
- GUI / web interface (CLI only)
- Multi-language text generation (English only)
- Cloud LLM APIs (Ollama only)
- Automated deadline notifications

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Title/Desc generation | Contextually appropriate English texts via Ollama |
| Calibration accuracy | Detects scoring drift against user baselines |
| Compliance validation | Checks quantity limits + deadline + metadata |
| Weight configurability | Respected by score aggregator, per open call |
| Templates available | >= 3 (portrait, documentary, Polaroid) |
| Test coverage | >= 80% maintained (TDD enforced) |
| Stack | 100% local — no cloud dependencies |

---

## Stakeholders

| Role | Responsibility |
|------|----------------|
| Owner / User (Alessio) | Solo developer, primary user, decision maker |

---

## Technical Constraints

- **Local-only**: Ollama + LLaVA (vision), Ollama text models (generation)
- **TDD mandatory**: Red-green-refactor for all new code (ADR-013)
- **Branch protection**: Feature branches + PR workflow
- **Build on existing architecture**: No major refactors

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Ollama text quality for titles/descriptions | Medium | Prompt engineering, multi-shot examples, editable output |
| Calibration requires curated baseline sets | Medium | Clear guidelines + example baseline structure |
| Scoring weight changes may alter existing rankings | Low | Default weights match current implicit behavior |

---

## Technical Placement

| Module | Location |
|--------|----------|
| Title/Description Generator | `src/output/title-description-generator.js` (new) |
| Benchmarking Manager | `src/analysis/benchmarking-manager.js` (new) |
| Compliance expansion | `src/processing/photo-validator.js` (extend) |
| Weights config | `open-call.json` schema + `score-aggregator.js` (extend) |
| Templates library | `data/templates/` (new directory) |
| Checklist command | `src/cli/analyze.js` (extend CLI) |
