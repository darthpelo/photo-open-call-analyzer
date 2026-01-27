# Photo Open Call Analyzer

Un sistema multi-agente basato su AI per analizzare fotografie candidate a open call e generare classifiche intelligenti basate sui criteri specifici di ogni competizione.

## Il Problema

Partecipare a una open call fotografica richiede di:
1. **Capire cosa cerca la giuria** - Non basta leggere il tema, bisogna interpretare la visione curatoriale
2. **Selezionare le foto giuste** - Tra decine o centinaia di scatti, quali hanno piu possibilita?
3. **Essere oggettivi** - E difficile valutare il proprio lavoro senza bias

## La Soluzione

Photo Open Call Analyzer usa **Ollama con LLaVA** (modello vision locale) e un sistema di **5 agenti specializzati** per:
- Analizzare in profondita i requisiti della open call
- Studiare i vincitori delle edizioni passate per capire i gusti della giuria
- Valutare ogni foto candidata con criteri oggettivi e specifici
- Generare una classifica con feedback dettagliato

**100% locale e gratuito** - Nessuna API key richiesta, nessun costo per analisi.

---

## Come Funziona

### Il Sistema Multi-Agente

Il progetto utilizza 5 agenti AI specializzati che collaborano:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ┌─────────────┐      Coordina      ┌─────────────┐           │
│   │   Marco     │◄──────────────────►│  Margherita │           │
│   │   Project   │                    │  Art Critic │           │
│   │   Owner     │                    │             │           │
│   └──────┬──────┘                    └──────┬──────┘           │
│          │                                  │                   │
│          │ Assegna task            Criteri di valutazione      │
│          │                                  │                   │
│          ▼                                  ▼                   │
│   ┌─────────────┐    Specifiche    ┌─────────────┐             │
│   │    Alex     │◄────────────────►│   Sofia     │             │
│   │    Dev      │                  │   Designer  │             │
│   └──────┬──────┘                  └─────────────┘             │
│          │                                                      │
│          │ Codice da testare                                   │
│          ▼                                                      │
│   ┌─────────────┐                                              │
│   │    Luca     │                                              │
│   │    QA       │                                              │
│   └─────────────┘                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| Agente | Ruolo | Responsabilita |
|--------|-------|----------------|
| **Margherita** (Art Critic) | Esperta di fotografia e open call | Analizza tema, giuria, vincitori passati. Genera criteri di valutazione |
| **Marco** (Project Owner) | Coordinatore | Gestisce priorita, assegna task, traccia il progresso |
| **Alex** (Developer) | Implementazione tecnica | Scrive il codice per l'analisi, batch processing, export |
| **Sofia** (Designer) | UX/UI | Progetta l'interfaccia per visualizzare i risultati |
| **Luca** (QA) | Quality Assurance | Testa il sistema, trova bug, valida gli output |

### Il Workflow di Analisi

```
FASE 1: SETUP                    FASE 2: ANALISI                 FASE 3: RANKING
─────────────────               ─────────────────               ─────────────────

1. Raccogli info OC             4. Carica foto                  7. Aggrega score
   - Tema                          - Validazione                   - Calcola media pesata
   - Giuria
   - Vincitori passati          5. Analizza ogni foto           8. Genera classifica
                                   - LLaVA Vision                  - Ordina per score
2. Analizza visione                - Applica criteri               - Identifica top picks
   curatoriale                     - Genera score
   - Pattern vincitori                                          9. Crea report
   - Red flags                  6. QA check                        - Feedback dettagliato
   - Criteri impliciti             - Valida output                 - Suggerimenti

3. Genera prompt
   - Criteri pesati
   - Domande specifiche
```

---

## Installazione

### Prerequisiti

- **Node.js** v20 o superiore
- **Ollama** installato e funzionante
- **Modello LLaVA** scaricato

### Setup Ollama

1. **Installa Ollama**

   Scarica da https://ollama.com/download oppure:
   ```bash
   brew install ollama
   ```

2. **Avvia Ollama**
   ```bash
   ollama serve
   ```

3. **Scarica il modello LLaVA**
   ```bash
   ollama pull llava:7b
   ```

   | Modello | Size | Qualita | Velocita |
   |---------|------|---------|----------|
   | `moondream` | 1.7GB | ⭐⭐ | Velocissimo |
   | `llava:7b` | 4.7GB | ⭐⭐⭐ | Buona (consigliato) |
   | `llava:13b` | 8GB | ⭐⭐⭐⭐ | Media |
   | `llava-llama3` | 5.5GB | ⭐⭐⭐⭐ | Buona |

### Setup Progetto

1. **Vai nella cartella del progetto**
   ```bash
   cd ~/Projects/photo-open-call-analyzer
   ```

2. **Installa le dipendenze**
   ```bash
   npm install
   ```

3. **Verifica che tutto funzioni**
   ```bash
   node -e "
   import { checkOllamaStatus } from './src/utils/api-client.js';
   const status = await checkOllamaStatus();
   console.log(status.connected ? '✓ Ollama connesso' : '✗ Ollama non raggiungibile');
   console.log('Modello:', status.configuredModel);
   "
   ```

---

## Quick Start

### Analizzare una singola foto

```bash
node src/cli/analyze.js analyze-single ./path/to/photo.jpg
```

### Analizzare un batch di foto

1. **Crea la struttura del progetto**
   ```bash
   mkdir -p data/open-calls/mia-open-call/photos
   ```

2. **Copia le foto da analizzare**
   ```bash
   cp ~/Pictures/selezione/*.jpg data/open-calls/mia-open-call/photos/
   ```

3. **Crea il file di configurazione** `data/open-calls/mia-open-call/open-call.json`:
   ```json
   {
     "title": "LensCulture Portrait Awards 2024",
     "theme": "Portraits that Challenge Perception",
     "jury": ["Martin Parr", "Alessia Glaviano"],
     "pastWinners": "Lavori con forte componente sociale, luce naturale",
     "context": "Competizione internazionale di ritratto"
   }
   ```

4. **Lancia l'analisi**
   ```bash
   node src/cli/analyze.js analyze data/open-calls/mia-open-call/
   ```

5. **Visualizza i risultati**
   I report saranno generati in `./results/`:
   - `photo-analysis.md` - Report Markdown
   - `photo-analysis.json` - Dati strutturati
   - `photo-analysis.csv` - Per Excel/Sheets

---

## Guida all'Uso con Claude Code

Claude Code riconosce automaticamente gli agenti definiti nel progetto.

1. **Avvia Claude Code nella cartella del progetto**
   ```bash
   cd ~/Projects/photo-open-call-analyzer
   claude
   ```

2. **Inizia un nuovo progetto di analisi**
   ```
   Usa project-owner per iniziare un nuovo progetto per l'open call
   "LensCulture Portrait Awards 2024"
   ```

3. **Fornisci i dettagli della open call**
   ```
   Usa art-critic per analizzare questa open call:

   Tema: "Portraits that Challenge Perception"

   Giuria:
   - Martin Parr (Magnum Photos)
   - Alessia Glaviano (Vogue Italia)

   Vincitori 2023:
   - Lavori con forte componente sociale
   - Mix di reportage e ritratto ambientato
   - Preferenza per luce naturale
   ```

4. **Avvia l'analisi**
   ```
   Usa dev per analizzare tutte le foto nella cartella del progetto
   ```

5. **Genera la classifica finale**
   ```
   Usa art-critic per generare la classifica finale.
   Devo selezionare le migliori 5 foto da sottomettere.
   ```

---

## Uso Programmatico

```javascript
import { analyzePhoto } from './src/analysis/photo-analyzer.js';

// Analizza una foto
const result = await analyzePhoto('./photos/portrait-01.jpg', {
  title: 'My Competition',
  theme: 'Urban Portraits',
  criteria: [
    { name: 'Theme Alignment', weight: 30, description: 'Match with theme' },
    { name: 'Technical Quality', weight: 20, description: 'Technical execution' },
    { name: 'Originality', weight: 25, description: 'Unique vision' },
    { name: 'Emotional Impact', weight: 15, description: 'Emotional power' },
    { name: 'Jury Fit', weight: 10, description: 'Jury preferences' }
  ]
});

console.log(result);
// {
//   filename: 'portrait-01.jpg',
//   scores: {
//     individual: {
//       'Theme Alignment': { score: 8, weight: 30 },
//       'Technical Quality': { score: 7, weight: 20 },
//       ...
//     },
//     summary: {
//       weighted_average: 7.8,
//       recommendation: 'Strong Yes'
//     }
//   }
// }
```

---

## Struttura del Progetto

```
photo-open-call-analyzer/
│
├── .claude/                      # Configurazione agenti Claude Code
│   ├── agents/                   # Definizioni dei 5 agenti
│   │   ├── art-critic.md        # Margherita - analisi artistica
│   │   ├── project-owner.md     # Marco - coordinamento
│   │   ├── dev.md               # Alex - sviluppo
│   │   ├── designer.md          # Sofia - UX/UI
│   │   └── qa.md                # Luca - testing
│   └── workflows/                # Workflow riusabili
│       └── analyze-open-call.md
│
├── src/                          # Codice sorgente
│   ├── analysis/                 # Core analisi
│   │   ├── photo-analyzer.js    # Analisi con Ollama/LLaVA
│   │   ├── prompt-generator.js  # Generazione criteri
│   │   └── score-aggregator.js  # Aggregazione score
│   ├── processing/
│   │   └── batch-processor.js   # Processing multiplo
│   ├── output/
│   │   └── report-generator.js  # Export report
│   ├── cli/
│   │   └── analyze.js           # Comandi CLI
│   └── utils/
│       ├── api-client.js        # Client Ollama
│       ├── file-utils.js        # Utility file
│       └── logger.js            # Logging
│
├── data/                         # Dati progetto
│   └── open-calls/               # Un folder per ogni OC
│       └── {nome-open-call}/
│           ├── open-call.json        # Configurazione
│           ├── analysis-prompt.json  # Prompt generato
│           ├── photos/               # Foto da analizzare
│           └── results/              # Risultati
│
├── CLAUDE.md                     # Contesto per Claude Code
├── ROADMAP.md                    # Vision e milestone
├── BACKLOG.md                    # Task prioritizzati
├── package.json
└── README.md                     # Questo file
```

---

## Configurazione

### Variabili d'Ambiente

| Variabile | Descrizione | Default |
|-----------|-------------|---------|
| `OLLAMA_HOST` | URL di Ollama | `http://localhost:11434` |
| `OLLAMA_MODEL` | Modello vision da usare | `llava:7b` |

### Cambiare Modello

Per usare un modello diverso:

```bash
# Scarica il modello
ollama pull llava:13b

# Usa il modello
OLLAMA_MODEL=llava:13b node src/cli/analyze.js analyze ./my-project/
```

---

## Criteri di Valutazione

Di default, ogni foto viene valutata su 5 criteri:

| Criterio | Peso | Descrizione |
|----------|------|-------------|
| **Theme Alignment** | 30% | Quanto la foto risponde al brief della open call |
| **Technical Quality** | 20% | Esposizione, fuoco, composizione, post-produzione |
| **Originality** | 25% | Unicita della visione, approccio non convenzionale |
| **Emotional Impact** | 15% | Capacita di coinvolgere, memorabilita |
| **Jury Fit** | 10% | Allineamento con i gusti dei giurati |

I criteri sono personalizzabili nel file `open-call.json` di ogni progetto.

---

## Output di Esempio

### Analisi Singola Foto

```
=== ANALYSIS RESULT ===
Filename: portrait-01.jpg
Model: llava:7b

Scores: {
  "weighted_average": 7.8,
  "average": 7.8,
  "recommendation": "Strong Yes - This image demonstrates strong technical
  execution and emotional impact."
}

Individual: {
  "Theme Alignment": { "score": 7, "weight": 30 },
  "Technical Quality": { "score": 8, "weight": 20 },
  "Originality": { "score": 8, "weight": 25 },
  "Emotional Impact": { "score": 9, "weight": 15 },
  "Jury Fit": { "score": 7, "weight": 10 }
}
```

### Report Markdown

Il report finale include:
- Classifica ordinata per score
- Breakdown per criterio
- Raccomandazioni (Strong Yes / Yes / Maybe / No)
- Statistiche aggregate
- Top picks consigliati

---

## Performance

| Operazione | Tempo Stimato |
|------------|---------------|
| Analisi singola foto | 15-30 secondi |
| Batch 10 foto | 3-5 minuti |
| Batch 50 foto | 15-25 minuti |

*Tempi basati su MacBook Pro M1 con LLaVA 7B*

---

## Troubleshooting

### Ollama non raggiungibile

```bash
# Verifica che Ollama sia in esecuzione
curl http://localhost:11434/api/tags

# Se non risponde, avvia Ollama
ollama serve
```

### Modello non trovato

```bash
# Lista modelli installati
ollama list

# Scarica il modello mancante
ollama pull llava:7b
```

### Analisi lenta

- Usa un modello piu leggero: `moondream` invece di `llava:13b`
- Riduci la risoluzione delle foto prima dell'analisi
- Aumenta la RAM disponibile per Ollama

---

## Roadmap

### v1.0 - MVP ✅
- [x] Struttura progetto e agenti
- [x] Integrazione Ollama/LLaVA
- [x] Photo analyzer funzionante
- [x] CLI base
- [x] Export Markdown/JSON/CSV

### v1.1 - Miglioramenti
- [ ] Web UI per risultati
- [ ] Comparazione side-by-side
- [ ] Resume analisi interrotta
- [ ] Supporto RAW files

### v2.0 - Avanzato
- [ ] Memoria storica vincitori
- [ ] Suggerimenti miglioramento foto
- [ ] Integrazione piattaforme (Picter, PhotoShelter)

---

## Stack Tecnologico

- **Runtime**: Node.js 20+
- **AI Vision**: Ollama + LLaVA
- **CLI**: Commander.js
- **Logging**: Chalk + Ora
- **Agenti**: Claude Code custom agents

---

## Licenza

MIT License

---

## Crediti

- Powered by [Ollama](https://ollama.com) e [LLaVA](https://llava-vl.github.io/)
- Ispirato da [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)
- Sviluppato con [Claude Code](https://claude.ai/code)

---

*Fatto con passione per i fotografi che vogliono massimizzare le loro chance nelle open call.*
