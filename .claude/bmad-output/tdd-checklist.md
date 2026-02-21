# TDD Checklist

**Project**: Photo Open Call Analyzer
**Story/Feature**: FR-4.3 — Submission Validator (Compliance Checker Expansion)
**Date**: 2026-02-20
**Owner**: Implementer

---

## TDD Cycles

| # | Behavior | RED: Test Written | RED: Fails? | GREEN: Code Written | GREEN: Passes? | REFACTOR: Changes | Notes |
|---|----------|-------------------|-------------|---------------------|----------------|-------------------|-------|
| 1 | checkPhotoCount returns ok when count within limits | submission-validator.test.js:checkPhotoCount | Yes (module not found) | countImageFiles + checkPhotoCount | Yes | None | |
| 2 | checkPhotoCount returns error when exceeding maxPhotos | submission-validator.test.js:checkPhotoCount | Yes | Same impl | Yes | None | |
| 3 | checkPhotoCount returns warning when below minPhotos | submission-validator.test.js:checkPhotoCount | Yes | Same impl | Yes | |
| 4 | checkPhotoCount counts only image files | submission-validator.test.js:checkPhotoCount | Yes | IMAGE_EXTENSIONS filter | Yes | None | |
| 5 | checkPhotoCount handles non-existent dir | submission-validator.test.js:checkPhotoCount | Yes | existsSync guard | Yes | None | |
| 6 | checkDeadline returns ok for future deadlines | submission-validator.test.js:checkDeadline | Yes | checkDeadline impl | Yes | None | |
| 7 | checkDeadline returns expired for past deadlines | submission-validator.test.js:checkDeadline | Yes | Same impl | Yes | None | |
| 8 | checkDeadline returns warning within 3 days | submission-validator.test.js:checkDeadline | Yes | Same impl (<=3 threshold) | Yes | None | |
| 9 | checkDeadline handles today | submission-validator.test.js:checkDeadline | Yes | Same impl | Yes | None | |
| 10 | checkDeadline handles invalid date | submission-validator.test.js:checkDeadline | Yes | isNaN guard | Yes | None | |
| 11 | validateSubmission passes when no rules violated | submission-validator.test.js:validateSubmission | Yes | validateSubmission impl | Yes | None | |
| 12 | validateSubmission detects count violation | submission-validator.test.js:validateSubmission | Yes | Same impl | Yes | None | |
| 13 | validateSubmission detects expired deadline | submission-validator.test.js:validateSubmission | Yes | Same impl | Yes | None | |
| 14 | validateSubmission warns approaching deadline | submission-validator.test.js:validateSubmission | Yes | Same impl | Yes | None | |
| 15 | validateSubmission detects format violations | submission-validator.test.js:validateSubmission | Yes | requiredFormat check | Yes | None | |
| 16 | validateSubmission detects size violations | submission-validator.test.js:validateSubmission | Yes | maxSizeMB check | Yes | None | |
| 17 | validateSubmission returns passed=true with no rules | submission-validator.test.js:validateSubmission | Yes | Early return guard | Yes | None | |
| 18 | validateSubmission aggregates multiple violations | submission-validator.test.js:validateSubmission | Yes | Same impl | Yes | None | |
| 19 | validateSubmission returns structured objects | submission-validator.test.js:validateSubmission | Yes | Same impl | Yes | None | |
| 20 | maxPhotos equality (count === limit) returns ok | submission-validator.test.js:checkPhotoCount | Yes | > comparison (not >=) | Yes | None | |

---

## Coverage Summary

- Tests written: 20
- Tests passing: 20
- All existing tests: 724 passing (0 regressions)
- Requirements covered: FR-4.3
- Requirements NOT covered: None

---

## Compliance Verdict

- [x] Every behavior was tested BEFORE implementation (red-green-refactor)
- [x] All acceptance criteria from PRD have corresponding test(s)
- [x] No implementation code exists without a preceding test
- [x] Refactoring preserved all green tests

**TDD Compliant**: Yes
