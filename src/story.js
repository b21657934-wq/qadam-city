// Story: a strong blizzard reaches Astana in 10 days. Each district has a resident with a problem.
const L = (en, ru, kk) => ({ en, ru, kk });

// look: skin, hair colour, hat type, hat colour, coat colour, extras
const P = [
  { name: L('Assel', 'Асель', 'Әсел'), role: L('meteorologist', 'метеоролог', 'метеоролог'), look: { skin: '#E9B98F', hair: '#2B2233', hat: 'bun', coat: '#4F98A3', glasses: true },
    intro: L('A huge blizzard will hit Astana in 10 days, and our station robot can’t even see a snowdrift. Teach Qadam to sense the city!', 'Через 10 дней на Астану обрушится сильный буран, а наш робот на станции не видит даже сугроба. Научи Qadam чувствовать город!', '10 күннен кейін Астанаға қатты боран соғады, ал станциядағы робот қар үйіндісін де көрмейді. Qadam-ды қаланы сезінуге үйрет!'),
    outro: L('Now Qadam notices every drift and warns people himself.', 'Теперь Qadam замечает каждый сугроб и сам предупреждает людей.', 'Енді Qadam әр үйіндіні байқап, адамдарды өзі ескертеді.'),
    storm: L('The weather station warned the whole city two hours early.', 'Метеостанция предупредила весь город за два часа.', 'Метеостанция бүкіл қаланы екі сағат бұрын ескертті.') },
  { name: L('Aigerim', 'Айгерим', 'Айгерім'), role: L('hospital doctor', 'врач больницы', 'аурухана дәрігері'), look: { skin: '#D9A27A', hat: 'scarf', hatC: '#F4F1EA', coat: '#F4F1EA', cross: true },
    intro: L('Before the storm we need medicine from the depot. The roads are snowed in — find me the fastest way.', 'До бурана нам нужны лекарства со склада. Дороги в снегу — найди самый быстрый путь.', 'Боранға дейін қоймадан дәрі керек. Жолдар қарда — ең жылдам жолды тап.'),
    outro: L('The medicine arrived in 9 minutes. You may have saved someone tonight.', 'Лекарства приехали за 9 минут. Возможно, этой ночью ты кого-то спас.', 'Дәрі 9 минутта жетті. Бүгін түнде біреуді құтқарған шығарсың.'),
    storm: L('Ambulances took the cheapest routes through the snow.', 'Скорые ехали по самым быстрым маршрутам сквозь снег.', 'Жедел жәрдем қар арқылы ең жылдам жолмен жүрді.') },
  { name: L('Nurlan', 'Нурлан', 'Нұрлан'), role: L('site foreman', 'прораб', 'прораб'), look: { skin: '#C98E66', hat: 'helmet', hatC: '#F2B544', coat: '#E8674A', vest: true },
    intro: L('New families need homes before the cold, and the buses need lines that don’t clash.', 'Новым семьям нужны дома до холодов, а автобусам — линии без конфликтов.', 'Жаңа отбасыларға суыққа дейін үй керек, ал автобустарға қайшылықсыз желілер.'),
    outro: L('The block stands, and no two buses fight for one road.', 'Квартал стоит, и ни один автобус не мешает другому.', 'Квартал тұр, бірде-бір автобус екіншісіне кедергі жасамайды.'),
    storm: L('Buses kept running on lines that never collide.', 'Автобусы ходили по линиям, которые не пересекаются.', 'Автобустар қиылыспайтын желілермен жүрді.') },
  { name: L('Serik ata', 'Серик ата', 'Серік ата'), role: L('toguz kumalak master', 'мастер тоғыз құмалақ', 'тоғыз құмалақ шебері'), look: { skin: '#D2A07C', hat: 'kalpak', hatC: '#F4F1EA', coat: '#3E6B5A', beard: '#C9CDD3' },
    intro: L('When it snows, the whole city gathers in the Culture Palace. Can you beat my robot?', 'Когда метёт, весь город собирается во Дворце культуры. Обыграешь моего робота?', 'Боран соққанда бүкіл қала Мәдениет сарайына жиналады. Менің роботымды ұта аласың ба?'),
    outro: L('You think one move ahead — like a true master.', 'Ты думаешь на ход вперёд — как настоящий мастер.', 'Сен бір жүріс алға ойлайсың — нағыз шебер сияқты.'),
    storm: L('The Culture Palace stayed warm and full all night.', 'Дворец культуры всю ночь был тёплым и полным людей.', 'Мәдениет сарайы түні бойы жылы әрі адамға толы болды.') },
  { name: L('Dana', 'Дана', 'Дана'), role: L('traffic inspector', 'инспектор дорожной полиции', 'жол полициясы инспекторы'), look: { skin: '#E3B28C', hair: '#3A2A20', hat: 'cap', hatC: '#22305A', coat: '#22305A' },
    intro: L('Everyone is rushing home before the storm and the crossroad is stuck. Teach the light!', 'Все спешат домой до бурана, и перекрёсток встал. Научи светофор!', 'Барлығы боранға дейін үйге асығып, қиылыс тұрып қалды. Бағдаршамды үйрет!'),
    outro: L('The jam is gone. People will make it home in time.', 'Пробки нет. Люди успеют домой.', 'Кептеліс жоқ. Адамдар үйге уақытында жетеді.'),
    storm: L('Traffic lights cleared the roads in minutes.', 'Светофоры разгрузили дороги за минуты.', 'Бағдаршамдар жолды бірнеше минутта босатты.') },
  { name: L('Yerlan', 'Ерлан', 'Ерлан'), role: L('school principal', 'директор школы', 'мектеп директоры'), look: { skin: '#D8A47F', hair: '#1E1B22', hat: 'short', coat: '#8A6A4F', glasses: true },
    intro: L('The sensor is beeping. Do I close the school tomorrow? I need numbers, not panic.', 'Датчик пищит. Закрывать ли завтра школу? Мне нужны числа, а не паника.', 'Датчик дабыл қағып тұр. Ертең мектепті жабу керек пе? Маған дүрбелең емес, сан керек.'),
    outro: L('The decision was made by calculation. Parents are calm.', 'Решение принято по расчёту. Родители спокойны.', 'Шешім есеп бойынша қабылданды. Ата-аналар тыныш.'),
    storm: L('Schools closed in time, with no false alarms all week.', 'Школы закрылись вовремя, без ложных тревог за всю неделю.', 'Мектептер уақытында жабылды, апта бойы жалған дабыл болмады.') },
  { name: L('Marat', 'Марат', 'Марат'), role: L('bus driver', 'водитель автобуса', 'автобус жүргізушісі'), look: { skin: '#C99370', hat: 'beanie', hatC: '#E8674A', coat: '#3D6FB0', beard: '#2B2233' },
    intro: L('In a snowstorm the GPS lies. Passengers freeze at the stops — where is my bus?', 'В метель GPS врёт. Пассажиры мёрзнут на остановках — где мой автобус?', 'Боранда GPS өтірік айтады. Жолаушылар аялдамада тоңып тұр — менің автобусым қайда?'),
    outro: L('Now people wait indoors and come out right when the bus arrives.', 'Теперь люди ждут в тепле и выходят ровно к автобусу.', 'Енді адамдар жылыда күтіп, автобус келгенде шығады.'),
    storm: L('Every passenger knew where their bus was.', 'Каждый пассажир знал, где его автобус.', 'Әр жолаушы автобусының қайда екенін білді.') },
  { name: L('Zhanna', 'Жанна', 'Жанна'), role: L('akimat secretary', 'секретарь акимата', 'әкімдік хатшысы'), look: { skin: '#E6B691', hair: '#6B3E2A', hat: 'bun', coat: '#9C5B8A' },
    intro: L('Urgent blizzard letters are drowning in spam, and the snowploughs are waiting for a decision.', 'Срочные письма о буране тонут в спаме, а снегоуборщики ждут решения.', 'Боран туралы шұғыл хаттар спамға батып жатыр, ал қар тазалағыштар шешім күтуде.'),
    outro: L('Important letters are on top, and the ploughs went out exactly when needed.', 'Важные письма наверху, а снегоуборщики выехали ровно тогда, когда нужно.', 'Маңызды хаттар жоғарыда, тазалағыштар дәл керек кезде шықты.'),
    storm: L('Snowploughs went out where the expected damage was highest.', 'Снегоуборщики выехали туда, где ожидаемый ущерб был больше всего.', 'Тазалағыштар күтілетін зиян ең көп жерге шықты.') },
  { name: L('Timur', 'Тимур', 'Тимур'), role: L('power-grid engineer', 'инженер энергосети', 'энергожелі инженері'), look: { skin: '#D6A07A', hat: 'helmet', hatC: '#F4F1EA', coat: '#F08A3C' },
    intro: L('At night the storm can black out the city. Train the grid to give light where it is really needed.', 'Ночью буран может оставить город без света. Обучи сеть давать свет там, где он правда нужен.', 'Түнде боран қаланы жарықсыз қалдыруы мүмкін. Желіні жарықты шынымен керек жерге беруге үйрет.'),
    outro: L('Windows glow where people are, and power is saved where nobody is home.', 'Окна горят там, где есть люди, а там, где никого нет, свет экономится.', 'Адам бар жерде терезе жанады, жоқ жерде жарық үнемделеді.'),
    storm: L('The grid held: lights on in every home with people in it.', 'Сеть выдержала: свет горел в каждом доме, где были люди.', 'Желі шыдады: адам бар әр үйде жарық жанды.') },
  { name: L('Aliya', 'Алия', 'Әлия'), role: L('schoolgirl', 'школьница', 'оқушы'), look: { skin: '#EBC09A', hair: '#2B2233', hat: 'ushanka', hatC: '#4F98A3', coat: '#F2B544' },
    intro: L('People will ask the Bayterek assistant what to do in the storm. It must answer honestly!', 'Люди будут спрашивать ассистента Байтерека, что делать в буран. Он должен отвечать честно!', 'Адамдар боранда не істеу керегін Бәйтерек көмекшісінен сұрайды. Ол адал жауап беруі керек!'),
    outro: L('The assistant answers precisely, admits what it doesn’t know and keeps secrets safe.', 'Ассистент отвечает точно, признаётся, чего не знает, и бережёт чужие данные.', 'Көмекші нақты жауап береді, білмейтінін мойындайды және деректерді сақтайды.'),
    storm: L('The Bayterek assistant answered thousands of questions honestly.', 'Ассистент Байтерека честно ответил на тысячи вопросов.', 'Бәйтерек көмекшісі мыңдаған сұраққа адал жауап берді.') },
];
export const STORY = P;

export function portrait(i, size = 56) {
  const l = P[i].look, c = l.coat, sk = l.skin, hc = l.hatC || l.hair || '#2B2233';
  let back = '', front = '';
  if (l.hat === 'bun') { back = `<circle cx="32" cy="15" r="7" fill="${l.hair}"/>`; front = `<path d="M18 30c0-9 6-14 14-14s14 5 14 14c-3-5-8-7-14-7s-11 2-14 7z" fill="${l.hair}"/>`; }
  if (l.hat === 'short') front = `<path d="M19 29c0-9 6-13 13-13s13 4 13 13c-2-4-7-6-13-6s-11 2-13 6z" fill="${l.hair}"/>`;
  if (l.hat === 'scarf') { back = `<path d="M15 34c0-13 7-20 17-20s17 7 17 20v12H15z" fill="${hc}"/>`; front = `<path d="M19 28c1-7 6-11 13-11s12 4 13 11c-3-3-8-4-13-4s-10 1-13 4z" fill="${hc}"/>`; }
  if (l.hat === 'helmet') front = `<path d="M17 28c0-9 7-15 15-15s15 6 15 15z" fill="${hc}"/><rect x="14" y="27" width="36" height="4" rx="2" fill="${hc}"/><rect x="30" y="13" width="4" height="15" rx="2" fill="rgba(0,0,0,.12)"/>`;
  if (l.hat === 'cap') front = `<path d="M18 26c0-8 6-12 14-12s14 4 14 12z" fill="${hc}"/><rect x="16" y="24" width="32" height="4" rx="2" fill="${hc}"/><path d="M22 27h20l-3 4H25z" fill="#111827" opacity=".5"/><circle cx="32" cy="19" r="2.4" fill="#F2B544"/>`;
  if (l.hat === 'beanie') front = `<path d="M18 28c0-9 6-15 14-15s14 6 14 15z" fill="${hc}"/><rect x="17" y="25" width="30" height="5" rx="2.5" fill="${hc}" opacity=".85"/><circle cx="32" cy="12" r="3.5" fill="${hc}"/>`;
  if (l.hat === 'kalpak') front = `<path d="M20 27l4-15c3-2 13-2 16 0l4 15z" fill="${hc}"/><path d="M18 27h28v3H18z" fill="#1B2340"/><path d="M28 13l4-4 4 4" fill="none" stroke="#1B2340" stroke-width="1.6"/>`;
  if (l.hat === 'ushanka') { back = `<rect x="16" y="26" width="6" height="12" rx="3" fill="${hc}"/><rect x="42" y="26" width="6" height="12" rx="3" fill="${hc}"/>`; front = `<path d="M17 28c0-9 7-15 15-15s15 6 15 15z" fill="${hc}"/><rect x="16" y="24" width="32" height="6" rx="3" fill="#F4F1EA"/>`; }
  const eyes = `<circle cx="27.5" cy="32" r="1.6" fill="#1B2340"/><circle cx="36.5" cy="32" r="1.6" fill="#1B2340"/>`;
  const glasses = l.glasses ? `<g fill="none" stroke="#1B2340" stroke-width="1.3"><circle cx="27.5" cy="32" r="3.6"/><circle cx="36.5" cy="32" r="3.6"/><path d="M31 32h2"/></g>` : '';
  const beard = l.beard ? `<path d="M22 34c1 8 5 11 10 11s9-3 10-11c-2 3-6 4-10 4s-8-1-10-4z" fill="${l.beard}"/>` : '';
  const smile = `<path d="M28.5 38.5c2 1.8 5 1.8 7 0" fill="none" stroke="#1B2340" stroke-width="1.5" stroke-linecap="round"/>`;
  const extra = (l.vest ? `<path d="M22 50l4 14h12l4-14" fill="#F2B544" opacity=".85"/>` : '') + (l.cross ? `<g transform="translate(40 53)"><rect x="-1.5" y="-5" width="3" height="10" fill="#E8674A"/><rect x="-5" y="-1.5" width="10" height="3" fill="#E8674A"/></g>` : '');
  return `<svg class="face" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><defs><clipPath id="fc${i}"><circle cx="32" cy="32" r="32"/></clipPath></defs><g clip-path="url(#fc${i})"><rect width="64" height="64" fill="${c}" opacity=".22"/>${back}<path d="M10 64c2-12 11-18 22-18s20 6 22 18z" fill="${c}"/>${extra}<rect x="28" y="40" width="8" height="8" rx="3" fill="${sk}"/><ellipse cx="32" cy="32" rx="12" ry="13" fill="${sk}"/>${front}${eyes}${glasses}${beard}${smile}</g></svg>`;
}
