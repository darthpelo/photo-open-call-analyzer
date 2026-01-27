# GitHub Copilot Integration Guide

**AI Assistant**: GitHub Copilot (Claude Haiku 4.5)

Questo file descrive come usare GitHub Copilot per sviluppare il Photo Open Call Analyzer.

## Ruolo di Copilot nel Progetto

Copilot agisce come **lead developer** che implementa, testa, debugga e documenta il progetto secondo le specifiche definite dagli agenti multi-ruolo in CLAUDE.md.

## Flusso di Lavoro

### 1. Richieste di Implementazione
Quando chiedi a Copilot di:
- **Implementare feature** → Legge CLAUDE.md, capisce architettura, scrive codice conforme
- **Analizzare progetto** → Esamina tutti i file, produce analisi accurata
- **Debuggare** → Usa get_errors, grep_search, read_file per diagnosticare
- **Testare** → Crea test suite, valida, riporta risultati

### 2. Convenzioni di Riferimento

Quando comunichi con Copilot, puoi:

```bash
# Riferire a file markdown per context
"Basandoti su CLAUDE.md..."
"Secondo ROADMAP.md..."
"Vedi QUICKSTART.md per..."

# Riferire a specifici agenti
"Art Critic dovrebbe..."
"Dev deve implementare..."
"QA dovrebbe testare..."

# Riferire a specifiche milestone
"Per Milestone 2..."
"MVP (M1) richiede..."
```

### 3. Comandi Frequenti

```bash
# Analizzare stato
"Qual è lo stato attuale del progetto?"
"Che punto siamo secondo i file markdown?"

# Implementare
"Implementa [feature] per Milestone 2"
"Crea il modulo per [componente]"

# Testare
"Scrivi test per [modulo]"
"Valida la implementazione di [feature]"

# Documentare
"Aggiorna la documentazione per [aspetto]"
"Crea guida per [funzionalità]"

# Debuggare
"Perché [comando] non funziona?"
"Trova il bug in [file]"
```

## Stack Attuale (Ollama)

Copilot implementa per:
- **Backend**: Node.js 20+
- **Vision**: Ollama + LLaVA 7B (locale)
- **CLI**: commander.js
- **Testing**: Jest
- **UI**: Terminal (chalk, ora)
- **Reports**: Markdown, JSON, CSV

## Struttura Codice Aspettata

Copilot scrive codice seguendo:

```javascript
// Pattern: ESM modules
import { function } from '../utils/module.js';
export async function analyzePhoto(photo, config) {
  // 1. Validazione input
  // 2. Logging
  // 3. Elaborazione
  // 4. Error handling
  // 5. Return strutturato
}

// Test: Jest con async support
describe('Feature', () => {
  test('case', async () => {
    expect(...).toBe(...);
  });
});
```

## Convenzioni Collab Copilot-Agenti

| Agente | Chiede a Copilot | Copilot Fa |
|--------|------------------|-----------|
| **Art Critic** | Valuta foto con criterio X | Implementa score-aggregator |
| **Project Owner** | "Quando finisce M2?" | Controlla ROADMAP, riporta |
| **Dev** | "Implementa feature X" | Crea modulo, testa, documenta |
| **Designer** | "Mockup per UI?" | Non suo ruolo (frontend dopo) |
| **QA** | "Test coverage?" | Crea test suite, riporta risultati |

## File da Considerare Sempre

Quando Copilot esegue task, dovrebbe controllare:

```
✓ CLAUDE.md          → Contesto generale, agenti
✓ ROADMAP.md         → Milestone target, timeline
✓ BACKLOG.md         → Priority, task assignment
✓ QUICKSTART.md      → Setup, uso
✓ package.json       → Dipendenze attuali
✓ src/               → Architettura codice
✓ tests/             → Coverage test
```

## Quando Usare Copilot

**PERFECT FOR**:
- ✅ Implementazione codice
- ✅ Test automatici
- ✅ Debugging issues
- ✅ Refactoring
- ✅ Documentazione codice
- ✅ Ottimizzazioni
- ✅ Code review suggerimenti

**NOT FOR**:
- ❌ Decisioni strategiche (chiedi a Project Owner)
- ❌ Aesthetic design (chiedi a Designer)
- ❌ Valutazione foto (chiedi a Art Critic)
- ❌ Requisiti business (chiedi a Project Owner)

## Linee Guida Importante

1. **Sempre leggere i file markdown** prima di implementare
2. **Seguire convenzioni** nel codice esistente (kebab-case files, camelCase functions)
3. **Scrivere test** contemporaneamente al codice
4. **Aggiornare docs** dopo implementazione
5. **Chiedere chiarimento** se requirements sono ambigui
6. **Preservare git history** con commit messaggi chiari

## Esempi di Richieste Efficaci

### ❌ Vago
"Aggiungi una feature"

### ✅ Specifico
"Basandoti su ROADMAP.md Milestone 2, implementa il config file system per `open-call.json` con schema di validazione, includi test, aggiorna QUICKSTART.md"

---

### ❌ Vago
"Fix il bug"

### ✅ Specifico
"Il comando `npm run analyze` fallisce con 'ENOENT'. Debugga usando get_errors e grep_search, identifica la root cause, proponi fix con test."

---

### ❌ Vago
"Testa il codice"

### ✅ Specifico
"Scrivi unit test per `src/analysis/photo-analyzer.js` con coverage delle path di errore, mock Ollama client, includi 5+ test cases."

## Report di Stato Atteso

Quando completi task, Copilot dovrebbe sempre:

```
✅ TASK COMPLETED

What: [Breve descrizione]
Files: [File modificati/creati]
Tests: [N test, tutti passing]
Docs: [Aggiornamenti documentazione]
Notes: [Considerazioni importanti]
Next: [Prossimo step suggerito]
```

## Integrazione GitHub

Quando lavori con Git:
- Leggi BACKLOG.md per task assignment
- Crea branch: `feature/[milestone]-[task]`
- Commit message: `feat(M2): [descrizione]` o `fix(module): [descrizione]`
- Pull request con link a ROADMAP.md

---

**Questo file è il "manuale operativo" per collaborare con Copilot su questo progetto.**

Aggiornalo se cambiano processi, strumenti, o convenzioni.

Last Updated: 2026-01-27
Status: Active ✅
