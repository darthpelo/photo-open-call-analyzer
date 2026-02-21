# Sprint Plan — M4 Sprint 1

**Project**: Photo Open Call Analyzer
**Sprint**: M4-S1
**Duration**: 5 days
**Date**: 2026-02-21 → 2026-02-25
**Capacity**: 1 developer (solo), ~4h/day effective = 20h total

---

## Sprint Goal

> Deliver the two Must Have modules (Title/Description Generator + Benchmarking & Calibration) and fix outstanding bugs from FR-4.3, making the M4 core feature set complete.

---

## Selected Stories (Priority Order)

| # | Story | Priority | Points | Rationale |
|---|-------|----------|--------|-----------|
| S1 | Fix P2 bugs (CLI wiring + suggest-sets path) | Hygiene | 2 | Unblock FR-4.3 for real use |
| S2 | FR-4.1: Title/Description Generator | Must Have | 8 | Core new capability |
| S3 | FR-4.2: Benchmarking & Calibration | Must Have | 8 | Core new capability |
| S4 | P3 cleanup (unused import, boundary test) | Hygiene | 1 | Quick cleanup |

**Total**: 19 points / 20h capacity

---

## Task Breakdown

### S1: Fix P2 Bugs (2 pts — Day 1 morning)

| Task | Est | Description |
|------|-----|-------------|
| S1.1 | 1h | Wire `validateSubmission` into CLI `validate` command in `analyze.js` |
| S1.2 | 1h | Fix `suggest-sets` and `analyze-set` to use `results/latest/batch-results.json` instead of `results/batch-results.json` |
| S1.3 | 0.5h | Add tests for CLI integration paths |

**Acceptance**: `validate` CLI command runs submission checks. `suggest-sets` works without symlink workaround.

### S2: FR-4.1 Title/Description Generator (8 pts — Day 1 afternoon + Day 2-3)

| Task | Est | Description |
|------|-----|-------------|
| S2.1 | 1h | RED: Write test suite for `title-description-generator.js` (unit tests with mocked Ollama) |
| S2.2 | 2h | GREEN: Implement `generateTexts()`, `buildTextPrompt()`, `generateBatchTexts()` |
| S2.3 | 1h | Implement deduplication check (Jaccard similarity > 0.7 triggers retry) |
| S2.4 | 1h | RED/GREEN: Test `generate-texts` CLI command wiring |
| S2.5 | 1h | Wire CLI command: `generate-texts <project-dir> [--photo <filename>] [--text-model <model>]` |
| S2.6 | 1h | Output saved as `generated-texts.json` in results directory |
| S2.7 | 1h | Integration test with instantart-arles-2026 (manual, Ollama required) |

**Acceptance**: `generate-texts` produces title (<=100 chars) + description (<=500 chars) per photo. Batch mode handles all analyzed photos. Ollama errors handled gracefully.

### S3: FR-4.2 Benchmarking & Calibration (8 pts — Day 3 afternoon + Day 4)

| Task | Est | Description |
|------|-----|-------------|
| S3.1 | 1h | RED: Write test suite for `benchmarking-manager.js` (validation, drift calc, report) |
| S3.2 | 1h | GREEN: Implement `validateBaselineStructure()` and `loadBaseline()` |
| S3.3 | 2h | GREEN: Implement `runCalibration()` (reuses photo-analyzer with temp config) |
| S3.4 | 1h | GREEN: Implement `generateDriftReport()` with OK/WARNING/CRITICAL thresholds |
| S3.5 | 1h | RED/GREEN: Test `calibrate` CLI command |
| S3.6 | 1h | Wire CLI command: `calibrate <baseline-dir> [--model <model>]` |
| S3.7 | 1h | Create sample baseline structure in `data/baselines/example/` |

**Acceptance**: `calibrate` loads baselines, analyzes photos, produces drift report JSON. WARNING at delta > 1.5, CRITICAL at delta > 3.0. Missing/corrupt baselines handled gracefully.

### S4: P3 Cleanup (1 pt — Day 5 morning)

| Task | Est | Description |
|------|-----|-------------|
| S4.1 | 0.25h | Remove unused `logger` import from `submission-validator.js` |
| S4.2 | 0.25h | Add `minPhotos` boundary test (count === minPhotos → ok) |
| S4.3 | 0.5h | Update CLAUDE.md with new M4 commands and modules |

---

## Day-by-Day Plan

| Day | Focus | Stories |
|-----|-------|---------|
| Day 1 (Feb 21) | Bug fixes + FR-4.1 start | S1 complete, S2.1-S2.2 |
| Day 2 (Feb 22) | FR-4.1 implementation | S2.3-S2.5 |
| Day 3 (Feb 23) | FR-4.1 finish + FR-4.2 start | S2.6-S2.7, S3.1-S3.2 |
| Day 4 (Feb 24) | FR-4.2 implementation | S3.3-S3.6 |
| Day 5 (Feb 25) | FR-4.2 finish + cleanup + QA | S3.7, S4, `/bmad-qa verify` |

---

## Dependencies

- **Ollama running locally**: Required for FR-4.1 integration test (S2.7) and FR-4.2 calibration (S3.3)
- **FR-4.3 committed**: Done (bbd1cc3)
- **Architecture docs**: FR-4.1 and FR-4.2 designs ready in architecture.md

## Risks

| Risk | Mitigation |
|------|------------|
| Ollama text generation quality varies by model | Use LLaVA for both vision+text initially; allow `--text-model` override |
| Calibration requires real baseline photos | Create minimal example set; full validation is manual |
| Sprint overrun on FR-4.1 deduplication | Dedup is nice-to-have within FR-4.1; can defer to later sprint |

---

## Sprint Commitment

- [ ] S1: P2 bugs fixed (CLI wiring + suggest-sets path)
- [ ] S2: FR-4.1 Title/Description Generator complete with TDD
- [ ] S3: FR-4.2 Benchmarking & Calibration complete with TDD
- [ ] S4: P3 cleanup done
- [ ] All tests passing (724 + new tests, 0 regressions)
- [ ] QA verification pass

---

## Definition of Done

- TDD: Tests written before implementation (RED/GREEN/REFACTOR)
- All acceptance criteria from PRD verified
- Zero P0/P1 issues
- Full test suite green
- Code committed to `feat/improvements-analysis` branch
