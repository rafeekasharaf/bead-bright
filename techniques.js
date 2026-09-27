/* Soroban operations are applied from the highest place to the lowest.
   Flags: 1 = complement to five, 2 = complement to ten, 4 = nested five/ten. */
(function (root) {
  'use strict';
  const levels = {
    free: {
      name:'All techniques — Free practice',
      help:'Practise any combination of direct moves, friends of 5, and friends of 10. No technique restrictions.',
      example:'A sheet can include 2 + 2 (direct), 4 + 3 (friends of 5), and 8 + 4 (friends of 10). Follow the running total down each column.',
      formula:'Choose a focused technique below when you want to practise one particular bead skill.'
    },
    direct: {
      name:'Direct moves — No friend formulas',
      help:'Add or remove available beads directly. No exchanges using 5 and no carrying or borrowing using 10. Addition-only sheets allow up to 5 rows; use mixed practice for longer sheets.',
      example:'2 + 2 = 4. Start with two lower beads touching the bar. Move two more toward the bar. No exchange is needed.',
      formula:'2 + 2 = 4'
    },
    five: {
      name:'Small friends — Friends of 5',
      help:'Exchange the five-bead when there are not enough lower beads to add or remove directly. Each question includes at least one friends-of-5 step. No carrying or borrowing. Addition-only sheets allow up to 9 rows.',
      example:'4 + 3 = 7. All four lower beads are already in use. Since 3 + 2 = 5, add the five-bead and remove two lower beads. Friend pairs: 1 and 4; 2 and 3. For subtraction, 5 − 3 uses −5 +2.',
      formula:'4 + 5 − 2 = 7'
    },
    ten: {
      name:'Big friends — Friends of 10',
      help:'Carry or borrow between place-value rods. Each question includes at least one friends-of-10 step, without a friends-of-5 exchange. Addition-only sheets allow up to 29 rows.',
      example:'8 + 4 = 12. Since 4 + 6 = 10, add one ten on the next rod and remove six from the ones rod. Friend pairs: 1 and 9; 2 and 8; 3 and 7; 4 and 6; 5 and 5. For subtraction, 12 − 4 uses −10 +6.',
      formula:'8 + 10 − 6 = 12'
    },
    combined: {
      name:'Combined friends — 5 and 10 together',
      help:'Practise steps where carrying or borrowing also needs a friends-of-5 exchange. Each question includes at least one combined step. Other steps may use direct moves or either friend technique.',
      example:'5 + 6 = 11. Adding six uses friends of 10: +10 −4. Removing four from a rod showing five also needs friends of 5: −5 +1. Use both exchanges in the same step.',
      formula:'5 + 10 − 5 + 1 = 11'
    }
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
