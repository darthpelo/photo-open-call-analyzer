# Roadmap - Photo Open Call Analyzer

## Vision
Creare un tool che aiuti i fotografi a selezionare le foto migliori per le open call, usando AI per analizzare sia i criteri della competizione che le foto candidate.

---

## Milestone 1: MVP - Analisi Base
**Status**: � COMPLETED ✓
**Target**: Prima open call analizzata end-to-end

### Deliverable
- [x] Agenti configurati e funzionanti
- [x] Workflow analisi open call completo
- [x] Analisi foto con Claude Vision
- [x] Generazione classifica base

### Success Criteria
- [x] Analizzare almeno 20 foto
- [x] Generare classifica ordinata con score
- [x] Feedback testuale per ogni foto

### Implemented Features
- **photo-analyzer.js**: Claude Vision integration per analisi foto
- **batch-processor.js**: Elaborazione batch in parallelo (3-N foto)
- **score-aggregator.js**: Aggregazione score, ranking, tier generation
- **prompt-generator.js**: Dynamic prompt generation da open call
- **report-generator.js**: Multi-format export (Markdown, JSON, CSV)
- **CLI Interface**: Full command-line with analyze, validate commands
- **Test Suite**: 10 unit tests + workflow test
- **Documentation**: QUICKSTART.md + inline code comments

---

## Milestone 2: Automazione
**Status**: ⚪ Planned

### Deliverable
- [ ] CLI per batch processing
- [ ] Config file per open call
- [ ] Export in multipli formati (MD, JSON, CSV)
- [ ] Resume analisi interrotta

---

## Milestone 3: UI Visualizzazione
**Status**: ⚪ Planned

### Deliverable
- [ ] Web UI per visualizzare risultati
- [ ] Comparazione side-by-side
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
