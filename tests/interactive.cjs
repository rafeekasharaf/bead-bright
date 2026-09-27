const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');
const root = path.resolve(__dirname, '..');
const {window, document} = parseHTML(fs.readFileSync(path.join(root, 'practice.html'), 'utf8'));
for (const select of document.querySelectorAll('select')) {
  let value = select.querySelector('option[selected]')?.value ?? select.querySelector('option').value;
  Object.defineProperty(select, 'value', {get:()=>value, set:next=>{value=next;}});
}
// Linkedom does not track focus either; record the last focused element's id.
let focusedId = null;
window.HTMLElement.prototype.focus = function () { focusedId = this.id; };
const A = require('../techniques.js');
const context = vm.createContext({document, window, AbacusTechniques:A, console});
vm.runInContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), context);
const $ = id=>document.getElementById(id);
const submit = ()=>$('settings').dispatchEvent(new window.Event('submit', {cancelable:true}));

// A fresh sheet builds a working mini-abacus and a zeroed progress indicator.
assert.match($('progress-label').textContent,/of \d+ answered/);
assert.equal($('progress-fill').style.width,'0%');
assert.ok($('mini-abacus').children.length>0,'mini abacus should render rod/bead markup');

// Typing an answer updates the progress indicator.
$('a-0').value='5';
$('a-0').dispatchEvent(new window.Event('input',{bubbles:true}));
assert.match($('progress-label').textContent,/^1 of /);

// Switching to focused (one-at-a-time) view shows exactly one card and a nav.
$('view-toggle').dispatchEvent(new window.Event('click'));
assert.equal($('questions').classList.contains('is-focused'),true);
assert.equal($('focus-nav').hidden,false);
let visible=Array.from($('questions').children).filter(c=>c.classList.contains('is-current'));
assert.equal(visible.length,1);
assert.equal(visible[0].id,'card-0');
assert.equal($('focus-prev').disabled,true);

$('focus-next').dispatchEvent(new window.Event('click'));
visible=Array.from($('questions').children).filter(c=>c.classList.contains('is-current'));
assert.equal(visible[0].id,'card-1');
assert.equal($('focus-prev').disabled,false);

$('focus-prev').dispatchEvent(new window.Event('click'));
visible=Array.from($('questions').children).filter(c=>c.classList.contains('is-current'));
assert.equal(visible[0].id,'card-0');

// Switching digit length rebuilds the abacus without throwing and without touching the sheet.
const priorSheet=$('questions').innerHTML;
$('digits').children[2].dispatchEvent(new window.Event('click',{bubbles:true}));
assert.equal($('questions').innerHTML,priorSheet);

// Generating a new sheet keeps the current view mode but resets to question 1.
submit();
assert.equal($('questions').classList.contains('is-focused'),true);
assert.equal($('focus-nav').hidden,false);
visible=Array.from($('questions').children).filter(c=>c.classList.contains('is-current'));
assert.equal(visible.length,1);
assert.equal(visible[0].id,'card-0');
assert.equal($('focus-prev').disabled,true);

// The mini abacus has enough rods for the largest total, so answers are never truncated.
const rods=()=>$('mini-abacus').querySelectorAll('[data-kind="upper"]').length;
const longest=()=>Math.max(...Array.from(document.querySelectorAll('.card')).map(card=>String(Array.from(card.querySelectorAll('.number')).reduce((sum,row)=>sum+(row.querySelector('.sign').textContent==='−'?-1:1)*Number(row.lastElementChild.textContent),0)).length));
$('digits').children[0].dispatchEvent(new window.Event('click',{bubbles:true}));
$('rows').value='20';
submit();
assert.ok(longest()>1,'20 one-digit rows should produce a multi-digit total');
assert.equal(rods(),longest());
$('a-0').value='12345';
$('a-0').dispatchEvent(new window.Event('input',{bubbles:true}));
assert.equal(rods(),5);
assert.equal($('mini-abacus').querySelectorAll('.bead.active').length,1+2+3+4+1);

// Cards must stay visible once a pop/shake animation replaces the entry animation.
const css=document.querySelector('style').textContent;
assert.doesNotMatch(css,/\.card\{[^}]*opacity:0/,'base .card rule must not hide cards');

// In one-at-a-time view, typing an answer must not hide the current card before Next/Check is pressed.
$('digits').children[0].dispatchEvent(new window.Event('click',{bubbles:true}));
$('rows').value='5';
submit();
if(!$('questions').classList.contains('is-focused'))$('view-toggle').dispatchEvent(new window.Event('click'));
assert.equal($('questions').classList.contains('is-focused'),true);
assert.equal($('questions').children[0].classList.contains('is-current'),true);
$('a-0').value='4';
$('a-0').dispatchEvent(new window.Event('input',{bubbles:true}));
assert.equal($('questions').children[0].classList.contains('is-current'),true,'current card must stay visible while typing, before Next/Check');
if($('questions').classList.contains('is-focused'))$('view-toggle').dispatchEvent(new window.Event('click')); // back to worksheet view for any later tests

// Sound is on by default when no preference has been saved.
assert.equal($('sound-toggle').getAttribute('aria-pressed'),'true','sound must default to on');

// Finishing a sheet in one-at-a-time view shows a results panel with correct
// counts and lets you jump straight to a specific question from it.
$('digits').children[0].dispatchEvent(new window.Event('click',{bubbles:true}));
$('rows').value='5';$('count').value='3';
submit();
if(!$('questions').classList.contains('is-focused'))$('view-toggle').dispatchEvent(new window.Event('click'));
// Answer q0 correctly, q1 wrong, leave q2 blank, then walk to the end and finish.
const correctTotal=i=>{
  const nums=Array.from($(`card-${i}`).querySelectorAll('.numbers .number')).map(n=>{
    const sign=n.querySelector('.sign').textContent;
    return (sign==='−'?-1:1)*Number(n.lastElementChild.textContent);
  });
  return nums.reduce((a,b)=>a+b,0);
};
$('a-0').value=String(correctTotal(0));
$('a-0').dispatchEvent(new window.Event('input',{bubbles:true}));
$('focus-next').dispatchEvent(new window.Event('click'));
$('a-1').value=String(correctTotal(1)+1); // deliberately wrong
$('a-1').dispatchEvent(new window.Event('input',{bubbles:true}));
$('focus-next').dispatchEvent(new window.Event('click'));
// question 3 (index 2) left blank
assert.equal($('focus-next').classList.contains('is-finish'),true,'last question\'s Next button must switch to the Finish style');
assert.equal($('focus-next').querySelector('.nav-icon').textContent,'','Finish must not show an icon');
$('focus-next').dispatchEvent(new window.Event('click')); // Finish
assert.equal($('focus-results').hidden,false,'finishing must show the results panel');
assert.match($('results-summary').textContent,/1 correct/);
assert.match($('results-summary').textContent,/1 to fix/);
assert.match($('results-summary').textContent,/1 blank/);
const chips=Array.from($('results-grid').children);
assert.equal(chips.length,3);
assert.equal(chips[0].classList.contains('correct'),true);
assert.equal(chips[1].classList.contains('wrong'),true);
assert.equal(chips[2].classList.contains('blank'),true);
// While the panel is open, "See results" is redundant and hidden, and focus
// moves to the labelled summary so screen readers announce the results.
assert.equal($('focus-results-btn').hidden,true,'See results must be hidden while the results panel is open');
assert.equal($('focus-nav').hidden,true);
assert.equal($('focus-results').getAttribute('role'),'region');
assert.equal($('focus-results').getAttribute('aria-labelledby'),'results-summary');
assert.equal(focusedId,'results-summary','opening results must move focus to the summary');
// Clicking a chip jumps straight to that question and closes the results panel.
chips[1].dispatchEvent(new window.Event('click',{bubbles:true}));
assert.equal($('focus-results').hidden,true);
assert.equal($('questions').children[1].classList.contains('is-current'),true);
assert.equal($('focus-results-btn').hidden,false,'See results must reappear once the panel is closed');
// Reopening shows the panel with focus on the summary; Keep practicing returns focus to the current answer.
$('focus-results-btn').dispatchEvent(new window.Event('click'));
assert.equal($('focus-results').hidden,false);
assert.equal($('focus-results-btn').hidden,true);
assert.equal(focusedId,'results-summary');
$('results-continue').dispatchEvent(new window.Event('click'));
assert.equal($('focus-results').hidden,true);
assert.equal($('focus-results-btn').hidden,false);
assert.equal(focusedId,'a-1','Keep practicing must return focus to the current question');

// New practice in the results box starts a fresh sheet with the same settings,
// stays in one-at-a-time view, and puts the cursor in the first answer.
$('focus-results-btn').dispatchEvent(new window.Event('click'));
assert.equal($('results-new').textContent,'New practice');
assert.equal($('focus-results').contains($('results-new')),true,'the button lives in the results box');
const finishedSheet=$('questions').innerHTML;
$('results-new').dispatchEvent(new window.Event('click'));
assert.equal($('focus-results').hidden,true,'the results box closes');
assert.equal($('focus-results-btn').hidden,true,'a fresh sheet has no results yet');
assert.notEqual($('questions').innerHTML,finishedSheet,'a fresh sheet is built');
assert.equal($('questions').children.length,3,'same number of questions as before');
assert.equal($('a-0').value,'','answers are cleared');
assert.equal($('questions').classList.contains('is-focused'),true,'stays in one-at-a-time view');
assert.equal($('questions').classList.contains('showing-results'),false);
assert.equal($('questions').children[0].classList.contains('is-current'),true,'back to question 1');
assert.equal($('focus-nav').hidden,false);
assert.equal($('summary').textContent,'');
assert.equal(focusedId,'a-0','the cursor goes to the first answer');
if($('questions').classList.contains('is-focused'))$('view-toggle').dispatchEvent(new window.Event('click'));

console.log('Interactive checks passed: progress indicator, mini abacus render and sizing, one-at-a-time navigation, digit-length rebuild, view reset on new sheet, visible checked cards, card stays visible while typing in focus view, sound defaults on, finish results panel, chip navigation and New practice from the results box.');
