// Enables Angular's JIT template compiler so TestBed can compile the inline
// templates in this package (translate.pipe.ts, language-switcher.component.ts)
// without an AOT build step. No zone.js: this library and its tests are zoneless.
import '@angular/compiler';

import { afterEach } from 'vitest';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

// Angular's TestBed only auto-resets its injector between tests when it
// detects a Jasmine/Jest-shaped global test framework. Vitest's `globals: true`
// exposes an `afterEach` global too, but TestBed doesn't recognize it, so
// without this the same injector (and root-provided TranslateService
// singleton) leaks state across `it()` blocks in the same file.
afterEach(() => {
  getTestBed().resetTestingModule();
});

// Work around a Vitest/Node gap: newer Node versions ship their own global
// `localStorage` (behind an experimental Web Storage API), and Vitest's jsdom
// environment sees that global already exists and skips overriding it with
// jsdom's real implementation, leaving `localStorage` broken. Vitest exposes
// the raw JSDOM instance at `globalThis.jsdom`; pull the working
// implementation from there instead.
const jsdomInstance = (globalThis as unknown as { jsdom?: { window: Window } }).jsdom;
if (jsdomInstance) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: jsdomInstance.window.localStorage,
    configurable: true,
  });
}
