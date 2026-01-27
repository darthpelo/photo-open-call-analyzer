# Quick Start Guide

## Setup

### 1. Verifica Ollama
```bash
ollama list
```

Se non vedi `llava:7b`:
```bash
ollama pull llava:7b
```

### 2. Install Dependencies
```bash
npm install
```

## Usage

### Analyze a Project Directory

```bash
npm run analyze data/open-calls/nature-wildlife
```

This will:
1. Load the open call configuration from `open-call.json`
2. Validate photos in the `photos/` directory
3. Generate an analysis prompt (or load existing one)
4. Process all photos with Ollama/LLaVA
5. Aggregate scores and generate rankings
6. Export reports in Markdown, JSON, and CSV formats

### Analyze a Single Photo

```bash
node src/cli/analyze.js analyze-single ./path/to/photo.jpg
```

### Validate Photos

```bash
node src/cli/analyze.js validate ./path/to/photos/
```

## Project Structure

```
src/
├── analysis/
│   ├── photo-analyzer.js       # Ollama/LLaVA integration
│   ├── score-aggregator.js     # Score aggregation and ranking
│   └── prompt-generator.js     # Dynamic prompt generation
├── processing/
│   └── batch-processor.js      # Batch photo processing
├── output/
│   └── report-generator.js     # Report generation (MD/JSON/CSV)
├── cli/
│   └── analyze.js              # CLI commands
└── utils/
    ├── api-client.js           # Ollama client
    ├── file-utils.js           # File I/O utilities
    └── logger.js               # Logging utilities
```

## Creating a New Project

1. Create a directory under `data/open-calls/`:
```bash
mkdir data/open-calls/my-competition
```

2. Add `open-call.json`:
```json
{
  "title": "My Photography Competition",
  "theme": "Portrait Photography",
  "jury": ["Expert 1", "Expert 2"],
  "pastWinners": "Description of past winners",
  "context": "Additional context about the competition"
}
```

3. Add photos to `photos/` subdirectory:
```bash
mkdir data/open-calls/my-competition/photos
# Copy your photos here
```

4. Run analysis:
```bash
npm run analyze data/open-calls/my-competition
```

Results will be in the `results/` directory.

## Features

✓ **Ollama/LLaVA Integration** - Local AI vision analysis (free, no API key)
✓ **Smart Criteria Generation** - Automatically generates evaluation criteria
✓ **Batch Processing** - Process multiple photos in parallel
✓ **Detailed Scoring** - Individual criterion scores plus weighted overall
✓ **Multi-Format Export** - Markdown, JSON, and CSV reports
✓ **Ranking System** - Automatic ranking with tier classification

## Testing

Run the test suite:
```bash
npm test
```

Run the workflow test with mock data:
```bash
node tests/workflow-test.js
```

## Configuration

### Evaluation Criteria Weights

Default criteria:
- Theme Alignment: 30%
- Technical Quality: 20%
- Originality: 25%
- Emotional Impact: 15%
- Jury Fit: 10%

Customizable in the open call configuration.

### Batch Processing

Control parallel processing with the `--parallel` option:
```bash
npm run analyze data/open-calls/my-project -- --parallel 5
```

### Change Model

Use a different Ollama vision model:
```bash
OLLAMA_MODEL=llava:13b npm run analyze data/open-calls/my-project
```

## Output

Each analysis generates three report files:

### photo-analysis.md
Human-readable report with:
- Summary statistics
- Top recommendations
- Full ranking table

### photo-analysis.json
Machine-readable format with:
- Metadata
- Statistics
- Tier information
- Full ranking data

### photo-analysis.csv
Spreadsheet-compatible format with:
- Rank, Photo, Score, Recommendation

## Troubleshooting

### Ollama Not Running
```bash
ollama serve
```

### Model Not Found
```bash
ollama pull llava:7b
```

### No Photos Found
Check that photos are in the correct directory:
- `data/open-calls/[project]/photos/`
- Supported formats: JPG, PNG, GIF, WebP

## Performance

| Operation | Time |
|-----------|------|
| Single photo | 15-30 seconds |
| Batch 10 photos | 3-5 minutes |
| Batch 50 photos | 15-25 minutes |

*Times on MacBook Pro M1 with LLaVA 7B*

## Next Steps (Roadmap)

- **Milestone 2**: Web UI with visual comparison
- **Milestone 3**: Caching and performance optimization
- **Milestone 4**: Integration with photo platforms
