'use strict';
let digit=1, questions=[], revealed=false, sheetLevel="free";
const $=id=>document.getElementById(id);
const SOUND_KEY='bead-bright-sound-on';
let soundOn=false, audioCtx=null;
try{soundOn=localStorage.getItem(SOUND_KEY)==='1';}catch{}
function setSoundButton(){const b=$('sound-toggle');if(!b)return;b.textContent=soundOn?'🔊':'🔇';b.setAttribute('aria-pressed',String(soundOn));b.setAttribute('aria-label',soundOn?'Turn practice sounds off':'Turn practice sounds on');}
setSoundButton();
$('sound-toggle')?.addEventListener('click',()=>{soundOn=!soundOn;try{localStorage.setItem(SOUND_KEY,soundOn?'1':'0');}catch{}setSoundButton();if(soundOn)playTone([[440,0.08]]);});
function playTone(notes,peak){
  if(!soundOn)return;
  peak=peak||0.18;
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    let t=audioCtx.currentTime;
    notes.forEach(([freq,dur])=>{
      const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
      osc.type='sine';osc.frequency.setValueAtTime(freq,t);
      gain.gain.setValueAtTime(0.0001,t);
      gain.gain.exponentialRampToValueAtTime(peak,t+0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t);osc.stop(t+dur+0.02);
      t+=dur*0.85;
    });
  }catch{}
}
function celebrate(){
  try{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;}catch(e){}
  try{
    const anchor=$('actions')||document.body;
    const colors=['#ffd166','#7cd6c0','#f2a6c9','#a3c4ff','#2655df'];
    for(let i=0;i<24;i++){
      const p=document.createElement('div');
      p.className='confetti-piece';
      p.style.left=Math.random()*100+'%';
      p.style.background=colors[i%colors.length];
      p.style.animationDuration=(1.1+Math.random()*0.8)+'s';
      p.style.animationDelay=(Math.random()*0.25)+'s';
      anchor.appendChild(p);
      p.addEventListener('animationend',()=>p.remove());
    }
  }catch(e){}
}
function retrigger(el,cls){el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);}

// --- progress indicator ---
function updateProgress(){
  try{
    const total=questions.length;
    let answered=0;
    for(let i=0;i<total;i++){const el=$(`a-${i}`);if(el&&el.value.trim())answered++;}
    $('progress-label').textContent=total?`${answered} of ${total} answered`:'0 of 0 answered';
    $('progress-fill').style.width=total?Math.round(answered/total*100)+'%':'0%';
  }catch(e){}
}

// --- decorative mini abacus (non-graded, purely visual) ---
// Enough rods for the largest total on the sheet (4 digits x 100 rows tops out at 999,900).
const MAX_RODS=7;
let abacusRods=[];
function abacusSize(){return Math.max(digit,...questions.map(q=>String(q.total).length));}
function buildAbacusBase(n){
  try{
    n=Math.max(1,Math.min(MAX_RODS,n||1));
    const svg=$('mini-abacus');if(!svg)return;
    const rodW=60,padTop=14,barY=46,h=100,totalW=n*rodW+40;
    svg.setAttribute('viewBox',`0 0 ${totalW} ${h}`);
    let html=`<line x1="4" y1="${barY}" x2="${totalW-4}" y2="${barY}" stroke="#172645" stroke-width="3"/>`;
    abacusRods=[];
    for(let i=0;i<n;i++){
      const cx=20+rodW*i+rodW/2;
      html+=`<line x1="${cx}" y1="${padTop-6}" x2="${cx}" y2="${h-8}" stroke="#cbd5e8" stroke-width="4"/>`;
      html+=`<rect class="bead" data-rod="${i}" data-kind="upper" x="${cx-9}" y="16" width="18" height="18" rx="4" fill="#2655df"/>`;
      for(let k=0;k<4;k++){
        const restY=barY+12+k*13;
        html+=`<rect class="bead" data-rod="${i}" data-kind="lower" data-k="${k}" x="${cx-9}" y="${restY}" width="18" height="9" rx="3" fill="#a534d6"/>`;
      }
    }
    svg.innerHTML=html;
    for(let i=0;i<n;i++){
      abacusRods.push({
        upper:svg.querySelector(`[data-rod="${i}"][data-kind="upper"]`),
        lowers:[0,1,2,3].map(k=>svg.querySelector(`[data-rod="${i}"][data-kind="lower"][data-k="${k}"]`))
      });
    }
  }catch(e){}
}
function updateAbacusBeads(raw){
  try{
    const num=Math.max(0,Math.trunc(Math.abs(Number(raw))||0));
    if(String(num).length>abacusRods.length)buildAbacusBase(String(num).length);
    const n=abacusRods.length;if(!n)return;
    const digitsStr=String(num).padStart(n,'0').slice(-n);
    for(let i=0;i<n;i++){
      const d=Number(digitsStr[i])||0,rod=abacusRods[i];if(!rod)continue;
      if(rod.upper)rod.upper.classList.toggle('active',d>=5);
      const lowerCount=d%5;
      rod.lowers.forEach((el,k)=>{if(el)el.classList.toggle('active',k<lowerCount);});
    }
  }catch(e){}
}

// --- worksheet / one-at-a-time view ---
let viewMode='sheet', focusIndex=0;
function applyView(){
  try{
    const q=$('questions'),nav=$('focus-nav');if(!q||!nav)return;
    const total=questions.length;
    if(viewMode==='focus'&&total>0){
      q.classList.add('is-focused');nav.hidden=false;
      if(focusIndex>=total)focusIndex=total-1;
      if(focusIndex<0)focusIndex=0;
      Array.from(q.children).forEach((card,i)=>card.classList.toggle('is-current',i===focusIndex));
      $('focus-position').textContent=`Question ${focusIndex+1} of ${total}`;
      $('focus-prev').disabled=focusIndex===0;
      $('focus-next').textContent=focusIndex===total-1?'Finish ✔':'Next ▶';
    } else {
      q.classList.remove('is-focused');nav.hidden=true;
    }
  }catch(e){}
}
function goToQuestion(i){focusIndex=i;applyView();const input=$(`a-${i}`);if(input)input.focus();}
$('view-toggle')?.addEventListener('click',()=>{
  viewMode=viewMode==='sheet'?'focus':'sheet';
  $('view-toggle').setAttribute('aria-pressed',String(viewMode==='focus'));
  $('view-toggle').textContent=viewMode==='focus'?'📄 Worksheet view':'🧮 One at a time';
  focusIndex=0;applyView();
});
$('focus-prev')?.addEventListener('click',()=>{if(focusIndex>0)goToQuestion(focusIndex-1);});
$('focus-next')?.addEventListener('click',()=>{
  if(focusIndex<questions.length-1)goToQuestion(focusIndex+1);
  else{check();try{$('summary').scrollIntoView({behavior:'smooth',block:'nearest'});}catch(e){}}
});
function randomInt(min,max){return min+Math.floor(Math.random()*(max-min+1));}
function makeQuestion(digits,rows,mode,level){return AbacusTechniques.makeQuestion(digits,rows,mode,level);}
function generate(){const rows=Number($('rows').value),count=Number($('count').value),mode=$('mode').value,level=$('level').value;if(!Number.isInteger(rows)||rows<2||rows>100||!Number.isInteger(count)||count<1||count>30)throw Error("Let's choose 2–100 rows and 1–30 questions, then we'll build your sheet.");questions=Array.from({length:count},()=>makeQuestion(digit,rows,mode,level));sheetLevel=level;revealed=false;$('reveal').textContent='Show answers';$('summary').textContent='';$('error').hidden=true;$('meta').textContent=`${AbacusTechniques.levels[level].name} · ${digit}-digit numbers · ${rows} rows · ${mode==='add'?'Addition':'Addition & subtraction'}`;$('questions').innerHTML=questions.map((q,i)=>`<article class="card" id="card-${i}" style="animation-delay:${Math.min(i,10)*45}ms"><h3>QUESTION ${String(i+1).padStart(2,'0')}</h3><div class="numbers">${q.values.map((v,j)=>`<div class="number"><span class="sign">${j===0?'':v<0?'−':'+'}</span><span>${Math.abs(v)}</span></div>`).join('')}</div><div class="answer"><label for="a-${i}">Answer for question ${i+1}</label><input id="a-${i}" inputmode="numeric" autocomplete="off" placeholder="?" aria-describedby="f-${i}"><p class="feedback" id="f-${i}"></p></div></article>`).join('');focusIndex=0;buildAbacusBase(abacusSize());updateAbacusBeads(0);updateProgress();applyView();}
$('digits').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;digit=Number(b.dataset.digit);for(const item of $('digits').children)item.setAttribute('aria-pressed',String(item===b));buildAbacusBase(abacusSize());updateAbacusBeads(0);});
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
    $('error').textContent=`Hmm, that didn't work. ${err.message} Good news — your previous technique, sheet, and answers have been kept safe.`;
    $('error').hidden=false;
  }
});
updateLevelHelp();
$('settings').addEventListener('submit',e=>{e.preventDefault();try{generate();}catch(err){$('error').textContent=err.message;$('error').hidden=false;}});
function check(){let correct=0,answered=0;questions.forEach((q,i)=>{const value=$(`a-${i}`).value.trim(),valid=/^\d+$/.test(value),ok=valid&&Number(value)===q.total;if(value)answered++;if(ok)correct++;const card=$(`card-${i}`);card.className='card'+(value?(ok?' good':' retry'):'');if(value)retrigger(card,ok?'pop':'shake');const f=$(`f-${i}`);f.className='feedback '+(ok?'correct':'incorrect');f.textContent=revealed?`Answer: ${q.total}`:!value?'Try this one':ok?'Correct!':'Try again';});$('summary').textContent=correct===questions.length?`All ${correct} correct. Great work!`:`${correct} of ${questions.length} correct${answered<questions.length?` · ${questions.length-answered} to try`:''}`;if(answered>0){if(correct===questions.length){playTone([[523,0.12],[659,0.12],[784,0.18]]);celebrate();}else if(correct<answered){playTone([[300,0.14]]);}}updateProgress();applyView();return {correct,total:questions.length};}
$('check').addEventListener('click',check);
$('reveal').addEventListener('click',()=>{revealed=!revealed;$('reveal').textContent=revealed?'Hide answers':'Show answers';questions.forEach((q,i)=>{$(`f-${i}`).textContent=revealed?`Answer: ${q.total}`:'';$(`f-${i}`).className='feedback';});});
$('questions').addEventListener('input',e=>{if(!e.target.id.startsWith('a-'))return;const i=Number(e.target.id.slice(2));$(`card-${i}`).className='card';if(!revealed)$(`f-${i}`).textContent='';$('summary').textContent='';updateAbacusBeads(e.target.value);updateProgress();if(e.target.value.trim())playTone([[880,0.045]],0.09);});
$('questions').addEventListener('focusin',e=>{if(e.target.matches&&e.target.matches('.answer input'))updateAbacusBeads(e.target.value);});
$('questions').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const next=Number(e.target.id.slice(2))+1;if(next<questions.length){if(viewMode==='focus')goToQuestion(next);else $(`a-${next}`).focus();}else check();}});
$('print').addEventListener('click',()=>window.print());generate();
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'generate_abacus_practice',description:'Replace the current sheet with new abacus questions using the chosen digits, rows, and operation.',inputSchema:{type:'object',properties:{digits:{type:'integer',minimum:1,maximum:4},rows:{type:'integer',minimum:2,maximum:100},questions:{type:'integer',minimum:1,maximum:30},mode:{type:'string',enum:['add','mixed']},level:{type:'string',enum:['free','direct','five','ten','combined']}},required:['digits','rows','questions','mode'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||!Number.isInteger(input.digits)||input.digits<1||input.digits>4||!Number.isInteger(input.rows)||input.rows<2||input.rows>100||!Number.isInteger(input.questions)||input.questions<1||input.questions>30||!['add','mixed'].includes(input.mode)||(input.level!==undefined&&!Object.hasOwn(AbacusTechniques.levels,input.level)))throw Error('Invalid practice settings');AbacusTechniques.validate(input.digits,input.rows,input.mode,input.level||'free');$('level').value=input.level||'free';updateLevelHelp();digit=input.digits;$('rows').value=input.rows;$('count').value=input.questions;$('mode').value=input.mode;for(const b of $('digits').children)b.setAttribute('aria-pressed',String(Number(b.dataset.digit)===digit));generate();return {digits:digit,rows:input.rows,questions:questions.length,mode:input.mode,level:$('level').value};}})).catch(()=>{});}catch{}}
