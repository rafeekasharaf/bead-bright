const assert=require('node:assert/strict');
const A=require('../techniques.js');
for(const [total,n,flags] of [[1,2,0],[1,5,0],[7,-2,0],[4,1,1],[5,-1,1],[9,1,2],[10,-1,2],[5,6,7],[12,-6,7],[49,1,3],[99,1,2],[100,-1,2],[14,12,1],[50,-1,3]]) {
 const result=A.classify(total,n);assert.equal(result.total,total+n);assert.equal(result.flags,flags,`${total} ${n}`);
}
// Independent bead inventory oracle for direct moves and five-only sheets.
function checkNoCarry(total,n,level){
 const a=String(total).padStart(8,'0').split('').map(Number), b=String(Math.abs(n)).padStart(8,'0').split('').map(Number);
 for(let i=0;i<a.length;i++){
   const sign=Math.sign(n),end=a[i]+sign*b[i];assert(end>=0&&end<=9,'Unexpected carry/borrow');
   if(level==='direct'){
     const beads=x=>[x>=5?1:0,x%5];const before=beads(a[i]),after=beads(end);
     assert(after.every((v,j)=>sign*(v-before[j])>=0),'Indirect bead exchange');
   }
 }
}
let tested=0;
const started=performance.now();
for(const level of Object.keys(A.levels))for(const digits of [1,2,3,4])for(const mode of ['add','mixed'])for(const rows of [2,5,9,29,100]){
 if(mode==='add'&&((level==='direct'&&rows>5)||(level==='five'&&rows>9)||(level==='ten'&&rows>29))){assert.throws(()=>A.makeQuestion(digits,rows,mode,level));continue;}
 for(let repeat=0;repeat<20;repeat++){
   let q;try{q=A.makeQuestion(digits,rows,mode,level);}catch(e){throw Error(JSON.stringify({digits,rows,mode,level})+": "+e.message);}assert.equal(q.values.length,rows);
   let total=q.values[0],flags=0;
   for(const n of q.values)assert(Math.abs(n)>=10**(digits-1)&&Math.abs(n)<10**digits,'Wrong digit length');
   for(const n of q.values.slice(1)){
     if(mode==='add')assert(n>0);assert(total+n>=0);
     const r=A.classify(total,n);assert.equal(r.total,total+n);assert(A.allowed(r.flags,level));flags|=r.flags;
     if(['direct','five'].includes(level))checkNoCarry(total,n,level);
     total+=n;
   }
   assert.equal(q.total,total);assert(A.targeted(flags,level));tested++;
 }
}
console.log(`${tested} question sequences passed; ${(performance.now()-started).toFixed(0)}ms`);
