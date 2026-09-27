const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const assetsMatch = sw.match(/const ASSETS = (\[[^\]]*\]);/);
assert.ok(assetsMatch, 'sw.js must define a const ASSETS array');
const assets = JSON.parse(assetsMatch[1].replace(/'/g, '"'));

const missing = assets.filter(p => p !== '/' && !fs.existsSync(path.join(root, p)));
assert.deepEqual(missing, [], `sw.js precaches paths with no matching file on disk: ${missing.join(', ')}`);

// Both real pages must be precached, or an offline visit to either one breaks.
assert.ok(assets.includes('/index.html'), 'the landing page must be precached');
assert.ok(assets.includes('/practice.html'), 'the practice page must be precached');

// The navigate handler must resolve a request for each real page from its own
// cache entry, not silently fall back to index.html while online.
assert.match(sw, /caches\.match\(path\)/, 'navigate handler must look up the requested path, not a hard-coded page');

// Installed apps still starting at "/" must land on the practice tool; browser
// visitors must stay on the landing page. Run the landing page's first inline
// script (before any other script) with stubbed display modes.
const vm = require('node:vm');
const landing = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const firstScript = landing.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(firstScript && landing.indexOf(firstScript[0]) < landing.indexOf('<style'), 'standalone redirect must run before the page renders');
const redirectFor = ({standaloneMedia, iosStandalone}) => {
  let target = null;
  vm.runInNewContext(firstScript[1], {
    window: {matchMedia: query => ({matches: standaloneMedia && query === '(display-mode: standalone)'})},
    navigator: {standalone: iosStandalone},
    location: {replace: url => { target = url; }},
  });
  return target;
};
assert.equal(redirectFor({standaloneMedia: true, iosStandalone: undefined}), '/practice.html');
assert.equal(redirectFor({standaloneMedia: false, iosStandalone: true}), '/practice.html');
assert.equal(redirectFor({standaloneMedia: false, iosStandalone: false}), null);
assert.equal(redirectFor({standaloneMedia: false, iosStandalone: undefined}), null);

console.log('PWA asset checks passed: every precached path exists on disk, both pages are precached, navigate handler keys off the requested path, installed app skips the landing page.');
