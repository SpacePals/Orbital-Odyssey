/* Orbital Odyssey — tiny isometric SVG renderer, spacecraft model, planets, rockets. No deps. */
(function (root) {
  'use strict';

  /* ---------------- colour helpers ---------------- */
  var cache = {};
  function rgb(c) {
    if (cache[c]) return cache[c];
    var h = c.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    cache[c] = v; return v;
  }
  function shade(c, k) {
    var v = rgb(c);
    return 'rgb(' + Math.min(255, Math.round(v[0] * k)) + ',' + Math.min(255, Math.round(v[1] * k)) + ',' + Math.min(255, Math.round(v[2] * k)) + ')';
  }
  function f1(v) { return Math.round(v * 10) / 10; }

  /* ---------------- scene ---------------- */
  var LIGHT = (function () { var l = [-0.45, 0.78, 0.55], m = Math.sqrt(l[0] * l[0] + l[1] * l[1] + l[2] * l[2]); return [l[0] / m, l[1] / m, l[2] / m]; })();

  function Scene(yaw, pitch, k, scale) {
    this.yaw = yaw; this.pitch = pitch; this.k = k; this.sc = scale || 1;
    this.cy = Math.cos(yaw); this.sy = Math.sin(yaw); this.cp = Math.cos(pitch); this.sp = Math.sin(pitch);
    this.items = [];
  }
  Scene.prototype.rot = function (p) {
    var x = p[0] * this.cy + p[2] * this.sy, z = -p[0] * this.sy + p[2] * this.cy, y = p[1];
    var y2 = y * this.cp - z * this.sp, z2 = y * this.sp + z * this.cp;
    return [x, y2, z2];
  };
  Scene.prototype.pt = function (p) {
    var r = this.rot([p[0] * this.sc, p[1] * this.sc, p[2] * this.sc]);
    return [r[0] * this.k, -r[1] * this.k, r[2]];
  };
  Scene.prototype.light = function (n, two) {
    var r = this.rot(n), d = r[0] * LIGHT[0] + r[1] * LIGHT[1] + r[2] * LIGHT[2];
    if (two) d = Math.abs(d);
    return 0.42 + 0.58 * Math.max(0, d);
  };
  Scene.prototype.facing = function (n) { return this.rot(n)[2]; };

  Scene.prototype.poly = function (pts3, color, n, o) {
    o = o || {};
    var two = !!o.two;
    if (!two && this.facing(n) <= 0.001) return;
    var p2 = [], d = 0, i, q;
    for (i = 0; i < pts3.length; i++) { q = this.pt(pts3[i]); p2.push(q); d += q[2]; }
    d = d / pts3.length + (o.bias || 0);
    var fill = o.flat ? color : shade(color, this.light(n, two));
    this.items.push({ t: 'p', d: d, pts: p2, fill: fill, stroke: o.stroke === undefined ? 'rgba(4,8,18,.55)' : o.stroke, sw: o.sw || 0.7, op: o.op === undefined ? 1 : o.op, dash: o.dash });
  };
  Scene.prototype.box = function (c, s, color, o) {
    var x = c[0], y = c[1], z = c[2], hx = s[0] / 2, hy = s[1] / 2, hz = s[2] / 2;
    var V = function (a, b, d) { return [x + a * hx, y + b * hy, z + d * hz]; };
    var F = [
      [[V(1, -1, -1), V(1, 1, -1), V(1, 1, 1), V(1, -1, 1)], [1, 0, 0]],
      [[V(-1, -1, 1), V(-1, 1, 1), V(-1, 1, -1), V(-1, -1, -1)], [-1, 0, 0]],
      [[V(-1, 1, -1), V(-1, 1, 1), V(1, 1, 1), V(1, 1, -1)], [0, 1, 0]],
      [[V(-1, -1, 1), V(-1, -1, -1), V(1, -1, -1), V(1, -1, 1)], [0, -1, 0]],
      [[V(-1, -1, 1), V(1, -1, 1), V(1, 1, 1), V(-1, 1, 1)], [0, 0, 1]],
      [[V(1, -1, -1), V(-1, -1, -1), V(-1, 1, -1), V(1, 1, -1)], [0, 0, -1]]
    ];
    for (var i = 0; i < 6; i++) this.poly(F[i][0], color, F[i][1], o);
  };
  function basis(axis) {
    if (axis === 'y') return { U: [1, 0, 0], V: [0, 0, 1], A: [0, 1, 0] };
    if (axis === 'x') return { U: [0, 1, 0], V: [0, 0, 1], A: [1, 0, 0] };
    return { U: [1, 0, 0], V: [0, 1, 0], A: [0, 0, 1] };
  }
  Scene.prototype.cyl = function (c, r1, r2, h, axis, color, sides, o) {
    sides = sides || 12; o = o || {};
    var B = basis(axis), A = B.A, U = B.U, V = B.V, i, a0, a1, am;
    function ring(rad, off, a) {
      return [c[0] + A[0] * off + rad * (Math.cos(a) * U[0] + Math.sin(a) * V[0]),
        c[1] + A[1] * off + rad * (Math.cos(a) * U[1] + Math.sin(a) * V[1]),
        c[2] + A[2] * off + rad * (Math.cos(a) * U[2] + Math.sin(a) * V[2])];
    }
    for (i = 0; i < sides; i++) {
      a0 = i / sides * Math.PI * 2; a1 = (i + 1) / sides * Math.PI * 2; am = (a0 + a1) / 2;
      var nrm = [Math.cos(am) * U[0] + Math.sin(am) * V[0], Math.cos(am) * U[1] + Math.sin(am) * V[1], Math.cos(am) * U[2] + Math.sin(am) * V[2]];
      this.poly([ring(r1, -h / 2, a0), ring(r1, -h / 2, a1), ring(r2, h / 2, a1), ring(r2, h / 2, a0)], color, nrm, { op: o.op, stroke: o.stroke === undefined ? 'rgba(4,8,18,.25)' : o.stroke, sw: 0.5, bias: o.bias });
    }
    if (!o.noCap) {
      var cap1 = [], cap2 = [];
      for (i = 0; i < sides; i++) { cap1.push(ring(r1, -h / 2, i / sides * Math.PI * 2)); cap2.push(ring(r2, h / 2, i / sides * Math.PI * 2)); }
      this.poly(cap2, o.capColor || color, A, { op: o.op, bias: 0.2 });
      this.poly(cap1, o.capColor || color, [-A[0], -A[1], -A[2]], { op: o.op, bias: 0.2 });
    }
  };
  Scene.prototype.disc = function (c, n, r, color, sides, o) {
    sides = sides || 24; o = o || {};
    var nm = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]); n = [n[0] / nm, n[1] / nm, n[2] / nm];
    var t = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    var U = [n[1] * t[2] - n[2] * t[1], n[2] * t[0] - n[0] * t[2], n[0] * t[1] - n[1] * t[0]];
    var um = Math.sqrt(U[0] * U[0] + U[1] * U[1] + U[2] * U[2]); U = [U[0] / um, U[1] / um, U[2] / um];
    var V = [n[1] * U[2] - n[2] * U[1], n[2] * U[0] - n[0] * U[2], n[0] * U[1] - n[1] * U[0]];
    var pts = [], i, a;
    for (i = 0; i < sides; i++) {
      a = i / sides * Math.PI * 2;
      pts.push([c[0] + r * (Math.cos(a) * U[0] + Math.sin(a) * V[0]), c[1] + r * (Math.cos(a) * U[1] + Math.sin(a) * V[1]), c[2] + r * (Math.cos(a) * U[2] + Math.sin(a) * V[2])]);
    }
    o.two = o.two === undefined ? true : o.two;
    this.poly(pts, color, n, o);
  };
  Scene.prototype.line = function (a, b, color, w, o) {
    o = o || {};
    var p = this.pt(a), q = this.pt(b);
    this.items.push({ t: 'l', d: (p[2] + q[2]) / 2 + (o.bias || 0), a: p, b: q, color: color, w: w || 1, op: o.op === undefined ? 1 : o.op, dash: o.dash, off: o.off });
  };
  Scene.prototype.sphere = function (c, r, color, o) {
    o = o || {};
    var p = this.pt(c);
    this.items.push({ t: 'c', d: p[2] + (o.bias || 0), x: p[0], y: p[1], r: r * this.k * this.sc, fill: shade(color, 0.95), hi: o.noHi ? null : shade(color, 1.5), op: o.op === undefined ? 1 : o.op });
  };
  Scene.prototype.text = function (c, str, o) {
    var p = this.pt(c); o = o || {};
    this.items.push({ t: 't', d: 9999, x: p[0] + (o.dx || 0), y: p[1] + (o.dy || 0), s: str });
  };
  Scene.prototype.svg = function () {
    this.items.sort(function (a, b) { return a.d - b.d; });
    var out = [], it, i, j, s;
    for (i = 0; i < this.items.length; i++) {
      it = this.items[i];
      if (it.t === 'p') {
        s = '';
        for (j = 0; j < it.pts.length; j++) s += f1(it.pts[j][0]) + ',' + f1(it.pts[j][1]) + ' ';
        out.push('<polygon points="' + s + '" fill="' + it.fill + '" stroke="' + it.stroke + '" stroke-width="' + it.sw + '" stroke-linejoin="round"' + (it.op < 1 ? ' opacity="' + f1(it.op * 100) / 100 + '"' : '') + (it.dash ? ' stroke-dasharray="' + it.dash + '"' : '') + '/>');
      } else if (it.t === 'l') {
        out.push('<line x1="' + f1(it.a[0]) + '" y1="' + f1(it.a[1]) + '" x2="' + f1(it.b[0]) + '" y2="' + f1(it.b[1]) + '" stroke="' + it.color + '" stroke-width="' + it.w + '" stroke-linecap="round"' + (it.op < 1 ? ' opacity="' + it.op + '"' : '') + (it.dash ? ' stroke-dasharray="' + it.dash + '" stroke-dashoffset="' + f1(it.off || 0) + '"' : '') + '/>');
      } else if (it.t === 'c') {
        out.push('<circle cx="' + f1(it.x) + '" cy="' + f1(it.y) + '" r="' + f1(it.r) + '" fill="' + it.fill + '"' + (it.op < 1 ? ' opacity="' + it.op + '"' : '') + '/>');
        if (it.hi) out.push('<circle cx="' + f1(it.x - it.r * 0.3) + '" cy="' + f1(it.y - it.r * 0.3) + '" r="' + f1(it.r * 0.35) + '" fill="' + it.hi + '"' + (it.op < 1 ? ' opacity="' + it.op + '"' : '') + '/>');
      } else if (it.t === 't') {
        out.push('<text class="shiplabel" x="' + f1(it.x) + '" y="' + f1(it.y) + '" text-anchor="middle">' + it.s + '</text>');
      }
    }
    return out.join('');
  };

  /* ---------------- spacecraft model ---------------- */
  var W = 40, H = 34, D = 54;
  var SLOTS = {
    cam: { m: [-11, 6, D / 2], n: 'z', tab: 'science', code: 'CAM' },
    msi: { m: [11, 6, D / 2], n: 'z', tab: 'science', code: 'MSI' },
    maspex: { m: [0, -9, D / 2], n: 'z', tab: 'science', code: 'MASS' },
    radar: { m: [W / 2, -10, -14], m2: [-W / 2, -10, -14], n: 'x', tab: 'science', code: 'RADAR' },
    solar: { m: [W / 2, 8, 0], m2: [-W / 2, 8, 0], n: 'x', tab: 'power', code: 'PV' },
    rtg: { m: [0, 2, -D / 2], n: 'z', tab: 'power', code: 'RTG' },
    batt: { m: [0, H / 2, -18], n: 'y', tab: 'power', code: 'BATT' },
    dish: { m: [0, H / 2, 4], n: 'y', tab: 'telecom', code: 'HGA' },
    omni: { m: [14, H / 2, -20], n: 'y', tab: 'telecom', code: 'LGA' },
    ka: { m: [-13, H / 2, 14], n: 'y', tab: 'telecom', code: 'Ka' },
    booster: { m: [0, -H / 2, 0], n: 'y', tab: 'launch', code: 'ADAPT' }
  };
  var SLOT_OF = { cam: 'cam', msi: 'msi', maspex: 'maspex', radar: 'radar', si: 'solar', uflex: 'solar', rtg: 'rtg', batt: 'batt', dish: 'dish', omni: 'omni', ka: 'ka', ride: 'booster', heavy: 'booster', super: 'booster' };

  function ease(p) { return 1 - Math.pow(1 - p, 3) + Math.sin(p * Math.PI) * 0.04 * (1 - p); }

  /* each module: (scene, k (1=far, 0=attached), a (alpha)) */
  var MOD = {
    cam: function (s, k, a) {
      var dz = 60 * k, dy = 18 * k, o = { op: a };
      s.cyl([-11, 6 + dy, D / 2 + 6 + dz], 6.5, 6.5, 12, 'z', '#3d4a62', 14, o);
      s.disc([-11, 6 + dy, D / 2 + 12.1 + dz], [0, 0, 1], 5, '#050b16', 16, { op: a, two: false });
      s.sphere([-12.4, 7.3 + dy, D / 2 + 12.5 + dz], 1.1, '#7dd3fc', { op: a, bias: 1 });
    },
    msi: function (s, k, a) {
      var dz = 64 * k, dy = 22 * k, o = { op: a };
      s.box([11, 6 + dy, D / 2 + 8 + dz], [16, 14, 16], '#4c5d7a', o);
      s.cyl([11, 6 + dy, D / 2 + 18.5 + dz], 5.2, 5.2, 5, 'z', '#101a2c', 14, o);
      s.disc([11, 6 + dy, D / 2 + 21.1 + dz], [0, 0, 1], 3.8, '#14b8a6', 16, { op: a, two: false });
      s.box([7.4, 13.2 + dy, D / 2 + 8 + dz], [3, 0.8, 9], '#f87171', o);
      s.box([11, 13.2 + dy, D / 2 + 8 + dz], [3, 0.8, 9], '#34d399', o);
      s.box([14.6, 13.2 + dy, D / 2 + 8 + dz], [3, 0.8, 9], '#60a5fa', o);
    },
    maspex: function (s, k, a) {
      var dz = 60 * k, dy = -26 * k, o = { op: a };
      s.cyl([0, -9 + dy, D / 2 + 9 + dz], 4.6, 4.6, 18, 'z', '#5b6e8a', 14, o);
      s.cyl([0, -9 + dy, D / 2 + 21 + dz], 4.6, 2.2, 6, 'z', '#9fb4d0', 14, { op: a, capColor: '#0b1626' });
      s.disc([0, -9 + dy, D / 2 + 24.1 + dz], [0, 0, 1], 1.6, '#f59e0b', 10, { op: a, two: false });
    },
    radar: function (s, k, a) {
      var dx = 80 * k, o = { op: a };
      [-1, 1].forEach(function (sg) {
        var cx = sg * (W / 2 + 28 + dx);
        s.box([cx, -10, -14], [56, 1.2, 12], '#cfd5e1', o);
        for (var i = -2; i <= 2; i++) s.line([cx + i * 11, -9.3, -19.5], [cx + i * 11, -9.3, -8.5], '#5b6a86', 1, { op: a, bias: 0.5 });
        s.line([cx - 28, -9.3, -14], [cx + 28, -9.3, -14], '#5b6a86', 1, { op: a, bias: 0.5 });
      });
    },
    si: function (s, k, a) {
      var dx = 90 * k, o = { op: a };
      [-1, 1].forEach(function (sg) {
        s.box([sg * (W / 2 + 5 + dx), 8, 0], [10, 1.6, 2.6], '#55637a', o);
        var cx = sg * (W / 2 + 40 + dx);
        s.box([cx, 8, 0], [60, 1.4, 38], '#1b3d7a', { op: a, stroke: 'rgba(160,200,255,.5)', sw: 0.9 });
        var i;
        for (i = 1; i < 6; i++) s.line([cx - 30 + i * 10, 8.9, -19], [cx - 30 + i * 10, 8.9, 19], '#6aa0ff', 0.8, { op: 0.55 * a, bias: 0.5 });
        for (i = 1; i < 3; i++) s.line([cx - 30, 8.9, -19 + i * 12.67], [cx + 30, 8.9, -19 + i * 12.67], '#6aa0ff', 0.8, { op: 0.55 * a, bias: 0.5 });
      });
    },
    uflex: function (s, k, a) {
      var dx = 90 * k, o = { op: a };
      [-1, 1].forEach(function (sg) {
        s.box([sg * (W / 2 + 5 + dx), 8, 0], [10, 1.6, 2.6], '#55637a', o);
        var c = [sg * (W / 2 + 37 + dx), 8, 0], i, ang;
        s.disc(c, [0, 1, 0], 31, '#c99a2e', 30, { op: a, stroke: '#7a5a15', sw: 1 });
        s.disc([c[0], 8.4, c[2]], [0, 1, 0], 21, '#d9ae45', 30, { op: a, stroke: 'rgba(122,90,21,.6)', sw: 0.6, bias: 0.3 });
        s.disc([c[0], 8.8, c[2]], [0, 1, 0], 8, '#8c6416', 18, { op: a, bias: 0.4 });
        for (i = 0; i < 14; i++) {
          ang = i / 14 * Math.PI * 2;
          s.line([c[0] + Math.cos(ang) * 8, 9, Math.sin(ang) * 8], [c[0] + Math.cos(ang) * 31, 9, Math.sin(ang) * 31], 'rgba(90,60,10,.75)', 0.9, { op: a, bias: 0.6 });
        }
      });
    },
    rtg: function (s, k, a) {
      var dz = -60 * k, o = { op: a }, zc = -D / 2 - 8 - 14 + dz;
      s.cyl([0, 2, -D / 2 - 4 + dz], 3, 3, 8, 'z', '#3a4150', 10, o);
      s.cyl([0, 2, zc], 7.5, 7.5, 28, 'z', '#262c38', 14, { op: a, capColor: '#3a4150' });
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var sz = d[0] !== 0 ? [8, 1.2, 28] : [1.2, 8, 28];
        s.box([d[0] * 11, 2 + d[1] * 11, zc], sz, '#e8693b', o);
      });
    },
    batt: function (s, k, a) {
      var dy = 50 * k, o = { op: a };
      s.box([0, H / 2 + 3.5 + dy, -18], [26, 7, 16], '#17382c', o);
      for (var i = 0; i < 4; i++) s.box([-9 + i * 6, H / 2 + 7.2 + dy, -18], [4, 0.7, 12], '#34d399', { op: a });
    },
    dish: function (s, k, a) {
      var dy = 60 * k, o = { op: a };
      var n = [0, 0.78, 0.62], c = [0, H / 2 + 28 + dy, 6];
      s.cyl([0, H / 2 + 9 + dy, 4], 1.4, 1.4, 18, 'y', '#9aa6b8', 8, o);
      s.line([0, H / 2 + 18 + dy, 4], [c[0], c[1] - 3, c[2] - 2], '#9aa6b8', 2, { op: a });
      s.disc([c[0] - n[0] * 3, c[1] - n[1] * 3, c[2] - n[2] * 3], n, 22, '#8f9aad', 28, { op: a });
      s.disc(c, n, 21, '#eef1f6', 28, { op: a, bias: 0.4 });
      s.disc([c[0] + n[0] * 0.4, c[1] + n[1] * 0.4, c[2] + n[2] * 0.4], n, 11, '#cfd6e2', 20, { op: a, bias: 0.5, stroke: 'rgba(60,70,90,.4)' });
      var tip = [c[0] + n[0] * 17, c[1] + n[1] * 17, c[2] + n[2] * 17];
      s.line(c, tip, '#cbd5e1', 1.4, { op: a, bias: 1 });
      s.sphere(tip, 2, '#fbbf24', { op: a, bias: 2 });
    },
    omni: function (s, k, a) {
      var dy = 60 * k, o = { op: a };
      s.cyl([14, H / 2 + 1.2 + dy, -20], 2.6, 2.6, 2.4, 'y', '#475569', 10, o);
      s.cyl([14, H / 2 + 18 + dy, -20], 0.9, 0.9, 32, 'y', '#e5e7eb', 6, { op: a, noCap: true });
      s.sphere([14, H / 2 + 34.5 + dy, -20], 1.7, '#f8fafc', { op: a });
    },
    ka: function (s, k, a) {
      var dy = 55 * k, o = { op: a };
      s.box([-13, H / 2 + 3 + dy, 14], [14, 6, 16], '#6d4fa3', o);
      s.cyl([-13, H / 2 + 9.5 + dy, 14], 3.2, 1.8, 7, 'y', '#d6bcfa', 10, { op: a, capColor: '#2b2147' });
    }
  };

  function drawBooster(s, id) {
    var ring = id === 'super' ? '#8b2f1f' : id === 'heavy' ? '#2c4d85' : id === 'ride' ? '#2c6b5c' : '#39455c';
    s.cyl([0, -H / 2 - 3, 0], 15, 15, 6, 'y', ring, 24, { capColor: '#252e40' });
    s.cyl([0, -H / 2 - 1.2, 0], 15.5, 15.5, 1.2, 'y', '#ff5a36', 24, { noCap: true });
    for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2 + Math.PI / 4; s.box([Math.cos(a) * 15, -H / 2 - 3, Math.sin(a) * 15], [3, 4, 3], '#9aa6b8'); }
  }

  /* Build ship scene. st: {scn, prog:{id:0..1}, hover, tab, t, labels, noFloor} */
  function shipScene(st, yaw, pitch, k, scale) {
    var s = new Scene(yaw, pitch, k, scale), id, e, slot;
    var busColor = st.scn === 'europa' ? '#b98a3d' : '#97a4b7';
    var dark = st.scn === 'europa' ? '#6b4f20' : '#4a5568';
    var fy = -H / 2 - 38;
    if (!st.noFloor) {
      s.disc([0, fy, 0], [0, 1, 0], 112, '#0b1426', 40, { op: 0.92, stroke: 'rgba(34,211,238,.55)', sw: 1.4, bias: -500 });
      for (var g = -3; g <= 3; g++) {
        s.line([g * 30, fy + 0.2, -100 + Math.abs(g) * 4], [g * 30, fy + 0.2, 100 - Math.abs(g) * 4], 'rgba(34,211,238,.18)', 0.8, { bias: -499 });
        s.line([-100 + Math.abs(g) * 4, fy + 0.2, g * 30], [100 - Math.abs(g) * 4, fy + 0.2, g * 30], 'rgba(34,211,238,.18)', 0.8, { bias: -499 });
      }
      s.cyl([0, fy + 10, 0], 6, 6, 20, 'y', '#27334a', 10, { bias: -400 });
      s.cyl([0, fy + 1.5, 0], 28, 28, 3, 'y', '#1a2438', 24, { bias: -400 });
    }
    // bus
    s.box([0, 0, 0], [W, H, D], busColor);
    s.box([0, H / 2 + 0.45, 0], [W - 5, 0.9, D - 5], dark);
    s.box([W / 2 + 0.4, -2, 0], [0.8, H - 10, D - 12], dark);
    s.box([-W / 2 - 0.4, -2, 0], [0.8, H - 10, D - 12], dark);
    s.box([0, 0, D / 2 + 0.35], [W - 6, H - 6, 0.7], dark);
    if (st.scn === 'leo') {
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (c) { s.box([c[0] * W / 2, c[1] * H / 2, 0], [2.2, 2.2, D + 2], '#cbd5e1'); });
    } else {
      s.box([0, H / 2 + 1.2, -D / 2 + 6], [W - 10, 2, 8], '#d4a73f');
    }
    var booster = null;
    for (id in st.prog) { if (SLOT_OF[id] === 'booster' && st.prog[id] > 0) booster = id; }
    drawBooster(s, booster);

    var hoverSlot = st.hover ? SLOT_OF[st.hover] : null, pulse = 0.5 + 0.5 * Math.sin(st.t * 4);
    Object.keys(SLOTS).forEach(function (sk) {
      slot = SLOTS[sk];
      if (sk === 'booster' || st.noBrackets) return;
      var occupied = false, pid;
      for (pid in st.prog) if (SLOT_OF[pid] === sk && st.prog[pid] >= 1) occupied = true;
      if (occupied) return;
      var hot = hoverSlot === sk, tabOn = slot.tab === st.tab;
      var col = hot ? '#67e8f9' : tabOn ? 'rgba(34,211,238,' + f1(0.35 + 0.35 * pulse) + ')' : 'rgba(59,92,140,.75)';
      [slot.m, slot.m2].forEach(function (m) {
        if (!m) return;
        var sz = slot.n === 'z' ? [10, 10, 1.6] : slot.n === 'y' ? [10, 1.6, 10] : [1.6, 10, 10];
        var off = slot.n === 'z' ? [0, 0, m[2] < 0 ? -0.8 : 0.8] : slot.n === 'y' ? [0, 0.8, 0] : [m[0] > 0 ? 0.8 : -0.8, 0, 0];
        s.box([m[0] + off[0], m[1] + off[1], m[2] + off[2]], sz, hot ? '#164e63' : '#1c2b45', { stroke: col, sw: hot ? 1.8 : 1.2, bias: 1 });
      });
    });

    var list = [];
    for (id in st.prog) if (st.prog[id] > 0 && MOD[id]) list.push(id);
    list.forEach(function (mid) {
      e = ease(Math.min(1, st.prog[mid]));
      MOD[mid](s, 1 - e, Math.min(1, st.prog[mid] * 2.2));
    });
    if (st.hover && MOD[st.hover] && !(st.prog[st.hover] > 0)) MOD[st.hover](s, 0, 0.3 + 0.12 * pulse);

    // glowing telemetry bus
    var hubY = H / 2 + 0.9, off = -(st.t * 40) % 24;
    var segs = [[[0, hubY, -D / 2 + 4], [0, hubY, D / 2 - 4]]];
    list.forEach(function (mid) {
      if (st.prog[mid] < 1) return;
      var sl = SLOTS[SLOT_OF[mid]];
      [sl.m, sl.m2].forEach(function (m) {
        if (!m) return;
        segs.push([m, [0, hubY, Math.max(-D / 2 + 4, Math.min(D / 2 - 4, m[2]))]]);
      });
    });
    segs.forEach(function (sg) {
      s.line(sg[0], sg[1], 'rgba(34,211,238,.28)', 5, { bias: 800 });
      s.line(sg[0], sg[1], '#67e8f9', 1.5, { bias: 801, dash: '5 7', off: off });
    });

    if (st.labels) {
      list.forEach(function (mid) {
        if (st.prog[mid] < 1) return;
        var sl = SLOTS[SLOT_OF[mid]], m = sl.m;
        s.text([m[0], m[1] + (sl.n === 'y' ? 48 : 12), m[2] + (sl.n === 'z' ? (m[2] < 0 ? -14 : 24) : 0)], sl.code, {});
      });
    }
    return s;
  }

  function projectSlot(yaw, pitch, k, scale, slotKey) {
    var s = new Scene(yaw, pitch, k, scale);
    return s.pt(SLOTS[slotKey].m);
  }

  /* ---------------- planets (ops view) ---------------- */
  function starfield(w, h, n, seed) {
    var out = '', r = seed || 7, i;
    function rnd() { r = (r * 16807) % 2147483647; return r / 2147483647; }
    for (i = 0; i < n; i++) {
      var x = rnd() * w, y = rnd() * h, sz = rnd() < 0.1 ? 1.6 : rnd() < 0.4 ? 1.0 : 0.6, tw = rnd() < 0.2;
      out += '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + sz + '" fill="#fff" opacity="' + f1(0.25 + rnd() * 0.65) + '"' + (tw ? ' class="twinkle" style="animation-delay:' + f1(rnd() * 4) + 's"' : '') + '/>';
    }
    return out;
  }

  var uidN = 0;
  function earthMarkup(cx, cy, r) {
    var id = 'ec' + (++uidN);
    var ogId = 'og' + id, shId = 'sh' + id, specId = 'sp' + id, nightMaskId = 'nm' + id, atmoId = 'at' + id;
    var k = r / 125;
    
    // Continental shallows (turquoise coastal shelves)
    var shallows = '<g fill="#06b6d4" opacity=".5">' +
      '<path d="M-102 10 C-96 -6 -76 -6 -74 16 C-86 28 -100 20 -102 10Z"/>' +
      '<path d="M172 38 C184 45 188 68 180 80 C173 75 178 52 172 38Z"/>' +
      '<path d="M98 18 C122 15 142 20 136 32 C118 35 104 30 98 18Z"/>' +
      '<path d="M-18 -50 C-4 -54 15 -48 10 -36 C-2 -35 -14 -42 -18 -50Z"/>' +
      '</g>';

    // Continents with authentic biomes (greens, savannahs, deserts, and polar ice)
    var continents = '<g>' +
      // Antarctica ice cap
      '<path d="M-240 108 Q-160 98 -80 104 T80 100 T240 106 L240 140 L-240 140Z" fill="#f8fafc" opacity=".95"/>' +
      // Greenland ice sheet
      '<path d="M-85 -92 C-70 -102 -54 -92 -50 -78 C-48 -68 -60 -63 -70 -68 C-80 -73 -88 -82 -85 -92Z" fill="#e2e8f0"/>' +
      // North America (Canada, Alaska, US, Mexico)
      '<path d="M-195 -82 C-188 -92 -172 -88 -162 -82 C-152 -78 -142 -72 -138 -82 C-128 -88 -112 -82 -104 -72 C-98 -62 -108 -58 -118 -58 C-128 -58 -132 -68 -142 -68 C-152 -68 -158 -58 -168 -62 C-178 -68 -192 -72 -195 -82Z" fill="#2d6a38"/>' +
      '<path d="M-160 -62 C-144 -58 -128 -58 -114 -60 C-104 -52 -94 -52 -84 -58 C-78 -48 -84 -38 -88 -34 C-94 -28 -84 -24 -78 -14 C-76 -4 -78 6 -80 12 C-84 10 -88 4 -94 8 C-104 10 -108 4 -114 -4 C-124 4 -134 0 -128 -14 C-134 -18 -138 -14 -140 -24 C-144 -34 -154 -44 -160 -62Z" fill="#387a42"/>' +
      // Florida & Central America & Baja
      '<path d="M-84 -4 C-80 -4 -78 2 -80 8 C-82 10 -86 8 -84 -4Z" fill="#2d6a38"/>' +
      '<path d="M-132 -16 C-130 -20 -125 -8 -128 -4 C-131 -2 -133 -8 -132 -16Z" fill="#9e7b44"/>' +
      '<path d="M-104 8 C-98 10 -90 16 -84 22 C-80 24 -84 26 -88 24 C-94 20 -100 16 -104 8Z" fill="#2d6a38"/>' +
      // South America
      '<path d="M-88 18 C-80 16 -70 18 -60 22 C-50 22 -42 28 -38 38 C-34 48 -40 60 -45 70 C-52 82 -58 95 -64 112 C-68 114 -70 110 -68 96 C-72 82 -75 68 -80 52 C-85 42 -88 32 -90 22 C-90 18 -88 18 -88 18Z" fill="#226b34"/>' +
      '<path d="M-74 26 C-60 24 -48 30 -44 44 C-46 58 -55 64 -64 60 C-70 56 -74 42 -74 26Z" fill="#1b5428"/>' +
      '<path d="M-86 22 C-84 32 -80 48 -76 66 C-72 82 -68 96 -65 110 L-67 111 C-71 96 -75 78 -80 58 C-84 42 -87 30 -88 22Z" fill="#8d6e42"/>' +
      // Europe & Scandinavia & British Isles
      '<path d="M5 -82 C15 -88 22 -78 18 -66 C15 -56 10 -58 8 -68 C5 -72 0 -76 5 -82Z" fill="#2d6a38"/>' +
      '<path d="M-14 -66 C-8 -70 -6 -60 -10 -54 C-14 -52 -16 -58 -14 -66Z" fill="#357e40"/>' +
      '<path d="M-10 -50 C2 -54 18 -52 35 -55 C45 -50 50 -42 42 -36 C32 -36 25 -30 20 -32 C15 -30 10 -38 5 -40 C-2 -38 -6 -46 -10 -50Z" fill="#387a42"/>' +
      '<path d="M-12 -42 C-4 -42 -2 -34 -8 -30 C-14 -30 -16 -36 -12 -42Z" fill="#4d7c38"/>' +
      '<path d="M8 -38 C12 -36 16 -28 14 -26 C11 -26 10 -34 8 -38Z" fill="#387a42"/>' +
      // Africa (Sahara, Sahel, Central, Madagascar)
      '<path d="M-18 -20 C0 -24 25 -22 45 -16 C48 -6 45 6 35 12 C20 15 5 14 -12 10 C-18 5 -20 -8 -18 -20Z" fill="#be8c46"/>' +
      '<path d="M-12 10 C5 14 20 15 35 12 C42 20 48 32 40 44 C35 58 30 72 22 85 C18 88 15 82 12 68 C8 52 5 38 -2 26 C-8 18 -12 14 -12 10Z" fill="#256e36"/>' +
      '<path d="M50 40 C54 36 58 48 52 62 C48 58 46 48 50 40Z" fill="#2d733b"/>' +
      // Asia & Middle East & India & East Asia
      '<path d="M38 -18 C48 -16 55 -8 52 6 C45 8 40 0 36 -8 C35 -14 36 -16 38 -18Z" fill="#ba8945"/>' +
      '<path d="M70 -10 C80 -8 88 -3 90 10 C85 20 78 24 74 14 C70 6 68 -3 70 -10Z" fill="#387d44"/>' +
      '<path d="M35 -55 C60 -62 100 -60 140 -65 C170 -62 190 -52 185 -42 C165 -42 150 -50 130 -45 C110 -42 80 -45 60 -42 C45 -45 40 -52 35 -55Z" fill="#2a6634"/>' +
      '<path d="M95 -22 C115 -26 135 -18 145 -8 C140 6 125 16 110 12 C100 8 92 -4 95 -22Z" fill="#35783f"/>' +
      '<path d="M104 6 C114 8 120 18 116 26 C110 26 106 18 104 10Z" fill="#2b6b35"/>' +
      '<path d="M150 -32 C155 -36 160 -26 155 -18 C150 -22 148 -28 150 -32Z" fill="#34723c"/>' +
      // Australia & New Zealand
      '<path d="M128 42 C142 32 168 35 178 48 C182 62 176 78 162 82 C148 84 134 78 126 66 C124 56 125 45 128 42Z" fill="#b06434"/>' +
      '<path d="M128 42 C142 32 168 35 178 48 C182 62 176 78 162 82 C160 78 168 68 166 54 C162 42 146 38 128 42Z" fill="#2f7238"/>' +
      '<path d="M192 72 C196 68 202 78 198 86 C194 88 192 82 192 72Z" fill="#357a40"/>' +
      '</g>';

    // City lights on continents (night side illumination)
    var cityLights = '<g fill="#fbbf24" opacity=".85">' +
      '<circle cx="-110" cy="-60" r="1.3" fill="#fef08a"/><circle cx="-105" cy="-56" r="1.1"/><circle cx="-116" cy="-54" r="1.2"/><circle cx="-120" cy="-58" r="1.3"/><circle cx="-100" cy="-50" r="1.4"/><circle cx="-95" cy="-44" r="1.6" fill="#fef08a"/><circle cx="-90" cy="-38" r="1.4"/><circle cx="-94" cy="-30" r="1.3"/><circle cx="-88" cy="-20" r="1.2"/><circle cx="-84" cy="-4" r="1.4"/>' +
      '<circle cx="-150" cy="-50" r="1.5" fill="#fef08a"/><circle cx="-146" cy="-42" r="1.3"/><circle cx="-142" cy="-32" r="1.4"/>' +
      '<circle cx="8" cy="-62" r="1.4"/><circle cx="14" cy="-58" r="1.6" fill="#fef08a"/><circle cx="22" cy="-52" r="1.5"/><circle cx="30" cy="-48" r="1.4"/><circle cx="38" cy="-44" r="1.3"/><circle cx="18" cy="-40" r="1.2"/><circle cx="25" cy="-34" r="1.3"/>' +
      '<circle cx="75" cy="-8" r="1.5"/><circle cx="80" cy="-2" r="1.6" fill="#fef08a"/><circle cx="86" cy="6" r="1.4"/><circle cx="115" cy="-14" r="1.5"/><circle cx="122" cy="-8" r="1.6" fill="#fef08a"/><circle cx="128" cy="4" r="1.4"/><circle cx="132" cy="-2" r="1.3"/><circle cx="140" cy="-28" r="1.5" fill="#fef08a"/>' +
      '<circle cx="-55" cy="42" r="1.4"/><circle cx="-52" cy="52" r="1.3"/><circle cx="-58" cy="60" r="1.2"/><circle cx="165" cy="65" r="1.4"/><circle cx="158" cy="74" r="1.2"/>' +
      '</g>';

    // Swirling weather patterns & cyclonic storms
    var clouds = '<g fill="#ffffff">' +
      // Equatorial ITCZ billowing cloud belt
      '<path d="M-240 2 C-200 -6 -160 8 -120 0 C-80 -8 -40 6 0 -2 C40 -8 80 8 120 0 C160 -6 200 6 240 0 C220 7 180 3 140 9 C100 3 60 11 20 3 C-20 9 -60 2 -100 7 C-140 2 -180 8 -240 2Z" opacity=".7"/>' +
      // Atlantic cyclone spiral
      '<path d="M-135 -48 C-122 -62 -98 -52 -108 -38 C-118 -28 -140 -34 -135 -48Z" opacity=".8"/>' +
      '<path d="M-145 -42 C-138 -56 -112 -58 -118 -42" stroke="#fff" stroke-width="4" fill="none" opacity=".65"/>' +
      // Pacific storm front
      '<path d="M25 -62 C48 -75 70 -62 60 -48 C50 -38 32 -48 25 -62Z" opacity=".75"/>' +
      '<path d="M-210 -40 C-180 -55 -150 -35 -170 -20" stroke="#fff" stroke-width="5" fill="none" opacity=".55"/>' +
      // Southern Ocean circumpolar cloud bands
      '<path d="M-240 85 C-180 80 -120 92 -60 84 C0 78 60 90 120 82 C180 88 220 80 240 85 C220 92 170 88 110 94 C50 86 -10 96 -70 88 C-130 96 -190 86 -240 85Z" opacity=".65"/>' +
      '<path d="M-240 55 C-190 50 -130 62 -70 54 C-10 48 50 60 110 52 C170 58 210 50 240 55" stroke="#fff" stroke-width="3" fill="none" opacity=".45"/>' +
      // High-altitude cirrus wisps
      '<ellipse cx="-60" cy="-28" rx="48" ry="6" opacity=".5"/>' +
      '<ellipse cx="70" cy="22" rx="55" ry="7" opacity=".55"/>' +
      '<ellipse cx="-160" cy="30" rx="42" ry="5" opacity=".45"/>' +
      '<ellipse cx="150" cy="-55" rx="46" ry="6" opacity=".5"/>' +
      '</g>';

    var spinw = 480;
    var worldTile = shallows + continents + '<g mask="url(#' + nightMaskId + ')">' + cityLights + '</g>' + clouds;

    return '<g transform="translate(' + cx + ',' + cy + ')">' +
      '<defs>' +
        // Ocean base: depth radial gradient
        '<radialGradient id="' + ogId + '" cx="28%" cy="38%" r="72%">' +
          '<stop offset="0%" stop-color="#2563eb"/>' +
          '<stop offset="30%" stop-color="#1d4ed8"/>' +
          '<stop offset="60%" stop-color="#0f346b"/>' +
          '<stop offset="85%" stop-color="#071d3d"/>' +
          '<stop offset="100%" stop-color="#020914"/>' +
        '</radialGradient>' +
        // Subsolar ocean specular glint (sun reflection highlight)
        '<radialGradient id="' + specId + '" cx="28%" cy="40%" r="28%">' +
          '<stop offset="0%" stop-color="#ffffff" stop-opacity=".45"/>' +
          '<stop offset="40%" stop-color="#7dd3fc" stop-opacity=".18"/>' +
          '<stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>' +
        '</radialGradient>' +
        // Night mask: city lights appear on dark hemisphere
        '<mask id="' + nightMaskId + '">' +
          '<rect x="-300" y="-180" width="1100" height="360" fill="white"/>' +
          '<radialGradient id="nmG' + id + '" cx="30%" cy="45%" r="55%">' +
            '<stop offset="0%" stop-color="#000000"/>' +
            '<stop offset="70%" stop-color="#000000"/>' +
            '<stop offset="100%" stop-color="#ffffff"/>' +
          '</radialGradient>' +
          '<circle cx="0" cy="0" r="' + (r * 1.5) + '" fill="url(#nmG' + id + ')"/>' +
        '</mask>' +
        // Realistic 3D terminator shading with warm sunset twilight band
        '<radialGradient id="' + shId + '" cx="26%" cy="36%" r="80%">' +
          '<stop offset="0%" stop-color="#ffffff" stop-opacity=".22"/>' +
          '<stop offset="42%" stop-color="#ffffff" stop-opacity="0"/>' +
          '<stop offset="60%" stop-color="#d97706" stop-opacity=".18"/>' +
          '<stop offset="70%" stop-color="#040b17" stop-opacity=".72"/>' +
          '<stop offset="88%" stop-color="#01040a" stop-opacity=".95"/>' +
          '<stop offset="100%" stop-color="#000104" stop-opacity=".99"/>' +
        '</radialGradient>' +
        // Outer Rayleigh atmospheric scattering glow
        '<radialGradient id="' + atmoId + '" cx="50%" cy="50%" r="50%">' +
          '<stop offset="76%" stop-color="#38bdf8" stop-opacity="0"/>' +
          '<stop offset="85%" stop-color="#38bdf8" stop-opacity=".32"/>' +
          '<stop offset="91%" stop-color="#0ea5e9" stop-opacity=".75"/>' +
          '<stop offset="96%" stop-color="#0284c7" stop-opacity=".35"/>' +
          '<stop offset="100%" stop-color="#0369a1" stop-opacity="0"/>' +
        '</radialGradient>' +
      '</defs>' +
      // Atmospheric outer scattering glow halo
      '<circle r="' + (r + 14 * k + 2) + '" fill="url(#' + atmoId + ')"/>' +
      '<clipPath id="' + id + '"><circle r="' + r + '"/></clipPath>' +
      // Ocean base
      '<circle r="' + r + '" fill="url(#' + ogId + ')"/>' +
      // Rotating world surface
      '<g clip-path="url(#' + id + ')">' +
        '<g transform="scale(' + (k * 1.02).toFixed(3) + ')">' +
          '<g class="planet-spin" style="--spinw:' + spinw + 'px">' +
            '<g>' + worldTile + '</g>' +
            '<g transform="translate(' + spinw + ',0)">' + worldTile + '</g>' +
          '</g>' +
        '</g>' +
        // Ocean specular glint highlight
        '<circle r="' + r + '" fill="url(#' + specId + ')"/>' +
        // 3D Spherical lighting & twilight terminator
        '<circle r="' + r + '" fill="url(#' + shId + ')"/>' +
        // Luminous sunlit atmospheric limb crescent (thin blue rim on illuminated edge)
        '<path d="M0 -' + r + ' A' + r + ' ' + r + ' 0 0 0 0 ' + r + ' A' + (r * 0.96).toFixed(1) + ' ' + r + ' 0 0 1 0 -' + r + 'Z" fill="#7dd3fc" opacity=".45"/>' +
        '<circle r="' + r + '" fill="none" stroke="#38bdf8" stroke-width="' + (2.2 * k).toFixed(1) + '" opacity=".6"/>' +
      '</g>' +
    '</g>';
  }
  function europaMarkup(cx, cy, r) {
    var cracks = '';
    var C = [[-70, -30, -10, 10, 40, 60], [-60, 20, 0, -20, 50, -40], [-30, -80, -10, -40, 20, -10], [20, 90, 50, 30, 100, 40], [-100, 40, -50, 70, -10, 60]];
    C.forEach(function (c) { cracks += '<path d="M' + c[0] + ' ' + c[1] + ' Q' + c[2] + ' ' + c[3] + ' ' + c[4] + ' ' + c[5] + '" stroke="#9a5b3a" stroke-width="2.2" fill="none" opacity=".75"/>'; });
    var spots = '<circle cx="-40" cy="-60" r="9" fill="#b9885f" opacity=".6"/><circle cx="55" cy="35" r="12" fill="#b9885f" opacity=".5"/><circle cx="-70" cy="45" r="7" fill="#b9885f" opacity=".55"/>';
    var id = 'euc' + (++uidN), k = r / 105;
    return '<g transform="translate(' + cx + ',' + cy + ')">' +
      '<circle r="' + (r + 10) + '" fill="url(#atmoE)" opacity=".7"/>' +
      '<clipPath id="' + id + '"><circle r="' + r + '"/></clipPath>' +
      '<circle r="' + r + '" fill="#d8dde6"/>' +
      '<g clip-path="url(#' + id + ')"><g transform="scale(' + k.toFixed(3) + ')"><g class="planet-spin slow" style="--spinw:340px"><g>' + cracks + spots + '</g><g transform="translate(340,0)">' + cracks + spots + '</g></g></g>' +
      '<circle r="' + r + '" fill="url(#sphereShadeE)"/></g></g>';
  }
  function jupiterMarkup(cx, cy, r) {
    var jid = 'jc' + (++uidN);
    var bands = '', cols = ['#c9a27a', '#e6d3b3', '#b5835a', '#efe0c6', '#a6704b', '#d9b78a', '#8d5a3a', '#e9d9bd', '#c08e63'];
    for (var i = 0; i < cols.length; i++) bands += '<rect x="' + (-r) + '" y="' + f1(-r + i * (2 * r / cols.length)) + '" width="' + 2 * r + '" height="' + f1(2 * r / cols.length + 1) + '" fill="' + cols[i] + '"/>';
    return '<g transform="translate(' + cx + ',' + cy + ')"><clipPath id="' + jid + '"><circle r="' + r + '"/></clipPath>' +
      '<g clip-path="url(#' + jid + ')">' + bands + '<ellipse cx="' + f1(r * 0.25) + '" cy="' + f1(r * 0.28) + '" rx="' + f1(r * 0.17) + '" ry="' + f1(r * 0.09) + '" fill="#b5543a"/>' +
      '<circle r="' + r + '" fill="url(#sphereShadeJ)"/></g></g>';
  }

  /* ---------------- rockets (nozzle exit at 0,0; body extends to -y) ---------------- */
  function rocketMarkup(type, sc) {
    var body = '', s = sc || 1;
    if (type === 'ride') {
      var srbSide = function (x) {
        return '<g class="' + (x < 0 ? 'srb-l' : 'srb-r') + '"><rect x="' + (x - 3.5) + '" y="-65" width="7" height="60" fill="url(#rk_white)"/><path d="M' + (x - 3.5) + ' -65 Q' + x + ' -76 ' + (x + 3.5) + ' -65Z" fill="#e2e8f0"/><path d="M' + (x - 2.5) + ' -4 L' + (x - 3.5) + ' 3 L' + (x + 3.5) + ' 3 L' + (x + 2.5) + ' -4Z" fill="#2a3040"/></g>';
      };
      body = srbSide(-13) + srbSide(13) + '<path d="M-7 0 L-9 -8 L9 -8 L7 0Z" fill="#2a3040"/>' +
        '<rect x="-9" y="-80" width="18" height="72" fill="url(#rk_white)"/><rect x="-9" y="-80" width="18" height="6" fill="#ff5a36" opacity=".9"/>' +
        '<rect x="-7.5" y="-120" width="15" height="40" fill="url(#rk_white)"/><path d="M-7.5 -120 Q0 -142 7.5 -120Z" fill="url(#rk_white)"/>' +
        '<rect x="-9" y="-40" width="18" height="2.5" fill="#1e293b"/><path d="M-9 -8 L-18 6 L-9 -2Z M9 -8 L18 6 L9 -2Z" fill="#334155"/>';
    } else if (type === 'heavy') {
      var side = function (x) { return '<g class="' + (x < 0 ? 'srb-l' : 'srb-r') + '"><g transform="translate(' + x + ',0)"><rect x="-8" y="-100" width="16" height="94" fill="url(#rk_white)"/><path d="M-8 -100 Q0 -118 8 -100Z" fill="#e2e8f0"/><path d="M-6 -6 L-8 4 L8 4 L6 -6Z" fill="#2a3040"/></g></g>'; };
      body = side(-20) + side(20) + '<path d="M-7 -6 L-9 4 L9 4 L7 -6Z" fill="#2a3040"/>' +
        '<rect x="-9" y="-150" width="18" height="144" fill="url(#rk_white)"/><path d="M-9 -150 Q0 -176 9 -150Z" fill="url(#rk_white)"/>' +
        '<rect x="-9" y="-70" width="18" height="3" fill="#1e293b"/><rect x="-9" y="-150" width="18" height="5" fill="#ff5a36" opacity=".9"/>';
    } else {
      body = '<g class="srb-l"><rect x="-27" y="-120" width="12" height="118" fill="url(#rk_white)"/><path d="M-27 -120 Q-21 -138 -15 -120Z" fill="#e2e8f0"/><path d="M-26 -2 L-28 8 L-14 8 L-16 -2Z" fill="#2a3040"/></g>' +
        '<g class="srb-r"><rect x="15" y="-120" width="12" height="118" fill="url(#rk_white)"/><path d="M15 -120 Q21 -138 27 -120Z" fill="#e2e8f0"/><path d="M16 -2 L14 8 L28 8 L26 -2Z" fill="#2a3040"/></g>' +
        '<path d="M-12 0 L-15 10 L15 10 L12 0Z" fill="#2a3040"/>' +
        '<rect x="-13" y="-170" width="26" height="170" fill="url(#rk_orange)"/>' +
        '<rect x="-11" y="-215" width="22" height="48" fill="url(#rk_white)"/><path d="M-11 -215 Q0 -245 11 -215Z" fill="url(#rk_white)"/>' +
        '<rect x="-13" y="-170" width="26" height="4" fill="#1e293b"/><rect x="-11" y="-215" width="22" height="4" fill="#ff5a36"/>';
    }
    return '<g transform="scale(' + s + ')">' + body + '</g>';
  }

  root.OO_ISO = { Scene: Scene, shipScene: shipScene, SLOTS: SLOTS, SLOT_OF: SLOT_OF, MOD: MOD, ease: ease, projectSlot: projectSlot,
    starfield: starfield, earthMarkup: earthMarkup, europaMarkup: europaMarkup, jupiterMarkup: jupiterMarkup, rocketMarkup: rocketMarkup, shade: shade };
})(window);
