// Automated Test Harness for Stage 4 Steering/Staging & Stage 5 Interactive Console
const fs = require('fs');
const vm = require('vm');

class MockElement {
  constructor(id) {
    this.id = id || '';
    this.className = '';
    this.textContent = '';
    this.innerHTML = '';
    this.style = {};
    this.attributes = {};
    this.children = [];
    this.parentNode = null;
    this.listeners = {};
    this.classList = {
      add: (c) => { if (!this.className.includes(c)) this.className = (this.className + ' ' + c).trim(); },
      remove: (c) => { this.className = this.className.replace(new RegExp('\\b' + c + '\\b', 'g'), '').trim(); },
      toggle: (c, force) => {
        if (force === undefined) force = !this.className.includes(c);
        if (force) this.classList.add(c); else this.classList.remove(c);
        return force;
      }
    };
    this.focus = () => {};
    this.firstChild = { setAttribute: () => {}, getAttribute: () => '' };
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] !== undefined ? this.attributes[k] : ''; }
  hasAttribute(k) { return this.attributes[k] !== undefined; }
  removeAttribute(k) { delete this.attributes[k]; }
  addEventListener(ev, fn) {
    if (!this.listeners[ev]) this.listeners[ev] = [];
    this.listeners[ev].push(fn);
  }
  trigger(ev, eventObj) {
    var e = eventObj || {
      target: this,
      preventDefault: () => {},
      stopPropagation: () => {},
      closest: (sel) => this.closest(sel)
    };
    if (this.listeners[ev]) {
      this.listeners[ev].forEach(fn => fn(e));
    }
  }
  closest(sel) {
    if (!sel) return null;
    var cleanSel = sel.trim();
    if (cleanSel.startsWith('#')) {
      return this.id === cleanSel.slice(1) ? this : null;
    }
    if (cleanSel.startsWith('.')) {
      return this.className.includes(cleanSel.slice(1)) ? this : null;
    }
    if (cleanSel.startsWith('[') && cleanSel.endsWith(']')) {
      var attr = cleanSel.slice(1, -1);
      return this.hasAttribute(attr) ? this : null;
    }
    return this;
  }
  querySelector() { return new MockElement('sub'); }
  querySelectorAll(sel) {
    var res = [];
    var cls = sel.startsWith('.') ? sel.slice(1) : null;
    var tag = !sel.startsWith('.') && !sel.startsWith('#') ? sel.toLowerCase() : null;
    var walk = (node) => {
      if (cls && node.className.includes(cls)) res.push(node);
      else if (tag && node.id === tag) res.push(node);
      node.children.forEach(walk);
    };
    this.children.forEach(walk);
    return res;
  }
  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }
  insertBefore(newEl, refEl) {
    this.children.unshift(newEl);
    newEl.parentNode = this;
    return newEl;
  }
  removeChild(child) {
    var idx = this.children.indexOf(child);
    if (idx !== -1) this.children.splice(idx, 1);
    return child;
  }
}

const elements = {};
function getEl(id) {
  if (!elements[id]) elements[id] = new MockElement(id);
  return elements[id];
}

const keyListeners = [];
const windowMock = {
  console: console,
  document: {
    getElementById: (id) => getEl(id),
    querySelector: (sel) => getEl(sel.replace(/^[#.]/, '')),
    querySelectorAll: (sel) => [],
    createElement: (tag) => new MockElement(tag),
    readyState: 'complete'
  },
  addEventListener: (ev, fn) => {
    if (ev === 'keydown' || ev === 'keyup') keyListeners.push({ ev, fn });
  },
  keyListeners: keyListeners,
  performance: { now: () => Date.now() },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  setTimeout: (fn) => fn(),
  clearTimeout: () => {}
};
windowMock.window = windowMock;

// Mock audio SFX
windowMock.OO_SFX = {
  init: () => {}, alarmStart: () => {}, alarmStop: () => {}, rumbleStart: () => {},
  rumbleLevel: () => {}, rumbleStop: () => {}, tick: () => {}, tickGo: () => {},
  good: () => {}, fail: () => {}, error: () => {}, warn: () => {}, beep: () => {},
  telemetry: () => {}, zap: () => {}, rcs: () => {}, photo: () => {}, combo: () => {},
  stamp: () => {}, reboot: () => {}, click: () => {}, ignition: () => {}
};

// Load scripts in order
const dataCode = fs.readFileSync('public/js/data.js', 'utf8');
const engineCode = fs.readFileSync('public/js/engine.js', 'utf8');
const isoCode = fs.readFileSync('public/js/iso.js', 'utf8');

// Run in context
const ctx = vm.createContext(windowMock);
vm.runInContext(dataCode, ctx);
vm.runInContext(engineCode, ctx);
vm.runInContext(isoCode, ctx);

// Setup OO base
vm.runInContext(`
  window.OO = {
    $: (id) => document.getElementById(id),
    qa: (sel, el) => (el || document).querySelectorAll(sel),
    esc: (s) => String(s),
    fmt: (v) => String(Math.round(v)),
    setCls: (el, cls) => { if (el) el.className = cls; },
    scn: 'leo',
    order: ['cam', 'si', 'batt', 'dish', 'ride'],
    loops: {},
    toast: (msg, type) => { console.log('   [TOAST]', msg); },
    show: (scr) => { console.log('   [SHOW SCREEN]', scr); },
    enterConfig: () => {}
  };
  window.OO.b = window.OO_ENGINE.compute(window.OO.scn, window.OO.order);
`, ctx);

// Load flow.js
const flowCode = fs.readFileSync('public/js/flow.js', 'utf8');
vm.runInContext(flowCode, ctx);

console.log('=== TEST 1: Stage 4 Hands-off Steering (Doing Nothing Must Fail) ===');
vm.runInContext(`
  OO_FLOW.startLaunch();
  var failed = false;
  var failReason = null;
  // Step launch loop with steerInput = 0
  for (var i = 0; i < 180; i++) {
    OO.loops.launch(0.05);
    var call = document.getElementById('launchCall').textContent;
    if (call.includes('ANOMALY') || call.includes('TUMBLE')) {
      failed = true;
      failReason = call;
      break;
    }
  }
  console.log('Test 1 Hands-off: Failed =', failed);
  console.log('Callout:', failReason);
  if (!failed) throw new Error('FAIL: Rocket did NOT fail when sitting idle!');
`, ctx);

console.log('\n=== TEST 2: Stage 4 Steering Nominally But Ignoring Staging Window ===');
vm.runInContext(`
  OO_FLOW.startLaunch();
  var lk = OO_FLOW._getLK();
  var stagedFailed = false;
  var failReason = null;
  // Step through launch keeping rocket precisely on the corridor
  for (var i = 0; i < 200; i++) {
    var tsEff = Math.max(0, lk.t - 3);
    var targetCorridorX = Math.sin(Math.max(0, tsEff) * 0.82) * 54 + 26;
    lk.steerX = targetCorridorX; // Perfect piloting on corridor
    OO.loops.launch(0.05);
    var call = document.getElementById('launchCall').textContent;
    if (call.includes('MISSED BOOSTER SEPARATION')) {
      stagedFailed = true;
      failReason = call;
      break;
    }
  }
  console.log('Test 2 Missed Staging: Failed =', stagedFailed);
  console.log('Callout:', failReason);
  if (!stagedFailed) throw new Error('FAIL: Missed staging did NOT trigger failure!');
`, ctx);

console.log('\n=== TEST 3: Stage 4 Successful Flight with Active Steering & Manual Staging ===');
vm.runInContext(`
  OO_FLOW.startLaunch();
  var lk = OO_FLOW._getLK();
  var stagedTriggered = false;
  // Step through full launch
  for (var i = 0; i < 260; i++) {
    var tsEff = Math.max(0, lk.t - 3);
    var targetCorridorX = Math.sin(Math.max(0, tsEff) * 0.82) * 54 + 26;
    lk.steerX = targetCorridorX; // Keep on corridor

    // When staging button becomes visible (tsEff >= 2.0), press Space/click
    if (lk.stageReady && !lk.staged) {
      console.log('   -> Staging triggered at tsEff =', tsEff.toFixed(2));
      keyListeners.forEach(k => {
        if (k.ev === 'keydown') k.fn({ key: ' ', code: 'Space', target: {}, preventDefault: () => {} });
      });
      stagedTriggered = true;
    }
    OO.loops.launch(0.05);
  }
  console.log('Test 3: Staged Triggered =', stagedTriggered);
  console.log('Test 3: Final Launch Finished =', lk.finished, 'dvFail =', lk.dvFail);
  console.log('Callout:', document.getElementById('launchCall').textContent);
  if (!stagedTriggered || !lk.finished || lk.dvFail) {
    throw new Error('FAIL: Flight did not succeed to orbit!');
  }
`, ctx);

console.log('\n=== TEST 4: Stage 5 Interactive Flight Deck Console Mini-Games ===');
vm.runInContext(`
  OO_FLOW.startOps();
  var op = OO_FLOW._getOP();
  op.paused = false;
  var sim = op.sim;
  console.log('Ops Initialized. Phase:', sim.phase, 'Score:', op.score);

  // 1. Test Station 1: RCS Thruster Burst during Eclipse
  sim.phase = 'eclipse';
  sim.phaseT = 1.0;
  var beforePhaseT = sim.phaseT;
  var beforeScore = op.score;
  var beforeBatt = sim.batt;
  // Trigger RCS
  var btnRcs = document.getElementById('btnConsoleRcsBurst');
  var deck = document.getElementById('flightDeckConsole');
  deck.trigger('click', {
    target: btnRcs,
    closest: (sel) => sel === '#btnConsoleRcsBurst' ? btnRcs : null,
    preventDefault: () => {}
  });
  console.log('Station 1 (RCS): PhaseT moved from', beforePhaseT.toFixed(2), 'to', sim.phaseT.toFixed(2), '(Boosted! Score gained:', op.score - beforeScore, ')');
  if (sim.phaseT <= beforePhaseT || op.score <= beforeScore) {
    throw new Error('FAIL: RCS thruster burst did not advance shadow or reward score!');
  }

  // 2. Test Station 2: Power Matrix Switches
  var swDeckTx = document.getElementById('swDeckTx');
  var beforeBoost = sim.boost;
  deck.trigger('click', {
    target: swDeckTx,
    closest: (sel) => sel === '#swDeckTx' ? swDeckTx : null,
    preventDefault: () => {}
  });
  console.log('Station 2 (Power): Transmit Boost toggled from', beforeBoost, 'to', sim.boost);
  if (sim.boost === beforeBoost) {
    throw new Error('FAIL: Station 2 switch failed to toggle TX boost!');
  }

  // 3. Test Station 3: Cosmic Ray Glitch (SEU) 4-Core Hex Purge
  sim.phase = 'seu';
  sim.phaseT = 1.0;
  sim.computerOK = false; // Computer frozen by radiation
  console.log('Station 3 (SEU): Starting 4-core Hex RAM purge...');
  // Tap each of the 4 hex chips
  for (var chipIdx = 0; chipIdx < 4; chipIdx++) {
    var chipEl = document.createElement('div');
    chipEl.id = 'chip' + chipIdx;
    chipEl.setAttribute('data-purge-bit', chipIdx);
    deck.trigger('click', {
      target: chipEl,
      closest: (sel) => sel === '[data-purge-bit]' ? chipEl : null,
      preventDefault: () => {}
    });
  }
  console.log('Station 3 (SEU): All 4 chips purged! CPU state (computerOK):', sim.computerOK, 'Purged bits:', op.purgedBits);
  if (!sim.computerOK || !op.purgedBits[0] || !op.purgedBits[1] || !op.purgedBits[2] || !op.purgedBits[3]) {
    throw new Error('FAIL: 4-Core RAM purge did not restore flight computer!');
  }

  // 4. Test Station 3: DSN Antenna Wave Slider Lock
  sim.phase = 'dsn';
  sim.phaseT = 1.0;
  sim.boost = false;
  var sliderEl = document.getElementById('deckAntennaSlider');
  sliderEl.value = '75';
  sliderEl.id = 'deckAntennaSlider';
  deck.trigger('input', { target: sliderEl });
  console.log('Station 3 (DSN): Antenna frequency locked at 75MHz -> Boost:', sim.boost);
  if (!sim.boost) {
    throw new Error('FAIL: DSN wave slider did not lock antenna signal!');
  }

  // 5. Test Sunrise Auto-Recovery
  sim.phase = 'nom1';
  // If some instruments were off, simulate step
  sim.inst[sim.b.instruments[0].id] = false;
  OO.loops.ops(0.1);
  console.log('Sunrise Auto-Wake: Instrument[0] active:', sim.inst[sim.b.instruments[0].id]);
  if (!sim.inst[sim.b.instruments[0].id]) {
    throw new Error('FAIL: Sunrise did not auto-wake sleeping instruments!');
  }
`, ctx);

console.log('\n=== TEST 5: Super Heavy (Hard Level) Booster Staging Drops to 1 Sustainer Flame ===');
vm.runInContext(`
  // Setup Hard Level (Europa / Jupiter destination with Super Heavy booster)
  window.OO.scn = 'europa';
  window.OO.order = ['cam', 'mag', 'rtg', 'dish', 'super'];
  window.OO.b = window.OO_ENGINE.compute('europa', window.OO.order);
  OO_FLOW.startLaunch();
  var lk = OO_FLOW._getLK();
  console.log('Hard Level Rocket Type:', lk.type);

  // Setup mock flame elements in fl
  var fl = document.getElementById('lkFlameG');
  var f0 = document.createElement('g'); f0.className = 'lkfl'; f0.setAttribute('data-i', '0'); f0.setAttribute('transform', 'translate(0, 10)');
  var f1 = document.createElement('g'); f1.className = 'lkfl'; f1.setAttribute('data-i', '1'); f1.setAttribute('transform', 'translate(-21, 8)');
  var f2 = document.createElement('g'); f2.className = 'lkfl'; f2.setAttribute('data-i', '2'); f2.setAttribute('transform', 'translate(21, 8)');
  fl.children = [f0, f1, f2];
  window.OO.qa = (sel, el) => el && el.id === 'lkFlameG' ? fl.children : [];

  // Step before staging (t = 4.0s, tsEff = 1.0)
  for (var i = 0; i < 80; i++) {
    lk.steerX = 26;
    OO.loops.launch(0.05);
  }
  console.log('Before Staging Flames: Center(0)=' + (f0.style.display || 'visible') + ', Left(1)=' + (f1.style.display || 'visible') + ', Right(2)=' + (f2.style.display || 'visible'));
  if (f0.style.display === 'none' || f1.style.display === 'none' || f2.style.display === 'none') {
    throw new Error('FAIL: All 3 flames should be visible prior to staging!');
  }

  // Trigger manual staging
  lk.staged = true;
  lk.sepAge0 = Math.max(0, lk.t - 3);

  // Step past staging
  for (var i = 0; i < 20; i++) {
    lk.steerX = 26;
    OO.loops.launch(0.05);
  }
  console.log('After Staging Flames: Center(0)=' + (f0.style.display || 'visible') + ', Left(1)=' + f1.style.display + ', Right(2)=' + f2.style.display);
  if (f0.style.display === 'none' || f1.style.display !== 'none' || f2.style.display !== 'none') {
    throw new Error('FAIL: Super Heavy rocket did not drop down to exactly 1 flame after staging!');
  }
  console.log('SUCCESS: Exactly 1 center sustainer flame active after booster separation on Super Heavy!');

  console.log('>>> ALL 5 TEST SUITES PASSED PERFECTLY! <<<');
`, ctx);
