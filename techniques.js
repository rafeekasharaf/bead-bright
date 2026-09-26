/* Soroban operations are applied from the highest place to the lowest.
   Flags: 1 = complement to five, 2 = complement to ten, 4 = nested five/ten. */
(function (root) {
  'use strict';
  const levels = {
    free: {name:'Unrestricted', help:'All addition and subtraction techniques. This is the original practice mode.'},
    direct: {name:'Direct beads', help:'Move beads directly, without complements to 5 or 10. Addition-only sheets allow up to 5 rows; choose mixed practice for longer sheets.'},
    five: {name:'Small friends (5)', help:'Direct moves and complements to 5, without carrying or borrowing. Every question includes a small-friend move. Addition-only sheets allow up to 9 rows.'},
    ten: {name:'Big friends (10)', help:'Direct moves and complements to 10, without small-friend moves. Every question includes carrying or borrowing. Addition-only sheets allow up to 29 rows.'},
    combined: {name:'Combined friends', help:'All techniques, with at least one nested 5-and-10 complement in every question.'}
  };
  const randint = (min,max) => min + Math.floor(Math.random()*(max-min+1));
  const choose = list => list[randint(0,list.length-1)];
  function direct(from,to,sign) {
    return sign*(Math.floor(to/5)-Math.floor(from/5)) >= 0 && sign*(to%5-from%5) >= 0;
  }
  function classify(total, operand) {
    if (!Number.isSafeInteger(total) || total<0 || !Number.isSafeInteger(operand) || total+operand<0) throw Error('Invalid calculation');
    let value=total, flags=0;
    function rod(place, amount) {
      if (!amount) return;
      const from=Math.floor(value/place)%10, next=from+amount, sign=Math.sign(amount);
      if (next>=0 && next<=9) {
        if (!direct(from,next,sign)) flags|=1;
        value+=amount*place;
      } else {
        flags|=2;
        const wrapped=(next+10)%10;
        if (!direct(from,wrapped,-sign)) flags|=5;
        rod(place*10,sign);
        value+=(wrapped-from)*place;
      }
    }
    const digits=String(Math.abs(operand));
    for(let i=0;i<digits.length;i++) rod(10**(digits.length-i-1),Math.sign(operand)*Number(digits[i]));
    return {flags,total:value};
  }
  function allowed(flags,level) {
    return level==='free'||level==='combined'||(level==='direct'?flags===0:level==='five'?(flags&~1)===0:(flags&~2)===0);
  }
  function targeted(flags,level) {
    return level==='five'?Boolean(flags&1):level==='ten'?Boolean(flags&2):level==='combined'?Boolean(flags&4):true;
  }
  function validate(digits,rows,mode,level) {
    if(!Number.isInteger(digits)||digits<1||digits>4||!Number.isInteger(rows)||rows<2||rows>100||!['add','mixed'].includes(mode)||!Object.hasOwn(levels,level)) throw Error('Choose 1–4 digits, 2–100 rows, and a valid practice level.');
    if(mode==='add'&&level==='direct'&&rows>5) throw Error('Direct-bead addition allows up to 5 rows with this digit length. Use 5 or fewer rows, or choose Addition & subtraction.');
    if(mode==='add'&&level==='ten'&&rows>29) throw Error('Big-friend addition without small friends allows up to 29 rows. Use 29 or fewer rows, mixed practice, or Combined friends.');
    if(mode==='add'&&level==='five'&&rows>9) throw Error('Small-friend addition allows up to 9 rows without carrying. Use 9 or fewer rows, or choose Addition & subtraction.');
  }
  const tenRoom = new Map();
  function tenSteps(top) {
    if(top>=49) return 0;
    if(tenRoom.has(top)) return tenRoom.get(top);
    let longest=0;
    for(let n=1;n<=9;n++) {
      const step=classify(top,n);
      if(allowed(step.flags,'ten')) longest=Math.max(longest,1+tenSteps(step.total));
    }
    tenRoom.set(top,longest);return longest;
  }
  function enoughRoom(total,remaining,min,level) {
    const top=Math.floor(total/min);
    return level==='direct' ? 5-Math.floor(top/5)-top%5>=remaining : level==='five'?9-top>=remaining:level==='ten'?tenSteps(top)>=remaining:true;
  }
  function candidate(total,digits,sign,level,remaining,mode) {
    let state=total,number=0,flags=0;
    for(let position=digits-1;position>=0;position--) {
      const place=10**position,options=[];
      for(let d=position===digits-1?1:0;d<=9;d++) {
        const delta=sign*d*place;
        if(state+delta<0) continue;
        const result=classify(state,delta);
        if(!allowed(result.flags,level)) continue;
        if(mode==='add'&&!enoughRoom(result.total,remaining,10**(digits-1),level)) continue;
        options.push({d,...result});
      }
      if(!options.length) return null;
      const picked=choose(options); state=picked.total; flags|=picked.flags;number+=picked.d*place;
    }
    return {operand:sign*number,total:state,flags};
  }
  function makeQuestion(digits,rows,mode,level='free') {
    validate(digits,rows,mode,level);
    const min=10**(digits-1),max=10**digits-1;
    for(let attempt=0;attempt<300;attempt++) {
      let total=randint(min,max),flags=0;
      if(mode==='add'&&!enoughRoom(total,rows-1,min,level)) continue;
      const values=[total];
      for(let row=1;row<rows;row++) {
        const sign=mode==='mixed'&&Math.random()<.5?-1:1;
        let step=candidate(total,digits,sign,level,rows-row-1,mode);
        if(!step&&mode==='mixed') step=candidate(total,digits,-sign,level,rows-row-1,mode);
        if(!step) break;
        values.push(step.operand);total=step.total;flags|=step.flags;
      }
      if(values.length===rows&&targeted(flags,level)) return {values,total};
    }
    throw Error('Could not make a full sheet for these settings. Try New practice again or choose fewer rows.');
  }
  const api={levels,classify,allowed,targeted,validate,makeQuestion};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  root.AbacusTechniques=api;
})(globalThis);
