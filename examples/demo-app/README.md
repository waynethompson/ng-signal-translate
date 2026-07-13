# ng-signal-translate demo

A minimal Angular 22 (zoneless, standalone) app demonstrating `ng-signal-translate`:
`TranslateService.configure()` with `staticDictionaryLoader`, the `translate` pipe,
`t()` signals, `<ngst-language-switcher>`, and `loadErrors` (switch to Spanish to
trigger a deliberately-missing dictionary).

The dependency in `package.json` points at `file:../../dist` — the real ng-packagr
build output of the parent library, not the npm registry — so `npm install` here
always tracks the local source. Run `npm run build` in the repo root first if
`../../dist` is stale.

```bash
npm install
npm start   # ng serve
```
