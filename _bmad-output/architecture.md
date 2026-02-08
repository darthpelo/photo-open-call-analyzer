# Architecture Document: Photo Open Call Analyzer

**Version**: 1.0  
**Date**: January 28, 2026  
**Status**: APPROVED  
**Owner**: Dev  
**Last Updated**: 2026-01-28

---

## 1. Architecture Overview

Photo Open Call Analyzer follows a **modular, layered architecture** optimized for:
- Local-first processing (Ollama only, no cloud APIs)
- Batch parallelism (configurable concurrency)
- Extensible prompt engineering (dynamic criteria generation)
- Multi-format output (CLI, Web, reports)

```
┌─────────────────────────────────────────────────────────────┐
│                       CLI / Web UI Layer                     │
│  (analyze.js - Commander.js CLI)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Analysis Orchestration Layer                    │
│  (batch-processor.js - Parallel execution)                  │
├──────────────────────┬──────────────────────────────────────┤
│  Prompt Generation   │  Photo Analysis    │  Score Aggregation
│  (prompt-generator) │  (photo-analyzer)  │  (score-aggregator)
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│           LLM Integration Layer (Ollama Client)             │
│  (api-client.js - Singleton pattern, lazy initialization)  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│         External Services (Local Ollama + LLaVA)            │
│  http://localhost:11434 (configurable OLLAMA_HOST env var) │
└─────────────────────────────────────────────────────────────┘

                ↓ (Output)

┌─────────────────────────────────────────────────────────────┐
│              Report Generation Layer                        │
│  (report-generator.js - Markdown, JSON, CSV)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Component Architecture

### 2.1 Layer 1: CLI / Entry Point
**File**: `src/cli/analyze.js`

**Responsibilities**:
- Parse command-line arguments (Commander.js)
- Route to subcommands: `analyze`, `validate`, `analyze-single`
- Handle user input validation
- Orchestrate workflow (call batch-processor → report-generator)

**Key Methods**:
- `program.command('analyze')` - Main workflow for batch analysis
- `program.command('validate')` - Validate open-call.json structure
- `program.command('analyze-single')` - Single photo analysis

**Inputs**:
```bash
npm run analyze analyze data/open-calls/nature-wildlife/
npm run analyze validate data/open-calls/nature-wildlife/
npm run analyze analyze-single ./path/to/photo.jpg
```

**Outputs**: Calls orchestrator functions; results saved to `{projectDir}/results/{timestamp}/` directory (FR-3.12)

---

### 2.2 Layer 2: Orchestration
**File**: `src/processing/batch-processor.js`

**Responsibilities**:
- Discover photo files in directory (jpg, png, gif, webp)
- Manage parallel execution queue (configurable concurrency: default 3)
- Error recovery (continue on single photo failure)
- Progress reporting with Ora spinners

**Key Methods**:
```javascript
processBatch(openCallPath, options = {}) 
  // Main entry point for batch analysis
  // options.parallel (default 3), options.outputDir

getPhotoFiles(directory)
  // Discover supported image formats
  // Returns: sorted file array

parseOpenCall(configPath)
  // Load and validate open-call.json
  // Returns: { title, theme, criteria, jury, pastWinners }
```

**Design Pattern**: Async queue with Promise.allSettled for fault tolerance

**Configuration**:
```javascript
const DEFAULT_PARALLEL = 3;  // Configurable, max 10
const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
```

---

### 2.3 Layer 3a: Prompt Generation
**File**: `src/analysis/prompt-generator.js`

**Responsibilities**:
- Convert open-call metadata into structured LLM prompt
- Call Ollama to generate evaluation criteria (meta-prompt)
- Parse LLM response into criterion structure

**Key Methods**:
```javascript
generateAnalysisPrompt(openCallData)
  // Input: { title, theme, jury[], pastWinners, context }
  // Output: { criteria[], evaluationInstructions }
  // Calls Ollama to create dynamic prompt from competition context

parseGeneratedCriteria(llmResponse)
  // Extract structured criteria from LLM output
  // Pattern: "CRITERION: X\nDESCRIPTION: Y\nWEIGHT: Z%"
```

**Sample Output**:
```json
{
  "criteria": [
    {
      "name": "Composition",
      "description": "Visual balance and framing",
      "weight": 25
    },
    {
      "name": "Technical Quality",
      "description": "Focus, exposure, color accuracy",
      "weight": 20
    }
  ],
  "evaluationInstructions": "Score each criterion 1-10, provide feedback..."
}
```

**Design Pattern**: Lazy generation (only on first analysis, cached in project)

---

### 2.3b Layer 3b: Photo Analysis
**File**: `src/analysis/photo-analyzer.js`

**Responsibilities**:
- Convert photo to base64 for Ollama vision model
- Build analysis prompt with photo context
- Call Ollama/LLaVA with base64 image
- Parse LLM response into structured scores

**Key Methods**:
```javascript
analyzePhoto(photoPath, analysisPrompt)
  // Input: file path + prompt configuration
  // Output: { photoPath, filename, scores, analysisText, timestamp, model }
  // Calls Ollama with image as base64

buildAnalysisPrompt(analysisPrompt)
  // Construct system prompt for photo evaluation
  // Includes: competition context, criteria, scoring format

parseAnalysisResponse(analysisText, analysisPrompt)
  // Extract scores from LLM response
  // Pattern: "SCORE: [Criterion]: [X]/10 - [feedback]"
  // Returns: { individual: {criterion: score}, summary: {average, weighted_average} }
```

**Sample Flow**:
```
Photo: photo-001.jpg
  ↓ (read file + base64 encode)
Base64: /9j/4AAQSkZJRg...
  ↓ (build prompt with criteria)
System Prompt: "You are a photography critic. Evaluate this photo..."
  ↓ (call Ollama)
LLM Response: "SCORE: Composition: 8/10 - Strong rule of thirds..."
  ↓ (parse response)
Result: { scores: { Composition: { score: 8, feedback: "..." } } }
```

**Temperature Setting**: 0.3 (low for consistency in scoring)

---

### 2.3c Layer 3c: Score Aggregation
**File**: `src/analysis/score-aggregator.js`

**Responsibilities**:
- Combine individual photo scores into rankings
- Calculate weighted averages (criterion weight × score)
- Generate tier categorization (Strong Yes / Yes / Maybe / No)
- Produce statistics (mean, median, distribution)

**Key Methods**:
```javascript
aggregateScores(allPhotoScores, criteria)
  // Input: array of photo analysis results + criteria
  // Output: { ranked_photos, tiers, statistics }

generateTiers(rankedPhotos)
  // Categorize into tiers based on quartiles or thresholds
  // Returns: { tier_strong_yes, tier_yes, tier_maybe, tier_no }

generateStatistics(allScores)
  // Compute: mean, median, mode, std_dev per criterion
  // Returns: stats object for report
```

**Sample Output**:
```json
{
  "ranking": [
    {
      "filename": "photo-001.jpg",
      "weighted_score": 8.45,
      "tier": "Strong Yes",
      "individual_scores": {
        "Composition": 8.5,
        "Technical Quality": 8.2,
        "Originality": 8.1
      }
    }
  ],
  "tiers": {
    "strong_yes": [/* top 25% */],
    "yes": [/* 50-75% */],
    "maybe": [/* 25-50% */],
    "no": [/* bottom 25% */]
  },
  "statistics": {
    "composition": { "mean": 7.2, "median": 7.5, "std_dev": 1.3 }
  }
}
```

---

### 2.4 Layer 4: LLM Integration
**File**: `src/utils/api-client.js`

**Responsibilities**:
- Manage Ollama connection (singleton pattern)
- Lazy initialization (connect only when needed)
- Health check (verify Ollama running)
- Error handling (timeout, connection refused)

**Key Methods**:
```javascript
getApiClient()
  // Singleton getter; creates client on first call
  // Returns: Ollama client instance

getModelName()
  // Return configured model (default: llava:7b)
  // Source: process.env.OLLAMA_MODEL or default

checkOllamaStatus()
  // Verify Ollama running and model available
  // Returns: { healthy: bool, model: string, version: string }
```

**Environment Variables**:
```bash
OLLAMA_HOST=http://localhost:11434  # Default
OLLAMA_MODEL=llava:7b               # Default
```

**Design Pattern**: Singleton + lazy initialization to avoid unnecessary connections

---

### 2.5 Layer 5: Report Generation
**File**: `src/output/report-generator.js`

**Responsibilities**:
- Format analysis results for human and machine consumption
- Generate Markdown (human-readable summary)
- Generate JSON (programmatic access)
- Generate CSV (spreadsheet import)

**Key Methods**:
```javascript
generateMarkdownReport(aggregatedScores, analysisPrompt)
  // Create readable Markdown report with:
  // - Summary stats, tier breakdowns, top recommendations
  // - Return: formatted Markdown string

generateJsonReport(aggregatedScores)
  // Structured JSON for programmatic use
  // Return: complete analysis as JSON

generateCsvReport(aggregatedScores)
  // Spreadsheet-friendly CSV
  // Return: CSV string with photo, scores, tier, feedback

exportReports(aggregatedScores, outputDir)
  // Write all formats to outputDir
  // Files: photo-analysis.md, photo-analysis.json, photo-analysis.csv
```

**Sample Report Filenames** (FR-3.12: timestamped output):
```
results/
  2026-02-08T14-30-45/      # Timestamped run directory
    photo-analysis.md       # Human-readable summary
    photo-analysis.json     # Complete structured data
    photo-analysis.csv      # Spreadsheet import
    batch-results.json      # Batch processing summary
  latest -> 2026-02-08T14-30-45  # Symlink to most recent
```

---

### 2.6 Utilities Layer
**File**: `src/utils/logger.js`

**Responsibilities**:
- Consistent console output with colors (Chalk)
- Structured logging (info, debug, success, error)
- Section headers for readability

**Key Methods**:
```javascript
logger.section(title)   // Print section header with chalk
logger.info(msg)        // Info message (blue ℹ)
logger.success(msg)     // Success message (green ✓)
logger.error(msg)       // Error message (red ✗)
logger.debug(msg)       // Debug message (only if DEBUG=*)
```

---

## 3. Data Flow & State Management

### 3.1 End-to-End Analysis Flow

```
1. User runs CLI
   npm run analyze analyze data/open-calls/nature-wildlife/

2. analyze.js parses args
   → path: "data/open-calls/nature-wildlife/"
   → outputDir: "data/open-calls/nature-wildlife/results/{timestamp}/"  (FR-3.12)

3. batch-processor.js orchestrates
   ├─ load open-call.json
   ├─ discover photos: [photo-001.jpg, photo-002.jpg, ...]
   └─ spawn parallel jobs (3 concurrent)

4. For each photo in parallel:
   ├─ prompt-generator.js (once)
   │  ├─ load open-call metadata
   │  ├─ call Ollama meta-prompt
   │  └─ parse criteria → cache in analysis-prompt.json
   │
   └─ photo-analyzer.js (per photo)
      ├─ read photo file
      ├─ encode base64
      ├─ build system prompt with cached criteria
      ├─ call Ollama with vision model
      └─ parse response → { photoPath, scores, feedback }

5. score-aggregator.js combines results
   ├─ calculate weighted scores
   ├─ rank all photos
   ├─ generate tiers (Strong Yes / Yes / Maybe / No)
   └─ compute statistics

6. report-generator.js exports
   ├─ Markdown report → photo-analysis.md
   ├─ JSON report → photo-analysis.json
   └─ CSV report → photo-analysis.csv
```

### 3.2 State Persistence

**Current State (M1 Complete)**:
- No persistent state between runs
- Each batch analysis starts fresh
- Results saved to output files only

**Future State (M2 Resume Feature)**:
- Checkpoint file after every N photos analyzed
- Checkpoint format: JSON with analyzed photo list + partial results
- Resume logic: skip already-analyzed photos, continue from checkpoint
- Checkpoint location: `{projectDir}/.analysis-checkpoint.json`

---

## 4. Key Design Decisions (Architecture Decision Records)

### ADR-001: Local Ollama + LLaVA vs. Cloud Vision API

**Decision**: Use local Ollama + LLaVA 7B vision model exclusively  
**Status**: ✅ Implemented

**Context**:
- Cloud options: OpenAI Vision API, Google Cloud Vision, Claude 3.5 Sonnet
- Local options: Ollama (free, open-source), LLaVA (free vision model)

**Alternatives Considered**:
1. **Cloud APIs** (OpenAI, Google Cloud)
   - ✅ Higher accuracy, faster inference
   - ❌ Cost: $0.01-0.03/image (50–100 photos = $1–3/competition)
   - ❌ Privacy: Photos uploaded to external servers
   - ❌ Requires API keys (credential management)

2. **Hybrid** (fallback to cloud if Ollama unavailable)
   - ✅ Higher availability
   - ❌ Complex error handling
   - ❌ Inconsistent behavior (different models)

3. **Local Ollama + LLaVA 7B** ← **CHOSEN**
   - ✅ Cost: FREE (after Ollama install)
   - ✅ Privacy: Zero data leaves user's machine
   - ✅ No API keys required
   - ✅ Offline capability
   - ❌ Quality: ~85–90% accuracy vs. cloud (acceptable for photo scoring)
   - ❌ Speed: Slower on CPU (30 sec/photo vs. 2–5 sec with GPU)

**Rationale**:
Privacy and cost are primary drivers for photographers evaluating personal work. LLaVA quality is sufficient for relative ranking (comparing photos against each other), not absolute judgment. Users with GPU can achieve cloud-equivalent speed.

**Implementation**:
- Ollama client in `api-client.js` (singleton pattern)
- Model specified via `OLLAMA_MODEL` env var (default: llava:7b)
- Health check on startup (`checkOllamaStatus()`)
- Clear error messages if Ollama unavailable

**Trade-offs Accepted**:
- Speed: Accept 30 sec/photo on CPU (optimization in M4)
- Accuracy: Accept ~85–90% accuracy (sufficient for photographers)

---

### ADR-002: Parallel Batch Processing with Configurable Concurrency

**Decision**: Process photos in parallel with configurable concurrency (default 3)  
**Status**: ✅ Implemented

**Context**:
- Naive approach: Sequential analysis (slow, N photos = 30N seconds)
- Batch size: 10–500 photos typical, max 5000 (rare)
- Bottleneck: Ollama inference, not disk I/O

**Alternatives Considered**:
1. **Sequential** (one photo at a time)
   - ✅ Simplest to implement
   - ❌ Slow: 100 photos = 50 minutes (unacceptable)

2. **Unlimited parallelism** (all photos at once)
   - ✅ Fastest throughput
   - ❌ Memory explosion (each LLM inference = 1–2GB VRAM)
   - ❌ Ollama overload (connection pooling issues)

3. **Fixed concurrency queue** ← **CHOSEN**
   - ✅ Balanced: 100 photos ÷ 3 concurrent ≈ 17 minutes
   - ✅ Memory bounded: 3× LLM inference = 3–6GB VRAM
   - ✅ Configurable: Users can tune for hardware
   - ✅ Fault-tolerant: Single photo failure doesn't stop batch

**Implementation**:
```javascript
// src/processing/batch-processor.js
const DEFAULT_PARALLEL = 3;  // Configurable via options

// Promise.allSettled for fault tolerance
const results = await Promise.allSettled(
  photoQueue.map((photo, idx) => 
    analyzePhoto(photo, analysisPrompt)
  )
);
```

**Configuration**:
- Default: 3 concurrent (safe for 8GB RAM + 4-core CPU)
- Min: 1 (sequential fallback)
- Max: 10 (for high-end hardware)
- User can set via CLI: `--parallel 5`

**Trade-offs Accepted**:
- Memory usage: Intentionally bound to 3–6GB (accept slower than possible)
- Ollama responsiveness: Shared with other tasks on user's machine

---

### ADR-003: Dynamic Prompt Generation from Open Call Metadata

**Decision**: Use Ollama to generate evaluation criteria from competition metadata  
**Status**: ✅ Implemented

**Context**:
- Templatization problem: Different competitions have different criteria
- Initial approach: Hard-coded 5 criteria for all competitions
- Goal: Adapt criteria to each competition's theme and jury

**Alternatives Considered**:
1. **Hard-coded criteria** (fixed 5 criteria for all competitions)
   - ✅ Simple, predictable
   - ❌ One-size-fits-all (ignores jury style, theme)
   - ❌ Low accuracy for niche competitions

2. **User manually enters criteria** (JSON template)
   - ✅ Accurate (user knows competition best)
   - ❌ Friction: Requires user knowledge of evaluation frameworks
   - ❌ High effort per competition

3. **Dynamic LLM-generated criteria** ← **CHOSEN**
   - ✅ Adapts to each competition's context
   - ✅ Uses jury names, past winners, theme
   - ✅ Generates weighted criteria (importance automatically inferred)
   - ❌ Slight latency: First analysis call to Ollama (30–60 seconds)
   - ❌ Cache dependency: Results cached in analysis-prompt.json (must manage)

**Implementation**:
```javascript
// src/analysis/prompt-generator.js
const systemPrompt = `You are a photography competition analyst.
Analyze this open call and create evaluation criteria:
- Title: ${openCallData.title}
- Theme: ${openCallData.theme}
- Jury: ${openCallData.jury}
- Past Winners: ${openCallData.pastWinners}

Generate 5 criteria with weights (%).`;

// Call Ollama, cache result for all photos in batch
const generatedCriteria = await generateAnalysisPrompt(openCallData);
// Saved to analysis-prompt.json for reuse
```

**Trade-offs Accepted**:
- Latency: First analysis 30–60 sec longer (meta-prompt generation)
- Non-determinism: LLM output varies slightly per run (acceptable for relative ranking)

---

### ADR-004: Multi-Format Export (Markdown, JSON, CSV)

**Decision**: Generate three output formats from single analysis result  
**Status**: ✅ Implemented

**Context**:
- Different users need different formats (human-readable, programmatic, spreadsheet)
- Single source of truth: Aggregated scores object
- Format transformation: Separate generation functions

**Alternatives Considered**:
1. **Single format** (choose one: Markdown, JSON, or CSV)
   - ✅ Simplest
   - ❌ Inflexible (not all users want same format)

2. **User-selectable format** (CLI flag --format=json)
   - ✅ Flexible
   - ❌ Requires multiple runs for multiple formats

3. **Always generate all three formats** ← **CHOSEN**
   - ✅ No user decision needed
   - ✅ Markdown for review, JSON for integration, CSV for Excel
   - ✅ Trivial for computer (single aggregation, 3 formatters)
   - ❌ Slightly more disk I/O (3 files vs. 1)

**Implementation**:
```javascript
// src/output/report-generator.js
async function exportReports(aggregatedScores, outputDir) {
  const mdReport = generateMarkdownReport(aggregatedScores);
  const jsonReport = generateJsonReport(aggregatedScores);
  const csvReport = generateCsvReport(aggregatedScores);
  
  fs.writeFileSync(`${outputDir}/photo-analysis.md`, mdReport);
  fs.writeFileSync(`${outputDir}/photo-analysis.json`, jsonReport);
  fs.writeFileSync(`${outputDir}/photo-analysis.csv`, csvReport);
}
```

**Output Files**:
- `photo-analysis.md` - Human-readable summary + top recommendations
- `photo-analysis.json` - Complete structured data (all scores, feedback)
- `photo-analysis.csv` - Spreadsheet format (filename, score, tier, feedback)

**Trade-offs Accepted**:
- Disk space: 3 copies of results (negligible for typical batch)
- User confusion: Some users may not need all formats (acceptable)

---

### ADR-005: Error Handling Strategy (Fault Tolerance)

**Decision**: Continue batch on single photo failure; collect errors for summary  
**Status**: ✅ Implemented

**Context**:
- Failure modes: Corrupted image, Ollama timeout, API error, invalid file format
- Options: Stop batch vs. continue with errors
- User expectation: Want results for valid photos even if 1 fails

**Alternatives Considered**:
1. **Stop on first error** (fail-fast)
   - ✅ Clear error state
   - ❌ Lose 99 completed analyses if photo 100 fails
   - ❌ Bad UX for batches

2. **Continue, skip errors silently**
   - ✅ User gets results
   - ❌ Silent failures hide problems
   - ❌ User doesn't know which photos were skipped

3. **Continue, collect errors in summary** ← **CHOSEN**
   - ✅ Resilient: User gets 99 results if 1 fails
   - ✅ Visible: Error summary at end (which photos failed, why)
   - ✅ Informative: Suggests fixes (e.g., "photo corrupted, try JPEG conversion")

**Implementation**:
```javascript
// src/processing/batch-processor.js
const results = await Promise.allSettled(photoQueue.map(analyzePhoto));

// Process results
const successful = results.filter(r => r.status === 'fulfilled');
const failed = results.filter(r => r.status === 'rejected');

// Report summary
logger.info(`✓ Analyzed ${successful.length}/${photoQueue.length}`);
if (failed.length > 0) {
  logger.error(`✗ Failed: ${failed.length} photos`);
  failed.forEach(f => logger.error(`  - ${f.reason}`));
}
```

**Error Types Handled**:
- **Corrupted image**: Caught by Sharp validation → skip photo, log error
- **Ollama timeout**: Retry 3x, then fail photo
- **Invalid format**: Detected in SUPPORTED_FORMATS check → skip
- **Disk I/O error**: Logged, batch continues

**Trade-offs Accepted**:
- Partial results: User may get incomplete analysis (acceptable vs. nothing)
- Error logs: May be noisy for large batches (acceptable for transparency)

---

### ADR-008: Checkpoint Invalidation Strategy (Resume Support)

**Decision**: Validate checkpoint via config hash; auto-discard on mismatch  
**Status**: 🔲 Planned (M2)

**Context**:
- Problem: Long-running batches (100–500 photos, 2–8 hours) risk failure from interruption
- Users need: Resume capability without re-analyzing photos already processed
- Risk: Invalid checkpoint (stale config, corrupted file) could cause incorrect results

**Checkpoint Design**:
- **Location**: `.analysis-checkpoint.json` in project root (same level as open-call.json)
- **Trigger**: Saved every N photos (default 10, configurable 1–50)
- **Contents**: Analyzed photo list, partial results, config hash, batch metadata
- **Validation**: SHA256 hash of open-call.json to detect config changes

**Alternatives Considered**:

1. **Silent discard on any change** ← **CHOSEN**
   - ✅ User doesn't see noise; checkpoint "just works"
   - ✅ Prevents analyzing photos with stale criteria
   - ✅ Simple implementation (hash comparison)
   - ❌ User won't know checkpoint was discarded
   - Mitigation: Log at DEBUG level for visibility

2. **Warn user on config change**
   - ✅ Transparent: user knows checkpoint discarded
   - ❌ Extra CLI interaction for batch workflows
   - ❌ Annoying for repeated runs

3. **Allow resume with new config** (analyze new criteria on old photos)
   - ✅ Maximizes results reuse
   - ❌ Results inconsistent: some photos analyzed with old config, new ones with new config
   - ❌ Confusing for users

4. **Timestamp-based expiration**
   - ✅ Automatic cleanup after N days
   - ❌ Users can't customize
   - Decision: Not implementing; let user manage via `--clear-checkpoint` flag

**Implementation Strategy**:

```javascript
// Checkpoint validation flow
1. Load checkpoint from .analysis-checkpoint.json
2. Compute SHA256 hash of current open-call.json
3. Compare hash with checkpoint.configHash
4. If match: Resume from checkpoint
   If mismatch: Discard checkpoint, start fresh (log: "Config changed")

// Atomic write strategy
- Write to temp file first: .analysis-checkpoint.json.tmp
- Atomic rename on success (fs.renameSync)
- Prevents corruption if process dies mid-write

// CLI flags
--checkpoint-interval N  (default 10, range 1-50)
  Save checkpoint every N photos
--clear-checkpoint
  Discard any existing checkpoint before run
```

**Checkpoint Schema**:

```json
{
  "version": "1.0",
  "projectDir": "data/open-calls/nature-wildlife/",
  
  "configHash": "sha256:abc123def456...",
  
  "analysisPrompt": {
    "criteria": [
      {"name": "Composition", "description": "...", "weight": 25},
      {"name": "Lighting", "description": "...", "weight": 20}
    ],
    "evaluationInstructions": "..."
  },
  
  "batchMetadata": {
    "parallelSetting": 3,
    "checkpointInterval": 10,
    "totalPhotosInBatch": 120,
    "photoDirectory": "data/open-calls/nature-wildlife/photos/"
  },
  
  "progress": {
    "analyzedPhotos": ["photo-001.jpg", "photo-002.jpg", "..."],
    "photosCount": 45,
    "failedPhotos": [],
    "status": "in_progress"
  },
  
  "results": {
    "scores": {
      "photo-001.jpg": {"Composition": 8.5, "Lighting": 7.2, ...},
      "photo-002.jpg": {"Composition": 9.0, "Lighting": 8.1, ...}
    },
    "statistics": null,
    "lastUpdateTime": "2026-01-28T15:45:00Z"
  },
  
  "metadata": {
    "createdAt": "2026-01-28T15:00:00Z",
    "lastResumedAt": "2026-01-28T15:45:00Z",
    "resumeCount": 2
  }
}
```

**Validation Rules**:
- `configHash`: Must match SHA256 hash of current open-call.json (else discard)
- `totalPhotosInBatch`: Must equal actual photo count in directory (else warn, continue)
- `analyzedPhotos`: Must be proper subset of all photos (else warn, sync)
- `parallelSetting`: Must match original batch setting (restored from checkpoint)
- `checkpointInterval`: Must match original setting (restored from checkpoint)

**Error Handling Scenarios**:

| Scenario | Action | Rationale |
|----------|--------|-----------|
| Checkpoint file corrupted (invalid JSON) | Log warning, discard, start fresh | Safer than crash |
| Config changed (hash mismatch) | Log info, discard, start fresh | New criteria = must re-analyze |
| Checkpoint from different project | Detect via projectDir, log error, ask user | Prevent wrong photos |
| Photo deleted since checkpoint | Skip in checkpoint list, continue | User may have cleaned up |
| New photos added since checkpoint | Include in batch, continue | User wants new photos analyzed |
| Checkpoint incomplete + one photo fails | Update checkpoint with failed photo marked | User can retry; preserves progress |
| Disk full during checkpoint write | Catch error, log, continue analysis | Don't stop batch for checkpoint |

**Integration with batch-processor.js**:

```
processBatch(batchConfig)
  │
  ├─ 1. Load checkpoint (if exists)
  │     checkpoint = loadCheckpoint(projectDir)
  │
  ├─ 2. Validate checkpoint
  │     if (checkpoint && validateCheckpoint(checkpoint, config)) {
  │       resume = true
  │       skip these photos: checkpoint.progress.analyzedPhotos
  │     } else {
  │       resume = false
  │       checkpoint = null
  │     }
  │
  ├─ 3. Get photo list
  │     allPhotos = getPhotoFiles(projectDir)
  │     toAnalyze = allPhotos - checkpoint.analyzed (if resuming)
  │
  ├─ 4. Report progress
  │     if (resume) log "Resuming: 45/120 done, 75 remaining"
  │
  ├─ 5. Process in batches
  │     for each photo in toAnalyze:
  │       result = analyzePhoto(photo)
  │       if (photosProcessed % checkpointInterval == 0):
  │         saveCheckpoint(updatedState, projectDir)
  │
  └─ 6. On success
        deleteCheckpoint(projectDir)
        aggregateScores(allResults)
```

**Trade-offs Accepted**:
- **Disk writes**: Checkpoint saves add I/O every N photos (acceptable, configurable)
- **Storage**: One checkpoint file per project (~5KB typical) (acceptable)
- **Complexity**: New module (checkpoint-manager.js) with validation logic (manageable)
- **No parallelism change**: Resuming always uses original `--parallel` setting (for determinism)

**Future Enhancements**:
- Checkpoint history: Keep last 3 checkpoints for recovery options
- Compression: Gzip checkpoint for large batches to save storage
- Cross-session cleanup: Auto-delete checkpoints older than 30 days

---

## Checkpoint System: Complete Design

### Module Structure

**New File**: `src/processing/checkpoint-manager.js`
```javascript
export function computeConfigHash(openCallConfig)
  // SHA256 hash of config object (keys sorted)

export function loadCheckpoint(projectDir)
  // Load .analysis-checkpoint.json, return object or null

export function saveCheckpoint(checkpoint, projectDir)
  // Write checkpoint atomically (via temp file + rename)

export function validateCheckpoint(checkpoint, currentConfig)
  // Validate schema, config hash, required fields
  // Return: {valid: bool, reason: string}

export function deleteCheckpoint(projectDir)
  // Delete .analysis-checkpoint.json after completion

export function initializeCheckpoint(projectDir, config, analysisPrompt, ...)
  // Create new checkpoint for batch start

export function updateCheckpoint(checkpoint, newPhotos, newResults)
  // Add new analyzed photos and results to checkpoint
```

### Integration Points

**batch-processor.js changes**:
1. Import checkpoint-manager functions
2. Call `loadCheckpoint()` at batch start
3. Call `validateCheckpoint()` to verify
4. Filter photos: skip `checkpoint.progress.analyzedPhotos`
5. Call `saveCheckpoint()` every N photos
6. Call `deleteCheckpoint()` on success

**analyze.js changes**:
1. Add `--checkpoint-interval N` flag (default 10)
2. Add `--clear-checkpoint` flag (boolean)
3. Pass options to processBatch()

### Testing Strategy

From Phase 3 (@QA):
- 10 unit tests: saveCheckpoint, loadCheckpoint, validateCheckpoint, hash computation
- 5 integration tests: resume workflow, config change detection, error recovery
- 8 edge case tests: large batches, disk failure, corrupted files
- 5 manual scenarios: real-world resume workflows

---

## 5. Scalability & Performance

### 5.1 Horizontal Scalability
- **Batch size**: Current design scales to 5000 photos
- **Bottleneck**: Ollama inference speed (not queue logic)
- **Parallel workers**: Configurable 1–10 (tested with 3 as default safe)
- **Memory**: Scales linearly with concurrency (3 workers = 3–6GB VRAM)

### 5.2 Vertical Optimization (M4 Future)
- **Caching**: Hash-based analysis cache to avoid re-analyzing identical photos
- **Model selection**: Support smaller/larger models (moondream2, llava:13b)
- **Parallel optimization**: Auto-tune concurrency based on available VRAM

### 5.3 Performance Targets

| Metric | Target | Current (M1) | Notes |
|--------|--------|-------------|-------|
| Single photo analysis | ≤ 30 sec | 20–60 sec (varies by photo) | LLaVA on CPU |
| Batch throughput (100 photos) | ≥ 2/min | ~1.5–2/min | 3 concurrent = ~50 min |
| CLI startup | ≤ 2 sec | ~0.5 sec | Good |
| Memory per worker | ≤ 2GB VRAM | ~1.5–2GB | Acceptable |
| Report generation | ≤ 1 sec | ~0.1 sec | JSON/CSV trivial |

---

## 6. Security & Privacy Considerations

### 6.1 Data Flow
- **Input**: User's local photo files (stay local)
- **Processing**: Ollama inference on user's machine (local)
- **Output**: Analysis reports (saved locally)
- **No external communication** except within Ollama (local only)

### 6.2 Threat Model

| Threat | Risk | Mitigation |
|--------|------|-----------|
| Photo exposure to cloud | High | ✅ Local Ollama only (no uploads) |
| Credential leakage | Medium | ✅ No API keys in config (env vars recommended) |
| Ollama connection hijacking | Low | ✅ localhost:11434 only (no network access) |
| Report file exposure | Low | ✅ User controls output directory permissions |

### 6.3 Privacy By Design
- Zero telemetry (no tracking, no analytics)
- No data persistence except local files
- User retains full ownership of photos and analysis
- No authentication/authorization needed (single-user tool)

---

## 7. Testing Strategy

### 7.1 Unit Tests
- **api-client.js**: Mock Ollama responses, test singleton pattern
- **score-aggregator.js**: Test score calculation, tier generation
- **report-generator.js**: Test formatting logic

### 7.2 Integration Tests
- **batch-processor.js**: Test parallel queue with mocked photo-analyzer
- **photo-analyzer.js**: Mock Ollama responses, test parsing

### 7.3 End-to-End Tests (M2+)
- Run analysis on test photo set
- Verify output files generated
- Check score parsing correctness

### 7.4 Coverage Target
- Core modules: ≥ 80% line coverage
- Utilities: ≥ 70% coverage
- CLI: Manual testing (limited auto-test value)

---

## 8. Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Runtime | Node.js ≥ 20 | ESM modules, async/await |
| CLI Framework | Commander.js | Mature, user-friendly |
| LLM Inference | Ollama | Local-first, free, open-source |
| Vision Model | LLaVA 7B | Fast, good quality, MIT license |
| Image Processing | Sharp | Fast, reliable image validation |
| Logging | Chalk + console | Built-in, lightweight |
| Testing | Jest | Industry standard for Node.js |
| Code Quality | ESLint + Prettier | Consistency, formatting |

---

## 9. Deployment & Operations

### 9.1 User Setup
1. Install Node.js 20+
2. Install Ollama (https://ollama.ai)
3. Pull LLaVA model: `ollama pull llava:7b`
4. Clone repository and install dependencies: `npm install`
5. Run: `npm run analyze analyze data/open-calls/nature-wildlife/`

### 9.2 Environment Variables
```bash
OLLAMA_HOST=http://localhost:11434    # Ollama server address
OLLAMA_MODEL=llava:7b                 # Vision model name
DEBUG=*                               # Optional: verbose logging
```

### 9.3 Configuration Files
- `data/open-calls/{project}/open-call.json` - Competition metadata
- `data/open-calls/{project}/photos/` - Candidate photo directory
- `_bmad-output/analysis-prompt.json` - Cached generated criteria (auto-created)

---

## 10. Architecture Decisions by Milestone

### Milestone 1 (Completed ✅)
- ✅ ADR-001: Local Ollama + LLaVA
- ✅ ADR-002: Parallel batch processing
- ✅ ADR-003: Dynamic prompt generation
- ✅ ADR-004: Multi-format export
- ✅ ADR-005: Error handling strategy

### Milestone 2 (Planned 🔴)
- ✅ ADR-007: Configuration validation schema (M2)
- 🔲 ADR-008: Checkpoint invalidation strategy (M2, Resume support)
- 🔲 ADR-009: Edge case robustness (M2, timeout handling)

### Milestone 3–4 (Future)
- 🔲 ADR-010: Web server architecture (Express.js vs. alternative)
- 🔲 ADR-011: Database choice for caching (SQLite vs. file-based)
- 🔲 ADR-012: Caching strategy for analysis results (M4 optimization)

---

## 11. Approval & Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Tech Lead | Dev | 2026-01-28 | ✅ Approved |
| Architecture Reviewer | Project Owner | 2026-01-28 | ✅ Approved |

---

## 12. Change Log

| Date | Section | Change | Author |
|------|---------|--------|--------|
| 2026-01-28 | All | Initial architecture document with 5 ADRs | Dev |
| 2026-01-28 | ADR-008 + Checkpoint System | Added checkpoint invalidation strategy, schema, and integration design for FR-2.2 | Architect |
