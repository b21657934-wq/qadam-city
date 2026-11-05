import { sfx } from '../sfx.js';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { U, REDUCED } from './engine.js';
import { mat, P, K } from './city.js';

// Qadam — the builder robot
export class Qadam {
  constructor(engine, x, z) {
    const g = this.g = new THREE.Group(); g.position.set(x * K, 0, z * K); engine.scene.add(g);
    const shell = mat(0xF7F5F0, { roughness: 0.35 }), dark = mat(0x2A3148, { roughness: 0.3, metalness: 0.2 });
    const M = (geo, m, p) => { const o = new THREE.Mesh(geo, m); o.castShadow = true; if (p) o.position.set(...p); return o; };
    this.body = new THREE.Group(); g.add(this.body);
    [-0.2, 0.2].forEach(o => g.add(M(new RoundedBoxGeometry(0.16, 0.2, 0.5, 3, 0.08), dark, [o, 0.1, 0])));
    this.body.add(M(new RoundedBoxGeometry(0.46, 0.42, 0.4, 4, 0.12), shell, [0, 0.42, 0]));
    const badge = M(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 24), mat(P.gold, { roughness: 0.4 }), [0, 0.45, 0.205]); badge.rotation.x = Math.PI / 2; this.body.add(badge);
    this.body.add(M(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 12), dark, [0, 0.66, 0]));
    this.head = new THREE.Group(); this.head.position.y = 0.86; this.body.add(this.head);
    this.head.add(M(new RoundedBoxGeometry(0.52, 0.36, 0.38, 4, 0.13), shell));
    this.head.add(M(new RoundedBoxGeometry(0.42, 0.22, 0.04, 3, 0.07), dark, [0, 0.01, 0.18]));
    this.eyeMat = new THREE.MeshStandardMaterial({ color: P.gold, emissive: P.gold, emissiveIntensity: 0.9 });
    this.eyes = [-0.09, 0.09].map(o => { const e = M(new RoundedBoxGeometry(0.07, 0.09, 0.02, 2, 0.03), this.eyeMat, [o, 0.02, 0.205]); e.castShadow = false; this.head.add(e); return e; });
    this.head.add(M(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6), dark, [0.12, 0.26, 0]));
    this.tip = M(new THREE.SphereGeometry(0.04, 16, 8), this.eyeMat, [0.12, 0.36, 0]); this.head.add(this.tip);
    this.arms = [-1, 1].map(sd => { const a = M(new RoundedBoxGeometry(0.09, 0.26, 0.1, 2, 0.04), shell, [sd * 0.29, 0.42, 0.02]); a.rotation.z = sd * 0.15; this.body.add(a); return a; });
    this.cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.1, 32, 1, true).rotateX(-Math.PI / 2).translate(0, 0, 0.75), new THREE.MeshBasicMaterial({ color: 0xF2B544, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
    this.cone.position.set(0, 0.02, 0.2); this.cone.visible = false; this.head.add(this.cone);
    this.flash = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xE8674A, transparent: true, opacity: 0, depthWrite: false }));
    this.flash.position.y = 0.05; g.add(this.flash);
    g.scale.setScalar(0.85);
    this.target = null; this.blink = 2; this.wave = 0; this.look = 0;
    engine.on(this);
  }
  goTo(x, z) { this.target = new THREE.Vector3(x * K, 0, z * K); }
  cheer() { this.wave = 1.6; }
  bump() { this.bumpT = 0.6; }
  update(dt, t) {
    const g = this.g;
    if (this.target) {
      const d = this.target.clone().sub(g.position); d.y = 0; const L = d.length();
      if (L < 0.05 || REDUCED) { if (REDUCED) g.position.copy(this.target); this.target = null; }
      else {
        const want = Math.atan2(d.x, d.z); let da = want - g.rotation.y; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        g.rotation.y += da * Math.min(1, dt * 6);
        if (Math.abs(da) < 0.6) { const mv = Math.min(L, dt * 2.4); g.position.addScaledVector(d.normalize(), mv); this.stepAcc = (this.stepAcc || 0) + mv; if (this.stepAcc > 0.22) { this.stepAcc = 0; sfx.play('step', 0.9); } }
      }
    }
    this.body.position.y = Math.abs(Math.sin(t * (this.target ? 9 : 2))) * (this.target ? 0.03 : 0.012);
    this.head.rotation.y = this.cone.visible ? Math.sin(t * 1.4) * 0.35 : Math.sin(t * 0.6) * 0.25;
    if (this.bumpT > 0) { this.bumpT -= dt; this.body.rotation.x = -Math.sin(this.bumpT * 30) * 0.12 * this.bumpT; this.flash.material.opacity = Math.max(0, this.bumpT) * 1.4; this.flash.scale.setScalar(1 + (0.6 - this.bumpT) * 2); } else { this.body.rotation.x = 0; this.flash.material.opacity = 0; }
    this.blink -= dt; const b = this.blink < 0.12 ? 0.15 : 1; this.eyes.forEach(e => e.scale.y = b); if (this.blink < 0) this.blink = 2 + Math.random() * 3;
    this.eyeMat.emissiveIntensity = 0.9 + U.uNight.value * 1.6;
    if (this.wave > 0) { this.wave -= dt; this.arms[1].rotation.z = -2.4 + Math.sin(t * 14) * 0.35; this.body.position.y += Math.abs(Math.sin(t * 10)) * 0.05; } else this.arms[1].rotation.z = 0.15;
  }
}

// Falling snow
export class Snow {
  constructor(engine) {
    const N = 1000, pos = new Float32Array(N * 3); this.v = new Float32Array(N);
    for (let i = 0; i < N; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 12.5 * K; pos.set([Math.cos(a) * r, Math.random() * 9, Math.sin(a) * r], i * 3); this.v[i] = 0.35 + Math.random() * 0.4; }
    const g = this.geo = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    this.m = new THREE.PointsMaterial({ size: 0.09, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.9 });
    this.pts = new THREE.Points(g, this.m); this.pts.frustumCulled = false; engine.scene.add(this.pts);
    this.gust = 0;
    engine.on(this);
  }
  blow() { this.gust = 2.5; }
  look(n) { this.m.color.set(0xffffff).lerp(new THREE.Color(0xC8D4FF), n); this.m.opacity = 0.9 - n * 0.15; }
  update(dt, t) {
    if (REDUCED) return;
    if (this.storm) this.gust = Math.max(this.gust, 3.2);
    const p = this.geo.attributes.position.array, g = this.gust > 0 ? 1 + this.gust * 1.6 : 1; this.gust = Math.max(0, this.gust - dt);
    for (let i = 0; i < this.v.length; i++) {
      p[i * 3 + 1] -= this.v[i] * dt * g;
      p[i * 3] += (Math.sin(t * 0.5 + i) * 0.12 + 0.18 * (g - 1)) * dt;
      if (p[i * 3 + 1] < 0) { p[i * 3 + 1] = 9; const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 12.5 * K; p[i * 3] = Math.cos(a) * r; p[i * 3 + 2] = Math.sin(a) * r; }
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}
