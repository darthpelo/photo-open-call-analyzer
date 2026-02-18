# Project Brief - Photo Open Call Analyzer

**Domain**: Software
**Phase**: M3 Phase 2 (Performance & Optimization)
**Generated**: 2026-02-17
**Source**: Existing ROADMAP.md and BACKLOG.md

---

## Vision

Create a tool to help photographers select their best photos for open calls, using local AI (Ollama/LLaVA) to analyze both competition criteria and candidate photos.

**Core principles**: Local-first, free & open, privacy-preserving, transparent scoring.

---

## Current State

| Milestone | Status | Key Deliverables |
|-----------|--------|------------------|
| M1: MVP | Complete | End-to-end analysis, CLI, multi-format export |
| M2: Enhanced Analysis | Complete | Templates, multi-stage prompting, resume, edge cases |
| M3 Phase 1 | Complete | TDD enforcement, smart mode, Polaroid sets, timestamped results, smart photo selection |
| M3 Phase 2 | **Next** | Caching, parallel optimization, model selection, winner learning |
| M4: Web UI | Future (Q3 2026) | React + Vite dashboard, results visualization |

**Metrics achieved**: 605 tests passing, 80%+ coverage, specificity 8.2/10, score consistency sigma 1.8.

---

## Scope: M3 Phase 2

### In Scope

| Feature | ID | Priority | Description |
|---------|----|----------|-------------|
| Analysis Caching | FR-3.7 | P1 | Photo content hash, local cache, hit rate reporting, clear cache |
| Parallel Processing Optimization | FR-3.8 | P1 | Dynamic concurrency, memory optimization (<500MB/100 photos), auto-throttle |
| Model Selection & Management | FR-3.9 | P1 | Pluggable models (llava:7b/13b, moondream, bakllava), auto-download, comparison |
| Historical Winner Learning | FR-3.10 | P1 | Store winners, pattern extraction, similarity scoring, recommendations |

### Out of Scope (M4)
- Web UI and visualization
- Interactive prompt refinement
- Mobile/cross-platform
- Platform integrations (Picter, PhotoShelter)

---

## Success Metrics (M3 Phase 2)

| Metric | Target |
|--------|--------|
| Cache hit rate | >= 20% on re-runs |
| Parallel scaling | Linear up to 6 concurrent photos |
| Memory usage | <= 500MB for 100-photo batch |
| Model switching | < 30s for download + warmup |
| Test coverage | >= 80% maintained |

---

## Stakeholders

| Role | Name | Responsibility |
|------|------|----------------|
| Owner / User | Alessio | Solo developer, primary user, decision maker |
| Active Project | instantart Arles 2026 | Polaroid open call (4-photo sets), awaiting photos |

---

## Technical Stack

- **Runtime**: Node.js (ESM)
- **AI**: Ollama + LLaVA (local vision model)
- **Image Processing**: Sharp
- **CLI**: Commander + Chalk + Ora
- **Testing**: Jest, 605 tests, 80%+ coverage thresholds enforced

---

## Recommended Next Steps

1. `/bmad-pm` - Create detailed requirements (PRD) for FR-3.7 through FR-3.10
2. `/bmad-architect` - Design caching strategy, concurrency model, model plugin architecture
3. `/bmad-dev` - Implement features with TDD
4. `/bmad-qa` - Validate against success metrics

---

## Open Questions

1. **FR-3.7 Cache scope**: Per-project or global cache? (Impacts disk usage vs. cross-project reuse)
2. **FR-3.9 Model priority**: Which alternative models to support first? (llava:13b for quality, moondream for speed)
3. **FR-3.10 Winner data source**: Manual input or scrape from competition sites?
4. **M3 Phase 2 order**: Sequential (3.7 → 3.8 → 3.9 → 3.10) or parallel development?
