/* Orbital Odyssey — UI core: menu, level select, workshop configurator, settings, and interactive tutorial. */
(function (root) {
  'use strict';
  var D = root.OO_DATA, E = root.OO_ENGINE, I = root.OO_ISO, S = root.OO_SFX;
  function $(id) { return document.getElementById(id); }
  function qa(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(v) { return E.fmt(v); }
  function setCls(el, cls) { if (el && el.className !== cls) el.className = cls; }

  var simpleMode = true;
  try { simpleMode = localStorage.getItem('oo_simple_mode') !== '0'; } catch (e) { /* ignore */ }

  var OO = root.OO = {
    $: $, qa: qa, esc: esc, fmt: fmt, setCls: setCls,
    scn: 'leo', eq: {}, order: [], tab: 'science', prog: {}, hover: null, screen: 'menu',
    yaw: 0.7, spin: true, spinPause: 0, dragging: false, labels: true, t: 0, fx: [],
    disp: null, b: null, loops: {}, built: false,
    tutStep: 0, simpleMode: simpleMode
  };

  /* ---------------- navigation ---------------- */
  var PHASE = {
    menu: ['STAGE 1 \u2022 MAIN MENU', [1]],
    level: ['STAGE 2 \u2022 MISSION SELECTION', [2]],
    config: ['STAGE 3 \u2022 SPACECRAFT WORKSHOP', [3]],
    launch: ['STAGE 4 \u2022 ROCKET LAUNCH', [4]],
    ops: ['STAGE 5 \u2022 SPACE FLIGHT HAZARDS', [5]],
    debrief: ['STAGE 6 \u2022 MISSION RESULTS', [6]]
  };

  OO.show = function (name) {
    qa('.screen').forEach(function (s) { s.classList.toggle('active', s.id === 'screen-' + name); });
    OO.screen = name;
    var p = PHASE[name] || ['ORBITAL ODYSSEY', [1]];
    $('phaseLabel').textContent = p[0];
    var cur = p[1][0];
    qa('#gameStages li').forEach(function (li) {
      var n = +li.getAttribute('data-n');
      var active = n === cur;
      var done = n < cur;
      li.className = (active ? 'active ' : '') + (done ? 'done' : '');
    });
    document.body.setAttribute('data-screen', name);
    var tb = $('topbar');
    if (tb) tb.style.display = (name === 'menu') ? 'none' : 'flex';
    window.scrollTo(0, 0);

    if (name === 'menu') renderMenuArt();
    if (name === 'level') renderLevelArt();
  };

  OO.toast = function (msg, tone) {
    var t = $('toast'); if (!t) return;
    t.textContent = msg; t.className = 'show ' + (tone || '');
    clearTimeout(OO._toastT); OO._toastT = setTimeout(function () { t.className = ''; }, 3200);
  };

  /* ---------------- settings ---------------- */
  OO.setSimpleMode = function (val) {
    OO.simpleMode = !!val;
    try { localStorage.setItem('oo_simple_mode', OO.simpleMode ? '1' : '0'); } catch (e) { /* ignore */ }
    var btnS = $('btnModeSimple'), btnD = $('btnModeDetailed');
    if (btnS && btnD) {
      btnS.classList.toggle('active', OO.simpleMode);
      btnD.classList.toggle('active', !OO.simpleMode);
    }
    var cards = $('cards');
    if (cards) cards.classList.toggle('simple-ui', OO.simpleMode);
    renderCards();
  };

  function openSettings(open) {
    var m = $('settingsModal');
    if (m) m.hidden = !open;
    if (open) {
      S.click();
      syncSettings();
    }
  }

  function syncSettings() {
    var masterPct = Math.round(S.getMasterVolume ? S.getMasterVolume() * 100 : S.getVolume() * 100);
    var musicPct = Math.round(S.getMusicVolume ? S.getMusicVolume() * 100 : 60);
    var sfxPct = Math.round(S.getSfxVolume ? S.getSfxVolume() * 100 : 80);
    var muted = S.isMuted();

    // 1. Master Volume
    var mSlider = $('volMasterSlider') || $('volSlider');
    var mVal = $('volMasterVal');
    var legacyVal = $('volVal');
    if (mSlider) mSlider.value = muted ? 0 : masterPct;
    if (mVal) mVal.textContent = muted ? '0%' : masterPct + '%';
    if (legacyVal) legacyVal.textContent = muted ? '0%' : masterPct + '%';

    var muteBtn = $('btnVolMute');
    if (muteBtn) {
      muteBtn.innerHTML = muted
        ? '<svg class="btn-svg" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'
        : '<svg class="btn-svg" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
    }

    // 2. Background Music Volume & Track info
    var musicSlider = $('volMusicSlider');
    var musicVal = $('volMusicVal');
    if (musicSlider) musicSlider.value = muted ? 0 : musicPct;
    if (musicVal) musicVal.textContent = muted ? '0%' : musicPct + '%';

    var trackSpan = $('musicTrackTitle');
    if (trackSpan && S.getMusicTrack) {
      var tInfo = S.getMusicTrack();
      trackSpan.textContent = 'Track ' + (tInfo.index + 1) + ': ' + tInfo.title;
    }

    // 3. Sound Effects (SFX) Volume
    var sfxSlider = $('volSfxSlider');
    var sfxVal = $('volSfxVal');
    if (sfxSlider) sfxSlider.value = muted ? 0 : sfxPct;
    if (sfxVal) sfxVal.textContent = muted ? '0%' : sfxPct + '%';
  }

  /* ---------------- menu & level art ---------------- */
  function renderMenuArt() {
    var g = '';
    g += '<rect width="900" height="700" fill="#040814"/>' + I.starfield(900, 700, 160, 7);
    g += '<circle cx="120" cy="80" r="240" fill="url(#sunGlow)" opacity=".6"/>';
    g += I.earthMarkup(720, 520, 220);
    g += '<g transform="translate(720 520) rotate(-16)"><ellipse rx="360" ry="92" fill="none" stroke="#22d3ee" stroke-width="1.6" stroke-dasharray="5 10" opacity=".65"/></g>';
    g += '<g transform="translate(720 520) rotate(-16)"><g><animateMotion dur="24s" repeatCount="indefinite" path="M360 0 A360 92 0 1 1 -360 0 A360 92 0 1 1 360 0"/><circle r="6" fill="#ff5a36"/><circle r="14" fill="none" stroke="#ff5a36" opacity=".5"/></g></g>';
    $('menuArt').innerHTML = g;
  }

  function renderLevelArt() {
    var s = OO.scn, g = '';
    g += '<rect width="900" height="700" fill="#050914"/>' + I.starfield(900, 700, 150, 11);
    g += '<circle cx="90" cy="70" r="220" fill="url(#sunGlow)" opacity=".55"/>';
    if (s === 'leo') {
      g += I.earthMarkup(640, 470, 190);
      g += '<g transform="translate(640 470) rotate(-18)"><ellipse rx="300" ry="82" fill="none" stroke="#22d3ee" stroke-width="1.4" stroke-dasharray="4 8" opacity=".6"/></g>';
      g += '<g transform="translate(640 470) rotate(-18)"><g><animateMotion dur="26s" repeatCount="indefinite" path="M300 0 A300 82 0 1 1 -300 0 A300 82 0 1 1 300 0"/><rect x="-7" y="-5" width="14" height="10" rx="1.5" fill="#cbd5e1" stroke="#0b1426"/><rect x="-18" y="-1.5" width="10" height="3" fill="#2f5fb0"/><rect x="8" y="-1.5" width="10" height="3" fill="#2f5fb0"/></g></g>';
    } else {
      g += I.jupiterMarkup(600, 440, 210);
      g += I.europaMarkup(790, 210, 46);
      g += '<g transform="translate(600 440) rotate(-14)"><ellipse rx="330" ry="86" fill="none" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="3 9" opacity=".55"/></g>';
      g += '<g transform="translate(600 440) rotate(-14)"><g><animateMotion dur="34s" repeatCount="indefinite" path="M330 0 A330 86 0 1 1 -330 0 A330 86 0 1 1 330 0"/><circle r="5" fill="#fbbf24"/><circle r="12" fill="none" stroke="#fbbf24" opacity=".4"/></g></g>';
    }
    $('levelArt').innerHTML = g;
  }

  /* ---------------- level selection cards ---------------- */
  function renderScnCards() {
    var h = '';
    Object.keys(D.SCENARIOS).forEach(function (k) {
      var s = D.SCENARIOS[k], sel = OO.scn === k;
      var icon = k === 'leo'
        ? '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="18" fill="#134b8f"/><path d="M20 26c6-8 14-8 18-2s-2 10 2 14-6 8-12 6-12-10-8-18z" fill="#2f8f4e"/><circle cx="32" cy="32" r="18" fill="url(#sphereShade)"/><ellipse cx="32" cy="32" rx="29" ry="9" fill="none" stroke="#22d3ee" stroke-width="1.6" transform="rotate(-22 32 32)"/><circle cx="55" cy="23" r="3" fill="#ff5a36"/></svg>'
        : '<svg viewBox="0 0 64 64"><circle cx="30" cy="34" r="22" fill="#c9a27a"/><rect x="8" y="26" width="44" height="5" fill="#e9d9bd"/><rect x="8" y="38" width="44" height="6" fill="#a6704b"/><circle cx="30" cy="34" r="22" fill="url(#sphereShadeJ)"/><circle cx="54" cy="14" r="6" fill="#d8dde6"/><circle cx="54" cy="14" r="6" fill="url(#sphereShadeE)"/><path d="M50 12l6 3" stroke="#9a5b3a" stroke-width="1"/></svg>';
      h += '<button class="scn-card' + (sel ? ' sel' : '') + '" data-scn="' + k + '" aria-pressed="' + sel + '">' +
        '<div class="scn-icon">' + icon + '</div><div class="scn-body">' +
        '<div class="scn-tier mono ' + (k === 'leo' ? 'beg' : 'adv') + '"><span class="scn-dot ' + (k === 'leo' ? 'beg' : 'adv') + '"></span>' + (k === 'leo' ? 'LEVEL 1: BEGINNER' : 'LEVEL 2: ADVANCED') + '</div>' +
        '<h3>' + esc(s.name) + '</h3><div class="scn-sub">' + esc(s.subtitle) + '</div>' +
        '<dl class="scn-stats mono">' +
        '<div><dt>BUDGET</dt><dd>$' + s.budget + 'M</dd></div><div><dt>MAX WEIGHT</dt><dd>' + s.massCap + ' kg</dd></div>' +
        '<div><dt>SUNLIGHT</dt><dd>' + s.solarPct + '%</dd></div><div><dt>RADIATION</dt><dd>' + (k === 'leo' ? 'Low' : 'Extreme') + '</dd></div></dl>' +
        '</div><span class="scn-check mono">' + (sel ? 'ACTIVE TARGET' : 'SELECT TARGET') + '</span></button>';
    });
    $('scnCards').innerHTML = h;
  }

  function renderBriefing() {
    var s = D.SCENARIOS[OO.scn];
    var sunSvg = '<svg class="icon-svg brief-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
    var radSvg = '<svg class="icon-svg brief-icon" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
    var dishSvg = '<svg class="icon-svg brief-icon" viewBox="0 0 24 24"><path d="M4 10a7.31 7.31 0 0 0 10 10Z"/><path d="m9 15 3-3"/><path d="M17 13a6 6 0 0 0-6-6"/><path d="M21 13A10 10 0 0 0 11 3"/></svg>';
    var rkSvg = '<svg class="icon-svg brief-icon" viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-4.05 11a22.7 22.7 0 0 1-3.95 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 9V4s3.03.55 4 2c1.08 1.62 0 5 0 5"/><circle cx="15" cy="9" r="1.5"/></svg>';
    $('briefing').innerHTML =
      '<div class="brief-overview brief-simple">' +
        '<div class="brief-mission-box">' +
          '<div class="mono brief-tag">SELECTED DESTINATION &bull; ' + esc(s.bodyShort.toUpperCase()) + '</div>' +
          '<h3>' + esc(s.name) + '</h3>' +
          '<p class="brief-lead">' + esc(s.objective) + '</p>' +
        '</div>' +
        '<div class="brief-chips-row mono">' +
          '<span class="brief-chip">' + sunSvg + 'Sunlight: <b>' + s.solarPct + '%</b></span>' +
          '<span class="brief-chip">' + radSvg + 'Radiation: <b>' + s.radiation + '</b></span>' +
          '<span class="brief-chip">' + dishSvg + 'Radio Delay: <b>' + s.lightTime + '</b></span>' +
          '<span class="brief-chip">' + rkSvg + 'Speed Needed: <b>' + s.feasibility[3][1] + '</b></span>' +
        '</div>' +
      '</div>';
  }

  OO.selectScn = function (id) {
    if (id !== OO.scn) { OO.scn = id; OO.resetBuild(); S.click(); }
    renderScnCards(); renderBriefing(); renderLevelArt();
  };

  OO.resetBuild = function () {
    OO.eq = {}; OO.order = []; OO.prog = {}; OO.hover = null; OO.tab = 'science'; OO.fx = [];
    OO.b = E.compute(OO.scn, OO.order);
  };

  /* ---------------- workshop / configurator ---------------- */
  var TAB_ICON = {
    sci: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2.5" fill="currentColor"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(90 12 12)"/></svg>',
    pow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    tel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a7.31 7.31 0 0 0 10 10Z"/><path d="m9 15 3-3"/><path d="M17 13a6 6 0 0 0-6-6"/><path d="M21 13A10 10 0 0 0 11 3"/></svg>',
    lau: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-4.05 11a22.7 22.7 0 0 1-3.95 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 9V4s3.03.55 4 2c1.08 1.62 0 5 0 5"/><circle cx="15" cy="9" r="1.5"/></svg>'
  };

  function buildHUD() {
    var scaleSvg = '<svg class="icon-svg gauge-icon" viewBox="0 0 24 24"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>';
    var boltSvg = '<svg class="icon-svg gauge-icon" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
    var coinSvg = '<svg class="icon-svg gauge-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 6v12"/></svg>';
    var dishSvg = '<svg class="icon-svg gauge-icon" viewBox="0 0 24 24"><path d="M4 10a7.31 7.31 0 0 0 10 10Z"/><path d="m9 15 3-3"/><path d="M17 13a6 6 0 0 0-6-6"/><path d="M21 13A10 10 0 0 0 11 3"/></svg>';
    $('hud').innerHTML =
      '<div class="gauge" id="gMass"><div class="g-label mono">' + scaleSvg + 'CRAFT WEIGHT</div><div class="g-val"><b id="gMassV">0</b><i>kg</i></div><div class="g-bar"><div class="fill" id="gMassF"></div><div class="mark" id="gMassM"></div></div><div class="g-sub mono" id="gMassS"></div></div>' +
      '<div class="gauge" id="gPow"><div class="g-label mono">' + boltSvg + 'POWER BALANCE</div><div class="g-val"><b id="gPowV">0</b><i>W</i></div><div class="g-bar center"><div class="fill" id="gPowF"></div><div class="zero"></div></div><div class="g-sub mono" id="gPowS"></div></div>' +
      '<div class="gauge" id="gBud"><div class="g-label mono">' + coinSvg + 'BUDGET REMAINING</div><div class="g-val"><b id="gBudV">0</b><i>$M</i></div><div class="g-bar"><div class="fill" id="gBudF"></div></div><div class="g-sub mono" id="gBudS"></div></div>' +
      '<div class="gauge" id="gLink"><div class="g-label mono">' + dishSvg + 'RADIO SPEED vs DATA</div><div class="g-val"><b id="gLinkV">0</b><i>kbps</i></div><div class="g-bar dual"><div class="fill bw" id="gLinkB"></div><div class="fill dt" id="gLinkD"></div></div><div class="g-sub mono" id="gLinkS"></div></div>';
  }

  function buildTabs() {
    $('tabs').innerHTML = D.TABS.map(function (t) {
      return '<button role="tab" class="tab" data-tab="' + t.id + '" aria-selected="false"><span class="ti">' + TAB_ICON[t.icon] + '</span><b>' + t.label + '</b><i class="mono">' + t.segment + '</i></button>';
    }).join('');
  }

  function chip(cls, label, val) { return '<span class="chip ' + cls + '"><i>' + label + '</i>' + val + '</span>'; }

  function cardHTML(c) {
    var sc = D.SCENARIOS[OO.scn], st = c.stats[OO.scn];
    var isSimple = OO.simpleMode;

    // Quick impact highlights for simple view
    var impactBadge = '<span class="chip s highlight">' + esc(c.impact || '+Science') + '</span>';
    var costChip = chip('c', 'COST', st.cost + 'M $');
    var weightChip = c.kind !== 'booster' ? chip('m', 'WEIGHT', st.mass + ' kg') : '';

    var srcTxt = (c.source && c.source[OO.scn]) ? c.source[OO.scn] : '';
    var dyn = c.kind === 'booster' ? '<div class="dyn mono" data-dyn="' + c.id + '"></div>' : '';

    // Advanced technical chips
    var fullChips = [];
    if (c.kind !== 'booster') fullChips.push(chip('m', 'WEIGHT', st.mass + ' kg'));
    fullChips.push(chip('c', 'COST', st.cost + 'M $'));
    if (c.kind === 'instrument') { fullChips.push(chip('p', 'POWER DRAW', '\u2212' + st.draw + ' W')); fullChips.push(chip('d', 'DATA GEN', st.data + ' kbps')); fullChips.push(chip('s', 'SCIENCE', '+' + st.sci + ' pts')); }
    if (c.kind === 'solar') { fullChips.push(chip('g', 'EARTH SUN', fmt(st.gen) + ' W')); fullChips.push(chip('g strong', 'HERE', '+' + fmt(st.gen * sc.solar) + ' W')); }
    if (c.kind === 'rtg') fullChips.push(chip('g strong', '24/7 OUTPUT', '+' + st.gen + ' W continuous'));
    if (c.kind === 'battery') fullChips.push(chip('g', 'STORAGE', st.batt + ' Wh'));
    if (c.kind === 'antenna') { fullChips.push(chip('p', 'DRAW', '\u2212' + st.draw + ' W')); fullChips.push(chip('d', 'RADIO LINK', st.bw + ' kbps')); }
    if (c.kind === 'ka') { fullChips.push(chip('p', 'DRAW', '\u2212' + st.draw + ' W')); fullChips.push(chip('d', 'LINK SPEED', '+40%')); fullChips.push(chip('s', 'COMPRESS', '\u221225% data')); }

    var chipsHtml = isSimple
      ? '<div class="chips-compact">' + impactBadge + costChip + weightChip + '</div>'
      : '<div class="chips">' + fullChips.join('') + '</div>';

    return '<div class="card' + (isSimple ? ' card-simple' : '') + '" role="button" tabindex="0" data-id="' + c.id + '" aria-pressed="false">' +
      '<div class="card-top">' +
        '<span class="code mono">' + esc(c.code) + '</span>' +
        '<h4>' + esc(c.name) + '</h4>' +
        '<span class="eqmark mono">&check; INSTALLED</span>' +
      '</div>' +
      chipsHtml +
      '<div class="card-details">' +
        '<p class="tagline">' + esc(c.tag) + '</p>' +
        '<p class="desc">' + esc(isSimple ? c.simpleDesc : c.desc) + '</p>' +
        dyn +
        '<div class="src mono">' + esc(srcTxt) + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderCards() {
    var tab = D.TABS.filter(function (t) { return t.id === OO.tab; })[0];
    $('tabBlurb').innerHTML = '<b class="mono">' + tab.label.toUpperCase() + ' CATEGORY</b> ' + esc(tab.blurb);
    var cardsEl = $('cards');
    cardsEl.classList.toggle('simple-ui', OO.simpleMode);
    cardsEl.innerHTML = D.COMPONENTS.filter(function (c) { return c.tab === OO.tab; }).map(cardHTML).join('');
    qa('#tabs .tab').forEach(function (b) { var on = b.getAttribute('data-tab') === OO.tab; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); });
    updateCards();
  }

  function updateCards() {
    var b = OO.b;
    qa('#cards .card').forEach(function (el) {
      var id = el.getAttribute('data-id'), on = !!OO.eq[id];
      el.classList.toggle('equipped', on); el.setAttribute('aria-pressed', String(on));
      var c = E.comp(id);
      if (c && c.kind === 'booster') {
        var d = el.querySelector('.dyn'), L = c.launch[OO.scn];
        if (!L) { d.innerHTML = '<span class="bad">CANNOT REACH ' + esc(D.SCENARIOS[OO.scn].destName.toUpperCase()) + '</span>'; el.classList.add('impossible'); }
        else {
          var lm = E.launchModel(c, OO.scn, b.mass), ok = lm.margin >= 0;
          d.innerHTML = 'MAX CAPACITY <b>' + L.cap + ' kg</b> &bull; SPEED GAINED @ ' + fmt(b.mass) + ' kg: <b class="' + (ok ? 'ok' : 'bad') + '">' + lm.dv.toFixed(2) + ' km/s</b>' + (ok ? ' (+' + lm.margin.toFixed(2) + ' margin)' : ' (Short by ' + (-lm.margin).toFixed(2) + ' km/s)') + (L.transit ? ' &bull; FLIGHT: <b>' + L.transit + ' yr</b>' : '');
        }
      }
    });
  }

  function renderRight() {
    var b = OO.b, scn = b.scn;
    // warnings
    var w = b.warnings;
    var html = w.map(function (x) {
      return '<div class="warn ' + x.level + '"><span class="wi">' + (x.level === 'crit' ? '!' : x.level === 'warn' ? '\u25B2' : 'i') + '</span><div><b class="mono">' + esc(x.title) + '</b><p>' + esc(x.text) + '</p></div></div>';
    }).join('');
    var hasCrit = w.some(function (x) { return x.level === 'crit'; });
    if (!w.length) html = '<div class="warn ok"><span class="wi">&check;</span><div><b class="mono">ALL CHECKS READY</b><p>Weight, power, radio, and rocket speed are ready for liftoff!</p></div></div>';
    $('warnings').innerHTML = html;
    // checklist
    function seg(name, state, text) { return '<div class="seg ' + state + '"><b class="mono">' + name + '</b><span>' + esc(text) + '</span></div>'; }
    var ls = !b.booster ? ['miss', 'Select a rocket'] : (!b.launch.canReach ? ['bad', b.booster.code + ' cannot reach target'] : (b.mass > b.launch.cap ? ['bad', 'Too heavy for ' + b.booster.code] : ['ok', b.booster.code + ' \u2022 Ready']));
    var powerOk = b.gen > 0 && b.net >= 0;
    var sp = b.gen <= 0 ? ['miss', 'No power source'] : (!b.eclipseCovered ? ['miss', 'Needs Battery for night'] : (powerOk ? ['ok', 'Net +' + fmt(b.net) + ' W Charging'] : ['bad', 'Net ' + fmt(b.net) + ' W Deficit']));
    var gs = !b.antenna ? ['miss', 'No antenna selected'] : (b.data > b.bw ? ['bad', 'Data overflow risk'] : ['ok', fmt(b.bw) + ' kbps Radio Link']);
    var us = !b.instruments.length ? ['miss', 'Install an instrument'] : ['ok', b.instruments.length + ' instrument' + (b.instruments.length > 1 ? 's' : '') + ' \u2022 ' + b.sci + ' pts'];
    var svgRk = '<svg class="btn-svg" viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-4.05 11a22.7 22.7 0 0 1-3.95 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 9V4s3.03.55 4 2c1.08 1.62 0 5 0 5"/><circle cx="15" cy="9" r="1.5"/></svg>';
    var svgPw = '<svg class="btn-svg" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
    var svgRa = '<svg class="btn-svg" viewBox="0 0 24 24"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M12 12h.01"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/></svg>';
    var svgSc = '<svg class="btn-svg" viewBox="0 0 24 24"><path d="M10 2v7.31L4.67 19.15A2 2 0 0 0 6.4 22h11.2a2 2 0 0 0 1.73-2.85L14 9.31V2h-4z"/><path d="M8.5 2h7M7 16h10"/></svg>';
    $('segments').innerHTML = seg(svgRk + ' ROCKET', ls[0], ls[1]) + seg(svgPw + ' POWER', sp[0], sp[1]) + seg(svgRa + ' RADIO', gs[0], gs[1]) + seg(svgSc + ' SCIENCE', us[0], us[1]);
    // BOM
    var rows = '<div class="bom-row bus"><span>' + esc(scn.bus.name) + '</span><em class="mono">' + scn.bus.mass + ' kg</em><em class="mono">' + scn.bus.cost + 'M $</em><i></i></div>';
    OO.order.forEach(function (id) {
      var c = E.comp(id), st = c.stats[OO.scn];
      rows += '<div class="bom-row"><span><b class="mono">' + esc(c.code) + '</b> ' + esc(c.name) + '</span><em class="mono">' + (c.kind === 'booster' ? '\u2014' : st.mass + ' kg') + '</em><em class="mono">' + st.cost + 'M $</em><button class="x" data-remove="' + id + '" aria-label="Remove ' + esc(c.name) + '">&times;</button></div>';
    });
    $('bom').innerHTML = rows;
    $('bomCount').textContent = '\u2022 ' + (OO.order.length + 1) + ' ITEMS';
    // launch button
    var lb = $('btnLaunch');
    lb.classList.toggle('risky', hasCrit);
    lb.innerHTML = hasCrit
      ? (svgRk + ' LAUNCH WITH WARNINGS <small>Checks failing: liftoff may fail!</small>')
      : (svgRk + ' LAUNCH MISSION <small>All systems cleared for liftoff!</small>');
    // booster tag
    var bt = $('boosterTag');
    if (b.booster) { bt.innerHTML = '<b>' + esc(b.booster.code) + '</b> ' + (b.launch.canReach ? 'CAP ' + b.launch.cap + ' kg \u2022 SPEED ' + b.launch.dv.toFixed(1) + ' km/s' : 'CANNOT REACH TARGET'); bt.className = 'booster-tag mono ' + (b.launch.canReach && b.launch.margin >= 0 && b.mass <= b.launch.cap ? 'ok' : 'bad'); }
    else { bt.innerHTML = 'NO ROCKET SELECTED'; bt.className = 'booster-tag mono miss'; }
  }

  OO.refresh = function () {
    OO.b = E.compute(OO.scn, OO.order);
    updateCards(); renderRight();
  };

  OO.equipStarterKit = function (scnId) {
    scnId = scnId || OO.scn || 'leo';
    var starterParts = scnId === 'europa'
      ? ['cam', 'msi', 'rtg', 'batt', 'dish', 'ka', 'heavy']
      : ['cam', 'si', 'batt', 'dish', 'ride'];
    OO.resetBuild();
    starterParts.forEach(function (id) {
      OO.eq[id] = true;
      OO.order.push(id);
      OO.prog[id] = 1;
    });
    OO.refresh();
  };

  var SINGLE = { solar: 1, ant: 1, booster: 1 };
  OO.toggle = function (id) {
    var c = E.comp(id); if (!c) return;
    if (OO.eq[id]) { OO.remove(id, true); return; }
    if (SINGLE[c.group]) OO.order.filter(function (o) { return E.comp(o).group === c.group; }).forEach(function (o) { OO.remove(o, false); });
    OO.eq[id] = true; OO.order.push(id); OO.prog[id] = OO.prog[id] || 0.001;
    S.equip(); OO.refresh();
  };
  OO.remove = function (id, snd) {
    delete OO.eq[id]; OO.order = OO.order.filter(function (o) { return o !== id; });
    if (snd) S.unequip();
    if (OO.screen === 'config') OO.refresh(); else OO.b = E.compute(OO.scn, OO.order);
  };

  OO.enterConfig = function (keep) {
    if (!keep) {
      OO.resetBuild();
    }
    OO.b = E.compute(OO.scn, OO.order);
    OO.disp = { mass: OO.b.mass, net: OO.b.net, rem: OO.b.budgetLeft, bw: OO.b.bw, data: OO.b.data };
    OO.order.forEach(function (id) { OO.prog[id] = 1; });
    $('stageScn').textContent = D.SCENARIOS[OO.scn].name.toUpperCase();
    renderCards(); renderRight(); OO.show('config');
    OO.built = true;
  };

  /* hud update */
  function updateHUD(dt) {
    var b = OO.b, d = OO.disp, k = 1 - Math.exp(-dt * 9), scn = b.scn;
    d.mass += (b.mass - d.mass) * k; d.net += (b.net - d.net) * k; d.rem += (b.budgetLeft - d.rem) * k; d.bw += (b.bw - d.bw) * k; d.data += (b.data - d.data) * k;
    // mass
    var limit = Math.min(scn.massCap, b.boosterCap || Infinity);
    var scale = Math.max(scn.massCap, d.mass) * 1.04;
    $('gMassV').textContent = d.mass.toFixed(d.mass < 100 ? 1 : 0);
    $('gMassF').style.width = Math.min(100, 100 * d.mass / scale) + '%';
    var over = b.mass > limit + 1e-9;
    setCls($('gMass'), 'gauge ' + (over ? 'bad' : b.mass > 0.85 * limit ? 'warn' : 'ok'));
    var mk = $('gMassM'); mk.style.left = (100 * limit / scale) + '%'; mk.style.display = limit < Infinity ? 'block' : 'none';
    $('gMassS').textContent = 'LIMIT: ' + scn.massCap + ' kg' + (b.boosterCap ? ' \u2022 ROCKET MAX: ' + b.boosterCap + ' kg' : '');
    // power
    var mag = Math.max(10, b.gen, b.load) * 1.1;
    $('gPowV').textContent = (d.net >= 0 ? '+' : '\u2212') + Math.abs(d.net).toFixed(Math.abs(d.net) < 100 ? 1 : 0);
    var pf = $('gPowF'), frac = Math.min(1, Math.abs(d.net) / mag) * 50;
    pf.style.width = frac + '%'; pf.style.left = d.net >= 0 ? '50%' : (50 - frac) + '%';
    setCls($('gPow'), 'gauge ' + (b.net < 0 ? 'bad' : (b.gen > 0 && b.net < 0.1 * b.gen ? 'warn' : 'ok')));
    $('gPowS').textContent = d.net >= 0 ? 'SOLAR +' + fmt(b.gen) + ' W \u2212 LOAD ' + fmt(b.load) + ' W' : 'DEFICIT: DRAINING BATTERY';
    // budget
    $('gBudV').textContent = (d.rem < 0 ? '\u2212' : '') + Math.abs(d.rem).toFixed(1);
    $('gBudF').style.width = Math.min(100, 100 * Math.max(0, scn.budget - d.rem) / scn.budget) + '%';
    setCls($('gBud'), 'gauge ' + (b.budgetLeft < 0 ? 'bad' : b.budgetLeft < 0.1 * scn.budget ? 'warn' : 'ok'));
    $('gBudS').textContent = d.rem >= 0 ? 'SPENT $' + b.cost.toFixed(1) + 'M OF $' + scn.budget + 'M' : 'OVER BUDGET BY $' + Math.abs(d.rem).toFixed(1) + 'M';
    // link
    var lm = Math.max(10, b.bw, b.data) * 1.08;
    $('gLinkV').textContent = fmt(d.bw) + ' / ' + fmt(d.data);
    $('gLinkB').style.width = Math.min(100, 100 * d.bw / lm) + '%'; $('gLinkD').style.width = Math.min(100, 100 * d.data / lm) + '%';
    setCls($('gLink'), 'gauge ' + (!b.antenna && b.instruments.length ? 'bad' : b.data > b.bw ? 'bad' : (b.bw > 0 && b.data > 0.7 * b.bw ? 'warn' : 'ok')));
    $('gLinkS').textContent = b.data <= b.bw ? 'RADIO: ' + fmt(b.bw) + ' kbps \u2022 DATA: ' + fmt(b.data) + ' kbps' : 'DATA BUFFER OVERFLOW RISK';
  }

  /* stage background (cleanroom workshop backdrop) */
  function buildStageBg() {
    var g = '', i;
    for (i = 0; i < 6; i++) g += '<rect x="' + (50 + i * 120) + '" y="14" width="80" height="6" rx="3" fill="#cfe6ff" opacity=".35"/><rect x="' + (40 + i * 120) + '" y="20" width="100" height="70" fill="url(#sunGlow)" opacity=".08"/>';
    for (i = 0; i < 9; i++) g += '<line x1="' + (i * 95) + '" y1="40" x2="' + (i * 95) + '" y2="330" stroke="#16264a" stroke-width="1" opacity=".55"/>';
    g += '<line x1="0" y1="330" x2="760" y2="330" stroke="#1d3463" stroke-width="1.5" opacity=".7"/>';
    g += '<text x="24" y="520" class="stage-wm">SPACECRAFT ASSEMBLY BAY &bull; ACTIVE ASSEMBLY</text>';
    $('stageBg').innerHTML = g;
  }

  /* configurator frame loop */
  OO.loops.config = function (dt) {
    OO.t += dt;
    if (OO.spinPause > 0) OO.spinPause -= dt;
    else if (OO.spin && !OO.dragging) OO.yaw += dt * 0.32;
    var id, p, tgt;
    for (id in OO.prog) {
      p = OO.prog[id]; tgt = OO.eq[id] ? 1 : 0;
      if (p < tgt) {
        p = Math.min(tgt, p + dt * 1.15);
        if (p >= 1) { // snap
          var sk = I.SLOT_OF[id], pr = I.projectSlot(OO.yaw, 0.5, 2.5, 1, sk);
          OO.fx.push({ x: 380 + pr[0], y: 262 + pr[1], age: 0 });
        }
      } else if (p > tgt) { p = Math.max(0, p - dt * 3.4); }
      if (p <= 0 && !tgt) delete OO.prog[id]; else OO.prog[id] = p;
    }
    var scale = OO.scn === 'europa' ? 1.06 : 1;
    var sc = I.shipScene({ scn: OO.scn, prog: OO.prog, hover: OO.hover, tab: OO.tab, t: OO.t, labels: OO.labels }, OO.yaw, 0.5, 2.5, scale);
    var bob = Math.sin(OO.t * 1.3) * 4;
    $('shipG').setAttribute('transform', 'translate(380,' + (262 + bob).toFixed(1) + ')');
    $('shipLayer').innerHTML = sc.svg();
    $('shipShadow').setAttribute('rx', (170 - bob * 1.5).toFixed(1)); $('shipShadow').setAttribute('opacity', (0.5 - bob * 0.015).toFixed(2));
    var fx = '';
    OO.fx = OO.fx.filter(function (f) { return (f.age += dt) < 0.75; });
    OO.fx.forEach(function (f) {
      var a = f.age / 0.75, r = 6 + a * 56;
      fx += '<circle cx="' + f.x.toFixed(1) + '" cy="' + (f.y + bob).toFixed(1) + '" r="' + r.toFixed(1) + '" fill="none" stroke="#67e8f9" stroke-width="' + (3 - 2.4 * a).toFixed(2) + '" opacity="' + (1 - a).toFixed(2) + '"/>';
      for (var i = 0; i < 6; i++) { var an = i * 1.047 + 0.3, r2 = 8 + a * 46; fx += '<circle cx="' + (f.x + Math.cos(an) * r2).toFixed(1) + '" cy="' + (f.y + bob + Math.sin(an) * r2).toFixed(1) + '" r="' + (2.2 * (1 - a)).toFixed(2) + '" fill="#fff" opacity="' + (1 - a).toFixed(2) + '"/>'; }
    });
    $('fxLayer').innerHTML = fx;
    updateHUD(dt);
  };

  /* =====================================================================
   *  INTERACTIVE FIRST-PLAYTHROUGH TUTORIAL
   * ===================================================================== */
  var TUT_STEPS = [
    {
      num: 1,
      icon: '<svg class="icon-svg tut-icon-svg" viewBox="0 0 24 24"><path d="M13 7 9 3 5 7l4 4"/><path d="m17 11 4 4-4 4-4-4"/><path d="m8 12 4 4 6-6-4-4Z"/><path d="m16 8 3-3"/><path d="M9 21a6 6 0 0 0-6-6"/></svg>',
      title: 'Welcome to Spacecraft Workshop!',
      callout: { sel: '#hud', label: 'Your 4 live gauges: Weight, Power, Budget, Radio' },
      desc: 'You are in command of designing an authentic NASA-inspired spacecraft. Your mission is to balance instruments, power, radio, and rocket fuel within your budget limits.',
      visual: '<div class="tut-tip-box"><svg class="icon-svg tut-tag-svg" viewBox="0 0 24 24"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/></svg> <b>Goal:</b> Build a ship that can achieve orbit, survive deep-space hazards, and return valuable science back to Earth!</div>',
      highlightTab: null
    },
    {
      num: 2,
      icon: '<svg class="icon-svg tut-icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.5"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(90 12 12)"/></svg>',
      title: 'Step 1: Install Science Instruments',
      callout: { sel: '#tabs .tab[data-tab="science"]', label: 'SCIENCE tab: pick your instruments' },
      desc: 'Every space probe needs a scientific purpose! In the <b>Science</b> tab, install cameras, scanners, or radar. More instruments generate more Science Points, but they also draw electricity and generate data!',
      visual: '<div class="tut-tip-box"><svg class="icon-svg tut-tag-svg" viewBox="0 0 24 24"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/></svg> <b>Tip:</b> Click any part card to equip it onto your 3D ship in real time. Click again to remove it.</div>',
      highlightTab: 'science'
    },
    {
      num: 3,
      icon: '<svg class="icon-svg tut-icon-svg" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
      title: 'Step 2: Generate & Store Power',
      callout: { sel: '#tabs .tab[data-tab="power"]', label: 'POWER tab: solar panels + battery' },
      desc: 'Instruments need electricity to run! Switch to the <b>Power</b> tab to equip solar panels (or nuclear RTG power). <b>Crucial:</b> Always equip a <b>Battery</b> so your craft doesn\'t shut down when passing through the planet\'s dark shadow!',
      visual: '<div class="tut-tip-box"><svg class="icon-svg tut-tag-svg" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> <b>Night-Side Eclipse:</b> In the planet\'s shadow, solar power drops to 0 W. Only your battery keeps you alive!</div>',
      highlightTab: 'power'
    },
    {
      num: 4,
      icon: '<svg class="icon-svg tut-icon-svg" viewBox="0 0 24 24"><path d="M4 10a7.31 7.31 0 0 0 10 10Z"/><path d="m9 15 3-3"/><path d="M17 13a6 6 0 0 0-6-6"/><path d="M21 13A10 10 0 0 0 11 3"/></svg>',
      title: 'Step 3: Radio Communications',
      callout: { sel: '#tabs .tab[data-tab="telecom"]', label: 'RADIO tab: choose an antenna' },
      desc: 'How do your photos and discoveries get home? In the <b>Radio</b> tab, equip an antenna. A high-gain dish transmits data quickly. If your radio is too slow, your memory storage will fill up and lose data!',
      visual: '<div class="tut-tip-box"><svg class="icon-svg tut-tag-svg" viewBox="0 0 24 24"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/></svg> <b>Tip:</b> Equip the Ka-Band Booster to speed up your link by +40% and compress data by 25%.</div>',
      highlightTab: 'telecom'
    },
    {
      num: 5,
      icon: '<svg class="icon-svg tut-icon-svg" viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-4.05 11a22.7 22.7 0 0 1-3.95 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 9V4s3.03.55 4 2c1.08 1.62 0 5 0 5"/><circle cx="15" cy="9" r="1.5"/></svg>',
      title: 'Step 4: Choose Your Rocket Booster',
      callout: { sel: '#tabs .tab[data-tab="launch"]', label: 'ROCKET tab: pick a booster' },
      desc: 'Your spacecraft needs a powerful ride to space! Switch to the <b>Rocket</b> tab and select a booster strong enough to lift your craft\'s weight. If your ship is too heavy for the rocket, it will run out of fuel and crash back to Earth!',
      visual: '<div class="tut-tip-box"><svg class="icon-svg tut-tag-svg" viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-4.05 11a22.7 22.7 0 0 1-3.95 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 9V4s3.03.55 4 2c1.08 1.62 0 5 0 5"/><circle cx="15" cy="9" r="1.5"/></svg> <b>Rocket Physics:</b> Heavier ships require more speed. Keep an eye on the weight limit!</div>',
      highlightTab: 'launch'
    },
    {
      num: 6,
      icon: '<svg class="icon-svg tut-icon-svg" viewBox="0 0 24 24"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>',
      title: 'Step 5: Rocket Steering & Staging',
      callout: { sel: '#btnLaunch', label: 'LAUNCH starts Stage 4: steer + stage!' },
      desc: 'Stage 4 is a live rocket ascent! After you press <b>LAUNCH MISSION</b>, steer with <b>A / D</b> or the <b>&larr; / &rarr; Arrow keys</b> to keep your rocket inside the <b>green trajectory corridor</b>. When a booster burns out, press <b>SPACE</b> to separate the spent boosters so the rocket keeps climbing!',
      visual: '<div class="tut-tip-box tut-steer-box">' +
        '<div class="tut-keys-row"><span class="tut-keys"><kbd>A</kbd><kbd>D</kbd><em>or</em><kbd>&larr;</kbd><kbd>&rarr;</kbd></span><span class="tut-keys-txt"><b>Steer:</b> stay inside the green corridor to keep Flight Stability high.</span></div>' +
        '<div class="tut-corridor-demo" aria-hidden="true"><div class="tut-corridor-zone"></div><div class="tut-corridor-ptr"></div></div>' +
        '<div class="tut-keys-row"><span class="tut-keys"><kbd class="wide">SPACE</kbd></span><span class="tut-keys-txt"><b>Stage:</b> separate the spent boosters the moment they burn out.</span></div>' +
        '</div>',
      highlightTab: 'launch'
    },
    {
      num: 7,
      icon: '<svg class="icon-svg tut-icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>',
      title: 'Step 6: Watch Vitals & Launch!',
      callout: { sel: '#segments', label: 'All checks green? Press LAUNCH MISSION!' },
      desc: 'Check the 4 HUD gauges at the top (Weight, Power, Budget, Radio). When your System Checklist is all green, press <b>LAUNCH MISSION</b> to fly your craft through live space emergencies!',
      visual: '<div class="tut-tip-box"><svg class="icon-svg tut-tag-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> <b>You are ready, Commander!</b> Complete your design and launch when ready. Good luck!</div>',
      highlightTab: 'science'
    }
  ];

  /* ---- floating spotlight / callout bubble that follows the active step ---- */
  function ensureCallout() {
    var el = $('tutCallout');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tutCallout';
      el.className = 'tut-callout-bubble';
      el.hidden = true;
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<span class="tut-callout-label"></span>';
      document.body.appendChild(el);
    }
    return el;
  }

  function hideCallout() {
    var el = $('tutCallout'); if (el) el.hidden = true;
    var m = $('tutorialModal');
    if (m) m.classList.remove('tut-spot-mode', 'tut-side-left', 'tut-side-right');
  }

  function positionCallout(scroll) {
    var m = $('tutorialModal');
    var s = TUT_STEPS[OO.tutStep - 1];
    if (!m || m.hidden || !s || !s.callout) { hideCallout(); return; }
    var target = document.querySelector(s.callout.sel);
    if (!target) { hideCallout(); return; }
    if (scroll && target.scrollIntoView) { try { target.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* ignore */ } }
    var r = target.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) { hideCallout(); return; } // target screen not visible (e.g. tutorial opened from menu)

    var el = ensureCallout(), label = el.firstChild, pad = 6;
    var vw = window.innerWidth, vh = window.innerHeight;
    var bl = r.left - pad, bt = r.top - pad, bw = r.width + pad * 2, bh = r.height + pad * 2;
    var pos = (vh - (bt + bh) >= 76) ? 'below' : (bt >= 76 ? 'above' : 'inside');

    label.textContent = s.callout.label;
    el.className = 'tut-callout-bubble pos-' + pos;
    el.style.left = bl.toFixed(1) + 'px'; el.style.top = bt.toFixed(1) + 'px';
    el.style.width = bw.toFixed(1) + 'px'; el.style.height = bh.toFixed(1) + 'px';
    el.hidden = false;

    // keep the label inside the viewport and point its arrow at the target
    var lw = label.offsetWidth;
    var abs = Math.max(10, Math.min(bl + (bw - lw) / 2, vw - lw - 10));
    label.style.left = (abs - bl).toFixed(1) + 'px';
    var ax = Math.max(16, Math.min(lw - 16, (bl + bw / 2) - abs));
    label.style.setProperty('--ax', ax.toFixed(1) + 'px');

    // dock the tutorial card on the opposite side so it never hides the highlight
    var cx = r.left + r.width / 2;
    m.classList.add('tut-spot-mode');
    m.classList.toggle('tut-side-right', cx < vw * 0.4);
    m.classList.toggle('tut-side-left', cx > vw * 0.6);
  }

  function reflowCallout() {
    var m = $('tutorialModal');
    if (m && !m.hidden) positionCallout(false);
  }
  window.addEventListener('resize', reflowCallout);
  window.addEventListener('scroll', reflowCallout, true);

  OO.startTutorial = function (step) {
    OO.tutStep = step || 1;
    var m = $('tutorialModal');
    if (m) m.hidden = false;
    OO.renderTutorialStep();
  };

  OO.closeTutorial = function () {
    var m = $('tutorialModal');
    if (m) m.hidden = true;
    hideCallout();
    try { localStorage.setItem('oo_tutorial_seen', '1'); } catch (e) { /* ignore */ }
    qa('.tab').forEach(function (t) { t.classList.remove('tut-pulse'); });
    var lb = $('btnLaunch'); if (lb) lb.classList.remove('tut-pulse');
  };

  OO.renderTutorialStep = function () {
    var s = TUT_STEPS[OO.tutStep - 1];
    if (!s) return;
    $('tutStepBadge').textContent = 'STEP ' + s.num + ' OF ' + TUT_STEPS.length;
    $('tutIcon').innerHTML = s.icon;
    $('tutTitle').textContent = s.title;
    $('tutDesc').innerHTML = s.desc;
    $('tutVisual').innerHTML = s.visual;

    // dots
    var dots = '';
    for (var i = 1; i <= TUT_STEPS.length; i++) {
      dots += '<span class="tut-dot' + (i === s.num ? ' active' : (i < s.num ? ' done' : '')) + '"></span>';
    }
    $('tutDots').innerHTML = dots;

    // buttons
    var btnPrev = $('btnTutPrev');
    var btnNext = $('btnTutNext');
    if (btnPrev) btnPrev.style.display = s.num > 1 ? 'inline-flex' : 'none';
    if (btnNext) btnNext.textContent = s.num === TUT_STEPS.length ? 'Start Building! \u2192' : 'Next Step \u2192';

    // switch to highlighted tab in workshop
    if (s.highlightTab && OO.tab !== s.highlightTab) {
      OO.tab = s.highlightTab;
      renderCards();
    }

    // pulsing tabs
    qa('.tab').forEach(function (t) {
      t.classList.toggle('tut-pulse', s.highlightTab && t.getAttribute('data-tab') === s.highlightTab);
    });
    var lb = $('btnLaunch');
    if (lb) lb.classList.toggle('tut-pulse', s.num === TUT_STEPS.length);

    // floating spotlight bubble on the matching UI section
    positionCallout(true);
  };

  /* ---------------- events ---------------- */
  function bind() {
    document.addEventListener('pointerdown', function () { S.init(); }, { once: true });
    document.addEventListener('keydown', function () { S.init(); }, { once: true });

    // Top actions
    $('btnMute').addEventListener('click', function () {
      var m = S.toggle(); syncMute();
      if (!m) S.click();
    });

    $('btnTutorial').addEventListener('click', function () {
      S.click();
      OO.startTutorial(1);
    });

    $('btnTopSettings').addEventListener('click', function () {
      openSettings(true);
    });

    // Main Menu events
    $('btnMenuPlay').addEventListener('click', function () {
      S.init(); S.click();
      OO.show('level');
    });

    $('btnMenuSettings').addEventListener('click', function () {
      openSettings(true);
    });

    $('btnMenuTutorial').addEventListener('click', function () {
      S.init(); S.click();
      OO.startTutorial(1);
    });

    // Level Selection events
    $('btnBackToMenu').addEventListener('click', function () {
      S.click();
      OO.show('menu');
    });

    $('scnCards').addEventListener('click', function (e) {
      var b = e.target.closest('.scn-card'); if (b) OO.selectScn(b.getAttribute('data-scn'));
    });

    $('btnStartLevel').addEventListener('click', function () {
      S.init(); S.click();
      var seen = false;
      try { seen = localStorage.getItem('oo_tutorial_seen') === '1'; } catch (e) { /* ignore */ }
      
      OO.enterConfig(false);
      
      // If first playthrough, immediately present the tutorial right after selecting level
      if (!seen) {
        setTimeout(function () { OO.startTutorial(1); }, 350);
      }
    });

    $('btnBackToLevel').addEventListener('click', function () {
      S.click();
      OO.show('level');
    });

    $('brand').addEventListener('click', function () {
      if (OO.screen !== 'menu') {
        OO.show('menu');
      }
    });

    // Simplified UI mode toggle in workshop
    $('btnModeSimple').addEventListener('click', function () {
      S.click();
      OO.setSimpleMode(true);
    });

    $('btnModeDetailed').addEventListener('click', function () {
      S.click();
      OO.setSimpleMode(false);
    });

    // Settings Modal events
    if (S.onMusicChange) {
      S.onMusicChange(function () {
        syncSettings();
      });
    }

    // 1. Master Volume Slider
    var vMaster = $('volMasterSlider');
    if (vMaster) {
      vMaster.addEventListener('input', function () {
        var val = +this.value / 100;
        if (S.setMasterVolume) S.setMasterVolume(val); else S.setVolume(val);
        syncSettings();
        syncMute();
      });
    }
    var vSlider = $('volSlider');
    if (vSlider && vSlider !== vMaster) {
      vSlider.addEventListener('input', function () {
        var val = +this.value / 100;
        if (S.setMasterVolume) S.setMasterVolume(val); else S.setVolume(val);
        syncSettings();
        syncMute();
      });
    }

    // 2. Background Music Slider & Skip Button
    var vMusic = $('volMusicSlider');
    if (vMusic) {
      vMusic.addEventListener('input', function () {
        var val = +this.value / 100;
        if (S.setMusicVolume) S.setMusicVolume(val);
        syncSettings();
      });
    }

    // 3. Sound Effects (SFX) Slider & Test Button
    var vSfx = $('volSfxSlider');
    if (vSfx) {
      vSfx.addEventListener('input', function () {
        var val = +this.value / 100;
        if (S.setSfxVolume) S.setSfxVolume(val);
        syncSettings();
      });
    }

    var bSfxTest = $('btnSfxTest');
    if (bSfxTest) {
      bSfxTest.addEventListener('click', function () {
        S.click();
      });
    }

    var vMute = $('btnVolMute');
    if (vMute) {
      vMute.addEventListener('click', function () {
        S.toggle();
        syncSettings();
        syncMute();
      });
    }

    var bPlayTut = $('btnSettingsPlayTut');
    if (bPlayTut) {
      bPlayTut.addEventListener('click', function () {
        S.click();
        openSettings(false);
        try { localStorage.removeItem('oo_tutorial_seen'); } catch (e) { /* ignore */ }
        OO.startTutorial(1);
      });
    }

    var bResetTut = $('btnSettingsResetTut');
    if (bResetTut) {
      bResetTut.addEventListener('click', function () {
        S.click();
        try {
          localStorage.removeItem('oo_tutorial_seen');
          localStorage.removeItem('oo_ops_guide_seen');
        } catch (e) { /* ignore */ }
        OO.toast('Tutorials reset! They will auto-play on your next mission.', 'good');
      });
    }

    var bClose = $('btnSettingsClose'), bX = $('btnSettingsX');
    if (bClose) bClose.addEventListener('click', function () { S.click(); openSettings(false); });
    if (bX) bX.addEventListener('click', function () { S.click(); openSettings(false); });

    // Tutorial Modal events
    $('btnTutSkip').addEventListener('click', function () {
      S.click();
      OO.closeTutorial();
    });

    $('btnTutNext').addEventListener('click', function () {
      S.click();
      if (OO.tutStep < TUT_STEPS.length) {
        OO.tutStep++;
        OO.renderTutorialStep();
      } else {
        OO.closeTutorial();
      }
    });

    $('btnTutPrev').addEventListener('click', function () {
      S.click();
      if (OO.tutStep > 1) {
        OO.tutStep--;
        OO.renderTutorialStep();
      }
    });

    // Workshop tabs & cards
    $('tabs').addEventListener('click', function (e) {
      var b = e.target.closest('.tab'); if (!b) return; OO.tab = b.getAttribute('data-tab'); S.click(); renderCards();
    });
    var cards = $('cards');
    cards.addEventListener('click', function (e) { var c = e.target.closest('.card'); if (c) OO.toggle(c.getAttribute('data-id')); });
    cards.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { var c = e.target.closest('.card'); if (c) { e.preventDefault(); OO.toggle(c.getAttribute('data-id')); } }
    });
    cards.addEventListener('mouseover', function (e) {
      var c = e.target.closest('.card'); var id = c ? c.getAttribute('data-id') : null;
      if (id !== OO.hover) { OO.hover = id; if (id) S.hover(); }
    });
    cards.addEventListener('mouseleave', function () { OO.hover = null; });
    cards.addEventListener('focusin', function (e) { var c = e.target.closest('.card'); OO.hover = c ? c.getAttribute('data-id') : null; });
    cards.addEventListener('focusout', function () { OO.hover = null; });
    $('bom').addEventListener('click', function (e) { var x = e.target.closest('[data-remove]'); if (x) OO.remove(x.getAttribute('data-remove'), true); });

    $('chkLabels').addEventListener('change', function (e) { OO.labels = e.target.checked; S.click(); });
    $('chkSpin').addEventListener('change', function (e) { OO.spin = e.target.checked; S.click(); });

    var st = $('stage'), lastX = 0;
    st.addEventListener('pointerdown', function (e) { OO.dragging = true; lastX = e.clientX; try { st.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } });
    st.addEventListener('pointermove', function (e) { if (!OO.dragging) return; OO.yaw += (e.clientX - lastX) * 0.012; lastX = e.clientX; OO.spinPause = 2.5; });
    st.addEventListener('pointerup', function () { OO.dragging = false; });
    st.addEventListener('pointercancel', function () { OO.dragging = false; });

    $('btnLaunch').addEventListener('click', function () {
      S.init();
      var b = OO.b;
      if (!b.booster) { OO.toast('Please choose a rocket booster on the Rocket tab first!', 'warn'); OO.tab = 'launch'; renderCards(); return; }
      if (!b.instruments.length) { OO.toast('Install at least one science instrument on the Science tab!', 'warn'); OO.tab = 'science'; renderCards(); return; }
      S.click();
      if (root.OO_FLOW && root.OO_FLOW.startLaunch) {
        root.OO_FLOW.startLaunch();
      } else {
        console.error('OO_FLOW.startLaunch not ready');
        OO.toast('Launch control initializing, please click again!', 'warn');
      }
    });
  }

  function syncMute() {
    var m = S.isMuted();
    $('btnMute').setAttribute('aria-pressed', String(m));
    $('muteText').textContent = m ? 'Sound OFF' : 'Sound ON';
    var iconSvg = m
      ? '<svg class="btn-svg" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'
      : '<svg class="btn-svg" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
    $('muteIcon').innerHTML = iconSvg;
    var vm = $('btnVolMute');
    if (vm) vm.innerHTML = iconSvg;
  }

  /* master frame loop */
  var last = 0;
  function tick(ts) {
    var dt = Math.min(0.1, (ts - last) / 1000 || 0.016); last = ts;
    var fn = OO.loops[OO.screen];
    if (fn) { try { fn(dt); } catch (e) { if (!OO._err) { OO._err = true; console.error(e); } } }
    requestAnimationFrame(tick);
  }

  function init() {
    OO.resetBuild();
    buildHUD(); buildTabs(); buildStageBg(); syncMute(); bind();
    renderScnCards(); renderBriefing();
    OO.setSimpleMode(OO.simpleMode);
    OO.show('menu');
    requestAnimationFrame(tick);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);