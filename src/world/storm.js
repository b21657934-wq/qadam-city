import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { U, REDUCED } from './engine.js';
import { mat, K } from './city.js';
import { sfx } from '../sfx.js';

// Blizzard night: atmosphere (blowing snow, fog, dim light) + small scenes with robot residents.
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;
const rb = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 2, r);
const glowBasic = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });

export function robot(coat, s = 1, scarf = 0xF2B544) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const cm = new THREE.MeshStandardMaterial({ color: coat, roughness: 0.55, emissive: coat, emissiveIntensity: 0.35 });
  const torso = new THREE.Mesh(rb(0.13, 0.15, 0.09, 0.035), cm); torso.position.y = 0.2; torso.castShadow = true; body.add(torso);
  const head = new THREE.Mesh(rb(0.11, 0.1, 0.1, 0.035), new THREE.MeshStandardMaterial({ color: 0xF4F1EA, roughness: 0.35, emissive: 0xF4F1EA, emissiveIntensity: 0.25 })); head.position.y = 0.335; head.castShadow = true; body.add(head);
  const visor = new THREE.Mesh(rb(0.09, 0.045, 0.02, 0.012), mat(0x1B2340, { roughness: 0.2 })); visor.position.set(0, 0.34, 0.048); body.add(visor);
  const em = glowBasic(0xA8F0FF);
  [-0.022, 0.022].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), em); e.position.set(x, 0.341, 0.06); body.add(e); });
  const sc = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.014, 6, 16), mat(scarf, { roughness: 0.7 })); sc.rotation.x = Math.PI / 2; sc.position.y = 0.282; body.add(sc);
  const limb = (w, h, x, y, c) => { const p = new THREE.Group(); p.position.set(x, y, 0); const m = new THREE.Mesh(rb(w, h, w, w * 0.4), c === coat ? cm : mat(c, { roughness: 0.6 })); m.position.y = -h / 2; p.add(m); body.add(p); return p; };
  const legs = [limb(0.038, 0.11, -0.03, 0.125, 0x2E3550), limb(0.038, 0.11, 0.03, 0.125, 0x2E3550)];
  const arms = [limb(0.03, 0.1, -0.083, 0.265, coat), limb(0.03, 0.1, 0.083, 0.265, coat)];
  g.userData = { legs, arms, body }; g.scale.setScalar(s * 1.7);
  return g;
}

function vehicle(kind) {
  const g = new THREE.Group();
  const spec = { bus: [0.26, 0.22, 0.78, 0xF2B544], amb: [0.22, 0.17, 0.44, 0xF4F1EA], plough: [0.24, 0.16, 0.42, 0xF08A3C], car: [0.2, 0.12, 0.38, 0xE8674A] }[kind];
  const [w, h, l, c] = spec;
  const b = new THREE.Mesh(rb(w, h, l, 0.04), mat(c, { roughness: 0.4 })); b.position.y = 0.1 + h / 2; b.castShadow = true; g.add(b);
  const win = glowBasic(0xFFD9A0); win.color.multiplyScalar(0.9);
  if (kind === 'bus') { [-1, 1].forEach(sd => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.07, l * 0.8), win); s.position.set(sd * (w / 2 + 0.002), 0.1 + h * 0.66, 0); g.add(s); }); }
  else { const cab = new THREE.Mesh(rb(w * 0.85, 0.09, l * 0.45, 0.03), mat(0x3E4C62, { roughness: 0.25 })); cab.position.set(0, 0.1 + h + 0.04, kind === 'plough' ? -l * 0.15 : -0.02); g.add(cab); }
  [-1, 1].forEach(sd => [-1, 1].forEach(fr => { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), mat(0x1B2340)); wh.rotation.z = Math.PI / 2; wh.position.set(sd * w / 2, 0.06, fr * l * 0.32); g.add(wh); }));
  const head = glowBasic(0xFFF3D6); [-1, 1].forEach(sd => { const hl = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), head); hl.position.set(sd * w * 0.3, 0.16, l / 2 + 0.005); g.add(hl); });
  if (kind === 'amb' || kind === 'plough') {
    const ls = kind === 'amb' ? [0xFF4A3D, 0x4A7BFF] : [0xFFB020, 0xFFB020];
    g.userData.beacons = ls.map((cc, k) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), glowBasic(cc)); m.position.set((k ? 1 : -1) * 0.05, 0.1 + h + 0.15, kind === 'plough' ? -l * 0.15 : -0.02); g.add(m); return m; });
  }
  if (kind === 'amb') { const cr = new THREE.MeshBasicMaterial({ color: 0xE8674A }); [[0.09, 0.025], [0.025, 0.09]].forEach(([a, bb]) => [-1, 1].forEach(sd => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.004, bb, a), cr); m.position.set(sd * (w / 2 + 0.003), 0.1 + h * 0.55, 0.05); g.add(m); })); }
  if (kind === 'plough') { const bl = new THREE.Mesh(rb(w * 1.7, 0.1, 0.04, 0.015), mat(0xFFD08A, { roughness: 0.4 })); bl.position.set(0, 0.1, l / 2 + 0.06); bl.rotation.y = 0.25; g.add(bl); }
  g.scale.setScalar(1.35);
  return g;
}

function glowSprite(color, size) {
  if (!glowSprite.tex) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); glowSprite.tex = new THREE.CanvasTexture(c); }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite.tex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  s.scale.setScalar(size); return s;
}

export class Storm {
  constructor(engine, rig) {
    this.e = engine; this.rig = rig; this.g = new THREE.Group(); engine.scene.add(this.g);
    this.level = 0; this.to = 0; this.tw = []; this.time = 0; this.live = true;
    // blowing-snow streaks around the camera target
    const N = this.N = 2400, pos = new Float32Array(N * 6); this.p = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) this.p.set([(Math.random() - 0.5) * 16, Math.random() * 6, (Math.random() - 0.5) * 16, 0.7 + Math.random() * 0.6], i * 4);
    const geo = this.geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.lm = new THREE.LineBasicMaterial({ color: 0xF2F5FF, transparent: true, opacity: 0, depthWrite: false });
    this.lines = new THREE.LineSegments(geo, this.lm); this.lines.frustumCulled = false; this.lines.visible = false; engine.scene.add(this.lines);
    engine.on(this);
  }
  // ----- atmosphere -----
  begin() {
    const e = this.e, f = e.scene.fog;
    this.base = { c: f.color.clone(), n: f.near, f: f.far, h: e.hemi.intensity, s: e.sun.intensity };
    this.lines.visible = true; this.to = 1; sfx.wind(1);
  }
  calm() { this.to = 0; sfx.wind(0); }
  end() {
    const e = this.e, f = e.scene.fog, b = this.base; if (!b) return;
    f.color.copy(b.c); f.near = b.n; f.far = b.f; e.hemi.intensity = b.h; e.sun.intensity = b.s;
    this.level = this.to = 0; this.lines.visible = false; this.base = null; this.clear();
  }
  // a cleared scene's pending waits never resolve, so an interrupted scene simply stops where it was
  clear() { this.g.clear(); this.gen = (this.gen || 0) + 1; this.tw = []; }
  update(dt0, t) {
    const dt = Math.min(0.25, Math.max(0, t - (this.time || t))) * (this.speed || 1); this.time = t;
    if (this.base) {
      this.level += (this.to - this.level) * Math.min(1, dt * (this.to > this.level ? 0.55 : 0.8));
      const L = this.level, e = this.e, f = e.scene.fog, b = this.base;
      const gust = 0.75 + 0.25 * Math.sin(t * 0.7) * Math.sin(t * 1.9 + 1);
      const cd = e.camera.position.distanceTo(this.rig.target); f.near = lerp(b.n, cd * 0.7, L); f.far = lerp(b.f, cd * (2.3 + 0.5 * (1 - gust)), L);
      f.color.copy(b.c).lerp(new THREE.Color(0x4A5578), L * 0.75);
      e.hemi.intensity = b.h * (1 - 0.35 * L); e.sun.intensity = b.s * (1 - 0.6 * L);
      this.lm.opacity = 0.55 * L * gust;
      const tg = this.rig.target, P = this.p, a = this.geo.attributes.position.array, wx = 6.5 * gust, wz = 2.2 * gust, wy = -2.2;
      for (let i = 0; i < this.N; i++) {
        const k = i * 4, sp = P[k + 3];
        P[k] += wx * sp * dt; P[k + 1] += wy * sp * dt; P[k + 2] += wz * sp * dt;
        if (P[k] > 8) P[k] -= 16; if (P[k + 2] > 8) P[k + 2] -= 16; if (P[k + 1] < 0) { P[k + 1] += 6; P[k] = (Math.random() - 0.5) * 16; }
        const x = tg.x + P[k], y = P[k + 1], z = tg.z + P[k + 2], s = 0.045 * sp;
        a.set([x, y, z, x - wx * s, y - wy * s, z - wz * s], i * 6);
      }
      this.geo.attributes.position.needsUpdate = true;
    }
    for (let i = this.tw.length - 1; i >= 0; i--) { const w = this.tw[i]; if (w.f(dt, t) === true) { this.tw.splice(i, 1); w.res && w.res(); } }
  }
  // ----- props & tweens (plate coordinates, scaled by K) -----
  add(o, x, z, y = 0) { o.position.set(x * K, y, z * K); if (this.live) this.g.add(o); return o; }
  run(f) { if (!this.live) return Promise.resolve(); return new Promise(res => this.tw.push({ f, res })); }
  wait(s) { if (!this.live) return Promise.resolve(); const g = this.gen; return new Promise(r => setTimeout(() => { if (g === this.gen) r(); }, REDUCED ? 0 : s * 1000 / (this.speed || 1))); }
  path(o, pts, speed, opt = {}) {
    const P = pts.map(p => V(p[0] * K, 0, p[1] * K)), seg = []; let tot = 0;
    for (let i = 0; i < P.length - 1; i++) { const l = P[i].distanceTo(P[i + 1]); seg.push(l); tot += l; }
    let d = 0; const ud = o.userData;
    if (REDUCED) { o.position.copy(P[P.length - 1]); return Promise.resolve(); }
    return this.run((dt, t) => {
      d = Math.min(tot, d + speed * K * dt); let s = d, i = 0; while (i < seg.length - 1 && s > seg[i]) { s -= seg[i]; i++; }
      const a = P[i], b = P[i + 1], k = seg[i] ? s / seg[i] : 1, ln = (opt.lane || 0) / (seg[i] || 1); o.position.set(lerp(a.x, b.x, k) - (b.z - a.z) * ln, o.position.y, lerp(a.z, b.z, k) + (b.x - a.x) * ln);
      const want = Math.atan2(b.x - a.x, b.z - a.z); let da = want - o.rotation.y; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; o.rotation.y += da * Math.min(1, dt * 10);
      if (ud.legs) { const sw = Math.sin(t * 13 + (ud.ph || 0)) * 0.6; ud.legs[0].rotation.x = sw; ud.legs[1].rotation.x = -sw; ud.arms[0].rotation.x = -sw * 0.8; ud.arms[1].rotation.x = sw * 0.8; ud.body.position.y = Math.abs(Math.cos(t * 13 + (ud.ph || 0))) * 0.015; ud.body.rotation.x = 0.12; const st = Math.floor((t * 13 + (ud.ph || 0)) / Math.PI); if (st !== ud.st) { ud.st = st; sfx.play('step', 0.55); } }
      if (opt.each) opt.each(o);
      if (d >= tot) { if (ud.legs) { ud.legs.forEach(l => l.rotation.x = 0); ud.arms.forEach(l => l.rotation.x = 0); ud.body.rotation.x = 0; } return true; }
    });
  }
  // An entrance: a small porch with a hinged door and warm light inside. Residents walk in instead of fading out.
  door(x, z, ry, opt = {}) {
    const w = opt.w || 0.42, h = opt.h || 0.74, dp = opt.depth || 0.5, wall = opt.wall ?? 0xEDE6D8, s = opt.s || 1;
    const g = new THREE.Group(); g.rotation.y = ry; g.scale.setScalar(s);
    const wm = new THREE.MeshStandardMaterial({ color: wall, roughness: 0.6 });
    const porch = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.1, dp), wm); porch.position.set(0, (h + 0.1) / 2, -dp / 2); porch.castShadow = true; g.add(porch);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.26, 0.04, dp + 0.12), new THREE.MeshStandardMaterial({ color: 0x5A6378, roughness: 0.5 })); roof.position.set(0, h + 0.12, -dp / 2 + 0.06); g.add(roof);
    const light = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0xFFC46E, toneMapped: false })); light.position.set(0, h / 2, 0.003); g.add(light);
    const fm = new THREE.MeshStandardMaterial({ color: 0x3A3F55, roughness: 0.5 });
    [[-w / 2 - 0.02, h / 2, 0.04, h + 0.02], [w / 2 + 0.02, h / 2, 0.04, h + 0.02], [0, h + 0.01, w + 0.08, 0.04]].forEach(([fx, fy, fw, fh]) => { const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.05), fm); f.position.set(fx, fy, 0.012); g.add(f); });
    const hinge = new THREE.Group(); hinge.position.set(-w / 2, 0, 0.02); g.add(hinge);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), new THREE.MeshStandardMaterial({ color: 0x7A4E2D, roughness: 0.55 })); panel.position.set(w / 2, h / 2, 0); hinge.add(panel);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), mat(0xF2B544, { roughness: 0.3 })); knob.position.set(w - 0.06, h * 0.48, 0.025); hinge.add(knob);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), glowBasic(0xFFE3A8)); lamp.position.set(0, h + 0.2, 0.04); g.add(lamp);
    const spill = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.6, 0.6), new THREE.MeshBasicMaterial({ color: 0xFFB55A, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); spill.rotation.x = -Math.PI / 2; spill.position.set(0, 0.012, 0.3); g.add(spill);
    g.userData = { hinge, spill, users: 0, open: 0, to: 0, s };
    this.add(g, x, z, opt.y || 0);
    this.run(dt => { const u = g.userData; u.open += (u.to - u.open) * Math.min(1, dt * 7); hinge.rotation.y = -1.85 * u.open; spill.material.opacity = 0.55 * u.open; return !g.parent; });
    return g;
  }
  // the real front door of the house nearest to (x, z), covered by an animated one
  house(city, x, z, opt = {}) {
    let best = null, bd = 1e9; for (const e of city.entrances || []) { const dd = (e.x - x) ** 2 + (e.z - z) ** 2; if (dd < bd && !(opt.not || []).includes(e)) { bd = dd; best = e; } }
    if (!best) return this.door(x, z, 0, { s: 0.6 });
    const g = this.door(best.x, best.z, best.ry, { s: 0.6, wall: 0x3A4258, depth: 0.3 }); g.userData.e = best; return g;
  }
  // step in through the bus door on the side facing the rider
  async board(o, bus, speed = 0.6) {
    const ry = bus.rotation.y, rx = Math.cos(ry), rz = -Math.sin(ry), fx = Math.sin(ry), fz = Math.cos(ry), bp = bus.position;
    const sg = Math.sign((o.position.x - bp.x) * rx + (o.position.z - bp.z) * rz) || 1, sx = bp.x + rx * sg * 0.2 + fx * 0.25, sz = bp.z + rz * sg * 0.2 + fz * 0.25;
    await this.path(o, [[o.position.x / K, o.position.z / K], [(sx + rx * sg * 0.12) / K, (sz + rz * sg * 0.12) / K], [sx / K, sz / K]], speed);
    this.glow(sx / K, sz / K, 0.3, 0xFFC46E, 0.5, 0.5, 1); o.visible = false;
  }
  // front of a building, on the side facing the camera; a = extra angle around the centre
  facing(cx, cz, a = 0) { const c = this.e.camera.position; return Math.atan2(c.x - cx * K, c.z - cz * K) + a; }
  async enter(o, d, speed = 0.55) {
    const u = d.userData, ry = d.rotation.y, nx = Math.sin(ry), nz = Math.cos(ry), px = d.position.x / K, pz = d.position.z / K, f = 0.38 * u.s / K, b = 0.3 * u.s / K;
    await this.path(o, [[o.position.x / K, o.position.z / K], [px + nx * f, pz + nz * f]], speed);
    u.users++; if (u.to < 1) { u.to = 1; sfx.play('door', 0.7); await this.wait(0.3); }
    await this.path(o, [[px + nx * f, pz + nz * f], [px - nx * b, pz - nz * b]], speed * 0.7);
    o.visible = false; u.users--;
    await this.wait(0.7); if (!u.users && u.to > 0) { u.to = 0; sfx.play('door', 0.5); }
  }
  vanish(o, dur = 0.35) { const s0 = o.scale.x; let x = 0; return this.run(dt => { x += dt / dur; o.scale.setScalar(s0 * Math.max(0.001, 1 - x)); if (x >= 1) { o.visible = false; return true; } }); }
  appear(o, dur = 0.35) { const s0 = o.scale.x; o.scale.setScalar(0.001); let x = 0; return this.run(dt => { x += dt / dur; o.scale.setScalar(s0 * Math.min(1, x)); return x >= 1; }); }
  blink(meshes, period = 0.22, until = () => false) { return this.run((dt, t) => { meshes.forEach((m, k) => { m.visible = Math.floor(t / period + k) % 2 === 0; }); return until(); }); }
  glow(x, z, y, color, size, dur, pulse = 1.4) { const s = this.add(glowSprite(color, size), x, z, y); let tt = 0; this.run((dt, t) => { tt += dt; s.material.opacity = Math.min(1, tt * 3, (dur - tt) * 3) * (0.55 + 0.45 * Math.sin(t * pulse * 6.28)); if (tt > dur) { this.g.remove(s); return true; } }); return s; }
  bob(o) { const ud = o.userData; ud.ph = Math.random() * 6; }
}

export const STORMV = { robot, vehicle };
export { vehicle };
