/* Orbital Odyssey: Mission Architect — game data
 * Component stats are game-scaled but anchored in real NASA heritage (see `source` tags).
 * Units: mass kg | cost $M | draw W | data kbps | sci points | gen W (peak @1 AU) | bw kbps | batt Wh
 */
(function (root) {
  'use strict';

  var SCENARIOS = {
    leo: {
      id: 'leo', tier: 'Beginner', name: 'Earth Explorer', subtitle: 'Low Earth Orbit \u2022 400 km',
      body: 'Earth', bodyShort: 'Earth', orbitLabel: '400 km Earth Orbit',
      distanceAU: 1.0, solar: 1.0, solarPct: 100, budget: 25, massCap: 50,
      radiation: 'LOW', radLevel: 1, lightTime: '< 0.01 s', dest: 'leo', destName: 'Earth Orbit',
      shadowName: "Earth's shadow", lightMin: 0,
      bus: { name: 'Compact CubeSat Frame', mass: 14, load: 5, cost: 2.0, source: 'NASA CSLI Heritage' },
      heater: 9, thermalSun: 0, hoursPerSec: 0.03, bufferCap: 20000, benchmark: 95,
      seuWindow: 16, backupLoad: 4, rebootSurge: 10, dsnName: 'Wallops ground station',
      objective: 'Build an Earth satellite to take photos, survive night shadows, and beam data home.',
      feasibility: [
        ['Sunlight Level', '100% (Strong)', 'Plenty of solar power in Earth orbit.'],
        ['Radiation Level', 'Low (Safe)', 'Earth shields your probe from radiation.'],
        ['Radio Delay', '< 0.01 s', 'Radio signals reach ground control instantly.'],
        ['Speed Needed', '9.4 km/s', 'Speed needed to reach orbit safely.']
      ]
    },
    europa: {
      id: 'europa', tier: 'Advanced', name: 'Europa Ocean Voyager', subtitle: 'Deep Space \u2022 Jupiter Moon',
      body: 'Europa', bodyShort: 'Europa', orbitLabel: 'Jupiter system \u2022 5.2 AU',
      distanceAU: 5.2, solar: 0.037, solarPct: 3.7, budget: 250, massCap: 850,
      radiation: 'EXTREME', radLevel: 5, lightTime: '35\u201352 min', dest: 'europa', destName: 'Jupiter transfer',
      shadowName: "Jupiter's shadow", lightMin: 43,
      bus: { name: 'Flagship Deep-Space Bus', mass: 180, load: 100, cost: 38, source: 'NASA Europa Clipper' },
      heater: 58, thermalSun: 0.15, hoursPerSec: 0.09, bufferCap: 600, benchmark: 105,
      seuWindow: 10, backupLoad: 25, rebootSurge: 70, dsnName: 'Deep Space Network (Goldstone \u2192 Canberra)',
      objective: 'Fly to Jupiter’s icy ocean moon, survive intense radiation, and hunt for signs of life.',
      feasibility: [
        ['Sunlight Level', '3.7% (Very Dim)', 'Sunlight is very weak at Jupiter. Solar panels produce little power.'],
        ['Radiation Level', 'Extreme (Lethal)', 'Jupiter’s radiation belts can freeze computer chips.'],
        ['Radio Delay', '35\u201352 min', 'Radio takes over 30 minutes to travel to Earth.'],
        ['Speed Needed', '13.2\u201315.7 km/s', 'Massive rocket power needed to reach Jupiter.']
      ]
    }
  };

  /* ---------- Components ---------- */
  var TABS = [
    { id: 'science', label: 'Science', segment: 'PAYLOAD', icon: 'sci', blurb: 'Cameras, radars, and sensors to score science points.' },
    { id: 'power', label: 'Power', segment: 'POWER', icon: 'pow', blurb: 'Solar panels for sunlight and batteries for night-time shadows.' },
    { id: 'telecom', label: 'Radio', segment: 'COMMS', icon: 'tel', blurb: 'Antennas to transmit photos and telemetry back to Earth.' },
    { id: 'launch', label: 'Rocket', segment: 'BOOSTER', icon: 'lau', blurb: 'Pick a booster rocket strong enough to lift your spacecraft.' }
  ];

  var COMPONENTS = [
    /* ---- SCIENCE ---- */
    {
      id: 'cam', tab: 'science', group: 'sci', kind: 'instrument', code: 'CAM',
      name: 'Digital Color Camera',
      tag: 'Lightweight \u2022 Low Power \u2022 Low Data',
      desc: 'Takes sharp, high-resolution color photos of the planet surface. Inexpensive and very light on battery power.',
      simpleDesc: 'Takes clear color pictures of the planet surface from orbit.',
      impact: '+20 Science',
      source: { leo: 'Source: NASA CSLI optical payload heritage', europa: 'Source: NASA Europa Imaging System (EIS)' },
      stats: {
        leo: { mass: 1.2, cost: 0.8, draw: 3, data: 300, sci: 20 },
        europa: { mass: 8, cost: 4, draw: 12, data: 16, sci: 15 }
      }
    },
    {
      id: 'msi', tab: 'science', group: 'sci', kind: 'instrument', code: 'MSI',
      name: 'Mineral & Atmosphere Scanner',
      tag: 'Medium Weight \u2022 High Science \u2022 High Data',
      desc: 'Scans across visible and infrared light to map minerals, ice, vegetation, and atmospheric gases.',
      simpleDesc: 'Scans minerals, surface ice, and atmosphere using infrared light.',
      impact: '+55 Science',
      source: { leo: 'Source: NASA Landsat / Earth-imaging heritage', europa: 'Source: NASA Europa Clipper MISE Spectrometer' },
      stats: {
        leo: { mass: 4.5, cost: 3.5, draw: 9, data: 900, sci: 55 },
        europa: { mass: 35, cost: 18, draw: 40, data: 58, sci: 45 }
      }
    },
    {
      id: 'radar', tab: 'science', group: 'sci', kind: 'instrument', code: 'RADAR',
      name: 'Ice-Penetrating Radar',
      tag: 'Heavy \u2022 Power Hungry \u2022 Massive Science',
      desc: 'Beams radar waves deep beneath ice shells to detect underground oceans and crust layers.',
      simpleDesc: 'Beams radar underground to find hidden oceans beneath thick ice.',
      impact: '+85 Science (Huge Discovery)',
      source: { leo: 'Source: NASA JPL RainCube radar heritage', europa: 'Source: NASA Europa Clipper REASON Ice Radar' },
      stats: {
        leo: { mass: 14, cost: 9, draw: 28, data: 1400, sci: 85 },
        europa: { mass: 90, cost: 45, draw: 100, data: 156, sci: 90 }
      }
    },
    {
      id: 'maspex', tab: 'science', group: 'sci', kind: 'instrument', code: 'MASS',
      name: 'Water Plume Gas Sniffer',
      tag: 'Top Science for Europa \u2022 Sniffs Ocean Plumes',
      desc: 'Flies through erupting ice geysers and identifies chemical molecules to search for signs of alien life!',
      simpleDesc: 'Sniffs geyser plumes spraying from the ice to search for signs of life.',
      impact: '+85 Science (Top for Europa)',
      source: { leo: 'Source: NASA MAVEN miniature sensor heritage', europa: 'Source: NASA Europa Clipper MASPEX Spectrometer' },
      stats: {
        leo: { mass: 3, cost: 2.5, draw: 6, data: 120, sci: 25 },
        europa: { mass: 40, cost: 28, draw: 35, data: 40, sci: 85 }
      }
    },

    /* ---- POWER ---- */
    {
      id: 'si', tab: 'power', group: 'solar', kind: 'solar', code: 'Si-PV',
      name: 'Basic Solar Panels',
      tag: 'Affordable \u2022 Light \u2022 Very Weak at Jupiter',
      desc: 'Standard solar panels. Affordable and reliable near Earth, but receives 27\u00d7 less sunlight out at Jupiter.',
      simpleDesc: 'Affordable solar panels. Perfect for Earth orbit, but very weak at Jupiter.',
      impact: '+Power in Sunlight',
      source: { leo: 'Source: NASA CubeSat solar panels', europa: 'Source: NASA Juno solar array heritage' },
      stats: {
        leo: { mass: 1.5, cost: 0.6, gen: 20 },
        europa: { mass: 60, cost: 9, gen: 3600 }
      }
    },
    {
      id: 'uflex', tab: 'power', group: 'solar', kind: 'solar', code: 'UltraFlex',
      name: 'Folding Solar Wings',
      tag: 'High Efficiency \u2022 Unfolds in Space',
      desc: 'Advanced circular solar wings that unfold like a fan. Produces significantly more electricity per kilogram.',
      simpleDesc: 'High-efficiency folding wings that produce more electricity per kilogram.',
      impact: '++High Solar Power',
      source: { leo: 'Source: NASA UltraFlex deployable arrays', europa: 'Source: NASA UltraFlex deployable arrays' },
      stats: {
        leo: { mass: 3.2, cost: 2.2, gen: 55 },
        europa: { mass: 90, cost: 25, gen: 6500 }
      }
    },
    {
      id: 'rtg', tab: 'power', group: 'rtg', kind: 'rtg', code: 'RTG',
      name: 'Nuclear Power Generator',
      tag: 'Expensive \u2022 Heavy \u2022 24/7 Power Anywhere',
      desc: 'Converts nuclear heat into electricity non-stop. Operates anywhere, even in pitch-black shadow or deep space.',
      simpleDesc: 'Nuclear decay heat makes continuous electricity 24/7, even in pitch-black night.',
      impact: 'Continuous 24/7 Power',
      source: { leo: 'Source: NASA MMRTG nuclear generator heritage', europa: 'Source: NASA MMRTG nuclear generator heritage' },
      stats: {
        leo: { mass: 9, cost: 9, gen: 15 },
        europa: { mass: 70, cost: 50, gen: 280 }
      }
    },
    {
      id: 'batt', tab: 'power', group: 'batt', kind: 'battery', code: 'BATT',
      name: 'Storage Battery Pack',
      tag: 'Essential for Night-Time Survival',
      desc: 'Stores power while in sunlight and powers your systems in the planet\u2019s shadow. Without it, your craft shuts down.',
      simpleDesc: 'Required! Charges in sunlight to keep your craft alive when in the dark shadow.',
      impact: 'Night-Time Survival',
      source: { leo: 'Source: NASA ISS Li-ion battery heritage', europa: 'Source: NASA ISS Li-ion battery heritage' },
      stats: {
        leo: { mass: 2.4, cost: 0.7, batt: 30 },
        europa: { mass: 45, cost: 6, batt: 600 }
      }
    },

    /* ---- TELECOM ---- */
    {
      id: 'omni', tab: 'telecom', group: 'ant', kind: 'antenna', code: 'LGA',
      name: 'Basic Radio Antenna',
      tag: 'Compact \u2022 Low Cost \u2022 Slow Data Rate',
      desc: 'Sends and receives radio signals in every direction. Inexpensive and lightweight, but transfers large photos slowly.',
      simpleDesc: 'Basic antenna. Cheap & light, but sends high-res photos back to Earth slowly.',
      impact: 'Standard Radio',
      source: { leo: 'Source: NASA CubeSat S-band antenna', europa: 'Source: NASA DSN low-gain antenna' },
      stats: {
        leo: { mass: 0.2, cost: 0.3, draw: 1, bw: 200 },
        europa: { mass: 3, cost: 2, draw: 20, bw: 8 }
      }
    },
    {
      id: 'dish', tab: 'telecom', group: 'ant', kind: 'antenna', code: 'HGA',
      name: 'High-Speed Radio Dish',
      tag: 'High Speed \u2022 Beams Huge Data Volumes',
      desc: 'Focuses a powerful radio beam directly at Earth like a spotlight, downloading science data rapidly.',
      simpleDesc: 'Giant dish antenna that beams huge volumes of science data to Earth fast.',
      impact: 'High-Speed Downlink',
      source: { leo: 'Source: NASA JPL MarCO high-gain antenna', europa: 'Source: NASA Europa Clipper 3-meter dish' },
      stats: {
        leo: { mass: 2, cost: 2.5, draw: 6, bw: 2000 },
        europa: { mass: 120, cost: 32, draw: 70, bw: 160 }
      }
    },
    {
      id: 'ka', tab: 'telecom', group: 'ka', kind: 'ka', code: 'Ka',
      name: 'Data Speed Booster',
      tag: '+40% Link Speed \u2022 Compresses Data 25%',
      desc: 'High-frequency radio upgrade with data compression. Transmits files 40% faster and shrinks data size by 25%.',
      simpleDesc: 'Radio upgrade: compresses data files by 25% and boosts transmission speed by +40%.',
      impact: '+40% Sending Speed',
      source: { leo: 'Source: NASA Ka-band (JWST, LRO)', europa: 'Source: NASA Ka-band (JWST, LRO)' },
      stats: {
        leo: { mass: 0.5, cost: 1.2, draw: 4 },
        europa: { mass: 18, cost: 14, draw: 30 }
      }
    },

    /* ---- LAUNCH ---- */
    {
      id: 'ride', tab: 'launch', group: 'booster', kind: 'booster', code: 'RIDE',
      name: 'Small Budget Rocket',
      tag: 'Budget Friendly \u2022 Max 60 kg \u2022 Earth Orbit Only',
      desc: 'Shares a ride on a commercial rocket. Perfect for small Earth satellites, but cannot reach deep space.',
      simpleDesc: 'Inexpensive shared rocket ride. Great for Earth satellites; cannot reach deep space.',
      impact: 'Budget Friendly (Earth)',
      source: { leo: 'Source: NASA Rideshare launch program', europa: 'Source: NASA Rideshare launch program' },
      stats: {
        leo: { cost: 2.5, mass: 0 },
        europa: { cost: 1, mass: 0 }
      },
      launch: {
        leo: { cap: 60, req: 9.4, ve: 3.4, wet: 1300, transit: 0, route: 'Direct to 400 km Earth orbit' },
        europa: null
      }
    },
    {
      id: 'heavy', tab: 'launch', group: 'booster', kind: 'booster', code: 'HEAVY',
      name: 'Heavy Cargo Rocket',
      tag: 'High Capacity \u2022 Reaches Jupiter via Gravity Boosts',
      desc: 'Falcon Heavy class rocket. Reaches Jupiter in 5.5 years by looping past Mars and Earth for gravitational slingshots.',
      simpleDesc: 'Powerful heavy rocket capable of slinging deep-space probes all the way to Jupiter.',
      impact: 'High Power (Reaches Jupiter)',
      source: { leo: 'Source: Commercial Heavy Lift (Falcon Heavy)', europa: 'Source: Europa Clipper flight on Falcon Heavy' },
      stats: {
        leo: { cost: 18, mass: 0 },
        europa: { cost: 62, mass: 0 }
      },
      launch: {
        leo: { cap: 2000, req: 9.4, ve: 3.6, wet: 60000, transit: 0, route: 'Direct to 400 km Earth orbit' },
        europa: { cap: 650, req: 13.2, ve: 4.2, wet: 34000, transit: 5.5, route: 'Mars\u2013Earth slingshots \u2022 5.5 yr' }
      }
    },
    {
      id: 'super', tab: 'launch', group: 'booster', kind: 'booster', code: 'SUPER',
      name: 'Giant Mega-Rocket',
      tag: 'Massive Power \u2022 Direct Route (2.8 yr) \u2022 High Cost',
      desc: 'NASA SLS monster rocket. Blasts a giant payload straight to Jupiter in under 3 years, but costs a fortune.',
      simpleDesc: 'Massive monster rocket. Flies straight to Jupiter in under 3 years, but costs a fortune.',
      impact: 'Direct Express to Jupiter',
      source: { leo: 'Source: NASA Space Launch System (SLS)', europa: 'Source: NASA SLS direct trajectory' },
      stats: {
        leo: { cost: 24, mass: 0 },
        europa: { cost: 105, mass: 0 }
      },
      launch: {
        leo: { cap: 5000, req: 9.4, ve: 3.7, wet: 250000, transit: 0, route: 'Direct to 400 km Earth orbit' },
        europa: { cap: 1100, req: 15.7, ve: 4.4, wet: 100000, transit: 2.8, route: 'Direct to Jupiter \u2022 2.8 yr' }
      }
    }
  ];

  /* ---------- Real NASA missions ---------- */
  var REAL_MISSIONS = [
    {
      id: 'csli', name: 'NASA CSLI CubeSat', short: 'CubeSat Launch Initiative', agency: 'NASA CSLI \u2022 since 2010',
      tags: ['smallsat', 'earthorbit', 'solar', 'battery', 'omni', 'optical', 'msi', 'rideshare'],
      facts: [
        'NASA\u2019s CubeSat Launch Initiative gives universities, nonprofits and schools free rides to orbit as secondary payloads on NASA-sponsored launches.',
        'A CubeSat is built from 10 cm cube \u201cunits\u201d (1U); many student missions fly 3U\u201312U sizes with body-mounted solar panels.',
        'NASA has launched well over 150 CSLI CubeSats \u2014 proof that a small team can do real space science on a tiny budget.'
      ]
    },
    {
      id: 'marco', name: 'MarCO (Mars Cube One)', short: 'First interplanetary CubeSats', agency: 'NASA JPL \u2022 2018',
      tags: ['smallsat', 'solar', 'battery', 'dish', 'optical', 'rideshare'],
      facts: [
        'Two briefcase-sized CubeSats launched 5 May 2018 alongside NASA\u2019s InSight lander and flew all the way to Mars.',
        'Each carried a flat \u201creflectarray\u201d antenna that folds up tiny but focuses radio like a parabolic dish.',
        'They relayed InSight\u2019s landing signals in near real time \u2014 the first CubeSats to operate in deep space.'
      ]
    },
    {
      id: 'clipper', name: 'Europa Clipper', short: 'NASA flagship to Jupiter\u2019s ocean moon', agency: 'NASA JPL \u2022 launched 14 Oct 2024',
      tags: ['flagship', 'outer', 'solar', 'battery', 'dish', 'radar', 'maspex', 'msi', 'optical', 'heavy'],
      facts: [
        'Launched on a Falcon Heavy on 14 October 2024; its huge solar arrays (about 30 m tip to tip) must still deliver around 700 W at Jupiter.',
        'Carries an ice-penetrating radar (REASON), a mass spectrometer (MASPEX) and imagers to test whether Europa\u2019s ocean could be habitable.',
        'Its 3-metre high-gain antenna is the biggest on the craft; it will make about 49 close flybys instead of orbiting Europa itself, to limit radiation exposure.'
      ]
    },
    {
      id: 'juno', name: 'Juno', short: 'Solar-powered Jupiter orbiter', agency: 'NASA JPL \u2022 launched 2011',
      tags: ['flagship', 'outer', 'solar', 'battery', 'dish', 'omni', 'msi', 'optical', 'heavy'],
      facts: [
        'Juno is a solar-powered Jupiter orbiter: its three giant arrays make only about 500 W at Jupiter, a fraction of what they make near Earth.',
        'A titanium-walled electronics vault shields its computer from Jupiter\u2019s radiation belts.',
        'It proved that big, efficient solar arrays can work at 5.2 AU \u2014 which is why Europa Clipper flies solar too.'
      ]
    },
    {
      id: 'cassini', name: 'Cassini\u2013Huygens', short: 'RTG-powered Saturn orbiter', agency: 'NASA / ESA / ASI \u2022 1997\u20132017',
      tags: ['flagship', 'outer', 'rtg', 'dish', 'radar', 'maspex', 'msi', 'optical', 'super'],
      facts: [
        'Cassini launched in October 1997 and was powered by three radioisotope thermoelectric generators (RTGs), because sunlight at Saturn is far too weak.',
        'It carried a radar mapper to see through Titan\u2019s haze and a mass spectrometer to taste gases, including the plumes of Enceladus.',
        'After 13 years orbiting Saturn it ended its mission in 2017 in a planned dive into the planet.'
      ]
    },
    {
      id: 'jwst', name: 'James Webb Space Telescope', short: 'The big-data observatory at L2', agency: 'NASA / ESA / CSA \u2022 launched 25 Dec 2021',
      tags: ['flagship', 'solar', 'battery', 'dish', 'ka', 'msi', 'optical', 'heavy'],
      facts: [
        'Webb sits near the Sun\u2013Earth L2 point, about 1.5 million km from Earth, shielded from sunlight by a tennis-court-sized sunshield.',
        'It talks to the DSN over a Ka-band link at up to 28 Mbps and can downlink at least 57 GB of science data every day.',
        'Its gold-coated 6.5 m mirror and infrared instruments generate enormous data \u2014 exactly the problem a good telecom system solves.'
      ]
    }
  ];

  /* ---------- Handbook ---------- */
  var HANDBOOK = [
    { t: '\u0394v (delta-v)', b: 'Delta-v is how much your speed can change using rocket propellant. Tsiolkovsky\u2019s equation, \u0394v = v\u2091 \u00b7 ln(m0 / mf), says that every extra kilogram of spacecraft needs far more fuel, so weight is the enemy.' },
    { t: 'Inverse-Square Law', b: 'Light spreads out as it travels, so its strength drops with the square of the distance. At Jupiter (5.2 AU) sunlight is 1 / 5.2\u00b2 \u2248 3.7% as strong as at Earth, so solar panels there make about 27\u00d7 less power.' },
    { t: 'Deep Space Network (DSN)', b: 'NASA\u2019s DSN is three huge antenna sites in California, Spain and Australia, spaced about 120\u00b0 apart so at least one can always see a spacecraft as Earth turns. The farther the probe, the slower its data trickles in.' },
    { t: 'JPL Concept Maturity Levels (CML 1\u20134)', b: 'CML 1 = Concept study (what could we do?). CML 2 = Initial feasibility (could it work?). CML 3 = Trade space (compare options). CML 4 = Preliminary point design (one detailed design with real mass, power and cost). JPL\u2019s full scale runs to CML 9; this game covers 1\u20134.' },
    { t: 'NASA\u2019s 4 Mission Segments', b: 'Launch segment (the rocket), Space segment (the spacecraft), Ground segment (antennas and operations teams), User segment (the scientists and people who use the data). A mission only works when all four work together.' }
  ];

  var API = { SCENARIOS: SCENARIOS, TABS: TABS, COMPONENTS: COMPONENTS, REAL_MISSIONS: REAL_MISSIONS, HANDBOOK: HANDBOOK };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.OO_DATA = API;
})(typeof window !== 'undefined' ? window : globalThis);
