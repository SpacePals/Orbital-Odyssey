const D=require('../public/js/data.js'); global.OO_DATA=D;
const E=require('../public/js/engine.js');
function run(scn, ids, policy){
  const s=E.createOps(scn,ids); let t=0; const dt=0.1;
  while(!s.done && t<200){
    if(policy) policy(s);
    E.step(s,dt); t+=dt;
  }
  const sc=E.score(s); return {s,sc};
}
function smart(s){
  // eclipse: power down if battery projected short
  if(s.phase==='eclipse'){
    const remain=20-s.phaseT, need=(s.load-s.b.genRTG)*s.scn.hoursPerSec*remain;
    if(s.batt<need*1.05 && s.b.instruments.length){ // shed biggest draw
      const on=s.b.instruments.filter(i=>s.inst[i.id]).sort((a,b)=>b.draw-a.draw);
      if(on.length) E.act(s,{type:'inst',id:on[0].id,on:false});
    }
  }
  if(s.phase==='nom1'||s.phase==='nom2'){ // re-enable
    if(!s.brown) E.act(s,{type:'allInst',on:true});
  }
  if(s.phase==='seu' && !s.computerOK && !s.rebooting){
    if(s.phaseT>1.0){ if(!s.backup) E.act(s,{type:'backup',on:true}); else E.act(s,{type:'reboot'}); }
  }
  if(s.phase==='dsn'){
    E.act(s,{type:'boost',on:true});
    const fill=s.buffer/s.bufCap; 
    const tgt = fill>0.7?0.25: fill>0.5?0.5:1;
    if(s.throttle!==tgt) E.act(s,{type:'throttle',v:tgt});
  }
  if(s.phase==='nom0' && s.buffer>0.6*s.bufCap) E.act(s,{type:'throttle',v:0.5});
}
const builds={
 leoGood:['leo',['ride','uflex','batt','dish','ka','msi','cam']],
 leoRadar:['leo',['ride','uflex','batt','dish','ka','msi','radar']],
 leoCheapOmni:['leo',['ride','si','batt','omni','cam']],
 leoNaive:['leo',['ride','si','omni','msi','cam','radar']],
 leoRtg:['leo',['ride','rtg','batt','omni','cam']],
 euClip:['europa',['heavy','uflex','batt','dish','massspec','cam']].map(x=>x==='massspec'?'maspex':x),
 euRtg:['europa',['heavy','rtg','batt','dish','maspex','cam']],
 euRtgKa:['europa',['heavy','rtg','batt','dish','ka','maspex','cam']],
 euRich:['europa',['super','rtg','uflex','batt','dish','ka','maspex','msi','radar']],
 euMid:['europa',['heavy','rtg','uflex','batt','dish','ka','maspex','msi']],
 euBest:['europa',['heavy','rtg','batt','dish','maspex','msi']],
 euSolarMix:['europa',['heavy','uflex','rtg','batt','dish','maspex']],
 euSi:['europa',['heavy','si','batt','omni','cam']],
 euSuperRtg:['europa',['super','rtg','batt','dish','ka','maspex','msi']],
};
for(const k in builds){
  const [scn,ids]=builds[k];
  const b=E.compute(scn,ids);
  const wn=b.warnings.map(w=>w.id).join(',');
  const r1=run(scn,ids,null), r2=run(scn,ids,smart);
  const f=(r)=>`${r.sc.rank} ov=${r.sc.overall.toFixed(0)} sci=${r.sc.yieldPct.toFixed(0)} eff=${r.sc.eff.toFixed(0)} surv=${r.sc.surv.toFixed(0)}`;
  console.log(k.padEnd(14),`m=${b.mass.toFixed(0)} c=${b.cost.toFixed(1)}/${b.scn.budget} gen=${b.gen.toFixed(0)} load=${b.load.toFixed(0)} dat=${b.data.toFixed(0)}/bw=${b.bw.toFixed(0)} dvm=${b.launch.margin&&b.launch.margin.toFixed(2)} [${wn}]`);
  console.log('   idle :',f(r1)); console.log('   smart:',f(r2), 'dsnfill', r2.s.results.dsn&&r2.s.results.dsn.fill.toFixed(2), 'idleFill', r1.s.results.dsn&&r1.s.results.dsn.fill.toFixed(2), 'idleOv', r1.s.ovSec.toFixed(1), 'pen', r1.s.pen.map(p=>p.key+p.pts).join('/'), 'minEcl', r2.s.minBattEcl.toFixed(2));
}
