// Shared helpers for suites that create or switch profiles, which now go through
// the PIN dialog. Linkedom has no native <dialog> behavior, so showModal/close
// are stubbed to toggle the `open` attribute, as a real browser does.
function stubDialogs(document) {
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.showModal = function () { this.setAttribute('open', ''); };
    dialog.close = function () { this.removeAttribute('open'); };
  }
}

// Answer whatever the PIN dialog asks, the way a person would: the grown-up PIN
// for grown-up prompts, "I've written it down" for a new recovery code, and the
// child's PIN otherwise. Stops when the dialog closes or asks for a recovery code.
function answerPinPrompts(document, {child = '1111', grownup = '9999'} = {}) {
  const $ = id => document.getElementById(id);
  const Event = document.defaultView.Event;
  for (let step = 0; step < 12; step++) {
    if (!$('pin-dialog').hasAttribute('open')) return true;
    if (!$('pin-recovery').hidden) { $('pin-ack').dispatchEvent(new Event('click', {bubbles: true})); continue; }
    if (!$('pin-code-entry').hidden) return false;
    const pin = /grown-up/i.test($('pin-title').textContent) ? grownup : child;
    $('pin-input').value = pin;
    $('pin-input').dispatchEvent(new Event('input', {bubbles: true}));
  }
  return !$('pin-dialog').hasAttribute('open');
}

module.exports = {stubDialogs, answerPinPrompts};
