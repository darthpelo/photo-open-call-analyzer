# Photo Open Call Analyzer

AI-powered tool that helps photographers select their best photos for open call submissions. Analyzes images against competition-specific criteria using local vision models.

**Local-first, free, privacy-first** -- runs entirely on your machine with Ollama + LLaVA. No API keys, no cloud, no cost per analysis.

| Stat | Value |
|------|-------|
| Tests | 1127 passing (50 test files) |
| Milestones | M1-M3 complete, M4 (Web UI) delivered |
| Vision engine | Ollama + LLaVA (local) |

---

## Installation

### Prerequisites

- **Node.js** v20+
- **Ollama** installed and running ([ollama.com](https://ollama.com/download))

### Setup

```bash
# Install Ollama and pull the vision model
brew install ollama
ollama serve        # in a separate terminal
ollama pull llava:7b

# Install project dependencies
npm install
```

### Supported Models

| Model | Size | Quality | Speed |
|-------|------|---------|-------|
| `moondream` | 1.7GB | Fair | Very fast |
| `llava:7b` | 4.7GB | Good | Good (default) |
| `llava:13b` | 8GB | Very good | Slower |
| `llava-llama3` | 5.5GB | Very good | Good |

---

## Quick Start (CLI)

### Analyze a single photo

```bash
node src/cli/analyze.js analyze-single ./photo.jpg
```

### Analyze a batch

```bash
# Initialize a project (interactive wizard)
node src/cli/analyze.js init my-open-call --template portrait

# Copy photos into the project
cp ~/Pictures/selection/*.jpg data/open-calls/my-open-call/photos/

# Run batch analysis
node src/cli/analyze.js analyze data/open-calls/my-open-call/

# View results (timestamped with "latest" symlink)
ls data/open-calls/my-open-call/results/latest/
```

Results are exported as Markdown, JSON, and CSV.

### Set analysis (Polaroid mode)

For competitions requiring photo groups "in dialogue":

```bash
# Initialize with Polaroid template (sets pre-configured)
node src/cli/analyze.js init my-polaroid --template polaroid

# Analyze a specific set of photos
node src/cli/analyze.js analyze-set data/open-calls/my-polaroid/ \
  --photos photo1.jpg photo2.jpg photo3.jpg photo4.jpg

# Or find optimal combinations automatically
node src/cli/analyze.js analyze data/open-calls/my-polaroid/
node src/cli/analyze.js suggest-sets data/open-calls/my-polaroid/ --top 5
```

Smart defaults: if photo count matches `setSize`, all photos are selected automatically. Glob patterns supported: `--photos "urban-*.jpg"`.

---

## Web Dashboard

A read-only web UI for browsing projects, photos, and analysis results.

```bash
# Production mode (API server on port 3000)
npm run web

# Development mode (API + frontend with hot reload)
npm run web:dev
```

Open `http://localhost:3000` to view the dashboard. The server binds to `127.0.0.1` only for security.

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `llava:7b` | Vision model to use |

### open-call.json

Each project lives in `data/open-calls/{name}/` with an `open-call.json` configuration:

```json
{
  "title": "LensCulture Portrait Awards 2024",
  "theme": "Portraits that Challenge Perception",
  "description": "Free-form description of the open call vision and goals",
  "aestheticContext": "Natural light, intimate framing, editorial feel",
  "jury": ["Martin Parr", "Alessia Glaviano"],
  "pastWinners": "Works with strong social component, natural light",
  "criteria": [
    { "name": "Theme Alignment", "weight": 30, "description": "Match with competition theme" },
    { "name": "Technical Quality", "weight": 20, "description": "Technical execution" }
  ]
}
```

**Aesthetic-aware evaluation**: The system uses `description` and `aestheticContext` fields to shape how the vision model interprets and scores your photos. Custom `criteria` override the auto-generated defaults.

### Set mode (Polaroid)

Add `setMode` to `open-call.json` for group competitions:

```json
{
  "setMode": {
    "enabled": true,
    "setSize": 4,
    "setCriteria": [
      { "name": "Visual Coherence", "weight": 25, "description": "Style and tonal consistency" },
      { "name": "Thematic Dialogue", "weight": 30, "description": "Inter-photo conversation" },
      { "name": "Narrative Arc", "weight": 25, "description": "Story progression" },
      { "name": "Complementarity", "weight": 20, "description": "Each photo adds unique value" }
    ],
    "individualWeight": 40,
    "setWeight": 60
  }
}
```

Or use `node src/cli/analyze.js init my-project --template polaroid` to scaffold this automatically.

---

## CLI Reference

```bash
# Project setup
node src/cli/analyze.js init [name] [--template portrait|landscape|wildlife|conceptual|documentary|polaroid]

# Single photo
node src/cli/analyze.js analyze-single <photo>

# Batch analysis
node src/cli/analyze.js analyze <project-dir> [--parallel auto|<n>] [--model llava:13b]

# Set analysis
node src/cli/analyze.js analyze-set <project-dir> [--photos <files|glob>]
node src/cli/analyze.js suggest-sets <project-dir> [--top 5] [--skip-vision]

# Prompt validation
node src/cli/analyze.js validate-prompt <project-dir> [--verbose]

# Model management
node src/cli/analyze.js list-models

# Winner learning
node src/cli/analyze.js tag-winner <project-dir> --photo winner.jpg --placement "1st"
node src/cli/analyze.js winner-insights <project-dir>

# Strategic curatorial analysis
node src/cli/analyze.js strategic-analyze <project-dir> [--text-model llama3:8b]

# Feedback loop — validate AI rankings against your judgment
node src/cli/analyze.js human-ranking <project-dir> --photos best.jpg second.jpg third.jpg
node src/cli/analyze.js compare <project-dir>
```

### Analysis Modes

| Mode | Speed | Quality | Use case |
|------|-------|---------|----------|
| `--analysis-mode single` | ~20-30s/photo | Good | Quick testing, large batches |
| `--analysis-mode multi` (default) | ~30-45s/photo | Better | Final submissions |

---

## Multi-Agent System

The project uses Claude Code agents that collaborate on analysis tasks:

| Agent | Role |
|-------|------|
| **Art Critic** | Analyzes open calls, generates criteria, evaluates photos |
| **Project Owner** | Coordinates priorities and tracks progress |
| **Dev** | Implements analysis logic, APIs, automation |
| **Designer** | UX/UI specifications |
| **QA** | Testing and validation |
| **Architect** | Solution design and ADRs |
| **Sebastiano** | Strategic curatorial advisor for positioning |

See `.claude/agents/` for agent definitions.

---

## Troubleshooting

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# List installed models
ollama list

# Pull missing model
ollama pull llava:7b
```

**Slow analysis?** Use `moondream` for speed, or `--parallel auto` for adaptive concurrency based on available RAM.

---

## Technology Stack

- **Runtime**: Node.js 20+
- **AI Vision**: Ollama + LLaVA (local, free)
- **Web**: Express + Helmet (read-only dashboard)
- **CLI**: Commander.js
- **Testing**: Vitest (1127 tests)
- **Agents**: Claude Code custom agents

## License

MIT

---

Built with [Ollama](https://ollama.com), [LLaVA](https://llava-vl.github.io/), and [Claude Code](https://claude.ai/code).
