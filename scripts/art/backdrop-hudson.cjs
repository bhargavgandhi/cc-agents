#!/usr/bin/env node
// Hudson skyline backdrop (1280×200) for the city theme: dusk sky with stars,
// a hazy far layer, a low Jersey City skyline (left) and a taller Manhattan
// skyline (right) with a tapered supertall and a stepped spire tower, and
// window light reflected on the waterline. Generic towers only — no real
// company logos or signage.
const fs = require('fs');
const path = require('path');
const { Sprite, rng } = require('./lib.cjs');

const W = 1280;
const H = 200;
const s = new Sprite(W, H);
const r = rng(42);

// Sky: banded dusk gradient with dithered band edges.
const sky = ['#1b1838', '#211d44', '#2a2350', '#35295a', '#442f63', '#57356a', '#6e3c70', '#884572', '#a35071', '#bd5e6e', '#d4706a', '#e68766', '#f19d66'];
const band = Math.ceil(H / sky.length);
sky.forEach((c, i) => {
  s.rect(0, i * band, W, band, c);
  if (i + 1 < sky.length) s.dither(0, (i + 1) * band - 2, W, 2, sky[i + 1], i % 2);
});
// Stars in the upper sky.
for (let i = 0; i < 140; i++) {
  const x = Math.floor(r() * W);
  const y = Math.floor(r() * 70);
  s.px(x, y, r() > 0.8 ? '#ffffff' : '#c9c3ff');
}
// Thin cloud streaks.
for (let i = 0; i < 6; i++) {
  const x = Math.floor(r() * (W - 200));
  const y = 80 + Math.floor(r() * 50);
  s.hline(x, y, 80 + Math.floor(r() * 120), '#f4a8806b').hline(x + 20, y + 1, 60, '#f4a88040');
}

function tower(x, top, w, body, lit, opts = {}) {
  s.rect(x, top, w, H - top, body);
  if (opts.edge) s.vline(x + w - 1, top, H - top, opts.edge);
  for (let y = top + 3; y < H - 4; y += 4)
    for (let i = x + 2; i < x + w - 2; i += 3) if (r() > (opts.dark ?? 0.35)) s.rect(i, y, 1, 2, lit);
  if (opts.beacon) s.px(x + Math.floor(w / 2), top - 1, '#ff4d4d');
}

// Far layer: hazy, low-contrast, sparse lights, across the whole width.
for (let x = 0; x < W; ) {
  const w = 18 + Math.floor(r() * 26);
  tower(x, 70 + Math.floor(r() * 60), w, '#4a3a6a', '#8c7aa8', { dark: 0.8 });
  x += w + 1;
}
// Jersey City (left, lower).
for (let x = 0; x < 470; ) {
  const w = 14 + Math.floor(r() * 16);
  tower(x, 112 + Math.floor(r() * 50), w, '#2a2442', '#f5d48a', { edge: '#36304f', beacon: r() > 0.85 });
  x += w + 2;
}
// Hudson gap, then Manhattan (right, taller).
for (let x = 560; x < W; ) {
  const w = 16 + Math.floor(r() * 16);
  tower(x, 52 + Math.floor(r() * 80), w, '#1d1934', '#ffe2a0', { edge: '#2a2546', beacon: r() > 0.8 });
  x += w + 2;
}
// Tapered supertall.
for (let y = 10; y < H; y++) {
  const w = 8 + Math.floor((y - 10) * 0.16);
  s.rect(900 - (w >> 1), y, w, 1, '#221e3d');
  if (y % 4 === 0) for (let i = 900 - (w >> 1) + 2; i < 900 + (w >> 1) - 2; i += 3) if (r() > 0.4) s.px(i, y, '#ffe2a0');
}
s.vline(899, 0, 12, '#221e3d').px(899, 0, '#ff4d4d');
// Stepped spire tower.
s.rect(740, 48, 22, H - 48, '#1d1934').rect(744, 34, 14, 14, '#1d1934').rect(747, 22, 8, 12, '#1d1934').rect(750, 6, 2, 16, '#1d1934');
for (let y = 52; y < H - 4; y += 4) for (let i = 742; i < 760; i += 3) if (r() > 0.3) s.rect(i, y, 1, 2, '#ffe2a0');
s.px(750, 6, '#ff4d4d');
// Waterline glow + reflections in the bottom rows.
s.rect(0, H - 6, W, 6, '#2f4176');
for (let x = 0; x < W; x += 2) if (r() > 0.55) s.rect(x, H - 6 + Math.floor(r() * 5), 1 + Math.floor(r() * 3), 1, r() > 0.5 ? '#d9b06a' : '#6f86c4');

const out = path.join(__dirname, '../../webview-ui/src/assets/backdrops/hudson.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, s.toPng());
console.log('wrote', path.relative(process.cwd(), out), `${W}x${H}`);
