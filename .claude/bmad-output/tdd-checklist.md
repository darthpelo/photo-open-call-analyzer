# TDD Checklist

**Project**: Photo Open Call Analyzer
**Story/Feature**: Security P1 Fixes (SEC-M3-05, SEC-M3-08)
**Date**: 2026-02-20
**Owner**: Implementer

---

## TDD Cycles

| # | Behavior | RED: Test Written | RED: Fails? | GREEN: Code Written | GREEN: Passes? | REFACTOR: Changes | Notes |
|---|----------|-------------------|-------------|---------------------|----------------|-------------------|-------|
| 1 | Path traversal rejected in explicit files | file-utils.test.js:resolvePhotoSelection - should reject explicit filenames with path traversal | Yes (got "Photo(s) not found" instead of "path traversal") | Added validatePathContainment() + guard in resolveExplicitFiles() | Yes | None | SEC-M3-05 |
| 2 | Path traversal rejected in glob patterns | file-utils.test.js:resolvePhotoSelection - should reject glob results that escape photosDir | Yes (no traversal check) | Added validatePathContainment guard in resolveGlobPatterns() | Yes | None | SEC-M3-05 |
| 3 | Valid filenames still work after guard | file-utils.test.js:resolvePhotoSelection - should still resolve valid explicit filenames | Yes (validatePathContainment not exported) | Exported validatePathContainment from file-utils.js | Yes | None | SEC-M3-05 |
| 4 | Combination limit throws on excessive combos | combination-generator.test.js:selectCandidateSets safety limit - should throw when combinations exceed MAX_SAFE_COMBINATIONS | Yes (ran 593K combos without throwing) | Added countCombinations check before loop, throws if > maxCombinations | Yes | None | SEC-M3-08 |
| 5 | Combination limit allows reasonable combos | combination-generator.test.js:selectCandidateSets safety limit - should allow combinations under the limit | Yes (validatePathContainment not a function) | Same implementation covers this | Yes | None | SEC-M3-08 |
| 6 | Custom maxCombinations option respected | combination-generator.test.js:selectCandidateSets safety limit - should respect custom maxCombinations option | Yes (no throw) | maxCombinations option destructured from options with default 10000 | Yes | None | SEC-M3-08 |

### validatePathContainment unit tests

| # | Behavior | RED: Test Written | RED: Fails? | GREEN: Code Written | GREEN: Passes? | REFACTOR: Changes | Notes |
|---|----------|-------------------|-------------|---------------------|----------------|-------------------|-------|
| 1a | Reject ../ traversal | file-utils.test.js:validatePathContainment - should reject path traversal with ../ | Yes | validatePathContainment implemented | Yes | None | SEC-M3-05 core |
| 1b | Reject absolute paths outside base | file-utils.test.js:validatePathContainment - should reject absolute paths outside base | Yes | Same impl | Yes | None | SEC-M3-05 core |
| 1c | Allow valid filenames | file-utils.test.js:validatePathContainment - should allow valid filenames within base | Yes | Same impl | Yes | None | SEC-M3-05 core |
| 1d | Allow subdirectory paths | file-utils.test.js:validatePathContainment - should allow subdirectory paths within base | Yes | Same impl | Yes | None | SEC-M3-05 core |
| 1e | Reject sneaky traversal (subdir/../../outside) | file-utils.test.js:validatePathContainment - should reject paths that resolve outside base despite looking valid | Yes | Same impl | Yes | None | SEC-M3-05 core |

---

## Coverage Summary

- Tests written: 11 (5 validatePathContainment + 3 resolvePhotoSelection traversal + 3 selectCandidateSets limit)
- Tests passing: 11
- All existing tests: 701 passing (0 regressions)
- Requirements covered: SEC-M3-05 (path traversal), SEC-M3-08 (combination limit)
- Requirements NOT covered: None (all P1 items addressed)

---

## Compliance Verdict

- [x] Every behavior was tested BEFORE implementation (red-green-refactor)
- [x] All acceptance criteria from security audit have corresponding test(s)
- [x] No implementation code exists without a preceding test
- [x] Refactoring preserved all green tests

**TDD Compliant**: Yes
