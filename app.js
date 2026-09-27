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
  buildAbacusBase(abacusSize());updateAbacusBeads(0);updateProgress();applyView();
}
function generate(){
  const rows=Number($('rows').value),count=Number($('count').value),mode=$('mode').value,level=$('level').value;
  if(!Number.isInteger(rows)||rows<2||rows>100||!Number.isInteger(count)||count<1||count>30)throw Error("Let's choose 2–100 rows and 1–30 questions, then we'll build your sheet.");
  questions=Array.from({length:count},()=>makeQuestion(digit,rows,mode,level));
  renderSheet(level,rows,mode);
}
$('digits').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;digit=Number(b.dataset.digit);for(const item of $('digits').children)item.setAttribute('aria-pressed',String(item===b));buildAbacusBase(abacusSize());updateAbacusBeads(0);});

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
  const historyBtn=$('history-btn');if(historyBtn)historyBtn.hidden=!profile;
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
  if($('profile-error'))$('profile-error').hidden=true;
}
function startEditProfile(id){
  const p=loadProfiles().find(x=>x.id===id);if(!p)return;
  editingProfileId=id;
  $('profile-name-input').value=p.name;
  setSelectedAvatar(p.avatar);
  $('profile-save-btn').textContent='Save changes';
  $('profile-cancel-edit').hidden=false;
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
  }else{
    if(list.length>=MAX_PROFILES){showProfileError(`You can have up to ${MAX_PROFILES} profiles. Delete one to add another.`);return;}
    const profile={id:'pr'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),name,avatar:selectedAvatar};
    list.push(profile);
    saveProfiles(list);
    changeActiveProfile(profile.id);
    resetProfileForm();
  }
  refreshProfileBar();refreshProfilesList();
});
$('profile-cancel-edit')?.addEventListener('click',resetProfileForm);
$('profiles-list')?.addEventListener('click',e=>{
  const row=e.target.closest('.profile-row');if(!row)return;
  const id=row.dataset.id;
  if(e.target.closest('.profile-row-select')){
    pendingDeleteId=null;
    changeActiveProfile(id);
    refreshProfileBar();refreshProfilesList();
    try{$('profiles-dialog').close();}catch(err){}
    return;
  }
  if(e.target.closest('.profile-row-edit')){
    pendingDeleteId=null;
    startEditProfile(id);
    refreshProfilesList();
    return;
  }
  if(e.target.closest('.profile-row-delete')){
    if(pendingDeleteId===id){
      saveProfiles(loadProfiles().filter(p=>p.id!==id));
      deleteProfileHistory(id);
      if(getActiveProfileId()===id)changeActiveProfile(null);
      if(editingProfileId===id)resetProfileForm();
      pendingDeleteId=null;
      refreshProfileBar();refreshProfilesList();
    }else{
      pendingDeleteId=id;
      refreshProfilesList();
    }
    return;
  }
});
$('profile-none-btn')?.addEventListener('click',()=>{
  pendingDeleteId=null;
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
  else if(currentSessionId&&currentSessionProfileId===id){
    text=lastSaveFailed?`Couldn’t save to ${p.name}’s history — this device’s storage may be full.`:`✓ Saved to ${p.name}’s history`;
    state=lastSaveFailed?'failed':'saved';
  }
  else{text=`Your answers will be saved to ${p.name}’s history`;state='pending';}
  if(el.textContent!==text)el.textContent=text;
  el.className='save-status'+(state?' '+state:'');
  el.hidden=!text;
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
  const activeId=getActiveProfileId();if(!activeId)return;
  const now=new Date().toISOString();
  const session={
    id:'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
    startedAt:now,updatedAt:now,
    settings:{digits:digit,rows:Number($('rows').value),count:questions.length,mode:$('mode').value,level:$('level').value},
    questions:questions.map(q=>({values:q.values,total:q.total})),
    answers:questions.map(()=>''),
    focusIndex:0,finished:false
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
  questions.forEach((q,i)=>{const el=$(`a-${i}`);if(el)el.value=session.answers[i]||'';});
  updateProgress();
  if(session.finished){
    reviewOnly=true;
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
  const activeId=getActiveProfileId();
  const sessions=activeId?getProfileSessions(activeId):[];
  if(!sessions.length){
    const empty=document.createElement('p');empty.className='profiles-intro';
    empty.textContent='No practice sessions yet. Start a sheet and it will show up here.';
    list.appendChild(empty);return;
  }
  for(const s of sessions){
    const row=document.createElement('button');
    row.type='button';row.className='history-row';row.dataset.id=s.id;
    const main=document.createElement('span');main.className='history-row-main';
    const dateSpan=document.createElement('span');dateSpan.className='history-row-date';dateSpan.textContent=formatDateTime(s.startedAt);
    const detailSpan=document.createElement('span');detailSpan.className='history-row-detail';
    const levelName=(AbacusTechniques.levels[s.settings.level]||{}).name||s.settings.level;
    detailSpan.textContent=`${levelName} · ${s.settings.digits}-digit · ${s.settings.rows} rows · ${s.settings.count} questions`;
    main.append(dateSpan,detailSpan);
    row.appendChild(main);
    const status=document.createElement('span');
    status.className='history-row-status '+(s.finished?'finished':'unfinished');
    status.textContent=s.finished?'✓ Finished':'↻ Unfinished';
    row.appendChild(status);
    list.appendChild(row);
  }
}
$('history-list')?.addEventListener('click',e=>{
  const row=e.target.closest('.history-row');if(!row)return;
  const activeId=getActiveProfileId();if(!activeId)return;
  loadSessionIntoSheet(activeId,row.dataset.id);
});
$('history-btn')?.addEventListener('click',()=>{
  const activeId=getActiveProfileId();
  const profile=activeId?loadProfiles().find(p=>p.id===activeId):null;
  $('history-subtitle').textContent=profile?`Sessions for ${profile.name}`:'';
  refreshHistoryList();
  try{$('history-dialog').showModal();}catch(err){}
});

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
function check(){let correct=0,answered=0;questions.forEach((q,i)=>{const value=$(`a-${i}`).value.trim(),valid=/^\d+$/.test(value),ok=valid&&Number(value)===q.total;if(value)answered++;if(ok)correct++;const card=$(`card-${i}`);card.className='card'+(value?(ok?' good':' retry'):'');if(value)retrigger(card,ok?'pop':'shake');const f=$(`f-${i}`);f.className='feedback '+(ok?'correct':'incorrect');f.textContent=revealed?`Answer: ${q.total}`:!value?'Try this one':ok?'Correct!':'Try again';});$('summary').textContent=correct===questions.length?`All ${correct} correct. Great work!`:`${correct} of ${questions.length} correct${answered<questions.length?` · ${questions.length-answered} to try`:''}`;if(!reviewOnly&&answered>0){if(correct===questions.length){playTone([[523,0.12],[659,0.12],[784,0.18]]);celebrate();}else if(correct<answered){playTone([[300,0.14]]);}}updateProgress();applyView();if(answered>0&&viewMode==='focus')showResultsPanel();if(!reviewOnly){ensureSession();syncSession(answered===questions.length);}return {correct,total:questions.length};}
$('check').addEventListener('click',check);
$('reveal').addEventListener('click',()=>{revealed=!revealed;$('reveal').textContent=revealed?'Hide answers':'Show answers';questions.forEach((q,i)=>{$(`f-${i}`).textContent=revealed?`Answer: ${q.total}`:'';$(`f-${i}`).className='feedback';});});
$('questions').addEventListener('input',e=>{if(!e.target.id.startsWith('a-'))return;const i=Number(e.target.id.slice(2));$(`card-${i}`).className='card';if(!revealed)$(`f-${i}`).textContent='';$('summary').textContent='';applyView();updateAbacusBeads(e.target.value);updateProgress();if(e.target.value.trim())playTone([[880,0.045]],0.09);ensureSession();syncSession();});
$('questions').addEventListener('focusin',e=>{if(e.target.matches&&e.target.matches('.answer input'))updateAbacusBeads(e.target.value);});
$('questions').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const next=Number(e.target.id.slice(2))+1;if(next<questions.length){if(viewMode==='focus')goToQuestion(next);else $(`a-${next}`).focus();}else check();}});
$('print').addEventListener('click',()=>window.print());generate();
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'generate_abacus_practice',description:'Replace the current sheet with new abacus questions using the chosen digits, rows, and operation.',inputSchema:{type:'object',properties:{digits:{type:'integer',minimum:1,maximum:4},rows:{type:'integer',minimum:2,maximum:100},questions:{type:'integer',minimum:1,maximum:30},mode:{type:'string',enum:['add','mixed']},level:{type:'string',enum:['free','direct','five','ten','combined']}},required:['digits','rows','questions','mode'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||!Number.isInteger(input.digits)||input.digits<1||input.digits>4||!Number.isInteger(input.rows)||input.rows<2||input.rows>100||!Number.isInteger(input.questions)||input.questions<1||input.questions>30||!['add','mixed'].includes(input.mode)||(input.level!==undefined&&!Object.hasOwn(AbacusTechniques.levels,input.level)))throw Error('Invalid practice settings');AbacusTechniques.validate(input.digits,input.rows,input.mode,input.level||'free');$('level').value=input.level||'free';updateLevelHelp();digit=input.digits;$('rows').value=input.rows;$('count').value=input.questions;$('mode').value=input.mode;for(const b of $('digits').children)b.setAttribute('aria-pressed',String(Number(b.dataset.digit)===digit));generate();return {digits:digit,rows:input.rows,questions:questions.length,mode:input.mode,level:$('level').value};}})).catch(()=>{});}catch{}}
