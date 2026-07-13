export type Dictionary = Record<string, unknown>;

export interface TranslationLoader {
  load(lang: string): Promise<Dictionary>;
}

/**
 * Loads `{baseUrl}/{lang}.json` via fetch. Suits Angular apps serving
 * dictionaries as static assets (e.g. `assets/i18n/en.json`).
 */
export function httpDictionaryLoader(baseUrl: string): TranslationLoader {
  return {
    async load(lang: string): Promise<Dictionary> {
      if (typeof fetch === 'undefined') {
        throw new Error('ng-signal-translate: httpDictionaryLoader requires a global "fetch" (unavailable in this environment).');
      }
      const url = `${baseUrl.replace(/\/$/, '')}/${lang}.json`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`ng-signal-translate: failed to load "${url}" (${res.status})`);
      }
      return res.json();
    },
  };
}

/** Loads from dictionaries already held in memory — useful for tests or bundled JSON. */
export function staticDictionaryLoader(dictionaries: Record<string, Dictionary>): TranslationLoader {
  return {
    async load(lang: string): Promise<Dictionary> {
      const dict = dictionaries[lang];
      if (!dict) {
        throw new Error(`ng-signal-translate: no static dictionary registered for "${lang}"`);
      }
      return dict;
    },
  };
}
