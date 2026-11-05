import * as THREE from 'three';
import { REDUCED, ease } from './engine.js';
import { K, R } from './city.js';

// Orbit camera for the diorama: drag to turn, pinch / wheel to zoom, tap to pick.
export class CameraRig {
  constructor(engine, dom) {
    this.e = engine; this.cam = engine.camera; this.dom = dom;
    this.target = new THREE.Vector3(0, 0.6, 0);
    this.az = -0.62; this.pol = 0.98; this.zoom = 1;
    this.vAz = 0; this.idle = 0; this.fly = null; this.onTap = null;
    this.uiBottom = 0; // px hidden by bottom UI
    this.ptrs = new Map();
    dom.addEventListener('pointerdown', e => this.down(e));
    addEventListener('pointermove', e => this.move(e));
    addEventListener('pointerup', e => this.up(e));
    addEventListener('pointercancel', e => this.up(e));
    dom.addEventListener('wheel', e => {
      e.preventDefault(); this.cancelFly(); this.idle = 0;
      const trackpadPan = !e.ctrlKey && e.deltaMode === 0 && (Math.abs(e.deltaX) > 0.5 || (Math.abs(e.deltaY) < 40 && !Number.isInteger(e.deltaY)));
      if (trackpadPan) this.pan(-e.deltaX * 0.9, -e.deltaY * 0.9);
      else this.zoom = THREE.MathUtils.clamp(this.zoom * Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0012)), 0.3, 1.75);
    }, { passive: false });
    addEventListener('keydown', e => {
      if (e.target.closest && e.target.closest('input,textarea,.book')) return;
      if (document.querySelector('.book.on')) return;
      const k = e.key.toLowerCase(), step = 28;
      const map = { arrowleft: [step, 0], a: [step, 0], arrowright: [-step, 0], d: [-step, 0], arrowup: [0, step], w: [0, step], arrowdown: [0, -step], s: [0, -step] };
      if (map[k]) { e.preventDefault(); this.cancelFly(); this.idle = 0; this.pan(...map[k]); }
      else if (k === '+' || k === '=') { this.cancelFly(); this.zoom = Math.max(0.3, this.zoom / 1.12); }
      else if (k === '-' || k === '_') { this.cancelFly(); this.zoom = Math.min(1.75, this.zoom * 1.12); }
      else if (k === 'q') { this.cancelFly(); this.az += 0.15; } else if (k === 'e') { this.cancelFly(); this.az -= 0.15; }
    });
    dom.addEventListener('contextmenu', e => e.preventDefault());
    engine.on(this);
  }
  baseDist() {
    const vf = THREE.MathUtils.degToRad(this.cam.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * this.cam.aspect);
    return 11.2 * K / Math.sin(Math.min(vf, hf) / 2) * (this.cam.aspect < 1 ? 0.5 : 0.6);
  }
  resize(w, h) {
    this.cam.fov = w < h ? 36 : 30;
    // keep the city centred in the area not covered by the bottom sheet
    const off = Math.min(this.uiBottom, h * 0.72) * 0.5, offX = Math.min(this.uiLeft || 0, w * 0.4) * 0.5;
    this.cam.setViewOffset(w, h, -offX, off, w, h);
    this.cam.updateProjectionMatrix();
  }
  setUiBottom(px) { this.uiBottom = px; this.resize(this.e.W, this.e.H); }
  setUiLeft(px) { if (this.uiLeft === px) return; this.uiLeft = px; this.resize(this.e.W, this.e.H); }
  down(e) {
    const mode = e.pointerType === 'mouse' ? (e.button === 2 || e.shiftKey ? 'pan' : 'rot') : 'pan';
    this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), mode });
    this.dom.setPointerCapture && this.dom.setPointerCapture(e.pointerId);
    if (this.ptrs.size === 2) { const [a, b] = [...this.ptrs.values()]; this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: this.zoom, ang: Math.atan2(b.y - a.y, b.x - a.x), az: this.az }; }
  }
  pan(dx, dy) {
    const s = this.baseDist() * this.zoom * 0.0019, sa = Math.sin(this.az), ca = Math.cos(this.az);
    this.target.x -= (ca * dx + sa * dy) * s; this.target.z -= (-sa * dx + ca * dy) * s;
    const lim = R * 0.7, d = Math.hypot(this.target.x, this.target.z); if (d > lim) { this.target.x *= lim / d; this.target.z *= lim / d; }
  }
  move(e) {
    const p = this.ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (this.ptrs.size === 1) {
      if (!p.moved && Math.hypot(p.x - p.sx, p.y - p.sy) < 6) return;
      p.moved = true; this.cancelFly(); this.idle = 0;
      if (p.mode === 'pan') this.pan(dx, dy);
      else { this.az -= dx * 0.006; this.vAz = -dx * 0.006; this.pol = THREE.MathUtils.clamp(this.pol - dy * 0.003, 0.55, 1.18); }
    } else if (this.ptrs.size === 2 && this.pinch) {
      const [a, b] = [...this.ptrs.values()];
      this.cancelFly(); this.idle = 0;
      this.zoom = THREE.MathUtils.clamp(this.pinch.z * this.pinch.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), 0.3, 1.75);
      this.az = this.pinch.az - (Math.atan2(b.y - a.y, b.x - a.x) - this.pinch.ang);
    }
  }
  up(e) {
    const p = this.ptrs.get(e.pointerId); if (!p) return;
    this.ptrs.delete(e.pointerId);
    if (this.ptrs.size < 2) this.pinch = null;
    if (this.ptrs.size === 1) { const q = [...this.ptrs.values()][0]; q.moved = true; }
    if (!p.moved && Math.hypot(p.x - p.sx, p.y - p.sy) < 6 && performance.now() - p.t < 450 && this.onTap && e.target === this.dom) {
      const r = this.dom.getBoundingClientRect();
      this.onTap(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1));
    }
  }
  // first-person ride: camera blends from the orbit view into the eyes of a moving object
  fpStart(obj, o = {}) { if (REDUCED) return; this.fp = { obj, eye: o.eye ?? 0.7, ahead: o.ahead ?? 3, look: o.look, hide: o.hide, dir: 1, t0: performance.now(), k: 0 }; if (this.onFp) this.onFp(true); this.cam.near = 0.05; this.cam.updateProjectionMatrix(); }
  fpEnd() { if (this.fp && this.fp.dir > 0) { this.fp.dir = -1; this.fp.t0 = performance.now(); this.fp.k0 = this.fp.k; } return new Promise(r => setTimeout(r, REDUCED ? 0 : 850)); }
  cancelFly() { if (this.fly && !this.fly.locked) this.fly = null; }
  // fly to a view: {target:[x,y,z], zoom, az, pol}
  flyTo(v, dur = 1.4, locked = false) {
    const to = { target: new THREE.Vector3(...(v.target || this.target.toArray())), zoom: v.zoom ?? this.zoom, az: v.az ?? this.az, pol: v.pol ?? this.pol };
    // shortest turn
    while (to.az - this.az > Math.PI) to.az -= Math.PI * 2;
    while (to.az - this.az < -Math.PI) to.az += Math.PI * 2;
    if (REDUCED) { this.target.copy(to.target); this.zoom = to.zoom; this.az = to.az; this.pol = to.pol; return Promise.resolve(); }
    return new Promise(res => { this.fly = { from: { target: this.target.clone(), zoom: this.zoom, az: this.az, pol: this.pol }, to, t: 0, start: performance.now(), dur, res, locked }; this.idle = 0; });
  }
  update(dt) {
    if (this.fly) {
      const f = this.fly; f.t = Math.min(1, (performance.now() - f.start) / 1000 / f.dur); const k = ease(f.t);
      this.target.lerpVectors(f.from.target, f.to.target, k);
      this.zoom = f.from.zoom + (f.to.zoom - f.from.zoom) * k;
      this.az = f.from.az + (f.to.az - f.from.az) * k;
      this.pol = f.from.pol + (f.to.pol - f.from.pol) * k;
      if (f.t >= 1) { this.fly = null; f.res(); }
    } else if (!this.ptrs.size) {
      this.az += this.vAz; this.vAz *= 0.9;
      this.idle += dt;
      if (this.idle > 6 && !REDUCED && this.autoOrbit !== false) this.az += dt * 0.025 * Math.min(1, (this.idle - 6) / 3);
    }
    const d = this.baseDist() * this.zoom;
    const c = this.cam;
    c.position.set(this.target.x + Math.sin(this.az) * Math.sin(this.pol) * d, this.target.y + Math.cos(this.pol) * d, this.target.z + Math.cos(this.az) * Math.sin(this.pol) * d);
    const fog = this.e.scene.fog; fog.near = d * 0.95; fog.far = d * 2.4;
    const f = this.fp;
    if (f) {
      const x = Math.min(1, (performance.now() - f.t0) / 800), k = f.dir > 0 ? x : (f.k0 ?? 1) * (1 - x), e = k * k * (3 - 2 * k); f.k = k;
      const o = f.obj, h = o.rotation.y, fw = new THREE.Vector3(Math.sin(h), 0, Math.cos(h));
      const eye = o.position.clone().add(new THREE.Vector3(0, f.eye, 0)).addScaledVector(fw, 0.12);
      const look = f.look ? f.look(o.position, fw) : o.position.clone().addScaledVector(fw, f.ahead).setY(f.eye * 0.6);
      c.position.lerp(eye, e);
      c.lookAt(this.target.clone().lerp(look, e));
      fog.near = fog.near + (5 - fog.near) * e; fog.far = fog.far + (30 - fog.far) * e;
      if (f.hide) f.obj.visible = e < 0.55;
      if (f.dir < 0 && k <= 0) { if (f.hide) f.obj.visible = true; this.fp = null; c.near = 0.5; c.updateProjectionMatrix(); if (this.onFp) this.onFp(false); }
    } else c.lookAt(this.target);
  }
}
