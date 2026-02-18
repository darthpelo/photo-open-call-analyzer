# ADR-018: Parallel Processing Optimization

**Status**: Accepted
**Date**: 2026-02-17
**Deciders**: Project Owner, Architect, Dev
**Context**: FR-3.8 - Parallel Processing Optimization

---

## Context and Problem Statement

The current batch processor uses fixed-size chunking (`parallel=3` default): it slices photos into groups of N and processes each group with `Promise.all()`. This approach:

- Doesn't adapt to system capabilities (a machine with 8 cores uses same concurrency as one with 2)
- Can overwhelm Ollama when concurrency is set too high
- Provides no visibility into throughput or memory usage
- Wastes capacity when some photos in a chunk finish faster than others (must wait for slowest)

---

## Decision Drivers

- Target: linear scaling up to 6 concurrent photos on capable hardware
- Target: <= 500MB memory for 100-photo batches
- Must not destabilize Ollama (which has its own concurrency limits)
- Existing `--parallel <n>` flag must continue to work

---

## Considered Options

### Option 1: Increase Default Chunk Size
Change default from 3 to 6.

**Pros**: Trivial change
**Cons**: Doesn't adapt to hardware, still wastes time on chunk boundaries, no memory management

### Option 2: Slot-based Concurrency Manager (Selected)
Replace chunked `Promise.all()` with a semaphore-style slot manager that dynamically adjusts concurrency.

**Pros**: Adapts to hardware, maximizes throughput, provides monitoring hooks
**Cons**: More complex implementation, needs testing for race conditions

### Option 3: Worker Threads
Use Node.js `worker_threads` for true parallelism.

**Pros**: True parallel execution, isolated memory
**Cons**: Over-engineered (bottleneck is Ollama I/O not CPU), adds complexity, image buffers can't share memory easily

---

## Decision

**Option 2: Slot-based concurrency manager.**

### ConcurrencyManager Class

```javascript
class ConcurrencyManager {
  constructor({ maxSlots, memoryThresholdMB, autoScale })

  // Acquire a slot (blocks via promise if all slots busy)
  async acquireSlot() → slotHandle

  // Release a slot after photo processing completes
  releaseSlot(slotHandle)

  // Report latency feedback for auto-scaling
  reportLatency(slotHandle, latencyMs)

  // Get current stats for dashboard
  getStats() → { active, max, memoryMB, avgLatencyMs, photosProcessed, photosPerSec }
}
```

### Auto-scaling Algorithm

1. **Initial slots**: `min(os.cpus().length - 1, 4)` (leave one core for system + Ollama overhead)
2. **Scale up**: If average latency of last 5 photos < baseline * 1.2 and slots < max, add 1 slot
3. **Scale down**: If average latency > baseline * 2.0, remove 1 slot (min 1)
4. **Memory guard**: If `process.memoryUsage().heapUsed` > threshold, reduce to 1 slot until memory drops
5. **Baseline**: First 3 photos establish the latency baseline

### Integration into batch-processor.js

Replace:
```javascript
for (let i = 0; i < photos.length; i += parallel) {
  const batch = photos.slice(i, i + parallel);
  const results = await Promise.all(batch.map(analyzePhoto));
}
```

With:
```javascript
const manager = new ConcurrencyManager({ maxSlots: parallel, autoScale: parallel === 'auto' });
const results = [];
const promises = photos.map(async (photo) => {
  const slot = await manager.acquireSlot();
  try {
    const result = await analyzePhoto(photo);
    manager.reportLatency(slot, result.latencyMs);
    results.push(result);
  } finally {
    manager.releaseSlot(slot);
  }
});
await Promise.all(promises);
```

### CLI Changes

```bash
# Auto-detect optimal concurrency
node src/cli/analyze.js analyze <dir> --parallel auto

# Fixed concurrency (existing behavior)
node src/cli/analyze.js analyze <dir> --parallel 4
```

### Performance Dashboard

Every 10 photos (or configurable interval), log:
```
[PERF] 25/100 photos | 0.8 photos/sec | 3/4 slots active | 312MB heap | ETA: 1m 34s
```

---

## Consequences

### Positive
- ~2x throughput on high-end systems (6 slots vs fixed 3)
- Prevents OOM on large batches via memory monitoring
- Better Ollama stability via adaptive throttling
- Visibility into processing performance

### Negative
- More complex batch processing logic
- Slot-based model requires careful testing for race conditions
- Auto-scaling heuristics may not be optimal for all Ollama configurations

### Mitigations
- Manual `--parallel <n>` always overrides auto-scaling
- Conservative defaults (start low, scale up slowly)
- Comprehensive tests with mocked timing

---

## Related Decisions
- FR-3.7 / Caching: Cache hits don't consume Ollama slots, improving effective throughput
- ADR-014: Smart analysis mode selection interacts with concurrency (multi-stage uses more Ollama capacity)
