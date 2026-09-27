const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');
const root = path.resolve(__dirname, '..');
const A = require('../techniques.js');
const {stubDialogs, answerPinPrompts} = require('./pin-helpers.cjs');
const appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

function makeLocalStorage(backingStore) {
  const store = backingStore || {};
  return {
    getItem: k => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  };
}

function load(sharedStore) {
  const {window, document} = parseHTML(fs.readFileSync(path.join(root, 'practice.html'), 'utf8'));
  for (const select of document.querySelectorAll('select')) {
    let value = select.querySelector('option[selected]')?.value ?? select.querySelector('option').value;
    Object.defineProperty(select, 'value', {get:()=>value, set:next=>{value=next;}});
  }
  window.HTMLElement.prototype.focus = function () {};
  stubDialogs(document);
  const localStorage = makeLocalStorage(sharedStore);
  const context = vm.createContext({document, window, AbacusTechniques: A, console, localStorage});
  vm.runInContext(appSrc, context);
  return {document, context};
}

const $$ = document => id => document.getElementById(id);
const Ev = document => (type, opts) => new (document.defaultView.Event)(type, opts);
const click = (document, id) => document.getElementById(id).dispatchEvent(Ev(document)('click', {bubbles: true}));
const type = (document, id, value) => { const el = document.getElementById(id); el.value = value; el.dispatchEvent(Ev(document)('input', {bubbles: true})); };

function addProfile(document, name, avatarIndex) {
  click(document, 'profile-bar-btn');
  document.getElementById('profile-name-input').value = name;
  document.getElementById('avatar-picker').children[avatarIndex].dispatchEvent(Ev(document)('click', {bubbles: true}));
  click(document, 'profile-save-btn');
  answerPinPrompts(document);
  try { document.getElementById('profiles-dialog').close(); } catch (e) {}
}

function rowTotal(document, i) {
  return Array.from(document.getElementById(`card-${i}`).querySelectorAll('.numbers .number')).reduce((sum, row) => {
    const sign = row.querySelector('.sign').textContent;
    return sum + (sign === '−' ? -1 : 1) * Number(row.lastElementChild.textContent);
  }, 0);
}

function questionSignature(document, i) {
  // A stable fingerprint of a card's actual numbers, to prove a retried
  // question is the exact original, not a freshly generated one that just
  // happens to share the same settings.
  return Array.from(document.getElementById(`card-${i}`).querySelectorAll('.numbers .number span:last-child'))
    .map(el => el.textContent).join(',');
}

// The retry button stays hidden before finishing, and once finished with
// every answer correct there is nothing to retry.
{
  const {document} = load();
  const $ = $$(document);
  type(document, 'a-0', String(rowTotal(document, 0)));
  assert.equal($('retry-mistakes-btn').hidden, true, 'must stay hidden before the sheet is finished');
  for (let i = 0; i < Number($('count').value); i++) type(document, `a-${i}`, String(rowTotal(document, i)));
  click(document, 'check');
  assert.equal($('retry-mistakes-btn').hidden, true, 'an all-correct finish has nothing to retry');
}

// Finishing with some wrong/blank shows the button with an accurate count,
// and retrying reuses the exact original questions, not fresh ones.
{
  const {document} = load();
  const $ = $$(document);
  const count = Number($('count').value);
  const signaturesBefore = Array.from({length: count}, (_, i) => questionSignature(document, i));
  type(document, 'a-0', String(rowTotal(document, 0))); // correct
  for (let i = 1; i < count; i++) type(document, `a-${i}`, String(rowTotal(document, i) + 1)); // the rest wrong
  click(document, 'check');
  assert.equal($('retry-mistakes-btn').hidden, false);
  assert.equal($('retry-mistakes-btn').textContent, `Retry the ${count - 1} you missed`);

  click(document, 'retry-mistakes-btn');
  assert.equal($('questions').children.length, count - 1, 'the retry sheet has exactly the missed questions');
  const signaturesAfter = Array.from({length: count - 1}, (_, i) => questionSignature(document, i));
  assert.deepEqual(signaturesAfter, signaturesBefore.slice(1), 'retried questions must be the exact originals (index 0 dropped, the rest in order), not newly generated ones');
  assert.equal($('a-0').value, '', 'the retry sheet starts unanswered');
  assert.equal($('retry-mistakes-btn').hidden, true, 'a brand-new unfinished sheet has no retry button yet');
  // Retrying never changes the child's settings: the next New practice is full size.
  assert.equal(Number($('count').value), count, '"Number of questions" is unchanged by a retry');
  document.getElementById('settings').dispatchEvent(Ev(document)('submit', {cancelable: true}));
  assert.equal($('questions').children.length, count, 'the next New practice has the full number of questions');
}

// Retrying from the results box's own button behaves the same way.
{
  const {document, context} = load();
  const $ = $$(document);
  vm.runInContext("viewMode='focus';applyView();", context);
  const count = Number($('count').value);
  for (let i = 0; i < count; i++) type(document, `a-${i}`, String(rowTotal(document, i) + (i < 2 ? 1 : 0)));
  click(document, 'check');
  assert.equal($('focus-results').hidden, false);
  assert.equal($('results-retry').hidden, false);
  assert.equal($('results-retry').textContent, 'Retry the 2 you missed');
  click(document, 'results-retry');
  assert.equal($('focus-results').hidden, true, 'the results box closes');
  assert.equal($('questions').children.length, 2);
  assert.equal(Number($('count').value), count, 'settings unchanged');
  click(document, 'results-new');
}

// A retry sheet, once touched, gets its own history entry tagged as a retry
// of the original session.
{
  const store = {};
  const {document} = load(store);
  const $ = $$(document);
  addProfile(document, 'Mia', 0);
  const count = Number($('count').value);
  type(document, 'a-0', String(rowTotal(document, 0))); // correct
  for (let i = 1; i < count; i++) type(document, `a-${i}`, String(rowTotal(document, i) + 1)); // the rest wrong
  click(document, 'check');
  const profileId = store['bead-bright-active-profile-v1'];
  const originalSessionId = JSON.parse(store['bead-bright-history-v1'])[profileId][0].id;

  click(document, 'retry-mistakes-btn');
  type(document, 'a-0', '1'); // touch the retry sheet so it gets saved

  const sessions = JSON.parse(store['bead-bright-history-v1'])[profileId];
  assert.equal(sessions.length, 2, 'the retry sheet must get its own history entry once touched');
  const retrySession = sessions.find(s => s.id !== originalSessionId);
  assert.equal(retrySession.retryOf, originalSessionId, 'the new session must be tagged with the session it retries');

  click(document, 'history-btn');
  const details = Array.from(document.getElementById('history-list').querySelectorAll('.history-row-detail')).map(el => el.textContent);
  assert.ok(details.some(t => t.startsWith('↩ Retry ·')), 'the history list must show a retry badge for the retried session');
}

// Retrying also works from a reopened, read-only finished session in history
// (no live currentSessionId at that point), and still tags correctly.
{
  const store = {};
  const {document} = load(store);
  const $ = $$(document);
  addProfile(document, 'Leo', 1);
  const count = Number($('count').value);
  type(document, 'a-0', String(rowTotal(document, 0) + 1)); // wrong
  for (let i = 1; i < count; i++) type(document, `a-${i}`, String(rowTotal(document, i)));
  click(document, 'check'); // finishes with exactly one wrong
  const profileId = store['bead-bright-active-profile-v1'];
  const originalSessionId = JSON.parse(store['bead-bright-history-v1'])[profileId][0].id;

  document.getElementById('settings').dispatchEvent(Ev(document)('submit', {cancelable: true})); // navigate away
  click(document, 'history-btn');
  document.getElementById('history-list').querySelector('.history-row').dispatchEvent(Ev(document)('click', {bubbles: true}));
  assert.equal($('a-0').disabled, true, 'sanity check: this reopened as a read-only review');
  assert.equal($('retry-mistakes-btn').hidden, false, 'a reviewed finished session with a mistake must offer retry');

  click(document, 'retry-mistakes-btn');
  assert.equal($('a-0').disabled, false, 'the retry sheet must be freshly editable, not still read-only');
  type(document, 'a-0', '1');

  const sessions = JSON.parse(store['bead-bright-history-v1'])[profileId];
  const retrySession = sessions.find(s => s.id !== originalSessionId);
  assert.equal(retrySession.retryOf, originalSessionId, 'retrying from a reopened history session must still tag the original');
}

console.log('Retry checks passed: the button stays hidden until finished and hides again when nothing was missed, an eligible finish shows an accurate missed-count label, retrying reuses the exact original questions (not freshly generated ones) leaving them unanswered, a touched retry sheet gets its own history entry tagged with the session it retries and shows a badge in the history list, retrying works identically from a reopened read-only finished session and from the results box, and never changes the Number of questions setting.');
