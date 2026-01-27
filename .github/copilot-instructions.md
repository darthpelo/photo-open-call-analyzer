# Copilot Instructions for Photo Open Call Analyzer

## Project Overview

**Photo Open Call Analyzer** is a Node.js CLI tool that uses **Ollama + LLaVA vision model** to analyze photographs against photography open call criteria. It's designed for photographers to objectively rank their submissions based on competition-specific evaluation frameworks.

### Core Architecture Pattern

```
Open Call Config (open-call.json)
    ↓
Prompt Generator → LLM (Ollama) → Analysis Prompt with Criteria
    ↓
Photo Batch → Photo Analyzer → Individual Scores (LLaVA vision)
    ↓
Score Aggregator → Ranking & Tiers
    ↓
Report Generator → Markdown/JSON/CSV
```

## Critical Workflows

### Analysis Workflow (What You'll Implement)
1. **User provides** `data/open-calls/{call-name}/open-call.json` with competition details (theme, jury, past winners)
2. **generateAnalysisPrompt()** → Uses Ollama to create structured evaluation criteria from competition context
3. **processBatch()** → Scans `photos/` directory, spawns parallel `analyzePhoto()` calls (default 3 concurrent)
4. **analyzePhoto()** → Sends image + criteria prompt to LLaVA (via Ollama), parses response into scored criteria
5. **aggregateScores()** → Combines individual scores into ranking, calculates statistics
6. **exportReports()** → Generates Markdown summary + JSON details + CSV for spreadsheets

### Key Integration Points
- **Ollama Connection**: [src/utils/api-client.js](src/utils/api-client.js) - Configurable via `OLLAMA_HOST` (default: http://localhost:11434), `OLLAMA_MODEL` (default: llava:7b)
- **Photo Processing**: [src/processing/batch-processor.js](src/processing/batch-processor.js) - Supports jpg, png, gif, webp; validates before analysis
- **CLI Entry**: [src/cli/analyze.js](src/cli/analyze.js) - Commander.js program with `analyze` and `validate` subcommands

## Project Conventions

### Code Structure
- **Files**: kebab-case (`photo-analyzer.js`, `batch-processor.js`)
- **Functions/Variables**: camelCase (`analyzePhoto()`, `processBatch()`)
- **Classes**: PascalCase (rarely used)
- **Constants**: UPPER_SNAKE (`SUPPORTED_FORMATS`)
- **Module System**: ES6 imports/exports (type: "module" in package.json)

### Data Flow Patterns
- All async functions use async/await
- Functions return structured objects: `{ success, data/error, ...metadata }`
- Analysis results include: `{ photoPath, scores: { individual, summary }, analysisText, timestamp }`
- Configuration loaded from JSON (validated where needed)

### Error Handling Pattern
Seen throughout [src/analysis/photo-analyzer.js](src/analysis/photo-analyzer.js#L11-L60):
```javascript
try {
  // 1. Validate/load input
  // 2. Call Ollama or process data
  // 3. Parse/transform response
  return { success: true, data: ... };
} catch (error) {
  logger.error(`Context: ${error.message}`);
  return { success: false, error: error.message, ... };
}
```

### Logging Convention
Use [src/utils/logger.js](src/utils/logger.js) - provides `logger.section()`, `logger.info()`, `logger.debug()`, `logger.success()`, `logger.error()` with chalk colors. Example in [src/cli/analyze.js](src/cli/analyze.js#L23).

## Data Schemas & Configuration

### Open Call Config Format (JSON)
Required fields in `open-call.json`:
- `title`: Competition name
- `theme`: Photography theme/subject
- `jury`: Array of jury member names/roles
- `pastWinners`: Text description of winning photography patterns
- `context`: Additional context (optional)

See [data/open-calls/example-template/open-call.json](data/open-calls/example-template/open-call.json) for reference.

### Analysis Results Structure
Output by `analyzePhoto()`:
```json
{
  "photoPath": "...",
  "filename": "...",
  "scores": {
    "individual": {
      "Criterion Name": { "score": 8.5, "feedback": "..." }
    },
    "summary": { "average": 8.2, "weighted_average": 8.4 }
  },
  "analysisText": "Full LLM response",
  "timestamp": "ISO string",
  "model": "llava:7b"
}
```

## Testing & Validation

- **Test Framework**: Jest with async support (`npm test`)
- **Test Location**: [tests/](tests/) directory mirrors src structure
- **Mock Ollama**: Tests use `jest.mock('../utils/api-client.js')` (see [tests/api-client.test.js](tests/api-client.test.js))
- **Key Test Cases**: Error handling, parsing LLM responses, score aggregation, batch parallelism

Run tests: `npm test` or `npm run test:watch`

## Development Commands

```bash
npm start                   # Run main CLI (delegates to analyze.js)
npm run dev                 # Watch mode with --watch flag
npm run analyze            # Direct access to analyze.js CLI
npm test                   # Jest test suite
npm run test:watch        # Jest watch mode
npm run lint              # ESLint
npm run format            # Prettier formatting
```

## Key Files by Function

| File | Purpose | Key Exports |
|------|---------|-------------|
| [src/analysis/photo-analyzer.js](src/analysis/photo-analyzer.js) | Core vision analysis via Ollama | `analyzePhoto()`, `buildAnalysisPrompt()`, `parseAnalysisResponse()` |
| [src/analysis/prompt-generator.js](src/analysis/prompt-generator.js) | Generate evaluation criteria from competition | `generateAnalysisPrompt()` |
| [src/analysis/score-aggregator.js](src/analysis/score-aggregator.js) | Combine individual scores, create rankings | `aggregateScores()`, `generateTiers()`, `generateStatistics()` |
| [src/processing/batch-processor.js](src/processing/batch-processor.js) | Parallel photo processing | `processBatch()`, `getPhotoFiles()` |
| [src/output/report-generator.js](src/output/report-generator.js) | Output in Markdown/JSON/CSV | `generateMarkdownReport()`, `exportReports()` |
| [src/utils/api-client.js](src/utils/api-client.js) | Ollama connection management | `getApiClient()`, `checkOllamaStatus()` |
| [src/cli/analyze.js](src/cli/analyze.js) | CLI command handler | Program definition with subcommands |

## Before You Code

**Always check these first:**
1. [ROADMAP.md](ROADMAP.md) - Understand what milestone/phase you're in
2. [BACKLOG.md](BACKLOG.md) - See task assignments and priorities
3. [QUICKSTART.md](QUICKSTART.md) - Project setup & common workflows
4. [CLAUDE.md](CLAUDE.md) - Multi-agent collaboration context

**Environment Setup:**
- Node.js 20+ required
- Ollama running locally on `http://localhost:11434`
- LLaVA 7B model: `ollama pull llava:7b`

## Common Implementation Patterns

### Adding Analysis Criteria
In `photo-analyzer.js`, criteria parsed from LLM response using pattern like:
```
CRITERION: [name]
DESCRIPTION: [desc]
WEIGHT: [%]
```
See `buildAnalysisPrompt()` and `parseAnalysisResponse()` for pattern matching.

### Extending Batch Processing
`processBatch()` spawns parallel tasks with configurable concurrency. To add new post-processing, modify results handling before `exportReports()`.

### Adding Report Formats
Extend [src/output/report-generator.js](src/output/report-generator.js) - add new export functions like `generateCsvReport()` and call from CLI.

## What NOT To Do

- ❌ Don't hardcode paths - use [src/utils/file-utils.js](src/utils/file-utils.js) and `join()`
- ❌ Don't create new Ollama clients - use `getApiClient()` from api-client.js
- ❌ Don't log directly - use logger utilities
- ❌ Don't process photos serially - use `processBatch()` with parallel option
- ❌ Don't assume LLM response format - always parse defensively with fallbacks

## Debugging Tips

- **Ollama not responding?** Check `ollama list` returns llava model
- **Photo analysis fails?** Enable debug logging: `DEBUG=* npm run analyze`
- **Scores all zeros?** Verify LLM parsing in `parseAnalysisResponse()` matches actual response format
- **Batch timeout?** Reduce `parallel` option in [src/cli/analyze.js](src/cli/analyze.js#L26)
