# Workflow: Analyze Open Call

Questo workflow guida l'intero processo di analisi di una open call fotografica, dalla raccolta dei metadata alla generazione della classifica finale.

## Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. SETUP       │ --> │  2. ANALYSIS    │ --> │  3. RANKING     │
│  Project Owner  │     │  Art Critic     │     │  Art Critic     │
│  + Art Critic   │     │  + Dev          │     │  + Dev          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        v                       v                       v
   project-brief.md      photo-scores.json      final-ranking.md
```

## Fase 1: Setup (Project Owner + Art Critic)

### Step 1.1: Inizializza Progetto
**Owner**: Project Owner
**Comando**: `[NP] New Project`

```
Input:
- Nome open call
- URL (se disponibile)
- Deadline
- Numero foto da analizzare

Output:
- data/open-calls/{nome}/project-brief.md
```

### Step 1.2: Raccogli Metadata Open Call
**Owner**: Art Critic
**Comando**: `[AO] Analyze Open Call`

```
Input (da raccogliere):
- Tema completo e descrizione
- Chi sono i giurati
- Vincitori edizioni precedenti (se disponibili)
- Organizzatore e tipo di premio

Output:
- data/open-calls/{nome}/open-call-analysis.md
```

### Step 1.3: Genera Prompt di Analisi
**Owner**: Art Critic
**Comando**: `[GP] Generate Prompt`

```
Input:
- Analisi open call (step 1.2)

Output:
- data/open-calls/{nome}/photo-analysis-prompt.md
```

## Fase 2: Analysis (Dev + Art Critic)

### Step 2.1: Setup Tecnico
**Owner**: Dev
**Comando**: `[API] Setup API`

```
Prerequisiti:
- ANTHROPIC_API_KEY configurata
- Dipendenze installate (npm install)

Verifica:
- Connessione API funzionante
- Modello vision disponibile
```

### Step 2.2: Carica Foto
**Owner**: Dev

```
Input:
- Path cartella foto: data/open-calls/{nome}/photos/

Validazione:
- Formati supportati (jpg, png, webp)
- Dimensioni accettabili
- Nessun file corrotto
```

### Step 2.3: Analizza Foto
**Owner**: Dev
**Comando**: `[IM] Implement` (se non ancora implementato)

```
Per ogni foto:
1. Carica immagine
2. Invia a Claude Vision con prompt da step 1.3
3. Parsea risposta JSON
4. Salva score e feedback

Output:
- data/open-calls/{nome}/scores/{filename}.json
```

### Step 2.4: QA Check
**Owner**: QA
**Comando**: `[RT] Run Tests`

```
Verifica:
- Tutte le foto processate
- Score nel range valido (1-10)
- Nessun errore silenzioso
- Feedback coerente con score
```

## Fase 3: Ranking (Art Critic + Dev)

### Step 3.1: Aggrega Risultati
**Owner**: Dev

```
Input:
- Tutti i file scores/*.json

Output:
- data/open-calls/{nome}/aggregated-scores.json
```

### Step 3.2: Genera Classifica
**Owner**: Art Critic
**Comando**: `[CR] Create Ranking`

```
Input:
- aggregated-scores.json
- Numero di foto da selezionare per submission

Output:
- data/open-calls/{nome}/final-ranking.md
```

### Step 3.3: Export Report
**Owner**: Dev

```
Formati disponibili:
- Markdown (default)
- JSON
- CSV

Output:
- data/open-calls/{nome}/report.{format}
```

## File Structure Finale

```
data/open-calls/{nome-call}/
├── project-brief.md           # Setup iniziale
├── open-call-analysis.md      # Analisi Art Critic
├── photo-analysis-prompt.md   # Prompt per Claude Vision
├── photos/                    # Foto da analizzare
│   ├── photo1.jpg
│   ├── photo2.jpg
│   └── ...
├── scores/                    # Score individuali
│   ├── photo1.json
│   ├── photo2.json
│   └── ...
├── aggregated-scores.json     # Score aggregati
├── final-ranking.md           # Classifica finale
└── report.md                  # Report esportabile
```

## Checklist Completa

### Setup
- [ ] Progetto inizializzato (Project Owner)
- [ ] Metadata open call raccolti (Art Critic)
- [ ] Prompt analisi generato (Art Critic)
- [ ] API configurata (Dev)
- [ ] Foto caricate nella cartella corretta

### Analysis
- [ ] Tutte le foto validate
- [ ] Analisi completata senza errori
- [ ] Score salvati correttamente
- [ ] QA check passato

### Ranking
- [ ] Risultati aggregati
- [ ] Classifica generata
- [ ] Report esportato
- [ ] Review finale completata

## Comandi Rapidi

```bash
# Inizia nuovo progetto
claude "Usa project-owner per iniziare un nuovo progetto per l'open call X"

# Analizza open call
claude "Usa art-critic per analizzare questa open call: [dettagli]"

# Processa foto
claude "Usa dev per analizzare le foto in data/open-calls/X/photos/"

# Genera ranking
claude "Usa art-critic per generare la classifica finale"
```

## Troubleshooting

### Errore: API Timeout
- Aumenta timeout in config
- Riduci concurrency
- Riprova foto fallite singolarmente

### Errore: Score Inconsistenti
- Verifica prompt analisi con Art Critic
- Controlla se criterio e ambiguo
- Rigenera prompt se necessario

### Errore: Foto Non Processata
- Verifica formato supportato
- Controlla dimensione file
- Valida che immagine non sia corrotta
