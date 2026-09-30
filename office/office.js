// Bramblelight Studio — pixel office. 320x180, drawn with rects, lit per-pixel with ordered dithering.
(() => {
'use strict';
const W = 320, H = 180;
const cv = document.getElementById('c');
const g = cv.getContext('2d');
g.imageSmoothingEnabled = false;
const shade = g.createImageData(W, H);

// ---------- tiny helpers ----------
let ctx = g;
const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); };
const rnd = (a => () => (a = (a * 1664525 + 1013904223) >>> 0) / 4294967296)(7);
const FONT = {
  A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',
  F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',
  K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',
  P:'110101110100100',Q:'010101101110011',R:'110101110101101',S:'011100010001110',T:'111010010010010',
  U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',
  Z:'111001010100111','0':'111101101101111','1':'010110010010111','2':'110001010100111','3':'110001010001110',
  '4':'101101111001001','5':'111100110001110','6':'011100111101111','7':'111001010010010','8':'111101111101111',
  '9':'111101111001110',':':'000010000010000','.':'000000000000010','-':'000000111000000','!':'010010010000010',
  '?':'110001010000010',' ':'000000000000000','+':'000010111010000','/':'001001010100100'
};
function text(s, x, y, c) {
  s = String(s).toUpperCase();
  for (const ch of s) {
    const f = FONT[ch] || FONT['?'];
    for (let i = 0; i < 15; i++) if (f[i] === '1') px(x + (i % 3), y + ((i / 3) | 0), 1, 1, c);
    x += 4;
  }
}
const textW = s => String(s).length * 4 - 1;
function disc(cx, cy, r, c) { for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.6)); px(cx - w, cy + y, w * 2 + 1, 1, c); } }

// ---------- staff ----------
const STAFF = {
  opal: { name:'Opal', role:'Studio head · code', model:'Opus', skin:'#f1c7a5', hair:'#c9b6ff', hairD:'#9a84e0', style:'short',
          shirt:'#2f8f8a', shirtD:'#236d69', pants:'#2b2d42', screen:'code', lamp:'#ffcf8a' },
  wren: { name:'Wren', role:'Design & writing', model:'subagent', skin:'#f3d0b3', hair:'#8a3f2e', hairD:'#6b2f22', style:'long', glasses:true,
          shirt:'#d19a3a', shirtD:'#a8782a', pants:'#3c3a5a', screen:'doc', lamp:'#ffd9a0' },
  moss: { name:'Moss', role:'Pixel art & UI', model:'subagent', skin:'#a86b48', hair:'#5e8c4a', hairD:'#46703a', style:'beanie',
          shirt:'#6a4c8c', shirtD:'#523a6e', pants:'#2d3040', screen:'art', lamp:'#b8ffe0' },
  juno: { name:'Juno', role:'Marketing & press', model:'subagent', skin:'#d8a07a', hair:'#231c2a', hairD:'#15101a', style:'bun',
          shirt:'#e0645a', shirtD:'#b44c44', pants:'#3a3f5c', screen:'chart', lamp:'#ffb0c8' },
  clem: { name:'Clem', role:'HR · budget approvals', model:'Sonnet, on call', skin:'#efc19c', hair:'#e08a3c', hairD:'#b86a28', style:'bob',
          shirt:'#d8d8e8', shirtD:'#aeb0c8', pants:'#44405e' }
};
const STATIONS = [
  { id:'opal', sx:36, sy:100, flip:false },
  { id:'wren', sx:36, sy:100, flip:true  },
  { id:'moss', sx:36, sy:158, flip:false },
  { id:'juno', sx:36, sy:158, flip:true  }
];
let status = window.STUDIO_STATUS || { staff: [], log: [] };
const stateOf = id => (status.staff.find(s => s.id === id) || {}).state || 'idle';
const taskOf  = id => (status.staff.find(s => s.id === id) || {}).task || '';

// ---------- lights (x, y, radius, strength, rgb, flicker) ----------
let lights = [];
function addLight(x, y, r, s, rgb, fl = 0) { lights.push({ x, y, r, s, rgb, fl }); }

// ---------- room ----------
function drawRoom(t) {
  // back wall
  px(0, 0, W, 66, '#2b2140');
  for (let x = 0; x < W; x += 8) px(x, 0, 1, 50, '#30264a');
  px(0, 50, W, 12, '#3d2c3a'); px(0, 50, W, 1, '#5a4050'); for (let x = 3; x < W; x += 10) px(x, 51, 1, 11, '#35263a');
  px(0, 62, W, 4, '#22182a');
  // floor planks
  px(0, 66, W, H - 66, '#553629');
  for (let r = 0, y = 66; y < H; r++, y += 6) {
    px(0, y, W, 1, '#3e271f');
    px(0, y + 1, W, 1, '#61402f');
    for (let x = (r % 2) * 17 + 5; x < W; x += 34) px(x, y, 1, 6, '#3e271f');
  }
  // rug
  px(100, 92, 120, 76, '#5e2940'); px(102, 94, 116, 72, '#7a3450'); px(106, 98, 108, 64, '#5e2940'); px(108, 100, 104, 60, '#6b2f47');
  for (let x = 110; x < 210; x += 6) { px(x, 96, 2, 1, '#c98a62'); px(x + 3, 163, 2, 1, '#c98a62'); }
  for (let y = 102; y < 158; y += 8) for (let x = 116; x < 206; x += 12) { px(x + ((y / 8) % 2) * 6, y, 2, 2, '#8a3d5b'); }

  // windows (night sea)
  drawWindow(24, 10, 60, 36, t, 0);
  drawWindow(236, 10, 60, 36, t, 1);

  // bookshelf
  px(2, 20, 18, 46, '#4a3024'); px(3, 21, 16, 44, '#2a1b16');
  const bookC = ['#c95a5a','#5a8ec9','#d8b45a','#6fb07a','#9a6fc9','#e08a5a','#5ac9b8'];
  for (let s = 0; s < 4; s++) {
    const y = 22 + s * 11; px(3, y + 9, 16, 2, '#4a3024');
    let x = 4; let i = s * 3;
    while (x < 17) { const w = 1 + ((i * 7) % 3 === 0 ? 2 : 1); const h = 6 + (i % 3); px(x, y + 9 - h, w, h, bookC[i % bookC.length]); x += w + ((i % 4) === 0 ? 1 : 0); i++; }
  }

  // clock (real time)
  disc(98, 26, 6, '#e8e0d0'); disc(98, 26, 5, '#f8f4ea');
  const now = new Date(); const hA = ((now.getHours() % 12) + now.getMinutes() / 60) / 12 * Math.PI * 2, mA = now.getMinutes() / 60 * Math.PI * 2;
  for (let i = 0; i <= 3; i++) px(98 + Math.round(Math.sin(hA) * i), 26 - Math.round(Math.cos(hA) * i), 1, 1, '#2a2233');
  for (let i = 0; i <= 4; i++) px(98 + Math.round(Math.sin(mA) * i), 26 - Math.round(Math.cos(mA) * i), 1, 1, '#c94a5a');
  px(98, 20, 1, 1, '#2a2233'); px(98, 32, 1, 1, '#2a2233'); px(92, 26, 1, 1, '#2a2233'); px(104, 26, 1, 1, '#2a2233');

  // neon sign
  const flick = (Math.sin(t * 13) > 0.97 || (t % 9 > 8.85)) ? 0.35 : 1;
  const sign = 'BRAMBLELIGHT';
  const sx = 160 - (textW(sign) >> 1);
  px(sx - 3, 3, textW(sign) + 6, 9, '#1f1830');
  text(sign, sx, 5, flick > 0.5 ? '#ff7fb5' : '#6b3a55');
  addLight(160, 8, 40, 0.55 * flick, [255, 110, 170]);

  // whiteboard
  px(112, 16, 96, 34, '#8a8aa0'); px(113, 17, 94, 32, '#e8e4f0'); px(112, 50, 96, 2, '#6a6a80');
  text('GLIMMERDEEP', 116, 20, '#3b5bd9');
  // anglerfish doodle
  const D = '#3a3a52';
  px(118, 34, 12, 1, D); px(117, 35, 1, 6, D); px(118, 41, 12, 1, D); px(130, 35, 1, 6, D); px(131, 36, 4, 1, D); px(131, 40, 4, 1, D); px(134, 37, 1, 3, D);
  px(126, 30, 1, 4, D); px(125, 29, 1, 1, D); px(124, 28, 2, 2, '#e0a020'); px(121, 36, 1, 1, D); px(119, 39, 5, 1, '#c93a4a');
  // todo list
  text('1 IDEA', 140, 30, '#4a4a66'); text('2 ART', 140, 36, '#4a4a66'); text('3 CODE', 140, 42, '#4a4a66');
  const ph = (status.phase || '').toLowerCase();
  if (ph && !ph.includes('pre')) px(139, 32, 23, 1, '#c93a4a');
  // sticky notes
  px(176, 20, 12, 11, '#ffe27a'); px(177, 23, 9, 1, '#b8a040'); px(177, 26, 7, 1, '#b8a040');
  px(190, 22, 12, 11, '#ff9ec0'); px(191, 25, 9, 1, '#c0708e'); px(191, 28, 6, 1, '#c0708e');
  px(180, 35, 12, 11, '#9ee8ff'); px(181, 38, 9, 1, '#6aa8c0'); px(181, 41, 8, 1, '#6aa8c0');
  px(194, 38, 10, 9, '#b8ff9e');
  // marker tray
  px(150, 49, 3, 1, '#c93a4a'); px(155, 49, 3, 1, '#3b5bd9'); px(160, 49, 3, 1, '#2a8a4a');

  // calendar
  px(212, 16, 18, 18, '#f4efe6'); px(212, 16, 18, 5, '#d0485a'); px(215, 15, 1, 2, '#555'); px(226, 15, 1, 2, '#555');
  const mon = now.toLocaleString('en', { month: 'short' }), day = String(now.getDate());
  text(mon, 221 - (textW(mon) >> 1), 17, '#fff'); text(day, 221 - (textW(day) >> 1), 25, '#2a2233');

  // coffee counter + machine
  px(206, 46, 28, 3, '#9a6a48'); px(207, 49, 26, 17, '#6a4632'); px(208, 51, 11, 13, '#5a3a28'); px(221, 51, 11, 13, '#5a3a28');
  px(209, 57, 2, 1, '#c9a070'); px(222, 57, 2, 1, '#c9a070');
  px(210, 32, 11, 14, '#3a3a48'); px(211, 33, 9, 4, '#555566'); px(213, 38, 5, 2, '#222'); px(214, 40, 3, 1, '#111');
  px(212, 43, 6, 3, '#e8e8f0'); px(213, 44, 4, 2, '#6a3a20'); px(218, 34, 1, 1, (t * 2 | 0) % 2 ? '#ff4a4a' : '#5a2020');
  for (let i = 0; i < 3; i++) { const k = (t * 0.6 + i / 3) % 1; px(214 + Math.round(Math.sin(k * 9 + i) * 1.5), 41 - k * 10, 1, 1, `rgba(230,230,255,${0.5 * (1 - k)})`); }
  px(225, 40, 6, 6, '#c9d6e8'); px(226, 41, 4, 1, '#8aa0bf'); // jar
  addLight(215, 36, 12, 0.25, [255, 80, 80]);

  // plants
  drawPlant(88, 66, t, 1.0);
  drawPlant(304, 66, t + 2, 1.3);
  drawPlant(4, 176, t + 4, 0.9);
}

function drawWindow(x, y, w, h, t, seed) {
  px(x - 2, y - 2, w + 4, h + 4, '#6b5a7a'); px(x - 1, y - 1, w + 2, h + 2, '#8a7898');
  // sky bands
  const sky = ['#0a0f28', '#0d1433', '#111a3f', '#16214d', '#1c2a5c'];
  const seaY = y + Math.floor(h * 0.62);
  for (let i = 0; i < sky.length; i++) px(x, y + Math.floor(i * (seaY - y) / sky.length), w, Math.ceil((seaY - y) / sky.length) + 1, sky[i]);
  // stars
  for (let i = 0; i < 16; i++) {
    const sx = x + ((i * 37 + seed * 91) % w), sy = y + ((i * 23 + seed * 13) % (seaY - y - 2));
    const tw = Math.sin(t * (1 + i % 3) + i) > 0.2;
    px(sx, sy, 1, 1, tw ? '#fff8e0' : '#6a70a0');
  }
  if (seed === 0) { // moon
    disc(x + 44, y + 9, 5, '#f4e9c1'); disc(x + 46, y + 8, 4, sky[0]);
    addLight(x + 44, y + 9, 26, 0.2, [180, 190, 255]);
  } else { // lighthouse on a rock
    px(x + 10, seaY - 3, 12, 3, '#0a0a18'); px(x + 14, seaY - 13, 4, 10, '#d8d0e0'); px(x + 14, seaY - 9, 4, 2, '#c94a5a');
    px(x + 13, seaY - 16, 6, 3, '#2a2233'); const on = Math.sin(t * 1.3) > 0;
    px(x + 15, seaY - 15, 2, 1, on ? '#ffe89a' : '#6a5a30');
    if (on) { ctx.fillStyle = 'rgba(255,232,154,0.18)'; ctx.beginPath(); ctx.moveTo(x + 17, seaY - 15); ctx.lineTo(x + w, seaY - 22); ctx.lineTo(x + w, seaY - 10); ctx.fill(); }
  }
  // sea
  px(x, seaY, w, y + h - seaY, '#0b1a36');
  for (let r = 0; r < 5; r++) {
    const ry = seaY + 2 + r * 3; if (ry >= y + h) break;
    for (let k = 0; k < 4; k++) { const wx = x + ((k * 17 + r * 11 + Math.floor(t * (3 + r))) % (w - 4)); px(wx, ry, 3, 1, r < 2 ? '#2a4a7a' : '#1a3560'); }
  }
  if (seed === 0) for (let r = 0; r < 5; r++) px(x + 42 + ((Math.sin(t * 2 + r) * 2) | 0), seaY + 1 + r * 3, 4 - (r >> 1), 1, '#c9c090');
  // bioluminescent glimmers (a nod to the game)
  for (let i = 0; i < 3; i++) { const k = (t * 0.15 + i * 0.33 + seed * 0.2) % 1; const gx = x + 6 + ((i * 19 + seed * 7) % (w - 12)); if (k < 0.5) px(gx, y + h - 3 - (i % 2), 1, 1, '#5fe0c8'); }
  // frame cross + sill
  px(x + (w >> 1), y, 2, h, '#8a7898'); px(x, y + (h >> 1) - 6, w, 1, '#8a7898');
  px(x - 4, y + h + 2, w + 8, 3, '#9a88aa');
}

function drawPlant(x, floorY, t, s) {
  px(x + 2, floorY - 8, 10, 8, '#b0573c'); px(x + 1, floorY - 9, 12, 2, '#c96a4a'); px(x + 3, floorY - 7, 1, 6, '#8a4030');
  const sway = Math.sin(t * 0.9) * 0.8;
  const leaves = [[-4, -18], [3, -24], [8, -17], [0, -13], [10, -12], [5, -20]];
  for (let i = 0; i < leaves.length; i++) {
    const [lx, ly] = leaves[i]; const X = x + 6 + lx * s * 0.6 + sway * (i % 2 ? 1 : -1) * 0.5, Y = floorY - 8 + ly * s * 0.6;
    ctx.strokeStyle = '#2f6a3a'; px(Math.round((x + 6 + X) / 2), Math.round((floorY - 9 + Y) / 2), 1, Math.max(1, Math.round((floorY - 9 - Y) / 2)), '#2f6a3a');
    px(X - 2, Y, 5, 2, i % 2 ? '#4f9a4a' : '#3f8a44'); px(X - 1, Y - 1, 3, 1, '#6fba5a');
  }
}

// ---------- characters & desks (local coords face right; mirrored stations flip the context) ----------
function drawChair(sx, sy, c = '#3a3450', h = '#4c4566') {
  px(sx - 5, sy - 14, 3, 14, c); px(sx - 5, sy - 14, 1, 14, h);
  px(sx - 5, sy, 14, 3, c); px(sx - 5, sy, 14, 1, h);
  px(sx + 1, sy + 3, 2, 5, '#2a2638'); px(sx - 3, sy + 8, 10, 1, '#2a2638');
  px(sx - 3, sy + 9, 2, 1, '#15121c'); px(sx + 5, sy + 9, 2, 1, '#15121c');
}
function drawHair(p, hx, hy) {
  const H = p.hair, D = p.hairD;
  switch (p.style) {
    case 'short': px(hx - 1, hy - 1, 9, 3, H); px(hx - 1, hy + 2, 3, 3, H); px(hx + 5, hy + 2, 3, 1, H); px(hx + 1, hy - 1, 5, 1, '#e4d8ff'); px(hx - 1, hy + 4, 2, 1, D); break;
    case 'long':  px(hx - 1, hy - 1, 9, 3, H); px(hx - 2, hy + 1, 4, 11, H); px(hx - 2, hy + 8, 2, 4, D); px(hx + 6, hy + 2, 2, 1, H); px(hx + 1, hy - 1, 4, 1, '#a85a44'); break;
    case 'beanie':px(hx - 1, hy - 2, 9, 4, H); px(hx - 1, hy + 1, 9, 1, D); px(hx + 2, hy - 3, 3, 1, '#9ad08a'); px(hx - 1, hy + 2, 2, 3, '#2a1a14'); break;
    case 'bun':   px(hx - 1, hy - 1, 9, 3, H); px(hx - 1, hy + 2, 2, 4, H); px(hx - 4, hy - 2, 4, 4, H); px(hx - 3, hy - 2, 2, 1, '#3a3044'); px(hx + 6, hy + 2, 2, 1, H); break;
    case 'bob':   px(hx - 1, hy - 1, 9, 3, H); px(hx - 1, hy + 2, 3, 6, H); px(hx + 6, hy + 2, 2, 2, H); px(hx + 1, hy - 1, 4, 1, '#f4a860'); break;
  }
}
function drawPerson(p, sx, sy, t, st, key) {
  const hx = sx - 1, hy = sy - 22;
  const working = st === 'working';
  const lean = st === 'idle' ? -1 : 0;
  // legs
  px(sx - 2, sy - 3, 10, 3, p.pants); px(sx + 6, sy, 3, 7, p.pants); px(sx + 6, sy + 7, 5, 2, '#1c1822');
  // torso
  px(sx - 2 + lean, sy - 13, 7, 10, p.shirt); px(sx - 2 + lean, sy - 13, 1, 10, p.shirtD); px(sx + 1 + lean, sy - 14, 3, 1, p.skin);
  if (p.id === 'clem') { px(sx + 2, sy - 13, 1, 6, '#3b5bd9'); px(sx + 1, sy - 7, 3, 3, '#f4efe6'); }
  // head
  const bob = working ? (Math.sin(t * 2 + key) > 0.8 ? 1 : 0) : 0;
  const HX = hx + lean, HY = hy + bob;
  px(HX, HY, 8, 8, p.skin); px(HX + 8, HY + 4, 1, 1, p.skin);
  const blink = ((t + key * 1.7) % 4.3) < 0.14;
  px(HX + 5, HY + 3, 1, blink ? 1 : 2, blink ? p.skin : '#1b1424');
  if (!blink) px(HX + 5, HY + 3, 1, 1, '#3a2e4a');
  px(HX + 6, HY + 6, 2, 1, '#b0706a');
  if (p.glasses) { px(HX + 4, HY + 2, 4, 1, '#1b1424'); px(HX + 4, HY + 5, 4, 1, '#1b1424'); px(HX + 4, HY + 3, 1, 2, '#1b1424'); px(HX + 7, HY + 3, 1, 2, '#1b1424'); }
  px(HX + 1, HY + 5, 1, 1, '#e8a098');
  drawHair(p, HX, HY);
  // arms
  if (working) {
    const tap = Math.sin(t * 18 + key * 2) > 0 ? 1 : 0;
    px(sx + 1, sy - 12, 3, 6, p.shirtD); px(sx + 3, sy - 7, 7, 2, p.shirt); px(sx + 10, sy - 7 - tap, 2, 2, p.skin);
  } else if (st === 'idle') {
    // holding a mug
    px(sx + 1 + lean, sy - 12, 3, 5, p.shirtD); px(sx + 3 + lean, sy - 8, 4, 2, p.shirt); px(sx + 7 + lean, sy - 11, 3, 4, '#e8e8f0'); px(sx + 8 + lean, sy - 11, 1, 1, '#6a3a20');
    const k = (t * 0.7 + key) % 1; px(sx + 8 + lean, sy - 13 - k * 5, 1, 1, `rgba(230,230,255,${0.6 * (1 - k)})`);
  } else {
    px(sx + 1, sy - 12, 3, 6, p.shirtD); px(sx + 3, sy - 7, 5, 2, p.shirt); px(sx + 8, sy - 7, 2, 2, p.skin);
  }
}
function drawScreen(p, x, y, w, h, t, st) {
  px(x, y, w, h, '#0e1020');
  if (st === 'offline') return;
  if (st === 'idle') { const bx = x + 1 + Math.abs(((t * 6) % ((w - 3) * 2)) - (w - 3)), by = y + 1 + Math.abs(((t * 4) % ((h - 3) * 2)) - (h - 3)); px(bx | 0, by | 0, 2, 2, '#5fe0c8'); return; }
  if (st === 'done') { px(x, y, w, h, '#10301c'); px(x + 4, y + 7, 2, 2, '#8dff7a'); px(x + 6, y + 8, 2, 2, '#8dff7a'); px(x + 8, y + 6, 2, 2, '#8dff7a'); px(x + 10, y + 4, 2, 2, '#8dff7a'); return; }
  switch (p.screen) {
    case 'code': {
      const cols = ['#ff7fb5', '#5fe0c8', '#ffc46b', '#9d8fc4', '#8ab4ff'];
      const off = Math.floor(t * 3);
      for (let r = 0; r < 6; r++) { const i = r + off; const ind = (i * 7 % 3) * 2; const len = 3 + (i * 13 % 9); px(x + 1 + ind, y + 1 + r * 2, Math.min(len, w - 2 - ind), 1, cols[i % cols.length]); }
      if ((t * 2 | 0) % 2) px(x + 1 + ((off * 7 % 3) * 2) + 2, y + 11, 1, 1, '#fff');
      break;
    }
    case 'doc': {
      px(x, y, w, h, '#e8e2d2'); const n = Math.floor(t * 1.5) % 30;
      for (let r = 0; r < 5; r++) { const full = r < 4 ? w - 3 - (r * 5 % 4) : Math.min(w - 3, n % (w - 3)); px(x + 1, y + 1 + r * 2 + (r > 0 ? 1 : 0), full, 1, r === 0 ? '#8a3f2e' : '#7a7466'); }
      break;
    }
    case 'art': {
      for (let yy = 0; yy < h - 3; yy++) for (let xx = 0; xx < w; xx += 2) px(x + xx + (yy % 2), y + yy, 1, 1, '#161a30');
      const fish = ['..tt....', '.tttt..t', 'ttwtttt.', '.tttt..t', '..tt....'];
      const done = Math.floor(t * 4) % 60;
      let k = 0;
      for (let r = 0; r < fish.length; r++) for (let c = 0; c < 8; c++) { if (fish[r][c] !== '.') { if (k < done) px(x + 4 + c, y + 3 + r, 1, 1, fish[r][c] === 'w' ? '#fff' : '#5fe0c8'); k++; } }
      const pal = ['#ff7fb5', '#5fe0c8', '#ffc46b', '#8ab4ff', '#b8ff9e'];
      for (let i = 0; i < pal.length; i++) px(x + 1 + i * 3, y + h - 2, 2, 2, pal[i]);
      break;
    }
    case 'chart': {
      const bars = 5; for (let i = 0; i < bars; i++) { const bh = 2 + Math.floor((Math.sin(t * 0.8 + i * 1.3) * 0.5 + 0.5) * 6 + i * 0.8); px(x + 2 + i * 3, y + h - 1 - bh, 2, bh, i === bars - 1 ? '#ff7fb5' : '#ffc46b'); }
      const hk = (t * 0.8) % 1; px(x + w - 4, y + 5 - hk * 4, 1, 1, '#ff4a7a'); px(x + w - 5, y + 4 - hk * 4, 1, 1, '#ff4a7a'); px(x + w - 3, y + 4 - hk * 4, 1, 1, '#ff4a7a');
      break;
    }
  }
}
function drawStation(st, t, i) {
  const p = STAFF[st.id]; const s = stateOf(st.id); const { sx, sy } = st;
  ctx.save();
  if (st.flip) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  // desk back legs, chair, person, desk, arms happen in drawPerson after desk -> order: chair, legs+body, desk top, arms
  px(sx + 12, sy + 9, 28, 1, 'rgba(0,0,0,0.25)');
  drawChair(sx, sy);
  if (s !== 'offline') drawPerson(p, sx, sy, t, s, i);
  // desk
  px(sx + 9, sy - 5, 32, 2, '#b07c56'); px(sx + 9, sy - 5, 32, 1, '#c99670'); px(sx + 9, sy - 3, 32, 2, '#7a5238');
  px(sx + 14, sy - 1, 2, 10, '#6a4430'); px(sx + 37, sy - 1, 2, 10, '#6a4430'); px(sx + 26, sy - 1, 11, 6, '#7a5238'); px(sx + 30, sy + 1, 3, 1, '#c9a070');
  // keyboard
  px(sx + 10, sy - 6, 8, 1, '#cfd3e0');
  // monitor
  px(sx + 23, sy - 9, 2, 4, '#2a2a36'); px(sx + 20, sy - 6, 8, 1, '#2a2a36');
  px(sx + 15, sy - 24, 18, 15, '#1a1a24'); px(sx + 15, sy - 24, 18, 1, '#34344a');
  drawScreen(p, sx + 16, sy - 23, 16, 13, t, s);
  // lamp
  px(sx + 35, sy - 6, 4, 1, '#2a2a36'); px(sx + 36, sy - 12, 1, 6, '#3a3a48'); px(sx + 33, sy - 14, 5, 2, p.lamp); px(sx + 33, sy - 12, 5, 1, '#fff6d8');
  // mug / props
  if (st.id === 'opal') { px(sx + 29, sy - 8, 3, 3, '#5fe0c8'); px(sx + 32, sy - 7, 1, 1, '#5fe0c8'); }
  if (st.id === 'wren') { px(sx + 28, sy - 7, 5, 2, '#e8e2d2'); px(sx + 28, sy - 8, 5, 1, '#c9a46a'); }
  if (st.id === 'moss') { px(sx + 28, sy - 8, 4, 2, '#2a2a36'); px(sx + 32, sy - 12, 1, 5, '#e8e8f0'); }
  if (st.id === 'juno') { px(sx + 28, sy - 9, 3, 4, '#3a3a48'); px(sx + 28, sy - 9, 3, 3, '#8ab4ff'); }
  // arms over desk (redraw so hands sit on the keyboard)
  if (s === 'working') { const tap = Math.sin(t * 18 + i * 2) > 0 ? 1 : 0; px(sx + 4, sy - 7, 6, 2, p.shirt); px(sx + 10, sy - 7 - tap, 2, 2, p.skin); }
  ctx.restore();
  const X = v => st.flip ? W - v : v;
  // thought bubble for idle
  if (s === 'idle') { const bx = X(sx + 4) - 5, by = sy - 34; px(bx, by, 11, 6, '#f4efe6'); px(bx + 1, by - 1, 9, 1, '#f4efe6'); px(bx + 1, by + 6, 9, 1, '#f4efe6'); px(bx + 4, by + 7, 2, 1, '#f4efe6'); const d = Math.floor(t * 2) % 4; for (let k = 0; k < Math.min(d, 3); k++) px(bx + 2 + k * 3, by + 3, 1, 1, '#4a4a66'); }
  if (s === 'done') { const bx = X(sx + 4) - 4, by = sy - 34; px(bx, by, 9, 7, '#8dff7a'); px(bx + 2, by + 3, 1, 1, '#10301c'); px(bx + 3, by + 4, 1, 1, '#10301c'); px(bx + 4, by + 3, 1, 1, '#10301c'); px(bx + 5, by + 2, 1, 1, '#10301c'); px(bx + 6, by + 1, 1, 1, '#10301c'); }
  // lights
  const on = s !== 'offline';
  if (on) { addLight(X(sx + 35), sy - 11, 30, 0.95, hexRgb(p.lamp), 0.03); addLight(X(sx + 24), sy - 16, 18, 0.5, [120, 200, 255]); }
  // nameplate
  const nm = p.name.toUpperCase(); const nx = X(sx + 2) - (textW(nm) >> 1);
  px(nx - 2, sy + 12, textW(nm) + 4, 7, '#1c1630'); text(nm, nx, sy + 13, on ? '#efe6ff' : '#6d628f');
  hitboxes.push({ id: st.id, x0: Math.min(X(sx - 6), X(sx + 41)), x1: Math.max(X(sx - 6), X(sx + 41)), y0: sy - 36, y1: sy + 20 });
}
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }

// HR kiosk: empty until Clem is spawned for a budget request
function drawHR(t) {
  const s = stateOf('clem'); const x = 144, y = 156;
  px(x, y, 32, 3, '#9a88aa'); px(x + 1, y + 3, 30, 12, '#5a4a6a'); px(x + 1, y + 3, 30, 1, '#7a6a8a');
  text('HR', x + 12, y + 7, '#ffc46b');
  px(x + 26, y - 3, 4, 3, '#ffc46b'); px(x + 27, y - 4, 2, 1, '#ffc46b'); // bell
  px(x + 3, y - 2, 6, 2, '#e8e2d2'); // forms
  if (s !== 'offline') { drawPerson(STAFF.clem, x + 12, y - 3, t, s === 'working' ? 'still' : s, 9); addLight(x + 16, y - 6, 26, 0.7, [255, 210, 150]); }
  else { const k = Math.floor(t) % 6 < 3; text(k ? 'ON CALL' : 'RING ME', x + 16 - (textW('ON CALL') >> 1), y - 10, '#6d628f'); }
  hitboxes.push({ id: 'clem', x0: x, x1: x + 32, y0: y - 30, y1: y + 16 });
}

// ---------- the office cat ----------
const cat = { x: 150, y: 128, tx: 170, ty: 130, dir: 1, mode: 'walk', until: 0 };
function updCat(t, dt) {
  if (cat.mode === 'sit') { if (t > cat.until) { cat.mode = 'walk'; cat.tx = 104 + rnd() * 112; cat.ty = 104 + rnd() * 48; } return; }
  const dx = cat.tx - cat.x, dy = cat.ty - cat.y, d = Math.hypot(dx, dy);
  if (d < 1) { cat.mode = 'sit'; cat.until = t + 3 + rnd() * 6; return; }
  cat.x += dx / d * 10 * dt; cat.y += dy / d * 10 * dt; cat.dir = dx >= 0 ? 1 : -1;
}
function drawCat(t) {
  const walk = ['.......k.k', 'k......kkk', '.k.kkkkkek', '..kkkkkkk.', '..kkkkkk..'];
  const sit = ['....k.k', 'k...kkk', 'k...kek', '.k.kkkk', '..kkkkk', '..kkkkk'];
  const spr = cat.mode === 'walk' ? walk : sit;
  const w = spr[0].length, X = Math.round(cat.x), Y = Math.round(cat.y) - spr.length;
  px(X + 1, Y + spr.length + (cat.mode === 'walk' ? 2 : 0), w - 2, 1, 'rgba(0,0,0,0.3)');
  for (let r = 0; r < spr.length; r++) for (let c = 0; c < w; c++) {
    const ch = spr[r][cat.dir > 0 ? c : w - 1 - c]; if (ch === '.') continue;
    let col = ch === 'e' ? (((t + 1) % 5) < 0.15 ? '#1c1a24' : '#8dff7a') : '#1c1a24';
    if (cat.mode === 'sit' && r === 1 && ((cat.dir > 0 ? c : w - 1 - c) === 0) && Math.sin(t * 3) > 0.6) continue; // tail flick
    px(X + c, Y + r, 1, 1, col);
  }
  if (cat.mode === 'walk') { const f = Math.floor(t * 8) % 2; for (let k = 0; k < 4; k++) px(X + 2 + k * 2 + (f && k % 2 ? 1 : 0), Y + spr.length, 1, 2, '#1c1a24'); }
  hitboxes.push({ id: 'cat', x0: X - 2, x1: X + w + 2, y0: Y - 2, y1: Y + 8 });
}

// ---------- lighting pass: per-pixel, 4x4 Bayer dither, 6 levels ----------
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
function lightPass(t) {
  const d = shade.data; const L = lights.map(l => ({ ...l, s: l.s * (1 + (l.fl ? (Math.sin(t * 30 + l.x) * l.fl) : 0)) }));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let lit = 0, r = 0, gg = 0, b = 0;
    for (const l of L) {
      const dx = x - l.x, dy = (y - l.y) * 1.15, q = 1 - (dx * dx + dy * dy) / (l.r * l.r);
      if (q > 0) { const v = q * q * l.s; lit += v; r += l.rgb[0] * v; gg += l.rgb[1] * v; b += l.rgb[2] * v; }
    }
    const base = y < 66 ? 0.62 : 0.56;
    let dark = base * (1 - Math.min(1, lit));
    const lv = 6; dark = Math.floor(dark * lv + BAYER[(y & 3) * 4 + (x & 3)]) / lv;
    const i = (y * W + x) * 4;
    if (lit > 0.001) { const inv = 1 / lit; r *= inv; gg *= inv; b *= inv; }
    const warm = Math.min(0.22, lit * 0.16);
    const a = Math.min(1, dark + warm);
    const mix = a > 0 ? warm / a : 0;
    d[i] = 10 * (1 - mix) + r * mix; d[i + 1] = 8 * (1 - mix) + gg * mix; d[i + 2] = 34 * (1 - mix) + b * mix; d[i + 3] = a * 255;
  }
  lctx.putImageData(shade, 0, 0);
  g.drawImage(lcv, 0, 0);
}
const lcv = document.createElement('canvas'); lcv.width = W; lcv.height = H; const lctx = lcv.getContext('2d');

// ---------- loop ----------
let hitboxes = [];
let last = performance.now() / 1000, acc = 0;
function frame() {
  const now = performance.now() / 1000, dt = Math.min(0.1, now - last);
  acc += dt; last = now;
  if (acc >= 1 / 30) {
    const t = now; acc = 0;
    lights = []; hitboxes = []; ctx = g;
    drawRoom(t);
    // back row first, then cat/HR by depth, then front row
    STATIONS.filter(s => s.sy < 130).forEach((s, i) => drawStation(s, t, i));
    updCat(t, 1 / 30);
    if (cat.y < 150) drawCat(t);
    STATIONS.filter(s => s.sy >= 130).forEach((s, i) => drawStation(s, t, i + 2));
    drawHR(t);
    if (cat.y >= 150) drawCat(t);
    lightPass(t);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- hover tooltips ----------
const tip = document.getElementById('tip'), stage = cv.parentElement;
cv.addEventListener('mousemove', e => {
  const r = cv.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
  const h = hitboxes.slice().reverse().find(b => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);
  if (!h) { tip.style.display = 'none'; return; }
  if (h.id === 'cat') tip.innerHTML = '<b>BUG</b> · office cat · finds them, sits on them';
  else { const p = STAFF[h.id]; tip.innerHTML = `<b>${p.name.toUpperCase()}</b> · ${p.role} <span class="${stateOf(h.id)}">[${stateOf(h.id)}]</span><br>${taskOf(h.id)}`; }
  tip.style.display = 'block'; tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top - 10) + 'px';
});
cv.addEventListener('mouseleave', () => tip.style.display = 'none');

// ---------- side panel ----------
function portrait(id) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 16; const prev = ctx; ctx = c.getContext('2d');
  const p = STAFF[id]; px(0, 0, 16, 16, '#241c3d'); px(3, 13, 10, 3, p.shirt); px(3, 13, 2, 3, p.shirtD); px(6, 12, 3, 1, p.skin);
  px(4, 4, 8, 8, p.skin); px(12, 8, 1, 1, p.skin); px(9, 7, 1, 2, '#1b1424'); px(10, 10, 2, 1, '#b0706a'); px(5, 9, 1, 1, '#e8a098');
  if (p.glasses) { px(8, 6, 4, 1, '#1b1424'); px(8, 9, 4, 1, '#1b1424'); px(8, 7, 1, 2, '#1b1424'); px(11, 7, 1, 2, '#1b1424'); }
  drawHair(p, 4, 4); ctx = prev; return c;
}
function renderPanel() {
  document.getElementById('proj').textContent = status.project || '—';
  document.getElementById('phase').textContent = status.phase || '—';
  document.getElementById('wallet').textContent = (status.wallet ?? '—') + ' ★';
  const cards = document.getElementById('cards'); cards.innerHTML = '';
  for (const id of ['opal', 'wren', 'moss', 'juno', 'clem']) {
    const p = STAFF[id], s = stateOf(id);
    const el = document.createElement('div'); el.className = 'card';
    el.appendChild(portrait(id));
    const info = document.createElement('div');
    info.innerHTML = `<div class="name">${p.name.toUpperCase()}<span class="pill ${s}">${s.toUpperCase()}</span></div><div class="role">${p.role} · ${p.model}</div><div class="task"></div>`;
    info.querySelector('.task').textContent = taskOf(id);
    el.appendChild(info); cards.appendChild(el);
  }
  const log = document.getElementById('log'); log.innerHTML = '';
  (status.log || []).slice().reverse().forEach(l => { const d = document.createElement('div'); d.textContent = '› ' + l; log.appendChild(d); });
}
for (const id in STAFF) STAFF[id].id = id;
renderPanel();
setInterval(() => {
  const s = document.createElement('script'); s.src = 'status.js?' + Date.now();
  s.onload = () => { status = window.STUDIO_STATUS || status; renderPanel(); s.remove(); };
  document.body.appendChild(s);
}, 10000);
setInterval(() => document.getElementById('clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 1000);
})();
