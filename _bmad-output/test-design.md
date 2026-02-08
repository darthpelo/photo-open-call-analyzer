# Test Design Document: Photo Open Call Analyzer

**Version**: 1.0  
**Date**: January 28, 2026  
**Status**: APPROVED  
**Owner**: QA  
**Last Updated**: 2026-01-28

---

## 1. Test Strategy Overview

This document defines risk-based test planning for Photo Open Call Analyzer using BMAD's Test Architecture (TEA) framework. It establishes test priorities, coverage targets, and acceptance criteria for Milestones 2–4.

**Testing Philosophy**: Risk-based prioritization focusing on critical paths (photo analysis accuracy, batch processing reliability) and edge cases that impact user trust.

---

## 2. Test Objectives

### Primary Objectives
1. **Ensure photo analysis accuracy** - Verify LLaVA model responses parse correctly and produce valid scores
2. **Validate batch resilience** - Single photo failures don't corrupt batch results
3. **Confirm data integrity** - Export formats (MD, JSON, CSV) are correct and complete
4. **Verify performance SLAs** - Photo analysis ≤ 30 sec, batch throughput ≥ 2/min

### Secondary Objectives
1. **Detect regressions** - Prevent unintended breaks when adding features
2. **Support CI/CD** - Automated testing on every PR
3. **Enable safe refactoring** - Confidence to optimize code with test coverage

---

## 3. Risk Analysis & Test Prioritization

### Risk Matrix

| Area | Risk Description | Probability | Impact | Priority | Test Type |
|------|-----------------|-------------|--------|----------|-----------|
| **Photo Analysis** | LLM response format changes, parsing fails | Medium | 🔴 Critical | **P0** | Unit + Integration |
| **Batch Processing** | 1 photo failure corrupts entire batch | Medium | 🔴 Critical | **P0** | Integration |
| **Score Calculation** | Weighted averaging math error | Low | 🔴 Critical | **P0** | Unit |
| **Export Integrity** | JSON malformed, CSV columns misaligned | Low | 🟠 High | **P1** | Unit + Integration |
| **Edge Cases** | Corrupted image, timeout, null values | Medium | 🟠 High | **P1** | Integration |
| **Performance** | Photo analysis >30 sec (user frustration) | Low | 🟠 High | **P1** | Performance |
| **CLI Usability** | User runs wrong command, confusing error | Medium | 🟡 Medium | **P2** | Manual |
| **Web UI (M3)** | React rendering bugs, state inconsistency | High | 🟡 Medium | **P2** | E2E + Unit |
| **Caching (M4)** | Cache corruption, stale data | Medium | 🟡 Medium | **P2** | Integration |

### Test Priority Levels

| Level | Criteria | Milestone Target |
|-------|----------|------------------|
| **P0** | Critical path; single failure blocks release | M2 (Pre-release gate) |
| **P1** | Important features; risk > low or impact > medium | M2 (Post-release improvements) |
| **P2** | Nice-to-have; risk < medium and impact < high | M3–M4 (Nice-to-have coverage) |

---

## 4. Test Categories & Scope

### 4.1 Unit Tests (Module Level)

#### UT-001: Score Aggregation Math
**Module**: `src/analysis/score-aggregator.js`  
**Risk**: P0 - Math errors affect all rankings  
**Test Cases**:
```javascript
✓ Calculate weighted average (criterion weight × score)
✓ Handle zero-weight criteria (skip in average)
✓ Generate tiers correctly (quartile-based bucketing)
✓ Handle ties in scores (maintain order)
✓ Compute statistics (mean, median, std_dev)
```
**Acceptance Criteria**:
- Weighted average ≥ 98% accuracy (verify against manual calculation)
- Tier boundaries consistent (no photo in 2 tiers)
- Statistics match numpy/Excel output

#### UT-002: Report Generation Formats
**Module**: `src/output/report-generator.js`  
**Risk**: P1 - Malformed exports reduce usability  
**Test Cases**:
```javascript
✓ Markdown generation: headings, tables, lists valid Markdown
✓ JSON generation: valid JSON, all fields present
✓ CSV generation: correct escaping, no quote errors
✓ Handle special characters (emoji, unicode in feedback)
✓ Handle missing values (null feedback gracefully)
```
**Acceptance Criteria**:
- Markdown passes `markdown-it` parser (0 errors)
- JSON parseable with `JSON.parse()`
- CSV opens in Excel without corruption

#### UT-003: API Client Singleton
**Module**: `src/utils/api-client.js`  
**Risk**: Low - Non-critical but important for architecture  
**Test Cases**:
```javascript
✓ First call creates client (lazy initialization)
✓ Second call returns same instance (singleton)
✓ Mock Ollama responses correctly
✓ Health check detects Ollama unavailable
```
**Acceptance Criteria**:
- Singleton verified (same object reference)
- Health check returns accurate status
- Mocks work without real Ollama

---

### 4.2 Integration Tests (Multi-Module)

#### IT-001: Photo Analysis Pipeline
**Modules**: `prompt-generator` → `photo-analyzer` → `score-aggregator`  
**Risk**: P0 - Core value delivery  
**Test Scenarios**:
```
Scenario: Analyze single test photo
  Given: photo-001.jpg + open-call.json with 5 criteria
  When: Call analyzePhoto()
  Then:
    ✓ LLaVA response parsed into 5 scores
    ✓ Each score 1–10 with feedback
    ✓ Weighted average calculated correctly
    ✓ No null or NaN values in scores

Scenario: LLM response format changed
  Given: Ollama returns different response format
  When: Call analyzePhoto()
  Then:
    ✓ Parser detects format mismatch
    ✓ Return error without crashing
    ✓ Batch continues with next photo

Scenario: Parse LLaVA feedback correctly
  Given: LLM response with multi-line feedback
  When: parseAnalysisResponse()
  Then:
    ✓ Extract all criteria and scores
    ✓ Multi-line feedback preserved (newlines intact)
    ✓ No off-by-one errors in parsing
```
**Test Data**: 5 real photo samples (jpg, png, gif, webp)  
**Acceptance Criteria**:
- Parsing success rate ≥ 98% (mocked LLM responses)
- Score accuracy match manual verification
- Multi-format feedback preserved

#### IT-002: Batch Processing with Errors
**Modules**: `batch-processor` → `photo-analyzer` → `report-generator`  
**Risk**: P0 - Resilience critical for user trust  
**Test Scenarios**:
```
Scenario: One photo fails, batch continues
  Given: 10 photos; photo #7 corrupted
  When: processBatch()
  Then:
    ✓ Analyze photos 1–6 successfully
    ✓ Skip photo #7 (error logged)
    ✓ Analyze photos 8–10 successfully
    ✓ Report includes: 9/10 successful, 1 failed
    ✓ Final ranking from 9 photos (correct counts)

Scenario: Ollama timeout, retry logic
  Given: Ollama unresponsive (timeout 30 sec)
  When: analyzePhoto() with retry configured
  Then:
    ✓ Retry 3x with exponential backoff
    ✓ After 3 failures, mark photo as failed
    ✓ Move to next photo (no hang)

Scenario: Parallel execution with concurrency=3
  Given: 20 photos, --parallel 3
  When: processBatch()
  Then:
    ✓ Exactly 3 photos analyzed concurrently
    ✓ Queue depth never exceeds 3
    ✓ All 20 photos complete in ~6.5 min (not sequential 10 min)

Scenario: Memory stability in large batch
  Given: 500 photos, concurrent=3
  When: processBatch()
  Then:
    ✓ Memory never exceeds 1GB
    ✓ No memory leaks (garbage collection working)
    ✓ Process completes without OOM error
```
**Acceptance Criteria**:
- Error scenarios produce complete results (9/10 not 0/10)
- Retry logic verified (Ollama timeout handled)
- Memory stability confirmed (no leaks detected)
- Concurrency matches configured value

#### IT-003: Export Integrity
**Modules**: `score-aggregator` → `report-generator` → `fs` (write)  
**Risk**: P1 - User needs valid exports  
**Test Scenarios**:
```
Scenario: Export all three formats simultaneously
  Given: Analyzed 10 photos with scores
  When: exportReports()
  Then:
    ✓ Write photo-analysis.md, .json, .csv to outputDir
    ✓ All files exist and non-empty
    ✓ File permissions allow user read (644)

Scenario: CSV with special characters
  Given: Feedback containing: comma, quote, newline
  When: generateCsvReport()
  Then:
    ✓ CSV escaping correct (quotes, newlines preserved)
    ✓ Open in Excel without corruption
    ✓ Round-trip: parse CSV back to JSON, data intact

Scenario: JSON with unicode emoji
  Given: Feedback: "Excellent light 🌟 and mood 🎨"
  When: generateJsonReport()
  Then:
    ✓ JSON valid (no escape errors)
    ✓ Emoji preserved in round-trip JSON.parse()
```
**Acceptance Criteria**:
- All formats valid (Markdown, JSON, CSV)
- Special characters handled correctly
- Round-trip parsing preserves data

---

### 4.3 Edge Case Tests (Negative & Boundary)

#### EC-001: Corrupted or Invalid Images
**Risk**: P1 - User may have bad files  
**Test Cases**:
```
✓ Zero-byte file → Detected as invalid, skip photo
✓ Corrupted JPEG header → Sharp validation fails, logged
✓ Text file with .jpg extension → Format mismatch, skip
✓ Very small image (1×1 px) → Analyzed (may score low, acceptable)
✓ Very large image (50MB TIFF) → Memory check, warn or skip
```

#### EC-002: LLM Response Parsing Edge Cases
**Risk**: P1 - LLM output may vary unexpectedly  
**Test Cases**:
```
✓ Missing "SCORE:" line → Parser detects, returns error
✓ Score out of range (0, 11, -5) → Clamp to 1–10 or error
✓ Criterion name typo in response → Fuzzy match or error
✓ Multiple score formats mixed → Parser handles both formats
✓ Empty feedback (no explanation) → Accept with empty string
```

#### EC-003: File System Edge Cases
**Risk**: P1 - Permission or space issues  
**Test Cases**:
```
✓ Output directory read-only → Error message, suggest fix
✓ Disk full during export → Partial file + error message
✓ Photo path with spaces → Correctly handled by Sharp
✓ Very long photo filename (255+ chars) → Handled gracefully
```

#### EC-004: Configuration Invalid Cases
**Risk**: P1 - User provides bad config  
**Test Cases**:
```
✓ Missing open-call.json → Error message with path
✓ Invalid JSON → JSON parse error with line number
✓ Missing required field (title) → Validation error
✓ Empty photos directory → Error, no photos to analyze
```

---

### 4.4 Performance Tests (SLA Validation)

#### PT-001: Single Photo Analysis Time
**Risk**: P1 - Performance affects user satisfaction  
**Acceptance Criteria**: ≤ 30 seconds per photo
**Test Method**:
- Analyze 5 test photos (jpg, png, gif, webp)
- Record time per photo
- Average ≤ 30 sec, max ≤ 40 sec (outliers acceptable)

#### PT-002: Batch Throughput
**Risk**: P1 - Large batches must be practical  
**Acceptance Criteria**: ≥ 2 photos/minute average throughput
**Test Method**:
- Analyze 100-photo batch with --parallel 3
- Total time ≤ 50 minutes (2 photos/min × 100)
- Include overhead (prompt generation, reporting)

#### PT-003: Memory Usage
**Risk**: P1 - Prevent OOM crashes  
**Acceptance Criteria**: ≤ 1GB peak memory for 500-photo batch
**Test Method**:
- Monitor process memory during batch (3 concurrent)
- Peak memory recorded per checkpoint
- Verify no memory leak (stable after GC)

#### PT-004: Report Generation Speed
**Risk**: Low - Formatting is fast  
**Acceptance Criteria**: ≤ 1 second for 500-photo report
**Test Method**:
- Generate all three formats (MD, JSON, CSV)
- Time write-to-disk
- Expect <100ms on typical disk

---

### 4.5 Manual/UI Tests (Milestone 3+)

#### MT-001: CLI Usability
**Risk**: P2 - Good UX reduces support burden  
**Test Scenarios**:
```
✓ User runs with --help, gets clear instructions
✓ User enters wrong path, error message suggests fix
✓ User runs analyze without arguments, helpful error
✓ Success message includes next steps (view results)
```

#### MT-002: Web UI (M3)
**Risk**: P2 - Visual bugs reduce trust  
**Test Scenarios**:
```
✓ Load results, grid displays 100 photos in <3 sec
✓ Sort by score, order updates instantly
✓ Drag-drop reorder, new order persists on refresh
✓ Dark mode toggle works, persists in localStorage
✓ Mobile responsive: readable on iPhone SE (small screen)
```

---

## 5. Test Coverage Targets

### Coverage by Module (Line Coverage)

| Module | Target | Milestone |
|--------|--------|-----------|
| `photo-analyzer.js` | 85% | M2 |
| `score-aggregator.js` | 90% | M2 |
| `batch-processor.js` | 80% | M2 |
| `report-generator.js` | 85% | M2 |
| `prompt-generator.js` | 75% | M2 |
| `api-client.js` | 70% | M2 |
| `analyze.js` (CLI) | 50% | M2 (manual testing focused) |
| **Overall** | **≥80%** | **M2** |

### Coverage Growth by Milestone

```
Milestone 1 (Completed):
├─ Unit tests: core modules (photo-analyzer, score-aggregator)
├─ Coverage: ~60% (basic happy path)
└─ Status: Minimal (MVP focused on features, not coverage)

Milestone 2 (Target):
├─ Unit tests: Complete coverage of analysis pipeline
├─ Integration tests: Batch processing, error handling
├─ Edge cases: Corrupted images, parsing failures
├─ Performance tests: SLA validation
└─ Coverage: ≥80% (P0/P1 risks covered)

Milestone 3 (Planned):
├─ E2E tests: Web UI workflows (Playwright)
├─ Regression tests: Features from M1/M2
├─ Accessibility tests: WCAG 2.1 AA
└─ Coverage: ≥85%

Milestone 4 (Planned):
├─ Caching logic tests
├─ Performance optimization tests
├─ Alternative model tests (moondream2, bakllava)
└─ Coverage: ≥85%
```

---

## 6. Test Execution Plan

### Phase 1: Unit Tests (Week 1, M2)
**Goal**: Establish test infrastructure and core unit coverage

**Tests to Implement**:
1. UT-001: Score aggregation (10 test cases)
2. UT-002: Report generation (8 test cases)
3. UT-003: API client singleton (4 test cases)

**Tools**:
- Jest (test runner)
- Jest mocks (api-client mocking)
- Test fixtures (sample data)

**Success Criteria**:
- All unit tests pass
- Coverage ≥80% for score-aggregator.js

### Phase 2: Integration Tests (Week 2, M2)
**Goal**: Verify multi-module workflows and error handling

**Tests to Implement**:
1. IT-001: Photo analysis pipeline (8 test cases)
2. IT-002: Batch processing with errors (10 test cases)
3. IT-003: Export integrity (6 test cases)

**Tools**:
- Jest with async support
- Mock Ollama responses
- Real file system (temp directories)

**Success Criteria**:
- All integration tests pass
- Batch resilience confirmed (1 failure doesn't block batch)
- All export formats valid

### Phase 3: Edge Case & Performance Tests (Week 3, M2)
**Goal**: Validate robustness and SLA compliance

**Tests to Implement**:
1. EC-001 through EC-004: Edge case scenarios (15 test cases)
2. PT-001 through PT-004: Performance benchmarks (4 test suites)

**Tools**:
- Jest for functional edge cases
- Custom perf test script (measure latency)
- Memory monitoring (process.memoryUsage())

**Success Criteria**:
- Edge cases handled gracefully (no crashes)
- Performance SLAs met (≤30 sec/photo, ≥2 photos/min)
- Memory stable (no leaks)

### Phase 4: CI/CD Integration (Week 4, M2)
**Goal**: Automate testing on every PR

**Setup**:
- GitHub Actions workflow: `.github/workflows/test.yml`
- Run Jest on every push/PR to main
- Fail PR if coverage drops below 80%
- Performance baseline tracking

**Success Criteria**:
- All tests pass on CI
- No flaky tests (99%+ pass rate)
- Coverage reports published

---

## 7. Test Data Strategy

### Sample Photo Set
**Location**: `tests/fixtures/sample-photos/`

**Contents**:
```
sample-photos/
├─ valid-jpeg.jpg        # 2.5MB, 3000×2000px, typical photo
├─ valid-png.png         # 1.8MB, 2000×1500px, with alpha
├─ valid-gif.gif         # 500KB, animated (test format support)
├─ valid-webp.webp       # 1.2MB, modern format
├─ corrupted-header.jpg   # Invalid JPEG header (test error handling)
├─ text-file.jpg          # Actually a text file with .jpg extension
├─ tiny-1x1.png          # 1×1 pixel (boundary test)
└─ large-50mb.tiff       # 50MB file (memory stress test)
```

### Mock LLM Responses
**Location**: `tests/fixtures/llm-responses/`

**Contents**:
```
fixtures/llm-responses/
├─ valid-response.txt         # Standard response format
├─ response-with-unicode.txt  # Emoji in feedback
├─ response-format-changed.txt # Different LLM output format
├─ response-incomplete.txt     # Missing criteria
└─ response-empty-feedback.txt # No explanations
```

### Configuration Fixtures
**Location**: `tests/fixtures/configs/`

**Contents**:
```
configs/
├─ valid-open-call.json       # Complete, valid config
├─ invalid-missing-title.json  # Missing required field
├─ invalid-json.json           # Malformed JSON
└─ config-with-special-chars.json # Unicode in jury names
```

---

## 8. Test Automation & CI/CD

### GitHub Actions Workflow
**File**: `.github/workflows/test.yml`

```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: npm install
      - run: npm run lint
      - run: npm test -- --coverage
      - run: npm run test:perf (optional, long-running)
      - uses: codecov/codecov-action@v2
        with:
          files: ./coverage/lcov.info
```

### Test Scripts
**package.json**:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:perf": "node tests/performance.test.js",
    "test:ci": "jest --coverage --ci"
  }
}
```

---

## 9. Test Success Criteria & Gates

### Pre-Release Gate (Before M2 Release)
**Requirement**: All tests pass before merging to main

- [ ] All unit tests pass (100% pass rate)
- [ ] All integration tests pass (100% pass rate)
- [ ] Code coverage ≥80% overall
- [ ] Coverage ≥85% for P0 modules (photo-analyzer, score-aggregator)
- [ ] No critical issues in edge case tests
- [ ] Performance SLAs met (≤30 sec/photo, ≥2 photos/min)
- [ ] Error handling validated (batch continues on single failure)

### Per-PR Validation
- Coverage not decreased (fail if <80%)
- All tests pass on CI
- No new flaky tests

### Post-Release Monitoring (M3+)
- Track test success rate over time
- Monitor for regressions
- Update tests based on user feedback

---

## 10. FR-2.2: Resume Interrupted Analysis - Test Design

**Feature**: Allow users to resume long-running batches after interruption (100-500 photos)  
**Risk Level**: P1 - Important for usability, but not critical path  
**Test Target**: ≥85% coverage on checkpoint-manager.js  

### 10.1 Unit Tests (Checkpoint Functions)

#### UT-CP-001: Compute Config Hash
**Module**: `src/processing/checkpoint-manager.js`  
**Function**: `computeConfigHash(openCallConfig)`  
**Risk**: P1 - Hash validation prevents stale checkpoints  

```javascript
✓ Hash consistency: Same config → same hash
✓ Hash uniqueness: Different config → different hash
✓ Hash format: SHA256 format (64 hex chars)
✓ Field order independence: Unordered JSON → consistent hash
✓ Special characters: Handle unicode, emoji in jury names
```

**Acceptance Criteria**:
- ✅ Hash matches SHA256(JSON.stringify(sorted config))
- ✅ Repeated hashing produces identical output
- ✅ Different configs produce different hashes

#### UT-CP-002: Save & Load Checkpoint
**Module**: `src/processing/checkpoint-manager.js`  
**Functions**: `saveCheckpoint()`, `loadCheckpoint()`  
**Risk**: P0 - Round-trip data loss would be critical  

```javascript
✓ Save checkpoint with 50 analyzed photos
✓ Load checkpoint from disk
✓ Checkpoint round-trip: save → load → data matches
✓ File created at correct location (.analysis-checkpoint.json)
✓ Checkpoint overwrites existing file (idempotent)
✓ Handle missing directory (create parent dirs)
```

**Acceptance Criteria**:
- ✅ Saved JSON matches original object (structure + values)
- ✅ Checkpoint file readable as valid JSON
- ✅ No data loss in round-trip
- ✅ Handles 1000+ photo arrays without corruption

#### UT-CP-003: Validate Checkpoint
**Module**: `src/processing/checkpoint-manager.js`  
**Function**: `validateCheckpoint(checkpoint, currentConfig)`  
**Risk**: P0 - Invalid checkpoint could cause incorrect results  

```javascript
✓ Valid checkpoint (matching config) passes validation
✓ Stale checkpoint (config changed) fails validation
✓ Corrupted checkpoint (missing fields) fails validation
✓ Checkpoint with different parallelSetting detected
✓ Checkpoint older than 7 days rejected
✓ Checkpoint from different projectDir detected
```

**Acceptance Criteria**:
- ✅ Config hash mismatch → invalid
- ✅ Missing required fields → invalid
- ✅ Old timestamp → invalid
- ✅ Return reason string for each failure

#### UT-CP-004: Initialize Checkpoint
**Module**: `src/processing/checkpoint-manager.js`  
**Function**: `initializeCheckpoint(...)`  
**Risk**: Low - Initialization only, no user-facing impact  

```javascript
✓ Create checkpoint for batch start
✓ All required fields initialized
✓ Config hash computed correctly
✓ Metadata timestamps set (createdAt, lastResumedAt)
✓ Progress initialized (0 analyzed, empty results)
```

**Acceptance Criteria**:
- ✅ Checkpoint structure matches schema exactly
- ✅ All required fields present

#### UT-CP-005: Update Checkpoint
**Module**: `src/processing/checkpoint-manager.js`  
**Function**: `updateCheckpoint(checkpoint, newPhotos, newResults)`  
**Risk**: Low - Incremental update logic  

```javascript
✓ Add new analyzed photos to list
✓ Update results with new scores
✓ Update lastResumedAt timestamp
✓ Preserve previous data (no overwrite)
✓ Handle large result objects (250+ photos)
```

**Acceptance Criteria**:
- ✅ analyzedPhotos list grows (no duplicates)
- ✅ Results merged correctly
- ✅ Checkpoint file still valid JSON

#### UT-CP-006: Delete Checkpoint
**Module**: `src/processing/checkpoint-manager.js`  
**Function**: `deleteCheckpoint(projectDir)`  
**Risk**: Low - Cleanup only  

```javascript
✓ Delete existing checkpoint file
✓ Handle missing checkpoint (no error)
✓ Confirm file deleted (doesn't exist after call)
```

**Acceptance Criteria**:
- ✅ File removed successfully
- ✅ No crash if file doesn't exist

### 10.2 Integration Tests (Checkpoint + Batch Processing)

#### IT-CP-001: Full Resume Workflow
**Scenario**: Start batch → interrupt at 25 photos → resume → complete  
**Risk**: P0 - This is the core feature  
**Setup**:
1. Start analyzing 50-photo batch with `--checkpoint-interval 10`
2. Kill process after ~25 photos analyzed (checkpoint exists)
3. Re-run same command
4. Verify: All 50 analyzed, final results correct

```javascript
✓ First run saves checkpoint at photo 10, 20
✓ Process killed, checkpoint preserved
✓ Second run detects checkpoint
✓ Second run skips photos 1-25
✓ Second run analyzes photos 26-50
✓ Final results identical to non-interrupted run
```

**Acceptance Criteria**:
- ✅ Resumed batch completes successfully
- ✅ No photos re-analyzed
- ✅ Final scores match expected values
- ✅ Checkpoint deleted after completion

#### IT-CP-002: Config Change Detection
**Scenario**: Analyze with config v1 → change config → resume (should restart)  
**Risk**: P0 - Config change could cause incorrect results  
**Setup**:
1. Start analyzing 30-photo batch
2. Kill after ~15 photos
3. Modify open-call.json (change theme)
4. Re-run analysis

```javascript
✓ Config hash computed from new config
✓ Hash mismatch detected (old checkpoint invalid)
✓ Checkpoint discarded (logged)
✓ All 30 photos re-analyzed with new criteria
```

**Acceptance Criteria**:
- ✅ Checkpoint detected as invalid
- ✅ No checkpoint after run (fresh start)
- ✅ All photos analyzed with new config

#### IT-CP-003: Error Recovery During Resume
**Scenario**: Checkpoint exists → one photo fails → checkpoint updated  
**Risk**: P1 - Error handling during resume  
**Setup**:
1. Checkpoint with 25 photos analyzed
2. Run resume
3. Photo 30 fails (corrupted or timeout)
4. Batch continues

```javascript
✓ Photo failure doesn't stop batch
✓ Checkpoint updated with photo 30 in failedPhotos
✓ Analysis continues with photo 31+
✓ Final report shows photo 30 failed
✓ Checkpoint preserved (can retry)
```

**Acceptance Criteria**:
- ✅ Batch continues after photo failure
- ✅ Error tracked in checkpoint
- ✅ User can retry without re-analyzing successful photos

#### IT-CP-004: Checkpoint with Different Parallelism
**Scenario**: Start with `--parallel 2` → interrupt → resume with `--parallel 4`  
**Risk**: Low - Parallelism shouldn't change resume  
**Setup**:
1. Start with `--parallel 2`, analyze 20 photos
2. Interrupt, save checkpoint
3. Re-run with `--parallel 4` (user tries different setting)

```javascript
✓ Checkpoint loaded (parallelSetting=2 stored)
✓ Resume uses original parallelSetting=2
✓ User's `--parallel 4` flag ignored (log warning)
✓ Batch completes with deterministic result
```

**Acceptance Criteria**:
- ✅ Original parallelism restored from checkpoint
- ✅ User's new flag overridden (for consistency)

#### IT-CP-005: Checkpoint Cleanup After Success
**Scenario**: Complete batch analysis successfully  
**Risk**: Low - Cleanup  
**Setup**:
1. Run batch to completion (no interruption)

```javascript
✓ Checkpoint created during run
✓ Checkpoint saved every 10 photos
✓ After final photo analyzed
✓ Checkpoint deleted (doesn't exist)
✓ Results written to {projectDir}/results/{timestamp}/ directory (FR-3.12)
```

**Acceptance Criteria**:
- ✅ No .analysis-checkpoint.json file remains
- ✅ Results exported normally

### 10.3 Edge Case Tests

#### EC-CP-001: Corrupted Checkpoint File
**Setup**: Create invalid JSON in .analysis-checkpoint.json  
**Risk**: P1 - Graceful degradation  

```javascript
✓ Load corrupted checkpoint → null returned
✓ Log warning (file corrupted)
✓ Start fresh analysis (no crash)
```

**Acceptance Criteria**:
- ✅ No exception thrown
- ✅ Analysis starts fresh

#### EC-CP-002: Missing Required Fields
**Setup**: Checkpoint missing `configHash` field  
**Risk**: P1 - Validation must catch incomplete checkpoints  

```javascript
✓ Validate checkpoint detects missing field
✓ Returns {valid: false, reason: "Missing configHash"}
✓ Checkpoint discarded
```

**Acceptance Criteria**:
- ✅ Validation fails with clear reason

#### EC-CP-003: Very Large Batch (250+ photos)
**Setup**: 250-photo batch with `--checkpoint-interval 25`  
**Risk**: P1 - Performance and stability  

```javascript
✓ 10 checkpoint saves during batch
✓ Checkpoint file size remains < 100KB
✓ No disk I/O blocking analysis
✓ Resume from checkpoint mid-batch
✓ Complete final 125 photos
```

**Acceptance Criteria**:
- ✅ Batch completes without memory issues
- ✅ Checkpoint saves don't exceed 50ms each

#### EC-CP-004: Resume After Directory Change
**Setup**: Photos moved between checkpoints  
**Risk**: P2 - User may reorganize photos  

```javascript
✓ Checkpoint has photo-001.jpg
✓ Directory now missing photo-001.jpg
✓ Resume detects missing photo
✓ Skip missing photo, continue with others
```

**Acceptance Criteria**:
- ✅ Batch doesn't crash
- ✅ Missing photo logged

#### EC-CP-005: New Photos Added to Directory
**Setup**: Checkpoint analyzed 30 photos, directory now has 35  
**Risk**: P2 - User may add photos after checkpoint  

```javascript
✓ Resume loads checkpoint (30 analyzed)
✓ Directory now has 35 total
✓ 5 new photos included in batch
✓ All 35 analyzed at completion
```

**Acceptance Criteria**:
- ✅ New photos analyzed
- ✅ No duplicate analysis

#### EC-CP-006: Disk Full During Checkpoint Save
**Setup**: Simulate disk full when writing checkpoint  
**Risk**: P1 - Graceful error handling  

```javascript
✓ saveCheckpoint() catches write error
✓ Error logged (warn level)
✓ Batch continues (don't stop for checkpoint)
✓ Analysis completes (just without checkpoint saved)
```

**Acceptance Criteria**:
- ✅ No exception thrown
- ✅ Batch continues despite checkpoint write failure

#### EC-CP-007: Checkpoint Older Than 7 Days
**Setup**: Checkpoint.metadata.createdAt is 8 days old  
**Risk**: P2 - Stale checkpoint handling  

```javascript
✓ Validate checkpoint detects old timestamp
✓ Checkpoint marked invalid
✓ Analysis starts fresh (log info)
```

**Acceptance Criteria**:
- ✅ Validation fails with age reason

#### EC-CP-008: Concurrent Resume Attempts
**Setup**: Two processes try to resume same checkpoint  
**Risk**: P1 - Race conditions  

```javascript
✓ Process A loads checkpoint
✓ Process B loads same checkpoint
✓ Process A saves updated checkpoint
✓ Process B saves updated checkpoint
✓ No data corruption in final checkpoint
```

**Acceptance Criteria**:
- ✅ No file corruption
- ✅ Checkpoint is valid JSON after concurrent writes

### 10.4 Manual Test Scenarios

#### MT-CP-001: Interactive Resume Experience
**Steps**:
1. `npm run analyze data/open-calls/nature-wildlife/` (100-photo batch)
2. After ~30 seconds, Ctrl+C
3. `npm run analyze data/open-calls/nature-wildlife/`
4. Observe: "Resuming: 10/100 done, 90 remaining"
5. Batch completes

**Verify**:
- ✅ Progress reported accurately
- ✅ No re-analysis of first 10 photos
- ✅ Final results correct

#### MT-CP-002: Config Modification Scenario
**Steps**:
1. Analyze 50 photos in batch
2. Kill after 25 photos
3. Edit open-call.json (change theme description)
4. Re-run analysis

**Verify**:
- ✅ Checkpoint detected as stale
- ✅ All 50 re-analyzed (not just remaining 25)
- ✅ Final results use new criteria

#### MT-CP-003: Large Batch (250 photos)
**Steps**:
1. Prepare 250-photo batch
2. `npm run analyze ... --checkpoint-interval 25`
3. Interrupt at various points (after photo 30, 80, 150)
4. Resume each time

**Verify**:
- ✅ Each resume works correctly
- ✅ Final results consistent
- ✅ Performance acceptable (no slowdown)

#### MT-CP-004: Checkpoint Cleanup
**Steps**:
1. Analyze batch to completion (no interruption)
2. Check for `.analysis-checkpoint.json`

**Verify**:
- ✅ Checkpoint file deleted after success
- ✅ Results/ directory contains final outputs

#### MT-CP-005: Custom Checkpoint Interval
**Steps**:
1. `npm run analyze ... --checkpoint-interval 5` (save every 5 photos)
2. Interrupt after photo 7
3. Count checkpoint saves in logs

**Verify**:
- ✅ Checkpoint saved at photos 5 (and 10 if continued)
- ✅ Resume works with custom interval

---

## 10.5 Test Execution Checklist

### Before Implementation
- [ ] Phase 2 architecture design reviewed (@QA + @Architect)
- [ ] Checkpoint schema understood (JSON fields, validation rules)
- [ ] Function signatures reviewed (7 functions in checkpoint-manager.js)
- [ ] Test data prepared (small/medium/large batches)

### During Implementation
- [ ] Unit tests written first (checkpoin functions isolated)
- [ ] Integration tests for resume workflow
- [ ] Edge case tests for resilience
- [ ] Manual tests documented (steps above)

### Before Merge
- [ ] All 23+ tests passing (UT-CP-001 through EC-CP-008 + MT-001-005)
- [ ] Code coverage ≥85% on checkpoint-manager.js
- [ ] No regression in existing M1 tests
- [ ] Manual tests verified by @QA

---

## 11. Known Testing Limitations

### Limitations with Real Ollama
- **Latency variability**: 10–60 sec per photo (environment-dependent)
  - Mitigation: Mock LLM for fast unit tests, real Ollama for integration/perf tests
- **LLM output variability**: Slightly different feedback per run (temperature=0.3)
  - Mitigation: Validate structure (scores exist), not exact text
- **Network dependency**: Real Ollama requires local server
  - Mitigation: Graceful error if Ollama unavailable, skip real tests

### Solutions
- Use Jest mocks for unit tests (no Ollama needed)
- Use real Ollama in integration tests (Docker container in CI)
- Document manual performance testing steps

---

## 12. Test Approval & Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| QA Lead | QA | 2026-01-28 | ✅ Approved |
| Test Architect | QA | 2026-01-28 | ✅ Approved |
| Project Owner | Project Owner | 2026-01-28 | ✅ Approved |

---

## 13. Change Log

| Date | Section | Change | Author |
|------|---------|--------|--------|
| 2026-01-28 | All | Initial test design with risk analysis and test categories | QA |
| 2026-01-28 | Section 10 (FR-2.2) | Added comprehensive test design for Resume feature (23+ test cases) | QA |
