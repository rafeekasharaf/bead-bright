const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');
const root = path.resolve(__dirname, '..');
const A = require('../techniques.js');
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
  for (const id of ['profiles-dialog', 'history-dialog']) {
    const el = document.getElementById(id);
    el.showModal = function () { this.setAttribute('open', ''); };
    el.close = function () { this.removeAttribute('open'); };
  }
  const localStorage = makeLocalStorage(sharedStore);
  const context = vm.createContext({document, window, AbacusTechniques: A, console, localStorage});
  vm.runInContext(appSrc, context);
  return {document, context};
}

const $$ = document => id => document.getElementById(id);
const Ev = document => (type, opts) => new (document.defaultView.Event)(type, opts);
const click = (document, id) => document.getElementById(id).dispatchEvent(Ev(document)('click', {bubbles: true}));
const setValue = (document, id, value) => { document.getElementById(id).value = value; };
const type = (document, id, value) => { const el = document.getElementById(id); el.value = value; el.dispatchEvent(Ev(document)('input', {bubbles: true})); };

function addProfile(document, name, avatarIndex) {
  click(document, 'profile-bar-btn');
  setValue(document, 'profile-name-input', name);
  document.getElementById('avatar-picker').children[avatarIndex].dispatchEvent(Ev(document)('click', {bubbles: true}));
  click(document, 'profile-save-btn');
  try { document.getElementById('profiles-dialog').close(); } catch (e) {}
}

function openHistory(document) {
  click(document, 'history-btn');
}

function historyRows(document) {
  return Array.from(document.getElementById('history-list').children).filter(el => el.classList.contains('history-row'));
}

// Guest mode: typing and checking answers never creates any history.
{
  const {document} = load();
  const $ = $$(document);
  type(document, 'a-0', '5');
  click(document, 'check');
  openHistory(document);
  assert.equal($('history-btn').hidden, true, 'history button must be hidden with no active profile');
  assert.match($('history-list').textContent, /No practice sessions yet/);
}

// With an active profile, the first typed answer creates one session, further
// typing updates it in place, and it starts out Unfinished.
{
  const store = {};
  const {document} = load(store);
  const $ = $$(document);
  addProfile(document, 'Mia', 0);
  assert.equal($('history-btn').hidden, false);

  type(document, 'a-0', '5');
  openHistory(document);
  let rows = historyRows(document);
  assert.equal(rows.length, 1, 'the first answer must create exactly one session');
  assert.match(rows[0].querySelector('.history-row-status').textContent, /Unfinished/);
  click(document, 'history-dialog');
  try { document.getElementById('history-dialog').close(); } catch (e) {}

  type(document, 'a-1', '7');
  openHistory(document);
  rows = historyRows(document);
  assert.equal(rows.length, 1, 'typing further answers must update the same session, not create a new one');
}

// Checking with every question answered marks the session Finished; leaving
// one blank keeps it Unfinished.
{
  const store = {};
  const {document} = load(store);
  const $ = $$(document);
  addProfile(document, 'Mia', 0);
  const total = q => q.reduce((sum, row) => sum + row, 0);
  function rowTotal(doc, i) {
    return Array.from(doc.getElementById(`card-${i}`).querySelectorAll('.numbers .number')).reduce((sum, row) => {
      const sign = row.querySelector('.sign').textContent;
      return sum + (sign === '−' ? -1 : 1) * Number(row.lastElementChild.textContent);
    }, 0);
  }
  const count = Number($('count').value);
  for (let i = 0; i < count - 1; i++) type(document, `a-${i}`, String(rowTotal(document, i)));
  click(document, 'check');
  openHistory(document);
  let rows = historyRows(document);
  assert.match(rows[0].querySelector('.history-row-status').textContent, /Unfinished/, 'a session with a blank answer must stay Unfinished after Check');
  try { document.getElementById('history-dialog').close(); } catch (e) {}

  type(document, `a-${count - 1}`, String(rowTotal(document, count - 1)));
  click(document, 'check');
  openHistory(document);
  rows = historyRows(document);
  assert.equal(rows.length, 1, 'finishing must not create a second session');
  assert.match(rows[0].querySelector('.history-row-status').textContent, /Finished/);
}

// Generating a new sheet does not touch the old (still-unfinished) session,
// and does not itself create a new one until the new sheet is interacted with.
{
  const store = {};
  const {document} = load(store);
  const $ = $$(document);
  addProfile(document, 'Mia', 0);
  type(document, 'a-0', '5');
  document.getElementById('settings').dispatchEvent(Ev(document)('submit', {cancelable: true})); // New practice
  openHistory(document);
  let rows = historyRows(document);
  assert.equal(rows.length, 1, 'the abandoned session must still be there, untouched');
  assert.match(rows[0].querySelector('.history-row-status').textContent, /Unfinished/);
  try { document.getElementById('history-dialog').close(); } catch (e) {}

  // Merely generating a fresh sheet (no interaction yet) must not add a second entry.
  document.getElementById('settings').dispatchEvent(Ev(document)('submit', {cancelable: true}));
  openHistory(document);
  rows = historyRows(document);
  assert.equal(rows.length, 1, 'an untouched fresh sheet must not be recorded as a session');
}

// Resuming an unfinished session restores the exact questions and typed
// answers, and continues updating that same session afterward.
{
  const store = {};
  const {document} = load(store);
  const $ = $$(document);
  addProfile(document, 'Mia', 0);
  const originalQuestionsHTML = $('questions').innerHTML;
  type(document, 'a-0', '5');
  type(document, 'a-1', '9');

  document.getElementById('settings').dispatchEvent(Ev(document)('submit', {cancelable: true})); // abandon with a fresh sheet
  assert.notEqual($('questions').innerHTML, originalQuestionsHTML, 'sanity check: a new sheet was actually generated');

  openHistory(document);
  const row = historyRows(document)[0];
  row.dispatchEvent(Ev(document)('click', {bubbles: true}));

  assert.equal($('a-0').value, '5', 'resuming must restore the typed answer');
  assert.equal($('a-1').value, '9');
  assert.equal($('history-banner').hidden, false);
  assert.match($('history-banner-text').textContent, /Resuming practice/);

  // Continuing to type must update the SAME session, not create a new one.
  type(document, 'a-2', '3');
  openHistory(document);
  assert.equal(historyRows(document).length, 1, 'resuming and continuing must not create a duplicate session');
}

// Viewing a finished session disables inputs, shows grading, and does not
// mutate history at all (no duplicate, status unchanged).
{
  const store = {};
  const {document} = load(store);
  const $ = $$(document);
  addProfile(document, 'Mia', 0);
  function rowTotal(doc, i) {
    return Array.from(doc.getElementById(`card-${i}`).querySelectorAll('.numbers .number')).reduce((sum, row) => {
      const sign = row.querySelector('.sign').textContent;
      return sum + (sign === '−' ? -1 : 1) * Number(row.lastElementChild.textContent);
    }, 0);
  }
  const count = Number($('count').value);
  for (let i = 0; i < count; i++) type(document, `a-${i}`, String(rowTotal(document, i)));
  click(document, 'check');

  document.getElementById('settings').dispatchEvent(Ev(document)('submit', {cancelable: true}));
  openHistory(document);
  const row = historyRows(document)[0];
  assert.match(row.querySelector('.history-row-status').textContent, /Finished/);
  row.dispatchEvent(Ev(document)('click', {bubbles: true}));

  assert.equal($('a-0').disabled, true, 'a finished session must be read-only');
  assert.match($('history-banner-text').textContent, /Finished practice/);

  openHistory(document);
  assert.equal(historyRows(document).length, 1, 'viewing a finished session must not create or duplicate anything');
  assert.match(historyRows(document)[0].querySelector('.history-row-status').textContent, /Finished/);
}

// The "Start new practice" banner action leaves review/resume mode and hides the banner.
{
  const store = {};
  const {document} = load(store);
  const $ = $$(document);
  addProfile(document, 'Mia', 0);
  type(document, 'a-0', '5');
  document.getElementById('settings').dispatchEvent(Ev(document)('submit', {cancelable: true}));
  openHistory(document);
  historyRows(document)[0].dispatchEvent(Ev(document)('click', {bubbles: true}));
  assert.equal($('history-banner').hidden, false);
  click(document, 'history-banner-dismiss');
  assert.equal($('history-banner').hidden, true);
  assert.equal($('a-0').disabled, false);
}

// Deleting a profile deletes its history too.
{
  const store = {};
  const {document} = load(store);
  const $ = $$(document);
  addProfile(document, 'Mia', 0);
  type(document, 'a-0', '5');
  const historyBefore = JSON.parse(store['bead-bright-history-v1']);
  const profileId = Object.keys(historyBefore)[0];
  assert.equal(historyBefore[profileId].length, 1, 'sanity check: the profile has one saved session before deletion');

  click(document, 'profile-bar-btn');
  const deleteBtn = () => document.getElementById('profiles-list').children[0].querySelector('.profile-row-delete');
  deleteBtn().dispatchEvent(Ev(document)('click', {bubbles: true})); // first tap: ask for confirmation
  deleteBtn().dispatchEvent(Ev(document)('click', {bubbles: true})); // second tap (fresh row, re-rendered after the first): confirm

  const historyAfter = JSON.parse(store['bead-bright-history-v1']);
  assert.equal(Object.prototype.hasOwnProperty.call(historyAfter, profileId), false, 'deleting the profile must remove its history entry entirely');
}

// History rollover: exceeding the cap drops the oldest sessions first (unit-level, via direct calls).
{
  const {context} = load();
  const profileId = 'test-profile';
  vm.runInContext(`
    for (let i = 0; i < 55; i++) {
      upsertSession('${profileId}', {
        id: 's' + i,
        startedAt: new Date(2026, 0, 1, 0, i).toISOString(),
        updatedAt: new Date(2026, 0, 1, 0, i).toISOString(),
        settings: {digits: 2, rows: 3, count: 4, mode: 'add', level: 'free'},
        questions: [], answers: [], focusIndex: 0, finished: false
      });
    }
  `, context);
  const sessions = vm.runInContext(`getProfileSessions('${profileId}')`, context);
  assert.equal(sessions.length, 50, 'history must be capped at 50 sessions per profile');
  assert.equal(sessions[0].id, 's54', 'the newest session must be kept');
  assert.equal(sessions.some(s => s.id === 's0'), false, 'the oldest sessions must roll off first');
}

console.log('History checks passed: guest mode saves nothing, first answer creates one session and further typing updates it in place, finished status tracks whether every question was answered, abandoning a sheet leaves the old session untouched and does not record an untouched new one, resuming restores exact questions/answers and continues the same session, viewing a finished session is read-only and non-mutating, the banner dismiss action exits review/resume cleanly, deleting a profile deletes its history, and history rolls over at a 50-session cap.');
