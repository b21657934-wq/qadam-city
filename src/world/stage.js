import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { U, REDUCED } from './engine.js';
import { mat, P } from './city.js';

// Temporary in-world props for a mission: markers, graph lines, labels, movers, bars.
const V = (x, y, z) => new THREE.Vector3(x, y, z);
export class Stage {
  constructor(engine) { this.e = engine; this.g = new THREE.Group(); engine.scene.add(this.g); this.tw = []; engine.on(this); }
  clear() { this.g.clear(); this.tw = []; }
  label(text, x, y, z, o = {}) {
    const c = document.createElement('canvas'), ctx = c.getContext('2d'), fs = 44, pad = 26;
    ctx.font = `600 ${fs}px Inter, sans-serif`; const w = Math.ceil(ctx.measureText(text).width) + pad * 2, h = fs + 30;
    c.width = w; c.height = h; ctx.font = `600 ${fs}px Inter, sans-serif`;
    const bg = o.bg || 'rgba(255,255,255,0.94)', r = h / 2;
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r); ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.fill();
    ctx.fillStyle = o.fg || '#1B2340'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, w / 2, h / 2 + 2);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    const s = (o.size || 0.32) * 1.25 / h; sp.scale.set(w * s, h * s, 1); sp.position.set(x, y, z); sp.renderOrder = 20;
    this.g.add(sp); return sp;
  }
  setLabel(sp, text, o) { const p = sp.position; this.g.remove(sp); return this.label(text, p.x, p.y, p.z, o); }
  disc(x, z, r = 0.28, color = 0xffffff, o = {}) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o.opacity ?? 0.95, depthWrite: false }));
    m.position.set(x, o.y ?? 0.13, z); m.renderOrder = 5; this.g.add(m);
    if (o.ring !== false) { const rg = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.05, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: o.ringColor ?? P.ink, transparent: true, opacity: 0.55, depthWrite: false })); rg.position.copy(m.position); rg.position.y += 0.002; rg.renderOrder = 6; this.g.add(rg); m.userData.ring = rg; }
    return m;
  }
  line(a, b, color = P.ink, o = {}) {
    const A = V(a[0], o.y ?? 0.12, a[1]), B = V(b[0], o.y ?? 0.12, b[1]), d = B.clone().sub(A), L = d.length();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L, o.w ?? 0.06).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o.opacity ?? 0.55, depthWrite: false }));
    m.position.copy(A).add(B).multiplyScalar(0.5); m.rotation.y = -Math.atan2(d.z, d.x); m.renderOrder = 4; this.g.add(m); return m;
  }
  pulse(m, color) { if (color != null) m.material.color.set(color); this.tw.push({ k: 'pulse', m, t0: U.uTime.value }); }
  tube(pts, color = P.gold, r = 0.07) {
    const c = new THREE.CatmullRomCurve3(pts.map(p => V(p[0], 0.16, p[1])), false, 'catmullrom', 0.05);
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(20, pts.length * 16), r, 8), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, roughness: 0.4 }));
    m.geometry.setDrawRange(0, 0); this.g.add(m); this.tw.push({ k: 'draw', m, t0: U.uTime.value, dur: 0.9 }); return { m, curve: c };
  }
  car(color = P.terracotta, s = 1.4) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.12, 0.38, 2, 0.04), mat(color, { roughness: 0.4 })); b.position.y = 0.16; b.castShadow = true; g.add(b);
    const c = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.09, 0.2, 2, 0.035), mat(0x3E4C62, { roughness: 0.25 })); c.position.set(0, 0.26, -0.02); g.add(c);
    g.scale.setScalar(s); this.g.add(g); return g;
  }
  // move an object along points over `dur` seconds; resolves when done
  move(o, pts, dur) {
    const c = new THREE.CatmullRomCurve3(pts.map(p => V(p[0], 0, p[1])), false, 'catmullrom', 0.05);
    if (REDUCED) dur = 0.01;
    return new Promise(res => this.tw.push({ k: 'move', o, c, t0: U.uTime.value, dur, res }));
  }
  bar(x, z, color = P.gold, w = 0.34) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const base = new THREE.Mesh(new RoundedBoxGeometry(w + 0.12, 0.06, w + 0.12, 2, 0.02), mat(0xE7EBF0)); base.position.y = 0.04; g.add(base);
    const col = new THREE.Mesh(new RoundedBoxGeometry(w, 1, w, 2, 0.05), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, roughness: 0.5 }));
    col.geometry.translate(0, 0.5, 0); col.position.y = 0.07; col.scale.y = 0.001; col.castShadow = true; g.add(col);
    g.userData.col = col; g.userData.h = 0; this.g.add(g); return g;
  }
  setBar(b, h) { this.tw.push({ k: 'bar', b, from: b.userData.h, to: h, t0: U.uTime.value }); b.userData.h = h; }
  wait(s) { return new Promise(r => setTimeout(r, REDUCED ? 0 : s * 1000)); }
  update(dt, t) {
    for (let i = this.tw.length - 1; i >= 0; i--) {
      const w = this.tw[i], x = t - w.t0;
      if (w.k === 'pulse') { const s = 1 + 0.35 * Math.sin(Math.min(1, x / 0.4) * Math.PI); w.m.scale.setScalar(s); if (w.m.userData.ring) w.m.userData.ring.scale.setScalar(s); if (x > 0.4) this.tw.splice(i, 1); }
      else if (w.k === 'draw') { const k = Math.min(1, x / w.dur); w.m.geometry.setDrawRange(0, Math.floor(w.m.geometry.index.count * k / 3) * 3); if (k >= 1) this.tw.splice(i, 1); }
      else if (w.k === 'move') {
        const k = Math.min(1, x / w.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, p = w.c.getPointAt(e), q = w.c.getPointAt(Math.min(1, e + 0.01));
        w.o.position.set(p.x, w.o.position.y, p.z); if (q.distanceTo(p) > 1e-4) w.o.rotation.y = Math.atan2(q.x - p.x, q.z - p.z);
        if (k >= 1) { this.tw.splice(i, 1); w.res(); }
      } else if (w.k === 'bar') { const k = Math.min(1, x / 0.7), e = 1 - Math.pow(1 - k, 3), h = w.from + (w.to - w.from) * e; w.b.userData.col.scale.y = Math.max(0.001, h); if (k >= 1) this.tw.splice(i, 1); }
    }
  }
}
