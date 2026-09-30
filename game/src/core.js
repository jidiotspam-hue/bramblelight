// GLIMMERDEEP — core: globals, constants, input, assets (with procedural fallbacks), tiny bitmap font.
'use strict';
window.GD = window.GD || {};
GD.zones = GD.zones || [];
GD.zone = def => { GD.zones[def.id - 1] = def; };

const VW = 480, VH = 270, TILE = 16;
const K = {
  accel: 420, drag: 2.2, maxSpeed: 82, airGravity: 380,
  oilMax: 100, drain: { bright: 1.9, low: 0.85, dim: 0.12 },
  lampRadius: { bright: 175, low: 124, dim: 36 },
  lampCone: { bright: 0.62, low: 0.72, dim: -1 },
  sight: { bright: 16 * TILE, low: 9 * TILE, dim: 2.5 * TILE },
  hullMax: 3, flareBurn: 9, pingSpeed: 260, pingLife: 2.4
};
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const hexRgb = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

// ---------------- input ----------------
const Input = {
  down: new Set(), pressed: new Set(), pad: null,
  init() {
    addEventListener('keydown', e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    addEventListener('keyup', e => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
  },
  poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = pads && [...pads].find(Boolean);
    const prev = this.pad;
    this.pad = p ? { ax: p.axes[0] || 0, ay: p.axes[1] || 0, b: p.buttons.map(b => b.pressed) } : null;
    if (this.pad) {
      const map = { 0: 'Space', 1: 'KeyE', 2: 'KeyQ', 3: 'KeyR', 9: 'Escape', 6: 'ShiftLeft', 7: 'KeyQ', 4: 'ShiftLeft', 5: 'KeyQ' };
      for (const i in map) { const now = this.pad.b[i], was = prev && prev.b[i]; if (now && !was) this.pressed.add(map[i]); }
    }
  },
  held(...codes) { return codes.some(c => this.down.has(c)) || (this.pad && codes.includes('ShiftLeft') && (this.pad.b[6] || this.pad.b[4])); },
  hit(...codes) { return codes.some(c => this.pressed.has(c)); },
  any() { return this.pressed.size > 0; },
  axis() {
    let x = 0, y = 0;
    if (this.held('ArrowLeft', 'KeyA')) x -= 1; if (this.held('ArrowRight', 'KeyD')) x += 1;
    if (this.held('ArrowUp', 'KeyW')) y -= 1; if (this.held('ArrowDown', 'KeyS')) y += 1;
    if (this.pad) { if (Math.abs(this.pad.ax) > 0.2) x = this.pad.ax; if (Math.abs(this.pad.ay) > 0.2) y = this.pad.ay; if (this.pad.b[14]) x = -1; if (this.pad.b[15]) x = 1; if (this.pad.b[12]) y = -1; if (this.pad.b[13]) y = 1; }
    if (this.touch) { x = this.touch.x || x; y = this.touch.y || y; }
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    return { x, y };
  },
  endFrame() { this.pressed.clear(); }
};

// ---------------- assets ----------------
const Assets = {
  manifest: null, sprites: {}, tiles: {}, bg: {}, ui: {}, uiImg: null, logo: null, logoE: null, palette: null,
  async load() {
    const bust = '?v=' + (window.GLIMMER_BUILD || Date.now());
    try { this.manifest = await (await fetch('assets/manifest.json' + bust)).json(); } catch (e) { this.manifest = { sprites: {} }; console.warn('manifest missing, using placeholders'); }
    const img = src => new Promise(res => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = 'assets/' + src + bust; });
    const M = this.manifest, jobs = [];
    for (const [name, s] of Object.entries(M.sprites || {})) jobs.push((async () => {
      const [a, e] = await Promise.all([img(s.file), img(s.emissive)]);
      if (a) this.sprites[name] = { ...s, img: a, eimg: e };
    })());
    for (const [z, f] of Object.entries(M.tiles || {})) jobs.push(img(typeof f === 'string' ? f : f.file).then(i => { if (i) this.tiles[z] = i; }));
    for (const [z, layers] of Object.entries(M.bg || {})) jobs.push(Promise.all(layers.map(l => img(l.file).then(i => i && { ...l, img: i }))).then(ls => { this.bg[z] = ls.filter(Boolean); }));
    if (M.ui && M.ui.file) { jobs.push(img(M.ui.file).then(i => { this.uiImg = i; this.ui = M.ui.frames || {}; })); }
    else if (M.ui && typeof M.ui === 'object') { jobs.push(img(M.ui_file || 'ui.png').then(i => { this.uiImg = i; this.ui = M.ui.frames || M.ui; })); }
    if (M.logo) jobs.push(Promise.all([img(M.logo.file), img(M.logo.emissive)]).then(([a, e]) => { this.logo = a; this.logoE = e; }));
    if (M.ending) jobs.push(Promise.all([img(M.ending.file), img(M.ending.emissive)]).then(([a, e]) => { if (a) this.ending = { img: a, eimg: e, lamp: M.ending.lamp || [115, 58] }; }));
    await Promise.all(jobs);
    Placeholders.fill(this);
  },
  spr(name) { return this.sprites[name]; }
};

// Draw a sprite frame: albedo into ctx, emissive into ectx (if the sheet has one).
function drawSprite(ctx, ectx, name, anim, t, x, y, flip = false, opts = {}) {
  const s = Assets.sprites[name]; if (!s) return;
  let frames = s.anims && s.anims[anim] ? s.anims[anim] : null;
  if (!frames && s.anims) frames = Object.values(s.anims)[0];
  let fi = 0;
  if (frames) {
    const list = frames.frames || [0], fps = frames.fps || 6;
    fi = opts.frame !== undefined ? list[opts.frame % list.length] : list[Math.floor(t * fps) % list.length];
  }
  const fw = s.fw, fh = s.fh, ox = s.ox ?? fw / 2, oy = s.oy ?? fh / 2;
  const dx = Math.round(x - (flip ? fw - ox : ox)), dy = Math.round(y - oy);
  const draw = (c, im, alpha) => {
    if (!c || !im) return;
    c.save(); if (alpha !== undefined) c.globalAlpha = alpha;
    if (flip) { c.translate(dx + fw, dy); c.scale(-1, 1); c.drawImage(im, fi * fw, 0, fw, fh, 0, 0, fw, fh); }
    else c.drawImage(im, fi * fw, 0, fw, fh, dx, dy, fw, fh);
    c.restore();
  };
  draw(ctx, s.img, opts.alpha);
  if (opts.noEmit !== true) draw(ectx, s.eimg, opts.emitAlpha ?? opts.alpha);
}

// ---------------- procedural placeholders (used until Moss's art lands) ----------------
const Placeholders = {
  sheet(fw, fh, n, fn) {
    const a = document.createElement('canvas'); a.width = fw * n; a.height = fh;
    const e = document.createElement('canvas'); e.width = fw * n; e.height = fh;
    const ac = a.getContext('2d'), ec = e.getContext('2d');
    for (let i = 0; i < n; i++) { ac.save(); ec.save(); ac.translate(i * fw, 0); ec.translate(i * fw, 0); fn(ac, ec, i); ac.restore(); ec.restore(); }
    return { img: a, eimg: e };
  },
  fill(A) {
    const P = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const add = (name, fw, fh, anims, fn, ox, oy) => {
      if (A.sprites[name]) return;
      const n = Math.max(...Object.values(anims).flatMap(a => a.frames)) + 1;
      A.sprites[name] = { fw, fh, ox: ox ?? fw / 2, oy: oy ?? fh / 2, anims, ...this.sheet(fw, fh, n, fn), placeholder: true };
    };
    add('wick', 24, 18, { idle: { frames: [0, 1, 2, 3], fps: 6 }, swim: { frames: [4, 5, 6, 7], fps: 10 }, hurt: { frames: [8, 9], fps: 12 } }, (c, e, i) => {
      const b = (i % 4 === 1 || i % 4 === 2) ? 1 : 0;
      P(c, 5, 3 + b, 14, 12, '#a3561e'); P(c, 4, 5 + b, 16, 8, '#d98a2b'); P(c, 6, 3 + b, 12, 1, '#ffc46b');
      P(c, 8, 6 + b, 6, 6, '#3a1c10'); P(c, 9, 7 + b, 4, 4, '#1f3560'); P(c, 20, 8 + b, 3, 3, '#6a3418');
      P(c, 2, 7 + b, 2, 4, '#6a3418'); if (i >= 4 && i < 8) P(c, 0, 8 + b + (i % 2), 2, 2, '#b8fff0');
      P(e, 10, 8 + b, 2, 2, '#ffc46b'); P(e, 21, 9 + b, 2, 1, '#fff0c2');
      if (i >= 8) { c.globalCompositeOperation = 'source-atop'; P(c, 0, 0, 24, 18, 'rgba(255,80,80,0.5)'); }
    });
    add('angler', 40, 28, { swim: { frames: [0, 1, 2, 3, 4, 5], fps: 8 }, chase: { frames: [0, 1, 2, 3], fps: 14 }, bite: { frames: [6, 7, 8, 9], fps: 12 } }, (c, e, i) => {
      const t = Math.sin(i) * 1.5, open = i >= 6 ? 3 : 0;
      P(c, 8, 8, 24, 14, '#231a2a'); P(c, 6, 10, 28, 10, '#33263a'); P(c, 0, 10 + t, 7, 8, '#231a2a');
      P(c, 30, 12, 8, 3 + open, '#140f1a'); for (let k = 0; k < 4; k++) P(c, 31 + k * 2, 15, 1, 2 + open, '#e8e4f0');
      P(c, 27, 11, 2, 2, '#e8e4f0'); P(c, 22, 4, 1, 5, '#4a364c'); P(c, 23, 2, 8, 1, '#4a364c'); P(c, 31, 1, 3, 3, '#b8fff0');
      P(e, 31, 1, 3, 3, '#b8fff0'); P(e, 27, 11, 1, 1, '#5fe0c8');
    });
    add('jelly', 16, 24, { drift: { frames: [0, 1, 2, 3, 4, 5], fps: 6 } }, (c, e, i) => {
      const s = [0, 1, 2, 1, 0, -1][i];
      P(c, 3 - s / 2, 2, 10 + s, 7, '#9a3a8a'); P(c, 4, 1, 8, 1, '#ff6fa8');
      for (let k = 0; k < 4; k++) P(c, 4 + k * 2 + ((i + k) % 2), 9, 1, 10 + (k % 2) * 3, '#4a1a4a');
      P(e, 4, 2, 8, 5, '#ff6fa8'); for (let k = 0; k < 4; k++) P(e, 4 + k * 2 + ((i + k) % 2), 11 + k % 3, 1, 3, '#9a3a8a');
    });
    add('eel_head', 24, 14, { hide: { frames: [0, 1], fps: 2 }, lunge: { frames: [2, 3, 4], fps: 10 } }, (c, e, i) => {
      const o = i >= 2 ? (i - 1) : 0;
      P(c, 0, 4, 18, 7, '#1a6a62'); P(c, 16, 3, 7, 8, '#0e3a3a'); P(c, 18, 9, 6, 1 + o, '#140f1a'); P(c, 19, 5, 2, 2, '#e8e4f0'); P(e, 19, 5, 1, 1, '#ffc46b');
    });
    add('eel_body', 10, 10, { body: { frames: [0], fps: 1 } }, c => { P(c, 0, 2, 10, 6, '#1a6a62'); P(c, 0, 2, 10, 1, '#2fa08e'); });
    add('urchin', 16, 16, { idle: { frames: [0, 1], fps: 3 } }, (c, e, i) => {
      P(c, 4, 6, 8, 8, '#140f1a'); for (let a = 0; a < 8; a++) { const ang = a / 8 * Math.PI * 2 + i * 0.2; P(c, 8 + Math.cos(ang) * 6, 10 + Math.sin(ang) * 5, 1, 1, '#4a364c'); }
    }, 8, 12);
    add('lanternfish', 8, 5, { swim: { frames: [0, 1, 2, 3], fps: 10 } }, (c, e, i) => { P(c, 1, 1, 6, 3, '#2a4a7a'); P(c, 0, 1 + (i % 2), 1, 2, '#2a4a7a'); P(e, 3, 3, 1, 1, '#b8fff0'); P(e, 5, 3, 1, 1, '#b8fff0'); });
    add('glimmer', 8, 8, { pulse: { frames: [0, 1, 2, 3, 4, 5], fps: 8 } }, (c, e, i) => { const r = [1, 2, 2, 3, 2, 2][i]; P(e, 4 - r / 2, 4 - r / 2, r, r, '#b8fff0'); P(e, 3, 4, 2, 1, '#5fe0c8'); P(e, 4, 3, 1, 2, '#5fe0c8'); });
    add('glimmer_big', 16, 16, { pulse: { frames: [0, 1, 2, 3, 4, 5], fps: 8 } }, (c, e, i) => { for (let k = 0; k < 5; k++) { const a = k * 1.3 + i * 0.3; P(e, 8 + Math.cos(a) * 4, 8 + Math.sin(a) * 4, 2, 2, k % 2 ? '#b8fff0' : '#5fe0c8'); } P(e, 7, 7, 2, 2, '#fff0c2'); });
    add('flare', 6, 6, { burn: { frames: [0, 1], fps: 12 } }, (c, e, i) => { P(c, 2, 1, 2, 4, '#c93a4a'); P(e, 1 + i, 0, 3, 3, '#fff0c2'); P(e, 2, 1, 2, 2, '#ff6fa8'); });
    add('crate', 16, 14, { idle: { frames: [0], fps: 1 } }, c => { P(c, 1, 2, 14, 11, '#6a3418'); P(c, 1, 2, 14, 1, '#a3561e'); P(c, 5, 6, 6, 3, '#c93a4a'); });
    add('patch', 12, 12, { idle: { frames: [0], fps: 1 } }, c => { P(c, 2, 2, 8, 8, '#a3561e'); P(c, 3, 3, 6, 6, '#d98a2b'); P(c, 5, 3, 2, 6, '#e8e4f0'); P(c, 3, 5, 6, 2, '#e8e4f0'); });
    add('buoy', 16, 32, { off: { frames: [0], fps: 1 }, on: { frames: [1, 2, 3, 4], fps: 8 } }, (c, e, i) => {
      P(c, 7, 12, 2, 20, '#4a364c'); P(c, 3, 6, 10, 8, '#c93a4a'); P(c, 3, 6, 10, 2, '#e8e4f0'); P(c, 5, 2, 6, 4, '#33263a');
      if (i) { P(e, 6, 3 - (i % 2), 4, 3 + (i % 2), '#ffc46b'); P(e, 7, 3, 2, 2, '#fff0c2'); }
    }, 8, 30);
    add('bottle', 10, 12, { bob: { frames: [0, 1, 2, 3], fps: 4 } }, (c, e, i) => { const b = i === 1 || i === 2 ? 1 : 0; P(c, 3, 3 + b, 5, 8, '#2fa08e'); P(c, 4, 1 + b, 3, 2, '#a3561e'); P(c, 4, 5 + b, 3, 4, '#e8e4f0'); P(e, 4, 6 + b, 2, 2, '#fff0c2'); });
    add('kelp', 16, 48, { a: { frames: [0, 1, 2, 3], fps: 3 }, b: { frames: [4, 5, 6, 7], fps: 3 }, c: { frames: [8, 9, 10, 11], fps: 3 } }, (c, e, i) => {
      for (let y = 0; y < 48; y++) { const s = Math.sin(y * 0.18 + i * 1.57) * (48 - y) / 16; P(c, 7 + s, y, 2, 1, '#1a6a62'); if (y % 7 === 3) P(c, 8 + s, y, 4, 2, '#2fa08e'); if (y % 7 === 0) P(c, 4 + s, y, 4, 2, '#1a6a62'); }
    }, 8, 48);
    add('coral', 16, 16, { v: { frames: [0, 1, 2, 3, 4, 5], fps: 0.001 } }, (c, e, i) => { const col = ['#c93a4a', '#ff6fa8', '#d98a2b', '#9a3a8a', '#2fa08e', '#e8e4f0'][i]; for (let k = 0; k < 5; k++) P(c, 3 + k * 2, 16 - 4 - (k * 5 + i) % 9, 2, 12, col); }, 8, 16);
    add('ruin', 32, 32, { v: { frames: [0, 1, 2, 3, 4, 5], fps: 0.001 } }, (c, e, i) => { P(c, 8, 4, 16, 28, '#4a364c'); P(c, 6, 2, 20, 4, '#634a5e'); P(c, 10, 8 + i * 2, 12, 2, '#33263a'); }, 16, 32);
    add('bones', 32, 16, { v: { frames: [0, 1, 2], fps: 0.001 } }, (c, e, i) => { for (let k = 0; k < 6; k++) P(c, 3 + k * 4, 6 + (k % 2) * 2, 2, 8 - (k % 3), '#e8e4f0'); P(c, 2, 13, 28, 2, '#a08494'); }, 16, 16);
    add('vent', 16, 16, { puff: { frames: [0, 1, 2, 3], fps: 8 } }, (c, e, i) => { P(c, 2, 10, 12, 6, '#33263a'); P(c, 5, 9, 6, 2, '#140f1a'); P(c, 7, 6 - i, 2, 2, '#5286a8'); }, 8, 16);
    add('whale', 320, 160, { idle: { frames: [0, 1, 2, 3], fps: 1.5 } }, (c, e, i) => {
      c.fillStyle = '#16264a'; c.beginPath(); c.ellipse(160, 84 + (i % 2), 140, 50, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#1f3560'; c.beginPath(); c.ellipse(160, 72 + (i % 2), 120, 30, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#0f1a36'; c.beginPath(); c.moveTo(20, 84); c.lineTo(0, 50 - i * 3); c.lineTo(8, 84); c.lineTo(0, 118 + i * 3); c.fill();
      P(c, 270, 72, 6, 6, '#e8e4f0'); P(c, 271, 73, 4, 4, '#050814');
      for (let k = 0; k < 60; k++) { const x = 40 + hash(k, 1) * 230, y = 50 + hash(k, 2) * 70; P(e, x, y, 1 + (k % 3 === 0), 1, ['#b8fff0', '#ffc46b', '#ff6fa8', '#5fe0c8'][k % 4]); }
    });
    add('flame', 16, 24, { burn: { frames: [0, 1, 2, 3, 4, 5], fps: 10 } }, (c, e, i) => { const s = Math.sin(i) * 1.5; P(e, 5, 8 + s, 6, 14, '#d98a2b'); P(e, 6, 5 - s, 4, 16, '#ffc46b'); P(e, 7, 10, 2, 10, '#fff0c2'); });
    // tiles
    for (let z = 1; z <= 5; z++) if (!A.tiles[z]) A.tiles[z] = this.tileset(z);
  },
  tileset(z) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 48; const c = cv.getContext('2d');
    const pal = [['#4a364c', '#634a5e', '#7e6474'], ['#1a6a62', '#2fa08e', '#5fe0c8'], ['#231a2a', '#33263a', '#4a364c'], ['#33263a', '#4a364c', '#634a5e'], ['#140f1a', '#231a2a', '#33263a']][z - 1];
    const alt = [['#c93a4a', '#ff6fa8'], ['#0e3a3a', '#1a6a62'], ['#16264a', '#1f3560'], ['#6a3418', '#a3561e'], ['#1f3560', '#5286a8']][z - 1];
    for (let row = 0; row < 3; row++) for (let m = 0; m < 16; m++) {
      const x0 = m * 16, y0 = row * 16; const base = row === 1 ? alt[0] : pal[0];
      c.fillStyle = base; c.fillRect(x0, y0, 16, 16);
      for (let k = 0; k < 10; k++) { c.fillStyle = row === 1 ? alt[1] : pal[1]; c.fillRect(x0 + ((hash(m + row * 16, k) * 14) | 0), y0 + ((hash(k, m + row) * 14) | 0), 2, 1); }
      if (row < 2) {
        const hi = row === 1 ? alt[1] : pal[2];
        if (!(m & 1)) { c.fillStyle = hi; c.fillRect(x0, y0, 16, 2); }
        if (!(m & 2)) { c.fillStyle = hi; c.fillRect(x0 + 15, y0, 1, 16); }
        if (!(m & 8)) { c.fillStyle = hi; c.fillRect(x0, y0, 1, 16); }
        if (!(m & 4)) { c.fillStyle = '#140f1a'; c.fillRect(x0, y0 + 15, 16, 1); }
      }
    }
    return cv;
  }
};

// ---------------- 3x5 bitmap font for the HUD ----------------
const FONT = {
  A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',P:'110101110100100',Q:'010101101110011',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',Z:'111001010100111',
  '0':'111101101101111','1':'010110010010111','2':'110001010100111','3':'110001010001110','4':'101101111001001','5':'111100110001110','6':'011100111101111','7':'111001010010010','8':'111101111101111','9':'111101111001110',
  ':':'000010000010000','.':'000000000000010','-':'000000111000000','!':'010010010000010','?':'110001010000010',' ':'000000000000000','+':'000010111010000','/':'001001010100100','%':'101001010100101','x':'000101010101000'
};
function pixText(c, s, x, y, col, shadow = '#050814') {
  s = String(s);
  const draw = (ox, oy, cc) => { c.fillStyle = cc; let X = x + ox; for (const ch0 of s) { const ch = FONT[ch0] ? ch0 : ch0.toUpperCase(); const f = FONT[ch] || FONT['?']; for (let i = 0; i < 15; i++) if (f[i] === '1') c.fillRect(X + (i % 3), y + oy + ((i / 3) | 0), 1, 1); X += 4; } };
  if (shadow) draw(1, 1, shadow);
  draw(0, 0, col);
}
const pixTextW = s => String(s).length * 4 - 1;
