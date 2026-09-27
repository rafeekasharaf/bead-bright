# Feature status

| ID  | Feature                  | Status |
| --- | ------------------------ | ------ |
| U00 | Practice technique guide | Done   |
| Fxx | Operator fix and fun theme | Done |
| polish-12 | Interactivity and polish pass | Done |
| hotfix-4bugs | Fixes for 4 reported polish-12 bugs | Done |
| landing-and-nav-polish | Landing page at `/`, practice tool at `/practice.html`, nav polish | Done |
| sheet-improvements | Mobile-default one-at-a-time, sound on by default, results panel | Done |
| F01 | Question controls and saved presets | Not shipped — branch deleted before merge |
| F04 | Local child profiles | Done |

## U00 — Practice technique guide

**Status:** Done (2026-09-27)

**Approval scope:** Preview and production.

**Commit:** `bd56fbd` — U00: practice technique guide and clarified labels; add dev tests (excluded from deploy). Fast-forwarded onto `main` from `461576c`.

**Deployment:**

- Production: https://bead-bright.vercel.app/
- Vercel deployment: https://bead-bright-l36m5m22c-rafeekasharafs-projects.vercel.app
- Vercel inspector: https://vercel.com/rafeekasharafs-projects/bead-bright/4ZiES9JqX9Vk9q9mpeC7H7Dkzivm

### Test results

Ran the checks in `tests/README.md` on Node v22.11.0 (Windows):

| Check | Result |
| --- | --- |
| `node --check app.js` / `techniques.js` / `sw.js` | Pass |
| `node tests/techniques.cjs` | Pass — 3,520 question sequences |
| `node tests/ui.cjs` (linkedom 0.18.13, installed outside the repo) | Pass |

Note: on Node 22.11, `tests/ui.cjs` needs `--experimental-require-module`, because linkedom's `css-select` dependency is ESM-only. Node 22.12 and later enable this by default.

Production checks after deployment:

| Check | Result |
| --- | --- |
| `/` shows "Practice technique" label | Pass |
| `/` shows "How does this technique work?" guide | Pass |
| `/sw.js` cache is `bead-bright-v3-technique-guide` | Pass |
| `/tests/` returns 404 (also `/tests/README.md`, `/tests/ui.cjs`, `/tests/techniques.cjs`) | Pass |

### Untested

- Real iPhone (Safari and installed home-screen app).
- Upgrading an installed app from the `bead-bright-v2-levels` cache to `bead-bright-v3-technique-guide`, including offline launch after the upgrade.

## Fxx — Operator fix and fun theme

**Status:** Done (2026-09-27)

**Approval scope:** Preview and production. The preview was checked by the owner in their browser; Claude could not open it because Vercel Deployment Protection requires login.

**Commit:** `0b6a9ff` — Fxx: fix operator placement next to operands; add lively 2D theme (colors, animations, sound, confetti), respecting reduced-motion. Fast-forwarded onto `main` from `a26424c`.

**Deployment:**

- Production: https://bead-bright.vercel.app/
- Vercel deployment: https://bead-bright-nu22rba8l-rafeekasharafs-projects.vercel.app
- Preview (branch `fxx-operator-and-theme`): https://bead-bright-g60v4eybv-rafeekasharafs-projects.vercel.app

### Test results

Ran the checks in `tests/README.md` on Node v22.11.0 (Windows), on the branch before merging:

| Check | Result |
| --- | --- |
| `node --check app.js` / `techniques.js` / `sw.js` | Pass |
| `node tests/techniques.cjs` | Pass — 3,520 question sequences |
| `node tests/ui.cjs` (linkedom 0.18.13, `--experimental-require-module`) | Pass |

Production checks after deployment:

| Check | Result |
| --- | --- |
| `/sw.js` cache is `bead-bright-v4-fun-theme` | Pass |
| `/tests/` returns 404 | Pass |
| Operator CSS served: fixed-width right-aligned sign next to right-aligned number | Pass (code check) |
| Colored card theme CSS served (rotating yellow/teal/pink/blue borders) | Pass (code check) |
| Sound toggle: 🔇 → 🔊, `aria-pressed` and saved setting update, tone plays | Pass (simulated DOM, stubbed audio) |
| Wrong answer: low tone and shake, no confetti | Pass (simulated DOM) |
| All correct: three-note chime, pop, 24 confetti pieces | Pass (simulated DOM) |
| Reduced motion: no confetti | Pass (simulated DOM) |

The behavior checks ran the production `index.html`, `app.js` and `techniques.js` in linkedom with stubbed `AudioContext` and `matchMedia`. They verify logic and DOM output, not visual layout, animation or actual audio.

### Untested

- Reduced-motion behavior should be spot-checked on a real device (e.g. iOS Settings → Accessibility → Motion → Reduce Motion): confirm no confetti and no card pop/shake.
- Visual rendering of the operator alignment and theme in a real browser, beyond the owner's preview check.
- Audible sound output, including on iPhone (silent switch, first-tap audio unlock).
- Real iPhone and installed-app upgrade from `bead-bright-v3-technique-guide` to `bead-bright-v4-fun-theme`, including offline launch.

## polish-12 — Interactivity and polish pass

**Status:** Done (2026-09-27)

**Approval scope:** Preview and production. The owner checked the preview that includes the fixes commit (https://bead-bright-9pko4wz9c-rafeekasharafs-projects.vercel.app) in their browser; Claude could not open it because Vercel Deployment Protection requires login.

**Commits** (fast-forwarded onto `main` from `bb4b35d`):

- `ed0b8ae` — 12-item interactivity/polish pass from `0003-polish-12-interactive.patch`: one-at-a-time view, decorative mini abacus, progress bar, staggered card animations, digit-button dots, confetti near the Check button, bead-tick sound, mascot, warmer error copy, typography.
- `6b2d235` — Fix checked cards vanishing (base `opacity:0` on `.card` hid answered cards once pop/shake replaced the entry animation) and truncated mini-abacus totals (rods now sized to the largest total, up to 7).

**Deployment:**

- Production: https://bead-bright.vercel.app/
- Vercel deployment: https://bead-bright-f9jugvt7j-rafeekasharafs-projects.vercel.app

### Test results

Ran the checks in `tests/README.md` on Node v22.11.0 (Windows), on `6b2d235` before merging:

| Check | Result |
| --- | --- |
| `node --check app.js` / `techniques.js` / `sw.js` | Pass |
| `node tests/techniques.cjs` | Pass — 3,520 question sequences |
| `node tests/ui.cjs` (UI regression suite) | Pass |
| `node tests/interactive.cjs` (new; includes regression checks for both fixes) | Pass |

Linkedom-based suites ran with linkedom 0.18.13 and `--experimental-require-module`.

Production checks after deployment:

| Check | Result |
| --- | --- |
| Production `index.html`, `app.js`, `techniques.js` identical to `6b2d235` | Pass |
| `/sw.js` cache is `bead-bright-v5-interactive-polish` | Pass |
| `/tests/` returns 404 (also `/tests/interactive.cjs`) | Pass |
| "🧮 One at a time" toggle: one card shown, Previous disabled on first, Next steps through, last shows "Finish ✔", Previous goes back | Pass (simulated DOM) |
| Mini-abacus beads activate as an answer is typed (7 → one upper + two lower) | Pass (simulated DOM) |
| Progress bar label and width update as answers are entered | Pass (simulated DOM) |
| Mascot sits in the same row as the headline | Pass (DOM structure) |
| Finish on a fully-correct sheet: 24 confetti pieces inside the Check/Show answers row, absolutely positioned, 120px fall | Pass (simulated DOM + CSS check) |
| Checked cards stay visible (no base `opacity:0` on `.card`) | Pass (CSS check) |

Behavior checks ran production files in linkedom with stubbed `matchMedia`. They verify logic, DOM output and CSS rules, not rendered layout, animation or audio.

### Untested — spot-check manually

- Real-device animation and sound feel: card entry stagger, pop/shake, bead movement, confetti, bead-tick and chime sounds (including iPhone silent switch and first-tap audio unlock).
- CSS Grid layout at various widths (e.g. 320px, 650px breakpoint, 950px breakpoint, desktop), including the one-at-a-time view and a 6–7 rod mini abacus on 4-digit sheets.
- Reduced-motion behavior on a real device.
- Known cosmetic behavior: after Check, the first keystroke in a card replays its short fade-in.
- Installed-app upgrade from `bead-bright-v4-fun-theme` to `bead-bright-v5-interactive-polish`, including offline launch.

## hotfix-4bugs — Fixes for 4 reported polish-12 bugs

**Status:** Done (2026-09-27)

**Approval scope:** Preview and production. Claude checked the preview (https://bead-bright-d8l163kta-rafeekasharafs-projects.vercel.app) in the owner's signed-in Chrome before merging.

**Commits** (fast-forwarded onto `main` from `c53f51a`):

- `3388196` — Fixes from `0004-hotfix-4bugs.patch`.
- `849728f` — Bump service worker cache to `bead-bright-v6-hotfix-4bugs`. The patch left the cache at v5; since `sw.js` serves `index.html` and `app.js` cache-first, existing v5 visitors would otherwise never have received the fixes.

**Deployment:**

- Production: https://bead-bright.vercel.app/
- Vercel deployment: https://bead-bright-54jqkawcy-rafeekasharafs-projects.vercel.app

### What was fixed

1. **Card vanished while typing in one-at-a-time view.** The input handler reset the card's classes, removing `is-current`, so the focused card was hidden before Next was pressed. The handler now reapplies the view.
2. **Bottom mini-abacus bead clipped.** SVG viewBox height raised from 100 to 116.
3. **Previous/Next crowded the card.** Added 22px above the focus nav and 6px below the focused card.
4. **Print sheet button showed on mobile.** Hidden at widths of 650px and below; still shown on desktop.

### Test results

Ran the checks in `tests/README.md` on Node v22.11.0 (Windows), on `849728f` before merging:

| Check | Result |
| --- | --- |
| `node --check app.js` / `techniques.js` / `sw.js` | Pass |
| `node tests/techniques.cjs` | Pass — 3,520 question sequences |
| `node tests/ui.cjs` (UI regression suite) | Pass |
| `node tests/interactive.cjs` (adds a check for fix 1; confirmed it fails on the old `app.js`) | Pass |

Browser checks, run by Claude in Chrome (desktop, 1920px window) on both the preview and production with real clicks and typing:

| Check | Preview | Production |
| --- | --- | --- |
| One-at-a-time view: typing an answer keeps the card visible (only current card shown, opacity 1) before Next | Pass | Pass |
| Next moves to question 2; Previous becomes enabled | Pass | — |
| Mini-abacus beads move as you type; progress updates to "1 of 6 answered" | Pass | Pass |
| Lowest bead fully visible (bead bottom y=106 inside viewBox height 116) | Pass | Pass |
| Clear space between the question card and Previous/Next (22px) | Pass | Pass |
| Print sheet hidden at 390px and 650px, shown at 651px and desktop (checked in a same-origin iframe, since the maximized window could not be resized) | Pass | Pass |
| `/sw.js` serves `bead-bright-v6-hotfix-4bugs` | Pass | Pass |
| `/tests/` returns 404 | — | Pass |
| Production `index.html`, `app.js`, `sw.js` identical to `849728f` | — | Pass |

**Real upgrade observed:** the Chrome profile used had v5 installed. The first production load after deploy still ran the old v5 files while v6 installed in the background; on the next load the v5 cache was deleted and the fixed files were served. Users who already have the app open will see the fixes on their next visit or reload, not immediately.

### Untested — spot-check manually

- Real mobile device at phone width (the Print check used an iframe, not a phone).
- iPhone installed app upgrading from v5 to v6.
- Real-device animation/sound feel and grid layout at other widths, as listed for polish-12.

## landing-and-nav-polish — Landing page and nav polish

**Status:** Done (2026-09-27)

**Approval scope:** Preview and production. The owner checked the preview that includes the installed-app redirect (https://bead-bright-go6prjhg4-rafeekasharafs-projects.vercel.app) and approved it.

**Commits** (fast-forwarded onto `main` from `7b27e4b`):

- `049af91` — Nav polish (from `0005-nav-polish-and-landing-page.patch`): teal Previous/Next distinct from blue Check answers; icon-only nav buttons on mobile with text labels on desktop; centered, spaced-out Check/Show answers row.
- `e7ea477` — Landing page (same patch file): marketing page at `/`; practice tool moved to `/practice.html`; manifest `start_url` set to `/practice.html`; service worker cache `bead-bright-v7-landing-page` precaches both pages and serves each navigation from its own cache entry; adds `tests/pwa-assets.cjs`.
- `695b8b6` — Installed-app redirect: in standalone display mode, the landing page sends the visitor to `/practice.html` before rendering. Existing home-screen installs keep `start_url` `/` (iOS never refreshes it) and would otherwise open on the marketing page.

**Deployment:**

- Production: https://bead-bright.vercel.app/ (landing) and https://bead-bright.vercel.app/practice.html (tool)
- Vercel deployment: https://bead-bright-jk82bsxho-rafeekasharafs-projects.vercel.app

### Test results

Ran every test in `tests/README.md` on Node v22.11.0 (Windows), on `695b8b6` before merging:

| Check | Result |
| --- | --- |
| `node --check app.js` / `techniques.js` / `sw.js` / `pwa.js` | Pass |
| `node tests/techniques.cjs` | Pass — 3,520 question sequences |
| `node tests/interactive.cjs` (now loads `practice.html`) | Pass |
| `node tests/pwa-assets.cjs` (new; includes the redirect check, confirmed failing without the redirect) | Pass |
| `node tests/ui.cjs` (now loads `practice.html`) | Pass |

Production checks after deployment:

| Check | Result |
| --- | --- |
| Production `index.html`, `practice.html`, `app.js`, `sw.js`, `pwa.js`, `manifest.webmanifest` identical to `695b8b6` | Pass |
| `/sw.js` serves `bead-bright-v7-landing-page` | Pass |
| `/` and `/practice.html` return 200; `/tests/` and `/tests/pwa-assets.cjs` return 404 | Pass |
| `/` shows the landing page in a browser (no redirect when not installed); all three "Start practicing" links go to `practice.html` | Pass (Chrome) |
| Clicking the hero button opens the practice tool; "Ready for offline practice" shown | Pass (Chrome) |
| Previous/Next teal (`#0f7a5f`), Check answers blue (`#2655df`) | Pass (Chrome) |
| Desktop: nav buttons show icon and text; last question shows "✔ Finish" | Pass (Chrome) |
| Mobile (390px): nav buttons icon-only (45px wide), labels visually hidden but kept for screen readers; Print sheet hidden | Pass (Chrome, same-origin iframe) |
| Check/Show answers row centered with 38px top margin | Pass (Chrome) |
| Landing page at 390px: full-width button, no horizontal scroll | Pass (Chrome, same-origin iframe) |

**Real upgrade observed:** the Chrome profile had v6 installed. The first load of `/` after deploy was served by the v6 worker, which always returns its cached `index.html`, so it showed the old practice tool while v7 installed. On the next load the v6 cache was gone and `/` showed the landing page.

### Untested — spot-check manually

- The installed-app redirect on a real installed app (iPhone home screen and Android/desktop). Automated tests stub the display mode.
- Offline navigation between the landing page and `/practice.html` on a real device.
- Real phone at mobile width (mobile checks used an iframe).
- Inside the installed app, the "beadbright" logo on the practice page links to `/`, which now redirects back to the practice page.

## sheet-improvements — Practice sheet improvements

**Status:** Done (2026-09-27)

**Approval scope:** Preview and production. The owner checked the preview that includes the results-panel fixes (https://bead-bright-9hyr1wuj8-rafeekasharafs-projects.vercel.app) and approved it.

**Commits** (fast-forwarded onto `main` from `d2003bd`):

- `c2b4bc2` — From `0006-sheet-improvements.patch`:
  - one-at-a-time view by default at 650px and below (worksheet above)
  - sound on by default when no preference is saved
  - confetti falls from the top of the screen across the full width, with 🌸🌼🌺 flowers (replaces polish-12's confetti near the Check button)
  - Finish button in its own orange-brown colour with no icon, label visible on mobile
  - slide-in animation when moving between questions
  - results panel after Finish/Check in one-at-a-time view: correct / to fix / blank counts, numbered jump-to-question buttons, Keep practicing, and a "🏁 See results" button to reopen it
  - service worker cache `bead-bright-v8-sheet-improvements`; adds `tests/mobile-default-view.cjs`
- `58b79ab` — Results panel fixes: "See results" and Previous/Next stay hidden while the panel is open; opening the panel moves focus to its summary (now a labelled region) so screen readers announce it; Keep practicing returns focus to the current answer.

**Deployment:**

- Production: https://bead-bright.vercel.app/practice.html
- Vercel deployment: https://bead-bright-80dse28jj-rafeekasharafs-projects.vercel.app

### Test results

Ran every test in `tests/README.md` on Node v22.11.0 (Windows), on `58b79ab` before merging:

| Check | Result |
| --- | --- |
| `node --check app.js` / `techniques.js` / `sw.js` / `pwa.js` | Pass |
| `node tests/techniques.cjs` | Pass — 3,520 question sequences |
| `node tests/interactive.cjs` (adds default sound, results panel, jump buttons, and checks for both fixes, confirmed failing without them) | Pass |
| `node tests/pwa-assets.cjs` | Pass |
| `node tests/mobile-default-view.cjs` (new) | Pass |
| `node tests/ui.cjs` | Pass |

Production checks after deployment:

| Check | Result |
| --- | --- |
| Production `index.html`, `practice.html`, `app.js`, `sw.js`, `pwa.js` identical to `58b79ab` | Pass |
| `/sw.js` serves `bead-bright-v8-sheet-improvements`; v7 cache removed after one reload | Pass (Chrome) |
| `/tests/` and `/tests/mobile-default-view.cjs` return 404 | Pass |
| Desktop opens in worksheet view; 390px opens in one-at-a-time view with toggle reading "📄 Worksheet view"; 651px opens in worksheet view | Pass (Chrome; widths via same-origin iframe) |
| Sound defaults to on (🔊, `aria-pressed="true"`) with no saved preference | Pass (Chrome) |
| Finish button orange-brown (`#a5470f`), no icon; "Finish" label visible at 390px while Previous stays icon-only | Pass (Chrome) |
| Real click on Finish with 1 right / 1 wrong / 1 blank: panel shows "1 correct · 1 to fix · 1 blank" with green/orange/grey buttons; no cards shown; Previous/Next and "See results" hidden; focus on the summary | Pass (Chrome) |
| Real click on jump button 2: panel closes, question 2 shown, focus in its answer, "See results" reappears | Pass (Chrome) |
| Reopen via "See results": focus back on the summary, button hidden again | Pass (Chrome) |
| Real click on Keep practicing: panel closes, focus returns to the current answer | Pass (Chrome) |
| All correct: "All 3 correct! 🎉", 30 confetti pieces (10 flowers) on `body`, `position: fixed`, falling from the top while scrolled | Pass (Chrome) |

Note: the owner's Chrome had a saved "sound off" (`bead-bright-sound-on` = `0`) from an accidental click during the hotfix-4bugs checks. It was removed during these checks to restore the original unset state.

### Untested — spot-check manually

- Screen reader announcement of the results panel (VoiceOver / TalkBack). Focus movement was verified; actual speech was not.
- Real phone: one-at-a-time default, slide-in animation feel, confetti and flowers.
- Sound on by default on a real iPhone (silent switch, first-tap audio unlock), and whether default-on sound suits classroom use.

## F01 — Question controls and saved presets

**Status:** Not shipped. The `f01-presets` branch was deleted locally and on GitHub on 2026-09-27 at the owner's request, before any merge. Production never served F01; `main` contains none of its commits. Last branch tip was `5b07738`.

## F04 — Local child profiles

**Status:** Done (2026-09-27)

**Approval scope:** Preview and production. Claude checked the preview (https://bead-bright-n43al3fy9-rafeekasharafs-projects.vercel.app) in the owner's signed-in Chrome before merging.

**Commit:** `012c9ca` — F04: local child profiles (from `0007-F04-profiles.patch`). Fast-forwarded onto `main` from `cadddf4`.

**Deployment:**

- Production: https://bead-bright.vercel.app/practice.html
- Vercel deployment: https://bead-bright-fbc57fi7o-rafeekasharafs-projects.vercel.app

### What changed

- A profile button above the practice area ("🙂 Practicing as Guest · Manage", or the active child's avatar and nickname).
- A Profiles dialog: add a profile (one of 10 animal avatars plus a nickname of up to 20 characters, both required; up to 8 profiles); a new profile becomes active immediately; switch profiles; edit a profile's name and avatar, with Cancel; delete with a two-tap confirm ("Confirm delete"); "Practice without a profile" returns to Guest without deleting anything.
- Profiles are stored only in the browser's `localStorage` on that device (`bead-bright-profiles-v1`, `bead-bright-active-profile-v1`). Nothing is sent anywhere; names are inserted as plain text.
- Profiles do not yet change anything else: the sheet, settings, sound and progress are the same for every profile.
- Service worker cache `bead-bright-v9-profiles`; adds `tests/profiles.cjs`.

### Test results

Ran every test in `tests/README.md` on Node v22.11.0 (Windows), on `012c9ca` before merging:

| Check | Result |
| --- | --- |
| `node --check app.js` / `techniques.js` / `sw.js` / `pwa.js` | Pass |
| `node tests/techniques.cjs` | Pass — 3,520 question sequences |
| `node tests/interactive.cjs` | Pass |
| `node tests/pwa-assets.cjs` | Pass |
| `node tests/mobile-default-view.cjs` | Pass |
| `node tests/profiles.cjs` (new) | Pass |
| `node tests/ui.cjs` | Pass |

Browser checks in Chrome, run on both the preview and production:

| Check | Preview | Production |
| --- | --- | --- |
| Profile bar shows "Practicing as Guest" with no profiles; real click opens the Profiles dialog | Pass | Pass |
| Add with real clicks and typing (🦊 "Test Kid A"): saved, active immediately, bar updates | Pass | Pass |
| Add a second profile; it becomes active | Pass | Pass |
| Saving with no nickname shows "Type a nickname first." | Pass | Pass |
| Switch to another profile: bar updates, dialog closes, both profiles kept | Pass | Pass |
| Edit pre-fills the name and shows "Save changes"; Cancel discards changes | Pass | Pass |
| Edit name and avatar saves in place (🐸 "Test Kid A2") | Pass | Pass |
| Delete: first tap shows "Confirm delete" and removes nothing; second tap removes only that profile | Pass | Pass |
| "Practice without a profile": bar shows Guest, dialog closes, remaining profile kept | Pass | Pass |
| Profiles persist across a reload | Pass | Pass |
| `/sw.js` serves `bead-bright-v9-profiles`; v8 replaced after one reload | — | Pass |
| `/tests/` and `/tests/profiles.cjs` return 404 | — | Pass |
| Production `practice.html`, `app.js`, `sw.js` identical to `012c9ca` | — | Pass |

Test profiles were removed afterwards. The owner's existing profiles on the preview site were backed up before testing and restored exactly; production had none and was left with none.

### Untested — spot-check manually

- Real phone: dialog layout, avatar picker and nickname keyboard at phone width.
- Screen reader behaviour in the Profiles dialog.
- Profiles on an installed home-screen app (storage is per browser/app, so profiles made in the browser may not appear in the installed app).
