import { beforeEach, describe, expect, it } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LanguageSwitcherComponent } from './language-switcher.component';
import { TranslateService } from './translate.service';
import { staticDictionaryLoader } from './signal-loader';

/**
 * `languages` is a signal input (`input.required()`), whose metadata is only
 * registered by Angular's real compiler (ngtsc) — not by the plain
 * esbuild-transpiled JIT compilation this project's Vitest setup uses. So
 * `TestBed.createComponent()` can't render this component's template here
 * (verified: it produces an empty `ɵcmp.inputs`, failing with NG0303/NG0950).
 * Full template rendering is covered instead by `npm run build` (ng-packagr's
 * real ngc compile) and manual/E2E checks. This suite instead exercises
 * `onChange()`'s logic directly against a plain class instance, which only
 * needs a real injection context for its `inject(TranslateService)` call.
 */
describe('LanguageSwitcherComponent', () => {
  let component: LanguageSwitcherComponent;
  let translate: TranslateService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    translate = TestBed.inject(TranslateService);
    translate.configure({
      loader: staticDictionaryLoader({ en: {}, fr: {} }),
      supportedLangs: ['en', 'fr'],
      fallbackLang: 'en',
    });
    component = runInInjectionContext(TestBed.inject(Injector), () => new LanguageSwitcherComponent());
  });

  it('calls setLanguage() when a supported language is chosen', () => {
    component.onChange({ target: { value: 'fr' } } as unknown as Event);
    expect(translate.language()).toBe('fr');
  });

  it('leaves the active language unchanged when an unsupported code is chosen', () => {
    component.onChange({ target: { value: 'de' } } as unknown as Event);
    expect(translate.language()).toBe('en');
  });

  it('re-syncs the DOM select value back to the active language when the choice is rejected', () => {
    const select = { value: 'de' } as unknown as HTMLSelectElement;
    component.onChange({ target: select } as unknown as Event);
    expect(select.value).toBe('en');
  });
});
