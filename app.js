'use strict';
let digit=1, questions=[], revealed=false, sheetLevel="free";
const $=id=>document.getElementById(id);
function randomInt(min,max){return min+Math.floor(Math.random()*(max-min+1));}
function makeQuestion(digits,rows,mode,level){return AbacusTechniques.makeQuestion(digits,rows,mode,level);}
function generate(){const rows=Number($('rows').value),count=Number($('count').value),mode=$('mode').value,level=$('level').value;if(!Number.isInteger(rows)||rows<2||rows>100||!Number.isInteger(count)||count<1||count>30)throw Error('Choose 2–100 rows and 1–30 questions.');questions=Array.from({length:count},()=>makeQuestion(digit,rows,mode,level));sheetLevel=level;revealed=false;$('reveal').textContent='Show answers';$('summary').textContent='';$('error').hidden=true;$('meta').textContent=`${AbacusTechniques.levels[level].name} · ${digit}-digit numbers · ${rows} rows · ${mode==='add'?'Addition':'Addition & subtraction'}`;$('questions').innerHTML=questions.map((q,i)=>`<article class="card" id="card-${i}"><h3>QUESTION ${String(i+1).padStart(2,'0')}</h3><div class="numbers">${q.values.map((v,j)=>`<div class="number"><span class="sign">${j===0?'':v<0?'−':'+'}</span><span>${Math.abs(v)}</span></div>`).join('')}</div><div class="answer"><label for="a-${i}">Answer for question ${i+1}</label><input id="a-${i}" inputmode="numeric" autocomplete="off" placeholder="?" aria-describedby="f-${i}"><p class="feedback" id="f-${i}"></p></div></article>`).join('');}
$('digits').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;digit=Number(b.dataset.digit);for(const item of $('digits').children)item.setAttribute('aria-pressed',String(item===b));});
function updateLevelHelp(){
  const technique=AbacusTechniques.levels[$('level').value];
  $('level-help').textContent=technique.help;
  $('level-example').textContent=technique.example;
  $('level-formula').textContent=technique.formula;
}
$('level').addEventListener('change',()=>{
  updateLevelHelp();
  try { generate(); }
  catch(err) {
    $('level').value=sheetLevel;
    updateLevelHelp();
    $('error').textContent=`Could not change technique. ${err.message} Your previous technique, sheet, and answers have been kept.`;
    $('error').hidden=false;
  }
});
updateLevelHelp();
$('settings').addEventListener('submit',e=>{e.preventDefault();try{generate();}catch(err){$('error').textContent=err.message;$('error').hidden=false;}});
function check(){let correct=0,answered=0;questions.forEach((q,i)=>{const value=$(`a-${i}`).value.trim(),valid=/^\d+$/.test(value),ok=valid&&Number(value)===q.total;if(value)answered++;if(ok)correct++;$(`card-${i}`).className='card'+(value?(ok?' good':' retry'):'');const f=$(`f-${i}`);f.className='feedback '+(ok?'correct':'incorrect');f.textContent=revealed?`Answer: ${q.total}`:!value?'Try this one':ok?'Correct!':'Try again';});$('summary').textContent=correct===questions.length?`All ${correct} correct. Great work!`:`${correct} of ${questions.length} correct${answered<questions.length?` · ${questions.length-answered} to try`:''}`;return {correct,total:questions.length};}
$('check').addEventListener('click',check);
$('reveal').addEventListener('click',()=>{revealed=!revealed;$('reveal').textContent=revealed?'Hide answers':'Show answers';questions.forEach((q,i)=>{$(`f-${i}`).textContent=revealed?`Answer: ${q.total}`:'';$(`f-${i}`).className='feedback';});});
$('questions').addEventListener('input',e=>{if(!e.target.id.startsWith('a-'))return;const i=Number(e.target.id.slice(2));$(`card-${i}`).className='card';if(!revealed)$(`f-${i}`).textContent='';$('summary').textContent='';});
$('questions').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const next=Number(e.target.id.slice(2))+1;if(next<questions.length)$(`a-${next}`).focus();else check();}});
$('print').addEventListener('click',()=>window.print());generate();
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'generate_abacus_practice',description:'Replace the current sheet with new abacus questions using the chosen digits, rows, and operation.',inputSchema:{type:'object',properties:{digits:{type:'integer',minimum:1,maximum:4},rows:{type:'integer',minimum:2,maximum:100},questions:{type:'integer',minimum:1,maximum:30},mode:{type:'string',enum:['add','mixed']},level:{type:'string',enum:['free','direct','five','ten','combined']}},required:['digits','rows','questions','mode'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||!Number.isInteger(input.digits)||input.digits<1||input.digits>4||!Number.isInteger(input.rows)||input.rows<2||input.rows>100||!Number.isInteger(input.questions)||input.questions<1||input.questions>30||!['add','mixed'].includes(input.mode)||(input.level!==undefined&&!Object.hasOwn(AbacusTechniques.levels,input.level)))throw Error('Invalid practice settings');AbacusTechniques.validate(input.digits,input.rows,input.mode,input.level||'free');$('level').value=input.level||'free';updateLevelHelp();digit=input.digits;$('rows').value=input.rows;$('count').value=input.questions;$('mode').value=input.mode;for(const b of $('digits').children)b.setAttribute('aria-pressed',String(Number(b.dataset.digit)===digit));generate();return {digits:digit,rows:input.rows,questions:questions.length,mode:input.mode,level:$('level').value};}})).catch(()=>{});}catch{}}
