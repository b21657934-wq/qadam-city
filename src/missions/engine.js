import { t, tr } from '../i18n.js';
import { icon } from '../ui/icons.js';
import { store } from '../store.js';
import { W, FIG } from './widgets.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function perm(n, seed) { const a = [...Array(n).keys()]; let s = seed * 9301 + 49297; for (let i = n - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// Generic mission: a spec lists 3 steps of kind 'sort' | 'quiz' | 'widget'.
export class Mission {
  constructor(app, i, spec) {
    Object.assign(this, { app, city: app.city, i, spec });
    this.step = 0; this.mistakes = 0; this.hints = 0; this.hl = 0; this.reset();
    app.city.setBeacon(-1);
    app.rig.autoOrbit = false;
    if (spec.start) spec.start(this); else this.defaultStart();
    this.render();
  }
  reset() { this.placed = {}; this.sel = null; this.q = 0; this.ws = {}; this.lock = false; }
  defaultStart() {
    const c = this.city.districts[this.i], portrait = innerWidth < innerHeight;
    this.app.rig.flyTo({ target: [c.center[0], 0.7, c.center[1]], zoom: c.cam.zoom * (portrait ? 0.78 : 0.85), az: c.cam.az, pol: c.cam.pol }, 1.5);
    const q = this.app.qadam; q.goTo(c.center[0] + 1.3, c.center[1] + 1.1);
  }
  get S() { return this.spec.steps[this.step]; }
  stars() { return this.hints === 0 && this.mistakes <= 1 ? 3 : this.mistakes <= 3 && this.hints <= 1 ? 2 : 1; }
  head() {
    const s = this.S, n = this.spec.steps.length;
    return `<div class="m-head"><span class="tag gold">${esc(t('stepOf', { n: this.step + 1, m: n }))}</span><div class="grow"></div>
      <button class="hint-btn" data-h ${this.hl >= 2 ? 'disabled style="opacity:.45"' : ''}>${icon('hint')}${esc(t(this.hl ? 'hintMore' : 'hint'))}</button>
      <button class="icon-btn" data-x aria-label="${esc(t('close'))}">${icon('close')}</button></div>
      <div class="h3">${esc(tr(s.t))}</div>${s.i ? `<p class="sub mt1">${esc(tr(s.i))}</p>` : ''}
      ${this.hl ? `<div class="hint">${icon('hint')}<span>${esc(tr(s.h[this.hl - 1]))}</span></div>` : ''}`;
  }
  foot() { return `<div class="feedback" aria-live="polite"></div><div class="dots mt2">${this.spec.steps.map((_, k) => `<i class="${k === this.step ? 'on' : ''}"></i>`).join('')}</div>`; }
  render() {
    const s = this.S; let body = '';
    if (s.kind === 'sort') {
      const keys = Object.keys(s.slots), left = s.cards.filter(c => !this.placed[c.id]);
      body = `<div class="slots ${keys.length === 2 ? 'two' : ''}">${keys.map(k => `<button class="slot ${this.sel ? 'ready' : ''}" data-slot="${k}" aria-label="${esc(tr(s.slots[k]))}"><span class="sl-h"><b>${k}</b>${esc(tr(s.slots[k]))}</span><span class="fill">${s.cards.filter(c => this.placed[c.id] === k).map(c => `<span class="placed">${icon('check')}${esc(tr(c.l))}</span>`).join('')}</span></button>`).join('')}</div>
        <div class="cards">${left.map(c => `<button class="card ${this.sel === c.id ? 'sel' : ''}" data-card="${c.id}" aria-pressed="${this.sel === c.id}">${esc(tr(c.l))}</button>`).join('')}</div>`;
    } else if (s.kind === 'quiz') {
      const q = s.qs[this.q], order = perm(q.a.length, this.i * 31 + this.step * 7 + this.q * 3 + 1);
      body = `${s.fig ? `<div class="fig-wrap mt3">${FIG[s.fig]()}</div>` : ''}
        ${s.qs.length > 1 ? `<div class="row mt3" style="gap:6px">${s.qs.map((_, k) => `<span class="tag ${k === this.q ? 'gold' : ''}" style="${k > this.q ? 'opacity:.5' : ''}">${k < this.q ? icon('check') : ''}${k + 1}/${s.qs.length}</span>`).join('')}</div>` : ''}
        <p class="q">${esc(tr(q.q))}</p>
        <div class="opts ${q.a.some(o => tr(o).length > 20) ? 'one' : ''}">${order.map(k => `<button class="opt" data-opt="${k}">${esc(tr(q.a[k]))}</button>`).join('')}</div>`;
    } else {
      body = `<div class="fig-wrap mt3 w-${s.w}">${W[s.w].render(this.ws, s)}</div>`;
    }
    this.app.setSheet(this.head() + body + this.foot(), root => this.bind(root), { grab: false });
  }
  fb(msg, ok) { const f = this.app.sheet.querySelector('.feedback'); if (f) { f.textContent = msg || ''; f.classList.toggle('ok', !!ok); } }
  bind(root) {
    root.querySelector('[data-x]').addEventListener('click', () => this.close());
    root.querySelector('[data-h]').addEventListener('click', () => { if (this.hl >= 2) return; this.hl++; this.hints++; this.render(); });
    const s = this.S;
    if (s.kind === 'sort') {
      root.querySelectorAll('[data-card]').forEach(b => { b.addEventListener('click', () => { if (this.dragged) return; this.sel = this.sel === b.dataset.card ? null : b.dataset.card; this.render(); }); this.dragable(b); });
      root.querySelectorAll('[data-slot]').forEach(b => b.addEventListener('click', () => this.drop(b.dataset.slot)));
    } else if (s.kind === 'quiz') {
      root.querySelectorAll('[data-opt]').forEach(b => b.addEventListener('click', () => this.answer(+b.dataset.opt, b)));
    } else {
      const api = {
        ok: msg => { if (this.lock) return; this.lock = true; this.fb(msg || tr(s.okText) || '', true); setTimeout(() => this.stepDone(), s.okText ? 1500 : 800); },
        bad: msg => { this.mistakes++; this.fb(msg); },
        fb: msg => this.fb(msg),
        redraw: () => { const w = root.querySelector('.fig-wrap'); w.innerHTML = W[s.w].render(this.ws, s); W[s.w].bind(w, this.ws, api, s); },
      };
      W[s.w].bind(root.querySelector('.fig-wrap'), this.ws, api, s);
    }
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
      if (ghost) { ghost.remove(); this.dragged = true; setTimeout(() => this.dragged = false, 50); const el = document.elementFromPoint(e.clientX, e.clientY), slot = el && el.closest('[data-slot]'); if (slot) this.drop(slot.dataset.slot); else this.render(); }
      st = null; ghost = null;
    };
    b.addEventListener('pointerdown', e => { if (e.button) return; st = { x: e.clientX, y: e.clientY }; addEventListener('pointermove', mv); addEventListener('pointerup', up); });
  }
  drop(slot) {
    const s = this.S;
    if (!this.sel) return this.fb(t('tapCard'));
    const c = s.cards.find(x => x.id === this.sel);
    if (c.slot !== slot) { this.mistakes++; this.sel = null; this.render(); this.fb(t('wrongSlot')); const el = this.app.sheet.querySelector(`[data-slot="${slot}"]`); if (el) el.classList.add('bad'); return; }
    this.placed[c.id] = slot; this.sel = null;
    this.spec.onCard && this.spec.onCard(this, c);
    this.render();
    if (Object.keys(this.placed).length === s.cards.length) { this.lock = true; setTimeout(() => this.stepDone(), 700); }
  }
  answer(k, btn) {
    if (this.lock) return;
    const s = this.S, q = s.qs[this.q];
    if (k !== q.ok) { this.mistakes++; btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no'); this.fb(t('wrong')); return; }
    btn.classList.add('ok'); this.app.sheet.querySelectorAll('[data-opt]').forEach(b => b.disabled = true);
    this.lock = true;
    this.spec.onQ && this.spec.onQ(this, this.step, this.q);
    if (q.why) this.fb(tr(q.why), true); else this.fb('', true);
    setTimeout(() => { this.lock = false; this.q++; if (this.q >= s.qs.length) this.stepDone(); else this.render(); }, q.why ? 1600 : 650);
  }
  stepDone() {
    const last = this.step >= this.spec.steps.length - 1;
    if (this.spec.onStep) this.spec.onStep(this, this.step); else this.city.preview(this.i, (this.step + 1) / (this.spec.steps.length + 1));
    if (last) return this.finish();
    this.step++; this.hl = 0; this.reset(); this.render();
  }
  finish() {
    this.app.rig.autoOrbit = true;
    this.app.resultText = tr(this.spec.done);
    this.app.finishMission(this.i, this.stars());
  }
  close() {
    const built = store.builtCount() > this.i;
    if (this.spec.close) this.spec.close(this, built); else if (!built) this.city.unpreview(this.i);
    this.app.rig.autoOrbit = true; this.app.mission = null;
    this.app.show('district', this.i);
  }
}
