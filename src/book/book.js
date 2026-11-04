import { t, tr, getLang } from '../i18n.js';
import { icon } from '../ui/icons.js';
import { store } from '../store.js';
import { META, CH, BACK, RUN } from './data.js';
import { SVGTR } from './svgtr.js';
import logoSvg from '../ui/logo.svg';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const L = () => getLang();
const svgT = s => { const l = L(); if (l === 'en') return s; const k = l === 'ru' ? 0 : 1; return s.replace(/>([^<]+)<\/text>/g, (m, x) => { const v = SVGTR[x.trim()]; return v ? '>' + v[k] + '</text>' : m; }); };
const ctl = s => { const l = L(); if (l === 'en') return s; const v = SVGTR[s]; return v ? v[l === 'ru' ? 0 : 1] : s; };

// merge v1 English chapter with its translation (same rules as version 1)
function chapter(i) {
  const c = CH[i], e = c.en, x = L() === 'en' ? null : c[L()];
  if (!x) return { ...e, labIntro: c.lab.intro };
  return {
    ...e, hook: x.hook, theory: x.theory, worked: x.worked, diagramCap: x.diagramCap || e.diagramCap, diagram2Cap: x.diagram2Cap || e.diagram2Cap,
    math: e.math.map((m, s) => ({ ...m, name: x.math[s][0], sym: m.sym.map((a, r) => [a[0], x.math[s][1][r] || a[1]]) })),
    labIntro: x.labIntro || c.lab.intro,
    traps: e.traps.map((tp, s) => ({ ...tp, h: x.traps[s][0], b: x.traps[s][1] })),
    quiz: e.quiz.map((q, s) => ({ q: x.quiz[s][0], o: q.o.map((a, r) => [x.quiz[s][1][r][0], a[1], x.quiz[s][1][r][1]]) })),
  };
}
const PARTS = ['intuition', 'theory', 'diagram', 'math', 'worked', 'lab', 'traps', 'quiz'];
const PART_ICON = { intuition: 'hint', theory: 'book', diagram: 'grid', math: 'gauge', worked: 'check', lab: 'play', traps: 'info', quiz: 'star' };

function highlight(code) {
  const kw = /^(def|return|if|elif|else|for|in|while|import|from|not|and|or|continue|break|True|False|None|is|lambda|class|with|as|try|except|yield|global)$/;
  const bi = /^(print|range|set|sum|len|max|min|abs|sorted|enumerate|zip|dict|list|tuple|round|float|int|str|map|any|all)$/;
  const re = /(#.*$)|(f?"(?:[^"\\]|\\.)*"|f?'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|(\s+)|(.)/gm; let m, o = '';
  while ((m = re.exec(code))) {
    if (m[1]) o += `<i class="c">${esc(m[1])}</i>`; else if (m[2]) o += `<i class="s">${esc(m[2])}</i>`; else if (m[3]) o += `<i class="n">${m[3]}</i>`;
    else if (m[4]) o += kw.test(m[4]) ? `<i class="k">${m[4]}</i>` : bi.test(m[4]) ? `<i class="b">${m[4]}</i>` : /^[A-Z][A-Z_]+$/.test(m[4]) ? `<i class="p">${m[4]}</i>` : m[4];
    else o += esc(m[0]);
  }
  return o;
}
function subParams(lab, P) {
  let e = lab.code;
  for (const n of lab.params) { const s = P[n.id]; let a = typeof s === 'string' ? JSON.stringify(s) : String(s); if (n.raw) a = String(s); else if (n.dp) a = Number(s).toFixed(n.dp); else if (n.step && n.step % 1 !== 0) a = Number(s).toFixed(1); e = e.replace(new RegExp('\\b' + n.id + '\\b', 'g'), a); }
  return e;
}
const fmtNum = (p, v) => p.dp ? Number(v).toFixed(p.dp) : p.step && p.step % 1 !== 0 ? Number(v).toFixed(String(p.step).split('.')[1].length) : String(v);

export class Book {
  constructor(app) {
    this.app = app;
    const el = this.el = document.createElement('div'); el.className = 'book'; el.setAttribute('role', 'document'); el.hidden = true;
    document.body.appendChild(el);
    this.P = {}; this.quiz = {};
    el.addEventListener('click', e => { const b = e.target.closest('[data-b]'); if (b) this.act(b.dataset.b, b.dataset, b); });
    addEventListener('hashchange', () => this.fromHash());
  }
  fromHash() {
    const h = location.hash.replace('#', '');
    if (!h.startsWith('book')) { if (!this.el.hidden) this.close(true); return; }
    const p = h.split('/')[1];
    this.show(p == null || p === '' ? 'toc' : p === 'back' ? 'back' : +p - 1, true);
  }
  open(page = 'toc') { const h = '#book' + (page === 'toc' ? '' : '/' + (page === 'back' ? 'back' : page + 1)); if (location.hash !== h) location.hash = h; else this.show(page, true); }
  close(fromHash) {
    this.el.classList.remove('on'); setTimeout(() => { this.el.hidden = true; }, 220);
    this.app.engine.paused = false; this.app.ui.style.visibility = '';
    if (!fromHash && location.hash) history.pushState('', '', location.pathname + location.search);
  }
  show(page, fromHash) {
    this.page = page; this.el.hidden = false; requestAnimationFrame(() => this.el.classList.add('on'));
    this.app.engine.paused = true; this.app.ui.style.visibility = 'hidden';
    this.render(); this.el.scrollTop = 0;
  }
  rerender() { if (!this.el.hidden) { const y = this.el.scrollTop; this.render(); this.el.scrollTop = y; } }
  bar(title) {
    const night = store.get().night;
    return `<header class="bk-bar"><button class="icon-btn" data-b="${this.page === 'toc' ? 'city' : 'toc'}" aria-label="${esc(t(this.page === 'toc' ? 'bkCity' : 'bkContents'))}">${icon(this.page === 'toc' ? 'city' : 'back')}</button>
      <div class="grow bk-bt">${esc(title)}</div>
      <button class="icon-btn" data-b="theme" aria-label="${esc(t(night ? 'day' : 'night'))}">${icon(night ? 'sun' : 'moon')}</button>
      <button class="icon-btn" data-b="lang" aria-label="${esc(t('language'))}"><span class="bk-lang">${{ en: 'EN', ru: 'RU', kk: 'KZ' }[L()]}</span></button></header>`;
  }
  render() {
    const p = this.page;
    if (p === 'toc') this.el.innerHTML = this.bar(t('library')) + this.toc();
    else if (p === 'back') this.el.innerHTML = this.bar(t('bkBack')) + this.backMatter();
    else this.el.innerHTML = this.bar(t('bkChapter', { n: p + 1 })) + this.chapterPage(p);
    this.bindLab();
  }
  toc() {
    const stars = store.get().stars;
    return `<main class="bk-wrap">
      <section class="bk-cover"><img src="data:image/svg+xml,${encodeURIComponent(logoSvg)}" alt="" class="bk-logo"><div class="label">${esc(t('course'))}</div>
        <h1 class="bk-h1">${esc(t('bkTitle'))}</h1><p class="bk-lead">${esc(t('bkLead'))}</p></section>
      <ol class="bk-toc">${META.map((m, i) => `<li><button class="bk-row" data-b="ch" data-i="${i}"><span class="bk-num">${String(i + 1).padStart(2, '0')}</span><span class="grow"><span class="bk-rt">${esc(tr(m.title))}</span><span class="bk-rs">${esc(tr(m.topic))}</span></span>${stars[i] ? `<span class="stars-row" aria-label="${stars[i]}/3">${[0, 1, 2].map(k => `<span class="${k < stars[i] ? '' : 'off'}">${icon('starf')}</span>`).join('')}</span>` : ''}${icon('arrow')}</button></li>`).join('')}</ol>
      <button class="bk-row bk-backrow" data-b="back"><span class="bk-num">${icon('info')}</span><span class="grow"><span class="bk-rt">${esc(t('bkBack'))}</span><span class="bk-rs">${esc(tr(BACK.team))} · ${esc(tr(BACK.aiTitle))} · ${esc(tr(BACK.refsT))}</span></span>${icon('arrow')}</button>
    </main>`;
  }
  chapterPage(i) {
    const c = chapter(i), m = META[i], lab = CH[i].lab;
    const P = this.P[i] = this.P[i] || Object.fromEntries(lab.params.map(p => [p.id, p.value]));
    const part = k => esc(t('bkPart_' + k));
    const sec = (k, html) => `<section class="bk-sec" id="bk-${k}"><h2 class="bk-h2"><span class="bk-hi">${icon(PART_ICON[k])}</span>${part(k)}</h2>${html}</section>`;
    const quizHtml = c.quiz.map((q, qi) => { const st = (this.quiz[i] || {})[qi]; return `<div class="bk-q"><p class="bk-qq"><b>${qi + 1}.</b> ${q.q}</p><div class="bk-opts">${q.o.map((o, oi) => `<button class="bk-opt ${st != null ? (o[1] ? 'ok' : oi === st ? 'no' : 'dim') : ''}" data-b="quiz" data-q="${qi}" data-o="${oi}" ${st != null ? 'disabled' : ''}>${o[0]}</button>`).join('')}</div>${st != null ? `<p class="bk-why ${c.quiz[qi].o[st][1] ? 'ok' : 'no'}">${c.quiz[qi].o[st][2]}</p>` : ''}</div>`; }).join('');
    const answered = Object.keys(this.quiz[i] || {}).length, score = Object.entries(this.quiz[i] || {}).filter(([qi, oi]) => c.quiz[qi].o[oi][1]).length;
    return `<main class="bk-wrap">
      <header class="bk-chead"><div class="label">${esc(t('week', { n: i + 1 }))}</div><h1 class="bk-h1">${esc(tr(m.title))}</h1><p class="bk-lead">${esc(tr(m.topic))}</p>
        <button class="btn btn-secondary mt3" data-b="district" data-i="${i}">${icon('city')}${esc(t('bkToDistrict'))}</button></header>
      <nav class="bk-chips" aria-label="${esc(t('bkContents'))}">${PARTS.map(k => `<button class="bk-chip" data-b="jump" data-k="${k}">${part(k)}</button>`).join('')}</nav>
      <article class="bk-prose">
      ${sec('intuition', c.hook)}
      ${sec('theory', c.theory)}
      ${sec('diagram', `<figure class="dia-wrap">${svgT(c.diagram)}<figcaption>${c.diagramCap || ''}</figcaption></figure>${c.diagram2 ? `<figure class="dia-wrap">${svgT(c.diagram2)}<figcaption>${c.diagram2Cap || ''}</figcaption></figure>` : ''}`)}
      ${sec('math', c.math.map(f => `<div class="bk-math"><div class="bk-mname">${f.name}</div><div class="bk-f">${f.f}</div><dl class="bk-sym">${f.sym.map(s => `<dt>${s[0]}</dt><dd>${s[1]}</dd>`).join('')}</dl></div>`).join(''))}
      ${sec('worked', c.worked)}
      ${sec('lab', `<p>${c.labIntro}</p>
        <div class="bk-params">${lab.params.map(p => `<div class="bk-param"><div class="cap">${esc(ctl(p.label))}</div>${p.options
          ? `<div class="seg" role="group">${p.options.map(o => `<button data-b="opt" data-id="${p.id}" data-v="${esc(o[0])}" class="${P[p.id] === o[0] ? 'on' : ''}" aria-pressed="${P[p.id] === o[0]}">${esc(ctl(o[1]))}</button>`).join('')}</div>`
          : `<div class="stepper"><button class="icon-btn" data-b="num" data-id="${p.id}" data-d="-1" aria-label="−"><span class="pm">−</span></button><div class="grow center pc-b">${fmtNum(p, P[p.id])}</div><button class="icon-btn" data-b="num" data-id="${p.id}" data-d="1" aria-label="+"><span class="pm">+</span></button></div>`}</div>`).join('')}</div>
        <div class="bk-code"><div class="bk-codebar"><span>Python</span><button class="btn btn-ghost" data-b="copy" style="height:32px">${esc(t('bkCopy'))}</button></div><pre><code>${highlight(subParams(lab, P))}</code></pre></div>
        <button class="btn btn-primary btn-block mt3" data-b="run">${icon('play')}${esc(t('bkRun'))}</button>
        <div class="bk-console" aria-live="polite" hidden><div class="bk-codebar"><span>${esc(t('bkOutput'))}</span><span class="cap">${esc(t('bkSame'))}</span></div><pre></pre></div>`)}
      ${sec('traps', c.traps.map(tp => `<div class="bk-trap ${tp.k}"><div class="bk-tk">${icon(tp.k === 'myth' ? 'hint' : 'info')}${esc(t(tp.k === 'myth' ? 'bkMyth' : 'bkTrap'))}</div><h4>${tp.h}</h4><p>${tp.b}</p></div>`).join(''))}
      ${sec('quiz', quizHtml + (answered === c.quiz.length ? `<div class="learn">${icon('check')}<span>${esc(t('bkScore', { s: score, n: c.quiz.length }))}</span></div><button class="btn btn-secondary mt2" data-b="quizreset">${icon('reset')}${esc(t('again'))}</button>` : ''))}
      </article>
      <nav class="bk-pn">${i > 0 ? `<button class="bk-row" data-b="ch" data-i="${i - 1}">${icon('back')}<span class="grow"><span class="bk-rs">${esc(t('bkPrev'))}</span><span class="bk-rt">${esc(tr(META[i - 1].title))}</span></span></button>` : '<span></span>'}
        ${i < 9 ? `<button class="bk-row right" data-b="ch" data-i="${i + 1}"><span class="grow"><span class="bk-rs">${esc(t('bkNext'))}</span><span class="bk-rt">${esc(tr(META[i + 1].title))}</span></span>${icon('arrow')}</button>` : `<button class="bk-row right" data-b="back"><span class="grow"><span class="bk-rs">${esc(t('bkNext'))}</span><span class="bk-rt">${esc(t('bkBack'))}</span></span>${icon('arrow')}</button>`}</nav>
    </main>`;
  }
  backMatter() {
    return `<main class="bk-wrap"><article class="bk-prose">
      <section class="bk-sec"><h2 class="bk-h2"><span class="bk-hi">${icon('city')}</span>${esc(tr(BACK.team))}</h2>
        <div class="tbl-wrap"><table class="tbl"><tr><th>${esc(tr(BACK.member))}</th><th>${esc(tr(BACK.contrib))}</th></tr>
        <tr><td><b>Yuldashov Bilal</b></td><td>${esc(t('bkC1'))}</td></tr><tr><td><b>Tashmetov Shakhrukh</b></td><td>${esc(tr(BACK.c2))}</td></tr><tr><td><b>${esc(tr(BACK.both))}</b></td><td>${esc(tr(BACK.c3))}</td></tr></table></div>
        <p class="cap mt2">${esc(t('team'))} · ${esc(t('course'))}</p></section>
      <section class="bk-sec"><h2 class="bk-h2"><span class="bk-hi">${icon('chat')}</span>${esc(tr(BACK.aiTitle))}</h2><p>${tr(BACK.ai)}</p><p>${esc(t('bkAi2'))}</p></section>
      <section class="bk-sec"><h2 class="bk-h2"><span class="bk-hi">${icon('book')}</span>${esc(tr(BACK.refsT))}</h2>${BACK.refs.replace('three.js documentation, threejs.org (3D engine used for the islands).', esc(t('bkRefThree')))}</section>
    </article></main>`;
  }
  bindLab() { this.out = this.el.querySelector('.bk-console'); }
  act(a, ds, el) {
    const i = this.page;
    if (a === 'city') return this.close();
    if (a === 'toc') return this.open('toc');
    if (a === 'back') return this.open('back');
    if (a === 'ch') return this.open(+ds.i);
    if (a === 'theme') { this.app.setTheme(!store.get().night); this.app.renderHud(); return this.rerender(); }
    if (a === 'lang') { const order = ['en', 'ru', 'kk'], n = order[(order.indexOf(L()) + 1) % 3]; this.app.act('lang', { l: n }); return this.rerender(); }
    if (a === 'jump') { const s = this.el.querySelector('#bk-' + ds.k); if (s) this.el.scrollTo({ top: s.offsetTop - 112, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); return; }
    if (a === 'district') { this.close(); return this.app.show('district', +ds.i); }
    if (a === 'quiz') { this.quiz[i] = this.quiz[i] || {}; this.quiz[i][+ds.q] = +ds.o; return this.rerender(); }
    if (a === 'quizreset') { this.quiz[i] = {}; return this.rerender(); }
    const lab = CH[i] && CH[i].lab;
    if (a === 'opt') { this.P[i][ds.id] = ds.v; return this.rerender(); }
    if (a === 'num') { const p = lab.params.find(x => x.id === ds.id), v = Math.round((+this.P[i][ds.id] + p.step * +ds.d) * 1e6) / 1e6; this.P[i][ds.id] = Math.max(p.min, Math.min(p.max, v)); return this.rerender(); }
    if (a === 'copy') { const s = subParams(lab, this.P[i]); try { navigator.clipboard.writeText(s); this.app.toast(t('bkCopied')); } catch (e) { /* ignore */ } return; }
    if (a === 'run') {
      const lines = []; try { RUN[i](this.P[i], s => lines.push(String(s))); } catch (e) { lines.push(String(e)); }
      this.out.hidden = false; this.out.querySelector('pre').textContent = lines.join('\n'); this.out.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
}
