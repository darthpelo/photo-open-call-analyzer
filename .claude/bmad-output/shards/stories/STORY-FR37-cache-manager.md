# STORY-FR37: Analysis Caching

**Feature**: FR-3.7
**ADR**: ADR-017
**Priority**: P1
**Estimate**: Medium (2-3 sessions)

---

## User Story

As a photographer running batch analysis, I want previously analyzed photos to be served from cache so that re-runs complete in seconds instead of minutes.

## Acceptance Criteria

1. **Cache key computation**
   - `computePhotoHash(photoPath)` returns SHA-256 of file bytes
   - `computeCacheKey(photoHash, configHash, model)` returns combined SHA-256
   - Same inputs always produce same key; different inputs produce different keys

2. **Cache storage**
   - Cached results stored in `{projectDir}/.analysis-cache/{cacheKey}.json`
   - `cache-index.json` tracks metadata (entry count, total size, timestamps)
   - Atomic writes (temp file + rename) following checkpoint-manager pattern

3. **Cache integration in batch-processor**
   - Before `analyzePhotoWithTimeout()`, check cache
   - On cache hit: return cached result, log `[CACHE HIT]`, increment hit counter
   - On cache miss: analyze normally, store result in cache
   - Cache hit rate logged in summary

4. **CLI flags**
   - `--no-cache` on `analyze` command skips cache lookup
   - `--clear-cache` on `analyze` command deletes `.analysis-cache/` before starting

5. **Tests**
   - `tests/cache-manager.test.js` with >= 80% coverage
   - Unit tests: hash computation, cache read/write, cache miss, cache clear, stats
   - Integration: batch-processor uses cache on second run

## Implementation Steps

1. Create `src/processing/cache-manager.js` with exports:
   - `computePhotoHash(photoPath)`
   - `computeCacheKey(photoHash, configHash, model)`
   - `getCachedResult(projectDir, cacheKey)`
   - `setCachedResult(projectDir, cacheKey, result, metadata)`
   - `clearCache(projectDir)`
   - `getCacheStats(projectDir)`
2. Write `tests/cache-manager.test.js` (TDD: tests first)
3. Modify `batch-processor.js:processBatch()` to check cache before analysis
4. Add `--no-cache` and `--clear-cache` flags to `analyze.js`
5. Update batch summary output to include cache hit rate

## Files to Create
- `src/processing/cache-manager.js`
- `tests/cache-manager.test.js`

## Files to Modify
- `src/processing/batch-processor.js` (cache lookup in processing loop)
- `src/cli/analyze.js` (new CLI flags)

## Dependencies
- None (first in sequence)
