# ADR-020: Historical Winner Learning

**Status**: Accepted
**Date**: 2026-02-17
**Deciders**: Project Owner, Architect, Dev, Art Critic
**Context**: FR-3.10 - Historical Winner Learning

---

## Context and Problem Statement

The system analyzes photos in isolation, with no memory of what has won in past competitions. Photographers often study previous winners to understand jury preferences, but this knowledge isn't encoded anywhere the tool can use.

Users want:
- To tag past winners for reference
- To understand winning patterns across competitions
- To see how their current submissions compare to winners

---

## Decision Drivers

- Learning from winners provides personalized, data-driven recommendations
- Must work offline (no web scraping, no external APIs)
- Must not alter core scoring algorithm (winner similarity is informational)
- Must be per-project (different competitions have different winning patterns)

---

## Considered Options

### Option 1: Global Winner Database
Centralized SQLite database of all winners across all projects.

**Pros**: Cross-competition pattern extraction
**Cons**: New dependency, complex queries, mixes competition contexts

### Option 2: Per-project Winner Files (Selected)
JSON-based winner storage in each project directory, with pattern extraction.

**Pros**: Simple, project-scoped, follows existing patterns, no new dependencies
**Cons**: No cross-project learning (future enhancement)

### Option 3: ML-based Pattern Learning
Use a separate ML model to learn winner features from photos.

**Pros**: Could discover visual patterns beyond scores
**Cons**: Massive scope increase, needs training data, over-engineered for current needs

---

## Decision

**Option 2: Per-project winner files.**

### Winner Storage

```
{projectDir}/
├── winners/
│   └── winners.json
```

**winners.json format**:
```json
{
  "version": "1.0",
  "entries": [
    {
      "id": "win-001",
      "filename": "sunset-golden-hour.jpg",
      "competition": "Nature Wildlife 2025",
      "placement": "1st",
      "scores": {
        "individual": {
          "Composition": { "score": 9, "weight": 25 },
          "Technical Quality": { "score": 8, "weight": 25 }
        },
        "summary": { "weighted_average": 8.5 }
      },
      "taggedAt": "2026-02-17T10:00:00Z",
      "notes": "User notes about why this won"
    }
  ]
}
```

### Pattern Extraction

From the winner database, extract:

1. **Score profile**: Average score per criterion across winners
2. **Dominant criteria**: Top 2-3 criteria where winners score highest
3. **Score thresholds**: Minimum scores observed in winners per criterion
4. **Recommendation distribution**: % of Strong Yes / Yes / Maybe among winners

```javascript
export function extractPatterns(winners) {
  return {
    avgScoreProfile: { /* criterion → avg score */ },
    dominantCriteria: ['Composition', 'Emotional Impact'],
    minScores: { /* criterion → min winner score */ },
    overallAverage: 8.2,
    count: winners.length
  };
}
```

### Winner Similarity Scoring

For each analyzed photo, compute cosine similarity against the winner score profile:

```javascript
export function computeWinnerSimilarity(photoScores, patterns) {
  // Cosine similarity between photo score vector and winner avg score vector
  // Returns 0-10 score
}
```

This is shown as a separate "Winner Similarity" metric in reports, NOT blended into the main score.

### CLI Commands

```bash
# Tag a photo as a winner (after competition results are announced)
node src/cli/analyze.js tag-winner <project-dir> \
  --photo winner.jpg \
  --placement "1st" \
  --notes "Strong composition, emotional story"

# View extracted patterns from tagged winners
node src/cli/analyze.js winner-insights <project-dir>

# Include winner similarity in batch analysis
node src/cli/analyze.js analyze <project-dir> --compare-winners
```

### Integration with Score Aggregation

When `--compare-winners` is passed:

1. Load winners from project directory
2. Extract patterns
3. For each analyzed photo, compute winner similarity
4. Add `winnerSimilarity` field to ranking output
5. Reports include a "Winner Comparison" section

The core `aggregateScores()` function is NOT modified. Winner similarity is computed post-aggregation and appended to results.

---

## Consequences

### Positive
- Data-driven insights from past winners
- Personalized to each competition's style
- Non-invasive: separate metric, doesn't alter core scores
- Simple file-based storage, no new dependencies

### Negative
- Manual tagging burden (user must tag winners after results)
- Per-project only (no cross-competition learning yet)
- Winner database accuracy depends on user's score data

### Mitigations
- Tag command is simple and fast
- Insights command provides immediate value even with few winners
- Future: import winners from batch-results.json (auto-tag from existing analysis)

---

## Related Decisions
- FR-3.7 / Caching: Winner comparison doesn't invalidate cache (computed post-analysis)
- FR-2.4 / Prompt Engineering: Winner patterns could inform prompt criteria (future enhancement)
