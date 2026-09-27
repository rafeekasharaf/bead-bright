# Feature status

| ID  | Feature                  | Status |
| --- | ------------------------ | ------ |
| U00 | Practice technique guide | Done   |

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
