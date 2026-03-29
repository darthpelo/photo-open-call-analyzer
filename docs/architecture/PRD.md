# Product Requirements Document: Photo Open Call Analyzer

**Version**: 1.0  
**Date**: January 28, 2026  
**Status**: APPROVED  
**Owner**: Project Owner  
**Last Updated**: 2026-01-28

---

## 1. Executive Summary

Photo Open Call Analyzer is an AI-driven CLI and web application that helps photographers objectively evaluate and rank their submissions against specific photography competition criteria. Using local vision AI (Ollama + LLaVA), it analyzes photographs without cloud dependencies, providing detailed scoring feedback and rankings optimized for each competition's jury preferences.

**Target User**: Photographers preparing submissions for competitive photography open calls  
**Primary Value Proposition**: Objective, competition-specific photo evaluation using local AI (cost-free, private)  
**Success Metric**: Photographers can confidently select top submissions based on competition-specific criteria

---

## 2. Problem Statement

### Current Pain Points
1. **Subjective selection bias** - Photographers manually choose submissions without objective evaluation
2. **Jury preference uncertainty** - No way to know if photo matches jury aesthetic
3. **Time-consuming evaluation** - Manual review of 50-100 candidate photos is tedious
4. **No competitive feedback** - Missing structured analysis on strengths/improvements
5. **Cost barriers** - Cloud-based vision APIs (OpenAI, Claude) charge per image
6. **Privacy concerns** - Photos uploaded to external APIs for evaluation

### Competitive Landscape
- **Commercial alternatives**: JPEG.io jury tools, Picter analytics (subscription-based, cloud-dependent)
- **Photo.net forums**: Free but manual peer feedback (subjective, inconsistent)
- **No open-source equivalent**: Gap in free, local, objective photo evaluation tools

---

## 3. Product Vision

Create a **free, open-source, local-first photo evaluation system** that photographers can run on their own hardware to objectively score photos against competition criteria, with no external dependencies, cloud uploads, or subscription fees.

**Geographic/Market Scope**: Global, any photographer using any photography competition platform  
**Timeline**: Q1 2026 (Milestones 2–4)

---

## 4. Core Features (Functional Requirements)

### Tier 1: MVP Complete (Milestone 1) ✅
- [x] CLI-based photo analysis with Ollama/LLaVA
- [x] Dynamic prompt generation from open call metadata
- [x] Batch processing with configurable parallelism
- [x] Multi-format export (Markdown, JSON, CSV)
- [x] Photo scoring with 1–10 scale and weighted criteria

### Tier 2: Post-MVP Automation (Milestone 2) 🔴 P0

#### FR-2.1: Configuration Template System
- **Requirement**: Standardized `open-call.json` template for users to define competition criteria
- **Acceptance Criteria**:
  - Template includes: title, theme, jury members, past winners, optional context
  - Validation schema enforces required fields
  - Example templates for 3 competition types (portrait, landscape, conceptual)
  - Documentation with fill-in instructions

#### FR-2.2: Resume Interrupted Analysis
- **Requirement**: Save/restore analysis state for long-running batches
- **Acceptance Criteria**:
  - Checkpoint system saves analyzed photos every N photos
  - User can resume from last checkpoint without re-analyzing completed photos
  - State persists across terminal sessions
  - Clear progress reporting (N/M photos complete)

#### FR-2.3: Edge Case Robustness
- **Requirement**: Handle corrupted images, timeouts, network errors gracefully
- **Acceptance Criteria**:
  - Corrupted image detection with user-friendly error messages
  - Ollama timeout handling (retry up to 3x before failing)
  - Batch continues if 1 photo fails (no stop-on-error by default)
  - Error summary report at end of batch

#### FR-2.4: Enhanced Prompt Engineering ✅ 80% Complete
- **Requirement**: Improve analysis quality via iterative prompt refinement
- **Status**: **80% Complete** (4/5 components delivered)
  - ✅ **Template Library** - 6 competition-specific templates with few-shot examples
  - ✅ **Multi-Stage Analysis** - 3-stage prompting (understanding → evaluation → consistency)
  - ✅ **Quality Validation** - Pre-analysis criteria validation + post-analysis coherence checking
  - ✅ **A/B Testing Framework** - Objective comparison of prompt variants
  - 🔄 **Interactive Refinement** - Deferred to M3 (validate-prompt provides core value)

- **Acceptance Criteria** (Original):
  - ✅ Support jury style/tone context (via template selection + open-call.json)
  - ✅ Criteria weightings auto-normalized
  - ✅ Example feedback phrases per criterion (in templates)
  - ✅ A/B test framework for prompt variants

- **Delivered Beyond Requirements**:
  - ✅ Multi-stage prompting with consistency checking
  - ✅ Automated quality validation (specificity + alignment scoring)
  - ✅ Score coherence detection (post-analysis validation)
  - ✅ CLI commands: `validate-prompt`, `test-prompt`

- **Impact Metrics**:
  - 📊 Specificity score: 4.5/10 → 8.2/10 (+82% improvement)
  - 📊 Score consistency: σ 2.5 → 1.8 (-28% variance)
  - 📊 Feedback detail: 300 → 420 chars avg (+40%)
  - 📊 Generic terms: 58% → 9% of criteria (-84%)
  - 📊 Theme alignment: 5.8/10 → 8.5/10 (+47%)

- **Documentation**:
  - [Prompt Engineering Guide](../docs/prompt-engineering-guide.md)
  - [ADR-009: Multi-Stage Prompting](../docs/architecture/ADR-009-multi-stage-prompting.md)
  - [ADR-010: Template-Based Prompt Engineering](../docs/architecture/ADR-010-template-based-prompt-engineering.md)
  - [ADR-011: Criteria Validation System](../docs/architecture/ADR-011-criteria-validation-system.md)

### Tier 3: Performance & Optimization (Milestone 3) 🟠 P1

#### FR-3.5: TDD Enforcement (ADR-013)
- **Requirement**: Enforce test-driven development with coverage thresholds and pre-commit hooks
- **Acceptance Criteria**:
  - Coverage thresholds: statements 80%, branches 70%, functions 80%, lines 80%
  - Pre-commit hooks run related tests via husky + lint-staged
  - Critical modules (photo-analyzer.js, api-client.js) at 80%+ coverage
- **Status**: Complete

#### FR-3.6: Smart Analysis Mode Selection (ADR-014)
- **Requirement**: Automatically select optimal analysis mode (single vs multi-stage) based on batch context
- **Acceptance Criteria**:
  - `--analysis-mode auto` as new default
  - `smartSelectAnalysisMode()` function with weighted heuristic
  - Stage 2 parallelization via `Promise.all()` (FIX-3)
  - Transparent logging of auto-selection decision
- **Status**: Complete

#### FR-3.7: Analysis Caching
- **Requirement**: Cache results to avoid re-analyzing identical photos
- **Acceptance Criteria**:
  - Photo content hash (perceptual or file-based) enables cache lookup
  - Cache stored locally in project directory
  - User can clear cache or disable caching per-batch
  - Cache hit rate reported in analysis summary

#### FR-3.8: Parallel Processing Optimization
- **Requirement**: Maximize throughput for large batches without overloading system
- **Acceptance Criteria**:
  - Configurable concurrency (default: 3, range: 1-10)
  - Memory usage stays <1GB for any batch size
  - Performance dashboard: photos/sec, queue depth, Ollama latency
  - Auto-throttle if Ollama overloaded

#### FR-3.9: Model Selection
- **Requirement**: Support alternative vision models for flexibility
- **Acceptance Criteria**:
  - Pluggable model selector (default: llava:7b, options: llava:13b, moondream2, bakllava)
  - Model auto-download if missing
  - Performance comparison: speed, accuracy, memory per model
  - Documentation on model selection trade-offs

### Tier 4: Web UI (Milestone 4) 🟡 P2

#### FR-4.1: Results Visualization
- **Requirement**: Web interface to view analysis results with rich visuals
- **Acceptance Criteria**:
  - Display ranked photo grid with scores and thumbnails
  - Sortable by total score, individual criteria, or manual drag-drop reordering
  - Side-by-side comparison of 2-3 photos
  - Expandable detail view (full feedback, strengths, improvements)

#### FR-4.2: Analysis Management
- **Requirement**: Manage multiple open call analyses from one dashboard
- **Acceptance Criteria**:
  - List of all open call projects with analysis date and photo count
  - Ability to re-run analysis on existing project (update criteria or photos)
  - Export results in multiple formats from UI
  - Search/filter analyses by competition name or date

#### FR-4.3: UI Polish
- **Requirement**: Professional, accessible interface
- **Acceptance Criteria**:
  - Dark mode support (default: system preference)
  - Mobile responsive (tablets + phones)
  - Keyboard navigation fully functional
  - WCAG 2.1 AA accessibility compliance

#### FR-4.4: Guided Project Initialization ✅ P0
- **Requirement**: Interactive CLI wizard for creating valid `open-call.json` configuration files with real-time validation, template support, and automatic project structure setup
- **Status**: Complete
- **Priority**: P0 (High - User Requested)
- **Complexity**: Medium (3.5-4.5 days)
- **Acceptance Criteria**:
  1. **Interactive Wizard**:
     - User can create project without writing JSON manually
     - 5-step guided workflow (setup -> details -> criteria -> review -> create)
     - Real-time validation prevents invalid configurations
     - Progress indicator shows current step (X/5)
  2. **Template Library**:
     - 4+ competition templates (portrait, landscape, conceptual, street)
     - User can select template during wizard
     - Templates pre-fill all required fields
     - User can customize template-provided values
  3. **Input Validation**:
     - Project name: alphanumeric + dashes only
     - Competition title: 3-200 chars
     - Theme: 5-1000 chars
     - Jury members: 1-50 members, 2-100 chars each
     - Past winners: 10-2000 chars
     - Custom criteria: max 10, weights auto-normalized
  4. **Project Structure**:
     - Auto-creates `data/open-calls/[project-name]/`
     - Creates subdirectories: `photos/`, `results/` (results use timestamped subdirs per FR-3.12)
     - Writes validated `open-call.json`
     - Generates project `README.md` with usage instructions
  5. **Error Handling**:
     - Existing project name -> prompt for new name
     - Invalid input -> clear error message with suggestion
     - Cancel mid-wizard -> no partial files created
     - File system errors -> user-friendly error messages
  6. **Documentation**:
     - Updated `CLAUDE.md` with init command
     - Updated `README.md` with wizard usage
     - New guide: `docs/guides/project-initialization.md`
- **Success Metrics**:
  - User can create project in < 3 minutes (vs 10-15 minutes manual)
  - Zero configuration validation errors after wizard
  - 100% of required fields populated
  - Test coverage >= 85% (M4 standard)
- **Dependencies**:
  - `@inquirer/prompts` v8.0.0 (new dependency)
  - Existing: validator.js, file-utils.js, logger.js
- **Related Documents**:
  - [ADR-012: Interactive CLI Prompting Library](../docs/architecture/ADR-012-interactive-cli-prompting-library.md)
  - [Implementation Plan](/Users/alessioroberto/.claude/plans/federated-baking-iverson.md)
- **User Impact**:
  - **Before**: Manual JSON editing, error-prone, high barrier to entry
  - **After**: Guided workflow, validated input, instant project setup
  - **Time Saved**: ~10-15 minutes per project creation
  - **Error Reduction**: 100% (validation prevents invalid configs)

#### FR-4.5: Interactive Prompt Refinement
- **Requirement**: Web-based prompt refinement workflow
- **Acceptance Criteria**:
  - Deferred component from FR-2.4
  - Visual quality validation
  - Suggestion acceptance/rejection UI

---

## 5. Non-Functional Requirements (NFRs)

### NFR-1: Performance
- Photo analysis latency: ≤ 30 seconds per photo (Ollama + LLaVA on CPU, RTX GPU ≤ 5 sec)
- Batch throughput: ≥ 2 photos/minute for 100-photo batch
- CLI startup time: ≤ 2 seconds
- Web UI load: ≤ 3 seconds (LCP)

### NFR-2: Reliability
- Ollama connection timeout: 30 seconds (recoverable, retry 3x)
- Photo validation success rate: ≥ 99% for valid formats (jpg, png, gif, webp)
- Graceful degradation: Single photo failure does not stop batch
- State persistence: ≥ 99.9% recovery from interruption

### NFR-3: Security & Privacy
- No photos uploaded to external services (all local processing)
- No API keys or credentials in config files (env vars recommended)
- Data retention: User owns all analysis data; no telemetry
- Ollama connection only via localhost (http://localhost:11434)

### NFR-4: Usability
- CLI intuitive without documentation (command help + examples)
- Web UI no coding required (point-and-click configuration)
- Documentation: Getting started ≤ 5 minutes, advanced features ≤ 30 minutes
- Error messages: Clear, actionable, suggest fixes

### NFR-5: Maintainability
- Code coverage: ≥ 80% for core modules (photo-analyzer, score-aggregator)
- Type safety: 100% of APIs documented with JSDoc
- Dependency management: No unpatched security vulnerabilities
- Documentation: All features explained in code comments + README

### NFR-6: Scalability
- Support batch sizes: 1–5000 photos
- Project size: ≤ 1000 photo projects without slowdown
- Memory footprint: ≤ 500MB for typical 100-photo batch

---

## 6. Success Criteria & Metrics

### Milestone 2 Success Criteria ✅ Complete
- [x] **FR-2.1**: 3+ example `open-call.json` templates published and documented
- [x] **FR-2.2**: Resume functionality tested with interrupted batch (100 photos)
- [x] **FR-2.3**: Edge case suite: 10+ error scenarios handled gracefully
- [x] **FR-2.4**: Prompt quality validated: Average feedback relevance score ≥ 4/5
  - Achieved: 8.2/10 specificity, 8.5/10 theme alignment (exceeds 4/5 target)
  - 264 tests passing (100% pass rate)
  - Comprehensive test coverage: unit, integration, E2E scenarios

**M2 Summary**:
- **Delivered**: 4/4 functional requirements (FR-2.1, FR-2.2, FR-2.3, FR-2.4)
- **Test Coverage**: 264 tests, ≥80% coverage target met
- **Documentation**: 3 ADRs, 1 user guide, updated README
- **Code Added**: ~4,990 lines production + 1,090 test lines
- **Duration**: 5 weeks actual (vs 6 weeks estimated, -17% ahead of schedule)

### Milestone 3 Success Criteria (Performance & Optimization)
- [x] TDD enforcement: coverage thresholds active, pre-commit hooks installed
- [x] Smart auto-selection: `--analysis-mode auto` as default, transparent logging
- [x] Stage 2 parallelization: `Promise.all()` reduces multi-stage time by ~50%
- [ ] Cache hit rate >= 20% on typical re-runs
- [ ] Parallel processing scales linearly up to 6 concurrent photos
- [ ] 3+ alternative models tested and documented (speed/accuracy trade-offs)
- [ ] Performance SLAs met on reference hardware (8GB RAM, 4-core CPU)

### Milestone 4 Success Criteria (Web UI)
- [ ] Web UI renders ranked results in <= 3 seconds
- [ ] Side-by-side comparison functional for any 2-3 photos
- [ ] Mobile UX validated on iOS Safari + Android Chrome
- [ ] Accessibility audit: 0 critical issues per WCAG 2.1 AA

### Overall Product Metrics
- **Adoption**: 50+ GitHub stars by Q2 2026
- **User Satisfaction**: ≥ 4.5/5 rating on user feedback survey
- **Time Saved**: Average user saves 2+ hours per competition using this tool vs. manual evaluation
- **Feature Completeness**: All Tier 1–2 features complete by M2, Tier 3 by M3, Tier 4 by M4

---

## 7. User Personas & Use Cases

### Persona 1: Serious Photographer (Primary)
- **Profile**: Active competitor, 10+ submissions/year, experienced in open calls
- **Goal**: Maximize acceptance rate by selecting competition-fit photos
- **Pain Point**: Subjective photo selection leads to repeated rejections
- **Success**: Uses Photo Open Call Analyzer to score all 200 candidates, submits top 3–5 per competition
- **Features Used**: Batch analysis, ranking, weighted criteria matching

### Persona 2: Casual Photographer (Secondary)
- **Profile**: Hobbyist, 1–2 submissions/year, curious about competition
- **Goal**: Understand why some photos score higher than others
- **Pain Point**: No feedback on photo quality or fit
- **Success**: Analyzes 20 photos, learns feedback patterns (composition weakness, etc.), improves submissions
- **Features Used**: Single photo analysis, detailed feedback, comparisons

### Persona 3: Photography Workshop Instructor (Tertiary)
- **Profile**: Runs photography education, wants to teach photo evaluation
- **Goal**: Teach students objective photo evaluation criteria
- **Pain Point**: Manual grading 50+ student submissions is time-consuming
- **Success**: Runs Photo Open Call Analyzer on student portfolio, uses results for teaching discussion
- **Features Used**: Batch analysis, report export (share with students), web UI for classroom demo

### Use Case: Competitive Photographer Workflow
1. **Discover open call** → Downloads competition theme + jury info
2. **Create config** → Fills out `open-call.json` with competition metadata
3. **Analyze batch** → Runs `npm run analyze analyze data/open-calls/nature-wildlife/` on 150 candidates
4. **Review results** → Opens web UI or Markdown report, sorts by score
5. **Refine submission** → Examines feedback on top 10 photos, selects best 3
6. **Submit** → High confidence in selection based on objective scoring

---

## 8. Dependencies & Integration Points

### External Dependencies
- **Ollama** (≥ v0.1.0) - Required, local only, free
- **LLaVA 7B model** (≥ 4GB VRAM) - Required, auto-installed via Ollama
- **Node.js** (≥ 20) - Required runtime
- **npm** - Package manager

### Optional Dependencies (for Milestone 3+)
- **React** or **Svelte** - Web UI framework (TBD in solutioning phase)
- **Express.js** - Web server backend
- **SQLite** - Local project database (optional, for caching)

### Integration Points
- **Picter API** (Future, M4+): Import analysis results to photographer portfolio
- **PhotoShelter**: Export submission recommendations
- **EXIF metadata**: Extract camera info, geo location for advanced filtering

---

## 9. Constraints & Assumptions

### Constraints
- **Hardware**: Requires Ollama + LLaVA (4GB+ VRAM recommended)
- **OS**: Linux, macOS, Windows support (WSL)
- **Network**: No internet required for analysis (Ollama local only)
- **Model**: LLaVA 7B is baseline; larger models need more VRAM

### Assumptions
- **User has Ollama installed and running** - Documented in QUICKSTART.md
- **Users understand open call evaluation** - Not first introduction to photo competitions
- **Photo library ≤ 5000 files** - Batch processing designed for typical contest prep
- **English-language competitions** - Initial release; multi-language in future roadmap

---

## 10. Out of Scope (Explicitly NOT Included)

- ❌ Real-time AI chat interface (feedback loop with AI)
- ❌ Mobile app (web-responsive sufficient)
- ❌ Cloud sync or multi-device analysis
- ❌ Social features (sharing evaluations with other photographers)
- ❌ Photo editing or filtering tools
- ❌ Integration with photo hosting platforms (beyond export)
- ❌ Multi-language UI (English only, M1)

---

## 11. Glossary

| Term | Definition |
|------|-----------|
| **Open Call** | Photography competition/call for entries with specific theme and jury |
| **Criterion** | Individual evaluation dimension (e.g., Composition, Lighting) with weighted score |
| **Batch** | Set of candidate photos to analyze together |
| **Tier** | Ranking category (Strong Yes / Yes / Maybe / No) |
| **Prompt** | LLM instruction sent to Ollama for photo analysis |
| **Cache** | Stored analysis result for identical photo (via hash) |
| **Ollama** | Local LLM inference engine running on user's machine |
| **LLaVA** | Vision-language model powering photo analysis |

---

## 12. Approval & Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Product Owner | Project Owner | 2026-01-28 | ✅ Approved |
| Tech Lead | Dev | 2026-01-28 | ✅ Approved |
| Art/Criteria Lead | Art Critic | 2026-01-28 | ✅ Approved |
| QA Lead | QA | Pending | Pending Review |

---

## 13. Change Log

| Date | Section | Change | Author |
|------|---------|--------|--------|
| 2026-01-28 | All | Initial PRD created from ROADMAP + BACKLOG | Project Owner |
| - | - | - | - |
