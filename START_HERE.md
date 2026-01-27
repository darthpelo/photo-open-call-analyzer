# Photo Open Call Analyzer - Start Here

## Status: ✅ READY FOR USE

**Stack**: Node.js + Ollama (LLaVA) - 100% local and free
**Date**: January 2026

---

## What You Have

A complete AI system to analyze photos for photography competitions, using **Ollama with LLaVA** (local vision model).

### Core Features ✓

1. **Ollama/LLaVA Vision Integration**
   - Local image analysis (no API key required)
   - Support for JPG, PNG, GIF, WebP
   - Intelligent scoring per criterion

2. **Intelligent Analysis Engine**
   - Automatic open call analysis
   - Dynamic prompt generation
   - Weighted scoring system
   - Detailed feedback for each photo

3. **Batch Processing**
   - Parallel processing
   - Progress tracking
   - Error handling
   - Scales from 1 to 100+ photos

4. **Comprehensive Reporting**
   - Markdown reports
   - JSON for programmatic use
   - CSV for spreadsheets

5. **Professional CLI**
   - Complete command-line interface
   - Single photo analysis
   - Directory validation

---

## Quick Start

### 1. Verify Ollama
```bash
ollama list  # Should show llava:7b
```

If missing:
```bash
ollama pull llava:7b
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Analyze a Photo
```bash
node src/cli/analyze.js analyze-single ./path/to/photo.jpg
```

### 4. Analyze a Project
```bash
npm run analyze data/open-calls/nature-wildlife
```

### 5. View Results
```bash
cat results/photo-analysis.md
```

---

## Project Structure

```
src/
├── analysis/           # Ollama/LLaVA + scoring
├── processing/         # Batch operations
├── output/             # Report generation
├── cli/                # Command-line interface
└── utils/              # Helpers (api-client, logger)

data/                   # Sample projects + test photos
tests/                  # Test suite
```

---

## How to Use

### Analyze a Photography Competition

1. **Create project directory**:
```bash
mkdir -p data/open-calls/my-competition/photos
```

2. **Add configuration** (`open-call.json`):
```json
{
  "title": "Your Competition Name",
  "theme": "Photography Theme",
  "jury": ["Expert 1", "Expert 2"],
  "pastWinners": "Description of past winners",
  "context": "Additional details"
}
```

3. **Add photos** to the `photos/` subdirectory

4. **Run analysis**:
```bash
npm run analyze data/open-calls/my-competition
```

5. **Results** in `results/`:
- `photo-analysis.md` - Human-readable report
- `photo-analysis.json` - Structured data
- `photo-analysis.csv` - For Excel/Sheets

---

## Testing

```bash
# Run all tests
npm test

# Run workflow test
node tests/workflow-test.js
```

---

## Documentation

- **[README.md](README.md)** - Complete documentation
- **[QUICKSTART.md](QUICKSTART.md)** - Quick guide
- **[ROADMAP.md](ROADMAP.md)** - Future milestones
- **[BACKLOG.md](BACKLOG.md)** - Task tracking

---

## Troubleshooting

**"Ollama not responding"**
```bash
ollama serve  # Start Ollama
```

**"Model not found"**
```bash
ollama pull llava:7b
```

**"No photos found"**
- Verify photos are in `data/open-calls/[project]/photos/`
- Supported formats: JPG, PNG, GIF, WebP

---

## Summary

You have a complete system to analyze photography competitions using **Ollama/LLaVA** - completely local and free.

```bash
# Get started right now!
node src/cli/analyze.js analyze-single ./your-photo.jpg
```

---

**Stack**: Node.js + Ollama/LLaVA
**Status**: ✅ Ready
