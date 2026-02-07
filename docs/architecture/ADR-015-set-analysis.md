# ADR-015: Polaroid Set Analysis Mode

**Status**: Accepted
**Date**: 2026-02-07
**Deciders**: Development Team, Architect, Art Critic
**Context**: FR-3.11 - Polaroid Set Analysis Feature

---

## Context and Problem Statement

The Photo Open Call Analyzer currently analyzes photos individually. Each photo receives its own score based on evaluation criteria derived from the open call requirements and jury preferences. However, Polaroid-style exhibitions require submitting sets of photos (typically 4) that are in "dialogue" with each other. A strong individual photo may weaken a set if it clashes thematically or visually with its companions, and a technically modest photo may elevate a set by providing contrast or narrative continuity.

We need to add set-level analysis as a layer on top of the existing individual analysis pipeline, enabling the tool to evaluate how photos work together as a cohesive group and to suggest optimal combinations from a larger pool of candidates.

---

## Decision Drivers

### Functional Requirements
- Polaroid open calls judge submissions as sets, not individual photos
- Set coherence (thematic, tonal, visual rhythm) is a first-class evaluation criterion
- Users need help selecting the best K photos from N candidates to form an optimal set
- Existing individual analysis must remain unchanged when set mode is not configured

### Technical Constraints
- Ollama's chat API supports an `images` array, allowing multiple images in a single call
- LLaVA 7b has limited multi-image reasoning; larger models (13b+) are recommended for set analysis
- Combinatorial explosion: C(20, 4) = 4,845 combinations; brute-force vision evaluation is infeasible
- Memory usage increases with multiple base64-encoded images in a single API call

### User Experience Goals
- Backward-compatible: existing workflows must work unchanged when `setMode` is absent
- Set analysis should be opt-in via `open-call.json` configuration
- Results should clearly distinguish individual scores from set-level scores

---

## Considered Options

### Option 1: Pairwise Comparison

**Overview**: Compare every pair of photos in the set to evaluate visual and thematic coherence, then aggregate pairwise scores into a set score.

**Pros**:
- Simpler per-call reasoning (only 2 images at a time)
- May work better with smaller vision models

**Cons**:
- O(n^2) API calls per set (6 calls for a 4-photo set)
- Loses holistic group evaluation -- cannot assess overall rhythm or narrative arc
- Aggregating pairwise scores into a meaningful set score is non-trivial

**Verdict**: Rejected. The quadratic API call cost and loss of holistic evaluation make this approach impractical for the primary use case.

---

### Option 2: Text-Only Set Analysis

**Overview**: Analyze each photo individually, then use the text descriptions (without re-sending images) to evaluate set coherence via a text-only prompt.

**Pros**:
- No multi-image API call required
- Works with any model, including those with weak multi-image support
- Faster than re-sending images

**Cons**:
- Loses visual comparison capability -- the model cannot see color palettes, visual rhythm, or tonal consistency
- Text descriptions may omit subtle visual relationships that matter for set coherence
- Quality ceiling is fundamentally lower

**Verdict**: Rejected. Visual comparison is essential for evaluating how photos "look" together; text proxies are insufficient.

---

### Option 3: Cloud Vision API

**Overview**: Use a more powerful cloud-based vision model (e.g., Claude, GPT-4V) for set analysis while keeping individual analysis local.

**Pros**:
- Superior multi-image reasoning capability
- No local resource constraints

**Cons**:
- Violates the project's local-first principle (see CLAUDE.md: Ollama-based stack)
- Introduces external API dependency and cost
- Requires internet connectivity

**Verdict**: Rejected. Contradicts the architectural decision to use local-only inference via Ollama.

---

### Option 4: Multi-Image Ollama Call with Two-Phase Pipeline (Chosen)

**Overview**: Send all photos in a set simultaneously via the Ollama `images` array in a single chat call. Use a two-phase pipeline: individual analysis first (reusing the existing pipeline), then set-level analysis as a separate phase. Optimize combination suggestions with pre-filtering and diversity bonuses.

**Pros**:
- Leverages existing Ollama infrastructure and native `images[]` array support
- Holistic group evaluation in a single context window
- Modular: set analysis is an optional layer that does not affect existing workflows
- Pre-filtering and diversity bonus reduce combinatorial explosion
- Composite scoring balances individual quality with group coherence

**Cons**:
- LLaVA 7b may have limited multi-image reasoning; larger models (13b+) recommended
- Set analysis is slower (4 images per API call, 120s default timeout)
- Combination optimization still requires multiple vision API calls for suggest-sets

**Verdict**: Best approach -- preserves local-first architecture, enables holistic visual comparison, and layers cleanly on existing pipeline.

---

## Decision Outcome

**Chosen option: Option 4 - Multi-Image Ollama Call with Two-Phase Pipeline**

The following key decisions define the implementation:

### 1. Multi-Image Ollama API Call

Send all photos in a set simultaneously via the `images` array in a single Ollama chat call. This allows the vision model to compare photos visually in one context.

```javascript
const response = await client.chat({
  model: model,
  messages: [{
    role: 'user',
    content: setAnalysisPrompt,
    images: [base64Image1, base64Image2, base64Image3, base64Image4]
  }],
  options: {
    temperature: 0.3,
    num_predict: 2000
  }
});
```

### 2. Two-Phase Analysis

Individual analysis runs first (reusing the existing single or multi-stage pipeline from ADR-009), then set-level analysis runs as a separate phase. This ensures:
- Individual scores are available independently
- Set analysis can reference individual results for context
- Failure in set analysis does not block individual results

```
Phase 1: Individual Analysis (existing pipeline)
  photo1 -> individual score
  photo2 -> individual score
  photo3 -> individual score
  photo4 -> individual score

Phase 2: Set Analysis (new)
  [photo1, photo2, photo3, photo4] -> set coherence score
```

### 3. Composite Scoring

The final composite score blends individual and set scores with configurable weights:

```
compositeScore = (individualWeight * avgIndividualScore + setWeight * setWeightedAvg) / 100
```

Default weights: `individualWeight = 40`, `setWeight = 60`. These defaults reflect that Polaroid exhibitions prioritize set coherence over individual technical excellence.

### 4. Combination Optimization

For the "suggest best set" feature, a three-step optimization avoids evaluating all C(N, K) combinations:

1. **Pre-filter**: Sort by individual score, keep top N candidates (e.g., top 12 from 20)
2. **Score combinations**: For each C(N, K) combination, compute `individualScoreSum + diversityBonus`. The diversity bonus rewards variety in subject, tone, and visual style based on individual analysis metadata.
3. **Vision-evaluate top M**: Send only the top M candidate sets (e.g., top 5) to the vision model for full set-level evaluation.

This reduces a 4,845-combination problem (C(20,4)) to roughly 500 scored combinations + 5 vision API calls.

### 5. Backward-Compatible Configuration

Set mode is activated via an optional `setMode` object in `open-call.json`:

```json
{
  "name": "Polaroid Exhibition 2026",
  "theme": "Urban Solitude",
  "setMode": {
    "enabled": true,
    "setSize": 4,
    "individualWeight": 40,
    "setWeight": 60,
    "setCriteria": [
      "Thematic coherence",
      "Visual rhythm and flow",
      "Tonal consistency",
      "Narrative dialogue between images"
    ]
  }
}
```

When `setMode` is absent or `setMode.enabled` is `false`, all existing workflows operate unchanged. No migration required.

### 6. SET_SCORE Response Format

Set analysis responses use a `SET_SCORE:` pattern consistent with the existing `SCORE:` pattern for parsing:

```
SET_SCORE: Thematic coherence: 8/10
SET_SCORE: Visual rhythm and flow: 7/10
SET_SCORE: Tonal consistency: 9/10
SET_SCORE: Narrative dialogue: 6/10
SET_REASONING: The four images share a muted color palette...
SET_RECOMMENDATION: Strong Yes
```

This reuses the existing score parsing infrastructure with a prefix-based distinction.

---

## Consequences

### Positive
- Leverages existing Ollama infrastructure and `images[]` array support
- Modular: set analysis is an optional layer, does not affect existing workflows
- Pre-filtering + diversity bonus reduces combinatorial explosion
- Composite scoring balances individual quality with group coherence
- Backward-compatible: no changes required for users who do not use set mode
- Two-phase design means individual results are always available, even if set analysis fails

### Negative
- LLaVA 7b may have limited multi-image reasoning capability; larger models (13b+) recommended for set analysis
- Set analysis is slower (4 images per API call, 120s default timeout)
- Combination optimization still requires multiple vision API calls for suggest-sets mode
- Additional complexity in prompt generation and score parsing

### Risks
- LLaVA model quality with 4+ simultaneous images needs validation; if insufficient, the feature may require a model upgrade
- Memory usage increases with multiple base64 images in a single call; 4 high-resolution images could exceed available RAM on constrained systems
- The diversity bonus heuristic may not align with artistic judgment in all cases; tuning will be needed based on user feedback

---

## Related Decisions

- **ADR-009**: Multi-stage prompting -- pattern reused for set analysis (individual phase leverages the same 3-stage pipeline)
- **ADR-014**: Smart analysis mode selection -- extended to consider set mode when determining optimal analysis strategy
- **FR-3.11**: Polaroid Set Analysis feature requirement (product specification)

---

## References

- **Ollama Chat API**: `images` array parameter for multi-image input
- **Existing Pipeline**: `src/analysis/photo-analyzer.js` (individual analysis)
- **Batch Processor**: `src/processing/batch-processor.js` (to be extended for set batches)
- **Configuration**: `open-call.json` schema (to be extended with `setMode`)

---

## Approval & Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Architect | Alex (Dev) | 2026-02-07 | Accepted |
| Art Critic | Art Critic Agent | 2026-02-07 | Accepted |
| Product Owner | Project Owner | 2026-02-07 | Accepted |
