// Randomised "do it yourself" problems, two or three per district.
// A generator returns either a number problem { q, ans, tol, sol, hint:[a,b], fig }
// or a hands-on widget round { w, t, data, sol, hint } that reuses a mission widget.
import { GRAPH, BASE_W, setWeights, graphSVG } from './widgets.js';

const L = (en, ru, kk) => ({ en, ru, kk });
const sub = (s, v, lg) => s.replace(/\{(\w+)\}/g, (_, k) => { const x = v[k]; return x == null ? '' : typeof x === 'object' ? x[lg] : typeof x === 'number' && x < 0 ? `(−${-x})` : x; });
const X = (en, ru, kk) => v => L(sub(en, v, 'en'), sub(ru, v, 'ru'), sub(kk, v, 'kk'));
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;
const fmt = x => String(x).replace('.', ',');
const chips = (items, cls = '') => `<div class="dr-chips ${cls}">${items.map(c => `<span class="dr-chip ${c.c || ''}">${c.l ? `<i>${c.l}</i>` : ''}<b>${c.v}</b></span>`).join('')}</div>`;

// ---------- 1 · agents ----------
const d1 = [
  () => {
    const a = ri(3, 9), b = ri(12, 38), ans = 10 * a - b;
    return { q: X('Qadam’s performance measure: +10 for every cleared path, −1 for every step. Today he cleared {a} paths in {b} steps. What is his score?', 'Мера качества Qadam: +10 за каждую расчищенную дорожку, −1 за каждый шаг. Сегодня он расчистил {a} дорожек за {b} шагов. Сколько очков?', 'Qadam сапа өлшемі: әр тазаланған жол үшін +10, әр қадам үшін −1. Бүгін ол {b} қадаммен {a} жол тазалады. Неше ұпай?')({ a, b }),
      ans, sol: X('10 × {a} − {b} = {ans}. The measure judges the result, not how busy the robot looked.', '10 × {a} − {b} = {ans}. Мера качества оценивает результат, а не то, как старался робот.', '10 × {a} − {b} = {ans}. Сапа өлшемі нәтижені бағалайды.')({ a, b, ans }),
      hint: [X('Multiply the paths by 10, then subtract the steps.', 'Умножь дорожки на 10, потом вычти шаги.', 'Жолдарды 10-ға көбейт, сосын қадамдарды азайт.')({}), X('10 × {a} = {p}. Now subtract {b}.', '10 × {a} = {p}. Теперь вычти {b}.', '10 × {a} = {p}. Енді {b} азайт.')({ a, b, p: 10 * a })] };
  },
  () => {
    const th = ri(5, 9), v = Array.from({ length: 8 }, () => ri(1, 14)), ans = v.filter(x => x >= th).length;
    return { q: X('Reflex rule: IF snow ≥ {th} cm THEN plough. Here is the sensor log for 8 hours. How many times does Qadam plough?', 'Рефлекс-правило: ЕСЛИ снег ≥ {th} см, ТО чистить. Вот журнал датчика за 8 часов. Сколько раз Qadam будет чистить?', 'Рефлекс-ереже: ЕГЕР қар ≥ {th} см БОЛСА, тазала. Міне, датчиктің 8 сағаттық журналы. Qadam неше рет тазалайды?')({ th }),
      fig: chips(v.map((x, i) => ({ l: (9 + i) + ':00', v: x, c: x >= th ? 'hot' : '' }))),
      ans, sol: X('{n} readings are {th} cm or more, so {ans} times. A reflex agent reacts to the current reading only.', 'Показаний от {th} см и выше — {ans}. Рефлекс-агент смотрит только на текущее показание.', '{th} см және одан жоғары көрсеткіш — {ans}. Рефлекс-агент тек ағымдағы көрсеткішке қарайды.')({ th, ans, n: ans }),
      hint: [X('A reflex agent checks each hour on its own.', 'Рефлекс-агент проверяет каждый час отдельно.', 'Рефлекс-агент әр сағатты бөлек тексереді.')({}), X('Count the readings that are {th} or more.', 'Посчитай показания, которые не меньше {th}.', '{th}-дан кем емес көрсеткіштерді сана.')({ th })] };
  },
];

// ---------- 2 · search ----------
const NB = k => GRAPH.edges.filter(e => e[0] === k || e[1] === k).map(e => [e[0] === k ? e[1] : e[0], e[2]]);
function dijkstra() {
  const dist = { S: 0 }, prev = {}, done = new Set();
  while (true) {
    const u = Object.keys(dist).filter(k => !done.has(k)).sort((a, b) => dist[a] - dist[b])[0];
    if (!u || u === 'G') break; done.add(u);
    for (const [v, c] of NB(u)) if (dist[v] == null || dist[u] + c < dist[v]) { dist[v] = dist[u] + c; prev[v] = u; }
  }
  const p = ['G']; while (p[0] !== 'S') p.unshift(prev[p[0]]);
  return { cost: dist.G, path: p };
}
function randWeights() {
  for (let t = 0; t < 60; t++) {
    const w = GRAPH.edges.map(() => ri(1, 8)); setWeights(w);
    const best = dijkstra();
    const paths = [['S', 'C', 'A', 'G'], ['S', 'E', 'B', 'G'], ['S', 'C', 'E', 'B', 'G'], ['S', 'C', 'A', 'B', 'G']];
    const costs = paths.map(p => p.slice(1).reduce((s, k, i) => s + NB(p[i]).find(x => x[0] === k)[1], 0));
    if (costs.filter(c => c === best.cost).length === 1) return { w, best };
  }
  setWeights(BASE_W); return { w: BASE_W.slice(), best: dijkstra() };
}
const d2 = [
  () => {
    const { w, best } = randWeights(); setWeights(BASE_W);
    return { w: 'path', weights: w, t: X('New snowfall changed the road times. Tap the crossings to build the cheapest route from S to G.', 'Новый снег изменил время на дорогах. Нажимай на перекрёстки и построй самый дешёвый путь от S до G.', 'Жаңа қар жол уақытын өзгертті. Қиылыстарды басып, S-тен G-ға ең арзан жолды құр.')({}),
      data: { best: best.cost, bestPath: best.path, adj: L('Only a neighbouring crossing.', 'Только соседний перекрёсток.', 'Тек көрші қиылыс.') },
      sol: X('Cheapest: {p} = {c} min. UCS finds it by always growing the cheapest path so far.', 'Самый дешёвый: {p} = {c} мин. UCS находит его, всегда продлевая самый дешёвый путь.', 'Ең арзаны: {p} = {c} мин. UCS әрқашан ең арзан жолды жалғастырып табады.')({ p: best.path.join('→'), c: best.cost }),
      hint: [X('Compare whole routes, not single roads: a cheap first road can lead to an expensive one.', 'Сравнивай целые пути, а не отдельные дороги: дешёвая первая дорога может вести к дорогой.', 'Жеке жолды емес, толық маршрутты салыстыр.')({}), X('The answer costs {c} min.', 'Ответ стоит {c} мин.', 'Жауап {c} мин тұрады.')({ c: best.cost })] };
  },
  () => {
    const { w } = randWeights();
    const h = { S: ri(5, 9), C: ri(2, 8), E: ri(2, 8), A: ri(1, 6), B: ri(1, 6), G: 0 };
    let cur = 'S', path = ['S'], cost = 0;
    while (cur !== 'G') { const n = NB(cur).filter(x => !path.includes(x[0])).sort((a, b) => h[a[0]] - h[b[0]] || (a[0] < b[0] ? -1 : 1))[0]; path.push(n[0]); cost += n[1]; cur = n[0]; }
    const fig = graphSVG({}, { h }); setWeights(BASE_W);
    return { q: X('Greedy search always drives to the neighbour with the smallest h (the guess of the distance left). What does its route from S to G cost?', 'Жадный поиск всегда едет к соседу с наименьшим h (догадка, сколько осталось). Сколько стоит его путь от S до G?', 'Ашкөз іздеу әрқашан h-ы ең кіші көршіге барады. Оның S-тен G-ға дейінгі жолы қанша тұрады?')({}),
      fig, ans: cost, sol: X('Greedy: {p} = {c} min. It never looks at road costs while choosing, so it can miss the cheapest route.', 'Жадный: {p} = {c} мин. Выбирая, он не смотрит на стоимость дорог, поэтому может пропустить самый дешёвый путь.', 'Ашкөз: {p} = {c} мин. Таңдағанда жол құнына қарамайды.')({ p: path.join('→'), c: cost }),
      hint: [X('Choose only by h. Add the road costs after the route is done.', 'Выбирай только по h. Стоимость дорог сложи, когда путь готов.', 'Тек h бойынша таңда. Жол құнын соңында қос.')({}), X('Greedy’s first move: S → {n}.', 'Первый ход жадного: S → {n}.', 'Ашкөздің бірінші жүрісі: S → {n}.')({ n: path[1] })], weights: w };
  },
];

// ---------- 3 · local search, CSP ----------
const N5 = { 1: [60, 46], 2: [60, 154], 3: [160, 100], 4: [260, 154], 5: [260, 46] }, E5 = [[1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [4, 5], [3, 5]];
function climb(v, s) { let i = s; for (;;) { const nb = [i - 1, i + 1].filter(j => j >= 0 && j < v.length).sort((a, b) => v[b] - v[a])[0]; if (v[nb] > v[i]) i = nb; else return i; } }
const d3 = [
  () => {
    let v, s, stop;
    for (let t = 0; t < 200; t++) { v = Array.from({ length: 8 }, () => ri(1, 9)); s = ri(0, 7); stop = climb(v, s); if (stop !== s && Math.abs(stop - s) >= 2 && Math.max(...v) > v[stop]) break; }
    return { w: 'bars', t: X('Hill climbing: from the robot, step to the higher neighbour while there is one. Tap the plot where it stops.', 'Восхождение на холм: от робота шагай к более высокому соседу, пока такой есть. Нажми участок, где он остановится.', 'Төбеге өрмелеу: роботтан биігірек көршіге қадам бас. Ол тоқтайтын учаскені бас.')({}),
      data: { values: v, start: s, stop, wrong: L('Not there. Walk it plot by plot from the robot.', 'Не здесь. Пройди от робота по одному участку.', 'Бұл емес. Роботтан бір-бірлеп жүр.') },
      sol: X('It stops at plot {k} (value {x}) — no neighbour is higher. The best plot is {m}, but the climber never sees it: a local maximum.', 'Он остановится на участке {k} (значение {x}) — выше соседей нет. Лучший участок — {m}, но он его не видит: это локальный максимум.', 'Ол {k}-учаскеде тоқтайды ({x}). Ең жақсысы — {m}, бірақ ол көрмейді: жергілікті максимум.')({ k: stop + 1, x: v[stop], m: Math.max(...v) }),
      hint: [X('Look only at the two plots next to the robot each time.', 'Каждый раз смотри только на два соседних участка.', 'Әр жолы тек екі көрші учаскеге қара.')({}), X('First move: to plot {k}.', 'Первый шаг: на участок {k}.', 'Бірінші қадам: {k}-учаскеге.')({ k: [s - 1, s + 1].filter(j => j >= 0 && j < 8).sort((a, b) => v[b] - v[a])[0] + 1 })] };
  },
  () => {
    const c = {}; for (const k in N5) c[k] = ri(1, 3);
    const ans = E5.filter(([a, b]) => c[a] === c[b]).length;
    let fig = '<svg class="fig graph" viewBox="0 0 320 200" role="img">';
    for (const [a, b] of E5) fig += `<line class="g-edge ${c[a] === c[b] ? '' : ''}" x1="${N5[a][0]}" y1="${N5[a][1]}" x2="${N5[b][0]}" y2="${N5[b][1]}"/>`;
    for (const k in N5) fig += `<g class="g-node col${c[k]}"><circle cx="${N5[k][0]}" cy="${N5[k][1]}" r="22"/><text x="${N5[k][0]}" y="${N5[k][1] + 5}">${k}</text></g>`;
    fig += '</svg>';
    const bad = E5.filter(([a, b]) => c[a] === c[b]).map(e => e.join('–')).join(', ') || '—';
    return { q: X('Colour = bus line. Two zones joined by a road must not share a line. How many conflicts are on this map?', 'Цвет — автобусная линия. Две зоны, соединённые дорогой, не должны быть на одной линии. Сколько конфликтов на карте?', 'Түс — автобус желісі. Жолмен қосылған екі аймақ бір желіде болмауы керек. Картада неше қайшылық бар?')({}),
      fig, ans, sol: X('Conflicts: {b} → {ans}. A CSP checks every constraint (road), not every zone.', 'Конфликты: {b} → {ans}. CSP проверяет каждое ограничение (дорогу), а не каждую зону.', 'Қайшылықтар: {b} → {ans}. CSP әр шектеуді (жолды) тексереді.')({ b: bad, ans }),
      hint: [X('Check each of the 7 roads: are both ends the same colour?', 'Проверь каждую из 7 дорог: одинаковый ли цвет на концах?', '7 жолдың әрқайсысын тексер: екі ұшы бір түсті ме?')({}), X('Start with the roads of zone 3 — it has four.', 'Начни с дорог зоны 3 — у неё их четыре.', '3-аймақтың жолдарынан баста — оның төртеуі бар.')({})] };
  },
];

// ---------- 4 · games ----------
const d4 = [
  () => {
    let lv, mins;
    do { lv = Array.from({ length: 9 }, () => ri(1, 15)); mins = [0, 1, 2].map(j => Math.min(...lv.slice(j * 3, j * 3 + 3))); } while (new Set(mins).size < 3);
    const best = mins.indexOf(Math.max(...mins));
    return { w: 'tree', t: X('A new position. Play minimax yourself: tap the leaf each MIN chooses (left to right), then the MIN that MAX should pick.', 'Новая позиция. Сыграй минимакс сам: нажми лист, который выберет каждый MIN (слева направо), потом MIN, который должен взять MAX.', 'Жаңа позиция. Минимаксты өзің ойна: әр MIN таңдайтын жапырақты бас (солдан оңға), сосын MAX алатын MIN-ді.')({}),
      data: { leaves: lv, mode: 'minimax', mins, best, wrongMin: L('MIN takes the smallest number in its group.', 'MIN берёт самое маленькое число своей группы.', 'MIN өз тобындағы ең кіші санды алады.'), wrongMax: L('MAX takes the largest of the MIN values.', 'MAX берёт самое большое из значений MIN.', 'MAX MIN мәндерінің ең үлкенін алады.') },
      sol: X('MIN values: {a}. MAX picks {m}. Assume the opponent plays its best reply.', 'Значения MIN: {a}. MAX берёт {m}. Считаем, что соперник отвечает лучшим ходом.', 'MIN мәндері: {a}. MAX {m} алады. Қарсылас ең жақсы жауап береді деп санаймыз.')({ a: mins.join(', '), m: Math.max(...mins) }),
      hint: [X('Each MIN node keeps its smallest leaf.', 'Каждый MIN оставляет свой самый маленький лист.', 'Әр MIN ең кіші жапырағын қалдырады.')({}), X('The MIN values are {a}.', 'Значения MIN: {a}.', 'MIN мәндері: {a}.')({ a: mins.join(', ') })] };
  },
  () => {
    const p = pick([20, 25, 40, 50, 60, 75, 80]), a = pick([40, 60, 80, 100, 120]), b = pick([0, 20, 40]), ans = r1(p / 100 * a + (1 - p / 100) * b);
    return { q: X('A risky move wins {a} kumalaks with a {p}% chance, otherwise only {b}. What is its expected value?', 'Рискованный ход приносит {a} құмалақ с шансом {p} %, иначе только {b}. Каково его ожидаемое значение?', 'Тәуекелді жүріс {p} % мүмкіндікпен {a} құмалақ, әйтпесе тек {b} береді. Оның күтілетін мәні қандай?')({ a, b, p }),
      ans, tol: 0.05, sol: X('{p}% × {a} + {q}% × {b} = {ans}. Expectimax averages the outcomes of chance, weighted by probability.', '{p} % × {a} + {q} % × {b} = {ans}. Expectimax усредняет исходы случая с весами-вероятностями.', '{p} % × {a} + {q} % × {b} = {ans}. Expectimax кездейсоқ нәтижелерді ықтималдықпен орташалайды.')({ p, q: 100 - p, a, b, ans: fmt(ans) }),
      hint: [X('Expected value = chance × win + (1 − chance) × other result.', 'Ожидание = шанс × выигрыш + (1 − шанс) × другой исход.', 'Күтілетін мән = мүмкіндік × ұтыс + (1 − мүмкіндік) × басқа нәтиже.')({}), X('{p}% of {a} is {x}.', '{p} % от {a} — это {x}.', '{a}-дың {p} %-ы — {x}.')({ p, a, x: fmt(r1(p / 100 * a)) })] };
  },
];

// ---------- 5 · reinforcement learning ----------
const d5 = [
  () => {
    const r1_ = ri(-3, 8), r2_ = 2 * ri(-2, 5), r3_ = 4 * ri(-1, 4), ans = r1_ + r2_ / 2 + r3_ / 4;
    return { q: X('The light expects rewards {a}, {b}, {c} over the next three steps. Discount γ = 0.5. What is the discounted return G?', 'Светофор ждёт награды {a}, {b}, {c} за следующие три шага. Дисконт γ = 0,5. Чему равна дисконтированная отдача G?', 'Бағдаршам келесі үш қадамда {a}, {b}, {c} сыйақы күтеді. γ = 0,5. Дисконтталған қайтарым G неге тең?')({ a: r1_, b: r2_, c: r3_ }),
      ans, sol: X('G = {a} + 0.5 × {b} + 0.25 × {c} = {ans}. Later rewards count less.', 'G = {a} + 0,5 × {b} + 0,25 × {c} = {ans}. Чем позже награда, тем меньше она весит.', 'G = {a} + 0,5 × {b} + 0,25 × {c} = {ans}. Кейінгі сыйақы азырақ есептеледі.')({ a: r1_, b: r2_, c: r3_, ans }),
      hint: [X('G = r1 + γ·r2 + γ²·r3, and γ² = 0.25.', 'G = r1 + γ·r2 + γ²·r3, а γ² = 0,25.', 'G = r1 + γ·r2 + γ²·r3, ал γ² = 0,25.')({}), X('0.5 × {b} = {x}; 0.25 × {c} = {y}.', '0,5 × {b} = {x}; 0,25 × {c} = {y}.', '0,5 × {b} = {x}; 0,25 × {c} = {y}.')({ b: r2_, c: r3_, x: r2_ / 2, y: r3_ / 4 })] };
  },
  () => {
    const q = ri(0, 8), r = ri(-4, 6), m = 2 * ri(0, 5), ans = r1(q + 0.5 * (r + 0.5 * m - q));
    return { q: X('Q-learning, α = 0.5, γ = 0.5. Now Q(s,a) = {q}. The light got reward {r}, and the best Q in the next state is {m}. What is the new Q(s,a)?', 'Q-обучение, α = 0,5, γ = 0,5. Сейчас Q(s,a) = {q}. Светофор получил награду {r}, а лучшее Q в следующем состоянии — {m}. Каким станет Q(s,a)?', 'Q-оқыту, α = 0,5, γ = 0,5. Қазір Q(s,a) = {q}. Сыйақы {r}, келесі күйдегі ең үлкен Q — {m}. Жаңа Q(s,a) қандай?')({ q, r, m }),
      ans, tol: 0.05, sol: X('target = {r} + 0.5 × {m} = {t}; Q = {q} + 0.5 × ({t} − {q}) = {ans}. Q moves halfway towards the target.', 'цель = {r} + 0,5 × {m} = {t}; Q = {q} + 0,5 × ({t} − {q}) = {ans}. Q сдвигается на полпути к цели.', 'мақсат = {r} + 0,5 × {m} = {t}; Q = {q} + 0,5 × ({t} − {q}) = {ans}. Q мақсатқа жарты жол жылжиды.')({ r, m, q, t: r + m / 2, ans: fmt(ans) }),
      hint: [X('Target = r + γ × best next Q. Then Q ← Q + α × (target − Q).', 'Цель = r + γ × лучшее следующее Q. Потом Q ← Q + α × (цель − Q).', 'Мақсат = r + γ × келесі ең жақсы Q. Сосын Q ← Q + α × (мақсат − Q).')({}), X('The target is {t}.', 'Цель равна {t}.', 'Мақсат — {t}.')({ t: r + m / 2 })] };
  },
];

// ---------- 6 · probability ----------
const d6 = [
  () => {
    const B = pick([20, 30, 40]), sb = B - ri(1, 5), calm = 200 - B, sc = ri(2, 9) * 5, ans = Math.round(100 * sb / (sb + sc));
    return { q: X('In 200 winter days there were {B} blizzards. The sensor fired on {sb} blizzard days and on {sc} calm days. Today it fired. Chance of a blizzard, in %?', 'За 200 зимних дней было {B} буранов. Датчик сработал в {sb} буранных днях и в {sc} спокойных. Сегодня он сработал. Шанс бурана, в %?', '200 қыс күнінде {B} боран болды. Датчик {sb} боранды және {sc} тыныш күні қосылды. Бүгін қосылды. Боран мүмкіндігі, %?')({ B, sb, sc }),
      fig: tr => chips([{ l: tr(L('blizzard + signal', 'буран + сигнал', 'боран + сигнал')), v: sb, c: 'hot' }, { l: tr(L('calm + signal', 'спокойно + сигнал', 'тыныш + сигнал')), v: sc }]),
      pct: true, ans, tol: 1, sol: X('{sb} / ({sb} + {sc}) ≈ {ans}%. Bayes: look only at the days when the sensor fired.', '{sb} / ({sb} + {sc}) ≈ {ans} %. Байес: смотрим только на дни, когда датчик сработал.', '{sb} / ({sb} + {sc}) ≈ {ans} %. Байес: тек датчик қосылған күндерге қараймыз.')({ sb, sc, ans }),
      hint: [X('Ignore days without a signal. Of the signal days, what share were blizzards?', 'Забудь дни без сигнала. Какая доля дней с сигналом — буранные?', 'Сигналсыз күндерді елеме. Сигналды күндердің қаншасы боранды?')({}), X('Signal days: {sb} + {sc} = {n}.', 'Дней с сигналом: {sb} + {sc} = {n}.', 'Сигналды күндер: {sb} + {sc} = {n}.')({ sb, sc, n: sb + sc })]};
  },
  () => {
    const p = pick([10, 20, 30]), s = pick([80, 90]), f = pick([10, 20, 30]), x = p * s / 100, y = (100 - p) * f / 100, ans = Math.round(100 * x / (x + y));
    return { q: X('Blizzards happen on {p}% of days. The sensor fires on {s}% of blizzard days and on {f}% of calm days. It fired. Chance of a blizzard, in %?', 'Бураны бывают в {p} % дней. Датчик срабатывает в {s} % буранных и в {f} % спокойных дней. Он сработал. Шанс бурана, в %?', 'Боран күндердің {p} %-ында болады. Датчик боранды күндердің {s} %-ында, тыныштардың {f} %-ында қосылады. Ол қосылды. Боран мүмкіндігі, %?')({ p, s, f }),
      pct: true, ans, tol: 1, sol: X('Of 100 days: {x} blizzard + signal, {y} calm + signal. {x} / ({x} + {y}) ≈ {ans}%.', 'Из 100 дней: {x} — буран и сигнал, {y} — спокойно и сигнал. {x} / ({x} + {y}) ≈ {ans} %.', '100 күннен: {x} — боран мен сигнал, {y} — тыныш пен сигнал. {x} / ({x} + {y}) ≈ {ans} %.')({ x: fmt(x), y: fmt(y), ans }),
      hint: [X('Imagine 100 days and count the signal days of each kind.', 'Представь 100 дней и посчитай дни с сигналом каждого вида.', '100 күнді елестетіп, әр түрдегі сигналды күндерді сана.')({}), X('Blizzard and signal: {p}% × {s}% = {x} days of 100.', 'Буран и сигнал: {p} % × {s} % = {x} дней из 100.', 'Боран мен сигнал: {p} % × {s} % = 100-ден {x} күн.')({ p, s, x: fmt(x) })] };
  },
];

// ---------- 7 · HMM ----------
const d7 = [
  () => {
    const a = ri(2, 8) * 10, s = pick([60, 70, 80, 90]), ans = Math.round(a * s / 100 + (100 - a) * (100 - s) / 100);
    return { q: X('Two stops, A and B. Now P(bus at A) = {a}%. Each minute the bus stays where it is with {s}% chance, otherwise it moves to the other stop. P(A) one minute later, in %?', 'Две остановки, A и B. Сейчас P(автобус у A) = {a} %. Каждую минуту автобус остаётся на месте с шансом {s} %, иначе едет на другую остановку. P(A) через минуту, в %?', 'Екі аялдама, A және B. Қазір P(автобус A-да) = {a} %. Әр минут автобус {s} % мүмкіндікпен орнында қалады, әйтпесе басқа аялдамаға кетеді. Бір минуттан кейін P(A), %?')({ a, s }),
      pct: true, ans, tol: 1, sol: X('{a}% × {s}% (stays at A) + {b}% × {t}% (comes from B) = {ans}%. Prediction blurs the belief.', '{a} % × {s} % (остался у A) + {b} % × {t} % (приехал из B) = {ans} %. Прогноз размывает уверенность.', '{a} % × {s} % (A-да қалды) + {b} % × {t} % (B-дан келді) = {ans} %. Болжам сенімділікті азайтады.')({ a, s, b: 100 - a, t: 100 - s, ans }),
      hint: [X('Two ways to be at A: it was at A and stayed, or it was at B and moved.', 'Два способа оказаться у A: был у A и остался, или был у B и приехал.', 'A-да болудың екі жолы: A-да болып қалды, не B-дан келді.')({}), X('Stayed at A: {x}%.', 'Остался у A: {x} %.', 'A-да қалды: {x} %.')({ x: a * s / 100 })] };
  },
  () => {
    const a = ri(2, 8) * 10, c = pick([70, 80, 90]), x = a * c, y = (100 - a) * (100 - c), ans = Math.round(100 * x / (x + y));
    return { q: X('P(bus at A) = {a}%. The GPS says “A”. The GPS is right {c}% of the time. What is P(A) now, in %?', 'P(автобус у A) = {a} %. GPS говорит «A». GPS прав в {c} % случаев. Чему теперь равна P(A), в %?', 'P(автобус A-да) = {a} %. GPS «A» дейді. GPS {c} % жағдайда дұрыс. Енді P(A) қандай, %?')({ a, c }),
      pct: true, ans, tol: 1, sol: X('{a} × {c} vs {b} × {d} → {x} / ({x} + {y}) ≈ {ans}%. The update step sharpens the belief.', '{a} × {c} против {b} × {d} → {x} / ({x} + {y}) ≈ {ans} %. Шаг обновления делает уверенность точнее.', '{a} × {c} мен {b} × {d} → {x} / ({x} + {y}) ≈ {ans} %. Жаңарту қадамы сенімділікті нақтылайды.')({ a, c, b: 100 - a, d: 100 - c, x, y, ans }),
      hint: [X('Weigh each stop by how well it explains the GPS reading, then normalise.', 'Взвесь каждую остановку тем, насколько она объясняет показание GPS, потом нормируй.', 'Әр аялдаманы GPS көрсеткішін қаншалықты түсіндіретініне қарай өлше, сосын қалыпта.')({}), X('A: {a} × {c} = {x}. B: {b} × {d} = {y}.', 'A: {a} × {c} = {x}. B: {b} × {d} = {y}.', 'A: {a} × {c} = {x}. B: {b} × {d} = {y}.')({ a, c, b: 100 - a, d: 100 - c, x, y })] };
  },
];

// ---------- 8 · decisions, ML ----------
const d8 = [
  () => {
    const p = ri(1, 9) * 10, D = pick([20, 30, 40, 50, 60, 80, 100]), C = pick([10, 15, 20, 25, 30]), ans = p * D / 100;
    return { q: X('Snow is {p}% likely. If the plough stays home, snow damage costs {D}. A trip costs {C}. What is the expected cost of NOT sending the plough?', 'Снег с вероятностью {p} %. Если снегоуборщик не выедет, ущерб от снега — {D}. Выезд стоит {C}. Какова ожидаемая цена того, чтобы НЕ выводить снегоуборщик?', 'Қар {p} % ықтимал. Тазалағыш шықпаса, зиян {D}. Шығу {C} тұрады. Тазалағышты ШЫҒАРМАУДЫҢ күтілетін құны қандай?')({ p, D, C }),
      ans, sol: X('{p}% × {D} = {ans}. The trip costs {C}, so the cheaper choice is to {d}.', '{p} % × {D} = {ans}. Выезд стоит {C}, поэтому выгоднее {d}.', '{p} % × {D} = {ans}. Шығу {C} тұрады, сондықтан {d} тиімдірек.')({ p, D, ans, C, d: ans > C ? L('send it', 'выехать', 'шығу') : L('stay at home', 'не выезжать', 'шықпау') }),
      hint: [X('Expected cost = chance × damage.', 'Ожидаемая цена = шанс × ущерб.', 'Күтілетін құн = мүмкіндік × зиян.')({}), X('{p}% of {D}.', '{p} % от {D}.', '{D}-дың {p} %-ы.')({ p, D })] };
  },
  () => {
    const t = pick([0.5, 0.6, 0.7]);
    const mail = shuffle(Array.from({ length: 8 }, (_, i) => { const spam = i < 4; return { s: spam ? r2(ri(35, 97) / 100) : r2(ri(3, 75) / 100), spam }; }));
    const ans = mail.filter(m => (m.s >= t) !== m.spam).length;
    return { q: X('Letters with a spam score ≥ {t} go to Spam. Red letters really are spam. How many letters end up in the wrong folder?', 'Письма со спам-баллом ≥ {t} уходят в «Спам». Красные письма — действительно спам. Сколько писем попадёт не в ту папку?', 'Спам балы ≥ {t} хаттар «Спамға» кетеді. Қызыл хаттар шынымен спам. Неше хат қате қалтаға түседі?')({ t: fmt(t) }),
      fig: chips(mail.map(m => ({ v: fmt(m.s), c: m.spam ? 'hot' : '' }))),
      ans, sol: X('Wrong: spam below {t} plus normal letters at {t} or above = {ans}. The threshold trades one kind of error for the other.', 'Ошибки: спам ниже {t} плюс обычные письма от {t} и выше = {ans}. Порог меняет одни ошибки на другие.', 'Қателер: {t}-дан төмен спам және {t}-дан жоғары қалыпты хаттар = {ans}. Шек бір қатені екіншісіне айырбастайды.')({ t: fmt(t), ans }),
      hint: [X('Two kinds of mistakes: red below {t}, grey at {t} or above.', 'Два вида ошибок: красные ниже {t} и серые от {t} и выше.', 'Екі түрлі қате: {t}-дан төмен қызыл, {t}-дан жоғары сұр.')({ t: fmt(t) }), X('Red below {t}: {a}.', 'Красных ниже {t}: {a}.', '{t}-дан төмен қызыл: {a}.')({ t: fmt(t), a: mail.filter(m => m.spam && m.s < t).length })] };
  },
];

// ---------- 9 · neural networks ----------
const d9 = [
  () => {
    const w1 = ri(-3, 3) || 2, w2 = ri(-3, 3) || -1, b = ri(-3, 3), x1 = ri(0, 2), x2 = ri(0, 2), z = w1 * x1 + w2 * x2 + b;
    return { q: X('A window neuron: weights w₁ = {w1}, w₂ = {w2}, bias b = {b}. Inputs: darkness x₁ = {x1}, people at home x₂ = {x2}. Weighted sum z = ?', 'Нейрон окна: веса w₁ = {w1}, w₂ = {w2}, смещение b = {b}. Входы: темнота x₁ = {x1}, людей дома x₂ = {x2}. Взвешенная сумма z = ?', 'Терезе нейроны: w₁ = {w1}, w₂ = {w2}, ығысу b = {b}. Кірістер: қараңғылық x₁ = {x1}, үйдегі адам x₂ = {x2}. Салмақталған қосынды z = ?')({ w1, w2, b, x1, x2 }),
      ans: z, sol: X('z = {w1}×{x1} + {w2}×{x2} + {b} = {z}. The window lights if z > 0: {o}.', 'z = {w1}×{x1} + {w2}×{x2} + {b} = {z}. Окно горит, если z > 0: {o}.', 'z = {w1}×{x1} + {w2}×{x2} + {b} = {z}. z > 0 болса терезе жанады: {o}.')({ w1, w2, b, x1, x2, z, o: z > 0 ? L('on', 'горит', 'жанады') : L('off', 'не горит', 'жанбайды') }),
      hint: [X('Multiply each input by its weight, add them up, add the bias.', 'Умножь каждый вход на его вес, сложи и прибавь смещение.', 'Әр кірісті салмағына көбейтіп, қосып, ығысуды қос.')({}), X('{w1}×{x1} = {a}; {w2}×{x2} = {c}.', '{w1}×{x1} = {a}; {w2}×{x2} = {c}.', '{w1}×{x1} = {a}; {w2}×{x2} = {c}.')({ w1, x1, w2, x2, a: w1 * x1, c: w2 * x2 })] };
  },
  () => {
    const w = r1(ri(2, 15) / 10), g = pick([-3, -2, -1, 1, 2, 3, 4, -4]), ans = r2(w - 0.1 * g);
    return { q: X('Gradient descent, learning rate η = 0.1. Weight w = {w}, the gradient of the error is {g}. What is the new weight?', 'Градиентный спуск, шаг обучения η = 0,1. Вес w = {w}, градиент ошибки равен {g}. Каким станет вес?', 'Градиенттік түсу, η = 0,1. Салмақ w = {w}, қате градиенті {g}. Жаңа салмақ қандай?')({ w: fmt(w), g }),
      ans, tol: 0.01, sol: X('w − η × g = {w} − 0.1 × {g} = {ans}. Step against the gradient to lower the error.', 'w − η × g = {w} − 0,1 × {g} = {ans}. Шагаем против градиента, чтобы ошибка уменьшилась.', 'w − η × g = {w} − 0,1 × {g} = {ans}. Қате азаюы үшін градиентке қарсы жүреміз.')({ w: fmt(w), g, ans: fmt(ans) }),
      hint: [X('New w = w − η × gradient.', 'Новый w = w − η × градиент.', 'Жаңа w = w − η × градиент.')({}), X('0.1 × {g} = {x}.', '0,1 × {g} = {x}.', '0,1 × {g} = {x}.')({ g, x: fmt(r1(0.1 * g)) })] };
  },
];

// ---------- 10 · LLMs ----------
const WORDS = ['Bayterek', 'EXPO', 'Khan Shatyr', 'Akorda', 'Mega'];
function probs() { for (;;) { const a = [ri(25, 45), ri(15, 30), ri(8, 20), ri(4, 12)]; const s = a.reduce((x, y) => x + y, 0); if (s < 96) { a.push(100 - s); a.sort((x, y) => y - x); if (new Set(a).size === 5) return a; } } }
const d10 = [
  () => {
    const pr = probs(), p = pick([60, 70, 80, 90]); let c = 0, k = 0; while (c < p) c += pr[k++];
    return { q: X('Next-word probabilities of the city assistant are below. With top-p = {p}%, it keeps the most likely words until they add up to {p}%. How many words stay?', 'Ниже вероятности следующего слова у ассистента. При top-p = {p} % он оставляет самые вероятные слова, пока их сумма не достигнет {p} %. Сколько слов останется?', 'Төменде келесі сөз ықтималдықтары. top-p = {p} % болғанда ол ең ықтимал сөздерді қосындысы {p} %-ға жеткенше қалдырады. Неше сөз қалады?')({ p }),
      fig: chips(pr.map((x, i) => ({ l: WORDS[i], v: x + ' %' }))),
      ans: k, sol: X('{s} — {k} words reach {p}%. The model samples only among them.', '{s} — {k} слов(а) дают {p} %. Модель выбирает только среди них.', '{s} — {k} сөз {p} %-ға жетеді. Модель тек солардың ішінен таңдайды.')({ s: pr.slice(0, k).join(' + ') + ' = ' + pr.slice(0, k).reduce((x, y) => x + y, 0) + ' %', k, p }),
      hint: [X('Add from the top: first, first + second, …', 'Складывай сверху: первое, первое + второе, …', 'Жоғарыдан қос: біріншісі, бірінші + екінші, …')({}), X('After two words: {x}%.', 'После двух слов: {x} %.', 'Екі сөзден кейін: {x} %.')({ x: pr[0] + pr[1] })] };
  },
  () => {
    const pr = probs(), k = pick([2, 3]), ans = pr.slice(0, k).reduce((x, y) => x + y, 0);
    return { q: X('With top-k = {k}, the assistant keeps only the {k} most likely words. What total probability, in %, do they cover?', 'При top-k = {k} ассистент оставляет только {k} самых вероятных слова. Какую общую вероятность, в %, они покрывают?', 'top-k = {k} болғанда көмекші тек {k} ең ықтимал сөзді қалдырады. Олар жалпы қанша ықтималдықты, %, қамтиды?')({ k }),
      fig: chips(pr.map((x, i) => ({ l: WORDS[i], v: x + ' %' }))),
      pct: true, ans, sol: X('{s} = {ans}%. The other {r}% of words can never be said.', '{s} = {ans} %. Остальные {r} % слов модель уже не скажет.', '{s} = {ans} %. Қалған {r} % сөзді модель айтпайды.')({ s: pr.slice(0, k).join(' + '), ans, r: 100 - ans }),
      hint: [X('Take the {k} biggest numbers.', 'Возьми {k} самых больших числа.', '{k} ең үлкен санды ал.')({ k }), X('The largest is {x}%.', 'Самое большое — {x} %.', 'Ең үлкені — {x} %.')({ x: pr[0] })] };
  },
];

export const DRILLS = [d1, d2, d3, d4, d5, d6, d7, d8, d9, d10];
