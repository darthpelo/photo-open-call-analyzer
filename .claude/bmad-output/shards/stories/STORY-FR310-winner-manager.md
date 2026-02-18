# STORY-FR310: Historical Winner Learning

**Feature**: FR-3.10
**ADR**: ADR-020
**Priority**: P1
**Estimate**: Medium (2-3 sessions)

---

## User Story

As a photographer, I want to tag past competition winners and see how my current submissions compare to winning patterns so that I can improve my selection strategy.

## Acceptance Criteria

1. **Winner tagging**
   - `tagWinner(projectDir, photoResult, metadata)` saves winner entry to `{projectDir}/winners/winners.json`
   - Metadata includes: filename, competition, placement, notes
   - Scores from existing analysis are stored alongside
   - Atomic write (temp + rename)

2. **Winner storage**
   - `{projectDir}/winners/winners.json` with versioned schema
   - Entries include full score profile + metadata
   - `loadWinners(projectDir)` returns all entries (empty array if none)

3. **Pattern extraction**
   - `extractPatterns(winners)` returns:
     - `avgScoreProfile`: average score per criterion
     - `dominantCriteria`: top 2-3 highest-scoring criteria
     - `minScores`: minimum score per criterion across winners
     - `overallAverage`: average overall score
     - `count`: number of winners
   - Returns null/empty if fewer than 1 winner

4. **Winner similarity scoring**
   - `computeWinnerSimilarity(photoScores, patterns)` returns 0-10 score
   - Uses cosine similarity between photo score vector and winner avg score vector
   - Returns 0 if patterns have no data

5. **Integration with analysis**
   - `--compare-winners` flag on `analyze` command
   - When enabled: load winners, extract patterns, compute similarity for each photo
   - Winner similarity shown in report as separate metric (NOT blended into main score)

6. **CLI commands**
   - `tag-winner <project-dir> --photo <name> --placement <place> [--notes <text>]`
   - `winner-insights <project-dir>` shows pattern summary

7. **Tests**
   - `tests/winner-manager.test.js` with >= 80% coverage
   - Unit tests: tag, load, extract patterns, cosine similarity, empty state
   - Edge cases: no winners, single winner, mismatched criteria

## Implementation Steps

1. Write `tests/winner-manager.test.js` (TDD: tests first)
2. Create `src/analysis/winner-manager.js` with exports:
   - `tagWinner(projectDir, photoResult, metadata)`
   - `loadWinners(projectDir)`
   - `extractPatterns(winners)`
   - `computeWinnerSimilarity(photoScores, patterns)`
   - `getWinnerInsights(projectDir)`
3. Add `tag-winner` subcommand to `analyze.js`
4. Add `winner-insights` subcommand to `analyze.js`
5. Add `--compare-winners` flag to `analyze` command
6. Post-aggregation: if winners exist + flag enabled, compute similarity and append to results

## Files to Create
- `src/analysis/winner-manager.js`
- `tests/winner-manager.test.js`

## Files to Modify
- `src/cli/analyze.js` (new subcommands + flag)

## Dependencies
- None strictly, but recommended after FR-3.7/3.8/3.9 to avoid merge conflicts in `analyze.js`
