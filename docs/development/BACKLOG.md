# Backlog - Photo Open Call Analyzer

## Priority Levels

| Level | Meaning |
|-------|---------|
| 🔴 P0 | Critical - Blocks MVP |
| 🟠 P1 | High - Required for MVP |
| 🟡 P2 | Medium - Nice to have |
| 🟢 P3 | Low - Future |

---

## Active Projects

### instantart Arles 2026 (Polaroid Open Call)

**Status**: Setup Complete
**Created**: 2026-02-07
**Project Owner**: Marco
**Type**: Polaroid Set Analysis (FR-3.11)

| Phase | Owner | Status | Note |
|-------|-------|--------|------|
| Project Initialization | Project Owner | ✅ Done | Configuration validated |
| Research Competition Details | Art Critic | 📋 Pending | Deadline, theme, requirements TBD |
| Photo Preparation | User | 📋 Pending | Digitize Polaroids, add to photos/ |
| Individual Analysis | Dev (CLI) | 📋 Pending | Awaiting photos |
| Set Analysis | Dev (CLI) | 📋 Pending | Awaiting individual results |
| Set Review & Selection | Art Critic + Owner | 📋 Pending | Final decision |

**Project Path**: `/data/open-calls/instantart-arles-2026/`

**Key Files**:
- `open-call.json` - Configuration (validated ✅)
- `project-brief.md` - Complete project documentation
- `README.md` - Usage instructions
- `photos/` - Empty (awaiting photos)
- `results/` - Empty (awaiting analysis)

**Set Configuration**:
- Set size: 4 photos
- Individual weight: 40%
- Set weight: 60%
- Max sets to evaluate: 10

**Next Action**: User needs to add digitized Polaroid photos to `photos/` directory

---

## Milestone 1: MVP ✅ Complete

### 🔴 P0 - Critical

| Task | Owner | Status | Note |
|------|-------|--------|------|
| Setup Ollama client | Dev | ✅ Done | api-client.js |
| Implement photo-analyzer.js | Dev | ✅ Done | Ollama/LLaVA integration |
| Test single photo analysis | QA | ✅ Done | Tests passing |

### 🟠 P1 - MVP

| Task | Owner | Status | Note |
|------|-------|--------|------|
| Analysis prompt template | Art Critic | ✅ Done | prompt-generator.js |
| Batch processor | Dev | ✅ Done | batch-processor.js |
| Ranking generator | Dev | ✅ Done | score-aggregator.js |
| Markdown export | Dev | ✅ Done | Multi-format support |
| JSON/CSV export | Dev | ✅ Done | report-generator.js |
| CLI commands | Dev | ✅ Done | analyze.js |

---

## Milestone 2: Enhanced Analysis ✅ Complete

### 🔴 P0 - Critical (All Complete)

| Task | Owner | Status | Completion Date | Note |
|------|-------|--------|-----------------|------|
| Configuration templates (FR-2.1) | Dev | ✅ Done | 2025-11 | Validator + 3 templates |
| Resume interrupted analysis (FR-2.2) | Dev | ✅ Done | 2025-12 | Checkpoint system, 264 tests |
| Edge case robustness (FR-2.3) | QA | ✅ Done | 2026-01 | Corrupt photos, timeouts, error handling |
| Enhanced prompt engineering (FR-2.4) | Dev + Art Critic | ✅ Done | 2026-02 | Template library, multi-stage, validation |

### FR-2.4 Deliverables (80% Complete)

| Component | Status | Impact |
|-----------|--------|--------|
| Template Library (6 types) | ✅ Done | Specificity 4.5→8.2/10 (+82%) |
| Multi-Stage Analysis | ✅ Done | Score consistency σ 2.5→1.8 (-28%) |
| Quality Validation | ✅ Done | Catches 85% of issues pre-analysis |
| A/B Testing Framework | ✅ Done | Data-driven optimization |
| Interactive Refinement | 🔄 Deferred to M3 | validate-prompt provides core value |

---

## Milestone 3: Performance & Optimization ✅ Complete

### 🔴 P0 - Critical (Complete)

| Task | Owner | Status | Completion Date | Note |
|------|-------|--------|-----------------|------|
| TDD enforcement (ADR-013) | Dev | ✅ Done | 2026-02 | Coverage thresholds, husky, lint-staged |
| photo-analyzer.test.js | QA + Dev | ✅ Done | 2026-02 | 0% -> 98.8% coverage, 39 tests |
| api-client.test.js extension | QA + Dev | ✅ Done | 2026-02 | 35% -> 100% coverage, 17 tests |
| Smart analysis mode (ADR-014) | Dev | ✅ Done | 2026-02 | smartSelectAnalysisMode(), auto default |
| FIX-3: Parallelize Stage 2 | Dev | ✅ Done | 2026-02 | Promise.all(), ~50% speedup |
| Fix batch-processor default | Dev | ✅ Done | 2026-02 | multi -> auto |

### 🟠 P1 - High Priority

| Task | Owner | Status | Note |
|------|-------|--------|------|
| Consistent results directory (FR-3.12) | Dev | ✅ Done | 2026-02 | Per-open-call timestamped results (ADR-016) |
| Smart photo selection (FR-3.13) | Dev | ✅ Done | 2026-02 | Smart defaults + glob patterns for analyze-set |
| Analysis caching (FR-3.7) | Dev | ✅ Done | 2026-03 | cache-manager.js, ~50% time savings on re-runs (ADR-017) |
| Parallel processing optimization (FR-3.8) | Dev | ✅ Done | 2026-03 | concurrency-manager.js, RAM-based smart default (ADR-018, ADR-024) |
| Model selection (FR-3.9) | Dev | ✅ Done | 2026-03 | model-manager.js, auto-pull, llava:13b, moondream (ADR-019) |
| Historical winner learning (FR-3.10) | Dev + Art Critic | ✅ Done | 2026-03 | winner-manager.js, pattern extraction (ADR-020) |
| Polaroid Set Analysis (FR-3.11) | Dev + Art Critic | ✅ Done | 2026-02 | Set-level photo group evaluation |

### FR-3.11: Polaroid Set Analysis ✅ Complete

| Sub-task | Owner | Status | Completion | Note |
|----------|-------|--------|------------|------|
| `setMode` in open-call.json + polaroid template | Dev | ✅ Done | 2026-01 | Configuration schema implemented |
| `set-analyzer.js` | Dev | ✅ Done | 2026-01 | Core set cohesion and narrative analysis |
| `set-prompt-builder.js` | Dev + Art Critic | ✅ Done | 2026-01 | Set-specific prompt generation |
| `combination-generator.js` | Dev | ✅ Done | 2026-01 | Generate candidate photo groupings (C(n,k)) |
| `set-score-aggregator.js` | Dev | ✅ Done | 2026-01 | Aggregate and rank set-level scores |
| CLI: `analyze-set` command | Dev | ✅ Done | 2026-01 | Analyze a specific set of photos |
| CLI: `suggest-sets` command | Dev | ✅ Done | 2026-01 | Auto-suggest best photo combinations |
| Set analysis reports (MD/JSON/CSV) | Dev | ✅ Done | 2026-01 | Multi-format set-level reports |
| TDD: set-analyzer.test.js | QA + Dev | ✅ Done | 2026-01 | Full coverage for set analyzer |
| TDD: set-prompt-builder.test.js | QA + Dev | ✅ Done | 2026-01 | Full coverage for prompt builder |
| TDD: combination-generator.test.js | QA + Dev | ✅ Done | 2026-01 | Full coverage for combination generator |
| TDD: set-score-aggregator.test.js | QA + Dev | ✅ Done | 2026-01 | Full coverage for score aggregator |
| TDD: CLI integration tests | QA + Dev | ✅ Done | 2026-01 | analyze-set + suggest-sets commands |

**FR-3.11 Summary**: Complete set analysis system implemented with full test coverage. Now available for production use in Polaroid-style competitions like instantart Arles 2026.

---

## Milestone 4: Web UI & User Experience 🟡 In Progress

### Delivered

| Task | Owner | Status | Note |
|------|-------|--------|------|
| Web UI results visualization (FR-4.1) | Dev + Designer | ✅ Done | React + Vite, ranked grid |
| Analysis management dashboard (FR-4.2) | Dev | ✅ Done | Project dashboard |
| Dark mode + responsive UI (FR-4.3) | Dev | ✅ Done | System preference default |

### 🟡 P2 - Remaining

| Task | Owner | Status | Note |
|------|-------|--------|------|
| Interactive prompt refinement (FR-4.4) | Dev | 📋 Backlog | Deferred from FR-2.4 |
| Side-by-side photo comparison | Dev | 📋 Backlog | 2-3 photo comparison |
| Export from UI (MD, JSON, CSV) | Dev | 📋 Backlog | Web-based export |
| WCAG 2.1 AA accessibility | Dev | 📋 Backlog | Keyboard nav, a11y |

### Future Enhancements

| Task | Owner | Status | Note |
|------|-------|--------|------|
| RAW file support | Dev | 📋 Backlog | CR2, NEF, ARW support |
| Platform integrations | Dev | 📋 Backlog | Picter, PhotoShelter |
| Mobile app companion | Dev + Designer | 📋 Backlog | iOS/Android |

---

## Completed Tasks

| Task | Owner | Date | Note |
|------|-------|------|------|
| Project setup | Dev | 2024-01 | Initial structure |
| Agent definitions | - | 2024-01 | 5 agents configured |
| Main workflow | - | 2024-01 | analyze-open-call.md |
| Migration to Ollama | Dev | 2024-01 | From Anthropic to local |
| Photo analysis tests | QA | 2024-01 | 7.8/10 on sample |
| instantart Arles 2026 project setup | Project Owner | 2026-02-07 | Polaroid template initialized |

---

## How to Add Tasks

```markdown
| Task description | Owner | Status | Additional note |
```

Valid owners: `Art Critic`, `Dev`, `Designer`, `QA`, `Project Owner`

---

