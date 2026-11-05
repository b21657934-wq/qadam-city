import { t, tr } from '../i18n.js';
import { icon } from '../ui/icons.js';
import { store } from '../store.js';
import { W, FIG } from './widgets.js';
import { K } from '../world/city.js';
import { KEYS } from './keys.js';
import { sfx } from '../sfx.js';

const keys = () => store.get().keys ?? 5;
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
    if (spec.sim) { this.sim = spec.sim(this); app.engine.hooks.push(this.sim); }
    this.render();
  }
  reset() { this.placed = {}; this.sel = null; this.q = 0; this.ws = {}; this.lock = false; this.solved = false; this.picked = null; this.wrongPick = {}; this.running = false; this.dv = undefined; this.replaying = null; this.round = null; this.streak = 0; this.showSol = false; this.tries = 0; this.order = null; this.keyAsk = false; this.keyShown = false; this.earn = null; this.tried = {}; }
  newRound() {
    const g = this.S.gens; let k; do { k = Math.floor(Math.random() * g.length); } while (g.length > 1 && k === this.lastGen);
    this.lastGen = k; this.round = g[k](); this.ws = {}; this.tries = 0; this.showSol = false; this.keyAsk = false; this.keyShown = false; this.hl = this.S.exam ? 0 : 1; this.lock = false; window.__dr = this.round;
  }
  defaultStart() {
    const c = this.city.districts[this.i], portrait = innerWidth < innerHeight;
    this.app.rig.flyTo({ target: [c.center[0], 0.7, c.center[1]], zoom: c.cam.zoom * (portrait ? 1.06 : 1.12), az: c.cam.az, pol: c.cam.pol }, 1.5);
    const q = this.app.qadam; q.goTo(c.center[0] / K + 1.0, c.center[1] / K + 0.8);
  }
  get S() { return this.spec.steps[this.step]; }
  stars() { return this.hints === 0 && this.mistakes <= 1 ? 3 : this.mistakes <= 3 && this.hints <= 1 ? 2 : 1; }
  head() {
    const s = this.S, n = this.spec.steps.length, H = s.kind === 'drill' ? (this.round && this.round.hint) : s.h, exam = s.kind === 'drill' && s.exam;
    if (this.earn) return `<div class="m-head"><span class="tag gold">${icon('key')}${esc(t('keyCount', { n: keys() }))}</span><div class="grow"></div><button class="icon-btn" data-x aria-label="${esc(t('close'))}">${icon('close')}</button></div><div class="h3">${esc(t('keyEarnT'))}</div><p class="sub mt1">${esc(t('keyEarnI'))}</p>`;
    return `<div class="m-head"><span class="tag gold">${esc(exam ? t('examTag') : t('stepOf', { n: this.step + 1, m: n }))}</span><div class="grow"></div>
      ${exam || !H ? '' : `<button class="hint-btn" data-h ${this.hl >= 2 ? 'disabled style="opacity:.45"' : ''}>${icon('hint')}${esc(t(this.hl ? 'hintMore' : 'hint'))}</button>`}
      <button class="icon-btn" data-x aria-label="${esc(t('close'))}">${icon('close')}</button></div>
      <div class="h3">${esc(tr(s.t))}</div>${s.i ? `<p class="sub mt1">${esc(tr(s.i))}</p>` : ''}
      ${this.hl && H ? `<div class="hint">${icon('hint')}<span>${esc(tr(H[this.hl - 1]))}</span></div>` : ''}`;
  }
  foot() {
    const last = this.step >= this.spec.steps.length - 1, s = this.S;
    if (this.solved) return `<div class="learn">${icon('check')}<span>${esc(tr(typeof s.learn === 'function' ? s.learn(this) : (s.learn || s.okText || { en: '' })))}</span></div><button class="btn btn-primary btn-block mt3" data-next>${esc(t(last ? 'finish' : 'next'))}${icon('arrow')}</button><div class="dots mt3">${this.spec.steps.map((_, k) => `<i class="${k === this.step ? 'on' : ''}"></i>`).join('')}</div>`;
    return `<div class="feedback" aria-live="polite"></div><div class="dots mt2">${this.spec.steps.map((_, k) => `<i class="${k === this.step ? 'on' : ''}"></i>`).join('')}</div>`; }
  render() {
    const s = this.S; let body = '';
    if (this.entered !== this.step) { this.entered = this.step; if (s.enter) s.enter(this); }
    if (s.kind === 'run') {
      body = `${s.live ? `<div class="live cap mt3" data-live>${esc(s.live(this))}</div>` : ''}${this.solved ? '' : `<button class="btn btn-primary btn-block mt3" data-run ${this.running ? 'disabled' : ''}>${icon(s.icon || 'play')}${esc(tr(s.btn))}</button>`}`;
    } else if (s.kind === 'dial') {
      const v = s.values[this.dv ?? s.start];
      body = `<div class="stepper mt3"><button class="icon-btn" data-dv="-1" aria-label="−" ${this.solved ? 'disabled' : ''}><span class="pm">−</span></button><div class="grow center"><div class="cap">${esc(tr(s.label))}</div><div class="pc-b">${esc(s.fmt ? s.fmt(v) : v)}</div></div><button class="icon-btn" data-dv="1" aria-label="+" ${this.solved ? 'disabled' : ''}><span class="pm">+</span></button></div><div class="live cap mt2" data-live>${esc(s.live ? s.live(this, v) : '')}</div>`;
    } else if (s.kind === 'pick') {
      if (!this.order) { this.order = s.opts.map((_, k) => k); if (!s.keep) for (let k = this.order.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [this.order[k], this.order[j]] = [this.order[j], this.order[k]]; } }
      body = `<div class="picks ${s.opts.length === 2 ? 'two' : s.opts.length === 4 ? 'four' : ''}">${this.order.map(k => s.opts[k]).map(o => `<button class="pick ${this.picked === o.id ? 'ok' : ''} ${this.wrongPick[o.id] && !s.compare ? 'no' : ''} ${s.compare && !this.solved && this.sel === o.id ? 'chosen' : ''} ${s.compare && (this.tried || {})[o.id] && !this.solved ? 'tried' : ''} ${this.solved && s.compare ? 'replay' : ''} ${this.replaying === o.id ? 'busy' : ''}" data-pick="${o.id}" ${this.solved && !s.compare ? 'disabled' : ''}><span class="tile">${icon(o.icon)}</span><span class="pick-l">${esc(tr(o.l))}</span></button>`).join('')}</div>${s.live ? `<div class="live cap mt2" data-live>${esc(s.live(this))}</div>` : ''}${s.compare && s.cmp && s.cmp(this).length ? `<div class="cmp">${s.cmp(this).map(r => `<div class="cmp-r ${this.solved ? r[2] || '' : ''}"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}</div>` : ''}${s.compare && this.solved ? `<p class="cap mt2">${esc(t('compareHint'))}</p>` : ''}${s.compare && !this.solved ? `<p class="cap mt2">${esc(t(this.sel ? 'compareCheck' : 'compareExplore'))}</p><button class="btn btn-primary btn-block mt2" data-pcheck ${this.sel && !this.lock ? '' : 'disabled'}>${icon('check')}${esc(this.sel ? t('checkChoice', { a: tr(s.opts.find(o => o.id === this.sel).l) }) : t('check'))}</button>` : ''}`;
    } else if (s.kind === 'sort') {
      const keys = Object.keys(s.slots), left = s.cards.filter(c => !this.placed[c.id]);
      body = `<div class="slots ${keys.length === 2 ? 'two' : ''}">${keys.map(k => `<button class="slot ${this.sel ? 'ready' : ''}" data-slot="${k}" aria-label="${esc(tr(s.slots[k]))}"><span class="sl-h"><b>${k}</b>${esc(tr(s.slots[k]))}</span><span class="fill">${s.cards.filter(c => this.placed[c.id] === k).map(c => `<span class="placed">${icon('check')}${esc(tr(c.l))}</span>`).join('')}</span></button>`).join('')}</div>
        <div class="cards">${left.map(c => `<button class="card ${this.sel === c.id ? 'sel' : ''}" data-card="${c.id}" aria-pressed="${this.sel === c.id}">${esc(tr(c.l))}</button>`).join('')}</div>`;
    } else if (s.kind === 'quiz') {
      const q = s.qs[this.q], order = perm(q.a.length, this.i * 31 + this.step * 7 + this.q * 3 + 1);
      body = `${s.fig ? `<div class="fig-wrap mt3">${FIG[s.fig]()}</div>` : ''}
        ${s.qs.length > 1 ? `<div class="row mt3" style="gap:6px">${s.qs.map((_, k) => `<span class="tag ${k === this.q ? 'gold' : ''}" style="${k > this.q ? 'opacity:.5' : ''}">${k < this.q ? icon('check') : ''}${k + 1}/${s.qs.length}</span>`).join('')}</div>` : ''}
        <p class="q">${esc(tr(q.q))}</p>
        <div class="opts ${q.a.some(o => tr(o).length > 20) ? 'one' : ''}">${order.map(k => `<button class="opt" data-opt="${k}">${esc(tr(q.a[k]))}</button>`).join('')}</div>`;
    } else if (s.kind === 'drill' && this.earn) {
      const k = this.earn, card = KEYS[this.i][k.c];
      body = `<div class="earn mt3"><div class="label row" style="gap:6px">${icon('book')}${esc(t('fromBook', { n: this.i + 1 }))}</div><p class="earn-p">${esc(tr(card.p))}</p>
        ${card.qs.map((q, qi) => `<p class="q">${qi + 1}. ${esc(tr(q.q))}</p><div class="opts one">${k.ord[qi].map(ai => `<button class="opt ${k.sel[qi] === ai ? 'sel' : ''} ${k.checked && k.sel[qi] === ai ? (ai === 0 ? 'ok' : 'no') : ''}" data-eq="${qi}" data-ea="${ai}" ${k.won ? 'disabled' : ''}>${esc(tr(q.a[ai]))}</button>`).join('')}</div>`).join('')}
        ${k.won ? `<div class="learn">${icon('key')}<span>${esc(t('keyWon', { n: keys() }))}</span></div><button class="btn btn-primary btn-block mt3" data-earn-back data-focus>${esc(t('keyBack'))}${icon('arrow')}</button>`
          : `<button class="btn btn-primary btn-block mt3" data-earn-check ${k.sel.every(x => x != null) ? '' : 'disabled'}>${icon('check')}${esc(t('check'))}</button><button class="btn btn-ghost btn-block mt2" data-earn-back>${icon('back')}${esc(t('keyBackTask'))}</button>`}</div>`;
    } else if (s.kind === 'drill') {
      if (!this.round) this.newRound();
      const r = this.round, need = s.need || 1;
      body = s.exam ? `<div class="dr-prog mt3">${[...Array(need)].map((_, k) => `<i class="${k < this.streak ? 'on' : ''}"></i>`).join('')}<span class="cap">${esc(t('examRule', { n: need }))}</span></div>` : '';
      if (r.w) body += `<p class="q">${esc(tr(r.t))}</p><div class="fig-wrap mt2 w-${r.w} ${this.showSol || this.keyShown ? 'off' : ''}">${W[r.w].render(this.ws, r)}</div>`;
      else body += `<p class="q">${esc(tr(r.q))}</p>${r.fig ? `<div class="dr-fig mt2">${typeof r.fig === 'function' ? r.fig(tr) : r.fig}</div>` : ''}${this.solved || this.showSol || this.keyShown ? '' : `<div class="num-row mt3"><input class="num-in" data-num type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" placeholder="${esc(t('yourAnswer'))}" aria-label="${esc(t('yourAnswer'))}"><button class="btn btn-primary" data-check>${icon('check')}${esc(t('check'))}</button></div>`}`;
      if (this.keyShown && !this.solved) body += `<div class="sol key mt3"><div class="label row" style="gap:6px">${icon('key')}${esc(t('answer'))}${r.w ? '' : `: ${esc(String(r.ans).replace('.', ','))}${r.pct ? ' %' : ''}`}</div><p>${esc(tr(r.sol))}</p></div><button class="btn btn-primary btn-block mt3" data-keyok data-focus>${esc(t('keyGo'))}${icon('arrow')}</button>`;
      else if (!this.solved && !this.showSol) body += this.keyArea();
      if (this.showSol) body += `<div class="sol mt3"><div class="label">${esc(t('solution'))}</div><p>${esc(tr(r.sol))}</p></div><button class="btn btn-primary btn-block mt3" data-newround data-focus>${icon('reset')}${esc(t('newTask'))}</button>`;
    } else {
      body = `<div class="fig-wrap mt3 w-${s.w}">${W[s.w].render(this.ws, s)}</div>`;
    }
    this.app.setSheet(this.head() + body + this.foot(), root => this.bind(root), { grab: false });
    this.coach();
  }
  keyArea() {
    const n = keys();
    if (this.keyAsk) return `<div class="key-ask mt3"><p>${esc(t('keyAsk', { n: n - 1 }))}</p><div class="row mt2" style="gap:8px"><button class="btn btn-primary grow" data-key-yes data-focus>${icon('key')}${esc(t('keyYes'))}</button><button class="btn btn-secondary" data-key-no>${esc(t('cancel'))}</button></div></div>`;
    return `<div class="key-row mt3"><button class="key-btn" data-key ${n ? '' : 'disabled'}>${icon('key')}<span>${esc(t('keyUse'))}</span><b>${n}</b></button><button class="key-earn ${n ? '' : 'hot'}" data-earn>${icon('plus')}<span>${esc(t('keyEarn'))}</span></button></div>`;
  }
  coach() {
    document.querySelectorAll('.coach').forEach(e => e.remove());
    const seen = store.get().coach || {};
    if (this.solved || this.step > 0 || seen[this.i]) return;
    const tg = this.app.sheet.querySelector('.picks, .cards, .fig-wrap');
    if (!tg) return;
    const c = document.createElement('div'); c.className = 'coach'; c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<div class="coach-ring"></div>';
    tg.classList.add('has-coach'); tg.appendChild(c);
    const off = () => { c.remove(); tg.classList.remove('has-coach'); store.set({ coach: Object.assign({}, store.get().coach, { [this.i]: true }) }); this.app.sheet.removeEventListener('pointerdown', off, true); };
    this.app.sheet.addEventListener('pointerdown', off, true);
  }
  live() { const s = this.S, e = this.app.sheet.querySelector('[data-live]'); if (e && s.live) e.textContent = s.live(this); }
  fb(msg, ok) { const f = this.app.sheet.querySelector('.feedback'); if (f) { f.textContent = msg || ''; f.classList.toggle('ok', !!ok); } }
  bind(root) {
    root.querySelector('[data-x]').addEventListener('click', () => this.close());
    const hb = root.querySelector('[data-h]'); hb && hb.addEventListener('click', () => { if (this.hl >= 2) return; this.hl++; this.hints++; this.render(); });
    const s = this.S;
    const nx = root.querySelector('[data-next]'); if (nx) nx.addEventListener('click', () => this.advance());
    if (this.solved && s.kind === 'pick' && s.compare) {
      root.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', async () => {
        const o = s.opts.find(x => x.id === b.dataset.pick); if (this.lock || !o.play) return;
        this.lock = true; this.replaying = o.id; this.render(); await o.play(this); this.lock = false; this.replaying = null; if (this.app.mission === this) this.render();
      }));
    }
    if (this.solved) return;
    if (s.kind === 'run') {
      const rb = root.querySelector('[data-run]');
      rb && rb.addEventListener('click', async () => { if (this.running) return; this.running = true; rb.disabled = true; await s.go(this); this.running = false; if (this.app.mission === this) this.stepDone(); });
    } else if (s.kind === 'dial') {
      root.querySelectorAll('[data-dv]').forEach(b => b.addEventListener('click', () => {
        const n = Math.max(0, Math.min(s.values.length - 1, (this.dv ?? s.start) + +b.dataset.dv)); if (n === (this.dv ?? s.start)) return;
        this.dv = n; const v = s.values[n]; s.onChange && s.onChange(this, v);
        if (s.ok(v)) { this.render(); setTimeout(() => this.stepDone(), 700); } else { this.mistakes += s.countMistakes ? 1 : 0; this.render(); }
      }));
    } else if (s.kind === 'pick' && s.compare) {
      // explore first: each tap only shows that algorithm's route; the answer is checked with a separate button
      root.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', async () => {
        if (this.lock) return; const o = s.opts.find(x => x.id === b.dataset.pick);
        this.lock = true; this.replaying = o.id; this.sel = o.id; this.fb(''); this.render();
        if (o.play) await o.play(this); if (this.app.mission !== this) return;
        this.lock = false; this.replaying = null; this.tried = Object.assign({}, this.tried, { [o.id]: true }); this.render();
      }));
      const pc = root.querySelector('[data-pcheck]');
      pc && pc.addEventListener('click', () => {
        if (this.lock || !this.sel) return; const o = s.opts.find(x => x.id === this.sel);
        if (!o.ok) { sfx.play('bad'); this.mistakes++; this.wrongPick[o.id] = true; this.render(); this.fb(tr(typeof o.why === 'function' ? o.why(this) : o.why)); return; }
        this.picked = o.id; this.spec.onPick && this.spec.onPick(this, o); this.stepDone();
      });
    } else if (s.kind === 'pick') {
      root.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', async () => {
        if (this.lock) return;
        const o = s.opts.find(x => x.id === b.dataset.pick);
        if (o.play) { this.lock = true; root.querySelectorAll('[data-pick]').forEach(x => x.classList.toggle('busy', x === b)); await o.play(this); this.lock = false; if (!this.app.mission) return; }
        const bb = this.app.sheet.querySelector(`[data-pick="${o.id}"]`) || b;
        this.app.sheet.querySelectorAll('[data-pick]').forEach(x => x.classList.remove('busy'));
        if (!o.ok) { sfx.play('bad'); this.mistakes++; this.wrongPick[o.id] = true; bb.classList.remove('no'); void bb.offsetWidth; bb.classList.add('no'); this.fb(tr(typeof o.why === 'function' ? o.why(this) : o.why)); return; }
        this.picked = o.id; this.spec.onPick && this.spec.onPick(this, o); this.stepDone();
      }));
    } else if (s.kind === 'sort') {
      root.querySelectorAll('[data-card]').forEach(b => { b.addEventListener('click', () => { if (this.dragged) return; this.sel = this.sel === b.dataset.card ? null : b.dataset.card; this.render(); }); this.dragable(b); });
      root.querySelectorAll('[data-slot]').forEach(b => b.addEventListener('click', () => this.drop(b.dataset.slot)));
    } else if (s.kind === 'drill' && this.earn) {
      const k = this.earn, card = KEYS[this.i][k.c];
      root.querySelectorAll('[data-eq]').forEach(b => b.addEventListener('click', () => { k.sel[+b.dataset.eq] = +b.dataset.ea; k.checked = false; this.render(); }));
      const ck = root.querySelector('[data-earn-check]');
      ck && ck.addEventListener('click', () => {
        if (k.sel.every(x => x === 0)) { store.set({ keys: keys() + 1, earnN: Object.assign({}, store.get().earnN, { [this.i]: (store.get().earnN?.[this.i] || 0) + 1 }) }); k.won = true; sfx.play('reward'); this.render(); const lw = this.app.sheet.querySelector('.earn .learn'); lw && lw.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        else { sfx.play('bad'); k.checked = true; this.render(); this.fb(t('earnWrong')); }
      });
      root.querySelectorAll('[data-earn-back]').forEach(b => b.addEventListener('click', () => { this.earn = null; this.render(); }));
      void card;
    } else if (s.kind === 'drill') {
      const r = this.round;
      const kb = root.querySelector('[data-key]'); kb && kb.addEventListener('click', () => { if (keys() > 0) { this.keyAsk = true; this.render(); } });
      const ky = root.querySelector('[data-key-yes]'); ky && ky.addEventListener('click', () => { if (keys() <= 0) return; store.set({ keys: keys() - 1 }); sfx.play('key'); this.hints++; this.keyAsk = false; this.keyShown = true; this.render(); });
      const kn = root.querySelector('[data-key-no]'); kn && kn.addEventListener('click', () => { this.keyAsk = false; this.render(); });
      const eb = root.querySelector('[data-earn]'); eb && eb.addEventListener('click', () => {
        const cards = KEYS[this.i], c = (store.get().earnN?.[this.i] || 0) % cards.length;
        const ord = cards[c].qs.map(q => { const a = q.a.map((_, j) => j); for (let j = a.length - 1; j > 0; j--) { const x = Math.floor(Math.random() * (j + 1)); [a[j], a[x]] = [a[x], a[j]]; } return a; });
        this.earn = { c, ord, sel: cards[c].qs.map(() => null), checked: false, won: false }; this.keyAsk = false; this.render();
      });
      const nr = root.querySelector('[data-newround]'); if (nr) nr.addEventListener('click', () => { this.newRound(); this.render(); });
      if (this.showSol) return;

      const win = () => {
        this.streak++;
        if (this.streak >= (s.need || 1)) { this.lastSol = r.sol; this.lock = false; return this.stepDone(); }
        this.fb(tr(r.sol), true); this.lock = true;
        setTimeout(() => { if (this.app.mission !== this || this.round !== r) return; this.newRound(); this.render(); }, 2600);
      };
      const kok = root.querySelector('[data-keyok]'); if (kok) { kok.addEventListener('click', () => { if (this.lock) return; win(); }); return; }
      const lose = msg => {
        sfx.play('bad'); this.mistakes++; this.tries++;
        if (s.exam || this.tries >= 2) { this.streak = 0; this.showSol = true; this.render(); this.fb(msg || t(s.exam ? 'examFail' : 'wrongCalc')); }
        else this.fb(msg || t('tryAgainCalc'));
      };
      if (r.w) {
        const api = {
          ok: () => { if (this.lock) return; this.lock = true; setTimeout(() => { this.lock = false; win(); }, 450); },
          bad: msg => lose(msg), fb: msg => this.fb(msg),
          redraw: () => { const w = root.querySelector('.fig-wrap'); w.innerHTML = W[r.w].render(this.ws, r); W[r.w].bind(w, this.ws, api, r); },
        };
        W[r.w].bind(root.querySelector('.fig-wrap'), this.ws, api, r);
      } else {
        const inp = root.querySelector('[data-num]'), cb = root.querySelector('[data-check]');
        const go = () => {
          if (this.lock) return;
          let v = parseFloat(String(inp.value).trim().replace(',', '.').replace(/[−–]/g, '-'));
          if (isNaN(v)) return this.fb(t('enterNumber'));
          if (r.pct && v > 0 && v <= 1 && r.ans > 1) v = v * 100;
          if (Math.abs(v - r.ans) <= (r.tol || 0) + 1e-9) { inp.classList.add('ok'); inp.disabled = true; cb.disabled = true; win(); }
          else { inp.classList.remove('no'); void inp.offsetWidth; inp.classList.add('no'); lose(); }
        };
        cb.addEventListener('click', go); inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      }
    } else if (s.kind === 'quiz') {
      root.querySelectorAll('[data-opt]').forEach(b => b.addEventListener('click', () => this.answer(+b.dataset.opt, b)));
    } else {
      const api = {
        ok: () => { if (this.lock) return; this.lock = true; setTimeout(() => this.stepDone(), 450); },
        bad: msg => { sfx.play('bad'); this.mistakes++; this.fb(msg); },
        fb: msg => this.fb(msg),
        redraw: () => { const w = root.querySelector('.fig-wrap'); w.innerHTML = W[s.w].render(this.ws, s); W[s.w].bind(w, this.ws, api, s); s.onWidget && s.onWidget(this, this.ws); },
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
    if (c.slot !== slot) { sfx.play('bad'); this.mistakes++; this.sel = null; this.render(); this.fb(t('wrongSlot')); const el = this.app.sheet.querySelector(`[data-slot="${slot}"]`); if (el) el.classList.add('bad'); return; }
    this.placed[c.id] = slot; this.sel = null;
    this.spec.onCard && this.spec.onCard(this, c);
    this.render();
    if (Object.keys(this.placed).length === s.cards.length) { this.lock = true; setTimeout(() => this.stepDone(), 350); }
  }
  answer(k, btn) {
    if (this.lock) return;
    const s = this.S, q = s.qs[this.q];
    if (k !== q.ok) { sfx.play('bad'); this.mistakes++; btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no'); this.fb(t('wrong')); return; }
    btn.classList.add('ok'); this.app.sheet.querySelectorAll('[data-opt]').forEach(b => b.disabled = true);
    this.lock = true;
    this.spec.onQ && this.spec.onQ(this, this.step, this.q);
    if (q.why) this.fb(tr(q.why), true); else this.fb('', true);
    setTimeout(() => { this.lock = false; if (this.q + 1 >= s.qs.length) this.stepDone(); else { this.q++; this.render(); } }, q.why ? 1600 : 650);
  }
  stepDone() {
    sfx.play('ok');
    if (this.S.kind === 'drill') this.city.preview(this.i, (this.step + 1) / (this.spec.steps.length + 1));
    else if (this.spec.onStep) this.spec.onStep(this, this.step); else this.city.preview(this.i, (this.step + 1) / (this.spec.steps.length + 1));
    this.solved = true; this.lock = false; this.render();
  }
  advance() {
    this.app.calcHide();
    if (this.step >= this.spec.steps.length - 1) return this.finish();
    this.step++; this.hl = 0; this.reset(); this.render();
  }
  cleanup() { this.app.calcHide(); if (this.app.rig.fp) this.app.rig.fpEnd(); this.app.stage && this.app.stage.clear(); if (this.spec.cleanup) this.spec.cleanup(this); }
  stopSim() { if (this.sim) { const h = this.app.engine.hooks; h.splice(h.indexOf(this.sim), 1); this.sim.stop && this.sim.stop(); this.sim = null; } }
  finish() {
    this.cleanup();
    this.stopSim(); document.querySelectorAll('.coach').forEach(e => e.remove());
    this.app.rig.autoOrbit = true;
    this.app.resultText = tr(this.spec.done);
    this.app.finishMission(this.i, this.stars());
  }
  close() {
    this.cleanup();
    this.stopSim(); document.querySelectorAll('.coach').forEach(e => e.remove());
    const built = store.builtCount() > this.i;
    if (this.spec.close) this.spec.close(this, built); else if (!built) this.city.unpreview(this.i);
    this.app.rig.autoOrbit = true; this.app.mission = null;
    this.app.show('district', this.i);
  }
}
