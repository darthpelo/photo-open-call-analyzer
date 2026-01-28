# FR-2.2 Phase 4: Implementation

**Owner**: @Dev  
**Status**: ⚪ Ready to Start (after Phase 3 test design)  
**Phase 1 Complete**: ✅ Requirements finalized (see BACKLOG.md)  
**Phase 2 Dependency**: Architecture design (FR-2.2-PHASE2-ARCHITECT.md)  
**Phase 3 Dependency**: Test strategy (FR-2.2-PHASE3-QA.md)  
**Estimated Duration**: 3-4 days

---

## Your Task

Implement **FR-2.2: Resume Interrupted Analysis** following:
1. Phase 1 requirements (BACKLOG.md)
2. Phase 2 architecture (FR-2.2-PHASE2-ARCHITECT.md) - awaiting @Architect
3. Phase 3 test cases (FR-2.2-PHASE3-QA.md) - awaiting @QA

You will:
1. Create new module `src/processing/checkpoint-manager.js`
2. Update `src/processing/batch-processor.js` to use checkpoints
3. Update `src/cli/analyze.js` to add `--checkpoint-interval` and `--clear-checkpoint` flags
4. Write unit + integration tests following Phase 3 strategy
5. Update QUICKSTART.md with resume workflow documentation
6. All tests passing, code review ready

**Deliverable**: Feature branch `feature/m2-resume-analysis`, PR ready for review

---

## Context

### Phase 1: Requirements (LOCKED)
✅ Checkpoint interval: Default 10, configurable 1-50  
✅ Location: `.analysis-checkpoint.json` in project root  
✅ Config handling: SHA256 hash validation, auto-discard on mismatch  
✅ Progress: "N of M photos" format  
✅ Cleanup: Auto-delete on success, manual `--clear-checkpoint` flag  
✅ Parallelism: Resume with original setting from checkpoint  

### Phase 2: Architecture (WAITING FOR @Architect)
Will provide:
- Checkpoint schema (JSON structure with validation)
- ADR-008: Checkpoint invalidation strategy
- Integration points in batch-processor.js
- Error handling matrix

### Phase 3: Test Strategy (WAITING FOR @QA)
Will provide:
- 10 unit tests (saveCheckpoint, loadCheckpoint, validateCheckpoint)
- 5 integration tests (resume workflow, config change, error handling)
- 8 edge case tests (large batches, disk failure, race conditions)
- 5 manual test scenarios (real-world workflows)
- Test data setup (small/medium/large batches)

---

## Implementation Steps

### Step 1: Create `src/processing/checkpoint-manager.js`

**File**: Create new module  
**Purpose**: All checkpoint-related functions  
**Imports**: file-utils.js (for JSON I/O), crypto (for SHA256 hash)  
**Exports**: 6 functions

```javascript
// src/processing/checkpoint-manager.js

import crypto from 'crypto';
import { readJsonFile, writeJsonFile } from '../utils/file-utils.js';
import { logger } from '../utils/logger.js';

// ============================================
// Checkpoint Management Functions
// ============================================

/**
 * Compute SHA256 hash of open-call.json config
 * @param {Object} openCallConfig - Contents of open-call.json
 * @returns {string} SHA256 hash
 */
export function computeConfigHash(openCallConfig) {
  const configString = JSON.stringify(openCallConfig, Object.keys(openCallConfig).sort());
  return crypto.createHash('sha256').update(configString).digest('hex');
}

/**
 * Load checkpoint from project directory
 * @param {string} projectDir - Project root directory
 * @returns {Object|null} Checkpoint object or null if doesn't exist
 */
export function loadCheckpoint(projectDir) {
  try {
    const checkpointPath = `${projectDir}/.analysis-checkpoint.json`;
    const checkpoint = readJsonFile(checkpointPath);
    return checkpoint;
  } catch (error) {
    // File doesn't exist or is invalid JSON
    return null;
  }
}

/**
 * Save checkpoint to project directory
 * @param {Object} checkpoint - Checkpoint state to save
 * @param {string} projectDir - Project root directory
 * @returns {boolean} Success/failure
 */
export function saveCheckpoint(checkpoint, projectDir) {
  try {
    const checkpointPath = `${projectDir}/.analysis-checkpoint.json`;
    writeJsonFile(checkpointPath, checkpoint);
    return true;
  } catch (error) {
    logger.error(`Failed to save checkpoint: ${error.message}`);
    return false;
  }
}

/**
 * Validate checkpoint against current configuration
 * @param {Object} checkpoint - Checkpoint to validate
 * @param {Object} currentConfig - Current open-call.json
 * @returns {Object} {valid: boolean, reason: string}
 */
export function validateCheckpoint(checkpoint, currentConfig) {
  if (!checkpoint) {
    return { valid: false, reason: 'Checkpoint is null' };
  }

  // Check required fields
  const requiredFields = ['version', 'configHash', 'projectDir', 'progress', 'results'];
  for (const field of requiredFields) {
    if (!(field in checkpoint)) {
      return { valid: false, reason: `Missing required field: ${field}` };
    }
  }

  // Validate config hash
  const currentHash = computeConfigHash(currentConfig);
  if (checkpoint.configHash !== currentHash) {
    return { valid: false, reason: 'Configuration has changed since checkpoint' };
  }

  // Check timestamp (optional: discard if older than N days)
  const checkpointAge = Date.now() - new Date(checkpoint.metadata.createdAt).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (checkpointAge > sevenDaysMs) {
    return { valid: false, reason: 'Checkpoint is older than 7 days' };
  }

  return { valid: true, reason: 'Checkpoint is valid' };
}

/**
 * Delete checkpoint file
 * @param {string} projectDir - Project root directory
 * @returns {boolean} Success/failure
 */
export function deleteCheckpoint(projectDir) {
  try {
    const checkpointPath = `${projectDir}/.analysis-checkpoint.json`;
    // Use file system API to delete
    // TODO: Implement once file-utils supports deletion
    return true;
  } catch (error) {
    logger.error(`Failed to delete checkpoint: ${error.message}`);
    return false;
  }
}

/**
 * Initialize checkpoint for new batch
 * @param {string} projectDir - Project root
 * @param {Object} openCallConfig - open-call.json config
 * @param {Object} analysisPrompt - Generated analysis prompt
 * @param {number} parallelSetting - Original --parallel value
 * @param {number} checkpointInterval - Every N photos
 * @param {number} totalPhotos - Total photos in batch
 * @returns {Object} New checkpoint object
 */
export function initializeCheckpoint(projectDir, openCallConfig, analysisPrompt, 
                                     parallelSetting, checkpointInterval, totalPhotos) {
  return {
    version: '1.0',
    projectDir,
    configHash: computeConfigHash(openCallConfig),
    analysisPrompt,
    batchMetadata: {
      parallelSetting,
      checkpointInterval,
      totalPhotosInBatch: totalPhotos,
      photoDirectory: `${projectDir}/photos/`
    },
    progress: {
      analyzedPhotos: [],
      photosCount: 0,
      failedPhotos: [],
      status: 'in_progress'
    },
    results: {
      scores: {},
      statistics: null
    },
    metadata: {
      createdAt: new Date().toISOString(),
      lastResumedAt: new Date().toISOString(),
      resumeCount: 0
    }
  };
}

/**
 * Update checkpoint after analyzing batch of photos
 * @param {Object} checkpoint - Current checkpoint
 * @param {string[]} newAnalyzedPhotos - Photos just analyzed
 * @param {Object} newResults - Updated results/scores
 * @returns {Object} Updated checkpoint
 */
export function updateCheckpoint(checkpoint, newAnalyzedPhotos, newResults) {
  const updated = { ...checkpoint };
  updated.progress.analyzedPhotos = [
    ...updated.progress.analyzedPhotos,
    ...newAnalyzedPhotos
  ];
  updated.progress.photosCount = updated.progress.analyzedPhotos.length;
  updated.results = newResults;
  updated.metadata.lastResumedAt = new Date().toISOString();
  return updated;
}
```

### Step 2: Update `src/processing/batch-processor.js`

**Changes Required**:

1. Import checkpoint-manager functions
2. In `processBatch()`:
   - Load checkpoint if exists
   - Validate against current config
   - Skip already-analyzed photos
   - Save checkpoint every N photos
   - Delete checkpoint on success

3. Update `getPhotoFiles()` if needed to accept "exclude" list

```javascript
// Pseudo-code changes to batch-processor.js

import { loadCheckpoint, validateCheckpoint, saveCheckpoint, deleteCheckpoint, updateCheckpoint } from './checkpoint-manager.js';

export async function processBatch(batchConfig) {
  const { projectDir, checkpointInterval = 10, clearCheckpoint = false } = batchConfig;
  
  // 1. Load checkpoint if exists
  let checkpoint = null;
  if (!clearCheckpoint) {
    checkpoint = loadCheckpoint(projectDir);
    if (checkpoint) {
      const validation = validateCheckpoint(checkpoint, batchConfig.openCallConfig);
      if (validation.valid) {
        logger.info(`Resuming from checkpoint: ${checkpoint.progress.photosCount}/${checkpoint.batchMetadata.totalPhotosInBatch}`);
      } else {
        logger.info(`Checkpoint invalid: ${validation.reason}. Starting fresh.`);
        checkpoint = null;
      }
    }
  }
  
  // 2. Get list of photos to analyze
  const allPhotos = getPhotoFiles(projectDir);
  const analyzedPhotos = checkpoint ? checkpoint.progress.analyzedPhotos : [];
  const photosToAnalyze = allPhotos.filter(p => !analyzedPhotos.includes(p));
  
  // 3. Report progress
  if (checkpoint) {
    logger.section(`RESUMING ANALYSIS`);
    logger.info(`Resuming: ${analyzedPhotos.length}/${allPhotos.length} photos done, ${photosToAnalyze.length} remaining`);
  }
  
  // 4. Process photos in batches, saving checkpoint periodically
  const results = checkpoint ? checkpoint.results : {};
  let photoIndex = 0;
  
  for (const photo of photosToAnalyze) {
    const analysisResult = await analyzePhoto(photo);
    results[photo] = analysisResult;
    photoIndex++;
    
    // Save checkpoint every N photos
    if (photoIndex % checkpointInterval === 0) {
      checkpoint = updateCheckpoint(checkpoint, [photo], results);
      saveCheckpoint(checkpoint, projectDir);
      logger.debug(`Checkpoint saved: ${analyzedPhotos.length + photoIndex}/${allPhotos.length}`);
    }
  }
  
  // 5. On success, delete checkpoint
  deleteCheckpoint(projectDir);
  
  // 6. Aggregate and return results
  return aggregateScores(results);
}
```

### Step 3: Update `src/cli/analyze.js`

**Changes Required**:

1. Add `--checkpoint-interval` flag (default 10, range 1-50)
2. Add `--clear-checkpoint` flag (boolean, clears before run)
3. Pass these to `processBatch()`
4. Update help text with resume examples

```javascript
// Pseudo-code for analyze.js analyze command

program
  .command('analyze <projectDir>')
  .description('Analyze a competition')
  .option('--parallel <num>', 'Parallel workers', '3')
  .option('--checkpoint-interval <num>', 'Save checkpoint every N photos', '10')
  .option('--clear-checkpoint', 'Clear stale checkpoint before analyzing', false)
  .action(async (projectDir, options) => {
    const batchConfig = {
      projectDir,
      parallel: parseInt(options.parallel),
      checkpointInterval: parseInt(options.checkpointInterval),
      clearCheckpoint: options.clearCheckpoint
    };
    
    // Validate flags
    if (batchConfig.checkpointInterval < 1 || batchConfig.checkpointInterval > 50) {
      logger.error('Checkpoint interval must be between 1 and 50');
      process.exit(1);
    }
    
    // Run analysis (resume support built in)
    await processBatch(batchConfig);
  });
```

### Step 4: Write Tests

**Follow Phase 3 test design** (from @QA):

**Unit Tests** (10 test cases):
- Save/load checkpoint round-trip
- Config hash computation
- Validate checkpoint with matching config
- Validate checkpoint with changed config
- Handle corrupted checkpoint file
- etc.

**Integration Tests** (5 test cases):
- Full resume workflow (start → interrupt → resume)
- Skip analyzed photos
- Config change detection
- Error recovery
- Cleanup after success

**Example test file**: `tests/checkpoint-manager.test.js`

```javascript
// tests/checkpoint-manager.test.js

import { computeConfigHash, loadCheckpoint, saveCheckpoint, validateCheckpoint } from '../src/processing/checkpoint-manager.js';

describe('Checkpoint Manager', () => {
  describe('computeConfigHash()', () => {
    test('UT-001: Computes consistent SHA256 hash', () => {
      const config = { title: 'Test', theme: 'Nature' };
      const hash1 = computeConfigHash(config);
      const hash2 = computeConfigHash(config);
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA256 format
    });
  });
  
  describe('saveCheckpoint()', () => {
    test('UT-002: Saves checkpoint to .analysis-checkpoint.json', () => {
      const checkpoint = { version: '1.0', progress: { photosCount: 50 } };
      const result = saveCheckpoint(checkpoint, './test-project');
      expect(result).toBe(true);
      // Verify file was written
    });
  });
  
  // ... more tests following Phase 3 strategy
});
```

### Step 5: Update Documentation

**Update QUICKSTART.md** with new section:

```markdown
## Resume Long-Running Batches

For batches with 100+ photos, checkpoint support lets you resume from interruption:

### Start Analysis
```bash
npm run analyze data/open-calls/my-competition
```

Checkpoint is automatically saved every 10 photos.

### If Interrupted (Ctrl+C)
Just run the same command again:
```bash
npm run analyze data/open-calls/my-competition
```

The tool will detect the checkpoint and resume from where it left off.

### Customize Checkpoint Interval
Save checkpoint every 25 photos (useful for very large batches):
```bash
npm run analyze data/open-calls/my-competition --checkpoint-interval 25
```

### Clear Stale Checkpoint
If you want to start fresh (re-analyze all photos):
```bash
npm run analyze data/open-calls/my-competition --clear-checkpoint
```
```

---

## Git Workflow

### Create Feature Branch
```bash
git checkout -b feature/m2-resume-analysis
```

### Commit Structure (Suggested)
```
1. feat: Create checkpoint-manager.js module
2. feat: Integrate checkpoint into batch-processor.js
3. feat: Add CLI flags for checkpoint control
4. test: Add unit tests for checkpoint functions
5. test: Add integration tests for resume workflow
6. docs: Update QUICKSTART.md with resume examples
```

### Push & Create PR
```bash
git push origin feature/m2-resume-analysis
# Create PR via GitHub/CLI
```

---

## Checklist: Definition of Done

### Code Implementation
- [ ] `src/processing/checkpoint-manager.js` created with 6 functions
- [ ] `src/processing/batch-processor.js` updated to use checkpoints
- [ ] `src/cli/analyze.js` updated with `--checkpoint-interval` and `--clear-checkpoint` flags
- [ ] Checkpoint file format matches Phase 2 schema exactly
- [ ] Config hash validation working (discard on config change)
- [ ] Progress reporting accurate ("N of M photos")
- [ ] Checkpoint auto-deleted on successful completion
- [ ] Error handling for corrupted checkpoint (graceful fallback)

### Testing
- [ ] All 10 unit tests passing (≥90% coverage on checkpoint-manager.js)
- [ ] All 5 integration tests passing (resume workflow validated)
- [ ] All 8 edge case tests passing (boundary conditions covered)
- [ ] 0 regressions in existing test suite
- [ ] Manual tests verified (real batch resume workflows work)

### Documentation
- [ ] QUICKSTART.md updated with resume examples
- [ ] CLI help text updated with `--checkpoint-interval` and `--clear-checkpoint` docs
- [ ] Code comments added for checkpoint logic
- [ ] No TypeScript errors or ESLint warnings

### Code Quality
- [ ] Eslint passes (`npm run lint`)
- [ ] Prettier formatting applied (`npm run format`)
- [ ] No console.log() statements (use logger instead)
- [ ] Proper error handling (try/catch where needed)
- [ ] All functions have JSDoc comments

---

## Notes & Tips

### Testing with Interrupted Batches
- Use small test batch (50 photos) with `--checkpoint-interval 10`
- Kill process mid-batch (Ctrl+C)
- Verify checkpoint file created: `.analysis-checkpoint.json`
- Resume and verify photos aren't re-analyzed

### Performance Consideration
- Checkpoint saves happen every N photos
- Keep N reasonable (10-25) to avoid excessive disk I/O
- For 250+ photo batches, consider N=25 or higher

### Edge Cases to Handle
1. Checkpoint file corrupted → log warning, start fresh
2. Config changed → auto-discard checkpoint
3. Photo deleted from directory → skip it, continue
4. New photos added → include in batch
5. Disk full during checkpoint → catch error, continue analysis (no checkpoint saved for that batch)

---

## Context & Reference

**Phase 1 Requirements**: [BACKLOG.md](../BACKLOG.md) (locked, no changes)  
**Phase 2 Architecture**: [FR-2.2-PHASE2-ARCHITECT.md](../FR-2.2-PHASE2-ARCHITECT.md) (awaiting @Architect)  
**Phase 3 Test Design**: [FR-2.2-PHASE3-QA.md](../FR-2.2-PHASE3-QA.md) (awaiting @QA)  
**Related Files**:
- [src/processing/batch-processor.js](../../src/processing/batch-processor.js)
- [src/cli/analyze.js](../../src/cli/analyze.js)
- [src/utils/file-utils.js](../../src/utils/file-utils.js)
- [tests/](../../tests/)

---

## Next Steps (Phase 5: Validation & Merge)

After implementation is complete:
1. @QA runs full manual test suite
2. @Architect reviews code for ADR-008 alignment
3. @Project Owner approves feature
4. Code review via PR
5. Merge to main via GitHub UI

---

**Good luck! 🚀**
