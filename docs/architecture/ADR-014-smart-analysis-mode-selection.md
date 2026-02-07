# ADR-014: Smart Analysis Mode Selection

**Status**: Proposed
**Date**: 2026-02-07
**Deciders**: Development Team, Architect, QA Engineer
**Context**: Performance Optimization - FIX-3 Follow-up (INVESTIGATION_COMPLETE.md)

---

## Context and Problem Statement

The QA investigation (`INVESTIGATION_COMPLETE.md`) identified that all 5 photos in batch processing timed out because the default analysis mode was `multi` (requiring ~250s) but the timeout was only 90s. FIX-1 (change default to `single`) and FIX-2 (increase timeout multiplier to 4.0x) resolved the immediate crisis. However, two problems remain:

1. **Sequential criterion evaluation**: In `photo-analyzer.js` lines 307-363, the `analyzePhotoMultiStage()` function evaluates each criterion sequentially with a `for...of` loop. For 4 criteria at ~40s each, Stage 2 takes 160s. This is the single largest performance bottleneck.

2. **Binary mode choice**: Users must manually choose between `--analysis-mode single` (fast, lower quality) and `--analysis-mode multi` (slow, higher quality). This requires understanding internal timing characteristics. Additionally, there is an inconsistency: `analyze.js` line 69 defaults to `'single'`, while `batch-processor.js` line 32 defaults to `'multi'`.

The proposal is twofold:
- **(a) FIX-3**: Parallelize Stage 2 criterion evaluation with `Promise.all()`, reducing multi-stage from 250s to ~130s
- **(b) Smart auto-selection**: Introduce `--analysis-mode auto` as the new default, with a `smartSelectAnalysisMode(context)` function that heuristically selects the optimal mode

---

## Decision Drivers

### Technical Requirements
- Multi-stage analysis produces higher quality results (ADR-009: lower score variance, criterion-specific reasoning, consistency checks)
- The default mode must never cause timeouts (root cause of the original bug)
- Users should not need to understand timing math to get optimal results
- Explicit `--analysis-mode single|multi` must always override auto-selection
- The batch-processor / CLI default inconsistency must be resolved

### User Experience Goals
- Small batches (1-5 photos) are the most common use case for competitions (photo selection)
- Large batch scanning should automatically get speed optimization
- Auto-selection decision should be transparent (logged to console)

---

## Considered Options

### Option 1: Keep Manual Selection (single default)

**Overview**: Leave `analyze.js` at `'single'` default. Fix `batch-processor.js` to match.

**Pros**:
- Simple, predictable, no timeouts

**Cons**:
- Users miss multi-stage quality for small batches (the primary use case)
- Users must know about `--analysis-mode multi`
- No parallelization improvement

**Verdict**: Safe but suboptimal -- sacrifices quality for simplicity

---

### Option 2: Auto-selection with Heuristic + FIX-3 Parallelization

**Overview**: New `smartSelectAnalysisMode(context)` function + `Promise.all()` parallelization.

**Pros**:
- Optimal quality/speed tradeoff automatically
- Fixes default inconsistency
- FIX-3 makes multi-stage practical for all batch sizes

**Cons**:
- Heuristic adds complexity
- Needs thorough testing
- Auto-selection may surprise users (mitigated by logging)

**Verdict**: Best overall approach -- users get optimal results automatically

---

### Option 3: Always Multi-stage with Parallelization Only

**Overview**: Apply FIX-3 and make `multi` the default again.

**Pros**:
- Consistent quality, simplest logic

**Cons**:
- Still 130s per photo for 20+ photo batches where single (34s) is preferable
- Total for 20 photos: 43 minutes (multi) vs. 11 minutes (single)
- Timeout risk on constrained setups

**Verdict**: Too slow for large batches; unacceptable 4x penalty

---

## Decision Outcome

**Chosen option: Option 2 - Auto-selection with Heuristic + FIX-3 Parallelization**

---

## FIX-3 Implementation: Parallelize Stage 2

### Current Code (Sequential - lines 307-363)

```javascript
for (const criterionPrompt of stage2Prompts) {
  const criterionResponse = await client.chat({...});
  // parse and store score
}
```

### New Code (Parallel)

```javascript
const criterionResults = await Promise.all(
  stage2Prompts.map(async (criterionPrompt) => {
    logger.debug(`  Queuing evaluation: ${criterionPrompt.criterion}`);
    const criterionResponse = await client.chat({
      model: model,
      messages: [{
        role: 'user',
        content: criterionPrompt.prompt,
        images: [base64Image]
      }],
      options: {
        temperature: criterionPrompt.temperature,
        num_predict: criterionPrompt.maxTokens
      }
    });
    return {
      criterion: criterionPrompt.criterion,
      evaluationText: criterionResponse.message.content
    };
  })
);

// Process results (same parsing logic)
for (const { criterion, evaluationText } of criterionResults) {
  // existing score parsing logic
}
```

### Performance Impact

```
Before (Sequential):
  Stage 1: 50s | Stage 2: 4x40s = 160s | Stage 3: 40s | Total: 250s

After (Parallel):
  Stage 1: 50s | Stage 2: ~40-80s* | Stage 3: 40s | Total: 130-170s

* Note: Local Ollama with single GPU may queue requests internally.
  Expect ~2x real speedup (not 4x) due to GPU serialization.
```

---

## Smart Selection Algorithm

### Function Design

```javascript
/**
 * Intelligently selects analysis mode based on runtime context.
 * @param {Object} context
 * @param {number} context.photoCount - Number of photos to analyze
 * @param {number} context.timeoutMs - Per-photo timeout in milliseconds
 * @param {number} context.criteriaCount - Number of evaluation criteria
 * @returns {string} 'single' or 'multi'
 */
export function smartSelectAnalysisMode(context) {
  const { photoCount, timeoutMs, criteriaCount } = context;

  let multiScore = 0;
  let singleScore = 0;

  // Photo count signal (weight: 2)
  if (photoCount <= 5) multiScore += 2;
  else if (photoCount > 10) singleScore += 2;
  else multiScore += 1;

  // Timeout signal (weight: 1-2)
  if (timeoutMs >= 240000) multiScore += 1;
  else if (timeoutMs < 120000) singleScore += 2;

  // Criteria count signal (weight: 1)
  if (criteriaCount <= 6) multiScore += 1;
  else singleScore += 1;

  return multiScore >= singleScore ? 'multi' : 'single';
}
```

### Decision Matrix

| Scenario | Photos | Timeout | Criteria | Multi | Single | Result |
|----------|--------|---------|----------|-------|--------|--------|
| Typical competition | 5 | 60s | 4 | 3 | 2 | **multi** |
| Large portfolio | 20 | 60s | 4 | 1 | 4 | **single** |
| Small + generous timeout | 3 | 300s | 4 | 4 | 0 | **multi** |
| Medium + restrictive | 8 | 90s | 8 | 1 | 3 | **single** |
| Edge: 6 photos, 120s, 6 criteria | 6 | 120s | 6 | 2 | 0 | **multi** |

---

## Integration Points

### 1. `src/analysis/photo-analyzer.js`
- Add exported `smartSelectAnalysisMode()` function
- Refactor `analyzePhotoMultiStage()` lines 307-363 to use `Promise.all()`
- Safety check: if `analysisMode === 'auto'`, treat as `'single'`

### 2. `src/cli/analyze.js` (line 69)
- Change default from `'single'` to `'auto'`
- Update description: `'Analysis mode: single, multi, or auto (default: auto)'`

### 3. `src/processing/batch-processor.js` (line 32)
- Change default from `'multi'` to `'auto'`
- When mode is `'auto'`, call `smartSelectAnalysisMode()` with context:

```javascript
import { smartSelectAnalysisMode } from '../analysis/photo-analyzer.js';

let effectiveMode = analysisMode;
if (analysisMode === 'auto') {
  effectiveMode = smartSelectAnalysisMode({
    photoCount: photosToAnalyze.length,
    timeoutMs: options.photoTimeout || 60000,
    criteriaCount: analysisPrompt.criteria?.length || 5
  });
  logger.info(`Auto-selected analysis mode: ${effectiveMode} ` +
    `(${photosToAnalyze.length} photos, ${analysisPrompt.criteria?.length || 5} criteria, ` +
    `${(options.photoTimeout || 60000) / 1000}s timeout)`);
}
```

---

## Consequences

### Positive

- Users get optimal quality/speed without manual mode selection
- FIX-3 reduces multi-stage time by ~50% (250s -> 130s), making multi-stage practical
- Fixes the batch-processor / CLI default inconsistency
- Typical competition use case (3-5 photos) automatically gets multi-stage quality
- Large batch scanning automatically gets single-stage speed
- Explicit `--analysis-mode` flag always overrides, preserving full user control
- Logging makes the auto-selection decision transparent

### Negative

- Heuristic may not be optimal for all edge cases (tunable with updated thresholds)
- Adds ~30 lines of code to photo-analyzer.js
- `Promise.all()` parallelization may not yield full 4x speedup with local Ollama (GPU serialization)
- Users unfamiliar with the change may wonder why mode varies between runs

### Neutral

- The heuristic weights can be tuned based on production usage data
- Future enhancement: `--analysis-mode auto-verbose` for detailed selection reasoning
- Ollama multi-model support could improve parallelization in the future

---

## Related Decisions

- **ADR-009**: Multi-stage prompting -- this ADR makes it the default for small batches
- **ADR-013**: TDD enforcement -- `smartSelectAnalysisMode` must have tests from day one
- **QA Investigation**: `.claude/bmad-output/INVESTIGATION_COMPLETE.md` (FIX-3 origin)

---

## References

- **Photo Analyzer**: `src/analysis/photo-analyzer.js` (lines 264-444 multi-stage, 307-363 sequential loop, 486-531 timeout wrapper)
- **CLI**: `src/cli/analyze.js` (line 69)
- **Batch Processor**: `src/processing/batch-processor.js` (line 32)
- **QA Investigation**: `.claude/bmad-output/INVESTIGATION_COMPLETE.md`
- **Fix Guide**: `.claude/bmad-output/fix-implementation-guide.md`
- **Implementation Plan**: `/Users/alessioroberto/.claude/plans/federated-baking-iverson.md`

---

## Approval & Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Architect | BMAD Architect | 2026-02-07 | Proposed |
| QA Engineer | Luca | 2026-02-07 | Pending Review |
| Development Lead | Dev | 2026-02-07 | Pending Review |
