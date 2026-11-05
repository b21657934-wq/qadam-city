import css from './ui/style.css';
import logoSvg from './ui/logo.svg';
import { Engine } from './world/engine.js';
import { CameraRig } from './world/camera.js';
import { City } from './world/city.js';
import { Qadam, Snow } from './world/life.js';
import { Storm } from './world/storm.js';
import { buildIslands } from './world/islands.js';
import { Stage } from './world/stage.js';
import { App } from './app.js';
import { store } from './store.js';
import { setLang } from './i18n.js';

const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
const Q = new URLSearchParams(location.search);
const host = document.getElementById('app');
const loader = document.createElement('div'); loader.className = 'loader';
loader.innerHTML = `<img alt="" src="data:image/svg+xml,${encodeURIComponent(logoSvg)}">`;
document.body.appendChild(loader);

const s = store.get();
const navL = (navigator.language || 'en').toLowerCase();
setLang(Q.get('lang') || s.lang || (navL.startsWith('kk') || navL.startsWith('kz') ? 'kk' : navL.startsWith('ru') ? 'ru' : 'en'));
let night = Q.has('night') ? Q.get('night') === '1' : s.night ?? (matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.dataset.theme = night ? 'dark' : 'light';

requestAnimationFrame(() => {
  const engine = new Engine(host);
  const rig = new CameraRig(engine, engine.renderer.domElement);
  const city = new City(engine);
  buildIslands(city);
  const qadam = new Qadam(engine, 1.8, 1.5);
  const snow = new Snow(engine);
  if (!store.user() && (Q.has('demo') || location.hash.startsWith('#book'))) store.login('guest'); // QR codes in the comic open a chapter straight away
  if (Q.has('demo')) { const n = +Q.get('demo'); for (let i = 0; i < 10; i++) if (i < n) store.get().stars[i] = store.get().stars[i] || 3; else delete store.get().stars[i]; store.set({ onboarded: true }); }
  city.setBuilt(store.builtCount());
  city.libBake();
  const stage = new Stage(engine);
  const blizzard = new Storm(engine, rig);
  const app = window.__app = new App({ engine, rig, city, qadam, snow });
  app.stage = stage; app.blizzard = blizzard; window.__engine = engine; window.__sc = i => app.sceneTest(i);
  rig.onFp = on => stage.labels(!on);
  app.setTheme(night, true);
  engine.resize();
  if (!store.user()) app.show('login'); else if (!store.get().onboarded && !Q.has('view')) app.show('onboard', 0); else app.show(Q.get('view') || 'home', Q.has('arg') ? +Q.get('arg') : undefined);
  setTimeout(() => { loader.classList.add('out'); setTimeout(() => loader.remove(), 600); }, 300);
  if (location.hash.startsWith('#book')) app.book.fromHash();
  window.__ready = true;
});
