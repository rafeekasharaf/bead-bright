const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const nodeCrypto = require('node:crypto');
const {parseHTML} = require('linkedom');
const root = path.resolve(__dirname, '..');
const A = require('../techniques.js');
const {stubDialogs, answerPinPrompts} = require('./pin-helpers.cjs');
const appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

function makeStorage(backing) {
  const store = backing || {};
  return {
    getItem: k => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  };
}

// `visit` is sessionStorage: share it between loads to simulate a reload in the
// same tab; leave it out to simulate closing and reopening the app.
function load(store, visit) {
  const {window, document} = parseHTML(fs.readFileSync(path.join(root, 'practice.html'), 'utf8'));
  for (const select of document.querySelectorAll('select')) {
    let value = select.querySelector('option').value;
    Object.defineProperty(select, 'value', {get: () => value, set: next => { value = next; }});
  }
  window.HTMLElement.prototype.focus = function () {};
  stubDialogs(document);
  const context = {document, window, AbacusTechniques: A, console, localStorage: makeStorage(store)};
  if (visit) context.sessionStorage = makeStorage(visit);
  vm.createContext(context);
  vm.runInContext(appSrc, context);
  return {document, context};
}

const helpers = document => {
  const $ = id => document.getElementById(id);
  const Event = document.defaultView.Event;
  const tap = el => el.dispatchEvent(new Event('click', {bubbles: true}));
  const click = id => tap($(id));
  const pin = value => { $('pin-input').value = value; $('pin-input').dispatchEvent(new Event('input', {bubbles: true})); };
  const pinOpen = () => $('pin-dialog').hasAttribute('open');
  const startAdd = (name, avatarIndex) => {
    click('profile-bar-btn');
    $('profile-name-input').value = name;
    tap($('avatar-picker').children[avatarIndex]);
    click('profile-save-btn');
  };
  const addProfile = (name, avatarIndex, pins) => { startAdd(name, avatarIndex); assert.ok(answerPinPrompts(document, pins), `adding ${name} finishes`); };
  const row = name => Array.from(document.querySelectorAll('.profile-row')).find(r => r.querySelector('.name').textContent === name);
  const selectProfile = name => { click('profile-bar-btn'); tap(row(name).querySelector('.profile-row-select')); };
  const barName = () => $('profile-bar-name').textContent;
  const type = (i, v) => { $('a-' + i).value = v; $('a-' + i).dispatchEvent(new Event('input', {bubbles: true})); };
  return {$, tap, click, pin, pinOpen, startAdd, addProfile, row, selectProfile, barName, type};
};
const profilesIn = store => JSON.parse(store['bead-bright-profiles-v1'] || '[]');
const historyIn = store => JSON.parse(store['bead-bright-history-v1'] || '{}');

// The built-in SHA-256 matches Node's, including multi-block inputs.
{
  const {context} = load({});
  for (const text of ['', 'abc', '1234', 'a'.repeat(55), 'b'.repeat(56), 'c'.repeat(64), 'salt:1234' + 'f'.repeat(90)])
    assert.equal(context.sha256Hex(text), nodeCrypto.createHash('sha256').update(text).digest('hex'), `sha256 of ${text.length} chars`);
}

// First profile: grown-up PIN setup, a one-time recovery code, then the child's PIN.
// PINs are stored only as salted hashes.
{
  const store = {};
  const {document} = load(store);
  const h = helpers(document);
  h.startAdd('Mia', 0);
  assert.equal(h.pinOpen(), true);
  assert.match(h.$('pin-title').textContent, /Set a grown-up PIN/);
  assert.match(h.$('pin-message').textContent, /developer tools/, 'the setup is honest about its limits');
  h.pin('9999');
  assert.match(h.$('pin-hint').textContent, /again/);
  assert.match(h.$('pin-message').textContent, /developer tools/, 'the main message stays put so the pad does not move');
  h.pin('9998');
  assert.match(h.$('pin-error').textContent, /didn’t match/, 'a mismatched confirmation starts again');
  h.pin('9999'); h.pin('9999');
  assert.equal(h.$('pin-recovery').hidden, false);
  assert.match(h.$('pin-recovery-code').textContent, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal(h.$('pin-cancel').hidden, true, 'the recovery code must be acknowledged, not skipped');
  h.click('pin-ack');
  assert.match(h.$('pin-title').textContent, /Choose a PIN for Mia/);
  h.pin('1234'); h.pin('1234');
  assert.equal(h.pinOpen(), false);
  assert.equal(h.barName(), 'Mia');
  const raw = store['bead-bright-profiles-v1'] + store['bead-bright-grownup-v1'];
  assert.equal(/"1234"|"9999"/.test(raw), false, 'PINs are never stored as plain text');
  const mia = profilesIn(store)[0];
  assert.ok(mia.pin.salt && mia.pin.hash.length === 64);

  // The second child goes straight to choosing their own PIN.
  h.startAdd('Leo', 1);
  assert.match(h.$('pin-title').textContent, /Choose a PIN for Leo/);
  h.pin('4321'); h.pin('4321');
  assert.equal(h.barName(), 'Leo');

  // Cancelling while choosing a PIN adds nobody.
  h.startAdd('Ava', 2);
  h.click('pin-cancel');
  assert.equal(profilesIn(store).length, 2);
  assert.equal(h.barName(), 'Leo');
}

// Cancelling the grown-up setup adds nobody either.
{
  const store = {};
  const h = helpers(load(store).document);
  h.startAdd('Mia', 0);
  h.click('pin-cancel');
  assert.equal(h.pinOpen(), false);
  assert.equal(profilesIn(store).length, 0);
  assert.equal(store['bead-bright-grownup-v1'], undefined);
}

// Switching: a wrong PIN does nothing, the child's PIN or the grown-up PIN switches,
// and re-selecting the unlocked child needs no PIN. Guest never needs one.
{
  const store = {};
  const h = helpers(load(store).document);
  h.addProfile('Mia', 0, {child: '1234'});
  h.addProfile('Leo', 1, {child: '4321'});
  h.selectProfile('Mia');
  assert.match(h.$('pin-title').textContent, /Hi Mia! Enter your PIN/);
  h.pin('4321');
  assert.match(h.$('pin-error').textContent, /isn’t right/);
  assert.equal(h.barName(), 'Leo', 'a wrong PIN does not switch');
  h.pin('1234');
  assert.equal(h.barName(), 'Mia');
  h.selectProfile('Mia');
  assert.equal(h.pinOpen(), false, 'the unlocked child opens without a PIN');
  h.selectProfile('Leo');
  h.pin('9999');
  assert.equal(h.barName(), 'Leo', 'the grown-up PIN opens any child');
  h.click('profile-bar-btn');
  h.click('profile-none-btn');
  assert.equal(h.pinOpen(), false);
  assert.equal(h.barName(), 'Practicing as Guest');
  h.selectProfile('Leo');
  assert.equal(h.pinOpen(), true, 'after Guest, the child is locked again');
  h.click('pin-cancel');
  assert.equal(h.barName(), 'Practicing as Guest');
}

// Five wrong tries lock the pad for 30 seconds (then longer); even the right PIN waits.
{
  const store = {};
  const h = helpers(load(store).document);
  h.addProfile('Mia', 0, {child: '1234'});
  h.addProfile('Leo', 1, {child: '4321'});
  h.selectProfile('Mia');
  for (let i = 0; i < 5; i++) h.pin('0000');
  assert.match(h.$('pin-error').textContent, /Too many tries\. Please wait (29|30) seconds/);
  assert.equal(h.$('pin-input').disabled, true);
  assert.ok(Array.from(h.$('pin-pad').children).every(b => b.disabled));
  const miaId = profilesIn(store).find(p => p.name === 'Mia').id;
  const attempts = () => JSON.parse(store['bead-bright-pin-attempts-v1']);
  assert.equal(attempts()[miaId].locks, 1);
  h.pin('1234');
  assert.equal(h.barName(), 'Leo', 'the right PIN is refused while locked');
  // Let the lock expire; the next five wrong tries lock for longer.
  const a = attempts(); a[miaId].lockedUntil = Date.now() - 1; store['bead-bright-pin-attempts-v1'] = JSON.stringify(a);
  h.click('pin-cancel');
  h.selectProfile('Mia');
  assert.equal(h.$('pin-input').disabled, false);
  for (let i = 0; i < 5; i++) h.pin('0000');
  assert.match(h.$('pin-error').textContent, /Please wait (59|60) seconds/, 'the second lock is twice as long');
  const b = attempts(); b[miaId].lockedUntil = Date.now() - 1; store['bead-bright-pin-attempts-v1'] = JSON.stringify(b);
  h.click('pin-cancel');
  h.selectProfile('Mia');
  h.pin('1234');
  assert.equal(h.barName(), 'Mia');
  assert.equal(attempts()[miaId], undefined, 'a correct PIN clears the count');
}

// Reopening the app asks the active child for their PIN again; until then nothing is
// saved and History is hidden. A reload in the same visit does not ask again.
{
  const store = {}, visit = {};
  let h = helpers(load(store, visit).document);
  h.addProfile('Mia', 0, {child: '1234'});
  h.type(0, '5');
  const sessions = () => (historyIn(store)[profilesIn(store)[0].id] || []).length;
  assert.equal(sessions(), 1);

  h = helpers(load(store, visit).document);
  assert.equal(h.pinOpen(), false, 'a reload in the same visit stays unlocked');
  assert.equal(h.$('history-btn').hidden, false);

  h = helpers(load(store).document);
  assert.equal(h.pinOpen(), true, 'reopening asks for the PIN');
  assert.match(h.$('pin-title').textContent, /Hi Mia/);
  assert.equal(h.$('pin-cancel').textContent, 'Practice as Guest');
  assert.equal(h.$('history-btn').hidden, true, 'History stays hidden while locked');
  assert.match(h.$('save-status').textContent, /Enter Mia’s PIN to save/);
  h.type(1, '6');
  assert.equal(sessions(), 1, 'nothing is saved while locked');
  h.pin('1234');
  assert.equal(h.pinOpen(), false);
  assert.equal(h.$('history-btn').hidden, false);
  assert.equal(h.$('save-status').textContent, 'Your answers will be saved to Mia’s history');

  h = helpers(load(store).document);
  h.click('pin-cancel');
  assert.equal(h.barName(), 'Practicing as Guest', 'Practice as Guest leaves the child locked');
  assert.equal(sessions(), 1, 'the child’s history is kept');
}

// Forgot a child's PIN: a grown-up resets it and the child's history is kept.
{
  const store = {};
  const h = helpers(load(store).document);
  h.addProfile('Mia', 0, {child: '1234'});
  h.type(0, '5');
  h.addProfile('Leo', 1, {child: '4321'});
  h.selectProfile('Mia');
  assert.equal(h.$('pin-forgot').hidden, false);
  h.click('pin-forgot');
  assert.match(h.$('pin-title').textContent, /Grown-up PIN/);
  assert.match(h.$('pin-message').textContent, /history is kept/);
  h.pin('1111');
  assert.match(h.$('pin-error').textContent, /isn’t right/);
  h.pin('9999');
  assert.match(h.$('pin-title').textContent, /Choose a PIN for Mia/);
  h.pin('2468'); h.pin('2468');
  assert.equal(h.barName(), 'Mia');
  assert.equal((historyIn(store)[profilesIn(store).find(p => p.name === 'Mia').id] || []).length, 1, 'history kept');
  h.selectProfile('Leo'); h.pin('4321');
  h.selectProfile('Mia'); h.pin('1234');
  assert.equal(h.barName(), 'Leo', 'the old PIN no longer works');
  h.pin('2468');
  assert.equal(h.barName(), 'Mia', 'the new PIN works');
}

// Forgot the grown-up PIN: the recovery code sets a new one and works only once.
{
  const store = {};
  const h = helpers(load(store).document);
  h.startAdd('Mia', 0);
  h.pin('9999'); h.pin('9999');
  const firstCode = h.$('pin-recovery-code').textContent;
  h.click('pin-ack');
  h.pin('1234'); h.pin('1234');
  h.addProfile('Leo', 1, {child: '4321'});

  const reachRecovery = () => { h.selectProfile('Mia'); h.click('pin-forgot'); h.click('pin-forgot'); };
  reachRecovery();
  assert.equal(h.$('pin-code-entry').hidden, false);
  assert.match(h.$('pin-message').textContent, /clearing this site’s data/, 'the last resort is explained');
  h.$('pin-code-input').value = 'AAAA-AAAA'; h.click('pin-code-submit');
  assert.match(h.$('pin-error').textContent, /code isn’t right/);
  h.$('pin-code-input').value = firstCode.toLowerCase().replace('-', ' ');
  h.click('pin-code-submit');
  assert.match(h.$('pin-title').textContent, /Set a grown-up PIN/, 'the code is accepted in any case and spacing');
  h.pin('7777'); h.pin('7777');
  const secondCode = h.$('pin-recovery-code').textContent;
  assert.notEqual(secondCode, firstCode, 'a new recovery code replaces the used one');
  h.click('pin-ack');
  assert.match(h.$('pin-title').textContent, /Choose a PIN for Mia/, 'then Mia gets a new PIN');
  h.pin('1357'); h.pin('1357');
  assert.equal(h.barName(), 'Mia');

  h.selectProfile('Leo'); h.pin('9999');
  assert.match(h.$('pin-error').textContent, /isn’t right/, 'the old grown-up PIN no longer works');
  h.pin('7777');
  assert.equal(h.barName(), 'Leo', 'the new grown-up PIN works');
  reachRecovery();
  h.$('pin-code-input').value = firstCode; h.click('pin-code-submit');
  assert.match(h.$('pin-error').textContent, /code isn’t right/, 'a used recovery code does not work again');
}

// Editing or deleting another child's profile needs their PIN or the grown-up PIN;
// the unlocked child can edit themselves without one.
{
  const store = {};
  const h = helpers(load(store).document);
  h.addProfile('Mia', 0, {child: '1234'});
  h.type(0, '5');
  h.addProfile('Leo', 1, {child: '4321'});
  h.click('profile-bar-btn');
  h.tap(h.row('Leo').querySelector('.profile-row-edit'));
  assert.equal(h.pinOpen(), false, 'Leo edits himself freely');
  assert.equal(h.$('profile-save-btn').textContent, 'Save changes');
  assert.equal(h.$('profile-pin-btn').textContent, 'Change PIN');
  h.click('profile-cancel-edit');

  h.tap(h.row('Mia').querySelector('.profile-row-edit'));
  assert.equal(h.pinOpen(), true, "editing Mia needs Mia's PIN");
  assert.match(h.$('pin-title').textContent, /Enter Mia’s PIN/);
  h.click('pin-cancel');
  assert.equal(h.$('profile-save-btn').textContent, 'Add profile', 'cancelled: not editing');
  h.tap(h.row('Mia').querySelector('.profile-row-edit'));
  h.pin('9999');
  assert.equal(h.$('profile-save-btn').textContent, 'Save changes', 'the grown-up PIN allows editing');
  h.click('profile-cancel-edit');

  const miaId = profilesIn(store).find(p => p.name === 'Mia').id;
  h.tap(h.row('Mia').querySelector('.profile-row-delete'));
  h.tap(h.row('Mia').querySelector('.profile-row-delete'));
  assert.equal(h.pinOpen(), true, "deleting Mia needs Mia's PIN");
  h.pin('0000');
  h.click('pin-cancel');
  assert.equal(profilesIn(store).length, 2, 'not deleted without the PIN');
  assert.ok(historyIn(store)[miaId], "Mia's history is untouched");
  h.tap(h.row('Mia').querySelector('.profile-row-delete'));
  h.tap(h.row('Mia').querySelector('.profile-row-delete'));
  h.pin('1234');
  assert.deepEqual(profilesIn(store).map(p => p.name), ['Leo']);
  assert.equal(historyIn(store)[miaId], undefined, "Mia's history goes with her profile");
  assert.equal(h.barName(), 'Leo');
}

// Profiles made before PINs keep working without one, with a nudge to add one.
{
  const store = {'bead-bright-profiles-v1': JSON.stringify([{id: 'old1', name: 'Sam', avatar: '🐢'}]), 'bead-bright-active-profile-v1': 'old1'};
  const h = helpers(load(store).document);
  assert.equal(h.pinOpen(), false, 'no PIN, no prompt');
  assert.equal(h.barName(), 'Sam');
  assert.equal(h.$('history-btn').hidden, false);
  assert.equal(h.$('pin-nudge').hidden, false);
  assert.equal(h.$('pin-nudge').textContent, '🔒 Add a PIN to protect Sam’s history');
  h.type(0, '5');
  assert.equal((historyIn(store).old1 || []).length, 1, 'still saves');
  h.click('pin-nudge');
  assert.match(h.$('pin-title').textContent, /Set a grown-up PIN/, 'the first PIN sets up the grown-up PIN');
  assert.ok(answerPinPrompts(h.$('pin-dialog').ownerDocument, {child: '8642'}));
  assert.equal(h.$('pin-nudge').hidden, true);
  assert.ok(profilesIn(store)[0].pin.hash);
  const h2 = helpers(load(store).document);
  assert.equal(h2.pinOpen(), true, 'now Sam is asked for a PIN on reopen');
  h2.pin('8642');
  assert.equal(h2.$('history-btn').hidden, false);
}

// The number pad must not move while a child types: the confirm hint and the
// error line each keep their own space whether or not they show text.
{
  const {document} = load({});
  const css = Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('');
  assert.ok(css.includes('.pin-hint{min-height:'), 'the confirm hint reserves its line');
  assert.ok(css.includes('#pin-error{min-height:'), 'the error line reserves its space');
  assert.equal(document.getElementById('pin-error').hidden, false, 'the error line is never hidden, only emptied');
}

console.log('PIN checks passed: SHA-256 matches Node, PINs stored only as salted hashes, grown-up setup with one-time recovery code, cancel adds nobody, wrong PIN never switches, grown-up PIN opens any child, 30s-then-longer lockout, re-ask on reopen but not on same-visit reload, nothing saved while locked, child and grown-up forgot-PIN flows, edit/delete protection, and older profiles without PINs.');
