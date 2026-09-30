// GLIMMERDEEP — world: parses a zone map, prerenders tiles, answers collision / sight / path queries.
'use strict';
const SOLID_CH = '#%';
class World {
  constructor(def) {
    this.def = def; this.id = def.id;
    const rows = def.map.map(r => r.replace(/\s+$/, ''));
    this.h = rows.length; this.w = Math.max(...rows.map(r => r.length));
    this.grid = rows.map(r => r.padEnd(this.w, '#'));
    this.solid = new Uint8Array(this.w * this.h);
    this.kind = new Uint8Array(this.w * this.h); // 1 '#', 2 '%'
    this.air = new Uint8Array(this.w * this.h);
    this.current = new Int8Array(this.w * this.h * 2);
    this.spawns = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const ch = this.grid[y][x], i = y * this.w + x;
      if (ch === '#') { this.solid[i] = 1; this.kind[i] = 1; }
      else if (ch === '%') { this.solid[i] = 1; this.kind[i] = 2; }
      else if (ch === '~') this.air[i] = 1;
      else if (ch === '^') { this.current[i * 2 + 1] = -1; }
      else if (ch === '<') { this.current[i * 2] = -1; }
      else if (ch === '>') { this.current[i * 2] = 1; }
      else if (ch === 'v') { this.current[i * 2 + 1] = 1; }
      else if (ch !== '.' && ch !== ' ') this.spawns.push({ ch, x, y });
    }
    // surface: first row containing water below air
    this.surfaceY = -9999;
    for (let y = 0; y < this.h; y++) if (this.grid[y].includes('~')) this.surfaceY = (y + 1) * TILE;
    this.pxW = this.w * TILE; this.pxH = this.h * TILE;
    this.prerender();
  }
  isSolid(tx, ty) { if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return true; return this.solid[ty * this.w + tx] === 1; }
  solidPx(x, y) { return this.isSolid(Math.floor(x / TILE), Math.floor(y / TILE)); }
  isAir(x, y) { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return false; return this.air[ty * this.w + tx] === 1; }
  currentAt(x, y) { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return [0, 0]; const i = (ty * this.w + tx) * 2; return [this.current[i], this.current[i + 1]]; }
  boxHits(x, y, hw, hh) {
    const x0 = Math.floor((x - hw) / TILE), x1 = Math.floor((x + hw - 0.01) / TILE), y0 = Math.floor((y - hh) / TILE), y1 = Math.floor((y + hh - 0.01) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.isSolid(tx, ty)) return true;
    return false;
  }
  // move an AABB with per-axis resolution; returns {hitX, hitY}
  move(o, dx, dy, hw, hh) {
    let hitX = false, hitY = false;
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 6) || 1;
    for (let s = 0; s < steps; s++) {
      const sx = dx / steps, sy = dy / steps;
      if (!this.boxHits(o.x + sx, o.y, hw, hh)) o.x += sx; else { hitX = true; dx = 0; }
      if (!this.boxHits(o.x, o.y + sy, hw, hh)) o.y += sy; else { hitY = true; dy = 0; }
    }
    return { hitX, hitY };
  }
  sees(ax, ay, bx, by) {
    const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 6);
    for (let i = 1; i < n; i++) { const t = i / n; if (this.solidPx(ax + (bx - ax) * t, ay + (by - ay) * t)) return false; }
    return true;
  }
  // BFS from a target tile over water; returns a distance field used by hunters to descend towards it
  field(tx, ty, maxN = 2200) {
    const W = this.w, H = this.h, dist = new Int16Array(W * H).fill(-1);
    if (this.isSolid(tx, ty)) return dist;
    const q = new Int32Array(W * H); let h = 0, t = 0; q[t++] = ty * W + tx; dist[ty * W + tx] = 0;
    while (h < t && t < maxN) {
      const c = q[h++], cx = c % W, cy = (c / W) | 0, d = dist[c] + 1;
      if (cx > 0 && dist[c - 1] < 0 && !this.solid[c - 1]) { dist[c - 1] = d; q[t++] = c - 1; }
      if (cx < W - 1 && dist[c + 1] < 0 && !this.solid[c + 1]) { dist[c + 1] = d; q[t++] = c + 1; }
      if (cy > 0 && dist[c - W] < 0 && !this.solid[c - W]) { dist[c - W] = d; q[t++] = c - W; }
      if (cy < H - 1 && dist[c + W] < 0 && !this.solid[c + W]) { dist[c + W] = d; q[t++] = c + W; }
    }
    return dist;
  }
  mask(tx, ty, kindAny) {
    const s = (x, y) => kindAny ? this.isSolid(x, y) : this.isSolid(x, y);
    return (s(tx, ty - 1) ? 1 : 0) | (s(tx + 1, ty) ? 2 : 0) | (s(tx, ty + 1) ? 4 : 0) | (s(tx - 1, ty) ? 8 : 0);
  }
  prerender() {
    const cv = document.createElement('canvas'); cv.width = this.pxW; cv.height = this.pxH;
    const c = cv.getContext('2d'); const ts = Assets.tiles[this.id] || Assets.tiles[1];
    for (let ty = 0; ty < this.h; ty++) for (let tx = 0; tx < this.w; tx++) {
      const k = this.kind[ty * this.w + tx]; if (!k) continue;
      const m = this.mask(tx, ty, true);
      let sx = m * 16, sy = k === 2 ? 16 : 0;
      if (k === 1 && m === 15 && ts.height >= 48) { sx = Math.floor(hash(tx, ty) * 16) * 16; sy = 32; }
      c.drawImage(ts, sx, sy, 16, 16, tx * TILE, ty * TILE, 16, 16);
    }
    // soft inner darkness so deep rock reads as mass, not wallpaper
    const img = c.getImageData(0, 0, cv.width, cv.height), d = img.data;
    const depthOf = new Uint8Array(this.w * this.h);
    for (let ty = 0; ty < this.h; ty++) for (let tx = 0; tx < this.w; tx++) {
      if (!this.solid[ty * this.w + tx]) continue; let dd = 0;
      for (let r = 1; r <= 3; r++) { let all = true; for (let oy = -r; oy <= r && all; oy++) for (let ox = -r; ox <= r; ox++) if (!this.isSolid(tx + ox, ty + oy)) { all = false; break; } if (all) dd = r; else break; }
      depthOf[ty * this.w + tx] = dd;
    }
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      const dd = depthOf[((y / TILE) | 0) * this.w + ((x / TILE) | 0)]; if (!dd) continue;
      const i = (y * cv.width + x) * 4, f = 1 - dd * 0.2; d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
    }
    c.putImageData(img, 0, 0);
    this.tileCanvas = cv;
    this.solidTex = new Uint8Array(this.w * this.h); for (let i = 0; i < this.solid.length; i++) this.solidTex[i] = this.solid[i] ? 255 : 0;
  }
}
