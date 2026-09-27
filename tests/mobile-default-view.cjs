const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');
const root = path.resolve(__dirname, '..');
const A = require('../techniques.js');
const appSrc = fs.readFileSync(path.join(root, 'practice.html').replace('practice.html', 'app.js'), 'utf8');

function run(matches) {
  const {window, document} = parseHTML(fs.readFileSync(path.join(root, 'practice.html'), 'utf8'));
  for (const select of document.querySelectorAll('select')) {
    let value = select.querySelector('option[selected]')?.value ?? select.querySelector('option').value;
    Object.defineProperty(select, 'value', {get:()=>value, set:next=>{value=next;}});
  }
  window.matchMedia = query => ({matches: query === '(max-width:650px)' ? matches : false});
  const context = vm.createContext({document, window, AbacusTechniques:A, console});
  vm.runInContext(appSrc, context);
  return document;
}

const narrow = run(true);
assert.equal(narrow.getElementById('questions').classList.contains('is-focused'), true, 'narrow screens should default to one-at-a-time view');
assert.equal(narrow.getElementById('focus-nav').hidden, false);
assert.equal(narrow.getElementById('view-toggle').textContent, '📄 Worksheet view', 'toggle button must reflect the active default view');

const wide = run(false);
assert.equal(wide.getElementById('questions').classList.contains('is-focused'), false, 'wider screens should default to worksheet view');
assert.equal(wide.getElementById('focus-nav').hidden, true);
assert.equal(wide.getElementById('view-toggle').textContent, '🧮 One at a time');

console.log('Mobile-default-view checks passed: one-at-a-time is the default under 650px, worksheet view is the default above it, and the toggle button label matches the active view on load.');
