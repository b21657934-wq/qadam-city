import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'dist');
fs.mkdirSync(out, { recursive: true });

const res = await esbuild.build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true, minify: !process.env.DEV, format: 'iife', target: 'es2019',
  write: false, legalComments: 'none', charset: 'utf8',
  loader: { '.css': 'text', '.svg': 'text' },
  define: { 'process.env.NODE_ENV': '"production"' },
});
const js = res.outputFiles[0].text + (process.env.TEST ? fs.readFileSync(path.join(root, 'tools/solve.js'), 'utf8') : '');

const f = n => fs.readFileSync(path.join(root, 'fonts', n)).toString('base64');
const faces = [
  ['Inter', 'inter-Regular.woff2', 400, 'normal'], ['Inter', 'inter-Medium.woff2', 500, 'normal'],
  ['Inter', 'inter-SemiBold.woff2', 600, 'normal'], ['Inter', 'inter-Bold.woff2', 700, 'normal'],
  ['Lora', 'lora.woff2', '400 700', 'normal'], ['Lora', 'lora-italic.woff2', '400 700', 'italic'],
].map(([fam, file, w, st]) => `@font-face{font-family:${fam};src:url(data:font/woff2;base64,${f(file)}) format("woff2");font-weight:${w};font-style:${st};font-display:swap}`).join('');

const logo = fs.readFileSync(path.join(root, 'src/ui/logo.svg'), 'utf8');
const favicon = 'data:image/svg+xml,' + encodeURIComponent(logo);

const intro = fs.readFileSync(new URL('../src/intro/intro.html', import.meta.url), 'utf8');
const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F1F4F7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0E1430" media="(prefers-color-scheme: dark)">
<meta name="description" content="QAI-QALA — a smart-city game and interactive AI book for AIF1303 AI Fundamentals, Qairu University. Team 11.">
<title>QAI-QALA · AI Fundamentals</title>
<link rel="icon" href="${favicon}">
<style>${faces}</style>
</head><body>
${intro}
<div id="app"></div>
<script>${js.replace(/<\/script/g, '<\\/script')}</script>
</body></html>`;
fs.writeFileSync(path.join(out, 'index.html'), html);
if (!process.env.DEV && !process.env.TEST) { fs.writeFileSync(path.join(root, 'index.html'), html); fs.writeFileSync(path.join(root, '.nojekyll'), ''); }
console.log('built', (html.length / 1024).toFixed(0) + ' KB');
