# M3+ Test-First Development Guide

## Quick Start: TDD Workflow with Vitest

### 1. Watch Mode (Development Workflow)

```bash
npm run test:watch
```

This enters Vitest watch mode:
- **Waits** for file changes
- **Re-runs** only affected tests (smart dependency tracking)
- **Shows** failures in real-time (50-100ms feedback)
- **Press 'q'** to exit, **'a'** to run all, **'p'** to filter by filename

### 2. Test-First Development Pattern

**Step 1: Write a test (RED)**
```javascript
describe('Feature: New Photo Processor', () => {
  test('should process valid photo and extract metadata', async () => {
    const photo = await validateAndProcessPhoto('./test.jpg');
    
    expect(photo).toBeDefined();
    expect(photo.metadata.width).toBeDefined();
    expect(photo.metadata.height).toBeDefined();
    expect(photo.isValid).toBe(true);
  });
});
```

**Step 2: Watch mode shows failure** (RED phase)
- Test runs automatically
- Shows: "Cannot find validateAndProcessPhoto"
- Developer experience: Clear error message

**Step 3: Write minimal code to pass** (GREEN)
```javascript
export async function validateAndProcessPhoto(photoPath) {
  return {
    metadata: { width: 800, height: 600 },
    isValid: true
  };
}
```

**Step 4: Watch mode shows passing** (GREEN phase)
- Test runs automatically
- Shows: "✓ should process valid photo..."
- Feedback instantly (50-100ms)

**Step 5: Refactor with confidence** (REFACTOR)
- Tests still pass
- Add more validations
- Improve error handling
- Tests guide the design

---

## Vitest Features for M3+

### Coverage Reports
```bash
npm run test:coverage
# Generates:
# - coverage/index.html (visual report)
# - coverage/lcov.info (CI integration)
# - Terminal output with percentages
```

### Test UI Dashboard
```bash
npm run test:ui
# Opens browser dashboard at http://localhost:51204
# Visual test explorer
# Real-time execution status
# Coverage visualization
```

### Debug Tests
```bash
node --inspect-brk node_modules/vitest/bin/vitest.mjs run
# Opens Chrome DevTools for debugging
```

---

## TDD Best Practices for This Project

### 1. Test Structure Template

```javascript
// tests/features/new-feature.test.js
import { describe, test, expect, beforeEach } from 'vitest';
import { newFeatureFunction } from '../../src/features/new-feature.js';

describe('Feature: New Feature Name', () => {
  let testData;

  beforeEach(() => {
    // Setup for each test
    testData = {
      input: 'test-value',
      expected: 'expected-output'
    };
  });

  describe('Happy Path', () => {
    test('should do the main thing correctly', () => {
      const result = newFeatureFunction(testData.input);
      expect(result).toBe(testData.expected);
    });

    test('should handle edge case X', () => {
      const result = newFeatureFunction(edgeCaseX);
      expect(result).toHaveProperty('required_property');
    });
  });

  describe('Error Handling', () => {
    test('should throw on invalid input', () => {
      expect(() => newFeatureFunction(null)).toThrow();
    });

    test('should return error object on failure', async () => {
      const result = await newFeatureFunction(invalidInput);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Integration', () => {
    test('should work with other modules', async () => {
      const result = await newFeatureFunction(input);
      const next = await anotherModule(result);
      expect(next).toBeDefined();
    });
  });
});
```

### 2. Arrange-Act-Assert Pattern

```javascript
test('should calculate score correctly', () => {
  // ARRANGE: Setup test data
  const photos = [
    { title: 'photo1.jpg', scores: { composition: 8, lighting: 7 } },
    { title: 'photo2.jpg', scores: { composition: 9, lighting: 8 } }
  ];
  const criteria = { composition: 0.5, lighting: 0.5 };

  // ACT: Execute the function
  const result = aggregateScores(photos, criteria);

  // ASSERT: Verify results
  expect(result.ranking).toHaveLength(2);
  expect(result.ranking[0].title).toBe('photo2.jpg');
  expect(result.ranking[0].score).toBeCloseTo(8.5, 1);
});
```

### 3. Test Naming Convention

```javascript
// ✅ GOOD: Describes behavior, not implementation
test('should return ranking sorted by score descending', () => {});
test('should skip invalid photos with error logged', () => {});
test('should timeout analysis after configured seconds', () => {});

// ❌ BAD: Too specific, coupled to implementation
test('aggregateScores function works', () => {});
test('test sorting', () => {});
test('test error', () => {});
```

### 4. Async Test Pattern

```javascript
test('should analyze photo and return scores', async () => {
  // Test is marked async
  const result = await analyzePhoto(photoPath, prompt);

  expect(result.success).toBe(true);
  expect(result.data.scores).toBeDefined();
});

// With timeout for long operations
test('should handle large files', async () => {
  // Vitest timeout: 10 seconds (configurable in vitest.config.js)
  const result = await processLargeFile(largePhotoPath);
  expect(result).toBeDefined();
}, { timeout: 30000 }); // Override to 30s for this test
```

### 5. Mocking Pattern (When Needed)

```javascript
import { vi } from 'vitest';
import { analyzePhoto } from '../../src/analysis/photo-analyzer.js';

test('should handle Ollama timeout', async () => {
  // Mock the Ollama client
  const mockOllama = {
    generate: vi.fn().mockRejectedValue(new Error('Timeout'))
  };

  const result = await analyzePhoto(photoPath, prompt, { ollama: mockOllama });

  expect(result.success).toBe(false);
  expect(result.timedOut).toBe(true);
  expect(mockOllama.generate).toHaveBeenCalled();
});
```

---

## Module-by-Module TDD Checklist

### For New Modules (M3+)

- [ ] **Tests Written First**
  - [ ] Happy path test
  - [ ] Error handling tests
  - [ ] Edge case tests
  - [ ] Integration tests

- [ ] **Code Implementation**
  - [ ] All tests passing
  - [ ] No console.errors
  - [ ] Error messages actionable

- [ ] **Refactoring**
  - [ ] Code review ready
  - [ ] No duplicate logic
  - [ ] Clear variable names
  - [ ] Tests still pass

- [ ] **Documentation**
  - [ ] README updated
  - [ ] Examples in code
  - [ ] Error scenarios documented

---

## Running Tests in Different Modes

### Development (Watch)
```bash
npm run test:watch
# Fastest feedback loop
# Runs affected tests on file change
# Best for active development
```

### CI/Pipeline (Run Once)
```bash
npm test
# Runs all tests once
# Generates coverage report
# Suitable for CI/CD pipelines
```

### Coverage Check
```bash
npm run test:coverage
# Generates HTML coverage report
# Shows uncovered lines
# Identifies gaps in testing
```

### Visual Dashboard
```bash
npm run test:ui
# Browser-based test explorer
# Great for demos
# Shows test structure visually
```

### Specific File
```bash
npm test -- tests/features/new-feature.test.js
# Run only this file
# Faster iteration on specific feature
```

### Specific Test
```bash
npm test -- -t "should calculate score correctly"
# Run test matching pattern
# Fastest for single test iteration
```

---

## Performance Tips

### Keep Watch Mode Running
Don't stop/start watch mode between tests. Let Vitest track changes and re-run automatically.

### Organize Tests Logically
```
tests/
  └── features/
      ├── photo-validator.test.js
      ├── error-classifier.test.js
      └── batch-processor.test.js
```

Vitest tracks dependencies and only re-runs affected tests.

### Use beforeEach for Setup
```javascript
beforeEach(() => {
  // Runs before EACH test
  // Ensures clean state
  // Very fast (cached)
});

// NOT this:
test('test 1', () => {
  const data = setup();
  // ... duplication in every test
});
```

---

## Troubleshooting

### Tests Not Re-running in Watch Mode?
- **Solution**: Check file is saved (not unsaved in editor)
- **Debug**: Look at terminal - should show "changed" notification

### Import Errors?
- **Solution**: Check file path is correct
- **Debug**: Run `npm test -- --reporter=verbose` for detailed errors

### Async Tests Timing Out?
- **Solution**: Increase timeout or check for hanging promises
- **Debug**: Add `console.log()` to verify execution flow

### Want to Use Jest Again?
```bash
npm run test:jest-compat
# Falls back to Jest for comparison
# But TDD is better with Vitest!
```

---

## Summary

**TDD Workflow with Vitest:**
1. Write test first (RED)
2. Watch mode shows failure instantly (50-100ms)
3. Write minimal code to pass (GREEN)
4. Watch mode shows success instantly
5. Refactor with confidence
6. Commit test + implementation together

**Speed Advantage:**
- Traditional: Write code → Run tests manually → Wait 800ms → See error → Repeat
- **TDD with Vitest**: Write test → Automatic rerun (50-100ms) → See error → Fix → Automatic pass → Done

**The Result**: Developers naturally write better tests because feedback is instant and satisfying.

---

*This guide applies to all M3+ features. When creating new modules, start with tests first.*

