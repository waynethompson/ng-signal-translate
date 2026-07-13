import { afterEach, describe, expect, it, vi } from 'vitest';
import { httpDictionaryLoader, staticDictionaryLoader } from './signal-loader';

describe('httpDictionaryLoader', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches {baseUrl}/{lang}.json, stripping a trailing slash from baseUrl', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ hello: 'world' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const dict = await httpDictionaryLoader('/assets/i18n/').load('en');

    expect(fetchMock).toHaveBeenCalledWith('/assets/i18n/en.json');
    expect(dict).toEqual({ hello: 'world' });
  });

  it('throws with the status code when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    await expect(httpDictionaryLoader('/assets/i18n').load('en')).rejects.toThrow(/404/);
  });

  it('throws when fetch is unavailable in the environment', async () => {
    vi.stubGlobal('fetch', undefined);

    await expect(httpDictionaryLoader('/assets/i18n').load('en')).rejects.toThrow(/fetch/i);
  });
});

describe('staticDictionaryLoader', () => {
  it('resolves an in-memory dictionary', async () => {
    const loader = staticDictionaryLoader({ en: { hello: 'world' } });
    await expect(loader.load('en')).resolves.toEqual({ hello: 'world' });
  });

  it('rejects when no dictionary is registered for the language', async () => {
    const loader = staticDictionaryLoader({ en: {} });
    await expect(loader.load('fr')).rejects.toThrow(/"fr"/);
  });
});
