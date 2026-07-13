import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    // Angular's TestBed only auto-resets between tests (so a fresh
    // TranslateService/TestBed module is available in each `it`) when it can
    // detect a global `afterEach` to hook into, as Jasmine/Jest provide by
    // default.
    globals: true,
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
  },
});
