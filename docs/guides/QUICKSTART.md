# Quick Start Guide

## Setup

### 1. Verify Ollama
```bash
ollama list
```

If you don't see `llava:7b`:
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

### Resume Interrupted Analysis (NEW in M2)

If analysis is interrupted (Ctrl+C, system crash, timeout), simply re-run the same command:

```bash
npm run analyze data/open-calls/nature-wildlife
```

**What happens**:
- ✅ Automatically detects existing checkpoint
- ✅ Validates config hasn't changed (SHA256 hash)
- ✅ Skips already-analyzed photos
- ✅ Continues from where you left off
- ✅ Cleans up checkpoint on completion

**Options**:
```bash
# Save checkpoint every 5 photos instead of default 10
npm run analyze data/open-calls/nature-wildlife -- --checkpoint-interval 5

# Force fresh analysis (ignore existing checkpoint)
npm run analyze data/open-calls/nature-wildlife -- --clear-checkpoint
```

**Example**:
```
Analyzing 100 photos...
[Progress: 35/100 photos analyzed]
<Ctrl+C - process interrupted>

$ npm run analyze data/open-calls/nature-wildlife
✓ Resuming analysis: 35 photos already analyzed
Found 100 total photos, 35 already analyzed, 65 remaining
[Analysis continues from photo 36...]
✓ Analysis complete, checkpoint cleaned up
```

### Analyze a Single Photo

```bash
node src/cli/analyze.js analyze-single ./path/to/photo.jpg
```

### Analyze with Custom Photo Timeout (NEW in M2)

For large images or slow connections, increase the per-photo timeout:

```bash
npm run analyze data/open-calls/my-project -- --photo-timeout 120
```

**Options**:
- Default: 60 seconds
- Range: 30-300 seconds
- Timeout example: If a photo takes longer than specified, it's skipped and marked as failed

### Supported Photo Formats (NEW in M2)

- ✅ JPEG (.jpg, .jpeg)
- ✅ PNG (.png)
- ✅ GIF (.gif)
- ✅ WebP (.webp)
- ✅ HEIC (.heic) - *iPhone and iOS photos*

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

Results will be in `data/open-calls/my-competition/results/{timestamp}/` with a `latest` symlink (FR-3.12).

## Features

✓ **Ollama/LLaVA Integration** - Local AI vision analysis (free, no API key)
✓ **Smart Criteria Generation** - Automatically generates evaluation criteria
✓ **Batch Processing** - Process multiple photos in parallel
✓ **Resume Support (M2)** - Automatically resume interrupted long-running batches
✓ **Error Handling (M2)** - Graceful handling of corrupted files, timeouts, and connection loss
✓ **HEIC Support (M2)** - iPhone and iOS photo support
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
- Supported formats: JPG, PNG, GIF, WebP, HEIC

### Common Errors (NEW in M2)

**Error: "Invalid image file"**
- Cause: Corrupted or unsupported image format
- Solution: Check that the file is a valid image, convert to JPEG/PNG, or remove from directory

**Error: "TIMEOUT" (in Failed Photos report)**
- Cause: Image analysis took longer than timeout limit
- Solution: Increase timeout with `--photo-timeout 120` or reduce image resolution

**Error: "Ollama connection lost"**
- Cause: Ollama server stopped or became unavailable
- Solution: Restart Ollama (`ollama serve`) and re-run - analysis will resume from last checkpoint

**Error: "File system error"**
- Cause: Permission denied, disk full, or file removed during analysis
- Solution: Check file permissions, free up disk space, or restore the photo file

### Failed Photos Report

If analysis completes with some failed photos, check the **Failed Photos** section in the report:

```markdown
## Failed Photos

| Photo | Error Type | Reason | Suggested Action |
|-------|-----------|--------|------------------|
| photo1.jpg | TIMEOUT | Timeout after 60s | Reduce image size or increase --photo-timeout |
| photo2.jpg | INVALID_FORMAT | Corrupted file | Check file integrity or convert to JPEG |
```

All successfully analyzed photos are still ranked and included in the report.

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
