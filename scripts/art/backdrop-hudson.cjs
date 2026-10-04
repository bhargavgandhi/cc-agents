#!/usr/bin/env node
// Generates the placeholder Hudson skyline backdrop (960x160) for the city theme.
// Generic towers only: no real company logos or signage.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const W = 960;
const H = 160;
const png = new PNG({ width: W, height: H });
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function rect(x, y, w, h, color) {
  const [r, g, b] = hex(color);
  for (let j = Math.max(0, y); j < Math.min(H, y + h); j++)
    for (let i = Math.max(0, x); i < Math.min(W, x + w); i++) {
      const k = (j * W + i) * 4;
      png.data[k] = r;
      png.data[k + 1] = g;
      png.data[k + 2] = b;
      png.data[k + 3] = 255;
    }
}
const sky = ['#232046', '#2e2752', '#3d2e5c', '#523466', '#6c3c6c', '#8a466f', '#a8536f', '#c4646c', '#db7a68', '#ec9466'];
sky.forEach((c, i) => rect(0, i * 16, W, 16, c));
let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
function tower(x, top, w, body, lit) {
  rect(x, top, w, H - top, body);
  for (let y = top + 3; y < H - 3; y += 4)
    for (let i = x + 2; i < x + w - 1; i += 3) if (rnd() > 0.3) rect(i, y, 1, 2, lit);
}
for (let x = 0; x < 360; ) {
  const w = 12 + Math.floor(rnd() * 12);
  tower(x, 96 + Math.floor(rnd() * 40), w, '#2a2442', '#f5d48a');
  x += w + 2;
}
for (let x = 420; x < W; ) {
  const w = 14 + Math.floor(rnd() * 12);
  tower(x, 40 + Math.floor(rnd() * 70), w, '#1d1934', '#ffe2a0');
  x += w + 2;
}
for (let y = 6; y < H; y++) {
  const w = 6 + Math.floor((y - 6) * 0.15);
  rect(700 - (w >> 1), y, w, 1, '#221e3d');
}
const out = path.join(__dirname, '../../webview-ui/src/assets/backdrops/hudson.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, PNG.sync.write(png));
console.log('wrote', path.relative(process.cwd(), out));
