import * as THREE from 'three';
import { U } from './engine.js';
import { K } from './city.js';
import { robot, vehicle } from './storm.js';
import { sfx } from '../sfx.js';

// One short scene per district for the blizzard night. Coordinates are plate units (scaled by K inside).
const L = (en, ru, kk) => ({ en, ru, kk });
const COATS = [0x4F98A3, 0xE8674A, 0x3D6FB0, 0x9C5B8A, 0x5FBF8A, 0xF08A3C, 0x8A6A4F, 0x22305A];
const coat = i => COATS[i % COATS.length];

// Lettering printed on the Nur Alem glass: a curved patch of the sphere turned toward the camera.
async function sphereText(S, cx, cz, cy, r) {
  try { await Promise.all([document.fonts.load('italic 700 150px Lora'), document.fonts.load('600 46px Inter')]); } catch (e) { /* fall back to system fonts */ }
  const W = 1400, H = 640, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
  // a soft deep-navy halo so white letters stay readable on bright blue glass
  const ink = (txt, font, y, fill, stroke, sw, blur) => { c.font = font; c.save(); c.shadowColor = 'rgba(9,24,56,0.85)'; c.shadowBlur = blur; c.lineWidth = sw; c.strokeStyle = stroke; c.strokeText(txt, W / 2, y); c.restore(); c.fillStyle = fill; c.fillText(txt, W / 2, y); };
  ink('Dilnura Ali', 'italic 700 236px Lora, Georgia, serif', 318, '#FFFFFF', 'rgba(14,36,78,0.92)', 20, 30);
  // gold rule with a small diamond, like a signature flourish
  c.save(); c.shadowColor = 'rgba(9,24,56,0.8)'; c.shadowBlur = 10; c.strokeStyle = '#F5B942'; c.lineWidth = 6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(W / 2 - 420, 392); c.lineTo(W / 2 - 38, 392); c.moveTo(W / 2 + 38, 392); c.lineTo(W / 2 + 420, 392); c.stroke();
  c.fillStyle = '#F5B942'; c.beginPath(); c.moveTo(W / 2, 370); c.lineTo(W / 2 + 22, 392); c.lineTo(W / 2, 414); c.lineTo(W / 2 - 22, 392); c.closePath(); c.fill(); c.restore();
  c.letterSpacing = '16px';
  ink('IS TEACHING HERE', '700 84px Inter, Arial, sans-serif', 520, '#FFE7B0', 'rgba(14,36,78,0.92)', 12, 20);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const pl = 1.9, tl = 0.87, tc = Math.PI / 2 - 0.1;
  const geo = new THREE.SphereGeometry(r, 72, 36, Math.PI / 2 - pl / 2, pl, tc - tl / 2, tl);
  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.FrontSide });
  const patch = new THREE.Mesh(geo, m); patch.renderOrder = 3;
  const g = new THREE.Group(); g.add(patch); S.add(g, cx, cz, cy);
  const cam = S.e.camera.position; g.rotation.y = Math.atan2(cam.x - cx * K, cam.z - cz * K);
  return m;
}

export const VIEWS = [
  { x: -6.3, z: -2.4, zoom: 0.33, az: -0.9, pol: 0.98 },
  { x: 1.2, z: -1.0, zoom: 0.36, az: -0.2, pol: 0.96 },
  { x: -3.4, z: -4.9, zoom: 0.33, az: -0.35, pol: 0.98 },
  { x: -5.8, z: 5.2, zoom: 0.40, az: -2.2, pol: 0.96 },
  { x: 4.6, z: -1.6, zoom: 0.35, az: 0.5, pol: 0.98 },
  { x: 6.6, z: -1.8, zoom: 0.36, az: 0.6, pol: 0.97 },
  { x: -1.2, z: 6.6, zoom: 0.37, az: 3.0, pol: 0.96 },
  { x: 4.9, z: 3.0, zoom: 0.37, az: 1.6, pol: 0.97 },
  { x: 2.4, z: 5.8, zoom: 0.40, az: 2.7, pol: 0.95 },
  { x: 0, z: -2.5, zoom: 0.45, az: -0.15, pol: 0.9 },
];

export const SCENES = [
  // 0 · weather station: warning, people hurry home
  async (S, st, tr) => {
    st.label(tr(L('Storm warning: stay indoors', 'Штормовое предупреждение: оставайтесь дома', 'Дауыл ескертуі: үйде қалыңыз')), -5.6, 2.3, -3.4, { size: 0.3, bg: 'rgba(232,103,74,0.95)', fg: '#fff' });
    S.glow(-5.6, -3.4, 1.6, 0xFF5A40, 1.2, 4.6, 1.2); sfx.play('alarm');
    const go = [[[-6.2, -1.5], [-7.32, -1.5], [-7.32, -1.47]], [[-6.7, -2.7], [-7.44, -3.37]], [[-5.0, -1.5], [-3.84, -1.52], [-3.84, -2.22]], [[-6.0, -1.5], [-7.1, -1.5], [-7.2, -1.48]]];
    const used = [], homes = go.map(p => { const e = p[p.length - 1], h = S.house(S.city, e[0], e[1], { not: used }); used.push(h.userData.e); return h; });
    await Promise.all(go.map(async (p, i) => { const r = S.add(robot(coat(i)), p[0][0], p[0][1]); S.bob(r); await S.wait(i * 0.35); if (p.length > 2) await S.path(r, p.slice(0, -1), 0.55); await S.enter(r, homes[i]); }));
    await S.wait(0.4);
  },
  // 1 · roads: ambulance takes the cheapest route to the hospital
  async (S, st, tr) => {
    const a = S.add(vehicle('amb'), -1.6, -1.2); a.rotation.y = Math.PI / 2; let on = true;
    S.blink(a.userData.beacons, 0.18, () => !on); sfx.play('siren', 3.4);
    st.label(tr(L('Route 9 min — the cheapest one', 'Маршрут 9 мин — самый дешёвый', 'Маршрут 9 мин — ең арзаны')), 1.0, 1.4, -1.6, { size: 0.28 });
    await S.path(a, [[-1.6, -1.2], [2.6, -1.22], [3.1, -0.95]], 1.25, { lane: 0.14 });
    const d = S.add(robot(0xF4F1EA, 1, 0xE8674A), 3.6, 0.25); await S.appear(d);
    await S.path(d, [[3.6, 0.25], [3.5, -0.75]], 0.5);
    st.label(tr(L('Medicine delivered', 'Лекарства доставлены', 'Дәрі жеткізілді')), 3.3, 1.7, -0.6, { size: 0.3, bg: 'rgba(95,191,138,0.95)', fg: '#fff' });
    await S.wait(1.0); on = false;
  },
  // 2 · buses on lines that never cross
  async (S, st, tr) => {
    const wait = [[-3.78, -4.38], [-3.55, -4.32], [-3.32, -4.4]].map((p, i) => { const r = S.add(robot(coat(i + 2)), p[0], p[1]); r.rotation.y = Math.PI; S.bob(r); return r; });
    const b1 = S.add(vehicle('bus'), -7.0, -4.9); b1.rotation.y = Math.PI / 2;
    const b2 = S.add(vehicle('bus'), 4.8, -7.0); b2.children[0].material = b2.children[0].material.clone(); b2.children[0].material.color.set(0x4F98A3);
    st.label(tr(L('Line 1', 'Линия 1', '1-желі')), -5.0, 1.3, -4.9, { size: 0.26, bg: 'rgba(242,181,68,0.95)' });
    st.label(tr(L('Line 2', 'Линия 2', '2-желі')), 4.8, 1.3, -3.6, { size: 0.26, bg: 'rgba(79,152,163,0.95)', fg: '#fff' });
    S.path(b2, [[4.8, -7.0], [4.8, -1.9]], 0.9, { lane: 0.14 });
    const e1 = sfx.engine(); await S.path(b1, [[-7.0, -4.9], [-3.6, -4.9]], 1.0, { lane: 0.14 }); sfx.play('door');
    await Promise.all(wait.map(async (r, i) => { await S.wait(i * 0.2); await S.board(r, b1); }));
    sfx.play('door'); await S.path(b1, [[-3.6, -4.9], [1.2, -4.9]], 1.1, { lane: 0.14 }); e1.stop();
  },
  // 3 · culture palace fills up and stays warm
  async (S, st, tr) => {
    st.label(tr(L('Inside: +24 °C, tea and toguz kumalak', 'Внутри +24 °C, чай и тоғыз құмалақ', 'Ішінде +24 °C, шай және тоғыз құмалақ')), -5.8, 3.3, 5.2, { size: 0.3 });
    S.glow(-5.8, 5.2, 0.9, 0xFFB566, 3.2, 5.2, 0.4);
    const cx = -5.8, cz = 5.2, a0 = S.facing(cx, cz);
    const rim = a => { const wx = Math.sin(a), wz = Math.cos(a), lx = wx * Math.cos(0.5) - wz * Math.sin(0.5), lz = wx * Math.sin(0.5) + wz * Math.cos(0.5); return 1 / Math.hypot(lx / 1.15, lz / 0.92) / K; };
    const doors = [-0.56, 0.56].map(da => { const a = a0 + da, r = rim(a) + 0.02; return S.door(cx + Math.sin(a) * r, cz + Math.cos(a) * r, a, { y: 0.1, wall: 0xF3EEE4, w: 0.46, h: 0.78, depth: 0.7 }); });
    await Promise.all([0, 1, 2, 3, 4, 5].map(async i => { const a = a0 - 1.0 + i * 0.4, r = S.add(robot(coat(i)), cx + Math.sin(a) * 2.3, cz + Math.cos(a) * 2.3); S.bob(r); await S.wait(i * 0.3); await S.enter(r, doors[i < 3 ? 0 : 1], 0.6); }));
    await S.wait(0.8);
  },
  // 4 · traffic lights: a green wave clears the crossroad
  async (S, st, tr) => {
    st.label(tr(L('Green wave: the jam is gone', 'Зелёная волна: пробки нет', 'Жасыл толқын: кептеліс жоқ')), 4.8, 1.5, -1.3, { size: 0.3, bg: 'rgba(95,191,138,0.95)', fg: '#fff' });
    const cars = [0, 1, 2, 3].map(i => { const c = S.add(vehicle('car'), 0.6 - i * 0.9, -1.22); c.children[0].material = c.children[0].material.clone(); c.children[0].material.color.set(coat(i + 1)); return c; });
    const cross = [0, 1].map(i => S.add(vehicle('car'), 4.8, -4.6 - i * 0.9));
    await Promise.all([
      ...cars.map(async (c, i) => { await S.wait(i * 0.25); await S.path(c, [[0.6 - i * 0.9, -1.22], [8.0, -1.4]], 1.6, { lane: 0.14 }); c.visible = false; }),
      ...cross.map(async (c, i) => { await S.wait(2.6 + i * 0.3); await S.path(c, [[4.8, -4.6 - i * 0.9], [4.82, 1.2]], 1.6, { lane: 0.14 }); }),
    ]);
  },
  // 5 · school closes in time, kids go home
  async (S, st, tr) => {
    st.label(tr(L('School closed · lessons online', 'Школа закрыта · уроки онлайн', 'Мектеп жабық · сабақ онлайн')), 6.4, 3.5, -2.8, { size: 0.32, bg: 'rgba(242,181,68,0.96)' });
    S.glow(6.2, 0.4, 1.72, 0xFF5A40, 0.9, 4.8, 1.4); sfx.play('alarm');
    const school = S.door(6.6, -2.05, 0, { s: 0.75, wall: 0xF2E3C6 }); school.userData.to = 1;
    const h0 = S.house(S.city, 5.2, -1.6, { not: [] }), homes = [h0, S.house(S.city, 8.0, -1.7, { not: [h0.userData.e] })];
    await Promise.all([0, 1, 2, 3, 4].map(async i => {
      await S.wait(i * 0.35); const k = S.add(robot(coat(i + 3), 0.72, 0xF4F1EA), 6.6, -2.15); S.bob(k);
      const left = i % 2 === 0; await S.path(k, [[6.6, -2.15], [6.6, -1.64]], 0.6); await S.enter(k, homes[left ? 0 : 1], 0.6);
    }));
    school.userData.to = 0;
  },
  // 6 · the GPS knows where the bus is
  async (S, st, tr) => {
    S.glow(-1.25, 4.75, 1.55, 0xF2B544, 1.0, 5.5, 1.0);
    const lab = st.label(tr(L('Bus 12: arriving in 1 min', 'Автобус 12: через 1 мин', '12-автобус: 1 минуттан кейін')), -0.6, 1.6, 7.3, { size: 0.3 });
    const b = S.add(vehicle('bus'), -2.2, 3.7);
    const ppl = [0, 1, 2].map(i => { const r = S.add(robot(coat(i + 4)), -3.42, 7.73); r.visible = false; S.bob(r); return r; });
    const bus = S.path(b, [[-2.2, 3.7], [-2.2, 6.0], [-0.8, 7.25]], 0.85, { lane: 0.14 });
    await S.wait(1.3);
    await Promise.all(ppl.map(async (r, i) => { await S.wait(i * 0.3); r.visible = true; await S.appear(r, 0.2); await S.path(r, [[-3.42, 7.73], [-2.0, 7.55], [-0.98, 7.5]], 0.6); }));
    await bus; void lab; sfx.play('door');
    for (const r of ppl) await S.board(r, b);
    await S.path(b, [[-0.8, 7.25], [2.2, 8.1]], 1.1, { lane: 0.14 });
  },
  // 7 · the snowplough goes where the expected damage is highest
  async (S, st, tr) => {
    st.label(tr(L('Expected damage 40 > trip 15 → go', 'Ожидаемый ущерб 40 > выезд 15 → едем', 'Күтілетін зиян 40 > шығу 15 → шығамыз')), 4.9, 1.6, 2.4, { size: 0.28 });
    const drifts = [];
    const dm = new THREE.MeshStandardMaterial({ color: 0xF6F8FC, roughness: 0.9 });
    for (let z = 1.4; z < 6.4; z += 0.4) { const x = z < 4.14 ? 4.85 : 4.85 - (z - 4.14) * 0.2; const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), dm); m.scale.set(1.1, 0.32, 0.8); drifts.push(S.add(m, x + (Math.random() - 0.5) * 0.1, z, 0.06)); }
    const p = S.add(vehicle('plough'), 4.85, 0.6); let on = true; S.blink(p.userData.beacons, 0.3, () => !on); const eng = sfx.engine();
    await S.path(p, [[4.85, 0.6], [4.85, 4.14], [4.4, 6.4]], 0.75, { lane: 0.14, each: o => drifts.forEach(d => { if (d.visible && d.position.distanceTo(o.position) < 0.45) { d.visible = false; for (let k = 0; k < 3; k++) S.glow(d.position.x / K + (Math.random() - 0.3) * 0.6, d.position.z / K, 0.25 + Math.random() * 0.3, 0xFFFFFF, 0.35, 0.6, 2); } }) });
    on = false; eng.stop();
  },
  // 8 · the grid holds: power runs along the lines, every home with people lights up
  async (S, st, tr) => {
    const f0 = U.uForce.value;
    st.label(tr(L('Grid load 92% — holding', 'Нагрузка сети 92 % — держим', 'Желі жүктемесі 92 % — шыдап тұр')), 2.2, 2.9, 5.9, { size: 0.3 });
    const orbs = [0, 1, 2].map(() => { const o = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xFFE08A, toneMapped: false })); o.position.y = 0.9; return S.add(o, 0.9, 4.75, 0.9); });
    await Promise.all(orbs.map(async (o, i) => { await S.wait(i * 0.45); await S.path(o, [[0.9, 4.75], [3.55, 4.85], [3.6, 7.1]], 1.6); o.visible = false; }));
    const word = sphereText(S, 2.2, 5.9, 1.18, 0.965);
    sfx.play('power'); await S.run(dt => { U.uForce.value = Math.min(1, U.uForce.value + dt * 0.8); return U.uForce.value >= 1; });
    const wm = await word;
    const push = S.rig.flyTo({ target: [2.2 * K, 1.05, 5.9 * K], zoom: 0.2, az: S.rig.az, pol: 1.12 }, 1.8 / (S.speed || 1), true);
    await S.run(dt => { wm.opacity = Math.min(1, wm.opacity + dt * 0.9); return wm.opacity >= 1; }); await push;
    st.label(tr(L('Light on in every home with people', 'Свет горит там, где есть люди', 'Адам бар үйде жарық жанады')), 2.2, 2.3, 5.9, { size: 0.28, bg: 'rgba(95,191,138,0.95)', fg: '#fff' });
    await S.wait(2.6); S.__f0 = f0;
  },
  // 9 · Bayterek assistant answers honestly
  async (S, st, tr) => {
    [[-0.8, -1.7], [0.7, -1.6], [0.1, -1.75], [-0.3, -1.9]].forEach((p, i) => { const r = S.add(robot(coat(i)), p[0], p[1]); r.rotation.y = Math.atan2(-p[0], -2.7 - p[1]); });
    const qa = [
      [L('Where can I warm up?', 'Где пункт обогрева?', 'Жылынатын жер қайда?'), L('Culture Palace, 5 min on foot.', 'Дворец культуры, 5 минут пешком.', 'Мәдениет сарайы, жаяу 5 минут.')],
      [L('Is the road to Karaganda open?', 'Трасса на Караганду открыта?', 'Қарағанды трассасы ашық па?'), L('Closed until morning. I will tell you when it opens.', 'Закрыта до утра. Сообщу, когда откроют.', 'Таңға дейін жабық. Ашылғанда хабарлаймын.')],
      [L('Give me my neighbour’s address', 'Дай адрес соседа', 'Көршімнің мекенжайын бер'), L('Sorry, I don’t share personal data.', 'Извините, личные данные не передаю.', 'Кешіріңіз, жеке деректерді бермеймін.')],
    ];
    for (const [q, a] of qa) {
      const s1 = st.label(tr(q), 0, 5.6, -2.7, { size: 0.34 }); sfx.play('blip'); await S.wait(1.0);
      const s2 = st.label(tr(a), 0, 5.1, -2.7, { size: 0.34, bg: 'rgba(79,152,163,0.96)', fg: '#fff' }); sfx.play('blip'); await S.wait(1.5);
      st.g.remove(s1); st.g.remove(s2);
    }
  },
];
