# Photo Open Call Analyzer

Un sistema multi-agente basato su AI per analizzare fotografie candidate a open call e generare classifiche intelligenti basate sui criteri specifici di ogni competizione.

## Il Problema

Partecipare a una open call fotografica richiede di:
1. **Capire cosa cerca la giuria** - Non basta leggere il tema, bisogna interpretare la visione curatoriale
2. **Selezionare le foto giuste** - Tra decine o centinaia di scatti, quali hanno piu possibilita?
3. **Essere oggettivi** - E difficile valutare il proprio lavoro senza bias

## La Soluzione

Photo Open Call Analyzer usa **Claude Vision** e un sistema di **5 agenti specializzati** per:
- Analizzare in profondita i requisiti della open call
- Studiare i vincitori delle edizioni passate per capire i gusti della giuria
- Valutare ogni foto candidata con criteri oggettivi e specifici
- Generare una classifica con feedback dettagliato

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
| **Margherita** (Art Critic) | Esperta di fotografia e open call | Analizza tema, giuria, vincitori passati. Genera criteri di valutazione e prompt per l'analisi delle foto |
| **Marco** (Project Owner) | Coordinatore | Gestisce priorita, assegna task, traccia il progresso |
| **Alex** (Developer) | Implementazione tecnica | Scrive il codice per l'analisi con Claude Vision, batch processing, export |
| **Sofia** (Designer) | UX/UI | Progetta l'interfaccia per visualizzare i risultati |
| **Luca** (QA) | Quality Assurance | Testa il sistema, trova bug, valida gli output |

### Il Workflow di Analisi

```
FASE 1: SETUP                    FASE 2: ANALISI                 FASE 3: RANKING
─────────────────               ─────────────────               ─────────────────

1. Raccogli info OC             4. Carica foto                  7. Aggrega score
   - Tema                          - Validazione                   - Calcola media pesata
   - Giuria                        - Lettura EXIF
   - Vincitori passati                                          8. Genera classifica
                                5. Analizza ogni foto              - Ordina per score
2. Analizza visione                - Claude Vision                 - Identifica top picks
   curatoriale                     - Applica criteri
   - Pattern vincitori             - Genera score              9. Crea report
   - Red flags                                                     - Feedback dettagliato
   - Criteri impliciti          6. QA check                        - Suggerimenti
                                   - Valida output
3. Genera prompt                   - Test edge case
   - Criteri pesati
   - Domande specifiche
```

---

## Installazione

### Prerequisiti

- **Node.js** v20 o superiore
- **Account Anthropic** con API key
- **Claude Code** installato (opzionale ma consigliato)

### Setup

1. **Clona o scarica il progetto**
   ```bash
   cd ~/Projects/photo-open-call-analyzer
   ```

2. **Installa le dipendenze**
   ```bash
   npm install
   ```

3. **Configura l'API key di Anthropic**

   Crea un file `.env` nella root del progetto:
   ```bash
   echo "ANTHROPIC_API_KEY=your-api-key-here" > .env
   ```

   Oppure esporta come variabile d'ambiente:
   ```bash
   export ANTHROPIC_API_KEY=your-api-key-here
   ```

4. **Verifica l'installazione**
   ```bash
   npm test
   ```

---

## Guida all'Uso

### Metodo 1: Con Claude Code (Consigliato)

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
   - Simon Norfolk (photographer)

   Vincitori 2023:
   - Lavori con forte componente sociale
   - Mix di reportage e ritratto ambientato
   - Preferenza per luce naturale

   URL: https://www.lensculture.com/portrait-awards
   ```

4. **Carica le foto da analizzare**
   ```
   Copia le foto nella cartella:
   data/open-calls/lensculture-portrait-2024/photos/
   ```

5. **Avvia l'analisi**
   ```
   Usa dev per analizzare tutte le foto nella cartella del progetto
   ```

6. **Genera la classifica finale**
   ```
   Usa art-critic per generare la classifica finale.
   Devo selezionare le migliori 5 foto da sottomettere.
   ```

### Metodo 2: Via CLI (Dopo Implementazione)

```bash
# Crea nuovo progetto
npm run new-project -- --name "Sony World Photography" --deadline "2024-03-15"

# Analizza open call (interattivo)
npm run analyze-oc

# Processa foto
npm run analyze -- --input ./data/open-calls/sony-2024/photos/

# Genera report
npm run report -- --format markdown --top 10
```

### Metodo 3: Programmatico

```javascript
import { PhotoAnalyzer } from './src/analysis/photo-analyzer.js';
import { CriteriaParser } from './src/analysis/criteria-parser.js';

// Carica i criteri generati dall'Art Critic
const criteria = await CriteriaParser.load('./data/open-calls/sony-2024/criteria.json');

// Inizializza l'analizzatore
const analyzer = new PhotoAnalyzer({
  apiKey: process.env.ANTHROPIC_API_KEY,
  criteria: criteria,
  model: 'claude-sonnet-4-20250514'
});

// Analizza una foto
const result = await analyzer.analyzePhoto('./photos/portrait-01.jpg');

console.log(result);
// {
//   filename: 'portrait-01.jpg',
//   scores: {
//     tema: 8.5,
//     tecnica: 7.0,
//     originalita: 9.0,
//     impatto: 8.0,
//     giuria_fit: 7.5
//   },
//   totalScore: 8.1,
//   feedback: "Ottima interpretazione del tema...",
//   strengths: ["Composizione originale", "Forte impatto emotivo"],
//   improvements: ["La luce potrebbe essere piu curata"]
// }
```

---

## Struttura del Progetto

```
photo-open-call-analyzer/
│
├── .claude/                      # Configurazione agenti Claude
│   ├── agents/                   # Definizioni dei 5 agenti
│   │   ├── art-critic.md        # Margherita - analisi artistica
│   │   ├── project-owner.md     # Marco - coordinamento
│   │   ├── dev.md               # Alex - sviluppo
│   │   ├── designer.md          # Sofia - UX/UI
│   │   └── qa.md                # Luca - testing
│   └── workflows/                # Workflow riusabili
│       └── analyze-open-call.md # Workflow principale
│
├── src/                          # Codice sorgente
│   ├── analysis/                 # Core analisi
│   │   ├── photo-analyzer.js    # Analisi con Claude Vision
│   │   ├── criteria-parser.js   # Parsing criteri
│   │   └── scorer.js            # Sistema di scoring
│   ├── processing/               # Elaborazione
│   │   ├── image-loader.js      # Caricamento immagini
│   │   ├── metadata-reader.js   # Lettura EXIF
│   │   └── batch-processor.js   # Processing multiplo
│   ├── output/                   # Generazione output
│   │   ├── ranking-generator.js # Creazione classifica
│   │   ├── report-builder.js    # Report builder
│   │   └── exporters/           # Export vari formati
│   ├── cli/                      # Comandi CLI
│   └── utils/                    # Utility
│
├── data/                         # Dati progetto
│   └── open-calls/               # Un folder per ogni OC
│       └── {nome-open-call}/
│           ├── project-brief.md      # Brief iniziale
│           ├── open-call-analysis.md # Analisi Art Critic
│           ├── criteria.json         # Criteri di valutazione
│           ├── photos/               # Foto da analizzare
│           ├── scores/               # Risultati analisi
│           └── final-ranking.md      # Classifica finale
│
├── tests/                        # Test automatici
│   └── plans/                    # Piani di test
│
├── docs/                         # Documentazione
│   ├── design/                   # Specifiche design
│   └── bugs/                     # Bug report
│
├── CLAUDE.md                     # Contesto per Claude Code
├── ROADMAP.md                    # Vision e milestone
├── BACKLOG.md                    # Task prioritizzati
├── package.json                  # Dipendenze Node.js
├── .gitignore
└── README.md                     # Questo file
```

---

## Configurazione

### Variabili d'Ambiente

| Variabile | Descrizione | Default |
|-----------|-------------|---------|
| `ANTHROPIC_API_KEY` | API key di Anthropic | (obbligatorio) |
| `CLAUDE_MODEL` | Modello da usare per l'analisi | `claude-sonnet-4-20250514` |
| `MAX_CONCURRENT` | Richieste parallele max | `3` |
| `ANALYSIS_TIMEOUT` | Timeout per foto (ms) | `60000` |

### File di Configurazione

Crea `config.json` nella root per personalizzare:

```json
{
  "analysis": {
    "model": "claude-sonnet-4-20250514",
    "maxConcurrent": 3,
    "timeout": 60000,
    "retryAttempts": 3
  },
  "scoring": {
    "weights": {
      "tema": 0.30,
      "tecnica": 0.20,
      "originalita": 0.25,
      "impatto": 0.15,
      "giuria_fit": 0.10
    }
  },
  "output": {
    "defaultFormat": "markdown",
    "includeImages": true,
    "language": "it"
  }
}
```

---

## Criteri di Valutazione

Di default, ogni foto viene valutata su 5 criteri (personalizzabili per ogni open call):

| Criterio | Peso | Descrizione |
|----------|------|-------------|
| **Aderenza al Tema** | 30% | Quanto la foto risponde al brief della open call |
| **Qualita Tecnica** | 20% | Esposizione, fuoco, composizione, post-produzione |
| **Originalita** | 25% | Unicita della visione, approccio non convenzionale |
| **Impatto Emotivo** | 15% | Capacita di coinvolgere, memorabilita |
| **Fit con la Giuria** | 10% | Allineamento con i gusti dei giurati (basato su vincitori passati) |

L'Art Critic puo modificare questi pesi e aggiungere criteri specifici in base all'analisi della open call.

---

## Output di Esempio

### Analisi Singola Foto

```markdown
## portrait-street-01.jpg

### Score: 8.2/10

| Criterio | Score | Note |
|----------|-------|------|
| Tema | 9/10 | Interpreta perfettamente il concetto di resilienza |
| Tecnica | 7/10 | Buona esposizione, leggero rumore in ombra |
| Originalita | 8/10 | Prospettiva inusuale, buon uso dello spazio negativo |
| Impatto | 9/10 | Sguardo del soggetto molto intenso |
| Giuria | 8/10 | Stile coerente con i vincitori 2023 |

### Feedback
La fotografia cattura efficacemente il tema della resilienza attraverso
lo sguardo determinato del soggetto e l'ambiente urbano che lo circonda.
La composizione e solida, con il soggetto posizionato secondo la regola
dei terzi e lo sfondo sfocato che non distrae.

### Punti di Forza
- Forte connessione emotiva con il soggetto
- Uso efficace della luce naturale laterale
- Storia implicita che invita a saperne di piu

### Aree di Miglioramento
- Il rumore nelle ombre potrebbe essere ridotto
- Considerare un crop piu stretto per aumentare l'intimita
```

### Classifica Finale

```markdown
# Classifica Finale: LensCulture Portrait Awards 2024

Analizzate: 47 foto
Data: 2024-01-15
Criteri: Analisi specifica per questa open call

## Top 5 - Consigliate per Submission

| # | Foto | Score | Motivazione |
|---|------|-------|-------------|
| 1 | portrait-maria-03.jpg | 9.1 | Perfetta aderenza al tema, impatto emotivo eccezionale |
| 2 | street-elderly-07.jpg | 8.7 | Originalita nella prospettiva, storia potente |
| 3 | portrait-worker-12.jpg | 8.5 | Forte fit con la giuria, tecnicamente impeccabile |
| 4 | urban-youth-22.jpg | 8.3 | Approccio contemporaneo, buon bilanciamento |
| 5 | portrait-street-01.jpg | 8.2 | Solida su tutti i criteri |

## Note Strategiche

Per massimizzare le possibilita di selezione, consiglio di sottomettere:
- Le prime 3 foto come serie coerente (tema: resilienza urbana)
- La foto #4 come wildcard per mostrare versatilita
- La foto #5 come backup se il limite e 5 foto

## Foto da Riconsiderare

Le seguenti foto hanno potenziale ma necessitano ritocchi:
- landscape-city-04.jpg (score 7.1): Ottima ma fuori tema
- portrait-studio-15.jpg (score 6.8): Troppo "commerciale" per questa giuria
```

---

## Roadmap

### v1.0 - MVP (In Sviluppo)
- [x] Struttura progetto e agenti
- [ ] Core photo analyzer con Claude Vision
- [ ] Batch processing base
- [ ] Export Markdown

### v1.1 - Automazione
- [ ] CLI completa
- [ ] Config file per open call
- [ ] Resume analisi interrotta
- [ ] Multi-format export (JSON, CSV)

### v1.2 - UI
- [ ] Web interface per risultati
- [ ] Comparazione side-by-side
- [ ] Drag & drop per riordinare

### v2.0 - Avanzato
- [ ] Memoria storica vincitori
- [ ] Suggerimenti miglioramento foto
- [ ] Integrazione piattaforme (Picter, PhotoShelter)

---

## Contribuire

Il progetto e open source. Per contribuire:

1. Forka il repository
2. Crea un branch per la tua feature (`git checkout -b feature/nuova-feature`)
3. Committa le modifiche (`git commit -m 'Aggiunge nuova feature'`)
4. Pusha il branch (`git push origin feature/nuova-feature`)
5. Apri una Pull Request

### Linee Guida

- Segui le convenzioni di codice esistenti
- Aggiungi test per nuove funzionalita
- Aggiorna la documentazione se necessario
- Usa commit message descrittivi

---

## Licenza

MIT License - vedi [LICENSE](LICENSE) per dettagli.

---

## Crediti

- Powered by [Claude](https://anthropic.com) di Anthropic
- Ispirato da [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)
- Sviluppato con [Claude Code](https://claude.ai/code)

---

## Supporto

Per domande o problemi:
- Apri una [Issue](https://github.com/your-repo/issues) su GitHub
- Consulta la documentazione in `/docs`

---

*Fatto con passione per i fotografi che vogliono massimizzare le loro chance nelle open call.*
