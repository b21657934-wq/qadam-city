// Runs every lab in JS and in real Python and compares the printed output line by line.
// Usage: node tools/verify-labs.mjs
// For every lab and every option/sampled parameter combo: run JS and real Python, compare printed lines.
import fs from 'fs'; import { execFileSync } from 'child_process';
const d = JSON.parse(fs.readFileSync(new URL('./v1/v1data.json', import.meta.url), 'utf8'));
const labs = JSON.parse(fs.readFileSync(new URL('./v1/labs.json', import.meta.url), 'utf8'));
const xv = v => typeof v === 'string' ? JSON.stringify(v) : String(v);
function sub(lab, P) { let e = lab.code; for (const n of lab.params) { const s = P[n.id]; let a = xv(s); if (n.raw) a = String(s); else if (n.dp) a = Number(s).toFixed(n.dp); else if (n.step && n.step % 1 !== 0) a = Number(s).toFixed(1); e = e.replace(new RegExp('\\b' + n.id + '\\b', 'g'), a); } return e; }
let bad = 0, total = 0;
d.ch.forEach((c, i) => {
  const lab = c.lab, run = new Function(labs[i].code)();
  const combos = [{}]; for (const p of lab.params) { const vals = p.options ? p.options.map(o => o[0]) : [p.value, p.min, p.max].filter(v => v !== undefined); const nc = []; for (const cb of combos) for (const v of [...new Set(vals)]) nc.push({ ...cb, [p.id]: v }); combos.splice(0, combos.length, ...nc.slice(0, 12)); }
  for (const P of combos) {
    total++;
    const js = []; try { run(P, s => js.push(String(s))); } catch (e) { js.push('JSERR ' + e.message); }
    let py; try { py = execFileSync('python3', ['-c', sub(lab, P)], { encoding: 'utf8', timeout: 20000 }).trimEnd().split('\n'); } catch (e) { py = ['PYERR ' + String(e.stderr).slice(0, 200)]; }
    const same = js.length === py.length && js.every((l, k) => l.trimEnd() === py[k].trimEnd());
    if (!same) { bad++; console.log('MISMATCH ch', i + 1, JSON.stringify(P)); for (let k = 0; k < Math.max(js.length, py.length); k++) if ((js[k] || '').trimEnd() !== (py[k] || '').trimEnd()) { console.log('  js:', js[k]); console.log('  py:', py[k]); break; } }
  }
});
console.log(`labs checked: ${total} parameter sets, mismatches: ${bad}`);
