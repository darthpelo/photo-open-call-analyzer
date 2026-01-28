# FR-2.3 Phase 5: Validation & Testing - Checklist

## Overview

Phase 5 is the final phase before PR creation. All implementation is complete. This phase focuses on:
1. Running full test suite and verifying coverage
2. Executing manual test scenarios
3. Performance and regression testing
4. Final verification before PR

**Estimated Time**: 1-2 days
**Status**: READY TO START

---

## Automated Test Suite Execution

### Step 1: Install Test Dependencies (if needed)

```bash
npm install --save-dev jest @jest/globals
```

### Step 2: Run Full Test Suite

```bash
npm test
```

**Expected Output**:
- ✓ 30+ tests passing
- ✓ No test failures
- ✓ All test files executed

**Coverage Target**: ≥85% overall, ≥90% on photo-validator.js

```bash
npm run test:coverage
```

### Test Files to Verify

- [ ] tests/photo-validator.test.js (8 tests)
  - Valid JPEG validation
  - Unsupported format rejection
  - Corrupted file detection
  - Missing file reporting
  - Metadata extraction
  - Size warnings
  - Permission handling
  - Batch validation

- [ ] tests/error-classifier.test.js (7 tests)
  - Timeout detection
  - Ollama connection errors
  - File system errors
  - Corrupted file detection
  - Invalid format detection
  - Unknown error fallback
  - Error logging

- [ ] tests/photo-analyzer-timeout.test.js (5 tests)
  - Successful analysis within timeout
  - Timeout detection
  - Configurable timeout
  - Default timeout
  - Result structure
  - Error propagation
  - Timeout messages
  - Multiple timeouts
  - Invalid timeout values

- [ ] tests/batch-processor-integration.test.js (5 tests)
  - Valid photo processing
  - failedPhotos in results
  - photoTimeout option
  - Parallel configuration
  - Checkpoint preservation
  - Error summary
  - Large batch handling

- [ ] tests/report-generator-failed-photos.test.js (4 tests)
  - Failed photos section in markdown
  - Failed photos count in header
  - Table structure
  - Failed photo details
  - Empty list handling
  - Rankings with failures
  - JSON structure
  - Edge cases (long messages, special chars)

---

## Manual Testing Scenarios

### Scenario MT-ER-001: Corrupted JPEG Detection

**Setup**:
```bash
# Create a test project with a corrupted image
mkdir -p test-corrupted/photos
cp docs/guides/QUICKSTART.md test-corrupted/open-call.json
# Create a corrupted JPEG (truncated file)
head -c 100 /path/to/real.jpg > test-corrupted/photos/corrupted.jpg
```

**Test**:
```bash
npm run analyze test-corrupted
```

**Expected**:
- ✓ Analysis starts
- ✓ Corrupted.jpg skipped with error message
- ✓ Failed Photos section in report shows: `| corrupted.jpg | CORRUPTED_FILE | Corrupted file | ... |`
- ✓ Analysis completes (not crashed)
- ✓ failedPhotos in JSON with details

**Verification**:
```bash
grep "corrupted" results/photo-analysis.md
grep "CORRUPTED_FILE" results/photo-analysis.json
```

### Scenario MT-ER-002: HEIC Format Support

**Setup**:
```bash
# If on macOS with actual HEIC photo
mkdir -p test-heic/photos
cp docs/guides/QUICKSTART.md test-heic/open-call.json
cp /path/to/iphone/photo.heic test-heic/photos/
```

**Test**:
```bash
npm run analyze test-heic
```

**Expected**:
- ✓ HEIC photo detected as valid format
- ✓ Analysis completes successfully
- ✓ Photo appears in rankings (not in failed)
- ✓ Results include HEIC photo score

### Scenario MT-ER-003: Custom Timeout Configuration

**Setup**:
```bash
mkdir -p test-timeout/photos
cp docs/guides/QUICKSTART.md test-timeout/open-call.json
cp /path/to/photo.jpg test-timeout/photos/
```

**Test 1: Invalid timeout (should fail)**:
```bash
npm run analyze test-timeout -- --photo-timeout 25
```

**Expected**:
- ✗ Error: "must be between 30 and 300 seconds"
- ✓ Process exits with code 1

**Test 2: Valid timeout**:
```bash
npm run analyze test-timeout -- --photo-timeout 90
```

**Expected**:
- ✓ Analysis completes
- ✓ Uses 90-second timeout (verify in logs if debug enabled)

### Scenario MT-ER-004: Ollama Connection Loss Recovery

**Setup**:
```bash
mkdir -p test-reconnect/photos
cp docs/guides/QUICKSTART.md test-reconnect/open-call.json
cp /path/to/photo1.jpg /path/to/photo2.jpg test-reconnect/photos/
```

**Test**:
```bash
# Terminal 1: Start analysis
npm run analyze test-reconnect

# Terminal 2: Wait for first photo to complete, then stop Ollama
# (after ~30-45 seconds)
killall ollama
```

**Expected**:
- ✓ Analysis starts, processes first photo
- ✓ Connection lost detected
- ✓ Message: "Ollama connection lost. Saving checkpoint..."
- ✓ Checkpoint saved to data/open-calls/reconnect/.checkpoint.json
- ✓ Process exits with code 1

**Verification**:
```bash
# Terminal 1: Restart Ollama
ollama serve

# Terminal 2: Restart analysis
npm run analyze test-reconnect

# Expected: Resumes from checkpoint, skips already analyzed photo
```

**Check checkpoint preservation**:
```bash
grep "progress" data/open-calls/test-reconnect/.checkpoint.json
```

### Scenario MT-ER-005: Large File Timeout

**Setup**:
```bash
# Create a large image that will take long to analyze
mkdir -p test-large/photos
cp docs/guides/QUICKSTART.md test-large/open-call.json
# Create a large (e.g., 10MB+) but valid image
convert -size 4000x4000 -depth 8 /dev/zero test-large/photos/huge.jpg
```

**Test 1: Default timeout (might timeout)**:
```bash
npm run analyze test-large
```

**Test 2: Extended timeout**:
```bash
npm run analyze test-large -- --clear-checkpoint --photo-timeout 180
```

**Expected**:
- ✓ Analysis handles both scenarios gracefully
- ✓ If timeout: Failed Photos section shows TIMEOUT
- ✓ If success: Photo included in results
- ✓ No crash in either case

---

## Regression Testing

### Existing Feature Verification

Verify that Phase 4 changes didn't break existing functionality:

#### Test 1: Happy Path (no errors)

```bash
# Setup a clean project with valid images only
mkdir -p test-happy/photos
cp docs/guides/QUICKSTART.md test-happy/open-call.json
cp /path/to/valid/photo1.jpg /path/to/valid/photo2.jpg test-happy/photos/

# Run analysis
npm run analyze test-happy

# Verify results
```

**Expected**:
- ✓ All photos analyzed
- ✓ failedPhotos array is empty in JSON
- ✓ No "Failed Photos" section in markdown
- ✓ All photos in rankings
- ✓ Reports generated correctly

#### Test 2: Resume Checkpoint (FR-2.2 compatibility)

```bash
mkdir -p test-resume/photos
cp docs/guides/QUICKSTART.md test-resume/open-call.json
cp /path/to/photo1.jpg /path/to/photo2.jpg /path/to/photo3.jpg test-resume/photos/

# Run 1: Analyze first 2
npm run analyze test-resume -- --checkpoint-interval 2

# Stop after first 2 photos (Ctrl+C after ~60 seconds)
# Verify checkpoint exists
ls -la data/open-calls/test-resume/.checkpoint.json

# Run 2: Resume analysis
npm run analyze test-resume

# Expected: Skips first 2, analyzes remaining
```

**Expected**:
- ✓ First run: Checkpoint saved after 2 photos
- ✓ Second run: Resumes automatically
- ✓ failedPhotos preserved across checkpoint restarts
- ✓ Final report includes all 3 photos

#### Test 3: Report Formats

```bash
# After analysis, verify all report formats exist and are valid
ls -la results/photo-analysis.*
```

**Expected**:
- ✓ photo-analysis.md exists and is readable
- ✓ photo-analysis.json is valid JSON
- ✓ photo-analysis.csv is parseable

**Verify format**:
```bash
# Markdown
cat results/photo-analysis.md | head -20

# JSON
jq '.metadata' results/photo-analysis.json

# CSV
head -5 results/photo-analysis.csv
```

---

## Performance Testing

### Benchmark: 50+ Photos

```bash
# Create test batch with 50+ photos (real images if possible)
mkdir -p test-perf/photos
for i in {1..50}; do cp sample.jpg test-perf/photos/photo$i.jpg; done

# Run with timing
time npm run analyze test-perf -- --parallel 4
```

**Expected Performance**:
- ✓ Completes within reasonable time (depends on photo size)
- ✓ Memory usage stays stable
- ✓ No memory leaks after completion
- ✓ Checkpoint saves occur regularly
- ✓ All 50 photos processed or tracked as failed

**Check metrics**:
- Processing time per photo
- Total elapsed time
- Memory usage (should be constant)
- Failed photo count

---

## Code Quality Verification

### Static Analysis

```bash
# Run syntax check on all modified files
node --check src/processing/photo-validator.js
node --check src/utils/error-classifier.js
node --check src/processing/batch-processor.js
node --check src/output/report-generator.js
node --check src/cli/analyze.js
node --check src/analysis/photo-analyzer.js

# If ESLint available
npm run lint
```

**Expected**: ✓ All files pass syntax check

### Type/Correctness Check

```bash
# Review code for common issues
grep -n "console.log" src/**/*.js  # Should have none (use logger)
grep -n "TODO" src/**/*.js         # Should have none
grep -n "FIXME" src/**/*.js        # Should have none
```

---

## Documentation Verification

- [ ] QUICKSTART.md has error handling section
- [ ] --photo-timeout documented with examples
- [ ] HEIC format support documented
- [ ] Common errors troubleshooting section present
- [ ] Failed Photos report format explained
- [ ] Features list updated with M2 additions
- [ ] Phase 4 implementation summary present
- [ ] Status report present

---

## Final Verification Checklist

Before moving to PR creation:

- [ ] All 34 automated tests passing
- [ ] Test coverage ≥85% overall
- [ ] Test coverage ≥90% on photo-validator.js
- [ ] All 5 manual scenarios completed successfully
- [ ] No regressions in existing features
- [ ] Happy path test passes (valid images only)
- [ ] Resume checkpoint test passes (FR-2.2 compat)
- [ ] Report formats valid (MD, JSON, CSV)
- [ ] Performance acceptable (50+ photos)
- [ ] Code passes syntax check
- [ ] No console.log, TODO, or FIXME comments
- [ ] Documentation complete and accurate
- [ ] Backward compatibility verified
- [ ] No breaking changes

---

## Sign-Off

Once all items above are verified:

✅ Phase 5 COMPLETE - Ready for PR creation

**Next**: Create PR with:
- Comprehensive description
- Test results summary
- Manual test evidence
- Reference to ADR-009
- Link to Phase 4 implementation summary

---

## Time Tracking

- Estimated Phase 5 duration: 1-2 days
- Test execution: 30 minutes
- Manual scenarios: 45 minutes
- Performance testing: 30 minutes
- Documentation review: 15 minutes
- **Total**: ~2 hours hands-on work
- **Buffer**: 1-2 days for any issues

**Target completion**: 2-3 days from Phase 4 start
