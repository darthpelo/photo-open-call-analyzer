# FR-2.2 Phase 2: Solution Design & Architecture

**Owner**: @Architect  
**Status**: ⚪ Ready to Start  
**Phase 1 Complete**: ✅ Requirements finalized (see BACKLOG.md)  
**Estimated Duration**: 1 day

---

## Your Task

Design the technical solution for **FR-2.2: Resume Interrupted Analysis** based on requirements finalized in BACKLOG.md.

You will create:
1. **Architecture Design Document** - checkpoint system design
2. **ADR-008: Checkpoint Invalidation Strategy** - when/how to discard checkpoints
3. **Checkpoint Schema Diagram** - JSON structure and validation rules
4. **Integration Points** - how checkpoint interacts with batch-processor.js

**Deliverable**: Update `_bmad-output/architecture.md` with new ADR + checkpoint design section

---

## Requirements Context

From BACKLOG.md Phase 1 (finalized decisions):
- ✅ Checkpoint interval: Configurable, default 10, range 1-50
- ✅ Location: Hidden `.analysis-checkpoint.json` in project root
- ✅ Config handling: Validate config hash; auto-discard if changed
- ✅ Progress reporting: "N of M photos" format with progress bar
- ✅ Cleanup: Auto-delete on success, manual flag to reset
- ✅ Parallelism: Use original setting from checkpoint

---

## Design Tasks

### Task 1: Checkpoint System Architecture

**Questions to Answer**:

1. **State Management**
   - What data must be persisted in checkpoint? (analyzed photos, partial results, config hash, settings)
   - How do we track which photos are already analyzed?
   - Should we store individual photo scores or only aggregate results?

2. **Recovery Logic**
   - How do we detect stale checkpoints? (config hash mismatch, file corruption, timestamp)
   - What happens if checkpoint has 50 analyzed, but 5 fail on retry?
   - How do we validate checkpoint integrity before resuming?

3. **File System Interaction**
   - Checkpoint location: `.analysis-checkpoint.json` at project root
   - When to write checkpoint? (every N photos, or after each photo?)
   - Should checkpoint be atomic writes or append-based?

4. **Configuration Change Handling**
   - Store hash of open-call.json config in checkpoint
   - Auto-discard if config changed (new criteria = must re-analyze)
   - Should we warn user or silently restart? (recommend: silent, but log it)

### Task 2: Create ADR-008

**ADR Template** (add to _bmad-output/architecture.md):

```markdown
## ADR-008: Checkpoint Invalidation Strategy

### Context
Long-running photo analysis batches (100-500 photos, 2-8 hours) risk failure from timeouts, 
network issues, or user interruption. Checkpoints save progress, but invalid checkpoints 
(stale config, corrupted file) cause incorrect results.

### Decision
[Your recommendation for when checkpoints should be discarded]

### Rationale
[Why this approach over alternatives]

### Consequences
[What this means for implementation and UX]

### Alternatives Considered
1. [Alternative A with trade-offs]
2. [Alternative B with trade-offs]
3. [Alternative C with trade-offs]
```

**Key Trade-offs to Evaluate**:
- **Silent discard vs. User warning**: Silent is better UX but less transparent
- **Config hash vs. Full config comparison**: Hash is efficient, but could miss subtle changes
- **Timestamp-based expiration vs. Indefinite**: No expiration = simpler, but old checkpoints accumulate
- **Atomic writes vs. Append**: Atomic is safer but slower; append is faster but risk corruption

### Task 3: Detailed Checkpoint Schema

**Propose the exact JSON structure** with validation rules:

```json
{
  "version": "1.0",
  "projectDir": "data/open-calls/nature-wildlife/",
  
  "configHash": "sha256:abc123...",
  
  "analysisPrompt": {
    "criteria": [
      {"name": "Composition", "weight": 25}
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
    "analyzedPhotos": ["photo-001.jpg", "photo-002.jpg"],
    "photosCount": 45,
    "failedPhotos": [],
    "status": "in_progress" | "completed" | "abandoned"
  },
  
  "results": {
    "scores": {...},
    "statistics": {...},
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
- [ ] configHash: Must be SHA256 hash of open-call.json
- [ ] totalPhotosInBatch: Must match actual photo count on resume
- [ ] analyzedPhotos: Must be subset of all photos in directory
- [ ] parallelSetting: Must be integer, 1-50
- [ ] checkpointInterval: Must be integer, 1-50

### Task 4: Integration Points

**Diagram** how checkpoint interacts with existing code:

```
User runs: npm run analyze data/open-calls/nature-wildlife/

┌─────────────────────────────────────────────────────┐
│ batch-processor.js: processBatch()                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│ 1. loadCheckpoint(projectDir)                       │
│    → Returns checkpoint or null                     │
│                                                      │
│ 2. validateCheckpoint(checkpoint, currentConfig)    │
│    → Is checkpoint valid? (config hash, file)       │
│    → If invalid: log warning, return null           │
│                                                      │
│ 3. If checkpoint exists & valid:                    │
│    → Skip analyzed photos in getPhotoFiles()        │
│    → Load partial results for aggregation           │
│    → Report progress: "Resumed: 45/120"             │
│                                                      │
│ 4. analyzePhoto(photo) in loop                      │
│    → Run analysis as normal                         │
│                                                      │
│ 5. After every N photos:                            │
│    → saveCheckpoint(state, projectDir)              │
│    → Write .analysis-checkpoint.json atomically     │
│                                                      │
│ 6. After batch complete:                            │
│    → deleteCheckpoint(projectDir)  (cleanup)        │
│    → aggregateScores() with final results           │
│    → exportReports()                                │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**New Functions to Design**:
- `loadCheckpoint(projectDir)` → checkpoint object or null
- `saveCheckpoint(state, projectDir)` → write atomically
- `validateCheckpoint(checkpoint, currentConfig)` → true/false + reason
- `deleteCheckpoint(projectDir)` → cleanup after success
- `configHash(openCallJson)` → SHA256 hash

### Task 5: Error Handling During Resume

**Design what happens in these scenarios**:

1. **Checkpoint file corrupted**
   - Action: Log warning, discard checkpoint, start fresh
   - Rationale: Better to re-analyze than analyze with partial data

2. **Config changed (hash mismatch)**
   - Action: Log info, discard checkpoint, start fresh
   - Rationale: New criteria means old analyzed photos don't apply

3. **Checkpoint from different project**
   - Action: Detect mismatch in projectDir, log error, ask user
   - Rationale: Prevent analyzing wrong photos

4. **Photo deleted from directory since checkpoint**
   - Action: Log warning, skip photo in checkpoint list, continue
   - Rationale: User may have cleaned up directory

5. **New photos added to directory since checkpoint**
   - Action: Include new photos in batch, continue
   - Rationale: User likely wants to analyze new additions

6. **Checkpoint partially complete + one photo fails**
   - Action: Save updated checkpoint with failed photo marked
   - Rationale: User can retry; preserves progress

---

## Definition of Done (Phase 2)

- [ ] ADR-008 written with decision rationale and alternatives
- [ ] Checkpoint JSON schema finalized with validation rules
- [ ] Architecture diagram showing integration points
- [ ] Error handling scenarios documented
- [ ] New functions designed (signatures, inputs/outputs)
- [ ] Integration with batch-processor.js documented
- [ ] Atomic write strategy for checkpoint saves explained
- [ ] Config hash strategy detailed (SHA256 hash of what?)

---

## Output Format

**Update `_bmad-output/architecture.md`**:

1. Add new "Checkpoint System" section after existing ADRs
2. Add ADR-008 following existing ADR format
3. Add checkpoint schema with validation rules
4. Add integration diagram
5. Add error handling matrix

---

## Context & Reference

**Related Files**:
- [_bmad-output/PRD.md](_bmad-output/PRD.md) - FR-2.2 requirements (lines 66-72)
- [BACKLOG.md](BACKLOG.md) - Phase 1 finalized decisions
- [src/processing/batch-processor.js](src/processing/batch-processor.js) - Where checkpoint integrates
- [src/utils/file-utils.js](src/utils/file-utils.js) - JSON read/write utilities

**Key Dependencies**:
- All phase 1 requirements are LOCKED (no changes)
- Phase 3 (@QA) and Phase 4 (@Dev) depend on your design
- Your checkpoint schema directly enables testing strategy

---

## Next Phase

Once Phase 2 design is complete:
- @QA reads your design and creates 15+ test cases
- @Dev uses your schema to implement checkpoint functions
- Both will reference your ADR-008 for implementation details

---

## Questions for @Project Owner (if needed)

If your design reveals missing requirements:
1. Should checkpoint survive Ollama model changes? (e.g., switch llava:7b → llava:13b)
2. Should checkpoint survival work across different `--parallel` settings on resume?
3. Should we store individual photo feedback in checkpoint or only aggregate scores?

---

**Start here**: Read BACKLOG.md Phase 1 requirements, then begin Task 1.

Good luck! 🏗️
