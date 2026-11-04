import * as THREE from 'three';
import { t, tr, D, LANGS, LANG_LABEL, getLang, setLang } from './i18n.js';
import { icon } from './ui/icons.js';
import { store } from './store.js';
import { Mission } from './missions/engine.js';
import { SPECS } from './missions/specs.js';
import logoSvg from './ui/logo.svg';

const logoURL = 'data:image/svg+xml,' + encodeURIComponent(logoSvg);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MISSIONS = SPECS;

export class App {
  constructor({ engine, rig, city, qadam, snow }) {
    Object.assign(this, { engine, rig, city, qadam, snow });
    const ui = this.ui = document.createElement('div'); ui.className = 'ui'; document.getElementById('app').appendChild(ui);
    ui.innerHTML = `<header class="hud glass" role="banner"></header><section class="sheet glass" role="dialog" aria-live="polite"></section><div class="toast glass" role="status"></div>`;
    this.hud = ui.querySelector('.hud'); this.sheet = ui.querySelector('.sheet'); this.toastEl = ui.querySelector('.toast');
    this.view = 'home'; this.sel = null;
    rig.onTap = ndc => this.tap(ndc);
    this.ray = new THREE.Raycaster();
    new ResizeObserver(() => this.syncInset()).observe(this.sheet);
  }
  // ----- helpers -----
  built() { return store.builtCount(); }
  pct() { return this.built() * 10; }
  setTheme(night, instant) {
    store.set({ night }); document.documentElement.dataset.theme = night ? 'dark' : 'light';
    this.engine.setNight(night, instant);
    const tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.content = night ? '#0E1430' : '#F1F4F7';
  }
  toast(msg) { const e = this.toastEl; e.textContent = msg; e.classList.add('on'); clearTimeout(this.tt); this.tt = setTimeout(() => e.classList.remove('on'), 2200); }
  syncInset() { const h = this.sheet.classList.contains('hide') ? 0 : this.sheet.offsetHeight + 16; this.rig.setUiBottom(innerWidth >= 760 ? 0 : h); }
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
      <div class="prog"><div class="lbl">${esc(t('cityBuilt', { p: this.pct() }))}</div><div class="bar" role="progressbar" aria-label="${esc(t('progressLabel'))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${this.pct()}"><i style="width:${this.pct()}%"></i></div></div>
      <div class="chip-stars" aria-label="${store.totalStars()} / 30 ${esc(t('stars'))}">${icon('starf')}${store.totalStars()}/30</div>
      <button class="icon-btn" data-act="theme" aria-label="${esc(t(night ? 'day' : 'night'))}">${icon(night ? 'sun' : 'moon')}</button>
      <button class="icon-btn" data-act="menu" aria-label="${esc(t('menu'))}">${icon('menu')}</button>`;
    this.hud.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => this.act(b.dataset.act, b.dataset)));
    this.hud.classList.toggle('hide', this.view === 'onboard');
  }
  rerender() { this.renderHud(); const v = this.view; if (v === 'mission' && this.mission) this.mission.render(); else this.show(v, this.viewArg, true); }

  // ----- views -----
  show(view, arg, quiet) {
    this.view = view; this.viewArg = arg;
    this.renderHud();
    if (view === 'home') return this.vHome();
    if (view === 'district') return this.vDistrict(arg, quiet);
    if (view === 'menu') return this.vMenu();
    if (view === 'onboard') return this.vOnboard(arg || 0);
    if (view === 'library') return this.vLibrary();
  }
  vOnboard(i) {
    const steps = [['ob1t', 'ob1', 'city'], ['ob2t', 'ob2', 'star'], ['ob3t', 'ob3', 'book']];
    const [tt, tx, ic] = steps[i];
    this.city.setBeacon(i === 1 ? 0 : -1);
    if (i === 0) this.rig.flyTo({ target: [0, 0.6, 0], zoom: 1, az: -0.62, pol: 0.98 }, 1.6);
    if (i === 1) this.rig.flyTo({ target: [-5.6, 0.6, -3.0], zoom: 0.62, az: -0.9, pol: 0.92 }, 1.6);
    if (i === 2) this.rig.flyTo({ target: [0.2, 0.6, 0.6], zoom: 0.5, az: -0.2, pol: 0.9 }, 1.6);
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
    if (b >= 10) return this.setSheet(`
      <div class="row"><div class="tile">${icon('starf')}</div><div class="grow"><div class="h3">${esc(t('finaleT'))}</div><div class="cap">${esc(t('cityBuilt', { p: 100 }))}</div></div></div>
      <p class="sub mt3">${esc(t('finale'))}</p>
      <button class="btn btn-primary btn-block mt4" data-act="tour">${icon('orbit')}${esc(t('tour'))}</button>`);
    const d = D[b];
    this.setSheet(`
      <div class="row"><div class="tile">${icon(d.icon)}</div><div class="grow"><div class="label">${esc(t('nextGoal'))}</div><div class="h3">${esc(tr(d.title))}</div></div><span class="tag gold">${esc(t('week', { n: b + 1 }))}</span></div>
      <p class="sub mt3">${esc(tr(d.task))}</p>
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
    else body = `<p class="sub mt3">${esc(tr(d.task))}</p><button class="btn ${st === 'built' ? 'btn-secondary' : 'btn-primary'} btn-block mt4" data-act="mission" data-i="${i}" data-focus>${icon(st === 'built' ? 'reset' : 'play')}${esc(t(st === 'built' ? 'playAgain' : 'startMission'))}</button>`;
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
      <button class="list-btn mt4" data-act="library"><div class="tile">${icon('book')}</div><div class="grow"><div style="font-weight:600;font-size:16px;line-height:20px">${esc(t('library'))}</div><div class="cap mt1">${esc(t('librarySub'))}</div></div>${icon('arrow')}</button>
      <button class="btn btn-ghost mt3 danger" data-act="reset" style="padding:0 4px">${icon('reset')}<span>${esc(t('reset'))}</span></button>
      <div class="cap mt3">${esc(t('team'))}<br>${esc(t('course'))}</div>`);
  }
  vLibrary() {
    this.rig.flyTo({ target: [0.2, 0.6, 0.6], zoom: 0.45, az: -0.25, pol: 0.88 }, 1.3);
    this.city.setBeacon(-1);
    this.setSheet(`
      <div class="row"><div class="tile">${icon('book')}</div><div class="grow"><div class="h3">${esc(t('library'))}</div><div class="cap">${esc(t('librarySub'))}</div></div><button class="icon-btn" data-act="home" aria-label="${esc(t('close'))}">${icon('close')}</button></div>
      <p class="sub mt3">${esc(t('libSoon'))}</p>`);
  }

  // ----- actions -----
  act(a, ds) {
    if (a === 'menu') return this.show(this.view === 'menu' ? 'home' : 'menu');
    if (a === 'theme') { this.setTheme(!store.get().night); return this.rerender(); }
    if (a === 'setDay' || a === 'setNight') { this.setTheme(a === 'setNight'); return this.rerender(); }
    if (a === 'lang') { store.set({ lang: ds.l }); setLang(ds.l); return this.rerender(); }
    if (a === 'home') { this.rig.flyTo({ target: [0, 0.6, 0], zoom: 1 }, 1.2); return this.show('home'); }
    if (a === 'open') return this.show('district', +ds.i);
    if (a === 'library') return this.show('library');
    if (a === 'obNext') return this.show('onboard', +ds.i);
    if (a === 'obDone') { store.set({ onboarded: true }); this.view = 'home'; return this.show('district', 0); }
    if (a === 'mission') return this.startMission(+ds.i);
    if (a === 'tour') return this.tour();
    if (a === 'reset') {
      if (!this.resetArm) { this.resetArm = true; const s = this.sheet.querySelector('[data-act=reset] span'); if (s) s.textContent = t('resetConfirm'); setTimeout(() => this.resetArm = false, 3000); return; }
      this.resetArm = false; store.reset(); this.city.setBuilt(0); this.city.stationReset(); this.toast(t('resetDone')); return this.show('home');
    }
  }
  tap(ndc) {
    if (this.view === 'mission' || this.view === 'onboard' || this.busy) return;
    this.ray.setFromCamera(ndc, this.engine.camera);
    const hit = this.ray.intersectObjects([...this.city.hits, this.city.libHit], false)[0];
    if (!hit) return;
    if (hit.object.userData.library) return this.show('library');
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
      <p class="sub mt3 center">${esc(this.resultText || '')}</p>
      <button class="btn btn-primary btn-block mt4" data-act="grow" data-focus>${icon('play')}${esc(t('watchGrow'))}</button>
      <p class="cap mt2 center">${esc(t('starRule'))}</p>`, s => {
        s.querySelector('[data-act=grow]').addEventListener('click', e => { e.stopPropagation(); this.growDistrict(i, wasBuilt); });
      });
    void L;
  }
  async tour() {
    this.busy = true; this.hideSheet(); this.rig.autoOrbit = false;
    if (!store.get().night) { this.setTheme(true); this.renderHud(); }
    await this.rig.flyTo({ target: [0, 1.2, 0], zoom: 0.62, pol: 0.78, az: this.rig.az + 0.6 }, 2.2, true);
    await this.rig.flyTo({ target: [0, 2.4, -2.7], zoom: 0.42, pol: 1.05, az: this.rig.az + 1.8 }, 4.5, true);
    await this.rig.flyTo({ target: [0, 0.6, 0], zoom: 1, pol: 0.9, az: this.rig.az + 1.4 }, 3.5, true);
    this.rig.autoOrbit = true; this.busy = false; this.show('home');
  }
  async growDistrict(i, wasBuilt) {
    this.busy = true;
    this.hideSheet();
    const c = this.city.districts[i];
    this.rig.autoOrbit = false;
    await this.rig.flyTo({ target: [c.center[0], 0.6, c.center[1]], zoom: 0.75, az: c.cam.az - 0.5, pol: 0.86 }, 1.2, true);
    if (!wasBuilt) this.city.setBuilt(this.built(), i); else this.city.stationAll(true);
    this.city.wave(c.center[0], c.center[1]);
    this.qadam.cheer();
    this.renderHud();
    await this.rig.flyTo({ az: c.cam.az + 0.4, zoom: 0.9 }, 3.2, true);
    this.rig.autoOrbit = true; this.busy = false;
    this.toast(t('cityBuilt', { p: this.pct() }));
    this.show('home');
  }
}
