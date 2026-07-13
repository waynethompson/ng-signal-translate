# Contributing

## Gotcha: memoized bindings don't self-heal

Angular's various memoization layers only re-evaluate a binding when the
binding's own inputs change — they don't know or care that a signal read
*inside* the binding is stale relative to some other state. Two instances of
this already exist in this codebase:

- **`TranslatePipe` is `pure: false`** (`src/translate.pipe.ts`). A pure pipe
  (the default) is only re-invoked when its own arguments change by
  reference. `{{ 'header.title' | translate }}` has a static string
  argument, so a pure pipe would never re-run `transform()` when the
  `language` signal it reads internally changes — the translation would
  silently go stale. `pure: false` forces re-evaluation on every change
  detection run instead.

- **The DOM re-sync in `LanguageSwitcherComponent.onChange()`**
  (`src/language-switcher.component.ts`). The `[value]` binding on the
  `<select>` is memoized by Angular against the signal's *previous* value.
  If `setLanguage()` no-ops (unsupported code), the signal doesn't change,
  so the binding has nothing to react to — even though the native `<select>`
  DOM element already changed its displayed value in response to the user's
  click, before Angular ever saw the event. The binding won't proactively
  revert that drift on its own; `onChange()` has to manually write
  `select.value` back to force the DOM in sync with the signal.

If you add a new binding (pipe, host binding, directive) against
`TranslateService`'s signals, ask: **can this binding's own arguments stay
identical across a render where the underlying signal state legitimately
changed or failed to change?** If yes, memoization will hide the update (or
the non-update) from you, and you'll need the same kind of explicit
workaround as above.

## Tests

`npm test` runs the Vitest suite (`src/**/*.spec.ts`), using Angular's
`TestBed` with zoneless change detection (`provideZonelessChangeDetection`)
— matching how this library is actually used. See `src/test-setup.ts` for
the environment bootstrap, including the explicit `TestBed.resetTestingModule()`
in `afterEach`: Vitest doesn't auto-register with Angular's TestBed reset
hook the way Jasmine/Jest do, so without it, DI state (including the
root-provided `TranslateService` singleton) leaks across tests in the same
file.

Note `src/language-switcher.component.spec.ts` tests `onChange()` against a
directly-constructed component instance rather than a full `TestBed`-rendered
template: this project's Vitest setup JIT-compiles components via plain
esbuild transpilation (not Angular's real `ngtsc` compiler), which doesn't
register signal-input (`input.required()`) metadata, so `TestBed.createComponent()`
can't render this component's template correctly in tests. Full template
rendering is covered by `npm run build` (ng-packagr's real `ngc` compile).
