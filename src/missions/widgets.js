// Interactive mission widgets. Each: { render(st, step) -> html, bind(root, st, api, step) }.
// api: ok(msg) finishes the step, bad(msg) counts a mistake, fb(msg), redraw().
import { t, tr } from '../i18n.js';
import { icon } from '../ui/icons.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- city road graph (week 2) ----------
export const GRAPH = {
  nodes: { S: [34, 100], C: [116, 38], E: [116, 162], A: [204, 38], B: [204, 162], G: [286, 100] },
  edges: [['S', 'C', 2], ['S', 'E', 5], ['C', 'A', 2], ['C', 'E', 2], ['E', 'B', 3], ['A', 'B', 4], ['A', 'G', 6], ['B', 'G', 2]],
};
const cost = (a, b) => { const e = GRAPH.edges.find(e => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a)); return e ? e[2] : null; };
function graphSVG(st, opt = {}) {
  const N = GRAPH.nodes, onPath = (a, b) => { const p = st.path || []; for (let i = 0; i < p.length - 1; i++) if ((p[i] === a && p[i + 1] === b) || (p[i] === b && p[i + 1] === a)) return true; return false; };
  let s = '<svg class="fig graph" viewBox="0 0 320 200" role="img">';
  for (const [a, b, c] of GRAPH.edges) {
    const [x1, y1] = N[a], [x2, y2] = N[b], mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    s += `<line class="g-edge ${onPath(a, b) ? 'on' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    if (opt.costs !== false) s += `<g class="g-cost"><rect x="${mx - 11}" y="${my - 10}" width="22" height="20" rx="6"/><text x="${mx}" y="${my + 4.5}">${c}</text></g>`;
  }
  for (const k in N) {
    const [x, y] = N[k], ord = (st.order || []).indexOf(k), inP = (st.path || []).includes(k), last = st.path && st.path[st.path.length - 1] === k;
    s += `<g class="g-node ${ord >= 0 || inP ? 'on' : ''} ${last ? 'cur' : ''} ${k === 'S' || k === 'G' ? 'end' : ''}" data-node="${k}" role="button" tabindex="0" aria-label="${k}">
      <circle cx="${x}" cy="${y}" r="20"/><text x="${x}" y="${y + 5}">${k}</text>
      ${ord >= 0 ? `<g class="g-badge"><circle cx="${x + 15}" cy="${y - 15}" r="9"/><text x="${x + 15}" y="${y - 11}">${ord + 1}</text></g>` : ''}</g>`;
  }
  return s + '</svg>';
}
function nodeTaps(root, f) { root.querySelectorAll('[data-node]').forEach(n => { n.addEventListener('click', () => f(n.dataset.node, n)); n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(n.dataset.node, n); } }); }); }
function shakeEl(el) { if (!el) return; el.classList.remove('shake'); void el.getBoundingClientRect(); el.classList.add('shake'); }

export const W = {
  // tap nodes in BFS expansion order
  bfs: {
    render: st => graphSVG(st, { costs: false }),
    bind(root, st, api, step) {
      st.order = st.order || [];
      nodeTaps(root, (k, el) => {
        if (st.order.includes(k)) return;
        const want = step.data.order[st.order.length];
        if (k !== want) { shakeEl(el); return api.bad(tr(step.data.wrong)); }
        st.order.push(k); api.redraw();
        if (st.order.length === step.data.order.length) api.ok();
      });
    },
  },
  // build the cheapest route S -> G
  path: {
    render: st => `${graphSVG(st)}<div class="row mt2"><div class="grow cap">${esc(t('routeCost', { c: pathCost(st.path || ['S']) }))}</div><button class="btn btn-secondary" data-reset style="height:40px">${icon('reset')}${esc(t('again'))}</button></div>`,
    bind(root, st, api, step) {
      st.path = st.path || ['S'];
      root.querySelector('[data-reset]').addEventListener('click', () => { st.path = ['S']; api.redraw(); });
      nodeTaps(root, (k, el) => {
        const last = st.path[st.path.length - 1];
        if (st.path.includes(k) || cost(last, k) == null) { shakeEl(el); return api.fb(tr(step.data.adj)); }
        st.path.push(k); api.redraw();
        if (k === 'G') {
          const c = pathCost(st.path);
          if (c === step.data.best) api.ok(); else { api.bad(t('cheaper', { c })); setTimeout(() => { st.path = ['S']; api.redraw(); }, 900); }
        }
      });
    },
  },
  // hill-climbing landscape: tap the bar where the climb stops
  bars: {
    render(st, step) {
      const v = step.data.values, max = Math.max(...v), w = 320 / v.length;
      let s = '<svg class="fig bars" viewBox="0 0 320 170" role="img">';
      v.forEach((x, i) => {
        const h = 22 + x / max * 112, X = i * w + 6, Y = 150 - h;
        s += `<g class="b-bar ${st.pick === i ? (st.okk ? 'ok' : 'no') : ''} ${i === step.data.start ? 'start' : ''}" data-bar="${i}" role="button" tabindex="0" aria-label="${i + 1}: ${x}"><rect x="${X}" y="${Y}" width="${w - 12}" height="${h}" rx="8"/><text class="b-val" x="${X + (w - 12) / 2}" y="${Y + 18}">${x}</text><text class="b-idx" x="${X + (w - 12) / 2}" y="166">${i + 1}</text></g>`;
      });
      const sx = step.data.start * w + 6 + (w - 12) / 2, sy = 150 - (22 + v[step.data.start] / max * 112) - 14;
      s += `<g class="b-bot"><circle cx="${sx}" cy="${sy}" r="9"/><rect x="${sx - 4.5}" y="${sy - 2.5}" width="9" height="5" rx="2"/></g>`;
      return s + '</svg>';
    },
    bind(root, st, api, step) {
      root.querySelectorAll('[data-bar]').forEach(b => b.addEventListener('click', () => {
        const i = +b.dataset.bar; st.pick = i; st.okk = i === step.data.stop; api.redraw();
        if (st.okk) api.ok(); else api.bad(tr(step.data.wrong));
      }));
    },
  },
  // CSP: 3 bus lines for 5 zones, neighbours differ
  color: {
    render(st, step) {
      const { nodes, edges } = step.data; st.c = st.c || {};
      let s = '<svg class="fig graph" viewBox="0 0 320 200" role="img">';
      for (const [a, b] of edges) { const bad = st.c[a] && st.c[a] === st.c[b]; s += `<line class="g-edge ${bad ? 'bad' : ''}" x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}"/>`; }
      for (const k in nodes) { const [x, y] = nodes[k]; s += `<g class="g-node col${st.c[k] || 0}" data-node="${k}" role="button" tabindex="0" aria-label="${k}"><circle cx="${x}" cy="${y}" r="22"/><text x="${x}" y="${y + 5}">${k}</text></g>`; }
      s += '</svg><div class="legend">' + [1, 2, 3].map(i => `<span><i class="col${i}"></i>${esc(t('line', { n: i }))}</span>`).join('') + '</div>';
      return s;
    },
    bind(root, st, api, step) {
      nodeTaps(root, k => {
        st.c[k] = ((st.c[k] || 0) % 3) + 1; api.redraw();
        const { nodes, edges } = step.data, all = Object.keys(nodes).every(n => st.c[n]);
        const conflict = edges.some(([a, b]) => st.c[a] && st.c[a] === st.c[b]);
        if (conflict) api.fb(t('conflict')); else api.fb('');
        if (all && !conflict) api.ok();
        else if (all && conflict && !st.counted) { st.counted = true; api.bad(t('conflict')); }
        if (!all) st.counted = false;
      });
    },
  },
  // game tree: minimax (tap the value each node takes) or alpha-beta (tap pruned leaves)
  tree: {
    render(st, step) {
      const L = step.data.leaves, mode = step.data.mode; st.v = st.v || {}; st.sel = st.sel || [];
      const lx = i => 18 + i * 35.5, mx = j => lx(j * 3 + 1), rx = 160;
      let s = '<svg class="fig tree" viewBox="0 0 320 196" role="img">';
      for (let j = 0; j < 3; j++) { s += `<line class="g-edge" x1="${rx}" y1="28" x2="${mx(j)}" y2="92"/>`; for (let k = 0; k < 3; k++) s += `<line class="g-edge" x1="${mx(j)}" y1="92" x2="${lx(j * 3 + k)}" y2="160"/>`; }
      const curJ = mode === 'minimax' ? [0, 1, 2].find(j => st.v['m' + j] == null) : null;
      const rootV = mode === 'prune' ? 3 : st.v.root;
      s += `<g class="t-node max ${curJ === undefined && st.v.root == null && mode === 'minimax' ? 'cur' : ''}"><path d="M${rx} 8 L${rx + 22} 40 L${rx - 22} 40 Z"/><text x="${rx}" y="34">${rootV ?? 'MAX'}</text></g>`;
      for (let j = 0; j < 3; j++) {
        const v = mode === 'prune' ? [3, 2, 2][j] : st.v['m' + j];
        s += `<g class="t-node min ${curJ === j ? 'cur' : ''} ${curJ === undefined && mode === 'minimax' ? 'pick' : ''}" data-min="${j}" role="button" tabindex="0"><path d="M${mx(j) - 22} 78 L${mx(j) + 22} 78 L${mx(j)} 108 Z"/><text x="${mx(j)}" y="93">${v ?? 'MIN'}</text></g>`;
      }
      L.forEach((v, i) => { s += `<g class="t-leaf ${st.sel.includes(i) ? 'sel' : ''} ${curJ === Math.floor(i / 3) ? 'cur' : ''}" data-leaf="${i}" role="button" tabindex="0" aria-label="${v}"><rect x="${lx(i) - 15}" y="146" width="30" height="30" rx="8"/><text x="${lx(i)}" y="166">${v}</text></g>`; });
      s += '</svg>';
      if (mode === 'prune') s += `<button class="btn btn-primary btn-block mt3" data-check>${icon('check')}${esc(t('check'))}</button>`;
      return s;
    },
    bind(root, st, api, step) {
      const L = step.data.leaves, mode = step.data.mode;
      if (mode === 'minimax') {
        root.querySelectorAll('[data-leaf]').forEach(el => el.addEventListener('click', () => {
          const j = [0, 1, 2].find(x => st.v['m' + x] == null); if (j === undefined) return;
          const i = +el.dataset.leaf; if (Math.floor(i / 3) !== j) { shakeEl(el); return api.fb(t('thisMin')); }
          const want = Math.min(...L.slice(j * 3, j * 3 + 3));
          if (L[i] !== want) { shakeEl(el); return api.bad(tr(step.data.wrongMin)); }
          st.v['m' + j] = want; api.redraw();
        }));
        root.querySelectorAll('[data-min]').forEach(el => el.addEventListener('click', () => {
          if ([0, 1, 2].some(x => st.v['m' + x] == null)) return;
          const j = +el.dataset.min, vals = [0, 1, 2].map(x => st.v['m' + x]);
          if (vals[j] !== Math.max(...vals)) { shakeEl(el); return api.bad(tr(step.data.wrongMax)); }
          st.v.root = vals[j]; api.redraw(); api.ok();
        }));
      } else {
        root.querySelectorAll('[data-leaf]').forEach(el => el.addEventListener('click', () => { const i = +el.dataset.leaf; st.sel = st.sel.includes(i) ? st.sel.filter(x => x !== i) : [...st.sel, i]; api.redraw(); }));
        root.querySelector('[data-check]').addEventListener('click', () => {
          const want = step.data.pruned, ok = st.sel.length === want.length && want.every(i => st.sel.includes(i));
          if (ok) api.ok(); else api.bad(tr(step.data.wrong));
        });
      }
    },
  },
  // perceptron: choose the bias so the window lights only when dark AND someone is home
  perceptron: {
    render(st, step) {
      st.b = st.b ?? 0.5;
      const rows = [[0, 0], [0, 1], [1, 0], [1, 1]];
      const out = (a, c) => (a + c + st.b > 0 ? 1 : 0);
      return `<div class="pc-eq">y = 1 · x₁ + 1 · x₂ + <b>${st.b.toFixed(1)}</b> &gt; 0</div>
        <div class="stepper mt2"><button class="icon-btn" data-d="-0.5" aria-label="−0.5"><span class="pm">−</span></button><div class="grow center"><div class="cap">b</div><div class="pc-b">${st.b.toFixed(1)}</div></div><button class="icon-btn" data-d="0.5" aria-label="+0.5"><span class="pm">+</span></button></div>
        <table class="pc-t mt3"><tr><th>${esc(tr(step.data.x1))}</th><th>${esc(tr(step.data.x2))}</th><th>${esc(t('target'))}</th><th>${esc(t('window'))}</th></tr>
        ${rows.map(([a, c]) => { const y = out(a, c), want = a & c; return `<tr class="${y === want ? '' : 'miss'}"><td>${a}</td><td>${c}</td><td>${want}</td><td><span class="win ${y ? 'on' : ''}"></span></td></tr>`; }).join('')}</table>
        <button class="btn btn-primary btn-block mt3" data-check>${icon('check')}${esc(t('check'))}</button>`;
    },
    bind(root, st, api) {
      root.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { st.b = Math.max(-2.5, Math.min(1.5, st.b + +b.dataset.d)); api.redraw(); }));
      root.querySelector('[data-check]').addEventListener('click', () => {
        const ok = [[0, 0], [0, 1], [1, 0], [1, 1]].every(([a, c]) => ((a + c + st.b > 0) ? 1 : 0) === (a & c));
        if (ok) api.ok(); else api.bad(t('notYet'));
      });
    },
  },
  // Q-learning training run: tap to train, watch average waiting fall
  train: {
    render(st, step) {
      const d = step.data.curve, n = st.n || 0, W = 300, H = 120, mx = Math.max(...d);
      const pts = d.slice(0, n + 1).map((v, i) => `${10 + i / (d.length - 1) * W},${10 + (1 - v / mx) * H}`).join(' ');
      return `<svg class="fig chart" viewBox="0 0 320 150" role="img"><line class="ax" x1="10" y1="130" x2="310" y2="130"/><line class="ax" x1="10" y1="10" x2="10" y2="130"/>
        ${n ? `<polyline class="ln" points="${pts}"/>` : ''}<text class="axl" x="310" y="146" text-anchor="end">${esc(t('episodes'))}</text><text class="axl" x="16" y="22" text-anchor="start">${esc(t('avgWait'))}</text>
        ${n ? `<text class="val" text-anchor="${n > d.length * 0.8 ? 'end' : 'middle'}" x="${10 + n / (d.length - 1) * W}" y="${(1 - d[n] / mx) * H}">${d[n]}</text>` : ''}</svg>
        <button class="btn btn-primary btn-block mt3" data-train ${st.done ? 'disabled' : ''}>${icon('play')}${esc(t('train'))}</button>`;
    },
    bind(root, st, api, step) {
      root.querySelector('[data-train]').addEventListener('click', () => {
        if (st.run) return; st.run = true; const d = step.data.curve;
        const tick = () => { st.n = (st.n || 0) + 1; api.redraw(); if (st.n < d.length - 1) setTimeout(tick, 110); else { st.done = true; api.redraw(); api.ok(); } };
        tick();
      });
    },
  },
};
function pathCost(p) { let c = 0; for (let i = 0; i < p.length - 1; i++) c += cost(p[i], p[i + 1]); return c; }

// ---------- static figures for quiz steps ----------
export const FIG = {
  astar: () => `${graphSVG({}, {})}<div class="h-row">${[['S', 7], ['C', 6], ['E', 4], ['A', 5], ['B', 2], ['G', 0]].map(([k, h]) => `<span>h(${k}) = ${h}</span>`).join('')}</div>`,
  expecti: () => `<svg class="fig tree" viewBox="0 0 320 150" role="img">
    <line class="g-edge" x1="160" y1="30" x2="80" y2="80"/><line class="g-edge" x1="160" y1="30" x2="240" y2="80"/>
    <line class="g-edge" x1="240" y1="80" x2="200" y2="128"/><line class="g-edge" x1="240" y1="80" x2="280" y2="128"/>
    <g class="t-node max"><path d="M160 8 L182 40 L138 40 Z"/><text x="160" y="34">MAX</text></g>
    <g class="t-leaf"><rect x="62" y="66" width="36" height="30" rx="8"/><text x="80" y="86">4</text></g>
    <g class="t-node chance"><circle cx="240" cy="80" r="18"/><text x="240" y="85">?</text></g>
    <text class="axl" x="206" y="108" text-anchor="end">50%</text><text class="axl" x="276" y="108">50%</text>
    <g class="t-leaf"><rect x="185" y="114" width="30" height="30" rx="8"/><text x="200" y="134">8</text></g>
    <g class="t-leaf"><rect x="265" y="114" width="30" height="30" rx="8"/><text x="280" y="134">2</text></g></svg>`,
  dots: () => {
    let s = '<svg class="fig dots" viewBox="0 0 320 170" role="img">';
    for (let i = 0; i < 100; i++) {
      const r = Math.floor(i / 20), c = i % 20, x = 12 + c * 15.5, y = 14 + r * 26, bz = i % 10 === 0;
      const ring = bz ? (i !== 90) : [3, 7, 13, 17, 24, 28, 34, 36, 45, 47, 55, 58, 63, 67, 74, 78, 84, 96].includes(i);
      s += `<circle class="dot ${bz ? 'bz' : ''}" cx="${x}" cy="${y}" r="5"/>${ring ? `<circle class="ring" cx="${x}" cy="${y}" r="8.5"/>` : ''}`;
    }
    return s + '</svg>';
  },
  bayesnet: () => `<svg class="fig graph" viewBox="0 0 320 180" role="img">
    ${[[90, 46, 140, 74], [230, 46, 180, 74], [140, 106, 90, 134], [180, 106, 230, 134]].map(([a, b, c, d]) => `<line class="g-edge arrow" x1="${a}" y1="${b}" x2="${c}" y2="${d}" marker-end="url(#ah)"/>`).join('')}
    <defs><marker id="ah" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" class="ah"/></marker></defs>
    ${[['cold', 70, 30], ['wind', 250, 30], ['blizzard', 160, 90], ['alarm', 70, 150], ['schools', 250, 150]].map(([k, x, y]) => `<g class="bn-node ${k === 'blizzard' ? 'on' : ''}"><rect x="${x - 58}" y="${y - 16}" width="116" height="32" rx="12"/><text x="${x}" y="${y + 5}">${esc(t('bn_' + k))}</text></g>`).join('')}</svg>`,
  hmm: () => `<svg class="fig graph" viewBox="0 0 320 150" role="img">
    <g class="bn-node"><rect x="10" y="20" width="140" height="40" rx="14"/><text x="80" y="45">${esc(t('stop', { n: 1 }))} · 0.5</text></g>
    <g class="bn-node on"><rect x="170" y="20" width="140" height="40" rx="14"/><text x="240" y="45">${esc(t('stop', { n: 2 }))} · 0.5</text></g>
    <line class="g-edge" x1="80" y1="60" x2="160" y2="110"/><line class="g-edge" x1="240" y1="60" x2="160" y2="110"/>
    <g class="g-cost"><rect x="88" y="74" width="40" height="20" rx="6"/><text x="108" y="88">0.2</text></g><g class="g-cost"><rect x="192" y="74" width="40" height="20" rx="6"/><text x="212" y="88">0.8</text></g>
    <g class="bn-node gps"><rect x="82" y="104" width="156" height="34" rx="12"/><text x="160" y="126">GPS ≈ ${esc(t('stop', { n: 2 }))}</text></g></svg>`,
  plow: () => `<table class="pc-t"><tr><th></th><th>${esc(t('snow'))} · 0.4</th><th>${esc(t('noSnow'))} · 0.6</th></tr><tr><td>${esc(t('plowYes'))}</td><td>−10</td><td>−10</td></tr><tr><td>${esc(t('plowNo'))}</td><td>−50</td><td>0</td></tr></table>`,
  dtree: () => `<svg class="fig tree" viewBox="0 0 320 170" role="img">
    <line class="g-edge" x1="160" y1="34" x2="80" y2="88"/><line class="g-edge" x1="160" y1="34" x2="240" y2="88"/><line class="g-edge" x1="240" y1="88" x2="190" y2="142"/><line class="g-edge" x1="240" y1="88" x2="290" y2="142"/>
    <text class="axl" x="114" y="66" text-anchor="end">${esc(t('no'))}</text><text class="axl" x="206" y="66" text-anchor="start">${esc(t('yes'))}</text><text class="axl" x="210" y="120" text-anchor="end">${esc(t('yes'))}</text><text class="axl" x="270" y="120" text-anchor="start">${esc(t('no'))}</text>
    <g class="bn-node"><rect x="88" y="16" width="144" height="34" rx="12"/><text x="160" y="38">${esc(t('dt_link'))}</text></g>
    <g class="bn-node"><rect x="166" y="72" width="148" height="34" rx="12"/><text x="240" y="94">${esc(t('dt_known'))}</text></g>
    <g class="bn-node ok"><rect x="30" y="72" width="100" height="34" rx="12"/><text x="80" y="94">${esc(t('ham'))}</text></g>
    <g class="bn-node ok"><rect x="140" y="126" width="100" height="34" rx="12"/><text x="190" y="148">${esc(t('ham'))}</text></g>
    <g class="bn-node bad"><rect x="248" y="126" width="70" height="34" rx="12"/><text x="283" y="148">${esc(t('spam'))}</text></g></svg>`,
  tokens: () => `<div class="tok">${[['Astana', 82], ['Almaty', 12], ['Turkestan', 6]].map(([w, p]) => `<div class="tok-r"><span class="tok-w">${w}</span><span class="tok-b"><i style="width:${p}%"></i></span><span class="tok-p">${(p / 100).toFixed(2)}</span></div>`).join('')}</div>`,
  qform: () => `<div class="pc-eq">Q ← Q + α · (r + γ · max Q′ − Q)</div><div class="h-row"><span>Q = 2</span><span>r = −1</span><span>γ = 0.9</span><span>max Q′ = 4</span><span>α = 0.5</span></div>`,
};
