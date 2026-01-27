# Photo Open Call Analyzer

Sistema multi-agente per analizzare foto candidate a open call fotografiche e generare una classifica basata sui criteri specifici della competizione.

## Descrizione Progetto

Questo tool aiuta fotografi a selezionare le migliori foto da sottomettere a open call, analizzando:
- Il tema e i requisiti della open call
- I gusti della giuria (basati su vincitori passati)
- Ogni foto candidata rispetto ai criteri identificati

**Stack**: Node.js + Ollama (LLaVA) per analisi vision locale e gratuita.

## Agenti Disponibili

| Agente | File | Ruolo |
|--------|------|-------|
| **Art Critic** | `.claude/agents/art-critic.md` | Analizza open call, genera criteri, valuta foto |
| **Project Owner** | `.claude/agents/project-owner.md` | Coordina progetto, gestisce priorita |
| **Dev** | `.claude/agents/dev.md` | Implementa logica analisi, API, automazione |
| **Designer** | `.claude/agents/designer.md` | UX/UI per visualizzazione risultati |
| **QA** | `.claude/agents/qa.md` | Testing, validazione, quality assurance |

## Workflow Principale

Vedi `.claude/workflows/analyze-open-call.md` per il flusso completo.

```
1. Setup      → Project Owner inizializza, Art Critic analizza OC
2. Analysis   → Dev processa foto con Ollama/LLaVA
3. Ranking    → Art Critic genera classifica finale
```

## Quick Start

### 1. Verifica Ollama
```bash
ollama list  # Deve mostrare llava:7b
```

### 2. Installa Dipendenze
```bash
npm install
```

### 3. Analizza una Foto
```bash
node src/cli/analyze.js analyze-single ./path/to/photo.jpg
```

### 4. Analizza Batch
```bash
# Crea struttura
mkdir -p data/open-calls/mia-oc/photos

# Aggiungi foto e config
# Poi lancia:
node src/cli/analyze.js analyze data/open-calls/mia-oc/
```

## Struttura Progetto

```
photo-open-call-analyzer/
├── CLAUDE.md                 # Questo file
├── package.json              # Dipendenze Node.js
├── .claude/
│   ├── agents/               # Definizioni agenti
│   │   ├── art-critic.md
│   │   ├── project-owner.md
│   │   ├── dev.md
│   │   ├── designer.md
│   │   └── qa.md
│   └── workflows/            # Workflow riusabili
│       └── analyze-open-call.md
├── src/                      # Codice sorgente
│   ├── analysis/             # Logica analisi foto
│   │   ├── photo-analyzer.js # Core con Ollama/LLaVA
│   │   ├── prompt-generator.js
│   │   └── score-aggregator.js
│   ├── processing/           # Batch processing
│   ├── output/               # Generazione report
│   ├── cli/                  # Comandi CLI
│   └── utils/
│       ├── api-client.js     # Client Ollama
│       ├── file-utils.js
│       └── logger.js
├── data/
│   ├── open-calls/           # Progetti per open call
│   │   └── {nome-call}/
│   │       ├── open-call.json # Config
│   │       ├── photos/       # Foto da analizzare
│   │       └── results/      # Risultati
│   └── test-photos/          # Foto di test
├── tests/                    # Test automatici
└── docs/                     # Documentazione
```

## Convenzioni

### Naming
- File: kebab-case (`photo-analyzer.js`)
- Variabili/funzioni: camelCase (`analyzePhoto`)
- Classi: PascalCase (`PhotoAnalyzer`)
- Costanti: UPPER_SNAKE (`MAX_CONCURRENT`)

### Codice
- JavaScript con ESM (type: module)
- Async/await per operazioni asincrone
- Error handling esplicito
- Logging strutturato con chalk

### Commit
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`
- Messaggi in inglese
- Reference issue se applicabile

## Dipendenze Principali

```json
{
  "ollama": "Client per Ollama (LLaVA vision)",
  "sharp": "Processing immagini",
  "commander": "CLI",
  "chalk": "Colored output",
  "ora": "Spinners"
}
```

## Variabili d'Ambiente

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | URL Ollama |
| `OLLAMA_MODEL` | `llava:7b` | Modello vision |

## Comandi Utili

```bash
# Analisi
node src/cli/analyze.js analyze-single ./foto.jpg
node src/cli/analyze.js analyze ./data/open-calls/mia-oc/
node src/cli/analyze.js validate ./data/open-calls/mia-oc/photos/

# Test
npm test
```

## Note per gli Agenti

### Art Critic
- Focus su analisi qualitativa e criteri
- Non modificare codice
- Salvare output in `data/open-calls/{nome}/`

### Dev
- Implementare in `src/`
- Scrivere test per ogni modulo critico
- Documentare API pubbliche
- Usare Ollama per analisi immagini

### Designer
- Specifiche in `docs/design/`
- Non scrivere codice, solo specifiche
- Focus su visualizzazione risultati

### QA
- Test in `tests/`
- Bug report in `docs/bugs/`
- Coverage target: 80%+

### Project Owner
- Tracking in `ROADMAP.md`, `BACKLOG.md`
- Coordinare tra agenti
- Decisioni documentate
