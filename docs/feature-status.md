# Feature status

| ID  | Feature                  | Status |
| --- | ------------------------ | ------ |
| U00 | Practice technique guide | Done   |
| Fxx | Operator fix and fun theme | Done |

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
