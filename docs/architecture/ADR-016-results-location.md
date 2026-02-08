# ADR-016: Consistent Per-Open-Call Results with Timestamped History

**Status**: Accepted
**Date**: 2026-02-08
**Deciders**: Project Owner, Architect, Dev, QA
**Context**: FR-3.12 - Consistent Results Directory Location

---

## Context and Problem Statement

The `analyze` CLI command saves results to `./results` (resolved relative to the current working directory), while `analyze-set` and `suggest-sets` save results to `{projectDir}/results/` (resolved relative to the open call project directory). This inconsistency means:

- Running `analyze` from the project root overwrites results in a shared `./results` folder, losing per-open-call isolation
- Historical analysis runs are lost because each run overwrites the previous results
- The behavior contradicts the documented project structure in CLAUDE.md, which shows `results/` as a subdirectory of each open call

Multi-open-call workflows (e.g., analyzing photos for both "nature-wildlife" and "instantart-arles-2026") produce interleaved results in a single directory, making it impossible to track which results belong to which open call.

---

## Decision Drivers

### Functional Requirements
- Each open call must have isolated results in its own `results/` directory
- Historical analysis runs must be preserved for comparison and auditing
- All three CLI commands (`analyze`, `analyze-set`, `suggest-sets`) must behave consistently
- Users must still be able to override the output directory via `-o` flag

### Technical Constraints
- Symlinks are the standard mechanism for "latest" pointers on Unix/macOS
- Windows may require elevated permissions for symlinks; a fallback is needed
- The checkpoint system (FR-2.2) reads from `{projectDir}/` and must not be affected
- Existing `report-generator.js` and `set-report-generator.js` receive `outputDir` as a parameter and do not resolve paths internally

### User Experience Goals
- Zero-config: the default behavior should produce correct, isolated, timestamped results
- The `latest` symlink allows scripts and users to always find the most recent results
- Absolute path override (`-o /absolute/path`) must still work for advanced users

---

## Considered Options

### Option 1: Fix Path Resolution Only (No Timestamps)
Change `analyze` to use `join(projectDir, options.output)` like the set commands. Results overwrite each run.

**Pros**: Minimal change (2 lines), no new dependencies
**Cons**: No historical tracking, each run overwrites the previous

### Option 2: Timestamped Subdirectories with Latest Symlink (Selected)
All commands save to `{projectDir}/results/{ISO-timestamp}/` and maintain a `latest` symlink.

**Pros**: Full history preservation, consistent behavior, `latest` symlink for convenience
**Cons**: More disk usage over time, slightly more complex implementation

### Option 3: Timestamped with Configurable Retention
Like Option 2, but with automatic cleanup of old runs (e.g., keep last N runs).

**Pros**: Prevents unbounded disk usage
**Cons**: Over-engineered for current needs; can be added later if needed

---

## Decision

**Option 2: Timestamped subdirectories with `latest` symlink.**

A new `resolveOutputDir(projectDir, outputPath)` utility function in `src/utils/file-utils.js` centralizes the logic for all three commands. It:

1. Resolves `outputPath` relative to `projectDir` (or uses it as-is if absolute)
2. Creates a timestamped subdirectory: `{baseDir}/{YYYY-MM-DDTHH-MM-SS}/`
3. Creates or updates a `latest` symlink pointing to the new timestamp directory
4. Falls back to `latest.txt` containing the timestamp string if symlinks fail (Windows)

### Resulting Directory Structure

```
data/open-calls/nature-wildlife/
├── open-call.json
├── photos/
└── results/
    ├── 2026-02-08T14-30-45/
    │   ├── batch-results.json
    │   ├── photo-analysis.md
    │   ├── photo-analysis.json
    │   └── photo-analysis.csv
    ├── 2026-02-08T16-15-30/
    │   └── ...
    └── latest -> 2026-02-08T16-15-30
```

---

## Consequences

### Positive
- Results are isolated per open call and per run
- Full historical tracking enables comparison between analysis runs
- Consistent behavior across all three CLI commands
- `latest` symlink provides stable path for scripts and automation
- Backward-compatible: `-o` flag still allows custom output paths

### Negative
- Breaking change for users who rely on `./results` at project root
- Disk usage grows with each analysis run (no auto-cleanup)
- Symlink creation may fail on Windows without Developer Mode

### Risks and Mitigations
- **Disk usage**: Users can manually delete old timestamp directories; auto-cleanup can be added in a future FR
- **Windows symlinks**: Fallback to `latest.txt` file containing the timestamp string
- **Migration**: Existing root-level `results/` directory is stale test data and will be cleaned up

---

## Related Decisions
- ADR-015: Set Analysis (established the `join(projectDir, options.output)` pattern)
- FR-2.2: Resume Interrupted Analysis (checkpoint system unaffected, operates at project level)
