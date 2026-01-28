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

#### FR-2.4: Enhanced Prompt Engineering
- **Requirement**: Improve analysis quality via iterative prompt refinement
- **Acceptance Criteria**:
  - Support jury style/tone context (e.g., "minimalist aesthetic")
  - Criteria weightings auto-normalized
  - Example feedback phrases per criterion
  - A/B test framework for prompt variants

### Tier 3: Web UI (Milestone 3) 🟠 P1

#### FR-3.1: Results Visualization
- **Requirement**: Web interface to view analysis results with rich visuals
- **Acceptance Criteria**:
  - Display ranked photo grid with scores and thumbnails
  - Sortable by total score, individual criteria, or manual drag-drop reordering
  - Side-by-side comparison of 2–3 photos
  - Expandable detail view (full feedback, strengths, improvements)

#### FR-3.2: Analysis Management
- **Requirement**: Manage multiple open call analyses from one dashboard
- **Acceptance Criteria**:
  - List of all open call projects with analysis date and photo count
  - Ability to re-run analysis on existing project (update criteria or photos)
  - Export results in multiple formats from UI
  - Search/filter analyses by competition name or date

#### FR-3.3: UI Polish
- **Requirement**: Professional, accessible interface
- **Acceptance Criteria**:
  - Dark mode support (default: system preference)
  - Mobile responsive (tablets + phones)
  - Keyboard navigation fully functional
  - WCAG 2.1 AA accessibility compliance

### Tier 4: Performance & Optimization (Milestone 4) 🟡 P2

#### FR-4.1: Analysis Caching
- **Requirement**: Cache results to avoid re-analyzing identical photos
- **Acceptance Criteria**:
  - Photo content hash (perceptual or file-based) enables cache lookup
  - Cache stored locally in project directory
  - User can clear cache or disable caching per-batch
  - Cache hit rate reported in analysis summary

#### FR-4.2: Parallel Processing Optimization
- **Requirement**: Maximize throughput for large batches without overloading system
- **Acceptance Criteria**:
  - Configurable concurrency (default: 3, range: 1–10)
  - Memory usage stays <1GB for any batch size
  - Performance dashboard: photos/sec, queue depth, Ollama latency
  - Auto-throttle if Ollama overloaded

#### FR-4.3: Model Selection
- **Requirement**: Support alternative vision models for flexibility
- **Acceptance Criteria**:
  - Pluggable model selector (default: llava:7b, options: llava:13b, moondream2, bakllava)
  - Model auto-download if missing
  - Performance comparison: speed, accuracy, memory per model
  - Documentation on model selection trade-offs

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

### Milestone 2 Success Criteria
- [ ] 3+ example `open-call.json` templates published and documented
- [ ] Resume functionality tested with interrupted batch (100 photos)
- [ ] Edge case suite: 10+ error scenarios handled gracefully
- [ ] Prompt quality validated: Average feedback relevance score ≥ 4/5 (user survey)

### Milestone 3 Success Criteria
- [ ] Web UI renders ranked results in ≤ 3 seconds
- [ ] Side-by-side comparison functional for any 2–3 photos
- [ ] Mobile UX validated on iOS Safari + Android Chrome
- [ ] Accessibility audit: 0 critical issues per WCAG 2.1 AA

### Milestone 4 Success Criteria
- [ ] Cache hit rate ≥ 20% on typical re-runs
- [ ] Parallel processing scales linearly up to 6 concurrent photos
- [ ] 3+ alternative models tested and documented (speed/accuracy trade-offs)
- [ ] Performance SLAs met on reference hardware (8GB RAM, 4-core CPU)

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
