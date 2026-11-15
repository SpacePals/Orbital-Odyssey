// Test audio module, volume sliders, and playlist features
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('=== VERIFYING AUDIO, SFX, AND SETTINGS SLIDERS ===');

['click.mp3', 'error.mp3', 'rumble.mp3'].forEach((name) => {
  assert(fs.existsSync('public/sfx/' + name), 'Missing public SFX file: ' + name);
});

// Check index.html elements
const html = fs.readFileSync('public/index.html', 'utf8');
const uiCode = fs.readFileSync('public/js/ui.js', 'utf8');
assert(html.includes('id="volMasterSlider"'), 'Missing #volMasterSlider in index.html');
assert(html.includes('id="volMasterVal"'), 'Missing #volMasterVal in index.html');
assert(html.includes('id="volMusicSlider"'), 'Missing #volMusicSlider in index.html');
assert(html.includes('id="volMusicVal"'), 'Missing #volMusicVal in index.html');
assert(html.includes('id="musicTrackTitle"'), 'Missing #musicTrackTitle in index.html');
assert(!html.includes('id="btnMusicSkip"'), 'Music skip control should be absent when only one track is available');
assert(html.includes('id="volSfxSlider"'), 'Missing #volSfxSlider in index.html');
assert(html.includes('id="volSfxVal"'), 'Missing #volSfxVal in index.html');
assert(html.includes('id="btnSfxTest"'), 'Missing #btnSfxTest in index.html');
const alertRenderer = uiCode.slice(uiCode.indexOf('function renderRight()'), uiCode.indexOf('OO.refresh = function ()'));
assert(!alertRenderer.includes('S.warn(') && !alertRenderer.includes('S.error('),
  'Engineering alerts should not play warning or error sound effects');
const launchHandler = uiCode.slice(uiCode.indexOf("$('btnLaunch').addEventListener"), uiCode.indexOf('function syncMute'));
assert(!launchHandler.includes('S.error('), 'Invalid launch setup should remain silent while showing visual guidance');
console.log('✔ All 9 audio settings UI elements present in index.html');

// Create mock browser environment for audio.js
const mockStorage = {};
const createdAudios = [];
let fetchCalls = 0;
const mockWindow = {
  setInterval: setInterval,
  clearInterval: clearInterval,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  localStorage: {
    getItem: (k) => mockStorage[k] || null,
    setItem: (k, v) => { mockStorage[k] = String(v); },
    removeItem: (k) => { delete mockStorage[k]; }
  },
  Audio: function (src) {
    createdAudios.push(this);
    this.src = src || '';
    this.volume = 1;
    this.preload = '';
    this.loop = false;
    this.playCalls = 0;
    this.pauseCalls = 0;
    this._listeners = {};
    this.addEventListener = (evt, fn) => {
      this._listeners[evt] = this._listeners[evt] || [];
      this._listeners[evt].push(fn);
    };
    this.play = () => { this.playCalls++; return Promise.resolve(); };
    this.pause = () => { this.pauseCalls++; };
  },
  AudioContext: function () {
    this.state = 'running';
    this.sampleRate = 44100;
    this.currentTime = 0;
    this.destination = {};
    this.createGain = () => ({
      gain: {
        value: 1,
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        cancelScheduledValues: () => {}
      },
      connect: () => {}
    });
    this.createBuffer = () => ({
      getChannelData: () => new Float32Array(100)
    });
    this.createBufferSource = () => ({
      buffer: null,
      loop: false,
      connect: () => {},
      start: () => {},
      stop: () => {}
    });
    this.createOscillator = () => ({
      type: 'sine',
      frequency: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        linearRampToValueAtTime: () => {}
      },
      connect: () => {},
      start: () => {},
      stop: () => {}
    });
    this.createBiquadFilter = () => ({
      type: 'lowpass',
      frequency: {
        value: 1000,
        linearRampToValueAtTime: () => {}
      },
      Q: { value: 1 },
      connect: () => {}
    });
    this.decodeAudioData = (buf) => Promise.resolve({});
  },
  fetch: () => { fetchCalls++; return Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(10))
  }); }
};

const audioCode = fs.readFileSync('public/js/audio.js', 'utf8');
const ctx = vm.createContext(mockWindow);
vm.runInContext(audioCode, ctx);

const S = mockWindow.OO_SFX;
assert(S, 'OO_SFX must be exposed on window');

// Test volume controls
console.log('Testing volume controls...');
S.init();
assert.strictEqual(createdAudios[0].loop, true, 'Background music should loop instead of auto-advancing');
assert.strictEqual(createdAudios[0]._listeners.ended, undefined, 'Track end should not automatically switch the default BGM');
assert.strictEqual(createdAudios[0].src, 'sfx/music_beyond.m4a', 'Into the Beyond should remain the selected background track');
assert.strictEqual(fetchCalls, 0, 'Recorded SFX should load through local audio elements, not fetch');
const clickAudio = createdAudios.find((audio) => audio.src === 'sfx/click.mp3');
const errorAudio = createdAudios.find((audio) => audio.src === 'sfx/error.mp3');
const rumbleAudio = createdAudios.find((audio) => audio.src === 'sfx/rumble.mp3');
assert(clickAudio && errorAudio && rumbleAudio, 'Expected recorded SFX files to be initialized from public/sfx');
assert.strictEqual(rumbleAudio.loop, true, 'Recorded rumble should loop while active');

// Master Volume
S.setMasterVolume(0.85);
assert.strictEqual(Math.round(S.getMasterVolume() * 100), 85, 'Master volume should be 0.85');
assert.strictEqual(Math.round(S.getVolume() * 100), 85, 'getVolume legacy alias should be 0.85');

// Music Volume
S.setMusicVolume(0.45);
assert.strictEqual(Math.round(S.getMusicVolume() * 100), 45, 'Music volume should be 0.45');
// Verify master volume unaffected
assert.strictEqual(Math.round(S.getMasterVolume() * 100), 85, 'Master volume should remain 0.85');

// SFX Volume
S.setSfxVolume(0.92);
assert.strictEqual(Math.round(S.getSfxVolume() * 100), 92, 'SFX volume should be 0.92');
assert.strictEqual(Math.round(S.getMusicVolume() * 100), 45, 'Music volume should remain 0.45');
S.setMasterVolume(1);
S.setMusicVolume(1);
assert(createdAudios[0].volume < 0.5, 'Background music should stay subdued at full slider settings');
console.log('✔ Independent Master, Music, and SFX volume controls verified');

// Test Music Playlist
console.log('Testing music playlist...');
let track = S.getMusicTrack();
assert.strictEqual(track.index, 0);
assert.strictEqual(track.title, 'Into the Beyond');
assert.strictEqual(track.total, 2);
assert.strictEqual(typeof S.setStageMusic, 'function');
S.setStageMusic(true);
console.log('✔ Stage music playlist and transition trigger verified');

// Test Mute
console.log('Testing mute / unmute...');
assert.strictEqual(S.isMuted(), false);
S.setMuted(true);
assert.strictEqual(S.isMuted(), true);
S.toggle();
assert.strictEqual(S.isMuted(), false);
console.log('✔ Mute toggling verified');

// Test SFX calls don\'t throw
console.log('Testing SFX execution...');
S.click();
S.error();
S.equip();
S.unequip();
S.beep(440);
S.telemetry();
S.rumbleStart();
S.rumbleLevel(0.8, 0.5);
S.rumbleStop();
S.alarmStart();
S.alarmStop();
assert(clickAudio.playCalls > 0, 'Click should play public/sfx/click.mp3');
assert(errorAudio.playCalls > 0, 'Error should play public/sfx/error.mp3');
assert(rumbleAudio.playCalls > 0 && rumbleAudio.pauseCalls > 0, 'Rumble should play and stop public/sfx/rumble.mp3');
console.log('✔ All SFX playback functions executed cleanly');

console.log('>>> ALL AUDIO & SETTINGS TESTS PASSED! <<<');
