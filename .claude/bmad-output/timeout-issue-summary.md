# Quick Fix Guide: Photo Analysis Timeout Issue

## Problem
All 5 photos timeout when running batch analysis with default settings.
- Error: "Analysis timeout after 60s"
- Success rate: 0/5 photos

## Root Cause
**Default analysis mode is "multi-stage" but timeout is too short.**

Multi-stage analysis requires:
- Stage 1 (Understanding): 50 seconds
- Stage 2 (4 criteria sequentially): 160 seconds
- Stage 3 (Consistency): 40 seconds
- **Total: 250 seconds**

Current timeout: 60 seconds × 1.5 = **90 seconds** ❌

## Why Single-Stage Works
Single-stage = 1 API call with all criteria = 80 seconds ✅

## The Fix (3 Steps)

### Step 1: Change Default Mode (5 min) - IMMEDIATE
**File**: `/src/cli/analyze.js` line 69

```diff
- .option('--analysis-mode <mode>', 'Analysis mode: single or multi (default: multi)', 'multi')
+ .option('--analysis-mode <mode>', 'Analysis mode: single or multi (default: single)', 'single')
```

### Step 2: Fix Timeout Multiplier (5 min) - URGENT
**File**: `/src/analysis/photo-analyzer.js` lines 503-505

```diff
  const actualTimeout = analysisMode === 'multi' || analysisMode === 'multi-stage'
-   ? timeout * 1.5
+   ? timeout * 4.0
    : timeout;
```

### Step 3: Parallelize Criteria (30 min) - RECOMMENDED
**File**: `/src/analysis/photo-analyzer.js` lines 307-363

Change from sequential loop to `Promise.all()` to evaluate all 4 criteria in parallel:
- Reduces Stage 2 from 160s to 40s
- Makes multi-stage practical for batch processing

## Test to Verify Fix

```bash
# Test 1: Default mode (should use single-stage now)
npm run analyze -- analyze ./data/open-calls/dilettante-edition7/

# Test 2: Multi-stage mode (should work with 4x multiplier)
npm run analyze -- analyze ./data/open-calls/dilettante-edition7/ --analysis-mode multi --photo-timeout 300

# Expected: All 5 photos analyzed successfully
```

## Timeline Impact
- **Fix 1+2 (10 min total)**: Restores functionality
- **Fix 3 (30 min)**: Optimizes multi-stage for batch use
- **Testing (15 min)**: Verify all modes work

**Total effort**: ~55 minutes to complete implementation and verification

---

## Detailed Analysis
See: `/Users/alessioroberto/Documents/photo-open-call-analyzer/.claude/bmad-output/test-report.md`

**Status**: REJECT until fixes implemented
