# ADR-026: Feedback Loop and Comparison Engine

**Date**: 2026-04-03
**Status**: Accepted
**Features**: FR-B.1, FR-B.2, FR-B.3, FR-B.4

## Context

After running AI photo analysis, photographers have no way to validate whether the AI ranking aligns with their own artistic judgment. Without this feedback mechanism, users must blindly trust the AI's output or manually compare rankings — a tedious and error-prone process.

Additionally, LLaVA analysis can produce slightly different results across runs. Users need visibility into how stable the rankings are over time.

## Decision

Implement a feedback loop with two CLI commands and a pure-function comparison engine:

### 1. Human Ranking Command (`human-ranking`)
- User provides photos ordered best-first via `--photos`
- Validates each filename exists in the project's `photos/` directory
- Saves to `{project}/human-ranking.json` with metadata (version, type, timestamp)
- Type is `partial` (<10 photos) or `full` (>=10)

### 2. Comparison Command (`compare`)
- Loads latest AI ranking from `results/latest/photo-analysis.json`
- Loads human ranking from `human-ranking.json` (optional — works without it)
- Loads all historical runs from `results/*/photo-analysis.json` for consistency analysis
- Generates a markdown report to `results/latest/comparison-report.md`

### 3. Comparison Engine (`comparison-engine.js`)
Pure functions, no I/O, no side effects:

- **Spearman's rho**: Rank correlation coefficient (-1 to 1). Only considers photos present in both rankings. Returns null if fewer than 2 common photos.
- **Top-N overlap**: How many of the top N photos agree between rankings. Computed for N=3, 5, 10.
- **Disagreements**: Photos where rank differs by more than a threshold (default: 5).
- **Cross-run consistency**: Mean rank and standard deviation per photo across all runs. Top-5 stability percentage. Flags high-volatility photos (rank σ > 5).

## Interpretation Guide

| Spearman's rho | Meaning |
|----------------|---------|
| >= 0.8 | Strong agreement — AI aligns well with your judgment |
| 0.5 – 0.8 | Moderate agreement — mostly aligned, review disagreements |
| 0.2 – 0.5 | Weak agreement — significant differences, investigate |
| < 0.2 | No/inverse agreement — AI criteria may not match your intent |

## Alternatives Considered

1. **Kendall's tau** instead of Spearman's rho — rejected because Spearman is more widely understood and computationally simpler for this use case.
2. **Interactive UI** for ranking — deferred; CLI `--photos` is sufficient for MVP and integrates cleanly with the existing workflow.
3. **Automatic prompt tuning** based on disagreements — out of scope for this iteration; the comparison report provides the human with actionable data to manually adjust criteria.

## Consequences

- Users can iteratively refine their open-call.json criteria based on where AI and human rankings diverge
- Cross-run consistency data helps users decide whether to trust a single run or average multiple runs
- The comparison engine is pure functions — easy to test (20 tests) and reuse
