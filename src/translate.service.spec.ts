import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslateService } from './translate.service';
import type { TranslationLoader } from './signal-loader';
import { flush } from './test-helpers';

function loaderFor(dictionaries: Record<string, Record<string, unknown>>) {
  const load = vi.fn((lang: string) => {
    const dict = dictionaries[lang];
    return dict ? Promise.resolve(dict) : Promise.reject(new Error(`no dict for "${lang}"`));
  });
  return { load } satisfies TranslationLoader;
}

describe('TranslateService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('throws if used before configure()', () => {
    const service = new TranslateService();
    expect(() => service.setLanguage('fr')).toThrow(/configure\(\)/);
  });

  it('throws on a second configure() call instead of silently resetting the active language', () => {
    const service = new TranslateService();
    service.configure({ loader: loaderFor({ en: {}, fr: {} }), supportedLangs: ['en', 'fr'], fallbackLang: 'en' });
    service.setLanguage('fr');

    expect(() =>
      service.configure({ loader: loaderFor({ de: {} }), supportedLangs: ['de'], fallbackLang: 'de' })
    ).toThrow(/already been configured/);
    expect(service.language()).toBe('fr');
  });

  it('resolves the initial language from localStorage when it is supported', () => {
    localStorage.setItem('language', 'fr');
    const service = new TranslateService();
    service.configure({ loader: loaderFor({ en: {}, fr: {} }), supportedLangs: ['en', 'fr'], fallbackLang: 'en' });
    expect(service.language()).toBe('fr');
  });

  it('falls back when the saved language is not in supportedLangs', () => {
    localStorage.setItem('language', 'de');
    const service = new TranslateService();
    service.configure({ loader: loaderFor({ en: {}, fr: {} }), supportedLangs: ['en', 'fr'], fallbackLang: 'en' });
    expect(service.language()).toBe('en');
  });

  it('respects a custom storageKey', () => {
    localStorage.setItem('myLang', 'fr');
    const service = new TranslateService();
    service.configure({
      loader: loaderFor({ en: {}, fr: {} }),
      supportedLangs: ['en', 'fr'],
      fallbackLang: 'en',
      storageKey: 'myLang',
    });
    expect(service.language()).toBe('fr');
    expect(localStorage.getItem('language')).toBeNull();
  });

  it('setLanguage() no-ops for an unsupported code', () => {
    const service = new TranslateService();
    service.configure({ loader: loaderFor({ en: {} }), supportedLangs: ['en'], fallbackLang: 'en' });
    service.setLanguage('xx');
    expect(service.language()).toBe('en');
  });

  it('setLanguage() persists the choice to localStorage', () => {
    const service = new TranslateService();
    service.configure({ loader: loaderFor({ en: {}, fr: {} }), supportedLangs: ['en', 'fr'], fallbackLang: 'en' });
    service.setLanguage('fr');
    expect(localStorage.getItem('language')).toBe('fr');
  });

  it('loads the dictionary for the active language and the fallback language', () => {
    // Seed localStorage so the initial language is deterministic regardless of
    // the test environment's detected browser locale.
    localStorage.setItem('language', 'en');
    const loader = loaderFor({ en: {}, fr: {} });
    const service = new TranslateService();

    service.configure({ loader, supportedLangs: ['en', 'fr'], fallbackLang: 'fr' });

    expect(loader.load).toHaveBeenCalledWith('en'); // active language
    expect(loader.load).toHaveBeenCalledWith('fr'); // fallback language
  });

  it('does not re-request a dictionary that is already loading or loaded', () => {
    localStorage.setItem('language', 'en');
    const load = vi.fn(() => new Promise<Record<string, unknown>>(() => {})); // never resolves
    const service = new TranslateService();
    service.configure({ loader: { load }, supportedLangs: ['en', 'fr'], fallbackLang: 'en' });
    load.mockClear();

    service.setLanguage('fr');
    service.setLanguage('en');
    service.setLanguage('fr');

    expect(load.mock.calls.filter(([lang]) => lang === 'fr')).toHaveLength(1);
    expect(load.mock.calls.filter(([lang]) => lang === 'en')).toHaveLength(0); // 'en' already loading since configure()
  });

  describe('t()', () => {
    it('resolves nested dot-path keys and interpolates params', async () => {
      const service = new TranslateService();
      service.configure({
        loader: loaderFor({
          en: { greeting: 'Hello {{name}}', nested: { title: 'EN Title' } },
        }),
        supportedLangs: ['en'],
        fallbackLang: 'en',
      });
      await flush();

      expect(service.t('nested.title')()).toBe('EN Title');
      expect(service.t('greeting', { name: 'Ada' })()).toBe('Hello Ada');
    });

    it('leaves a placeholder untouched when its param is missing', async () => {
      const service = new TranslateService();
      service.configure({
        loader: loaderFor({ en: { msg: 'Hi {{name}}, you have {{count}} messages' } }),
        supportedLangs: ['en'],
        fallbackLang: 'en',
      });
      await flush();

      expect(service.t('msg', { name: 'Ada' })()).toBe('Hi Ada, you have {{count}} messages');
    });

    it('falls back to fallbackLang when the active dict is missing the key', async () => {
      const service = new TranslateService();
      service.configure({
        loader: loaderFor({
          en: { greeting: 'Hello' },
          fr: { nested: { title: 'FR Title' } },
        }),
        supportedLangs: ['en', 'fr'],
        fallbackLang: 'en',
      });
      service.setLanguage('fr');
      await flush();

      expect(service.t('nested.title')()).toBe('FR Title');
      expect(service.t('greeting')()).toBe('Hello'); // missing in fr, falls back to en
    });

    it('returns the raw key when no dictionary has it', async () => {
      const service = new TranslateService();
      service.configure({
        loader: loaderFor({ en: {} }),
        supportedLangs: ['en'],
        fallbackLang: 'en',
      });
      await flush();

      expect(service.t('does.not.exist')()).toBe('does.not.exist');
    });

    it('recomputes reactively when the active language changes', async () => {
      const service = new TranslateService();
      service.configure({
        loader: loaderFor({ en: { title: 'EN' }, fr: { title: 'FR' } }),
        supportedLangs: ['en', 'fr'],
        fallbackLang: 'en',
      });
      await flush();

      const title = service.t('title');
      expect(title()).toBe('EN');

      service.setLanguage('fr');
      await flush();

      expect(title()).toBe('FR');
    });
  });

  describe('loadErrors', () => {
    it('records a rejected load and clears it once a retry succeeds', async () => {
      let shouldFail = true;
      const load = vi.fn((lang: string) => {
        if (lang === 'fr' && shouldFail) return Promise.reject(new Error('boom'));
        return Promise.resolve({});
      });
      const service = new TranslateService();
      service.configure({ loader: { load }, supportedLangs: ['en', 'fr'], fallbackLang: 'en' });
      await flush();

      service.setLanguage('fr');
      await flush();
      expect(service.loadErrors()['fr']).toBeInstanceOf(Error);

      shouldFail = false;
      service.setLanguage('fr');
      await flush();
      expect(service.loadErrors()['fr']).toBeUndefined();
    });
  });
});
