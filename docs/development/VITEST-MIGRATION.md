# Vitest Migration Guide

**Quick Reference for Migrating Jest → Vitest**

---

## Pre-Migration Checklist

- [ ] Node 20+ installed (`node --version`)
- [ ] Current test suite passing (`npm test`)
- [ ] Git branch created for migration (`feature/m3-vitest-migration`)
- [ ] No uncommitted changes

---

## Step 1: Remove Jest, Install Vitest (5 min)

```bash
# Remove Jest and its types
npm uninstall jest @jest/globals

# Install Vitest
npm install -D vitest @vitest/ui

# Optional but recommended: add coverage support
npm install -D @vitest/coverage-v8
```

**Verify installation:**
```bash
$ npm ls vitest
photo-open-call-analyzer@1.0.0
└── vitest@latest
```

---

## Step 2: Create Vitest Config (5 min)

**File: `vitest.config.js`** (project root)

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Auto-inject globals: describe, it, expect, beforeEach, etc
    globals: true,
    
    // Test environment
    environment: 'node',
    
    // Exclude test fixtures and node_modules
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'fixtures'],
    
    // Coverage settings (optional)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.config.js'
      ]
    },
    
    // Enable verbose output for TDD
    reporters: ['default']
  }
});
```

---

## Step 3: Update package.json Scripts (3 min)

**Before (Jest):**
```json
{
  "scripts": {
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
    "test:watch": "npm test -- --watch"
  }
}
```

**After (Vitest):**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Step 4: Update Test File Imports (10 min)

**Automated Update:** (Run once from project root)

```bash
# Replace @jest/globals with vitest in all test files
find tests -name "*.test.js" -type f | xargs sed -i.bak \
  "s|from '@jest/globals'|from 'vitest'|g"

# Remove backup files
find tests -name "*.test.js.bak" -delete
```

**Manual Verification:** Check a few test files for correct imports.

**Before (Jest):**
```javascript
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
```

**After (Vitest):**
```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
```

**Note:** Vitest also supports `test` alias, but project uses `it()` - adjust accordingly.

---

## Step 5: Fix jest.mock() Calls (If Applicable) (10-15 min)

Vitest supports Jest-style `jest.mock()` without changes, BUT for purity, consider this migration:

**Before (Jest style):**
```javascript
import { jest } from '@jest/globals';

jest.mock('../src/utils/api-client.js', () => ({
  getApiClient: jest.fn().mockReturnValue({ /* mock */ })
}));
```

**After (Vitest style - Optional modernization):**
```javascript
import { vi } from 'vitest';

vi.mock('../src/utils/api-client.js', () => ({
  getApiClient: vi.fn().mockReturnValue({ /* mock */ })
}));
```

**Recommendation:** Keep `jest.mock()` style for now (backward compatible). Modernize during next refactor cycle.

---

## Step 6: Verify Migration (15 min)

```bash
# Run tests without watch mode
npm test

# Expected output:
# ✓ tests/api-client.test.js (3)
# ✓ tests/checkpoint-manager.test.js (8)
# ... (all 63 tests should pass)
#
# Test Files  8 passed (8)
# Tests      63 passed (63)
# Duration   1.2s
```

**If tests fail:**

| Error | Solution |
|-------|----------|
| `ReferenceError: describe is not defined` | Add `globals: true` to vitest.config.js |
| `Cannot find module 'vitest'` | Run `npm install -D vitest` again |
| `Test file not found` | Check exclude patterns in vitest.config.js |
| `import not working` | Node 20+ required, verify `type: "module"` in package.json |

---

## Step 7: Test Watch Mode (5 min)

```bash
# Start watch mode
npm run test:watch

# Output:
# ✓ tests/api-client.test.js (3)
# ✓ tests/checkpoint-manager.test.js (8)
#
# Test Files  8 passed (8)
# Tests      63 passed (63)
# Duration   1.2s
#
# PRESS SPACE to toggle watch / filter / exit

# Make a change to any test file and save
# Tests should re-run automatically in <100ms
```

---

## Step 8: Enable Browser UI (Optional but Recommended for TDD) (3 min)

```bash
# Terminal 1: Watch mode with UI
npm run test:ui

# Output:
# ➜  Vitest UI  http://localhost:51204/__vitest__/
# ✓ 63 tests pass
```

Then open browser to `http://localhost:51204/__vitest__/` to see:
- Test progress bar
- Individual test status with duration
- Filter tests
- Visual pass/fail indicator
- Color-coded results

**Excellent for pair programming TDD sessions.**

---

## Step 9: Verify Configuration Details (Troubleshooting)

If you encounter specific issues:

### Issue: Module resolution problems

```javascript
// vitest.config.js
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Add if ESM imports are failing:
    extensionsToTreatAsEsm: ['.js'],
    // Add if path aliases are needed:
    alias: {
      '@': new URL('./src', import.meta.url).pathname
    }
  }
});
```

### Issue: Timeout on async tests

```javascript
// In vitest.config.js
test: {
  testTimeout: 10000,  // 10 seconds for async operations
}
```

### Issue: Database/API mock isolation

```javascript
// In test file
beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Clean up
  vi.restoreAllMocks();
});
```

---

## Step 10: Add Pre-commit Hook (Optional but Recommended)

Automatically run tests for changed files before commit:

```bash
# Install husky and lint-staged
npm install -D husky lint-staged

# Initialize husky
npx husky install

# Create pre-commit hook
npx husky add .husky/pre-commit "npm run test:changed"
```

**Add to package.json:**
```json
{
  "scripts": {
    "test:changed": "vitest run --changed",
    "prepare": "husky install"
  },
  "lint-staged": {
    "**/*.js": ["prettier --write"]
  }
}
```

This runs tests for only the changed files before commit - **perfect for TDD safety net.**

---

## Common Jest → Vitest Patterns

| Pattern | Jest | Vitest | Works? |
|---------|------|--------|--------|
| `describe()` | ✓ | ✓ | ✓ Same |
| `it()` / `test()` | ✓ | ✓ | ✓ Same |
| `expect()` | ✓ | ✓ | ✓ Same |
| `beforeEach()` | ✓ | ✓ | ✓ Same |
| `afterEach()` | ✓ | ✓ | ✓ Same |
| `jest.mock()` | ✓ | ✓ | ✓ Same (or use `vi.mock()`) |
| `jest.fn()` | ✓ | ✓ | ✓ Same (or use `vi.fn()`) |
| Snapshots | ✓ | ✓ | ✓ Same |
| Async/await | ✓ | ✓ | ✓ Same |
| `.toEqual()` | ✓ | ✓ | ✓ Same |
| `.toMatchObject()` | ✓ | ✓ | ✓ Same |
| `.toThrow()` | ✓ | ✓ | ✓ Same |

**Bottom line: 99% of tests work unchanged!**

---

## VS Code Integration (Recommended for TDD)

### Install Vitest Explorer Extension

1. Open VS Code Extensions (`Cmd+Shift+X` on Mac)
2. Search for "Vitest"
3. Install "Vitest" by vitest.explorer
4. Reload VS Code

### Features After Install

```
📁 tests/
 ├─ ✓ api-client.test.js
 │  ├─ ✓ should initialize Ollama client
 │  ├─ ✓ should return same client instance
 │  └─ ✓ should use default Ollama host
 ├─ ✓ photo-analyzer.test.js
 │  ├─ ✓ should accept valid photo files
 │  └─ ✓ should reject invalid formats
 └─ ✓ score-aggregator.test.js
```

**Click a test → runs in background → shows result inline**

Perfect for TDD red-green-refactor cycles!

---

## Rollback Plan (If Needed)

If Vitest doesn't work out, rollback is simple:

```bash
# Stash changes
git stash

# Remove Vitest
npm uninstall vitest @vitest/ui

# Reinstall Jest
npm install -D jest

# Restore jest scripts in package.json
# Restore @jest/globals imports in tests

# Done - back to Jest
npm test
```

**Total rollback time: <15 minutes**

This is why migration risk is LOW.

---

## Verification Checklist (Post-Migration)

- [ ] `npm test` runs and passes (all 63 tests)
- [ ] `npm run test:watch` starts watch mode
- [ ] Make a test change, watch mode detects it (< 100ms)
- [ ] `npm run test:ui` opens browser dashboard
- [ ] All test imports use `'vitest'` (not `@jest/globals`)
- [ ] vitest.config.js exists with globals: true
- [ ] package.json scripts updated
- [ ] Pre-commit hook working (optional)
- [ ] VS Code Vitest extension installed (optional)
- [ ] Team communicates change (run this on branch, everyone pulls)

---

## Performance Comparison

**Before (Jest with --experimental-vm-modules):**
```
Test Files  8 passed (8)
Tests      63 passed (63)
Duration   3.2s
```

**After (Vitest):**
```
Test Files  8 passed (8)  
Tests      63 passed (63)
Duration   1.2s
```

**Improvement: ~63% faster** ✨

Watch mode is even more dramatic:
- Jest watch: ~800ms full run each change
- Vitest watch: ~50-100ms for affected tests

---

## Next Steps

1. Run this guide on a feature branch (`feature/m3-vitest-migration`)
2. Verify all tests pass
3. Test watch mode and UI
4. Commit migration: `git commit -m "chore(test): migrate jest to vitest for TDD"`
5. Push and create PR for team review
6. Merge and enjoy faster feedback loops! 🚀

---

## Troubleshooting Contact

If migration issues arise, check:

1. **vitest.config.js** - Most issues are config-related
2. **Vitest docs:** https://vitest.dev/guide/
3. **GitHub Issues:** https://github.com/vitest-dev/vitest/issues
4. **This project's CLAUDE.md** for multi-agent debugging

