import * as THREE from 'three';
import { REDUCED, ease } from './engine.js';

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
    dom.addEventListener('wheel', e => { e.preventDefault(); this.cancelFly(); this.zoom = THREE.MathUtils.clamp(this.zoom * Math.exp(e.deltaY * 0.0012), 0.45, 1.25); this.idle = 0; }, { passive: false });
    engine.on(this);
  }
  baseDist() {
    const vf = THREE.MathUtils.degToRad(this.cam.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * this.cam.aspect);
    return 11.2 / Math.sin(Math.min(vf, hf) / 2) * (this.cam.aspect < 1 ? 0.68 : 0.8);
  }
  resize(w, h) {
    this.cam.fov = w < h ? 36 : 30;
    // keep the city centred in the area not covered by the bottom sheet
    const off = Math.min(this.uiBottom, h * 0.45) * 0.5;
    this.cam.setViewOffset(w, h, 0, off, w, h);
    this.cam.updateProjectionMatrix();
  }
  setUiBottom(px) { this.uiBottom = px; this.resize(this.e.W, this.e.H); }
  down(e) {
    this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
    this.dom.setPointerCapture && this.dom.setPointerCapture(e.pointerId);
    if (this.ptrs.size === 2) { const [a, b] = [...this.ptrs.values()]; this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: this.zoom }; }
  }
  move(e) {
    const p = this.ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (this.ptrs.size === 1) {
      if (Math.hypot(p.x - p.sx, p.y - p.sy) < 6) return;
      this.cancelFly();
      this.az -= dx * 0.006; this.vAz = -dx * 0.006;
      this.pol = THREE.MathUtils.clamp(this.pol - dy * 0.003, 0.55, 1.18);
      this.idle = 0;
    } else if (this.ptrs.size === 2 && this.pinch) {
      const [a, b] = [...this.ptrs.values()];
      this.cancelFly();
      this.zoom = THREE.MathUtils.clamp(this.pinch.z * this.pinch.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), 0.45, 1.25);
    }
  }
  up(e) {
    const p = this.ptrs.get(e.pointerId); if (!p) return;
    this.ptrs.delete(e.pointerId);
    if (this.ptrs.size < 2) this.pinch = null;
    if (Math.hypot(p.x - p.sx, p.y - p.sy) < 6 && performance.now() - p.t < 450 && this.onTap && e.target === this.dom) {
      const r = this.dom.getBoundingClientRect();
      this.onTap(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1));
    }
  }
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
    c.lookAt(this.target);
    const fog = this.e.scene.fog; fog.near = d * 0.95; fog.far = d * 2.4;
  }
}
