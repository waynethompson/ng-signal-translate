/** Flushes pending promise microtasks (e.g. a TranslationLoader's `.then()` chain). */
export function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
