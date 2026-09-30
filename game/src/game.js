// GLIMMERDEEP — game state, zones, camera, HUD, story flow, main loop.
'use strict';
const $ = s => document.querySelector(s);
const params = new URLSearchParams(location.search);

const Game = {
  // canvases
  scene: null, ctx: null, emit: null, ectx: null, hud: null, hctx: null,
  state: 'boot', t: 0, zoneIdx: 0, world: null, player: null, ents: [], fx: [], flares_: [], lightsList: [],
  camX: 0, camY: 0, shake: 0, fade: 1, fadeTarget: 0, hurtFlash: 0, darkAmt: 0,
  oil: 100, hull: 3, flares: 0, bright: false, lampOut: false, darkTimer: 0,
  ping: null, pingNoise: null, pingCool: 0, checkpoint: null, cp: null, controlsLocked: false,
  seen: {}, loreFound: [], buoysOn: {}, pops: [], stats: { time: 0, deaths: 0, glimmers: 0 }, god: false, dead: false,

  async boot() {
    this.scene = document.createElement('canvas'); this.scene.width = VW; this.scene.height = VH; this.ctx = this.scene.getContext('2d');
    this.emit = document.createElement('canvas'); this.emit.width = VW; this.emit.height = VH; this.ectx = this.emit.getContext('2d');
    this.hud = $('#hud'); this.hctx = this.hud.getContext('2d');
    for (const c of [this.ctx, this.ectx, this.hctx]) c.imageSmoothingEnabled = false;
    try { Renderer.init($('#gl')); } catch (e) { $('#err').textContent = 'GLIMMERDEEP needs WebGL2: ' + e.message; $('#err').style.display = 'block'; return; }
    Input.init(); UI.init(this);
    await Assets.load();
    if (params.get('test') === 'finale') { GD.zones = [GD.testZone, GD.testZone, GD.testZone, GD.testZone, GD.testFinale]; }
    else if (params.has('test') || !GD.zones.filter(Boolean).length) { GD.zones = [GD.testZone]; }
    this.story = GD.story;
    addEventListener('resize', fit); fit();
    const save = this.loadSave();
    this.hasSave = !!save;
    const z = params.get('zone');
    if (z) { this.newGame(); UI.title(false); this.enterZone(+z - 1, null, true); this.state = "play"; this.fade = 0; }
    else { this.loadZone(0); this.state = 'title'; UI.title(true, this.hasSave); this.fade = 1; this.fadeTarget = 0; }
    this.last = performance.now(); requestAnimationFrame(ts => this.loop(ts));
  },

  // ---------- zones ----------
  loadZone(idx, spawnAt) {
    const def = GD.zones[idx]; this.zoneIdx = idx;
    this.world = new World(def); Renderer.setSolid(this.world.solidTex, this.world.w, this.world.h);
    this.def = def; this.ents = []; this.fx = []; this.flares_ = []; this.pops = []; this.whale = null; this.flame = null;
    let start = null, entry = null; const W = this.world, T = TILE;
    let buoyIdx = 0; const lore = def.lore || {};
    for (const s of W.spawns) {
      const x = s.x * T + T / 2, y = s.y * T + T / 2, below = W.isSolid(s.x, s.y + 1);
      const floorY = (() => { for (let k = 0; k < 4; k++) if (W.isSolid(s.x, s.y + 1 + k)) return (s.y + 1 + k) * T; return (s.y + 1) * T; })();
      switch (s.ch) {
        case 'P': start = { x, y }; break;
        case 'I': entry = { x, y }; break;
        case 'C': { const b = new Buoy(x, floorY, buoyIdx++); if ((this.buoysOn[def.id] || []).includes(b.idx)) b.on = true; this.ents.push(b); break; }
        case 'g': this.ents.push(new Pickup('glimmer', x, y)); break;
        case 'G': this.ents.push(new Pickup('glimmer_big', x, y)); break;
        case 'F': this.ents.push(new Pickup('crate', x, y + 1)); break;
        case 'H': this.ents.push(new Pickup('patch', x, y)); break;
        case 'A': this.ents.push(new Angler(x, y)); break;
        case 'J': this.ents.push(new Jelly(x, y)); break;
        case 'E': this.ents.push(new Eel(x, y, W)); break;
        case 'U': { // stick to the nearest surface
          let uy = y; if (W.isSolid(s.x, s.y + 1)) uy = (s.y + 1) * T; else if (W.isSolid(s.x, s.y - 1)) uy = s.y * T + 12;
          this.ents.push(new Urchin(x, uy)); break; }
        case 's': this.ents.push(new School(x, y)); break;
        case 'k': if (below) this.ents.push(new Deco('kelp', x, floorY, 0, 'abc'[Math.floor(hash(s.x, s.y) * 3)])); else this.ents.push(new Deco('kelp', x, floorY, 0, 'abc'[Math.floor(hash(s.x, s.y) * 3)])); break;
        case 'c': this.ents.push(new Deco('coral', x, floorY, Math.floor(hash(s.x, s.y) * 6))); break;
        case 'r': this.ents.push(new Deco('ruin', x, floorY, Math.floor(hash(s.x, s.y) * 6))); break;
        case 'b': this.ents.push(new Deco('bones', x, floorY, Math.floor(hash(s.x, s.y) * 3))); break;
        case 'W': this.whale = new Whale(x, y); this.ents.unshift(this.whale); break;
        case '*': this.flame = new Flame(x, y); this.ents.push(this.flame); break;
        case 'X': break;
        default:
          if (/[1-9]/.test(s.ch)) { const id = lore[s.ch]; if (id && !this.loreFound.includes(id)) this.ents.push(new Bottle(x, y, id)); }
      }
    }
    // vents at the bottom of each up-current column
    for (let x = 0; x < W.w; x++) for (let y = 0; y < W.h - 1; y++) { const i = (y * W.w + x) * 2; if (W.current[i + 1] === -1 && W.isSolid(x, y + 1)) this.ents.push(new Vent(x * T + 8, (y + 1) * T)); }
    this.exits = W.spawns.filter(s => s.ch === 'X');
    this.zoneStart = start || entry || { x: W.pxW / 2, y: 40 };
    const p = spawnAt || this.zoneStart;
    this.player = new Player(p.x, p.y);
    this.snapCam();
    this.finale = null;
  },
  enterZone(idx, spawnAt, announce) {
    this.loadZone(idx, spawnAt);
    this.cp = spawnAt ? this.cp : { zone: idx, x: this.zoneStart.x, y: this.zoneStart.y };
    this.save();
    if (announce) { const z = (this.story.zones || {})[this.def.id] || { title: this.def.name, sub: '' }; UI.zoneCard(z.title || this.def.name, z.sub || `${this.def.depth[0]} m`, z.enter || []); }
    if (idx === 0) { setTimeout(() => this.tip('move'), 1500); }
  },
  newGame() {
    Object.assign(this, { oil: 100, hull: 3, flares: 0, bright: false, lampOut: false, darkTimer: 0, seen: {}, loreFound: [], buoysOn: {}, stats: { time: 0, deaths: 0, glimmers: 0 } });
    localStorage.removeItem('glimmerdeep.save');
  },
  save() {
    try { localStorage.setItem('glimmerdeep.save', JSON.stringify({ cp: this.cp, flares: this.flares, seen: this.seen, loreFound: this.loreFound, buoysOn: this.buoysOn, stats: this.stats, done: this.done })); } catch (e) {}
  },
  loadSave() { try { return JSON.parse(localStorage.getItem('glimmerdeep.save')); } catch (e) { return null; } },
  continueGame() {
    const s = this.loadSave(); if (!s || !s.cp) return this.startNew();
    Object.assign(this, { flares: s.flares || 0, seen: s.seen || {}, loreFound: s.loreFound || [], buoysOn: s.buoysOn || {}, stats: s.stats || this.stats, oil: Math.max(45, (s.cp && s.cp.oil) || 45), hull: 3 });
    this.cp = s.cp; this.enterZone(s.cp.zone, { x: s.cp.x, y: s.cp.y }, true);
    this.state = 'play'; UI.title(false);
  },
  startNew() {
    this.newGame(); UI.title(false); this.loadZone(0);
    this.state = 'intro'; this.controlsLocked = true;
    UI.cards(this.story.intro || [], () => { this.state = 'play'; this.controlsLocked = false; this.enterZone(0, null, true); });
  },
  setCheckpoint(b) {
    this.checkpoint = b; this.cp = { zone: this.zoneIdx, x: b.x, y: b.y - 18 };
    (this.buoysOn[this.def.id] = this.buoysOn[this.def.id] || []).includes(b.idx) || this.buoysOn[this.def.id].push(b.idx);
    this.hull = K.hullMax; this.oil = Math.max(this.oil, 45); this.cp.oil = this.oil; this.save(); this.tip('checkpoint');
  },

  // ---------- events ----------
  tip(key) { if (this.seen[key] || !this.story.tips || !this.story.tips[key]) return; this.seen[key] = 1; UI.tip(this.story.tips[key], key); },
  pop(x, y, text, col) { this.pops.push({ x, y, text, col, life: 1.4 }); },
  light(x, y, r, s, c) { if (x + r < this.camX || x - r > this.camX + VW || y + r < this.camY || y - r > this.camY + VH) return; this.lightsList.push({ x, y, r, s, c }); },
  alarm() { this.shake = Math.max(this.shake, 2); },
  relight() { this.lampOut = false; this.darkTimer = 0; },
  readLore(id) {
    const L = (this.story.lore || {})[id]; if (!this.loreFound.includes(id)) this.loreFound.push(id); this.save();
    if (!L) return; this.state = 'lore'; UI.lore(L.title, L.text, this.loreFound.length, this.loreTotal(), () => { this.state = 'play'; });
  },
  loreTotal() { return Object.keys(this.story.lore || {}).length; },
  die(kind) {
    if (this.dead || this.transitioning || this.finale) return; this.dead = true; this.stats.deaths++; this.controlsLocked = true;
    const lines = (this.story.deaths || {})[kind] || ['...']; const line = lines[Math.floor(Math.random() * lines.length)];
    this.state = 'dead'; this.fadeTarget = 1;
    setTimeout(() => UI.death(line, () => this.respawn()), 900);
  },
  respawn() {
    const cp = this.cp || { zone: this.zoneIdx, x: this.zoneStart.x, y: this.zoneStart.y };
    this.loadZone(cp.zone, { x: cp.x, y: cp.y });
    this.hull = K.hullMax; this.oil = Math.max(45, cp.oil || 0); this.lampOut = false; this.darkTimer = 0; this.dead = false; this.controlsLocked = false;
    this.state = 'play'; this.fadeTarget = 0; this.player.inv = 1.2;
  },
  gotoNext() {
    if (this.transitioning || !GD.zones[this.zoneIdx + 1]) return; this.transitioning = true; this.controlsLocked = true; this.fadeTarget = 1;
    const carry = { vx: this.player.vx, face: this.player.face };
    this.transTimer = setTimeout(() => {
      this.enterZone(this.zoneIdx + 1, null, true); this.player.face = carry.face; this.player.vy = 40;
      this.fadeTarget = 0; this.controlsLocked = false; this.transitioning = false;
    }, 900);
  },
  takeFlame() {
    this.state = 'ending'; this.controlsLocked = true; this.done = true; this.save();
    for (let i = 0; i < 60; i++) this.fx.push(new Spark(this.flame.x, this.flame.y, ['#fff0c2', '#ffc46b', '#d98a2b'][i % 3], (Math.random() - .5) * 160, (Math.random() - .5) * 160, 1.6));
    setTimeout(() => { this.fadeTarget = 1; }, 1200);
    setTimeout(() => Ending.start(this), 2600);
  },

  // ---------- frame ----------
  snapCam() { const p = this.player; this.camX = clamp(p.x - VW / 2, 0, this.world.pxW - VW); this.camY = clamp(p.y - VH / 2, 0, Math.max(0, this.world.pxH - VH)); },
  update(dt) {
    this.t += dt; this.lightsList = [];
    if (this.state === 'ending') { Ending.update(this, dt); return; }
    const live = this.state === 'play' || this.state === 'dead' || this.state === 'intro' || this.state === 'title';
    if (this.state === 'title') { // idle drift on the title
      const p = this.player; p.t += dt; this.camX = clamp(p.x - VW / 2 + Math.sin(this.t * 0.1) * 40, 0, this.world.pxW - VW); this.camY = clamp(this.world.surfaceY - 165, 0, this.world.pxH - VH);
      for (const e of this.ents) e.update && !(e instanceof Angler) && e.update(this, dt);
      return;
    }
    if (!live) return;
    if (this.state === 'play') this.stats.time += dt;
    const p = this.player;
    // actions
    if (this.state === 'play' && !this.controlsLocked) {
      if (Input.hit('KeyQ', 'Tab')) { this.bright = !this.bright; this.tip('lamp'); }
      if (Input.hit('Space') && this.flares > 0) { this.flares--; this.flares_.push(new Flare(p.x + p.face * 8, p.y, p.face * 150 + p.vx * 0.5, -30 + p.vy * 0.5)); }
      else if (Input.hit('Space') && this.flares === 0) this.pop(p.x, p.y - 16, 'NO FLARES', '#a08494');
      if (Input.hit('KeyE') && this.pingCool > 0) this.pop(p.x, p.y - 16, 'PING ' + this.pingCool.toFixed(1), '#1a6a62');
      if (Input.hit('KeyE') && this.pingCool <= 0) { const lp = p.lampPos(); this.ping = { x: lp.x, y: lp.y, r: 0, a: 1 }; this.pingNoise = { x: p.x, y: p.y, t: 0.5 }; this.pingCool = 2.5; this.tip('ping'); }
      if (Input.hit('Escape', 'KeyP')) { this.state = 'paused'; UI.pause(true); return; }
      if (Input.axis().x || Input.axis().y) { if (!this.seen.lampHint && this.stats.time > 20) { this.seen.lampHint = 1; this.tip('dim'); } }
    }
    p.update(this, dt);
    // oil
    if (!this.lampOut && this.state === 'play') {
      this.oil -= K.drain[p.mode === 'out' ? 'dim' : p.mode] * dt * (this.god ? 0 : 1);
      if (this.oil < 25 && !this.seen.oilLow) this.tip('oilLow');
      if (this.oil <= 0) { this.oil = 0; this.lampOut = true; this.darkTimer = 0; }
    }
    if (this.lampOut) { this.darkTimer += dt; if (this.darkTimer > 7 && !this.dead) this.die('dark'); }
    this.darkAmt = lerp(this.darkAmt, this.lampOut ? clamp(this.darkTimer / 7, 0.2, 1) : 0, 3 * dt);
    this.pingCool -= dt;
    if (this.ping) { this.ping.r += K.pingSpeed * dt; this.ping.a -= dt / K.pingLife; if (this.ping.a <= 0) this.ping = null; }
    if (this.pingNoise) { this.pingNoise.t -= dt; if (this.pingNoise.t <= 0) this.pingNoise = null; }
    // entities
    for (const e of this.ents) e.update(this, dt);
    this.flares_ = this.flares_.filter(f => f.update(this, dt));
    this.fx = this.fx.filter(f => f.update(this, dt));
    if (this.fx.length > 400) this.fx.splice(0, this.fx.length - 400);
    for (const q of this.pops) { q.life -= dt; q.y -= 14 * dt; } this.pops = this.pops.filter(q => q.life > 0);
    // exits
    if (!this.transitioning && this.state === 'play') {
      const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
      if (this.exits.some(s => Math.abs(s.x - tx) <= 1 && Math.abs(s.y - ty) <= 1) && this.zoneIdx + 1 < GD.zones.length) this.gotoNext();
    }
    // finale trigger
    if (this.whale && !this.finale && this.state === 'play' && Math.hypot(p.x - this.whale.x, p.y - this.whale.y) < 12 * TILE) this.startFinale();
    if (this.finale) this.finale.t += dt;
    if (this.whale && this.finale) this.whale.awake = Math.min(1, this.whale.awake + dt * 0.12);
    // camera
    let tx, ty;
    if (this.finale && this.finale.focus) { tx = this.finale.focus.x - VW / 2; ty = this.finale.focus.y - VH / 2; }
    else { tx = p.x - VW / 2 + p.face * 28 + p.vx * 0.35; ty = p.y - VH / 2 + p.vy * 0.35 + 10; }
    this.camX = lerp(this.camX, clamp(tx, 0, this.world.pxW - VW), 1 - Math.exp(-4 * dt));
    this.camY = lerp(this.camY, clamp(ty, 0, Math.max(0, this.world.pxH - VH)), 1 - Math.exp(-4 * dt));
    this.shake = Math.max(0, this.shake - dt * 14); this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.5);
  },
  startFinale() {
    this.finale = { t: 0, focus: { x: this.whale.x, y: this.whale.y } }; this.controlsLocked = true;
    for (const e of this.ents) if (e instanceof Angler) { e.state = 'return'; e.cool = 99; e.field = this.world.field(Math.floor(e.hx / TILE), Math.floor(e.hy / TILE)); }
    this.player.vx *= 0.2; this.player.vy *= 0.2;
    UI.cards(this.story.whale || [], () => {
      this.finale.focus = null; this.controlsLocked = false;
      if (this.flame) { this.flame.active = true; this.pop(this.flame.x, this.flame.y - 20, 'THE FLAME', '#ffc46b'); }
    }, 4200);
  },

  draw() {
    const c = this.ctx, e = this.ectx; const W = this.world;
    const sx = (Math.random() - .5) * this.shake, sy = (Math.random() - .5) * this.shake;
    const cx = Math.round(this.camX + sx), cy = Math.round(this.camY + sy);
    const realCam = [this.camX, this.camY]; this.camX = cx; this.camY = cy;
    e.clearRect(0, 0, VW, VH);
    if (this.state === 'ending') { Ending.draw(this); this.camX = realCam[0]; this.camY = realCam[1]; this.composite(true); return; }
    // water column
    const [top, bot] = (this.def.water || ['#1f3560', '#0a1024']).map(hexRgb);
    for (let y = 0; y < VH; y += 2) {
      const wy = cy + y, k = clamp(wy / W.pxH, 0, 1);
      if (wy < W.surfaceY) { const s = clamp(wy / Math.max(1, W.surfaceY), 0, 1); c.fillStyle = `rgb(${lerp(120, 200, s)},${lerp(150, 190, s)},${lerp(190, 205, s)})`; }
      else c.fillStyle = `rgb(${lerp(top[0], bot[0], k) * 255 | 0},${lerp(top[1], bot[1], k) * 255 | 0},${lerp(top[2], bot[2], k) * 255 | 0})`;
      c.fillRect(0, y, VW, 2);
    }
    // parallax backgrounds
    const layers = Assets.bg[this.def.id] || [];
    c.save(); const clipTop = Math.max(0, W.surfaceY - cy); c.beginPath(); c.rect(0, clipTop, VW, VH); c.clip();
    for (const L of layers) {
      const im = L.img, pw = im.width, ph = im.height, ox = -((cx * L.parallax) % pw), oy = -((cy * L.parallax) % ph);
      for (let yy = oy - ph; yy < VH; yy += ph) for (let xx = ox - pw; xx < VW; xx += pw) c.drawImage(im, Math.round(xx), Math.round(yy));
    }
    c.restore();
    // marine snow (lit by whatever is near it)
    c.fillStyle = '#c8d8f0';
    for (let i = 0; i < 90; i++) {
      const par = 0.5 + hash(i, 7) * 0.6;
      const x = ((hash(i, 1) * 997 - cx * par + Math.sin(this.t * 0.3 + i) * 6) % VW + VW) % VW;
      const y = ((hash(i, 2) * 991 - cy * par + this.t * (4 + hash(i, 3) * 6)) % VH + VH) % VH;
      if (cy + y < W.surfaceY) continue; c.globalAlpha = 0.35 + hash(i, 4) * 0.5; c.fillRect(x | 0, y | 0, 1, 1);
    }
    c.globalAlpha = 1;
    // surface line
    if (W.surfaceY > cy - 4 && W.surfaceY < cy + VH + 4) {
      for (let x = 0; x < VW; x++) { const h = Math.round(Math.sin((x + cx) * 0.08 + this.t * 2) * 1.5 + Math.sin((x + cx) * 0.21 - this.t * 1.3)); c.fillStyle = '#b8e8ff'; c.fillRect(x, W.surfaceY - cy + h - 1, 1, 1); c.fillStyle = '#5286a8'; c.fillRect(x, W.surfaceY - cy + h, 1, 2); }
    }
    // decorations behind tiles
    for (const en of this.ents) if (en instanceof Deco || en instanceof Vent || en instanceof Whale) en.draw(this);
    // tiles
    c.drawImage(W.tileCanvas, cx, cy, VW, VH, 0, 0, VW, VH);
    // everything else
    for (const en of this.ents) if (!(en instanceof Deco || en instanceof Vent || en instanceof Whale)) en.draw(this);
    for (const f of this.flares_) f.draw(this);
    if (this.state !== 'title') this.player.draw(this);
    for (const f of this.fx) f.draw(this);
    if (this.state === 'title') UI.drawLogo(this);
    this.composite(false);
    this.camX = realCam[0]; this.camY = realCam[1];
  },
  composite(ending) {
    const p = this.player, lp = p.lampPos();
    const mode = this.state === 'title' ? 'low' : p.mode;
    const r = mode === 'out' ? 0 : K.lampRadius[mode], s = { bright: 1.9, low: 1.55, dim: 1.0, out: 0 }[mode];
    const dy = clamp(p.vy / 160, -0.5, 0.5), dl = Math.hypot(p.face, dy);
    const sun = ending ? 0 : ({ 1: 1.0, 2: 0.4 }[this.def.id] || 0);
    const f = {
      camX: this.camX, camY: this.camY, time: this.t, ambient: ending ? Ending.ambient : Math.max(0.06, this.def.ambient ?? 0.2), ambCol: ending ? [1.0, 0.86, 0.76] : [0.55, 0.72, 1.0], sun, surfaceY: this.world.surfaceY,
      fade: this.fade, hurt: this.hurtFlash, dark: this.darkAmt, wobble: this.def.id >= 4 ? 0.6 : 0.25,
      lights: this.lightsList,
      lamp: ending || this.state === 'title' && false ? { x: 0, y: 0, r: 0, s: 0, c: C.lamp, dx: 1, dy: 0, cos: 0 } : { x: lp.x, y: lp.y, r, s: s * (this.lampOut ? 0 : 1) * (1 + Math.sin(this.t * 23) * 0.015) * (this.oil < 12 && !this.lampOut && hash(Math.floor(this.t * 14), 3) < 0.25 ? 0.35 : 1), c: C.lamp, dx: p.face / dl, dy: dy / dl, cos: K.lampCone[mode === 'out' ? 'dim' : mode] },
      ping: this.ping ? { x: this.ping.x, y: this.ping.y, r: this.ping.r, a: this.ping.a } : { x: 0, y: 0, r: 0, a: 0 }
    };
    if (this.state === 'title') f.lamp.s = 0;
    if (ending) f.lamp.s = 0;
    Renderer.draw(this.scene, this.emit, f);
    HUD.draw(this);
  },
  loop(ts) {
    const dt = Math.min(0.05, (ts - this.last) / 1000); this.last = ts;
    Input.poll();
    this.fade = lerp(this.fade, this.fadeTarget, 1 - Math.exp(-5 * dt)); if (Math.abs(this.fade - this.fadeTarget) < 0.002) this.fade = this.fadeTarget;
    if (this.state === 'title' && (Input.hit('Enter', 'Space') || (Input.pad && Input.pad.b[0]))) { this.hasSave ? UI.titleSelect() : this.startNew(); }
    else if (this.state === 'paused') { if (Input.hit('Escape', 'KeyP')) { this.state = 'play'; UI.pause(false); } if (Input.hit('KeyR')) { UI.pause(false); this.die('dark'); } if (Input.hit('KeyA')) { this.assist = !this.assist; this.god = this.assist; UI.assist(this.assist); } }
    else UI.handleInput(this);
    if (this.state !== 'paused' && this.state !== 'lore') this.update(dt);
    this.draw();
    Input.endFrame();
    requestAnimationFrame(t => this.loop(t));
  }
};

// ---------- HUD (unlit layer, 480x270) ----------
const HUD = {
  icon(c, name, x, y, fb) { const r = Assets.ui && Assets.ui[name]; if (r && Assets.uiImg) { c.drawImage(Assets.uiImg, r[0], r[1], r[2], r[3], x, y, r[2], r[3]); return r[2]; } fb(); return 8; },
  draw(g) {
    const c = g.hctx; c.clearRect(0, 0, VW, VH);
    if (g.state === 'title' || g.state === 'ending' || g.state === 'intro') return;
    const p = g.player;
    // oil
    const w = this.icon(c, 'oil_icon', 6, 6, () => { c.fillStyle = '#ffc46b'; c.fillRect(8, 8, 5, 7); c.fillStyle = '#fff0c2'; c.fillRect(9, 6, 3, 3); });
    const bx = 8 + w + 2, frac = g.oil / K.oilMax;
    c.fillStyle = '#050814'; c.fillRect(bx - 1, 8, 62, 7); c.fillStyle = '#231a2a'; c.fillRect(bx, 9, 60, 5);
    const col = frac < 0.25 ? (Math.floor(g.t * 4) % 2 ? '#c93a4a' : '#ff6fa8') : frac < 0.5 ? '#d98a2b' : '#ffc46b';
    c.fillStyle = col; c.fillRect(bx, 9, Math.round(60 * frac), 5); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(bx, 9, Math.round(60 * frac), 1);
    const mode = g.lampOut ? 'OUT' : p.mode.toUpperCase();
    pixText(c, 'LAMP ' + mode, bx, 17, g.lampOut ? '#c93a4a' : p.mode === 'dim' ? '#9d8fc4' : p.mode === 'bright' ? '#fff0c2' : '#ffc46b');
    // hull
    for (let i = 0; i < K.hullMax; i++) this.icon(c, i < g.hull ? 'hull_full' : 'hull_empty', 8 + i * 10, 26, () => { c.fillStyle = i < g.hull ? '#d98a2b' : '#33263a'; c.fillRect(8 + i * 10, 27, 7, 6); c.fillStyle = i < g.hull ? '#ffc46b' : '#4a364c'; c.fillRect(8 + i * 10, 27, 7, 1); });
    // flares
    this.icon(c, 'flare_icon', 42, 26, () => { c.fillStyle = '#c93a4a'; c.fillRect(44, 27, 3, 6); c.fillStyle = '#fff0c2'; c.fillRect(44, 26, 3, 2); });
    pixText(c, 'x' + g.flares, 53, 28, g.flares ? '#ff6fa8' : '#6d628f');
    // ping cooldown
    if (g.pingCool > 0) { c.fillStyle = '#1a6a62'; c.fillRect(70, 30, Math.round(16 * (1 - g.pingCool / 2.5)), 2); }
    // depth + pages (top right)
    const d = g.def.depth || [0, 100]; const depth = Math.max(0, Math.round(lerp(d[0], d[1], clamp((p.y - g.world.surfaceY) / (g.world.pxH - Math.max(0, g.world.surfaceY)), 0, 1))));
    const ds = depth + ' M'; pixText(c, ds, VW - 8 - pixTextW(ds), 8, '#b8e8ff');
    const zn = (g.def.name || '').toUpperCase(); pixText(c, zn, VW - 8 - pixTextW(zn), 16, '#5286a8');
    const tot = g.loreTotal(); if (tot) { const ls = 'PAGES ' + g.loreFound.length + '/' + tot; pixText(c, ls, VW - 8 - pixTextW(ls), 24, '#a08494'); }
    // popups
    for (const q of g.pops) { c.globalAlpha = Math.min(1, q.life * 2); pixText(c, q.text, Math.round(q.x - g.camX - pixTextW(q.text) / 2), Math.round(q.y - g.camY), q.col); }
    c.globalAlpha = 1;
    if (g.lampOut && !g.dead) { const s = 'FIND A GLIMMER'; if (Math.floor(g.t * 3) % 2) pixText(c, s, (VW - pixTextW(s)) / 2, VH / 2 + 30, '#5fe0c8'); }
  }
};

function fit() {
  const s = Math.min(innerWidth / VW, innerHeight / VH); const k = s >= 1 ? (s >= 2 ? Math.floor(s) : s) : s;
  const W = Math.round(VW * k), H = Math.round(VH * k);
  for (const el of [$('#gl'), $('#hud')]) { el.style.width = W + 'px'; el.style.height = H + 'px'; }
  const st = $('#stage'); st.style.width = W + 'px'; st.style.height = H + 'px'; st.style.fontSize = (k * 6) + 'px';
}

window.GLIMMER = {
  get game() { return Game; },
  tp(zone, tx, ty) { clearTimeout(Game.transTimer); Game.transitioning = false; Game.fadeTarget = 0; Game.dead = false; if (zone - 1 !== Game.zoneIdx || Game.state === 'ending') Game.enterZone(zone - 1, null, false); if (tx !== undefined) { Game.player.x = tx * TILE + 8; Game.player.y = ty * TILE + 8; Game.snapCam(); } Game.state = 'play'; Game.controlsLocked = false; UI.title(false); UI.clear(); },
  god(on = true) { Game.god = on; },
  lamp(mode) { Game.bright = mode === 'bright'; },
  flares(n) { Game.flares = n; },
  shot() { return $('#gl').toDataURL('image/png'); },
  freeze(on = true) { Game.frozen = on; },
  hud(on = true) { $('#hud').style.display = on ? '' : 'none'; },
  // QA bot: swims the zone from its start to the exit (or the flame) along a wall-avoiding shortest path.
  // Reports whether it arrived, the time taken, the lowest oil and the hits/deaths along the way.
  autoplay(zone, opt = {}) {
    GLIMMER.tp(zone); Game.enterZone(zone - 1, null, false); const g = Game, W = g.world; UI.clear();
    g.oil = 100; g.hull = 3; g.flares = opt.flares ?? g.flares; const mode = opt.mode || 'low'; g.bright = mode === 'bright';
    const goals = W.spawns.filter(s => s.ch === 'X' || s.ch === '*');
    const N = W.w * W.h, dist = new Float32Array(N).fill(1e9), open = [];
    const wallNear = i => { const x = i % W.w, y = (i / W.w) | 0; let n = 0; for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (W.isSolid(x + ox, y + oy)) n++; return n; };
    for (const s of goals) { const i = s.y * W.w + s.x; dist[i] = 0; open.push(i); }
    while (open.length) { // simple Dijkstra (maps are small)
      let bi = 0; for (let k = 1; k < open.length; k++) if (dist[open[k]] < dist[open[bi]]) bi = k;
      const c = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      const cx = c % W.w, cy = (c / W.w) | 0;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + ox, ny = cy + oy; if (W.isSolid(nx, ny)) continue; const ni = ny * W.w + nx; const nd = dist[c] + 1 + wallNear(ni) * 0.6; if (nd < dist[ni]) { if (dist[ni] === 1e9) open.push(ni); dist[ni] = nd; } }
    }
    let t = 0, minOil = 100, hits = 0, deaths = 0, lastHull = g.hull, stuck = 0, lastPos = [g.player.x, g.player.y], zone0 = g.zoneIdx;
    const maxT = opt.maxSec || 600, trace = [];
    while (t < maxT) {
      const p = g.player; const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
      if (g.transitioning || g.zoneIdx !== zone0 || g.state === 'ending' || W.grid[ty] && W.grid[ty][tx] === 'X') return { arrived: true, time: +t.toFixed(1), minOil: +minOil.toFixed(1), hits, deaths, trace };
      if (g.state === 'dead') { deaths++; g.respawn(); lastHull = g.hull; }
      if (UI.cardQ) UI.nextCard(); if (UI.loreDone) UI.closeLore();
      let best = dist[ty * W.w + tx], bx = 0, by = 0;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { if (!ox && !oy) continue; if (ox && oy && (W.isSolid(tx + ox, ty) || W.isSolid(tx, ty + oy))) continue; const d = dist[(ty + oy) * W.w + tx + ox]; if (!W.isSolid(tx + ox, ty + oy) && d < best) { best = d; bx = ox; by = oy; } }
      // steer toward the next tile's centre, blended with centring in the current tile
      const gx = (tx + bx) * TILE + 8 - p.x, gy = (ty + by) * TILE + 8 - p.y;
      const keys = [];
      if (gx > 3) keys.push('ArrowRight'); if (gx < -3) keys.push('ArrowLeft'); if (gy > 3) keys.push('ArrowDown'); if (gy < -3) keys.push('ArrowUp');
      const threat = g.ents.some(e => e instanceof Angler && Math.hypot(e.x - p.x, e.y - p.y) < 12 * TILE) || g.ents.some(e => e instanceof Eel && Math.hypot(e.den.x - p.x, e.den.y - p.y) < 7 * TILE);
      if (mode === 'dim' || (opt.smart && threat)) keys.push('ShiftLeft');
      Input.down = new Set(keys);
      for (let k = 0; k < 6; k++) { g.update(1 / 60); t += 1 / 60; }
      minOil = Math.min(minOil, g.oil); if (g.hull < lastHull) hits += lastHull - g.hull; lastHull = g.hull;
      if (Math.hypot(p.x - lastPos[0], p.y - lastPos[1]) < 0.5) stuck += 0.1; else stuck = 0; lastPos = [p.x, p.y];
      if (Math.round(t * 10) % 50 === 0) trace.push([tx, ty, +g.oil.toFixed(0)]);
      if (stuck > 6) { Input.down.clear(); return { arrived: false, stuckAt: [tx, ty], time: +t.toFixed(1), minOil: +minOil.toFixed(1), hits, deaths, trace }; }
    }
    Input.down.clear();
    return { arrived: false, timeout: true, at: [Math.floor(g.player.x / TILE), Math.floor(g.player.y / TILE)], minOil, hits, deaths, trace };
  },
  // capture frames to studio/tools/framesink.py (127.0.0.1:4599). keys: array, or fn(t) -> {keys, press}
  async record(clip, sec, keys = [], opt = {}) {
    const fps = opt.fps || 30, n = Math.round(sec * fps), start = opt.start || 0, cv = document.createElement('canvas');
    cv.width = VW; cv.height = VH; const c = cv.getContext('2d');
    for (let i = 0; i < n; i++) {
      const k = typeof keys === 'function' ? keys(i / fps) : { keys };
      Input.down = new Set(k.keys || []); (k.press || []).forEach(p => Input.pressed.add(p));
      const sub = Math.round(60 / fps);
      for (let s = 0; s < sub; s++) { UI.handleInput(Game); Game.update(1 / 60); Input.pressed.clear(); }
      Game.fade = Game.fadeTarget; Game.draw();
      c.drawImage($('#gl'), 0, 0); if (opt.hud) c.drawImage($('#hud'), 0, 0);
      await fetch(`http://127.0.0.1:4599/${clip}/${start + i}`, { method: 'POST', body: cv.toDataURL('image/png') });
    }
    Input.down.clear(); return start + n;
  },
  // deterministic stepping for tests and screenshots: hold keys for `sec` seconds of game time
  step(sec, keys = [], press = []) {
    Input.down = new Set(keys); press.forEach(k => Input.pressed.add(k));
    const n = Math.round(sec * 60);
    for (let i = 0; i < n; i++) { UI.handleInput(Game); Game.update(1 / 60); Game.fade = Game.fadeTarget; Input.pressed.clear(); }
    Input.down.clear(); Game.draw();
    const g = Game; return { state: g.state, zone: g.zoneIdx + 1, x: g.player.x | 0, y: g.player.y | 0, tx: (g.player.x / 16) | 0, ty: (g.player.y / 16) | 0, oil: +g.oil.toFixed(1), hull: g.hull, flares: g.flares, pages: g.loreFound.length };
  }
};
addEventListener('load', () => Game.boot());
