# FR-2.2 Phase 3 Complete - Test Strategy Design

**Status**: ✅ Phase 3 Complete  
**Date**: 2026-01-28  
**Owner**: @QA  
**Duration**: ~1 day (planning + test design)

---

## 🎯 What Was Completed

### Comprehensive Test Design
✅ **6 Unit Tests** (checkpoint functions in isolation)  
✅ **5 Integration Tests** (resume workflows with batch-processor)  
✅ **8 Edge Case Tests** (resilience, boundary conditions)  
✅ **5 Manual Scenarios** (real-world user workflows)  
✅ **Total: 23+ test cases** covering all critical paths  

### Added to `_bmad-output/test-design.md`

**New Section**: Section 10 - FR-2.2 Resume Feature Test Design (~430 lines)
- Complete breakdown of all 23+ test cases
- Clear acceptance criteria for each test
- Integration with batch-processor.js flows
- Error scenario handling strategies

---

## 📋 Test Categories Overview

### 1. Unit Tests (6 cases) - UT-CP-001 through UT-CP-006

**Focus**: Checkpoint functions in isolation (no batch-processor)

| Test ID | Function | Coverage | Risk |
|---------|----------|----------|------|
| UT-CP-001 | computeConfigHash() | Hash consistency & uniqueness | P1 |
| UT-CP-002 | saveCheckpoint() / loadCheckpoint() | Round-trip data integrity | **P0** |
| UT-CP-003 | validateCheckpoint() | Config hash, fields, timestamps | **P0** |
| UT-CP-004 | initializeCheckpoint() | Schema compliance | Low |
| UT-CP-005 | updateCheckpoint() | Incremental updates | Low |
| UT-CP-006 | deleteCheckpoint() | Cleanup | Low |

**Coverage Target**: ≥90% on checkpoint-manager.js  
**Focus Areas**: UT-CP-002 and UT-CP-003 are critical (P0)

### 2. Integration Tests (5 cases) - IT-CP-001 through IT-CP-005

**Focus**: Checkpoint interacting with batch-processor.js

| Test ID | Scenario | Coverage | Risk |
|---------|----------|----------|------|
| IT-CP-001 | Full resume workflow | Start → interrupt → resume → complete | **P0** |
| IT-CP-002 | Config change detection | Stale checkpoint handling | **P0** |
| IT-CP-003 | Error recovery | Photo failure during resume | P1 |
| IT-CP-004 | Parallelism handling | Resume with different --parallel | Low |
| IT-CP-005 | Checkpoint cleanup | Auto-delete after success | Low |

**Coverage Target**: ≥80% on batch-processor.js checkpoint integration  
**Focus Areas**: IT-CP-001 and IT-CP-002 are critical (P0)

### 3. Edge Cases (8 cases) - EC-CP-001 through EC-CP-008

**Focus**: Unusual scenarios, error conditions, boundary conditions

| Test ID | Scenario | Coverage | Risk |
|---------|----------|----------|------|
| EC-CP-001 | Corrupted JSON | Graceful degradation | P1 |
| EC-CP-002 | Missing fields | Validation catches incomplete | P1 |
| EC-CP-003 | Very large batch (250+ photos) | Stability & performance | P1 |
| EC-CP-004 | Photos deleted from directory | Skip missing, continue | P2 |
| EC-CP-005 | New photos added | Include in batch | P2 |
| EC-CP-006 | Disk full during save | Continue analysis | P1 |
| EC-CP-007 | Old checkpoint (>7 days) | Auto-discard | P2 |
| EC-CP-008 | Concurrent resume attempts | No file corruption | P1 |

**Coverage Target**: ≥75% on error handling paths  
**High-Risk**: EC-CP-003 (large batches), EC-CP-006 (disk failure)

### 4. Manual Scenarios (5 cases) - MT-CP-001 through MT-CP-005

**Focus**: Real-world user workflows (can't be fully automated)

| Scenario | Steps | Verification |
|----------|-------|---------------|
| MT-CP-001 | Interactive Resume | 100-photo batch, Ctrl+C, resume | Progress accuracy |
| MT-CP-002 | Config Modification | Edit open-call.json mid-batch | Checkpoint detected as stale |
| MT-CP-003 | Large Batch (250+) | Multiple interruptions & resumes | Consistency, performance |
| MT-CP-004 | Cleanup Verification | Complete successfully | Checkpoint auto-deleted |
| MT-CP-005 | Custom Interval | `--checkpoint-interval 5` flag | Saves at correct intervals |

**Coverage Target**: All user journeys covered  
**Execution**: Manual by QA (can't automate fully due to timing)

---

## 🎯 Risk-Based Testing Priorities

### P0 Critical (Must Have for Release)
- ✅ UT-CP-002: Save/load round-trip (data integrity)
- ✅ UT-CP-003: Validate checkpoint (stale detection)
- ✅ IT-CP-001: Full resume workflow (core feature)
- ✅ IT-CP-002: Config change detection (prevents bad results)

**Testing Sequence**: Implement P0 tests FIRST (2 unit + 2 integration)

### P1 Important (Should Have)
- EC-CP-001: Corrupted file handling
- EC-CP-002: Missing fields validation
- EC-CP-003: Large batch stability
- EC-CP-006: Disk failure resilience
- IT-CP-003: Error recovery

**Testing Sequence**: Implement after P0 passes

### P2 Nice-to-Have (Defensive)
- EC-CP-004: Missing photos handling
- EC-CP-005: New photos handling
- EC-CP-007: Old checkpoint expiration
- IT-CP-004: Parallelism handling
- IT-CP-005: Cleanup

**Testing Sequence**: Implement last (time permitting)

---

## 📊 Test Acceptance Criteria

### All Tests Pass
```
✅ Unit tests: 6/6 passing (100%)
✅ Integration tests: 5/5 passing (100%)
✅ Edge case tests: 8/8 passing (100%)
✅ Manual tests: 5/5 verified by QA
```

### Coverage Requirements
```
✅ checkpoint-manager.js: ≥90% coverage
✅ batch-processor.js checkpoint integration: ≥80% coverage
✅ Overall M2: ≥85% coverage (project requirement)
```

### No Regressions
```
✅ All existing M1 tests still passing
✅ No new flaky tests introduced
✅ No timeout issues in large batches
```

---

## 📝 Test Data Requirements

### Small Batch (10 photos)
- **Purpose**: Quick unit test runs
- **Location**: `data/test-photos/small-batch/`
- **Format**: Mix of JPG, PNG (valid images)

### Medium Batch (50 photos)
- **Purpose**: Resume workflow testing
- **Location**: `data/test-photos/medium-batch/`
- **Format**: All JPG, numbered photo-001.jpg to photo-050.jpg
- **Critical for**: IT-CP-001 (resume workflow)

### Large Batch (250 photos)
- **Purpose**: Edge case stability testing
- **Location**: `data/test-photos/large-batch/`
- **Format**: All JPG, numbered photo-001.jpg to photo-250.jpg
- **Critical for**: EC-CP-003 (large batch stress test)

### Mixed Formats (30 photos)
- **Purpose**: Format compatibility
- **Location**: `data/test-photos/mixed-formats/`
- **Files**: 10 JPG, 10 PNG, 5 GIF, 5 WebP

---

## 🔗 Downstream Dependencies

### For Phase 4 (@Dev - Implementation)

Your implementation should:
1. Follow test structure exactly (function names, parameters)
2. Use checkpoint schema from Phase 2 (exact JSON structure)
3. Implement 7 functions in checkpoint-manager.js
4. Integrate with batch-processor.js (load, validate, skip, save, delete)
5. Write tests matching this design

**Key Functions**:
- `computeConfigHash(config)` - SHA256 hash
- `loadCheckpoint(projectDir)` - Load .analysis-checkpoint.json
- `saveCheckpoint(checkpoint, projectDir)` - Atomic write
- `validateCheckpoint(checkpoint, config)` - Schema + hash validation
- `deleteCheckpoint(projectDir)` - Cleanup
- `initializeCheckpoint(...)` - New checkpoint
- `updateCheckpoint(...)` - Incremental update

---

## ✅ Phase 3 Definition of Done

- ✅ Test matrix with 23+ test cases documented
- ✅ 6 unit tests designed (UT-CP-001 through UT-CP-006)
- ✅ 5 integration tests designed (IT-CP-001 through IT-CP-005)
- ✅ 8 edge case tests designed (EC-CP-001 through EC-CP-008)
- ✅ 5 manual test scenarios documented (MT-CP-001 through MT-CP-005)
- ✅ Test data setup documented (small/medium/large/mixed batches)
- ✅ Acceptance criteria finalized (coverage ≥85%)
- ✅ Risk matrix shows test priorities (P0/P1/P2)
- ✅ Test execution checklist created
- ✅ Stored in `_bmad-output/test-design.md`

---

## 📚 Test Execution Plan

### Phase 4 Implementation (Sequential)

**Step 1: Implement P0 Tests First** (2-3 days)
- Write UT-CP-002 (save/load round-trip)
- Write UT-CP-003 (validate checkpoint)
- Write IT-CP-001 (resume workflow)
- Write IT-CP-002 (config change)
- Verify: All 4 pass (critical path)

**Step 2: Implement P1 Tests** (1-2 days)
- Write UT-CP-001, UT-CP-004, UT-CP-005, UT-CP-006
- Write IT-CP-003, IT-CP-004, IT-CP-005
- Write EC-CP-001, EC-CP-002, EC-CP-003, EC-CP-006
- Verify: Coverage ≥85%

**Step 3: Implement P2 Tests** (0.5-1 day)
- Write EC-CP-004, EC-CP-005, EC-CP-007, EC-CP-008
- Manual tests (MT-CP-001 through MT-CP-005)
- Verify: All tests passing, no regressions

### Coverage Gate
```bash
npm test -- --coverage checkpoint-manager.js
# Must show ≥90% coverage
```

### Regression Testing
```bash
npm test
# All M1 tests must still pass
```

---

## 🎉 Phase 3 Summary

**Test strategy for FR-2.2 is comprehensive and ready for implementation.**

All critical decisions have been made:
- ✅ 23+ test cases covering unit/integration/edge/manual
- ✅ P0/P1/P2 prioritization for implementation sequence
- ✅ Clear acceptance criteria for each test
- ✅ Test data requirements defined
- ✅ Coverage targets set (≥85% overall, ≥90% for checkpoint-manager.js)
- ✅ Error scenarios documented
- ✅ Integration points with batch-processor.js specified

**Next**: @Dev implements Phase 4 using this exact test design.

---

## 📊 Test Metrics Summary

| Metric | Value | Target |
|--------|-------|--------|
| Unit Tests | 6 | ≥5 |
| Integration Tests | 5 | ≥3 |
| Edge Case Tests | 8 | ≥5 |
| Manual Scenarios | 5 | ≥3 |
| **Total** | **23+** | **≥15** |
| Coverage (checkpoint-manager.js) | Target 90% | ≥90% |
| Coverage (batch-processor integration) | Target 80% | ≥80% |
| Overall M2 Coverage | Target 85% | ≥85% |

---

**Commit**: `862932e`  
**File**: `_bmad-output/test-design.md`  
**Lines Added**: 427 (Section 10 - FR-2.2 Test Design)

Ready for Phase 4! 🚀
