const D=require('../public/js/data.js'); global.OO_DATA=D;
const E=require('../public/js/engine.js');
function dsnFill(scn,ids,mode){
  const s=E.createOps(scn,ids); 
  let t=0;
  while(!s.done&&t<200){
    if(s.phase==='dsn'){ if(mode.boost) E.act(s,{type:'boost',on:true}); if(mode.thr!=null&&s.throttle!==mode.thr) E.act(s,{type:'throttle',v:mode.thr}); }
    if(s.phase==='seu'&&!s.computerOK&&!s.rebooting&&s.phaseT>1){ if(!s.backup)E.act(s,{type:'backup',on:true}); else E.act(s,{type:'reboot'});}
    E.step(s,0.1);t+=0.1;}
  return (s.results.dsn.fill).toFixed(2)+(s.ovSec>0?'!':'');
}
const tests=[['leo',['ride','uflex','batt','dish','ka','msi','cam']],['leo',['ride','uflex','batt','dish','ka','msi','radar']],['leo',['ride','uflex','batt','dish','msi','radar']],['leo',['ride','si','batt','omni','cam']],['leo',['ride','uflex','batt','omni','msi']],
['europa',['heavy','rtg','batt','dish','ka','maspex','msi']],['europa',['heavy','rtg','batt','dish','maspex','msi']],['europa',['heavy','rtg','batt','dish','maspex','cam']],['europa',['heavy','rtg','batt','omni','cam']],['europa',['heavy','rtg','batt','dish','ka','maspex','radar']]];
const caps=process.argv.slice(2).map(Number);
for(const [scn,ids] of tests){
  for(const cap of [scn==='leo'?caps[0]:caps[1]]){
    D.SCENARIOS[scn].bufferCap=cap;
    const r=['none','boost','thr50','thr25','boost+thr50'].map((m,i)=>dsnFill(scn,ids,[{},{boost:1},{thr:.5},{thr:.25},{boost:1,thr:.5}][i]));
    console.log(scn,ids.join(','),'cap',cap,'| none/boost/thr50/thr25/b+t50:',r.join(' '));
  }
}
