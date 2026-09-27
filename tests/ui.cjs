const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');
const root = path.resolve(__dirname, '..');
const {window, document} = parseHTML(fs.readFileSync(path.join(root, 'practice.html'), 'utf8'));
// Linkedom does not implement HTMLSelectElement.value assignment. Supply only
// that browser behavior; generation and event listeners remain production code.
for (const select of document.querySelectorAll('select')) {
  let value = select.querySelector('option[selected]')?.value ?? select.querySelector('option').value;
  Object.defineProperty(select, 'value', {get:()=>value, set:next=>{value=next;}});
}
const A = require('../techniques.js');
const context = vm.createContext({document, window, AbacusTechniques:A, console});
vm.runInContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), context);
const $ = id=>document.getElementById(id);
const change = value=>{ $('level').value=value; $('level').dispatchEvent(new window.Event('change')); };
const submit = ()=>$('settings').dispatchEvent(new window.Event('submit', {cancelable:true}));

assert.match($('meta').textContent,/All techniques/);
$('a-0').value='123';
change('five');
assert.match($('meta').textContent,/Small friends/);
assert.equal($('a-0').value,'');
assert.match($('level-example').textContent,/4 \+ 3 = 7/);
assert.match($('level-formula').textContent,/4 \+ 5 − 2 = 7/);
assert.equal($('error').hidden,true);

change('ten');
assert.match($('meta').textContent,/Big friends/);
assert.match($('level-formula').textContent,/8 \+ 10 − 6 = 12/);
$('a-0').value='42';
const priorSheet=$('questions').innerHTML, priorMeta=$('meta').textContent;
$('rows').value='10';
change('five');
assert.equal($('level').value,'ten');
assert.equal($('questions').innerHTML,priorSheet);
assert.equal($('a-0').value,'42');
assert.equal($('meta').textContent,priorMeta);
assert.match($('level-example').textContent,/8 \+ 4 = 12/);
assert.equal($('error').hidden,false);
assert.match($('error').textContent,/previous technique, sheet, and answers have been kept/);

$('rows').value='5';
change('combined');
assert.match($('meta').textContent,/Combined friends/);
assert.match($('level-formula').textContent,/5 \+ 10 − 5 \+ 1 = 11/);
assert.equal($('error').hidden,true);
$('count').value='0';
const combinedSheet=$('questions').innerHTML;
change('direct');
assert.equal($('level').value,'combined');
assert.equal($('questions').innerHTML,combinedSheet);
$('count').value='6';
submit();
assert.equal($('error').hidden,true);

for(const [value, technique] of Object.entries(A.levels)) {
  assert.equal(document.querySelector(`option[value="${value}"]`).textContent,technique.name);
}
assert.equal($('meta').getAttribute('role'),'status');
assert.match(document.querySelector('label[for="level"]').textContent,/Practice technique/);
console.log('UI checks passed: technique switching, examples, answer reset, atomic failure recovery, labels and announcements.');
