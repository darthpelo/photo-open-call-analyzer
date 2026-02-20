# Security Audit Report
**Photo Open Call Analyzer**

**Domain**: Software Development
**Audit Date**: 2026-02-20
**Auditor**: BMAD Security Guardian
**Version**: M3 Phase 2 Complete (FR-3.7 through FR-3.10)
**Scope**: Full security audit of M3 Phase 2 features (Caching, Parallel Processing, Model Selection, Winner Learning)
**Previous Audit**: 2026-02-06 (M2 Pre-M3)

---

## Executive Summary

**Overall Risk Level**: :yellow_circle: **MODERATE** (Local CLI tool with new attack surface)
**Critical Findings**: 0
**High Severity**: 1
**Medium Severity**: 7
**Low Severity**: 8
**Informational**: 3

### Key Highlights

**Strengths**:
- Local-first architecture maintained (no cloud dependencies)
- Atomic writes correctly implemented across all new modules (cache, winners, checkpoints)
- SHA-256 cache keys prevent injection via cache filenames
- No shell command execution with user input anywhere
- No hardcoded secrets or credentials
- AJV schema validation for configuration remains solid

**New Attack Surface (M3 Phase 2)**:
- Path traversal in photo selection (glob patterns and explicit filenames)
- Unbounded combination generation can exhaust memory
- Silent large model downloads without user confirmation
- Synchronous file reads block event loop on large photos
- Unvalidated timeouts in set analysis commands
- Cache has no eviction, enabling disk exhaustion
- Absolute paths leaked in output files

**Verdict**: **SECURITY PASS with P1 warnings** (see Security Gate Decision)

---

## STRIDE Threat Model

### 1. Cache Manager (`src/processing/cache-manager.js`)

#### Spoofing
- **Risk**: :green_circle: Low (P3)
- **Vector**: Cache poisoning via pre-placed `.analysis-cache/*.json` files
- **Impact**: Incorrect analysis results returned from poisoned cache
- **Current Control**: Cache key is SHA-256 of `photoHash + configHash + model` - attacker would need to predict the exact key
- **Status**: Mitigated by cryptographic hash

#### Tampering
- **Risk**: :green_circle: Low (P3)
- **Vector**: Modifying cache files on disk between reads
- **Impact**: Corrupted or malicious analysis results loaded
- **Current Control**: Atomic writes (temp + rename) prevent partial corruption
- **Positive Finding**: Cache writes use correct `write-to-temp-then-rename` pattern

#### Denial of Service
- **Risk**: :orange_circle: Medium (P2) - **SEC-M3-01**
- **Vector**: No cache size limit or eviction policy
- **Impact**: Unbounded `.analysis-cache/` directory growth; repeated runs with config changes create thousands of orphaned cache entries (each several KB of JSON)
- **Current Control**: `--clear-cache` flag exists but requires manual intervention
- **Recommendation**: Add maximum entry count (default 1000) with LRU eviction, or at minimum log a warning when cache exceeds a size threshold

#### Denial of Service (Memory)
- **Risk**: :orange_circle: Medium (P2) - **SEC-M3-02**
- **Vector**: `computePhotoHash()` uses synchronous `readFileSync` to load entire photo into memory
- **Impact**: For 50MB RAW photos, blocks event loop and consumes significant memory; called for every photo in a batch
- **Current Control**: None
- **Recommendation**: Use streaming hash: `fs.createReadStream(path).pipe(crypto.createHash('sha256'))`

---

### 2. Concurrency Manager (`src/processing/concurrency-manager.js`)

#### Denial of Service
- **Risk**: :green_circle: Low (P3)
- **Vector**: `--parallel` CLI flag accepts any positive integer with no upper bound
- **Impact**: Value of 1000 would create 1000 concurrent Ollama connections
- **Current Control**: `ConcurrencyManager` has `DEFAULT_MAX_CEILING = 6` in auto mode, but fixed values bypass the ceiling
- **Recommendation**: Clamp fixed values to a reasonable maximum (e.g., 16)

#### Information Disclosure
- **Risk**: :green_circle: Low (P3)
- **Vector**: Performance dashboard logs memory usage, throughput, concurrency levels
- **Impact**: Reveals system resource details if logs are shared
- **Current Control**: Dashboard shown only to terminal user
- **Status**: Acceptable for local CLI tool

---

### 3. Model Manager (`src/utils/model-manager.js`)

#### Spoofing
- **Risk**: :orange_circle: Medium (P2) - **SEC-M3-03**
- **Vector**: `OLLAMA_HOST` environment variable accepted without URL validation
- **Impact**: Attacker who controls env vars can redirect all API calls to a malicious server; malicious server returns crafted analysis results that are cached, stored, and reported as legitimate
- **Current Control**: Default `localhost:11434` only
- **Recommendation**: Validate URL protocol (`http:` or `https:` only), warn if remote + HTTP

#### Denial of Service
- **Risk**: :orange_circle: Medium (P2) - **SEC-M3-04**
- **Vector**: `ensureModelAvailable()` calls `client.pull()` without user confirmation
- **Impact**: `--model some-huge-model` silently downloads 20+ GB from Ollama registry; consumes disk and bandwidth
- **Current Control**: None - only a log message before pull
- **Recommendation**: Require `--auto-pull` flag or interactive confirmation before downloading new models

#### Tampering
- **Risk**: :green_circle: Low (P3)
- **Vector**: Model name from `--model` flag passed directly to Ollama API without validation
- **Impact**: Low - Ollama API treats it as a JSON field (no shell injection), but unexpected model names could trigger confusing Ollama errors
- **Recommendation**: Validate model name format (alphanumeric + `:` + `.` only)

---

### 4. Winner Manager (`src/analysis/winner-manager.js`)

#### Tampering
- **Risk**: :green_circle: Low (P3)
- **Vector**: `notes` field in winner entries stores user-supplied free text verbatim
- **Impact**: If winner files are shared/exported, they could contain unintended content
- **Current Control**: None (acceptable for local tool)
- **Status**: Low priority

#### Information Disclosure
- **Risk**: :green_circle: Low (P3)
- **Vector**: Winner entries contain full score profiles and analysis data
- **Impact**: Competition strategies revealed if `winners/winners.json` is shared
- **Current Control**: File stored locally
- **Recommendation**: Document that `winners/` directory contains sensitive analysis data

---

### 5. File Operations & Path Handling

#### Tampering (Path Traversal)
- **Risk**: :yellow_circle: **HIGH (P1)** - **SEC-M3-05**
- **Vector**: Multiple path traversal vectors identified:
  1. **Explicit photo filenames**: `--photos ../../etc/passwd` resolves via `join(photosDir, name)` without containment check. The file is read, base64-encoded, and sent to Ollama.
  2. **Glob patterns**: `globSync` runs with `cwd: photosDir` but returned paths joined without verifying they stay within the sandbox.
  3. **Project directory**: CLI accepts `projectDir` argument passed directly to `join()` calls throughout `analyze.js` without canonicalization.
  4. **`writeJson`/`ensureDir`**: Creates arbitrary directory trees via `mkdirSync({ recursive: true })` at any path the process can write to.
- **Impact**: Read arbitrary files on the filesystem (sent to Ollama as "photos"); write files outside project directory
- **Current Control**: None - `path.join()` does not prevent `..` traversal
- **Fix Required**:
  ```javascript
  function validatePathContainment(userPath, allowedBase) {
    const resolved = path.resolve(allowedBase, userPath);
    if (!resolved.startsWith(path.resolve(allowedBase) + path.sep) &&
        resolved !== path.resolve(allowedBase)) {
      throw new Error(`Path traversal detected: ${userPath}`);
    }
    return resolved;
  }
  ```
- **Apply to**: `resolveExplicitFiles()`, `resolveGlobPatterns()`, all `join(projectDir, ...)` in `analyze.js`

---

### 6. Photo Processing

#### Denial of Service (Memory)
- **Risk**: :orange_circle: Medium (P2) - **SEC-M3-06**
- **Vector**: `set-analyzer.js` loads all photos in a set simultaneously as base64
- **Impact**: 4 photos x 20MB each = 80MB raw + ~107MB base64 in memory at once. During `suggest-sets`, the same photo may be re-read and re-encoded for multiple set combinations.
- **Current Control**: None
- **Recommendation**: Cache base64 buffers across set evaluations; consider streaming

#### Denial of Service (CPU)
- **Risk**: :orange_circle: Medium (P2) - **SEC-M3-07**
- **Vector**: Multi-stage analysis fires `Promise.all` for all criterion evaluations simultaneously (up to 10 per photo)
- **Impact**: Combined with outer concurrency (6 photos), this creates up to 60 simultaneous Ollama API calls, overwhelming the local Ollama server
- **Current Control**: None - inner parallelism is unbounded
- **Recommendation**: Use `p-limit` or similar to cap concurrent criterion evaluations (e.g., max 3)

---

### 7. Combination Generator (`src/processing/combination-generator.js`)

#### Denial of Service (Memory)
- **Risk**: :yellow_circle: **HIGH (P1)** - **SEC-M3-08**
- **Vector**: `selectCandidateSets()` generates ALL `C(N,K)` combinations and stores them in memory
- **Impact**: With `preFilterTopN=30` and `setSize=6`, generates 593,775 combinations all held in `scoredSets[]` array. User can increase `preFilterTopN` via photos count.
- **Current Control**: `countCombinations()` displays the count but does not abort if too large
- **Fix Required**: Add a safety threshold (e.g., 10,000 combinations) with early abort:
  ```javascript
  const MAX_SAFE_COMBINATIONS = 10000;
  const total = countCombinations(topPhotos.length, setSize);
  if (total > MAX_SAFE_COMBINATIONS) {
    throw new Error(`Too many combinations (${total}). Reduce photo count or increase set size.`);
  }
  ```

---

## OWASP Top 10 Assessment (2021)

### A01: Broken Access Control
**Status**: N/A (no multi-user, no auth)
**M3 Phase 2 Change**: No change

### A02: Cryptographic Failures
**Status**: :orange_circle: Medium (P2) - Previously identified
**M3 Phase 2 Change**: `OLLAMA_HOST` still accepted without TLS validation (SEC-M3-03)

### A03: Injection
**Status**: :yellow_circle: **P1 - Path Traversal** (SEC-M3-05)
**M3 Phase 2 Change**: New photo selection features (glob, explicit filenames) introduce path traversal. No shell injection or SQL injection vectors.

### A04: Insecure Design
**Status**: Pass
**M3 Phase 2 Change**: Architecture remains local-first. Atomic writes correctly applied to all new storage modules.

### A05: Security Misconfiguration
**Status**: :green_circle: Low (P3)
**M3 Phase 2 Change**: No new misconfiguration risks

### A06: Vulnerable and Outdated Components
**Status**: Pass
**M3 Phase 2 Change**: No new dependencies added. Existing deps remain clean.

### A07: Identification and Authentication Failures
**Status**: N/A

### A08: Software and Data Integrity Failures
**Status**: :green_circle: Low (P3)
**M3 Phase 2 Change**: Cache integrity maintained via SHA-256 keying. Winner data integrity via atomic writes.

### A09: Security Logging and Monitoring
**Status**: :green_circle: Low (P3)
**M3 Phase 2 Change**: Performance dashboard adds observability but no security-specific logging

### A10: Server-Side Request Forgery
**Status**: :orange_circle: Medium (P2)
**M3 Phase 2 Change**: `ensureModelAvailable()` makes outbound HTTP calls to Ollama registry for model pulls. Model name is user-controlled (SEC-M3-04).

---

## Vulnerability Summary

| ID | Finding | Severity | Component | Category |
|----|---------|----------|-----------|----------|
| **SEC-M3-05** | Path traversal via photo filenames and glob patterns | :yellow_circle: **P1 High** | `file-utils.js`, `analyze.js` | Path Traversal |
| **SEC-M3-08** | Unbounded combination generation exhausts memory | :yellow_circle: **P1 High** | `combination-generator.js` | DoS |
| **SEC-M3-01** | Cache has no size limit or eviction | :orange_circle: P2 Medium | `cache-manager.js` | DoS |
| **SEC-M3-02** | Synchronous full-file read for photo hashing | :orange_circle: P2 Medium | `cache-manager.js` | DoS |
| **SEC-M3-03** | `OLLAMA_HOST` env var not URL-validated | :orange_circle: P2 Medium | `api-client.js` | SSRF-adjacent |
| **SEC-M3-04** | Silent large model download without confirmation | :orange_circle: P2 Medium | `model-manager.js` | DoS |
| **SEC-M3-06** | All set photos loaded simultaneously as base64 | :orange_circle: P2 Medium | `set-analyzer.js` | DoS |
| **SEC-M3-07** | Unbounded concurrent Ollama calls in multi-stage | :orange_circle: P2 Medium | `photo-analyzer.js` | DoS |
| SEC-M3-09 | `--timeout` not validated in `analyze-set`, `suggest-sets` | :green_circle: P3 Low | `analyze.js` | Input Validation |
| SEC-M3-10 | `--max-candidates` not bounds-checked | :green_circle: P3 Low | `analyze.js` | Input Validation |
| SEC-M3-11 | Model name not pattern-validated | :green_circle: P3 Low | `model-manager.js` | Input Validation |
| SEC-M3-12 | Absolute paths stored in output files | :green_circle: P3 Low | `batch-processor.js` | Info Disclosure |
| SEC-M3-13 | Output files written with default umask (0644) | :green_circle: P3 Low | All writers | Info Disclosure |
| SEC-M3-14 | `readJson` throws on malformed JSON without wrapping | :green_circle: P3 Low | `file-utils.js` | Error Handling |
| SEC-M3-15 | No upper bound on `--parallel` fixed value | :green_circle: P3 Low | `analyze.js` | Input Validation |
| SEC-M3-16 | Winner `notes` field stores unsanitized text | :green_circle: P3 Low | `winner-manager.js` | Data Integrity |
| SEC-M3-17 | `full_analysis` stores raw LLM output verbatim | Info | `photo-analyzer.js` | Info Disclosure |
| SEC-M3-18 | Checkpoint stores full analysis prompt | Info | `checkpoint-manager.js` | Info Disclosure |
| SEC-M3-19 | `package-lock.json` integrity not verified in audit | Info | `package.json` | Supply Chain |

---

## Positive Security Findings

These patterns demonstrate good security practice:

1. **Atomic writes everywhere**: Cache, winners, and checkpoints all use `write-to-temp-then-rename` pattern preventing data corruption
2. **SHA-256 cache keys**: 64-char hex hashes as filenames prevent any injection via cache key
3. **No shell execution**: No `child_process` usage with user input anywhere in the codebase
4. **Error gating**: Stack traces only shown in `NODE_ENV=development`
5. **Input bounds on critical params**: `--photo-timeout` clamped to 30-300s, `--sample` clamped to 1-50
6. **Local-first architecture**: No cloud dependencies, no network-exposed services, all data stays on user's machine
7. **AJV schema validation**: Configuration validated at input boundary
8. **Photo format whitelist**: Only JPEG, PNG, GIF, WebP, HEIC accepted
9. **`getPhotoFiles` safe**: Uses `readdirSync` (returns bare filenames) preventing path injection in directory listing

---

## Remediation Roadmap

### Sprint 1: P1 Fixes (Before next release)

#### SEC-M3-05: Path Traversal Protection
- **Effort**: 4 hours (implementation + tests)
- **Action**: Add `validatePathContainment()` to `file-utils.js`, apply to:
  - `resolveExplicitFiles()` - validate each filename stays within `photosDir`
  - `resolveGlobPatterns()` - validate each glob result stays within `photosDir`
  - All `join(projectDir, ...)` calls in `analyze.js`
- **Test**: Verify `../../etc/passwd` is rejected in both glob and explicit modes

#### SEC-M3-08: Combination Generation Safety Limit
- **Effort**: 1 hour
- **Action**: Add `MAX_SAFE_COMBINATIONS` threshold (10,000) to `selectCandidateSets()` with clear error message guiding user to reduce scope
- **Test**: Verify that `C(30,6)` triggers the safety abort

**Sprint 1 Total**: ~5 hours

---

### Sprint 2: P2 Fixes (Current sprint)

#### SEC-M3-01: Cache Eviction
- **Effort**: 3 hours
- **Action**: Add LRU eviction when cache exceeds 1000 entries; log warning at 500 entries
- **Test**: Verify oldest entries removed when limit exceeded

#### SEC-M3-02: Streaming Photo Hash
- **Effort**: 2 hours
- **Action**: Replace `readFileSync` with `createReadStream` piped through SHA-256 hash
- **Test**: Verify hash is identical for both methods; verify non-blocking behavior

#### SEC-M3-03: OLLAMA_HOST Validation
- **Effort**: 1 hour
- **Action**: Parse URL, validate protocol, warn for remote HTTP
- **Test**: Verify warning logged for `http://remote-host:11434`

#### SEC-M3-04: Model Pull Confirmation
- **Effort**: 2 hours
- **Action**: Add `--auto-pull` flag; without it, prompt user before downloading new models
- **Test**: Verify pull is blocked without flag or confirmation

#### SEC-M3-06: Set Photo Memory Optimization
- **Effort**: 3 hours
- **Action**: Cache base64 buffers in a Map during `suggest-sets` to avoid re-reading; clear after use
- **Test**: Verify same photo is only read once across multiple set evaluations

#### SEC-M3-07: Bounded Multi-Stage Concurrency
- **Effort**: 2 hours
- **Action**: Limit concurrent criterion evaluations to 3 using a simple semaphore
- **Test**: Verify no more than 3 simultaneous Ollama calls during Stage 2

**Sprint 2 Total**: ~13 hours

---

### Sprint 3: P3 Fixes (Backlog)

| Finding | Effort | Action |
|---------|--------|--------|
| SEC-M3-09 | 30 min | Add `--timeout` validation (30-600s) to `analyze-set`, `suggest-sets` |
| SEC-M3-10 | 30 min | Bounds-check `--max-candidates` (1-10000) |
| SEC-M3-11 | 30 min | Validate model name format with regex `/^[a-zA-Z0-9._:-]+$/` |
| SEC-M3-12 | 1 hour | Store relative paths in output files instead of absolute |
| SEC-M3-13 | 1 hour | Set `0600` mode on output files containing analysis data |
| SEC-M3-14 | 30 min | Wrap `readJson` in try-catch with descriptive error |
| SEC-M3-15 | 30 min | Clamp `--parallel` fixed value to max 16 |
| SEC-M3-16 | 30 min | Sanitize/truncate `notes` field (max 500 chars) |

**Sprint 3 Total**: ~5 hours

---

## Security Gate Decision

**Findings Summary**:
- 0 P0 (Critical)
- 1 P1 (High): Path traversal (SEC-M3-05), Combination DoS (SEC-M3-08)
- 7 P2 (Medium): Various DoS and validation issues

**Verdict**: **SECURITY PASS with P1 warnings.**

> **Security Guardian -- PASS with P1 warnings.**
> Proceed to `/bmad-impl`; fix P1 issues (SEC-M3-05 path traversal, SEC-M3-08 combination limit) in the current sprint before release. P2 issues should be addressed in parallel.

---

## Comparison with Previous Audit (2026-02-06)

| Area | Previous (M2) | Current (M3 Phase 2) | Change |
|------|---------------|----------------------|--------|
| Critical findings | 0 | 0 | Same |
| High findings | 0 | 1 (path traversal) | **Increased** |
| Medium findings | 2 | 7 | **Increased** |
| Low findings | 3 | 8 | Increased |
| Path traversal | Theoretical (noted for M3) | Active (new photo selection APIs) | **Escalated** |
| Ollama TLS | Noted | Still open (SEC-M3-03) | Unchanged |
| DoS vectors | Minimal | Multiple new vectors | **New surface** |
| Data integrity | Good | Excellent (atomic writes everywhere) | **Improved** |

**Key Observation**: M3 Phase 2 added significant new functionality (caching, parallel processing, model management, winner learning) which expanded the attack surface, primarily around resource exhaustion (DoS) and path handling. The core security architecture (local-first, no shell execution, no eval) remains strong.

---

## Appendix

### Audit Methodology
1. Domain detection: Software (Node.js + ESM)
2. Architecture review: `.claude/bmad-output/architecture.md` (M3 Phase 2)
3. Source code review: All new and modified files from FR-3.7 through FR-3.10
4. STRIDE threat modeling per component
5. OWASP Top 10 assessment
6. Comparison with previous audit (2026-02-06)
7. Risk-based prioritization (P0-P3)
8. Remediation roadmap with effort estimates

### Files Reviewed
- `src/cli/analyze.js` - CLI entry point
- `src/processing/cache-manager.js` - FR-3.7
- `src/processing/concurrency-manager.js` - FR-3.8
- `src/processing/batch-processor.js` - Modified for FR-3.7, FR-3.8
- `src/processing/combination-generator.js` - Set combination generation
- `src/utils/api-client.js` - Ollama client
- `src/utils/model-manager.js` - FR-3.9
- `src/utils/file-utils.js` - File operations
- `src/analysis/photo-analyzer.js` - Core analysis
- `src/analysis/set-analyzer.js` - Set analysis (FR-3.11)
- `src/analysis/winner-manager.js` - FR-3.10
- `src/analysis/score-aggregator.js` - Score aggregation
- `package.json` - Dependencies

### References
- STRIDE: Microsoft Security Development Lifecycle
- OWASP Top 10 2021: https://owasp.org/Top10/
- Previous audit: `.claude/bmad-output/security-audit.md` (2026-02-06)
- Architecture: `.claude/bmad-output/architecture.md`
- ADRs: `docs/architecture/ADR-017` through `ADR-020`

---

**Report Generated**: 2026-02-20
**Next Audit Recommended**: After M3 Phase 3 or Web UI implementation
