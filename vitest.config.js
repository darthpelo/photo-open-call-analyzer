import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js',
        'dist/'
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80
      }
    },
    threads: {
      singleThread: false,
      maxThreads: 4,
      minThreads: 1
    },
    reporters: 'verbose',
    testMatch: ['tests/**/*.test.js']
  }
});
