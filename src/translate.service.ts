import { Injectable, computed, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import type { Dictionary, TranslationLoader } from './signal-loader';

export interface TranslateConfig {
  loader: TranslationLoader;
  supportedLangs: string[];
  fallbackLang: string;
  /** localStorage key used to persist the active language. Defaults to "language". */
  storageKey?: string;
}

/**
 * Resolves `key` against `dict`. A literal top-level match (e.g. a dictionary
 * authored with a dotted key like `"a.b"`) always wins over dot-path
 * traversal into nested objects — checked first, so `t('a.b')` returns the
 * literal `dict['a.b']` even if `dict.a.b` also resolves to something.
 */
function resolveKey(dict: Dictionary, key: string): unknown {
  if (key in dict) return dict[key];
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Dictionary)) {
      return (acc as Dictionary)[part];
    }
    return undefined;
  }, dict);
}

function interpolate(template: string, params?: Record<string, unknown>): string {
  if (!params) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) =>
    params[name] !== undefined ? String(params[name]) : `{{${name}}}`
  );
}

function detectBrowserLang(supported: string[]): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const raw of candidates) {
    const short = (raw.split('-')[0] ?? raw).toLowerCase();
    if (supported.includes(short)) return short;
  }
  return undefined;
}

/**
 * Signal-based translation store. No Zone.js dependency: language and
 * dictionary state live in signals, so `t()`'s computed()s re-run whenever
 * they're read from a template/effect, independent of zone-based change
 * detection.
 */
@Injectable({ providedIn: 'root' })
export class TranslateService {
  private config: TranslateConfig | undefined;
  private storageKey = 'language';

  private readonly dictionaries = signal<Record<string, Dictionary>>({});
  private readonly loading = new Set<string>();

  readonly language = signal<string>('en');
  /**
   * Errors from failed dictionary loads, keyed by language. Cleared once a
   * load for that language succeeds. A failed fetch has no other visible
   * symptom, so it gets an explicit error channel. A missing translation
   * *key*, by contrast, is self-diagnosing — see `t()` — so it doesn't get
   * one of these; that's an intentional asymmetry, not an oversight.
   */
  readonly loadErrors = signal<Record<string, unknown>>({});

  /** Must be called exactly once. A second call throws rather than silently resetting an already-active language. */
  configure(config: TranslateConfig): void {
    if (this.config) {
      throw new Error(
        'ng-signal-translate: TranslateService has already been configured; configure() may only be called once.'
      );
    }
    this.config = config;
    this.storageKey = config.storageKey ?? 'language';
    this.setLanguage(this.resolveInitialLang());
  }

  private requireConfig(): TranslateConfig {
    if (!this.config) {
      throw new Error('ng-signal-translate: TranslateService.configure() must be called before use.');
    }
    return this.config;
  }

  private resolveInitialLang(): string {
    const { supportedLangs, fallbackLang } = this.requireConfig();
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(this.storageKey) : null;
    if (saved && supportedLangs.includes(saved)) return saved;
    return detectBrowserLang(supportedLangs) ?? fallbackLang;
  }

  setLanguage(lang: string): void {
    const config = this.requireConfig();
    if (!config.supportedLangs.includes(lang)) return;
    this.language.set(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, lang);
    }
    this.ensureLoaded(lang);
    this.ensureLoaded(config.fallbackLang);
  }

  private ensureLoaded(lang: string): void {
    if (this.dictionaries()[lang] || this.loading.has(lang)) return;
    this.loading.add(lang);
    this.requireConfig().loader.load(lang).then(
      (dict) => {
        this.loading.delete(lang);
        this.dictionaries.update((d: Record<string, Dictionary>) => ({ ...d, [lang]: dict }));
        this.loadErrors.update((e) => {
          if (!(lang in e)) return e;
          const { [lang]: _removed, ...rest } = e;
          return rest;
        });
      },
      (error) => {
        this.loading.delete(lang);
        this.loadErrors.update((e) => ({ ...e, [lang]: error }));
      }
    );
  }

  /**
   * Returns a reactive signal for `key`, resolved in the active language with
   * fallback. A key that's missing everywhere (or resolves to a non-string,
   * e.g. a nested object) renders as the raw `key` itself — deliberately
   * silent, since the raw key showing up on screen is itself the diagnostic;
   * unlike a failed dictionary load (see `loadErrors`), there's no separate
   * error signal for this case.
   */
  t(key: string, params?: Record<string, unknown>): Signal<string> {
    return computed(() => {
      const config = this.requireConfig();
      const dicts = this.dictionaries();
      const lang = this.language();
      const activeDict = dicts[lang];
      const fallbackDict = dicts[config.fallbackLang];
      const value =
        (activeDict && resolveKey(activeDict, key)) ??
        (fallbackDict && resolveKey(fallbackDict, key));
      return typeof value === 'string' ? interpolate(value, params) : key;
    });
  }
}
