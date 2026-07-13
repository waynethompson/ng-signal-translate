import { Component, inject, input } from '@angular/core';
import { TranslateService } from './translate.service';

export interface SwitcherLanguage {
  code: string;
  label: string;
}

@Component({
  selector: 'ngst-language-switcher',
  standalone: true,
  template: `
    <select
      class="ngst-language-switcher"
      [value]="translate.language()"
      (change)="onChange($event)"
      aria-label="Language"
    >
      @for (lang of languages(); track lang.code) {
        <option [value]="lang.code">{{ lang.label }}</option>
      }
    </select>
  `,
})
export class LanguageSwitcherComponent {
  protected readonly translate = inject(TranslateService);

  readonly languages = input.required<SwitcherLanguage[]>();

  onChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.translate.setLanguage(select.value);
    // setLanguage() no-ops for unsupported codes; re-sync the DOM so the
    // dropdown never shows a selection that wasn't actually applied.
    select.value = this.translate.language();
  }
}
