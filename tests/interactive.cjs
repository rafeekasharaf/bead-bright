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

console.log('Interactive checks passed: progress indicator, mini abacus render and sizing, one-at-a-time navigation, digit-length rebuild, view reset on new sheet, visible checked cards, card stays visible while typing in focus view.');
