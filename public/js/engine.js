/* Orbital Odyssey — engine (pure logic, no DOM). Works in browser and Node. */
(function (root) {
  'use strict';
  var D = root.OO_DATA || (typeof require !== 'undefined' ? require('./data.js') : null);
  var G0 = 9.80665;
  var ECLIPSE_SEC = 20;
  var DUR = { nom0: 5, eclipse: ECLIPSE_SEC, nom1: 4, nom2: 4, dsn: 24, tail: 3 };

  function comp(id) { for (var i = 0; i < D.COMPONENTS.length; i++) if (D.COMPONENTS[i].id === id) return D.COMPONENTS[i]; return null; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function r1(v) { return Math.round(v * 10) / 10; }

  /* ---------- Tsiolkovsky ---------- */
  function launchModel(booster, scnId, payload) {
    var L = booster && booster.launch ? booster.launch[scnId] : null;
    if (!L) return { canReach: false };
    // Choose inert (dry) mass so that capacity `cap` gives exactly the required delta-v.
    var ratioAtCap = Math.exp(L.req * 1000 / (L.ve * 1000));
    var dry = (L.wet + L.cap) / ratioAtCap - L.cap;
    var m0 = L.wet + payload, mf = dry + payload;
    var dv = L.ve * Math.log(m0 / mf);
    return { canReach: true, cap: L.cap, req: L.req, ve: L.ve, wet: L.wet, dry: dry, m0: m0, mf: mf, ratio: m0 / mf,
      dv: dv, margin: dv - L.req, transit: L.transit, route: L.route, isp: L.ve * 1000 / G0 };
  }

  /* ---------- Build totals + warnings ---------- */
  function compute(scnId, ids) {
    var scn = D.SCENARIOS[scnId];
    var items = [], i, c, st;
    for (i = 0; i < ids.length; i++) { c = comp(ids[i]); if (c) items.push(c); }
    var has = {}; items.forEach(function (c) { has[c.id] = true; });
    var booster = items.filter(function (c) { return c.kind === 'booster'; })[0] || null;
    var L = booster ? booster.launch[scnId] : null;
    var transit = L ? L.transit : 0;
    var solarDeg = 1 - 0.02 * transit, rtgDeg = 1 - 0.015 * transit;
    var mass = scn.bus.mass, cost = scn.bus.cost, genSolar = 0, genRTG = 0;
    var load = scn.bus.load, dataRaw = 0, sci = 0, battWh = 0, bwBase = 0, telDraw = 0, instDraw = 0;
    var antenna = null, ka = false, instruments = [];
    items.forEach(function (c) {
      st = c.stats[scnId];
      cost += st.cost;
      if (c.kind !== 'booster') mass += st.mass;
      if (c.kind === 'instrument') { instDraw += st.draw; load += st.draw; dataRaw += st.data; sci += st.sci; instruments.push({ id: c.id, code: c.code, name: c.name, draw: st.draw, data: st.data, sci: st.sci }); }
      if (c.kind === 'solar') genSolar += st.gen * scn.solar * solarDeg;
      if (c.kind === 'rtg') genRTG += st.gen * rtgDeg;
      if (c.kind === 'battery') battWh += st.batt;
      if (c.kind === 'antenna') { antenna = c; bwBase = st.bw; telDraw += st.draw; load += st.draw; }
      if (c.kind === 'ka') { ka = true; telDraw += st.draw; load += st.draw; }
    });
    var compression = ka ? 0.75 : 1;
    var data = dataRaw * compression;
    var bw = bwBase * (ka && antenna ? 1.4 : 1);
    var gen = genSolar + genRTG;
    var net = gen - load;
    var eclipseHours = scn.hoursPerSec * ECLIPSE_SEC;
    var eclipseNeedWh = Math.max(0, load + scn.heater - genRTG) * eclipseHours;
    var eclipseCovered = eclipseNeedWh <= 0 || battWh >= eclipseNeedWh;
    var payload = mass;
    var lm = launchModel(booster, scnId, payload);
    var capacity = booster ? (lm.canReach ? lm.cap : 0) : 0;
    var b = {
      scnId: scnId, scn: scn, items: items, has: has, booster: booster, launch: lm, instruments: instruments,
      mass: mass, cost: cost, budgetLeft: scn.budget - cost, massCap: scn.massCap, boosterCap: capacity,
      genSolar: genSolar, genRTG: genRTG, gen: gen, load: load, net: net, instDraw: instDraw, telDraw: telDraw,
      dataRaw: dataRaw, data: data, compression: compression, bw: bw, battWh: battWh, hasKa: ka, antenna: antenna,
      sci: sci, transit: transit, solarDeg: solarDeg, rtgDeg: rtgDeg, eclipseHours: eclipseHours,
      eclipseNeedWh: eclipseNeedWh, eclipseCovered: eclipseCovered
    };
    b.warnings = warnings(b);
    return b;
  }

  function warnings(b) {
    var w = [], scn = b.scn;
    if (b.net < 0) w.push({ id: 'brownout', level: 'crit', title: 'POWER SHORTAGE',
      text: 'Power deficit of ' + r1(Math.abs(b.net)) + ' W. Generation (' + r1(b.gen) + ' W) cannot keep up with consumption (' + r1(b.load) + ' W). Add more solar panels or an RTG.' });
    if (b.data > b.bw + 1e-9 && b.data > 0) w.push({ id: 'overflow', level: 'crit', title: 'DATA OVERFLOW RISK',
      text: 'Science instruments generate ' + fmt(b.data) + ' kbps, but your antenna only sends ' + fmt(b.bw) + ' kbps. The data buffer will fill up and lose science!' });
    if (b.booster && !b.launch.canReach) w.push({ id: 'dv', level: 'crit', title: 'ROCKET TOO WEAK',
      text: b.booster.name + ' cannot reach ' + scn.destName + '. Pick a heavier rocket on the Rocket tab.' });
    else if (b.booster && b.mass > b.boosterCap) w.push({ id: 'dv', level: 'crit', title: 'TOO HEAVY FOR ROCKET',
      text: 'Spacecraft weight (' + r1(b.mass) + ' kg) exceeds this rocket\u2019s ' + b.boosterCap + ' kg limit. Remove heavy parts or pick a bigger rocket.' });
    if (b.mass > b.massCap) w.push({ id: 'masscap', level: 'crit', title: 'OVER WEIGHT LIMIT',
      text: 'Mission limit is ' + b.massCap + ' kg, but your design weighs ' + r1(b.mass) + ' kg (' + r1(b.mass - b.massCap) + ' kg over).' });
    if (b.budgetLeft < 0) w.push({ id: 'budget', level: 'crit', title: 'OVER BUDGET',
      text: 'Total cost is $' + r1(b.cost) + 'M against your $' + scn.budget + 'M budget (over by $' + r1(-b.budgetLeft) + 'M).' });
    if (!b.eclipseCovered && b.net >= 0) w.push({ id: 'eclipse', level: 'warn', title: 'NIGHT SHADOW RISK',
      text: b.battWh <= 0 && b.genRTG < b.load + scn.heater ? 'No battery or nuclear generator! The spacecraft will completely shut down when flying behind the planet.' : 'Battery holds ' + Math.round(b.battWh) + ' Wh, but night-time needs about ' + Math.round(b.eclipseNeedWh) + ' Wh. You will need to turn off hungry instruments.' });
    if (b.hasKa && !b.antenna) w.push({ id: 'kanoant', level: 'warn', title: 'RADIO BOOSTER NEEDS ANTENNA', text: 'The Ka-band booster needs a primary antenna to transmit through.' });
    if (!b.antenna && b.instruments.length) w.push({ id: 'noant', level: 'crit', title: 'NO RADIO ANTENNA', text: 'Without an antenna, photos and science data can never be sent back to Earth!' });
    if (!b.booster) w.push({ id: 'nobooster', level: 'warn', title: 'NO ROCKET SELECTED', text: 'Select a launch vehicle on the Rocket tab.' });
    if (!b.instruments.length) w.push({ id: 'nosci', level: 'info', title: 'NO SCIENCE INSTRUMENTS', text: 'Install at least one camera or sensor to collect science points.' });
    return w;
  }

  function fmt(v) { return v >= 100 ? String(Math.round(v)) : String(r1(v)); }

  /* ---------- Launch gate ---------- */
  function launchCheck(b) {
    var fails = [], scn = b.scn;
    if (b.budgetLeft < 0) fails.push({
      id: 'budget', title: 'Budget Exceeded',
      body: 'Your design costs $' + r1(b.cost) + 'M, but mission funding is limited to $' + scn.budget + 'M. The launch was held: you are $' + r1(-b.budgetLeft) + 'M over budget.',
      fix: ['Swap an expensive component for an affordable one (e.g. RTG \u2192 solar panel, dish \u2192 whip antenna).', 'Choose a cheaper rocket, or remove non-essential instruments.']
    });
    if (b.mass > b.massCap) fails.push({
      id: 'masscap', title: 'Spacecraft Too Heavy for Mission',
      body: 'The spacecraft weighs ' + r1(b.mass) + ' kg, but the mission weight cap is ' + b.massCap + ' kg. The craft is ' + r1(b.mass - b.massCap) + ' kg too heavy.',
      fix: ['Remove the heaviest instrument or power generator.', 'Choose lighter components (e.g. compact camera or deployable solar wings).']
    });
    if (b.booster) {
      var lm = b.launch;
      if (!lm.canReach) fails.push({
        id: 'dv', title: 'Rocket Cannot Reach Target Destination',
        body: b.booster.name + ' does not have enough speed or fuel to escape Earth and reach ' + scn.destName + '. You need about ' + (scn.dest === 'europa' ? '13\u201316' : '9.4') + ' km/s of rocket speed.',
        fix: ['Open the Rocket tab and choose the Commercial Heavy Rocket or Super Heavy Launch System.'],
        tsio: null
      });
      else if (b.mass > lm.cap) fails.push({
        id: 'dv', title: 'Spacecraft Too Heavy for This Rocket',
        body: 'Every extra kilogram of payload robs rocket speed. With ' + r1(b.mass) + ' kg on top of ' + b.booster.name + ', the rocket only achieves ' + lm.dv.toFixed(2) + ' km/s, falling short of the needed ' + lm.req.toFixed(1) + ' km/s speed by ' + (-lm.margin).toFixed(2) + ' km/s.',
        fix: ['Cut spacecraft weight below ' + lm.cap + ' kg (' + r1(b.mass - lm.cap) + ' kg to remove).', 'Or upgrade to a bigger rocket on the Rocket tab.'],
        tsio: { ve: lm.ve, m0: lm.m0, mf: lm.mf, dv: lm.dv, req: lm.req, cap: lm.cap }
      });
    }
    return fails;
  }

  /* ---------- Operations simulation ---------- */
  function createOps(scnId, ids) {
    var b = compute(scnId, ids), scn = b.scn;
    var inst = {};
    b.instruments.forEach(function (i) { inst[i.id] = true; });
    return {
      scnId: scnId, scn: scn, b: b, t: 0, phase: 'nom0', phaseT: 0, done: false,
      inst: inst, throttle: 1, boost: false, backup: false, computerOK: true, rebooting: false, rebootT: 0,
      sunlit: true, batt: b.battWh, battMax: b.battWh, minBattEcl: 1, buffer: 0.08 * scn.bufferCap, bufCap: scn.bufferCap,
      linkQ: 1, gen: b.gen, load: b.load, net: b.gen - b.load,
      brown: false, brownRec: 0, brownCount: 0, collapseT: 0,
      sci: 0, elapsed: 0, ov: false, ovSec: 0, ovEvents: 0, throttleSec: 0, offSec: 0, faultSec: 0,
      pen: [], events: [], pending: [], results: { eclipse: null, seu: null, dsn: null },
      seu: null, seuFails: 0, eclBrown: false, dsnPeak: 0, radDose: 0, timeline: { start: 0 }
    };
  }

  function ev(s, level, kind, msg) { var e = { t: s.t, level: level, kind: kind, msg: msg }; s.events.push(e); s.pending.push(e); return e; }
  function penalty(s, key, pts, msg) { s.pen.push({ key: key, pts: pts, msg: msg }); }

  function linkQuality(x) {
    // ground-station pass closing: full strength, steep drop, then a long weak tail
    if (x <= 0.15) return 1;
    if (x >= 0.55) return 0.08;
    var u = (x - 0.15) / 0.4; return 1 - 0.92 * (u * u * (3 - 2 * u));
  }

  function startPhase(s, p) {
    s.phase = p; s.phaseT = 0;
    var scn = s.scn;
    if (p === 'eclipse') {
      s.sunlit = false; s.eclBrown = false;
      ev(s, 'crit', 'crisis1', 'PLANETARY ECLIPSE: entering ' + scn.shadowName + '. Solar generation 0 W.');
    } else if (p === 'nom1') {
      s.sunlit = true;
      if (s.b && s.b.instruments) { s.b.instruments.forEach(function (i) { s.inst[i.id] = true; }); }
      var e = s.results.eclipse = { brown: s.eclBrown, minBatt: s.minBattEcl, ok: !s.eclBrown };
      ev(s, e.ok ? 'good' : 'warn', 'eclipseEnd', e.ok ? 'Back in sunlight! Solar generation restored \u2014 instruments back online.' : 'Back in sunlight, but the eclipse caused a brownout.');
    } else if (p === 'seu') {
      var word = Math.floor(Math.random() * 0xFFFF), bit = Math.floor(Math.random() * 16);
      s.seu = { word: word, bit: bit, t0: s.t };
      s.computerOK = false; s.rebooting = false; s.backup = false;
      ev(s, 'crit', 'crisis2', 'SINGLE-EVENT UPSET: a charged particle flipped bit ' + bit + ' in flight-computer memory.');
    } else if (p === 'nom2') {
      // result already stored
    } else if (p === 'dsn') {
      if (s.buffer < 0.5 * s.bufCap) s.buffer = 0.5 * s.bufCap;
      ev(s, 'crit', 'crisis3', 'DSN DOWNLINK WINDOW CLOSING: ' + scn.dsnName + ' is dropping below the horizon.');
    } else if (p === 'tail') {
      var fill = s.buffer / s.bufCap;
      var cleared = fill <= 0.35, over = s.ovSec > 0;
      s.results.dsn = { fill: fill, cleared: cleared, overflow: over, ovSec: s.ovSec };
      ev(s, cleared ? 'good' : (over ? 'crit' : 'warn'), 'dsnEnd', cleared ? 'Pass complete. Buffer cleared to ' + Math.round(fill * 100) + '%.' : 'Window closed with the buffer at ' + Math.round(fill * 100) + '%. Data left on board.');
      if (over) penalty(s, 'overflow', clamp(s.ovSec * 1.2, 4, 20), 'Memory buffer overflowed for ' + s.ovSec.toFixed(1) + ' s and data was lost.');
      else if (!cleared) penalty(s, 'dsnnotclear', 6, 'Downlink window closed with the buffer not cleared.');
    }
  }

  function instOnList(s) { return s.b.instruments.filter(function (i) { return s.inst[i.id]; }); }

  function act(s, a) {
    if (s.done) return false;
    var msg;
    if (a.type === 'backup') {
      if (s.brown) { return reject(s, 'POWER BUS COLLAPSED: backup bus cannot be routed.'); }
      s.backup = !!a.on; return true;
    }
    if (a.type === 'reboot') {
      if (s.phase !== 'seu' || s.computerOK) return false;
      if (s.rebooting) return false;
      if (s.phaseT >= s.scn.seuWindow) return reject(s, 'WINDOW EXPIRED: the watchdog is taking over.');
      if (!s.backup) {
        s.seuFails++; ev(s, 'warn', 'rebootFail', 'REBOOT REJECTED: primary power bus is latched up. Route BACKUP POWER first.');
        return false;
      }
      s.rebooting = true; s.rebootT = 3;
      ev(s, 'info', 'reboot', 'Rebooting flight computer on backup bus\u2026');
      return true;
    }
    if (!s.computerOK) return reject(s, 'FLIGHT COMPUTER FAULT: commands not accepted. Recover the computer first.');
    if (a.type === 'inst') {
      if (s.brown && a.on) return reject(s, 'POWER BUS COLLAPSED: cannot power instruments yet.');
      s.inst[a.id] = !!a.on; return true;
    }
    if (a.type === 'allInst') {
      if (s.brown && a.on) return reject(s, 'POWER BUS COLLAPSED: cannot power instruments yet.');
      Object.keys(s.inst).forEach(function (k) { s.inst[k] = !!a.on; }); return true;
    }
    if (a.type === 'throttle') { s.throttle = a.v; return true; }
    if (a.type === 'boost') {
      if (s.brown && a.on) return reject(s, 'POWER BUS COLLAPSED: no power for transmitter boost.');
      s.boost = !!a.on; return true;
    }
    return false;
  }
  function reject(s, m) { ev(s, 'warn', 'reject', m); return false; }

  function step(s, dt) {
    if (s.done) return;
    var scn = s.scn, b = s.b, hps = scn.hoursPerSec;
    s.t += dt; s.phaseT += dt; s.elapsed += dt;
    // ---- phase transitions
    if (s.phase === 'nom0' && s.phaseT >= DUR.nom0) startPhase(s, 'eclipse');
    else if (s.phase === 'eclipse' && s.phaseT >= DUR.eclipse) startPhase(s, 'nom1');
    else if (s.phase === 'nom1' && s.phaseT >= DUR.nom1) startPhase(s, 'seu');
    else if (s.phase === 'seu') {
      if (s.computerOK) {
        var dtRec = s.t - s.seu.t0;
        s.results.seu = { ok: true, time: dtRec, fails: s.seuFails };
        if (dtRec > 6) penalty(s, 'seuslow', clamp((dtRec - 6) * 1.5, 1, 10), 'Flight computer was down for ' + dtRec.toFixed(1) + ' s.');
        ev(s, 'good', 'seuEnd', 'FLIGHT COMPUTER RECOVERED in ' + dtRec.toFixed(1) + ' s. Telemetry nominal.');
        startPhase(s, 'nom2');
      } else if (s.phaseT >= scn.seuWindow && !s.rebooting) {
        s.results.seu = { ok: false, time: scn.seuWindow, fails: s.seuFails };
        s.computerOK = true; s.backup = false;
        penalty(s, 'seufail', 45, 'The upset was not cleared in time; the watchdog forced a late reset from the ground.');
        ev(s, 'crit', 'seuEnd', 'WATCHDOG RESET: computer restored by the ground, but the delay cost science and risk.');
        startPhase(s, 'nom2');
      }
    }
    else if (s.phase === 'nom2' && s.phaseT >= DUR.nom2) startPhase(s, 'dsn');
    else if (s.phase === 'dsn' && s.phaseT >= DUR.dsn) startPhase(s, 'tail');
    else if (s.phase === 'tail' && s.phaseT >= DUR.tail) { s.done = true; ev(s, 'good', 'done', 'Mission time complete. Preparing evaluation report\u2026'); }

    // ---- link quality
    if (s.phase === 'dsn') { s.linkQ = linkQuality(s.phaseT / DUR.dsn); }
    else if (s.phase === 'tail') s.linkQ = 0.08;
    else s.linkQ = 1;

    // ---- reboot progress (needs power)
    var surge = 0;
    if (s.rebooting) {
      surge = scn.rebootSurge;
      s.rebootT -= dt;
      if (s.rebootT <= 0) {
        s.rebooting = false;
        if (s.brown || (s.batt <= 0 && s.net < 0)) {
          s.seuFails++; ev(s, 'crit', 'rebootFail', 'REBOOT ABORTED: bus undervoltage. Free up power and try again.');
        } else {
          s.computerOK = true; s.backup = false;
        }
      }
    }

    // ---- power
    var instLoad = 0;
    b.instruments.forEach(function (i) { if (s.inst[i.id]) instLoad += i.draw; });
    var load = b.scn.bus.load + instLoad + b.telDraw * (s.boost ? 1.8 : 1) + (s.phase === 'eclipse' ? scn.heater : 0) + (s.backup ? scn.backupLoad : 0) + surge;
    var gen = (s.sunlit ? b.genSolar : 0) + b.genRTG;
    s.gen = gen; s.load = load; s.net = gen - load;
    var dWh = s.net * hps * dt * (s.net > 0 ? 0.92 : 1);
    s.batt = clamp(s.batt + dWh, 0, s.battMax);
    if (s.phase === 'eclipse' && s.battMax > 0) s.minBattEcl = Math.min(s.minBattEcl, s.batt / s.battMax);
    if (s.phase === 'eclipse' && s.battMax <= 0) s.minBattEcl = 0;

    if (!s.brown && s.net < 0 && s.batt <= 0.0001) {
      s.brown = true; s.brownRec = 0; s.brownCount++;
      if (s.phase === 'eclipse') s.eclBrown = true;
      Object.keys(s.inst).forEach(function (k) { s.inst[k] = false; });
      s.boost = false;
      if (s.brownCount <= 3) penalty(s, 'brownout', 20, 'Brownout #' + s.brownCount + ': the battery ran flat and the craft dropped into safe mode.');
      ev(s, 'crit', 'brownout', 'BROWNOUT: battery empty. Safe mode: science instruments powered OFF.');
    } else if (s.brown) {
      var floorLoad = scn.bus.load + b.telDraw + (s.phase === 'eclipse' ? scn.heater : 0);
      if (gen - floorLoad < 0) {
        s.collapseT += dt;
        if (s.collapseT > 1.5) { s.collapseT = 0; penalty(s, 'collapse', 3, 'Power bus collapsed: even the bare craft needs more than the generators can supply.'); }
      }
      if (s.net >= 0) { s.brownRec += dt; if (s.brownRec > 2) { s.brown = false; ev(s, 'info', 'recovered', 'Power restored. Re-enable science instruments when ready.'); } }
      else s.brownRec = 0;
    }
    if (s.brown && s.net < 0) s.faultSec += dt;

    // ---- data buffer
    var dataIn = 0, sciRate = 0;
    if (s.computerOK && !s.brown) {
      b.instruments.forEach(function (i) {
        if (s.inst[i.id]) { dataIn += i.data * b.compression * s.throttle; sciRate += i.sci * s.throttle; }
      });
    }
    var out = s.brown ? 0 : b.bw * s.linkQ * (s.boost ? 1.5 : 1);
    s.dataIn = dataIn; s.dataOut = out;
    var prev = s.buffer;
    s.buffer = clamp(s.buffer + (dataIn - out) * dt, 0, s.bufCap);
    var wasOv = s.ov;
    s.ov = s.buffer >= s.bufCap - 1e-6 && dataIn > out;
    if (s.ov) { s.ovSec += dt; if (!wasOv) { s.ovEvents++; ev(s, 'crit', 'overflow', 'BUFFER OVERFLOW: memory full, new science data is being lost.'); } }
    if (s.phase === 'dsn') s.dsnPeak = Math.max(s.dsnPeak, s.buffer / s.bufCap);
    if (s.ov || !s.computerOK) sciRate = 0;
    s.sci += sciRate * dt;
    if (s.throttle < 1 && s.computerOK) s.throttleSec += dt;
    s.radDose += dt * scn.radLevel;
  }

  /* ---------- Scoring ---------- */
  function score(s) {
    var b = s.b, scn = s.scn;
    var yieldPct = clamp(100 * s.sci / (scn.benchmark * Math.max(1, s.elapsed)), 0, 100);
    var spentFrac = b.cost / scn.budget, massFrac = b.mass / scn.massCap;
    var costEff = clamp((yieldPct / 100) / Math.max(0.25, spentFrac), 0, 1);
    var massEff = clamp((yieldPct / 100) / Math.max(0.25, massFrac), 0, 1);
    var powerEff = b.gen >= b.load ? clamp((b.load / Math.max(1, b.gen)) / 0.75, 0, 1) : 0.5 * (b.gen / Math.max(1, b.load));
    var eff = 100 * clamp(0.55 * costEff + 0.25 * massEff + 0.2 * powerEff, 0, 1);
    var pts = 0; s.pen.forEach(function (p) { pts += p.pts; });
    var surv = clamp(100 - pts, 0, 100);
    var overall = 0.45 * yieldPct + 0.25 * eff + 0.30 * surv;
    var rank = overall >= 82 ? 'S' : overall >= 68 ? 'A' : overall >= 52 ? 'B' : 'C';
    var loss = surv <= 30 || yieldPct < 8;
    if (loss) rank = 'Mission Loss';
    return { yieldPct: yieldPct, eff: eff, surv: surv, overall: overall, rank: rank, loss: loss,
      spent: b.cost, massFrac: massFrac, spentFrac: spentFrac };
  }

  /* ---------- Real mission matching ---------- */
  var TAGW = { smallsat: 3, flagship: 3, earthorbit: 2, outer: 2, solar: 2.5, rtg: 3, battery: 1, omni: 1.5, dish: 2, ka: 2,
    optical: 2, msi: 2.5, radar: 2.5, maspex: 2.5, rideshare: 2, heavy: 2, super: 2 };
  function buildTags(scnId, ids) {
    var t = {}, has = {};
    ids.forEach(function (i) { has[i] = true; });
    t[scnId === 'leo' ? 'smallsat' : 'flagship'] = 1;
    t[scnId === 'leo' ? 'earthorbit' : 'outer'] = 1;
    if (has.si || has.uflex) t.solar = 1;
    if (has.rtg) t.rtg = 1;
    if (has.batt) t.battery = 1;
    if (has.omni) t.omni = 1;
    if (has.dish) t.dish = 1;
    if (has.ka) t.ka = 1;
    if (has.cam) t.optical = 1;
    if (has.msi) t.msi = 1;
    if (has.radar) t.radar = 1;
    if (has.maspex) t.maspex = 1;
    if (has.ride) t.rideshare = 1;
    if (has.heavy) t.heavy = 1;
    if (has.super) t.super = 1;
    return t;
  }
  function match(scnId, ids) {
    var mine = buildTags(scnId, ids);
    return D.REAL_MISSIONS.map(function (m) {
      var ref = {}; m.tags.forEach(function (k) { ref[k] = 1; });
      var inter = 0, uni = 0;
      Object.keys(TAGW).forEach(function (k) {
        var a = mine[k] ? 1 : 0, c = ref[k] ? 1 : 0;
        inter += TAGW[k] * Math.min(a, c); uni += TAGW[k] * Math.max(a, c);
      });
      var sim = uni ? inter / uni : 0;
      return { mission: m, sim: Math.round(clamp(sim, 0, 1) * 100) };
    }).sort(function (a, b) { return b.sim - a.sim; });
  }

  /* ---------- Root cause analysis ---------- */
  function causes(s, sc, ids) {
    var b = s.b, scn = s.scn, out = [];
    function add(tone, text) { out.push({ tone: tone, text: text }); }
    var solarOnly = (b.has.si || b.has.uflex) && !b.has.rtg;
    // Power
    if (scn.solar < 1 && (b.has.si || b.has.uflex)) {
      add(b.net >= 0 ? 'good' : 'bad', 'At 5.2 AU sunlight is just ' + scn.solarPct + '% of Earth\u2019s (inverse-square law), so your ' + (b.has.uflex ? 'UltraFlex wings' : 'silicon array') + ' made about ' + Math.round(b.genSolar) + ' W' + (b.transit ? ' after ' + b.transit + ' years of cruise degradation' : '') + '.' + (b.net < 0 ? ' That was less than your ' + Math.round(b.load) + ' W demand.' : ''));
    }
    if (b.has.rtg) add('good', 'The RTG delivered a steady ' + Math.round(b.genRTG) + ' W through every eclipse and at any distance from the Sun' + (b.net >= 0 ? ', keeping your craft alive.' : ', though it still was not enough for your total load.'));
    if (s.brownCount > 0) add('bad', 'You suffered ' + s.brownCount + ' brownout' + (s.brownCount > 1 ? 's' : '') + (!b.has.batt ? ': with no battery pack, the first dip in generation meant instant safe mode.' : ': the battery ran flat. Powering instruments down sooner would have stretched it.'));
    else if (s.results.eclipse && s.results.eclipse.ok) add('good', 'You survived ' + scn.shadowName + (b.battMax > 0 ? ' with ' + Math.round(100 * s.results.eclipse.minBatt) + '% battery to spare.' : ' thanks to your generator.'));
    // Telecom
    if (b.antenna) {
      var ratio = b.bw / Math.max(1, b.data);
      if (b.data > b.bw) add('bad', 'Your ' + b.antenna.name + ' carries ' + fmt(b.bw) + ' kbps but the instruments produced ' + fmt(b.data) + ' kbps' + (b.hasKa ? ' (even after Ka compression)' : '') + ': the link was the bottleneck.');
      else add('good', 'The ' + b.antenna.name + (b.hasKa ? ' with Ka-band compression' : '') + ' gave ' + ratio.toFixed(1) + '\u00d7 more bandwidth than your data load.');
    } else add('bad', 'With no antenna, nothing you measured could be sent home.');
    if (s.ovSec > 0) add('bad', 'The memory buffer overflowed for ' + s.ovSec.toFixed(1) + ' s, so that science data was lost forever.');
    if (s.results.dsn) add(s.results.dsn.cleared ? 'good' : 'warn', s.results.dsn.cleared ? 'You cleared the buffer to ' + Math.round(100 * s.results.dsn.fill) + '% before the DSN window closed.' : 'The DSN window closed with ' + Math.round(100 * s.results.dsn.fill) + '% of the buffer still full.');
    if (s.throttleSec > 3) add('info', 'You throttled data capture for ' + s.throttleSec.toFixed(0) + ' s \u2014 a good lever, but each second throttled is science you did not collect.');
    // SEU
    if (s.results.seu) add(s.results.seu.ok ? (s.results.seu.time <= 6 ? 'good' : 'warn') : 'bad', s.results.seu.ok ? 'Radiation flipped a bit in the flight computer; you rerouted to backup power and rebooted in ' + s.results.seu.time.toFixed(1) + ' s.' : 'The radiation upset was not cleared in time, so ground control had to reset the computer late.');
    // Launch
    if (b.booster) {
      if (b.transit > 0) add('info', b.booster.name + ' needs ' + b.transit + ' years to reach Jupiter' + '. Over that time solar cells lose about ' + Math.round((1 - b.solarDeg) * 100) + '% and the RTG about ' + Math.round((1 - b.rtgDeg) * 100) + '% of output.');
      else if (scn.id === 'leo' && b.has.ride) add('good', 'The rideshare seat kept launch cost to $' + b.booster.stats.leo.cost + 'M, exactly how real CubeSat Launch Initiative missions reach orbit.');
      else if (scn.id === 'leo') add('warn', b.booster.name + ' is far more rocket than a CubeSat needs, and you paid for it.');
    }
    // Science & budget
    var names = b.instruments.map(function (i) { return i.name; });
    if (names.length) add(sc.yieldPct >= 70 ? 'good' : 'info', 'Your payload (' + names.join(', ') + ') delivered ' + Math.round(sc.yieldPct) + '% of the target science yield.');
    add(b.budgetLeft > 0.15 * scn.budget ? 'good' : 'info', 'You spent $' + r1(b.cost) + 'M of $' + scn.budget + 'M and flew ' + r1(b.mass) + ' kg of a ' + scn.massCap + ' kg cap.');
    return out;
  }

  var API = { linkQuality: linkQuality, compute: compute, launchCheck: launchCheck, launchModel: launchModel, createOps: createOps, step: step, act: act,
    score: score, match: match, causes: causes, buildTags: buildTags, comp: comp, DUR: DUR, ECLIPSE_SEC: ECLIPSE_SEC, fmt: fmt, r1: r1, clamp: clamp };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.OO_ENGINE = API;
})(typeof window !== 'undefined' ? window : globalThis);
