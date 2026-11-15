// Automated Test Harness for Stage 4 Steering/Staging & Stage 5 Interactive Console
const fs = require('fs');
const vm = require('vm');
const discoveryImages = [
  'aurora.jpg', 'city-lights.jpg', 'amazon-river.jpg', 'richat-structure.jpg',
  'great-red-spot.jpg', 'io-plumes.jpg', 'europa-plume.jpg', 'europa-chaos.jpg'
];

discoveryImages.forEach((name) => {
  if (!fs.existsSync('public/images/discoveries/' + name)) {
    throw new Error('FAIL: Missing local discovery image ' + name);
  }
});

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
  window.toastCalls = [];
  window.OO = {
    $: (id) => document.getElementById(id),
    qa: (sel, el) => (el || document).querySelectorAll(sel),
    esc: (s) => String(s),
    fmt: (v) => String(Math.round(v)),
    setCls: (el, cls) => { if (el) el.className = cls; },
    scn: 'leo',
    order: ['cam', 'si', 'batt', 'dish', 'ride'],
    loops: {},
    toast: (msg, type) => { window.toastCalls.push({ msg, type }); console.log('   [TOAST]', msg); },
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
  var scoreBeforeStage = null;
  var toastCountBeforeStage = window.toastCalls.length;
  // Step through full launch
  for (var i = 0; i < 260; i++) {
    var tsEff = Math.max(0, lk.t - 3);
    var targetCorridorX = Math.sin(Math.max(0, tsEff) * 0.82) * 54 + 26;
    lk.steerX = targetCorridorX; // Keep on corridor

    // When staging button becomes visible (tsEff >= 2.0), press Space/click
    if (lk.stageReady && !lk.staged) {
      console.log('   -> Staging triggered at tsEff =', tsEff.toFixed(2));
      scoreBeforeStage = lk.score;
      keyListeners.forEach(k => {
        if (k.ev === 'keydown') k.fn({ key: ' ', code: 'Space', target: {}, preventDefault: () => {} });
      });
      if (lk.score !== scoreBeforeStage) {
        throw new Error('FAIL: Booster separation should not award bonus points!');
      }
      if (window.toastCalls.length !== toastCountBeforeStage) {
        throw new Error('FAIL: Booster separation should not show an overlay toast!');
      }
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

console.log('\n=== TEST 4: Stage 5 Timing, Repair-Code, and Radio-Tracking Games ===');
vm.runInContext(`
  OO_FLOW.startOps();
  var op = OO_FLOW._getOP();
  op.paused = false;
  var sim = op.sim;
  var panel = document.getElementById('opsPanel');
  sim.t = 2.2;
  OO.loops.ops(0.1);
  var activeImage = document.getElementById('targetImage');
  if (activeImage.getAttribute('src') !== 'images/discoveries/aurora.jpg' ||
      activeImage.alt !== 'Aurora above Canada photographed from the International Space Station.' ||
      document.getElementById('scienceTarget').style.display !== 'flex') {
    throw new Error('FAIL: Active discovery target did not show its reference image!');
  }

  function clickOpsButton(id, attrs) {
    var btn = document.createElement('button');
    btn.id = id;
    Object.keys(attrs).forEach(function (name) { btn.setAttribute(name, attrs[name]); });
    panel.trigger('click', {
      target: btn,
      closest: function (sel) {
        if (sel === '[data-repair-pad]') return btn.hasAttribute('data-repair-pad') ? btn : null;
        if (sel === 'button') return btn;
        return null;
      },
      preventDefault: function () {}
    });
  }

  // 1. The timing window powers down instruments and protects the battery.
  sim.phase = 'eclipse';
  sim.sunlit = false;
  sim.eclBrown = false;
  sim.phaseT = 0.5; // marker outside the green zone
  clickOpsButton('eclHitBtn', { 'data-act': 'eclipse-hit' });
  if (op.eclipseHit || op.miniGames.eclipse.misses !== 1) {
    throw new Error('FAIL: An early timing hit should miss and allow another try!');
  }
  sim.phaseT = 2.1; // marker at 50%, inside the green zone
  var beforeScore = op.score;
  clickOpsButton('eclHitBtn', { 'data-act': 'eclipse-hit' });
  console.log('Eclipse timing hit:', op.eclipseHit, 'next phase:', sim.phase, 'sunlight:', sim.sunlit);
  if (!op.eclipseHit || sim.phase !== 'nom1' || !sim.results.eclipse || !sim.results.eclipse.ok ||
      !sim.eclProtected || !sim.sunlit || op.score <= beforeScore) {
    throw new Error('FAIL: Green-zone timing hit did not save eclipse power!');
  }

  // 2. A wrong code entry resets progress; the displayed code restores the computer.
  sim.phase = 'seu';
  sim.phaseT = 1.0;
  sim.computerOK = false;
  sim.seu = { word: 0, bit: 0, t0: sim.t };
  op.repairCode = [0, 1, 2, 3, 0];
  if (op.repairCode.length !== 5) throw new Error('FAIL: Repair challenge should use a 5-number code!');
  var errorSfxCount = 0;
  OO_SFX.error = function () { errorSfxCount++; };
  clickOpsButton('wrongPad', { 'data-repair-pad': 3 });
  if (op.repairProgress !== 0 || op.repairMistakes !== 1 || errorSfxCount !== 0) {
    throw new Error('FAIL: Incorrect repair code did not reset the sequence!');
  }
  [0, 1, 2, 3, 0].forEach(function (pad) { clickOpsButton('repairPad' + pad, { 'data-repair-pad': pad }); });
  console.log('Computer restored:', sim.computerOK, 'sequence mistakes:', op.repairMistakes);
  if (!sim.computerOK || !sim.results.seu || !op.miniGames.computer.solved) {
    throw new Error('FAIL: Correct repair code did not restore the flight computer!');
  }

  // 3. Locking the fixed green band boosts the data link.
  sim.phase = 'dsn';
  sim.phaseT = 1.0;
  sim.boost = false;
  var radioAudio = { starts: 0, stops: 0, beeps: 0, combos: 0 };
  OO_SFX.alarmStart = () => { radioAudio.starts++; };
  OO_SFX.alarmStop = () => { radioAudio.stops++; };
  OO_SFX.beep = () => { radioAudio.beeps++; };
  OO_SFX.combo = () => { radioAudio.combos++; };
  OO.loops.ops(0.1);
  var radioGuide = document.getElementById('crisisBox').innerHTML;
  if (!radioGuide.includes('left:68%;width:18%') ||
      !radioGuide.includes('LOCK ZONE 68-86%') ||
      !radioGuide.includes('The alert beeps outside green') ||
      !radioGuide.includes('tuner-slider-track')) {
    throw new Error('FAIL: Radio slider instructions or visible lock zone do not match the tuning logic!');
  }
  op.tuneAwarded = false;
  op.tuneAlerting = true;
  op.tuneVal = 83.5;
  var alarmStartsBeforeLock = radioAudio.starts;
  var alarmStopsBeforeLock = radioAudio.stops;
  var toastCountBeforeRadio = window.toastCalls.length;
  var sliderEl = document.getElementById('antennaSlider');
  sliderEl.value = '83.5';
  panel.trigger('input', { target: sliderEl });
  console.log('Radio signal locked:', sim.boost, 'locks:', op.miniGames.radio.locks);
  if (!sim.boost || op.miniGames.radio.locks !== 1) {
    throw new Error('FAIL: Tracking the green band did not lock the antenna!');
  }
  if (window.toastCalls.length !== toastCountBeforeRadio) {
    throw new Error('FAIL: Radio lock should update in place without covering the slider!');
  }
  if (radioAudio.stops !== alarmStopsBeforeLock + 1 || radioAudio.beeps || radioAudio.combos) {
    throw new Error('FAIL: Locking the signal should silence the alert without playing a success beep.');
  }
  sliderEl.value = '50';
  panel.trigger('input', { target: sliderEl });
  if (sim.boost || radioAudio.starts !== alarmStartsBeforeLock + 1) {
    throw new Error('FAIL: Moving outside the green band should resume the alert.');
  }
  sliderEl.value = '75';
  panel.trigger('input', { target: sliderEl });
  sliderEl.value = '50';
  panel.trigger('input', { target: sliderEl });
  if (sim.boost || radioAudio.starts !== alarmStartsBeforeLock + 2 ||
      op.miniGames.radio.locks !== 1 || radioAudio.beeps || radioAudio.combos) {
    throw new Error('FAIL: The alert must resume every time the slider leaves green without replaying the lock reward.');
  }
  OO_SFX.alarmStart = () => {};
  OO_SFX.alarmStop = () => {};
  OO_SFX.beep = () => {};
  OO_SFX.combo = () => {};

  // 4. Sunrise automatically wakes the sensors.
  sim.phase = 'nom1';
  sim.phaseT = 0;
  sim.inst[sim.b.instruments[0].id] = false;
  OO.loops.ops(0.1);
  console.log('Sunrise auto-wake:', sim.inst[sim.b.instruments[0].id]);
  if (!sim.inst[sim.b.instruments[0].id]) {
    throw new Error('FAIL: Sunrise did not auto-wake sleeping instruments!');
  }

  // 5. A 75% science return cannot earn an S design grade.
  var gradeSim = OO_ENGINE.createOps('leo', OO.order);
  var breadth = Math.min(1, gradeSim.b.sci / (gradeSim.scn.benchmark * 0.75));
  var opReturn = (75 - 35 * breadth) / 65;
  gradeSim.elapsed = 100;
  gradeSim.sci = gradeSim.b.sci * gradeSim.elapsed * opReturn;
  var grade = OO_ENGINE.score(gradeSim);
  console.log('75% science grade:', grade.rank, 'science:', grade.yieldPct.toFixed(1), 'overall:', grade.overall.toFixed(1));
  if (Math.round(grade.yieldPct) !== 75 || grade.rank === 'S') {
    throw new Error('FAIL: 75% science return should not receive an S design grade!');
  }
  // 6. The report explains results and separates the design grade from pilot rank.
  sim.results.eclipse = { ok: true, minBatt: 0.5 };
  sim.results.dsn = { cleared: false, fill: 0.6 };
  OO_FLOW.startDebrief(sim, op);
  var report = document.getElementById('debrief').innerHTML;
  console.log('Debrief has clear lessons:', report.includes('HAZARD DEBRIEF') && report.includes('Radiation can flip a memory bit.'));
  if (!report.includes('HAZARD DEBRIEF') || !report.includes('Radiation can flip a memory bit.') || !report.includes('Move the knob into the green band') ||
      !report.includes('class="score-grid"') || !report.includes('class="db-card discoveries"') ||
      report.includes('Grade = science 40%') || report.includes('Design. Test. Learn. Improve.') || report.includes('NASA Space Apps 2026')) {
    throw new Error('FAIL: Debrief is missing simple hazard results or next steps!');
  }

  // Captured discoveries should include their local reference image and linked NASA credit.
  op.photos = [op.anomalies[0]];
  OO_FLOW.startDebrief(sim, op);
  report = document.getElementById('debrief').innerHTML;
  if (!report.includes('images/discoveries/aurora.jpg') ||
      !report.includes('alt="Aurora above Canada photographed from the International Space Station."') ||
      !report.includes('https://images.nasa.gov/details/iss053e023915') ||
      !report.includes('NASA reference image &bull; NASA/JSC')) {
    throw new Error('FAIL: Discovery card is missing its image, alt text, or NASA credit link!');
  }
  console.log('Discovery cards include local images and NASA credits.');
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
