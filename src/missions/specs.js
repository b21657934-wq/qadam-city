import { M1, S, tr } from '../i18n.js';
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
    m.app.rig.flyTo({ target: [-5.1, 0.5, -0.9], zoom: innerWidth < innerHeight ? 0.34 : 0.42, az: -0.25, pol: 0.9 }, 1.5);
  },
  sim: m => new Yard(m),
  onPick(m, o) {
    const c = m.city;
    if (o.id === 'camera') { m.sim.seeing = true; m.app.qadam.cone.visible = true; c.stationShow('mast'); c.stationShow('anemo'); c.stationShow('thermo'); c.stationShow('streets'); }
    if (o.id === 'lamps') { c.yardLampsOn(true); c.stationShow('siren'); c.stationShow('board'); c.stationShow('weather'); m.app.snow.blow(); }
    if (o.id === 'score') { c.stationShow('gauge'); c.stationShow('early'); c.stationShow('brain'); [0, 1, 2].forEach(i => c.led(i)); c.wave(-5.6, -3.4); }
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

// ---------- Week 2 — Roads: BFS, UCS, A* ----------
const w2 = {
  steps: [
    { kind: 'widget', w: 'bfs', t: L('Breadth-first search', 'Поиск в ширину', 'Енінен іздеу'),
      i: L('Tap the crossings in the order BFS expands them, from S to the depot G.', 'Нажимай на перекрёстки в том порядке, в каком BFS их раскрывает: от S до склада G.', 'BFS ашатын ретпен қиылыстарды бас: S-тен G қоймасына дейін.'),
      data: { order: ['S', 'C', 'E', 'A', 'B', 'G'], wrong: L('BFS finishes a whole level before going deeper.', 'BFS сначала раскрывает весь уровень, потом идёт глубже.', 'BFS алдымен бүкіл деңгейді ашады, сосын тереңдейді.') },
      okText: L('S → C → E → A → B → G: level by level, like ripples on water.', 'S → C → E → A → B → G: уровень за уровнем, как круги на воде.', 'S → C → E → A → B → G: деңгей-деңгейімен, судағы толқын сияқты.'),
      h: [L('Start with S, then every neighbour of S.', 'Начни с S, затем все соседи S.', 'S-тен баста, сосын S-тің барлық көршілері.'), L('Ties go in alphabetical order: C before E, A before B.', 'При равенстве — по алфавиту: C раньше E, A раньше B.', 'Тең болса — әліпби бойынша: C E-ден бұрын, A B-дан бұрын.')] },
    { kind: 'widget', w: 'path', t: L('Cheapest delivery route', 'Самый дешёвый маршрут', 'Ең арзан жеткізу жолы'),
      i: L('Numbers are travel minutes. Build the route from S to G that uniform-cost search would return.', 'Числа — минуты в пути. Проложи от S до G маршрут, который вернёт поиск по стоимости (UCS).', 'Сандар — жолдағы минуттар. Құн бойынша іздеу (UCS) қайтаратын S-тен G-ге жолды құр.'),
      data: { best: 9, adj: L('Pick a crossing connected to the last one.', 'Выбери перекрёсток, соединённый с последним.', 'Соңғысымен жалғанған қиылысты таңда.') },
      okText: L('9 minutes: S → C → E → B → G. More turns, but cheaper.', '9 минут: S → C → E → B → G. Поворотов больше, зато дешевле.', '9 минут: S → C → E → B → G. Бұрылыс көп, бірақ арзан.'),
      h: [L('UCS always grows the cheapest route found so far.', 'UCS всегда продолжает самый дешёвый из найденных маршрутов.', 'UCS әрқашан осы уақытқа дейінгі ең арзан жолды жалғастырады.'), L('The best route avoids both the 5 and the 6.', 'Лучший маршрут обходит и 5, и 6.', 'Ең жақсы жол 5-ті де, 6-ны да айналып өтеді.')] },
    { kind: 'quiz', fig: 'astar', t: L('A* search', 'Поиск A*', 'A* іздеу'),
      qs: [
        { q: L('A* expands the smallest f = g + h. Frontier: C (g = 2) and E (g = 5). Which is next?', 'A* раскрывает узел с наименьшим f = g + h. На границе C (g = 2) и E (g = 5). Какой следующий?', 'A* ең кіші f = g + h түйінін ашады. Шекарада C (g = 2) және E (g = 5). Келесісі қайсы?'),
          a: [L('C, f = 8', 'C, f = 8', 'C, f = 8'), L('E, f = 9', 'E, f = 9', 'E, f = 9')], ok: 0 },
        { q: L('A* with this h is guaranteed to find the cheapest route because h…', 'A* с этой h гарантированно найдёт самый дешёвый путь, потому что h…', 'Осы h-пен A* ең арзан жолды міндетті түрде табады, себебі h…'),
          a: [L('never overestimates the real cost', 'никогда не завышает реальную стоимость', 'нақты құнды ешқашан асырмайды'), L('is always larger than the real cost', 'всегда больше реальной стоимости', 'әрқашан нақты құннан үлкен')], ok: 0 },
      ],
      h: [L('Add g and h for each node, then compare.', 'Сложи g и h для каждого узла и сравни.', 'Әр түйін үшін g мен h-ты қосып, салыстыр.'), L('f(C) = 2 + 6, f(E) = 5 + 4. Admissible means “optimistic”.', 'f(C) = 2 + 6, f(E) = 5 + 4. Допустимая — значит «оптимистичная».', 'f(C) = 2 + 6, f(E) = 5 + 4. Жол берілетін — «оптимист» деген сөз.')] },
  ],
  done: L('The roads are open. UCS and A* found the 9-minute delivery route.', 'Дороги открыты. UCS и A* нашли маршрут доставки за 9 минут.', 'Жолдар ашық. UCS пен A* 9 минуттық жеткізу жолын тапты.'),
};

// ---------- Week 3 — Local search & CSP ----------
const w3 = {
  steps: [
    { kind: 'widget', w: 'bars', t: L('Hill climbing', 'Восхождение на холм', 'Төбеге өрмелеу'),
      i: L('Each bar is how good a building spot is. Qadam starts at spot 1 and moves to a better neighbour while it can. Tap where it stops.', 'Столбик — насколько хорош участок. Qadam начинает с участка 1 и идёт к лучшему соседу, пока может. Нажми, где он остановится.', 'Әр баған — учаскенің қаншалықты жақсы екені. Qadam 1-учаскеден бастап, мүмкін болғанша жақсырақ көршіге жүреді. Ол тоқтайтын жерді бас.'),
      data: { values: [3, 5, 4, 6, 8, 7, 5, 9], start: 0, stop: 1, wrong: L('Hill climbing only looks at the two neighbours.', 'Восхождение смотрит только на двух соседей.', 'Өрмелеу тек екі көршіге қарайды.') },
      okText: L('Stuck at 5 — a local maximum. Simulated annealing sometimes accepts a worse move to escape.', 'Застрял на 5 — локальный максимум. Имитация отжига иногда принимает худший шаг, чтобы выбраться.', '5-те тұрып қалды — жергілікті максимум. Күйдіруді имитациялау кейде нашар қадамды қабылдап, шығып кетеді.'),
      h: [L('From each spot, compare only left and right.', 'С каждого участка сравнивай только левого и правого соседа.', 'Әр учаскеден тек сол және оң көршіні салыстыр.'), L('At spot 2 both neighbours are lower, even though 9 exists far away.', 'На участке 2 оба соседа ниже, хотя далеко есть 9.', '2-учаскеде екі көрші де төмен, алыста 9 болса да.')] },
    { kind: 'widget', w: 'color', t: L('Bus lines without conflicts', 'Автобусы без конфликтов', 'Қайшылықсыз автобустар'),
      i: L('Tap a zone to give it bus line 1, 2 or 3. Zones joined by a road must use different lines.', 'Нажимай на зону, чтобы дать ей линию 1, 2 или 3. Зоны, соединённые дорогой, должны быть на разных линиях.', 'Аймаққа 1, 2 немесе 3-желіні беру үшін оны бас. Жолмен жалғанған аймақтар әртүрлі желіде болуы керек.'),
      data: { nodes: { 1: [60, 50], 2: [60, 150], 3: [160, 100], 4: [260, 150], 5: [260, 50] }, edges: [[1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [4, 5], [3, 5]] },
      okText: L('Every constraint is satisfied — a valid assignment.', 'Все ограничения выполнены — допустимое назначение.', 'Барлық шектеу орындалды — жарамды тағайындау.'),
      h: [L('Start with the zone that touches the most others.', 'Начни с зоны, у которой больше всего соседей.', 'Көршісі ең көп аймақтан баста.'), L('Zone 3 touches four zones. Colour it first, then 2 and 4.', 'Зона 3 касается четырёх зон. Раскрась её первой, затем 2 и 4.', '3-аймақ төрт аймаққа тиеді. Алдымен соны боя, сосын 2 мен 4-ті.')] },
    { kind: 'quiz', t: L('Choosing smart', 'Умный выбор', 'Ақылды таңдау'),
      qs: [
        { q: L('Backtracking picks the variable with the fewest legal values left. This heuristic is…', 'Перебор с возвратом выбирает переменную с наименьшим числом допустимых значений. Эта эвристика —', 'Шегініспен іздеу рұқсат етілген мәні ең аз айнымалыны таңдайды. Бұл эвристика —'),
          a: [L('MRV', 'MRV', 'MRV'), L('Least constraining value', 'Наименее ограничивающее значение', 'Ең аз шектейтін мән'), L('Random order', 'Случайный порядок', 'Кездейсоқ рет')], ok: 0 },
        { q: L('At a high temperature, simulated annealing…', 'При высокой температуре имитация отжига…', 'Жоғары температурада күйдіруді имитациялау…'),
          a: [L('often accepts worse moves', 'часто принимает худшие шаги', 'нашар қадамдарды жиі қабылдайды'), L('never accepts worse moves', 'никогда не принимает худшие шаги', 'нашар қадамды ешқашан қабылдамайды')], ok: 0 },
      ],
      h: [L('MRV = “minimum remaining values”.', 'MRV — «минимум оставшихся значений».', 'MRV — «қалған мәндердің ең азы».'), L('Temperature controls how much randomness is allowed.', 'Температура задаёт, сколько случайности допускается.', 'Температура қаншалықты кездейсоқтыққа рұқсат етілетінін анықтайды.')] },
  ],
  done: L('New blocks are placed and the bus lines never clash.', 'Новые дома расставлены, и автобусные линии больше не конфликтуют.', 'Жаңа үйлер орналасты, автобус желілері енді қайшыласпайды.'),
};

// ---------- Week 4 — Games ----------
const w4 = {
  steps: [
    { kind: 'widget', w: 'tree', t: L('Minimax', 'Minimax', 'Minimax'),
      i: L('Leaves are kumalak you win in toguz kumalak. For each MIN node tap the leaf the robot picks, then tap the move you choose at MAX.', 'Листья — құмалақ, которые ты выиграешь в тоғыз құмалақ. Для каждого узла MIN нажми лист, который выберет робот, затем свой ход в MAX.', 'Жапырақтар — тоғыз құмалақта ұтатын құмалақтар. Әр MIN түйіні үшін робот таңдайтын жапырақты, сосын MAX-та өз жүрісіңді бас.'),
      data: { mode: 'minimax', leaves: [3, 12, 8, 2, 4, 6, 14, 5, 2], wrongMin: L('The robot plays MIN: it leaves you as little as possible.', 'Робот играет за MIN: оставляет тебе как можно меньше.', 'Робот MIN үшін ойнайды: саған мүмкіндігінше аз қалдырады.'), wrongMax: L('At MAX you take the largest of the MIN values.', 'В MAX ты берёшь наибольшее из значений MIN.', 'MAX-та сен MIN мәндерінің ең үлкенін аласың.') },
      okText: L('Minimax value 3: the left move is safest against a perfect opponent.', 'Значение minimax — 3: левый ход надёжнее всего против идеального соперника.', 'Minimax мәні — 3: мінсіз қарсыласқа қарсы сол жақ жүріс ең сенімді.'),
      h: [L('The robot is the opponent — it minimises your score.', 'Робот — соперник, он минимизирует твой счёт.', 'Робот — қарсылас, ол сенің ұпайыңды азайтады.'), L('MIN values are 3, 2 and 2. Now choose at MAX.', 'Значения MIN: 3, 2 и 2. Теперь выбери в MAX.', 'MIN мәндері: 3, 2 және 2. Енді MAX-та таңда.')] },
    { kind: 'widget', w: 'tree', t: L('Alpha-beta pruning', 'Альфа-бета отсечение', 'Альфа-бета кесу'),
      i: L('Search left to right. Tap every leaf alpha-beta never needs to look at, then check.', 'Обход слева направо. Отметь все листья, которые альфа-бета так и не посмотрит, и нажми «Проверить».', 'Солдан оңға қарай. Альфа-бета ешқашан қарамайтын жапырақтарды белгілеп, «Тексеру» бас.'),
      data: { mode: 'prune', leaves: [3, 12, 8, 2, 4, 6, 14, 5, 2], pruned: [4, 5], wrong: L('Not quite. Which MIN node is already worse than 3 after its first leaf?', 'Не совсем. Какой узел MIN уже хуже 3 после первого листа?', 'Дәл емес. Қай MIN түйіні бірінші жапырақтан кейін 3-тен нашар?') },
      okText: L('4 and 6 are pruned: once MIN sees 2, MAX will never choose that branch.', '4 и 6 отсечены: как только MIN видит 2, MAX эту ветку не выберет.', '4 пен 6 кесілді: MIN 2-ні көргенде, MAX бұл тармақты таңдамайды.'),
      h: [L('After the first branch, MAX is sure of at least 3 (alpha = 3).', 'После первой ветки MAX уверен минимум в 3 (alpha = 3).', 'Бірінші тармақтан кейін MAX кемінде 3-ке сенімді (alpha = 3).'), L('In the middle branch the first leaf is 2 ≤ 3 — the rest of that branch can be skipped.', 'В средней ветке первый лист 2 ≤ 3 — остаток ветки можно пропустить.', 'Ортаңғы тармақта бірінші жапырақ 2 ≤ 3 — қалғанын өткізіп жіберуге болады.')] },
    { kind: 'quiz', fig: 'expecti', t: L('Expectimax', 'Expectimax', 'Expectimax'),
      qs: [
        { q: L('The right move is a gamble: 50% you capture 8, 50% only 2. Its expected value is…', 'Правый ход — риск: 50% ты берёшь 8, 50% только 2. Его ожидаемое значение —', 'Оң жүріс — тәуекел: 50% 8 аласың, 50% тек 2. Оның күтілетін мәні —'),
          a: [L('5', '5', '5'), L('8', '8', '8'), L('2', '2', '2'), L('10', '10', '10')], ok: 0 },
        { q: L('The left move always gives 4. Expectimax chooses…', 'Левый ход всегда даёт 4. Expectimax выбирает…', 'Сол жүріс әрқашан 4 береді. Expectimax таңдайды…'),
          a: [L('the gamble, because 5 > 4', 'риск, потому что 5 > 4', 'тәуекелді, себебі 5 > 4'), L('the safe move, because 4 is certain', 'надёжный ход, потому что 4 гарантировано', 'сенімді жүрісті, себебі 4 кепілді')], ok: 0 },
      ],
      h: [L('Expected value = sum of probability × outcome.', 'Ожидание = сумма вероятность × исход.', 'Күтілетін мән = ықтималдық × нәтиже қосындысы.'), L('0.5 · 8 + 0.5 · 2 = ?', '0.5 · 8 + 0.5 · 2 = ?', '0.5 · 8 + 0.5 · 2 = ?')] },
  ],
  done: L('The Culture Palace is open. You beat the robot with minimax and alpha-beta.', 'Дворец культуры открыт. Ты обыграл робота с помощью minimax и альфа-бета.', 'Мәдениет сарайы ашылды. Сен роботты minimax пен альфа-бета арқылы ұттың.'),
};

// ---------- Week 5 — MDP & Q-learning ----------
const w5 = {
  steps: [
    { kind: 'sort', t: L('Build the MDP', 'Собери MDP', 'MDP құрастыр'), i: L('Sort the crossroad parts into the MDP.', 'Разложи части перекрёстка по элементам MDP.', 'Қиылыс бөліктерін MDP элементтеріне сұрыпта.'),
      slots: { S: L('States', 'Состояния', 'Күйлер'), A: L('Actions', 'Действия', 'Әрекеттер'), R: L('Reward', 'Награда', 'Сыйақы'), T: L('Transitions', 'Переходы', 'Ауысулар') },
      cards: [
        { id: 'q', slot: 'S', l: L('Queue length on each road', 'Длина очереди на каждой дороге', 'Әр жолдағы кезек ұзындығы') },
        { id: 'sw', slot: 'A', l: L('Switch the light', 'Переключить свет', 'Жарықты ауыстыру') },
        { id: 'r', slot: 'R', l: L('−1 for every waiting car', '−1 за каждую ждущую машину', 'Күтіп тұрған әр көлікке −1') },
        { id: 't', slot: 'T', l: L('Chance new cars arrive', 'Вероятность, что приедут машины', 'Жаңа көліктер келу ықтималдығы') },
        { id: 'col', slot: 'S', l: L('Current light colour', 'Текущий цвет светофора', 'Бағдаршамның қазіргі түсі') },
        { id: 'keep', slot: 'A', l: L('Keep the light', 'Оставить свет', 'Жарықты қалдыру') },
      ],
      h: [L('What the controller sees, what it does, how it is scored, and what the world does next.', 'Что контроллер видит, что делает, как его оценивают и что дальше делает мир.', 'Контроллер не көреді, не істейді, қалай бағаланады және әлем әрі қарай не істейді.'), L('Transitions are probabilities of the next state.', 'Переходы — это вероятности следующего состояния.', 'Ауысулар — келесі күйдің ықтималдықтары.')] },
    { kind: 'widget', w: 'train', t: L('Q-learning at work', 'Q-обучение в деле', 'Q-оқыту жұмыста'), i: L('Let the crossroad learn from experience.', 'Пусть перекрёсток учится на опыте.', 'Қиылыс тәжірибеден үйренсін.'),
      data: { curve: [12, 11, 11, 10, 9, 9, 8, 7, 7, 6, 6, 5, 5, 4, 4, 4, 3, 3, 3, 3] },
      okText: L('Average waiting fell from 12 to 3 cars — no one told it the rules.', 'Среднее ожидание упало с 12 до 3 машин — правила ему никто не говорил.', 'Орташа күту 12-ден 3 көлікке түсті — оған ешкім ереже айтқан жоқ.'),
      h: [L('Tap the train button and watch the curve.', 'Нажми кнопку обучения и следи за графиком.', 'Оқыту батырмасын басып, графикті бақыла.'), L('Each episode updates Q-values from rewards.', 'Каждый эпизод обновляет Q-значения по наградам.', 'Әр эпизод сыйақылар бойынша Q-мәндерді жаңартады.')] },
    { kind: 'quiz', fig: 'qform', t: L('One Q-update', 'Одно обновление Q', 'Бір Q-жаңарту'),
      qs: [
        { q: L('What is the new Q value?', 'Каким станет новое значение Q?', 'Q-дың жаңа мәні қандай?'), a: [L('2.3', '2.3', '2.3'), L('3.6', '3.6', '3.6'), L('1.5', '1.5', '1.5'), L('2.6', '2.6', '2.6')], ok: 0 },
        { q: L('ε-greedy with ε = 0.1 means the agent…', 'ε-жадная стратегия с ε = 0.1 значит, что агент…', 'ε = 0.1 болатын ε-ашкөз стратегия агент…'),
          a: [L('explores a random action 10% of the time', 'в 10% случаев пробует случайное действие', 'уақыттың 10%-ында кездейсоқ әрекетті байқап көреді'), L('always takes the best known action', 'всегда берёт лучшее известное действие', 'әрқашан белгілі ең жақсы әрекетті алады')], ok: 0 },
      ],
      h: [L('First the bracket: −1 + 0.9 · 4 − 2.', 'Сначала скобка: −1 + 0.9 · 4 − 2.', 'Алдымен жақша: −1 + 0.9 · 4 − 2.'), L('The bracket is 0.6. Then 2 + 0.5 · 0.6.', 'Скобка равна 0.6. Затем 2 + 0.5 · 0.6.', 'Жақша 0.6-ға тең. Сосын 2 + 0.5 · 0.6.')] },
  ],
  done: L('Traffic flows. The lights learned a policy with Q-learning.', 'Машины едут без пробок. Светофоры выучили стратегию через Q-обучение.', 'Көліктер кептеліссіз жүреді. Бағдаршамдар Q-оқыту арқылы стратегия үйренді.'),
};

// ---------- Week 6 — Probability & Bayes nets ----------
const w6 = {
  steps: [
    { kind: 'quiz', fig: 'dots', t: L('Bayes’ rule', 'Правило Байеса', 'Байес ережесі'),
      i: L('100 days. Gold = a real blizzard (10%). A ring = the alarm went off. It rings on 90% of blizzard days and 20% of calm days.', '100 дней. Золотые — настоящий буран (10%). Кольцо — сработала тревога: в 90% буранных дней и в 20% спокойных.', '100 күн. Алтын — нағыз боран (10%). Шеңбер — дабыл қосылды: боранды күндердің 90%-ында және тыныш күндердің 20%-ында.'),
      qs: [{ q: L('The alarm rings. How likely is a real blizzard?', 'Тревога сработала. Насколько вероятен настоящий буран?', 'Дабыл қосылды. Нағыз боранның ықтималдығы қандай?'), a: [L('≈ 33%', '≈ 33%', '≈ 33%'), L('90%', '90%', '90%'), L('10%', '10%', '10%'), L('27%', '27%', '27%')], ok: 0 }],
      h: [L('Count only the dots with a ring.', 'Считай только точки с кольцом.', 'Тек шеңбері бар нүктелерді сана.'), L('9 of the 27 ringed days are real blizzards.', '9 из 27 дней с кольцом — настоящие бураны.', 'Шеңбері бар 27 күннің 9-ы — нағыз боран.')] },
    { kind: 'quiz', fig: 'bayesnet', t: L('Bayesian network', 'Байесовская сеть', 'Байес желісі'),
      qs: [
        { q: L('Which nodes are the parents of Blizzard?', 'Какие узлы — родители узла «Буран»?', '«Боран» түйінінің ата-аналары қайсы?'), a: [L('Cold and Wind', 'Мороз и Ветер', 'Аяз және Жел'), L('Alarm', 'Тревога', 'Дабыл'), L('Alarm and Schools closed', 'Тревога и Школы закрыты', 'Дабыл және Мектептер жабық')], ok: 0 },
        { q: L('If we already know whether there is a blizzard, are Alarm and Schools closed independent?', 'Если уже известно, есть ли буран, независимы ли «Тревога» и «Школы закрыты»?', 'Боран бар-жоғы белгілі болса, «Дабыл» мен «Мектептер жабық» тәуелсіз бе?'), a: [YES, NO], ok: 0 },
      ],
      h: [L('Arrows point from cause to effect.', 'Стрелки идут от причины к следствию.', 'Бағыттар себептен салдарға қарай жүреді.'), L('Both children depend only on their common parent.', 'Оба потомка зависят только от общего родителя.', 'Екі ұрпақ та тек ортақ ата-анаға тәуелді.')] },
    { kind: 'quiz', t: L('Joint probability', 'Совместная вероятность', 'Бірлескен ықтималдық'),
      qs: [{ q: L('P(Blizzard) = 0.1 and P(Alarm | Blizzard) = 0.9. What is P(Blizzard and Alarm)?', 'P(Буран) = 0.1 и P(Тревога | Буран) = 0.9. Чему равна P(Буран и Тревога)?', 'P(Боран) = 0.1 және P(Дабыл | Боран) = 0.9. P(Боран және Дабыл) неге тең?'), a: [L('0.09', '0.09', '0.09'), L('0.9', '0.9', '0.9'), L('1.0', '1.0', '1.0'), L('0.01', '0.01', '0.01')], ok: 0 }],
      h: [L('Chain rule: P(A, B) = P(B) · P(A | B).', 'Цепное правило: P(A, B) = P(B) · P(A | B).', 'Тізбек ережесі: P(A, B) = P(B) · P(A | B).'), L('0.1 × 0.9 = ?', '0.1 × 0.9 = ?', '0.1 × 0.9 = ?')] },
  ],
  done: L('The blizzard alert is tuned: an alarm means about a 1-in-3 chance of a real blizzard.', 'Тревога настроена: сигнал означает примерно 1 шанс из 3 на настоящий буран.', 'Дабыл бапталды: сигнал нағыз боранның шамамен 3-тен 1 мүмкіндігін білдіреді.'),
};

// ---------- Week 7 — HMM ----------
const w7 = {
  steps: [
    { kind: 'sort', t: L('Parts of an HMM', 'Части HMM', 'HMM бөліктері'), i: L('Sort the bus-tracking facts.', 'Разложи факты об отслеживании автобуса.', 'Автобусты бақылау фактілерін сұрыпта.'),
      slots: { H: L('Hidden state', 'Скрытое состояние', 'Жасырын күй'), O: L('Observation', 'Наблюдение', 'Бақылау'), T: L('Transition model', 'Модель переходов', 'Ауысу моделі'), E: L('Sensor model', 'Модель датчика', 'Сенсор моделі') },
      cards: [
        { id: 'h', slot: 'H', l: L('The real stop of the bus', 'Настоящая остановка автобуса', 'Автобустың нақты аялдамасы') },
        { id: 'o', slot: 'O', l: L('A GPS dot on the map', 'Точка GPS на карте', 'Картадағы GPS нүктесі') },
        { id: 't', slot: 'T', l: L('Bus moves on with 30%', 'Автобус едет дальше с вероятностью 30%', 'Автобус 30% ықтималдықпен әрі жүреді') },
        { id: 'e', slot: 'E', l: L('GPS can be 100 m off', 'GPS может ошибаться на 100 м', 'GPS 100 м қателесуі мүмкін') },
      ],
      h: [L('What can we not see directly, and what do we see?', 'Что мы не видим напрямую, а что видим?', 'Нені тікелей көрмейміз, нені көреміз?'), L('Models are probabilities: how the state changes and how the sensor errs.', 'Модели — это вероятности: как меняется состояние и как ошибается датчик.', 'Модельдер — ықтималдықтар: күй қалай өзгереді және сенсор қалай қателеседі.')] },
    { kind: 'quiz', fig: 'hmm', t: L('Filtering', 'Фильтрация', 'Сүзгілеу'),
      i: L('After the time step the belief is still 50 / 50. GPS reading near Stop 2: likelihood 0.2 at Stop 1 and 0.8 at Stop 2.', 'После шага времени убеждение всё ещё 50 / 50. GPS показывает рядом с остановкой 2: правдоподобие 0.2 для остановки 1 и 0.8 для остановки 2.', 'Уақыт қадамынан кейін сенім әлі 50 / 50. GPS 2-аялдама маңын көрсетеді: 1-аялдама үшін шынайылық 0.2, 2-аялдама үшін 0.8.'),
      qs: [{ q: L('New belief that the bus is at Stop 2?', 'Новая вероятность, что автобус на остановке 2?', 'Автобустың 2-аялдамада болуының жаңа ықтималдығы?'), a: [L('0.8', '0.8', '0.8'), L('0.5', '0.5', '0.5'), L('0.4', '0.4', '0.4'), L('0.2', '0.2', '0.2')], ok: 0 }],
      h: [L('Multiply each belief by the likelihood, then normalise.', 'Умножь каждую вероятность на правдоподобие, затем нормализуй.', 'Әр ықтималдықты шынайылыққа көбейтіп, сосын нормала.'), L('0.5 · 0.8 = 0.4 and 0.5 · 0.2 = 0.1. What share of 0.5 is 0.4?', '0.5 · 0.8 = 0.4 и 0.5 · 0.2 = 0.1. Какую долю от 0.5 составляет 0.4?', '0.5 · 0.8 = 0.4 және 0.5 · 0.2 = 0.1. 0.4 — 0.5-тің қандай үлесі?')] },
    { kind: 'quiz', t: L('Which algorithm?', 'Какой алгоритм?', 'Қай алгоритм?'),
      qs: [
        { q: L('The most likely whole route of the bus during the day', 'Самый вероятный весь маршрут автобуса за день', 'Автобустың күн бойғы ең ықтимал толық маршруты'), a: [L('Viterbi', 'Витерби', 'Витерби'), L('Filtering', 'Фильтрация', 'Сүзгілеу'), L('Minimax', 'Minimax', 'Minimax')], ok: 0 },
        { q: L('Where the bus is right now, given all GPS so far', 'Где автобус прямо сейчас с учётом всех GPS до этого момента', 'Осы сәтке дейінгі барлық GPS бойынша автобус дәл қазір қайда'), a: [L('Filtering', 'Фильтрация', 'Сүзгілеу'), L('Viterbi', 'Витерби', 'Витерби'), L('Value iteration', 'Итерация по ценности', 'Құндылық итерациясы')], ok: 0 },
      ],
      h: [L('One asks for a sequence, the other for the current state.', 'Один вопрос — про последовательность, другой — про текущее состояние.', 'Бір сұрақ — тізбек туралы, екіншісі — қазіргі күй туралы.'), L('Viterbi tracks the best path; filtering updates the belief.', 'Витерби ищет лучший путь, фильтрация обновляет убеждение.', 'Витерби ең жақсы жолды іздейді, сүзгілеу сенімді жаңартады.')] },
  ],
  done: L('Buses are tracked through noisy GPS with a hidden Markov model.', 'Автобусы отслеживаются по шумному GPS с помощью скрытой марковской модели.', 'Автобустар шулы GPS арқылы жасырын Марков моделімен бақыланады.'),
};

// ---------- Week 8 — Decisions & ML ----------
const w8 = {
  steps: [
    { kind: 'quiz', fig: 'plow', t: L('Expected utility', 'Ожидаемая полезность', 'Күтілетін пайдалылық'),
      qs: [
        { q: L('Expected utility of NOT sending the snowplough?', 'Ожидаемая полезность, если НЕ отправлять снегоуборщик?', 'Қар күрегіш көлікті ЖІБЕРМЕСЕ, күтілетін пайдалылық?'), a: [L('−20', '−20', '−20'), L('−50', '−50', '−50'), L('−10', '−10', '−10'), L('0', '0', '0')], ok: 0 },
        { q: L('A rational akimat…', 'Рациональный акимат…', 'Ұтымды әкімдік…'), a: [L('sends the plough (−10 > −20)', 'отправит снегоуборщик (−10 > −20)', 'көлікті жібереді (−10 > −20)'), L('keeps it in the garage', 'оставит его в гараже', 'оны гаражда қалдырады')], ok: 0 },
      ],
      h: [L('EU = Σ probability × utility.', 'EU = Σ вероятность × полезность.', 'EU = Σ ықтималдық × пайдалылық.'), L('0.4 · (−50) + 0.6 · 0 = ?', '0.4 · (−50) + 0.6 · 0 = ?', '0.4 · (−50) + 0.6 · 0 = ?')] },
    { kind: 'quiz', t: L('Naive Bayes spam filter', 'Наивный байесовский спам-фильтр', 'Аңғал Байес спам-сүзгісі'),
      i: L('Half of the mail is spam. “Prize” appears in 60% of spam and 10% of normal letters.', 'Половина писем — спам. Слово «приз» есть в 60% спама и в 10% обычных писем.', 'Хаттардың жартысы — спам. «Жүлде» сөзі спамның 60%-ында және кәдімгі хаттардың 10%-ында бар.'),
      qs: [{ q: L('A letter contains “prize”. P(spam | “prize”) ≈ ?', 'В письме есть «приз». P(спам | «приз») ≈ ?', 'Хатта «жүлде» бар. P(спам | «жүлде») ≈ ?'), a: [L('0.86', '0.86', '0.86'), L('0.60', '0.60', '0.60'), L('0.50', '0.50', '0.50'), L('0.30', '0.30', '0.30')], ok: 0 }],
      h: [L('Compare 0.5 · 0.6 with 0.5 · 0.1.', 'Сравни 0.5 · 0.6 и 0.5 · 0.1.', '0.5 · 0.6 пен 0.5 · 0.1-ді салыстыр.'), L('0.30 / (0.30 + 0.05) = ?', '0.30 / (0.30 + 0.05) = ?', '0.30 / (0.30 + 0.05) = ?')] },
    { kind: 'quiz', fig: 'dtree', t: L('Decision tree', 'Дерево решений', 'Шешім ағашы'), i: L('Sort three letters with the tree.', 'Рассортируй три письма по дереву.', 'Үш хатты ағаш бойынша сұрыпта.'),
      qs: [
        { q: L('Has a link, unknown sender', 'Есть ссылка, неизвестный отправитель', 'Сілтеме бар, жіберуші белгісіз'), a: [L('Spam', 'Спам', 'Спам'), L('Not spam', 'Не спам', 'Спам емес')], ok: 0 },
        { q: L('No link, unknown sender', 'Нет ссылки, неизвестный отправитель', 'Сілтеме жоқ, жіберуші белгісіз'), a: [L('Spam', 'Спам', 'Спам'), L('Not spam', 'Не спам', 'Спам емес')], ok: 1 },
        { q: L('Has a link, known sender', 'Есть ссылка, известный отправитель', 'Сілтеме бар, жіберуші белгілі'), a: [L('Spam', 'Спам', 'Спам'), L('Not spam', 'Не спам', 'Спам емес')], ok: 1 },
      ],
      h: [L('Start at the top question and follow the answers.', 'Начни с верхнего вопроса и иди по ответам.', 'Жоғарғы сұрақтан бастап, жауаптар бойынша жүр.'), L('Only “link + unknown sender” ends in Spam.', 'Только «ссылка + неизвестный отправитель» ведёт к «Спаму».', 'Тек «сілтеме + белгісіз жіберуші» «Спамға» апарады.')] },
  ],
  done: L('Akimat mail is sorted: expected utility, naive Bayes and a decision tree at work.', 'Почта акимата рассортирована: ожидаемая полезность, наивный Байес и дерево решений в деле.', 'Әкімдік поштасы сұрыпталды: күтілетін пайдалылық, аңғал Байес және шешім ағашы жұмыста.'),
};

// ---------- Week 9 — Neural networks ----------
const w9 = {
  steps: [
    { kind: 'widget', w: 'perceptron', t: L('A perceptron for the windows', 'Перцептрон для окон', 'Терезелерге арналған перцептрон'),
      i: L('A window lights only when it is dark AND someone is home. Set the bias b.', 'Окно горит, только когда темно И кто-то дома. Подбери смещение b.', 'Терезе тек қараңғы ЖӘНЕ үйде біреу болғанда жанады. b ығысуын таңда.'),
      data: { x1: L('Dark', 'Темно', 'Қараңғы'), x2: L('Home', 'Дома', 'Үйде') },
      okText: L('With b between −2 and −1 the perceptron computes AND.', 'При b от −2 до −1 перцептрон вычисляет И (AND).', 'b −2 мен −1 арасында болғанда перцептрон ЖӘНЕ (AND) есептейді.'),
      h: [L('Only the row 1, 1 may give a positive sum.', 'Положительная сумма должна быть только в строке 1, 1.', 'Оң қосынды тек 1, 1 жолында болуы керек.'), L('1 + b must be ≤ 0, but 2 + b must be > 0.', '1 + b должно быть ≤ 0, а 2 + b — больше 0.', '1 + b ≤ 0 болуы керек, ал 2 + b — 0-ден үлкен.')] },
    { kind: 'quiz', t: L('Beyond one neuron', 'Больше одного нейрона', 'Бір нейроннан әрі'),
      qs: [
        { q: L('XOR: the light is on when exactly one input is 1. A single perceptron…', 'XOR: свет горит, когда ровно один вход равен 1. Один перцептрон…', 'XOR: дәл бір кіріс 1 болғанда жарық жанады. Бір перцептрон…'), a: [L('cannot do it — XOR is not linearly separable', 'не справится — XOR не разделим прямой', 'істей алмайды — XOR сызықпен бөлінбейді'), L('can do it with the right bias', 'справится с правильным смещением', 'дұрыс ығысумен істей алады')], ok: 0 },
        { q: L('ReLU(−2) = ?', 'ReLU(−2) = ?', 'ReLU(−2) = ?'), a: [L('0', '0', '0'), L('−2', '−2', '−2'), L('2', '2', '2')], ok: 0 },
      ],
      h: [L('Try drawing one straight line that separates the XOR cases.', 'Попробуй провести одну прямую, разделяющую случаи XOR.', 'XOR жағдайларын бөлетін бір түзу сызып көр.'), L('ReLU(x) = max(0, x).', 'ReLU(x) = max(0, x).', 'ReLU(x) = max(0, x).')] },
    { kind: 'quiz', t: L('Training', 'Обучение', 'Оқыту'),
      qs: [
        { q: L('Backpropagation computes…', 'Обратное распространение вычисляет…', 'Кері таралу есептейді…'), a: [L('the gradient of the loss for every weight', 'градиент функции потерь по каждому весу', 'әр салмақ бойынша шығын функциясының градиентін'), L('the next input for the network', 'следующий вход для сети', 'желінің келесі кірісін')], ok: 0 },
        { q: L('If the learning rate is far too large, the loss usually…', 'Если скорость обучения слишком большая, потери обычно…', 'Оқыту жылдамдығы тым үлкен болса, шығын әдетте…'), a: [L('jumps around or explodes', 'скачут или растут', 'секіреді немесе өседі'), L('falls smoothly but slowly', 'падают плавно, но медленно', 'баяу әрі біркелкі азаяды')], ok: 0 },
      ],
      h: [L('Training moves weights against the gradient.', 'Обучение сдвигает веса против градиента.', 'Оқыту салмақтарды градиентке қарсы жылжытады.'), L('Too big a step jumps over the valley.', 'Слишком большой шаг перепрыгивает долину.', 'Тым үлкен қадам ойпаттан секіріп кетеді.')] },
  ],
  done: L('The power grid is smart: a trained network lights the windows.', 'Энергосеть умная: обученная сеть зажигает окна.', 'Энергожелі ақылды: үйретілген желі терезелерді жағады.'),
};

// ---------- Week 10 — LLMs & safety ----------
const w10 = {
  steps: [
    { kind: 'quiz', fig: 'tokens', t: L('Next-token prediction', 'Предсказание следующего токена', 'Келесі токенді болжау'),
      i: L('The model continues: “The capital of Kazakhstan is …”', 'Модель продолжает: «Столица Казахстана — …»', 'Модель жалғастырады: «Қазақстанның астанасы — …»'),
      qs: [
        { q: L('At temperature 0 the model picks…', 'При температуре 0 модель выберет…', '0 температурада модель таңдайды…'), a: [L('Astana', 'Astana', 'Astana'), L('Almaty', 'Almaty', 'Almaty'), L('a random city', 'случайный город', 'кездейсоқ қаланы')], ok: 0 },
        { q: L('A higher temperature makes answers…', 'Более высокая температура делает ответы…', 'Жоғары температура жауаптарды…'), a: [L('more varied', 'разнообразнее', 'әртүрлірек етеді'), L('always identical', 'всегда одинаковыми', 'әрқашан бірдей етеді')], ok: 0 },
      ],
      h: [L('Temperature 0 = always the most likely token.', 'Температура 0 — всегда самый вероятный токен.', '0 температура — әрқашан ең ықтимал токен.'), L('Higher temperature flattens the probabilities.', 'Высокая температура «сглаживает» вероятности.', 'Жоғары температура ықтималдықтарды теңестіреді.')] },
    { kind: 'sort', t: L('A safe assistant', 'Безопасный ассистент', 'Қауіпсіз көмекші'), i: L('Which requests should the Bayterek assistant help with?', 'С какими запросами ассистенту Байтерека стоит помочь?', 'Бәйтерек көмекшісі қай сұрауларға көмектесуі керек?'),
      slots: { Y: L('Help', 'Помочь', 'Көмектесу'), N: L('Decline', 'Отказать', 'Бас тарту') },
      cards: [
        { id: 'bus', slot: 'Y', l: L('Bus times to EXPO', 'Расписание автобусов до EXPO', 'EXPO-ға автобус кестесі') },
        { id: 'addr', slot: 'N', l: L('A citizen’s home address', 'Домашний адрес жителя', 'Тұрғынның үй мекенжайы') },
        { id: 'wx', slot: 'Y', l: L('Tomorrow’s weather', 'Погода на завтра', 'Ертеңгі ауа райы') },
        { id: 'hack', slot: 'N', l: L('How to switch off traffic lights', 'Как отключить светофоры', 'Бағдаршамдарды қалай өшіру') },
        { id: 'lib', slot: 'Y', l: L('Nearest library', 'Ближайшая библиотека', 'Ең жақын кітапхана') },
        { id: 'fake', slot: 'N', l: L('Write a fake akimat order', 'Написать фальшивый приказ акимата', 'Әкімдіктің жалған бұйрығын жазу') },
      ],
      h: [L('Would the answer harm someone or break the law?', 'Навредит ли ответ кому-то или нарушит закон?', 'Жауап біреуге зиян тигізе ме немесе заңды бұза ма?'), L('Private data, attacks on city systems and forgery are declined.', 'Личные данные, атаки на городские системы и подделки — отказ.', 'Жеке деректер, қала жүйелеріне шабуыл және жалғандық — бас тарту.')] },
    { kind: 'quiz', t: L('Honest answers', 'Честные ответы', 'Адал жауаптар'),
      qs: [
        { q: L('The assistant is not sure about a bus time. The best answer is to…', 'Ассистент не уверен во времени автобуса. Лучше всего…', 'Көмекші автобус уақытына сенімсіз. Ең дұрысы…'), a: [L('say it is unsure and link the official timetable', 'сказать, что не уверен, и дать ссылку на официальное расписание', 'сенімсіз екенін айтып, ресми кестеге сілтеме беру'), L('invent a time that sounds right', 'придумать правдоподобное время', 'шындыққа ұқсас уақыт ойлап табу')], ok: 0 },
        { q: L('Retrieval-augmented generation (RAG) means the model…', 'Генерация с поиском (RAG) значит, что модель…', 'Іздеумен толықтырылған генерация (RAG) модель…'), a: [L('looks up trusted documents before answering', 'перед ответом ищет в проверенных документах', 'жауап бермес бұрын сенімді құжаттардан іздейді'), L('remembers every conversation forever', 'навсегда запоминает все разговоры', 'барлық әңгімені мәңгі есте сақтайды')], ok: 0 },
      ],
      h: [L('A made-up fact is called a hallucination.', 'Выдуманный факт называют галлюцинацией.', 'Ойдан шығарылған факт галлюцинация деп аталады.'), L('Grounding answers in real sources reduces hallucinations.', 'Опора на реальные источники уменьшает галлюцинации.', 'Нақты дереккөздерге сүйену галлюцинацияны азайтады.')] },
  ],
  done: L('The Bayterek assistant is live: helpful, honest and safe. Astana is complete!', 'Ассистент Байтерека запущен: полезный, честный и безопасный. Астана построена!', 'Бәйтерек көмекшісі іске қосылды: пайдалы, адал әрі қауіпсіз. Астана салынды!'),
};

export const SPECS = [w1, w2, w3, w4, w5, w6, w7, w8, w9, w10];
