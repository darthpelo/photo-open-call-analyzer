import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Globals - enable describe, it, expect without imports
    globals: true,
    
    // Environment - use node (not jsdom since this is CLI/backend)
    environment: 'node',
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/fixtures/',
        'dist/',
        'results/',
        '*.config.js',
        '**/*.test.js'
      ]
    },
    
    // Test patterns - match Jest behavior
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    
    // Watch mode - smart dependency tracking
    watch: false,
    
    // Reporter configuration
    reporters: ['verbose'],
    
    // Timeout for async operations
    testTimeout: 10000,
    
    // Hook timeout
    hookTimeout: 10000,
    
    // Parallel execution
    threads: true,
    maxThreads: 4,
    minThreads: 1,
    
    // Output configuration
    outputFile: {
      json: './test-results.json'
    }
  }
});
