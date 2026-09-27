# Tests

Run from the repository root:

```sh
node --check app.js
node --check techniques.js
node --check sw.js
node tests/techniques.cjs
node tests/interactive.cjs
node tests/pwa-assets.cjs
```

`tests/pwa-assets.cjs` checks that every path `sw.js` precaches actually
exists on disk, that both `index.html` (landing) and `practice.html` (the
tool) are precached, and that the navigate handler looks up the requested
page rather than always serving a hard-coded one — a static check, not a
running Service Worker.

`tests/interactive.cjs` uses the same Linkedom harness as `tests/ui.cjs` and covers
the one-at-a-time practice view, the progress indicator, and the decorative
mini-abacus render/rebuild — it does not simulate real animation, sound, or
Web Audio playback.

The arithmetic suite checks 3,520 generated sequences across techniques, digit
lengths and modes. Its independent bead-inventory checks cover direct/no-carry
operations. Some checks reuse the production classifier; these are consistency
checks, not a complete independent proof of the classifier.

The UI test uses Linkedom only as a development dependency. Install it outside
the site and run (example for macOS/Linux):

```sh
npm install --prefix /tmp/bead-bright-qa linkedom --no-audit --no-fund
NODE_PATH=/tmp/bead-bright-qa/node_modules node tests/ui.cjs
```

On another OS, use an appropriate temporary directory and NODE_PATH syntax, or
install Linkedom as a development dependency if that fits the repository setup.
Do not add it as a production dependency just for this test.

The test verifies successful technique switching, cleared answers, updated
examples, failed-switch rollback preserving the old sheet/answers, corrected
settings, and label consistency. It does not simulate a real service worker,
browser layout, iOS installation, or native accessibility behavior.

Manual preview checks:

1. Open via a local HTTP server or HTTPS preview. Expand each technique guide.
2. Type an answer; change technique; verify the sheet and explanation change
   immediately and the answer is cleared.
3. Use Big friends, addition, 10 rows; enter an answer; try Small friends. Verify
   an explanatory error appears and the previous Big friends sheet/answer stays.
4. Set 5 rows and switch again; verify success and error removal.
5. Check keyboard focus, 320px mobile width, 200% text scaling and print layout.
6. Verify the new cache version installs online and the app opens offline.
