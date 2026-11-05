// Small synthesized sound kit (Web Audio, no files): UI, snow steps, wind, city murmur, sirens, engine.
let ctx = null, master = null, noiseBuf = null, enabled = true, lastStep = 0;
const amb = {};

function noise() {
  if (noiseBuf) return noiseBuf;
  const n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); const d = noiseBuf.getChannelData(0);
  let b = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b = 0.97 * b + 0.03 * w; d[i] = w * 0.6 + b * 2.2; }
  return noiseBuf;
}
const now = () => ctx.currentTime;
function env(g, t, a, peak, d) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone(f, dur, { type = 'sine', vol = 0.06, at = 0, slide = 0, filt = 0 } = {}) {
  const t = now() + at, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + dur);
  let out = o; if (filt) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = filt; o.connect(lp); out = lp; }
  out.connect(g); g.connect(master); env(g, t, 0.008, vol, dur); o.start(t); o.stop(t + dur + 0.05);
}
function burst(dur, { f = 2000, q = 0.8, vol = 0.05, at = 0, type = 'bandpass' } = {}) {
  const t = now() + at, s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noise(); s.playbackRate.value = 0.8 + Math.random() * 0.5; bp.type = type; bp.frequency.value = f; bp.Q.value = q;
  s.connect(bp); bp.connect(g); g.connect(master); env(g, t, 0.004, vol, dur); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
}
function loopNoise(f, q, vol, type = 'lowpass') {
  const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noise(); s.loop = true; bp.type = type; bp.frequency.value = f; bp.Q.value = q; g.gain.value = vol;
  s.connect(bp); bp.connect(g); g.connect(master); s.start(); return { s, bp, g };
}

const SND = {
  tap: () => tone(880, 0.05, { vol: 0.035, slide: 1.2 }),
  ok: () => { tone(784, 0.14, { type: 'triangle', vol: 0.07 }); tone(1175, 0.22, { type: 'triangle', vol: 0.07, at: 0.1 }); },
  bad: () => tone(196, 0.22, { type: 'square', vol: 0.035, slide: 0.75, filt: 700 }),
  key: () => [1319, 1568, 2093].forEach((f, i) => tone(f, 0.12, { type: 'triangle', vol: 0.05, at: i * 0.07 })),
  reward: () => [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.06, at: i * 0.09 })),
  build: () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.055, at: i * 0.11 })); burst(0.9, { f: 600, q: 0.4, vol: 0.03, type: 'lowpass' }); },
  lock: () => { tone(220, 0.12, { type: 'triangle', vol: 0.06, slide: 0.8 }); burst(0.06, { f: 1200, q: 2, vol: 0.03 }); },
  step: (v = 1) => { const t = performance.now(); if (t - lastStep < 110) return; lastStep = t; burst(0.07 + Math.random() * 0.04, { f: 1700 + Math.random() * 1400, q: 0.9, vol: 0.035 * v }); burst(0.05, { f: 380, q: 1.2, vol: 0.02 * v, at: 0.01 }); },
  blip: () => tone(620, 0.09, { vol: 0.05, slide: 1.5 }),
  power: () => { tone(110, 1.2, { type: 'sawtooth', vol: 0.025, slide: 2.4, filt: 900 }); burst(0.15, { f: 3500, q: 1, vol: 0.02, at: 1.0 }); },
  alarm: () => { const t = now(), o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(420, t); for (let k = 0; k < 2; k++) { o.frequency.linearRampToValueAtTime(780, t + k * 1.6 + 0.8); o.frequency.linearRampToValueAtTime(420, t + k * 1.6 + 1.6); } o.connect(g); g.connect(master); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + 0.3); g.gain.setValueAtTime(0.035, t + 2.9); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.3); o.start(t); o.stop(t + 3.4); },
  siren: (dur = 3) => { const t = now(), o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; for (let k = 0; k * 0.36 < dur; k++) o.frequency.setValueAtTime(k % 2 ? 960 : 720, t + k * 0.36); o.connect(g); g.connect(master); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03, t + 0.15); g.gain.setValueAtTime(0.03, t + dur - 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.start(t); o.stop(t + dur + 0.05); },
  door: () => { burst(0.18, { f: 900, q: 0.7, vol: 0.03 }); tone(300, 0.08, { type: 'triangle', vol: 0.03, at: 0.15 }); },
};

export const sfx = {
  setEnabled(v) { enabled = v; if (master) master.gain.setTargetAtTime(v ? 1 : 0, now(), 0.05); },
  unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = enabled ? 1 : 0;
    const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    // ambience: wind and a soft city murmur
    amb.wind = loopNoise(420, 0.6, 0.012); amb.murmur = loopNoise(520, 0.7, 0.0, 'bandpass');
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.13; lg.gain.value = 180; lfo.connect(lg); lg.connect(amb.wind.bp.frequency); lfo.start();
    const lfo2 = ctx.createOscillator(), lg2 = ctx.createGain(); lfo2.frequency.value = 0.37; lg2.gain.value = 0.004; lfo2.connect(lg2); lg2.connect(amb.murmur.g.gain); lfo2.start();
    this.city(this._city || 0);
  },
  play(name, ...a) { if (!ctx || !enabled || !SND[name]) return; try { SND[name](...a); } catch (e) { /* ignore */ } },
  // 0..1: how lively the city is (built districts, day)
  city(v) { this._city = v; if (amb.murmur) amb.murmur.g.gain.setTargetAtTime(0.006 * v, now(), 0.8); },
  wind(v) { if (amb.wind) { amb.wind.g.gain.setTargetAtTime(0.012 + 0.11 * v, now(), 1.2); amb.wind.bp.frequency.setTargetAtTime(420 + 900 * v, now(), 1.2); } },
  engine() {
    if (!ctx || !enabled) return { stop() {} };
    const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = 52; lp.type = 'lowpass'; lp.frequency.value = 320;
    const n = loopNoise(1100, 0.8, 0.0, 'bandpass'); o.connect(lp); lp.connect(g); g.connect(master); g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.05, now() + 0.6); n.g.gain.setTargetAtTime(0.03, now(), 0.4); o.start();
    return { stop() { const t = now(); g.gain.setTargetAtTime(0.0001, t, 0.3); n.g.gain.setTargetAtTime(0, t, 0.3); setTimeout(() => { o.stop(); n.s.stop(); }, 1500); } };
  },
};
