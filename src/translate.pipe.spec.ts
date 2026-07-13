import { beforeEach, describe, expect, it } from 'vitest';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslatePipe } from './translate.pipe';
import { TranslateService } from './translate.service';
import { staticDictionaryLoader } from './signal-loader';
import { flush } from './test-helpers';

describe('TranslatePipe', () => {
  let pipe: TranslatePipe;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), TranslatePipe] });
    const translate = TestBed.inject(TranslateService);
    translate.configure({
      loader: staticDictionaryLoader({ en: { greeting: 'Hello {{name}}' } }),
      supportedLangs: ['en'],
      fallbackLang: 'en',
    });
    await flush();
    pipe = TestBed.inject(TranslatePipe);
  });

  it('resolves and interpolates a key', () => {
    expect(pipe.transform('greeting', { name: 'Ada' })).toBe('Hello Ada');
  });

  it('returns the raw key when no translation is found', () => {
    expect(pipe.transform('nope')).toBe('nope');
  });
});

@Component({
  standalone: true,
  imports: [TranslatePipe],
  template: `{{ 'greeting' | translate: { name } }}`,
})
class HostComponent {
  name = 'Ada';
}

describe('TranslatePipe used in a template binding', () => {
  let fixture: ComponentFixture<HostComponent>;
  let translate: TranslateService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideZonelessChangeDetection()],
    });
    translate = TestBed.inject(TranslateService);
    translate.configure({
      loader: staticDictionaryLoader({
        en: { greeting: 'Hello {{name}}' },
        fr: { greeting: 'Bonjour {{name}}' },
      }),
      supportedLangs: ['en', 'fr'],
      fallbackLang: 'en',
    });
    await flush();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders the interpolated translation', () => {
    expect(fixture.nativeElement.textContent).toContain('Hello Ada');
  });

  it('re-renders when the active language changes (pure: false)', async () => {
    translate.setLanguage('fr');
    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Bonjour Ada');
  });
});
