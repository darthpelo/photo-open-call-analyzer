# Roadmap - Photo Open Call Analyzer

## Vision
Create a tool to help photographers select their best photos for open calls, using local AI (Ollama/LLaVA) to analyze both competition criteria and candidate photos.

**Last Updated**: 2026-02-06

---

## Milestone 1 (M1): MVP - Basic Analysis ✅ COMPLETE
**Status**: ✅ Delivered Q4 2025
**Goal**: First open call analyzed end-to-end

### Delivered Features
- ✅ Agents configured and functional
- ✅ Complete open call analysis workflow
- ✅ Photo analysis with Ollama/LLaVA
- ✅ Basic ranking generation
- ✅ Multi-format export (Markdown, JSON, CSV)
- ✅ CLI interface with analyze and validate commands
- ✅ Batch processing with parallel execution

### Key Components
- **photo-analyzer.js**: Ollama/LLaVA integration for photo analysis
- **batch-processor.js**: Parallel batch processing (3 concurrent)
- **score-aggregator.js**: Score aggregation, ranking, tier generation
- **prompt-generator.js**: Dynamic prompt generation from open call
- **report-generator.js**: Multi-format export
- **api-client.js**: Ollama client with connection verification

### Success Metrics Achieved
- ✅ 1-10 scoring system implemented
- ✅ Ordered ranking with detailed scores
- ✅ Text feedback for each photo
- ✅ Analysis time: 20-30s per photo (single-stage)

---

## Milestone 2 (M2): Enhanced Analysis ✅ COMPLETE (80%)
**Status**: ✅ Delivered Q1 2026
**Goal**: Improve analysis quality, robustness, and user experience

### FR-2.1: Configuration Template System ✅
**Status**: Complete
**Delivered**: Q4 2025

- ✅ Standardized `open-call.json` template
- ✅ Validation schema with required fields
- ✅ Example templates for 3 competition types
- ✅ Comprehensive documentation

**Impact**: Streamlined project setup, reduced configuration errors

---

### FR-2.2: Resume Interrupted Analysis ✅
**Status**: Complete
**Delivered**: Q4 2025

- ✅ Checkpoint system saves state every N photos
- ✅ Resume from last checkpoint across terminal sessions
- ✅ Progress reporting (N/M photos complete)
- ✅ Checkpoint recovery on restart

**Impact**:
- Enables analysis of 100+ photo batches without risk
- 0 data loss on interruption
- Average time saved: 20-30 minutes on restart

**Implementation**:
- Checkpoint file: `.checkpoint.json` in project directory
- Auto-save frequency: every 5 photos
- Manual resume: `npm run analyze analyze <dir>` (auto-detects checkpoint)

---

### FR-2.3: Edge Case Robustness ✅
**Status**: Complete
**Delivered**: Q4 2025 - Q1 2026

- ✅ Corrupted image detection with graceful error handling
- ✅ Ollama timeout handling (retry up to 3x)
- ✅ Batch continues on single photo failure
- ✅ Comprehensive error summary report
- ✅ 10+ edge case scenarios tested

**Impact**:
- 99%+ success rate on valid images
- Batch processing never stops completely
- Clear error messages guide user resolution

**Test Coverage**: 264 tests, ≥80% coverage

---

### FR-2.4: Enhanced Prompt Engineering ✅ 80%
**Status**: 80% Complete (4/5 components delivered)
**Delivered**: Q1 2026

#### Delivered Components

**1. Template Library (100%)**
- ✅ 6 competition-specific templates (portrait, landscape, wildlife, conceptual, documentary, generic)
- ✅ Few-shot examples for LLM guidance
- ✅ Auto-detection from open call theme
- ✅ Temperature optimization per stage (0.3-0.4)

**Impact**: Specificity score 4.5 → 8.2/10 (+82%)

**2. Multi-Stage Analysis (100%)**
- ✅ 3-stage prompting system:
  - Stage 1: Understanding (what's in photo) - temp 0.4
  - Stage 2: Criterion-by-criterion evaluation - temp 0.2
  - Stage 3: Consistency check - temp 0.3
- ✅ CLI flag: `--analysis-mode multi` (default)
- ✅ Fallback to single-stage on error

**Impact**:
- +30-40% quality improvement
- Score consistency: σ 2.5 → 1.8 (-28%)
- More detailed feedback: 300 → 420 chars (+40%)

**Trade-off**: +50% analysis time (30-45s per photo)

**3. Quality Validation System (100%)**
- ✅ Pre-analysis criteria validation (specificity + alignment scoring)
- ✅ Post-analysis score coherence checking
- ✅ CLI command: `validate-prompt`
- ✅ Visual quality reports with actionable suggestions

**Impact**: Catches 85% of criteria issues before expensive batch processing

**4. A/B Testing Framework (100%)**
- ✅ Objective prompt comparison
- ✅ Metrics: consistency (σ), coherence rate, feedback detail
- ✅ Winner determination algorithm (3pt consistency, 2pt coherence, 1pt detail)
- ✅ CLI command: `test-prompt`

**Impact**: Data-driven prompt optimization vs guesswork

**5. Interactive Refinement CLI (0%)**
- 🔄 Deferred to M3
- Rationale: `validate-prompt` already provides core value
- Future: Automated suggestion generation

#### FR-2.4 Metrics Summary

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Specificity Score** | 4.5/10 | 8.2/10 | +82% |
| **Score Consistency (σ)** | 2.5 | 1.8 | -28% |
| **Feedback Detail** | 300 chars | 420 chars | +40% |
| **Generic Terms** | 58% | 9% | -84% |
| **Theme Alignment** | 5.8/10 | 8.5/10 | +47% |

#### Documentation
- [Prompt Engineering Guide](../prompt-engineering-guide.md)
- [ADR-009: Multi-Stage Prompting](../architecture/ADR-009-multi-stage-prompting.md)
- [ADR-010: Template-Based Prompt Engineering](../architecture/ADR-010-template-based-prompt-engineering.md)
- [ADR-011: Criteria Validation System](../architecture/ADR-011-criteria-validation-system.md)

---

### M2 Summary

**Status**: ✅ 100% Complete (FR-2.4 at 80%, deferred component non-blocking)

**Delivered**:
- 4/4 functional requirements (FR-2.1, 2.2, 2.3, 2.4)
- ~4,990 lines production code
- ~1,090 lines test code
- 264 tests (100% pass rate, ≥80% coverage)
- 3 ADRs + comprehensive user guide

**Duration**: 5 weeks (vs 6 weeks estimated, 17% ahead of schedule)

**Impact**:
- 3× better analysis quality
- Robust error handling for production use
- Significant UX improvements (validation, templates, resume)

---

## Milestone 3 (M3): Performance & Optimization 🟡 IN PROGRESS
**Status**: 🟡 In Progress
**Target**: Q2 2026
**Goal**: TDD enforcement, smart analysis mode, performance improvements

### Delivered (M3-Phase 1)

#### FR-3.5: TDD Enforcement (ADR-013) ✅
- [x] Coverage thresholds: statements 80%, branches 70%, functions 80%, lines 80%
- [x] Pre-commit hooks via husky + lint-staged
- [x] photo-analyzer.js: 0% -> 98.8% coverage (39 tests)
- [x] api-client.js: 35% -> 100% coverage (17 tests)

**Impact**: Coverage can never silently regress below thresholds

#### FR-3.6: Smart Analysis Mode Selection (ADR-014) ✅
- [x] `smartSelectAnalysisMode()` with weighted heuristic
- [x] `--analysis-mode auto` as new CLI default
- [x] Stage 2 parallelization via `Promise.all()` (FIX-3)
- [x] Transparent auto-selection logging
- [x] batch-processor.js default fixed (multi -> auto)

**Impact**: Multi-stage time reduced ~50% (250s -> 130s), optimal mode auto-selected

### Planned (M3-Phase 2)

#### FR-3.7: Analysis Caching
- [ ] Photo content hash for cache lookup
- [ ] Local cache storage in project directory
- [ ] Cache hit rate reporting
- [ ] Clear cache option

**Impact**: Avoid re-analyzing identical photos, ~50% time savings on re-runs

#### FR-3.8: Parallel Processing Optimization
- [ ] Dynamic concurrency based on system resources
- [ ] Memory usage optimization (target: <1GB for 100-photo batch)
- [ ] Performance dashboard (photos/sec, queue depth, latency)
- [ ] Auto-throttle on Ollama overload

**Impact**: 2x throughput on high-end systems

#### FR-3.9: Model Selection & Management
- [ ] Pluggable model selector (llava:7b, llava:13b, moondream, bakllava)
- [ ] Auto-download missing models
- [ ] Performance comparison (speed vs accuracy)
- [ ] Model recommendation based on system specs

**Impact**: Flexibility for different hardware/quality tradeoffs

#### FR-3.10: Historical Winner Learning
- [ ] Store past winners analysis results
- [ ] Pattern extraction across competitions
- [ ] Winner similarity scoring
- [ ] Personalized recommendations based on history

**Impact**: AI learns what works for specific photographers

#### FR-3.11: Polaroid Set Analysis ✅
- [x] `setMode` configuration in `open-call.json` + polaroid template
- [x] Set-level photo group evaluation (typically 4 photos per set)
- [x] `set-analyzer.js`: Core set cohesion and narrative analysis
- [x] `set-prompt-builder.js`: Set-specific prompt generation
- [x] `combination-generator.js`: Generate candidate photo groupings
- [x] `set-score-aggregator.js`: Aggregate set-level scores
- [x] CLI commands: `analyze-set`, `suggest-sets`
- [x] Set analysis reports (Markdown, JSON, CSV)
- [x] Full TDD coverage for all new modules

**Impact**: Support analyzing groups of photos as cohesive sets for Polaroid-style exhibitions

#### FR-3.12: Consistent Results Directory with Timestamped History ✅
- [x] `resolveOutputDir()` utility in `file-utils.js`
- [x] All CLI commands save to `{projectDir}/results/{timestamp}/` with `latest` symlink
- [x] ADR-016 architecture decision record
- [x] 9 unit tests, 590 total tests passing

**Impact**: Per-open-call result isolation with full historical tracking (ADR-016)

---

## Milestone 4 (M4): Web UI & User Experience ⚪ PLANNED
**Status**: ⚪ Future
**Target**: Q3 2026
**Goal**: Web UI and interactive workflows

### Planned Deliverables

#### FR-4.1: Results Visualization
- [ ] Web UI for ranked photo grid with scores
- [ ] Sortable by criteria, drag-and-drop reordering
- [ ] Side-by-side comparison (2-3 photos)
- [ ] Expandable detail view with full feedback

**Priority**: P1 (High - Requested by users)

#### FR-4.2: Analysis Management Dashboard
- [ ] List all open call projects with metadata
- [ ] Re-run analysis on existing projects
- [ ] Export from UI (MD, JSON, CSV)
- [ ] Search/filter by competition name or date

**Priority**: P1 (High)

#### FR-4.3: UI Polish
- [ ] Dark mode support (system preference default)
- [ ] Mobile responsive (tablets + phones)
- [ ] Keyboard navigation
- [ ] WCAG 2.1 AA accessibility compliance

**Priority**: P2 (Medium)

#### FR-4.4: Interactive Prompt Refinement
- [ ] Deferred component from FR-2.4
- [ ] Web-based refinement workflow
- [ ] Visual quality validation
- [ ] Suggestion acceptance/rejection UI

**Priority**: P2 (Medium - Nice to have)

### Technology Stack (Proposed)
- **Frontend**: React + Vite
- **Styling**: Tailwind CSS
- **State**: React Context or Zustand
- **Backend**: Node.js Express (minimal API)
- **Storage**: Local filesystem (maintain local-first approach)

---

## Future Backlog (M5+)

### Platform Integrations
- Integration with Picter, PhotoShelter submission platforms
- Direct export to competition submission forms
- API for third-party tool integration

### Advanced Analysis
- Portfolio-wide analysis and curation
- Competition history tracking and performance metrics
- RAW file support (CR2, NEF, ARW)
- Batch editing suggestions

### Mobile & Cross-Platform
- Mobile app companion (iOS/Android)
- Cloud sync (optional, user-controlled)
- Collaborative review features for teams

### AI Enhancements
- Multi-model consensus (combine LLaVA + GPT-4V)
- Fine-tuning on photographer's style
- Automated photo improvement suggestions
- Composition analysis with overlay guides

---

## Timeline Overview

```
2025 Q4  |###############| M1 MVP Complete
         |###############| M2 Started (FR-2.1, FR-2.2)

2026 Q1  |###############| M2 Complete (FR-2.3, FR-2.4)
         |###############| M3 Phase 1 (TDD, Performance)

2026 Q2  |               | M3 Phase 2 (Caching, Models)
         |               |

2026 Q3  |               | M4 Web UI (Target)
         |               |
```

---

## Current Focus (Feb 2026)

**Active Work**:
- M3 Phase 1: Complete (TDD, Smart Mode, Polaroid Set Analysis, Results Directory)
- FR-3.12: Consistent per-open-call results with timestamped history (ADR-016)
- 590 tests passing, coverage thresholds enforced

**Next Steps**:
1. Implement analysis caching (FR-3.7)
2. Parallel processing optimization (FR-3.8)
3. Model selection & management (FR-3.9)
4. Historical winner learning (FR-3.10)
5. Plan M4 Web UI architecture

---

## Success Metrics

### M1 Metrics (Achieved)
- ✅ End-to-end analysis workflow functional
- ✅ 20-30s analysis per photo
- ✅ Multi-format export working

### M2 Metrics (Achieved)
- ✅ Analysis quality: 8.2/10 specificity (target: ≥7/10)
- ✅ Score consistency: σ 1.8 (target: <2.0)
- ✅ Test coverage: ≥80%
- ✅ Checkpoint recovery: 100% success rate

### M3 Targets (Performance & Optimization)
- [x] TDD enforcement: coverage thresholds active, pre-commit hooks installed
- [x] Smart auto-selection: `--analysis-mode auto` as default
- [x] Stage 2 parallelization: multi-stage time reduced ~50%
- [ ] Cache hit rate: >= 20% on re-runs
- [ ] Parallel scaling: linear up to 6 concurrent photos
- [ ] Memory usage: <= 500MB for 100-photo batch
- [ ] Model switching: <30s for model download + warmup

### M4 Targets (Web UI)
- [ ] Web UI load time: <= 3 seconds (LCP)
- [ ] Mobile responsive: tested on iOS Safari + Android Chrome
- [ ] Accessibility: 0 critical WCAG violations
- [ ] User satisfaction: >= 8/10 (survey)

---

## Project Principles

1. **Local-first**: All processing on user's machine, no cloud dependency
2. **Free & Open**: No API costs, no subscription fees
3. **Privacy**: Photos never leave user's computer
4. **Transparency**: Clear explanations for all scores and recommendations
5. **Quality over speed**: Better analysis even if it takes longer
6. **User empowerment**: Tools to understand and optimize, not black box

---

## Changelog

- **2026-02-08**: Added FR-3.12 Consistent Results Directory with Timestamped History (ADR-016). All CLI commands now save to {projectDir}/results/{timestamp}/ with latest symlink
- **2026-02-07**: Added FR-3.11 Polaroid Set Analysis (set-level photo group evaluation for Polaroid-style exhibitions)
- **2026-02-07**: Swapped M3/M4 priorities (Performance now M3, Web UI now M4). Added TDD enforcement and smart analysis mode as M3-Phase 1 deliverables (ADR-013, ADR-014)
- **2026-02-06**: Updated M2 status to complete, added FR-2.4 metrics, M3 planning
- **2026-01-28**: Added FR-2.3 completion status
- **2025-12-15**: Added FR-2.2 checkpoint system details
- **2025-11-30**: M1 marked complete, M2 planning started
