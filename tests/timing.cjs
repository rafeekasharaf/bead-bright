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

// This suite needs a real Date.now to mock deterministically, and a real
// setTimeout/clearTimeout so the countdown's own scheduled check can be
// exercised end-to-end (not just its logic in isolation).
function load(sharedStore) {
  const {window, document} = parseHTML(fs.readFileSync(path.join(root, 'practice.html'), 'utf8'));
  for (const select of document.querySelectorAll('select')) {
    let value = select.querySelector('option[selected]')?.value ?? select.querySelector('option').value;
    Object.defineProperty(select, 'value', {get:()=>value, set:next=>{value=next;}});
  }
  window.HTMLElement.prototype.focus = function () {};
  stubDialogs(document);
  const localStorage = makeLocalStorage(sharedStore);
  const context = vm.createContext({document, window, AbacusTechniques: A, console, localStorage, setTimeout, clearTimeout});
  vm.runInContext(appSrc, context);
  return {document, context};
}

const $$ = document => id => document.getElementById(id);
const Ev = document => (type, opts) => new (document.defaultView.Event)(type, opts);
const click = (document, id) => document.getElementById(id).dispatchEvent(Ev(document)('click', {bubbles: true}));
const setValue = (document, id, value) => { document.getElementById(id).value = value; };
const selectValue = (document, id, value) => { const el = document.getElementById(id); el.value = value; el.dispatchEvent(Ev(document)('change', {bubbles: true})); };
const type = (document, id, value) => { const el = document.getElementById(id); el.value = value; el.dispatchEvent(Ev(document)('input', {bubbles: true})); };
const setFakeNow = (context, ms) => vm.runInContext(`Date.now = () => ${ms}`, context);
const timerState = context => vm.runInContext('timerState', context);
const elapsed = context => vm.runInContext('elapsedMs()', context);

function addProfile(document, name, avatarIndex) {
  click(document, 'profile-bar-btn');
  setValue(document, 'profile-name-input', name);
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

// Off (the default) shows no timing control and leaves check()'s summary untouched.
{
  const {document} = load();
  const $ = $$(document);
  assert.equal($('timing-control').hidden, true, 'timing control must be hidden when Off, the default');
  type(document, 'a-0', String(rowTotal(document, 0)));
  click(document, 'check');
  assert.doesNotMatch($('summary').textContent, /took/, 'untimed practice must not mention a time');
}

// Count up: starts running immediately on a fresh sheet, pausing genuinely
// stops elapsed time from accruing, and resuming continues from the paused
// total rather than restarting or including the paused gap.
{
  const {document, context} = load();
  const $ = $$(document);
  setFakeNow(context, 1_000_000);
  selectValue(document, 'timing-mode', 'countup');
  document.getElementById('settings').dispatchEvent(Ev(document)('submit', {cancelable: true}));
  assert.equal($('timing-control').hidden, false);
  assert.equal(timerState(context).running, true, 'timing starts running as soon as a timed sheet is generated');
  assert.equal($('timing-status').textContent, '⏱ Timing on');

  setFakeNow(context, 1_005_000); // +5s
  assert.equal(elapsed(context), 5000);

  click(document, 'timing-pause-btn');
  assert.equal(timerState(context).running, false);
  assert.equal($('timing-status').textContent, '⏱ Timing paused');
  assert.equal($('timing-pause-btn').textContent, 'Resume');

  setFakeNow(context, 1_060_000); // +55s while paused — must not count
  assert.equal(elapsed(context), 5000, 'elapsed time must not advance while paused');

  click(document, 'timing-pause-btn'); // resume
  assert.equal(timerState(context).running, true);
  setFakeNow(context, 1_063_000); // +3s running
  assert.equal(elapsed(context), 8000, 'only active (non-paused) time counts');

  for (let i = 0; i < Number($('count').value); i++) type(document, `a-${i}`, String(rowTotal(document, i)));
  click(document, 'check');
  assert.match($('summary').textContent, /You took 8s\./);
  assert.equal(timerState(context).finished, true);
  assert.equal($('timing-status').textContent, '⏱ Finished in 8s');
  assert.equal($('timing-pause-btn').hidden, true, 'no pause/resume once finished');

  setFakeNow(context, 1_200_000); // long after finishing
  assert.equal(elapsed(context), 8000, 'a finished timer must not keep accruing time');
}

// Resuming after a simulated reload continues accurately: the gap while the
// tab was closed must not be counted, and time only resumes on an explicit tap.
{
  const store = {};
  let {document, context} = load(store);
  let $ = $$(document);
  addProfile(document, 'Mia', 0);
  setFakeNow(context, 2_000_000);
  selectValue(document, 'timing-mode', 'countup');
  document.getElementById('settings').dispatchEvent(Ev(document)('submit', {cancelable: true}));
  setFakeNow(context, 2_012_000); // 12s of real practice
  type(document, 'a-0', String(rowTotal(document, 0))); // creates + syncs the session

  // Simulate closing the tab: a fresh load, long after, against the same storage.
  // Reopening asks for the child's PIN again, same as a real closed-then-reopened tab.
  ({document, context} = load(store));
  $ = $$(document);
  setFakeNow(context, 9_000_000); // a huge gap since the last sync
  answerPinPrompts(document);
  click(document, 'history-btn');
  const row = document.getElementById('history-list').querySelector('.history-row');
  row.dispatchEvent(Ev(document)('click', {bubbles: true}));

  assert.equal(timerState(context).mode, 'countup');
  assert.equal(timerState(context).running, false, 'resuming must start paused, not silently resume the clock');
  assert.equal(elapsed(context), 12000, 'only the actual practice time must be preserved, not the closed-tab gap');
  assert.equal($('timing-status').textContent, '⏱ Timing paused');

  click(document, 'timing-pause-btn'); // explicit resume
  assert.equal(timerState(context).running, true);
  setFakeNow(context, 9_004_000); // +4s of new practice
  assert.equal(elapsed(context), 16000, '12s carried over plus 4s of new practice, nothing from the gap');
}

// Countdown: reaching the limit auto-finishes the sheet, disables further
// input, and records the actual elapsed time even though not every question
// was necessarily answered.
{
  const {document, context} = load();
  const $ = $$(document);
  setFakeNow(context, 3_000_000);
  selectValue(document, 'timing-mode', 'countdown');
  assert.equal($('countdown-minutes-field').hidden, false, 'the minutes field must appear once Countdown is chosen');
  setValue(document, 'countdown-minutes', '1');
  document.getElementById('settings').dispatchEvent(Ev(document)('submit', {cancelable: true}));
  assert.equal(timerState(context).limitMs, 60000);

  type(document, 'a-0', String(rowTotal(document, 0))); // answer only the first question
  setFakeNow(context, 3_061_000); // past the 1-minute limit
  type(document, 'a-1', '0'); // any interaction past the limit must trigger time's up

  assert.equal(timerState(context).finished, true);
  assert.match($('summary').textContent, /Time's up!/);
  assert.equal($('a-0').disabled, true, 'inputs must be locked once time is up');
  assert.equal($('a-2').disabled, true);
}

// History shows the recorded duration for a finished timed session.
{
  const store = {};
  const {document, context} = load(store);
  const $ = $$(document);
  addProfile(document, 'Leo', 1);
  setFakeNow(context, 5_000_000);
  selectValue(document, 'timing-mode', 'countup');
  document.getElementById('settings').dispatchEvent(Ev(document)('submit', {cancelable: true}));
  setFakeNow(context, 5_042_000); // 42s
  for (let i = 0; i < Number($('count').value); i++) type(document, `a-${i}`, String(rowTotal(document, i)));
  click(document, 'check');

  click(document, 'history-btn');
  const detail = document.getElementById('history-list').querySelector('.history-row-detail').textContent;
  assert.match(detail, /⏱ 42s/, 'the history list must show the recorded duration for a timed session');
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// The countdown's own scheduled timer (not just the opportunistic check on an
// input event) fires the auto-finish for real, with no interaction at all.
async function testRealScheduledCountdown() {
  const {document, context} = load();
  const $ = $$(document);
  setFakeNow(context, 6_000_000);
  selectValue(document, 'timing-mode', 'countdown');
  setValue(document, 'countdown-minutes', '1');
  document.getElementById('settings').dispatchEvent(Ev(document)('submit', {cancelable: true}));
  // Collapse the limit to a few milliseconds so the real scheduled check
  // fires almost immediately, rather than idling a real test for 60 seconds.
  // elapsedMs() is timestamp-based (mocked Date.now), so the *check* still
  // sees real elapsed time — only the wait for the real setTimeout to fire
  // is short.
  vm.runInContext('timerState.limitMs = 20', context);
  vm.runInContext('scheduleCountdownCheck()', context);
  setFakeNow(context, 6_000_021); // past the (collapsed) limit once the timer fires
  await delay(80);
  assert.equal(timerState(context).finished, true, 'the scheduled timeout must auto-finish with no user interaction at all');
  assert.match($('summary').textContent, /Time's up!/);
}

// The finish message puts a full stop before the time when the result does not
// already end with one.
{
  const {document, context} = load();
  const $ = $$(document);
  setFakeNow(context, 7_000_000);
  selectValue(document, 'timing-mode', 'countup');
  setValue(document, 'count', '3');
  document.getElementById('settings').dispatchEvent(Ev(document)('submit', {cancelable: true}));
  setFakeNow(context, 7_003_000);
  for (let i = 0; i < 3; i++) type(document, `a-${i}`, String(rowTotal(document, i) + (i === 0 ? 0 : 1)));
  click(document, 'check');
  assert.equal($('summary').textContent, '1 of 3 correct. You took 3s.');
  setValue(document, 'count', '2');
  document.getElementById('settings').dispatchEvent(Ev(document)('submit', {cancelable: true}));
  setFakeNow(context, 7_005_000);
  for (let i = 0; i < 2; i++) type(document, `a-${i}`, String(rowTotal(document, i)));
  click(document, 'check');
  assert.equal($('summary').textContent, 'All 2 correct. Great work! You took 2s.', 'no doubled punctuation');
  // Time's up with blanks: the "to try" part also gets its full stop.
  setFakeNow(context, 7_100_000);
  selectValue(document, 'timing-mode', 'countdown');
  setValue(document, 'countdown-minutes', '1');
  setValue(document, 'count', '3');
  document.getElementById('settings').dispatchEvent(Ev(document)('submit', {cancelable: true}));
  type(document, 'a-0', String(rowTotal(document, 0)));
  setFakeNow(context, 7_161_000);
  vm.runInContext('checkCountdownExpiry()', context);
  assert.equal($('summary').textContent, "⏰ Time's up! 1 of 3 correct · 2 to try. You took 1m 1s.");
}

// A countdown shows a gentle "1 minute left" note once a minute remains; never
// for count-up or a 1-minute countdown, with a paused variant, cleared on finish.
{
  const {document, context} = load();
  const $ = $$(document);
  const status = () => $('timing-status').textContent;
  const lastMinute = () => $('timing-control').classList.contains('last-minute');
  setFakeNow(context, 8_000_000);
  selectValue(document, 'timing-mode', 'countdown');
  setValue(document, 'countdown-minutes', '3');
  setValue(document, 'count', '2');
  document.getElementById('settings').dispatchEvent(Ev(document)('submit', {cancelable: true}));
  assert.equal(status(), '⏱ Timing on');
  setFakeNow(context, 8_119_000); // 61s left
  type(document, 'a-0', '1');
  assert.equal(status(), '⏱ Timing on', 'not yet: more than a minute left');
  assert.equal(lastMinute(), false);
  setFakeNow(context, 8_121_000); // 59s left
  type(document, 'a-0', '2');
  assert.equal(status(), '⏳ 1 minute left');
  assert.equal(lastMinute(), true);
  assert.equal($('timing-status').getAttribute('aria-live'), 'polite', 'announced once to screen readers');
  click(document, 'timing-pause-btn');
  assert.equal(status(), '⏳ 1 minute left · paused');
  click(document, 'timing-pause-btn');
  assert.equal(status(), '⏳ 1 minute left');
  type(document, 'a-1', '3');
  click(document, 'check');
  assert.match(status(), /^⏱ Finished in /);
  assert.equal(lastMinute(), false, 'the note clears when the sheet is finished');

  // A 1-minute countdown would show the note from the very start, so it never shows.
  setFakeNow(context, 9_000_000);
  setValue(document, 'countdown-minutes', '1');
  document.getElementById('settings').dispatchEvent(Ev(document)('submit', {cancelable: true}));
  setFakeNow(context, 9_030_000);
  type(document, 'a-0', '1');
  assert.equal(status(), '⏱ Timing on');
  assert.equal(lastMinute(), false);

  // Count up never shows it.
  setFakeNow(context, 9_100_000);
  selectValue(document, 'timing-mode', 'countup');
  document.getElementById('settings').dispatchEvent(Ev(document)('submit', {cancelable: true}));
  setFakeNow(context, 9_900_000);
  type(document, 'a-0', '1');
  assert.equal(status(), '⏱ Timing on');
}

// The note's own scheduled timer shows it with no interaction at all.
async function testRealScheduledNote() {
  const {document, context} = load();
  const $ = $$(document);
  setFakeNow(context, 10_000_000);
  selectValue(document, 'timing-mode', 'countdown');
  setValue(document, 'countdown-minutes', '2');
  document.getElementById('settings').dispatchEvent(Ev(document)('submit', {cancelable: true}));
  // Put the clock 20ms before the one-minute mark and reschedule, so the real
  // warning timeout fires almost at once instead of after a real minute.
  setFakeNow(context, 10_059_980);
  vm.runInContext('scheduleCountdownCheck()', context);
  assert.equal($('timing-status').textContent, '⏱ Timing on');
  setFakeNow(context, 10_060_100);
  await delay(120);
  assert.equal($('timing-status').textContent, '⏳ 1 minute left', 'the scheduled note fires with no user interaction');
  vm.runInContext('clearCountdownTimeout()', context);
}

testRealScheduledCountdown().then(testRealScheduledNote).then(() => {
  console.log('Timing checks passed: full stop before the time, "1 minute left" note (scheduled and on interaction, paused variant, cleared on finish, never for count-up or 1-minute countdowns), Off leaves untimed practice unaffected, Count up starts immediately and pause genuinely stops elapsed time from accruing, resuming after a simulated reload preserves only real practice time and starts paused, a countdown reaching its limit auto-finishes and locks the sheet even with unanswered questions (both via user interaction and via the real scheduled timer with no interaction at all), and history shows the recorded duration for timed sessions.');
}).catch(err => { console.error(err); process.exitCode = 1; });
