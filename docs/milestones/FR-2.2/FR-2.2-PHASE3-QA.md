# FR-2.2 Phase 3: Test Strategy Design

**Owner**: @QA  
**Status**: ⚪ Ready to Start (after Phase 2 design)  
**Phase 1 Complete**: ✅ Requirements finalized (see BACKLOG.md)  
**Phase 2 Dependency**: Waiting for @Architect checkpoint design (FR-2.2-PHASE2-ARCHITECT.md)  
**Estimated Duration**: 1 day

---

## Your Task

Design comprehensive test strategy for **FR-2.2: Resume Interrupted Analysis** based on:
1. Phase 1 finalized requirements (BACKLOG.md)
2. Phase 2 architecture design (FR-2.2-PHASE2-ARCHITECT.md) - waiting for this
3. Existing test suite structure (tests/*)

You will create:
1. **Test Matrix** - 15+ test cases covering unit/integration/manual
2. **Acceptance Criteria** - What "done" looks like
3. **Test Data Setup** - How to prepare test batches
4. **Coverage Goals** - Ensure ≥85% coverage per M2 requirement
5. **Risk Assessment** - High-risk scenarios requiring most attention

**Deliverable**: Update `_bmad-output/test-design.md` with FR-2.2 test section

---

## Phase 1 Context (Requirements)

From BACKLOG.md:
- ✅ Checkpoint interval: Default 10, configurable 1-50
- ✅ Location: `.analysis-checkpoint.json` in project root
- ✅ Config handling: Hash-based validation, auto-discard on mismatch
- ✅ Progress: "N of M photos" format
- ✅ Cleanup: Auto-delete on success
- ✅ Parallelism: Resume with original setting

---

## Design Tasks

### Task 1: Test Categories & Coverage Goals

Break down testing into 4 categories:

#### 1A. Unit Tests (10 test cases)
Focus: Individual checkpoint functions in isolation

```javascript
// Example structure (implement after Phase 2 design)
describe('checkpoint-manager.js', () => {
  describe('saveCheckpoint()', () => {
    test('UT-001: Save valid checkpoint with 50 photos');
    test('UT-002: Validate JSON format and required fields');
    test('UT-003: Compute config hash correctly (SHA256)');
  });
  
  describe('loadCheckpoint()', () => {
    test('UT-004: Load checkpoint from .analysis-checkpoint.json');
    test('UT-005: Return null if file doesn\'t exist');
    test('UT-006: Handle corrupted JSON (invalid format)');
  });
  
  describe('validateCheckpoint()', () => {
    test('UT-007: Validate config hash matches current config');
    test('UT-008: Discard checkpoint if config changed');
    test('UT-009: Check timestamp not older than 7 days');
    test('UT-010: Verify all required fields present');
  });
});
```

**Coverage Target**: ≥90% on checkpoint functions  
**Critical Paths**:
- Save/load round-trip (no data loss)
- Config hash computation and validation
- Null cases (missing file, empty checkpoint)
- JSON corruption handling

#### 1B. Integration Tests (5 test cases)
Focus: Checkpoint interacting with batch-processor.js

```javascript
describe('batch-processor.js with checkpoint', () => {
  test('IT-001: Full workflow - Start → Process 25 photos → Interrupt');
  test('IT-002: Resume from checkpoint - Skip analyzed, process remaining');
  test('IT-003: Checkpoint invalidated - Config changed, restart');
  test('IT-004: Partial failure - One photo fails, checkpoint updated, can resume');
  test('IT-005: Cleanup - Checkpoint auto-deleted after successful completion');
});
```

**Coverage Target**: ≥80% on integration scenarios  
**Critical Paths**:
- Start-interrupt-resume cycle (full workflow)
- Config change detection and restart
- Error recovery during resume
- Cleanup after success

#### 1C. Edge Cases / Robustness (8 test cases)
Focus: Unusual scenarios, error conditions, boundary conditions

```javascript
describe('Checkpoint Edge Cases', () => {
  test('EC-001: Empty batch (0 photos) - no checkpoint needed');
  test('EC-002: Single photo batch - checkpoint interval=1');
  test('EC-003: Very large batch (500+ photos) - checkpoint stability');
  test('EC-004: Resume with higher parallelism - uses original setting');
  test('EC-005: Resume with lower parallelism - uses original setting');
  test('EC-006: Disk full during checkpoint write - graceful fallback');
  test('EC-007: Concurrent resume attempts - prevents race conditions');
  test('EC-008: Checkpoint older than 30 days - auto-discard');
});
```

**Coverage Target**: ≥75% on edge cases  
**High-Risk Scenarios**:
- Large batches (250+ photos)
- Disk/IO failures during checkpoint save
- Configuration changes mid-batch
- Race conditions with concurrent runs

#### 1D. Manual Testing (5 scenarios)
Focus: Real-world user workflows

```
MT-001: Simple Resume
  - Start: 100 photo batch
  - Action: Kill process at ~50 photos
  - Resume: Run same command, should resume from checkpoint
  - Verify: Final results identical to non-interrupted run

MT-002: Config Change
  - Setup: Checkpoint with 50 photos analyzed
  - Change: Modify open-call.json (new criteria)
  - Resume: Run analysis
  - Verify: Checkpoint discarded, all 100 photos re-analyzed

MT-003: Large Batch Persistence
  - Setup: 250 photo batch with --checkpoint-interval 25
  - Action: Interrupt at 75 photos (3 checkpoints saved)
  - Resume: Multiple times, each time processes more
  - Verify: Each resume saves new checkpoint, final results correct

MT-004: Progress Reporting
  - Run: 200 photo batch with --checkpoint-interval 20
  - Observe: Output shows "Processed: 20/200", then 40/200", etc.
  - Verify: Numbers accurate, progress bar updates

MT-005: Checkpoint Cleanup
  - Setup: Complete successful batch analysis
  - Action: Check for .analysis-checkpoint.json file
  - Verify: File auto-deleted after completion
```

---

### Task 2: Test Data Preparation

**How to set up test batches**:

#### Test Batch 1: Small Batch (10 photos)
- Purpose: Quick unit test runs
- Setup: `data/test-photos/small-batch/`
- File format: Mix of JPG, PNG (valid images)
- Used by: Unit tests, quick integration tests

#### Test Batch 2: Medium Batch (50 photos)
- Purpose: Resume workflow testing
- Setup: `data/test-photos/medium-batch/`
- File format: All JPG (consistent format)
- Sequence: Numbered photo-001.jpg through photo-050.jpg
- Used by: Integration tests, full workflow tests

#### Test Batch 3: Large Batch (250 photos)
- Purpose: Performance and stability testing
- Setup: `data/test-photos/large-batch/`
- File format: JPG (consistent)
- Sequence: photo-001.jpg through photo-250.jpg
- Used by: Edge case tests, real-world scenario tests

#### Test Batch 4: Mixed Formats (30 photos)
- Purpose: Format compatibility testing
- Setup: `data/test-photos/mixed-formats/`
- Files: JPG, PNG, GIF, WebP (10 each)
- Used by: Batch processor tests

**Test Image Generation**:
- Use existing `create-test-images.js` if available
- OR: Use placeholder images (color blocks, minimal JPEG)
- Requirement: All must be valid image files (not dummy text files)

---

### Task 3: Acceptance Criteria

**Feature is "DONE" when**:

- [ ] ✅ 10 unit tests passing (≥90% checkpoint function coverage)
- [ ] ✅ 5 integration tests passing (full resume workflow tested)
- [ ] ✅ 8 edge case tests passing (boundary conditions covered)
- [ ] ✅ 5 manual test scenarios verified by QA
- [ ] ✅ 0 regressions in existing test suite
- [ ] ✅ All test cases documented in test-design.md
- [ ] ✅ Coverage report shows ≥85% M2 requirement met
- [ ] ✅ No unhandled exceptions in error scenarios
- [ ] ✅ Progress reporting accurate (N/M math correct)
- [ ] ✅ Checkpoint file format matches schema from Phase 2

---

### Task 4: Risk Matrix & Priorities

Assess test priority by risk:

| Test ID | Risk Level | Impact | Test Type | Priority |
|---------|-----------|--------|-----------|----------|
| IT-001 | 🔴 Critical | Resume broken = feature useless | Integration | P0 |
| IT-002 | 🔴 Critical | Skip broken = re-analyze = waste | Integration | P0 |
| UT-007 | 🔴 Critical | Config validation broken = wrong results | Unit | P0 |
| EC-003 | 🟠 High | Large batches unstable = production issue | Edge Case | P1 |
| UT-010 | 🟠 High | Missing fields = silent failure | Unit | P1 |
| EC-004 | 🟡 Medium | Parallelism mismatch = unexpected behavior | Edge Case | P2 |
| MT-001 | 🟡 Medium | Manual test confirms real-world workflow | Manual | P2 |
| UT-002 | 🟡 Medium | JSON validation = data integrity | Unit | P2 |

**Testing Sequence**:
1. Implement P0 tests first (2 critical integration + 1 critical unit)
2. Then P1 (edge cases for large batches, field validation)
3. Then P2 (remaining unit tests, manual scenarios)

---

### Task 5: Test Execution Plan

**How to run tests**:

```bash
# Run all checkpoint tests
npm test -- --testPathPattern=checkpoint

# Run specific test category
npm test -- --testNamePattern="UT-001|UT-002|UT-003"

# Run with coverage
npm test -- --coverage checkpoint-manager.js

# Manual test scenario template
# (create markdown checklist in test-design.md for QA to follow)
```

---

### Task 6: Regression Testing

**Ensure no breakage in existing features**:

- [ ] M1 tests still pass (photo-analyzer, batch-processor baseline)
- [ ] Score aggregator tests unchanged
- [ ] Report generation tests unchanged
- [ ] CLI tests still pass

**Key Test Files to Verify**:
- `tests/workflow-test.js` - Full end-to-end pipeline
- `tests/batch-processor.test.js` - If exists, or create
- `tests/score-aggregator.test.js` - Ranking unchanged

---

## Definition of Done (Phase 3)

- [ ] Test matrix with 23+ test cases documented
- [ ] Unit test structure designed (10 tests, ≥90% coverage)
- [ ] Integration test workflows defined (5 scenarios)
- [ ] Edge case matrix created (8 high-risk scenarios)
- [ ] Manual test checklist for QA (5 real-world workflows)
- [ ] Test data setup documented (small/medium/large batches)
- [ ] Acceptance criteria finalized (10 checkpoints)
- [ ] Risk matrix shows test priorities (P0/P1/P2)
- [ ] Test execution plan documented (how to run tests)
- [ ] Regression test plan clear (no breakage to M1)

---

## Output Format

**Update `_bmad-output/test-design.md`**:

1. Add new "FR-2.2: Resume Analysis" section
2. Add test categories (UT, IT, EC, MT) with case list
3. Add test matrix table (ID, type, risk, priority)
4. Add test data setup instructions
5. Add acceptance criteria checklist
6. Add manual test scenarios with step-by-step
7. Add risk assessment and testing sequence

---

## Context & Reference

**Pending Phase 2 Design** (will provide):
- Checkpoint schema and validation rules
- Integration points in batch-processor.js
- Error handling scenarios
- ADR-008 decision rationale

**Related Files**:
- [_bmad-output/PRD.md](_bmad-output/PRD.md) - FR-2.2 user needs
- [BACKLOG.md](BACKLOG.md) - Phase 1 requirements
- [_bmad-output/test-design.md](_bmad-output/test-design.md) - Existing test strategy (append FR-2.2 section)
- [tests/](tests/) - Existing test structure to align with

---

## Next Phase (Phase 4: Implementation)

Once Phase 3 test strategy is complete:
- @Dev reads your test cases and creates test implementations
- Your test data setup enables Dev to run local tests
- Your risk matrix prioritizes implementation order
- Your acceptance criteria define when Phase 4 is done

---

## Notes for @Dev (Phase 4)

When you start implementation:
- Follow test structure from Phase 3
- Tests should follow existing Jest patterns (see tests/*.js)
- Mock Ollama API in unit tests (don't actually run LLaVA)
- Real integration tests need actual Ollama running
- Use test batches from Phase 3 setup

---

**Start here**: Review BACKLOG.md Phase 1, then wait for Phase 2 architecture design.

Good luck! 🧪
