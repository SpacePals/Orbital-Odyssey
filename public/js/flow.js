/* Orbital Odyssey — flow: launch (CML 4), live operations (3 crises), NASA debrief. */
(function (root) {
  'use strict';
  var OO = root.OO, D = root.OO_DATA, E = root.OO_ENGINE, I = root.OO_ISO, S = root.OO_SFX;
  var $ = OO.$, esc = OO.esc, fmt = OO.fmt, qa = OO.qa, setCls = OO.setCls;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sm(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function hexRGB(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function mix(a, b, t) { var A = hexRGB(a), B = hexRGB(b); return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')'; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function r1(v) { return Math.round(v * 10) / 10; }
  function commas(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function setText(id, v) { var el = $(id); if (el && el.textContent !== v) el.textContent = v; }

  var FLOW = root.OO_FLOW = {};
  var LK = null, OP = null;
  FLOW._getLK = function () { return LK; };
  FLOW._getOP = function () { return OP; };

  /* Stage 5 tuning constants */
  var TUNE_LO = 68, TUNE_HI = 86;      // DSN antenna lock sweet spot (%)
  var DRIFT_ALERT = 70;                // thermal alert threshold (%)
  var DRIFT_LOCK = 85;                 // photo capture blocked above this drift (%)
  var DRIFT_RCS_CUT = 50;              // drift removed by one RCS burst (%)

  /* =====================================================================
   *  LAUNCH
   * ===================================================================== */
  var ROCKET = {
    ride: { s: 2.0, h: 142, nose: -142, fl: [[0, 0, 7, 52], [-13, 3, 5, 36], [13, 3, 5, 36]] },
    heavy: { s: 1.7, h: 176, nose: -176, fl: [[-20, 4, 8, 50], [0, 4, 8, 56], [20, 4, 8, 50]] },
    super: { s: 1.35, h: 245, nose: -245, fl: [[0, 10, 12, 70], [-21, 8, 8, 58], [21, 8, 8, 58]] }
  };

  function buildLaunchSVG(type) {
    var R = ROCKET[type], g = '';
    g += '<defs><linearGradient id="lkSky" x1="0" y1="0" x2="0" y2="1"><stop id="lkTop" offset="0" stop-color="#4aa8ff"/><stop id="lkBot" offset="1" stop-color="#bfe3ff"/></linearGradient></defs>';
    g += '<rect width="800" height="540" fill="url(#lkSky)"/>';
    g += '<g id="lkStars" opacity="0">' + I.starfield(800, 540, 130, 5) + '</g>';
    g += '<g id="lkClouds">' +
      '<ellipse cx="120" cy="150" rx="90" ry="16" fill="#fff" opacity=".8"/><ellipse cx="170" cy="140" rx="60" ry="14" fill="#fff" opacity=".85"/>' +
      '<ellipse cx="660" cy="230" rx="100" ry="17" fill="#fff" opacity=".75"/><ellipse cx="610" cy="222" rx="55" ry="13" fill="#fff" opacity=".85"/>' +
      '<ellipse cx="520" cy="80" rx="80" ry="12" fill="#fff" opacity=".7"/><ellipse cx="60" cy="320" rx="70" ry="12" fill="#fff" opacity=".7"/></g>';
    g += '<g id="lkGround">' +
      '<path d="M0 430 L0 392 Q110 352 230 396 T470 388 T800 404 L800 430Z" fill="#2d4a38"/>' +
      '<rect y="430" width="800" height="400" fill="#27352c"/>' +
      '<rect x="300" y="430" width="200" height="16" fill="#7c8799"/><rect x="300" y="446" width="200" height="6" fill="#4a5567"/>' +
      '<g stroke="#4b586d" stroke-width="2" fill="none"><rect x="284" y="210" width="14" height="220" fill="#313c50"/><path d="M284 210l14 22M298 210l-14 22M284 232l14 22M298 232l-14 22M284 254l14 22M298 254l-14 22M284 276l14 22M298 276l-14 22M284 298l14 22M298 298l-14 22M284 320l14 22M298 320l-14 22M284 342l14 22M298 342l-14 22M284 364l14 22M298 364l-14 22M284 386l14 22M298 386l-14 22"/>' +
      '<path d="M298 300h38M298 340h38" stroke-width="4" stroke="#7c8799"/><path d="M291 210V186" stroke="#e5e7eb"/></g>' +
      '<g><rect x="530" y="330" width="9" height="100" fill="#313c50"/><rect x="525" y="326" width="19" height="6" fill="#ef4444"/></g>' +
      '<g fill="#1c2634"><rect x="590" y="400" width="90" height="30"/><rect x="610" y="384" width="40" height="16"/></g>' +
      '</g>';
    g += '<g id="lkSmoke"></g>';
    g += '<g id="lkRocketPos" transform="translate(400,430)"><g id="lkRocketRot"><g id="lkFlameG" transform="scale(' + R.s + ')">';
    R.fl.forEach(function (f, i) {
      g += '<g class="lkfl" data-i="' + i + '" transform="translate(' + f[0] + ',' + f[1] + ')"><path d="M-' + f[2] + ' 0 Q0 ' + f[3] * 1.2 + ' ' + f[2] + ' 0Z" fill="url(#flameGrad)"/><path d="M-' + (f[2] * 0.45) + ' 0 Q0 ' + f[3] * 0.7 + ' ' + f[2] * 0.45 + ' 0Z" fill="#fff" opacity=".85"/></g>';
    });
    g += '</g>' + I.rocketMarkup(type, R.s);
    g += '<g transform="scale(' + R.s + ')"><g id="lkFairL"><path d="M0 ' + (R.nose + 26) + ' Q-8 ' + (R.nose + 12) + ' 0 ' + (R.nose + 2) + 'Z" fill="#e5e9f0" opacity="0"/></g><g id="lkFairR"><path d="M0 ' + (R.nose + 26) + ' Q8 ' + (R.nose + 12) + ' 0 ' + (R.nose + 2) + 'Z" fill="#cdd5e1" opacity="0"/></g></g>';
    g += '</g></g>';
    g += '<g id="lkBoom" opacity="0"><circle r="10" fill="#ffd27a"/><circle r="6" fill="#fff"/></g>';
    g += '<rect id="lkRed" width="800" height="540" fill="#ef4444" opacity="0"/>';
    $('launchSvg').innerHTML = g;
  }

  function renderGates() {
    $('gates').innerHTML = LK.gateDefs.map(function (g) {
      var st = g.shown ? g.res[0] : 'pend', tx = g.shown ? g.res[1] : '\u00b7\u00b7\u00b7';
      return '<li class="gate ' + st + '"><span>' + esc(g.label) + '</span><b class="mono">' + esc(tx) + '</b></li>';
    }).join('');
  }

  FLOW.startLaunch = function () {
    var b = OO.b, fails = E.launchCheck(b);
    if (fails.some(function (f) { return f.id === 'budget'; })) {
      OO.toast('OVER BUDGET: reduce your design cost before proceeding to launch.', 'bad');
      return;
    }
    var type = b.booster.id, lm = b.launch, scn = b.scn;
    var scrub = fails.some(function (f) { return f.id === 'budget' || f.id === 'masscap'; });
    var anyDv = fails.some(function (f) { return f.id === 'dv'; });
    var frac = lm.canReach ? clamp(lm.dv / lm.req, 0, 1) : 0.3;
    var req = lm.canReach ? lm.req : (scn.dest === 'leo' ? 9.4 : 13.2);
    LK = { t: 0, b: b, fails: fails, type: type, scrub: scrub, dvFail: !scrub && anyDv, frac: frac, req: req,
      failTs: clamp(7 * Math.pow(frac, 1 / 1.3), 2.6, 6.2), cutT: null, failReason: null, evIdx: 0, smoke: [], lastSec: 99, igniteDone: false, rumbling: false,
      modalShown: false, finished: false, sepSnd: false, vT: scn.dest === 'leo' ? 7.67 : 11.6, boomT: null,
      steerX: 0, steerInput: 0, score: 0, combo: 1.0, stress: 0, lastWarnT: 0,
      staged: false, stageReady: false, stagedAlert: false, sepAge0: 2.4 };
    var rm = fails.filter(function (f) { return f.id === 'budget'; })[0], mm = fails.filter(function (f) { return f.id === 'masscap'; })[0];
    LK.gateDefs = [
      { label: 'Budget check', at: 0.5, res: rm ? ['nogo', 'OVER BUDGET \u2022 +$' + r1(-b.budgetLeft) + 'M'] : ['go', 'PASSED \u2022 $' + r1(b.cost) + 'M'] },
      { label: 'Craft weight', at: 1.1, res: mm ? ['nogo', 'OVERWEIGHT \u2022 +' + r1(b.mass - b.massCap) + ' kg'] : ['go', 'PASSED \u2022 ' + r1(b.mass) + ' kg'] },
      { label: 'Launch weather', at: 1.7, res: ['go', 'ALL CLEAR'] },
      { label: 'Rocket speed & fuel', at: 2.3, res: scrub ? ['hold', 'HOLD'] : ['mon', 'IN FLIGHT'] }
    ];
    var T = scn.dest === 'leo';
    LK.events = scrub ? [
      { t: 0.05, text: 'Mission Director: Polling all stations for GO / NO-GO\u2026' },
      { t: 2.5, text: 'HOLD HOLD HOLD. A station called NO-GO: launch scrubbed due to engineering limits.', cls: 'bad', fn: function () { S.alarmStart(); S.error(); } }
    ] : [
      { t: 0.05, text: 'Mission Director: Polling all stations for GO / NO-GO\u2026' },
      { t: 2.0, text: 'All stations GO! Main rocket engines ignite.', fn: function () { S.ignition(); } },
      { t: 3.0, text: 'LIFTOFF! The rocket clears the launch tower!', cls: 'good' },
      { t: 4.3, text: 'Passing max aerodynamic pressure: engines throttling to full thrust.' },
      { t: 5.6, text: 'Upper stage rocket motor burn nominal: maintaining trajectory to orbit.' },
      { t: 7.0, text: 'Payload fairing deployed! Your spacecraft sees open space.', fn: function () { S.beep(990); } },
      { t: 8.6, text: T ? 'Gravity turn complete: accelerating for orbital insertion.' : 'Gravity turn complete: full burn for Jupiter interplanetary transfer.' },
      { t: 10.0, text: T ? 'ORBIT INSERTION CONFIRMED! Spacecraft separated: you are in space!' : 'ESCAPE VELOCITY CONFIRMED! Next stop: Jupiter! Spacecraft separated!', cls: 'good', fn: function () { S.good(); LK.finished = true; setGate(3, 'go', 'SPEED ACHIEVED \u2022 +' + (lm.margin >= 0 ? lm.margin.toFixed(2) : '0.00') + ' km/s'); } }
    ];
    S.init(); S.alarmStop(); S.rumbleStop();
    buildLaunchSVG(type);
    $('failModal').hidden = true; $('failModal').innerHTML = '';
    $('launchCall').textContent = ''; $('launchCall').className = 'call mono';
    $('dvText').textContent = '';
    $('tmAlt').textContent = '0'; $('tmVel').textContent = '0.00'; $('tmDv').textContent = '0.00'; $('tmStage').textContent = 'PAD';
    renderGates();
    OO.show('launch');
  };

  function setGate(i, st, tx) { var g = LK.gateDefs[i]; g.res = [st, tx]; g.shown = true; renderGates(); }

  function showFailModal() {
    if (LK.modalShown) return; LK.modalShown = true;
    S.rumbleStop(); S.alarmStop(); S.fail();
    var scrub = LK.scrub;

    if (LK.failReason === 'AERODYNAMIC_TUMBLE') {
      var h = '<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="fmT">' +
        '<div class="modal-head"><span class="mono">MISSION CONTROL \u2022 FLIGHT ANOMALY REPORT</span>' +
        '<h2 id="fmT" style="color:var(--red)">MISSION ANOMALY: AERODYNAMIC TUMBLE</h2></div><div class="modal-body">' +
        '<section class="fail"><h3>AERODYNAMIC DRAG EXCEEDED STRUCTURAL LIMITS</h3>' +
        '<p>Your rocket drifted outside the green atmospheric guidance corridor into severe crosswinds during peak dynamic pressure (Max-Q). The resulting wind shear sheared the rocket off-course and tore the airframe apart!</p>' +
        '<h4 class="mono">HOW TO PASS THIS FLIGHT</h4><ul>' +
        '<li><b>Steer with the STEER buttons</b> (or <b>A / D / Arrow Keys</b>) to keep the flight vector pointer inside the green corridor.</li>' +
        '<li><b>Watch the FLIGHT STABILITY bar</b> in the flight HUD \u2014 if stability drops below 70%, counter-steer immediately!</li>' +
        '<li>Riding through the green corridor keeps aerodynamic stress low until you reach the vacuum of space.</li>' +
        '</ul></section>' +
        '<div class="kept">Your rocket build is saved! Click below to retry the flight and hold the green line.</div></div>' +
        '<div class="modal-foot">' +
        '<button class="btn primary big" id="btnRetryLaunch">&#8635; Retry Launch Flight</button>' +
        '<button class="btn ghost" id="btnReturn">&larr; Return to Workshop</button>' +
        '</div></div>';
      var m = $('failModal'); m.innerHTML = h; m.hidden = false;
      setTimeout(function () { var b = $('btnRetryLaunch'); if (b) b.focus(); }, 50);
      return;
    }

    if (LK.failReason === 'BOOSTER_DEAD_WEIGHT') {
      var h = '<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="fmT">' +
        '<div class="modal-head"><span class="mono">MISSION CONTROL \u2022 FLIGHT ANOMALY REPORT</span>' +
        '<h2 id="fmT" style="color:var(--amber)">MISSION ANOMALY: MISSED BOOSTER SEPARATION</h2></div><div class="modal-body">' +
        '<section class="fail"><h3>DEAD BOOSTER WEIGHT PREVENTED ORBITAL SPEED</h3>' +
        '<p>The solid rocket boosters burned out of propellant at T+15s, but were never separated. Hauling thousands of kilograms of empty booster steel created severe gravitational drag, and the rocket ran out of fuel before reaching orbit!</p>' +
        '<h4 class="mono">HOW TO PASS THIS FLIGHT</h4><ul>' +
        '<li><b>Watch for the flashing [ SEPARATE BOOSTERS NOW! ] button</b> when the burnout warning sounds.</li>' +
        '<li>Click the big button or <b>press SPACEBAR</b> immediately to jettison the spent boosters.</li>' +
        '<li>Jettisoning dead weight sheds tons of mass, letting the upper stage engine push you into orbit!</li>' +
        '</ul></section>' +
        '<div class="kept">Your rocket build is saved! Click below to retry the flight and hit the staging window.</div></div>' +
        '<div class="modal-foot">' +
        '<button class="btn primary big" id="btnRetryLaunch">&#8635; Retry Launch Flight</button>' +
        '<button class="btn ghost" id="btnReturn">&larr; Return to Workshop</button>' +
        '</div></div>';
      var m = $('failModal'); m.innerHTML = h; m.hidden = false;
      setTimeout(function () { var b = $('btnRetryLaunch'); if (b) b.focus(); }, 50);
      return;
    }

    var h = '<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="fmT">' +
      '<div class="modal-head"><span class="mono">MISSION CONTROL \u2022 ' + (scrub ? 'LAUNCH SCRUB REPORT' : 'LAUNCH FAILURE REPORT') + '</span>' +
      '<h2 id="fmT">' + (scrub ? 'LAUNCH SCRUBBED: PRE-FLIGHT CHECK FAILED' : 'ROCKET FAILED TO REACH ' + esc(LK.b.scn.destName.toUpperCase())) + '</h2></div><div class="modal-body">';
    LK.fails.forEach(function (f) {
      h += '<section class="fail"><h3>' + esc(f.title) + '</h3><p>' + esc(f.body) + '</p>';
      if (f.tsio) {
        var t = f.tsio, pct = clamp(100 * t.dv / t.req, 0, 100);
        h += '<div class="tsio"><div class="eq mono">SPEED NEEDED vs SPEED ACHIEVED</div>' +
          '<div class="eq2 mono">Rocket speed reached: <b class="bad">' + t.dv.toFixed(2) + ' km/s</b> &bull; Speed needed: <b>' + t.req + ' km/s</b> (Short by ' + (-LK.b.launch.margin).toFixed(2) + ' km/s)</div>' +
          '<div class="dvbar"><div class="dvfill bad" style="width:' + pct + '%"></div><div class="dvreq"></div></div></div>';
      }
      h += '<h4 class="mono">HOW TO FIX IT</h4><ul>' + f.fix.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></section>';
    });
    h += '<div class="kept">Your design is safely saved. Head back to the workshop to tweak your build!</div></div>' +
      '<div class="modal-foot">' +
      (!scrub ? '<button class="btn primary big" id="btnRetryLaunch">&#8635; Retry Flight</button>' : '') +
      '<button class="btn ' + (scrub ? 'primary big' : 'ghost') + '" id="btnReturn">&larr; Return to Workshop</button>' +
      '<button class="btn ghost" id="btnToTitle">Back to Mission Select</button></div></div>';
    var m = $('failModal'); m.innerHTML = h; m.hidden = false;
    setTimeout(function () { var b = $('btnRetryLaunch') || $('btnReturn'); if (b) b.focus(); }, 50);
  }

  OO.loops.launch = function (dt) {
    if (!LK) return;
    LK.t += dt;
    var t = LK.t, go = !LK.scrub, scn = LK.b.scn, R = ROCKET[LK.type], i;
    var isEu = scn.id === 'europa';
    // call-outs
    while (LK.evIdx < LK.events.length && LK.events[LK.evIdx].t <= t) {
      var e = LK.events[LK.evIdx++];
      if (LK.cutT !== null && e.t > LK.cutT) continue;
      $('launchCall').textContent = e.text; $('launchCall').className = 'call mono ' + (e.cls || '');
      if (e.fn) e.fn();
    }
    // gates
    for (i = 0; i < LK.gateDefs.length; i++) {
      var g = LK.gateDefs[i];
      if (!g.shown && t >= g.at) {
        g.shown = true; renderGates();
        if (g.res[0] === 'nogo') S.error(); else S.beep(760 + i * 120);
      }
    }
    // clock + tick
    var clock;
    if (LK.scrub && t >= 2.3) clock = 'HOLD T-00:01';
    else if (t < 3) {
      var sec = Math.ceil(3 - t);
      clock = 'T-00:' + pad2(sec);
      if (sec !== LK.lastSec) { LK.lastSec = sec; S.tick(); }
    } else { clock = 'T+00:' + pad2(Math.floor(t - 3)); if (LK.lastSec !== 0) { LK.lastSec = 0; S.tickGo(); } }
    $('launchClock').textContent = clock;
    setCls($('launchClock'), 'clock mono' + (LK.scrub && t >= 2.3 ? ' hold' : ''));

    // scrub modal
    if (LK.scrub) { if (t >= 4.2) showFailModal(); renderLaunchScene(0, 0, false); return; }

    // sound
    if (t >= 1.6 && !LK.rumbling) { LK.rumbling = true; S.rumbleStart(); }
    var ts = t - 3, tsEff = LK.cutT !== null ? LK.failTs : ts;
    if (LK.dvFail && LK.cutT === null && ts >= LK.failTs) {
      LK.cutT = t;
      $('launchCall').textContent = 'ANOMALY: engines have shut down early. The rocket is out of \u0394v. Range safety is standing by.'; $('launchCall').className = 'call mono bad';
      S.rumbleStop(); S.alarmStart(); S.error();
      setGate(3, 'nogo', 'NO-GO \u2022 ' + (LK.b.launch.canReach ? LK.b.launch.margin.toFixed(2) : 'no route') + ' km/s');
      $('tmStage').textContent = 'ENGINE OUT';
    }
    var thrust = t >= 2.2 && LK.cutT === null;
    if (LK.rumbling && LK.cutT === null) S.rumbleLevel(t < 3 ? 0.55 + 0.1 * (t - 1.6) : ts < 4.6 ? 1.0 : Math.max(0.35, 1.0 - (ts - 4.6) * 0.3), clamp(ts / 6, 0, 1));
    if (LK.dvFail && LK.cutT !== null && t > LK.cutT + 2.2) showFailModal();
    renderLaunchScene(Math.max(0, tsEff), ts, thrust);

    // Arcade Steering & Trajectory Corridor Game
    // Guidance corridor curves away as the rocket pitches into its atmospheric gravity turn.
    // Advanced (Europa) missions fly a faster-oscillating corridor, narrower width, and stronger crosswinds.
    var corridorPhase = Math.max(0, tsEff);
    var corridorWave = Math.sin(corridorPhase * (isEu ? 1.15 : 0.85));
    var targetCorridorX = corridorWave * (isEu ? 58 : 54) + (isEu ? 20 : 26);
    var zoneHalfWidth = isEu ? 22 : 26;
    var K = 0.38;
    var zoneWidthPct = (zoneHalfWidth * 2) * K;
    var zoneCenterPct = clamp(50 + targetCorridorX * K, 10, 90);
    var corridorZoneEl = $('corridorZone');
    if (corridorZoneEl) {
      corridorZoneEl.style.left = clamp(zoneCenterPct - zoneWidthPct / 2, 2, 98 - zoneWidthPct) + '%';
      corridorZoneEl.style.width = zoneWidthPct + '%';
    }
    if (LK.steerInput !== 0) {
      LK.steerX = clamp((LK.steerX || 0) + LK.steerInput * dt * 115, -120, 120);
    } else {
      // Hands-off: Atmospheric crosswinds & aerodynamic drag push the rocket off-course!
      // Note: No auto-damp! The rocket will deviate and fail if player does nothing.
      if (tsEff > 0.4 && tsEff < 7.2) {
        var gust = Math.sin(tsEff * 2.3) * (isEu ? 20 : 12);
        var crosswind = ((isEu ? -68 : -52) + gust) * dt;
        LK.steerX = clamp((LK.steerX || 0) + crosswind, -120, 120);
      }
    }
    var dev = Math.abs((LK.steerX || 0) - targetCorridorX);
    var inZone = dev <= zoneHalfWidth;
    if (inZone && tsEff > 0 && tsEff < 7.5 && LK.cutT === null) {
      LK.stress = Math.max(0, (LK.stress || 0) - dt * 26);
      LK.combo = Math.min(3.0, (LK.combo || 1.0) + dt * 0.75);
      LK.score = (LK.score || 0) + dt * 160 * LK.combo;
    } else if (tsEff > 0 && tsEff < 7.5 && LK.cutT === null) {
      // Aerodynamic shear stress tears at the rocket when outside corridor!
      LK.stress = Math.min(100, (LK.stress || 0) + dt * (isEu ? 54 : 48));
      LK.combo = Math.max(1.0, (LK.combo || 1.0) - dt * 2.0);
      if (t - (LK.lastWarnT || 0) > 0.7 && LK.stress > 25) {
        LK.lastWarnT = t;
        if (S.warn) S.warn();
      }
    }

    // Fail Condition 1: Aerodynamic Tumble / Structural Loss
    if ((LK.stress || 0) >= 100 && LK.cutT === null) {
      LK.cutT = t;
      LK.failReason = 'AERODYNAMIC_TUMBLE';
      LK.dvFail = true;
      LK.failTs = tsEff;
      $('launchCall').textContent = 'ANOMALY: AERODYNAMIC TUMBLE! Rocket sheared outside trajectory corridor.';
      $('launchCall').className = 'call mono bad';
      S.rumbleStop(); S.alarmStart(); S.error();
      setGate(3, 'nogo', 'NO-GO \u2022 STRUCTURAL FAILURE');
      $('tmStage').textContent = 'VEHICLE LOSS';
    }

    // Update Stability Meter & Corridor UI
    var stability = Math.max(0, Math.round(100 - (LK.stress || 0)));
    var sf = $('stressFill'), sv = $('stressVal'), stp = $('stressTip');
    if (sf && sv) {
      sf.style.width = stability + '%';
      if (stability > 70) {
        sf.className = 'stress-fill good';
        sv.textContent = stability + '% NOMINAL';
        sv.style.color = 'var(--cyan)';
        if (stp) stp.textContent = 'ON TRAJECTORY \u2022 GREEN CORRIDOR HELD';
      } else if (stability > 35) {
        sf.className = 'stress-fill warn';
        sv.textContent = stability + '% CAUTION';
        sv.style.color = 'var(--amber)';
        if (stp) stp.textContent = 'WARNING: WIND SHEAR! STEER BACK TO CORRIDOR!';
      } else {
        sf.className = 'stress-fill bad';
        sv.textContent = stability + '% CRITICAL!';
        sv.style.color = 'var(--red)';
        if (stp) stp.textContent = 'DANGER: STRUCTURAL FAILURE IMMINENT!';
      }
    }

    var pEl = $('corridorPointer');
    if (pEl) {
      var pointerPct = clamp(50 + (LK.steerX || 0) * K, 4, 96);
      pEl.style.left = pointerPct + '%';
      pEl.className = 'corridor-pointer ' + (inZone ? 'good' : stability > 35 ? 'warn' : 'bad');
    }
    var scEl = $('launchScoreVal'); if (scEl) scEl.textContent = Math.round(LK.score || 0);
    var cbEl = $('launchComboPill'); if (cbEl) cbEl.textContent = (LK.combo || 1.0).toFixed(1) + 'x VECTOR';

    // Booster Staging Window & Fail Condition 2: Missed Staging (Dead Weight)
    var bStage = $('btnManualStage');
    if (bStage) {
      if (tsEff >= 2.0 && tsEff < 4.6 && !LK.staged && LK.cutT === null) {
        LK.stageReady = true;
        bStage.style.display = 'inline-flex';
        if (!LK.stagedAlert) {
          LK.stagedAlert = true;
          if (S.beep) S.beep(880);
          $('launchCall').textContent = 'BOOSTERS SPENT: HIT [SEPARATE BOOSTERS] (SPACE) NOW!';
          $('launchCall').className = 'call mono warn';
        }
      } else {
        bStage.style.display = 'none';
      }
    }

    if (tsEff >= 4.6 && !LK.staged && LK.cutT === null) {
      LK.cutT = t;
      LK.failReason = 'BOOSTER_DEAD_WEIGHT';
      LK.dvFail = true;
      LK.failTs = tsEff;
      $('launchCall').textContent = 'ANOMALY: MISSED BOOSTER SEPARATION! Dead booster mass caused orbital speed deficit.';
      $('launchCall').className = 'call mono bad';
      S.rumbleStop(); S.alarmStart(); S.error();
      setGate(3, 'nogo', 'NO-GO \u2022 DEAD WEIGHT DRAG');
      $('tmStage').textContent = 'SPEED LOSS';
    }

    // telemetry
    var f = clamp(Math.max(0, tsEff) / 7, 0, 1), alt = 400 * Math.pow(f, 2.1), vel = LK.vT * Math.pow(f, 1.4), dvu = LK.req * Math.pow(f, 1.3);
    if (LK.dvFail) { dvu = Math.min(dvu, LK.req * LK.frac); }
    $('tmAlt').textContent = commas(alt);
    $('tmVel').textContent = vel.toFixed(2);
    $('tmDv').textContent = dvu.toFixed(2);
    if (LK.cutT === null) $('tmStage').textContent = t < 3 ? (t >= 2.2 ? 'IGNITION' : 'PAD') : ts < 2.6 ? 'STAGE 1' : ts < 7 ? 'STAGE 2' : 'COAST';
    var lm = LK.b.launch, scale = LK.req * 1.12;
    $('dvFill').style.width = clamp(100 * dvu / scale, 0, 100) + '%';
    $('dvReq').style.left = (100 * LK.req / scale) + '%';
    setCls($('dvFill'), LK.cutT !== null ? 'bad' : '');
    $('dvText').textContent = lm.canReach ? 'AVAILABLE ' + lm.dv.toFixed(2) + ' km/s \u2022 NEEDED ' + lm.req.toFixed(1) + ' km/s \u2022 MARGIN ' + (lm.margin >= 0 ? '+' : '') + lm.margin.toFixed(2) : 'NO ROUTE TO ' + scn.destName.toUpperCase() + ' \u2022 NEEDED ' + LK.req + ' km/s';

    if (LK.finished && t >= 11.8 && !LK.handoff) { LK.handoff = true; S.rumbleStop(); FLOW.startOps(); }
  };

  function renderLaunchScene(tsEff, ts, thrust) {
    var R = ROCKET[LK.type], t = LK.t, skyT = sm(tsEff / 5.5);
    var baseY = 430 - 100 * sm(tsEff / 1.4), gy = tsEff * tsEff * 38, sh = 0;
    var rot = 74 * sm((tsEff - 3.2) / 3.8);
    var fall = LK.cutT !== null ? Math.max(0, ts - LK.failTs) : 0;
    var rx = 0;
    if (LK.finished || (ts > 7 && !LK.dvFail)) { rx = (ts - 7) * 45; }
    var alive = fall < 0.7;
    if (thrust) sh = (ts < 0 ? 1.5 : ts < 4.6 ? 2.2 : 1.0);
    var jx = (Math.random() - 0.5) * sh, jy = (Math.random() - 0.5) * sh;
    var by = baseY + 0.5 * 110 * fall * fall;
    rot += fall * 140;
    $('lkTop').setAttribute('stop-color', mix('#4aa8ff', '#02040a', skyT));
    $('lkBot').setAttribute('stop-color', mix('#bfe3ff', '#06091c', skyT));
    $('lkStars').setAttribute('opacity', clamp((tsEff - 1.4) / 3.2, 0, 1).toFixed(2));
    $('lkGround').setAttribute('transform', 'translate(0,' + gy.toFixed(1) + ')');
    $('lkClouds').setAttribute('transform', 'translate(0,' + (gy * 1.5).toFixed(1) + ')');
    $('lkClouds').setAttribute('opacity', (1 - skyT).toFixed(2));
    var currentX = 400 + jx + rx + (LK.steerX || 0);
    $('lkRocketPos').setAttribute('transform', 'translate(' + currentX.toFixed(1) + ',' + (by + jy).toFixed(1) + ')');
    $('lkRocketRot').setAttribute('transform', 'rotate(' + rot.toFixed(1) + ' 0 ' + (-R.h * R.s / 2).toFixed(1) + ')');
    $('lkRocketRot').style.display = alive ? '' : 'none';
    // booster separation and fairing
    var sepAge = LK.staged ? tsEff - (LK.sepAge0 || 2.4) : -1;
    var sl = root.document.querySelector('#lkRocketRot .srb-l'), sr = root.document.querySelector('#lkRocketRot .srb-r');
    if (sl && sr) {
      if (sepAge > 0) {
        sl.setAttribute('transform', 'translate(' + (-sepAge * 36).toFixed(1) + ',' + (sepAge * sepAge * 110).toFixed(1) + ') rotate(' + (-sepAge * 26).toFixed(1) + ')');
        sr.setAttribute('transform', 'translate(' + (sepAge * 36).toFixed(1) + ',' + (sepAge * sepAge * 110).toFixed(1) + ') rotate(' + (sepAge * 26).toFixed(1) + ')');
        sl.setAttribute('opacity', clamp(1 - sepAge / 1.7, 0, 1)); sr.setAttribute('opacity', clamp(1 - sepAge / 1.7, 0, 1));
        if (!LK.sepSnd) { LK.sepSnd = true; S.beep(520); }
      } else { sl.removeAttribute('transform'); sr.removeAttribute('transform'); sl.removeAttribute('opacity'); sr.removeAttribute('opacity'); }
    }
    // flame
    var fl = $('lkFlameG'); fl.style.display = thrust ? '' : 'none';
    if (thrust) {
      var flick = 0.85 + Math.random() * 0.3, vac = clamp((ts - 4) / 3, 0, 1);
      var centerIdx = (LK.type === 'heavy' ? 1 : 0);
      qa('.lkfl', fl).forEach(function (el) {
        var idx = parseInt(el.getAttribute('data-i'), 10);
        if (sepAge > 0 && idx !== centerIdx) {
          el.style.display = 'none';
          return;
        }
        el.style.display = '';
        var tr = el.getAttribute('transform').match(/translate\(([^)]+)\)/)[1];
        el.setAttribute('transform', 'translate(' + tr + ') scale(' + (1 - 0.3 * vac).toFixed(2) + ',' + (flick * (1 + 0.5 * vac) * (ts < 0 ? 0.6 : 1)).toFixed(2) + ')');
      });
    }
    var fa = tsEff - 4.6, fL = $('lkFairL'), fR = $('lkFairR');
    if (fa > 0) {
      fL.setAttribute('transform', 'translate(' + (-fa * 40).toFixed(1) + ',' + (-fa * 12 + fa * fa * 40).toFixed(1) + ') rotate(' + (-fa * 80).toFixed(0) + ')'); fR.setAttribute('transform', 'translate(' + (fa * 40).toFixed(1) + ',' + (-fa * 12 + fa * fa * 40).toFixed(1) + ') rotate(' + (fa * 80).toFixed(0) + ')');
      fL.firstChild.setAttribute('opacity', clamp(1 - fa / 1.6, 0, 1)); fR.firstChild.setAttribute('opacity', clamp(1 - fa / 1.6, 0, 1));
    } else { fL.firstChild.setAttribute('opacity', 0); fR.firstChild.setAttribute('opacity', 0); }
    // smoke
    var dt = 1 / 60, i, p;
    if (thrust && ts < 5 && LK.smoke.length < 160) {
      for (i = 0; i < 2; i++) LK.smoke.push({ x: 400 + (Math.random() - 0.5) * 16, y: baseY + 4, vx: (Math.random() - 0.5) * (ts < 1 ? 180 : 50), vy: 40 + Math.random() * 60, r: 6 + Math.random() * 6, life: 1 });
    }
    var gs = ts > 0 ? 2 * 38 * ts : 0, out = '';
    LK.smoke = LK.smoke.filter(function (p) {
      p.x += p.vx * dt; p.y += (p.vy + gs) * dt; p.r += 26 * dt; p.life -= dt * 0.55;
      if (p.life <= 0) return false;
      out += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + p.r.toFixed(1) + '" fill="#eef1f6" opacity="' + (p.life * 0.55 * (1 - skyT * 0.8)).toFixed(2) + '"/>';
      return true;
    });
    $('lkSmoke').innerHTML = out;
    // explosion
    var boom = $('lkBoom');
    if (LK.cutT !== null && fall >= 0.6) {
      var ba = clamp((fall - 0.6) / 0.9, 0, 1);
      boom.setAttribute('transform', 'translate(' + (400 + rx).toFixed(1) + ',' + (by - R.h * R.s * 0.5).toFixed(1) + ') scale(' + (1 + ba * 9).toFixed(2) + ')');
      boom.setAttribute('opacity', (1 - ba).toFixed(2));
      if (!LK.boomSnd) { LK.boomSnd = true; S.stamp(); }
    } else boom.setAttribute('opacity', 0);
    $('lkRed').setAttribute('opacity', LK.cutT !== null ? (0.12 + 0.1 * Math.sin(t * 9)).toFixed(2) : (LK.scrub && t > 2.5 ? (0.1 + 0.08 * Math.sin(t * 8)).toFixed(2) : 0));
  }

  /* =====================================================================
   *  LIVE OPERATIONS
   * ===================================================================== */
  function pctw(el, v) { el.style.width = clamp(v * 100, 0, 100).toFixed(1) + '%'; }
  function garble(n) { var s = '', h = '0123456789ABCDEF'; for (var i = 0; i < n; i++) s += h[Math.floor(Math.random() * 16)]; return s; }

  var ICON = {
    moon: '<svg class="btn-svg" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    sun: '<svg class="btn-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    bolt: '<svg class="btn-svg" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    check: '<svg class="btn-svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    plug: '<svg class="btn-svg" viewBox="0 0 24 24"><path d="M12 2v6M9 2v4M15 2v4M6 8h12v4a6 6 0 0 1-6 6v4"/></svg>',
    clock: '<svg class="btn-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    reboot: '<svg class="btn-svg" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
    dish: '<svg class="btn-svg" viewBox="0 0 24 24"><path d="M4 10a7.31 7.31 0 0 0 10 10Z"/><path d="m9 15 3-3"/><path d="M17 13a6 6 0 0 0-6-6"/><path d="M21 13A10 10 0 0 0 11 3"/></svg>',
    play: '<svg class="btn-svg" viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/></svg>',
    pause: '<svg class="btn-svg" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
    cam: '<svg class="btn-svg" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    gear: '<svg class="btn-svg" viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
    signal: '<svg class="btn-svg" viewBox="0 0 24 24"><path d="M2 20h.01M7 20v-4M12 20v-8M17 20V4"/><polyline points="13 8 17 4 21 8"/></svg>'
  };

  function isEuropa(sim) { return sim.scn.id === 'europa'; }

  FLOW.startOps = function () {
    S.rumbleStop(); S.alarmStop();
    var sim = E.createOps(OO.scn, OO.order);
    var startScore = (LK && LK.score) ? Math.round(LK.score) : 0;
    var eu = isEuropa(sim);
    OP = {
      sim: sim, acc: 0, logN: 0, endT: null, yaw: 0.8, flashT: 0,
      banner: null, bannerT: 0, prog: {}, paused: false,
      score: startScore,
      rcsT: 0,
      photos: [],
      repairCode: null, repairProgress: 0, repairFeedback: '', repairMistakes: 0,
      miniGames: {
        eclipse: { hit: false, misses: 0 },
        computer: { solved: false, mistakes: 0 },
        radio: { locks: 0, lockSeconds: 0 }
      },
      eclipseHit: false,
      // Antenna tuner state
      tuneVal: 35, sliderLock: false, tuneAwarded: false, tuneAlerting: false,
      // Orbital drift / thermal alert (Advanced mission only)
      hasDrift: eu, drift: 0, driftAlert: false, driftHold: 0, driftPen: 0,
      anomalies: [
        {
          t: 2.0, dur: 6.0, id: 'anom1',
          title: OO.scn === 'leo' ? 'Aurora Borealis' : 'Great Red Spot Megastorm',
          desc: OO.scn === 'leo' ? 'Polar geomagnetic plasma glow in the ionosphere.' : 'Massive anti-cyclonic storm system raging across Jupiter.',
          image: OO.scn === 'leo' ? 'images/discoveries/aurora.jpg' : 'images/discoveries/great-red-spot.jpg',
          imageAlt: OO.scn === 'leo' ? 'Aurora above Canada photographed from the International Space Station.' : 'NASA illustration of Juno orbiting above Jupiter’s Great Red Spot.',
          imageCredit: OO.scn === 'leo' ? 'NASA/JSC' : 'NASA/JPL-Caltech/SwRI/MSSS/Christopher Go',
          imageSource: OO.scn === 'leo' ? 'https://images.nasa.gov/details/iss053e023915' : 'https://images.nasa.gov/details/PIA21770',
          sciencePts: 40, x: 350, y: 190
        },
        {
          t: 13.0, dur: 6.0, id: 'anom2',
          title: OO.scn === 'leo' ? 'Megacity Night Lights' : 'Io Volcanic Plume Transit',
          desc: OO.scn === 'leo' ? 'Night-side city grids glowing across a continent from orbit.' : 'A volcanic plume from Io glowing against Jupiter’s dark limb.',
          image: OO.scn === 'leo' ? 'images/discoveries/city-lights.jpg' : 'images/discoveries/io-plumes.jpg',
          imageAlt: OO.scn === 'leo' ? 'City lights along the Gulf of Oman photographed from the ISS at night.' : 'Two active volcanic plumes rising from Jupiter’s moon Io.',
          imageCredit: OO.scn === 'leo' ? 'NASA/Tim Kopra' : 'NASA/JPL',
          imageSource: OO.scn === 'leo' ? 'https://images.nasa.gov/details/iss046e021993' : 'https://images.nasa.gov/details/PIA00703',
          sciencePts: 45, x: 330, y: 250
        },
        {
          t: 27.0, dur: 6.5, id: 'anom3',
          title: OO.scn === 'leo' ? 'Amazon River Plume' : 'Europa Vapor Cryo-Geyser',
          desc: OO.scn === 'leo' ? 'Sediment plume flowing into the Atlantic, tracing ocean currents.' : 'Water vapor erupting 200 km high from Europa’s hidden ocean!',
          image: OO.scn === 'leo' ? 'images/discoveries/amazon-river.jpg' : 'images/discoveries/europa-plume.jpg',
          imageAlt: OO.scn === 'leo' ? 'NASA satellite image of the Amazon River meeting the Atlantic Ocean.' : 'NASA and Hubble graphic showing evidence of water vapor near Europa’s south pole.',
          imageCredit: OO.scn === 'leo' ? 'NASA/GSFC/JPL, MISR Team' : 'NASA/ESA/L. Roth/SWRI/University of Cologne',
          imageSource: OO.scn === 'leo' ? 'https://images.nasa.gov/details/PIA02643' : 'https://images.nasa.gov/details/PIA17660',
          sciencePts: 50, x: 410, y: 260
        },
        {
          t: 46.0, dur: 6.5, id: 'anom4',
          title: OO.scn === 'leo' ? 'Sahara Richat Structure' : 'Conamara Chaos Ice Pack',
          desc: OO.scn === 'leo' ? 'Deep circular geological concentric dome in the desert.' : 'Fractured ice plates floating atop a subterranean ocean.',
          image: OO.scn === 'leo' ? 'images/discoveries/richat-structure.jpg' : 'images/discoveries/europa-chaos.jpg',
          imageAlt: OO.scn === 'leo' ? 'The Richat Structure in Mauritania, photographed from the ISS.' : 'Enhanced-color Galileo image of broken blocks of Europa’s icy chaos terrain.',
          imageCredit: OO.scn === 'leo' ? 'NASA/Anil Menon' : 'NASA/JPL-Caltech/SETI Institute',
          imageSource: OO.scn === 'leo' ? 'https://images.nasa.gov/details/iss075e0250636' : 'https://images.nasa.gov/details/PIA23873',
          sciencePts: 60, x: 385, y: 220
        }
      ]
    };
    OO.order.forEach(function (id) { OP.prog[id] = 1; });
    buildOpsSVG(); buildOpsPanel(sim);
    $('crisisBanner').hidden = true;
    OO.show('ops');
    logEvent({ level: 'info', msg: 'Spacecraft separated and powered up. All systems nominal.', t: 0 });
    if (eu) logEvent({ level: 'info', msg: 'Jovian environment: attitude drift will build up. Fire RCS bursts [R] to stabilize before photographing.', t: 0 });

    // Show Stage 5 Guide on first playthrough
    var seen = false;
    try { seen = localStorage.getItem('oo_ops_guide_seen') === '1'; } catch (e) {}
    if (!seen) {
      OP.paused = true;
      var gModal = $('opsTutModal');
      if (gModal) gModal.hidden = false;
    }
  };

  FLOW.snapPhoto = function () {
    if (!OP) return;
    var sim = OP.sim;
    var a = OP.anomalies.find(function (an) { return !an.captured && sim.t >= an.t && sim.t < an.t + an.dur; });
    if (!a) return;
    if (OP.hasDrift && OP.drift >= DRIFT_LOCK) {
      OO.toast('ATTITUDE UNSTABLE: camera cannot hold the target! Fire an RCS burst [R] first.', 'warn');
      if (S.error) S.error();
      return;
    }
    a.captured = true;
    OP.photos.push(a);
    OP.score = (OP.score || 0) + 350;
    if (S.photo) S.photo();
    var sf = $('shutterFlash');
    if (sf) {
      sf.className = 'shutter-flash on';
      setTimeout(function () { sf.className = 'shutter-flash'; }, 200);
    }
    OO.toast('DISCOVERY CAPTURED: ' + a.title + '! +' + a.sciencePts + ' Science Points!', 'good');
    var targetEl = $('scienceTarget'); if (targetEl) targetEl.style.display = 'none';
  };

  function buildOpsSVG() {
    var s = OO.scn, scn = D.SCENARIOS[s], g = '';
    g += '<rect width="760" height="470" fill="#040712"/>' + I.starfield(760, 470, 120, 21);
    g += '<circle cx="-30" cy="235" r="260" fill="url(#sunGlow)" opacity=".5"/><text x="14" y="38" class="ops-label">SUNLIGHT DIRECTION</text>';
    g += '<g stroke="#ffd27a" opacity=".12"><path d="M0 120H300M0 180H300M0 235H300M0 290H300M0 350H300"/></g>';
    g += '<g transform="translate(380 235) rotate(-13.75)"><path d="M-285 0A285 66 0 0 1 285 0" fill="none" stroke="rgba(34,211,238,.35)" stroke-width="1.4" stroke-dasharray="4 7"/></g>';
    g += '<g id="opsBack"></g>';
    g += (s === 'leo' ? I.earthMarkup(380, 235, 96) : I.jupiterMarkup(380, 235, 100));
    if (s === 'europa') g += '<circle cx="610" cy="82" r="14" fill="#d8dde6"/><circle cx="610" cy="82" r="14" fill="url(#sphereShadeE)"/><text x="610" y="112" class="ops-label" text-anchor="middle">EUROPA</text>';
    g += '<path id="shadowCone" d="M380 140 L775 168 L775 302 L380 330Z" fill="#000" opacity=".42"/>';
    g += '<text x="700" y="156" class="ops-label dim" text-anchor="middle" id="shadowLbl">' + esc(scn.shadowName.toUpperCase()) + '</text>';
    g += '<g transform="translate(380 235) rotate(-13.75)"><path d="M-285 0A285 66 0 0 0 285 0" fill="none" stroke="rgba(34,211,238,.55)" stroke-width="1.6" stroke-dasharray="4 7"/></g>';
    g += '<g id="opsFront"></g>';
    // ground station / earth marker
    if (s === 'leo') g += '<g transform="translate(325 313)"><path d="M0 0V-14M-6 0H6" stroke="#fbbf24" stroke-width="2"/><circle cy="-16" r="3" fill="#fbbf24"/></g><text x="325" y="334" class="ops-label" text-anchor="middle">WALLOPS GROUND STATION</text>';
    else g += '<g transform="translate(722 40)"><circle r="16" fill="#134b8f"/><path d="M-9-4C-4-12 4-10 6-3S-1 8-6 6s-5-6-3-10z" fill="#2f8f4e"/><circle r="16" fill="url(#sphereShade)"/></g><text x="750" y="72" class="ops-label" text-anchor="end">EARTH \u2022 DSN</text><text x="750" y="86" class="ops-label dim" text-anchor="end">' + scn.lightTime + ' away</text>';
    g += '<line id="opsBeam" x1="0" y1="0" x2="0" y2="0" stroke="#34d399" stroke-width="2.4" stroke-dasharray="7 9" stroke-linecap="round" opacity="0"/>';
    g += '<g id="opsFxG"></g>';
    $('opsSvg').innerHTML = g;
  }

  var CRISIS = [
    { id: 'eclipse', n: 1, title: 'DARKNESS', short: 'Darkness' },
    { id: 'seu', n: 2, title: 'COMPUTER GLITCH', short: 'Computer' },
    { id: 'dsn', n: 3, title: 'RADIO WINDOW CLOSING', short: 'Radio window' }
  ];

  function buildOpsPanel(sim) {
    var b = sim.b, h = '';
    h += '<div class="panel-title mono"><span class="badge-dot" style="background:var(--cyan)"></span> FLIGHT STATUS</div>';

    // 1. Sleek Hazard Stepper
    h += '<div class="ctrack" id="ctrack">' + CRISIS.map(function (c) {
      return '<div class="ct pend" id="ct_' + c.id + '"><span class="ct-dot"></span><span class="ct-title">' + c.n + '. ' + c.short + '</span><b class="mono" id="cts_' + c.id + '">PENDING</b></div>';
    }).join('') + '</div>';

    // Keep the active challenge at the top of the control panel.
    h += '<div class="crisis-box" id="crisisBox"></div>';

    // 2b. Orbital drift / thermal alert (Advanced mission only). Static markup: only text/width are updated per frame.
    if (isEuropa(sim)) {
      h += '<section class="ops-card" id="driftCard">' +
        '<div class="ops-card-head"><span class="mono">CRAFT STABILITY</span><span id="driftChip" class="schip ok">STABLE</span></div>' +
        '<div class="mrow"><span>DRIFT</span><div class="bar"><div id="mDrift" class="load"></div></div><b class="mono" id="vDrift">0%</b></div>' +
        '<div class="card-meta mono dim" id="driftNote">Press R to steady the craft.</div>' +
      '</section>';
    }

    // 3. Clean Power & Battery Status Card
    h += '<section class="ops-card">' +
      '<div class="ops-card-head"><span class="mono">POWER</span><span id="pwChip" class="schip ok">NOMINAL</span></div>' +
      '<div class="mrow"><span>BATTERY</span><div class="bar"><div id="mBatt" class="batt"></div></div><b class="mono" id="vBatt"></b></div>' +
      '<div class="mrow mini-row"><span>SOLAR</span><div class="bar"><div id="mGen" class="gen"></div></div><b class="mono" id="vGen"></b></div>' +
      '<div class="mrow mini-row"><span>USAGE</span><div class="bar"><div id="mLoad" class="load"></div></div><b class="mono" id="vLoad"></b></div>' +
      '<div class="card-meta mono dim" id="pwNote">sunlit</div>' +
    '</section>';

    // 4. Clean Data & Communications Card
    h += '<section class="ops-card">' +
      '<div class="ops-card-head"><span class="mono">DATA</span><span id="vLink" class="schip mono">100%</span></div>' +
      '<div class="mrow"><span>BUFFER</span><div class="bar buf"><div id="mBuf"></div><em class="thr" title="Empty below 35%"></em></div><b class="mono" id="vBuf"></b></div>' +
      '<div class="mrow mini-row"><span>SIGNAL</span><div class="bar"><div id="mLink" class="link"></div></div><b class="mono" id="rOut"></b></div>' +
      '<div class="card-meta mono dim"><span>INCOMING: <b id="rIn" style="color:var(--txt)"></b></span> &bull; <span>BOOST: <b id="boostStatus" style="color:var(--dim)">OFF</b></span></div>' +
    '</section>';

    h += '<div style="display:none" aria-hidden="true">' +
        '<span id="cpChip"></span><span id="cpNote"></span><span id="instSummary"></span>' +
        '<div id="instGrid">' + b.instruments.map(function (i) { return '<button class="sw" data-inst="' + i.id + '" aria-pressed="true"><span class="led"></span><b>' + esc(i.code) + '</b><i class="mono">\u2212' + i.draw + ' W</i></button>'; }).join('') + '</div>' +
        '<div id="thrCtl">' + [[1, 'NORMAL'], [0.5, '50%'], [0.25, '25%'], [0, 'PAUSE CAMERAS']].map(function (x) { return '<button data-th="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        '<span id="boostStatus"></span>' +
        '<button class="sw" id="swBoost" data-act="boost" aria-pressed="false"></button>' +
        '<div id="regs">' + new Array(16 + 1).join('<i></i>') + '</div>' +
        '<button class="sw" id="swBackup" data-act="backup" aria-pressed="false"></button>' +
        '<button class="sw" id="btnReboot" data-act="reboot"></button>' +
    '</div>';

    $('opsPanel').innerHTML = h;
  }

  function logEvent(e) {
    var ul = $('evlog'); if (!ul) return;
    var li = document.createElement('li');
    var tt = Math.floor(e.t);
    li.className = e.level;
    li.innerHTML = '<span class="mono">T+' + pad2(Math.floor(tt / 60)) + ':' + pad2(tt % 60) + '</span>' + esc(e.msg);
    ul.insertBefore(li, ul.firstChild);
    while (ul.children.length > 30) ul.removeChild(ul.lastChild);
  }

  function showBanner(kind, title, text, timeout) {
    var el = $('crisisBanner'); el.hidden = false; el.className = 'crisis-banner ' + kind;
    el.innerHTML = '<b class="mono">' + esc(title) + '</b><span>' + esc(text) + '</span>';
    OP.bannerT = timeout || 0;
  }

  function handleEvents(sim) {
    var ev;
    while ((ev = sim.pending.shift())) {
      logEvent(ev);
      var k = ev.kind;
      if (k === 'crisis1' || k === 'crisis2' || k === 'crisis3') {
        var idx = +k.slice(-1) - 1;
        S.alarmStart(); OP.flashT = 0.6; $('opsFlash').className = 'flash on'; setTimeout(function () { $('opsFlash').className = 'flash'; }, 500);
        if (k === 'crisis3') OP.tuneAlerting = true;
        showBanner('crit', 'EMERGENCY ' + (idx + 1) + ' / 3 \u2022 ' + CRISIS[idx].title,
          idx === 0 ? 'Hit the green mark to save battery until sunrise.' :
          idx === 1 ? 'Computer frozen. Repeat the 5-number repair code.' :
            'Slide into green to solve the radio lock and silence the beeps. Move outside and the alert returns.', 0);
      } else if (k === 'eclipseEnd' || k === 'seuEnd' || k === 'dsnEnd') {
        if (k === 'eclipseEnd' && sim && sim.b && sim.b.instruments) {
          sim.b.instruments.forEach(function (i) { sim.inst[i.id] = true; });
        }
        S.alarmStop();
        if (k === 'dsnEnd' && OP) OP.tuneAlerting = false;
        S.good && (ev.level === 'good' ? S.good() : S.warn());
        showBanner(ev.level === 'good' ? 'good' : 'warn', ev.level === 'good' ? 'HAZARD SURVIVED' : 'HAZARD ENDED WITH LOSS', ev.msg, 3.2);
      } else if (k === 'brownout') { S.error(); OP.flashT = 0.4; }
      else if (k === 'reject' || k === 'rebootFail') S.error();
      else if (k === 'overflow') S.warn();
    }
  }

  /* ---------- Emergency panel ----------
   * crisisBoxText() returns [className, html, structureKey].
   * The HTML is only re-written when structureKey changes (i.e. when buttons actually
   * need to change). Anything that changes every frame (countdowns, battery, buffer %,
   * reboot timer, lock status) lives in a span with an ID and is updated in place by
   * updateCrisisDyn(), so live button DOM nodes are never destroyed mid-click. */
  function eclInfo(s) {
    var b = s.b, scn = s.scn;
    var remain = Math.max(0, E.DUR.eclipse - s.phaseT), drain = Math.max(0, s.load - b.genRTG);
    var left = drain > 0 ? s.batt / (drain * scn.hoursPerSec) : Infinity;
    var safe = left >= remain;
    var txt = s.brown ? 'POWER LOST' : safe ? 'BATTERY SAFE' : 'BATTERY AT RISK';
    var col = s.brown ? 'var(--red)' : safe ? 'var(--green)' : 'var(--amber)';
    return { remain: remain, safe: safe, txt: txt, col: col };
  }

  function eclipseNeedle(phaseT) { return ((phaseT % 4.2) / 4.2) * 100; }

  function crisisBoxText(sim) {
    var s = sim, scn = s.scn, b = s.b, ph = s.phase, h = '', cls = 'crisis-box', key = ph;
    if (ph === 'eclipse') {
      var info = eclInfo(s);
      cls += ' active ' + (s.brown ? 'bad' : info.safe ? 'ok' : 'bad');
      key = 'ecl|' + OP.eclipseHit;
      h = '<div class="crisis-head"><span class="badge-alert">1</span> <b>SPACECRAFT IN DARKNESS</b></div>' +
        '<p><b id="eclCountdown">' + info.remain.toFixed(0) + '</b>s until sunlight &bull; Battery <b id="eclBatt">' + Math.round(s.batt) + ' Wh</b> &bull; <b id="eclStatus" style="color:' + info.col + '">' + info.txt + '</b></p>' +
        '<div class="mini-game">' +
          '<div class="mini-game-copy"><b id="eclGameStatus">' + (OP.eclipseHit ? 'POWER SAVED' : 'HIT WHEN THE MARKER IS GREEN') + '</b><span>Turning sensors off saves battery.</span></div>' +
          '<div class="timing-track" aria-label="Timing bar">' +
            '<span class="timing-zone" style="left:38%;width:20%"></span><i id="eclNeedle" style="left:' + eclipseNeedle(s.phaseT) + '%"></i>' +
          '</div>' +
          '<button class="mini-game-btn" id="eclHitBtn" data-act="eclipse-hit"' + (OP.eclipseHit ? ' disabled' : '') + '>HIT TO SAVE POWER</button>' +
        '</div>';
    } else if (ph === 'seu') {
      cls += ' active ' + (s.computerOK ? 'ok' : 'bad');
      var win = scn.seuWindow - s.phaseT;
      if (!OP.repairCode && s.seu) {
        OP.repairCode = [];
        for (var digit = 0; digit < 5; digit++) OP.repairCode.push((s.seu.word >> (digit * 2)) & 3);
      }
      var codeText = OP.repairCode.map(function (n) { return '<b class="code-digit">' + (n + 1) + '</b>'; }).join('<span class="code-arrow">&rarr;</span>');
      var pads = [0, 1, 2, 3].map(function (n) {
        return '<button class="repair-pad" data-repair-pad="' + n + '" aria-label="Press ' + (n + 1) + '">' + (n + 1) + '</button>';
      }).join('');
      key = 'seu|' + OP.repairProgress + '|' + s.computerOK;
      h = '<div class="crisis-head"><span class="badge-alert">2</span> <b>RADIATION FROZE THE COMPUTER</b></div>' +
        '<p>Reset in <b id="seuCountdown">' + Math.max(0, win).toFixed(0) + '</b>s &bull; Repeat this 5-number code:</p>' +
        '<div class="mini-game">' +
          '<div class="repair-code" aria-label="Repair code">' + codeText + '</div>' +
          '<div class="repair-pads">' + pads + '</div>' +
          '<div class="mini-game-copy"><b id="repairStatus">Tap the numbers in order · ' + OP.repairProgress + ' / 5</b></div>' +
        '</div>';
    } else if (ph === 'dsn') {
      syncTuneZone();
      var fill = s.buffer / s.bufCap, rem = E.DUR.dsn - s.phaseT, zone = tuneZone();
      cls += ' active ' + (fill <= 0.35 ? 'ok' : fill > 0.85 ? 'bad' : 'warn');
      key = 'dsn'; // fully static structure: dynamic bits are updated in place (keeps the slider alive while dragging)
      var tuner = '<div class="antenna-tuner-box">' +
        '<div class="tuner-head mono"><span>SIGNAL STRENGTH</span><b id="tuneStatus" style="color:var(--cyan)"></b></div>' +
        '<div class="tuner-slider-wrap"><div class="tuner-range-wrap">' +
          '<div class="tuner-slider-track"><div id="tuneZone" class="signal-zone" style="left:' + zone.left + '%;width:' + (zone.right - zone.left) + '%;pointer-events:none"></div></div>' +
          '<input type="range" id="antennaSlider" min="0" max="100" value="' + OP.tuneVal + '" class="antenna-slider" aria-label="Move the radio slider into the green band. The alert stops inside and returns outside." aria-valuetext="Move right into green">' +
        '</div></div></div>';
      h = '<div class="crisis-head"><span class="badge-alert">3</span> <b>RADIO WINDOW CLOSING</b></div>' +
        '<p><b id="dsnCountdown">' + Math.max(0, rem).toFixed(0) + '</b>s left &bull; Data waiting to send: <b id="dsnFill">' + Math.round(fill * 100) + '%</b></p>' +
        '<div class="fix-guidance-card" id="dsnGuide">' +
          '<div class="mini-game-copy dsn-guide-copy"><b id="dsnGuideHead">MOVE RIGHT INTO GREEN</b><span id="dsnExplain">The alert beeps outside green. Move the cyan knob into the 68-86% band to silence it.</span></div>' +
          tuner +
          '<div class="tuner-scale"><span>WEAK</span><b>LOCK ZONE 68-86%</b><span>STRONG</span></div>' +
          '<div class="crisis-actions-wrap dsn-wrap">' +
            '<button class="mini-game-btn secondary" id="dsnPauseBtn" data-th="0"><span id="dsnPauseLbl">PAUSE NEW DATA</span></button>' +
          '</div>' +
        '</div>';
    } else if (ph === 'nom1') {
      var anySleeping = b.instruments.some(function (i) { return !s.inst[i.id]; });
      key = 'nom1|' + anySleeping;
      var wakeBtn = anySleeping ? '<button class="crisis-act-btn ok-act" style="margin-top:6px;" data-act="allOn">' + ICON.sun + ' WAKE ALL INSTRUMENTS</button>' : '';
      h = '<div class="crisis-head nominal-head"><span class="badge-ok">SUNRISE CONFIRMED</span> <b>ALL SYSTEMS GREEN \u2022 SUNLIGHT RESTORED</b></div>' +
        '<p>Solar panels are producing full power. Science instruments are collecting orbital discovery points!</p>' + wakeBtn;
    } else if (ph === 'nom2') {
      h = '<div class="crisis-head nominal-head"><span class="badge-ok">NOMINAL</span> <b>COMPUTER RESTORED \u2022 APPROACHING GROUND LINK</b></div>' +
        '<p>Flight computer is running smoothly. Preparing antenna array to link with Earth ground station.</p>';
    } else if (ph === 'tail') {
      h = '<div class="crisis-head nominal-head"><span class="badge-ok">FLIGHT COMPLETE</span> <b>ORBITAL TRAJECTORY FINISHED</b></div><p>Calculating final NASA mission score\u2026</p>';
      cls += ' active ok';
    } else {
      key = 'nom0';
      h = '<div class="crisis-head nominal-head"><span class="badge-ok">ALL SYSTEMS GREEN</span> <b>CRUISING IN ORBIT</b></div><p>' +
        (ph === 'nom0' ? 'Spacecraft orbiting smoothly. Prepare systems: <b>night-time eclipse approaches</b>.' : 'Spacecraft cruising nominally.') + '</p>';
    }
    return [cls, h, key];
  }

  /* Per-frame in-place updates for the emergency panel (never replaces nodes). */
  function updateCrisisDyn(sim) {
    var ph = sim.phase, s = sim;
    if (ph === 'eclipse') {
      var info = eclInfo(s);
      setText('eclCountdown', info.remain.toFixed(0));
      setText('eclBatt', Math.round(s.batt) + ' Wh');
      var needle = $('eclNeedle');
      if (needle) needle.style.left = eclipseNeedle(s.phaseT) + '%';
      var st = $('eclStatus');
      if (st) { if (st.textContent !== info.txt) st.textContent = info.txt; st.style.color = info.col; }
      setText('eclGameStatus', OP.eclipseHit ? 'POWER SAVED' : OP.miniGames.eclipse.misses ? 'MISSED — WAIT FOR GREEN' : 'HIT WHEN THE MARKER IS GREEN');
    } else if (ph === 'seu') {
      setText('seuCountdown', Math.max(0, s.scn.seuWindow - s.phaseT).toFixed(0));
      setText('repairStatus', OP.repairFeedback || ('Tap the numbers in order · ' + OP.repairProgress + ' / 5'));
    } else if (ph === 'dsn') {
      var fill = s.buffer / s.bufCap, rem = Math.max(0, E.DUR.dsn - s.phaseT), cleared = fill <= 0.35;
      setText('dsnCountdown', rem.toFixed(0));
      setText('dsnFill', Math.round(fill * 100) + '%');
      var gd = $('dsnGuide'); if (gd) setCls(gd, 'fix-guidance-card' + (s.boost ? ' ok-state' : ''));
      var zone = tuneZone(s.phaseT);
      var inZone = OP.tuneVal >= zone.left && OP.tuneVal <= zone.right;
      var locked = s.boost && inZone;
      var tuneHint = locked ? 'SIGNAL LOCKED' : !inZone ? OP.tuneVal < zone.left ? 'MOVE RIGHT INTO GREEN' : 'MOVE LEFT INTO GREEN' : 'NO SIGNAL POWER';
      setText('dsnGuideHead', locked ? 'EMERGENCY SOLVED — SIGNAL LOCKED' : tuneHint);
      setText('dsnExplain', locked
        ? 'The alert is silent while you stay in green. Move outside and it beeps again; data keeps sending.'
        : inZone
          ? 'The knob is in green, but the transmitter has no power. Restore power to lock the signal.'
          : 'The alert beeps outside green. Move the cyan knob into the 68-86% band to silence it.');
      var sl = $('antennaSlider');
      if (sl) sl.setAttribute('aria-valuetext', tuneHint);
      var paused = s.throttle === 0, pb = $('dsnPauseBtn');
      if (pb) pb.setAttribute('data-th', paused ? '1' : '0');
      if (pb) pb.style.display = fill > 0.7 && !cleared ? '' : 'none';
      setText('dsnPauseLbl', paused ? 'RESUME DATA' : 'PAUSE NEW DATA');
      var ts = $('tuneStatus');
      if (ts) {
        var txt = locked ? 'LOCKED' : !inZone ? OP.tuneVal < zone.left ? 'MOVE RIGHT' : 'MOVE LEFT' : 'NO POWER';
        if (ts.textContent !== txt) ts.textContent = txt;
        ts.style.color = locked ? 'var(--green)' : 'var(--cyan)';
      }
      if (sl && root.document.activeElement !== sl && +sl.value !== OP.tuneVal) sl.value = OP.tuneVal;
    }
  }

  function tapEclipse() {
    if (!OP || OP.sim.phase !== 'eclipse' || OP.eclipseHit) return;
    var needle = eclipseNeedle(OP.sim.phaseT);
    if (needle < 38 || needle > 58) {
      OP.miniGames.eclipse.misses++;
      setText('eclGameStatus', 'MISSED — WAIT FOR GREEN');
      if (S.error) S.error();
      return;
    }
    E.act(OP.sim, { type: 'eclipseFix' });
    OP.eclipseHit = true;
    OP.miniGames.eclipse.hit = true;
    OP.score = (OP.score || 0) + 250;
    if (S.good) S.good();
    OO.toast('ECLIPSE SAFE — sunlight restored.', 'good');
  }

  function tapRepairPad(idx) {
    if (!OP || OP.sim.phase !== 'seu' || !OP.repairCode || OP.sim.computerOK) return;
    if (idx !== OP.repairCode[OP.repairProgress]) {
      OP.repairProgress = 0;
      OP.repairMistakes++;
      OP.miniGames.computer.mistakes++;
      OP.repairFeedback = 'Not quite — start the code again.';
      return;
    }
    OP.repairProgress++;
    OP.repairFeedback = '';
    if (S.zap) S.zap();
    if (OP.repairProgress < OP.repairCode.length) return;
    var sim = OP.sim;
    if (E.act(sim, { type: 'repairCode' })) {
      OP.miniGames.computer.solved = true;
      OP.score = (OP.score || 0) + 400;
      if (S.good) S.good();
      OO.toast('CODE MATCHED — computer restored.', 'good');
      handleEvents(sim);
    }
  }

  /* Orbital drift / thermal alert (Advanced mission) */
  function updateDrift(dt) {
    if (!OP.hasDrift || OP.sim.done) return;
    var sim = OP.sim;
    OP.drift = clamp(OP.drift + (2.8 + 1.2 * Math.sin(sim.t * 0.7)) * dt, 0, 100);
    if (OP.drift >= DRIFT_ALERT && !OP.driftAlert) {
      OP.driftAlert = true;
      logEvent({ level: 'warn', msg: 'THERMAL ALERT: attitude drift ' + Math.round(OP.drift) + '%. Radiator pointing is off. Fire RCS to stabilize!', t: sim.t });
      OO.toast('THERMAL ALERT: attitude drifting! Fire RCS [R] to stabilize.', 'warn');
      if (S.warn) S.warn();
    } else if (OP.drift < DRIFT_ALERT - 15 && OP.driftAlert) {
      OP.driftAlert = false;
    }
    if (OP.drift >= 100) {
      OP.driftHold += dt;
      if (OP.driftHold > 4) {
        OP.driftHold = 0;
        OP.score = Math.max(0, (OP.score || 0) - 100);
        if (OP.driftPen < 2) {
          OP.driftPen++;
          sim.pen.push({ key: 'drift', pts: 8, msg: 'Attitude drift left uncorrected: the craft overheated and lost pointing.' });
          logEvent({ level: 'crit', msg: 'ATTITUDE LOST: overheating and mispointing. Safe-mode penalty applied.', t: sim.t });
          if (S.error) S.error();
        }
      }
    } else OP.driftHold = 0;
  }

  function updateDriftUI() {
    if (!OP.hasDrift) return;
    var d = OP.drift, mb = $('mDrift');
    if (mb) { pctw(mb, d / 100); setCls(mb, 'load' + (d >= DRIFT_ALERT ? ' low' : '')); }
    setText('vDrift', Math.round(d) + '%');
    var chip = $('driftChip');
    if (chip) {
      var ct = d >= 100 ? 'ATTITUDE LOST' : d >= DRIFT_ALERT ? 'THERMAL ALERT' : d >= 40 ? 'DRIFTING' : 'STABLE';
      var cc = 'schip ' + (d >= DRIFT_ALERT ? 'bad' : d >= 40 ? 'warn' : 'ok');
      if (chip.textContent !== ct) chip.textContent = ct;
      if (chip.className !== cc) chip.className = cc;
    }
    setText('driftNote', d >= DRIFT_LOCK ? 'Craft is too unsteady. Press R to steady it.' : d >= DRIFT_ALERT ? 'Craft is heating up. Press R to steady it.' : 'Jupiter\u2019s magnetic field turns the craft. Press R to steady it before photos.');
  }

  function updateOps(dt) {
    var sim = OP.sim, b = sim.b, scn = sim.scn, ok = sim.computerOK, i;
    // orbit position
    var t = sim.t, phi = t <= 25 ? -0.3 + 0.02 * t : 0.2 + 0.008 * (t - 25);
    var a = phi * Math.PI * 2, px = 285 * Math.cos(a), py = 66 * Math.sin(a), th = -13.75 * Math.PI / 180;
    var X = 380 + px * Math.cos(th) - py * Math.sin(th), Y = 235 + px * Math.sin(th) + py * Math.cos(th);
    var front = Math.sin(a) > 0;
    OP.yaw += dt * 0.45;
    var jx = 0, jy = 0;
    if (!ok) { jx = (Math.random() - 0.5) * 3; jy = (Math.random() - 0.5) * 3; }
    if (OP.hasDrift && OP.drift > DRIFT_ALERT - 10) {
      var wob = (OP.drift - (DRIFT_ALERT - 10)) * 0.05;
      jx += (Math.random() - 0.5) * wob; jy += (Math.random() - 0.5) * wob;
    }
    if (OP.rcsT > 0) OP.rcsT -= dt;
    var rcsPlumes = (OP.rcsT > 0)
      ? '<g class="rcs-plumes" opacity="' + Math.min(1, OP.rcsT * 2.5).toFixed(2) + '">' +
        '<polygon points="-12,-8 -32,-16 -20,-4" fill="#38bdf8"/>' +
        '<polygon points="-12,8 -32,16 -20,4" fill="#38bdf8"/>' +
        '<polygon points="12,-8 32,-16 20,-4" fill="#38bdf8"/>' +
        '<polygon points="12,8 32,16 20,4" fill="#38bdf8"/>' +
        '<circle cx="-26" cy="0" r="5" fill="#e0f2fe" opacity=".9"/>' +
        '<circle cx="26" cy="0" r="5" fill="#e0f2fe" opacity=".9"/>' +
        '</g>'
      : '';
    var sc = I.shipScene({ scn: scn.id, prog: OP.prog, t: t, noFloor: true, noBrackets: true, labels: false }, OP.yaw, 0.45, 1.05, scn.id === 'europa' ? 1.05 : 1);
    var cls = 'shipwrap' + (!sim.sunlit ? ' shadowed' : '') + (sim.brown ? ' brown' : '') + (!ok ? ' glitch' : '');
    var markup = '<g class="' + cls + '" transform="translate(' + (X + jx).toFixed(1) + ',' + (Y + jy).toFixed(1) + ')">' + rcsPlumes + sc.svg() + '</g>';
    $('opsBack').innerHTML = front ? '' : markup; $('opsFront').innerHTML = front ? markup : '';
    // eclipse tint on the cone
    $('shadowCone').setAttribute('opacity', sim.phase === 'eclipse' ? (0.5 + 0.08 * Math.sin(t * 3)).toFixed(2) : '0.34');
    // link beam
    var beam = $('opsBeam'), tx = scn.id === 'leo' ? 325 : 722, ty = scn.id === 'leo' ? 313 : 40;
    beam.setAttribute('x1', X.toFixed(1)); beam.setAttribute('y1', Y.toFixed(1)); beam.setAttribute('x2', tx); beam.setAttribute('y2', ty);
    var active = sim.dataOut > 0 && ok && !sim.brown;
    beam.setAttribute('opacity', active ? (0.35 + 0.65 * clamp(sim.linkQ, 0.15, 1)).toFixed(2) : '0.12');
    beam.setAttribute('stroke', sim.linkQ > 0.6 ? '#34d399' : sim.linkQ > 0.3 ? '#fbbf24' : '#f87171');
    beam.setAttribute('stroke-dashoffset', (-t * (30 + 80 * clamp(sim.dataOut / Math.max(1, b.bw), 0, 1.5))).toFixed(1));
    beam.setAttribute('stroke-width', (1.4 + 2.2 * clamp(sim.dataOut / Math.max(1, b.bw), 0, 1.2)).toFixed(2));
    // radiation streaks
    var fx = '';
    if (sim.phase === 'seu' && !ok) for (i = 0; i < 5; i++) { var sx = X + 60 + Math.random() * 160, sy = Y - 120 - Math.random() * 100; fx += '<line x1="' + sx.toFixed(0) + '" y1="' + sy.toFixed(0) + '" x2="' + (sx - 26).toFixed(0) + '" y2="' + (sy + 30).toFixed(0) + '" stroke="#facc15" stroke-width="1.6" opacity="' + (0.4 + Math.random() * 0.5).toFixed(2) + '"/>'; }
    if (sim.phase === 'eclipse') fx += '<text x="' + (X).toFixed(0) + '" y="' + (Y - 82).toFixed(0) + '" class="ops-label warn" text-anchor="middle">IN SHADOW \u2022 NO SOLAR POWER</text>';
    if (OP.hasDrift && OP.drift >= DRIFT_ALERT) fx += '<text x="' + (X).toFixed(0) + '" y="' + (Y - 98).toFixed(0) + '" class="ops-label warn" text-anchor="middle">THERMAL ALERT \u2022 FIRE RCS</text>';
    $('opsFxG').innerHTML = fx;
    $('opsClock').textContent = 'MET ' + pad2(Math.floor(t / 60)) + ':' + pad2(Math.floor(t) % 60);
    $('opsOrbitTag').innerHTML = (sim.sunlit ? '<span class="dot ok"></span>SUNLIT' : '<span class="dot bad"></span>IN ' + esc(scn.shadowName.toUpperCase())) + ' \u2022 ' + esc(scn.orbitLabel.toUpperCase());

    // ---------- panel
    var g = function (x, n) { return ok ? x : garble(n || 4); };
    var maxP = Math.max(b.gen, b.load + scn.heater + 30, 20) * 1.08;
    pctw($('mGen'), sim.gen / maxP); pctw($('mLoad'), sim.load / maxP);
    $('vGen').textContent = g(fmt(sim.gen) + ' W', 3); $('vLoad').textContent = g(fmt(sim.load) + ' W', 3);
    pctw($('mBatt'), sim.battMax > 0 ? sim.batt / sim.battMax : 0);
    $('vBatt').textContent = g(sim.battMax > 0 ? Math.round(sim.batt) + '/' + Math.round(sim.battMax) + ' Wh' : 'NONE', 5);
    setCls($('mBatt'), 'batt' + (sim.battMax > 0 && sim.batt / sim.battMax < 0.25 ? ' low' : ''));
    var pc = $('pwChip');
    if (sim.brown) { pc.textContent = 'BROWNOUT \u2022 SAFE MODE'; pc.className = 'schip bad'; }
    else if (sim.net >= 0) { pc.textContent = 'CHARGING +' + fmt(sim.net) + ' W'; pc.className = 'schip ok'; }
    else { pc.textContent = 'DISCHARGING ' + fmt(sim.net) + ' W'; pc.className = 'schip ' + (sim.batt / Math.max(1, sim.battMax) < 0.3 ? 'bad' : 'warn'); }
    $('pwNote').textContent = sim.sunlit ? 'sunlit' : 'eclipse: ' + (b.genRTG > 0 ? 'RTG only' : 'battery only');

    qa('#instGrid .sw').forEach(function (el) {
      var id = el.getAttribute('data-inst'), on = !!sim.inst[id];
      if (el.getAttribute('aria-pressed') !== String(on)) el.setAttribute('aria-pressed', String(on));
      el.classList.toggle('locked', !ok || (sim.brown && !on));
    });
    var fill = sim.buffer / sim.bufCap;
    pctw($('mBuf'), fill);
    setCls($('mBuf'), sim.ov ? 'over' : fill > 0.7 ? 'hi' : fill <= 0.35 ? 'lo' : '');
    $('vBuf').textContent = g(Math.round(fill * 100) + '%', 3);
    var lq = sim.linkQ * (sim.boost ? 1.5 : 1);
    pctw($('mLink'), clamp(lq / 1.5, 0, 1)); setCls($('mLink'), 'link' + (sim.linkQ < 0.3 ? ' low' : sim.linkQ < 0.6 ? ' mid' : ''));
    $('vLink').textContent = Math.round(sim.linkQ * 100) + '%';
    $('rIn').textContent = g(fmt(sim.dataIn || 0) + ' kbps', 4); $('rOut').textContent = g(fmt(sim.dataOut || 0) + ' kbps', 4);
    qa('#thrCtl button').forEach(function (el) { el.classList.toggle('on', Math.abs(+el.getAttribute('data-th') - sim.throttle) < 1e-6); });
    $('swBoost').setAttribute('aria-pressed', String(sim.boost));
    // computer
    var cp = $('cpChip');
    if (sim.rebooting) { cp.textContent = 'REBOOTING ' + Math.max(0, sim.rebootT).toFixed(1) + ' s'; cp.className = 'schip warn'; }
    else if (!ok) { cp.textContent = 'FAULT \u2022 FROZEN'; cp.className = 'schip bad'; }
    else { cp.textContent = 'NOMINAL'; cp.className = 'schip ok'; }
    $('cpNote').textContent = ok ? 'commands accepted' : 'commands locked';
    var regsEl = $('regs'), regs = regsEl ? regsEl.children : [], word = sim.seu ? sim.seu.word : 0x5A3C;
    for (i = 0; i < 16; i++) {
      var bit = (word >> i) & 1, flipped = sim.seu && !ok && sim.seu.bit === i;
      var c = (flipped ? 'flip' : (bit ? 'one' : 'zero'));
      if (regs && regs[i]) {
        if (regs[i].className !== c) regs[i].className = c;
        regs[i].textContent = flipped ? (bit ^ 1) : bit;
      }
    }
    $('swBackup').setAttribute('aria-pressed', String(sim.backup));
    var rb = $('btnReboot'); rb.classList.toggle('ready', !ok && sim.backup && !sim.rebooting); rb.classList.toggle('busy', sim.rebooting);
    var bst = $('boostStatus');
    if (bst) {
      bst.textContent = sim.boost ? 'ACTIVE (+50%)' : 'OFF';
      bst.style.color = sim.boost ? 'var(--cyan)' : 'var(--dim)';
    }
    var ism = $('instSummary');
    if (ism) {
      var anySleeping = b.instruments.some(function (inst) { return !sim.inst[inst.id]; });
      ism.textContent = anySleeping ? 'Sleeping (Saved)' : b.instruments.length + ' Active';
      ism.style.color = anySleeping ? 'var(--amber)' : 'var(--green)';
    }
    // crisis tracker + box
    var st = { eclipse: 'pend', seu: 'pend', dsn: 'pend' }, tx2 = { eclipse: 'PENDING', seu: 'PENDING', dsn: 'PENDING' };
    if (sim.phase === 'eclipse') { st.eclipse = 'act'; tx2.eclipse = 'ACTIVE'; }
    if (sim.results.eclipse) { st.eclipse = sim.results.eclipse.ok ? 'ok' : 'bad'; tx2.eclipse = sim.results.eclipse.ok ? 'SURVIVED' : 'BROWNOUT'; }
    if (sim.phase === 'seu') { st.seu = 'act'; tx2.seu = 'ACTIVE'; }
    if (sim.results.seu) { st.seu = sim.results.seu.ok ? 'ok' : 'bad'; tx2.seu = sim.results.seu.ok ? 'FIXED ' + sim.results.seu.time.toFixed(1) + 's' : 'TIMED OUT'; }
    if (sim.phase === 'dsn') { st.dsn = 'act'; tx2.dsn = 'ACTIVE'; }
    if (sim.results.dsn) { st.dsn = sim.results.dsn.cleared ? 'ok' : 'bad'; tx2.dsn = sim.results.dsn.cleared ? 'CLEARED' : 'DATA LEFT'; }
    CRISIS.forEach(function (c) { setCls($('ct_' + c.id), 'ct ' + st[c.id]); $('cts_' + c.id).textContent = tx2[c.id]; });

    // Emergency box: rewrite the DOM ONLY when its structure key changes; live numbers update in place.
    var cb = crisisBoxText(sim), box = $('crisisBox');
    setCls(box, cb[0]);
    if (box.getAttribute('data-key') !== cb[2]) { box.innerHTML = cb[1]; box.setAttribute('data-key', cb[2]); }
    updateCrisisDyn(sim);

    var crit = sim.phase === 'eclipse' ? 'eclipse' : sim.phase === 'seu' ? 'seu' : sim.phase === 'dsn' ? 'dsn' : '';
    if ($('opsPanel').getAttribute('data-crisis') !== crit) $('opsPanel').setAttribute('data-crisis', crit);
    if (OP.bannerT > 0) { OP.bannerT -= dt; if (OP.bannerT <= 0) $('crisisBanner').hidden = true; }
    // telemetry ping
    updateDriftUI();
    if (sim.phase === 'dsn' && sim.boost) OP.miniGames.radio.lockSeconds += dt;

    // Auto wake-up in sunrise
    if (sim.phase === 'nom1') {
      if (b.instruments.some(function (inst) { return !sim.inst[inst.id]; })) {
        b.instruments.forEach(function (inst) { sim.inst[inst.id] = true; });
      }
    }
  }

  OO.loops.ops = function (dt) {
    if (!OP) return;
    if (OP.paused) return; // Paused while reading the guide
    var sim = OP.sim;
    OP.acc += dt;
    while (OP.acc >= 0.1) { OP.acc -= 0.1; E.step(sim, 0.1); }
    updateDrift(dt);
    handleEvents(sim);
    updateOps(dt);

    // Active Discovery Anomaly Reticle
    var activeAnom = OP.anomalies.find(function (a) { return !a.captured && sim.t >= a.t && sim.t < a.t + a.dur; });
    var targetEl = $('scienceTarget');
    if (activeAnom) {
      if (targetEl) {
        targetEl.style.display = 'flex';
        targetEl.style.left = activeAnom.x + 'px';
        targetEl.style.top = activeAnom.y + 'px';
        var tt = $('targetTitle'); if (tt) tt.textContent = activeAnom.title.toUpperCase();
        var image = $('targetImage');
        if (image && image.getAttribute('src') !== activeAnom.image) image.setAttribute('src', activeAnom.image);
        if (image) image.alt = activeAnom.imageAlt;
      }
    } else {
      if (targetEl) targetEl.style.display = 'none';
    }
    var scoreVal = $('gameScoreVal'); if (scoreVal) scoreVal.textContent = Math.round(OP.score || 0);
    var photoCount = $('photoCount'); if (photoCount) photoCount.textContent = OP.photos.length + '/' + OP.anomalies.length;

    if (sim.done && OP.endT === null) { OP.endT = 0; $('opsFlash').className = 'flash end on'; S.alarmStop(); }
    // NOTE: the ops state (photos, arcade score) is handed to the debrief explicitly, because OP is nulled here.
    if (OP.endT !== null) { OP.endT += dt; if (OP.endT > 1.8) { var o = OP; OP = null; $('opsFlash').className = 'flash'; FLOW.startDebrief(o.sim, o); } }
  };

  function opsAct(a) {
    if (!OP) return;
    var sim = OP.sim;
    if (a.type === 'rcs') {
      OP.rcsT = 0.55;
      if (OP.hasDrift) OP.drift = Math.max(0, OP.drift - DRIFT_RCS_CUT);
      if (sim.phase === 'eclipse') {
        if (S.rcs) S.rcs(); else if (S.ignition) S.ignition();
        OO.toast('Thrusters fired.' + (OP.hasDrift ? ' Attitude stabilized.' : ''), 'good');
        var flash = $('opsFlash'); if (flash) { flash.className = 'flash on'; setTimeout(function () { flash.className = 'flash'; }, 200); }
      } else {
        if (S.rcs) S.rcs(); else if (S.beep) S.beep(520);
        OO.toast(OP.hasDrift ? 'RCS burst fired! Attitude stabilized: drift cut by ' + DRIFT_RCS_CUT + '%.' : 'RCS Attitude Burst fired! Prograde orbit adjusted.', 'good');
      }
      return;
    }
    // If computer is frozen, don't buzz error on innocent clicks, give clear advice
    if (!sim.computerOK && a.type !== 'reboot' && a.type !== 'backup') {
      OO.toast('Computer is frozen. Repeat the repair code before using controls.', 'warn');
      return;
    }
    var ok = E.act(sim, a);
    if (ok) S.click();
    handleEvents(sim);
  }

  function tuneZone() {
    return { left: TUNE_LO, right: TUNE_HI };
  }
  function setTuneAlerting(alerting) {
    if (!OP || OP.tuneAlerting === alerting) return;
    OP.tuneAlerting = alerting;
    if (alerting) S.alarmStart();
    else S.alarmStop();
  }
  function syncTuneZone() {
    if (!OP || OP.sim.phase !== 'dsn') return;
    var zone = tuneZone(OP.sim.phaseT), inZone = OP.tuneVal >= zone.left && OP.tuneVal <= zone.right;
    if (OP.sim.boost !== inZone) {
      var ok = E.act(OP.sim, { type: 'boost', on: inZone });
      if (ok && inZone && !OP.tuneAwarded) {
        OP.tuneAwarded = true;
        OP.score = (OP.score || 0) + 150;
        OP.miniGames.radio.locks++;
      }
    }
    setTuneAlerting(!(inZone && OP.sim.boost));
  }
  /  * Antenna tuner: boost engages while the thumb remains inside the green zone. */
  function tuneInput(val) {
    if (!OP) return;
    OP.tuneVal = val;
    syncTuneZone();
    OP.sliderLock = !!OP.sim.boost;
  }
  /* =====================================================================
   *  DEBRIEF
   * ===================================================================== */
  var TAGNAME = { solar: 'solar power', rtg: 'RTG nuclear power', dish: 'a high-gain dish', omni: 'a low-gain antenna', ka: 'Ka-band telecom', optical: 'optical imaging', msi: 'multispectral imaging', radar: 'ice-penetrating radar', maspex: 'a mass spectrometer', rideshare: 'rideshare launch', heavy: 'heavy-lift launch', super: 'super-heavy launch', smallsat: 'CubeSat-class size', flagship: 'flagship-class ambition', earthorbit: 'an Earth-orbit target', outer: 'an outer-planet target', battery: 'battery storage' };
  var RANK = {
    'S': { col: '#fbbf24', head: 'OUTSTANDING MISSION!', msg: 'Your spacecraft collected and sent back science while handling the hazards.' },
    'A': { col: '#34d399', head: 'MISSION SUCCESS!', msg: 'Your spacecraft reached its goal and returned useful science data.' },
    'B': { col: '#22d3ee', head: 'PARTIAL SUCCESS', msg: 'Your spacecraft returned some science. The lessons below show where to improve.' },
    'C': { col: '#f59e0b', head: 'MISSION NEEDS WORK', msg: 'Your spacecraft made it through the flight, but some systems need a redesign.' },
    'Mission Loss': { col: '#f87171', head: 'MISSION INCOMPLETE', msg: 'Some science or safety goals were missed. Use the notes below to improve the next design.' }
  };

  FLOW.startDebrief = function (sim, opState) {
    S.alarmStop(); S.rumbleStop();
    // OP is already null when the ops loop hands off, so the ops state is passed in explicitly.
    var ops = opState || OP;
    var photos = (ops && ops.photos) ? ops.photos : [];
    var flightScore = Math.round(ops ? (ops.score || 0) : 0);
    var pilotRank = flightScore >= 4000
      ? { code: 'S', title: 'EXPERT PILOT', cls: 'rank-s' }
      : flightScore >= 2800
      ? { code: 'A', title: 'STRONG PILOT', cls: 'rank-a' }
      : flightScore >= 1600
      ? { code: 'B', title: 'SPACE SPECIALIST', cls: 'rank-b' }
      : { code: 'C', title: 'TRAINEE', cls: 'rank-c' };

    // Photo bonus: every captured orbital anomaly adds 150 to the science total before scoring.
    if (!sim._photoBonusApplied) {
      sim.sci += photos.length * 150;
      sim._photoBonusApplied = true;
    }

    var sc = E.score(sim), ids = OO.order.slice(), match = E.match(OO.scn, ids), top = match[0];
    var R = RANK[sc.rank], b = sim.b, scn = sim.scn;
    var mine = E.buildTags(OO.scn, ids), shared = top.mission.tags.filter(function (t) { return mine[t]; }).map(function (t) { return TAGNAME[t]; }).filter(Boolean).slice(0, 3);
    var prog = {}; ids.forEach(function (id) { prog[id] = 1; });
    var totalTargets = (ops && ops.anomalies) ? ops.anomalies.length : 4;
    var lessons = [
      {
        title: 'DARKNESS',
        ok: !!(sim.results.eclipse && sim.results.eclipse.ok),
        text: sim.results.eclipse && sim.results.eclipse.ok
          ? 'Battery lasted until sunlight returned. Turning sensors off saves power in the dark.'
          : 'Power ran out before sunrise. Next time, save battery as soon as the craft enters darkness.'
      },
      {
        title: 'COMPUTER',
        ok: !!(sim.results.seu && sim.results.seu.ok),
        text: sim.results.seu && sim.results.seu.ok
          ? 'You repaired the computer in ' + sim.results.seu.time.toFixed(1) + ' seconds. Radiation can flip a memory bit.'
          : 'The repair timer ran out. Repeat the number code before the watchdog reset.'
      },
      {
        title: 'RADIO',
        ok: !!(sim.results.dsn && sim.results.dsn.cleared),
        text: sim.results.dsn && sim.results.dsn.cleared
          ? 'You sent the stored data to Earth before the radio window closed.'
          : 'Some data stayed on the spacecraft. Move the knob into the green band and hold it there to send data.'
      }
    ];

    var h = '';
    h += '<div class="db-head"><div><div class="eyebrow mono">NASA MISSION EVALUATION REPORT &bull; ' + esc(scn.name.toUpperCase()) + '</div><h2>' + R.head + '</h2><p class="db-msg">' + R.msg + '</p></div>' +
      '<div class="stamp-wrap"><div class="stamp" id="stamp" style="--c:' + R.col + '"><span class="mono">DESIGN GRADE</span><b' + (sc.rank === 'Mission Loss' ? ' class="loss"' : '') + '>' + (sc.rank === 'Mission Loss' ? 'LOSS' : sc.rank) + '</b></div></div></div>';

    h += '<div class="db-grid">';

    // Card 1: Scorecard
    h += '<section class="db-card scores"><h3 class="mono">MISSION SCORECARD</h3>' +
      '<div class="score-grid">' +
      [['SCIENCE DATA RETURNED', sc.yieldPct, 'How much science reached Earth.'],
       ['BUILD EFFICIENCY', sc.eff, 'How well the design used its budget and weight.'],
       ['HAZARD RESPONSE', sc.surv, 'How well the spacecraft handled each emergency.']].map(function (r, i) {
        var cl = r[1] >= 75 ? 'hi' : r[1] >= 45 ? 'mid' : 'lo';
        return '<div class="score"><div class="sl"><b class="mono">' + r[0] + '</b><span class="mono num" data-n="' + Math.round(r[1]) + '">0</span></div>' +
          '<div class="sbar"><div class="sfill ' + cl + '" data-w="' + r[1].toFixed(1) + '" style="transition-delay:' + (0.4 + i * 0.2) + 's"></div></div>' +
          '<p>' + r[2] + '</p></div>';
      }).join('') +
      '</div>' +
      '<div class="overall mono">DESIGN SCORE: <b>' + Math.round(sc.overall) + '</b> / 100 &bull; ' + (sc.rank === 'Mission Loss' ? 'MISSION LOSS' : 'DESIGN GRADE ' + sc.rank) + '</div>' +
      '<div class="pilot-arcade-box">' +
        '<div class="pilot-badge-row">' +
          '<div class="pilot-score-val mono">PILOT FLIGHT SCORE: <b class="pilot-num mono" data-n="' + flightScore + '">0</b> PTS</div>' +
          '<div class="pilot-rank-pill mono ' + pilotRank.cls + '">' + pilotRank.title + '</div>' +
        '</div>' +
        '<div class="pilot-stats-sub mono">' +
          '<span>📸 Recon Discoveries: <b>' + photos.length + ' / ' + totalTargets + '</b></span>' +
        '</div>' +
      '</div>' +
      '</section>';

    // Card 2: NASA Spacecraft Match
    h += '<section class="db-card real"><h3 class="mono">A REAL SPACECRAFT LIKE YOURS</h3>' +
      '<div class="hero-match"><div class="ring" style="--p:' + top.sim + '"><b class="mono">' + top.sim + '%</b><span>similar</span></div>' +
      '<div><div class="mono eyebrow">CLOSEST NASA TWIN</div><h4>' + esc(top.mission.name) + '</h4><div class="mono dim">' + esc(top.mission.agency) + '</div><p class="dim">' + esc(top.mission.short) + '</p></div></div>' +
      (shared.length ? '<p class="shared">Like this mission, your craft uses <b>' + shared.join('</b>, <b>') + '</b>.</p>' : '') +
      '</section>';

    // Hazard results
    h += '<section class="db-card causes"><h3 class="mono">HAZARD DEBRIEF</h3><ul class="lesson-list">' +
      lessons.map(function (lesson) {
        return '<li class="' + (lesson.ok ? 'good' : 'warn') + '"><b>' + lesson.title + '</b><span>' + esc(lesson.text) + '</span></li>';
      }).join('') + '</ul></section>';

    // Captured reference images
    h += '<section class="db-card discoveries"><h3 class="mono">' + ICON.cam + ' DISCOVERIES <span class="discovery-count">' +
      photos.length + ' / ' + totalTargets + ' captured</span></h3>' +
      '<div class="photo-gallery-grid">' +
      (photos.length ? photos.map(function (p) {
        return '<div class="polaroid-card">' +
          '<div class="polaroid-badge mono">DISCOVERY &bull; +' + p.sciencePts + ' PTS</div>' +
          '<img class="polaroid-image" src="' + esc(p.image) + '" alt="' + esc(p.imageAlt) + '" loading="lazy">' +
          '<div class="polaroid-title">' + esc(p.title) + '</div>' +
          '<div class="polaroid-desc">' + esc(p.desc) + '</div>' +
          '<a class="polaroid-credit" href="' + esc(p.imageSource) + '" target="_blank" rel="noopener noreferrer">NASA reference image &bull; ' + esc(p.imageCredit) + '</a>' +
        '</div>';
      }).join('') : '<div class="empty-discoveries">No photos captured this flight. Press SPACE when a discovery appears.</div>') +
      '</div></section>';

    h += '</div>';

    // Actions
    h += '<div class="db-actions">' +
      '<button class="btn primary big pulse-btn" id="dbRetry"><svg class="btn-svg" viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-4.05 11a22.7 22.7 0 0 1-3.95 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 9V4s3.03.55 4 2c1.08 1.62 0 5 0 5"/><circle cx="15" cy="9" r="1.5"/></svg> Redesign Spacecraft <small>Keep build and tweak</small></button>' +
      '<button class="btn ghost big" id="dbNew"><svg class="btn-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg> Choose New Mission</button>' +
      '<button class="btn ghost big" id="dbShare"><svg class="btn-svg" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> Copy My Score</button>' +
    '</div>';

    $('debrief').innerHTML = h;
    OO.result = { sim: sim, sc: sc, top: top, flightScore: flightScore, pilotRank: pilotRank.title, photos: photos.length };
    OO.show('debrief');

    // animate
    setTimeout(function () {
      qa('#debrief .sfill').forEach(function (el) { el.style.width = el.getAttribute('data-w') + '%'; });
      qa('#debrief .num').forEach(function (el, i) {
        var to = +el.getAttribute('data-n'), t0 = performance.now() + 400 + i * 200;
        (function step(now) { var p = clamp((now - t0) / 800, 0, 1); el.textContent = Math.round(to * p); if (p < 1) requestAnimationFrame(step); })(performance.now());
      });
      qa('#debrief .pilot-num').forEach(function (el) {
        var to = +el.getAttribute('data-n'), t0 = performance.now() + 500;
        (function step(now) { var p = clamp((now - t0) / 900, 0, 1); el.textContent = commas(Math.round(to * p)); if (p < 1) requestAnimationFrame(step); })(performance.now());
      });
    }, 60);
    setTimeout(function () {
      var st = $('stamp'); if (st) { st.classList.add('in'); S.stamp(); setTimeout(function () { (sc.rank === 'Mission Loss' || sc.rank === 'C') ? S.fail() : S.good(); }, 260); }
    }, 1200);
  };

  function triggerStageSeparation() {
    if (!LK || LK.staged) return;
    LK.staged = true;
    LK.stageReady = false;
    LK.sepAge0 = Math.max(0, LK.t - 3);
    if (S.good) S.good();
    $('launchCall').textContent = 'BOOSTER JETTISON CONFIRMED! Upper stage engine firing to orbit.';
    $('launchCall').className = 'call mono good';
    var bStage = $('btnManualStage');
    if (bStage) bStage.style.display = 'none';
    var boom = $('lkBoom');
    if (boom) {
      boom.setAttribute('transform', 'translate(400, 260) scale(1.6)');
      boom.style.display = '';
      setTimeout(function () { if (boom) boom.style.display = 'none'; }, 400);
    }
  }

  /* Shared handler for the small set of Stage 5 control actions. */
  function handleActButton(act) {
    if (!OP) return;
    if (act === 'eclipse-hit') tapEclipse();
    else if (act === 'allOff') { opsAct({ type: 'allInst', on: false }); OO.toast('Sensors off to save battery.', 'warn'); }
    else if (act === 'rcs') opsAct({ type: 'rcs' });
  }

  /* =====================================================================
   *  events
   * ===================================================================== */
  function bind() {
    $('failModal').addEventListener('click', function (e) {
      if (e.target.closest('#btnRetryLaunch')) {
        S.click(); S.alarmStop(); S.rumbleStop();
        $('failModal').hidden = true;
        LK = null;
        FLOW.startLaunch();
      }
      else if (e.target.closest('#btnReturn')) { S.click(); S.alarmStop(); S.rumbleStop(); LK = null; OO.enterConfig(true); }
      else if (e.target.closest('#btnToTitle')) { S.click(); S.alarmStop(); S.rumbleStop(); LK = null; OO.show('level'); }
    });

    // Arcade Steering Buttons
    var bLeft = $('btnSteerLeft'), bRight = $('btnSteerRight');
    if (bLeft) {
      bLeft.addEventListener('pointerdown', function (e) { e.preventDefault(); if (LK) LK.steerInput = -1; });
      bLeft.addEventListener('pointerup', function () { if (LK && LK.steerInput === -1) LK.steerInput = 0; });
      bLeft.addEventListener('pointerleave', function () { if (LK && LK.steerInput === -1) LK.steerInput = 0; });
    }
    if (bRight) {
      bRight.addEventListener('pointerdown', function (e) { e.preventDefault(); if (LK) LK.steerInput = 1; });
      bRight.addEventListener('pointerup', function () { if (LK && LK.steerInput === 1) LK.steerInput = 0; });
      bRight.addEventListener('pointerleave', function () { if (LK && LK.steerInput === 1) LK.steerInput = 0; });
    }
    var bStage = $('btnManualStage');
    if (bStage) {
      bStage.addEventListener('click', function () { triggerStageSeparation(); });
    }

    // Keyboard Controls
    window.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (LK) { LK.steerInput = -1; e.preventDefault(); }
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (LK) { LK.steerInput = 1; e.preventDefault(); }
      } else if ((e.key === 'r' || e.key === 'R') && OP && !OP.paused && !OP.sim.done) {
        opsAct({ type: 'rcs' });
        e.preventDefault();
      } else if (OP && OP.sim.phase === 'seu' && /^[1-4]$/.test(e.key)) {
        tapRepairPad(+e.key - 1);
        e.preventDefault();
      } else if (e.key === ' ' || e.code === 'Space') {
        if (LK && LK.stageReady && !LK.staged) {
          triggerStageSeparation();
          e.preventDefault();
        } else if (OP) {
          var sim = OP.sim;
          if (sim.phase === 'eclipse') {
            tapEclipse();
          } else if (OP.hasDrift && OP.drift >= DRIFT_LOCK) {
            opsAct({ type: 'rcs' }); // unstable attitude: SPACE stabilizes first, then photograph
          } else {
            FLOW.snapPhoto();
          }
          e.preventDefault();
        }
      }
    });
    window.addEventListener('keyup', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (LK && LK.steerInput === -1) LK.steerInput = 0;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (LK && LK.steerInput === 1) LK.steerInput = 0;
      }
    });

    // Science Discovery Photo Click
    var bSnap = $('btnSnapPhoto'), targetEl = $('scienceTarget');
    if (bSnap) bSnap.addEventListener('click', function (e) { e.stopPropagation(); FLOW.snapPhoto(); });
    if (targetEl) targetEl.addEventListener('click', function () { FLOW.snapPhoto(); });

    // Operations Panel clicks (Emergency Actions & Mini-Games)
    $('opsPanel').addEventListener('click', function (e) {
      var pad = e.target.closest('[data-repair-pad]');
      if (pad && OP) {
        tapRepairPad(+pad.getAttribute('data-repair-pad'));
        return;
      }

      var el = e.target.closest('button'); if (!el) return;
      if (el.hasAttribute('data-inst')) { var id = el.getAttribute('data-inst'); opsAct({ type: 'inst', id: id, on: !OP.sim.inst[id] }); }
      else if (el.hasAttribute('data-th')) opsAct({ type: 'throttle', v: +el.getAttribute('data-th') });
      else handleActButton(el.getAttribute('data-act'));
    });

    // Antenna Slider Input (lock window: TUNE_LO..TUNE_HI)
    $('opsPanel').addEventListener('input', function (e) {
      if (e.target.id === 'antennaSlider' && OP) tuneInput(+e.target.value);
    });

    $('debrief').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; S.click();
      if (b.id === 'dbRetry') OO.enterConfig(true);
      else if (b.id === 'dbSame') { OO.enterConfig(true); setTimeout(function () { FLOW.startLaunch(); }, 0); }
      else if (b.id === 'dbNew') { OO.resetBuild(); OO.show('level'); }
      else if (b.id === 'dbShare' && OO.result) {
        var r = OO.result, txt = 'I flew ' + r.sim.scn.name + ' in Orbital Odyssey! Design Score: ' + Math.round(r.sc.overall) + '/100 (' + (r.sc.rank === 'Mission Loss' ? 'Loss' : 'Rank ' + r.sc.rank) + '), Flight Score: ' + commas(r.flightScore || 0) + ' PTS (' + (r.pilotRank || 'Pilot') + '). My probe is ' + r.top.sim + '% like ' + r.top.mission.name + '! #NASASpaceApps';
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { OO.toast('Result copied to clipboard.', 'good'); }, function () { OO.toast(txt); });
        else OO.toast(txt);
      }
    });

    var bg = $('btnOpsGuide');
    if (bg) bg.addEventListener('click', function () {
      S.click();
      var m = $('opsTutModal');
      if (m) m.hidden = false;
      if (OP) OP.paused = true;
    });

    var bs = $('btnOpsTutStart'), bk = $('btnOpsTutSkip');
    function closeOpsTut() {
      S.click();
      var m = $('opsTutModal');
      if (m) m.hidden = true;
      if (OP) OP.paused = false;
      try { localStorage.setItem('oo_ops_guide_seen', '1'); } catch (e) {}
    }
    if (bs) bs.addEventListener('click', closeOpsTut);
    if (bk) bk.addEventListener('click', closeOpsTut);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
})(window);
