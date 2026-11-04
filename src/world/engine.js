import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export const U = { uTime: { value: 0 }, uNight: { value: 0 }, uForce: { value: 0 } };
export const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const LOOK = {
  day: { skyTop: 0xB7CEE3, skyMid: 0xDCE4EC, skyBot: 0xF1E7DC, fog: 0xE3E7EC, hemiS: 0xE4EEF8, hemiG: 0xC9B9A6, hemiI: 1.15, sun: 0xFFE3C2, sunI: 2.6, exp: 1.05 },
  night: { skyTop: 0x0B1028, skyMid: 0x1A2350, skyBot: 0x2B3462, fog: 0x1D2649, hemiS: 0x5868A8, hemiG: 0x1A1E33, hemiI: 0.78, sun: 0x9FB2FF, sunI: 0.7, exp: 1.0 },
};

export class Engine {
  constructor(host) {
    this.host = host;
    this.hooks = [];
    this.night = 0; this.nightFrom = 0; this.nightTo = 0; this.nightT = 1;
    const mobile = /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent) || Math.min(innerWidth, innerHeight) < 600;
    this.quality = mobile ? 1 : 2;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: /shot=/.test(location.search) });
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.className = 'world';
    host.appendChild(r.domElement);

    const s = this.scene = new THREE.Scene();
    s.fog = new THREE.Fog(LOOK.day.fog, 40, 100);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);

    // gradient sky (screen-space quad drawn first)
    this.skyU = { a: { value: new THREE.Color() }, b: { value: new THREE.Color() }, c: { value: new THREE.Color() } };
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: this.skyU, depthWrite: false, depthTest: false,
      vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = vec4(position.xy, 0.999, 1.); }',
      fragmentShader: 'uniform vec3 a,b,c; varying vec2 v; void main(){ vec3 col = v.y > .45 ? mix(b, a, smoothstep(.45, 1., v.y)) : mix(c, b, smoothstep(0., .45, v.y)); gl_FragColor = vec4(col, 1.);\n#include <colorspace_fragment>\n}',
    }));
    sky.frustumCulled = false; sky.renderOrder = -10; s.add(sky);

    // stars
    const N = 700, sp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, rr = Math.sqrt(1 - u * u); sp.set([Math.cos(a) * rr * 150, Math.abs(u) * 150 + 10, Math.sin(a) * rr * 150], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xC9D4FF, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    s.add(new THREE.Points(sg, this.starMat));

    this.hemi = new THREE.HemisphereLight(); s.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight();
    sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 70 });
    sun.shadow.radius = 4; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    s.add(sun, sun.target);

    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(s, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.5, 0.95);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.applyQuality();
    this.applyLook(0);
    this.resize();
    addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => { this.clock.getDelta(); });
    this.clock = new THREE.Clock(); this.t0 = performance.now() / 1000;
    this.fps = { n: 0, acc: 0, warm: 0, checks: 0 };
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }
  applyQuality() {
    const q = this.quality, r = this.renderer;
    r.setPixelRatio(Math.min(devicePixelRatio || 1, q === 2 ? 2 : q === 1 ? 1.6 : 1));
    r.shadowMap.enabled = q > 0;
    this.sun.castShadow = q > 0;
    const ms = q === 2 ? 2048 : 1024;
    if (this.sun.shadow.mapSize.x !== ms) { this.sun.shadow.mapSize.set(ms, ms); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } }
    this.scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); });
    this.resize();
  }
  resize() {
    const w = this.host.clientWidth || innerWidth, h = this.host.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px';
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.W = w; this.H = h;
    this.hooks.forEach(f => f.resize && f.resize(w, h));
  }
  setNight(on, instant) {
    this.nightFrom = this.night; this.nightTo = on ? 1 : 0; this.nightT = instant || REDUCED ? 1 : 0; this.nightStart = performance.now();
    if (instant || REDUCED) this.applyLook(this.nightTo);
  }
  toward(v) { this.nightFrom = this.night; this.nightTo = v; this.nightT = REDUCED ? 1 : 0; this.nightStart = performance.now(); if (REDUCED) this.applyLook(v); }
  applyLook(n) {
    this.night = n; U.uNight.value = n;
    const D = LOOK.day, N = LOOK.night, c = new THREE.Color(), mix = (a, b) => c.set(a).lerp(new THREE.Color(b), n).clone();
    this.skyU.a.value.copy(mix(D.skyTop, N.skyTop)); this.skyU.b.value.copy(mix(D.skyMid, N.skyMid)); this.skyU.c.value.copy(mix(D.skyBot, N.skyBot));
    this.scene.fog.color.copy(mix(D.fog, N.fog));
    this.hemi.color.copy(mix(D.hemiS, N.hemiS)); this.hemi.groundColor.copy(mix(D.hemiG, N.hemiG)); this.hemi.intensity = lerp(D.hemiI, N.hemiI, n);
    this.sun.color.copy(mix(D.sun, N.sun)); this.sun.intensity = lerp(D.sunI, N.sunI, n);
    const a = lerp(0.65, -0.9, n);
    this.sun.position.set(Math.cos(a) * 18, lerp(22, 24, n), Math.sin(a) * 14 + 4);
    this.renderer.toneMappingExposure = lerp(D.exp, N.exp, n);
    this.starMat.opacity = Math.max(0, n * 1.2 - 0.2);
    this.bloom.strength = 0.42 * n;
    this.hooks.forEach(f => f.look && f.look(n));
  }
  on(h) { this.hooks.push(h); }
  loop() {
    requestAnimationFrame(this.loop);
    if (document.hidden || this.paused) { this.clock.getDelta(); return; }
    const dt = Math.min(this.clock.getDelta(), 0.05);
    U.uTime.value = performance.now() / 1000 - this.t0;
    if (this.nightT < 1) { this.nightT = Math.min(1, (performance.now() - this.nightStart) / 1600); this.applyLook(lerp(this.nightFrom, this.nightTo, ease(this.nightT))); }
    for (const h of this.hooks) h.update && h.update(dt, U.uTime.value);
    const useBloom = this.quality > 0 && this.night > 0.03;
    if (useBloom) this.composer.render(); else this.renderer.render(this.scene, this.camera);
    this.measure(dt);
  }
  measure(dt) {
    const f = this.fps;
    if (f.warm < 1.5) { f.warm += dt; return; }
    f.acc += dt; f.n++;
    if (f.acc > 2.5) {
      const fps = f.n / f.acc; this.lastFps = fps;
      if (fps < 42 && this.quality > 0 && f.checks < 4) { this.quality--; this.applyQuality(); f.warm = 0.5; }
      f.acc = 0; f.n = 0; f.checks++;
    }
  }
}
export { ease, lerp };
