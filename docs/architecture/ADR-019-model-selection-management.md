# ADR-019: Model Selection & Management

**Status**: Accepted
**Date**: 2026-02-17
**Deciders**: Project Owner, Architect, Dev
**Context**: FR-3.9 - Model Selection & Management

---

## Context and Problem Statement

The system currently hardcodes the vision model via `OLLAMA_MODEL` environment variable (default `llava:7b`) in `api-client.js`. This means:

- All projects use the same model regardless of requirements
- Users can't compare model quality without manually changing env vars
- Missing models cause cryptic Ollama errors with no guidance
- `checkOllamaStatus()` already discovers installed vision models but doesn't expose this to users

Multiple vision models exist with different speed/quality tradeoffs:
- `llava:7b` - Fast, good baseline quality
- `llava:13b` - Slower, better quality on complex scenes
- `moondream` - Very fast, lower quality
- `bakllava` - Alternative architecture, different strengths

---

## Decision Drivers

- Users should be able to choose the best model per competition (speed vs quality)
- Model switching should be < 30s (including download if needed)
- Must not break existing workflows (env var still works)
- Per-project model override enables competition-specific optimization

---

## Considered Options

### Option 1: Only CLI Flag
Add `--model` flag, keep everything else the same.

**Pros**: Minimal change
**Cons**: No per-project persistence, no model discovery, no auto-pull

### Option 2: Model Manager Module (Selected)
New `model-manager.js` with resolution chain, discovery, and auto-pull.

**Pros**: Clean abstraction, per-project config, auto-pull with progress
**Cons**: New module to maintain, refactors api-client.js

### Option 3: Full Model Registry
YAML-based model registry with benchmarks, recommended settings per model.

**Pros**: Rich metadata
**Cons**: Over-engineered, hard to keep benchmarks accurate

---

## Decision

**Option 2: Model manager module.**

### Model Resolution Chain

Priority (highest wins):
1. `--model <name>` CLI flag
2. `open-call.json` → `"model": "<name>"` field
3. `OLLAMA_MODEL` environment variable
4. Default: `llava:7b`

```javascript
export function resolveModel({ cliModel, configModel, envModel }) {
  return cliModel || configModel || envModel || 'llava:7b';
}
```

### Model Discovery

Leverage existing `checkOllamaStatus()` infrastructure:

```javascript
export async function listVisionModels() {
  const status = await checkOllamaStatus();
  if (!status.connected) throw new Error('Ollama not running');
  return status.visionModels;
}
```

### Auto-pull

When the resolved model isn't installed:

```javascript
export async function ensureModelAvailable(modelName) {
  const models = await listVisionModels();
  if (models.includes(modelName)) return true;

  // Prompt user (or auto-pull in non-interactive mode)
  logger.info(`Model ${modelName} not found. Pulling...`);
  const client = getApiClient();
  await client.pull({ model: modelName, stream: true });
  return true;
}
```

### api-client.js Changes

Minimal refactor - `getModelName()` accepts an optional override:

```javascript
export function getModelName(override = null) {
  return override || config.model;
}
```

The actual resolution logic lives in `model-manager.js`, keeping `api-client.js` as a thin Ollama wrapper.

### open-call.json Schema Extension

Add optional `model` field:
```json
{
  "title": "Nature Wildlife 2025",
  "theme": "Wildlife",
  "model": "llava:13b",
  ...
}
```

### New CLI Command

```bash
# List installed vision models
node src/cli/analyze.js list-models
```

Output:
```
Installed vision models:
  * llava:7b (default)
    llava:13b
    moondream:latest

Current model: llava:7b
```

---

## Consequences

### Positive
- Per-project model selection without environment variable juggling
- Auto-discovery of installed models
- Auto-pull removes manual setup friction
- Model name in cache key (FR-3.7) prevents cross-model cache pollution

### Negative
- Schema extension to open-call.json (backward compatible, field is optional)
- Auto-pull can be slow for large models (13b is ~4GB)

### Mitigations
- Progress bar during auto-pull
- `--model` flag provides immediate override without config changes
- Existing OLLAMA_MODEL env var continues to work unchanged

---

## Related Decisions
- FR-3.7 / Caching: Model name is part of cache key
- ADR-014: Smart analysis mode selection considers model capabilities (future enhancement)
