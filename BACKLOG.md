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

## Milestone 2: Post-MVP 🟡 In Progress

### 🟡 P2 - Improvements

| Task | Owner | Status | Note |
|------|-------|--------|------|
| Configuration templates (FR-2.1) | Dev | ✅ Done | Validator + 3 templates |
| Resume interrupted analysis (FR-2.2) | Dev | Pending | State persistence |
| Edge case robustness (FR-2.3) | QA | Pending | Corrupt photos, timeout handling |
| UI wireframe (FR-2.4) | Designer | Pending | Results visualization |

### 🟢 P3 - Future

| Task | Owner | Status | Note |
|------|-------|--------|------|
| Web UI (Milestone 3) | Dev + Designer | Backlog | React/Svelte |
| Caching (Milestone 4) | Dev | Backlog | Performance optimization |
| RAW file support | Dev | Backlog | dcraw integration |
| Alternative vision models | Dev | Backlog | moondream, bakllava |

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
