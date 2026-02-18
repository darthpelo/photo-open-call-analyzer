# STORY-FR38: Parallel Processing Optimization

**Feature**: FR-3.8
**ADR**: ADR-018
**Priority**: P1
**Estimate**: Medium (2-3 sessions)

---

## User Story

As a photographer processing large batches, I want the system to dynamically adjust concurrency based on my hardware so that analysis completes as fast as possible without crashing Ollama.

## Acceptance Criteria

1. **ConcurrencyManager class**
   - `acquireSlot()` returns a slot handle, blocks if all slots busy
   - `releaseSlot(slot)` frees a slot for the next photo
   - `reportLatency(slot, latencyMs)` feeds auto-scaling algorithm
   - `getStats()` returns `{ active, max, memoryMB, avgLatencyMs, photosProcessed, photosPerSec }`

2. **Auto-scaling**
   - Initial slots: `min(os.cpus().length - 1, 4)`
   - Scale up if avg latency < baseline * 1.2 (max 6 slots)
   - Scale down if avg latency > baseline * 2.0 (min 1 slot)
   - Memory guard: reduce to 1 slot if heap > 400MB

3. **Integration in batch-processor**
   - Replace fixed chunk-based `Promise.all()` with slot-based processing
   - `--parallel auto` uses ConcurrencyManager with auto-scaling
   - `--parallel <n>` uses ConcurrencyManager with fixed slots (no auto-scaling)
   - Checkpoint saving still works (after each photo completion)

4. **Performance dashboard**
   - Log stats every 10 photos: `[PERF] 25/100 | 0.8/sec | 3/4 slots | 312MB | ETA: 1m34s`

5. **Tests**
   - `tests/concurrency-manager.test.js` with >= 80% coverage
   - Unit tests: slot acquire/release, auto-scaling, memory guard, stats
   - Concurrency test: verify max N tasks run simultaneously

## Implementation Steps

1. Write `tests/concurrency-manager.test.js` (TDD: tests first)
2. Create `src/processing/concurrency-manager.js` with ConcurrencyManager class
3. Refactor `batch-processor.js:processBatch()` to use ConcurrencyManager
4. Update `--parallel` flag in `analyze.js` to accept `auto`
5. Add performance dashboard logging

## Files to Create
- `src/processing/concurrency-manager.js`
- `tests/concurrency-manager.test.js`

## Files to Modify
- `src/processing/batch-processor.js` (replace chunking with slot-based)
- `src/cli/analyze.js` (`--parallel auto` support)

## Dependencies
- FR-3.7 (batch-processor.js changes should be applied first)
