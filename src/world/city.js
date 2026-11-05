import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { U, REDUCED } from './engine.js';

export const P = {
  snow: 0xF1F4F7, snowShade: 0xDCE4EC, earth1: 0xC9B49B, earth2: 0xA88F77, earth3: 0x8A7563,
  river: 0x4F98A3, road: 0x6C7488, cream: 0xEFE6D6, sand: 0xE0CDB1, terracotta: 0xC4846A, slate: 0x8DA3B8,
  white: 0xF6F3EC, roofRed: 0xB0634C, roofSlate: 0x56677E, pine: 0x4E7A64, pineDark: 0x3C6352, gold: 0xF2B544,
  glass: 0x6F8BA6, ink: 0x1B2340, steel: 0x48506A,
};
export const K = 1.35; // world spread: positions are authored for a 10-unit plate and scaled by K
export const R = 10 * K, R0 = R - 0.35;
export const riverZ = x => K * (3 + 1.25 * Math.sin(x / K * 0.33 + 0.4));
const riverD = x => 1.25 * 0.33 * Math.cos(x / K * 0.33 + 0.4);
const RW = 0.95;
export function distRiver(x, z) { return Math.abs(z - riverZ(x)) / Math.sqrt(1 + Math.pow(riverD(x), 2)); }

let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const Y = V3(0, 1, 0);

// ---------- materials ----------
const mcache = new Map();
export function mat(c, o = {}) {
  const k = c + JSON.stringify(o);
  if (!mcache.has(k)) mcache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, metalness: 0, ...o }));
  return mcache.get(k);
}
const glow = []; // [material, dayIntensity, nightIntensity]
export function registerGlow(m, day, night) { glow.push([m, day, night]); return m; }
export function glowMat(color, day, night, o = {}) { const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: day, roughness: 0.4, ...o }); glow.push([m, day, night]); return m; }
const gcache = new Map();
function rbox(w, h, d, r = 0.08, s = 3) { const k = [w, h, d, r, s].join(); if (!gcache.has(k)) gcache.set(k, new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2.2, h / 2.2, d / 2.2))); return gcache.get(k); }
function mesh(g, m, cast = true, recv = true) { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = recv; return o; }

// Windows: one instanced mesh for the whole city. aBorn = pop-in time, aLit = (threshold, on)
const winMat = new THREE.MeshStandardMaterial({ color: P.glass, roughness: 0.3, metalness: 0.2 });
winMat.onBeforeCompile = sh => {
  sh.uniforms.uTime = U.uTime; sh.uniforms.uNight = U.uNight; sh.uniforms.uForce = U.uForce;
  sh.vertexShader = 'uniform float uTime;\nattribute float aBorn;\nattribute vec2 aLit;\nvarying vec2 vLit;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLit = aLit;\nfloat bornK = smoothstep(aBorn, aBorn + 0.35, uTime);\ntransformed *= bornK;');
  sh.fragmentShader = 'uniform float uNight;\nuniform float uForce;\nvarying vec2 vLit;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat lit = max(vLit.y * smoothstep(vLit.x, vLit.x + 0.08, uNight * 1.08), smoothstep(vLit.x * 0.9, vLit.x * 0.9 + 0.06, uForce));\ndiffuseColor.rgb *= 1.0 - 0.75 * uNight;\ntotalEmissiveRadiance += mix(vec3(2.3, 1.45, 0.62), vec3(1.6, 1.75, 1.95), step(0.86, vLit.x)) * lit;');
};
// trees sway in the wind
function swayMat(c) {
  const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true });
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.5;\nfloat h = max(position.y - 0.25, 0.0);\ntransformed.x += sin(uTime * 1.5 + ph) * 0.035 * h;\ntransformed.z += cos(uTime * 1.2 + ph) * 0.025 * h;\n#endif');
  };
  return m;
}

const spring = x => x <= 0 ? 0 : 1 - Math.exp(-5.2 * x) * Math.cos(8.2 * x);

export class City {
  constructor(engine) {
    this.e = engine; this.scene = engine.scene;
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.occ = []; this.anims = []; this.districts = []; this.wins = []; this.roads = []; this.hits = [];
    this.lightPools = [];
    this.base();
    this.layout();
    this.buildWindows();
    this.trees();
    this.crossings();
    this.cars();
    this.peds();
    this.beaconBuild();
    this.waves = [];
    engine.on(this);
  }
  block(x, z, hw, hd) { this.occ.push([x, z, hw, hd]); }
  free(x, z, r) { return Math.hypot(x, z) < R - 1.1 && distRiver(x, z) > RW + r + 0.25 && this.occ.every(o => Math.abs(x - o[0]) > o[2] + r || Math.abs(z - o[1]) > o[3] + r); }

  // ---------- diorama plate ----------
  base() {
    const rings = 80, segs = 200;
    const pos = [], col = [], idx = [];
    const cS = new THREE.Color(P.snow), cB = new THREE.Color(P.snowShade), tmp = new THREE.Color();
    pos.push(0, 0, 0); col.push(cS.r, cS.g, cS.b);
    for (let i = 1; i <= rings; i++) {
      const r = R0 * i / rings;
      for (let j = 0; j < segs; j++) {
        const a = j / segs * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r, d = distRiver(x, z);
        const bank = 1 - THREE.MathUtils.smoothstep(d, RW, RW + 0.6);
        tmp.copy(cS).lerp(cB, bank * 0.55);
        pos.push(x, 0.035 * Math.sin(x * 0.9) * Math.cos(z * 0.7) * (1 - bank) + 0.01, z); col.push(tmp.r, tmp.g, tmp.b);
      }
    }
    for (let j = 0; j < segs; j++) idx.push(0, 1 + (j + 1) % segs, 1 + j);
    for (let i = 1; i < rings; i++) for (let j = 0; j < segs; j++) {
      const a = 1 + (i - 1) * segs + j, b = 1 + (i - 1) * segs + (j + 1) % segs, c = 1 + i * segs + j, d = 1 + i * segs + (j + 1) % segs;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals(); this.topGeo = g;
    this.root.add(mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93 }), false, true));
    // river ribbon, clipped to the plate
    const rp = [], ri = [], n = 280, rr = R0 - 0.02;
    for (let i = 0; i <= n; i++) {
      const x = -R + 2 * R * i / n, z = riverZ(x), dz = riverD(x), L = Math.hypot(1, dz), nx = -dz / L, nz = 1 / L;
      [1, -1].forEach(sd => { let px = x + nx * RW * sd, pz = z + nz * RW * sd; const d = Math.hypot(px, pz); if (d > rr) { px *= rr / d; pz *= rr / d; } rp.push(px, 0.06, pz); });
      if (i < n) ri.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.setIndex(ri); rg.computeVertexNormals();
    this.riverMat = new THREE.MeshStandardMaterial({ color: P.river, roughness: 0.2, metalness: 0.05, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
    const riv = mesh(rg, this.riverMat, false, true); this.root.add(riv); this.riverGeo = rg;
    // ice floes drifting on the river
    const floeG = new THREE.CylinderGeometry(0.12, 0.13, 0.03, 7);
    this.floes = new THREE.InstancedMesh(floeG, mat(0xE8F1F4, { roughness: 0.4 }), 18);
    this.floeT = Array.from({ length: 18 }, () => [(rnd() * 20 - 10) * K, rnd() * 1.1 - 0.55, 0.6 + rnd() * 0.8]);
    this.root.add(this.floes);
    // sides with strata
    const prof = [];
    for (let k = 0; k <= 8; k++) { const t = k / 8 * Math.PI / 2; prof.push(new THREE.Vector2(R0 + Math.sin(t) * 0.35, -0.35 + Math.cos(t) * 0.36)); }
    prof.push(new THREE.Vector2(R, -2.1));
    for (let k = 0; k <= 6; k++) { const t = k / 6 * Math.PI / 2; prof.push(new THREE.Vector2(R - 0.3 + Math.cos(t) * 0.3, -2.1 - Math.sin(t) * 0.3)); }
    prof.push(new THREE.Vector2(0, -2.4));
    const lg = new THREE.LatheGeometry(prof, 140), lc = [], p = lg.attributes.position;
    const bands = [[-0.3, P.snow], [-0.36, 0xE4E9EE], [-0.95, P.earth1], [-1.55, P.earth2], [-9, P.earth3]];
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); const c = new THREE.Color(bands.find(b => y > b[0])[1]); lc.push(c.r, c.g, c.b); }
    lg.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
    this.root.add(mesh(lg, this.sideMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), false, false)); this.sideGeo = lg;
    // soft contact shadow
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 22, 64, 64, 64); gr.addColorStop(0, 'rgba(20,25,45,0.42)'); gr.addColorStop(1, 'rgba(20,25,45,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(31 * K, 31 * K), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = -2.75; this.root.add(sh);
  }

  // ---------- districts ----------
  district(i, center, cam) {
    center = [center[0] * K, center[1] * K];
    const d = { i, center, cam, group: new THREE.Group(), items: [], roads: [], foot: [], built: false };
    this.root.add(d.group); this.districts[i] = d; this.cur = d; return d;
  }
  item(obj, delay = 0, foot) {
    const d = this.cur; obj.userData.delay = delay; d.items.push(obj); d.group.add(obj); obj.visible = false;
    if (foot) d.foot.push(foot);
    return obj;
  }
  building(x, z, w, dd, h, color, o = {}) {
    x *= K; z *= K;
    const d = this.cur; this.block(x, z, w / 2 + 0.15, dd / 2 + 0.15);
    const g = new THREE.Group(); g.position.set(x, 0, z); if (o.ry) g.rotation.y = o.ry;
    const body = mesh(rbox(w, h, dd, Math.min(0.09, w * 0.1)), mat(color)); body.position.y = h / 2; g.add(body);
    const band = mesh(rbox(w + 0.04, 0.22, dd + 0.04, 0.05, 2), mat(new THREE.Color(color).multiplyScalar(0.86).getHex())); band.position.y = 0.11; g.add(band);
    // entrance with canopy
    const door = mesh(rbox(0.22, 0.3, 0.06, 0.03, 2), mat(0x3A4258, { roughness: 0.4 }), false); door.position.set(w * 0.18, 0.17, dd / 2 + 0.01); g.add(door);
    const can = mesh(rbox(0.34, 0.04, 0.16, 0.015, 2), mat(P.white)); can.position.set(w * 0.18, 0.36, dd / 2 + 0.07); g.add(can);
    if (o.step) { const t = mesh(rbox(w * 0.62, h * 0.35, dd * 0.62, 0.07), mat(color)); t.position.y = h + h * 0.175; g.add(t); }
    if (o.roof) {
      const s = new THREE.Shape(); s.moveTo(-w / 2 - 0.06, 0); s.lineTo(0, w * 0.4); s.lineTo(w / 2 + 0.06, 0); s.closePath();
      const rg = new THREE.ExtrudeGeometry(s, { depth: dd + 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
      const r = mesh(rg, mat(o.roof)); r.position.set(0, h - 0.02, -dd / 2 - 0.05); g.add(r);
      const ch = mesh(rbox(0.12, 0.3, 0.12, 0.03, 2), mat(P.white)); ch.position.set(w * 0.25, h + w * 0.26, 0); g.add(ch);
    } else if (!o.step) {
      const par = mesh(rbox(w * 0.32, 0.18, dd * 0.3, 0.04, 2), mat(P.white)); par.position.set(-w * 0.15, h + 0.09, -dd * 0.1); g.add(par);
    }
    // windows
    const floors = Math.max(1, Math.floor((h - 0.3) / 0.38)), cols = Math.max(1, Math.floor(w / 0.3)), colsD = Math.max(1, Math.floor(dd / 0.3));
    const born = this.cur.items.length * 0.18 + 0.9;
    const cos = Math.cos(o.ry || 0), sin = Math.sin(o.ry || 0);
    (this.entrances || (this.entrances = [])).push({ d: d.i, x: (x + w * 0.18 * cos + (dd / 2) * sin) / K, z: (z - w * 0.18 * sin + (dd / 2) * cos) / K, ry: o.ry || 0 });
    const wp = (lx, y, lz, sx, sz) => this.wins.push({ d: d.i, x: x + lx * cos + lz * sin, y, z: z - lx * sin + lz * cos, sx, sz, ry: o.ry || 0, born: born + rnd() * 0.5 });
    for (let f = 0; f < floors; f++) {
      const y = 0.46 + f * 0.38; if (y > h - 0.2) break;
      for (let c = 0; c < cols; c++) { const lx = -w / 2 + (c + 0.5) * w / cols; if (f === 0 && Math.abs(lx - w * 0.18) < 0.2) continue; wp(lx, y, dd / 2 + 0.006, 0.13, 0.02); wp(lx, y, -dd / 2 - 0.006, 0.13, 0.02); }
      for (let c = 0; c < colsD; c++) { const lz = -dd / 2 + (c + 0.5) * dd / colsD; wp(w / 2 + 0.006, y, lz, 0.02, 0.13); wp(-w / 2 - 0.006, y, lz, 0.02, 0.13); }
    }
    return this.item(g, this.cur.items.length * 0.18, [x, z, w, dd]);
  }
  road(pts, w = 0.55) {
    pts = pts.map(p => [p[0] * K, p[1] * K]);
    const d = this.cur;
    const curve = new THREE.CatmullRomCurve3(pts.map(p => V3(p[0], 0.03, p[1])), false, 'catmullrom', 0.2);
    const n = Math.ceil(curve.getLength() * 6), pos = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = curve.getPoint(t), tg = curve.getTangent(t), nx = -tg.z, nz = tg.x;
      pos.push(p.x + nx * w / 2, 0.075, p.z + nz * w / 2, p.x - nx * w / 2, 0.075, p.z - nz * w / 2);
      if (i < n) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = mesh(g, mat(P.road, { roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -3 }), false, true);
    const L = curve.getLength();
    // sidewalks on both sides (people walk here, never on the carriageway)
    const strip = (o1, o2, y) => {
      const sp = [];
      for (let i = 0; i <= n; i++) { const t = i / n, p = curve.getPoint(t), tg = curve.getTangent(t), nx = -tg.z, nz = tg.x; sp.push(p.x + nx * o2, y, p.z + nz * o2, p.x + nx * o1, y, p.z + nz * o1); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setIndex(idx.slice()); sg.computeVertexNormals();
      return mesh(sg, mat(0xD8D2C8, { roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }), false, true);
    };
    const walks = [strip(w / 2 + 0.03, w / 2 + 0.19, 0.088), strip(-w / 2 - 0.19, -w / 2 - 0.03, 0.088)];
    const dashes = []; for (let s = 0.3; s < L - 0.2; s += 0.6) dashes.push(s / L);
    const dm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.2, 0.04).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xF4F1EA, polygonOffset: true, polygonOffsetFactor: -4 }), dashes.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    dashes.forEach((t, i) => { const p = curve.getPoint(t), tg = curve.getTangent(t); q.setFromAxisAngle(Y, -Math.atan2(tg.z, tg.x)); m4.compose(V3(p.x, 0.085, p.z), q, V3(1, 1, 1)); dm.setMatrixAt(i, m4); });
    // street lamps on alternating sides
    const lamps = []; for (let s = 0.5, k = 0; s < L - 0.2; s += 1.5, k++) { const t = s / L, p = curve.getPoint(t), tg = curve.getTangent(t), sd = k % 2 ? 1 : -1; lamps.push([p.x - tg.z * (w / 2 + 0.25) * sd, p.z + tg.x * (w / 2 + 0.25) * sd]); }
    const pole = new THREE.CylinderGeometry(0.016, 0.022, 0.62, 6).translate(0, 0.31, 0), head = new THREE.SphereGeometry(0.05, 12, 8).translate(0, 0.66, 0);
    const lp = new THREE.InstancedMesh(pole, mat(P.steel, { roughness: 0.5 }), lamps.length), lh = new THREE.InstancedMesh(head, this.lampMat || (this.lampMat = glowMat(0xFFD08A, 0, 2.4)), lamps.length);
    lamps.forEach((p, i) => { m4.makeTranslation(p[0], 0, p[1]); lp.setMatrixAt(i, m4); lh.setMatrixAt(i, m4); });
    lp.castShadow = true;
    // warm light pools (night only)
    if (!this.poolTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,190,110,0.55)'); gr.addColorStop(1, 'rgba(255,190,110,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); this.poolTex = new THREE.CanvasTexture(c); }
    const pm = new THREE.MeshBasicMaterial({ map: this.poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    this.lightPools.push(pm);
    const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.85, 0.85).rotateX(-Math.PI / 2), pm, lamps.length);
    lamps.forEach((p, i) => { m4.makeTranslation(p[0], 0.09, p[1]); pools.setMatrixAt(i, m4); });
    const grp = new THREE.Group(); grp.add(m, dm, lp, lh, pools, ...walks);
    for (let s = 0; s < L; s += 0.4) { const p = curve.getPoint(s / L); this.block(p.x, p.z, w / 2 + 0.26, w / 2 + 0.26); }
    const r = { curve, L, w, walks, mesh: m, n, cross: [], dashT: dashes, lampXZ: lamps, lp, lh, pools, dm, parts: [[dm, dashes.length], [lp, lamps.length], [lh, lamps.length], [pools, lamps.length]], district: d.i };
    grp.userData.road = r; d.roads.push(r); this.roads.push(r);
    return this.item(grp, d.items.length * 0.12);
  }
  bridge(x, len = 3.1) {
    x *= K;
    const z = riverZ(x), g = new THREE.Group(); g.position.set(x, 0, z);
    const deck = mesh(rbox(0.75, 0.12, len, 0.04, 2), mat(P.white)); deck.position.y = 0.1; g.add(deck);
    const arch = new THREE.CatmullRomCurve3([[-1.3, 0], [-0.6, 0.85], [0, 1.05], [0.6, 0.85], [1.3, 0]].map(p => V3(0, p[1] + 0.12, p[0])));
    [-0.36, 0.36].forEach(o => { const a = mesh(new THREE.TubeGeometry(arch, 40, 0.045, 8), mat(P.white, { roughness: 0.5 })); a.position.x = o; g.add(a); });
    for (let k = -3; k <= 3; k++) [-0.36, 0.36].forEach(o => { const h = arch.getPoint((k + 3.5) / 7.5).y; const c = mesh(new THREE.CylinderGeometry(0.012, 0.012, h, 4), mat(P.white)); c.position.set(o, h / 2 + 0.06, k * 0.32); g.add(c); });
    return this.item(g, this.cur.items.length * 0.12);
  }

  layout() {
    // 0 — Weather station (week 1)
    this.district(0, [-6.0, -3.2], { az: -1.1, zoom: 0.5, pol: 0.92 });
    this.stationBuild(-5.6, -3.4);
    this.building(-7.5, -2.0, 1.0, 0.9, 1.0, P.cream, { roof: P.roofRed });
    this.building(-7.6, -3.9, 0.9, 0.9, 1.2, P.white, { roof: P.roofSlate });
    this.building(-4.0, -2.7, 0.9, 0.8, 1.4, P.sand);
    this.yardBuild();
    // library (always there — book mode)
    this.libraryBuild(0.2, 0.55);

    // 1 — Roads (week 2)
    this.district(1, [-2.2, -1.2], { az: -0.3, zoom: 0.78, pol: 0.86 });
    this.road([[-8.4, -1.2], [-4, -1.2], [0, -1.2], [4, -1.25], [8.4, -1.4]], 0.6);
    this.road([[-2.2, -7.2], [-2.2, -1.2], [-2.2, 2.6], [-2.2, 6.2]], 0.5);
    this.road([[4.8, -6.9], [4.8, -1.3], [4.85, 4.14], [4.2, 7.4]], 0.5);
    this.bridge(-2.2); this.bridge(4.85);
    this.depotBuild(-0.9, -6.6);
    this.hospital(3.4, -0.3);

    // 2 — Blocks & buses (week 3)
    this.district(2, [-4.6, -5.2], { az: -0.55, zoom: 0.55, pol: 0.9 });
    this.road([[-7.0, -4.9], [-2.2, -4.9], [4.8, -4.9], [7.2, -4.9]], 0.45);
    this.building(-4.3, -6.2, 1.2, 1.0, 2.4, P.slate, { step: true });
    this.building(-5.9, -6.1, 1.0, 0.9, 1.6, P.cream);
    this.building(-3.2, -3.6, 0.8, 0.8, 1.1, P.sand, { roof: P.roofSlate });
    this.shelter(-3.6, -4.47); this.shelter(2.2, -4.47);

    // 3 — Culture palace: Khan Shatyr (week 4)
    this.district(3, [-5.8, 5.2], { az: -2.3, zoom: 0.52, pol: 0.9 });
    this.khanShatyr(-5.8, 5.2);

    // 4 — Traffic lights (week 5)
    this.district(4, [3.0, -4.0], { az: 0.35, zoom: 0.6, pol: 0.88 });
    this.building(2.4, -2.7, 1.1, 1.0, 2.0, P.cream, { step: true });
    this.building(3.3, -6.3, 1.0, 1.0, 3.1, P.slate, { step: true });
    this.building(1.4, -6.3, 1.0, 0.9, 1.8, P.terracotta);
    [[-2.2, -1.2], [4.8, -1.3], [4.8, -4.9], [-2.2, -4.9]].forEach(p => this.trafficLight(p[0] + 0.42, p[1] + 0.42));

    // 5 — Blizzard alert (week 6)
    this.district(5, [6.6, -3.2], { az: 0.9, zoom: 0.55, pol: 0.88 });
    this.building(6.4, -2.8, 1.1, 1.1, 2.6, P.white, { step: true });
    this.building(6.0, -6.0, 0.9, 0.9, 1.4, P.sand, { roof: P.roofRed });
    this.building(7.7, -3.6, 0.8, 0.9, 1.2, P.terracotta);
    this.sirenTower(6.2, 0.4);

    // 6 — Bus tracking (week 7)
    this.district(6, [-1.6, 6.6], { az: 3.0, zoom: 0.55, pol: 0.88 });
    this.road([[-2.2, 6.2], [-0.4, 7.5], [2.2, 8.1], [4.2, 7.4]], 0.45);
    this.building(-3.6, 7.2, 0.9, 0.9, 1.2, P.cream, { roof: P.roofRed });
    this.garage(-0.2, 5.6);
    this.gpsMast(-1.25, 4.75);

    // 7 — Akimat post (week 8)
    this.district(7, [6.8, 3.2], { az: 1.9, zoom: 0.55, pol: 0.88 });
    this.akimat(6.3, 5.6);
    this.building(7.8, 0.6, 0.8, 0.8, 1.1, P.cream, { roof: P.roofSlate });

    // 8 — Power grid: Nur Alem (week 9)
    this.district(8, [2.2, 5.9], { az: 2.6, zoom: 0.52, pol: 0.9 });
    this.nurAlem(2.2, 5.9);
    this.pylons([[0.9, 4.75], [3.55, 4.85], [3.6, 7.1]]);

    // 9 — Bayterek (week 10)
    this.district(9, [0, -2.7], { az: -0.15, zoom: 0.58, pol: 0.82 });
    this.bayterek(0, -2.7);
    this.building(-1.25, -3.75, 0.8, 0.8, 1.6, P.sand);
    this.building(1.25, -3.75, 0.8, 0.8, 1.6, P.sand);

    // plots (dashed outlines) and tap targets
    for (const d of this.districts) {
      const gs = [];
      for (const f of d.foot) {
        const [x, z, w, dd] = f, per = 2 * (w + dd), n = Math.max(8, Math.floor(per / 0.3));
        for (let i = 0; i < n; i++) {
          let s = i / n * per, px, pz, hz;
          if (s < w) { px = -w / 2 + s; pz = -dd / 2; hz = 1; } else if ((s -= w) < dd) { px = w / 2; pz = -dd / 2 + s; hz = 0; }
          else if ((s -= dd) < w) { px = w / 2 - s; pz = dd / 2; hz = 1; } else { s -= w; px = -w / 2; pz = dd / 2 - s; hz = 0; }
          gs.push(new THREE.PlaneGeometry(hz ? 0.15 : 0.05, hz ? 0.05 : 0.15).rotateX(-Math.PI / 2).translate(x + px, 0.08, z + pz));
        }
      }
      if (gs.length) { d.plotMat = new THREE.MeshBasicMaterial({ color: 0xA9B6C6, transparent: true, opacity: 0.5, depthWrite: false }); d.plot = new THREE.Mesh(mergeGeometries(gs), d.plotMat); this.root.add(d.plot); }
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 3, 16), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set(d.center[0], 1.5, d.center[1]); hit.userData.district = d.i; this.root.add(hit); this.hits.push(hit);
    }
    this.libHit = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2, 1.4), new THREE.MeshBasicMaterial({ visible: false }));
    this.libHit.position.set(0.2 * K, 1, 0.55 * K); this.libHit.userData.library = true; this.root.add(this.libHit);
  }

  // ---------- landmarks ----------
  libraryBuild(x, z) {
    x *= K; z *= K;
    this.block(x, z, 0.85, 0.65);
    const g = new THREE.Group(); g.position.set(x, 0, z); this.root.add(g);
    const steps = mesh(rbox(1.6, 0.12, 1.2, 0.04, 2), mat(P.cream)); steps.position.y = 0.06; g.add(steps);
    const body = mesh(rbox(1.3, 0.7, 0.8, 0.06), mat(0xF3EBDD)); body.position.set(0, 0.47, -0.08); g.add(body);
    for (let i = 0; i < 5; i++) { const c = mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.62, 10), mat(P.white)); c.position.set(-0.52 + i * 0.26, 0.43, 0.42); g.add(c); }
    const s = new THREE.Shape(); s.moveTo(-0.72, 0); s.lineTo(0, 0.34); s.lineTo(0.72, 0); s.closePath();
    const ped = mesh(new THREE.ExtrudeGeometry(s, { depth: 1.0, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }), mat(P.roofSlate)); ped.position.set(0, 0.82, -0.55); g.add(ped);
    const ent = mesh(rbox(1.42, 0.06, 1.0, 0.02, 2), mat(P.white)); ent.position.set(0, 0.8, -0.05); g.add(ent);
    const lw = glowMat(0xFFC978, 0, 1.5, { color: 0x6F8BA6 });
    for (let i = 0; i < 4; i++) { const w = mesh(rbox(0.16, 0.36, 0.02, 0.02, 2), lw, false); w.position.set(-0.39 + i * 0.26, 0.47, 0.33); g.add(w); }
    // open book emblem (gold, glows at night)
    const bm = glowMat(P.gold, 0.15, 1.6);
    [-1, 1].forEach(sd => { const p = mesh(new THREE.BoxGeometry(0.15, 0.015, 0.2), bm, false); p.position.set(sd * 0.075, 0.94, 0.36); p.rotation.z = sd * 0.3; p.rotation.x = Math.PI / 2 - 0.25; g.add(p); });
    this.library = g;
    this.libBake = () => { if (this.libBaked) return; this.libBaked = true; this.bakeObjects([g]); g.visible = false; };
  }
  stationBuild(x, z) {
    x *= K; z *= K;
    const d = this.cur; this.block(x, z, 1.1, 1.1);
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const parts = {};
    const part = (name, o, fx) => { const p = new THREE.Group(); p.add(o); g.add(p); p.userData.fx = fx; parts[name] = p; return p; };
    const base = mesh(rbox(1.7, 0.14, 1.7, 0.05, 2), mat(0xE7EBF0)); base.position.y = 0.07;
    const fence = new THREE.Group(); fence.add(base);
    const lip = mesh(rbox(1.5, 0.05, 1.5, 0.025, 2), mat(0xF7F9FB)); lip.position.y = 0.16; fence.add(lip);
    const stripe = mesh(rbox(1.72, 0.03, 1.72, 0.015, 2), mat(P.gold)); stripe.position.y = 0.1; fence.add(stripe);
    part('base', fence);
    // mast
    const mast = new THREE.Group();
    const m1 = mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.9, 10), mat(P.white, { roughness: 0.4 })); m1.position.set(0.45, 1.09, -0.45); mast.add(m1);
    for (let k = 0; k < 3; k++) { const ring = mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16), mat(P.terracotta)); ring.rotation.x = Math.PI / 2; ring.position.set(0.45, 0.6 + k * 0.55, -0.45); mast.add(ring); }
    part('mast', mast);
    // S: thermometer screen (Stevenson box)
    const th = new THREE.Group(); th.position.set(-0.45, 0, -0.4);
    const box = mesh(rbox(0.34, 0.32, 0.3, 0.03, 2), mat(P.white)); box.position.y = 0.62; th.add(box);
    for (let k = 0; k < 4; k++) { const sl = mesh(new THREE.BoxGeometry(0.36, 0.012, 0.012), mat(0xC8CED8), false); sl.position.set(0, 0.52 + k * 0.07, 0.155); th.add(sl); }
    const roofT = mesh(rbox(0.42, 0.04, 0.38, 0.015, 2), mat(P.roofSlate)); roofT.position.y = 0.8; th.add(roofT);
    [[-0.12, -0.1], [0.12, -0.1], [-0.12, 0.1], [0.12, 0.1]].forEach(p => { const l = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.46, 4), mat(P.steel)); l.position.set(p[0], 0.23, p[1]); th.add(l); });
    part('thermo', th);
    // S: anemometer cups on top of the mast
    const an = new THREE.Group(); an.position.set(0.45, 2.08, -0.45);
    const hub = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), mat(P.steel)); an.add(hub);
    const rot = new THREE.Group(); an.add(rot);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const arm = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4), mat(P.steel)); arm.rotation.z = Math.PI / 2; arm.rotation.y = a; arm.position.set(Math.cos(a) * 0.11, 0.03, -Math.sin(a) * 0.11); rot.add(arm); const cup = mesh(new THREE.SphereGeometry(0.04, 12, 8, 0, Math.PI), mat(P.gold, { side: THREE.DoubleSide })); cup.position.set(Math.cos(a) * 0.22, 0.03, -Math.sin(a) * 0.22); cup.rotation.y = a; rot.add(cup); }
    this.anemo = rot;
    part('anemo', an);
    // A: street display board
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const cx = cv.getContext('2d');
    cx.fillStyle = '#16203A'; cx.fillRect(0, 0, 256, 128); cx.fillStyle = '#FFD27A'; cx.font = '600 54px Inter, sans-serif'; cx.textAlign = 'center'; cx.fillText('−18°', 128, 62); cx.fillStyle = '#8FD0D8'; cx.font = '500 30px Inter, sans-serif'; cx.fillText('12 m/s', 128, 104);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const bd = new THREE.Group(); bd.position.set(-0.35, 0, 0.5);
    const frame = mesh(rbox(0.74, 0.42, 0.06, 0.04, 2), mat(P.ink, { roughness: 0.4 })); frame.position.y = 0.78; bd.add(frame);
    const scrM = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.3 }); glow.push([scrM, 0.6, 1.6]);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.32), scrM); scr.position.set(0, 0.78, 0.035); bd.add(scr);
    [-0.25, 0.25].forEach(o => { const l = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), mat(P.steel)); l.position.set(o, 0.3, 0); bd.add(l); });
    part('board', bd);
    // A: siren / alarm light on the mast
    const sr = new THREE.Group(); sr.position.set(0.45, 1.55, -0.45);
    const horn = mesh(new THREE.CylinderGeometry(0.07, 0.03, 0.14, 12), mat(P.white)); horn.rotation.z = Math.PI / 2; horn.position.x = 0.1; sr.add(horn);
    this.sirenMat = new THREE.MeshStandardMaterial({ color: 0xE8674A, emissive: 0xE8674A, emissiveIntensity: 0.3 });
    const bulb = mesh(new THREE.SphereGeometry(0.055, 16, 10), this.sirenMat); bulb.position.set(-0.08, 0.04, 0); sr.add(bulb);
    part('siren', sr);
    // P: gauge (forecast accuracy)
    const ga = new THREE.Group(); ga.position.set(0.5, 0, 0.45);
    const dial = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 32), mat(P.white)); dial.rotation.x = Math.PI / 2 - 0.4; dial.position.y = 0.5; ga.add(dial);
    const arc = mesh(new THREE.TorusGeometry(0.15, 0.018, 6, 32, Math.PI * 1.2), mat(P.river)); arc.rotation.x = -0.4; arc.rotation.z = -0.1 * Math.PI; arc.position.set(0, 0.5, 0.03); ga.add(arc);
    this.needle = new THREE.Group(); this.needle.position.set(0, 0.5, 0.04); this.needle.rotation.x = -0.4;
    const nd = mesh(new THREE.BoxGeometry(0.012, 0.13, 0.01), mat(P.terracotta), false); nd.position.y = 0.06; this.needle.add(nd); ga.add(this.needle);
    const gl = mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.3, 6), mat(P.steel)); gl.position.y = 0.2; ga.add(gl);
    part('gauge', ga);
    // P2: early warning — a small flag lamp
    const ew = new THREE.Group(); ew.position.set(0.7, 0, 0.0);
    const ep = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), mat(P.steel)); ep.position.y = 0.42; ew.add(ep);
    this.ewMat = glowMat(P.gold, 0.4, 2.2); const el = mesh(new THREE.ConeGeometry(0.06, 0.1, 16), this.ewMat); el.position.y = 0.82; ew.add(el);
    part('early', ew);
    // E: radar dome (environment awareness)
    const rd = new THREE.Group(); rd.position.set(-0.5, 0.14, 0.15);
    const tw = mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.42, 16), mat(0xD6DCE4)); tw.position.y = 0.21; rd.add(tw);
    const rg2 = mesh(new THREE.TorusGeometry(0.15, 0.02, 8, 24), mat(P.gold)); rg2.rotation.x = Math.PI / 2; rg2.position.y = 0.42; rd.add(rg2);
    const dome = mesh(new THREE.SphereGeometry(0.17, 24, 12), mat(P.white, { roughness: 0.35 })); dome.position.y = 0.55; rd.add(dome);
    part('streets', rd);
    // E2: wind sock
    const ws = new THREE.Group(); ws.position.set(-0.72, 0, -0.75);
    const wp = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.75, 6), mat(P.steel)); wp.position.y = 0.45; ws.add(wp);
    this.sock = mesh(new THREE.ConeGeometry(0.06, 0.28, 12, 1, true), mat(0xE8674A, { side: THREE.DoubleSide })); this.sock.rotation.z = Math.PI / 2; this.sock.position.set(0.14, 0.78, 0); ws.add(this.sock);
    part('weather', ws);
    // brain: server box with LEDs (agent program)
    const br = new THREE.Group(); br.position.set(0.0, 0.14, -0.55);
    const sv = mesh(rbox(0.36, 0.34, 0.24, 0.04, 2), mat(P.slate)); sv.position.y = 0.17; br.add(sv);
    this.ledMats = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: 0x2A3148, emissive: P.gold, emissiveIntensity: 0 }));
    this.ledMats.forEach((m, k) => { const l = mesh(new THREE.BoxGeometry(0.06, 0.03, 0.01), m, false); l.position.set(-0.1 + k * 0.1, 0.24, 0.125); br.add(l); });
    part('brain', br);
    g.scale.setScalar(1.2); g.userData.baseScale = 1.2;
    this.station = { group: g, parts };
    for (const k in parts) parts[k].scale.setScalar(0.001);
    this.item(g, 0, [x, z, 2.05, 2.05]);
    g.userData.station = true;
  }
  // practice yard for week 1: a loop with snowdrifts and lamps
  yardBuild() {
    const Y0 = this.yardC = { x: -5.0 * K, z: 0.3 * K, rx: 1.6, rz: 0.6 };
    this.yardDrifts = [0.5, 1.25, 1.85].map(k => k * Math.PI);
    const g = this.yard = new THREE.Group(); this.root.add(g); g.visible = false;
    const track = mesh(new THREE.RingGeometry(0.97, 1.03, 96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xB8C4D2, transparent: true, opacity: 0.6, depthWrite: false }), false, false);
    track.scale.set(Y0.rx, 1, Y0.rz); track.position.set(Y0.x, 0.07, Y0.z); g.add(track);
    this.drifts = this.yardDrifts.map(a => { const d = mesh(new THREE.SphereGeometry(0.3, 20, 12), mat(0xFAFCFE, { roughness: 0.95 })); d.scale.set(1.2, 0.5, 1); d.position.set(Y0.x + Math.cos(a) * Y0.rx, 0.02, Y0.z + Math.sin(a) * Y0.rz); g.add(d); return d; });
    this.yardLamps = [0.15, 0.85, 1.15, 1.6].map(k => {
      const a = k * Math.PI, l = new THREE.Group(); l.position.set(Y0.x + Math.cos(a) * Y0.rx * 0.62, 0, Y0.z + Math.sin(a) * Y0.rz * 0.4);
      const p = mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.62, 6), mat(P.steel)); p.position.y = 0.31; l.add(p);
      const h = mesh(new THREE.SphereGeometry(0.055, 12, 8), this.lampMat || (this.lampMat = glowMat(0xFFD08A, 0, 2.4)), false); h.position.y = 0.66; l.add(h);
      l.scale.setScalar(0.001); g.add(l); return l;
    });
    this.block(Y0.x, Y0.z, Y0.rx + 0.3, Y0.rz + 0.3);
  }
  yardPoint(a, off = 0) { const c = this.yardC; return [c.x + Math.cos(a) * (c.rx + off), c.z + Math.sin(a) * (c.rz + off * 0.6)]; }
  yardLampsOn(anim) { this.yardLamps.forEach((l, k) => { if (anim && !REDUCED) { l.scale.setScalar(0.001); this.anims.push({ kind: 'grow', o: l, t0: U.uTime.value + k * 0.15, uniform: true }); } else l.scale.setScalar(1); }); }
  depotBuild(x, z) {
    x *= K; z *= K;
    this.block(x, z, 0.8, 0.6);
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const b = mesh(rbox(1.3, 0.8, 0.9, 0.08), mat(P.terracotta)); b.position.y = 0.4; g.add(b);
    const rf = mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.34, 16, 1, false, 0, Math.PI), mat(P.roofSlate)); rf.rotation.z = Math.PI / 2; rf.rotation.y = Math.PI / 2; rf.position.y = 0.8; rf.scale.set(1, 1, 0.35); g.add(rf);
    for (let i = 0; i < 2; i++) { const dr = mesh(rbox(0.4, 0.46, 0.04, 0.03, 2), mat(0xD9DEE6)); dr.position.set(-0.3 + i * 0.6, 0.25, 0.46); g.add(dr); for (let k = 0; k < 4; k++) { const ln = mesh(new THREE.BoxGeometry(0.38, 0.01, 0.01), mat(0xAEB6C3), false); ln.position.set(-0.3 + i * 0.6, 0.08 + k * 0.1, 0.485); g.add(ln); } }
    return this.item(g, this.cur.items.length * 0.12, [x, z, 1.3, 0.9]);
  }
  hospital(x, z) {
    const g = this.building(x, z, 1.1, 0.9, 1.3, P.white);
    const crossM = glowMat(0xE8674A, 0.35, 1.6);
    [[0.34, 0.1], [0.1, 0.34]].forEach(([w, h]) => { const c = mesh(new THREE.BoxGeometry(w, h, 0.03), crossM, false); c.position.set(-0.22, 0.92, 0.47); g.add(c); });
    return g;
  }
  shelter(x, z) {
    x *= K; z *= K;
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const rf = mesh(rbox(0.6, 0.04, 0.26, 0.015, 2), mat(P.river)); rf.position.y = 0.42; g.add(rf);
    const back = mesh(new THREE.BoxGeometry(0.56, 0.32, 0.015), new THREE.MeshStandardMaterial({ color: 0xBFD9E0, transparent: true, opacity: 0.55, roughness: 0.1 })); back.position.set(0, 0.24, -0.11); g.add(back);
    [-0.27, 0.27].forEach(o => { const l = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.42, 6), mat(P.steel)); l.position.set(o, 0.21, -0.1); g.add(l); });
    const sign = mesh(rbox(0.1, 0.1, 0.02, 0.02, 2), glowMat(P.gold, 0.1, 1.4)); sign.position.set(0.36, 0.5, 0); g.add(sign);
    return this.item(g, this.cur.items.length * 0.12);
  }
  trafficLight(x, z) {
    x *= K; z *= K;
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const pole = mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.6, 6), mat(P.steel)); pole.position.y = 0.3; g.add(pole);
    const box = mesh(rbox(0.09, 0.22, 0.07, 0.025, 2), mat(P.ink)); box.position.y = 0.66; g.add(box);
    const tl = { x, z, lamps: [], on: [], off: [] };
    [[0xE8674A, 0.73], [P.gold, 0.66], [0x5FBF8A, 0.59]].forEach(([c, y], k) => { const on = glowMat(c, 0.9, 2.4), off = glowMat(c, 0.04, 0.25); const l = mesh(new THREE.SphereGeometry(0.022, 8, 6), k === 2 ? on : off, false); l.position.set(0, y, 0.037); g.add(l); tl.lamps.push(l); tl.on.push(on); tl.off.push(off); });
    (this.tLights || (this.tLights = [])).push(tl); g.userData.nobake = true;
    return this.item(g, this.cur.items.length * 0.1);
  }
  sirenTower(x, z) {
    x *= K; z *= K;
    this.block(x, z, 0.3, 0.3);
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const legs = mesh(new THREE.CylinderGeometry(0.04, 0.09, 1.6, 6), mat(P.white)); legs.position.y = 0.8; g.add(legs);
    for (let k = 0; k < 2; k++) { const h = mesh(new THREE.CylinderGeometry(0.1, 0.04, 0.2, 12), mat(P.white)); h.rotation.z = Math.PI / 2; h.position.set(k ? 0.12 : -0.12, 1.55, 0); h.rotation.y = k ? 0 : Math.PI; g.add(h); }
    const lamp = mesh(new THREE.SphereGeometry(0.07, 16, 10), glowMat(0xE8674A, 0.2, 1.8)); lamp.position.y = 1.72; g.add(lamp);
    return this.item(g, this.cur.items.length * 0.12, [x, z, 0.5, 0.5]);
  }
  garage(x, z) {
    x *= K; z *= K;
    this.block(x, z, 0.7, 0.55);
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const b = mesh(rbox(1.1, 0.55, 0.8, 0.07), mat(P.slate)); b.position.y = 0.28; g.add(b);
    const st = mesh(rbox(1.14, 0.08, 0.84, 0.03, 2), mat(P.gold)); st.position.y = 0.5; g.add(st);
    for (let i = 0; i < 3; i++) { const dr = mesh(rbox(0.26, 0.32, 0.04, 0.03, 2), mat(0xD9DEE6)); dr.position.set(-0.34 + i * 0.34, 0.18, 0.41); g.add(dr); }
    return this.item(g, this.cur.items.length * 0.12, [x, z, 1.1, 0.8]);
  }
  gpsMast(x, z) {
    x *= K; z *= K;
    this.block(x, z, 0.25, 0.25);
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const m = mesh(new THREE.CylinderGeometry(0.025, 0.06, 1.5, 8), mat(P.white)); m.position.y = 0.75; g.add(m);
    const dish = mesh(new THREE.SphereGeometry(0.18, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.6), mat(P.white, { side: THREE.DoubleSide })); dish.rotation.x = -2.2; dish.position.set(0, 1.25, 0.08); g.add(dish);
    const tip = mesh(new THREE.SphereGeometry(0.035, 10, 8), glowMat(P.gold, 0.3, 2)); tip.position.y = 1.55; g.add(tip);
    return this.item(g, this.cur.items.length * 0.12, [x, z, 0.4, 0.4]);
  }
  khanShatyr(x, z) {
    x *= K; z *= K;
    this.block(x, z, 1.25, 1.1);
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = 0.5;
    const plaza = mesh(new THREE.CylinderGeometry(1.45, 1.5, 0.1, 48), mat(P.cream)); plaza.scale.z = 0.85; plaza.position.y = 0.05; g.add(plaza);
    const H = 2.5, prof = []; for (let i = 0; i <= 24; i++) { const t = i / 24; prof.push(new THREE.Vector2(1.15 * Math.pow(1 - t, 1.25) + 0.015, t * H)); }
    const tent = mesh(new THREE.LatheGeometry(prof, 48), glowMat(0xEEE6D5, 0, 0.18, { roughness: 0.45, side: THREE.DoubleSide }));
    tent.scale.set(1, 1, 0.8); tent.rotation.z = 0.1; tent.position.y = 0.1; g.add(tent);
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, pts = []; for (let k = 0; k <= 12; k++) { const t = k / 12, r = 1.15 * Math.pow(1 - t, 1.25) + 0.025; pts.push(V3(Math.cos(a) * r, t * H + 0.1, Math.sin(a) * r * 0.8).applyAxisAngle(V3(0, 0, 1), 0.1)); } g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.01, 4), mat(0xBDB4A2, { roughness: 0.5 }), false, false)); }
    const mast = mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.9, 8), mat(P.white)); mast.position.set(-H * Math.sin(0.1) - 0.04, H + 0.5, 0); mast.rotation.z = 0.1; g.add(mast);
    return this.item(g, 0, [x, z, 2.4, 2.1]);
  }
  akimat(x, z) {
    x *= K; z *= K;
    this.block(x, z, 0.8, 0.65);
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -0.5;
    const pl = mesh(rbox(1.5, 0.1, 1.2, 0.04, 2), mat(P.cream)); pl.position.y = 0.05; g.add(pl);
    const b = mesh(rbox(1.3, 0.75, 0.85, 0.06), mat(0xF3EEE4)); b.position.y = 0.47; g.add(b);
    for (let i = 0; i < 6; i++) { const c = mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.66, 10), mat(P.white)); c.position.set(-0.5 + i * 0.2, 0.43, 0.48); g.add(c); }
    const ent = mesh(rbox(1.36, 0.07, 1.0, 0.02, 2), mat(P.white)); ent.position.set(0, 0.86, 0.06); g.add(ent);
    const dr = mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.18, 24), mat(P.white)); dr.position.y = 0.98; g.add(dr);
    const dome = mesh(new THREE.SphereGeometry(0.27, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(P.river, { roughness: 0.3, metalness: 0.3 })); dome.position.y = 1.07; g.add(dome);
    const sp = mesh(new THREE.SphereGeometry(0.04, 12, 8), glowMat(P.gold, 0.3, 1.6)); sp.position.y = 1.38; g.add(sp);
    return this.item(g, 0, [x, z, 1.6, 1.3]);
  }
  nurAlem(x, z) {
    x *= K; z *= K;
    this.block(x, z, 1.05, 1.05);
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const pod = mesh(new THREE.CylinderGeometry(1.0, 1.08, 0.24, 48), mat(P.cream)); pod.position.y = 0.12; g.add(pod);
    const s = mesh(new THREE.SphereGeometry(0.92, 48, 28), glowMat(0x7FB2CF, 0, 0.75, { metalness: 0.4, roughness: 0.15 })); s.position.y = 1.18; g.add(s);
    for (let i = -3; i <= 3; i++) { const y = i * 0.24, r = Math.sqrt(0.94 * 0.94 - y * y); const t = mesh(new THREE.TorusGeometry(r, 0.013, 6, 56), mat(P.white), false, false); t.rotation.x = Math.PI / 2; t.position.y = 1.18 + y; g.add(t); }
    for (let i = 0; i < 6; i++) { const t = mesh(new THREE.TorusGeometry(0.94, 0.012, 6, 56), mat(P.white), false, false); t.rotation.y = i / 6 * Math.PI; t.position.y = 1.18; g.add(t); }
    return this.item(g, 0, [x, z, 2.0, 2.0]);
  }
  pylons(pts) {
    pts = pts.map(p => [p[0] * K, p[1] * K]);
    const g = new THREE.Group();
    const tops = pts.map(([x, z]) => { const p = mesh(new THREE.CylinderGeometry(0.02, 0.05, 1.1, 4), mat(P.steel)); p.position.set(x, 0.55, z); g.add(p); const arm = mesh(new THREE.BoxGeometry(0.34, 0.025, 0.025), mat(P.steel)); arm.position.set(x, 1.02, z); g.add(arm); this.block(x, z, 0.15, 0.15); return V3(x, 1.02, z); });
    for (let i = 0; i < tops.length - 1; i++) for (const o of [-0.15, 0.15]) {
      const a = tops[i].clone().add(V3(o, 0, 0)), b = tops[i + 1].clone().add(V3(o, 0, 0)), mid = a.clone().lerp(b, 0.5); mid.y -= 0.18;
      g.add(mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 16, 0.006, 3), mat(0x2E3550), false, false));
    }
    return this.item(g, this.cur.items.length * 0.12);
  }
  bayterek(x, z) {
    x *= K; z *= K;
    this.block(x, z, 0.85, 0.85);
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const wm = glowMat(P.white, 0, 0.22, { roughness: 0.42, color: P.white });
    const pl = mesh(rbox(1.5, 0.12, 1.5, 0.04, 2), mat(P.cream)); pl.position.y = 0.06; g.add(pl);
    const prof = [[0.42, 0.1], [0.3, 0.5], [0.17, 1.4], [0.13, 2.6], [0.14, 3.3], [0.2, 3.6], [0.0, 3.62]].map(p => new THREE.Vector2(p[0], p[1]));
    g.add(mesh(new THREE.LatheGeometry(prof, 32), wm));
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const c = new THREE.CatmullRomCurve3([[0.12, 3.2], [0.32, 3.55], [0.62, 4.05], [0.55, 4.55], [0.3, 4.9]].map(p => V3(ca * p[0], p[1], sa * p[0])));
      g.add(mesh(new THREE.TubeGeometry(c, 24, 0.032, 6), wm));
    }
    this.bayBall = glowMat(P.gold, 0.05, 1.5, { metalness: 0.55, roughness: 0.22 });
    const ball = mesh(new THREE.SphereGeometry(0.52, 48, 32), this.bayBall); ball.position.y = 4.18; g.add(ball);
    return this.item(g, 0, [x, z, 1.5, 1.5]);
  }

  // ---------- windows ----------
  buildWindows() {
    const n = this.wins.length, im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.19, 1), winMat, n);
    const born = new Float32Array(n).fill(1e6), lit = new Float32Array(n * 2), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    this.wins.forEach((w, i) => { q.setFromAxisAngle(Y, w.ry); m4.compose(V3(w.x, w.y, w.z), q, V3(w.sx, 1, w.sz)); im.setMatrixAt(i, m4); lit[i * 2] = 0.1 + rnd() * 0.82; lit[i * 2 + 1] = rnd() < 0.62 ? 1 : 0; });
    im.geometry.setAttribute('aBorn', this.winBorn = new THREE.InstancedBufferAttribute(born, 1));
    im.geometry.setAttribute('aLit', new THREE.InstancedBufferAttribute(lit, 2));
    im.frustumCulled = false; this.root.add(im); this.winMesh = im;
  }
  // ---------- trees ----------
  trees() {
    const groves = [[-8.0, 2.0], [-3.8, 4.4], [0.4, 3.9], [6.8, 2.4], [-2.8, -8.0], [2.6, -8.2], [7.6, -5.2], [-8.3, -5.6], [-7.6, 6.8], [1.6, 8.6], [6.0, 7.2], [-5.5, -8.6], [8.6, -1.6], [-9.2, -1.8], [4.4, 9.4]].map(g => [g[0] * K, g[1] * K]);
    const pts = []; let tries = 0;
    while (pts.length < 96 && tries++ < 9000) {
      const gv = groves[Math.floor(rnd() * groves.length)], a = rnd() * 6.283, r = Math.sqrt(rnd()) * 2.0, x = gv[0] + Math.cos(a) * r, z = gv[1] + Math.sin(a) * r;
      if (this.free(x, z, 0.24)) { pts.push([x, z, 0.7 + rnd() * 0.5, rnd() * 6.28]); this.block(x, z, 0.16, 0.16); }
    }
    const gs = [
      [new THREE.CylinderGeometry(0.05, 0.06, 0.3, 6).translate(0, 0.15, 0), mat(0x7A6253)],
      [new THREE.ConeGeometry(0.34, 0.6, 7).translate(0, 0.5, 0), swayMat(P.pine)],
      [new THREE.ConeGeometry(0.26, 0.5, 7).translate(0, 0.85, 0), swayMat(P.pineDark)],
      [new THREE.ConeGeometry(0.15, 0.22, 7).translate(0, 1.13, 0), swayMat(P.snow)],
    ];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (const [g, m] of gs) { const im = new THREE.InstancedMesh(g, m, pts.length); im.castShadow = im.receiveShadow = true; pts.forEach((p, i) => { q.setFromAxisAngle(Y, p[3]); m4.compose(V3(p[0], 0, p[1]), q, V3(p[2], p[2], p[2])); im.setMatrixAt(i, m4); }); this.root.add(im); }
  }
  // ---------- traffic ----------
  // every place where two roads meet: cars take turns (traffic-light phases), people never cross here
  crossings() {
    const R2 = this.roads, X = this.cross = [];
    const samp = r => { const n = Math.ceil(r.L / 0.06), a = []; for (let i = 0; i <= n; i++) { const p = r.curve.getPointAt(i / n); a.push([p.x, p.z, i / n]); } return a; };
    const S = R2.map(samp);
    for (let a = 0; a < R2.length; a++) for (let b = a + 1; b < R2.length; b++) {
      let best = null;
      for (const pa of S[a]) for (const pb of S[b]) { const d = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]); if (d < 0.2 && (!best || d < best.d)) best = { d, sa: pa[2], sb: pb[2], x: (pa[0] + pb[0]) / 2, z: (pa[1] + pb[1]) / 2 }; }
      if (!best) continue;
      const x = { a: R2[a], b: R2[b], sa: best.sa, sb: best.sb, x: best.x, z: best.z, off: X.length * 3.7, inA: false, inB: false };
      X.push(x); R2[a].cross.push({ X: x, s: best.sa, other: R2[b] }); R2[b].cross.push({ X: x, s: best.sb, other: R2[a] });
    }
    // inside a crossing: no sidewalk, no lane dashes, no lamps
    const z0 = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const r of R2) {
      if (!r.cross.length) continue;
      const near = (x, z, pad) => r.cross.some(c => Math.hypot(c.X.x - x, c.X.z - z) < c.other.w / 2 + pad);
      r.dashT.forEach((t, i) => { const p = r.curve.getPoint(t); if (near(p.x, p.z, 0.1)) r.dm.setMatrixAt(i, z0); }); r.dm.instanceMatrix.needsUpdate = true;
      r.lampXZ.forEach((p, i) => { if (near(p[0], p[1], 0.3)) { r.lp.setMatrixAt(i, z0); r.lh.setMatrixAt(i, z0); r.pools.setMatrixAt(i, z0); } });
      [r.lp, r.lh, r.pools].forEach(m => { m.instanceMatrix.needsUpdate = true; });
      r.walks.forEach(wm => {
        const ix = wm.geometry.index.array;
        for (let i = 0; i < r.n; i++) { const t = (i + 0.5) / r.n, p = r.curve.getPoint(t); if (near(p.x, p.z, 0.2)) for (let k = 0; k < 6; k++) ix[i * 6 + k] = i * 2; }
        wm.geometry.index.needsUpdate = true;
      });
    }
    // each traffic light follows the nearest crossing
    (this.tLights || []).forEach(tl => { let bd = 9; X.forEach(x => { const d = Math.hypot(x.x - tl.x, x.z - tl.z); if (d < bd) { bd = d; tl.X = x; } }); if (bd > 1.2) tl.X = null; });
    // zebra stripes (shown only when both roads exist)
    const zg = new THREE.PlaneGeometry(0.045, 0.16).rotateX(-Math.PI / 2);
    this.zebra = new THREE.InstancedMesh(zg, new THREE.MeshBasicMaterial({ color: 0xF4F1EA, polygonOffset: true, polygonOffsetFactor: -5 }), X.length * 2 * 2 * 6);
    this.zebra.count = 0; this.root.add(this.zebra);
  }
  greenFor(x, t) { const ph = (t + x.off) % 13; return ph < 5.5 ? x.a : ph >= 6.5 && ph < 12 ? x.b : null; }
  zebras() {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); let k = 0;
    for (const x of this.cross) {
      if (!x.a.live || !x.b.live) continue;
      for (const [r, s0, o] of [[x.a, x.sa, x.b], [x.b, x.sb, x.a]]) for (const sd of [-1, 1]) {
        const s = s0 + sd * (o.w / 2 + 0.34) / r.L; if (s < 0.01 || s > 0.99) continue;
        const p = r.curve.getPointAt(s), tg = r.curve.getTangentAt(s), nx = -tg.z, nz = tg.x; q.setFromAxisAngle(Y, -Math.atan2(tg.z, tg.x) + Math.PI / 2);
        for (let i = 0; i < 6; i++) { const lo = -r.w / 2 + 0.05 + i * (r.w - 0.1) / 5; m4.compose(V3(p.x + nx * lo, 0.087, p.z + nz * lo), q, V3(1, 1, 1)); this.zebra.setMatrixAt(k++, m4); }
      }
    }
    this.zebra.count = k; this.zebra.instanceMatrix.needsUpdate = true;
  }
  // people on the sidewalks: they walk between crossings and turn around before reaching one
  peds() {
    const N = 32, c = new THREE.Color();
    const body = new RoundedBoxGeometry(0.1, 0.15, 0.08, 2, 0.03).translate(0, 0.17, 0), head = new RoundedBoxGeometry(0.085, 0.08, 0.08, 2, 0.028).translate(0, 0.29, 0), visor = new THREE.BoxGeometry(0.068, 0.03, 0.01).translate(0, 0.295, 0.042), legs = new THREE.BoxGeometry(0.07, 0.1, 0.04).translate(0, 0.05, 0);
    this.pedB = new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }), N);
    this.pedH = new THREE.InstancedMesh(head, new THREE.MeshStandardMaterial({ color: 0xF4F1EA, roughness: 0.4, emissive: 0xF4F1EA, emissiveIntensity: 0.15 }), N);
    this.pedV = new THREE.InstancedMesh(visor, new THREE.MeshBasicMaterial({ color: 0x6FD3E6 }), N);
    this.pedL = new THREE.InstancedMesh(legs, mat(0x2E3550), N);
    const cols = [0x4F98A3, 0xE8674A, 0x3D6FB0, 0x9C5B8A, 0x5FBF8A, 0xF08A3C, 0x8A6A4F, 0xF2B544];
    for (let i = 0; i < N; i++) this.pedB.setColorAt(i, c.set(cols[i % cols.length]));
    this.pedB.castShadow = true;
    this.pedS = []; [this.pedB, this.pedH, this.pedV, this.pedL].forEach(m => { m.count = 0; this.root.add(m); });
  }
  assignPeds() {
    const live = this.roads.filter(r => r.live), segs = [];
    for (const r of live) {
      const cut = r.cross.filter(c => c.other.live).map(c => [c.s - (c.other.w / 2 + 0.45) / r.L, c.s + (c.other.w / 2 + 0.45) / r.L]).sort((a, b) => a[0] - b[0]);
      let s0 = 0.03; for (const [a, b] of cut) { if (a - s0 > 1.2 / r.L) segs.push([r, s0, a]); s0 = Math.max(s0, b); } if (0.97 - s0 > 1.2 / r.L) segs.push([r, s0, 0.97]);
    }
    const tot = segs.reduce((a, g) => a + (g[2] - g[1]) * g[0].L, 0), N = Math.min(this.pedB.instanceMatrix.count, Math.round(tot / 2.6));
    this.pedS = [];
    for (let i = 0; i < N; i++) {
      let u = rnd() * tot, g = segs[0]; for (const x of segs) { const l = (x[2] - x[1]) * x[0].L; if (u < l) { g = x; break; } u -= l; }
      this.pedS.push({ r: g[0], s0: g[1], s1: g[2], s: g[1] + rnd() * (g[2] - g[1]), dir: rnd() < 0.5 ? 1 : -1, side: rnd() < 0.5 ? 1 : -1, v: 0.16 + rnd() * 0.12, ph: rnd() * 6 });
    }
    [this.pedB, this.pedH, this.pedV, this.pedL].forEach(m => { m.count = N; });
  }
  cars() {
    const N = 34;
    const body = new RoundedBoxGeometry(0.2, 0.12, 0.38, 2, 0.04).translate(0, 0.16, 0), cab = new RoundedBoxGeometry(0.17, 0.09, 0.2, 2, 0.035).translate(0, 0.26, -0.02);
    this.carBody = new THREE.InstancedMesh(body, mat(0xffffff, { roughness: 0.4 }), N); this.carCab = new THREE.InstancedMesh(cab, mat(0x3E4C62, { roughness: 0.25 }), N);
    this.carLights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), glowMat(0xFFF1D0, 0, 3), N * 2);
    this.carBody.castShadow = this.carCab.castShadow = true;
    const cols = [P.terracotta, P.cream, P.river, P.gold, P.slate, P.white], c = new THREE.Color();
    this.carS = [];
    for (let i = 0; i < N; i++) { this.carBody.setColorAt(i, c.set(cols[i % cols.length])); this.carS.push({ road: null, s: rnd(), v: 0.6 + rnd() * 0.5, dir: rnd() < 0.5 ? 1 : -1 }); }
    this.carBody.count = this.carCab.count = 0; this.carLights.count = 0;
    this.root.add(this.carBody, this.carCab, this.carLights);
  }
  traffic(on) { [this.carBody, this.carCab, this.carLights, this.pedB, this.pedH, this.pedV, this.pedL].forEach(m => { m.visible = on; }); }
  assignCars() {
    const live = this.roads.filter(r => r.live);
    const N = live.length ? Math.min(this.carS.length, Math.round(live.reduce((a, r) => a + r.L, 0) / 2.2)) : 0;
    this.carS.forEach((c, i) => { c.road = i < N ? live[i % live.length] : null; });
    this.carBody.count = this.carCab.count = N; this.carLights.count = N * 2;
    // spread cars evenly per road and direction, never inside a crossing
    live.forEach(r => [1, -1].forEach(dir => {
      const cs = this.carS.filter(c => c.road === r).filter((c, k) => (k % 2 ? -1 : 1) === dir);
      cs.forEach((c, k) => {
        c.dir = dir; let s = (k + 0.5) / cs.length + (dir > 0 ? 0 : 0.5 / cs.length);
        for (let g = 0; g < 20 && r.cross.some(cr => Math.abs(cr.s - (s % 1)) * r.L < cr.other.w / 2 + 0.5); g++) s += 0.6 / r.L;
        c.s = s % 1;
      });
    }));
    this.carS.forEach(c => { c.cv = c.v; });
    this.zebras(); this.assignPeds();
  }
  // ---------- beacon over the next district ----------
  beaconBuild() {
    const g = this.beacon = new THREE.Group(); this.root.add(g);
    const rm = this.ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.gold).multiplyScalar(1.15), transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
    this.ring1 = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.12, 72).rotateX(-Math.PI / 2), rm); this.ring1.position.y = 0.1; g.add(this.ring1);
    this.ring2 = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.06, 72).rotateX(-Math.PI / 2), rm.clone()); this.ring2.position.y = 0.1; g.add(this.ring2);
    this.pin = new THREE.Group(); g.add(this.pin);
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.22, 1, 24, 1, true).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(P.gold).multiplyScalar(1.2), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    g.add(this.beam);
    const pm = glowMat(P.gold, 0.45, 1.8, { roughness: 0.35 });
    const head = mesh(new THREE.SphereGeometry(0.24, 32, 16), pm); const tip = mesh(new THREE.ConeGeometry(0.19, 0.4, 32).rotateX(Math.PI), pm); tip.position.y = -0.28;
    const dot = mesh(new THREE.SphereGeometry(0.09, 16, 10), mat(0xFFFFFF, { roughness: 0.3 }), false); dot.position.z = 0.19; dot.scale.z = 0.4;
    this.pin.add(head, tip, dot);
    g.visible = false;
  }
  setBeacon(i) {
    const d = this.districts[i]; if (!d) { this.beacon.visible = false; return; }
    this.beacon.visible = true; this.beaconY = d.i === 9 ? 5.6 : d.i === 3 ? 3.4 : d.i === 8 ? 2.8 : 2.0; this.beam.scale.y = this.beaconY - 0.3;
    this.beacon.position.set(d.center[0], 0, d.center[1]);
    this.districts.forEach(x => { if (x.plotMat) { x.plotMat.color.set(x.i === i ? 0xE8A93A : 0xA9B6C6); x.plotMat.userData.o = x.i === i ? 0.95 : 0.22; x.plotMat.opacity = x.plotMat.userData.o * (x.i === i ? 1 : 1 - 0.6 * U.uNight.value); } });
  }
  // ---------- build state ----------
  setBuilt(n, animate = -1) {
    const now = U.uTime.value;
    this.districts.forEach(d => {
      const on = d.i < n;
      if (d.plot) d.plot.visible = !on;
      if (d.i === 0 && this.yard) { this.yard.visible = on; if (on) this.yardLampsOn(false); else this.yardLamps.forEach(l => l.scale.setScalar(0.001)); }
      if (!on) { this.unbake(d); d.items.forEach(o => { o.visible = false; }); d.roads.forEach(r => { r.live = false; }); d.built = false; for (let k = 0; k < this.wins.length; k++) if (this.wins[k].d === d.i) this.winBorn.array[k] = 1e6; this.winBorn.needsUpdate = true; return; }
      if (d.built) return;
      d.built = true;
      const anim = d.i === animate && !REDUCED;
      d.items.forEach(o => {
        if (o.userData.baked) return;
        const was = o.visible; o.visible = true;
        if (o.userData.station) { this.stationAll(true); if (was) return; }
        if (o.userData.road) {
          const r = o.userData.road;
          if (!was) { if (anim) this.anims.push({ kind: 'road', r, t0: now + o.userData.delay, dur: 1.3 }); else this.roadK(r, 1); }
          r.live = true;
        } else if (was) return;
        else if (anim) { o.scale.setScalar(0.001); this.anims.push({ kind: 'grow', o, t0: now + o.userData.delay + 0.2 }); }
        else o.scale.setScalar(o.userData.baseScale || 1);
      });
      if (anim) setTimeout(() => this.bake(d), (d.items.reduce((a, o) => Math.max(a, o.userData.delay || 0), 0) + 2.4) * 1000); else this.bake(d);
      for (let k = 0; k < this.wins.length; k++) if (this.wins[k].d === d.i) this.winBorn.array[k] = anim ? now + this.wins[k].born : -10;
      this.winBorn.needsUpdate = true;
    });
    this.assignCars();
  }
  // show part of a district while its mission is in progress
  preview(i, frac) {
    const d = this.districts[i]; if (!d || d.built) return;
    const now = U.uTime.value, k = Math.ceil(d.items.length * frac);
    let n = 0;
    d.items.slice(0, k).forEach(o => {
      if (o.visible) return; o.visible = true;
      if (o.userData.road) { if (REDUCED) this.roadK(o.userData.road, 1); else { this.roadK(o.userData.road, 0); this.anims.push({ kind: 'road', r: o.userData.road, t0: now + n * 0.15, dur: 1.2 }); } }
      else if (REDUCED) o.scale.setScalar(o.userData.baseScale || 1);
      else { o.scale.setScalar(0.001); this.anims.push({ kind: 'grow', o, t0: now + n * 0.15 }); }
      n++;
    });
    if (d.plot) d.plot.visible = true;
    this.wave(d.center[0], d.center[1], 0x4F98A3);
  }
  unpreview(i) {
    const d = this.districts[i]; if (!d || d.built) return;
    this.anims = this.anims.filter(a => !d.items.includes(a.o) && !(a.r && a.r.district === i));
    d.items.forEach(o => { o.visible = false; });
  }
  // merge a finished district's static meshes: one draw call per material
  bake(d) {
    if (d.baked || !d.built) return;
    d.bakeGroup = this.bakeObjects(d.items.filter(o => !o.userData.station && !o.userData.road && !o.userData.nobake && o.visible));
    d.items.forEach(o => { if (!o.userData.station && !o.userData.road && !o.userData.nobake && o.visible) { o.visible = false; o.userData.baked = true; } });
    d.baked = true;
  }
  bakeObjects(objs) {
    const by = new Map(), vc = [], glowSet = new Set(glow.map(g => g[0]));
    objs.forEach(o => {
      o.updateMatrixWorld(true);
      o.traverse(m => {
        if (!m.isMesh || m.isInstancedMesh || m.material.map || !m.visible) return;
        const src = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', src.attributes.position.clone()); g.setAttribute('normal', src.attributes.normal.clone());
        g.applyMatrix4(m.matrixWorld);
        const mt = m.material;
        if (glowSet.has(mt) || mt.transparent || mt.metalness > 0.1 || mt.side === THREE.DoubleSide) { if (!by.has(mt)) by.set(mt, []); by.get(mt).push(g); }
        else { const n = g.attributes.position.count, c = new Float32Array(n * 3), col = mt.color; for (let k = 0; k < n; k++) c.set([col.r, col.g, col.b], k * 3); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); vc.push(g); }
      });
    });
    const grp = new THREE.Group();
    if (vc.length) { grp.add(mesh(mergeGeometries(vc), this.vcMat || (this.vcMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 })))); vc.forEach(g => g.dispose()); }
    by.forEach((gs, m) => { grp.add(mesh(mergeGeometries(gs), m)); gs.forEach(g => g.dispose()); });
    this.root.add(grp); return grp;
  }
  unbake(d) { if (!d.baked) return; this.root.remove(d.bakeGroup); d.bakeGroup.traverse(m => m.geometry && m.geometry.dispose()); d.items.forEach(o => { o.userData.baked = false; }); d.baked = false; }
  roadK(r, k) {
    r.mesh.geometry.setDrawRange(0, Math.floor(r.n * k) * 6); r.walks.forEach(x => x.geometry.setDrawRange(0, Math.floor(r.n * k) * 6));
    r.parts.forEach(([m, c]) => { m.count = Math.floor(c * k); });
  }
  stationAll(on) { const p = this.station.parts; for (const k in p) p[k].scale.setScalar(on ? 1 : 0.001); this.ledMats.forEach(m => m.emissiveIntensity = on ? 1.4 : 0); }
  stationShow(name) {
    const p = this.station.parts[name]; if (!p) return;
    if (REDUCED) { p.scale.setScalar(1); return; }
    p.scale.setScalar(0.001); this.anims.push({ kind: 'grow', o: p, t0: U.uTime.value, uniform: true });
  }
  stationReset() { this.stationAll(false); this.station.parts.base.scale.setScalar(1); }
  led(k) { if (this.ledMats[k]) this.ledMats[k].emissiveIntensity = 1.4; }
  wave(x, z, color = P.gold) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.94, 1.0, 96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false }));
    m.position.set(x, 0.12, z); this.root.add(m); this.waves.push({ m, t: 0 });
  }
  shake(o) { this.anims.push({ kind: 'shake', o, t0: U.uTime.value, x: o.position.x }); }

  look(n) {
    glow.forEach(([m, d, nn]) => m.emissiveIntensity = d + (nn - d) * n);
    this.lightPools.forEach(m => m.opacity = n);
    this.districts.forEach(x => { if (x.plotMat && x.plotMat.userData.o) x.plotMat.opacity = x.plotMat.userData.o * (x.plotMat.userData.o > 0.5 ? 1 : 1 - 0.6 * n); });
    this.riverMat.color.set(P.river).lerp(new THREE.Color(0x2D5A7A), n);
  }
  update(dt, t) {
    // growth animations
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i], x = t - a.t0;
      if (x < 0) continue;
      if (a.kind === 'grow') {
        const s = Math.max(0.001, spring(x * 1.1));
        const b = a.o.userData.baseScale || 1;
        if (a.uniform) a.o.scale.setScalar(s * b); else a.o.scale.set((0.75 + 0.25 * s) * b, s * b, (0.75 + 0.25 * s) * b);
        if (x > 1.6) { a.o.scale.setScalar(b); this.anims.splice(i, 1); }
      } else if (a.kind === 'road') {
        const k = Math.min(1, x / a.dur); this.roadK(a.r, 1 - Math.pow(1 - k, 3)); if (k >= 1) this.anims.splice(i, 1);
      } else if (a.kind === 'shake') {
        a.o.position.x = a.x + Math.sin(x * 40) * 0.04 * Math.max(0, 1 - x * 3); if (x > 0.4) { a.o.position.x = a.x; this.anims.splice(i, 1); }
      }
    }
    // station life
    if (this.anemo) this.anemo.rotation.y += dt * 5;
    if (this.needle) this.needle.rotation.z = -0.9 + 0.35 * Math.sin(t * 0.7) - 0.6;
    if (this.sock) this.sock.rotation.y = Math.sin(t * 1.3) * 0.25;
    if (this.sirenMat) this.sirenMat.emissiveIntensity = 0.3 + (Math.sin(t * 5) > 0.6 ? 1.8 : 0) * (0.3 + U.uNight.value);
    // river floes
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    this.floeT.forEach((f, i) => { f[0] += dt * 0.25 * f[2]; if (f[0] > R) f[0] = -R; const x = f[0], z = riverZ(x) + f[1]; const vis = Math.hypot(x, z) < R0 - 0.3 ? f[2] : 0.0001; q.setFromAxisAngle(Y, x * 0.8); m4.compose(V3(x, 0.06, z), q, V3(vis, 1, vis)); this.floes.setMatrixAt(i, m4); });
    this.floes.instanceMatrix.needsUpdate = true;
    // cars: keep distance, take turns at crossings
    const n = this.carBody.count, act = [];
    for (let i = 0; i < n; i++) if (this.carS[i].road) act.push(this.carS[i]);
    for (const x of this.cross) { x.wasA = x.inA; x.wasB = x.inB; x.inA = x.inB = false; }
    for (const c of act) { const r = c.road; for (const cr of r.cross) { if (!cr.other.live) continue; const d = ((((cr.s - c.s) * c.dir) % 1) + 1) % 1 * r.L, zone = cr.other.w / 2 + 0.22; if (d < zone || r.L - d < zone) { if (cr.X.a === r) cr.X.inA = true; else cr.X.inB = true; } } }
    for (const c of act) {
      const r = c.road; let lim = 1, ahead = 9;
      for (const o of act) { if (o === c || o.road !== r || o.dir !== c.dir) continue; const g = ((((o.s - c.s) * c.dir) % 1) + 1) % 1 * r.L; if (g > 0.001 && g < ahead) ahead = g; }
      if (ahead < 1) lim = Math.min(lim, Math.max(0, Math.min(1, (ahead - 0.5) / 0.35)));
      for (const cr of r.cross) {
        if (!cr.other.live) continue;
        const d = ((((cr.s - c.s) * c.dir) % 1) + 1) % 1 * r.L, stop = cr.other.w / 2 + 0.3;
        if (d > stop - 0.06 && d < stop + 0.9) {
          const X = cr.X, mine = X.a === r, otherIn = mine ? X.wasB : X.wasA, go = this.greenFor(X, t) === r && !otherIn;
          if (!go) lim = Math.min(lim, Math.max(0, Math.min(1, (d - stop) / 0.4)));
        }
      }
      c.cv += (c.v * lim - c.cv) * Math.min(1, dt * 5);
      c.s = (c.s + dt * c.cv * c.dir / r.L + 1) % 1;
    }
    for (let i = 0; i < n; i++) {
      const c = this.carS[i], r = c.road; if (!r) continue;
      const p = r.curve.getPointAt(c.s), tg = r.curve.getTangentAt(c.s), off = 0.14 * c.dir;
      const x = p.x - tg.z * off, z = p.z + tg.x * off, ang = Math.atan2(tg.x * c.dir, tg.z * c.dir);
      const edge = Math.min(1, Math.min(c.s, 1 - c.s) * r.L * 3);
      q.setFromAxisAngle(Y, ang); m4.compose(V3(x, 0, z), q, V3(edge, edge, edge));
      this.carBody.setMatrixAt(i, m4); this.carCab.setMatrixAt(i, m4);
      for (let k = 0; k < 2; k++) { const v = V3(k ? 0.06 : -0.06, 0.17, 0.2).applyAxisAngle(Y, ang); m4.makeTranslation(x + v.x, v.y, z + v.z); m4.scale(V3(edge, edge, edge)); this.carLights.setMatrixAt(i * 2 + k, m4); }
    }
    // traffic lights show the phase of their crossing
    (this.tLights || []).forEach(tl => { if (!tl.X) return; const g = this.greenFor(tl.X, t), ph = (t + tl.X.off) % 13, st = g === tl.X.a ? 2 : (ph >= 5.5 && ph < 6.5) ? 1 : 0; tl.lamps.forEach((l, k) => { l.material = k === st ? tl.on[k] : tl.off[k]; }); });
    // people on sidewalks
    const pn = this.pedS.length;
    for (let i = 0; i < pn; i++) {
      const pd = this.pedS[i], r = pd.r;
      pd.s += pd.dir * pd.v * dt / r.L; if (pd.s > pd.s1) { pd.s = pd.s1; pd.dir = -1; } else if (pd.s < pd.s0) { pd.s = pd.s0; pd.dir = 1; }
      const p = r.curve.getPointAt(pd.s), tg = r.curve.getTangentAt(pd.s), off = (r.w / 2 + 0.11) * pd.side;
      const x = p.x - tg.z * off, z = p.z + tg.x * off, ang = Math.atan2(tg.x * pd.dir, tg.z * pd.dir), bob = Math.abs(Math.sin(t * 9 + pd.ph)) * 0.012;
      q.setFromAxisAngle(Y, ang); m4.compose(V3(x, 0.088 + bob, z), q, V3(1.15, 1.15, 1.15));
      this.pedB.setMatrixAt(i, m4); this.pedH.setMatrixAt(i, m4); this.pedV.setMatrixAt(i, m4);
      m4.compose(V3(x, 0.088, z), q, V3(1.15, 1 - bob * 4, 1.15)); this.pedL.setMatrixAt(i, m4);
    }
    if (pn) [this.pedB, this.pedH, this.pedV, this.pedL].forEach(m => { m.instanceMatrix.needsUpdate = true; });
    this.carBody.instanceMatrix.needsUpdate = this.carCab.instanceMatrix.needsUpdate = this.carLights.instanceMatrix.needsUpdate = true;
    // beacon
    if (this.beacon.visible) {
      this.pin.position.y = this.beaconY + Math.sin(t * 2.2) * 0.12; this.pin.rotation.y = t * 0.8;
      const k = (t * 0.6) % 1; this.ring2.scale.setScalar(1 + k * 0.9); this.ring2.material.opacity = 0.6 * (1 - k);
      this.ring1.material.opacity = 0.75 + 0.2 * Math.sin(t * 3);
    }
    for (let i = this.waves.length - 1; i >= 0; i--) { const w = this.waves[i]; w.t += dt; w.m.scale.setScalar(1 + w.t * 5); w.m.material.opacity = 0.55 * Math.pow(Math.max(0, 1 - w.t / 1.4), 1.5); if (w.t > 1.4) { this.root.remove(w.m); this.waves.splice(i, 1); } }
  }
}
