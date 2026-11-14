/* Orbital Odyssey — Web Audio synth. No external audio files. */
(function (root) {
  'use strict';
  var ctx = null, master = null, noiseBuf = null, muted = false, volume = 0.7, rumble = null, alarmTimer = null;
  try {
    muted = localStorage.getItem('oo_muted') === '1';
    var savedVol = localStorage.getItem('oo_volume');
    if (savedVol !== null) volume = Math.max(0, Math.min(1, parseFloat(savedVol)));
  } catch (e) { /* ignore */ }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : (volume * 0.7);
      master.connect(ctx.destination);
      var len = ctx.sampleRate * 2;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0), last = 0;
      for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    } catch (e) { ctx = null; }
  }

  function tone(freq, dur, type, vol, when, slideTo) {
    if (!ctx || muted || volume <= 0) return;
    var t = ctx.currentTime + (when || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function noise(dur, vol, freq, when, q) {
    if (!ctx || muted || volume <= 0) return;
    var t = ctx.currentTime + (when || 0);
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1500; f.Q.value = q || 0.8;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.03);
  }

  var Sfx = {
    init: init,
    isMuted: function () { return muted || volume <= 0; },
    getVolume: function () { return volume; },
    setVolume: function (v) {
      init();
      volume = Math.max(0, Math.min(1, v));
      muted = volume <= 0.001;
      try {
        localStorage.setItem('oo_volume', volume.toFixed(2));
        localStorage.setItem('oo_muted', muted ? '1' : '0');
      } catch (e) { /* ignore */ }
      if (master) master.gain.value = muted ? 0 : (volume * 0.7);
      if (muted) { Sfx.alarmStop(); Sfx.rumbleStop(); }
    },
    setMuted: function (m) {
      init();
      muted = !!m;
      try { localStorage.setItem('oo_muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
      if (master) master.gain.value = muted ? 0 : (volume * 0.7);
      if (muted) { Sfx.alarmStop(); Sfx.rumbleStop(); }
    },
    toggle: function () {
      init();
      if (muted || volume <= 0) {
        if (volume <= 0.05) volume = 0.7;
        Sfx.setMuted(false);
      } else {
        Sfx.setMuted(true);
      }
      return Sfx.isMuted();
    },
    click: function () { tone(1250, 0.05, 'square', 0.06); tone(820, 0.05, 'square', 0.05, 0.035); },
    hover: function () { tone(2100, 0.025, 'sine', 0.025); },
    equip: function () { tone(520, 0.09, 'triangle', 0.16); tone(780, 0.1, 'triangle', 0.16, 0.07); noise(0.06, 0.12, 3500, 0.12, 3); tone(1560, 0.12, 'sine', 0.08, 0.14); },
    unequip: function () { tone(620, 0.1, 'triangle', 0.14, 0, 330); },
    beep: function (f) { tone(f || 880, 0.07, 'sine', 0.1); },
    telemetry: function () { tone(1400 + Math.random() * 300, 0.035, 'sine', 0.04); },
    tick: function () { tone(1000, 0.04, 'square', 0.07); },
    tickGo: function () { tone(1500, 0.3, 'square', 0.08); },
    warn: function () { tone(740, 0.12, 'sawtooth', 0.12); tone(560, 0.16, 'sawtooth', 0.12, 0.13); },
    error: function () { tone(180, 0.22, 'sawtooth', 0.14, 0, 110); },
    good: function () { tone(660, 0.12, 'triangle', 0.14); tone(880, 0.12, 'triangle', 0.14, 0.1); tone(1320, 0.22, 'triangle', 0.14, 0.2); },
    fail: function () { tone(330, 0.3, 'sawtooth', 0.15, 0, 90); tone(220, 0.5, 'sawtooth', 0.12, 0.25, 60); },
    reboot: function () { tone(300, 0.9, 'sine', 0.1, 0, 1200); },
    rcs: function () {
      noise(0.14, 0.25, 1800, 0, 1.2);
      tone(240, 0.1, 'sine', 0.12, 0, 90);
    },
    photo: function () {
      noise(0.08, 0.35, 3200, 0, 1.8);
      tone(1800, 0.12, 'sine', 0.18, 0.05);
      tone(2400, 0.18, 'triangle', 0.14, 0.12);
    },
    zap: function () {
      noise(0.06, 0.28, 4800, 0, 4);
      tone(1600, 0.08, 'sawtooth', 0.15, 0, 800);
      tone(1200, 0.09, 'sine', 0.12, 0.04);
    },
    combo: function (lvl) {
      var f = 520 + Math.min(8, (lvl || 1)) * 160;
      tone(f, 0.08, 'triangle', 0.15);
      tone(f * 1.25, 0.12, 'triangle', 0.15, 0.06);
    },
    stamp: function () { noise(0.25, 0.4, 180, 0, 0.7); tone(90, 0.25, 'sine', 0.3, 0, 40); },
    alarmStart: function () {
      Sfx.alarmStop();
      if (!ctx || muted) return;
      var n = 0;
      function pulse() { if (!ctx || muted) return; var hi = (n++ % 2) === 0; tone(hi ? 880 : 620, 0.18, 'square', 0.07); }
      pulse(); alarmTimer = setInterval(pulse, 380);
    },
    alarmStop: function () { if (alarmTimer) { clearInterval(alarmTimer); alarmTimer = null; } },
    ignition: function () { noise(1.4, 0.35, 260, 0, 0.5); tone(55, 1.2, 'sawtooth', 0.12, 0, 38); },
    rumbleStart: function () {
      init();
      if (!ctx || muted || rumble) return;
      var src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
      var g = ctx.createGain(); g.gain.value = 0.0001;
      var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 42;
      var og = ctx.createGain(); og.gain.value = 0.18;
      var olp = ctx.createBiquadFilter(); olp.type = 'lowpass'; olp.frequency.value = 160;
      src.connect(lp); lp.connect(g); o.connect(olp); olp.connect(og); og.connect(g); g.connect(master);
      src.start(); o.start();
      rumble = { src: src, o: o, g: g, lp: lp };
      g.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 1.2);
    },
    rumbleLevel: function (v, bright) {
      if (!rumble || !ctx) return;
      var t = ctx.currentTime;
      rumble.g.gain.linearRampToValueAtTime(Math.max(0.0001, v), t + 0.1);
      rumble.lp.frequency.linearRampToValueAtTime(160 + (bright || 0) * 900, t + 0.1);
      rumble.o.frequency.linearRampToValueAtTime(38 + (bright || 0) * 40, t + 0.1);
    },
    rumbleStop: function () {
      if (!rumble || !ctx) { rumble = null; return; }
      var r = rumble; rumble = null;
      try {
        r.g.gain.cancelScheduledValues(ctx.currentTime);
        r.g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
        r.src.stop(ctx.currentTime + 0.9); r.o.stop(ctx.currentTime + 0.9);
      } catch (e) { /* ignore */ }
    }
  };
  root.OO_SFX = Sfx;
})(window);
