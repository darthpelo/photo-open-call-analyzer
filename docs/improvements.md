Photo-Open-Call-Analyzer

Manuale Completo di Revisione, Miglioramento e Uso

⸻

Indice
	1.	Introduzione: Scopo e Visione￼
	2.	Architettura Concettuale￼
	3.	Modello di Valutazione￼
	4.	Template Standardizzati￼
	5.	Profili Giuria e Pattern Visivi￼
	6.	Workflow Operativo￼
	7.	Output Interpretabile￼
	8.	Benchmarking e Calibrazione￼
	9.	Check-List Operativa per Ogni Open Call￼
	10.	Esempi di JSON Compilati per Bandi RealI￼
	11.	Appendici: Prompt Ottimizzati￼

⸻

Introduzione: Scopo e Visione

Il progetto Photo-Open-Call-Analyzer è un sistema avanzato di supporto alla selezione fotografica per open call. Combina regole formali, modelli di valutazione, analisi semantica dei bandi e profili giuria, con output dettagliati per report, titoli, descrizioni e compliance submission.

Obiettivo:
	•	Ridurre l’incertezza interpretativa sui criteri dei bandi
	•	Allineare foto con tema e giuria
	•	Produrre output coerenti, interpretati e giustificati

Risolve problemi reali di workflow curatoriale e quantitativo nelle open call fotografiche.

⸻

Architettura Concettuale

Moduli Principali

Modulo	Funzione	Output
Bando Parser	Legge il testo del bando e ne estrae criteri, requisiti tecnici e profilo giuria	JSON bando
Giuria Analyzer	Analizza profilo giuria e pattern stilistici	Profilo strutturato
Image Evaluator	Valuta ogni foto multimetricamente	Score e spiegazioni
Set Optimizer	Seleziona il set ottimale per submission	Set finale
Compliance Checker	Verifica requisiti formali	Lista compliance
Title/Desc Generator	Genera testi coerenti con tema e tone of voice	Titoli & descrizioni
Report Converter	Produce report Markdown/PDF/JSON	Documentazione finale


⸻

Modello di Valutazione

Criteri Principali

Ogni foto viene valutata su queste dimensioni, con punteggio da 0 a 10:
	1.	Theme Fit – allineamento col tema principale
	2.	Technical Quality – nitidezza, esposizione, editing
	3.	Originality/Artistic Vision – innovazione estetica e concettuale
	4.	Narrative Strength – capacità di raccontare visivamente
	5.	Jury Fit – coerenza con profilo giuria/pattern

Tabelle di Peso Standard

Criterio	Peso (%)
Theme Fit	40
Technical Quality	20
Originality	15
Narrative Strength	15
Jury Fit	10

Formula di Punteggio

ScoreTotal = Σ (score_i × peso_i)


⸻

Template Standardizzati

Bando Open Call Schema (JSON)

{
  "title": "string",
  "theme": "string",
  "requirements": {
    "shotsAllowed": "number|string",
    "mediaTypes": ["string"],
    "fees": "free|paid"
  },
  "jurors": [
    {
      "name": "string",
      "role": "string",
      "knownPreferences": ["string"]
    }
  ],
  "profileTraits": ["string"],
  "pastWinnersTraits": ["string"],
  "submissionDetails": {
    "deadline": "YYYY-MM-DD",
    "format": "jpg|jpeg|png",
    "sizeLimitMB": number
  }
}


⸻

Profili Giuria e Pattern Visivi

Il sistema costruisce pattern visivi partendo da profili giuria:

Pattern	Indicatore
Documentary	Presenza di giurati con background documentaristico
Fashion	Editor moda / estetica curata
Sociocultural	Interesse verso temi sociali
Concept Recurring	Approcci concettuali replicati tra vincitori


⸻

Workflow Operativo
	1.	Cataloga bando con Bando Parser
	2.	Estrai profilo giuria con Giuria Analyzer
	3.	Evalua foto singole col Image Evaluator
	4.	Ottimizza set con Set Optimizer
	5.	Verifica compliance con Compliance Checker
	6.	Genera testo con Title/Desc Generator
	7.	Esporta report con Report Converter

⸻

Output Interpretabile

Ogni report deve includere:
	•	Break-down punteggi
	•	Argomentazioni concise per ogni foto
	•	Titoli e descrizioni conformi
	•	Lista di compliance completa
	•	Set finale suggerito per submission

⸻

Benchmarking e Calibrazione

Inserire set di foto baseline con pattern noti (es. documentario purista vs. moda estetica) per tarare l’evaluator, con misure di accuratezza interne alla pipeline.

⸻

Check-List Operativa per Ogni Open Call

Item	Stato
Comprendere il tema	☐
Verificare requisiti tecnici	☐
Analisi giuria e pattern visivi	☐
Valutazione foto	☐
Creazione set	☐
Titoli & descrizioni	☐
Check compliance formale	☐
Report finale completo	☐


⸻

Esempi di JSON Compilati per Bandi Reali

PhotoVogue Global Open Call 2025

{
  "title": "PhotoVogue Global Open Call 2025",
  "theme": "creative expressions of contemporary identity",
  "requirements": {
    "shotsAllowed": "max 15",
    "mediaTypes": ["photo","short video"],
    "fees": "paid"
  },
  "jurors": [
    {
      "name": "Vogue Editor",
      "role": "editor",
      "knownPreferences": ["fashion aesthetics","diverse narratives"]
    }
  ],
  "profileTraits": ["fashion","conceptual"],
  "pastWinnersTraits": ["experimental portrait","gender narratives"],
  "submissionDetails": {
    "deadline": "2025-11-30",
    "format": "jpg",
    "sizeLimitMB": 10
  }
}


⸻

FE2026 (Fotografia Europea)

{
  "title": "Fotografia Europea FE2026",
  "theme": "perspectives on civic space",
  "requirements": {
    "shotsAllowed": "max 10",
    "mediaTypes": ["photo"],
    "fees": "free"
  },
  "jurors": [
    {
      "name": "Festival Curator",
      "role": "curator",
      "knownPreferences": ["documentary","urban narratives"]
    }
  ],
  "profileTraits": ["documentary","urban"],
  "pastWinnersTraits": ["social reportage","environmental focus"],
  "submissionDetails": {
    "deadline": "2026-02-15",
    "format": "jpg",
    "sizeLimitMB": 8
  }
}


⸻

Appendici: Prompt Ottimizzati

Prompt per Analisi Tema (Margherita)

Analizza il seguente tema e estrai:
- concetti chiave
- possibili pattern visivi
- parole chiave soggette a interpretazione
Rispondi con JSON:
{"key_concepts": [], "visual_keywords": []}


⸻

Prompt per Profilo Giuria (Marco)

Dati i nomi e ruoli dei giurati, identifica pattern stilistici ricorrenti nei loro lavori/vincitori.
Output JSON con:
{"patterns":["documentary","fashion"]}


⸻
