// All interface text in English, Russian and Kazakh.
export const LANGS = ['en', 'ru', 'kk'];
export const LANG_LABEL = { en: 'EN', ru: 'RU', kk: 'KZ' };
let lang = 'en';
const listeners = new Set();
export function getLang() { return lang; }
export function setLang(l) { if (!LANGS.includes(l)) return; lang = l; document.documentElement.lang = l === 'kk' ? 'kk' : l; listeners.forEach(f => f(l)); }
export function onLang(f) { listeners.add(f); }
export function tr(o, vars) {
  let s = (o && (o[lang] ?? o.en)) ?? '';
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
export function t(key, vars) { return tr(S[key] || { en: key }, vars); }

export const S = {
  appName: { en: 'Qadam City', ru: 'Qadam City', kk: 'Qadam City' },
  cityBuilt: { en: 'City built · {p}%', ru: 'Город построен · {p} %', kk: 'Қала салынды · {p} %' },
  nextGoal: { en: 'Next goal', ru: 'Следующая цель', kk: 'Келесі мақсат' },
  week: { en: 'Week {n}', ru: 'Неделя {n}', kk: '{n}-апта' },
  startMission: { en: 'Start mission', ru: 'Начать миссию', kk: 'Миссияны бастау' },
  playAgain: { en: 'Play again', ru: 'Пройти снова', kk: 'Қайта өту' },
  locked: { en: 'Build “{prev}” first', ru: 'Сначала построй «{prev}»', kk: 'Алдымен «{prev}» ауданын сал' },
  soon: { en: 'This mission arrives in the next build of the book.', ru: 'Эта миссия появится в следующей сборке книги.', kk: 'Бұл миссия кітаптың келесі нұсқасында қосылады.' },
  built: { en: 'Built', ru: 'Построено', kk: 'Салынды' },
  back: { en: 'Back', ru: 'Назад', kk: 'Артқа' },
  close: { en: 'Close', ru: 'Закрыть', kk: 'Жабу' },
  menu: { en: 'Menu', ru: 'Меню', kk: 'Мәзір' },
  language: { en: 'Language', ru: 'Язык', kk: 'Тіл' },
  timeOfDay: { en: 'Time of day', ru: 'Время суток', kk: 'Тәулік уақыты' },
  day: { en: 'Day', ru: 'День', kk: 'Күндіз' },
  night: { en: 'Night', ru: 'Ночь', kk: 'Түн' },
  library: { en: 'Library', ru: 'Библиотека', kk: 'Кітапхана' },
  librarySub: { en: 'Book mode: chapters, labs, quizzes', ru: 'Режим книги: главы, лаборатории, тесты', kk: 'Кітап режимі: тараулар, зертханалар, тесттер' },
  libSoon: { en: 'The full book opens in stage 4 of the build.', ru: 'Полная книга откроется на этапе 4.', kk: 'Толық кітап 4-кезеңде ашылады.' },
  reset: { en: 'Reset progress', ru: 'Сбросить прогресс', kk: 'Прогресті тастау' },
  resetConfirm: { en: 'Tap again to reset', ru: 'Нажми ещё раз для сброса', kk: 'Тастау үшін тағы бас' },
  resetDone: { en: 'Progress reset', ru: 'Прогресс сброшен', kk: 'Прогресс тасталды' },
  team: { en: 'Team 11 · Yuldashov Bilal, Tashmetov Shakhrukh', ru: 'Команда 11 · Yuldashov Bilal, Tashmetov Shakhrukh', kk: '11-топ · Yuldashov Bilal, Tashmetov Shakhrukh' },
  course: { en: 'AIF1303 AI Fundamentals · Qairu University', ru: 'AIF1303 Основы ИИ · Qairu University', kk: 'AIF1303 ЖИ негіздері · Qairu University' },
  hint: { en: 'Hint', ru: 'Подсказка', kk: 'Кеңес' },
  hintMore: { en: 'Stronger hint', ru: 'Ещё подсказка', kk: 'Тағы кеңес' },
  stepOf: { en: 'Step {n} of {m}', ru: 'Шаг {n} из {m}', kk: '{n}/{m}-қадам' },
  next: { en: 'Next', ru: 'Дальше', kk: 'Әрі қарай' },
  skip: { en: 'Skip', ru: 'Пропустить', kk: 'Өткізу' },
  startBuilding: { en: 'Start building', ru: 'Начать стройку', kk: 'Құрылысты бастау' },
  ob1t: { en: 'Hi! I’m Qadam', ru: 'Привет! Я Qadam', kk: 'Сәлем! Мен Qadam' },
  ob1: { en: 'Every AI topic you master adds a new system to the city. Let’s build Astana together.', ru: 'Каждая тема ИИ, которую ты освоишь, добавляет городу новую систему. Построим Астану вместе.', kk: 'Сен меңгерген әр ЖИ тақырыбы қалаға жаңа жүйе қосады. Астананы бірге салайық.' },
  ob2t: { en: 'Follow the golden light', ru: 'Иди за золотым светом', kk: 'Алтын жарыққа ер' },
  ob2: { en: 'The glowing district is your next goal. Each one is a short mission worth up to 3 stars.', ru: 'Светящийся район — твоя следующая цель. В каждом короткая миссия и до 3 звёзд.', kk: 'Жарқыраған аудан — келесі мақсатың. Әрқайсында қысқа миссия және 3 жұлдызға дейін.' },
  ob3t: { en: 'The Library is the book', ru: 'Библиотека — это книга', kk: 'Кітапхана — бұл кітап' },
  ob3: { en: 'Open the Library from the menu any time: full chapters, labs and quizzes.', ru: 'Открывай Библиотеку из меню в любой момент: полные главы, лаборатории и тесты.', kk: 'Кітапхананы мәзірден кез келген уақытта аш: толық тараулар, зертханалар мен тесттер.' },
  resultTitle: { en: 'District built!', ru: 'Район построен!', kk: 'Аудан салынды!' },
  cityPlus: { en: '+10% to the city', ru: '+10 % к городу', kk: 'Қалаға +10 %' },
  watchGrow: { en: 'Watch it grow', ru: 'Смотреть, как растёт', kk: 'Өсуін көру' },
  starRule: { en: '3 stars: no hints and at most one mistake', ru: '3 звезды: без подсказок и не больше одной ошибки', kk: '3 жұлдыз: кеңессіз және бір қатеден аспай' },
  wrongSlot: { en: 'Not this one — think about the card’s role.', ru: 'Не сюда — подумай о роли карточки.', kk: 'Бұл жерге емес — карточканың рөлін ойла.' },
  wrong: { en: 'Not quite. Read the sentence again.', ru: 'Не совсем. Перечитай фразу.', kk: 'Дәл емес. Сөйлемді қайта оқы.' },
  tapCard: { en: 'Pick a card first', ru: 'Сначала выбери карточку', kk: 'Алдымен карточканы таңда' },
  stars: { en: 'stars', ru: 'звёзд', kk: 'жұлдыз' },
  progressLabel: { en: 'City progress', ru: 'Прогресс города', kk: 'Қала прогресі' },
  openDistrict: { en: 'Open district', ru: 'Открыть район', kk: 'Ауданды ашу' },
  finaleT: { en: 'Astana is glowing', ru: 'Астана светится', kk: 'Астана жарқырап тұр' },
  finale: { en: 'All 10 systems are running. Thank you for helping Qadam build the city.', ru: 'Все 10 систем работают. Спасибо, что помог Qadam построить город.', kk: 'Барлық 10 жүйе жұмыс істеп тұр. Qadam-ға қала салуға көмектескеніңе рақмет.' },
  tour: { en: 'Fly over the city', ru: 'Облететь город', kk: 'Қаланы айналып ұшу' },
  aboutBuild: { en: 'Stage 2 preview · one district playable', ru: 'Превью этапа 2 · играбелен один район', kk: '2-кезең алдын ала көрінісі · бір аудан ойналады' },
};

// 10 districts = 10 weeks
export const D = [
  { icon: 'sensor', title: { en: 'Weather Station', ru: 'Метеостанция', kk: 'Метеостанция' }, topic: { en: 'Agents · PEAS', ru: 'Агенты · PEAS', kk: 'Агенттер · PEAS' }, task: { en: 'Teach Qadam to see the city.', ru: 'Научи Qadam видеть город.', kk: 'Qadam-ға қаланы көруді үйрет.' } },
  { icon: 'route', title: { en: 'Roads', ru: 'Дороги', kk: 'Жолдар' }, topic: { en: 'BFS · DFS · UCS · A*', ru: 'BFS · DFS · UCS · A*', kk: 'BFS · DFS · UCS · A*' }, task: { en: 'Find a delivery route between districts.', ru: 'Проложи маршрут доставки между районами.', kk: 'Аудандар арасында жеткізу жолын тап.' } },
  { icon: 'grid', title: { en: 'Blocks & Buses', ru: 'Застройка и автобусы', kk: 'Құрылыс және автобустар' }, topic: { en: 'Local search · CSP', ru: 'Локальный поиск · CSP', kk: 'Жергілікті іздеу · CSP' }, task: { en: 'Place buildings and plan buses without conflicts.', ru: 'Расставь здания и составь расписание без конфликтов.', kk: 'Ғимараттарды орналастырып, кестені қайшылықсыз құр.' } },
  { icon: 'game', title: { en: 'Culture Palace', ru: 'Дворец культуры', kk: 'Мәдениет сарайы' }, topic: { en: 'Minimax · α-β · Expectimax', ru: 'Minimax · α-β · Expectimax', kk: 'Minimax · α-β · Expectimax' }, task: { en: 'Play toguz kumalak against the robot.', ru: 'Сыграй с роботом в тоғыз құмалақ.', kk: 'Роботпен тоғыз құмалақ ойна.' } },
  { icon: 'traffic', title: { en: 'Traffic Lights', ru: 'Светофоры', kk: 'Бағдаршамдар' }, topic: { en: 'MDP · Q-learning', ru: 'MDP · Q-learning', kk: 'MDP · Q-learning' }, task: { en: 'Teach the crossroad to let cars through without jams.', ru: 'Научи перекрёсток пропускать машины без пробок.', kk: 'Қиылысты көліктерді кептеліссіз өткізуге үйрет.' } },
  { icon: 'snow', title: { en: 'Blizzard Alert', ru: 'Прогноз бурана', kk: 'Боран болжамы' }, topic: { en: 'Probability · Bayes nets', ru: 'Вероятность · байесовские сети', kk: 'Ықтималдық · Байес желілері' }, task: { en: 'Forecast a blizzard and tune the alarm.', ru: 'Спрогнозируй буран и настрой тревогу.', kk: 'Боранды болжап, дабылды бапта.' } },
  { icon: 'bus', title: { en: 'Bus Tracking', ru: 'Автобусы по GPS', kk: 'GPS бойынша автобустар' }, topic: { en: 'Hidden Markov models', ru: 'Скрытые марковские модели', kk: 'Жасырын Марков модельдері' }, task: { en: 'Track buses through noisy GPS.', ru: 'Отследи автобусы по шумному GPS.', kk: 'Шулы GPS арқылы автобустарды бақыла.' } },
  { icon: 'mail', title: { en: 'Akimat Post', ru: 'Почта акимата', kk: 'Әкімдік поштасы' }, topic: { en: 'Decisions · ML', ru: 'Теория решений · ML', kk: 'Шешімдер теориясы · ML' }, task: { en: 'Build a spam filter and a decision tree.', ru: 'Собери спам-фильтр и дерево решений.', kk: 'Спам-сүзгі мен шешім ағашын жаса.' } },
  { icon: 'bolt', title: { en: 'Power Grid', ru: 'Энергосеть', kk: 'Энергожелі' }, topic: { en: 'Neural networks', ru: 'Нейросети', kk: 'Нейрондық желілер' }, task: { en: 'Train a network to light up the windows.', ru: 'Обучи сеть зажечь свет в окнах.', kk: 'Терезелерге жарық жағатын желіні үйрет.' } },
  { icon: 'chat', title: { en: 'Bayterek Assistant', ru: 'Ассистент Байтерека', kk: 'Бәйтерек көмекшісі' }, topic: { en: 'LLMs · GenAI · Safety', ru: 'LLM · генеративный ИИ · безопасность', kk: 'LLM · генеративті ЖИ · қауіпсіздік' }, task: { en: 'Launch a safe city assistant on the tower.', ru: 'Запусти безопасного ассистента на башне.', kk: 'Мұнарада қауіпсіз қала көмекшісін іске қос.' } },
];

// Mission 1 — Weather station (agents, PEAS, environment types, agent architectures)
export const M1 = {
  intro: { en: 'A smart weather station is an agent. Help Qadam assemble it.', ru: 'Умная метеостанция — это агент. Помоги Qadam её собрать.', kk: 'Ақылды метеостанция — бұл агент. Qadam-ға оны құрастыруға көмектес.' },
  s1t: { en: 'Sort by PEAS', ru: 'Разложи по PEAS', kk: 'PEAS бойынша сұрыпта' },
  s1i: { en: 'Tap a card, then the slot where it belongs.', ru: 'Нажми на карточку, затем на нужную ячейку.', kk: 'Карточканы, сосын тиісті ұяшықты бас.' },
  slots: {
    P: { en: 'Performance', ru: 'Мера качества', kk: 'Өнімділік өлшемі' },
    E: { en: 'Environment', ru: 'Среда', kk: 'Орта' },
    A: { en: 'Actuators', ru: 'Исполнители', kk: 'Орындаушылар' },
    S: { en: 'Sensors', ru: 'Датчики', kk: 'Сенсорлар' },
  },
  cards: [
    { id: 'thermo', slot: 'S', l: { en: 'Thermometer', ru: 'Термометр', kk: 'Термометр' } },
    { id: 'siren', slot: 'A', l: { en: 'Alarm siren', ru: 'Сирена тревоги', kk: 'Дабыл сиренасы' } },
    { id: 'acc', slot: 'P', l: { en: 'Forecast accuracy', ru: 'Точность прогноза', kk: 'Болжам дәлдігі' } },
    { id: 'streets', slot: 'E', l: { en: 'Streets of Astana', ru: 'Улицы Астаны', kk: 'Астана көшелері' } },
    { id: 'anemo', slot: 'S', l: { en: 'Wind gauge', ru: 'Анемометр', kk: 'Анемометр' } },
    { id: 'board', slot: 'A', l: { en: 'Street display', ru: 'Уличное табло', kk: 'Көше таблосы' } },
    { id: 'weather', slot: 'E', l: { en: 'Wind, snow, frost', ru: 'Ветер, снег, мороз', kk: 'Жел, қар, аяз' } },
    { id: 'early', slot: 'P', l: { en: 'Early blizzard warning', ru: 'Раннее оповещение о буране', kk: 'Боран туралы ерте ескерту' } },
  ],
  s1h: [
    { en: 'For each card ask: is it a goal, the outside world, something the station does, or something it measures?', ru: 'Спроси про каждую карточку: это цель, внешний мир, действие станции или то, что она измеряет?', kk: 'Әр карточка туралы сұра: бұл мақсат па, сыртқы әлем бе, станцияның әрекеті ме, әлде ол өлшейтін нәрсе ме?' },
    { en: 'Sensors bring information in. Actuators send actions out. Performance is how we score the agent.', ru: 'Датчики приносят информацию внутрь. Исполнители выводят действия наружу. Мера качества — как мы оцениваем агента.', kk: 'Сенсорлар ақпаратты ішке әкеледі. Орындаушылар әрекетті сыртқа шығарады. Өнімділік өлшемі — агентті қалай бағалаймыз.' },
  ],
  s2t: { en: 'What kind of environment?', ru: 'Какая это среда?', kk: 'Бұл қандай орта?' },
  qs: [
    { q: { en: 'The station cannot measure every street at once.', ru: 'Станция не может измерить сразу все улицы.', kk: 'Станция барлық көшені бірден өлшей алмайды.' },
      a: [{ en: 'Fully observable', ru: 'Полностью наблюдаемая', kk: 'Толық бақыланатын' }, { en: 'Partially observable', ru: 'Частично наблюдаемая', kk: 'Ішінара бақыланатын' }], ok: 1 },
    { q: { en: 'The same readings can lead to different weather tomorrow.', ru: 'Одни и те же показания могут дать разную погоду завтра.', kk: 'Бірдей көрсеткіштер ертең әртүрлі ауа райына әкелуі мүмкін.' },
      a: [{ en: 'Deterministic', ru: 'Детерминированная', kk: 'Детерминирленген' }, { en: 'Stochastic', ru: 'Стохастическая', kk: 'Стохастикалық' }], ok: 1 },
    { q: { en: 'The weather keeps changing while the station is thinking.', ru: 'Погода меняется, пока станция думает.', kk: 'Станция ойланып тұрғанда ауа райы өзгереді.' },
      a: [{ en: 'Static', ru: 'Статическая', kk: 'Статикалық' }, { en: 'Dynamic', ru: 'Динамическая', kk: 'Динамикалық' }], ok: 1 },
  ],
  s2h: [
    { en: 'Look for the key words: “every”, “same readings”, “while”.', ru: 'Ищи ключевые слова: «все», «одни и те же», «пока».', kk: 'Кілт сөздерді ізде: «барлық», «бірдей», «тұрғанда».' },
    { en: 'Observable: the agent sees the whole state. Deterministic: the next state is certain. Static: the world waits for the agent.', ru: 'Наблюдаемая: агент видит всё состояние. Детерминированная: следующее состояние известно точно. Статическая: мир ждёт агента.', kk: 'Бақыланатын: агент бүкіл күйді көреді. Детерминирленген: келесі күй нақты белгілі. Статикалық: әлем агентті күтеді.' },
  ],
  s3t: { en: 'Which agent is it?', ru: 'Какой это агент?', kk: 'Бұл қандай агент?' },
  s3q: { en: 'The station remembers how pressure changed over the last hours and decides using that memory.', ru: 'Станция помнит, как менялось давление последние часы, и решает с учётом этой памяти.', kk: 'Станция соңғы сағаттардағы қысым өзгерісін есте сақтап, соған сүйеніп шешеді.' },
  s3a: [
    { en: 'Simple reflex', ru: 'Простой рефлекторный', kk: 'Қарапайым рефлекторлы' },
    { en: 'Model-based reflex', ru: 'Рефлекторный с моделью', kk: 'Модельге негізделген' },
    { en: 'Goal-based', ru: 'Целевой', kk: 'Мақсатқа бағытталған' },
    { en: 'Utility-based', ru: 'На основе полезности', kk: 'Пайдалылыққа негізделген' },
  ], s3ok: 1,
  s3h: [
    { en: 'What does the station keep inside that a simple reflex agent does not?', ru: 'Что станция хранит внутри, чего нет у простого рефлекторного агента?', kk: 'Қарапайым рефлекторлы агентте жоқ, станция ішінде не сақтайды?' },
    { en: 'A memory of past percepts is an internal model of the world.', ru: 'Память о прошлых восприятиях — это внутренняя модель мира.', kk: 'Өткен қабылдаулар туралы жады — әлемнің ішкі моделі.' },
  ],
  done: { en: 'Qadam can see the city now. The station keeps an internal model of the weather — a model-based reflex agent.', ru: 'Теперь Qadam видит город. Станция хранит внутреннюю модель погоды — это рефлекторный агент с моделью.', kk: 'Енді Qadam қаланы көреді. Станция ауа райының ішкі моделін сақтайды — бұл модельге негізделген рефлекторлы агент.' },
};
