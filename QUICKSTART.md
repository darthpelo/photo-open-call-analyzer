# Quick Start Guide

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set API Key
```bash
export ANTHROPIC_API_KEY=your-anthropic-api-key
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
4. Process all photos with Claude Vision API
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
│   ├── photo-analyzer.js       # Claude Vision integration
│   ├── score-aggregator.js     # Score aggregation and ranking
│   └── prompt-generator.js     # Dynamic prompt generation
├── processing/
│   └── batch-processor.js      # Batch photo processing
├── output/
│   └── report-generator.js     # Report generation (MD/JSON/CSV)
├── cli/
│   └── analyze.js              # CLI commands
└── utils/
    ├── api-client.js           # Anthropic API client
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

✓ **Claude Vision Integration** - Uses Claude 3.5 Sonnet for advanced image analysis
✓ **Smart Criteria Generation** - Automatically generates evaluation criteria from open call details
✓ **Batch Processing** - Process 20+ photos in parallel
✓ **Detailed Scoring** - Individual criterion scores plus weighted overall scores
✓ **Multi-Format Export** - Generate Markdown, JSON, and CSV reports
✓ **Ranking System** - Automatic ranking with tier classification
✓ **Statistics** - Average, median, std deviation, and percentile analysis

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

The default criteria are:
- Theme Alignment: 30%
- Technical Quality: 20%
- Originality: 25%
- Emotional Impact: 15%
- Jury Fit: 10%

These can be customized by editing the open call configuration or the analysis prompt.

### Batch Processing

Control parallel processing with the `--parallel` option:
```bash
npm run analyze data/open-calls/my-project -- --parallel 5
```

## Output

Each analysis generates three report files:

### photo-analysis.md
Human-readable report with:
- Summary statistics
- Top recommendations
- Full ranking table
- Visual score bars

### photo-analysis.json
Machine-readable format with:
- Metadata
- Statistics
- Tier information
- Full ranking data

### photo-analysis.csv
Spreadsheet-compatible format with:
- Rank
- Photo filename
- Overall score
- Recommendation

## Troubleshooting

### API Key Error
Ensure `ANTHROPIC_API_KEY` is set:
```bash
echo $ANTHROPIC_API_KEY
```

### No Photos Found
Check that photos are in the correct directory:
- `data/open-calls/[project]/photos/`
- Supported formats: JPG, PNG, GIF, WebP

### Test Images
The project includes test data:
```bash
node data/open-calls/nature-wildlife/create-test-images.js
```

## Next Steps (Roadmap)

- **Milestone 2**: Full CLI with config files
- **Milestone 3**: Web UI with visual comparison
- **Milestone 4**: Caching and performance optimization
