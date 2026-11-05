const KEY = 'qadam-city-v2';
const def = () => ({ stars: {}, onboarded: false, lang: null, night: null, keys: 5, earnN: {} });
let st = def();
try { const raw = localStorage.getItem(KEY); if (raw) st = Object.assign(def(), JSON.parse(raw)); } catch (e) { /* storage unavailable */ }
export const store = {
  get: () => st,
  save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } },
  set(patch) { Object.assign(st, patch); this.save(); },
  setStars(i, n) { st.stars[i] = Math.max(st.stars[i] || 0, n); this.save(); },
  builtCount() { let n = 0; while (st.stars[n] > 0) n++; return n; },
  totalStars() { return Object.values(st.stars).reduce((a, b) => a + b, 0); },
  reset() { const keep = { lang: st.lang, night: st.night }; st = Object.assign(def(), keep, { onboarded: true }); this.save(); },
};
