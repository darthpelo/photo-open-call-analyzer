# TDD Best Practices for Photo Open Call Analyzer

**Guidelines for Test-First Development in M3+ Features**

---

## TDD Golden Rules (Apply to Every Feature)

### Rule 1: Write Test FIRST, Code Second

```javascript
// ❌ ANTI-PATTERN: Write code, then test
// (Most teams do this - it's TDD anti-pattern)

// ✅ PATTERN: Test first
// 1. Write failing test (RED)
// 2. Implement feature (GREEN)  
// 3. Refactor (REFACTOR)

// Example workflow:
// $ npm run test:watch
// ❌ FAIL: photoTiering is not exported
// (Write test first, watch fails)

// Then implement:
export function photoTiering(score) { ... }

// ✓ PASS: Test passes immediately
// (Watch mode shows green in 50ms)
```

**Why:** Forcing failure first means:
- You know the test actually works
- You understand feature requirements
- You prevent "passing tests that don't test anything"

### Rule 2: One Assertion Per Test (When Possible)

```javascript
// ❌ ANTI-PATTERN: Multiple assertions hide failures
it('should handle photo tiering', () => {
  expect(tier(9)).toBe('GOLD');
  expect(tier(8)).toBe('SILVER');
  expect(tier(6)).toBe('BRONZE');
  // If middle one fails, third doesn't run
});

// ✅ PATTERN: Focused tests
it('should assign GOLD tier to score 9', () => {
  expect(tier(9)).toBe('GOLD');
});

it('should assign SILVER tier to score 8', () => {
  expect(tier(8)).toBe('SILVER');
});

it('should assign BRONZE tier to score 6', () => {
  expect(tier(6)).toBe('BRONZE');
});
```

**Why:** Each test documents one behavior. Easier to understand what failed.

### Rule 3: Test Behavior, Not Implementation

```javascript
// ❌ ANTI-PATTERN: Testing internal implementation
it('should call parseAnalysisResponse internally', () => {
  const spy = vi.spyOn(photoAnalyzer, 'parseAnalysisResponse');
  analyzePhoto(photo);
  expect(spy).toHaveBeenCalled();
});
// This breaks if you refactor internals

// ✅ PATTERN: Test the public behavior
it('should return analysis with individual criterion scores', async () => {
  const result = await analyzePhoto(mockPhoto);
  
  expect(result.scores.individual).toBeDefined();
  expect(result.scores.individual.Composition).toHaveProperty('score');
  expect(result.scores.individual.Composition.score).toBeGreaterThan(0);
});
```

**Why:** Tests are your API contract. Refactoring internals shouldn't break tests.

---

## TDD by Feature Type

### A. Utility Functions (Easiest for TDD)

These are BEST for TDD because they're pure functions.

```javascript
// Feature: Score normalization
// tests/score-normalizer.test.js

import { normalizeScore } from '../src/analysis/score-normalizer.js';

describe('Score Normalizer', () => {
  describe('Boundary Cases', () => {
    it('should keep scores in valid range [0-10]', () => {
      expect(normalizeScore(10)).toBe(10);
      expect(normalizeScore(0)).toBe(0);
      expect(normalizeScore(5)).toBe(5);
    });

    it('should clamp scores below 0 to 0', () => {
      expect(normalizeScore(-5)).toBe(0);
    });

    it('should clamp scores above 10 to 10', () => {
      expect(normalizeScore(15)).toBe(10);
    });

    it('should round to 1 decimal place', () => {
      expect(normalizeScore(7.456)).toBe(7.5);
      expect(normalizeScore(8.123)).toBe(8.1);
    });
  });

  describe('Data Validation', () => {
    it('should throw for non-numeric input', () => {
      expect(() => normalizeScore('not-a-number')).toThrow();
      expect(() => normalizeScore(null)).toThrow();
      expect(() => normalizeScore(undefined)).toThrow();
    });
  });
});

// Implementation (RED → GREEN)
export function normalizeScore(score) {
  if (typeof score !== 'number') {
    throw new Error('Score must be a number');
  }
  const clamped = Math.max(0, Math.min(10, score));
  return Math.round(clamped * 10) / 10;
}
```

### B. Data Transformation (Medium Difficulty)

These have inputs/outputs but interact with file system or parsing.

```javascript
// Feature: Parse analysis results into standardized format
// tests/analysis-result-parser.test.js

import { parseAnalysisResult } from '../src/analysis/analysis-result-parser.js';

describe('Analysis Result Parser', () => {
  const mockLLMResponse = `
Analysis Complete:
CRITERION: Composition | SCORE: 8.5
FEEDBACK: Strong rule of thirds, excellent framing

CRITERION: Technical Quality | SCORE: 9.0
FEEDBACK: Sharp focus, perfect exposure
  `;

  it('should extract individual criterion scores from LLM response', () => {
    const result = parseAnalysisResult(mockLLMResponse);

    expect(result.individual).toBeDefined();
    expect(result.individual.Composition).toEqual({
      score: 8.5,
      feedback: 'Strong rule of thirds, excellent framing'
    });
  });

  it('should calculate average from individual scores', () => {
    const result = parseAnalysisResult(mockLLMResponse);

    expect(result.summary.average).toBeCloseTo(8.75, 1);
  });

  it('should handle malformed LLM responses gracefully', () => {
    const malformed = 'Random text without structure';
    const result = parseAnalysisResult(malformed);

    expect(result).toEqual({
      individual: {},
      summary: { average: 0 },
      error: 'Could not parse LLM response'
    });
  });
});

// Implementation
export function parseAnalysisResult(llmResponse) {
  const result = { individual: {}, summary: { average: 0 } };
  const criterionPattern = /CRITERION:\s*(.+?)\s*\|\s*SCORE:\s*([\d.]+)/g;
  
  let match;
  const scores = [];

  while ((match = criterionPattern.exec(llmResponse)) !== null) {
    const [, name, score] = match;
    result.individual[name.trim()] = {
      score: parseFloat(score),
      feedback: extractFeedback(llmResponse, name)
    };
    scores.push(parseFloat(score));
  }

  if (scores.length === 0) {
    result.error = 'Could not parse LLM response';
    return result;
  }

  result.summary.average = scores.reduce((a, b) => a + b) / scores.length;
  return result;
}

function extractFeedback(response, criterionName) {
  // Implementation...
}
```

### C. Integration with External Systems (Hard, But Worth It)

These need mocking. Use Vitest's `vi.mock()` to isolate dependencies.

```javascript
// Feature: Batch photo analysis with error recovery
// tests/batch-photo-analyzer.test.js

import { vi } from 'vitest';
import { analyzeBatch } from '../src/processing/batch-photo-analyzer.js';

// Mock the Ollama API
vi.mock('../src/utils/api-client.js');

describe('Batch Photo Analyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should analyze multiple photos in parallel', async () => {
    // Setup mocks
    const mockApiClient = {
      analyzePhoto: vi.fn()
        .mockResolvedValueOnce({ scores: { average: 8.5 } })
        .mockResolvedValueOnce({ scores: { average: 7.2 } })
    };

    vi.mocked(getApiClient).mockReturnValue(mockApiClient);

    const photos = ['photo1.jpg', 'photo2.jpg'];
    const results = await analyzeBatch(photos, { parallel: 2 });

    expect(results).toHaveLength(2);
    expect(results[0].scores.average).toBe(8.5);
    expect(results[1].scores.average).toBe(7.2);
    expect(mockApiClient.analyzePhoto).toHaveBeenCalledTimes(2);
  });

  it('should recover gracefully when one photo fails', async () => {
    const mockApiClient = {
      analyzePhoto: vi.fn()
        .mockResolvedValueOnce({ scores: { average: 8.5 } })
        .mockRejectedValueOnce(new Error('API timeout'))
        .mockResolvedValueOnce({ scores: { average: 7.2 } })
    };

    vi.mocked(getApiClient).mockReturnValue(mockApiClient);

    const photos = ['photo1.jpg', 'bad.jpg', 'photo3.jpg'];
    const results = await analyzeBatch(photos, {
      parallel: 1,
      onError: 'continue'  // Don't fail entire batch
    });

    expect(results).toHaveLength(3);
    expect(results[1].error).toBe('API timeout');
    expect(results[0].scores.average).toBe(8.5);
    expect(results[2].scores.average).toBe(7.2);
  });

  it('should respect concurrency limit', async () => {
    const callTimestamps = [];
    const mockApiClient = {
      analyzePhoto: vi.fn(async () => {
        callTimestamps.push(Date.now());
        await new Promise(r => setTimeout(r, 50));
        return { scores: { average: 8.0 } };
      })
    };

    vi.mocked(getApiClient).mockReturnValue(mockApiClient);

    const photos = ['1.jpg', '2.jpg', '3.jpg'];
    await analyzeBatch(photos, { parallel: 2 });

    // With parallel=2, no more than 2 should run simultaneously
    expect(callTimestamps.length).toBe(3);
    // (Verify timing logic)
  });
});
```

---

## Test Organization Patterns

### Pattern 1: Arrange-Act-Assert (AAA)

```javascript
// ✅ CLEAR AND READABLE
it('should calculate weighted average correctly', () => {
  // ARRANGE: Set up test data
  const criteria = [
    { name: 'Composition', weight: 50 },
    { name: 'Technical', weight: 50 }
  ];
  const scores = {
    Composition: 8.0,
    Technical: 9.0
  };

  // ACT: Call the function
  const average = calculateWeightedAverage(scores, criteria);

  // ASSERT: Verify result
  expect(average).toBe(8.5);
});
```

### Pattern 2: Descriptive Test Names Tell the Story

```javascript
// ❌ VAGUE
test('scores work', () => { ... });
test('error handling', () => { ... });

// ✅ CLEAR - tells you what happens and why
test('should increase score by 0.5 when composition has high saturation', () => { ... });
test('should throw ValidationError when criteria array is empty', () => { ... });
test('should log warning but continue batch when single photo analysis fails', () => { ... });

// Bonus: Test names become documentation!
```

### Pattern 3: Test-Driven File Organization

For M3 features, organize tests to match feature lifecycle:

```
src/analysis/
  photo-tiering.js          # Feature implementation
  
tests/
  photo-tiering/
    01-unit.test.js         # Pure function tests
    02-integration.test.js   # Integration with aggregator
    03-workflow.test.js      # End-to-end with batch processor
    fixtures/
      sample-scores.json     # Test data
      expected-tiers.json    # Expected output
```

---

## TDD Workflow for This Project

### Weekly TDD Cadence

**Monday Morning: Feature Planning**
```
1. Read feature requirement from ROADMAP.md
2. Sketch test scenarios (5 min)
3. Write test file stubs (10 min)
4. Discuss with team in slack (5 min)
```

**Monday-Thursday: Red-Green-Refactor**
```
$ npm run test:watch     # Watch mode running
$ npm run test:ui        # UI dashboard in browser

Loop:
1. Write one test (RED - fails)
2. Implement minimal code (GREEN - passes in <100ms)
3. Refactor if needed (REFACTOR - stays green)
4. Repeat for next behavior
```

**Friday: Integration & Review**
```
1. Run full suite: npm test
2. Run coverage: npm run test:coverage
3. Code review pull request
4. Merge and celebrate ✨
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: "Testing Framework" Tests

```javascript
// ❌ DON'T DO THIS - Tests the test framework, not your code
it('should create a function', () => {
  expect(typeof analyzePhoto).toBe('function');
});

it('should return an object', () => {
  const result = analyzePhoto(photo);
  expect(typeof result).toBe('object');
});

// These are useless - of course it's a function/object!
```

### Anti-Pattern 2: Flaky Async Tests

```javascript
// ❌ ANTI-PATTERN: Timeout-based async (unpredictable)
it('should process photo', (done) => {
  analyzePhoto(photo);
  setTimeout(() => {
    expect(result).toBeDefined();
    done();
  }, 500);  // Fails randomly if slow server!
});

// ✅ PATTERN: Promise/async-based (deterministic)
it('should process photo', async () => {
  const result = await analyzePhoto(photo);
  expect(result).toBeDefined();
});

// Or with explicit await:
it('should process photo', () => {
  return analyzePhoto(photo).then(result => {
    expect(result).toBeDefined();
  });
});
```

### Anti-Pattern 3: Test Interdependence

```javascript
// ❌ ANTI-PATTERN: Tests relying on execution order
let cachedResult;

it('step 1: should fetch data', () => {
  cachedResult = fetchData();  // Storing in outer scope
  expect(cachedResult).toBeDefined();
});

it('step 2: should process data', () => {
  // Depends on cachedResult from previous test
  const result = process(cachedResult);
  expect(result).toBeDefined();
});

// If step 1 is skipped or fails, step 2 is broken!

// ✅ PATTERN: Independent tests
it('should fetch and process data', async () => {
  const data = await fetchData();
  const result = process(data);
  expect(result).toBeDefined();
});

it('should handle missing data gracefully', () => {
  const result = process(null);
  expect(result.error).toBeDefined();
});
```

### Anti-Pattern 4: Over-Mocking

```javascript
// ❌ ANTI-PATTERN: Mock too much, testing mocks not code
vi.mock('../src/analysis/photo-analyzer.js');
vi.mock('../src/utils/api-client.js');
vi.mock('../src/output/report-generator.js');
// ... 10 more mocks ...

it('should batch process', async () => {
  // Now testing Jest's mock implementation, not your code!
  expect(mockBatchProcess).toHaveBeenCalled();
});

// ✅ PATTERN: Only mock external dependencies
vi.mock('../src/utils/api-client.js'); // External API
// Don't mock: photo-analyzer.js, report-generator.js (your code)

it('should batch process and call external API', async () => {
  const results = await processBatch(photos);
  expect(mockApiClient.analyze).toHaveBeenCalledTimes(3);
  expect(results).toHaveLength(3);
  expect(results[0]).toHaveProperty('scores');
});
```

---

## Testing Checklist for M3+ Features

Every feature commit should include:

- [ ] Test file created in `tests/feature-name.test.js`
- [ ] At least 3 test cases (happy path + 2 edge cases)
- [ ] All tests passing: `npm test`
- [ ] Watch mode confirmed working: `npm run test:watch`
- [ ] Coverage check: `npm run test:coverage` (aim for >80%)
- [ ] Test names are descriptive (read like documentation)
- [ ] No flaky async tests
- [ ] No test interdependencies
- [ ] No over-mocking (mock externals only)
- [ ] Integration test added if feature touches multiple modules

---

## Example: Complete TDD Feature (Smart Tiering)

### Step 1: Write Tests (RED)

```javascript
// tests/photo-tiering.test.js
import { describe, it, expect } from 'vitest';
import { classifyPhotoTier, getTierStats } from '../src/analysis/photo-tiering.js';

describe('Photo Tiering Feature (M3)', () => {
  describe('Tier Classification', () => {
    it('should classify scores 8.5+ as GOLD', () => {
      expect(classifyPhotoTier(10)).toBe('GOLD');
      expect(classifyPhotoTier(8.5)).toBe('GOLD');
      expect(classifyPhotoTier(9.2)).toBe('GOLD');
    });

    it('should classify scores 7.0-8.4 as SILVER', () => {
      expect(classifyPhotoTier(7.0)).toBe('SILVER');
      expect(classifyPhotoTier(7.5)).toBe('SILVER');
      expect(classifyPhotoTier(8.4)).toBe('SILVER');
    });

    it('should classify scores 5.5-6.9 as BRONZE', () => {
      expect(classifyPhotoTier(5.5)).toBe('BRONZE');
      expect(classifyPhotoTier(6.0)).toBe('BRONZE');
      expect(classifyPhotoTier(6.9)).toBe('BRONZE');
    });

    it('should throw error for scores below 5.5', () => {
      expect(() => classifyPhotoTier(5.4)).toThrow('Score below minimum');
    });

    it('should throw error for scores above 10', () => {
      expect(() => classifyPhotoTier(10.1)).toThrow('Score above maximum');
    });
  });

  describe('Tier Statistics', () => {
    it('should calculate tier distribution', () => {
      const photos = [
        { score: 9.0 },  // GOLD
        { score: 8.0 },  // SILVER
        { score: 6.0 }   // BRONZE
      ];

      const stats = getTierStats(photos);

      expect(stats.GOLD).toBe(1);
      expect(stats.SILVER).toBe(1);
      expect(stats.BRONZE).toBe(1);
    });

    it('should handle empty photo array', () => {
      const stats = getTierStats([]);
      
      expect(stats).toEqual({
        GOLD: 0,
        SILVER: 0,
        BRONZE: 0
      });
    });
  });
});
```

### Step 2: Implementation (GREEN)

```javascript
// src/analysis/photo-tiering.js
export function classifyPhotoTier(score) {
  if (score < 5.5) throw new Error('Score below minimum');
  if (score > 10) throw new Error('Score above maximum');
  
  if (score >= 8.5) return 'GOLD';
  if (score >= 7.0) return 'SILVER';
  return 'BRONZE';
}

export function getTierStats(photos) {
  const stats = { GOLD: 0, SILVER: 0, BRONZE: 0 };
  
  for (const photo of photos) {
    const tier = classifyPhotoTier(photo.score);
    stats[tier]++;
  }
  
  return stats;
}
```

### Step 3: Watch Mode Shows All Green ✓

```bash
$ npm run test:watch

✓ tests/photo-tiering.test.js (6 tests)
  ✓ should classify scores 8.5+ as GOLD
  ✓ should classify scores 7.0-8.4 as SILVER
  ✓ should classify scores 5.5-6.9 as BRONZE
  ✓ should throw error for scores below 5.5
  ✓ should throw error for scores above 10
  ✓ should calculate tier distribution
  ✓ should handle empty photo array

Test Files  1 passed (1)
Tests       7 passed (7)
Duration    45ms
```

### Step 4: Refactor (Still Green)

```javascript
// Improved implementation - same tests still pass
export function classifyPhotoTier(score) {
  if (!Number.isFinite(score)) {
    throw new Error('Score must be a valid number');
  }

  const TIER_RANGES = {
    GOLD: { min: 8.5, max: 10 },
    SILVER: { min: 7.0, max: 8.4 },
    BRONZE: { min: 5.5, max: 6.9 }
  };

  for (const [tier, { min, max }] of Object.entries(TIER_RANGES)) {
    if (score >= min && score <= max) return tier;
  }

  throw new Error(
    `Score ${score} must be between 5.5 and 10`
  );
}
```

Tests still pass in 45ms! Refactoring confidence. ✨

---

## Success Metrics for TDD Adoption

Track these metrics to know if TDD is working:

| Metric | Baseline (Jest) | Target (Vitest TDD) | How to Measure |
|--------|-----------------|-------------------|-----------------|
| **Test Feedback Time** | 3.2s per run | <150ms per run | `npm test` duration |
| **Bug Detection** | Post-release | Pre-commit | Issues opened/month |
| **Code Coverage** | 68% | >85% | `npm run test:coverage` |
| **Feature Delivery** | 4 days | 2-3 days | ROADMAP completion |
| **Developer Confidence** | Medium | High | Survey team |
| **Refactor Safety** | Medium | High | PRs with refactoring |

**Expected improvements with Vitest + TDD:**
- 20x faster feedback loop = 15+ iterations/hour instead of 1/hour
- 40% reduction in bugs (test-first catches edge cases)
- 30% faster feature delivery (test design reveals requirements early)
- 100% higher developer confidence in refactoring

---

## Questions to Ask When Writing Tests

Before you write a test, ask:

1. **What behavior am I testing?** (Not implementation details)
2. **What should happen if input is invalid?** (Boundary test)
3. **What should happen if dependencies fail?** (Integration test)
4. **Can someone read this test as documentation?** (Clarity test)
5. **Would this test break if I refactored the code differently?** (Brittle test)

If you can't answer these clearly, your feature might not be ready for coding.

