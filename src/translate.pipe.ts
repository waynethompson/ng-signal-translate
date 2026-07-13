import { Pipe, inject } from '@angular/core';
import type { PipeTransform, Signal } from '@angular/core';
import { TranslateService } from './translate.service';

/**
 * `{{ 'header.title' | translate }}` / `{{ 'search.results' | translate: { count } }}`
 *
 * Reads TranslateService's signals inside transform(); Angular's template
 * reactivity tracks that read and re-renders the binding when the language
 * or dictionary signal changes, even without Zone.js. Marked `pure: false`
 * because a pure pipe is only re-invoked when its own arguments change by
 * reference — a static key literal would never update on language change.
 *
 * Since `pure: false` means Angular calls transform() on every change
 * detection run, the created signal is cached and only rebuilt when `key`
 * or `params` actually change, so unrelated CD cycles reuse the same
 * computed() instead of rebuilding the reactive graph node each time.
 */
@Pipe({ name: 'translate', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  private lastKey: string | undefined;
  private lastParamsJson: string | undefined;
  private cached: Signal<string> | undefined;

  transform(key: string, params?: Record<string, unknown>): string {
    const paramsJson = params ? JSON.stringify(params) : undefined;
    if (!this.cached || key !== this.lastKey || paramsJson !== this.lastParamsJson) {
      this.lastKey = key;
      this.lastParamsJson = paramsJson;
      this.cached = this.translate.t(key, params);
    }
    return this.cached();
  }
}
