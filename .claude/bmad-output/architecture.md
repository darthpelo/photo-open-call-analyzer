# Architecture: M3 Phase 2 - Performance & Optimization

**Status**: Approved
**Date**: 2026-02-17
**Scope**: FR-3.7, FR-3.8, FR-3.9, FR-3.10
**Related ADRs**: ADR-017, ADR-018, ADR-019, ADR-020

---

## Overview

M3 Phase 2 adds four capabilities to the existing CLI-based photo analysis pipeline:

1. **FR-3.7 Analysis Caching** - Avoid re-analyzing identical photos
2. **FR-3.8 Parallel Processing Optimization** - Dynamic concurrency and memory management
3. **FR-3.9 Model Selection & Management** - Pluggable vision models at runtime
4. **FR-3.10 Historical Winner Learning** - Learn from past competition winners

All features integrate into the existing processing pipeline centered on `batch-processor.js` and the CLI in `analyze.js`.

---

## Architecture Principles

- **Follow existing patterns**: Use `checkpoint-manager.js` as the template for file-based persistence (atomic writes, SHA-256 hashing, JSON storage)
- **Backward compatible**: All new features are opt-in or transparent defaults; existing CLI commands work unchanged
- **TDD-first**: Every new module gets a test file before implementation (ADR-013)
- **Local-first**: No cloud dependencies; all data stays on the user's machine

---

## FR-3.7: Analysis Caching

### Problem
Re-running analysis on the same photos with the same config wastes 20-45s per photo. Users iterating on criteria or resuming work re-analyze identical photos.

### Design

**New module**: `src/processing/cache-manager.js`

**Cache key**: SHA-256 of `photoContentHash + configHash + modelName`
- `photoContentHash`: SHA-256 of the photo file bytes
- `configHash`: Reuse `computeConfigHash()` from checkpoint-manager.js
- `modelName`: The Ollama model used (e.g., `llava:7b`)

**Cache storage**: `{projectDir}/.analysis-cache/` directory
- One JSON file per cached result: `{cacheKey}.json`
- Index file: `cache-index.json` with metadata (creation time, hit count, size)

**Cache entry format**:
```json
{
  "version": "1.0",
  "cacheKey": "sha256:abc123...",
  "photoHash": "sha256:def456...",
  "configHash": "sha256:ghi789...",
  "model": "llava:7b",
  "result": { /* full analysis result */ },
  "createdAt": "2026-02-17T10:00:00Z",
  "hitCount": 0,
  "photoFilename": "photo-001.jpg"
}
```

**Integration points**:
- `batch-processor.js:processBatch()` - Before calling `analyzePhotoWithTimeout()`, check cache. On hit, return cached result and increment hit count.
- `analyze.js` - Add `--no-cache` and `--clear-cache` flags to the `analyze` command

**API**:
```javascript
// cache-manager.js exports
export function computePhotoHash(photoPath)        // SHA-256 of file bytes
export function computeCacheKey(photoHash, configHash, model) // Combined key
export function getCachedResult(projectDir, cacheKey)  // Returns result or null
export function setCachedResult(projectDir, cacheKey, result, metadata) // Atomic write
export function clearCache(projectDir)             // Delete all cache files
export function getCacheStats(projectDir)          // { totalEntries, totalSize, hitRate }
```

### Decisions
- **Per-project cache** (not global): Keeps cache scoped, easy to reason about, easy to delete
- **File-per-entry** (not single DB): Follows checkpoint-manager pattern, no new dependencies
- **No TTL expiration**: Cache entries are valid as long as the key matches; user can `--clear-cache`

---

## FR-3.8: Parallel Processing Optimization

### Problem
Fixed `parallel=3` concurrency doesn't adapt to system resources. Large batches (100+ photos) can exhaust memory. No visibility into processing throughput.

### Design

**New module**: `src/processing/concurrency-manager.js`

**Dynamic concurrency**:
- `auto` mode: Detect available CPU cores and Ollama's capacity, start with `min(cores-1, 4)` slots
- Monitor Ollama response times; if latency exceeds 2x baseline, reduce slots by 1
- If latency returns to normal, increase slots by 1 (up to max)
- Min 1 slot, max configurable (default 6)

**Memory monitoring**:
- Track `process.memoryUsage().heapUsed` after each batch
- If heap exceeds threshold (default 400MB), reduce concurrency and force GC hint (`global.gc?.()`)
- Log memory stats at INFO level every 10 photos

**Performance dashboard** (terminal output):
- Photos/sec throughput
- Current concurrency level
- Memory usage
- Estimated time remaining
- Cache hit rate (if FR-3.7 enabled)

**Integration points**:
- `batch-processor.js:processBatch()` - Replace fixed `parallel` chunking with slot-based concurrency from `concurrency-manager.js`
- `analyze.js` - Change `--parallel` to accept `auto` as a value: `--parallel auto|<number>`

**API**:
```javascript
// concurrency-manager.js exports
export class ConcurrencyManager {
  constructor(options)          // { maxSlots, memoryThreshold, autoScale }
  async acquireSlot()           // Returns slot handle, blocks if at capacity
  releaseSlot(slot)             // Free a slot
  getStats()                    // { activeSlots, maxSlots, memoryMB, photosPerSec }
  adjustConcurrency(latencyMs)  // Auto-scale based on latency feedback
}
```

### Decisions
- **Slot-based model**: More flexible than fixed chunking; allows dynamic adjustment mid-batch
- **Conservative auto-scaling**: Start lower, scale up gradually to avoid overwhelming Ollama
- **No external dependencies**: Use Node.js `os` module for CPU detection, `process.memoryUsage()` for memory

---

## FR-3.9: Model Selection & Management

### Problem
`api-client.js` hardcodes the model to `OLLAMA_MODEL` env var (default `llava:7b`). Users can't switch models per-project or compare model quality.

### Design

**New module**: `src/utils/model-manager.js`

**Model resolution priority** (highest to lowest):
1. CLI flag: `--model llava:13b`
2. Config: `open-call.json` → `"model": "llava:13b"`
3. Environment: `OLLAMA_MODEL`
4. Default: `llava:7b`

**Model discovery**: Leverage existing `checkOllamaStatus()` which already calls `ollama.list()` and filters vision models.

**Auto-pull**: If requested model is not installed, prompt user and call `ollama.pull(model)` with progress reporting.

**Integration points**:
- `api-client.js:getModelName()` - Delegate to `model-manager.js` for resolution
- `photo-analyzer.js` - Pass resolved model name to Ollama calls (already uses `getModelName()`)
- `analyze.js` - Add `--model <name>` flag to `analyze`, `analyze-single`, `analyze-set` commands
- `analyze.js` - Add `list-models` subcommand

**API**:
```javascript
// model-manager.js exports
export function resolveModel(options)               // { cliModel, configModel, envModel } → string
export async function ensureModelAvailable(model)   // Check + auto-pull if missing
export async function listVisionModels()            // Returns installed vision models
export function isVisionModel(modelName)            // Heuristic check
```

**New CLI commands**:
```bash
node src/cli/analyze.js list-models              # Show installed vision models
node src/cli/analyze.js analyze <dir> --model llava:13b  # Override model
```

### Decisions
- **No model comparison command in Phase 2**: Keep scope tight; users can A/B test manually with `--model` flag + existing `test-prompt` command
- **Model name in cache key** (FR-3.7): Different models produce different results, so cache must be model-aware
- **Refactor api-client.js minimally**: Only change `getModelName()` to accept override; keep singleton pattern

---

## FR-3.10: Historical Winner Learning

### Problem
The system has no memory of past competitions. Users can't leverage winning patterns to improve future submissions.

### Design

**New module**: `src/analysis/winner-manager.js`

**Winner storage**: `{projectDir}/winners/` directory
- `winners.json`: Array of tagged winner entries
- Each entry stores the photo's analysis result + competition metadata

**Winner entry format**:
```json
{
  "id": "win-001",
  "filename": "photo.jpg",
  "competition": "Nature Wildlife 2025",
  "placement": "1st",
  "scores": { /* from analysis */ },
  "patterns": {
    "dominantCriteria": ["Composition", "Emotional Impact"],
    "scoreProfile": { "Composition": 9, "Technical Quality": 7, ... },
    "recommendation": "Strong Yes"
  },
  "taggedAt": "2026-02-17T10:00:00Z"
}
```

**Pattern extraction**: Analyze winners to identify:
- Score profiles (which criteria score highest)
- Common strengths and themes
- Score ranges that correlate with winning

**Winner similarity scoring**: For each analyzed photo, compute a similarity score against the winner database:
- Cosine similarity between score vectors
- Weighted by criteria importance from winner patterns
- Output: 0-10 bonus metric "Winner Similarity"

**Integration points**:
- `score-aggregator.js:aggregateScores()` - Optionally include winner similarity as a bonus criterion
- `analyze.js` - Add `tag-winner` and `winner-insights` subcommands

**API**:
```javascript
// winner-manager.js exports
export function tagWinner(projectDir, photoResult, metadata) // Save winner entry
export function loadWinners(projectDir)                      // Load all winners
export function extractPatterns(winners)                     // Aggregate patterns
export function computeWinnerSimilarity(photoScores, patterns) // 0-10 similarity
export function getWinnerInsights(projectDir)               // Summary report
```

**New CLI commands**:
```bash
# Tag a photo as a competition winner
node src/cli/analyze.js tag-winner <project-dir> --photo winner.jpg --placement 1st

# View winner pattern insights
node src/cli/analyze.js winner-insights <project-dir>

# Include winner similarity in analysis (flag on analyze command)
node src/cli/analyze.js analyze <project-dir> --compare-winners
```

### Decisions
- **Per-project winner storage**: Winners are competition-specific; cross-project learning is future scope
- **Manual tagging only**: No scraping; user tags winners manually after results are announced
- **Similarity as bonus metric, not modifier**: Winner similarity is shown alongside scores, doesn't alter the core scoring algorithm

---

## Implementation Sequence

```
FR-3.7 (Caching) ──→ FR-3.8 (Parallel) ──→ FR-3.9 (Models) ──→ FR-3.10 (Winners)
     │                      │                      │                      │
     ├─ cache-manager.js    ├─ concurrency-mgr.js  ├─ model-manager.js    ├─ winner-manager.js
     ├─ batch-processor     ├─ batch-processor     ├─ api-client          ├─ score-aggregator
     └─ analyze.js (flags)  └─ analyze.js (auto)   └─ analyze.js (cmd)   └─ analyze.js (cmd)
```

**Rationale**: Sequential because:
1. FR-3.7 (caching) is self-contained and provides the biggest user-facing benefit
2. FR-3.8 (parallel) builds on the batch-processor changes from FR-3.7
3. FR-3.9 (models) needs cache key to include model name (depends on FR-3.7)
4. FR-3.10 (winners) is the most independent but least urgent

---

## New Files Summary

| File | Feature | Purpose |
|------|---------|---------|
| `src/processing/cache-manager.js` | FR-3.7 | Cache storage, lookup, invalidation |
| `src/processing/concurrency-manager.js` | FR-3.8 | Dynamic slot-based concurrency |
| `src/utils/model-manager.js` | FR-3.9 | Model resolution, discovery, auto-pull |
| `src/analysis/winner-manager.js` | FR-3.10 | Winner tagging, patterns, similarity |
| `tests/cache-manager.test.js` | FR-3.7 | Cache manager tests |
| `tests/concurrency-manager.test.js` | FR-3.8 | Concurrency manager tests |
| `tests/model-manager.test.js` | FR-3.9 | Model manager tests |
| `tests/winner-manager.test.js` | FR-3.10 | Winner manager tests |

## Modified Files Summary

| File | Features | Changes |
|------|----------|---------|
| `src/processing/batch-processor.js` | FR-3.7, 3.8 | Cache lookup before analysis; slot-based concurrency |
| `src/utils/api-client.js` | FR-3.9 | `getModelName()` accepts override parameter |
| `src/analysis/score-aggregator.js` | FR-3.10 | Optional winner similarity bonus |
| `src/cli/analyze.js` | All | New flags and subcommands |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cache key collisions (SHA-256) | Low (astronomically unlikely) | SHA-256 has no known collisions |
| Dynamic concurrency instability | Medium | Conservative defaults, manual override always available |
| Ollama model API changes | Low | Pin ollama npm version, abstract behind model-manager |
| Large winner databases | Low | Per-project scoping limits size; pagination if needed later |
| Disk usage from cache | Medium | `--clear-cache` command; document cache location |
