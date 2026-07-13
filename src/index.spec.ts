import { describe, expect, it } from 'vitest';
import * as publicApi from './index';

describe('public API', () => {
  it('exports the documented surface', () => {
    expect(publicApi.TranslateService).toBeTypeOf('function');
    expect(publicApi.TranslatePipe).toBeTypeOf('function');
    expect(publicApi.LanguageSwitcherComponent).toBeTypeOf('function');
    expect(publicApi.httpDictionaryLoader).toBeTypeOf('function');
    expect(publicApi.staticDictionaryLoader).toBeTypeOf('function');
  });
});
