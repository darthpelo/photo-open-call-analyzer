# Backlog - Photo Open Call Analyzer

## Priority Levels

| Level | Meaning |
|-------|---------|
| 🔴 P0 | Critical - Blocks MVP |
| 🟠 P1 | High - Required for MVP |
| 🟡 P2 | Medium - Nice to have |
| 🟢 P3 | Low - Future |

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

## Milestone 3: Performance & Optimization 🟡 In Progress

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
| Analysis caching (FR-3.7) | Dev | 📋 Planned | ~50% time savings on re-runs |
| Parallel processing optimization (FR-3.8) | Dev | 📋 Planned | Dynamic concurrency |
| Model selection (FR-3.9) | Dev | 📋 Planned | llava:13b, moondream, bakllava |
| Historical winner learning (FR-3.10) | Dev + Art Critic | 📋 Planned | Pattern extraction |
| Polaroid Set Analysis (FR-3.11) | Dev + Art Critic | 🟡 In Progress | Set-level photo group evaluation |

### FR-3.11: Polaroid Set Analysis (Sub-tasks)

| Sub-task | Owner | Status | Note |
|----------|-------|--------|------|
| `setMode` in open-call.json + polaroid template | Dev | 📋 Planned | Configuration schema for set-based analysis |
| `set-analyzer.js` | Dev | 📋 Planned | Core set cohesion and narrative analysis |
| `set-prompt-builder.js` | Dev + Art Critic | 📋 Planned | Set-specific prompt generation |
| `combination-generator.js` | Dev | 📋 Planned | Generate candidate photo groupings (C(n,k)) |
| `set-score-aggregator.js` | Dev | 📋 Planned | Aggregate and rank set-level scores |
| CLI: `analyze-set` command | Dev | 📋 Planned | Analyze a specific set of photos |
| CLI: `suggest-sets` command | Dev | 📋 Planned | Auto-suggest best photo combinations |
| Set analysis reports (MD/JSON/CSV) | Dev | 📋 Planned | Multi-format set-level reports |
| TDD: set-analyzer.test.js | QA + Dev | 📋 Planned | Full coverage for set analyzer |
| TDD: set-prompt-builder.test.js | QA + Dev | 📋 Planned | Full coverage for prompt builder |
| TDD: combination-generator.test.js | QA + Dev | 📋 Planned | Full coverage for combination generator |
| TDD: set-score-aggregator.test.js | QA + Dev | 📋 Planned | Full coverage for score aggregator |
| TDD: CLI integration tests | QA + Dev | 📋 Planned | analyze-set + suggest-sets commands |

---

## Milestone 4: Web UI & User Experience 🟢 Future

### 🟠 P1 - High Priority

| Task | Owner | Status | Note |
|------|-------|--------|------|
| Web UI results visualization (FR-4.1) | Dev + Designer | 📋 Backlog | React + Vite, ranked grid |
| Analysis management dashboard (FR-4.2) | Dev | 📋 Backlog | Multi-project management |
| Interactive prompt refinement (FR-4.5) | Dev | 📋 Backlog | Deferred from FR-2.4 |

### 🟡 P2 - Medium Priority

| Task | Owner | Status | Note |
|------|-------|--------|------|
| Dark mode + responsive UI (FR-4.3) | Designer | 📋 Backlog | WCAG 2.1 AA compliance |
| Side-by-side photo comparison | Dev | 📋 Backlog | 2-3 photo comparison |

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

---

## How to Add Tasks

```markdown
| Task description | Owner | Status | Additional note |
```

Valid owners: `Art Critic`, `Dev`, `Designer`, `QA`, `Project Owner`

---

## FR-2.2: Resume Interrupted Analysis (PHASE 1 - REQUIREMENTS)

### Current Status: Requirements Finalization

**Phase 1 Owner**: @Project Owner  
**Estimated Duration**: 1 day  
**Start Date**: 2026-01-28

### Requirements to Finalize

#### 1. Checkpoint Interval
- **Question**: How frequently should analysis progress be saved?
- **Options**:
  - Option A: Every 5 photos (more frequent saves, more disk I/O)
  - Option B: Every 10 photos (balanced, recommended default)
  - Option C: Every 25 photos (fewer saves, less overhead)
  - Option D: User configurable via `--checkpoint-interval` flag
- **Decision**: Recommend **Option D** with default=10, range 1-50
- **Rationale**: Large batches (100-500 photos) benefit from granular resumption; small batches (5-20) don't need frequent saves

#### 2. Checkpoint File Location
- **Question**: Where should checkpoint file be stored?
- **Options**:
  - Option A: Hidden file `.analysis-checkpoint.json` in project root (alongside open-call.json)
  - Option B: Explicit file `analysis-checkpoint.json` in results directory
  - Option C: Both locations with preference
- **Decision**: Recommend **Option A** (hidden in project root)
- **Rationale**: Project-level checkpoint persists across analyses; results directory is for final outputs only

#### 3. Config Change Behavior
- **Question**: What happens if user modifies open-call.json and resumes?
- **Options**:
  - Option A: Automatically discard checkpoint (always re-analyze from scratch)
  - Option B: Warn user and ask for confirmation
  - Option C: Validate config hash; discard checkpoint if config changed
  - Option D: Continue analysis with new config on checkpoint photos
- **Decision**: Recommend **Option C** (validate config hash, auto-discard on mismatch)
- **Rationale**: Prevents analyzing photos with old criteria; improves user experience by not requiring manual cleanup

#### 4. Progress Reporting UI
- **Question**: How should CLI display resume progress?
- **Options**:
  - Option A: "Resuming analysis: 45 of 120 photos done, 75 remaining"
  - Option B: "Progress: 45/120 (37.5%) | Estimated time: 15 mins"
  - Option C: Show both progress bar and percentage
- **Decision**: Recommend **Option A** with progress bar for visual feedback
- **Rationale**: Clear, simple messaging; progress bar for long batches

#### 5. Checkpoint Cleanup
- **Question**: When should checkpoint file be deleted?
- **Options**:
  - Option A: Manual deletion required (user runs with `--clear-checkpoint` flag)
  - Option B: Auto-delete after successful completion
  - Option C: Both (auto-delete by default, manual flag to keep)
  - Option D: Never delete (keeps analysis history)
- **Decision**: Recommend **Option B** (auto-delete on completion, manual `--clear-checkpoint` to reset)
- **Rationale**: Prevents stale checkpoints; user can manually clear if needed

#### 6. Parallel Processing During Resume
- **Question**: Should resume use same parallelism as original run?
- **Options**:
  - Option A: Resume with same parallelism (stored in checkpoint)
  - Option B: Resume with current user setting (`--parallel` flag)
  - Option C: Configurable (user choice)
- **Decision**: Recommend **Option A** (use original setting)
- **Rationale**: Ensures deterministic resumption; prevents mixing different concurrency levels

### Checkpoint File Format (Proposed)

```json
{
  "version": "1.0",
  "projectDir": "data/open-calls/nature-wildlife/",
  "openCallConfigHash": "sha256:abc123...",
  "analysisPrompt": {
    "criteria": [{"name": "Composition", "weight": 25}],
    "evaluationInstructions": "..."
  },
  "analyzedPhotos": ["photo-001.jpg", "photo-002.jpg", ...],
  "partialResults": {
    "scores": {...},
    "statistics": {...}
  },
  "parallelSetting": 3,
  "checkpointInterval": 10,
  "timestamp": "2026-01-28T15:30:00Z",
  "status": "in_progress"
}
```

### CLI Flags (Proposed)

```bash
# Run with checkpoint resume (auto-detects checkpoint)
npm run analyze data/open-calls/nature-wildlife/

# Set checkpoint interval (default 10)
npm run analyze data/open-calls/nature-wildlife/ --checkpoint-interval 15

# Clear stale checkpoint before running
npm run analyze data/open-calls/nature-wildlife/ --clear-checkpoint

# View checkpoint status (info only)
npm run analyze data/open-calls/nature-wildlife/ --checkpoint-info
```

### Definition of Done (Phase 1)

- [ ] All 6 requirements finalized and documented
- [ ] Checkpoint file format approved
- [ ] CLI flags defined and documented
- [ ] Test acceptance criteria ready for @QA
- [ ] BACKLOG.md updated with finalized spec

### Next Phase

Once Phase 1 requirements are finalized:
- @Architect designs solution (ADR + checkpoint schema)
- @QA designs test strategy (15+ test cases)
- @Dev implements feature branch
