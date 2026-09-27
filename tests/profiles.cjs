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
  return document;
}

const $$ = document => id => document.getElementById(id);
const click = (document, id) => document.getElementById(id).dispatchEvent(new (document.defaultView.Event)('click', {bubbles: true}));
const setValue = (document, id, value) => { document.getElementById(id).value = value; };

// With no profiles saved, the bar shows the guest state and the list is empty.
{
  const document = load();
  const $ = $$(document);
  assert.equal($('profile-bar-avatar').textContent, '🙂');
  assert.equal($('profile-bar-name').textContent, 'Practicing as Guest');
  click(document, 'profile-bar-btn');
  assert.equal($('profiles-dialog').hasAttribute('open'), true);
  assert.equal($('profiles-list').children.length, 0);
}

// Adding a profile requires both a nickname and an avatar; a new profile
// becomes active immediately, updates the bar, and persists across a reload.
{
  const store = {};
  let document = load(store);
  let $ = $$(document);
  click(document, 'profile-bar-btn');

  click(document, 'profile-save-btn');
  assert.equal($('profile-error').hidden, false, 'saving with no name or avatar must show an error');
  assert.match($('profile-error').textContent, /nickname/i);

  setValue(document, 'profile-name-input', 'Mia');
  click(document, 'profile-save-btn');
  assert.match($('profile-error').textContent, /avatar/i, 'a name with no avatar must still be rejected');

  document.getElementById('avatar-picker').children[0].dispatchEvent(new (document.defaultView.Event)('click', {bubbles: true})); // fox
  click(document, 'profile-save-btn');
  answerPinPrompts(document);
  assert.equal($('profile-error').hidden, true);
  assert.equal($('profiles-list').children.length, 1);
  assert.equal($('profile-bar-name').textContent, 'Mia', 'the new profile must become active immediately');
  assert.equal($('profile-bar-avatar').textContent, '🦊');
  assert.equal($('profile-name-input').value, '', 'the form clears after a successful add');

  // Reload against the same storage: the profile and active selection survive.
  document = load(store);
  $ = $$(document);
  assert.equal($('profile-bar-name').textContent, 'Mia', 'the active profile must survive a reload');
  click(document, 'profile-bar-btn');
  assert.equal($('profiles-list').children.length, 1, 'the saved profile must survive a reload');
  assert.equal($('profiles-list').children[0].classList.contains('is-active'), true);
}

// A second profile can be added, switching between them updates the bar, and
// "practice without a profile" clears the active selection without deleting anyone.
{
  const store = {};
  let document = load(store);
  let $ = $$(document);
  function addProfile(doc, name, avatarIndex) {
    click(doc, 'profile-bar-btn');
    setValue(doc, 'profile-name-input', name);
    doc.getElementById('avatar-picker').children[avatarIndex].dispatchEvent(new (doc.defaultView.Event)('click', {bubbles: true}));
    click(doc, 'profile-save-btn');
    answerPinPrompts(doc);
  }
  addProfile(document, 'Mia', 0);
  addProfile(document, 'Leo', 3); // unicorn
  assert.equal($('profile-bar-name').textContent, 'Leo', 'the most recently added profile is active');
  assert.equal($('profiles-list').children.length, 2);

  // Switch back to the first profile.
  const rows = Array.from($('profiles-list').children);
  const miaRow = rows.find(r => r.querySelector('.name').textContent === 'Mia');
  miaRow.querySelector('.profile-row-select').dispatchEvent(new (document.defaultView.Event)('click', {bubbles: true}));
  answerPinPrompts(document);
  assert.equal($('profile-bar-name').textContent, 'Mia');
  assert.equal($('profiles-dialog').hasAttribute('open'), false, 'selecting a profile closes the dialog');

  click(document, 'profile-bar-btn');
  click(document, 'profile-none-btn');
  assert.equal($('profile-bar-name').textContent, 'Practicing as Guest');
  assert.equal($('profiles-dialog').hasAttribute('open'), false);
  click(document, 'profile-bar-btn');
  assert.equal($('profiles-list').children.length, 2, 'practicing as guest must not delete anyone');
  assert.equal(Array.from($('profiles-list').children).some(r => r.classList.contains('is-active')), false);
}

// Editing a profile updates its name/avatar in place without creating a new one.
{
  const store = {};
  let document = load(store);
  let $ = $$(document);
  click(document, 'profile-bar-btn');
  setValue(document, 'profile-name-input', 'Mia');
  document.getElementById('avatar-picker').children[0].dispatchEvent(new (document.defaultView.Event)('click', {bubbles: true}));
  click(document, 'profile-save-btn');
  answerPinPrompts(document);

  const row = $('profiles-list').children[0];
  row.querySelector('.profile-row-edit').dispatchEvent(new (document.defaultView.Event)('click', {bubbles: true}));
  assert.equal($('profile-name-input').value, 'Mia');
  assert.equal($('profile-save-btn').textContent, 'Save changes');
  assert.equal($('profile-cancel-edit').hidden, false);

  setValue(document, 'profile-name-input', 'Mia Rose');
  click(document, 'profile-save-btn');
  assert.equal($('profiles-list').children.length, 1, 'editing must not create a second profile');
  assert.equal($('profiles-list').children[0].querySelector('.name').textContent, 'Mia Rose');
  assert.equal($('profile-bar-name').textContent, 'Mia Rose', 'the bar must reflect the rename immediately');
  assert.equal($('profile-save-btn').textContent, 'Add profile', 'the form returns to add-mode after saving an edit');

  // Cancelling an edit discards changes and restores add-mode.
  row.querySelector('.profile-row-edit').dispatchEvent(new (document.defaultView.Event)('click', {bubbles: true}));
  setValue(document, 'profile-name-input', 'Discarded');
  click(document, 'profile-cancel-edit');
  assert.equal($('profile-name-input').value, '');
  assert.equal($('profile-save-btn').textContent, 'Add profile');
  assert.equal($('profiles-list').children[0].querySelector('.name').textContent, 'Mia Rose', 'a cancelled edit must not persist');
}

// Deleting requires a confirming second tap, only removes the one profile, and
// clears the active selection if the deleted profile was the active one.
{
  const store = {};
  let document = load(store);
  let $ = $$(document);
  function addProfile(doc, name, avatarIndex) {
    click(doc, 'profile-bar-btn');
    setValue(doc, 'profile-name-input', name);
    doc.getElementById('avatar-picker').children[avatarIndex].dispatchEvent(new (doc.defaultView.Event)('click', {bubbles: true}));
    click(doc, 'profile-save-btn');
    answerPinPrompts(doc);
  }
  addProfile(document, 'Mia', 0);
  addProfile(document, 'Leo', 3);
  assert.equal($('profile-bar-name').textContent, 'Leo');

  const rows = () => Array.from($('profiles-list').children);
  const leoRow = () => rows().find(r => r.querySelector('.name').textContent === 'Leo');
  leoRow().querySelector('.profile-row-delete').dispatchEvent(new (document.defaultView.Event)('click', {bubbles: true}));
  assert.equal(leoRow().querySelector('.profile-row-delete').classList.contains('confirming'), true, 'first tap must ask for confirmation, not delete immediately');
  assert.equal(rows().length, 2, 'nothing is deleted until the confirming tap');

  leoRow().querySelector('.profile-row-delete').dispatchEvent(new (document.defaultView.Event)('click', {bubbles: true}));
  assert.equal(rows().length, 1, 'the second tap deletes the profile');
  assert.equal(rows()[0].querySelector('.name').textContent, 'Mia', 'the other profile must be untouched');
  assert.equal($('profile-bar-name').textContent, 'Practicing as Guest', 'deleting the active profile clears the active selection');

  // Reload to confirm the deletion (and the guest state) persisted, not just in-memory.
  document = load(store);
  $ = $$(document);
  assert.equal($('profile-bar-name').textContent, 'Practicing as Guest');
  click(document, 'profile-bar-btn');
  assert.equal($('profiles-list').children.length, 1);
}

console.log('Profile checks passed: guest default, add requires name+avatar and activates immediately, persistence across reload, switch and guest mode leave profiles intact, edit-in-place with cancel, two-tap delete only removes the one profile and clears active selection when needed.');
