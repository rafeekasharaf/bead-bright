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

console.log('PWA asset checks passed: every precached path exists on disk, both pages are precached, navigate handler keys off the requested path.');
