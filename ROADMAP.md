# Roadmap - Photo Open Call Analyzer

## Vision
Create a tool to help photographers select their best photos for open calls, using local AI (Ollama/LLaVA) to analyze both competition criteria and candidate photos.

---

## Milestone 1: MVP - Basic Analysis
**Status**: ✅ COMPLETED
**Target**: First open call analyzed end-to-end

### Deliverables
- [x] Agents configured and functional
- [x] Complete open call analysis workflow
- [x] Photo analysis with Ollama/LLaVA
- [x] Basic ranking generation

### Success Criteria
- [x] Analyze photos with 1-10 scoring
- [x] Generate ordered ranking with scores
- [x] Provide text feedback for each photo

### Implemented Features
- **photo-analyzer.js**: Ollama/LLaVA integration for photo analysis
- **batch-processor.js**: Parallel batch processing
- **score-aggregator.js**: Score aggregation, ranking, tier generation
- **prompt-generator.js**: Dynamic prompt generation from open call
- **report-generator.js**: Multi-format export (Markdown, JSON, CSV)
- **CLI Interface**: Full command-line with analyze, validate commands
- **api-client.js**: Ollama client with connection verification

---

## Milestone 2: Automation
**Status**: 🟡 In Progress

### Deliverables
- [x] CLI for batch processing
- [x] Configuration file for open call (template) - FR-2.1 COMPLETE
- [x] Export in multiple formats (MD, JSON, CSV)
- [ ] Resume interrupted analysis - FR-2.2 Planned

---

## Milestone 3: Web UI & Visualization
**Status**: ⚪ Planned

### Deliverables
- [ ] Web UI for visualization of results
- [ ] Side-by-side comparison
- [ ] Drag & drop per riordinare
- [ ] Dark mode

---

## Milestone 4: Ottimizzazioni
**Status**: ⚪ Planned

### Deliverable
- [ ] Caching analisi
- [ ] Parallel processing ottimizzato
- [ ] Memoria vincitori passati
- [ ] Suggerimenti miglioramento foto

---

## Backlog Futuro
- Integrazione con piattaforme (Picter, PhotoShelter)
- Analisi portfolio completo
- Storico open call e performance
- Mobile app companion
- Supporto altri modelli vision (moondream, bakllava)
