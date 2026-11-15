/* Orbital Odyssey — Hybrid Web Audio & Real SFX / Music Engine. */
(function (root) {
  'use strict';

  var ctx = null;
  var masterGain = null;
  var sfxGain = null;
  var noiseBuf = null;

  var muted = false;
  var masterVol = 0.7;
  var musicVol = 0.6;
  var sfxVol = 0.8;

  var rumbleState = null;
  var rumbleScale = 0.8;
  var alarmTimer = null;
  var userHasInteracted = false;
  var recordedSfx = {};
  var failedSfx = {};
  var warnedSfx = {};

  var SFX_FILES = {
    click: 'sfx/click.mp3',
    error: 'sfx/error.mp3',
    rumble: 'sfx/rumble.mp3'
  };

  // Stored volumes & mute state
  try {
    muted = localStorage.getItem('oo_muted') === '1';
    var sm = localStorage.getItem('oo_vol_master') || localStorage.getItem('oo_volume');
    if (sm !== null) masterVol = Math.max(0, Math.min(1, parseFloat(sm)));
    var smu = localStorage.getItem('oo_vol_music');
    if (smu !== null) musicVol = Math.max(0, Math.min(1, parseFloat(smu)));
    var ssfx = localStorage.getItem('oo_vol_sfx');
    if (ssfx !== null) sfxVol = Math.max(0, Math.min(1, parseFloat(ssfx)));
  } catch (e) { /* ignore localStorage errors */ }

  /* -----------------------------------------------------------------------
   *  DEFAULT BACKGROUND MUSIC
   * ----------------------------------------------------------------------- */
  var PLAYLIST = [
    {
      id: 'beyond',
      title: 'Into the Beyond',
      sources: ['sfx/music_beyond.m4a', 'sfx/music_beyond.mov', 'sfx/into_the_beyond.mov', 'sfx/IntotheBeyond [LzvTz-GZNMI].mov']
    }
  ];

  var curTrackIdx = 0;
  var bgAudio = null;
  var musicPlaying = false;
  var musicListeners = [];

  function initMusicPlayer() {
    if (bgAudio || typeof root.Audio !== 'function') return;
    try {
      bgAudio = new root.Audio();
      bgAudio.preload = 'auto';
      bgAudio.loop = true;
      updateMusicVolume();

      bgAudio.addEventListener('error', function () {
        // If current source failed, try next source in sources list or advance track
        var trk = PLAYLIST[curTrackIdx];
        if (trk && trk._srcIdx !== undefined && trk._srcIdx + 1 < trk.sources.length) {
          trk._srcIdx++;
          bgAudio.src = trk.sources[trk._srcIdx];
          if (musicPlaying) bgAudio.play().catch(function () {});
        } else {
          musicPlaying = false;
          notifyMusicChange();
        }
      });
    } catch (e) {
      bgAudio = null;
    }
  }

  function updateMusicVolume() {
    if (!bgAudio) return;
    try {
      if (muted || masterVol <= 0.001 || musicVol <= 0.001) {
        bgAudio.volume = 0;
      } else {
        var eff = masterVol * musicVol * 0.36;
        bgAudio.volume = Math.max(0, Math.min(1, eff));
      }
    } catch (e) { /* ignore */ }
  }

  function updateRecordedSfxVolume() {
    Object.keys(recordedSfx).forEach(function (name) {
      var scale = name === 'rumble' ? rumbleScale : 1;
      recordedSfx[name].volume = muted ? 0 : Math.max(0, Math.min(1, masterVol * sfxVol * scale));
    });
  }

  function reportSfxFailure(name, error) {
    if (warnedSfx[name]) return;
    warnedSfx[name] = true;
    if (root.console && root.console.warn) {
      root.console.warn('Unable to play ' + SFX_FILES[name] + '; using the synthesized fallback.', error || '');
    }
  }

  function initRecordedSfx() {
    if (typeof root.Audio !== 'function') return;
    Object.keys(SFX_FILES).forEach(function (name) {
      if (recordedSfx[name]) return;
      var audio = new root.Audio();
      audio.src = SFX_FILES[name];
      audio.preload = 'none';
      audio.loop = name === 'rumble';
      audio.addEventListener('error', function () {
        failedSfx[name] = true;
        reportSfxFailure(name, audio.error);
      });
      recordedSfx[name] = audio;
    });
    updateRecordedSfxVolume();
  }

  function playRecordedSfx(name, onFailure) {
    var audio = recordedSfx[name];
    if (!audio || failedSfx[name] || muted || masterVol <= 0 || sfxVol <= 0) return false;
    try {
      updateRecordedSfxVolume();
      if (name !== 'rumble' && audio.paused === false) {
        audio.pause();
        audio.currentTime = 0;
      } else if (name !== 'rumble' && audio.readyState > 0) {
        audio.currentTime = 0;
      }
      var result = audio.play();
      if (result && typeof result.catch === 'function') {
        result.catch(function (error) {
          reportSfxFailure(name, error);
          if (onFailure) onFailure();
        });
      }
      return true;
    } catch (error) {
      reportSfxFailure(name, error);
      return false;
    }
  }

  function startProceduralRumble() {
    if (!ctx || muted || masterVol <= 0 || sfxVol <= 0) return null;
    var synthSrc = null, o = null, g = null, lp = null;
    if (noiseBuf) {
      try {
        synthSrc = ctx.createBufferSource();
        synthSrc.buffer = noiseBuf;
        synthSrc.loop = true;
        lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 220;
        g = ctx.createGain();
        g.gain.value = 0.0001;

        o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = 42;
        var og = ctx.createGain();
        og.gain.value = 0.18;
        var olp = ctx.createBiquadFilter();
        olp.type = 'lowpass';
        olp.frequency.value = 160;

        synthSrc.connect(lp);
        lp.connect(g);
        o.connect(olp);
        olp.connect(og);
        og.connect(g);
        g.connect(sfxGain);

        synthSrc.start();
        o.start();
        g.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 1.2);
      } catch (error) {
        if (root.console && root.console.warn) root.console.warn('Unable to start the synthesized rumble fallback.', error);
        synthSrc = null;
      }
    }
    return { synthSrc: synthSrc, o: o, g: g, lp: lp };
  }

  function playMusic(idx) {
    initMusicPlayer();
    if (!bgAudio) return;
    if (typeof idx === 'number') {
      curTrackIdx = ((idx % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
    }
    var trk = PLAYLIST[curTrackIdx];
    trk._srcIdx = trk._srcIdx || 0;
    var src = trk.sources[trk._srcIdx] || trk.sources[0];

    updateMusicVolume();
    if (bgAudio.src.indexOf(src) === -1) {
      bgAudio.src = src;
    }

    if (!muted && masterVol > 0.01 && musicVol > 0.01) {
      var p = bgAudio.play();
      if (p && typeof p.then === 'function') {
        p.then(function () {
          musicPlaying = true;
          notifyMusicChange();
        }).catch(function () {
          // Autoplay may be restricted until user gesture
          musicPlaying = false;
          notifyMusicChange();
        });
      } else {
        musicPlaying = true;
        notifyMusicChange();
      }
    } else {
      musicPlaying = false;
      notifyMusicChange();
    }
  }

  function nextMusic() { playMusic(0); }
  function prevMusic() { playMusic(0); }

  function pauseMusic() {
    if (bgAudio) {
      bgAudio.pause();
      musicPlaying = false;
      notifyMusicChange();
    }
  }

  function resumeMusic() {
    if (bgAudio && !muted && masterVol > 0.01 && musicVol > 0.01) {
      bgAudio.play().then(function () {
        musicPlaying = true;
        notifyMusicChange();
      }).catch(function () {});
    }
  }

  function notifyMusicChange() {
    var info = getMusicTrack();
    for (var i = 0; i < musicListeners.length; i++) {
      try { musicListeners[i](info); } catch (e) {}
    }
  }

  function getMusicTrack() {
    var trk = PLAYLIST[curTrackIdx] || PLAYLIST[0];
    return {
      index: curTrackIdx,
      id: trk.id,
      title: trk.title,
      total: PLAYLIST.length,
      isPlaying: musicPlaying && !muted && masterVol > 0.01 && musicVol > 0.01
    };
  }

  /* -----------------------------------------------------------------------
   *  WEB AUDIO CONTEXT INITIALIZATION & GAIN NODES
   * ----------------------------------------------------------------------- */
  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      initMusicPlayer();
      initRecordedSfx();
      if (!userHasInteracted) {
        userHasInteracted = true;
        if (!musicPlaying && !muted && masterVol > 0.01 && musicVol > 0.01) {
          playMusic(curTrackIdx);
        }
      }
      return;
    }

    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) {
      initMusicPlayer();
      initRecordedSfx();
      return;
    }
    try {
      ctx = new AC();

      // Master Gain Node -> Destination
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : (masterVol * 0.85);
      masterGain.connect(ctx.destination);

      // SFX Gain Node -> Master Gain Node
      sfxGain = ctx.createGain();
      sfxGain.gain.value = sfxVol;
      sfxGain.connect(masterGain);

      // Procedural noise buffer for synth effects & engine roar
      var len = ctx.sampleRate * 2;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0), last = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }

      // Setup music player
      initMusicPlayer();
      initRecordedSfx();

      if (!userHasInteracted) {
        userHasInteracted = true;
        if (!musicPlaying && !muted && masterVol > 0.01 && musicVol > 0.01) {
          playMusic(curTrackIdx);
        }
      }
    } catch (e) {
      ctx = null;
    }
  }

  /* -----------------------------------------------------------------------
   *  SYNTH SOUND GENERATORS (FALLBACK & PROCEDURAL SFX)
   * ----------------------------------------------------------------------- */
  function tone(freq, dur, type, vol, when, slideTo) {
    if (!ctx || muted || masterVol <= 0 || sfxVol <= 0) return;
    try {
      var t = ctx.currentTime + (when || 0);
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(sfxGain);
      o.start(t);
      o.stop(t + dur + 0.03);
    } catch (e) { /* ignore */ }
  }

  function noise(dur, vol, freq, when, q) {
    if (!ctx || muted || masterVol <= 0 || sfxVol <= 0 || !noiseBuf) return;
    try {
      var t = ctx.currentTime + (when || 0);
      var s = ctx.createBufferSource();
      s.buffer = noiseBuf;
      var f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq || 1500;
      f.Q.value = q || 0.8;
      var g = ctx.createGain();
      g.gain.setValueAtTime(vol || 0.2, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f);
      f.connect(g);
      g.connect(sfxGain);
      s.start(t);
      s.stop(t + dur + 0.03);
    } catch (e) { /* ignore */ }
  }

  /* -----------------------------------------------------------------------
   *  PUBLIC API: OO_SFX
   * ----------------------------------------------------------------------- */
  var Sfx = {
    init: init,

    // Mute state
    isMuted: function () {
      return muted || masterVol <= 0.001;
    },

    setMuted: function (m) {
      init();
      muted = !!m;
      try {
        localStorage.setItem('oo_muted', muted ? '1' : '0');
      } catch (e) { /* ignore */ }

      if (masterGain) masterGain.gain.value = muted ? 0 : (masterVol * 0.85);
      updateMusicVolume();
      updateRecordedSfxVolume();

      if (muted) {
        Sfx.alarmStop();
        Sfx.rumbleStop();
        if (bgAudio) bgAudio.pause();
      } else {
        if (!musicPlaying && masterVol > 0.01 && musicVol > 0.01) {
          playMusic(curTrackIdx);
        }
      }
    },

    toggle: function () {
      init();
      if (muted || masterVol <= 0.001) {
        if (masterVol <= 0.05) masterVol = 0.7;
        Sfx.setMuted(false);
      } else {
        Sfx.setMuted(true);
      }
      return Sfx.isMuted();
    },

    // Master Volume
    getMasterVolume: function () {
      return masterVol;
    },

    setMasterVolume: function (v) {
      init();
      masterVol = Math.max(0, Math.min(1, v));
      muted = masterVol <= 0.001;
      try {
        localStorage.setItem('oo_vol_master', masterVol.toFixed(2));
        localStorage.setItem('oo_volume', masterVol.toFixed(2));
        localStorage.setItem('oo_muted', muted ? '1' : '0');
      } catch (e) { /* ignore */ }

      if (masterGain) masterGain.gain.value = muted ? 0 : (masterVol * 0.85);
      updateMusicVolume();
      updateRecordedSfxVolume();

      if (muted) {
        Sfx.alarmStop();
        Sfx.rumbleStop();
      } else if (!musicPlaying && masterVol > 0.01 && musicVol > 0.01) {
        playMusic(curTrackIdx);
      }
    },

    // Legacy volume aliases
    getVolume: function () {
      return Sfx.getMasterVolume();
    },

    setVolume: function (v) {
      Sfx.setMasterVolume(v);
    },

    // Background Music Volume
    getMusicVolume: function () {
      return musicVol;
    },

    setMusicVolume: function (v) {
      init();
      musicVol = Math.max(0, Math.min(1, v));
      try {
        localStorage.setItem('oo_vol_music', musicVol.toFixed(2));
      } catch (e) { /* ignore */ }

      updateMusicVolume();
      if (musicVol > 0.01 && !musicPlaying && !muted && masterVol > 0.01) {
        playMusic(curTrackIdx);
      }
    },

    // Sound FX Volume
    getSfxVolume: function () {
      return sfxVol;
    },

    setSfxVolume: function (v) {
      init();
      sfxVol = Math.max(0, Math.min(1, v));
      try {
        localStorage.setItem('oo_vol_sfx', sfxVol.toFixed(2));
      } catch (e) { /* ignore */ }

      if (sfxGain) sfxGain.gain.value = sfxVol;
      updateRecordedSfxVolume();
    },

    // Music track controls
    getMusicTrack: getMusicTrack,
    playMusic: playMusic,
    nextMusic: nextMusic,
    prevMusic: prevMusic,
    pauseMusic: pauseMusic,
    resumeMusic: resumeMusic,
    onMusicChange: function (fn) {
      if (typeof fn === 'function') musicListeners.push(fn);
    },
    startMusicIfNeeded: function () {
      init();
      if (!musicPlaying && !muted && masterVol > 0.01 && musicVol > 0.01) {
        playMusic(curTrackIdx);
      }
    },

    /* -----------------------------------------------------------------------
     *  GAME SOUND EFFECTS (SFX)
     * ----------------------------------------------------------------------- */
    click: function () {
      init();
      if (muted || masterVol <= 0 || sfxVol <= 0) return;
      if (!playRecordedSfx('click', function () {
        tone(1250, 0.05, 'square', 0.06);
        tone(820, 0.05, 'square', 0.05, 0.035);
      })) {
        tone(1250, 0.05, 'square', 0.06);
        tone(820, 0.05, 'square', 0.05, 0.035);
      }
    },

    error: function () {
      init();
      if (muted || masterVol <= 0 || sfxVol <= 0) return;
      if (!playRecordedSfx('error', function () {
        tone(180, 0.22, 'sawtooth', 0.14, 0, 110);
      })) tone(180, 0.22, 'sawtooth', 0.14, 0, 110);
    },

    hover: function () {
      tone(2100, 0.025, 'sine', 0.025);
    },

    equip: function () {
      tone(520, 0.09, 'triangle', 0.16);
      tone(780, 0.1, 'triangle', 0.16, 0.07);
      noise(0.06, 0.12, 3500, 0.12, 3);
      tone(1560, 0.12, 'sine', 0.08, 0.14);
    },

    unequip: function () {
      tone(620, 0.1, 'triangle', 0.14, 0, 330);
    },

    beep: function (f) {
      tone(f || 880, 0.07, 'sine', 0.1);
    },

    telemetry: function () {
      tone(1400 + Math.random() * 300, 0.035, 'sine', 0.04);
    },

    tick: function () {
      tone(1000, 0.04, 'square', 0.07);
    },

    tickGo: function () {
      tone(1500, 0.3, 'square', 0.08);
    },

    warn: function () {
      tone(740, 0.12, 'sawtooth', 0.12);
      tone(560, 0.16, 'sawtooth', 0.12, 0.13);
    },

    good: function () {
      tone(660, 0.12, 'triangle', 0.14);
      tone(880, 0.12, 'triangle', 0.14, 0.1);
      tone(1320, 0.22, 'triangle', 0.14, 0.2);
    },

    fail: function () {
      tone(330, 0.3, 'sawtooth', 0.15, 0, 90);
      tone(220, 0.5, 'sawtooth', 0.12, 0.25, 60);
    },

    reboot: function () {
      tone(300, 0.9, 'sine', 0.1, 0, 1200);
    },

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

    stamp: function () {
      noise(0.25, 0.4, 180, 0, 0.7);
      tone(90, 0.25, 'sine', 0.3, 0, 40);
    },

    ignition: function () {
      noise(1.4, 0.35, 260, 0, 0.5);
      tone(55, 1.2, 'sawtooth', 0.12, 0, 38);
    },

    alarmStart: function () {
      Sfx.alarmStop();
      if (!ctx || muted || masterVol <= 0 || sfxVol <= 0) return;
      var n = 0;
      function pulse() {
        if (!ctx || muted || masterVol <= 0 || sfxVol <= 0) return;
        var hi = (n++ % 2) === 0;
        tone(hi ? 880 : 620, 0.18, 'square', 0.07);
      }
      pulse();
      var setI = root.setInterval || setInterval;
      alarmTimer = setI(pulse, 380);
    },

    alarmStop: function () {
      if (alarmTimer) {
        var clearI = root.clearInterval || clearInterval;
        clearI(alarmTimer);
        alarmTimer = null;
      }
    },

    /* -----------------------------------------------------------------------
     *  RECORDED ROCKET RUMBLE WITH SYNTHESIZED FALLBACK
     * ----------------------------------------------------------------------- */
    rumbleStart: function () {
      init();
      if (muted || masterVol <= 0 || sfxVol <= 0 || rumbleState) return;
      rumbleScale = 0.55;
      var audio = recordedSfx.rumble;
      if (audio && !failedSfx.rumble) {
        var state = { audio: audio };
        rumbleState = state;
        if (playRecordedSfx('rumble', function () {
          if (rumbleState === state) {
            audio.pause();
            rumbleState = startProceduralRumble();
          }
        })) return;
        rumbleState = null;
      }
      rumbleState = startProceduralRumble();
    },

    rumbleLevel: function (v, bright) {
      if (!rumbleState) return;
      if (rumbleState.audio) {
        rumbleScale = Math.max(0, Math.min(1, v));
        updateRecordedSfxVolume();
        return;
      }
      if (!ctx) return;
      var t = ctx.currentTime;
      var target = Math.max(0.0001, v);

      if (rumbleState.g) {
        rumbleState.g.gain.linearRampToValueAtTime(target, t + 0.1);
        rumbleState.lp.frequency.linearRampToValueAtTime(160 + (bright || 0) * 900, t + 0.1);
        rumbleState.o.frequency.linearRampToValueAtTime(38 + (bright || 0) * 40, t + 0.1);
      }
    },

    rumbleStop: function () {
      if (!rumbleState) {
        return;
      }
      if (rumbleState.audio) {
        rumbleState.audio.pause();
        rumbleState.audio.currentTime = 0;
        rumbleState = null;
        rumbleScale = 0.8;
        return;
      }
      if (!ctx) { rumbleState = null; return; }
      var r = rumbleState;
      rumbleState = null;
      try {
        var t = ctx.currentTime;
        if (r.g) {
          r.g.gain.cancelScheduledValues(t);
          r.g.gain.linearRampToValueAtTime(0.0001, t + 0.8);
          if (r.synthSrc) r.synthSrc.stop(t + 0.9);
          if (r.o) r.o.stop(t + 0.9);
        }
      } catch (e) { /* ignore */ }
    }
  };

  root.OO_SFX = Sfx;
})(typeof window !== 'undefined' ? window : this);
