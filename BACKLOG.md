# Backlog - Photo Open Call Analyzer

## Priorita

| Livello | Significato |
|---------|-------------|
| 🔴 P0 | Critico - Blocca MVP |
| 🟠 P1 | Alto - Necessario per MVP |
| 🟡 P2 | Medio - Nice to have |
| 🟢 P3 | Basso - Futuro |

---

## Milestone 1: MVP (In Progress) ✓

### 🔴 P0 - Critici

| Task | Owner | Status | Note |
|------|-------|--------|------|
| Setup API Claude Vision | Dev | ✅ Done | api-client.js |
| Implementare photo-analyzer.js | Dev | ✅ Done | Claude Vision integration |
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
| Test suite | QA | ✅ Done | 10/10 tests passing |

### 🟡 P2 - Post-MVP

| Task | Owner | Status | Note |
|------|-------|--------|------|
| CLI commands | Dev | Pending | UX migliorata |
| Wireframe UI | Designer | Pending | Visualizzazione risultati |
| Test edge cases | QA | Pending | Foto corrotte, timeout |
| Config file | Dev | Pending | Riusabilita |

### 🟢 P3 - Futuro

| Task | Owner | Status | Note |
|------|-------|--------|------|
| Web UI | Dev + Designer | Backlog | - |
| Caching | Dev | Backlog | Performance |
| Multi-format export | Dev | Backlog | JSON, CSV |

---

## Completati

| Task | Owner | Data | Note |
|------|-------|------|------|
| Setup progetto | - | - | Struttura iniziale |
| Definizione agenti | - | - | 5 agenti configurati |
| Workflow principale | - | - | analyze-open-call.md |

---

## Come Aggiungere Task

```markdown
| Descrizione task | Owner | Pending | Note aggiuntive |
```

Owners validi: `Art Critic`, `Dev`, `Designer`, `QA`, `Project Owner`
