# ADR-017: Analysis Caching

**Status**: Accepted
**Date**: 2026-02-17
**Deciders**: Project Owner, Architect, Dev
**Context**: FR-3.7 - Analysis Caching

---

## Context and Problem Statement

Each photo analysis takes 20-45s (single-stage) or 45-90s (multi-stage) via Ollama/LLaVA. When users re-run analysis on the same project (e.g., after tweaking report settings, adding new photos to a batch, or resuming work), all previously analyzed photos are re-processed from scratch.

The checkpoint system (FR-2.2) helps with interrupted runs but doesn't persist results across separate invocations. Once a batch completes, the checkpoint is deleted.

---

## Decision Drivers

- Users report 15-30 minute re-analysis times on batches of 20+ photos
- The same photo + config + model combination always produces semantically equivalent results
- Disk space is cheap; Ollama GPU time is expensive
- Must not break existing checkpoint flow or introduce false cache hits

---

## Considered Options

### Option 1: In-memory LRU Cache
Cache results in process memory during a single CLI run.

**Pros**: Zero disk I/O, simple implementation
**Cons**: Lost on process exit, no benefit across runs (the main use case)

### Option 2: Per-project File Cache (Selected)
Store cached results as JSON files in `{projectDir}/.analysis-cache/`, keyed by `SHA-256(photoHash + configHash + model)`.

**Pros**: Persists across runs, per-project isolation, follows checkpoint-manager pattern
**Cons**: Disk usage grows, requires cache key computation

### Option 3: SQLite Database
Single SQLite file per project with indexed lookups.

**Pros**: Fast lookups, built-in indexing
**Cons**: New dependency (`better-sqlite3`), different pattern from rest of codebase

---

## Decision

**Option 2: Per-project file cache.**

### Cache Key Computation

```
cacheKey = SHA-256(photoContentHash + configHash + modelName)
```

Where:
- `photoContentHash` = SHA-256 of the raw photo file bytes
- `configHash` = SHA-256 of sorted open-call.json (reusing `computeConfigHash()` from checkpoint-manager.js)
- `modelName` = Ollama model string (e.g., `llava:7b`)

This ensures cache invalidation when:
- Photo is edited (different bytes → different photoHash)
- Config criteria change (different config → different configHash)
- Model is switched (different model → different key)

### Storage Structure

```
{projectDir}/
├── .analysis-cache/
│   ├── cache-index.json       # Metadata index
│   ├── a1b2c3d4e5f6...json   # Cached result (one per photo+config+model)
│   └── ...
```

### Integration into Batch Processing

In `batch-processor.js:processBatch()`, before each `analyzePhotoWithTimeout()` call:

1. Compute `photoHash` from file bytes
2. Compute `cacheKey` from photoHash + configHash + model
3. Check cache: if hit, return cached result (log as cache hit)
4. If miss, proceed with analysis, then store result in cache

### CLI Flags

- `--no-cache`: Skip cache lookup (force fresh analysis)
- `--clear-cache`: Delete all cached results before starting

---

## Consequences

### Positive
- ~50% time savings on re-runs (cache hit rate depends on workflow)
- Zero-config: caching is enabled by default
- Cache is project-scoped, easy to understand and delete
- Follows the established checkpoint-manager.js pattern

### Negative
- Disk usage: ~5-10KB per cached entry, ~1MB for 100 photos
- SHA-256 computation adds ~50ms per photo (negligible vs 20-45s analysis)
- Cache can become stale if Ollama model is updated in-place (same name, different weights)

### Mitigations
- `--clear-cache` for manual invalidation
- Cache index tracks creation timestamps for future TTL if needed
- `.analysis-cache/` can be added to `.gitignore`

---

## Related Decisions
- FR-2.2 / Checkpoint Manager: Pattern template for file persistence
- FR-3.9 / Model Selection: Model name is part of cache key
- ADR-013: TDD enforcement applies to cache-manager.js
