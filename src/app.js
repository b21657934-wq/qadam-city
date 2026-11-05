import * as THREE from 'three';
import { t, tr, D, LANGS, LANG_LABEL, getLang, setLang } from './i18n.js';
import { icon } from './ui/icons.js';
import { store } from './store.js';
import { Mission } from './missions/engine.js';
import { SPECS } from './missions/specs.js';
import logoSvg from './ui/logo.svg';
import { Book } from './book/book.js';
import { K } from './world/city.js';
import { STORY, portrait } from './story.js';
import { SCENES, VIEWS } from './world/stormScenes.js';
import { U } from './world/engine.js';
import { islandLabels } from './world/islands.js';
import { sfx } from './sfx.js';
const say = (i, txt) => `<div class="say mt3"><div class="say-face">${portrait(i)}</div><div class="say-b"><div class="say-n">${esc(tr(STORY[i].name))}<span> · ${esc(tr(STORY[i].role))}</span></div><p>${esc(typeof txt === 'string' ? txt : tr(txt))}</p></div></div>`;

const logoURL = 'data:image/svg+xml,' + encodeURIComponent(logoSvg);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MISSIONS = SPECS;

export class App {
  constructor({ engine, rig, city, qadam, snow }) {
    Object.assign(this, { engine, rig, city, qadam, snow });
    const ui = this.ui = document.createElement('div'); ui.className = 'ui'; document.getElementById('app').appendChild(ui);
    ui.innerHTML = `<aside class="calc glass" aria-live="polite" hidden></aside><header class="hud glass" role="banner"></header><section class="sheet glass" role="dialog" aria-live="polite"></section><div class="toast glass" role="status"></div>`;
    this.calcEl = ui.querySelector('.calc');
    this.hud = ui.querySelector('.hud'); this.sheet = ui.querySelector('.sheet'); this.toastEl = ui.querySelector('.toast');
    this.view = 'home'; this.sel = null; islandLabels(this.city, n => t('levelN', { n }));
    sfx.setEnabled(store.get().sound !== false);
    addEventListener('pointerdown', () => sfx.unlock(), { capture: true });
    ui.addEventListener('click', e => { if (e.target.closest('button')) sfx.play('tap'); }, true);
    rig.onTap = ndc => this.tap(ndc);
    this.ray = new THREE.Raycaster();
    new ResizeObserver(() => this.syncInset()).observe(this.sheet);
    this.book = new Book(this);
  }
  // ----- helpers -----
  built() { return store.builtCount(); }
  pct() { return this.built() * 10; }
  setTheme(night, instant) {
    store.set({ night }); document.documentElement.dataset.theme = night ? 'dark' : 'light';
    this.engine.setNight(night, instant);
    const tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.content = night ? '#0E1430' : '#F1F4F7';
  }
  calc(title, rows) {
    const e = this.calcEl; e.hidden = false;
    e.innerHTML = `<div class="calc-t">${icon('gauge')}<span>${esc(title)}</span></div>${rows.map((r, i) => `<div class="calc-r ${r[2] || ''} ${i === rows.length - 1 ? 'new' : ''}"><span>${esc(r[0])}</span><b>${esc(r[1] ?? '')}</b></div>`).join('')}`;
    requestAnimationFrame(() => e.classList.add('on'));
  }
  calcHide() { const e = this.calcEl; e.classList.remove('on'); setTimeout(() => { if (!e.classList.contains('on')) e.hidden = true; }, 250); }
  toast(msg) { const e = this.toastEl; e.textContent = msg; e.classList.add('on'); clearTimeout(this.tt); this.tt = setTimeout(() => e.classList.remove('on'), 2200); }
  syncInset() { const hidden = this.sheet.classList.contains('hide'), desk = innerWidth >= 760, h = hidden ? 0 : this.sheet.offsetHeight + 16; this.rig.setUiBottom(desk ? 0 : h); this.rig.setUiLeft(desk && !hidden ? 444 : 0); }
  setSheet(html, bind, opts = {}) {
    const s = this.sheet;
    s.classList.remove('hide');
    s.innerHTML = `<div class="sheet-in">${opts.grab === false ? '' : '<div class="grab"></div>'}${html}</div>`;
    s.scrollTop = 0;
    if (bind) bind(s);
    s.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); this.act(b.dataset.act, b.dataset); }));
    this.syncInset();
  }
  hideSheet() { this.sheet.classList.add('hide'); this.syncInset(); }
  renderHud() {
    const b = this.built(), night = store.get().night;
    this.hud.innerHTML = `<img class="logo" src="${logoURL}" alt="Qadam City">
      <div class="prog"><div class="lbl">${esc(this.built() < 10 ? t('daysLeft', { n: 10 - this.built() }) : t(store.get().storm ? 'stormDone' : 'stormNow'))} · ${this.pct()} %</div><div class="bar" role="progressbar" aria-label="${esc(t('progressLabel'))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${this.pct()}"><i style="width:${this.pct()}%"></i></div></div>
      <div class="chip-stars" aria-label="${store.totalStars()} / 30 ${esc(t('stars'))}">${icon('starf')}${store.totalStars()}/30</div>
      <button class="icon-btn hud-reset" data-act="resetAsk" aria-label="${esc(t('restartTitle'))}" title="${esc(t('restartTitle'))}">${icon('reset')}</button>
      <button class="icon-btn" data-act="theme" aria-label="${esc(t(night ? 'day' : 'night'))}">${icon(night ? 'sun' : 'moon')}</button>
      <button class="icon-btn" data-act="menu" aria-label="${esc(t('menu'))}">${icon('menu')}</button>`;
    this.hud.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => this.act(b.dataset.act, b.dataset)));
    this.hud.classList.toggle('hide', this.view === 'onboard' || this.view === 'login');
  }
  rerender() { sfx.city(this.built() / 10); islandLabels(this.city, n => t('levelN', { n })); this.renderHud(); const v = this.view; if (v === 'mission' && this.mission) this.mission.render(); else this.show(v, this.viewArg, true); }

  // ----- views -----
  show(view, arg, quiet) {
    sfx.city(this.built() / 10);
    this.view = view; this.viewArg = arg;
    this.renderHud();
    if (view === 'home') return this.vHome();
    if (view === 'district') return this.vDistrict(arg, quiet);
    if (view === 'menu') return this.vMenu();
    if (view === 'onboard') return this.vOnboard(arg || 0);
    if (view === 'login') return this.vLogin();
    if (view === 'library') return this.vLibrary();
    if (view === 'resetAsk') return this.vResetAsk();
  }
  vLogin() {
    this.rig.autoOrbit = true; this.city.setBeacon(-1);
    this.rig.flyTo({ target: [0, 0.6, 0], zoom: 1, az: -0.62, pol: 0.98 }, 1.6);
    this.setSheet(`
      <div class="login-head"><div class="login-logo">${logoSvg}</div><div><div class="h3">Qadam City</div><div class="cap">${esc(t('course'))}</div></div></div>
      <form class="login-form mt4" data-lform autocomplete="on" novalidate>
        <label class="field"><span>${esc(t('nick'))}</span><input data-nick name="username" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="next"></label>
        <label class="field mt2"><span>${esc(t('pass'))}</span><input data-pass name="password" type="password" autocomplete="current-password" enterkeyhint="go"></label>
        <div class="feedback" data-lerr aria-live="polite"></div>
        <button class="btn btn-primary btn-block mt1" type="submit">${esc(t('login'))}${icon('arrow')}</button>
      </form>
      <div class="or mt3"><span>${esc(t('or'))}</span></div>
      <button class="btn btn-secondary btn-block mt3" data-guest>${esc(t('guest'))}</button>
      <p class="cap mt2 center">${esc(t('guestNote'))}</p>`, root => {
        root.querySelector('[data-lform]').addEventListener('submit', e => {
          e.preventDefault();
          const u = store.check(root.querySelector('[data-nick]').value, root.querySelector('[data-pass]').value);
          if (!u) { const f = root.querySelector('[data-lerr]'); f.textContent = t('loginErr'); root.querySelectorAll('.field input').forEach(x => { x.classList.remove('no'); void x.offsetWidth; x.classList.add('no'); }); return; }
          store.login(u); location.reload();
        });
        root.querySelector('[data-guest]').addEventListener('click', () => { store.login('guest'); location.reload(); });
      });
  }
  vOnboard(i) {
    const steps = [['ob1t', 'ob1', 'city'], ['ob2t', 'ob2', 'star'], ['ob3t', 'ob3', 'book']];
    const [tt, tx, ic] = steps[i];
    this.city.setBeacon(i === 1 ? 0 : -1);
    if (i === 0) this.rig.flyTo({ target: [0, 0.6, 0], zoom: 1, az: -0.62, pol: 0.98 }, 1.6);
    if (i === 1) this.rig.flyTo({ target: [-5.6 * K, 0.6, -3.0 * K], zoom: 0.62, az: -0.9, pol: 0.92 }, 1.6);
    if (i === 2) this.rig.flyTo({ target: [0.2 * K, 0.6, 0.6 * K], zoom: 0.5, az: -0.2, pol: 0.9 }, 1.6);
    this.setSheet(`
      <div class="row"><span class="tag">${esc(t('stepOf', { n: i + 1, m: 3 }))}</span><div class="grow"></div>${i < 2 ? `<button class="btn btn-ghost" data-act="obDone" style="height:36px">${esc(t('skip'))}</button>` : ''}</div>
      <div class="row mt3"><div class="tile">${icon(ic)}</div><div class="h3 grow">${esc(t(tt))}</div></div>
      <p class="sub mt3">${esc(t(tx))}</p>
      <button class="btn btn-primary btn-block mt4" data-act="${i < 2 ? 'obNext' : 'obDone'}" data-i="${i + 1}" data-focus>${esc(t(i < 2 ? 'next' : 'startBuilding'))}${icon('arrow')}</button>
      <div class="dots mt3">${[0, 1, 2].map(k => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>`);
  }
  vHome() {
    const b = this.built();
    this.city.setBeacon(b < 10 ? b : -1);
    if (b >= 10 && !store.get().storm) return this.setSheet(`
      <div class="row"><div class="tile">${icon('snow')}</div><div class="grow"><div class="label">${esc(t('stormNow'))}</div><div class="h3">${esc(t('stormT'))}</div></div></div>
      ${say(0, t('stormIntro'))}
      <button class="btn btn-primary btn-block mt4" data-act="storm" data-focus>${icon('play')}${esc(t('stormGo'))}</button>`);
    if (b >= 10) return this.setSheet(`
      <div class="row"><div class="tile">${icon('starf')}</div><div class="grow"><div class="h3">${esc(t('finaleT'))}</div><div class="cap">${esc(t('stormDone'))}</div></div></div>
      ${say(0, t('finale'))}
      <button class="btn btn-primary btn-block mt4" data-act="tour">${icon('orbit')}${esc(t('tour'))}</button>
      <button class="btn btn-ghost btn-block mt2" data-act="storm">${icon('snow')}${esc(t('stormAgain'))}</button>`);
    const d = D[b];
    if (!store.get().gest) { store.set({ gest: true }); setTimeout(() => this.toast(t(matchMedia('(pointer: coarse)').matches ? 'gestureHint' : 'gestureHintDesk')), 900); }
    this.setSheet(`
      <div class="row"><div class="tile">${icon(d.icon)}</div><div class="grow"><div class="label">${esc(t('nextGoal'))}</div><div class="h3">${esc(tr(d.title))}</div></div><span class="tag gold">${esc(t('week', { n: b + 1 }))}</span></div>
      ${say(b, STORY[b].intro)}
      <button class="btn btn-primary btn-block mt4" data-act="open" data-i="${b}" data-focus>${esc(t('openDistrict'))}${icon('arrow')}</button>`);
  }
  vDistrict(i, quiet) {
    const d = D[i], b = this.built(), stars = store.get().stars[i] || 0, has = !!MISSIONS[i];
    const st = i < b ? 'built' : i === b ? 'next' : 'locked';
    this.sel = i;
    if (!quiet) { const c = this.city.districts[i]; this.rig.flyTo({ target: [c.center[0], 0.6, c.center[1]], ...c.cam }, 1.3); }
    this.city.setBeacon(st === 'next' ? i : b < 10 ? b : -1);
    const starRow = `<div class="stars-row" aria-label="${stars}/3">${[0, 1, 2].map(k => `<span class="${k < stars ? '' : 'off'}">${icon('starf')}</span>`).join('')}</div>`;
    let body = '';
    if (st === 'locked') body = `<p class="sub mt3 row" style="gap:8px">${icon('lock')}<span>${esc(t('locked', { prev: tr(D[b].title) }))}</span></p>`;
    else if (!has) body = `<p class="sub mt3">${esc(tr(d.task))}</p><p class="cap mt2">${esc(t('soon'))}</p>`;
    else body = `${say(i, st === 'built' ? STORY[i].outro : STORY[i].intro)}<p class="sub mt3 row" style="gap:8px">${icon('flag')}<span>${esc(tr(d.task))}</span></p><button class="btn ${st === 'built' ? 'btn-secondary' : 'btn-primary'} btn-block mt4" data-act="mission" data-i="${i}" data-focus>${icon(st === 'built' ? 'reset' : 'play')}${esc(t(st === 'built' ? 'playAgain' : 'startMission'))}</button><button class="btn btn-ghost btn-block mt2" data-act="read" data-i="${i}">${icon('book')}${esc(t('readChapter', { n: i + 1 }))}</button>`;
    this.setSheet(`
      <div class="row"><div class="tile ${st === 'locked' ? 'muted' : ''}">${icon(d.icon)}</div>
        <div class="grow"><div class="row" style="gap:8px"><span class="tag ${st === 'next' ? 'gold' : ''}">${esc(t('week', { n: i + 1 }))}</span>${st === 'built' ? starRow : ''}</div><div class="h3 mt1">${esc(tr(d.title))}</div></div>
        <button class="icon-btn" data-act="home" aria-label="${esc(t('close'))}">${icon('close')}</button></div>
      <div class="cap mt2">${esc(tr(d.topic))}</div>${body}`);
  }
  vMenu() {
    const night = store.get().night, L = getLang();
    this.setSheet(`
      <div class="row"><div class="h3 grow">${esc(t('menu'))}</div><button class="icon-btn" data-act="home" aria-label="${esc(t('close'))}">${icon('close')}</button></div>
      <div class="label mt3">${esc(t('language'))}</div>
      <div class="seg mt2" role="group" aria-label="${esc(t('language'))}">${LANGS.map(l => `<button data-act="lang" data-l="${l}" class="${l === L ? 'on' : ''}" aria-pressed="${l === L}">${LANG_LABEL[l]}</button>`).join('')}</div>
      <div class="label mt4">${esc(t('timeOfDay'))}</div>
      <div class="seg mt2" role="group"><button data-act="setDay" class="${night ? '' : 'on'}" aria-pressed="${!night}">${icon('sun')}${esc(t('day'))}</button><button data-act="setNight" class="${night ? 'on' : ''}" aria-pressed="${!!night}">${icon('moon')}${esc(t('night'))}</button></div>
      <div class="label mt4">${esc(t('sound'))}</div>
      <div class="seg mt2" role="group"><button data-act="soundOn" class="${store.get().sound !== false ? 'on' : ''}">${esc(t('soundOn'))}</button><button data-act="soundOff" class="${store.get().sound === false ? 'on' : ''}">${esc(t('soundOff'))}</button></div>
      <button class="list-btn mt4" data-act="library"><div class="tile">${icon('book')}</div><div class="grow"><div style="font-weight:600;font-size:16px;line-height:20px">${esc(t('library'))}</div><div class="cap mt1">${esc(t('librarySub'))}</div></div>${icon('arrow')}</button>
      <div class="acct mt4"><div class="tile">${icon('key')}</div><div class="grow"><div class="cap">${esc(t('account'))}</div><div style="font-weight:600;font-size:16px;line-height:20px">${esc(store.user() === 'guest' ? t('guestName') : store.user())} · ${esc(t('keyCount', { n: store.get().keys ?? 5 }))}</div></div><button class="btn btn-secondary" data-act="logout" style="height:40px">${esc(t('logout'))}</button></div>
      <button class="btn btn-ghost mt3 danger" data-act="resetAsk" style="padding:0 4px">${icon('reset')}<span>${esc(t('restartTitle'))}</span></button>
      <div class="cap mt3">${esc(t('team'))}<br>${esc(t('course'))}</div>`);
  }
  vResetAsk() {
    this.setSheet(`
      <div class="row"><div class="tile" style="background:var(--bad-soft);color:var(--bad)">${icon('reset')}</div><div class="h3 grow">${esc(t('restartTitle'))}</div></div>
      <p class="sub mt3">${esc(t('restartText'))}</p>
      <button class="btn btn-primary btn-block mt4" data-act="reset">${icon('reset')}${esc(t('restartYes'))}</button>
      <button class="btn btn-secondary btn-block mt2" data-act="home">${esc(t('cancel'))}</button>`);
  }
  vLibrary() {
    this.rig.flyTo({ target: [0.2 * K, 0.6, 0.6 * K], zoom: 0.45, az: -0.25, pol: 0.88 }, 1.3);
    this.city.setBeacon(-1);
    this.setSheet(`
      <div class="row"><div class="tile">${icon('book')}</div><div class="grow"><div class="h3">${esc(t('library'))}</div><div class="cap">${esc(t('librarySub'))}</div></div><button class="icon-btn" data-act="home" aria-label="${esc(t('close'))}">${icon('close')}</button></div>
      <p class="sub mt3">${esc(t('libSoon'))}</p>`);
  }

  // ----- actions -----
  act(a, ds) {
    if (a === 'menu') return this.show(this.view === 'menu' ? 'home' : 'menu');
    if (a === 'theme') { this.setTheme(!store.get().night); return this.rerender(); }
    if (a === 'soundOn' || a === 'soundOff') { store.set({ sound: a === 'soundOn' }); sfx.setEnabled(a === 'soundOn'); return this.rerender(); }
    if (a === 'setDay' || a === 'setNight') { this.setTheme(a === 'setNight'); return this.rerender(); }
    if (a === 'lang') { store.set({ lang: ds.l }); setLang(ds.l); this.book && this.book.rerender(); return this.rerender(); }
    if (a === 'home') { this.rig.flyTo({ target: [0, 0.6, 0], zoom: 1 }, 1.2); return this.show('home'); }
    if (a === 'open') return this.show('district', +ds.i);
    if (a === 'library') return this.book.open('toc');
    if (a === 'read') return this.book.open(+ds.i);
    if (a === 'obNext') return this.show('onboard', +ds.i);
    if (a === 'obDone') { store.set({ onboarded: true }); this.view = 'home'; return this.show('district', 0); }
    if (a === 'mission') return this.startMission(+ds.i);
    if (a === 'tour') return this.tour();
    if (a === 'storm') return this.storm();
    if (a === 'logout') { store.logout(); location.hash = ''; return location.reload(); }
    if (a === 'resetAsk') { if (this.mission) { this.mission.close(); } return this.show('resetAsk'); }
    if (a === 'reset') {
      store.reset(); store.set({ onboarded: false, coach: {} }); this.book.quiz = {};
      this.city.setBuilt(0); this.city.stationReset(); this.city.station.group.visible = false;
      this.qadam.cone.visible = false; this.qadam.goTo(1.8, 1.5);
      this.rig.flyTo({ target: [0, 0.6, 0], zoom: 1, az: -0.62, pol: 0.98 }, 1.2);
      this.toast(t('resetDone')); return this.show('onboard', 0);
    }
  }
  tap(ndc) {
    if (this.view === 'mission' || this.view === 'onboard' || this.busy) return;
    this.ray.setFromCamera(ndc, this.engine.camera);
    const hit = this.ray.intersectObjects([...this.city.hits, this.city.libHit, ...(this.city.islandHits || [])], false)[0];
    if (!hit) return;
    if (hit.object.userData.island) { sfx.play('lock'); return this.toast(t('lockedLevel', { n: hit.object.userData.island - 1 })); }
    if (hit.object.userData.library) return this.book.open('toc');
    this.show('district', hit.object.userData.district);
  }
  startMission(i) {
    const spec = MISSIONS[i]; if (!spec) return;
    this.view = 'mission'; this.renderHud();
    this.mission = new Mission(this, i, spec);
  }
  finishMission(i, stars) {
    const wasBuilt = i < this.built();
    store.setStars(i, stars);
    this.mission = null;
    this.view = 'result';
    this.renderHud();
    const L = tr;
    this.setSheet(`
      <div class="big-stars" aria-label="${stars}/3">${[0, 1, 2].map(k => `<span class="${k < stars ? '' : 'off'}">${icon('starf')}</span>`).join('')}</div>
      <div class="h3 center">${esc(t('resultTitle'))}</div>
      <div class="center mt1"><span class="tag gold">${esc(t('cityPlus'))}</span></div>
      ${say(i, STORY[i].outro)}
      <button class="btn btn-primary btn-block mt4" data-act="grow" data-focus>${icon('play')}${esc(t('watchGrow'))}</button>
      <p class="cap mt2 center">${esc(t('starRule'))}</p>`, s => {
        s.querySelector('[data-act=grow]').addEventListener('click', e => { e.stopPropagation(); this.growDistrict(i, wasBuilt); });
      });
    void L;
  }
  cineOpen() {
    const c = this.cineEl = document.createElement('div'); c.className = 'cine';
    c.innerHTML = `<canvas class="cine-fx" aria-hidden="true"></canvas><div class="cine-vig" aria-hidden="true"></div>
      <div class="cine-top"><span class="tag gold" data-c-n></span><button class="btn btn-secondary" data-c-skip>${esc(t('skip'))}${icon('arrow')}</button></div>
      <div class="cine-cap glass" aria-live="polite"><div class="cine-face"></div><div class="grow"><div class="say-n" data-c-t></div><p data-c-x></p></div></div>`;
    document.body.appendChild(c);
    this.stormSkip = false; this.skipP = new Promise(r => { this.skipR = r; });
    c.querySelector('[data-c-skip]').addEventListener('click', () => { this.stormSkip = true; this.skipR(); });
    const cv = c.querySelector('canvas'), x = cv.getContext('2d'), fl = [];
    for (let i = 0; i < 170; i++) fl.push([Math.random(), Math.random(), 0.4 + Math.random() * 0.9, Math.random()]);
    this.fx = { lv: 0, to: 0 };
    let last = performance.now();
    const draw = now => {
      if (!this.cineEl) return; const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const f = this.fx; f.lv += (f.to - f.lv) * Math.min(1, dt * 0.7);
      const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      x.clearRect(0, 0, W, H); c.style.setProperty('--fx', f.lv.toFixed(3));
      if (f.lv > 0.01) {
        const g = 0.7 + 0.3 * Math.sin(now / 900) * Math.sin(now / 370 + 1), vx = 1.25 * g, vy = 0.42;
        x.lineCap = 'round';
        for (const p of fl) {
          p[0] += vx * p[2] * dt; p[1] += vy * p[2] * dt; if (p[0] > 1.1) { p[0] -= 1.2; p[1] = Math.random(); } if (p[1] > 1.1) { p[1] -= 1.2; }
          const X = p[0] * W, Y = p[1] * H, len = (18 + 40 * p[2]) * g * (W / 1400);
          x.strokeStyle = `rgba(240,244,255,${(0.08 + 0.32 * p[3]) * f.lv})`; x.lineWidth = (1 + 2.2 * p[3]) * (W / 1400);
          x.beginPath(); x.moveTo(X, Y); x.lineTo(X - len * vx, Y - len * vy); x.stroke();
        }
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }
  cine(i, title, text, n) {
    const c = this.cineEl; if (!c) return;
    c.querySelector('[data-c-n]').textContent = n || t('stormT');
    c.querySelector('.cine-face').innerHTML = i == null ? icon('snow') : portrait(i, 48);
    c.querySelector('[data-c-t]').textContent = title; c.querySelector('[data-c-x]').textContent = text;
    const cap = c.querySelector('.cine-cap'); cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in');
  }
  sceneTest(i) { const v = VIEWS[i]; this.stage.clear(); this.blizzard.clear(); this.blizzard.live = true; this.rig.flyTo({ target: [v.x * K, 0.45, v.z * K], zoom: v.zoom * 1.05, az: v.az, pol: v.pol }, 0.01); return SCENES[i](this.blizzard, this.stage, tr); }
  cineClose() { if (this.cineEl) { this.cineEl.remove(); this.cineEl = null; } }
  async storm() {
    const S = this.blizzard, st = this.stage, wait = ms => new Promise(r => setTimeout(r, ms));
    this.busy = true; this.hideSheet(); this.rig.autoOrbit = false; this.hud.classList.add('hide');
    if (!store.get().night) this.setTheme(true);
    const f0 = U.uForce.value; S.live = true; st.clear();
    const gst = { g: st.g, label: (...a) => S.live ? st.label(...a) : new THREE.Object3D() };
    this.cineOpen();
    const portraitMode = innerWidth < innerHeight, skip = () => this.stormSkip;
    const fly = (v, d) => this.rig.flyTo({ target: [v.x * K, 0.45, v.z * K], zoom: v.zoom * (portraitMode ? 1.3 : 1.05), az: v.az, pol: v.pol }, d, true);
    this.cine(null, t('stormNow'), t('stormArrives'));
    this.rig.flyTo({ target: [0, 0.8, 0], zoom: 0.9, pol: 0.94, az: this.rig.az + 0.4 }, 3.2);
    await Promise.race([wait(1800), this.skipP]);
    S.begin(); this.snow.storm = true; this.fx.to = 1; this.city.traffic(false);
    await Promise.race([wait(3200), this.skipP]);
    for (let i = 0; i < 10 && !skip(); i++) {
      this.cine(i, `${tr(STORY[i].name)} · ${tr(D[i].title)}`, tr(STORY[i].storm), `${t('stormT')} · ${i + 1}/10`);
      await Promise.race([fly(VIEWS[i], 1.5), this.skipP]); if (skip()) break;
      await Promise.race([SCENES[i](S, gst, tr), this.skipP]);
      await Promise.race([wait(500), this.skipP]);
      st.clear(); S.clear();
    }
    S.live = false; st.clear(); S.clear();
    S.calm(); this.snow.storm = false; this.fx.to = 0; U.uForce.value = f0;
    this.cine(0, t('stormDone'), t('stormMorning'), t('stormT'));
    await this.rig.flyTo({ target: [0, 0.6, 0], zoom: 1, pol: 0.9, az: this.rig.az + 0.8 }, skip() ? 1.2 : 3.2, true);
    await wait(skip() ? 300 : 1600);
    S.end(); this.cineClose(); S.live = true; this.city.traffic(true);
    store.set({ storm: true }); this.hud.classList.remove('hide'); this.renderHud();
    this.rig.autoOrbit = true; this.busy = false; this.show('home');
  }
  async tour() {
    this.busy = true; this.hideSheet(); this.rig.autoOrbit = false;
    if (!store.get().night) { this.setTheme(true); this.renderHud(); }
    await this.rig.flyTo({ target: [0, 1.2, 0], zoom: 0.62, pol: 0.78, az: this.rig.az + 0.6 }, 2.2, true);
    await this.rig.flyTo({ target: [0, 2.4, -2.7 * K], zoom: 0.42, pol: 1.05, az: this.rig.az + 1.8 }, 4.5, true);
    await this.rig.flyTo({ target: [0, 0.6, 0], zoom: 1, pol: 0.9, az: this.rig.az + 1.4 }, 3.5, true);
    this.rig.autoOrbit = true; this.busy = false; this.show('home');
  }
  async growDistrict(i, wasBuilt) {
    this.busy = true;
    this.hideSheet();
    const c = this.city.districts[i];
    this.rig.autoOrbit = false;
    await this.rig.flyTo({ target: [c.center[0], 0.6, c.center[1]], zoom: 0.75, az: c.cam.az - 0.5, pol: 0.86 }, 1.2, true);
    sfx.play('build'); if (!wasBuilt) this.city.setBuilt(this.built(), i); else this.city.stationAll(true);
    this.city.wave(c.center[0], c.center[1]);
    this.qadam.cheer();
    this.renderHud();
    await this.rig.flyTo({ az: c.cam.az + 0.4, zoom: 0.9 }, 3.2, true);
    this.rig.autoOrbit = true; this.busy = false;
    this.toast(t('cityBuilt', { p: this.pct() }));
    this.show('home');
  }
}
