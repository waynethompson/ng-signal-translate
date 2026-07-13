# ng-signal-translate

Angular 22+ i18n library built on signals — no Zone.js dependency, no NgModule required.

Translation state (active language, loaded dictionaries) lives in Angular signals, so templates and effects re-render automatically whenever they read from it, independent of zone-based change detection.

## Install

```bash
npm install ng-signal-translate
```

## Setup

Configure the service once, e.g. in `app.config.ts` via an `APP_INITIALIZER` or in your root component:

```ts
import { TranslateService, httpDictionaryLoader } from 'ng-signal-translate';

const translate = inject(TranslateService);
translate.configure({
  loader: httpDictionaryLoader('/assets/i18n'), // loads /assets/i18n/{lang}.json
  supportedLangs: ['en', 'fr', 'de'],
  fallbackLang: 'en',
});
```

On `configure()`, the active language is resolved in this order: a value saved in `localStorage` (key `"language"` by default, override with `storageKey`), then the browser's language, then `fallbackLang`.

Dictionaries can also be provided in memory instead of over HTTP:

```ts
import { staticDictionaryLoader } from 'ng-signal-translate';

translate.configure({
  loader: staticDictionaryLoader({
    en: { header: { title: 'Welcome' } },
    fr: { header: { title: 'Bienvenue' } },
  }),
  supportedLangs: ['en', 'fr'],
  fallbackLang: 'en',
});
```

## Usage

### Pipe

```html
<h1>{{ 'header.title' | translate }}</h1>
<p>{{ 'search.results' | translate: { count: results.length } }}</p>
```

Keys use dot notation to walk nested dictionary objects. Params are interpolated into `{{ paramName }}` placeholders in the translated string.

### Signals

```ts
export class MyComponent {
  private readonly translate = inject(TranslateService);
  readonly title = this.translate.t('header.title');
  readonly greeting = this.translate.t('greeting', { name: 'Ada' });
}
```

`t()` returns a `Signal<string>` computed from the active language and loaded dictionaries, falling back to `fallbackLang` and then the raw key if no translation is found.

### Language switcher component

```html
<ngst-language-switcher
  [languages]="[{ code: 'en', label: 'English' }, { code: 'fr', label: 'Français' }]"
/>
```

Renders a `<select>` bound to `TranslateService`'s active language; changing it calls `setLanguage()`.

### Changing language programmatically

```ts
this.translate.setLanguage('fr');
```

This persists the choice to `localStorage` and lazily loads the dictionary for that language (and the fallback language, if not already loaded).

### Handling dictionary load failures

```ts
export class MyComponent {
  private readonly translate = inject(TranslateService);
  readonly loadErrors = this.translate.loadErrors;
}
```

```html
@if (loadErrors()['fr']) {
  <div class="i18n-error">Couldn't load French translations.</div>
}
```

`loadErrors` is a `Signal<Record<string, unknown>>` keyed by language code, populated when a `TranslationLoader` rejects and cleared once a later load for that language succeeds. This exists because a failed dictionary fetch has no other visible symptom — the app just silently falls back. By contrast, an individual **missing translation key** is self-diagnosing: `t()` renders the raw key string in its place (see below), so there's no separate error channel for that case — you'll see `header.title` on screen instead of "Header Title" and know immediately what's wrong.

## API

- `TranslateService` — `configure()`, `setLanguage()`, `language` (signal), `t(key, params?)`, `loadErrors` (signal)
- `TranslatePipe` — standalone `translate` pipe
- `LanguageSwitcherComponent` — standalone `ngst-language-switcher` component
- `httpDictionaryLoader(baseUrl)` / `staticDictionaryLoader(dictionaries)` — built-in `TranslationLoader` implementations
- `TranslationLoader` — implement your own by providing a `load(lang): Promise<Dictionary>` method

## License

MIT
