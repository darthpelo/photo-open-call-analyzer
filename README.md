# Photo Open Call Analyzer

A multi-agent AI system to analyze photographs submitted to open calls and generate intelligent rankings based on competition-specific evaluation criteria.

## The Problem

Participating in photography open calls requires:
1. **Understanding what the jury is looking for** - It's not just about reading the theme, but interpreting the curatorial vision
2. **Selecting the right photos** - Among dozens or hundreds of shots, which have the best chances?
3. **Being objective** - It's difficult to evaluate your own work without bias

## The Solution

Photo Open Call Analyzer uses **Ollama with LLaVA** (local vision model) and a system of **5 specialized agents** to:
- Deeply analyze open call requirements
- Study past winners to understand jury preferences
- Evaluate each submitted photo with objective, specific criteria
- Generate a ranking with detailed feedback

**100% local and free** - No API key required, no cost per analysis.

---

## How It Works

### The Multi-Agent System

The project uses 5 specialized AI agents that collaborate:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ┌─────────────┐    Coordinates   ┌─────────────┐            │
│   │   Marco     │◄─────────────────►│ Margherita  │            │
│   │   Project   │                   │ Art Critic  │            │
│   │   Owner     │                   │             │            │
│   └──────┬──────┘                   └──────┬──────┘            │
│          │                                 │                    │
│          │ Assigns tasks       Evaluation criteria             │
│          │                                 │                    │
│          ▼                                 ▼                    │
│   ┌─────────────┐    Specs        ┌─────────────┐              │
│   │    Alex     │◄────────────────►│   Sofia     │              │
│   │    Dev      │                  │  Designer   │              │
│   └──────┬──────┘                  └─────────────┘              │
│          │                                                       │
│          │ Code to test                                         │
│          ▼                                                       │
│   ┌─────────────┐                                               │
│   │    Luca     │                                               │
│   │    QA       │                                               │
│   └─────────────┘                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

| Agent | Role | Responsibilities |
|-------|------|------------------|
| **Margherita** (Art Critic) | Photography & open call expert | Analyzes theme, jury, past winners. Generates evaluation criteria |
| **Marco** (Project Owner) | Coordinator | Manages priorities, assigns tasks, tracks progress |
| **Alex** (Developer) | Technical implementation | Writes analysis code, batch processing, export |
| **Sofia** (Designer) | UX/UI | Designs interface for displaying results |
| **Luca** (QA) | Quality Assurance | Tests system, finds bugs, validates output |

### The Analysis Workflow

```
PHASE 1: SETUP                  PHASE 2: ANALYSIS              PHASE 3: RANKING
──────────────                 ──────────────                 ──────────────

1. Gather OC info              4. Load photos                 7. Aggregate scores
   - Theme                        - Validation                   - Calculate weighted avg
   - Jury
   - Past winners             5. Analyze each photo          8. Generate ranking
                                  - LLaVA Vision                 - Sort by score
2. Analyze curatorial            - Apply criteria               - Identify top picks
   vision                         - Generate scores
   - Winner patterns                                          9. Create report
   - Red flags                6. QA check                        - Detailed feedback
   - Implicit criteria            - Validate output              - Suggestions

3. Generate prompt
   - Weighted criteria
   - Specific questions
```

---

## Installation

### Prerequisites

- **Node.js** v20 or higher
- **Ollama** installed and running
- **LLaVA model** downloaded

### Ollama Setup

1. **Install Ollama**

   Download from https://ollama.com/download or:
   ```bash
   brew install ollama
   ```

2. **Start Ollama**
   ```bash
   ollama serve
   ```

3. **Download the LLaVA model**
   ```bash
   ollama pull llava:7b
   ```

   | Model | Size | Quality | Speed |
   |-------|------|---------|-------|
   | `moondream` | 1.7GB | ⭐⭐ | Very fast |
   | `llava:7b` | 4.7GB | ⭐⭐⭐ | Good (recommended) |
   | `llava:13b` | 8GB | ⭐⭐⭐⭐ | Slower |
   | `llava-llama3` | 5.5GB | ⭐⭐⭐⭐ | Good |

### Project Setup

1. **Navigate to project directory**
   ```bash
   cd ~/Projects/photo-open-call-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify everything works**
   ```bash
   node -e "
   import { checkOllamaStatus } from './src/utils/api-client.js';
   const status = await checkOllamaStatus();
   console.log(status.connected ? '✓ Ollama connected' : '✗ Ollama unreachable');
   console.log('Model:', status.configuredModel);
   "
   ```

---

## Quick Start

### Analyze a single photo

```bash
node src/cli/analyze.js analyze-single ./path/to/photo.jpg
```

### Analyze a batch of photos

1. **Create project structure**
   ```bash
   mkdir -p data/open-calls/my-open-call/photos
   ```

2. **Copy photos to analyze**
   ```bash
   cp ~/Pictures/selection/*.jpg data/open-calls/my-open-call/photos/
   ```

3. **Create configuration file** `data/open-calls/my-open-call/open-call.json`:
   ```json
   {
     "title": "LensCulture Portrait Awards 2024",
     "theme": "Portraits that Challenge Perception",
     "jury": ["Martin Parr", "Alessia Glaviano"],
     "pastWinners": "Works with strong social component, natural light",
     "context": "International portrait competition"
   }
   ```

4. **Run analysis**
   ```bash
   node src/cli/analyze.js analyze data/open-calls/my-open-call/
   ```

5. **View results**
   Reports will be generated in `./results/`:
   - `photo-analysis.md` - Markdown report
   - `photo-analysis.json` - Structured data
   - `photo-analysis.csv` - For Excel/Sheets

---

## Guide to Using with Claude Code

Claude Code automatically recognizes the agents defined in the project.

1. **Launch Claude Code in project folder**
   ```bash
   cd ~/Projects/photo-open-call-analyzer
   claude
   ```

2. **Start a new analysis project**
   ```
   Use project-owner to start a new project for the open call
   "LensCulture Portrait Awards 2024"
   ```

3. **Provide open call details**
   ```
   Use art-critic to analyze this open call:

   Theme: "Portraits that Challenge Perception"

   Jury:
   - Martin Parr (Magnum Photos)
   - Alessia Glaviano (Vogue Italia)

   2023 Winners:
   - Works with strong social component
   - Mix of reportage and environmental portrait
   - Natural light preference
   ```

4. **Start analysis**
   ```
   Use dev to analyze all photos in the project folder
   ```

5. **Generate final ranking**
   ```
   Use art-critic to generate final ranking.
   I need to select the best 5 photos to submit.
   ```

---

## Programmatic Usage

```javascript
import { analyzePhoto } from './src/analysis/photo-analyzer.js';

// Analyze a photo
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

## Project Structure

```
photo-open-call-analyzer/
│
├── .claude/                      # Claude Code agent configuration
│   ├── agents/                   # Definitions of 5 agents
│   │   ├── art-critic.md        # Margherita - artistic analysis
│   │   ├── project-owner.md     # Marco - coordination
│   │   ├── dev.md               # Alex - development
│   │   ├── designer.md          # Sofia - UX/UI
│   │   └── qa.md                # Luca - testing
│   └── workflows/                # Reusable workflows
│       └── analyze-open-call.md
│
├── src/                          # Source code
│   ├── analysis/                 # Core analysis
│   │   ├── photo-analyzer.js    # Ollama/LLaVA analysis
│   │   ├── prompt-generator.js  # Criteria generation
│   │   └── score-aggregator.js  # Score aggregation
│   ├── processing/
│   │   └── batch-processor.js   # Batch processing
│   ├── output/
│   │   └── report-generator.js  # Report export
│   ├── cli/
│   │   └── analyze.js           # CLI commands
│   └── utils/
│       ├── api-client.js        # Ollama client
│       ├── file-utils.js        # File utilities
│       └── logger.js            # Logging
│
├── data/                         # Project data
│   └── open-calls/               # One folder per OC
│       └── {name-open-call}/
│           ├── open-call.json        # Configuration
│           ├── analysis-prompt.json  # Generated prompt
│           ├── photos/               # Photos to analyze
│           └── results/              # Results
│
├── CLAUDE.md                     # Context for Claude Code
├── ROADMAP.md                    # Vision and milestones
├── BACKLOG.md                    # Task tracking
├── package.json
└── README.md                     # This file
```

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `OLLAMA_HOST` | Ollama URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Vision model to use | `llava:7b` |

### Change Model

To use a different model:

```bash
# Download the model
ollama pull llava:13b

# Use the model
OLLAMA_MODEL=llava:13b node src/cli/analyze.js analyze ./my-project/
```

---

## Evaluation Criteria

By default, each photo is evaluated on 5 criteria:

| Criterion | Weight | Description |
|-----------|--------|-------------|
| **Theme Alignment** | 30% | How well the photo responds to the open call brief |
| **Technical Quality** | 20% | Exposure, focus, composition, post-production |
| **Originality** | 25% | Uniqueness of vision, unconventional approach |
| **Emotional Impact** | 15% | Ability to engage, memorability |
| **Jury Fit** | 10% | Alignment with jury preferences |

Criteria are customizable in each project's `open-call.json` file.

---

## Example Output

### Single Photo Analysis

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

### Markdown Report

The final report includes:
- Ranking sorted by score
- Breakdown by criterion
- Recommendations (Strong Yes / Yes / Maybe / No)
- Aggregate statistics
- Recommended top picks

---

## Performance

| Operation | Time |
|-----------|------|
| Single photo analysis | 15-30 seconds |
| Batch 10 photos | 3-5 minutes |
| Batch 50 photos | 15-25 minutes |

*Times based on MacBook Pro M1 with LLaVA 7B*

---

## Troubleshooting

### Ollama not responding

```bash
# Verify Ollama is running
curl http://localhost:11434/api/tags

# If it doesn't respond, start Ollama
ollama serve
```

### Model not found

```bash
# List installed models
ollama list

# Download missing model
ollama pull llava:7b
```

### Analysis is slow

- Use a lighter model: `moondream` instead of `llava:13b`
- Reduce photo resolution before analysis
- Increase available RAM for Ollama

---

## Roadmap

### v1.0 - MVP ✅
- [x] Project structure and agents
- [x] Ollama/LLaVA integration
- [x] Working photo analyzer
- [x] Basic CLI
- [x] Markdown/JSON/CSV export

### v1.1 - Improvements
- [ ] Web UI for results
- [ ] Side-by-side comparison
- [ ] Resume interrupted analysis
- [ ] RAW file support

### v2.0 - Advanced Features
- [ ] Historical winner memory
- [ ] Photo improvement suggestions
- [ ] Platform integration (Picter, PhotoShelter)

---

## Technology Stack

- **Runtime**: Node.js 20+
- **AI Vision**: Ollama + LLaVA
- **CLI**: Commander.js
- **Logging**: Chalk + Ora
- **Agents**: Claude Code custom agents

---

## License

MIT License

---

## Credits

- Powered by [Ollama](https://ollama.com) and [LLaVA](https://llava-vl.github.io/)
- Inspired by [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)
- Built with [Claude Code](https://claude.ai/code)

---

*Made with passion for photographers who want to maximize their chances in open calls.*
