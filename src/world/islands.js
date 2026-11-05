import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat, P, R, R0, K, riverZ, registerGlow } from './city.js';

// Six finished cities floating around the plate: the next levels. Pure scenery, a few shared draw calls.
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

let disc = null;
function topDisc() {
  if (!disc) {
    disc = new THREE.CircleGeometry(R0 + 0.02, 72).rotateX(-Math.PI / 2).translate(0, 0.03, 0); disc.deleteAttribute('uv');
    const c = new THREE.Color(P.snow), n = disc.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
    disc.setAttribute('color', new THREE.BufferAttribute(a, 3));
  }
  return disc.clone();
}
export function buildIslands(city) {
  const S = 0.52, D = R * 2.2, r = R * S, isl = [];
  const tops = [], sides = [], rivers = [], roads = [];
  const bld = [], lit = [], dark = [], trees = [], towers = [];
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = V3(0, 1, 0);
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2 + Math.PI / 6, cx = Math.cos(a) * D, cz = Math.sin(a) * D, cy = -2.2 - (k % 3) * 1.4, rot = rnd() * Math.PI * 2;
    const T = new THREE.Matrix4().compose(V3(cx, cy, cz), Q.setFromAxisAngle(Y, rot), V3(S, S, S));
    isl.push({ level: k + 2, x: cx, y: cy, z: cz });
    const tg = topDisc(); tg.applyMatrix4(T); tops.push(tg);
    const sg = city.sideGeo.clone(); sg.applyMatrix4(T); sides.push(sg);
    const rg = city.riverGeo.clone(); rg.applyMatrix4(T); rivers.push(rg);
    // local layout in main-plate units (before T): roads, blocks, trees
    const nearRiver = (x, z) => Math.abs(z - riverZ(x)) < 1.7;
    const rl = [[-1, -1.4 * K], [-1, -5.0 * K], [1, -2.6 * K], [1, 3.2 * K]];
    rl.forEach(([dir, c]) => { const half = Math.sqrt(Math.max(0, (R * 0.93) ** 2 - c * c)); const g = new THREE.BoxGeometry(dir < 0 ? half * 2 : 0.6, 0.04, dir < 0 ? 0.6 : half * 2); g.translate(dir < 0 ? 0 : c, 0.07, dir < 0 ? c : 0); g.applyMatrix4(T); roads.push(g); });
    const onRoad = (x, z) => rl.some(([dir, c]) => Math.abs((dir < 0 ? z : x) - c) < 0.85);
    for (let gx = -R; gx < R; gx += 1.25) for (let gz = -R; gz < R; gz += 1.25) {
      const x = gx + (rnd() - 0.5) * 0.3, z = gz + (rnd() - 0.5) * 0.3, d = Math.hypot(x, z);
      if (d > R * 0.86 || nearRiver(x, z) || onRoad(x, z)) continue;
      if (rnd() < 0.3) { trees.push([x, z, 0.8 + rnd() * 0.6, T]); continue; }
      const core = 1 - d / R, w = 0.55 + rnd() * 0.4, dd = 0.55 + rnd() * 0.4, h = 0.6 + rnd() * 1.2 + core * core * 4.5 * rnd();
      const col = [P.cream, P.sand, P.white, P.slate, P.terracotta, 0xC9D3DE][Math.floor(rnd() * 6)];
      bld.push([x, z, w, h, dd, col, T]);
      const fl = Math.floor((h - 0.25) / 0.38);
      for (let f = 0; f < fl; f++) for (const [ox, oz, ry] of [[0, dd / 2 + 0.01, 0], [0, -dd / 2 - 0.01, Math.PI], [w / 2 + 0.01, 0, Math.PI / 2], [-w / 2 - 0.01, 0, -Math.PI / 2]]) {
        const y = 0.42 + f * 0.38; (rnd() < 0.55 ? lit : dark).push([x + ox, y, z + oz, ry, T]);
      }
    }
    towers.push([(rnd() - 0.5) * 2, -2.6 * K + 1.2, T]);
  }
  const g = new THREE.Group(); city.root.add(g);
  const add = (geo, m) => { const o = new THREE.Mesh(geo, m); o.receiveShadow = true; g.add(o); return o; };
  add(mergeGeometries(tops), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93 }));
  add(mergeGeometries(sides), city.sideMat);
  add(mergeGeometries(rivers), city.riverMat);
  add(mergeGeometries(roads), mat(P.road, { roughness: 0.8 }));
  const inst = (geo, m, list, f) => { const im = new THREE.InstancedMesh(geo, m, list.length); list.forEach((it, i) => { f(it, M); im.setMatrixAt(i, M); }); im.castShadow = false; im.receiveShadow = true; g.add(im); return im; };
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const bm = inst(box, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 }), bld, ([x, z, w, h, dd, , T], m) => m.compose(V3(x, 0.05, z), new THREE.Quaternion(), V3(w, h, dd)).premultiply(T));
  const c = new THREE.Color(); bld.forEach((b, i) => bm.setColorAt(i, c.set(b[5])));
  const win = new THREE.PlaneGeometry(0.13, 0.15);
  const litM = registerGlow(new THREE.MeshStandardMaterial({ color: 0x6F8BA6, emissive: 0xFFC476, emissiveIntensity: 0.05, roughness: 0.3 }), 0.05, 2.0);
  const wf = ([x, y, z, ry, T], m) => m.compose(V3(x, y, z), new THREE.Quaternion().setFromAxisAngle(Y, ry), V3(1, 1, 1)).premultiply(T);
  inst(win, litM, lit, wf); inst(win, mat(0x5D7591, { roughness: 0.3 }), dark, wf);
  const pine = new THREE.ConeGeometry(0.32, 0.9, 6).translate(0, 0.6, 0), cap = new THREE.ConeGeometry(0.15, 0.25, 7).translate(0, 1.0, 0);
  const tf = ([x, z, s, T], m) => m.compose(V3(x, 0, z), new THREE.Quaternion(), V3(s, s, s)).premultiply(T);
  inst(pine, mat(P.pine, { roughness: 0.8 }), trees, tf); inst(cap, mat(P.snow), trees, tf);
  const tw = new THREE.CylinderGeometry(0.1, 0.3, 4.2, 10).translate(0, 2.1, 0), ball = new THREE.SphereGeometry(0.42, 18, 12).translate(0, 4.5, 0);
  const twf = ([x, z, T], m) => m.compose(V3(x, 0, z), new THREE.Quaternion(), V3(1, 1, 1)).premultiply(T);
  inst(tw, mat(P.white, { roughness: 0.4 }), towers, twf); inst(ball, registerGlow(new THREE.MeshStandardMaterial({ color: P.gold, emissive: P.gold, emissiveIntensity: 0.25, roughness: 0.3, metalness: 0.3 }), 0.25, 1.6), towers, twf);
  // tap targets
  city.islandHits = isl.map(it => { const h = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, 3, 24), new THREE.MeshBasicMaterial({ visible: false })); h.position.set(it.x, it.y - 0.6, it.z); h.userData.island = it.level; city.root.add(h); return h; });
  city.islands = isl;
}

// badge above each island: lock + "Level N"
export function islandLabels(city, text) {
  (city.islandLabelSprites || []).forEach(s => city.root.remove(s));
  city.islandLabelSprites = city.islands.map(it => {
    const label = text(it.level), c = document.createElement('canvas'), x = c.getContext('2d'), fs = 46;
    x.font = `600 ${fs}px Inter, sans-serif`; const tw = x.measureText(label).width, w = Math.ceil(tw + 130), h = 88;
    c.width = w; c.height = h; const rr = h / 2;
    x.fillStyle = 'rgba(27,35,64,0.88)'; x.beginPath(); x.moveTo(rr, 0); x.arcTo(w, 0, w, h, rr); x.arcTo(w, h, 0, h, rr); x.arcTo(0, h, 0, 0, rr); x.arcTo(0, 0, w, 0, rr); x.fill();
    x.strokeStyle = '#F2B544'; x.lineWidth = 6; x.lineCap = 'round';
    x.beginPath(); x.arc(52, 36, 12, Math.PI, 0); x.stroke(); x.fillStyle = '#F2B544'; x.beginPath(); x.roundRect ? x.roundRect(34, 38, 36, 28, 6) : x.rect(34, 38, 36, 28); x.fill();
    x.font = `600 ${fs}px Inter, sans-serif`; x.fillStyle = '#F6F3EC'; x.textBaseline = 'middle'; x.fillText(label, 92, h / 2 + 2);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); const k = 1.5 / h; sp.scale.set(w * k, h * k, 1);
    sp.position.set(it.x, it.y + 4.6, it.z); city.root.add(sp); return sp;
  });
}
