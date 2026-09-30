// GLIMMERDEEP — everything that lives in the water.
'use strict';
const C = { lamp: [1.0, 0.78, 0.45], teal: [0.37, 0.88, 0.78], pink: [1.0, 0.44, 0.66], gold: [1.0, 0.77, 0.42], flare: [1.0, 0.35, 0.3], cold: [0.55, 0.7, 1.0] };

class Player {
  constructor(x, y) { this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.face = 1; this.hw = 9; this.hh = 6; this.t = 0; this.inv = 0; this.bubbleT = 0; this.mode = 'low'; this.tilt = 0; }
  update(g, dt) {
    const W = g.world; this.t += dt;
    const a = g.controlsLocked ? { x: 0, y: 0 } : Input.axis();
    const inAir = W.isAir(this.x, this.y);
    this.vx += a.x * K.accel * dt; this.vy += a.y * K.accel * dt * (inAir && a.y < 0 ? 0 : 1);
    if (inAir) this.vy += K.airGravity * dt;
    const [cx, cy] = W.currentAt(this.x, this.y);
    if (cx || cy) { this.vx += cx * 260 * dt; this.vy += cy * 300 * dt; if (!g.seen.current) g.tip('current'); }
    const drag = Math.exp(-K.drag * dt); this.vx *= drag; this.vy *= inAir ? 0.995 : drag;
    const sp = Math.hypot(this.vx, this.vy), max = K.maxSpeed * (cx || cy ? 1.8 : 1);
    if (sp > max) { this.vx *= max / sp; this.vy *= max / sp; }
    // idle bob
    const bob = Math.sin(this.t * 2.2) * 3 * dt;
    const hit = W.move(this, this.vx * dt, this.vy * dt + bob, this.hw, this.hh);
    if (hit.hitX) this.vx *= -0.25; if (hit.hitY) this.vy *= -0.25;
    if (a.x > 0.1) this.face = 1; else if (a.x < -0.1) this.face = -1;
    this.tilt = lerp(this.tilt, clamp(this.vy / K.maxSpeed, -1, 1) * 0.3, 0.1);
    this.inv = Math.max(0, this.inv - dt);
    // lamp mode
    this.mode = g.lampOut ? 'out' : Input.held('ShiftLeft', 'ShiftRight') ? 'dim' : g.bright ? 'bright' : 'low';
    // bubbles
    this.bubbleT -= dt * (0.6 + Math.hypot(a.x, a.y) * 3);
    if (this.bubbleT < 0 && !inAir) { this.bubbleT = 0.35; g.fx.push(new Bubble(this.x - this.face * 11, this.y + 2 + Math.random() * 3)); }
    this.moving = Math.hypot(a.x, a.y) > 0.1;
  }
  lampPos() { return { x: this.x + this.face * 11, y: this.y + 1 }; }
  draw(g) {
    const anim = this.inv > 0.8 ? 'hurt' : this.moving ? 'swim' : 'idle';
    if (this.inv > 0 && Math.floor(this.inv * 12) % 2 === 0 && this.inv < 0.8) return;
    drawSprite(g.ctx, g.ectx, 'wick', anim, this.t, this.x - g.camX, this.y - g.camY, this.face < 0, { emitAlpha: this.mode === 'out' ? 0.15 : this.mode === 'dim' ? 0.45 : 1 });
  }
  hurt(g, kind, fromX, fromY) {
    if (this.inv > 0 || g.god || g.finale || g.transitioning) return false;
    g.hull--; this.inv = 1.6; g.hurtFlash = 1; g.shake = 6;
    const d = Math.hypot(this.x - fromX, this.y - fromY) || 1; this.vx = (this.x - fromX) / d * 140; this.vy = (this.y - fromY) / d * 140;
    if (g.hull <= 0) g.die(kind); else if (g.hull === 1) g.tip('hullLow');
    return true;
  }
}

class Bubble { constructor(x, y) { this.x = x; this.y = y; this.life = 1.6 + Math.random(); this.vx = (Math.random() - .5) * 6; this.r = Math.random() < 0.3 ? 2 : 1; }
  update(g, dt) { this.y -= 22 * dt; this.x += Math.sin(this.life * 6) * 6 * dt + this.vx * dt; this.life -= dt; if (g.world.solidPx(this.x, this.y) || g.world.isAir(this.x, this.y)) this.life = 0; return this.life > 0; }
  draw(g) { const x = Math.round(this.x - g.camX), y = Math.round(this.y - g.camY); g.ctx.fillStyle = '#b8e8ff'; g.ctx.globalAlpha = Math.min(1, this.life) * 0.8; g.ctx.fillRect(x, y, this.r, this.r); if (this.r > 1) { g.ctx.fillStyle = '#ffffff'; g.ctx.fillRect(x, y, 1, 1); } g.ctx.globalAlpha = 1; } }

class Spark { constructor(x, y, col, vx, vy, life = 0.8) { Object.assign(this, { x, y, col, vx, vy, life, max: life }); }
  update(g, dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.vx *= 0.94; this.vy *= 0.94; this.life -= dt; return this.life > 0; }
  draw(g) { g.ectx.globalAlpha = this.life / this.max; g.ectx.fillStyle = this.col; g.ectx.fillRect(Math.round(this.x - g.camX), Math.round(this.y - g.camY), 1, 1); g.ectx.globalAlpha = 1; } }

class Pickup {
  constructor(kind, x, y) { this.kind = kind; this.x = x; this.y = y; this.t = Math.random() * 10; this.alive = true; this.bx = x; this.by = y; }
  update(g, dt) {
    this.t += dt; if (!this.alive) return;
    const p = g.player;
    if (this.kind === 'glimmer' || this.kind === 'glimmer_big') {
      this.x = this.bx + Math.sin(this.t * 0.9) * 3; this.y = this.by + Math.sin(this.t * 1.3) * 2;
      const d = Math.hypot(p.x - this.x, p.y - this.y);
      if (d < 40 && d > 1) { this.bx += (p.x - this.x) / d * 20 * dt * (1 - d / 40); this.by += (p.y - this.y) / d * 20 * dt * (1 - d / 40); }
      if (d < 13) {
        this.alive = false; const v = this.kind === 'glimmer' ? 15 : 50; g.oil = Math.min(K.oilMax, g.oil + v); g.stats.glimmers++;
        for (let i = 0; i < (v > 20 ? 18 : 8); i++) g.fx.push(new Spark(this.x, this.y, i % 2 ? '#b8fff0' : '#5fe0c8', (Math.random() - .5) * 70, (Math.random() - .5) * 70));
        if (g.lampOut) g.relight(); g.tip('glimmer'); g.pop(this.x, this.y - 10, '+' + v, '#5fe0c8');
      }
    } else if (Math.hypot(p.x - this.x, p.y - this.y) < 14) {
      this.alive = false;
      if (this.kind === 'crate') { g.flares += 2; g.pop(this.x, this.y - 10, '+2 FLARES', '#ff6fa8'); g.tip('flare'); }
      if (this.kind === 'patch') { if (g.hull < K.hullMax) g.hull++; g.pop(this.x, this.y - 10, '+1 HULL', '#ffc46b'); }
    }
  }
  draw(g) {
    if (!this.alive) return;
    const name = this.kind; const anim = { glimmer: 'pulse', glimmer_big: 'pulse', crate: 'idle', patch: 'idle' }[name];
    drawSprite(g.ctx, g.ectx, name, anim, this.t, this.x - g.camX, this.y - g.camY + (name === 'crate' || name === 'patch' ? Math.sin(this.t * 2) : 0));
    if (name.startsWith('glimmer')) g.light(this.x, this.y, name === 'glimmer' ? 26 : 48, 0.55, C.teal);
  }
}

class Buoy {
  constructor(x, y, idx) { this.x = x; this.y = y; this.on = false; this.t = 0; this.idx = idx; }
  update(g, dt) {
    this.t += dt; const p = g.player;
    if (Math.hypot(p.x - this.x, p.y - (this.y - 14)) < 22 && (!this.on || g.checkpoint !== this)) {
      if (!this.on) { for (let i = 0; i < 14; i++) g.fx.push(new Spark(this.x, this.y - 26, '#ffc46b', (Math.random() - .5) * 60, -Math.random() * 60)); g.pop(this.x, this.y - 40, 'SAVED', '#ffc46b'); }
      this.on = true; g.setCheckpoint(this);
    }
  }
  draw(g) { drawSprite(g.ctx, g.ectx, 'buoy', this.on ? 'on' : 'off', this.t, this.x - g.camX, this.y - g.camY + Math.sin(this.t * 1.5) * 1.5); if (this.on) g.light(this.x, this.y - 26, 70, 0.8, C.gold); else g.light(this.x, this.y - 26, 20, 0.25, C.gold); }
}

class Bottle {
  constructor(x, y, id) { this.x = x; this.y = y; this.id = id; this.t = Math.random() * 5; this.alive = true; }
  update(g, dt) { this.t += dt; if (this.alive && !g.controlsLocked && !g.finale && Math.hypot(g.player.x - this.x, g.player.y - this.y) < 14) { this.alive = false; g.readLore(this.id); } }
  draw(g) { if (!this.alive) return; drawSprite(g.ctx, g.ectx, 'bottle', 'bob', this.t, this.x - g.camX, this.y - g.camY); g.light(this.x, this.y, 22, 0.35, C.gold); }
}

class Deco {
  constructor(name, x, y, variant, anim) { this.name = name; this.x = x; this.y = y; this.v = variant; this.anim = anim; this.t = Math.random() * 10; }
  update(g, dt) { this.t += dt; }
  draw(g) {
    const s = Assets.sprites[this.name]; if (!s) return;
    if (this.anim) drawSprite(g.ctx, g.ectx, this.name, this.anim, this.t, this.x - g.camX, this.y - g.camY);
    else { const list = Object.values(s.anims || {})[0]?.frames || [0]; drawSprite(g.ctx, g.ectx, this.name, null, 0, this.x - g.camX, this.y - g.camY, hash(this.x, this.y) > 0.5, { frame: this.v % list.length }); }
  }
}

class Flare {
  constructor(x, y, vx, vy) { this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.life = K.flareBurn; this.t = 0; }
  update(g, dt) {
    this.t += dt; this.life -= dt; this.vy += 30 * dt; this.vx *= Math.exp(-1.5 * dt); this.vy *= Math.exp(-1.2 * dt); this.vy = Math.min(this.vy, 18);
    const h = g.world.move(this, this.vx * dt, this.vy * dt, 2, 2); if (h.hitX) this.vx *= -0.4; if (h.hitY) { this.vy *= -0.2; this.vx *= 0.7; }
    if (Math.random() < 0.5) g.fx.push(new Spark(this.x, this.y, Math.random() < .5 ? '#ff6fa8' : '#ffc46b', (Math.random() - .5) * 20, -10 - Math.random() * 20, 0.6));
    return this.life > 0;
  }
  get strength() { return this.life < 1.5 ? this.life / 1.5 : 1; }
  draw(g) { drawSprite(g.ctx, g.ectx, 'flare', 'burn', this.t, this.x - g.camX, this.y - g.camY); const fl = 0.85 + Math.random() * 0.15; g.light(this.x, this.y, 110 * this.strength + 20, 1.1 * fl * this.strength, C.flare); }
}

// ----- creatures -----
class Angler {
  constructor(x, y) { this.x = x; this.y = y; this.hx = x; this.hy = y; this.vx = 30; this.vy = 0; this.face = 1; this.state = 'patrol'; this.t = Math.random() * 9; this.cool = 0; this.think = 0; this.field = null; this.target = null; this.lost = 0; this.bite = 0; this.hw = 10; this.hh = 7; }
  update(g, dt) {
    this.t += dt; this.cool = Math.max(0, this.cool - dt); this.bite = Math.max(0, this.bite - dt);
    const p = g.player, W = g.world;
    // what does it perceive? the brightest light in reach
    this.think -= dt;
    if (this.think <= 0) {
      this.think = 0.25;
      let best = null, score = 0;
      for (const f of g.flares_) { const d = Math.hypot(f.x - this.x, f.y - this.y); if (d < 20 * TILE && W.sees(this.x, this.y, f.x, f.y)) { const s = f.strength * 3 * (1 - d / (20 * TILE)); if (s > score) { score = s; best = { x: f.x, y: f.y, flare: true }; } } }
      const sight = g.lampOut ? K.sight.dim * 0.6 : K.sight[p.mode] || K.sight.low;
      const dp = Math.hypot(p.x - this.x, p.y - this.y);
      if (!g.dead && dp < sight && W.sees(this.x, this.y, p.x, p.y)) { const s = 1.2 * (1 - dp / sight) + 0.3; if (s > score) { score = s; best = { x: p.x, y: p.y, player: true }; } }
      if (g.pingNoise && this.state === 'patrol' && Math.hypot(g.pingNoise.x - this.x, g.pingNoise.y - this.y) < (W.sees(this.x, this.y, g.pingNoise.x, g.pingNoise.y) ? 16 : 10) * TILE) best = best || { x: g.pingNoise.x, y: g.pingNoise.y, noise: true };
      if (best && this.cool <= 0) {
        if (this.state === 'patrol' && best.player) { g.tip('angler'); g.alarm(this); }
        this.state = 'hunt'; this.target = best; this.lost = 0;
        this.field = W.field(Math.floor(best.x / TILE), Math.floor(best.y / TILE));
      } else if (this.state === 'hunt') {
        this.lost += 0.25; if (this.lost > 3.5) { this.state = 'return'; this.field = W.field(Math.floor(this.hx / TILE), Math.floor(this.hy / TILE)); }
      }
    }
    let ax = 0, ay = 0, speed = 30;
    if (this.state === 'patrol') {
      ax = this.face; ay = Math.sin(this.t * 0.7) * 0.4 + (this.hy - this.y) * 0.02;
      if (W.boxHits(this.x + this.face * 16, this.y, this.hw, this.hh) || Math.abs(this.x - this.hx) > 7 * TILE && Math.sign(this.x - this.hx) === this.face) { this.face *= -1; this.vx = this.face * 4; }
    } else {
      speed = this.state === 'hunt' ? K.maxSpeed * (this.target && this.target.flare ? 0.95 : 0.8) : 35;
      // ambush lunge: a short burst when it closes on a lit Wick, then a sluggish recovery
      this.lungeCd = Math.max(0, (this.lungeCd || 0) - dt); this.lunge = Math.max(0, (this.lunge || 0) - dt);
      if (this.state === 'hunt' && this.target && this.target.player && this.lungeCd <= 0 && !g.controlsLocked && p.mode !== 'dim' && p.mode !== 'out' && Math.hypot(p.x - this.x, p.y - this.y) < 5 * TILE && W.sees(this.x, this.y, p.x, p.y)) { this.lunge = 0.7; this.lungeCd = 2.6; }
      if (this.lunge > 0) speed = K.maxSpeed * 1.45; else if (this.lungeCd > 1.6) speed *= 0.45;
      const tgt = this.state === 'hunt' ? this.target : { x: this.hx, y: this.hy };
      const direct = W.sees(this.x, this.y, tgt.x, tgt.y);
      if (direct) { ax = tgt.x - this.x; ay = tgt.y - this.y; }
      else if (this.field) {
        const tx = Math.floor(this.x / TILE), ty = Math.floor(this.y / TILE); let bd = 1e9, bx = 0, by = 0;
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const nx = tx + ox, ny = ty + oy; if (nx < 0 || ny < 0 || nx >= W.w || ny >= W.h) continue; const d = this.field[ny * W.w + nx]; if (d >= 0 && d < bd) { bd = d; bx = ox; by = oy; } }
        ax = bx; ay = by;
      }
      const m = Math.hypot(ax, ay) || 1; ax /= m; ay /= m;
      if (this.state === 'return' && Math.hypot(this.x - this.hx, this.y - this.hy) < 20) this.state = 'patrol';
      if (this.target && this.target.flare && Math.hypot(tgt.x - this.x, tgt.y - this.y) < 14) { this.cool = 2.5; this.state = 'return'; this.field = W.field(Math.floor(this.hx / TILE), Math.floor(this.hy / TILE)); }
      if (this.target && this.target.noise && Math.hypot(tgt.x - this.x, tgt.y - this.y) < 24) { this.state = 'return'; this.field = W.field(Math.floor(this.hx / TILE), Math.floor(this.hy / TILE)); }
    }
    const resp = this.lunge > 0 ? 6 : 2.5; this.vx = lerp(this.vx, ax * speed, resp * dt); this.vy = lerp(this.vy, ay * speed, resp * dt);
    if (this.state !== 'patrol' && Math.abs(this.vx) > 3) this.face = Math.sign(this.vx);
    W.move(this, this.vx * dt, this.vy * dt, this.hw, this.hh);
    // bite
    const mx = this.x + this.face * 14, my = this.y + 2;
    if (!g.dead && !g.finale && Math.hypot(p.x - mx, p.y - my) < 14 && this.cool <= 0) {
      this.bite = 0.4;
      if (p.hurt(g, 'bite', this.x, this.y)) { this.cool = 2.2; this.state = 'return'; this.field = W.field(Math.floor(this.hx / TILE), Math.floor(this.hy / TILE)); }
    }
  }
  draw(g) {
    const anim = this.bite > 0 || this.lunge > 0.35 ? 'bite' : this.state === 'hunt' ? 'chase' : 'swim';
    drawSprite(g.ctx, g.ectx, 'angler', anim, this.t, this.x - g.camX, this.y - g.camY, this.face < 0);
    const s = Assets.sprites.angler; const lx = this.x + this.face * ((s && s.lure ? s.lure[0] : 13)), ly = this.y + (s && s.lure ? s.lure[1] : -12);
    const pulse = 0.7 + Math.sin(this.t * (this.state === 'hunt' ? 9 : 2.5)) * 0.3;
    g.light(lx, ly, 46, 0.7 * pulse, this.state === 'hunt' ? [0.6, 1, 0.9] : C.teal);
  }
}

class Jelly {
  constructor(x, y) { this.x = x; this.y = y; this.bx = x; this.by = y; this.t = Math.random() * 20; }
  update(g, dt) {
    this.t += dt; this.x = this.bx + Math.sin(this.t * 0.4) * 10; this.y = this.by + Math.sin(this.t * 0.8) * 22;
    const p = g.player; if (Math.hypot(p.x - this.x, p.y - (this.y + 4)) < 11) { p.hurt(g, 'sting', this.x, this.y); g.tip('jelly'); }
    else if (Math.hypot(p.x - this.x, p.y - this.y) < 60) g.tip('jelly');
  }
  draw(g) { drawSprite(g.ctx, g.ectx, 'jelly', 'drift', this.t, this.x - g.camX, this.y - g.camY); g.light(this.x, this.y - 2, 58, 0.75, C.pink); }
}

class Eel {
  constructor(x, y, W) {
    this.den = { x, y }; this.t = Math.random() * 5; this.out = 0; this.state = 'hide'; this.timer = 0;
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    // lunge away from the nearest wall
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]; this.dir = [1, 0];
    for (const [dx, dy] of dirs) if (W.isSolid(tx - dx, ty - dy)) { this.dir = [dx, dy]; break; }
    this.x = x; this.y = y; this.reach = 5 * TILE;
  }
  update(g, dt) {
    this.t += dt; const p = g.player;
    const rx = p.x - this.den.x, ry = p.y - this.den.y, along = rx * this.dir[0] + ry * this.dir[1], across = Math.abs(rx * this.dir[1] - ry * this.dir[0]);
    if (this.state === 'hide') {
      this.out = lerp(this.out, 0.08 + Math.sin(this.t) * 0.04, 3 * dt);
      const lit = p.mode !== 'dim' && p.mode !== 'out';
      if (!g.dead && !g.controlsLocked && lit && along > 0 && along < this.reach + 10 && across < 2.2 * TILE && g.world.sees(this.den.x + this.dir[0] * 8, this.den.y + this.dir[1] * 8, p.x, p.y)) { this.state = 'lunge'; this.timer = 0; g.tip('eel'); }
      else if (!g.dead && along > 0 && along < this.reach && across < 2.2 * TILE && !lit) g.tip('eel');
    } else if (this.state === 'lunge') { this.timer += dt; this.out = Math.min(1, this.out + dt * 4.5); if (this.timer > 0.55) this.state = 'back'; }
    else { this.out -= dt * 0.8; if (this.out <= 0.1) { this.state = 'hide'; this.timer = 0; } }
    this.x = this.den.x + this.dir[0] * this.reach * this.out; this.y = this.den.y + this.dir[1] * this.reach * this.out;
    if (this.state !== 'hide' && Math.hypot(p.x - this.x, p.y - this.y) < 11) p.hurt(g, 'bite', this.x - this.dir[0] * 10, this.y - this.dir[1] * 10);
  }
  draw(g) {
    const n = Math.ceil(this.reach * this.out / 7);
    for (let i = n; i >= 1; i--) {
      const k = i / (n + 1), wob = Math.sin(this.t * 6 + i) * 2 * this.out;
      const x = this.den.x + (this.x - this.den.x) * k + this.dir[1] * wob, y = this.den.y + (this.y - this.den.y) * k + this.dir[0] * wob;
      drawSprite(g.ctx, g.ectx, 'eel_body', null, 0, x - g.camX, y - g.camY);
    }
    const flip = this.dir[0] < 0;
    const s = Assets.sprites.eel_head; if (!s) return;
    const ctx = g.ctx; const rot = this.dir[1] !== 0;
    if (rot) {
      for (const c of [g.ctx, g.ectx]) { c.save(); c.translate(Math.round(this.x - g.camX), Math.round(this.y - g.camY)); c.rotate(this.dir[1] > 0 ? Math.PI / 2 : -Math.PI / 2); c.translate(-Math.round(this.x - g.camX), -Math.round(this.y - g.camY)); }
      drawSprite(g.ctx, g.ectx, 'eel_head', this.state === 'hide' ? 'hide' : 'lunge', this.t, this.x - g.camX, this.y - g.camY, false);
      g.ctx.restore(); g.ectx.restore();
    } else drawSprite(g.ctx, g.ectx, 'eel_head', this.state === 'hide' ? 'hide' : 'lunge', this.t, this.x - g.camX, this.y - g.camY, flip);
    if (this.state !== 'hide') g.light(this.x, this.y, 22, 0.3, [1, 0.8, 0.4]);
  }
}

class Urchin {
  constructor(x, y) { this.x = x; this.y = y; this.t = Math.random() * 4; }
  update(g, dt) { this.t += dt; if (Math.hypot(g.player.x - this.x, g.player.y - (this.y - 6)) < 12) g.player.hurt(g, 'spike', this.x, this.y - 6); }
  draw(g) { drawSprite(g.ctx, g.ectx, 'urchin', 'idle', this.t, this.x - g.camX, this.y - g.camY); }
}

class School {
  constructor(x, y) { this.fish = []; for (let i = 0; i < 9; i++) this.fish.push({ x: x + (Math.random() - .5) * 40, y: y + (Math.random() - .5) * 30, vx: (Math.random() - .5) * 20, vy: 0, t: Math.random() * 5 }); this.cx = x; this.cy = y; }
  update(g, dt) {
    const p = g.player;
    for (const f of this.fish) {
      f.t += dt; let ax = (this.cx - f.x) * 0.3 + Math.sin(f.t * 0.7) * 10, ay = (this.cy - f.y) * 0.3 + Math.cos(f.t * 0.9) * 6;
      const d = Math.hypot(f.x - p.x, f.y - p.y); if (d < 50) { ax += (f.x - p.x) / d * 400; ay += (f.y - p.y) / d * 400; }
      f.vx = clamp(f.vx + ax * dt, -60, 60); f.vy = clamp(f.vy + ay * dt, -40, 40); f.vx *= 0.97; f.vy *= 0.97;
      const nx = f.x + f.vx * dt, ny = f.y + f.vy * dt; if (!g.world.solidPx(nx, ny)) { f.x = nx; f.y = ny; } else { f.vx *= -1; f.vy *= -1; }
    }
  }
  draw(g) { for (const f of this.fish) drawSprite(g.ctx, g.ectx, 'lanternfish', 'swim', f.t, f.x - g.camX, f.y - g.camY, f.vx < 0); }
}

class Whale {
  constructor(x, y) { this.x = x; this.y = y; this.t = 0; this.awake = 0; }
  update(g, dt) { this.t += dt; }
  draw(g) {
    drawSprite(g.ctx, g.ectx, 'whale', 'idle', this.t, this.x - g.camX, this.y - g.camY + Math.sin(this.t * 0.4) * 3, false, { emitAlpha: 0.35 + this.awake * 0.65 });
    g.light(this.x, this.y, 160 + this.awake * 120, 0.18 + this.awake * 0.5, [0.5, 0.8, 1.0]);
  }
}

class Flame {
  constructor(x, y) { this.x = x; this.y = y; this.t = 0; this.taken = false; this.active = false; }
  update(g, dt) { this.t += dt; if (this.active && !this.taken && Math.hypot(g.player.x - this.x, g.player.y - this.y) < 16) { this.taken = true; g.takeFlame(this); } }
  draw(g) {
    if (this.taken) return;
    drawSprite(g.ctx, g.ectx, 'flame', 'burn', this.t, this.x - g.camX, this.y - g.camY + Math.sin(this.t * 1.2) * 2, false, { emitAlpha: this.active ? 1 : 0.35 });
    g.light(this.x, this.y, this.active ? 150 : 40, this.active ? 1.2 : 0.3, C.gold);
  }
}

class Vent {
  constructor(x, y) { this.x = x; this.y = y; this.t = Math.random() * 3; this.bt = 0; }
  update(g, dt) { this.t += dt; this.bt -= dt; if (this.bt < 0 && Math.abs(this.x - g.player.x) < VW && Math.abs(this.y - g.player.y) < VH) { this.bt = 0.12; g.fx.push(new Bubble(this.x + (Math.random() - .5) * 10, this.y - 4)); } }
  draw(g) { drawSprite(g.ctx, g.ectx, 'vent', 'puff', this.t, this.x - g.camX, this.y - g.camY); }
}
