window.__solve = async function (upto) {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const app = window.__app, Q = s => app.sheet.querySelector(s), QA = s => [...app.sheet.querySelectorAll(s)];
  const click = el => el && el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const node = k => Q(`[data-node="${k}"]`);
  const log = [];
  for (let i = 0; i <= upto; i++) {
    app.startMission(i); await sleep(300);
    const m = app.mission;
    for (let st = 0; st < m.spec.steps.length; st++) {
      const s = m.S;
      if (s.kind === 'pick') { click(Q(`[data-pick="${s.opts.find(o => o.ok).id}"]`)); for (let k = 0; k < 60 && !Q('[data-next]'); k++) await sleep(200); }
      else if (s.kind === 'run') { click(Q('[data-run]')); for (let k = 0; k < 80 && !Q('[data-next]'); k++) await sleep(200); }
      else if (s.kind === 'dial') { while (!Q('[data-next]') && m.dv !== s.values.indexOf(0.7)) { click(Q('[data-dv="1"]')); await sleep(200); } for (let k = 0; k < 20 && !Q('[data-next]'); k++) await sleep(200); }
      else if (s.kind === 'sort') { for (const c of s.cards) { m.sel = c.id; m.drop(c.slot); await sleep(30); } await sleep(900); }
      else if (s.kind === 'quiz') { for (let q = 0; q < s.qs.length; q++) { click(Q(`[data-opt="${s.qs[q].ok}"]`)); await sleep(s.qs[q].why ? 1800 : 800); } await sleep(200); }
      else if (s.kind === 'drill') {
        for (let r = 0; r < 6 && !Q('[data-next]'); r++) {
          const d = m.round;
          if (d.w === 'path') { for (const k of d.data.bestPath.slice(1)) { click(node(k)); await sleep(40); } }
          else if (d.w === 'tree') { for (let j = 0; j < 3; j++) { const L = d.data.leaves.slice(j * 3, j * 3 + 3); click(Q(`[data-leaf="${j * 3 + L.indexOf(Math.min(...L))}"]`)); await sleep(40); } click(Q(`[data-min="${d.data.best}"]`)); }
          else if (d.w === 'bars') click(Q(`[data-bar="${d.data.stop}"]`));
          else { Q('[data-num]').value = String(d.ans).replace('.', ','); click(Q('[data-check]')); }
          for (let k = 0; k < 20 && m.round === d && !Q('[data-next]'); k++) await sleep(200);
          if (m.round === d && !Q('[data-next]')) { log.push(['DRILL STUCK', i, st, d.w || 'num', String(d.ans), Q('.feedback') && Q('.feedback').textContent]); break; }
        }
      }
      else if (s.w === 'bfs') { for (const k of s.data.order) { click(node(k)); await sleep(40); } await sleep(1800); }
      else if (s.w === 'path') { for (const k of ['C', 'E', 'B', 'G']) { click(node(k)); await sleep(40); } await sleep(1800); }
      else if (s.w === 'bars') { click(Q(`[data-bar="${s.data.stop}"]`)); await sleep(1800); }
      else if (s.w === 'csp') { const want = { 1: 3, 2: 2, 3: 1, 4: 3, 5: 2 }; for (const z of s.data.order) { click(Q(`[data-line="${want[z]}"]`)); await sleep(60); } await sleep(1200); }
      else if (s.w === 'color') { const want = { 1: 1, 2: 2, 3: 3, 4: 1, 5: 2 }; for (const k in want) for (let n = 0; n < want[k]; n++) { click(node(k)); await sleep(20); } await sleep(1800); }
      else if (s.w === 'tree' && s.data.mode === 'minimax') { for (const l of [0, 3, 8]) { click(Q(`[data-leaf="${l}"]`)); await sleep(40); } click(Q('[data-min="0"]')); await sleep(1800); }
      else if (s.w === 'tree') { click(Q('[data-leaf="4"]')); await sleep(20); click(Q('[data-leaf="5"]')); await sleep(20); click(Q('[data-check]')); await sleep(1800); }
      else if (s.w === 'perceptron') { for (let n = 0; n < 4; n++) { click(Q('[data-d="-0.5"]')); await sleep(20); } click(Q('[data-check]')); await sleep(1800); }
      else if (s.w === 'train') { click(Q('[data-train]')); await sleep(4200); }
      for (let k = 0; k < 30 && !Q('[data-next]'); k++) await sleep(200); if (!Q('[data-next]')) log.push(['NO NEXT', i, st]); click(Q('[data-next]')); await sleep(300);
    }
    await sleep(300);
    log.push([i, app.view, app.mission ? 'stuck@' + app.mission.step : 'ok', JSON.stringify(window.__stars && window.__stars())]);
    if (app.view === 'result') { app.city.setBuilt(app.built(), -1); app.show('home'); }
  }
  return log;
};
