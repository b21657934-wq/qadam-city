import { t, tr, M1 } from '../i18n.js';
import { icon } from '../ui/icons.js';
import { store } from '../store.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PART = { thermo: 'thermo', anemo: 'anemo', siren: 'siren', board: 'board', acc: 'gauge', early: 'early', streets: 'streets', weather: 'weather' };
const ORDER = ['P', 'E', 'A', 'S'];

// Week 1 — Weather station: PEAS, environment types, agent architecture
export class Mission1 {
  constructor(app, i) {
    this.app = app; this.city = app.city; this.i = i;
    this.step = 0; this.mistakes = 0; this.hints = 0; this.hl = 0; this.placed = {}; this.sel = null; this.q = 0; this.answered = {};
    const st = this.city.station;
    st.group.visible = true; this.city.stationReset();
    app.rig.autoOrbit = false;
    app.city.setBeacon(-1);
    app.rig.flyTo({ target: [-5.6, 0.8, -3.4], zoom: innerWidth < innerHeight ? 0.22 : 0.3, az: -0.75, pol: 0.95 }, 1.5);
    app.qadam.goTo(-4.35, -2.35);
    this.render();
  }
  stars() { return this.hints === 0 && this.mistakes <= 1 ? 3 : this.mistakes <= 3 && this.hints <= 1 ? 2 : 1; }
  head(title, sub) {
    const hs = [M1.s1h, M1.s2h, M1.s3h][this.step];
    return `<div class="m-head"><span class="tag gold">${esc(t('stepOf', { n: this.step + 1, m: 3 }))}</span><div class="grow"></div>
      <button class="hint-btn" data-h ${this.hl >= 2 ? 'disabled style="opacity:.45"' : ''}>${icon('hint')}${esc(t(this.hl ? 'hintMore' : 'hint'))}</button>
      <button class="icon-btn" data-x aria-label="${esc(t('close'))}">${icon('close')}</button></div>
      <div class="h3">${esc(title)}</div>${sub ? `<p class="sub mt1">${esc(sub)}</p>` : ''}
      ${this.hl ? hs.slice(0, this.hl).map(h => `<div class="hint">${icon('hint')}<span>${esc(tr(h))}</span></div>`).slice(-1).join('') : ''}`;
  }
  foot() { return `<div class="feedback" aria-live="polite"></div><div class="dots mt2">${[0, 1, 2].map(k => `<i class="${k === this.step ? 'on' : ''}"></i>`).join('')}</div>`; }
  render() {
    const a = this.app;
    if (this.step === 0) {
      const left = M1.cards.filter(c => !this.placed[c.id]);
      a.setSheet(`${this.head(tr(M1.s1t), tr(M1.s1i))}
        <div class="slots">${ORDER.map(k => `<button class="slot ${this.sel ? 'ready' : ''}" data-slot="${k}" aria-label="${esc(tr(M1.slots[k]))}"><span class="sl-h"><b>${k}</b>${esc(tr(M1.slots[k]))}</span><span class="fill">${M1.cards.filter(c => this.placed[c.id] === k).map(c => `<span class="placed">${icon('check')}${esc(tr(c.l))}</span>`).join('')}</span></button>`).join('')}</div>
        <div class="cards">${left.map(c => `<button class="card ${this.sel === c.id ? 'sel' : ''}" data-card="${c.id}" aria-pressed="${this.sel === c.id}">${esc(tr(c.l))}</button>`).join('')}</div>
        ${this.foot()}`, s => this.bind(s), { grab: false, focus: false });
    } else if (this.step === 1) {
      const q = M1.qs[this.q];
      a.setSheet(`${this.head(tr(M1.s2t))}
        <div class="row mt2" style="gap:6px">${M1.qs.map((_, k) => `<span class="tag ${k < this.q ? '' : k === this.q ? 'gold' : ''}" style="${k > this.q ? 'opacity:.5' : ''}">${k < this.q ? icon('check') : ''}${k + 1}/3</span>`).join('')}</div>
        <p class="q">${esc(tr(q.q))}</p>
        <div class="opts">${q.a.map((o, k) => `<button class="opt" data-opt="${k}">${esc(tr(o))}</button>`).join('')}</div>
        ${this.foot()}`, s => this.bind(s), { grab: false, focus: false });
    } else {
      a.setSheet(`${this.head(tr(M1.s3t))}
        <p class="q">${esc(tr(M1.s3q))}</p>
        <div class="opts">${M1.s3a.map((o, k) => `<button class="opt" data-opt="${k}">${esc(tr(o))}</button>`).join('')}</div>
        ${this.foot()}`, s => this.bind(s), { grab: false, focus: false });
    }
  }
  fb(msg, ok) { const f = this.app.sheet.querySelector('.feedback'); if (f) { f.textContent = msg; f.classList.toggle('ok', !!ok); } }
  bind(s) {
    s.querySelector('[data-x]').addEventListener('click', () => this.close());
    const hb = s.querySelector('[data-h]');
    hb.addEventListener('click', () => { if (this.hl >= 2) return; this.hl++; this.hints++; this.render(); });
    s.querySelectorAll('[data-card]').forEach(b => {
      b.addEventListener('click', () => { if (this.dragged) return; this.sel = this.sel === b.dataset.card ? null : b.dataset.card; this.render(); });
      this.dragable(b);
    });
    s.querySelectorAll('[data-slot]').forEach(b => b.addEventListener('click', () => this.drop(b.dataset.slot)));
    s.querySelectorAll('[data-opt]').forEach(b => b.addEventListener('click', () => this.answer(+b.dataset.opt, b)));
  }
  dragable(b) {
    let st = null, ghost = null;
    const mv = e => {
      if (!st) return;
      if (!ghost && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 8) {
        ghost = b.cloneNode(true); ghost.classList.add('sel');
        Object.assign(ghost.style, { position: 'fixed', zIndex: 9, pointerEvents: 'none', left: 0, top: 0, margin: 0, transition: 'none' });
        document.body.appendChild(ghost); this.sel = b.dataset.card; b.style.opacity = '0.35';
        this.app.sheet.querySelectorAll('.slot').forEach(x => x.classList.add('ready'));
      }
      if (ghost) { e.preventDefault(); ghost.style.transform = `translate(${e.clientX - ghost.offsetWidth / 2}px,${e.clientY - 20}px)`; }
    };
    const up = e => {
      removeEventListener('pointermove', mv); removeEventListener('pointerup', up);
      if (ghost) {
        ghost.remove(); this.dragged = true; setTimeout(() => this.dragged = false, 50);
        const el = document.elementFromPoint(e.clientX, e.clientY), slot = el && el.closest('[data-slot]');
        if (slot) this.drop(slot.dataset.slot); else this.render();
      }
      st = null; ghost = null;
    };
    b.addEventListener('pointerdown', e => { if (e.button) return; st = { x: e.clientX, y: e.clientY }; addEventListener('pointermove', mv); addEventListener('pointerup', up); });
  }
  drop(slot) {
    if (!this.sel) return this.fb(t('tapCard'));
    const c = M1.cards.find(x => x.id === this.sel);
    if (c.slot !== slot) {
      this.mistakes++; this.sel = null; this.render(); this.fb(t('wrongSlot'));
      const el = this.app.sheet.querySelector(`[data-slot="${slot}"]`); if (el) el.classList.add('bad');
      return;
    }
    this.placed[c.id] = slot; this.sel = null;
    const city = this.city;
    if ((c.id === 'anemo' || c.id === 'siren') && city.station.parts.mast.scale.x < 0.5) city.stationShow('mast');
    city.stationShow(PART[c.id]);
    if (c.id === 'weather') this.app.snow.blow();
    if (c.id === 'streets') city.wave(-5.6, -3.4, 0x4F98A3);
    if (Object.keys(this.placed).length === M1.cards.length) { this.render(); this.fb('', true); setTimeout(() => this.next(), 700); }
    else this.render();
  }
  answer(k, btn) {
    const sheet = this.app.sheet;
    if (this.lock) return;
    const ok = this.step === 1 ? M1.qs[this.q].ok : M1.s3ok;
    if (k !== ok) { this.mistakes++; btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no'); this.fb(t('wrong')); return; }
    btn.classList.add('ok'); sheet.querySelectorAll('[data-opt]').forEach(b => b.disabled = true); this.fb('', true);
    this.lock = true;
    if (this.step === 1) {
      this.city.led(this.q);
      setTimeout(() => { this.lock = false; this.q++; if (this.q >= M1.qs.length) this.next(); else this.render(); }, 650);
    } else {
      this.city.stationShow('brain'); [0, 1, 2].forEach(i => this.city.led(i));
      this.city.wave(-5.6, -3.4);
      setTimeout(() => { this.lock = false; this.finish(); }, 900);
    }
  }
  next() { this.step++; this.hl = 0; this.render(); }
  finish() {
    this.app.rig.autoOrbit = true;
    this.app.resultText = tr(M1.done);
    this.app.finishMission(this.i, this.stars());
  }
  close() {
    const built = store.builtCount() > this.i;
    if (built) this.city.stationAll(true); else this.city.station.group.visible = false;
    this.app.rig.autoOrbit = true;
    this.app.mission = null;
    this.app.show('district', this.i);
  }
}
