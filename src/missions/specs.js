import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { M1, S, tr } from '../i18n.js';
import { U } from '../world/engine.js';
import { store } from '../store.js';
import { mat, K as KK } from '../world/city.js';
const L = (en, ru, kk) => ({ en, ru, kk });
const YES = L('Yes', 'Да', 'Иә'), NO = L('No', 'Нет', 'Жоқ');

// ---------- Week 1 — Teach Qadam to see (agents, PEAS) ----------
class Yard {
  constructor(m) {
    this.m = m; this.city = m.city; this.q = m.app.qadam;
    this.a = Math.PI * 1.08; this.wait = 0; this.passed = new Set(); this.crashes = 0; this.seeing = false;
    this.city.yard.visible = true; this.q.target = null; this.q.cone.visible = false;
  }
  update(dt) {
    const c = this.city, q = this.q;
    if (this.wait > 0) { this.wait -= dt; return; }
    this.a = (this.a + dt * 0.5) % (Math.PI * 2);
    let near = 0, best = 9;
    c.yardDrifts.forEach((da, k) => { let d = this.a - da; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < Math.abs(best)) { best = d; near = k; } });
    if (!this.seeing && Math.abs(best) < 0.16 && !this.passed.has(near)) { this.passed.add(near); q.bump(); this.crashes++; this.wait = 0.9; this.m.live(); c.shake(c.drifts[near]); }
    if (Math.abs(best) > 0.7) this.passed.delete(near);
    const off = this.seeing ? -0.55 * Math.exp(-Math.pow(best / 0.32, 2)) : 0;
    const [x, z] = c.yardPoint(this.a, off), [x2, z2] = c.yardPoint(this.a + 0.03, this.seeing ? -0.55 * Math.exp(-Math.pow((best + 0.03) / 0.32, 2)) : 0);
    q.g.position.set(x, 0, z); q.g.rotation.y = Math.atan2(x2 - x, z2 - z);
  }
  stop() { this.q.goTo(-4.2, -2.1); }
}
const w1 = {
  start(m) {
    const st = m.city.station; st.group.visible = true; m.city.stationReset();
    m.app.rig.flyTo({ target: [-5.1 * KK, 0.5, -0.9 * KK], zoom: innerWidth < innerHeight ? 0.46 : 0.46, az: -0.25, pol: 0.9 }, 1.5);
  },
  sim: m => new Yard(m),
  onPick(m, o) {
    const c = m.city;
    if (o.id === 'camera') { m.sim.seeing = true; m.app.qadam.cone.visible = true; c.stationShow('mast'); c.stationShow('anemo'); c.stationShow('thermo'); c.stationShow('streets'); }
    if (o.id === 'lamps') { c.yardLampsOn(true); c.stationShow('siren'); c.stationShow('board'); c.stationShow('weather'); m.app.snow.blow(); }
    if (o.id === 'score') { c.stationShow('gauge'); c.stationShow('early'); c.stationShow('brain'); [0, 1, 2].forEach(i => c.led(i)); c.wave(-5.6 * KK, -3.4 * KK); }
  },
  onStep() {},
  close(m, built) { m.app.qadam.cone.visible = false; if (built) m.city.stationAll(true); else { m.city.station.group.visible = false; m.city.yard.visible = false; } },
  steps: [
    { kind: 'pick', t: L('Qadam keeps bumping into snowdrifts', 'Qadam врезается в сугробы', 'Qadam қар үйінділеріне соғылып жатыр'),
      i: L('He can’t see anything. Give him a sensor.', 'Он ничего не видит. Дай ему датчик.', 'Ол ештеңе көрмейді. Оған сенсор бер.'),
      live: m => tr(m.sim && m.sim.seeing ? S.noCrash : S.crashes, { n: m.sim ? m.sim.crashes : 0 }),
      opts: [
        { id: 'wheels', icon: 'wheel', l: L('Wheels', 'Колёса', 'Дөңгелектер'), why: L('Wheels move the robot — that’s an actuator, not a sensor.', 'Колёса двигают робота — это исполнитель, а не датчик.', 'Дөңгелектер роботты қозғайды — бұл орындаушы, сенсор емес.') },
        { id: 'camera', icon: 'camera', ok: true, l: L('Camera', 'Камера', 'Камера') },
        { id: 'siren', icon: 'siren', l: L('Siren', 'Сирена', 'Сирена'), why: L('A siren acts on the world — that’s an actuator.', 'Сирена действует на мир — это исполнитель.', 'Сирена әлемге әсер етеді — бұл орындаушы.') },
      ],
      learn: L('That’s a sensor (S in PEAS): how an agent perceives its environment.', 'Это датчик (S в PEAS): через него агент воспринимает среду.', 'Бұл сенсор (PEAS-тағы S): агент ортаны сол арқылы қабылдайды.'),
      h: [L('Which of these brings information in?', 'Что из этого приносит информацию внутрь?', 'Мыналардың қайсысы ақпаратты ішке әкеледі?'), L('Wheels and a siren do things. One option only looks.', 'Колёса и сирена что-то делают. Только одно — смотрит.', 'Дөңгелек пен сирена бір нәрсе істейді. Тек біреуі ғана қарайды.')] },
    { kind: 'pick', t: L('A blizzard is coming — warn people', 'Буран близко — предупреди людей', 'Боран жақын — адамдарға ескерт'),
      i: L('Qadam sees the snow now. How will he signal?', 'Теперь Qadam видит снег. Чем он подаст сигнал?', 'Енді Qadam қарды көреді. Ол қалай белгі береді?'),
      opts: [
        { id: 'thermo', icon: 'thermo', l: L('Thermometer', 'Термометр', 'Термометр'), why: L('A thermometer only measures — that’s a sensor.', 'Термометр только измеряет — это датчик.', 'Термометр тек өлшейді — бұл сенсор.') },
        { id: 'acc', icon: 'gauge', l: L('Forecast accuracy', 'Точность прогноза', 'Болжам дәлдігі'), why: L('That’s a score, not an action.', 'Это оценка работы, а не действие.', 'Бұл әрекет емес, жұмыс бағасы.') },
        { id: 'lamps', icon: 'lamp', ok: true, l: L('Lamps and siren', 'Фонари и сирена', 'Шамдар мен сирена') },
      ],
      learn: L('Those are actuators (A): how an agent changes the world.', 'Это исполнители (A): через них агент меняет мир.', 'Бұлар орындаушылар (A): агент әлемді солар арқылы өзгертеді.'),
      h: [L('Signalling means changing something people can see or hear.', 'Подать сигнал — значит изменить что-то, что люди видят или слышат.', 'Белгі беру — адамдар көретін не еститін нәрсені өзгерту.'), L('Measuring and scoring don’t change the street.', 'Измерение и оценка улицу не меняют.', 'Өлшеу мен бағалау көшені өзгертпейді.')] },
    { kind: 'pick', t: L('How do we know Qadam did well?', 'Как понять, что Qadam справился?', 'Qadam жақсы істегенін қалай білеміз?'),
      i: L('Pick what we score the agent on.', 'Выбери, по чему оценивать агента.', 'Агентті неге қарап бағалайтынымызды таңда.'),
      opts: [
        { id: 'streets', icon: 'city', l: L('Streets of Astana', 'Улицы Астаны', 'Астана көшелері'), why: L('Streets are the environment (E) the agent works in.', 'Улицы — это среда (E), где работает агент.', 'Көшелер — агент жұмыс істейтін орта (E).') },
        { id: 'score', icon: 'target', ok: true, l: L('No crashes, everyone warned', 'Нет аварий, все предупреждены', 'Соғылыс жоқ, бәрі ескертілді') },
        { id: 'cam2', icon: 'camera', l: L('A brighter camera', 'Камера ярче', 'Жарқынырақ камера'), why: L('A camera is a sensor. We score results, not parts.', 'Камера — это датчик. Оценивают результат, а не детали.', 'Камера — сенсор. Бөлшекті емес, нәтижені бағалаймыз.') },
      ],
      learn: L('That’s the performance measure (P). With E, A and S it makes PEAS — the agent’s task.', 'Это мера качества (P). Вместе с E, A и S это PEAS — описание задачи агента.', 'Бұл өнімділік өлшемі (P). E, A, S-пен бірге бұл PEAS — агенттің міндеті.'),
      h: [L('We judge an agent by what happens in the world.', 'Агента оценивают по тому, что получилось в мире.', 'Агентті әлемде не болғанына қарап бағалайды.'), L('Streets are E, the camera is S. What is left?', 'Улицы — это E, камера — S. Что осталось?', 'Көшелер — E, камера — S. Не қалды?')] },
  ],
  done: L('Qadam can see the city now: sensors, actuators and a clear goal make an agent.', 'Теперь Qadam видит город: датчики, исполнители и ясная цель — это и есть агент.', 'Енді Qadam қаланы көреді: сенсорлар, орындаушылар және нақты мақсат — бұл агент.'),
};

// ---------- shared helpers ----------
const st = m => m.app.stage;
const lbl = (m, text, x, y, z, o) => st(m).label(text, x, y, z, o);
const TEAL = 0x4F98A3, GOLD = 0xF2B544, RED = 0xE8674A, INK = 0x1B2340, WHITE = 0xFFFFFF, GREY = 0xA9B6C6, GREEN = 0x5FBF8A;
const fly = (m, target, zoom, az, pol = 0.9) => m.app.rig.flyTo({ target: [target[0] * KK, target[1], target[2] * KK], zoom: zoom * (innerWidth < innerHeight ? 1.15 : 1.3), az, pol }, 1.4);

// ---------- Week 2 — Deliver the parcel to the hospital (BFS / DFS / UCS / A*) ----------
const G2 = {
  pos: { S: [-1.0, -6.0], C: [-2.4, -4.2], E: [0.7, -4.6], A: [-2.4, -1.7], B: [1.8, -2.3], G: [3.4, -1.25] },
  edges: [['S', 'C', 2], ['S', 'E', 5], ['C', 'A', 2], ['C', 'E', 2], ['E', 'B', 3], ['A', 'B', 4], ['A', 'G', 6], ['B', 'G', 2]],
  h: { S: 7, C: 6, E: 4, A: 5, B: 2, G: 0 },
};
function nbrs(n) { return G2.edges.filter(e => e[0] === n || e[1] === n).map(e => [e[0] === n ? e[1] : e[0], e[2]]).sort((a, b) => a[0] < b[0] ? -1 : 1); }
// returns { order: expanded nodes, path, cost }
export function search(mode) {
  if (mode === 'bfs' || mode === 'dfs') {
    const front = [['S', ['S']]], seen = new Set(['S']), order = [];
    while (front.length) {
      const [n, path] = mode === 'bfs' ? front.shift() : front.pop(); order.push(n);
      if (n === 'G') return { order, path, cost: cost(path) };
      const nb = nbrs(n).filter(([k]) => !seen.has(k)); (mode === 'dfs' ? nb.reverse() : nb).forEach(([k]) => { seen.add(k); front.push([k, [...path, k]]); });
    }
  }
  const front = [[mode === 'astar' ? G2.h.S : 0, 0, 'S', ['S']]], closed = new Set(), order = [];
  while (front.length) {
    front.sort((a, b) => a[0] - b[0] || (a[2] < b[2] ? -1 : 1));
    const [, g, n, path] = front.shift(); if (closed.has(n)) continue; closed.add(n); order.push(n);
    if (n === 'G') return { order, path, cost: g };
    nbrs(n).forEach(([k, c]) => { if (!closed.has(k)) front.push([g + c + (mode === 'astar' ? G2.h[k] : 0), g + c, k, [...path, k]]); });
  }
}
function cost(p) { let c = 0; for (let i = 0; i < p.length - 1; i++) c += G2.edges.find(e => (e[0] === p[i] && e[1] === p[i + 1]) || (e[1] === p[i] && e[0] === p[i + 1]))[2]; return c; }
const NAME = { S: L('Depot', 'Склад', 'Қойма'), G: L('Hospital', 'Больница', 'Аурухана') };
function drawGraph(m, withH) {
  const s = st(m); s.clear(); m.g2 = { disc: {} };
  G2.edges.forEach(([a, b, c]) => { const A = G2.pos[a], B = G2.pos[b]; s.line(A, B, INK, { opacity: 0.35, w: 0.07 }); lbl(m, String(c), (A[0] + B[0]) / 2, 0.35, (A[1] + B[1]) / 2, { size: 0.26 }); });
  for (const k in G2.pos) { const [x, z] = G2.pos[k]; m.g2.disc[k] = s.disc(x, z, 0.3, k === 'G' ? RED : k === 'S' ? GOLD : WHITE); lbl(m, NAME[k] ? tr(NAME[k]) : k + (withH ? ` · h ${G2.h[k]}` : ''), x, 0.75, z, { size: 0.3, bg: k === 'G' ? 'rgba(232,103,74,0.95)' : undefined, fg: k === 'G' ? '#fff' : undefined }); }
}
async function runSearch(m, mode) {
  const s = st(m); drawGraph(m, m.step === 1); const r = search(mode);
  for (const n of r.order) { s.pulse(m.g2.disc[n], n === 'G' ? RED : TEAL); await s.wait(0.32); }
  const pts = r.path.map(k => G2.pos[k]); s.tube(pts, GOLD, 0.06); await s.wait(0.5);
  const car = s.car(GOLD); st(m).place(car, pts[0][0], pts[0][1], 0); await s.move(car, pts, r.cost * 0.3);
  m.last = r; m.live(); return r;
}
const algName = { bfs: 'BFS', dfs: 'DFS', ucs: 'UCS', astar: 'A*' };
const res2 = m => m.last ? tr(L('{a}: {c} min · checked {n} crossings', '{a}: {c} мин · проверено перекрёстков: {n}', '{a}: {c} мин · тексерілген қиылыс: {n}')).replace('{a}', algName[m.lastMode]).replace('{c}', m.last.cost).replace('{n}', m.last.order.length) : tr(L('Tap an algorithm to watch it search.', 'Нажми на алгоритм — увидишь, как он ищет.', 'Алгоритмді бас — оның қалай іздейтінін көресің.'));
const play2 = mode => async m => { m.lastMode = mode; await runSearch(m, mode); };
const w2 = {
  start(m) { fly(m, [0.4, 0.6, -3.6], 0.6, -0.15, 0.82); m.app.qadam.goTo(-0.2, -6.6); },
  steps: [
    { kind: 'pick', t: L('Deliver the parcel to the hospital fastest', 'Доставь посылку в больницу быстрее всех', 'Сәлемдемені ауруханаға ең жылдам жеткіз'),
      i: L('Numbers are minutes. Pick how to search for the road.', 'Числа — минуты. Выбери, как искать дорогу.', 'Сандар — минуттар. Жолды қалай іздейтінін таңда.'),
      enter: m => drawGraph(m), live: res2,
      opts: [
        { id: 'bfs', icon: 'grid', l: L('BFS', 'BFS', 'BFS'), play: play2('bfs'), why: L('BFS found the route with fewest turns, but it takes 10 min.', 'BFS нашёл путь с меньшим числом поворотов, но он занимает 10 мин.', 'BFS бұрылысы аз жолды тапты, бірақ ол 10 минут алады.') },
        { id: 'dfs', icon: 'route', l: L('DFS', 'DFS', 'DFS'), play: play2('dfs'), why: L('DFS dived deep and took the first route it hit: 10 min.', 'DFS ушёл вглубь и взял первый попавшийся путь: 10 мин.', 'DFS тереңге кетіп, алғашқы кездескен жолды алды: 10 мин.') },
        { id: 'ucs', icon: 'target', ok: true, l: L('UCS', 'UCS', 'UCS'), play: play2('ucs') },
      ],
      learn: L('This is UCS: it always extends the cheapest route so far — 9 minutes.', 'Это UCS: он всегда продолжает самый дешёвый путь — 9 минут.', 'Бұл UCS: ол әрқашан ең арзан жолды жалғастырады — 9 минут.'),
      h: [L('“Fastest” means fewest minutes, not fewest turns.', '«Быстрее» — это меньше минут, а не поворотов.', '«Жылдам» — бұрылыс емес, минут аз деген сөз.'), L('Only one of these looks at the minutes on the roads.', 'Только один из них смотрит на минуты на дорогах.', 'Тек біреуі ғана жолдағы минуттарға қарайды.')] },
    { kind: 'pick', t: L('Just as fast, but check fewer crossings', 'Так же быстро, но проверь меньше перекрёстков', 'Дәл солай жылдам, бірақ қиылысты азырақ тексер'),
      i: L('h is a guess of minutes left to the hospital.', 'h — догадка, сколько минут осталось до больницы.', 'h — ауруханаға дейін қалған минуттың болжамы.'),
      enter: m => { m.last = null; drawGraph(m, true); }, live: res2,
      opts: [
        { id: 'ucs', icon: 'target', l: L('UCS', 'UCS', 'UCS'), play: play2('ucs'), why: m => L(`UCS is 9 min again, but checked ${m.last.order.length} crossings.`, `UCS снова 9 мин, но проверил ${m.last.order.length} перекрёстков.`, `UCS тағы 9 мин, бірақ ${m.last.order.length} қиылысты тексерді.`) },
        { id: 'astar', icon: 'pin', ok: true, l: L('A*', 'A*', 'A*'), play: play2('astar') },
        { id: 'bfs', icon: 'grid', l: L('BFS', 'BFS', 'BFS'), play: play2('bfs'), why: L('BFS ignores minutes — the route is slower again.', 'BFS не смотрит на минуты — путь снова медленнее.', 'BFS минутқа қарамайды — жол тағы баяу.') },
      ],
      learn: m => L(`This is A*: it adds the guess h and finds the 9-minute route after checking only ${m.last.order.length} crossings.`, `Это A*: он добавляет догадку h и находит путь за 9 минут, проверив всего ${m.last.order.length} перекрёстков.`, `Бұл A*: ол h болжамын қосып, тек ${m.last.order.length} қиылысты тексеріп, 9 минуттық жолды табады.`),
      h: [L('Which search uses the h numbers?', 'Какой поиск использует числа h?', 'Қай іздеу h сандарын пайдаланады?'), L('f = g + h: minutes so far plus the guess.', 'f = g + h: пройденные минуты плюс догадка.', 'f = g + h: өткен минуттар плюс болжам.')] },
  ],
  done: L('The roads are open and the parcel reached the hospital in 9 minutes.', 'Дороги открыты, посылка доехала до больницы за 9 минут.', 'Жолдар ашық, сәлемдеме ауруханаға 9 минутта жетті.'),
};

// ---------- Week 3 — Build the block and run the buses (local search, CSP) ----------
const PLOTS = [3, 5, 4, 6, 8, 7, 5, 9], PX = i => -6.0 + i * 1.55, PZ = -4.9;
function drawPlots(m) {
  const s = st(m); s.clear(); m.bars = PLOTS.map((v, i) => { const b = s.bar(PX(i), PZ, TEAL); s.setBar(b, v * 0.2); lbl(m, String(v), PX(i), v * 0.2 + 0.45, PZ, { size: 0.26 }); return b; });
}
async function walk(m, from, to, stopAt) {
  const s = st(m), q = m.app.qadam, path = []; for (let i = from; i <= to; i++) path.push([PX(i), PZ + 0.55]);
  q.target = null; st(m).place(q.g, path[0][0], path[0][1], 0);
  if (path.length > 1) await s.move(q.g, path, (to - from) * 0.55);
  lbl(m, stopAt, PX(to), PLOTS[to] * 0.2 + 0.95, PZ, { size: 0.3, bg: 'rgba(242,181,68,0.96)' });
}
const ZW = { 1: [-4.6, -7.2], 2: [-4.6, -5.6], 3: [-2.9, -6.4], 4: [-1.2, -5.6], 5: [-1.2, -7.2] }, ZE = [[1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [4, 5], [3, 5]], ZC = [0xFFFFFF, GOLD, TEAL, 0xC4846A];
function zones(m, c) {
  const s = st(m); (m.zz || []).forEach(o => s.g.remove(o)); m.zz = [];
  if (!m.zplate) { m.zplate = s.disc(-2.9, -6.4, 2.6, 0xFFFFFF, { opacity: 0.55, ring: false, y: 1.22 }); m.zplate.scale.set(1, 1, 0.55); }
  ZE.forEach(([a, b]) => m.zz.push(s.line(ZW[a], ZW[b], c[a] && c[a] === c[b] ? RED : INK, { opacity: c[a] && c[a] === c[b] ? 0.9 : 0.4, w: c[a] && c[a] === c[b] ? 0.12 : 0.07, y: 1.24 })));
  for (const k in ZW) { const d = s.disc(ZW[k][0], ZW[k][1], 0.42, ZC[c[k] || 0], { y: 1.25 }); m.zz.push(d, d.userData.ring, lbl(m, String(k), ZW[k][0], 1.75, ZW[k][1], { size: 0.3 })); }
}
const w3 = {
  start(m) { fly(m, [-0.6, 0.6, -4.6], 0.82, -0.05, 0.84); },
  cleanup(m) { m.app.qadam.goTo(1.8, 1.5); },
  steps: [
    { kind: 'run', t: L('Find the best spot for a new house', 'Найди лучшее место для нового дома', 'Жаңа үйге ең жақсы орын тап'),
      i: L('Taller column = closer to the school and the park.', 'Выше столбик — ближе школа и парк.', 'Баған биік — мектеп пен саябақ жақын.'),
      enter: drawPlots, btn: L('Run hill climbing', 'Запустить hill climbing', 'Hill climbing іске қосу'),
      go: async m => { await walk(m, 0, 1, tr(L('Stuck', 'Застрял', 'Тұрып қалды'))); },
      learn: L('Hill climbing stopped at 5: both neighbours are lower. That’s a local maximum.', 'Hill climbing остановился на 5: оба соседа ниже. Это локальный максимум.', 'Hill climbing 5-те тоқтады: екі көрші де төмен. Бұл жергілікті максимум.'),
      h: [L('Press the button and watch Qadam.', 'Нажми кнопку и смотри на Qadam.', 'Батырманы басып, Qadam-ға қара.'), L('He only steps to a better neighbour.', 'Он шагает только к лучшему соседу.', 'Ол тек жақсырақ көршіге қадам басады.')] },
    { kind: 'pick', t: L('Help Qadam reach the 9', 'Помоги Qadam дойти до 9', 'Qadam-ға 9-ға жетуге көмектес'), i: L('How can he get out of the dip?', 'Как ему выбраться из ямы?', 'Ол шұңқырдан қалай шығады?'),
      opts: [
        { id: 'same', icon: 'reset', l: L('Start again from spot 1', 'Начать снова с участка 1', '1-учаскеден қайта бастау'), why: L('From the same start he gets stuck at the same 5.', 'С того же места он снова застрянет на 5.', 'Сол орыннан ол тағы 5-те тұрып қалады.') },
        { id: 'anneal', icon: 'snow', ok: true, l: L('Sometimes step down', 'Иногда шагать вниз', 'Кейде төмен басу'), play: async m => { await walk(m, 1, 7, '9 ✓'.replace(' ✓', '')); m.app.city.wave(PX(7) * KK, PZ * KK); } },
        { id: 'look', icon: 'target', l: L('Only look at neighbours', 'Смотреть только на соседей', 'Тек көршілерге қарау'), why: L('That is exactly what hill climbing does — that’s why it got stuck.', 'Именно так и делает hill climbing — поэтому он и застрял.', 'Hill climbing дәл солай істейді — сондықтан тұрып қалды.') },
      ],
      learn: L('This is simulated annealing: accepting a worse step now and then helps escape a local maximum.', 'Это имитация отжига: иногда принять худший шаг, чтобы выбраться из локального максимума.', 'Бұл күйдіруді имитациялау: кейде нашар қадамды қабылдау жергілікті максимумнан шығуға көмектеседі.'),
      h: [L('Staying “greedy” keeps him stuck.', 'Если всегда жадничать, он так и застрянет.', 'Әрқашан ашкөз болса, ол тұрып қалады.'), L('To climb a higher hill you may need to go down first.', 'Чтобы подняться выше, иногда надо сначала спуститься.', 'Биікке шығу үшін кейде алдымен түсу керек.')] },
    { kind: 'widget', w: 'color', t: L('Bus lines without conflicts', 'Автобусы без конфликтов', 'Қайшылықсыз автобустар'),
      i: L('Tap a zone to give it a line. Neighbours need different lines.', 'Нажми на зону, чтобы дать ей линию. У соседей — разные линии.', 'Аймаққа желі беру үшін бас. Көршілерде әртүрлі желі болсын.'),
      enter: m => { st(m).clear(); m.zplate = null; m.app.qadam.goTo(-3.4, -4.2); zones(m, {}); fly(m, [-2.9, 1.2, -5.9], 0.42, -0.1, 0.78); },
      onWidget: (m, ws) => zones(m, ws.c || {}),
      data: { nodes: { 1: [60, 50], 2: [60, 150], 3: [160, 100], 4: [260, 150], 5: [260, 50] }, edges: [[1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [4, 5], [3, 5]] },
      learn: L('This is a CSP: every constraint holds, so the buses run without clashes.', 'Это CSP: все ограничения выполнены, автобусы едут без конфликтов.', 'Бұл CSP: барлық шектеу орындалды, автобустар қайшылықсыз жүреді.'),
      h: [L('Start with the zone that has the most neighbours.', 'Начни с зоны, у которой больше всего соседей.', 'Көршісі ең көп аймақтан баста.'), L('Zone 3 touches four zones — colour it first.', 'Зона 3 касается четырёх зон — раскрась её первой.', '3-аймақ төрт аймаққа тиеді — алдымен соны боя.')] },
  ],
  onStep(m, step) { m.city.preview(m.i, (step + 1) / 3); if (step === 2) { const s = st(m); [GOLD, TEAL, RED].forEach((c, k) => { const car = s.car(c, 1.6); s.move(car, [[-7.0, -4.75 + k * 0.0], [-2.2, -4.75], [4.8, -4.75], [7.0, -4.75]].map(p => [p[0] + k * 1.2, p[1]]), 4 + k); }); } },
  done: L('The block is built and three bus lines run on a clash-free schedule.', 'Квартал застроен, три автобусные линии ходят без конфликтов.', 'Квартал салынды, үш автобус желісі қайшылықсыз жүреді.'),
};

// ---------- Week 4 — Beat the robot at toguz kumalak (minimax, alpha-beta, expectimax) ----------
const LEAF = [3, 12, 8, 2, 4, 6, 14, 5, 2];
const TX = { root: [-2.6, 4.15], m: [[-3.9, 5.5], [-2.6, 5.5], [-1.3, 5.5]], l: i => [-4.3 + i * 0.42 + Math.floor(i / 3) * 0.04, 6.75] }, HY = { y: 1.7 };
function drawTree(m) {
  const s = st(m); s.clear(); m.tr = { leaf: [], min: [], lines: [] };
  TX.m.forEach((p, j) => { s.line(TX.root, p, INK, { opacity: 0.5, y: 1.69 }); for (let k = 0; k < 3; k++) m.tr.lines[j * 3 + k] = s.line(p, TX.l(j * 3 + k), INK, { opacity: 0.5, y: 1.69 }); });
  const plate = s.disc(-2.75, 5.45, 2.0, 0xFFFFFF, { opacity: 0.55, ring: false, y: 1.66 }); plate.scale.set(1.15, 1, 0.85);
  m.tr.root = s.disc(...TX.root, 0.32, GOLD, HY); m.tr.rootL = lbl(m, 'MAX', TX.root[0], 2.2, TX.root[1], { size: 0.28 });
  TX.m.forEach((p, j) => { m.tr.min[j] = s.disc(p[0], p[1], 0.28, TEAL, HY); m.tr.minL = m.tr.minL || []; m.tr.minL[j] = lbl(m, 'MIN', p[0], 2.15, p[1], { size: 0.26 }); });
  LEAF.forEach((v, i) => { const [x, z] = TX.l(i); m.tr.leaf[i] = s.disc(x, z, 0.18, WHITE, HY); m.tr.leafL = m.tr.leafL || []; m.tr.leafL[i] = lbl(m, String(v), x, 2.0, z, { size: 0.24 }); });
}
async function revealMin(m) { const s = st(m); for (let j = 0; j < 3; j++) { const v = Math.min(...LEAF.slice(j * 3, j * 3 + 3)); s.pulse(m.tr.min[j]); m.tr.minL[j] = s.setLabel(m.tr.minL[j], String(v)); await s.wait(0.35); } }
const pickMove = (j) => async m => { if (!m.revealed) { m.revealed = true; await revealMin(m); } const s = st(m); s.pulse(m.tr.min[j], j === 0 ? GREEN : RED); await s.wait(0.4); if (j === 0) m.tr.rootL = s.setLabel(m.tr.rootL, '3'); };
const w4 = {
  start(m) { fly(m, [-2.7, 1.7, 5.4], 0.44, 0.1, 0.72); m.app.qadam.goTo(-2.6, 3.6); },
  steps: [
    { kind: 'pick', t: L('Your move: which one?', 'Твой ход: какой выбрать?', 'Сенің жүрісің: қайсысын таңдайсың?'),
      i: L('Numbers are kumalak you win. The robot answers to leave you as few as possible.', 'Числа — құмалақ, которые ты выиграешь. Робот ответит так, чтобы тебе досталось меньше.', 'Сандар — сен ұтатын құмалақ. Робот саған азырақ қалатындай жауап береді.'),
      enter: drawTree,
      opts: [
        { id: 'l', icon: 'back', ok: true, l: L('Left', 'Левый', 'Сол жақ'), play: pickMove(0) },
        { id: 'c', icon: 'down', l: L('Middle', 'Средний', 'Ортаңғы'), play: pickMove(1), why: L('The robot answers with 2 — less than the 3 you get on the left.', 'Робот ответит 2 — меньше, чем 3 слева.', 'Робот 2-мен жауап береді — сол жақтағы 3-тен аз.') },
        { id: 'r', icon: 'arrow', l: L('Right', 'Правый', 'Оң жақ'), play: pickMove(2), why: L('14 is tempting, but the robot answers with 2.', '14 заманчиво, но робот ответит 2.', '14 қызықты, бірақ робот 2-мен жауап береді.') },
      ],
      learn: L('This is minimax: pick the move whose worst case is best — 3 kumalak.', 'Это minimax: выбирай ход с лучшим худшим исходом — 3 құмалақ.', 'Бұл minimax: ең нашар нәтижесі ең жақсы жүрісті таңда — 3 құмалақ.'),
      h: [L('For each move, look at the smallest number under it.', 'Для каждого хода смотри на наименьшее число под ним.', 'Әр жүрістің астындағы ең кіші санға қара.'), L('Left gives at least 3, the others at least 2.', 'Левый даёт минимум 3, остальные — минимум 2.', 'Сол жақ кемінде 3 береді, қалғандары — кемінде 2.')] },
    { kind: 'pick', t: L('What can the robot skip checking?', 'Что робот может даже не проверять?', 'Робот нені тексермей-ақ қоя алады?'),
      i: L('You already have 3 on the left.', 'Слева у тебя уже есть 3.', 'Сол жақта сенде 3 бар.'),
      opts: [
        { id: 'p', icon: 'close', ok: true, l: L('Leaves 4 and 6', 'Листья 4 и 6', '4 және 6 жапырақтары'), play: async m => { const s = st(m); [4, 5].forEach(i => { m.tr.leaf[i].material.color.set(GREY); m.tr.leaf[i].material.opacity = 0.35; m.tr.lines[i].material.opacity = 0.08; }); await s.wait(0.5); } },
        { id: 'q', icon: 'close', l: L('Leaves 14 and 5', 'Листья 14 и 5', '14 және 5 жапырақтары'), why: L('In the right branch no leaf drops below 3 until the last one, so all are needed.', 'В правой ветке до последнего листа нет числа меньше 3 — нужны все.', 'Оң тармақта соңғысына дейін 3-тен кіші сан жоқ — бәрі керек.') },
        { id: 'n', icon: 'check', l: L('Nothing', 'Ничего', 'Ештеңе'), why: L('After the middle branch shows 2, its other leaves can’t help MAX.', 'Когда средняя ветка показала 2, остальные её листья MAX уже не помогут.', 'Ортаңғы тармақ 2-ні көрсеткенде, оның қалған жапырақтары MAX-қа көмектеспейді.') },
      ],
      learn: L('This is alpha-beta pruning: seeing 2 < 3, the robot skipped the rest of that branch.', 'Это альфа-бета отсечение: увидев 2 < 3, робот отбросил остаток ветки.', 'Бұл альфа-бета кесу: 2 < 3 екенін көріп, робот тармақтың қалғанын тастады.'),
      h: [L('Look at the middle branch: its first leaf is 2.', 'Посмотри на среднюю ветку: её первый лист — 2.', 'Ортаңғы тармаққа қара: оның бірінші жапырағы — 2.'), L('MIN there will give at most 2, which is already worse than 3.', 'MIN там даст не больше 2 — это уже хуже 3.', 'Онда MIN 2-ден артық бермейді — бұл 3-тен нашар.')] },
    { kind: 'pick', t: L('Gamble or play safe?', 'Рискнуть или наверняка?', 'Тәуекел ме, әлде сенімді ме?'),
      i: L('Gamble: 50% you win 8, 50% only 2. Safe move: always 4.', 'Риск: 50% — 8 құмалақ, 50% — только 2. Наверняка: всегда 4.', 'Тәуекел: 50% — 8 құмалақ, 50% — тек 2. Сенімді: әрқашан 4.'),
      enter: m => { st(m).clear(); const s = st(m); s.disc(-3.4, 5.4, 0.32, TEAL, HY); lbl(m, '½·8 + ½·2 = 5', -3.4, 2.25, 5.4, { size: 0.3 }); s.disc(-1.6, 5.4, 0.32, WHITE, HY); lbl(m, '4', -1.6, 2.25, 5.4, { size: 0.3 }); },
      opts: [
        { id: 'risk', icon: 'game', ok: true, l: L('Gamble (5 on average)', 'Рискнуть (в среднем 5)', 'Тәуекел (орташа 5)') },
        { id: 'safe', icon: 'lock', l: L('Play safe (4)', 'Наверняка (4)', 'Сенімді (4)'), why: L('On average the gamble gives 5, more than 4.', 'В среднем риск даёт 5 — больше, чем 4.', 'Орташа есеппен тәуекел 5 береді — 4-тен көп.') },
      ],
      learn: L('This is expectimax: with chance involved, compare averages instead of worst cases.', 'Это expectimax: когда есть случайность, сравнивают средние, а не худшие исходы.', 'Бұл expectimax: кездейсоқтық болса, ең нашарды емес, орташаны салыстырады.'),
      h: [L('Average = 0.5 × 8 + 0.5 × 2.', 'Среднее = 0.5 × 8 + 0.5 × 2.', 'Орташа = 0.5 × 8 + 0.5 × 2.'), L('Compare that average with 4.', 'Сравни это среднее с 4.', 'Осы орташаны 4-пен салыстыр.')] },
  ],
  done: L('You beat the robot in toguz kumalak, and the Culture Palace is open.', 'Ты обыграл робота в тоғыз құмалақ, и Дворец культуры открыт.', 'Сен роботты тоғыз құмалақта ұттың, Мәдениет сарайы ашылды.'),
};

// ---------- Week 5 — Clear the traffic jam (MDP, Q-learning) ----------
const QCURVE = [12, 11, 11, 10, 9, 9, 8, 7, 7, 6, 6, 5, 5, 4, 4, 4, 3, 3, 3, 3];
function queue(m, n) {
  const s = st(m); m.q5 = m.q5 || [];
  while (m.q5.length < 12) { const c = s.car([0xC4846A, 0x8DA3B8, 0xEFE6D6, 0x4F98A3][m.q5.length % 4], 1.2); st(m).place(c, 4.95, -1.9 - m.q5.length * 0.5, 0); c.rotation.y = Math.PI; m.q5.push(c); }
  m.q5.forEach((c, i) => { c.visible = i < n; });
  m.qn = n; m.live();
}
const w5 = {
  start(m) { fly(m, [4.8, 0.6, -3.0], 0.5, 0.45, 0.88); },
  steps: [
    { kind: 'pick', t: L('Teach the light what is bad', 'Объясни светофору, что плохо', 'Бағдаршамға не жаман екенін түсіндір'), i: L('It learns from a reward after every step.', 'Он учится по награде после каждого шага.', 'Ол әр қадамнан кейінгі сыйақыдан үйренеді.'),
      enter: m => { st(m).clear(); m.q5 = null; queue(m, 12); }, live: m => tr(L('Cars in the queue: {n}', 'Машин в очереди: {n}', 'Кезектегі көлік: {n}')).replace('{n}', m.qn ?? 12),
      opts: [
        { id: 'plus', icon: 'star', l: L('+1 per waiting car', '+1 за каждую ждущую машину', 'Күтіп тұрған әр көлікке +1'), why: L('Then it would learn to make the jam even longer!', 'Тогда он научится делать пробку ещё длиннее!', 'Онда ол кептелісті ұзартуды үйренеді!') },
        { id: 'minus', icon: 'traffic', ok: true, l: L('−1 per waiting car', '−1 за каждую ждущую машину', 'Күтіп тұрған әр көлікке −1') },
        { id: 'zero', icon: 'close', l: L('No reward', 'Без награды', 'Сыйақысыз'), why: L('Without a reward there is nothing to learn from.', 'Без награды учиться не на чем.', 'Сыйақысыз үйренетін ештеңе жоқ.') },
      ],
      learn: L('The reward R is part of the MDP: states, actions, rewards, transitions.', 'Награда R — часть MDP: состояния, действия, награды, переходы.', 'Сыйақы R — MDP бөлігі: күйлер, әрекеттер, сыйақылар, ауысулар.'),
      h: [L('Waiting cars are bad — the reward should say so.', 'Ждущие машины — это плохо, награда должна это сказать.', 'Күтіп тұрған көліктер — жаман, сыйақы соны айтуы керек.'), L('A negative number is a penalty.', 'Отрицательное число — это штраф.', 'Теріс сан — бұл айып.')] },
    { kind: 'run', t: L('Clear the traffic jam', 'Убери пробку', 'Кептелісті жой'), i: L('Let the light try and learn for 100 episodes.', 'Пусть светофор пробует и учится 100 эпизодов.', 'Бағдаршам 100 эпизод бойы байқап, үйренсін.'),
      btn: L('Train 100 episodes', 'Обучить 100 эпизодов', '100 эпизод үйрету'), live: m => tr(L('Cars in the queue: {n}', 'Машин в очереди: {n}', 'Кезектегі көлік: {n}')).replace('{n}', m.qn ?? 12),
      go: async m => { for (const v of QCURVE) { queue(m, v); await st(m).wait(0.18); } },
      learn: L('This is Q-learning: the light tried actions, remembered what pays off, and the queue fell from 12 to 3.', 'Это Q-обучение: светофор пробовал, запоминал, что выгодно, и очередь упала с 12 до 3.', 'Бұл Q-оқыту: бағдаршам байқап, тиімдісін есте сақтады, кезек 12-ден 3-ке түсті.'),
      h: [L('Press the button and watch the queue.', 'Нажми кнопку и смотри на очередь.', 'Батырманы басып, кезекке қара.'), L('Each episode updates Q-values from rewards.', 'Каждый эпизод обновляет Q-значения по наградам.', 'Әр эпизод сыйақылар бойынша Q-мәндерін жаңартады.')] },
    { kind: 'pick', t: L('Should it still try new things?', 'Пробовать ли иногда новое?', 'Кейде жаңаны байқап көру керек пе?'), i: L('Maybe an even better rhythm exists.', 'Вдруг есть ритм ещё лучше.', 'Мүмкін одан да жақсы ырғақ бар шығар.'),
      opts: [
        { id: 'never', icon: 'lock', l: L('Never', 'Никогда', 'Ешқашан'), why: L('Then it never finds out whether something is better.', 'Тогда он никогда не узнает, бывает ли лучше.', 'Онда ол жақсырағы бар-жоғын ешқашан білмейді.') },
        { id: 'eps', icon: 'route', ok: true, l: L('Yes, 10% of the time', 'Да, в 10% случаев', 'Иә, 10% жағдайда') },
        { id: 'always', icon: 'game', l: L('Always at random', 'Всегда случайно', 'Әрқашан кездейсоқ'), why: L('Then it throws away everything it learned.', 'Тогда он выбросит всё, чему научился.', 'Онда ол үйренгенінің бәрін тастайды.') },
      ],
      learn: L('This is ε-greedy with ε = 0.1: mostly use the best action, sometimes explore.', 'Это ε-жадная стратегия, ε = 0.1: чаще лучшее действие, иногда — разведка.', 'Бұл ε-ашкөз стратегия, ε = 0.1: көбіне ең жақсы әрекет, кейде — барлау.'),
      h: [L('Balance using what you know and exploring.', 'Нужен баланс между знанием и разведкой.', 'Білгенді қолдану мен барлау арасында тепе-теңдік керек.'), L('A small chance of a random action is enough.', 'Достаточно небольшой доли случайных действий.', 'Кездейсоқ әрекеттің аз үлесі жеткілікті.')] },
  ],
  done: L('The jam is gone: Q-learning taught the lights a good rhythm.', 'Пробки нет: Q-обучение научило светофор хорошему ритму.', 'Кептеліс жоқ: Q-оқыту бағдаршамға жақсы ырғақ үйретті.'),
};

// ---------- Week 6 — Will there be a blizzard? (Bayes) ----------
const BX = [7.3, -0.3];
function prob(m, p) { const s = st(m); if (!m.bar6) { m.bar6 = s.bar(BX[0], BX[1], TEAL, 0.5); } s.setBar(m.bar6, p * 3); if (m.bar6L) st(m).g.remove(m.bar6L); m.bar6L = lbl(m, Math.round(p * 100) + ' %', BX[0], p * 3 + 0.5, BX[1], { size: 0.36 }); m.p6 = p; m.live(); }
const live6 = m => tr(L('Chance of a blizzard: {p}%', 'Вероятность бурана: {p} %', 'Боран ықтималдығы: {p} %')).replace('{p}', Math.round((m.p6 ?? 0.1) * 100));
const w6 = {
  start(m) { fly(m, [6.6, 0.8, -1.6], 0.55, 0.7, 0.86); },
  steps: [
    { kind: 'pick', t: L('The pressure sensor went off', 'Сработал датчик давления', 'Қысым датчигі іске қосылды'), i: L('Blizzards happen on 10% of days. What happens to the chance now?', 'Буран бывает в 10\u00A0% дней. Что теперь с вероятностью?', 'Боран күндердің 10\u00A0%-ында болады. Енді ықтималдық не болады?'),
      enter: m => { st(m).clear(); m.bar6 = null; m.bar6L = null; prob(m, 0.1); lbl(m, tr(L('Sensor 1', 'Датчик 1', '1-датчик')), 6.2, 2.3, 0.4, { size: 0.28, bg: 'rgba(232,103,74,0.95)', fg: '#fff' }); }, live: live6,
      opts: [
        { id: 'up', icon: 'arrow', ok: true, l: L('Rises to about 33%', 'Растёт до ≈\u00A033\u00A0%', '≈\u00A033\u00A0%-ға өседі'), play: async m => { prob(m, 1 / 3); await st(m).wait(0.6); } },
        { id: 'ninety', icon: 'gauge', l: L('Jumps to 90%', 'Сразу 90\u00A0%', 'Бірден 90\u00A0%'), why: L('90% is how often the sensor catches a blizzard, not the chance of one.', '90\u00A0% — это как часто датчик ловит буран, а не шанс бурана.', '90\u00A0% — датчиктің боранды қаншалықты жиі ұстайтыны, боран ықтималдығы емес.') },
        { id: 'same', icon: 'close', l: L('Stays 10%', 'Остаётся 10\u00A0%', '10\u00A0% қалады'), why: L('A signal is new evidence, so the chance must move.', 'Сигнал — это новые данные, вероятность должна сдвинуться.', 'Сигнал — жаңа дерек, ықтималдық өзгеруі керек.') },
      ],
      learn: L('This is Bayes’ rule: 0.1 · 0.9 / 0.27 ≈\u00A033%. The sensor also rings on 20% of calm days.', 'Это правило Байеса: 0.1 · 0.9 / 0.27 ≈\u00A033\u00A0%. Датчик срабатывает и в 20\u00A0% спокойных дней.', 'Бұл Байес ережесі: 0.1 · 0.9 / 0.27 ≈\u00A033\u00A0%. Датчик тыныш күндердің 20\u00A0%-ында да қосылады.'),
      h: [L('False alarms happen too.', 'Ложные тревоги тоже бывают.', 'Жалған дабылдар да болады.'), L('Of 100 days: 9 real alarms and 18 false ones.', 'Из 100 дней: 9 настоящих тревог и 18 ложных.', '100 күннің: 9 нағыз дабыл және 18 жалған.')] },
    { kind: 'pick', t: L('Close the schools at 33%?', 'Закрывать школы при 33\u00A0%?', '33\u00A0%-да мектептерді жабу керек пе?'), i: L('Two out of three such alarms are false.', 'Две из трёх таких тревог — ложные.', 'Мұндай дабылдың үштен екісі жалған.'), live: live6,
      opts: [
        { id: 'now', icon: 'lock', l: L('Close now', 'Закрыть сразу', 'Бірден жабу'), why: L('Most such alarms are false — too early.', 'Большинство таких тревог ложные — слишком рано.', 'Мұндай дабылдың көбі жалған — тым ерте.') },
        { id: 'wait', icon: 'sensor', ok: true, l: L('Wait for a second sensor', 'Подождать второй датчик', 'Екінші датчикті күту') },
        { id: 'never', icon: 'close', l: L('Never close', 'Никогда не закрывать', 'Ешқашан жаппау'), why: L('If the blizzard is real, children are in danger.', 'Если буран настоящий, детям опасно.', 'Боран нағыз болса, балаларға қауіпті.') },
      ],
      learn: L('Good decisions use the probability — and more evidence makes it sharper.', 'Решение опирается на вероятность, а новые данные делают её точнее.', 'Шешім ықтималдыққа сүйенеді, ал жаңа деректер оны дәлдейді.'),
      h: [L('33% is uncertain.', '33\u00A0% — это ещё неуверенно.', '33\u00A0% — әлі сенімсіз.'), L('Another sensor would tell more.', 'Ещё один датчик скажет больше.', 'Тағы бір датчик көбірек айтады.')] },
    { kind: 'run', t: L('The wind sensor went off too', 'Сработал и датчик ветра', 'Жел датчигі де іске қосылды'), i: L('Two independent signals: update the chance.', 'Два независимых сигнала — обнови вероятность.', 'Екі тәуелсіз сигнал — ықтималдықты жаңарт.'),
      btn: L('Add the second signal', 'Добавить второй сигнал', 'Екінші сигналды қосу'), icon: 'sensor', live: live6,
      enter: m => lbl(m, tr(L('Sensor 2', 'Датчик 2', '2-датчик')), 7.9, 2.2, -1.6, { size: 0.28, bg: 'rgba(232,103,74,0.95)', fg: '#fff' }),
      go: async m => { const s = st(m); prob(m, 0.692); await s.wait(0.8); [[-8, -1.05], [8, -1.05]].forEach((p0, k) => { const c = s.car(0xF29B3A, 1.8); st(m).place(c, p0[0], p0[1] - k * 0.26, 0); s.move(c, k ? [[8, -1.35], [-8, -1.35]] : [[-8, -1.05], [8, -1.05]], 6); }); m.app.snow.blow(); await s.wait(1.2); },
      learn: L('Now ≈\u00A069%: the city closes the schools and sends out the snowploughs.', 'Теперь ≈\u00A069\u00A0%: город закрывает школы и выводит снегоуборщики.', 'Енді ≈\u00A069\u00A0%: қала мектептерді жауып, қар тазалағыштарды шығарады.'),
      h: [L('Press the button.', 'Нажми кнопку.', 'Батырманы бас.'), L('Each independent signal multiplies the odds by 4.5.', 'Каждый независимый сигнал умножает шансы в 4.5 раза.', 'Әр тәуелсіз сигнал мүмкіндікті 4.5 есе көбейтеді.')] },
  ],
  done: L('The blizzard alert works: Bayes turns sensor signals into a probability the city can act on.', 'Тревога работает: Байес превращает сигналы датчиков в вероятность, по которой город действует.', 'Дабыл жұмыс істейді: Байес датчик сигналдарын қала әрекет ететін ықтималдыққа айналдырады.'),
};

// ---------- Week 7 — Where is the bus now? (HMM) ----------
const STOPS = [[-1.9, 6.5], [0.4, 7.6], [3.2, 7.75]];
function belief(m, b) { const s = st(m); m.bel = b; (m.cl || []).forEach(o => s.g.remove(o)); m.cl = []; b.forEach((p, i) => { const d = s.disc(STOPS[i][0], STOPS[i][1], 0.2 + p * 1.1, TEAL, { opacity: 0.25 + p * 0.45, ring: false, y: 0.11 }); m.cl.push(d, lbl(m, Math.round(p * 100) + ' %', STOPS[i][0], 0.7, STOPS[i][1], { size: 0.28 })); }); m.live(); }
const w7 = {
  start(m) { fly(m, [0.6, 0.6, 6.8], 0.5, 3.0, 0.86); },
  steps: [
    { kind: 'run', t: L('Where is the bus now?', 'Где сейчас автобус?', 'Автобус қазір қайда?'), i: L('The teal clouds are our guesses. GPS is noisy.', 'Бирюзовые облака — наши догадки. GPS шумит.', 'Көгілдір бұлттар — біздің болжамдар. GPS шулы.'),
      enter: m => { st(m).clear(); m.city.preview(m.i, 0.34); belief(m, [1 / 3, 1 / 3, 1 / 3]); }, btn: L('Get a GPS signal', 'Получить сигнал GPS', 'GPS сигналын алу'), icon: 'pin',
      go: async m => { const s = st(m); const d = s.disc(0.75, 7.25, 0.12, 0x2F7F8A, { ring: false }); s.pulse(d); await s.wait(0.5); belief(m, [0.1, 0.7, 0.2]); await s.wait(0.5); },
      learn: L('This is filtering: multiply each guess by how well it fits the GPS, then normalise.', 'Это фильтрация: каждую догадку умножаем на то, насколько она согласуется с GPS, и нормализуем.', 'Бұл сүзгілеу: әр болжамды GPS-ке қаншалықты сәйкес екеніне көбейтіп, нормалаймыз.'),
      h: [L('Press the button and watch the clouds.', 'Нажми кнопку и смотри на облака.', 'Батырманы басып, бұлттарға қара.'), L('A big cloud means a likely stop.', 'Большое облако — вероятная остановка.', 'Үлкен бұлт — ықтимал аялдама.')] },
    { kind: 'pick', t: L('Send the passenger to the right stop', 'Отправь пассажира на нужную остановку', 'Жолаушыны дұрыс аялдамаға жібер'), i: L('Pick the most likely stop.', 'Выбери самую вероятную остановку.', 'Ең ықтимал аялдаманы таңда.'),
      opts: [0, 1, 2].map(k => ({ id: 's' + k, icon: 'bus', ok: k === 1, l: L(`Stop ${k + 1}`, `Остановка ${k + 1}`, `${k + 1}-аялдама`), why: L(`Only ${[10, 70, 20][k]}% for this stop.`, `У этой остановки только ${[10, 70, 20][k]} %.`, `Бұл аялдамада тек ${[10, 70, 20][k]} %.`),
        play: k === 1 ? async m => { const s = st(m), bus = s.car(GOLD, 2); st(m).place(bus, -2.2, 6.2, 0); await s.move(bus, [[-2.2, 6.2], [-0.9, 7.2], STOPS[1]], 1.6); } : undefined })),
      learn: L('Stop 2 has 70% — the bus is there.', 'У остановки 2 — 70\u00A0%, автобус там.', '2-аялдамада 70\u00A0% — автобус сонда.'),
      h: [L('Look at the biggest cloud.', 'Смотри на самое большое облако.', 'Ең үлкен бұлтқа қара.'), L('Compare 10%, 70% and 20%.', 'Сравни 10\u00A0%, 70\u00A0% и 20\u00A0%.', '10\u00A0%, 70\u00A0% және 20\u00A0%-ды салыстыр.')] },
    { kind: 'pick', t: L('Now the whole route of the day', 'Теперь весь маршрут за день', 'Енді күндік толық маршрут'), i: L('Which algorithm gives the most likely sequence of stops?', 'Какой алгоритм даёт самую вероятную последовательность остановок?', 'Қай алгоритм аялдамалардың ең ықтимал тізбегін береді?'),
      opts: [
        { id: 'filt', icon: 'target', l: L('Filtering', 'Фильтрация', 'Сүзгілеу'), why: L('Filtering answers “where now”, not the whole path.', 'Фильтрация отвечает «где сейчас», а не про весь путь.', 'Сүзгілеу «қазір қайда» деп жауап береді, толық жол туралы емес.') },
        { id: 'vit', icon: 'route', ok: true, l: L('Viterbi', 'Витерби', 'Витерби'), play: async m => { st(m).tube(STOPS, GOLD, 0.05); await st(m).wait(0.9); } },
        { id: 'mm', icon: 'game', l: L('Minimax', 'Minimax', 'Minimax'), why: L('Minimax is for games against an opponent.', 'Minimax — для игр против соперника.', 'Minimax — қарсыласпен ойынға арналған.') },
      ],
      learn: L('This is the Viterbi algorithm: the single most likely sequence of hidden states.', 'Это алгоритм Витерби: самая вероятная последовательность скрытых состояний.', 'Бұл Витерби алгоритмі: жасырын күйлердің ең ықтимал тізбегі.'),
      h: [L('We want a sequence, not one moment.', 'Нужна последовательность, а не один момент.', 'Бір сәт емес, тізбек керек.'), L('Its name is a person’s surname.', 'Его название — фамилия учёного.', 'Оның аты — ғалымның тегі.')] },
  ],
  done: L('Buses are tracked through noisy GPS with a hidden Markov model.', 'Автобусы отслеживаются по шумному GPS с помощью скрытой марковской модели.', 'Автобустар шулы GPS арқылы жасырын Марков моделімен бақыланады.'),
};

// ---------- Week 8 — Akimat post: filter the spam (classifier threshold, expected utility) ----------
const MAIL = [[0.97, 1], [0.91, 1], [0.84, 1], [0.72, 1], [0.66, 0], [0.4, 0], [0.3, 0], [0.22, 0], [0.1, 0], [0.05, 0]];
const INBOX = [5.3, 4.95], SPAMB = [7.3, 5.6], POST = [6.3, 5.6];
function sortMail(m, t) {
  const s = st(m); m.env = m.env || MAIL.map(() => { const e = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.06, 0.24, 2, 0.02), mat(0xFFFFFF, { roughness: 0.5 })); e.castShadow = true; st(m).place(e, POST[0], POST[1], 0.3); s.g.add(e); return e; });
  let fp = 0, fn = 0;
  MAIL.forEach(([p, spam], i) => { const toSpam = p >= t; if (toSpam && !spam) fp++; if (!toSpam && spam) fn++; const B = toSpam ? SPAMB : INBOX, k = i % 5, j = Math.floor(i / 5);
    const e = m.env[i]; e.material = mat(spam ? 0xE8674A : 0xF7F5F0, { roughness: 0.5 }); s.move(e, [[e.position.x / KK, e.position.z / KK], [B[0] - 0.5 + k * 0.25, B[1] + j * 0.3]], 0.7); e.position.y = 0.14; });
  m.err = [fp, fn]; m.live && m.live();
}
const w8 = {
  start(m) { fly(m, [6.3, 0.5, 5.2], 0.3, 0.55, 0.82); },
  steps: [
    { kind: 'dial', t: L('Akimat post: filter the spam', 'Почта акимата: отсей спам', 'Әкімдік поштасы: спамды сүз'), i: L('Letters above the threshold go to Spam. Get zero mistakes.', 'Письма выше порога летят в «Спам». Добейся нуля ошибок.', 'Шектен жоғары хаттар «Спамға» ұшады. Қатені нөлге жеткіз.'),
      label: L('spam threshold', 'порог спама', 'спам шегі'), values: [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9], start: 2, fmt: v => v.toFixed(1),
      enter: m => { st(m).clear(); m.env = null; [INBOX, SPAMB].forEach((B, k) => { const d = st(m).disc(B[0], B[1] + 0.15, 0.75, k ? 0xF3D6CF : 0xD8EFE2, { ring: false, opacity: 0.9 }); d.scale.set(1, 1, 0.6); }); lbl(m, tr(L('Inbox', 'Входящие', 'Кіріс')), INBOX[0], 0.75, INBOX[1] - 0.35, { size: 0.3, bg: 'rgba(95,191,138,0.95)', fg: '#fff' }); lbl(m, tr(L('Spam', 'Спам', 'Спам')), SPAMB[0], 0.75, SPAMB[1] - 0.35, { size: 0.3, bg: 'rgba(232,103,74,0.95)', fg: '#fff' }); sortMail(m, 0.5); },
      onChange: (m, v) => sortMail(m, v), ok: v => v === 0.7,
      live: m => { const [fp, fn] = m.err || [1, 0]; return fp + fn === 0 ? tr(L('No mistakes!', 'Ошибок нет!', 'Қате жоқ!')) : tr(L('Mistakes: {a} good letters in Spam, {b} spam in Inbox', 'Ошибки: важных в «Спаме» — {a}, спама во «Входящих» — {b}', 'Қателер: «Спамда» маңызды хат — {a}, «Кірісте» спам — {b}')).replace('{a}', fp).replace('{b}', fn); },
      learn: L('This is a classifier with a threshold: at 0.7 every letter lands in the right box.', 'Это классификатор с порогом: при 0.7 каждое письмо попадает куда нужно.', 'Бұл шегі бар жіктеуіш: 0.7-де әр хат дұрыс жәшікке түседі.'),
      h: [L('A good letter is in Spam — raise the threshold.', 'Важное письмо в «Спаме» — подними порог.', '«Спамда» маңызды хат бар — шекті көтер.'), L('Too high and real spam slips into the Inbox.', 'Слишком высоко — и спам проскочит во «Входящие».', 'Тым жоғары болса, спам «Кіріске» өтіп кетеді.')] },
    { kind: 'pick', t: L('Send out the snowplough?', 'Выводить снегоуборщик?', 'Қар тазалағышты шығару керек пе?'), i: L('Snow is 40% likely. A trip costs 10; without it, snow costs 50.', 'Снег с вероятностью 40\u00A0%. Выезд стоит 10, без него снег обойдётся в 50.', 'Қар 40\u00A0% ықтимал. Шығу 10 тұрады, онсыз қар 50-ге түседі.'),
      enter: m => st(m).clear(),
      opts: [
        { id: 'go', icon: 'arrow', ok: true, l: L('Send it (−10)', 'Выводить (−10)', 'Шығару (−10)'), play: async m => { const s = st(m), c = s.car(0xF29B3A, 1.8); st(m).place(c, 4.8, -6, 0); await s.move(c, [[4.8, -6], [4.8, -1.3], [4.85, 4.1], [4.2, 7.2]], 3); } },
        { id: 'stay', icon: 'lock', l: L('Keep it (−20 on average)', 'Не выводить (в среднем −20)', 'Шығармау (орташа −20)'), why: L('0.4 · (−50) = −20, which is worse than −10.', '0.4 · (−50) = −20 — это хуже, чем −10.', '0.4 · (−50) = −20 — бұл −10-нан нашар.') },
      ],
      learn: L('This is expected utility: pick the action with the best average outcome.', 'Это ожидаемая полезность: выбираем действие с лучшим средним исходом.', 'Бұл күтілетін пайдалылық: орташа нәтижесі ең жақсы әрекетті таңдаймыз.'),
      h: [L('Average loss without the plough = 0.4 × 50.', 'Средняя потеря без снегоуборщика = 0.4 × 50.', 'Тазалағышсыз орташа шығын = 0.4 × 50.'), L('Compare 20 with 10.', 'Сравни 20 и 10.', '20 мен 10-ды салыстыр.')] },
  ],
  done: L('The akimat post is sorted and the streets are cleared: machine learning and expected utility at work.', 'Почта акимата разобрана, улицы расчищены: машинное обучение и ожидаемая полезность в деле.', 'Әкімдік поштасы сұрыпталды, көшелер тазартылды: машиналық оқыту мен күтілетін пайдалылық жұмыста.'),
};

// ---------- Week 9 — Light up the city (neural networks) ----------
const LOSS = [1, 0.86, 0.74, 0.63, 0.54, 0.46, 0.39, 0.33, 0.28, 0.23, 0.19, 0.16, 0.13, 0.11, 0.09, 0.07, 0.06, 0.05];
const w9 = {
  start(m) { fly(m, [1.0, 0.8, 1.5], 0.95, 2.4, 0.8); if (!m.app.engine.nightTo) m.app.engine.toward(0.55); },
  cleanup(m) { U.uForce.value = 0; m.app.engine.toward(store.get().night ? 1 : 0); },
  steps: [
    { kind: 'run', t: L('Light up the city', 'Включи свет в городе', 'Қалаға жарық жақ'), i: L('Train the grid’s network: the lower the error, the more windows glow.', 'Обучи сеть энергосистемы: чем меньше ошибка, тем больше горит окон.', 'Энергожүйе желісін үйрет: қате азайған сайын терезе көбірек жанады.'),
      enter: m => { st(m).clear(); m.loss = 1; U.uForce.value = 0; }, btn: L('Train the network', 'Обучить сеть', 'Желіні үйрету'), icon: 'bolt',
      live: m => tr(L('Error: {e}', 'Ошибка: {e}', 'Қате: {e}')).replace('{e}', (m.loss ?? 1).toFixed(2)),
      go: async m => { for (const e of LOSS) { m.loss = e; U.uForce.value = 1 - e; m.live(); await st(m).wait(0.16); } },
      learn: L('Gradient descent nudged the weights until the error fell to 0.05 — and the windows lit up.', 'Градиентный спуск подстраивал веса, пока ошибка не упала до 0.05, — и окна загорелись.', 'Градиенттік түсу қате 0.05-ке түскенше салмақтарды түзетті — терезелер жанды.'),
      h: [L('Press the button.', 'Нажми кнопку.', 'Батырманы бас.'), L('Watch the error and the windows together.', 'Смотри на ошибку и на окна одновременно.', 'Қате мен терезелерге бірге қара.')] },
    { kind: 'pick', t: L('How does the network know which weight to change?', 'Как сеть узнаёт, какой вес менять?', 'Желі қай салмақты өзгерту керегін қалай біледі?'), i: L('One window lit up in the daytime — a mistake.', 'Одно окно загорелось днём — это ошибка.', 'Бір терезе күндіз жанып кетті — бұл қате.'),
      opts: [
        { id: 'bp', icon: 'back', ok: true, l: L('Backpropagation', 'Обратное распространение', 'Кері таралу') },
        { id: 'rand', icon: 'game', l: L('Change one at random', 'Менять случайный', 'Кездейсоқ өзгерту'), why: L('Random changes rarely reduce the error.', 'Случайные изменения редко уменьшают ошибку.', 'Кездейсоқ өзгеріс қатені сирек азайтады.') },
        { id: 'none', icon: 'lock', l: L('It can’t know', 'Никак', 'Ешқалай'), why: L('It can: the gradient shows each weight’s share of the error.', 'Может: градиент показывает вклад каждого веса в ошибку.', 'Біледі: градиент әр салмақтың қатедегі үлесін көрсетеді.') },
      ],
      learn: L('Backpropagation sends the error backwards and gives every weight its gradient.', 'Обратное распространение передаёт ошибку назад и даёт каждому весу его градиент.', 'Кері таралу қатені кері жібереді және әр салмаққа өз градиентін береді.'),
      h: [L('The error travels from the output back to the inputs.', 'Ошибка идёт от выхода обратно к входам.', 'Қате шығыстан кірістерге кері жүреді.'), L('Its name says “back”.', 'В названии есть слово «обратное».', 'Атауында «кері» деген сөз бар.')] },
    { kind: 'pick', t: L('One neuron for one window?', 'Хватит ли одного нейрона на окно?', 'Бір терезеге бір нейрон жете ме?'), i: L('Light it only when it’s dark AND someone is home.', 'Свет — только когда темно И кто-то дома.', 'Жарық — тек қараңғы ЖӘНЕ үйде біреу болғанда.'),
      opts: [
        { id: 'yes', icon: 'check', ok: true, l: L('Yes — that’s AND', 'Да — это И (AND)', 'Иә — бұл ЖӘНЕ (AND)') },
        { id: 'no', icon: 'grid', l: L('No, it needs 100 layers', 'Нет, нужно 100 слоёв', 'Жоқ, 100 қабат керек'), why: L('AND can be split by one straight line — one perceptron is enough.', 'AND делится одной прямой — хватит одного перцептрона.', 'AND бір түзумен бөлінеді — бір перцептрон жеткілікті.') },
      ],
      learn: L('A single perceptron can do AND, but not XOR — that needs a hidden layer.', 'Один перцептрон умеет AND, но не XOR — для него нужен скрытый слой.', 'Бір перцептрон AND істей алады, бірақ XOR-ды емес — оған жасырын қабат керек.'),
      h: [L('Draw the four cases on a square.', 'Нарисуй четыре случая на квадрате.', 'Төрт жағдайды шаршыға сал.'), L('Only one corner is “on”.', 'Горит только один угол.', 'Тек бір бұрыш жанады.')] },
  ],
  done: L('The city glows: a trained neural network controls the lights.', 'Город светится: обученная нейросеть управляет светом.', 'Қала жарқырайды: үйретілген нейрондық желі жарықты басқарады.'),
};

// ---------- Week 10 — City assistant on Bayterek (LLMs, safety) ----------
const say = (m, text, ok = true) => { const s = st(m); if (m.bub) s.g.remove(m.bub); m.bub = lbl(m, text, 0, 5.2, -2.7, { size: 0.42, bg: ok ? 'rgba(255,255,255,0.96)' : 'rgba(232,103,74,0.95)', fg: ok ? '#1B2340' : '#fff' }); m.city.wave(0, -2.7 * KK); };
const w10 = {
  start(m) { fly(m, [0, 3.0, -2.7], 0.6, -0.15, 0.98); },
  steps: [
    { kind: 'pick', t: L('A resident asks the way to EXPO', 'Житель спрашивает дорогу до EXPO', 'Тұрғын EXPO-ға жол сұрайды'), i: L('Pick the temperature for an exact answer.', 'Выбери температуру для точного ответа.', 'Нақты жауап үшін температураны таңда.'),
      enter: m => { st(m).clear(); m.bub = null; },
      opts: [
        { id: 't0', icon: 'thermo', ok: true, l: L('Temperature 0', 'Температура 0', 'Температура 0'), play: async m => { say(m, tr(L('Bus 10 to EXPO, every 8 min', 'Автобус 10 до EXPO, каждые 8 мин', 'EXPO-ға 10-автобус, әр 8 мин'))); await st(m).wait(0.6); } },
        { id: 't15', icon: 'thermo', l: L('Temperature 1.5', 'Температура 1.5', 'Температура 1.5'), play: async m => { say(m, tr(L('Take a camel, maybe a bus…', 'Езжайте на верблюде, а может, автобусом…', 'Түйемен барыңыз, мүмкін автобуспен…')), false); await st(m).wait(0.6); }, why: L('High temperature makes word choice random — bad for facts.', 'Высокая температура делает выбор слов случайным — плохо для фактов.', 'Жоғары температура сөз таңдауын кездейсоқ етеді — фактілерге жаман.') },
      ],
      learn: L('The model picks the next word by probability; temperature 0 always takes the most likely one.', 'Модель выбирает следующее слово по вероятности; при температуре 0 — всегда самое вероятное.', 'Модель келесі сөзді ықтималдық бойынша таңдайды; 0 температурада — әрқашан ең ықтималын.'),
      h: [L('Facts need the most likely words.', 'Для фактов нужны самые вероятные слова.', 'Фактілерге ең ықтимал сөздер керек.'), L('Lower temperature = less randomness.', 'Ниже температура — меньше случайности.', 'Температура төмен — кездейсоқтық аз.')] },
    { kind: 'pick', t: L('Catch the hallucination', 'Поймай галлюцинацию', 'Галлюцинацияны ұста'), i: L('Which sentence did the assistant make up?', 'Какую фразу ассистент выдумал?', 'Көмекші қай сөйлемді ойдан шығарды?'),
      opts: [
        { id: 'a', icon: 'pin', l: L('Bayterek is in Astana', 'Байтерек — в Астане', 'Бәйтерек — Астанада'), why: L('That one is true.', 'Это правда.', 'Бұл шындық.') },
        { id: 'b', icon: 'city', ok: true, l: L('Bayterek was built in 1650', 'Байтерек построен в 1650 году', 'Бәйтерек 1650 жылы салынған'), play: async m => { say(m, tr(L('Bayterek opened in 2002', 'Байтерек открыли в 2002 году', 'Бәйтерек 2002 жылы ашылды'))); await st(m).wait(0.5); } },
        { id: 'c', icon: 'gauge', l: L('Bayterek is 97 m tall', 'Высота Байтерека — 97 м', 'Бәйтеректің биіктігі — 97 м'), why: L('That one is true: 97 m, for 1997.', 'Это правда: 97 м — в честь 1997 года.', 'Бұл шындық: 97 м — 1997 жылдың құрметіне.') },
      ],
      learn: L('A hallucination is a confident made-up fact. Check answers against sources.', 'Галлюцинация — уверенно сказанная выдумка. Проверяй ответы по источникам.', 'Галлюцинация — сенімді айтылған ойдан шығарылған факт. Жауаптарды дереккөзбен тексер.'),
      h: [L('One date is far too early for a modern tower.', 'Одна дата слишком ранняя для современной башни.', 'Бір күн заманауи мұнара үшін тым ерте.'), L('Astana became the capital in 1997.', 'Астана стала столицей в 1997 году.', 'Астана 1997 жылы астана болды.')] },
    { kind: 'pick', t: L('Someone asks for a resident’s home address', 'Просят домашний адрес жителя', 'Тұрғынның үй мекенжайын сұрайды'), i: L('What should a safe assistant do?', 'Как поступит безопасный ассистент?', 'Қауіпсіз көмекші не істейді?'),
      opts: [
        { id: 'tell', icon: 'pin', l: L('Find it and tell', 'Найти и сказать', 'Тауып айту'), why: L('That is private data — it must not be shared.', 'Это личные данные — их нельзя раскрывать.', 'Бұл жеке деректер — оларды ашуға болмайды.') },
        { id: 'refuse', icon: 'lock', ok: true, l: L('Politely decline', 'Вежливо отказать', 'Сыпайы бас тарту'), play: async m => { say(m, tr(L('Sorry, I can’t share private data', 'Извините, личные данные я не сообщаю', 'Кешіріңіз, жеке деректерді айтпаймын'))); await st(m).wait(0.5); } },
        { id: 'fake', icon: 'chat', l: L('Make one up', 'Выдумать адрес', 'Мекенжай ойдан шығару'), why: L('That is both harmful and a hallucination.', 'Это и вред, и галлюцинация.', 'Бұл әрі зиян, әрі галлюцинация.') },
      ],
      learn: L('A safe assistant is helpful but protects people and their privacy.', 'Безопасный ассистент помогает, но защищает людей и их личные данные.', 'Қауіпсіз көмекші көмектеседі, бірақ адамдар мен олардың жеке деректерін қорғайды.'),
      h: [L('Would the answer hurt someone?', 'Не навредит ли ответ кому-то?', 'Жауап біреуге зиян тигізбей ме?'), L('Addresses of people are private.', 'Адреса людей — личные данные.', 'Адамдардың мекенжайы — жеке дерек.')] },
  ],
  done: L('The Bayterek assistant is live: helpful, honest and safe. Astana is complete!', 'Ассистент Байтерека запущен: полезный, честный и безопасный. Астана построена!', 'Бәйтерек көмекшісі іске қосылды: пайдалы, адал әрі қауіпсіз. Астана салынды!'),
};

export const SPECS = [w1, w2, w3, w4, w5, w6, w7, w8, w9, w10];
