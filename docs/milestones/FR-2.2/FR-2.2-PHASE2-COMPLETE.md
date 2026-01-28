# FR-2.2 Phase 2 Complete - Architecture Design Summary

**Status**: ✅ Phase 2 Complete  
**Date**: 2026-01-28  
**Owner**: @Architect  
**Duration**: ~1 day (planning + design)

---

## 🎯 What Was Completed

### ADR-008: Checkpoint Invalidation Strategy
✅ **Decision Made**: Validate via config hash; auto-discard on mismatch  
✅ **Rationale**: Prevents analyzing photos with stale criteria after config change  
✅ **Key Trade-off**: Silent discard (best UX) vs. warn user (transparent)  

### Checkpoint System Architecture
✅ **Module Design**: `src/processing/checkpoint-manager.js` with 6 functions  
✅ **Schema Design**: Complete JSON structure with validation rules  
✅ **Integration**: Detailed flow diagram showing batch-processor.js interaction  
✅ **Error Handling**: 6 failure scenarios documented with recovery strategies  

### Design Artifacts in `_bmad-output/architecture.md`

**Added Sections**:
1. **ADR-008 Full Decision Record** (~200 lines)
   - Context, alternatives considered, rationale
   - Schema definition with validation rules
   - Error handling matrix
   - Future enhancements

2. **Checkpoint System Design** (~100 lines)
   - Module structure with function signatures
   - Integration points with batch-processor.js
   - Testing strategy reference

---

## 📊 Key Design Decisions

### 1. Checkpoint Location
**Chosen**: `.analysis-checkpoint.json` in project root (same level as `open-call.json`)  
**Rationale**: Project-level file persists across analyses; results directory for output only

### 2. Config Change Detection
**Chosen**: SHA256 hash of `open-call.json`  
**Rationale**: Efficient hash comparison; catches any config changes  
**Trade-off**: Silent discard on mismatch (better UX than warning user)

### 3. Atomic Writes
**Chosen**: Write to temp file, then atomic rename  
**Rationale**: Prevents corruption if process dies mid-write  
**Implementation**: Standard `fs.renameSync()` pattern

### 4. Checkpoint Interval
**Chosen**: Configurable (default 10, range 1-50)  
**Rationale**: Balance between frequent saves (more safe) and disk I/O overhead  
**CLI Flag**: `--checkpoint-interval N`

### 5. Resume Parallelism
**Chosen**: Use original parallelism from checkpoint  
**Rationale**: Ensures deterministic resumption; prevents mixing different concurrency levels  
**Implementation**: Store `parallelSetting` in checkpoint metadata

---

## 📋 Checkpoint Schema (Complete)

```json
{
  "version": "1.0",
  "projectDir": "data/open-calls/nature-wildlife/",
  "configHash": "sha256:abc123def456...",
  
  "analysisPrompt": {
    "criteria": [...],
    "evaluationInstructions": "..."
  },
  
  "batchMetadata": {
    "parallelSetting": 3,
    "checkpointInterval": 10,
    "totalPhotosInBatch": 120,
    "photoDirectory": "data/open-calls/nature-wildlife/photos/"
  },
  
  "progress": {
    "analyzedPhotos": ["photo-001.jpg", ...],
    "photosCount": 45,
    "failedPhotos": [],
    "status": "in_progress"
  },
  
  "results": {
    "scores": { "photo-001.jpg": {...}, ... },
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

### Validation Rules
- `configHash`: Must match SHA256 hash of current config (else discard checkpoint)
- `totalPhotosInBatch`: Must equal actual photo count (else warn and sync)
- `analyzedPhotos`: Must be subset of all photos (else warn and sync)
- `parallelSetting`: Must be 1-10 (validated at load)
- `checkpointInterval`: Must be 1-50 (restored from checkpoint)

---

## 🔄 Integration Design

### batch-processor.js Flow

```
processBatch(batchConfig)
  │
  ├─ 1. Load checkpoint
  │     checkpoint = loadCheckpoint(projectDir)
  │
  ├─ 2. Validate checkpoint
  │     if (checkpoint) {
  │       validation = validateCheckpoint(checkpoint, currentConfig)
  │       if (!validation.valid) {
  │         log(`Checkpoint invalid: ${validation.reason}`);
  │         checkpoint = null;
  │       }
  │     }
  │
  ├─ 3. Get photo list (skip analyzed)
  │     allPhotos = getPhotoFiles(projectDir)
  │     toAnalyze = checkpoint ? 
  │       allPhotos - checkpoint.progress.analyzedPhotos : 
  │       allPhotos
  │
  ├─ 4. Report progress
  │     if (checkpoint) {
  │       log(`Resuming: ${checkpoint.progress.photosCount}/${allPhotos.length}`);
  │     }
  │
  ├─ 5. Process photos in batches
  │     for (const photo of toAnalyze) {
  │       result = await analyzePhoto(photo);
  │       if (photoIndex % checkpointInterval === 0) {
  │         checkpoint = updateCheckpoint(checkpoint, [photo], results);
  │         saveCheckpoint(checkpoint, projectDir);
  │       }
  │     }
  │
  └─ 6. On success
        deleteCheckpoint(projectDir)
        aggregateScores(allResults)
```

### New Functions (signatures for Phase 4)

```javascript
// src/processing/checkpoint-manager.js

computeConfigHash(openCallConfig)
  // Args: {title, theme, jury, pastWinners, ...}
  // Returns: "sha256:abc123..."

loadCheckpoint(projectDir)
  // Args: "data/open-calls/nature-wildlife"
  // Returns: checkpoint object or null

saveCheckpoint(checkpoint, projectDir)
  // Args: (checkpointObject, "data/open-calls/nature-wildlife")
  // Returns: boolean (success/failure)

validateCheckpoint(checkpoint, currentConfig)
  // Args: (checkpointObject, {title, theme, ...})
  // Returns: {valid: boolean, reason: string}

deleteCheckpoint(projectDir)
  // Args: "data/open-calls/nature-wildlife"
  // Returns: boolean

initializeCheckpoint(projectDir, openCallConfig, analysisPrompt, 
                     parallelSetting, checkpointInterval, totalPhotos)
  // Args: Full initialization params
  // Returns: New checkpoint object

updateCheckpoint(checkpoint, newAnalyzedPhotos, newResults)
  // Args: (checkpointObject, ["photo-051.jpg", ...], {scores: {...}})
  // Returns: Updated checkpoint object
```

---

## ⚠️ Error Handling (6 Scenarios)

| Scenario | Detection | Action | Log Level |
|----------|-----------|--------|-----------|
| **Corrupt JSON** | JSON.parse() fails | Log warning, discard, start fresh | WARN |
| **Config changed** | Hash mismatch | Log info, discard, start fresh | INFO |
| **Wrong project** | projectDir mismatch | Log error, ask user | ERROR |
| **Photo deleted** | Photo not in directory | Skip in list, continue | DEBUG |
| **New photos** | More photos than in checkpoint | Include in batch | DEBUG |
| **Failed photo mid-batch** | analyzePhoto() rejects | Mark failed, continue, save checkpoint | WARN |

---

## 📈 Performance Implications

### Checkpoint Overhead
- **Write latency**: ~5-10ms per checkpoint (file I/O)
- **Frequency**: Every 10 photos = ~0.5-1 second total overhead per 100-photo batch
- **Storage**: Checkpoint file ~5-10KB typical (negligible)

### Trade-offs
- ✅ **Benefit**: Resume capability (hours saved for large batches)
- ✅ **Benefit**: Config safety (prevents incorrect results)
- ✅ **Benefit**: Simple implementation (isolated module)
- ⚠️ **Cost**: Minimal disk I/O overhead (acceptable)
- ⚠️ **Cost**: One more JSON file to manage (deletable after success)

---

## 🔗 Downstream Dependencies

### For Phase 3 (@QA - Test Strategy)

Your test cases should cover:
1. **Checkpoint save/load cycle** (UT-001)
2. **Config hash validation** (UT-007, UT-008)
3. **Resume workflow**: interrupt → checkpoint → resume (IT-001)
4. **Config change detection** (IT-003)
5. **Large batch stability** (EC-003 with 250+ photos)

### For Phase 4 (@Dev - Implementation)

You'll implement:
1. `checkpoint-manager.js` using this exact schema
2. `batch-processor.js` integration following the flow diagram
3. CLI flags: `--checkpoint-interval`, `--clear-checkpoint`
4. Tests matching Phase 3 test strategy

---

## ✅ Phase 2 Definition of Done

- ✅ ADR-008 written with decision + rationale
- ✅ Checkpoint JSON schema defined with validation rules
- ✅ Atomic write strategy documented
- ✅ Error handling scenarios covered (6 scenarios)
- ✅ Integration diagram showing batch-processor interaction
- ✅ Module structure with function signatures defined
- ✅ CLI flags designed (`--checkpoint-interval`, `--clear-checkpoint`)
- ✅ Stored in `_bmad-output/architecture.md`
- ✅ Updated milestone planning (ADR-008 now in M2)

---

## 📚 What This Design Enables

### Immediate Value (Phase 4 Implementation)
- Clear blueprint for @Dev to code against
- Specific schema for @QA to test against
- No ambiguity on config handling or file locations
- Function signatures ready for implementation

### Medium Term (Phase 5 Validation)
- @QA can validate against this design
- @Dev can implement without guessing
- All edge cases anticipated and designed for

### Long Term (M3-4)
- Foundation for enhanced checkpoint features:
  - Checkpoint history (keep last 3)
  - Compression (gzip for large batches)
  - Expiration policy (auto-delete after 30 days)

---

## 📞 Questions for @Dev (Before Phase 4)

If clarification needed during implementation:
1. **Temp file naming**: Use `.analysis-checkpoint.json.tmp` for atomic write?
2. **Timestamp format**: ISO 8601 (2026-01-28T15:45:00Z) as shown?
3. **Hash format**: Include "sha256:" prefix in checkpoint.configHash?
4. **Existing file-utils**: Can we use for JSON I/O, or need custom?
5. **Error logging**: Use existing logger.js utility?

---

## 🎉 Phase 2 Summary

**Architecture design for FR-2.2 is complete and comprehensive.**

All critical decisions have been made:
- ✅ How to detect stale checkpoints (config hash)
- ✅ Where to store checkpoints (.analysis-checkpoint.json)
- ✅ What to store (analyzed photos, partial results, metadata)
- ✅ When to save (every N photos, configurable)
- ✅ How to handle errors (6 scenarios documented)
- ✅ How to integrate with existing code (detailed flow diagram)

**Next**: @QA designs test strategy for Phase 3 using this architecture.

---

**Commit**: `7646544`  
**File**: `_bmad-output/architecture.md`  
**Lines Added**: 238 (ADR-008 + Checkpoint System section)

Ready for Phase 3! 🚀
