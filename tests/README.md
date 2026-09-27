# Tests

Run from the repository root:

```sh
node --check app.js
node --check techniques.js
node --check sw.js
node tests/techniques.cjs
node tests/interactive.cjs
node tests/pwa-assets.cjs
node tests/mobile-default-view.cjs
node tests/profiles.cjs
node tests/history.cjs
node tests/pins.cjs
```

`tests/pins.cjs` covers child and grown-up PINs: the built-in SHA-256 matches
Node's; PINs are stored only as salted hashes; the first profile sets up the
grown-up PIN and shows a one-time recovery code; cancelling adds nobody; a
wrong PIN never switches and the grown-up PIN opens any child; five wrong
tries lock for 30 seconds, then longer; reopening the app (fresh
`sessionStorage`) asks again but a same-visit reload does not; nothing is
saved while a child is locked; the forgot-PIN flows for a child (grown-up
reset, history kept) and for the grown-up (recovery code, which then
stops working); editing or deleting another child needs their PIN or the
grown-up PIN; and older profiles without a PIN keep working with a nudge to
add one. `tests/pin-helpers.cjs` is shared by the suites that create or
switch profiles: it stubs `<dialog>` and answers PIN prompts.

`tests/history.cjs` uses the same Linkedom harness as `tests/profiles.cjs`
(plus a `showModal`/`close` stub for both dialogs it uses) to cover
per-profile practice history: guest mode saves nothing; the first typed
answer (not merely generating a sheet) creates one session and further
typing/checking updates that same session rather than duplicating it;
"finished" only becomes true once every question has an answer; abandoning
a sheet via New practice leaves the old session exactly as it was and does
not record a fresh, untouched sheet as a session; resuming an unfinished
session restores the exact questions and typed answers and continues
updating that same session; opening a finished session is read-only
(disabled inputs, no session mutation, no duplicate); the banner's "Start
new practice" cleanly exits review/resume mode; deleting a profile deletes
its history; deleting one session or "Delete all history" from the popup
each need a second tap, remove only what was confirmed, never touch
profiles or other children, and stop saving into a sheet whose session was
deleted; the save status line shows the right message for Guest, a
fresh sheet, a saved sheet, a failed save (simulated full storage), review
and resume; switching to a different child (or Guest) starts a fresh sheet
so each child's session holds only their own answers; and history rolls over
at a 50-session-per-profile cap, oldest
first — checked directly against the storage functions rather than by
generating 51 sessions through the UI.

`tests/profiles.cjs` uses the same Linkedom harness as `tests/ui.cjs`, plus an
in-memory `localStorage` stub and a minimal `showModal`/`close` stub for the
one `<dialog>` element it uses (Linkedom has no native `<dialog>` behavior).
It covers the guest-by-default state, adding a profile requiring both a name
and an avatar, a new profile becoming active immediately, persistence across
a simulated reload, switching and "practice without a profile" leaving every
saved profile untouched, editing a profile in place (with cancel discarding
changes), and the two-tap delete confirmation only ever removing the one
profile it targets.

`tests/mobile-default-view.cjs` stubs `window.matchMedia` to prove the
one-at-a-time view is the default under a 650px-wide screen and the
worksheet view is the default above it, and that the view-toggle button's
label matches whichever view is active on load.

`tests/pwa-assets.cjs` checks that every path `sw.js` precaches actually
exists on disk, that both `index.html` (landing) and `practice.html` (the
tool) are precached, and that the navigate handler looks up the requested
page rather than always serving a hard-coded one — a static check, not a
running Service Worker. It also runs the landing page's installed-app redirect
with stubbed display modes: installed apps go to `practice.html`, browser
visitors stay on the landing page.

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
