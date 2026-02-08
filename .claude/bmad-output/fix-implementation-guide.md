# Implementation Guide: Timeout Issue Fixes

## FIX-1: Change Default Analysis Mode

**File**: `/src/cli/analyze.js`  
**Lines**: 69  
**Severity**: HIGH (blocks all batch processing)  
**Effort**: 5 minutes

### Current Code
```javascript
program
  .command('analyze <project-dir>')
  .description('Analyze photos in a project directory')
  .option('-o, --output <dir>', 'Output directory for results (relative to project)', 'results')  // FR-3.12: now project-relative with timestamped subdirs
  .option('-p, --parallel <n>', 'Number of parallel analyses', '3')
  .option('--skip-prompt', 'Skip prompt generation (use existing)')
  .option('--checkpoint-interval <n>', 'Save checkpoint every N photos (1-50)', '10')
  .option('--clear-checkpoint', 'Clear existing checkpoint before starting')
  .option('--photo-timeout <seconds>', 'Timeout per photo analysis in seconds (30-300)', '60')
  .option('--show-tiers', 'Display tier breakdown in terminal')
  .option('--analysis-mode <mode>', 'Analysis mode: single or multi (default: multi)', 'multi')  // LINE 69 - CHANGE THIS
  .action(async (projectDir, options) => {
```

### Fixed Code
```javascript
program
  .command('analyze <project-dir>')
  .description('Analyze photos in a project directory')
  .option('-o, --output <dir>', 'Output directory for results (relative to project)', 'results')  // FR-3.12: now project-relative with timestamped subdirs
  .option('-p, --parallel <n>', 'Number of parallel analyses', '3')
  .option('--skip-prompt', 'Skip prompt generation (use existing)')
  .option('--checkpoint-interval <n>', 'Save checkpoint every N photos (1-50)', '10')
  .option('--clear-checkpoint', 'Clear existing checkpoint before starting')
  .option('--photo-timeout <seconds>', 'Timeout per photo analysis in seconds (30-300)', '60')
  .option('--show-tiers', 'Display tier breakdown in terminal')
  .option('--analysis-mode <mode>', 'Analysis mode: single or multi (default: single)', 'single')  // CHANGED: 'multi' -> 'single'
  .action(async (projectDir, options) => {
```

### Change Summary
- Change default from `'multi'` to `'single'`
- Update description from "(default: multi)" to "(default: single)"
- Users can still use multi-stage with `--analysis-mode multi`

---

## FIX-2: Increase Timeout Multiplier

**File**: `/src/analysis/photo-analyzer.js`  
**Lines**: 503-505  
**Severity**: HIGH (prevents multi-stage mode)  
**Effort**: 5 minutes

### Current Code
```javascript
export async function analyzePhotoWithTimeout(photoPath, analysisPrompt, options = {}) {
  const timeout = options.timeout || 60000; // 60s default
  const timeoutSeconds = Math.floor(timeout / 1000);
  const analysisMode = options.analysisMode || 'single';

  try {
    // Select analysis function based on mode
    const analysisFn = analysisMode === 'multi' || analysisMode === 'multi-stage'
      ? analyzePhotoMultiStage
      : analyzePhoto;

    const result = await Promise.race([
      // Actual analysis
      analysisFn(photoPath, analysisPrompt, options).then(data => ({ data })),

      // Timeout promise (longer for multi-stage)
      new Promise((_, reject) => {
        const actualTimeout = analysisMode === 'multi' || analysisMode === 'multi-stage'
          ? timeout * 1.5 // 50% longer for multi-stage    // LINE 504 - CHANGE THIS
          : timeout;
        setTimeout(() => reject(new Error('TIMEOUT')), actualTimeout);
      })
    ]);
```

### Fixed Code
```javascript
export async function analyzePhotoWithTimeout(photoPath, analysisPrompt, options = {}) {
  const timeout = options.timeout || 60000; // 60s default
  const timeoutSeconds = Math.floor(timeout / 1000);
  const analysisMode = options.analysisMode || 'single';

  try {
    // Select analysis function based on mode
    const analysisFn = analysisMode === 'multi' || analysisMode === 'multi-stage'
      ? analyzePhotoMultiStage
      : analyzePhoto;

    const result = await Promise.race([
      // Actual analysis
      analysisFn(photoPath, analysisPrompt, options).then(data => ({ data })),

      // Timeout promise (longer for multi-stage)
      new Promise((_, reject) => {
        const actualTimeout = analysisMode === 'multi' || analysisMode === 'multi-stage'
          ? timeout * 4.0 // 4x for multi-stage (Stage 1 + 4 criteria + Stage 3)  // CHANGED: * 1.5 -> * 4.0
          : timeout;
        setTimeout(() => reject(new Error('TIMEOUT')), actualTimeout);
      })
    ]);
```

### Change Summary
- Change multiplier from `1.5` to `4.0`
- Update comment to explain: "4x for multi-stage (Stage 1 + 4 criteria + Stage 3)"
- Rationale: Multi-stage requires ~250s, 60s × 4.0 = 240s timeout

### Why 4.0x?
```
Stage 1: 50s (photo understanding)
Stage 2: 160s (4 criteria × 40s each, sequential)
Stage 3: 40s (consistency check)
Total:   250s

Multiplier needed: 250 / 60 = 4.167 ≈ 4.0x
```

---

## FIX-3: Parallelize Criterion Evaluation (RECOMMENDED)

**File**: `/src/analysis/photo-analyzer.js`  
**Lines**: 307-363  
**Severity**: MEDIUM (optimization, not blocking)  
**Effort**: 30 minutes (including testing)

### Current Code (Sequential Evaluation)
```javascript
    // Stage 2: Criterion-by-criterion evaluation
    logger.debug(`Stage 2: Evaluating ${stages.stage2.length} criteria...`);
    const stage2Prompts = injectStage1Output(stages.stage2, understandingText);

    const scores = {
      individual: {},
      summary: {}
    };

    // Evaluate each criterion
    for (const criterionPrompt of stage2Prompts) {
      logger.debug(`  Evaluating: ${criterionPrompt.criterion}`);

      const criterionResponse = await client.chat({
        model: model,
        messages: [
          {
            role: 'user',
            content: criterionPrompt.prompt,
            images: [base64Image]
          }
        ],
        options: {
          temperature: criterionPrompt.temperature,
          num_predict: criterionPrompt.maxTokens
        }
      });

      const evaluationText = criterionResponse.message.content;

      // Parse score from response
      const scoreMatch = evaluationText.match(/SCORE:\s*[^:]*:\s*(\d+)\/10/i);
      const reasoningMatch = evaluationText.match(/REASONING:\s*([^\n]+(?:\n(?!SCORE:|REASONING:)[^\n]+)*)/i);

      if (scoreMatch) {
        const score = parseInt(scoreMatch[1], 10);
        const reasoning = reasoningMatch ? reasoningMatch[1].trim() : evaluationText.substring(0, 200);

        // Find criterion weight
        const criterion = analysisPrompt.criteria.find(
          c => c.name === criterionPrompt.criterion
        );

        scores.individual[criterionPrompt.criterion] = {
          score: score,
          weight: criterion ? criterion.weight : 20,
          reasoning: reasoning,
          fullEvaluation: evaluationText
        };

        logger.debug(`  ${criterionPrompt.criterion}: ${score}/10`);
      } else {
        logger.warn(`  Could not parse score for ${criterionPrompt.criterion}`);
        // Fallback: try to extract any number
        const anyNumber = evaluationText.match(/(\d+)\/10/);
        if (anyNumber) {
          const score = parseInt(anyNumber[1], 10);
          scores.individual[criterionPrompt.criterion] = {
            score: score,
            weight: 20,
            reasoning: evaluationText.substring(0, 200),
            fullEvaluation: evaluationText
          };
        }
      }
    }
```

### Fixed Code (Parallel Evaluation)
```javascript
    // Stage 2: Criterion-by-criterion evaluation (PARALLEL)
    logger.debug(`Stage 2: Evaluating ${stages.stage2.length} criteria in parallel...`);
    const stage2Prompts = injectStage1Output(stages.stage2, understandingText);

    const scores = {
      individual: {},
      summary: {}
    };

    // Evaluate all criteria in parallel (Promise.all)
    const criterionResponses = await Promise.all(
      stage2Prompts.map(criterionPrompt => {
        logger.debug(`  Queuing evaluation: ${criterionPrompt.criterion}`);
        return client.chat({
          model: model,
          messages: [
            {
              role: 'user',
              content: criterionPrompt.prompt,
              images: [base64Image]
            }
          ],
          options: {
            temperature: criterionPrompt.temperature,
            num_predict: criterionPrompt.maxTokens
          }
        });
      })
    );

    // Process responses
    criterionResponses.forEach((criterionResponse, index) => {
      const criterionPrompt = stage2Prompts[index];
      const evaluationText = criterionResponse.message.content;

      // Parse score from response
      const scoreMatch = evaluationText.match(/SCORE:\s*[^:]*:\s*(\d+)\/10/i);
      const reasoningMatch = evaluationText.match(/REASONING:\s*([^\n]+(?:\n(?!SCORE:|REASONING:)[^\n]+)*)/i);

      if (scoreMatch) {
        const score = parseInt(scoreMatch[1], 10);
        const reasoning = reasoningMatch ? reasoningMatch[1].trim() : evaluationText.substring(0, 200);

        // Find criterion weight
        const criterion = analysisPrompt.criteria.find(
          c => c.name === criterionPrompt.criterion
        );

        scores.individual[criterionPrompt.criterion] = {
          score: score,
          weight: criterion ? criterion.weight : 20,
          reasoning: reasoning,
          fullEvaluation: evaluationText
        };

        logger.debug(`  ${criterionPrompt.criterion}: ${score}/10`);
      } else {
        logger.warn(`  Could not parse score for ${criterionPrompt.criterion}`);
        // Fallback: try to extract any number
        const anyNumber = evaluationText.match(/(\d+)\/10/);
        if (anyNumber) {
          const score = parseInt(anyNumber[1], 10);
          scores.individual[criterionPrompt.criterion] = {
            score: score,
            weight: 20,
            reasoning: evaluationText.substring(0, 200),
            fullEvaluation: evaluationText
          };
        }
      }
    });
```

### Change Summary
- Replace `for...await` loop with `Promise.all()`
- Map each criterion to a Promise
- Wait for all promises to resolve simultaneously
- Process results in same order

### Performance Impact
**Before (Sequential)**:
- Stage 2 time: 4 criteria × 40s = 160 seconds
- Total multi-stage: 250 seconds

**After (Parallel)**:
- Stage 2 time: max(40s, 40s, 40s, 40s) = 40 seconds
- Total multi-stage: 130 seconds
- **Speedup: 4.2x improvement** (250s → 130s)

### Testing Required for FIX-3
```bash
# Test multi-stage with parallelization
npm run analyze -- analyze ./data/open-calls/dilettante-edition7/ \
  --analysis-mode multi \
  --photo-timeout 300 \
  --parallel 1

# Should complete in ~2-3 minutes instead of 12+ minutes
# Verify all 5 photos analyzed successfully
# Check that scores are reasonable (7-8/10 range based on single-stage results)
```

---

## Verification Checklist

After implementing all three fixes:

### Fix 1 Verification (5 min)
- [ ] Default `--analysis-mode` is now 'single'
- [ ] `npm run analyze -- analyze ./data/open-calls/dilettante-edition7/` completes successfully
- [ ] All 5 photos analyzed (no timeouts)
- [ ] Scores in expected range (6.6 - 8.4 from test data)

### Fix 2 Verification (5 min)
- [ ] Timeout multiplier is 4.0x
- [ ] `npm run analyze -- analyze ./data/open-calls/dilettante-edition7/ --analysis-mode multi` completes
- [ ] No timeouts with multi-stage mode

### Fix 3 Verification (15 min)
- [ ] Criterion evaluation is parallelized (check for "Queuing evaluation" logs)
- [ ] Multi-stage completes in <3 minutes (vs 12+ before)
- [ ] Scores match between single-stage and multi-stage modes
- [ ] All criteria are evaluated (4/4 present in results)
- [ ] Consistency check (Stage 3) runs after all criteria evaluated

---

## Summary

| Fix | Priority | Time | Impact |
|-----|----------|------|--------|
| **FIX-1**: Change default mode | IMMEDIATE | 5 min | Fixes 100% of timeout failures |
| **FIX-2**: Increase multiplier | URGENT | 5 min | Enables multi-stage mode |
| **FIX-3**: Parallelize criteria | RECOMMENDED | 30 min | 4x performance improvement |
| **Testing** | REQUIRED | 15 min | Verify all fixes work |

**Total Effort**: ~55 minutes

**Expected Outcome**: Batch analysis with default settings works reliably. Users can opt-in to multi-stage mode for higher-quality analysis.
