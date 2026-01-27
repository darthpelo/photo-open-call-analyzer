# Photo Open Call Analyzer

Sistema multi-agente per analizzare foto candidate a open call fotografiche e generare una classifica basata sui criteri specifici della competizione.

## Descrizione Progetto

Questo tool aiuta fotografi a selezionare le migliori foto da sottomettere a open call, analizzando:
- Il tema e i requisiti della open call
- I gusti della giuria (basati su vincitori passati)
- Ogni foto candidata rispetto ai criteri identificati

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
2. Analysis   → Dev processa foto con Claude Vision
3. Ranking    → Art Critic genera classifica finale
```

## Quick Start

### 1. Configura API Key
```bash
export ANTHROPIC_API_KEY=your-key-here
```

### 2. Installa Dipendenze
```bash
npm install
```

### 3. Inizia Nuovo Progetto
```
Usa project-owner per iniziare un nuovo progetto per l'open call "Nome Open Call"
```

### 4. Analizza Open Call
```
Usa art-critic per analizzare questa open call:
- Tema: ...
- Giuria: ...
- Vincitori passati: ...
```

### 5. Processa Foto
```
Usa dev per analizzare le foto in data/open-calls/{nome}/photos/
```

### 6. Genera Ranking
```
Usa art-critic per generare la classifica finale
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
│   ├── processing/           # Batch processing
│   └── output/               # Generazione report
├── data/
│   ├── open-calls/           # Progetti per open call
│   │   └── {nome-call}/
│   │       ├── photos/       # Foto da analizzare
│   │       ├── scores/       # Risultati analisi
│   │       └── *.md          # Documenti progetto
│   └── photos/               # Cartella foto generica
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
- JavaScript/TypeScript con ESM
- Async/await per operazioni asincrone
- Error handling esplicito
- Logging strutturato

### Commit
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`
- Messaggi in inglese
- Reference issue se applicabile

## Dipendenze Principali

```json
{
  "@anthropic-ai/sdk": "Analisi immagini con Claude Vision",
  "sharp": "Processing immagini",
  "exif-reader": "Lettura metadata EXIF",
  "commander": "CLI"
}
```

## Comandi Utili

```bash
# Sviluppo
npm run dev          # Avvia in development
npm run build        # Build produzione
npm test             # Esegui test

# Analisi
npm run analyze      # Analizza foto (dopo setup)
npm run report       # Genera report
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
