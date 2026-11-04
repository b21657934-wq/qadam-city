# Qadam City — AI book, version 2

Interactive AI book for **AIF1303 AI Fundamentals**, Qairu University. Team 11: Yuldashov Bilal, Tashmetov Shakhrukh.

Qadam the builder robot turns a snowy steppe into Astana. Every AI topic (weeks 1–10) adds a new system to the city; the finale is the night city glowing. The **Library** in the city is the book: 10 chapters with theory, diagrams, formulas, worked problems, live Python labs and quizzes, in English, Russian and Kazakh.

Version 1 (islands) stays unchanged for comparison: https://b21657934-wq.github.io/qadam-archipelago/

## Version 1 vs version 2

| | Version 1 · islands | Version 2 · smart city |
|---|---|---|
| Goal of a mission | abstract (“collect 3 stars”) | everyday (“deliver the parcel to the hospital fastest”) |
| Controls | many sliders at once | one goal, one button or 2–3 tiles; parameters live in the book lab |
| Result | numbers in a panel | visible in the city: search wave and car, melting queue, probability column, lit windows |
| Teaching | paragraphs of text | pulsing “tap here” coach, 1–2 sentences per screen |
| Link to the topic | island unrelated to the task | one sentence after each step (“This is A*: …”) |
| Translations | diagram and lab labels English only | everything EN/RU/KZ, incl. 143 diagram labels |
| Look | default three.js scene, emoji icons | ACES, soft shadows, day/night, bloom, own palette, own SVG icons and logo |
| Labs | live JS + Python | same, verified: identical output to Python on 83 parameter sets |
| Performance | — | static districts baked (623 → 253 draw calls); shadows/bloom drop on slow devices |

## Build

```
npm install
node tools/build.mjs          # writes dist/index.html and ./index.html (GitHub Pages)
node tools/verify-labs.mjs    # runs every lab in JS and real Python, compares output
```

`src/` — scene (`world/`), interface (`ui/`, `app.js`), missions (`missions/`), book (`book/`, content imported from version 1 by `tools/v1import.py`).
