# Backlog - Photo Open Call Analyzer

## Priorita

| Livello | Significato |
|---------|-------------|
| 🔴 P0 | Critico - Blocca MVP |
| 🟠 P1 | Alto - Necessario per MVP |
| 🟡 P2 | Medio - Nice to have |
| 🟢 P3 | Basso - Futuro |

---

## Milestone 1: MVP ✅ Completata

### 🔴 P0 - Critici

| Task | Owner | Status | Note |
|------|-------|--------|------|
| Setup Ollama client | Dev | ✅ Done | api-client.js |
| Implementare photo-analyzer.js | Dev | ✅ Done | Ollama/LLaVA integration |
| Test analisi singola foto | QA | ✅ Done | Tests passing |

### 🟠 P1 - MVP

| Task | Owner | Status | Note |
|------|-------|--------|------|
| Template prompt analisi | Art Critic | ✅ Done | prompt-generator.js |
| Batch processor | Dev | ✅ Done | batch-processor.js |
| Generatore ranking | Dev | ✅ Done | score-aggregator.js |
| Export Markdown | Dev | ✅ Done | Multi-format support |
| Export JSON/CSV | Dev | ✅ Done | report-generator.js |
| CLI commands | Dev | ✅ Done | analyze.js |

---

## Milestone 2: Post-MVP 🟡 In Progress

### 🟡 P2 - Miglioramenti

| Task | Owner | Status | Note |
|------|-------|--------|------|
| Template open-call.json | Dev | Pending | Esempio config |
| Wireframe UI | Designer | Pending | Visualizzazione risultati |
| Test edge cases | QA | Pending | Foto corrotte, timeout |
| Resume analisi interrotta | Dev | Pending | Persistenza stato |

### 🟢 P3 - Futuro

| Task | Owner | Status | Note |
|------|-------|--------|------|
| Web UI | Dev + Designer | Backlog | React/Svelte |
| Caching | Dev | Backlog | Performance |
| Supporto RAW | Dev | Backlog | dcraw integration |
| Altri modelli | Dev | Backlog | moondream, bakllava |

---

## Completati

| Task | Owner | Data | Note |
|------|-------|------|------|
| Setup progetto | Dev | 2024-01 | Struttura iniziale |
| Definizione agenti | - | 2024-01 | 5 agenti configurati |
| Workflow principale | - | 2024-01 | analyze-open-call.md |
| Migrazione a Ollama | Dev | 2024-01 | Da Anthropic a locale |
| Test analisi foto | QA | 2024-01 | 7.8/10 su sample |

---

## Come Aggiungere Task

```markdown
| Descrizione task | Owner | Pending | Note aggiuntive |
```

Owners validi: `Art Critic`, `Dev`, `Designer`, `QA`, `Project Owner`
