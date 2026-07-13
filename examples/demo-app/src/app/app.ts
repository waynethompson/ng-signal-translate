import { Component, inject, signal } from '@angular/core';
import {
  LanguageSwitcherComponent,
  TranslatePipe,
  TranslateService,
  staticDictionaryLoader,
  type SwitcherLanguage,
} from 'ng-signal-translate';

const DICTIONARIES = {
  en: {
    header: { title: 'ng-signal-translate demo' },
    greeting: 'Hello, {{name}}!',
    search: { results: '{{count}} results found' },
  },
  fr: {
    header: { title: 'démo ng-signal-translate' },
    greeting: 'Bonjour, {{name}} !',
    search: { results: '{{count}} résultats trouvés' },
  },
  // 'es' is intentionally left out of supportedLangs' dictionaries below to
  // demonstrate `loadErrors`: selecting it will fail to load and surface an error.
};

@Component({
  selector: 'app-root',
  imports: [TranslatePipe, LanguageSwitcherComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly translate = inject(TranslateService);

  protected readonly languages: SwitcherLanguage[] = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'es', label: 'Español (no dictionary — triggers loadErrors)' },
  ];

  protected readonly resultCount = signal(3);
  protected readonly title = this.translate.t('header.title');
  protected readonly greeting = this.translate.t('greeting', { name: 'Ada' });
  protected readonly loadErrors = this.translate.loadErrors;

  constructor() {
    this.translate.configure({
      loader: staticDictionaryLoader(DICTIONARIES),
      supportedLangs: ['en', 'fr', 'es'],
      fallbackLang: 'en',
    });
  }
}
