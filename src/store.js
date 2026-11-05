// One save per account. The guest keeps the old key so earlier progress stays.
const UKEY = 'qadam-city-user', ACCOUNTS = { qwerty: { pass: '000', keys: 1000 } };
let user = null; try { user = localStorage.getItem(UKEY); } catch (e) { /* storage unavailable */ }
const keyFor = u => u && u !== 'guest' ? 'qadam-city-v2:' + u : 'qadam-city-v2';
const def = () => ({ stars: {}, onboarded: false, lang: null, night: null, keys: user && ACCOUNTS[user] ? ACCOUNTS[user].keys : 5, earnN: {} });
let KEY = keyFor(user), st = def();
try { const raw = localStorage.getItem(KEY); if (raw) st = Object.assign(def(), JSON.parse(raw)); } catch (e) { /* storage unavailable */ }
export const store = {
  get: () => st,
  save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } },
  set(patch) { Object.assign(st, patch); this.save(); },
  setStars(i, n) { st.stars[i] = Math.max(st.stars[i] || 0, n); this.save(); },
  builtCount() { let n = 0; while (st.stars[n] > 0) n++; return n; },
  totalStars() { return Object.values(st.stars).reduce((a, b) => a + b, 0); },
  user: () => user,
  check(nick, pass) { const n = String(nick || '').trim().toLowerCase(), a = ACCOUNTS[n]; return a && a.pass === String(pass || '') ? n : null; },
  login(u) { try { localStorage.setItem(UKEY, u); } catch (e) { /* ignore */ } user = u; KEY = keyFor(u); st = def(); try { const raw = localStorage.getItem(KEY); if (raw) st = Object.assign(def(), JSON.parse(raw)); } catch (e) { /* ignore */ } this.save(); },
  logout() { try { localStorage.removeItem(UKEY); } catch (e) { /* ignore */ } user = null; },
  reset() { const keep = { lang: st.lang, night: st.night }; st = Object.assign(def(), keep, { onboarded: true }); this.save(); },
};
