/* GLIMMERDEEP landing hero: a tiny living sea.
   - Low-res canvas (~58k px) with integer pixel scale, DPR 1, palette + 4x4 Bayer dithering.
   - 30 fps cap. Pauses when the tab is hidden or the hero scrolls away. One static frame if reduced motion.
   - The Wick follows the cursor (autopilots on touch / when idle). Hold mouse or Shift to DIM.
   - Glimmers can be collected. An angler lure creeps toward a lit lamp and loses you when you dim.
*/
(function () {
  "use strict";
  var cv = document.getElementById("sea");
  if (!cv || !cv.getContext) return;
  var hero = cv.parentElement;
  var ctx = cv.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = false;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- palette (little-endian ABGR for Uint32Array writes) ----
  function P(h) { var n = parseInt(h.slice(1), 16); return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0; }
  var WATER = ["#050814", "#0a1024", "#0f1a36", "#16264a", "#1f3560", "#2a4a7a", "#3a6490", "#5286a8"].map(P);
  var WARM = ["#3a1c10", "#6a3418", "#a3561e", "#d98a2b", "#ffc46b", "#fff0c2"].map(P);
  var C = {
    foam: P("#e8e4f0"), glimL: P("#b8fff0"), glim: P("#5fe0c8"), glimD: P("#2fa08e"), kelp: P("#1a6a62"),
    pink: P("#ff6fa8"), flame: P("#fff0c2"), lamp: P("#ffc46b"), warn: P("#c93a4a"),
    rock0: P("#140f1a"), rock1: P("#231a2a"), rock2: P("#33263a"), rock3: P("#4a364c"), abyss: WATER[0]
  };
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(function (v) { return v / 16 - 0.5; });

  // ---- sprites ----
  // The Wick, facing right. 1 outline, 2/3 brass shade, h highlight, a ring, 4 lit glass, k kid, l lamp, L bulb.
  var WICK = [
    "...1111111....",
    "..12hhhh221...",
    ".12h33333221..",
    "1223a444a3221.",
    "123a44k44a32ll",
    "123a4kkk4a32lL",
    "1223a444a3221l",
    ".12233333221..",
    "..122222221...",
    "...1.111.1...."
  ];
  var WC = { "1": WARM[0], "2": WARM[1], "3": WARM[2], h: WARM[3], a: WARM[3], "4": WARM[4], k: WARM[1], l: WARM[4], L: WARM[5] };
  // Angler, facing right. b body, r rim, t teeth, e eye, s stalk. Drawn only where light reaches it.
  var ANG = (function () {
    var pts = [];
    for (var y = -9; y <= 9; y++) for (var x = -20; x <= 13; x++) {
      var body = (x * x) / 150 + (y * y) / 60 <= 1;
      var tail = x < -10 && x >= -20 && Math.abs(y) <= (-10 - x) * 0.75 && Math.abs(y) >= (-10 - x) * 0.1 - 1;
      var fin = x > -6 && x < 0 && y > 6 && y < 10 && (x + y) % 2 === 0;
      if (!(body || tail || fin)) continue;
      var mouth = x > 5 && y > -1 && y < 4 - (x > 9 ? 1 : 0);
      if (mouth) { if ((y === 0 || y === 3 - (x > 9 ? 1 : 0)) && x % 2 === 0) pts.push([x, y, "t"]); continue; }
      var top = !((x * x) / 150 + ((y - 1) * (y - 1)) / 60 <= 1) && body;
      pts.push([x, y, top ? "r" : "b"]);
    }
    pts.push([4, -4, "e"]);
    [[3, -9], [4, -10], [5, -11], [6, -12], [7, -12], [8, -12], [9, -11], [10, -10]].forEach(function (p) { pts.push([p[0], p[1], "s"]); });
    return pts;
  })();
  var LURE_OFF = [11, -9];
  // Moss's real Wick sprite sheet (24x18 frames: idle 0-3, swim 4-7, hurt 8-9). Falls back to the tiny procedural bell.
  var wickImg = new Image(), wickE = new Image(), useSprite = false;
  wickImg.onload = function () { useSprite = true; }; wickImg.src = "img/wick.png"; wickE.src = "img/wick_e.png";
  function lampOff() { return useSprite ? 11 : 7; }

  // ---- sizing: integer pixel scale, ~58k internal pixels ----
  var W, H, S, img, buf32, L, WM, heroW, heroH;
  function size() {
    heroW = hero.clientWidth; heroH = hero.clientHeight;
    S = Math.max(2, Math.round(Math.sqrt((heroW * heroH) / 58000)));
    W = Math.ceil(heroW / S); H = Math.ceil(heroH / S);
    cv.width = W; cv.height = H;
    cv.style.width = W * S + "px"; cv.style.height = H * S + "px";
    img = ctx.createImageData(W, H); buf32 = new Uint32Array(img.data.buffer);
    L = new Float32Array(W * H); WM = new Float32Array(W * H);
  }

  // ---- world ----
  function rnd(a, b) { return a + Math.random() * (b - a); }
  var wick, snow = [], glims = [], sparks = [], ang, pointer = { x: 0, y: 0, active: false, last: -1e9 }, dimHeld = false, t = 0, got = 0;
  function init() {
    wick = { x: W * 0.5, y: H * 0.8, vx: 0, vy: 0, face: 1, power: 1, boost: 0, hurt: 0 };
    snow = []; for (var i = 0; i < Math.round(W * H / 650); i++) snow.push({ x: rnd(0, W), y: rnd(0, H), v: rnd(1.5, 5), ph: rnd(0, 6.28), a: rnd(0.5, 2) });
    glims = []; for (var j = 0; j < 9; j++) glims.push(newGlim({}));
    var side = Math.random() < 0.5 ? -1 : 1;
    ang = { x: W * 0.5 + side * W * 0.45, y: H * 0.8, vx: 0, vy: 0, face: -side, homeX: W * 0.5 + side * W * 0.42, homeY: H * 0.82, retreat: 5, seen: 0 };
    pointer.x = wick.x; pointer.y = wick.y;
  }
  function newGlim(g) {
    var tries = 0;
    do { g.x = rnd(8, W - 8); g.y = rnd(H * 0.25, H - 10); tries++; }
    while (wick && Math.hypot(g.x - wick.x, g.y - wick.y) < 40 && tries < 20);
    g.ph = rnd(0, 6.28); g.dead = 0; g.dx = rnd(-1, 1); return g;
  }

  // ---- input ----
  function toLocal(e) { var r = hero.getBoundingClientRect(); return { x: (e.clientX - r.left) / S, y: (e.clientY - r.top) / S }; }
  hero.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    var p = toLocal(e); pointer.x = p.x; pointer.y = p.y; pointer.active = true; pointer.last = t;
    hint();
  }, { passive: true });
  hero.addEventListener("pointerdown", function (e) {
    var p = toLocal(e); pointer.x = p.x; pointer.y = p.y; pointer.active = true; pointer.last = t;
    if (e.pointerType === "mouse" && e.button === 0 && !e.target.closest("a,button")) dimHeld = true;
  }, { passive: true });
  window.addEventListener("pointerup", function () { dimHeld = false; }, { passive: true });
  window.addEventListener("keydown", function (e) { if (e.key === "Shift") dimHeld = true; });
  window.addEventListener("keyup", function (e) { if (e.key === "Shift") dimHeld = false; });
  window.addEventListener("blur", function () { dimHeld = false; });
  var hintEl = document.getElementById("heroHint"), hinted = false;
  function hint() { if (hinted || !hintEl) return; hinted = true; setTimeout(function () { hintEl.classList.add("gone"); }, 7000); }

  // ---- simulation ----
  function step(dt) {
    t += dt;
    var auto = !pointer.active || t - pointer.last > 5;
    var tx, ty;
    if (auto) { // lazy figure-eight patrol
      // stays mostly below/around the headline so the text stays readable
      tx = W * 0.5 + Math.sin(t * 0.16) * W * 0.4; ty = H * 0.8 + Math.sin(t * 0.32) * H * 0.07 - Math.pow(Math.abs(Math.sin(t * 0.16)), 3) * H * 0.35;
    } else { tx = pointer.x; ty = pointer.y; }
    // spring toward target, water drag (the Wick has inertia, like in the game)
    var ax = (tx - wick.x) * 2.2, ay = (ty - wick.y) * 2.2;
    wick.vx = (wick.vx + ax * dt) * Math.pow(0.18, dt); wick.vy = (wick.vy + ay * dt) * Math.pow(0.18, dt);
    var sp = Math.hypot(wick.vx, wick.vy), max = 70; if (sp > max) { wick.vx *= max / sp; wick.vy *= max / sp; }
    wick.x += wick.vx * dt; wick.y += wick.vy * dt + Math.sin(t * 2) * 0.04;
    wick.x = Math.max(8, Math.min(W - 8, wick.x)); wick.y = Math.max(8, Math.min(H - 6, wick.y));
    if (wick.vx > 4) wick.face = 1; else if (wick.vx < -4) wick.face = -1;
    var angD = Math.hypot(ang.x - wick.x, ang.y - wick.y);
    var wantDim = dimHeld || (auto && angD < 60 && ang.retreat <= 0);
    wick.power += ((wantDim ? 0.22 : 1) - wick.power) * Math.min(1, dt * 5);
    wick.boost = Math.max(0, wick.boost - dt * 0.6); wick.hurt = Math.max(0, wick.hurt - dt);

    // glimmers
    var lx = wick.x + wick.face * lampOff(), ly = wick.y;
    for (var i = 0; i < glims.length; i++) {
      var g = glims[i];
      if (g.dead > 0) { g.dead -= dt; if (g.dead <= 0) newGlim(g); continue; }
      g.ph += dt * 2.2; g.x += Math.sin(g.ph * 0.3) * dt * 1.2 + g.dx * dt * 0.6; g.y += Math.cos(g.ph * 0.23) * dt * 1.1;
      if (g.x < 4 || g.x > W - 4) g.dx = -g.dx;
      if (Math.hypot(g.x - wick.x, g.y - wick.y) < 8) {
        g.dead = 3.5; got++; wick.boost = Math.min(0.5, wick.boost + 0.35);
        for (var k = 0; k < 8; k++) { var a = k / 8 * 6.283; sparks.push({ x: g.x, y: g.y, vx: Math.cos(a) * 26, vy: Math.sin(a) * 26, life: 0.5 }); }
      }
    }
    for (var s = sparks.length - 1; s >= 0; s--) { var p = sparks[s]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; p.life -= dt; if (p.life <= 0) sparks.splice(s, 1); }

    // marine snow
    for (var n = 0; n < snow.length; n++) {
      var f = snow[n]; f.y += f.v * dt; f.x += Math.sin(t * 0.8 + f.ph) * f.a * dt - wick.vx * dt * 0.02;
      if (f.y > H) { f.y = -1; f.x = rnd(0, W); } if (f.x < 0) f.x += W; if (f.x > W) f.x -= W;
    }

    // angler: hunts by light, loses you in darkness
    var lureX = ang.x + ang.face * LURE_OFF[0], lureY = ang.y + LURE_OFF[1];
    var sight = 20 + 120 * wick.power * wick.power;
    var dL = Math.hypot(lx - lureX, ly - lureY);
    var gx, gy, spd;
    if (ang.retreat > 0) { ang.retreat -= dt; gx = ang.homeX; gy = ang.homeY; spd = 14; }
    else if (dL < sight) { gx = wick.x - ang.face * 14; gy = wick.y + 4; spd = 10 * (0.6 + wick.power * 0.4); ang.seen = Math.min(1, ang.seen + dt); }
    else { ang.seen = Math.max(0, ang.seen - dt * 0.5); gx = ang.homeX + Math.sin(t * 0.13) * 30; gy = ang.homeY + Math.sin(t * 0.31) * 8; spd = 5; }
    var dx = gx - ang.x, dy = gy - ang.y, dd = Math.hypot(dx, dy) || 1;
    ang.vx += (dx / dd * spd - ang.vx) * Math.min(1, dt * 1.2); ang.vy += (dy / dd * spd - ang.vy) * Math.min(1, dt * 1.2);
    ang.x += ang.vx * dt; ang.y += ang.vy * dt + Math.sin(t * 1.3) * 0.03;
    if (Math.abs(ang.vx) > 1.5) ang.face = ang.vx > 0 ? 1 : -1;
    var mouthX = ang.x + ang.face * 10;
    if (ang.retreat <= 0 && Math.hypot(mouthX - wick.x, ang.y + 1 - wick.y) < 9) {
      wick.hurt = 0.6; wick.vx += -ang.face * 60; ang.retreat = 7;
      ang.homeX = wick.x < W / 2 ? W * 0.9 : W * 0.1; ang.homeY = H * rnd(0.72, 0.9);
    }
  }

  // ---- render ----
  function addLight(cx, cy, r, amt, warm) {
    var x0 = Math.max(0, (cx - r) | 0), x1 = Math.min(W - 1, (cx + r) | 0), y0 = Math.max(0, (cy - r) | 0), y1 = Math.min(H - 1, (cy + r) | 0);
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var d = Math.hypot(x - cx, (y - cy) * 1.1) / r; if (d >= 1) continue;
      var v = (1 - d); v *= v * amt; var i = y * W + x; L[i] += v; if (warm) WM[i] += v * warm;
    }
  }
  function addCone(cx, cy, dir, len, amt) {
    var x0 = dir > 0 ? cx : cx - len, x1 = dir > 0 ? cx + len : cx, y0 = cy - len * 0.55, y1 = cy + len * 0.55;
    x0 = Math.max(0, x0 | 0); x1 = Math.min(W - 1, x1 | 0); y0 = Math.max(0, y0 | 0); y1 = Math.min(H - 1, y1 | 0);
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var fx = (x - cx) * dir; if (fx <= 0) continue;
      var d = Math.hypot(fx, y - cy); if (d > len) continue;
      var ang = Math.abs(y - cy) / (fx + 6); if (ang > 0.5) continue;
      var v = (1 - d / len) * (1 - ang / 0.5); v = v * v * amt; var i = y * W + x; L[i] += v; WM[i] += v * 0.35;
    }
  }
  function put(x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H) buf32[y * W + x] = c; }
  function lightAt(x, y) { x |= 0; y |= 0; return (x >= 0 && y >= 0 && x < W && y < H) ? L[y * W + x] : 0; }

  function render() {
    var x, y, i;
    // ambient: faint surface light fading with depth, slow god-rays near the top
    for (y = 0; y < H; y++) {
      var dep = y / H, amb = 0.46 * Math.pow(1 - dep, 2.3), rayK = 0.2 * Math.pow(1 - dep, 1.6);
      for (x = 0; x < W; x++) {
        i = y * W + x;
        var r = Math.sin((x + y * 0.55) * 0.075 + t * 0.25) * Math.sin((x - y * 0.25) * 0.029 - t * 0.12);
        L[i] = amb + (r > 0 ? r * rayK : 0); WM[i] = 0;
      }
    }
    var pw = wick.power + wick.boost, lx = wick.x + wick.face * lampOff(), ly = wick.y;
    addLight(lx, ly, 12 + 34 * pw, 1.05 * Math.min(1.3, pw + 0.15), 0.95);
    if (pw > 0.35) addCone(lx, ly, wick.face, 34 + 56 * pw, 0.8 * pw);
    for (i = 0; i < glims.length; i++) { var g = glims[i]; if (g.dead <= 0) addLight(g.x, g.y, 7, 0.28 + 0.1 * Math.sin(g.ph), 0); }
    var lureX = ang.x + ang.face * LURE_OFF[0], lureY = ang.y + LURE_OFF[1], lp = 0.75 + 0.25 * Math.sin(t * 3.1);
    addLight(lureX, lureY, 9, 0.3 * lp, 0);

    // quantize with ordered dithering
    for (y = 0; y < H; y++) {
      var brow = (y & 3) << 2;
      for (x = 0; x < W; x++) {
        i = y * W + x; var th = BAYER[brow | (x & 3)], w = WM[i];
        if (w + th * 0.3 > 0.68) { var wi = 2 + Math.floor((w - 0.68) / 0.4 * 3.4 + th); buf32[i] = WARM[wi < 2 ? 2 : wi > 5 ? 5 : wi]; }
        else { var li = Math.floor(L[i] * 7.2 + th); buf32[i] = WATER[li < 0 ? 0 : li > 7 ? 7 : li]; }
      }
    }

    // marine snow: only really visible where there's light
    for (i = 0; i < snow.length; i++) {
      var f = snow[i], lv = lightAt(f.x, f.y);
      if (lv > 0.55) put(f.x, f.y, C.foam); else if (lv > 0.25) put(f.x, f.y, WATER[7]); else if (lv > 0.1) put(f.x, f.y, WATER[5]); else put(f.x, f.y, WATER[3]);
    }

    // angler: a silhouette you only see when light touches it
    for (i = 0; i < ANG.length; i++) {
      var a = ANG[i], ax = ang.x + a[0] * ang.face, ay = ang.y + a[1], la = lightAt(ax, ay), k = a[2], col;
      if (k === "e") col = la > 0.2 ? C.foam : WATER[5];
      else if (k === "t") col = la > 0.3 ? C.foam : la > 0.12 ? WATER[6] : C.abyss;
      else if (k === "s") col = la > 0.35 ? C.rock3 : C.rock1;
      else if (k === "r") col = la > 0.5 ? C.rock3 : la > 0.28 ? C.rock2 : C.abyss;
      else col = la > 0.5 ? C.rock2 : la > 0.28 ? C.rock1 : C.abyss;
      put(ax, ay, col);
    }
    put(lureX, lureY, lp > 0.8 ? C.flame : C.pink); put(lureX - 1, lureY, C.pink); put(lureX + 1, lureY, C.pink); put(lureX, lureY - 1, C.pink); put(lureX, lureY + 1, C.pink);

    // glimmers
    for (i = 0; i < glims.length; i++) {
      var q = glims[i]; if (q.dead > 0) continue;
      var pulse = 0.5 + 0.5 * Math.sin(q.ph);
      put(q.x, q.y, pulse > 0.3 ? C.glimL : C.glim);
      if (pulse > 0.45) { var arm = pulse > 0.8 ? C.glim : C.glimD; put(q.x - 1, q.y, arm); put(q.x + 1, q.y, arm); put(q.x, q.y - 1, arm); put(q.x, q.y + 1, arm); }
      if (pulse > 0.9) { put(q.x - 2, q.y, C.kelp); put(q.x + 2, q.y, C.kelp); put(q.x, q.y - 2, C.kelp); put(q.x, q.y + 2, C.kelp); }
    }
    for (i = 0; i < sparks.length; i++) put(sparks[i].x, sparks[i].y, sparks[i].life > 0.25 ? C.glimL : C.glim);

    // the Wick (procedural fallback; the sprite is drawn after putImageData)
    if (!useSprite) {
    var shake = wick.hurt > 0 ? ((t * 40) | 0) % 2 : 0, ox = Math.round(wick.x) - 6 + shake, oy = Math.round(wick.y) - 5;
    for (y = 0; y < WICK.length; y++) {
      var row = WICK[y];
      for (x = 0; x < row.length; x++) {
        var ch = row[x], c = WC[ch]; if (!c) continue;
        if (ch === "L" || ch === "l") { if (wick.power < 0.5 && ch === "L") c = WARM[3]; }
        if (wick.hurt > 0 && ch === "1" && ((t * 12) | 0) % 2) c = C.warn;
        put(wick.face > 0 ? ox + x : ox + 12 - x, oy + y, c);
      }
    }
    }
    // a couple of bubbles trailing the Wick
    var bx = wick.x - wick.face * (useSprite ? 13 : 8), by = wick.y - 3 - ((t * 9) % 10);
    if (lightAt(bx, by) > 0.2) put(bx + Math.sin(t * 5), by, WATER[7]);

    ctx.putImageData(img, 0, 0);
    if (useSprite) {
      var moving = Math.hypot(wick.vx, wick.vy) > 12;
      var fr = wick.hurt > 0 ? 8 + (((t * 12) | 0) % 2) : moving ? 4 + (((t * 10) | 0) % 4) : ((t * 6) | 0) % 4;
      var sx = Math.round(wick.x) + (wick.hurt > 0 ? ((t * 40) | 0) % 2 : 0), sy = Math.round(wick.y);
      ctx.save(); ctx.translate(sx, sy); if (wick.face < 0) ctx.scale(-1, 1);
      ctx.drawImage(wickImg, fr * 24, 0, 24, 18, -12, -9, 24, 18);
      if (wickE.complete && wickE.naturalWidth) ctx.drawImage(wickE, fr * 24, 0, 24, 18, -12, -9, 24, 18);
      ctx.restore();
    }
  }

  // ---- loop: 30 fps cap, pause when hidden / offscreen ----
  var running = false, visible = true, last = 0, acc = 0, raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!last) last = now;
    var el = now - last; if (el < 32) return; // ~30 fps
    last = now; var dt = Math.min(0.1, el / 1000);
    step(dt); render();
  }
  function start() { if (running || reduce) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function sync() { if (visible && !document.hidden) start(); else stop(); }
  document.addEventListener("visibilitychange", sync);
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; sync(); }).observe(hero);

  var rt; window.addEventListener("resize", function () {
    clearTimeout(rt); rt = setTimeout(function () {
      var ow = W, oh = H; size();
      if (wick) { wick.x *= W / ow; wick.y *= H / oh; ang.x *= W / ow; ang.y *= H / oh; ang.homeX *= W / ow; ang.homeY *= H / oh; glims.forEach(function (g) { if (g.x > W || g.y > H) newGlim(g); }); snow.forEach(function (f) { f.x %= W; f.y %= H; }); }
      render();
    }, 150);
  });

  size(); init();
  if (reduce) { t = 4; step(0.001); render(); } else { render(); sync(); }
  window.__glimmerHero = { get collected() { return got; }, state: function () { return { W: W, H: H, S: S, wick: wick, ang: ang }; } };
})();
