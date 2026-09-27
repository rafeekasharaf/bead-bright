'use strict';
let digit=1, questions=[], revealed=false, sheetLevel="free";
const $=id=>document.getElementById(id);
const SOUND_KEY='bead-bright-sound-on';
let soundOn=true, audioCtx=null;
try{const savedSound=localStorage.getItem(SOUND_KEY);if(savedSound!==null)soundOn=savedSound==='1';}catch{}
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
    const colors=['#ffd166','#7cd6c0','#f2a6c9','#a3c4ff','#2655df'];
    const flowers=['🌸','🌼','🌺'];
    for(let i=0;i<30;i++){
      const p=document.createElement('div');
      const isFlower=i%3===0;
      p.className='confetti-piece'+(isFlower?' flower':'');
      p.style.left=Math.random()*100+'vw';
      if(isFlower)p.textContent=flowers[i%flowers.length];
      else p.style.background=colors[i%colors.length];
      p.style.animationDuration=(1.8+Math.random()*1.2)+'s';
      p.style.animationDelay=(Math.random()*0.35)+'s';
      document.body.appendChild(p);
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
    const rodW=60,padTop=14,barY=46,h=116,totalW=n*rodW+40;
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
try{if(window.matchMedia('(max-width:650px)').matches)viewMode='focus';}catch(e){}
let hasResults=false;
function syncViewToggleButton(){
  const b=$('view-toggle');if(!b)return;
  b.setAttribute('aria-pressed',String(viewMode==='focus'));
  b.textContent=viewMode==='focus'?'📄 Worksheet view':'🧮 One at a time';
}
function applyView(){
  try{
    const q=$('questions'),nav=$('focus-nav'),resultsBtn=$('focus-results-btn');
    syncViewToggleButton();
    if(!q||!nav)return;
    const total=questions.length;
    if(viewMode==='focus'&&total>0){
      const panelOpen=q.classList.contains('showing-results');
      q.classList.add('is-focused');nav.hidden=panelOpen;
      if(resultsBtn)resultsBtn.hidden=!hasResults||panelOpen;
      if(focusIndex>=total)focusIndex=total-1;
      if(focusIndex<0)focusIndex=0;
      Array.from(q.children).forEach((card,i)=>card.classList.toggle('is-current',i===focusIndex));
      $('focus-position').textContent=`Question ${focusIndex+1} of ${total}`;
      $('focus-prev').disabled=focusIndex===0;
      const isLast=focusIndex===total-1,nextBtn=$('focus-next');
      nextBtn.classList.toggle('is-finish',isLast);
      nextBtn.querySelector('.nav-icon').textContent=isLast?'':'▶';
      nextBtn.querySelector('.nav-label').textContent=isLast?'Finish':'Next';
    } else {
      q.classList.remove('is-focused','showing-results');nav.hidden=true;
      if(resultsBtn)resultsBtn.hidden=true;
      const results=$('focus-results');if(results)results.hidden=true;
    }
  }catch(e){}
}
function goToQuestion(i){
  if(checkCountdownExpiry())return;
  focusIndex=i;applyView();
  const card=$(`card-${i}`);if(card)retrigger(card,'q-enter');
  const input=$(`a-${i}`);if(input)input.focus();
  if(currentSessionId)syncSession();
}
function showResultsPanel(){
  try{
    if(viewMode!=='focus')return;
    const total=questions.length;
    let correct=0,wrong=0,blank=0;
    const states=questions.map((q,i)=>{
      const el=$(`a-${i}`),val=el?el.value.trim():'';
      const ok=/^\d+$/.test(val)&&Number(val)===q.total;
      const state=!val?'blank':ok?'correct':'wrong';
      if(state==='correct')correct++;else if(state==='wrong')wrong++;else blank++;
      return state;
    });
    $('results-summary').textContent=(wrong===0&&blank===0)
      ?`All ${total} correct! 🎉`
      :`${correct} correct · ${wrong} to fix${blank?` · ${blank} blank`:''}`;
    $('results-grid').innerHTML=states.map((s,i)=>
      `<button type="button" class="result-chip ${s}" data-i="${i}" aria-label="Question ${i+1}: ${s==='correct'?'correct':s==='wrong'?'needs another look':'not answered yet'}">${i+1}</button>`
    ).join('');
    hasResults=true;
    $('questions').classList.add('showing-results');
    $('focus-nav').hidden=true;
    $('focus-results').hidden=false;
    $('focus-results-btn').hidden=true;
    // Move focus to the summary so keyboard and screen-reader users land on the results.
    $('results-summary').focus();
  }catch(e){}
}
function hideResultsPanel(){
  try{
    $('focus-results').hidden=true;
    $('questions').classList.remove('showing-results');
    applyView();
  }catch(e){}
}
$('results-grid')?.addEventListener('click',e=>{
  const b=e.target.closest('.result-chip');if(!b)return;
  hideResultsPanel();goToQuestion(Number(b.dataset.i));
});
$('results-continue')?.addEventListener('click',()=>{hideResultsPanel();const input=$(`a-${focusIndex}`);if(input)input.focus();});
// A fresh sheet with the same settings; the finished one stays in the child's history.
$('results-new')?.addEventListener('click',()=>{
  hideResultsPanel();
  try{generate();}catch(err){$('error').textContent=err.message;$('error').hidden=false;return;}
  const input=$('a-0');if(input)input.focus();
});
$('focus-results-btn')?.addEventListener('click',showResultsPanel);
$('view-toggle')?.addEventListener('click',()=>{
  viewMode=viewMode==='sheet'?'focus':'sheet';
  focusIndex=0;applyView();
});
$('focus-prev')?.addEventListener('click',()=>{if(focusIndex>0)goToQuestion(focusIndex-1);});
$('focus-next')?.addEventListener('click',()=>{
  if(focusIndex<questions.length-1)goToQuestion(focusIndex+1);
  else check();
});
function randomInt(min,max){return min+Math.floor(Math.random()*(max-min+1));}
function makeQuestion(digits,rows,mode,level){return AbacusTechniques.makeQuestion(digits,rows,mode,level);}
function renderSheet(level,rows,mode){
  sheetLevel=level;revealed=false;
  $('reveal').textContent='Show answers';$('summary').textContent='';$('error').hidden=true;
  $('meta').textContent=`${AbacusTechniques.levels[level].name} · ${digit}-digit numbers · ${rows} rows · ${mode==='add'?'Addition':'Addition & subtraction'}`;
  $('questions').innerHTML=questions.map((q,i)=>`<article class="card" id="card-${i}" style="animation-delay:${Math.min(i,10)*45}ms"><h3>QUESTION ${String(i+1).padStart(2,'0')}</h3><div class="numbers">${q.values.map((v,j)=>`<div class="number"><span class="sign">${j===0?'':v<0?'−':'+'}</span><span>${Math.abs(v)}</span></div>`).join('')}</div><div class="answer"><label for="a-${i}">Answer for question ${i+1}</label><input id="a-${i}" inputmode="numeric" autocomplete="off" placeholder="?" aria-describedby="f-${i}"><p class="feedback" id="f-${i}"></p></div></article>`).join('');
  focusIndex=0;hasResults=false;reviewOnly=false;
  currentSessionId=null;currentSessionProfileId=null;lastSaveFailed=false;
  hideHistoryBanner();updateSaveStatus();
  resetTiming();
  buildAbacusBase(abacusSize());updateAbacusBeads(0);updateProgress();applyView();
}
function generate(){
  const rows=Number($('rows').value),count=Number($('count').value),mode=$('mode').value,level=$('level').value;
  if(!Number.isInteger(rows)||rows<2||rows>100||!Number.isInteger(count)||count<1||count>30)throw Error("Let's choose 2–100 rows and 1–30 questions, then we'll build your sheet.");
  questions=Array.from({length:count},()=>makeQuestion(digit,rows,mode,level));
  renderSheet(level,rows,mode);
  startFreshTiming();
}
$('digits').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;digit=Number(b.dataset.digit);for(const item of $('digits').children)item.setAttribute('aria-pressed',String(item===b));buildAbacusBase(abacusSize());updateAbacusBeads(0);});

// --- timed practice: elapsed time from timestamps, no ticking display ---
$('timing-mode')?.addEventListener('change',()=>{
  const field=$('countdown-minutes-field');if(field)field.hidden=$('timing-mode').value!=='countdown';
});
let timerState={mode:'off',startedAt:null,accumulatedMs:0,running:false,limitMs:null,finished:false};
let countdownTimeout=null, timesUp=false;
function elapsedMs(){
  if(timerState.mode==='off')return 0;
  return timerState.accumulatedMs+(timerState.running?Date.now()-timerState.startedAt:0);
}
function formatDuration(ms){
  const totalSeconds=Math.max(0,Math.round(ms/1000));
  const m=Math.floor(totalSeconds/60),s=totalSeconds%60;
  return m>0?`${m}m ${s}s`:`${s}s`;
}
function clearCountdownTimeout(){
  if(countdownTimeout){try{clearTimeout(countdownTimeout);}catch(e){}countdownTimeout=null;}
}
function scheduleCountdownCheck(){
  clearCountdownTimeout();
  if(typeof setTimeout!=='function')return;
  if(timerState.mode!=='countdown'||!timerState.running||timerState.finished)return;
  const remaining=timerState.limitMs-elapsedMs();
  if(remaining<=0){triggerTimeUp();return;}
  try{countdownTimeout=setTimeout(()=>{if(elapsedMs()>=timerState.limitMs)triggerTimeUp();else scheduleCountdownCheck();},remaining+50);}catch(e){}
}
function checkCountdownExpiry(){
  if(timerState.mode==='countdown'&&timerState.running&&!timerState.finished&&elapsedMs()>=timerState.limitMs){triggerTimeUp();return true;}
  return false;
}
function triggerTimeUp(){
  if(timerState.finished||reviewOnly)return;
  timesUp=true;
  check();
  questions.forEach((q,i)=>{const el=$(`a-${i}`);if(el)el.disabled=true;});
}
function updateTimingControl(){
  const el=$('timing-control');if(!el)return;
  if(timerState.mode==='off'){el.hidden=true;return;}
  el.hidden=false;
  const pauseBtn=$('timing-pause-btn');
  if(reviewOnly||timerState.finished){
    $('timing-status').textContent=`⏱ Finished in ${formatDuration(elapsedMs())}`;
    if(pauseBtn)pauseBtn.hidden=true;
  }else{
    $('timing-status').textContent=timerState.running?'⏱ Timing on':'⏱ Timing paused';
    if(pauseBtn){pauseBtn.hidden=false;pauseBtn.textContent=timerState.running?'Pause':'Resume';}
  }
}
$('timing-pause-btn')?.addEventListener('click',()=>{
  if(timerState.mode==='off'||timerState.finished||reviewOnly)return;
  if(timerState.running){
    timerState.accumulatedMs=elapsedMs();timerState.running=false;timerState.startedAt=null;
    clearCountdownTimeout();
  }else{
    timerState.startedAt=Date.now();timerState.running=true;
    if(timerState.mode==='countdown')scheduleCountdownCheck();
  }
  updateTimingControl();
  if(currentSessionId)syncSession();
});
// A neutral baseline shared by both a fresh sheet and a restored one; the
// caller decides how to initialize timing right after (see startFreshTiming
// and restoreTiming below).
function resetTiming(){
  clearCountdownTimeout();
  timesUp=false;
  timerState={mode:'off',startedAt:null,accumulatedMs:0,running:false,limitMs:null,finished:false};
  updateTimingControl();
}
function startFreshTiming(){
  const mode=$('timing-mode')?$('timing-mode').value:'off';
  if(mode==='off'){
    timerState={mode:'off',startedAt:null,accumulatedMs:0,running:false,limitMs:null,finished:false};
  }else{
    const minutes=Math.max(1,Math.min(60,Number($('countdown-minutes').value)||10));
    timerState={mode,startedAt:Date.now(),accumulatedMs:0,running:true,limitMs:mode==='countdown'?minutes*60000:null,finished:false};
    if(mode==='countdown')scheduleCountdownCheck();
  }
  updateTimingControl();
}
// Resuming or reviewing a saved session always starts paused: a closed tab or
// a long gap before coming back must never silently count as practice time.
function restoreTiming(timing){
  clearCountdownTimeout();
  if(!timing||timing.mode==='off'){
    timerState={mode:'off',startedAt:null,accumulatedMs:0,running:false,limitMs:null,finished:false};
  }else{
    timerState={mode:timing.mode,startedAt:null,accumulatedMs:timing.accumulatedMs||0,running:false,limitMs:timing.limitMs||null,finished:false};
  }
  if($('timing-mode'))$('timing-mode').value=timerState.mode;
  const minutesField=$('countdown-minutes-field');
  if(minutesField)minutesField.hidden=timerState.mode!=='countdown';
  if(timerState.mode==='countdown'&&timerState.limitMs&&$('countdown-minutes'))$('countdown-minutes').value=String(Math.round(timerState.limitMs/60000));
  updateTimingControl();
}

// --- PINs: stored only as salted hashes in this browser ---
// This keeps brothers and sisters out of each other's profiles; it is not
// protection against someone with browser developer tools.
const GROWNUP_KEY='bead-bright-grownup-v1', PIN_ATTEMPTS_KEY='bead-bright-pin-attempts-v1', UNLOCKED_KEY='bead-bright-unlocked-v1';
const PIN_TRIES_BEFORE_LOCK=5, PIN_FIRST_LOCK_SECONDS=30, PIN_MAX_LOCK_SECONDS=900;
const SHA256_K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
// SHA-256 of an ASCII string (PINs, hex salts and recovery codes are all ASCII).
function sha256Hex(text){
  const bytes=[];for(let i=0;i<text.length;i++)bytes.push(text.charCodeAt(i)&255);
  const bits=bytes.length*8;bytes.push(0x80);while(bytes.length%64!==56)bytes.push(0);
  for(let i=7;i>=0;i--)bytes.push(i>3?0:(bits>>>(8*i))&255);
  let H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const w=new Array(64);
  for(let o=0;o<bytes.length;o+=64){
    for(let i=0;i<16;i++)w[i]=(bytes[o+4*i]<<24)|(bytes[o+4*i+1]<<16)|(bytes[o+4*i+2]<<8)|bytes[o+4*i+3];
    for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3))+w[i-7]+(((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10)))|0;}
    let [a,b,c,d,e,f,g,h]=H;
    for(let i=0;i<64;i++){
      const t1=(h+(((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)))+((e&f)^(~e&g))+SHA256_K[i]+w[i])|0;
      const t2=((((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)))+((a&b)^(a&c)^(b&c)))|0;
      h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;
    }
    H=[H[0]+a,H[1]+b,H[2]+c,H[3]+d,H[4]+e,H[5]+f,H[6]+g,H[7]+h].map(x=>x|0);
  }
  return H.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('');
}
function randomBytes(n){const out=new Uint8Array(n);try{crypto.getRandomValues(out);}catch(e){for(let i=0;i<n;i++)out[i]=Math.floor(Math.random()*256);}return out;}
function hashSecret(value,salt){let h=salt+':'+value;for(let i=0;i<1000;i++)h=sha256Hex(h+salt);return h;}
function makeSecret(value){const salt=Array.from(randomBytes(16),b=>b.toString(16).padStart(2,'0')).join('');return {salt,hash:hashSecret(value,salt)};}
function checkSecret(secret,value){return !!(secret&&secret.hash&&secret.salt)&&hashSecret(value,secret.salt)===secret.hash;}
function makeRecoveryCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',b=randomBytes(8);const c=Array.from(b,x=>alphabet[x%alphabet.length]).join('');return c.slice(0,4)+'-'+c.slice(4);}
function normalizeCode(code){return String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');}
function loadGrownup(){try{const g=JSON.parse(localStorage.getItem(GROWNUP_KEY)||'null');return g&&g.pin?g:null;}catch(e){return null;}}
function saveGrownup(g){try{localStorage.setItem(GROWNUP_KEY,JSON.stringify(g));}catch(e){}}
function loadPinAttempts(){try{const a=JSON.parse(localStorage.getItem(PIN_ATTEMPTS_KEY)||'{}');return a&&typeof a==='object'?a:{};}catch(e){return {};}}
function savePinAttempts(a){try{localStorage.setItem(PIN_ATTEMPTS_KEY,JSON.stringify(a));}catch(e){}}
function pinLockSeconds(target){const a=loadPinAttempts()[target];return a&&a.lockedUntil>Date.now()?Math.ceil((a.lockedUntil-Date.now())/1000):0;}
function recordPinFailure(target){
  const all=loadPinAttempts(),a=all[target]||{fails:0,locks:0,lockedUntil:0};
  a.fails++;
  if(a.fails>=PIN_TRIES_BEFORE_LOCK){a.locks++;a.fails=0;a.lockedUntil=Date.now()+Math.min(PIN_FIRST_LOCK_SECONDS*2**(a.locks-1),PIN_MAX_LOCK_SECONDS)*1000;}
  all[target]=a;savePinAttempts(all);
}
function clearPinFailures(target){const all=loadPinAttempts();delete all[target];savePinAttempts(all);}
// The unlocked child lasts for this visit only (this tab), so reopening the app asks again.
let memoryUnlockedId=null;
function getUnlockedId(){try{return sessionStorage.getItem(UNLOCKED_KEY);}catch(e){return memoryUnlockedId;}}
function setUnlockedId(id){memoryUnlockedId=id||null;try{if(id)sessionStorage.setItem(UNLOCKED_KEY,id);else sessionStorage.removeItem(UNLOCKED_KEY);}catch(e){}}
function profileHasPin(p){return !!(p&&p.pin&&p.pin.hash);}
function isProfileUnlocked(id){const p=id&&loadProfiles().find(x=>x.id===id);return !!p&&(!profileHasPin(p)||getUnlockedId()===id);}
// The child whose history may be read and changed right now (null for Guest or a locked child).
function effectiveProfileId(){const id=getActiveProfileId();return isProfileUnlocked(id)?id:null;}

// --- local child profiles ---
const PROFILES_KEY='bead-bright-profiles-v1';
const ACTIVE_PROFILE_KEY='bead-bright-active-profile-v1';
const MAX_PROFILES=8;
let editingProfileId=null, pendingDeleteId=null, selectedAvatar=null;
function loadProfiles(){try{const raw=localStorage.getItem(PROFILES_KEY),list=raw?JSON.parse(raw):[];return Array.isArray(list)?list:[];}catch(e){return [];}}
function saveProfiles(list){try{localStorage.setItem(PROFILES_KEY,JSON.stringify(list));}catch(e){}}
function getActiveProfileId(){try{return localStorage.getItem(ACTIVE_PROFILE_KEY);}catch(e){return null;}}
function setActiveProfileId(id){try{if(id)localStorage.setItem(ACTIVE_PROFILE_KEY,id);else localStorage.removeItem(ACTIVE_PROFILE_KEY);}catch(e){}}
// A different child (or Guest) gets a fresh sheet, so their answers never land in
// the previous child's session; that session stays in the previous child's history.
function changeActiveProfile(id){
  const prev=getActiveProfileId();
  setActiveProfileId(id);
  if((prev||null)===(id||null))return;
  currentSessionId=null;currentSessionProfileId=null;
  try{generate();}catch(err){$('error').textContent=err.message;$('error').hidden=false;}
}
function refreshProfileBar(){
  const avatarEl=$('profile-bar-avatar'),nameEl=$('profile-bar-name');
  if(!avatarEl||!nameEl)return;
  const activeId=getActiveProfileId();
  const profile=activeId?loadProfiles().find(p=>p.id===activeId):null;
  if(profile){avatarEl.textContent=profile.avatar;nameEl.textContent=profile.name;}
  else{avatarEl.textContent='🙂';nameEl.textContent='Practicing as Guest';}
  const historyBtn=$('history-btn');if(historyBtn)historyBtn.hidden=!profile||!isProfileUnlocked(activeId);
  // The first call runs before the history section has loaded; the first sheet sets the status then.
  try{updateSaveStatus();}catch(e){}
}
function showProfileError(msg){const el=$('profile-error');if(!el)return;el.textContent=msg;el.hidden=false;}
function setSelectedAvatar(avatar){
  selectedAvatar=avatar;
  const picker=$('avatar-picker');if(!picker)return;
  for(const b of picker.children)b.setAttribute('aria-pressed',String(b.dataset.avatar===avatar));
}
function resetProfileForm(){
  editingProfileId=null;
  if($('profile-name-input'))$('profile-name-input').value='';
  setSelectedAvatar(null);
  if($('profile-save-btn'))$('profile-save-btn').textContent='Add profile';
  if($('profile-cancel-edit'))$('profile-cancel-edit').hidden=true;
  if($('profile-pin-btn'))$('profile-pin-btn').hidden=true;
  if($('profile-error'))$('profile-error').hidden=true;
}
function startEditProfile(id){
  const p=loadProfiles().find(x=>x.id===id);if(!p)return;
  editingProfileId=id;
  $('profile-name-input').value=p.name;
  setSelectedAvatar(p.avatar);
  $('profile-save-btn').textContent='Save changes';
  $('profile-cancel-edit').hidden=false;
  if($('profile-pin-btn')){$('profile-pin-btn').hidden=false;$('profile-pin-btn').textContent=profileHasPin(p)?'Change PIN':'Add a PIN';}
  $('profile-error').hidden=true;
}
function refreshProfilesList(){
  const list=$('profiles-list');if(!list)return;
  list.textContent='';
  const profiles=loadProfiles(),activeId=getActiveProfileId();
  for(const p of profiles){
    const row=document.createElement('div');
    row.className='profile-row'+(p.id===activeId?' is-active':'');
    row.dataset.id=p.id;

    const selectBtn=document.createElement('button');
    selectBtn.type='button';selectBtn.className='profile-row-select';
    selectBtn.setAttribute('aria-label',`Switch to ${p.name}`);
    const avatarSpan=document.createElement('span');avatarSpan.className='avatar';avatarSpan.textContent=p.avatar;avatarSpan.setAttribute('aria-hidden','true');
    const nameSpan=document.createElement('span');nameSpan.className='name';nameSpan.textContent=p.name;
    selectBtn.append(avatarSpan,nameSpan);
    if(p.id===activeId){
      const tag=document.createElement('span');tag.className='profile-row-active-tag';tag.textContent='Active';
      selectBtn.append(tag);
    }
    row.appendChild(selectBtn);

    const editBtn=document.createElement('button');
    editBtn.type='button';editBtn.className='profile-row-edit';editBtn.textContent='✏️';
    editBtn.setAttribute('aria-label',`Edit ${p.name}`);
    row.appendChild(editBtn);

    const confirming=pendingDeleteId===p.id;
    const deleteBtn=document.createElement('button');
    deleteBtn.type='button';
    deleteBtn.className='profile-row-delete'+(confirming?' confirming':'');
    deleteBtn.textContent=confirming?'Confirm delete':'🗑️';
    deleteBtn.setAttribute('aria-label',confirming?`Confirm deleting ${p.name}`:`Delete ${p.name}`);
    row.appendChild(deleteBtn);

    list.appendChild(row);
  }
}
$('avatar-picker')?.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  setSelectedAvatar(b.dataset.avatar);
});
$('profile-save-btn')?.addEventListener('click',()=>{
  const name=$('profile-name-input').value.trim();
  if(!name){showProfileError('Type a nickname first.');return;}
  if(!selectedAvatar){showProfileError('Pick an avatar first.');return;}
  const list=loadProfiles();
  if(editingProfileId){
    const p=list.find(x=>x.id===editingProfileId);
    if(p){p.name=name;p.avatar=selectedAvatar;saveProfiles(list);}
    resetProfileForm();
    refreshProfileBar();refreshProfilesList();
    return;
  }
  if(list.length>=MAX_PROFILES){showProfileError(`You can have up to ${MAX_PROFILES} profiles. Delete one to add another.`);return;}
  // Every new child chooses a PIN; the first one also sets up the grown-up PIN.
  const draft={name,avatar:selectedAvatar};
  ensureGrownupPin(()=>chooseChildPin(draft,pin=>{
    const all=loadProfiles();
    const profile={id:'pr'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),name:draft.name,avatar:draft.avatar,pin};
    all.push(profile);saveProfiles(all);
    closePinDialog();
    setUnlockedId(profile.id);
    changeActiveProfile(profile.id);
    resetProfileForm();
    refreshProfileBar();refreshProfilesList();
  },closePinDialog),closePinDialog);
});
$('profile-cancel-edit')?.addEventListener('click',resetProfileForm);
$('profiles-list')?.addEventListener('click',e=>{
  const row=e.target.closest('.profile-row');if(!row)return;
  const id=row.dataset.id;
  if(e.target.closest('.profile-row-select')){
    pendingDeleteId=null;
    const p=loadProfiles().find(x=>x.id===id);if(!p)return;
    const open=()=>{
      closePinDialog();
      setUnlockedId(id);
      changeActiveProfile(id);
      refreshProfileBar();refreshProfilesList();
      try{$('profiles-dialog').close();}catch(err){}
    };
    if(!profileHasPin(p)||(getActiveProfileId()===id&&isProfileUnlocked(id)))open();
    else askChildPin(p,open,closePinDialog);
    return;
  }
  if(e.target.closest('.profile-row-edit')){
    pendingDeleteId=null;
    authorizeProfile(id,()=>{closePinDialog();startEditProfile(id);refreshProfilesList();});
    return;
  }
  if(e.target.closest('.profile-row-delete')){
    if(pendingDeleteId===id){
      authorizeProfile(id,()=>{
        closePinDialog();
        saveProfiles(loadProfiles().filter(p=>p.id!==id));
        deleteProfileHistory(id);
        clearPinFailures(id);
        if(getActiveProfileId()===id){setUnlockedId(null);changeActiveProfile(null);}
        if(editingProfileId===id)resetProfileForm();
        pendingDeleteId=null;
        refreshProfileBar();refreshProfilesList();
      });
    }else{
      pendingDeleteId=id;
      refreshProfilesList();
    }
    return;
  }
});
$('profile-none-btn')?.addEventListener('click',()=>{
  pendingDeleteId=null;
  setUnlockedId(null);
  changeActiveProfile(null);
  refreshProfileBar();refreshProfilesList();
  try{$('profiles-dialog').close();}catch(err){}
});
$('profile-bar-btn')?.addEventListener('click',()=>{
  resetProfileForm();
  pendingDeleteId=null;
  refreshProfilesList();
  try{$('profiles-dialog').showModal();}catch(err){}
});
refreshProfileBar();

// --- practice history and resume (per profile) ---
const HISTORY_KEY='bead-bright-history-v1';
const MAX_SESSIONS_PER_PROFILE=50;
let currentSessionId=null, currentSessionProfileId=null, reviewOnly=false, lastSaveFailed=false;
function loadHistory(){try{const raw=localStorage.getItem(HISTORY_KEY),obj=raw?JSON.parse(raw):{};return (obj&&typeof obj==='object'&&!Array.isArray(obj))?obj:{};}catch(e){return {};}}
function saveHistory(all){try{localStorage.setItem(HISTORY_KEY,JSON.stringify(all));return true;}catch(e){return false;}}
// Tell the child (and grown-up) whether this sheet is being kept.
function updateSaveStatus(){
  const el=$('save-status');if(!el)return;
  const id=getActiveProfileId(),p=id?loadProfiles().find(x=>x.id===id):null;
  let text='',state='';
  if(reviewOnly){}
  else if(!p){text='Guest practice isn’t saved. Pick a profile before you start to keep your work.';state='guest';}
  else if(!isProfileUnlocked(id)){text=`Enter ${p.name}’s PIN to save your work.`;state='guest';}
  else if(currentSessionId&&currentSessionProfileId===id){
    text=lastSaveFailed?`Couldn’t save to ${p.name}’s history — this device’s storage may be full.`:`✓ Saved to ${p.name}’s history`;
    state=lastSaveFailed?'failed':'saved';
  }
  else{text=`Your answers will be saved to ${p.name}’s history`;state='pending';}
  if(el.textContent!==text)el.textContent=text;
  el.className='save-status'+(state?' '+state:'');
  el.hidden=!text;
  // Profiles made before PINs existed stay open until one is added.
  const nudge=$('pin-nudge');
  if(nudge){
    nudge.hidden=reviewOnly||!p||profileHasPin(p);
    if(!nudge.hidden)nudge.textContent=`🔒 Add a PIN to protect ${p.name}’s history`;
  }
}
function getProfileSessions(profileId){const all=loadHistory();return Array.isArray(all[profileId])?all[profileId]:[];}
function upsertSession(profileId,session){
  const all=loadHistory();
  const list=Array.isArray(all[profileId])?all[profileId].slice():[];
  const idx=list.findIndex(s=>s.id===session.id);
  if(idx>=0)list[idx]=session;else list.push(session);
  list.sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt));
  all[profileId]=list.slice(0,MAX_SESSIONS_PER_PROFILE);
  return saveHistory(all);
}
function deleteProfileHistory(profileId){const all=loadHistory();delete all[profileId];saveHistory(all);}
function ensureSession(){
  if(reviewOnly||currentSessionId)return;
  const activeId=effectiveProfileId();if(!activeId)return;
  const now=new Date().toISOString();
  const session={
    id:'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
    startedAt:now,updatedAt:now,
    settings:{digits:digit,rows:Number($('rows').value),count:questions.length,mode:$('mode').value,level:$('level').value},
    questions:questions.map(q=>({values:q.values,total:q.total})),
    answers:questions.map(()=>''),
    focusIndex:0,finished:false,
    timing:{mode:timerState.mode,limitMs:timerState.limitMs,accumulatedMs:elapsedMs()}
  };
  currentSessionId=session.id;currentSessionProfileId=activeId;
  lastSaveFailed=!upsertSession(activeId,session);
  updateSaveStatus();
}
function syncSession(finishedOverride){
  if(reviewOnly||!currentSessionId||!currentSessionProfileId)return;
  const list=getProfileSessions(currentSessionProfileId);
  const session=list.find(s=>s.id===currentSessionId);if(!session)return;
  session.answers=questions.map((q,i)=>{const el=$(`a-${i}`);return el?el.value:'';});
  session.focusIndex=focusIndex;
  session.updatedAt=new Date().toISOString();
  session.timing={mode:timerState.mode,limitMs:timerState.limitMs,accumulatedMs:elapsedMs()};
  if(finishedOverride!==undefined)session.finished=finishedOverride;
  lastSaveFailed=!upsertSession(currentSessionProfileId,session);
  updateSaveStatus();
}
function showHistoryBanner(text){const b=$('history-banner');if(!b)return;$('history-banner-text').textContent=text;b.hidden=false;}
function hideHistoryBanner(){const b=$('history-banner');if(b)b.hidden=true;}
$('history-banner-dismiss')?.addEventListener('click',()=>{try{generate();}catch(err){$('error').textContent=err.message;$('error').hidden=false;}});
function formatDateTime(iso){
  try{return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(iso));}
  catch(e){return iso;}
}
function loadSessionIntoSheet(profileId,sessionId){
  const session=getProfileSessions(profileId).find(s=>s.id===sessionId);if(!session)return;
  $('level').value=session.settings.level;updateLevelHelp();
  digit=session.settings.digits;
  for(const item of $('digits').children)item.setAttribute('aria-pressed',String(Number(item.dataset.digit)===digit));
  $('rows').value=session.settings.rows;$('count').value=session.settings.count;$('mode').value=session.settings.mode;
  questions=session.questions.map(q=>({values:q.values.slice(),total:q.total}));
  renderSheet(session.settings.level,session.settings.rows,session.settings.mode);
  restoreTiming(session.timing);
  questions.forEach((q,i)=>{const el=$(`a-${i}`);if(el)el.value=session.answers[i]||'';});
  updateProgress();
  if(session.finished){
    reviewOnly=true;
    timerState.finished=true;
    questions.forEach((q,i)=>{const el=$(`a-${i}`);if(el)el.disabled=true;});
    check();
    showHistoryBanner(`Finished practice · ${formatDateTime(session.startedAt)}`);
  }else{
    focusIndex=Math.min(session.focusIndex||0,questions.length-1);
    applyView();
    currentSessionId=session.id;currentSessionProfileId=profileId;
    showHistoryBanner(`Resuming practice from ${formatDateTime(session.startedAt)}`);
  }
  updateSaveStatus();
  try{$('history-dialog').close();}catch(err){}
}
function refreshHistoryList(){
  const list=$('history-list');if(!list)return;
  list.textContent='';
  const activeId=effectiveProfileId();
  const sessions=activeId?getProfileSessions(activeId):[];
  if(!sessions.length){
    const empty=document.createElement('p');empty.className='profiles-intro';
    empty.textContent='No practice sessions yet. Start a sheet and it will show up here.';
    list.appendChild(empty);return;
  }
  for(const s of sessions){
    const item=document.createElement('div');item.className='history-item';
    const row=document.createElement('button');
    row.type='button';row.className='history-row';row.dataset.id=s.id;
    const main=document.createElement('span');main.className='history-row-main';
    const dateSpan=document.createElement('span');dateSpan.className='history-row-date';dateSpan.textContent=formatDateTime(s.startedAt);
    const detailSpan=document.createElement('span');detailSpan.className='history-row-detail';
    const levelName=(AbacusTechniques.levels[s.settings.level]||{}).name||s.settings.level;
    detailSpan.textContent=`${levelName} · ${s.settings.digits}-digit · ${s.settings.rows} rows · ${s.settings.count} questions`+(s.timing&&s.timing.mode!=='off'?` · ⏱ ${formatDuration(s.timing.accumulatedMs||0)}`:'');
    main.append(dateSpan,detailSpan);
    row.appendChild(main);
    const status=document.createElement('span');
    status.className='history-row-status '+(s.finished?'finished':'unfinished');
    status.textContent=s.finished?'✓ Finished':'↻ Unfinished';
    row.appendChild(status);
    const confirming=pendingHistoryDeleteId===s.id;
    const del=document.createElement('button');
    del.type='button';del.className='history-row-delete'+(confirming?' confirming':'');del.dataset.id=s.id;
    del.textContent=confirming?'Confirm delete':'🗑️';
    del.setAttribute('aria-label',`${confirming?'Confirm deleting':'Delete'} practice from ${formatDateTime(s.startedAt)}`);
    item.append(row,del);
    list.appendChild(item);
  }
}
// Deleting takes two taps, like deleting a profile, so a stray tap never loses history.
let pendingHistoryDeleteId=null, pendingHistoryClear=false;
function refreshHistoryClearButton(){
  const b=$('history-clear');if(!b)return;
  const activeId=effectiveProfileId(),p=activeId?loadProfiles().find(x=>x.id===activeId):null;
  b.hidden=!p||!getProfileSessions(activeId).length;
  b.classList.toggle('confirming',pendingHistoryClear);
  b.textContent=pendingHistoryClear&&p?`Tap again to delete all of ${p.name}’s history`:'Delete all history';
}
// If the sheet on screen belonged to a deleted session, stop saving into it.
function forgetDeletedSession(deletedIds){
  if(currentSessionId&&deletedIds.includes(currentSessionId)){currentSessionId=null;currentSessionProfileId=null;updateSaveStatus();}
}
$('history-list')?.addEventListener('click',e=>{
  const activeId=effectiveProfileId();if(!activeId)return;
  const del=e.target.closest('.history-row-delete');
  if(del){
    pendingHistoryClear=false;
    if(pendingHistoryDeleteId===del.dataset.id){
      const all=loadHistory();
      all[activeId]=(all[activeId]||[]).filter(s=>s.id!==del.dataset.id);
      if(!all[activeId].length)delete all[activeId];
      saveHistory(all);
      forgetDeletedSession([del.dataset.id]);
      pendingHistoryDeleteId=null;
    }else pendingHistoryDeleteId=del.dataset.id;
    refreshHistoryList();refreshHistoryClearButton();
    return;
  }
  const row=e.target.closest('.history-row');if(!row)return;
  pendingHistoryDeleteId=null;pendingHistoryClear=false;
  loadSessionIntoSheet(activeId,row.dataset.id);
});
$('history-clear')?.addEventListener('click',()=>{
  const activeId=effectiveProfileId();if(!activeId)return;
  pendingHistoryDeleteId=null;
  if(pendingHistoryClear){
    forgetDeletedSession(getProfileSessions(activeId).map(s=>s.id));
    deleteProfileHistory(activeId);
    pendingHistoryClear=false;
  }else pendingHistoryClear=true;
  refreshHistoryList();refreshHistoryClearButton();
});
$('history-btn')?.addEventListener('click',()=>{
  const activeId=effectiveProfileId();
  const profile=activeId?loadProfiles().find(p=>p.id===activeId):null;
  $('history-subtitle').textContent=profile?`Sessions for ${profile.name}`:'';
  pendingHistoryDeleteId=null;pendingHistoryClear=false;
  refreshHistoryList();refreshHistoryClearButton();
  try{$('history-dialog').showModal();}catch(err){}
});

// --- PIN dialog: one number pad for choosing, entering and recovering PINs ---
let pinStep=null, pinLockTimer=null;
// The error line always keeps its space, so an error never shifts the number pad.
function setPinError(msg){const el=$('pin-error');if(!el)return;el.textContent=msg||'';}
function closePinDialog(){pinStep=null;stopPinLockTimer();try{$('pin-dialog').close();}catch(e){}}
function stopPinLockTimer(){if(pinLockTimer){try{clearInterval(pinLockTimer);}catch(e){}pinLockTimer=null;}}
function refreshPinLock(){
  const s=pinStep,seconds=s&&s.target?pinLockSeconds(s.target):0;
  const locked=seconds>0;
  $('pin-input').disabled=locked;$('pin-code-input').disabled=locked;$('pin-code-submit').disabled=locked;
  for(const b of $('pin-pad').children)b.disabled=locked;
  if(locked){
    setPinError(`Too many tries. Please wait ${seconds} second${seconds===1?'':'s'}.`);
    if(!pinLockTimer){try{pinLockTimer=setInterval(()=>{if(!pinStep){stopPinLockTimer();return;}refreshPinLock();},1000);}catch(e){}}
  }else if(pinLockTimer){stopPinLockTimer();setPinError('');}
}
function showPinStep(step){
  pinStep=step;
  $('pin-avatar').textContent=step.avatar||'🔒';
  $('pin-title').textContent=step.title;
  $('pin-message').textContent=step.message||'';
  $('pin-entry').hidden=!(step.kind==='enter'||step.kind==='choose');
  $('pin-code-entry').hidden=step.kind!=='code';
  $('pin-recovery').hidden=step.kind!=='recovery';
  if(step.kind==='recovery')$('pin-recovery-code').textContent=step.code;
  $('pin-forgot').hidden=!step.onForgot;
  $('pin-forgot').textContent=step.forgotLabel||'Forgot PIN?';
  $('pin-cancel').hidden=step.kind==='recovery';
  $('pin-cancel').textContent=step.cancelLabel||'Cancel';
  $('pin-input').value='';$('pin-code-input').value='';$('pin-hint').textContent='';
  setPinError('');
  try{if(!$('pin-dialog').open)$('pin-dialog').showModal();}catch(e){}
  refreshPinLock();
  try{(step.kind==='code'?$('pin-code-input'):$('pin-input')).focus();}catch(e){}
}
function submitPin(pin){
  const s=pinStep;if(!s||pin.length!==4)return;
  if(s.kind==='choose'){
    if(!s.first){s.first=pin;$('pin-input').value='';$('pin-hint').textContent='Type the same 4 numbers again to check.';setPinError('');return;}
    if(pin!==s.first){s.first=null;$('pin-input').value='';$('pin-hint').textContent='';setPinError('Those didn’t match. Let’s start again.');return;}
    s.onChosen(makeSecret(pin));return;
  }
  if(s.kind==='enter'){
    if(pinLockSeconds(s.target))return refreshPinLock();
    if(s.check(pin)){clearPinFailures(s.target);s.onSuccess();return;}
    recordPinFailure(s.target);$('pin-input').value='';
    if(!pinLockSeconds(s.target))setPinError('That PIN isn’t right. Try again.');
    refreshPinLock();
  }
}
$('pin-input')?.addEventListener('input',e=>{const v=e.target.value.replace(/\D/g,'').slice(0,4);if(v!==e.target.value)e.target.value=v;if(v.length===4)submitPin(v);});
$('pin-pad')?.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;
  const input=$('pin-input');
  if(b.dataset.key==='back')input.value=input.value.slice(0,-1);
  else if(input.value.length<4)input.value+=b.dataset.key;
  if(input.value.length===4)submitPin(input.value);
});
function submitRecoveryCode(){
  const s=pinStep;if(!s||s.kind!=='code')return;
  if(pinLockSeconds(s.target))return refreshPinLock();
  if(s.check($('pin-code-input').value)){clearPinFailures(s.target);s.onSuccess();return;}
  recordPinFailure(s.target);$('pin-code-input').value='';
  if(!pinLockSeconds(s.target))setPinError('That code isn’t right. Check it and try again.');
  refreshPinLock();
}
$('pin-code-submit')?.addEventListener('click',submitRecoveryCode);
$('pin-code-input')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submitRecoveryCode();}});
$('pin-ack')?.addEventListener('click',()=>{const s=pinStep;if(s&&s.onAck)s.onAck();});
$('pin-forgot')?.addEventListener('click',()=>{const s=pinStep;if(s&&s.onForgot)s.onForgot();});
function cancelPinStep(){const s=pinStep;if(s&&s.onCancel)s.onCancel();else closePinDialog();}
$('pin-cancel')?.addEventListener('click',cancelPinStep);
$('pin-dialog')?.addEventListener('cancel',e=>{e.preventDefault();if(pinStep&&pinStep.kind!=='recovery')cancelPinStep();});

// Grown-up PIN: set once, then it opens any child and resets forgotten child PINs.
function setGrownupPin(onDone,onCancel){
  showPinStep({kind:'choose',avatar:'🔑',title:'Set a grown-up PIN',
    message:'For a parent or teacher — don’t share it with children. It opens any child’s profile and resets a forgotten PIN. It keeps brothers and sisters out of each other’s profiles, but it isn’t protection against someone using browser developer tools.',
    onChosen:pin=>{
      const code=makeRecoveryCode();
      saveGrownup({pin,recovery:makeSecret(normalizeCode(code))});
      showPinStep({kind:'recovery',avatar:'📝',title:'Write down this recovery code',
        message:'If the grown-up PIN is ever forgotten, this code lets you set a new one. It is only shown now, and each code works once.',
        code,onAck:onDone});
    },onCancel});
}
function ensureGrownupPin(onReady,onCancel){if(loadGrownup())onReady();else setGrownupPin(onReady,onCancel);}
function askGrownupPin(message,onOk,onCancel){
  showPinStep({kind:'enter',target:'grownup',avatar:'🔑',title:'Grown-up PIN',message,
    check:pin=>checkSecret((loadGrownup()||{}).pin,pin),onSuccess:onOk,
    forgotLabel:'Forgot grown-up PIN?',onForgot:()=>recoverGrownupPin(onOk,onCancel),onCancel});
}
function recoverGrownupPin(onOk,onCancel){
  showPinStep({kind:'code',target:'recovery',avatar:'📝',title:'Enter the recovery code',
    message:'Use the code you wrote down when the grown-up PIN was set. If it’s lost, clearing this site’s data in the browser settings starts fresh — but that removes every profile and all history on this device.',
    check:code=>checkSecret((loadGrownup()||{}).recovery,normalizeCode(code)),
    onSuccess:()=>setGrownupPin(onOk,onCancel),onCancel});
}
// Child PINs.
function chooseChildPin(child,onChosen,onCancel){
  showPinStep({kind:'choose',avatar:child.avatar,title:`Choose a PIN for ${child.name}`,
    message:'Pick 4 numbers you’ll remember. You’ll need them to open your profile.',onChosen,onCancel});
}
function savePinFor(id,pin){const list=loadProfiles(),p=list.find(x=>x.id===id);if(p){p.pin=pin;saveProfiles(list);clearPinFailures(id);}}
// Either the child's own PIN or the grown-up PIN opens a child's profile.
function askChildPin(p,onOk,onCancel,opts={}){
  showPinStep({kind:'enter',target:p.id,avatar:p.avatar,title:opts.title||`Hi ${p.name}! Enter your PIN`,message:opts.message||'',
    check:pin=>checkSecret(p.pin,pin)||checkSecret((loadGrownup()||{}).pin,pin),onSuccess:onOk,
    onForgot:()=>askGrownupPin(`Ask a grown-up to enter the grown-up PIN, then choose a new PIN for ${p.name}. ${p.name}’s history is kept.`,
      ()=>chooseChildPin(p,pin=>{savePinFor(p.id,pin);onOk();},onCancel),onCancel),
    cancelLabel:opts.cancelLabel,onCancel});
}
// Editing or deleting another child's profile needs that child's PIN or the grown-up PIN.
function authorizeProfile(id,onOk){
  const p=loadProfiles().find(x=>x.id===id);if(!p)return;
  if(!profileHasPin(p)||(getActiveProfileId()===id&&isProfileUnlocked(id)))return onOk();
  askChildPin(p,onOk,closePinDialog,{title:`Enter ${p.name}’s PIN`,message:'Or ask a grown-up to enter the grown-up PIN.'});
}
$('profile-pin-btn')?.addEventListener('click',()=>{
  const p=loadProfiles().find(x=>x.id===editingProfileId);if(!p)return;
  ensureGrownupPin(()=>chooseChildPin(p,pin=>{savePinFor(p.id,pin);closePinDialog();startEditProfile(p.id);refreshProfilesList();updateSaveStatus();},closePinDialog),closePinDialog);
});
$('pin-nudge')?.addEventListener('click',()=>{
  const id=effectiveProfileId(),p=id&&loadProfiles().find(x=>x.id===id);if(!p)return;
  ensureGrownupPin(()=>chooseChildPin(p,pin=>{savePinFor(p.id,pin);setUnlockedId(p.id);closePinDialog();refreshProfileBar();updateSaveStatus();},closePinDialog),closePinDialog);
});
// Reopening the app asks the active child for their PIN again.
function askPinOnOpen(){
  const id=getActiveProfileId(),p=id&&loadProfiles().find(x=>x.id===id);
  if(!p||!profileHasPin(p)||getUnlockedId()===id)return;
  askChildPin(p,()=>{closePinDialog();setUnlockedId(id);refreshProfileBar();updateSaveStatus();},
    ()=>{closePinDialog();changeActiveProfile(null);refreshProfileBar();},{cancelLabel:'Practice as Guest'});
}

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
function check(){let correct=0,answered=0;questions.forEach((q,i)=>{const value=$(`a-${i}`).value.trim(),valid=/^\d+$/.test(value),ok=valid&&Number(value)===q.total;if(value)answered++;if(ok)correct++;const card=$(`card-${i}`);card.className='card'+(value?(ok?' good':' retry'):'');if(value)retrigger(card,ok?'pop':'shake');const f=$(`f-${i}`);f.className='feedback '+(ok?'correct':'incorrect');f.textContent=revealed?`Answer: ${q.total}`:!value?'Try this one':ok?'Correct!':'Try again';});
  const finishedNow=(answered===questions.length)||timesUp;
  let timeText='';
  if(finishedNow&&timerState.mode!=='off'&&!timerState.finished){
    if(timerState.running){timerState.accumulatedMs=elapsedMs();timerState.running=false;timerState.startedAt=null;}
    timerState.finished=true;clearCountdownTimeout();
    timeText=` You took ${formatDuration(timerState.accumulatedMs)}.`;
  }
  $('summary').textContent=(timesUp?'⏰ Time\'s up! ':'')+(correct===questions.length?`All ${correct} correct. Great work!`:`${correct} of ${questions.length} correct${answered<questions.length?` · ${questions.length-answered} to try`:''}`)+timeText;
  if(!reviewOnly&&answered>0){if(correct===questions.length){playTone([[523,0.12],[659,0.12],[784,0.18]]);celebrate();}else if(correct<answered){playTone([[300,0.14]]);}}updateProgress();applyView();if(answered>0&&viewMode==='focus')showResultsPanel();updateTimingControl();if(!reviewOnly){ensureSession();syncSession((answered===questions.length)||timesUp);}return {correct,total:questions.length};}
$('check').addEventListener('click',check);
$('reveal').addEventListener('click',()=>{revealed=!revealed;$('reveal').textContent=revealed?'Hide answers':'Show answers';questions.forEach((q,i)=>{$(`f-${i}`).textContent=revealed?`Answer: ${q.total}`:'';$(`f-${i}`).className='feedback';});});
$('questions').addEventListener('input',e=>{if(!e.target.id.startsWith('a-'))return;if(checkCountdownExpiry())return;const i=Number(e.target.id.slice(2));$(`card-${i}`).className='card';if(!revealed)$(`f-${i}`).textContent='';$('summary').textContent='';applyView();updateAbacusBeads(e.target.value);updateProgress();if(e.target.value.trim())playTone([[880,0.045]],0.09);ensureSession();syncSession();});
$('questions').addEventListener('focusin',e=>{if(e.target.matches&&e.target.matches('.answer input'))updateAbacusBeads(e.target.value);});
$('questions').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const next=Number(e.target.id.slice(2))+1;if(next<questions.length){if(viewMode==='focus')goToQuestion(next);else $(`a-${next}`).focus();}else check();}});
$('print').addEventListener('click',()=>window.print());generate();askPinOnOpen();
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'generate_abacus_practice',description:'Replace the current sheet with new abacus questions using the chosen digits, rows, and operation.',inputSchema:{type:'object',properties:{digits:{type:'integer',minimum:1,maximum:4},rows:{type:'integer',minimum:2,maximum:100},questions:{type:'integer',minimum:1,maximum:30},mode:{type:'string',enum:['add','mixed']},level:{type:'string',enum:['free','direct','five','ten','combined']}},required:['digits','rows','questions','mode'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||!Number.isInteger(input.digits)||input.digits<1||input.digits>4||!Number.isInteger(input.rows)||input.rows<2||input.rows>100||!Number.isInteger(input.questions)||input.questions<1||input.questions>30||!['add','mixed'].includes(input.mode)||(input.level!==undefined&&!Object.hasOwn(AbacusTechniques.levels,input.level)))throw Error('Invalid practice settings');AbacusTechniques.validate(input.digits,input.rows,input.mode,input.level||'free');$('level').value=input.level||'free';updateLevelHelp();digit=input.digits;$('rows').value=input.rows;$('count').value=input.questions;$('mode').value=input.mode;for(const b of $('digits').children)b.setAttribute('aria-pressed',String(Number(b.dataset.digit)===digit));generate();return {digits:digit,rows:input.rows,questions:questions.length,mode:input.mode,level:$('level').value};}})).catch(()=>{});}catch{}}
