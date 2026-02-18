# STORY-FR39: Model Selection & Management

**Feature**: FR-3.9
**ADR**: ADR-019
**Priority**: P1
**Estimate**: Small-Medium (1-2 sessions)

---

## User Story

As a photographer, I want to choose which vision model to use for each project so that I can optimize for speed (moondream) or quality (llava:13b) depending on the competition.

## Acceptance Criteria

1. **Model resolution chain**
   - Priority: CLI `--model` > `open-call.json` `"model"` > `OLLAMA_MODEL` env > `llava:7b` default
   - `resolveModel({ cliModel, configModel, envModel })` returns resolved model name

2. **Model discovery**
   - `listVisionModels()` returns array of installed vision-capable models
   - Uses existing `checkOllamaStatus()` infrastructure

3. **Auto-pull**
   - `ensureModelAvailable(model)` checks if model is installed
   - If missing, calls `ollama.pull()` with progress logging
   - Graceful error if pull fails (network, invalid model name)

4. **api-client.js refactor**
   - `getModelName(override)` accepts optional override parameter
   - Existing behavior unchanged when no override is provided

5. **open-call.json schema extension**
   - Optional `"model"` field accepted in config
   - Validation passes with or without the field

6. **CLI**
   - `--model <name>` flag on `analyze`, `analyze-single`, `analyze-set` commands
   - New `list-models` subcommand shows installed vision models with default indicator

7. **Tests**
   - `tests/model-manager.test.js` with >= 80% coverage
   - Unit tests: resolution chain, discovery, auto-pull (mocked), validation

## Implementation Steps

1. Write `tests/model-manager.test.js` (TDD: tests first)
2. Create `src/utils/model-manager.js` with exports:
   - `resolveModel(options)`
   - `ensureModelAvailable(model)`
   - `listVisionModels()`
   - `isVisionModel(modelName)`
3. Refactor `api-client.js:getModelName()` to accept override
4. Add `--model` flag to `analyze`, `analyze-single`, `analyze-set` in `analyze.js`
5. Add `list-models` subcommand to `analyze.js`
6. Update config validator to accept optional `model` field

## Files to Create
- `src/utils/model-manager.js`
- `tests/model-manager.test.js`

## Files to Modify
- `src/utils/api-client.js` (`getModelName` override param)
- `src/cli/analyze.js` (new flag + subcommand)
- `src/config/validator.js` (optional `model` field)

## Dependencies
- FR-3.7 (model name is part of cache key)
