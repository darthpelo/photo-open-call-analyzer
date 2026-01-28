# TDD Quick Reference Card

**Print this for your desk or pin in Slack!**

---

## Installation & Setup (One-time, 5 min)

```bash
# 1. Remove Jest
npm uninstall jest @jest/globals

# 2. Install Vitest
npm install -D vitest @vitest/ui

# 3. Create vitest.config.js (in project root)
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node'
  }
});

# 4. Update package.json scripts
"test": "vitest run"
"test:watch": "vitest --watch"
"test:ui": "vitest --ui"

# 5. Run tests
npm test  # Should see all 63 tests pass
```

---

## TDD Workflow (During Development)

```bash
# Terminal 1: Start watch mode
npm run test:watch

# Terminal 2 (optional): Browser UI
npm run test:ui
# Opens http://localhost:51204/__vitest__/
```

### RED Phase (Write Test First)
```javascript
// tests/new-feature.test.js
import { describe, it, expect } from 'vitest';

describe('New Feature', () => {
  it('should do something', () => {
    expect(someFunction()).toBe(expected);
  });
});
```

**Watch mode shows:** ❌ someFunction is not defined

### GREEN Phase (Write Minimal Code)
```javascript
// src/new-feature.js
export function someFunction() {
  return expected;
}
```

**Watch mode shows:** ✓ Test passes in 50ms

### REFACTOR Phase (Improve Code)
```javascript
// Improve implementation while tests stay green
export function someFunction() {
  return calculateExpected();  // Better implementation
}
```

**Watch mode shows:** ✓ Still passing in 50ms

---

## Common Vitest Commands

| Command | What It Does |
|---------|------------|
| `npm test` | Run all tests once |
| `npm run test:watch` | Watch mode (re-run on changes) |
| `npm run test:ui` | Open browser dashboard |
| `npm run test:coverage` | Generate coverage report |
| `npm test -- --changed` | Test only changed files |
| `npm test -- photo-tiering` | Test only files matching "photo-tiering" |
| `npm test -- --reporter=verbose` | Detailed output |

---

## Test Structure (AAA Pattern)

```javascript
it('should do something', () => {
  // ARRANGE: Set up test data
  const input = { score: 8.5 };
  const expected = 'GOLD';

  // ACT: Call the function
  const result = classifyTier(input.score);

  // ASSERT: Verify result
  expect(result).toBe(expected);
});
```

---

## Common Assertions

```javascript
// Equality
expect(result).toBe(8.5);           // Exact match
expect(result).toEqual(obj);        // Deep equality
expect(result).toStrictEqual(obj);  // Strict (no type coercion)

// Truthiness
expect(result).toBeTruthy();
expect(result).toBeFalsy();
expect(result).toBeDefined();
expect(result).toBeNull();

// Numbers
expect(result).toBeGreaterThan(8);
expect(result).toBeLessThan(10);
expect(result).toBeCloseTo(8.5, 1);  // Within 1 decimal

// Arrays
expect(arr).toHaveLength(3);
expect(arr).toContain('item');
expect(arr[0]).toEqual(expected);

// Errors
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('Error message');

// Mocks
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
expect(mockFn).toHaveBeenCalledTimes(2);
```

---

## Setup & Teardown

```javascript
describe('Feature', () => {
  // Run BEFORE all tests
  beforeAll(() => {
    // Connect to test DB, etc
  });

  // Run BEFORE each test
  beforeEach(() => {
    // Reset state
    vi.clearAllMocks();
  });

  // Run AFTER each test
  afterEach(() => {
    // Cleanup
  });

  // Run AFTER all tests
  afterAll(() => {
    // Close connections
  });
});
```

---

## Mocking (When You Need To)

```javascript
import { vi } from 'vitest';

// Mock a module
vi.mock('../src/utils/api-client.js');

// Mock a function
const mockFn = vi.fn();
const mockFnWithReturn = vi.fn(() => 'mocked value');
const mockFnAsync = vi.fn().mockResolvedValue({ data: 'test' });

// Spy on a function
const spy = vi.spyOn(obj, 'method');
expect(spy).toHaveBeenCalled();

// Restore original
vi.restoreAllMocks();  // In afterEach
```

---

## Async Tests

```javascript
// Option 1: async/await (RECOMMENDED)
it('should fetch data', async () => {
  const result = await fetchData();
  expect(result).toBeDefined();
});

// Option 2: Return Promise
it('should fetch data', () => {
  return fetchData().then(result => {
    expect(result).toBeDefined();
  });
});

// DON'T DO THIS (unreliable):
it('should fetch data', (done) => {
  setTimeout(() => {
    expect(result).toBeDefined();
    done();
  }, 500);
});
```

---

## Test Organization

```
tests/
  photo-tiering/
    unit.test.js          # Pure functions
    integration.test.js   # With other modules
    workflow.test.js      # End-to-end
    fixtures/
      sample-data.json    # Test data
```

---

## Anti-Patterns (Don't Do This)

```javascript
// ❌ Multiple assertions (hides failures)
it('should do everything', () => {
  expect(a()).toBe(1);
  expect(b()).toBe(2);
  expect(c()).toBe(3);
});

// ✅ One behavior per test
it('should do a', () => { expect(a()).toBe(1); });
it('should do b', () => { expect(b()).toBe(2); });
it('should do c', () => { expect(c()).toBe(3); });

// ❌ Test interdependence
let state;
it('step 1', () => { state = setup(); });
it('step 2', () => { process(state); });

// ✅ Each test independent
it('should process setup result', () => {
  const state = setup();
  process(state);
  expect(...).toBe(...);
});

// ❌ Testing implementation
it('should call parseResponse internally', () => {
  vi.spyOn(obj, 'parseResponse');
  analyze(photo);
  expect(obj.parseResponse).toHaveBeenCalled();
});

// ✅ Testing behavior
it('should return parsed scores', async () => {
  const result = await analyze(photo);
  expect(result.scores).toBeDefined();
});
```

---

## Watch Mode Tips

**Auto-rerun when:**
- You modify a test file
- You modify source code
- Dependencies change

**To focus on one test:**
```javascript
// Add .only to run just this test
it.only('should focus on this test', () => {
  expect(...).toBe(...);
});

// In watch mode, only this test runs
// Remove .only before committing!
```

**To skip a test temporarily:**
```javascript
it.skip('should skip this test', () => {
  expect(...).toBe(...);
});
```

---

## Watch Mode Dashboard

When you run `npm run test:watch`:
```
✓ tests/photo-tiering.test.js (7)
  ✓ should classify GOLD
  ✓ should classify SILVER
  ✓ should classify BRONZE

Test Files  1 passed (1)
Tests       7 passed (7)
Duration    45ms

PRESS SPACE to toggle watch / filter / exit
```

**Press spacebar to:**
- Rerun tests
- Filter tests by name
- Exit watch mode

---

## Browser UI

```bash
npm run test:ui
```

Opens beautiful dashboard at `http://localhost:51204/__vitest__/`

Shows:
- Test results in real-time
- Execution time per test
- Pass/fail indicators
- Code location
- Filter and search

**Perfect for pair programming!**

---

## Debugging

**In watch mode, having trouble?**

```javascript
// Add console.log
it('should debug', () => {
  const result = someFunction();
  console.log('Result:', result);  // Shows in terminal
  expect(result).toBe(expected);
});

// Or use debugger
it('should debug with inspector', () => {
  debugger;  // Sets breakpoint
  const result = someFunction();
  expect(result).toBe(expected);
});

// Then run with inspector:
node --inspect-brk node_modules/vitest/bin/vitest.mjs
```

---

## Pre-Commit Hook (Optional)

```bash
# Install
npm install -D husky lint-staged

# Initialize
npx husky install

# Add hook
npx husky add .husky/pre-commit "npm run test:changed"

# Now tests run before commit (tests for changed files only)
```

---

## First M3 Feature: Smart Tiering

```bash
# 1. Create test file
cat > tests/photo-tiering.test.js << 'EOF'
import { describe, it, expect } from 'vitest';
import { classifyPhotoTier } from '../src/analysis/photo-tiering.js';

describe('Photo Tiering', () => {
  it('should assign GOLD to scores 8.5+', () => {
    expect(classifyPhotoTier(9.0)).toBe('GOLD');
    expect(classifyPhotoTier(8.5)).toBe('GOLD');
  });

  it('should assign SILVER to scores 7.0-8.4', () => {
    expect(classifyPhotoTier(7.5)).toBe('SILVER');
  });

  it('should assign BRONZE to scores 5.5-6.9', () => {
    expect(classifyPhotoTier(6.0)).toBe('BRONZE');
  });
});
EOF

# 2. Start watch mode
npm run test:watch

# 3. Watch fails (RED phase) - now implement!
# 4. Create src/analysis/photo-tiering.js
# 5. Watch turns green (GREEN phase)
# 6. Refactor with confidence
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Tests don't run | Check vitest.config.js has `globals: true` |
| Slow watch mode | Make sure `environment: 'node'` is set |
| Import errors | Verify `type: "module"` in package.json |
| Mock not working | Check `vi.mock()` path is correct |
| Async test times out | Use async/await, not setTimeout |
| Coverage missing | Run `npm run test:coverage` |

---

## Remember

- ✅ Write test FIRST (RED)
- ✅ Implement minimal code (GREEN)
- ✅ Refactor while tests stay green (REFACTOR)
- ✅ Test behavior, not implementation
- ✅ One assertion per test (when possible)
- ✅ Enjoy 50ms feedback loops! 🚀

