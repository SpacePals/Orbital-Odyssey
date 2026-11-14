const D=require('../public/js/data.js'); global.OO_DATA=D;
const E=require('../public/js/engine.js');
const s=E.createOps('europa',['heavy','uflex','batt','dish','maspex','cam']);
let last='';
for(let i=0;i<2500&&!s.done;i++){E.step(s,0.1); if(s.phase!==last||i%100==0){console.log(s.t.toFixed(1),s.phase,'batt',s.batt.toFixed(0),'brown',s.brown,'net',s.net.toFixed(0),'gen',s.gen.toFixed(0),'load',s.load.toFixed(0),'comp',s.computerOK); last=s.phase;}}
console.log(s.done, s.events.map(e=>e.msg).join('\n'));
