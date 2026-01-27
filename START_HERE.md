# Photo Open Call Analyzer - Start Here

## Status: ✅ READY FOR USE

**Stack**: Node.js + Ollama (LLaVA) - 100% locale e gratuito
**Date**: January 2026

---

## What You Have

Un sistema AI completo per analizzare foto per competizioni fotografiche, usando **Ollama con LLaVA** (modello vision locale).

### Core Features ✓

1. **Ollama/LLaVA Vision Integration**
   - Analisi immagini locale (nessuna API key richiesta)
   - Supporto JPG, PNG, GIF, WebP
   - Scoring intelligente per criterio

2. **Intelligent Analysis Engine**
   - Analisi automatica open call
   - Generazione dinamica prompt
   - Sistema scoring pesato
   - Feedback dettagliato per ogni foto

3. **Batch Processing**
   - Processing parallelo
   - Progress tracking
   - Error handling
   - Scala da 1 a 100+ foto

4. **Comprehensive Reporting**
   - Markdown reports
   - JSON per uso programmatico
   - CSV per spreadsheet

5. **Professional CLI**
   - Interfaccia command-line completa
   - Analisi singola foto
   - Validazione directory

---

## Quick Start

### 1. Verifica Ollama
```bash
ollama list  # Deve mostrare llava:7b
```

Se manca:
```bash
ollama pull llava:7b
```

### 2. Installa Dipendenze
```bash
npm install
```

### 3. Analizza una Foto
```bash
node src/cli/analyze.js analyze-single ./path/to/photo.jpg
```

### 4. Analizza un Progetto
```bash
npm run analyze data/open-calls/nature-wildlife
```

### 5. Vedi Risultati
```bash
cat results/photo-analysis.md
```

---

## Project Structure

```
src/
├── analysis/           # Ollama/LLaVA + scoring
├── processing/         # Batch operations
├── output/             # Report generation
├── cli/                # Command-line interface
└── utils/              # Helpers (api-client, logger)

data/                   # Sample projects + test photos
tests/                  # Test suite
```

---

## How to Use

### Analizzare una Competizione

1. **Crea directory progetto**:
```bash
mkdir -p data/open-calls/my-competition/photos
```

2. **Aggiungi configurazione** (`open-call.json`):
```json
{
  "title": "Your Competition Name",
  "theme": "Photography Theme",
  "jury": ["Expert 1", "Expert 2"],
  "pastWinners": "Description of past winners",
  "context": "Additional details"
}
```

3. **Aggiungi foto** nella subdirectory `photos/`

4. **Lancia analisi**:
```bash
npm run analyze data/open-calls/my-competition
```

5. **Risultati** in `results/`:
- `photo-analysis.md` - Report leggibile
- `photo-analysis.json` - Dati strutturati
- `photo-analysis.csv` - Per Excel/Sheets

---

## Testing

```bash
# Run all tests
npm test

# Run workflow test
node tests/workflow-test.js
```

---

## Documentation

- **[README.md](README.md)** - Documentazione completa
- **[QUICKSTART.md](QUICKSTART.md)** - Guida rapida
- **[ROADMAP.md](ROADMAP.md)** - Future milestones
- **[BACKLOG.md](BACKLOG.md)** - Task tracking

---

## Troubleshooting

**"Ollama non raggiungibile"**
```bash
ollama serve  # Avvia Ollama
```

**"Modello non trovato"**
```bash
ollama pull llava:7b
```

**"No photos found"**
- Verifica che le foto siano in `data/open-calls/[project]/photos/`
- Formati supportati: JPG, PNG, GIF, WebP

---

## Summary

Hai un sistema completo per analizzare competizioni fotografiche usando **Ollama/LLaVA** - completamente locale e gratuito.

```bash
# Inizia subito!
node src/cli/analyze.js analyze-single ./tua-foto.jpg
```

---

**Stack**: Node.js + Ollama/LLaVA
**Status**: ✅ Ready
