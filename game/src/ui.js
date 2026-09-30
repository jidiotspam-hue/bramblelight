// GLIMMERDEEP — HTML overlays (title, cards, tips, lore, death, pause) and the ending sequence.
'use strict';
const UI = {
  init(g) {
    this.g = g; this.el = { title: $('#title'), card: $('#card'), zone: $('#zonecard'), tip: $('#tip'), lore: $('#lore'), death: $('#death'), pause: $('#pause'), menu: $('#menu') };
    this.tipQ = []; this.tipBusy = false; this.cardQ = null; this.menuSel = 0;
    this.logoCv = null;
    // touch controls
    if ('ontouchstart' in window) this.touch();
    $('#menu').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) this.act(b.dataset.act); });
  },
  act(a) { if (a === 'continue') this.g.continueGame(); if (a === 'new') this.g.startNew(); },
  title(show, hasSave) {
    this.el.title.style.display = show ? 'flex' : 'none';
    if (show) {
      this.el.menu.innerHTML = hasSave
        ? `<button data-act="continue" class="sel">Continue the dive</button><button data-act="new">New dive</button>`
        : `<button data-act="new" class="sel blink">Press Enter to dive</button>`;
      this.menuSel = 0;
    }
  },
  titleSelect() { const b = [...this.el.menu.querySelectorAll('button')][this.menuSel]; if (b) this.act(b.dataset.act); },
  handleInput(g) {
    if (g.state === 'title') {
      const bs = [...this.el.menu.querySelectorAll('button')];
      if (Input.hit('ArrowDown', 'KeyS', 'ArrowUp', 'KeyW') && bs.length > 1) { this.menuSel = (this.menuSel + 1) % bs.length; bs.forEach((b, i) => b.classList.toggle('sel', i === this.menuSel)); }
      return;
    }
    if (this.cardQ && Input.hit('Enter', 'Space', 'KeyE', 'Escape')) this.nextCard();
    if (this.loreDone && performance.now() > this.loreOpenAt + 400 && Input.hit('Enter', 'Space', 'KeyE', 'Escape')) this.closeLore();
    if (g.state === 'ending' && Ending.canExit && Input.hit('Enter', 'Space')) location.reload();
  },
  drawLogo(g) {
    const c = g.ectx, t = g.t;
    if (Assets.logo) {
      const x = Math.round((VW - Assets.logo.width) / 2), y = 78 + Math.round(Math.sin(t * 0.8) * 2);
      c.drawImage(Assets.logo, x, y); if (Assets.logoE) { c.globalAlpha = 0.6 + Math.sin(t * 2) * 0.3; c.drawImage(Assets.logoE, x, y); c.globalAlpha = 1; }
    } else {
      if (!this.logoCv) { this.logoCv = document.createElement('canvas'); this.logoCv.width = 50; this.logoCv.height = 7; pixText(this.logoCv.getContext('2d'), 'GLIMMERDEEP', 3, 1, '#ffc46b', '#6a3418'); }
      c.save(); c.imageSmoothingEnabled = false; c.drawImage(this.logoCv, (VW - 200) / 2, 50, 200, 28); c.restore();
    }
    g.light(g.camX + VW / 2, g.camY + 70, 180, 0.4, [1, 0.8, 0.5]);
    // the Wick bobbing at the surface
    const p = g.player; drawSprite(g.ctx, g.ectx, 'wick', 'idle', t, p.x - g.camX, g.world.surfaceY - g.camY + 3 + Math.sin(t * 1.4) * 1.5, false);
    g.light(p.x + 11, g.world.surfaceY + 4, 60, 0.9, C.lamp);
  },
  // sequential full-screen cards (intro, whale). autoMs advances on its own.
  cards(lines, done, autoMs) {
    if (!lines.length) return done();
    this.el.zone.classList.remove('show'); this.el.tip.classList.remove('show');
    this.cardQ = { lines: lines.slice(), done, autoMs }; this.showCard();
  },
  showCard() {
    const q = this.cardQ; clearTimeout(this.cardTimer);
    const line = q.lines.shift(); const el = this.el.card;
    el.innerHTML = `<p>${line}</p><small>${q.lines.length ? 'Enter ▸' : 'Enter ▸'}</small>`; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); el.style.display = 'flex';
    if (q.autoMs) this.cardTimer = setTimeout(() => this.nextCard(), q.autoMs);
  },
  nextCard() {
    const q = this.cardQ; if (!q) return;
    if (q.lines.length) return this.showCard();
    clearTimeout(this.cardTimer); this.cardQ = null; this.el.card.classList.remove('show'); setTimeout(() => { if (!this.cardQ) this.el.card.style.display = 'none'; }, 400); q.done();
  },
  zoneCard(title, sub, lines) {
    const el = this.el.zone; clearTimeout(this.zoneT);
    el.innerHTML = `<small>${sub}</small><h2>${title}</h2>${lines.map(l => `<p>${l}</p>`).join('')}`;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    this.zoneT = setTimeout(() => el.classList.remove('show'), 5200 + lines.length * 1500);
  },
  tip(text, key) { this.tipQ.push({ text, key }); if (!this.tipBusy) this.nextTip(); },
  nextTip() {
    const t = this.tipQ.shift(); const el = this.el.tip; if (!t) { this.tipBusy = false; el.classList.remove('show'); return; }
    this.tipBusy = true;
    const keys = { move: 'WASD / ←↑→↓', lamp: 'Q', dim: 'hold SHIFT', ping: 'E', flare: 'SPACE' }[t.key];
    el.innerHTML = (keys ? `<kbd>${keys}</kbd> ` : '') + t.text; el.classList.add('show');
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => this.nextTip(), 500); }, 3800 + t.text.length * 40);
  },
  lore(title, text, n, total, done) {
    const el = this.el.lore;
    el.innerHTML = `<div class="panel"><small>PAGE ${n} OF ${total}</small><h3>${title}</h3>${text.split(/\n+/).map(p => `<p>${p}</p>`).join('')}<small class="k">Enter to keep swimming</small></div>`;
    el.style.display = 'flex'; this.loreDone = done; this.loreOpenAt = performance.now();
  },
  closeLore() { this.el.lore.style.display = 'none'; const d = this.loreDone; this.loreDone = null; d && d(); },
  death(line, done) { const el = this.el.death; el.innerHTML = `<p>${line}</p>`; el.classList.add('show'); setTimeout(() => { el.classList.remove('show'); done(); }, 2600); },
  pause(on) { this.el.pause.style.display = on ? 'flex' : 'none'; this.assist(Game.assist); },
  assist(on) { const el = $('#assist'); if (el) el.textContent = on ? 'ON · no damage, endless oil' : 'OFF'; },
  clear() { this.cardQ = null; this.el.card.style.display = 'none'; this.el.lore.style.display = 'none'; },
  touch() {
    $('#touch').style.display = 'block';
    const stick = $('#stick'); let id = null, ox = 0, oy = 0;
    stick.addEventListener('touchstart', e => { const t = e.changedTouches[0]; id = t.identifier; ox = t.clientX; oy = t.clientY; e.preventDefault(); }, { passive: false });
    stick.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === id) { Input.touch = { x: clamp((t.clientX - ox) / 40, -1, 1), y: clamp((t.clientY - oy) / 40, -1, 1) }; } e.preventDefault(); }, { passive: false });
    stick.addEventListener('touchend', () => { Input.touch = null; id = null; });
    for (const b of document.querySelectorAll('#touch [data-key]')) {
      b.addEventListener('touchstart', e => { e.preventDefault(); Input.down.add(b.dataset.key); Input.pressed.add(b.dataset.key); if (Game.state === 'title') Game.hasSave ? UI.titleSelect() : Game.startNew(); }, { passive: false });
      b.addEventListener('touchend', () => Input.down.delete(b.dataset.key));
    }
  }
};

// ---------- ending: dawn over the lighthouse ----------
const Ending = {
  ambient: 0.05, t: 0, canExit: false, lit: false,
  start(g) {
    this.t = 0; this.g = g; g.camX = 0; g.camY = 0; g.shake = 0; g.fadeTarget = 0; g.lightsList = [];
    Renderer.setSolid(new Uint8Array(30 * 17), 30, 17);
    const stats = g.stats; const mm = Math.floor(stats.time / 60), ss = String(Math.floor(stats.time % 60)).padStart(2, '0');
    const credits = (g.story.credits || []).concat([``, `Time ${mm}:${ss} · Pages ${g.loreFound.length}/${g.loreTotal()} · Glimmers ${stats.glimmers} · Returns to the surface ${stats.deaths}`]);
    UI.cards(g.story.ending || [], () => {
      this.lit = true;
      $('#credits').innerHTML = credits.map(l => `<p>${l || '&nbsp;'}</p>`).join('') + `<p class="k">Enter to return to the harbor</p>`;
      $('#credits').classList.add('show'); this.canExit = true;
    }, 5200);
    setTimeout(() => { this.lit = true; }, 5200 * Math.max(1, (g.story.ending || []).length - 1));
  },
  drawArt(g, k) {
    const c = g.ctx, e = g.ectx, t = this.t, A = Assets.ending, [lx, ly] = A.lamp;
    c.drawImage(A.img, 0, 0);
    if (A.eimg) { e.globalAlpha = 0.5 + k * 0.5; e.drawImage(A.eimg, 0, 0); e.globalAlpha = 1; }
    if (this.lit) {
      const ang = t * 0.9; e.globalAlpha = 0.22; e.fillStyle = '#fff0c2'; e.beginPath(); e.moveTo(lx, ly); e.lineTo(lx + Math.cos(ang) * 520, ly + Math.sin(ang) * 70 - 36); e.lineTo(lx + Math.cos(ang) * 520, ly + Math.sin(ang) * 70 + 36); e.fill(); e.globalAlpha = 1;
      g.lightsList.push({ x: lx, y: ly, r: 220, s: 1.0, c: C.gold });
    }
    const wx = 200 + Math.min(40, t * 3), wy = 176 + Math.sin(t * 1.4) * 1.5;
    drawSprite(c, e, 'wick', 'idle', t, wx, wy, true);
    g.lightsList.push({ x: wx, y: wy, r: 60, s: 0.8, c: C.lamp });
  },
  update(g, dt) { this.t += dt; this.ambient = Math.min(1.15, 0.12 + this.t * 0.05); g.t += 0; g.lightsList = []; },
  draw(g) {
    const c = g.ctx, t = this.t, e = g.ectx;
    const k = clamp(t / 25, 0, 1); // dawn progress
    if (Assets.ending) return this.drawArt(g, k);
    const sky = [[10, 16, 40], [60, 40, 90], [220, 120, 110], [255, 200, 140]];
    for (let y = 0; y < 170; y += 2) {
      const f = y / 170; const a = sky[Math.min(3, Math.floor((1 - f) * 0 + f * 3 * k + (1 - k) * 0))];
      const top = [lerp(10, 90, k), lerp(16, 110, k), lerp(40, 170, k)], hor = [lerp(40, 255, k), lerp(30, 180, k), lerp(70, 140, k)];
      c.fillStyle = `rgb(${lerp(top[0], hor[0], f * f) | 0},${lerp(top[1], hor[1], f * f) | 0},${lerp(top[2], hor[2], f * f) | 0})`; c.fillRect(0, y, VW, 2);
    }
    // sun
    const sy = 190 - k * 50; c.fillStyle = '#fff0c2'; c.beginPath(); c.arc(340, sy, 18, 0, Math.PI * 2); c.fill();
    e.globalAlpha = k * 0.5; e.fillStyle = '#ffc46b'; e.beginPath(); e.arc(340, sy, 20, 0, Math.PI * 2); e.fill(); e.globalAlpha = 1;
    // sea
    for (let y = 170; y < VH; y += 2) { const f = (y - 170) / 100; c.fillStyle = `rgb(${lerp(lerp(30, 120, k), 10, f) | 0},${lerp(lerp(40, 110, k), 20, f) | 0},${lerp(lerp(80, 150, k), 50, f) | 0})`; c.fillRect(0, y, VW, 2); }
    for (let i = 0; i < 70; i++) { const x = (hash(i, 1) * VW + t * (6 + hash(i, 2) * 10)) % VW, y = 172 + hash(i, 3) * 96; c.fillStyle = y < 200 && Math.abs(x - 340) < 40 + (y - 170) ? '#fff0c2' : '#8aa8d0'; c.globalAlpha = 0.5; c.fillRect(x | 0, y | 0, 3 + (hash(i, 4) * 4 | 0), 1); }
    c.globalAlpha = 1;
    // rock + lighthouse
    c.fillStyle = '#140f1a'; c.beginPath(); c.moveTo(60, 175); c.lineTo(80, 150); c.lineTo(150, 145); c.lineTo(185, 175); c.fill();
    c.fillStyle = '#e8e4f0'; c.fillRect(104, 70, 22, 78); c.fillStyle = '#c93a4a'; for (let y = 82; y < 148; y += 22) c.fillRect(104, y, 22, 9);
    c.fillStyle = '#33263a'; c.fillRect(100, 66, 30, 5); c.fillRect(106, 50, 18, 16); c.fillStyle = '#231a2a'; c.fillRect(103, 42, 24, 8); c.fillRect(112, 36, 6, 6);
    c.fillStyle = '#634a5e'; c.fillRect(108, 52, 14, 12);
    if (this.lit) {
      e.fillStyle = '#fff0c2'; e.fillRect(110, 53, 10, 10); e.fillStyle = '#ffc46b'; e.fillRect(109, 52, 12, 1);
      const ang = t * 0.9; e.globalAlpha = 0.28; e.fillStyle = '#fff0c2'; e.beginPath(); e.moveTo(115, 58); e.lineTo(115 + Math.cos(ang) * 500, 58 + Math.sin(ang) * 80 - 40); e.lineTo(115 + Math.cos(ang) * 500, 58 + Math.sin(ang) * 80 + 40); e.fill(); e.globalAlpha = 1;
      g.lightsList.push({ x: 115, y: 58, r: 220, s: 1.0, c: C.gold });
    }
    // the Wick at the surface, flame aboard
    const wx = 200 + Math.min(40, t * 3), wy = 176 + Math.sin(t * 1.4) * 1.5;
    drawSprite(c, e, 'wick', 'idle', t, wx, wy, true);
    g.lightsList.push({ x: wx, y: wy, r: 60, s: 0.8, c: C.lamp });
  }
};
