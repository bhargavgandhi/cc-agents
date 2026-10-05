// Shared pixel-art helpers for the city art generators (scripts/art/*.cjs).
// Sprites are drawn with integer rects into an RGBA buffer and written as PNGs
// in the exact format the asset pipeline loads (assets/furniture/<ID>/,
// assets/floors/floor_N.png).
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ASSETS = path.join(__dirname, '../../webview-ui/public/assets');

function parse(hex) {
  const h = hex.replace('#', '');
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), a];
}

class Sprite {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h * 4);
  }
  px(x, y, c) {
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    const k = (y * this.w + x) * 4;
    const [r, g, b, a] = parse(c);
    this.data[k] = r;
    this.data[k + 1] = g;
    this.data[k + 2] = b;
    this.data[k + 3] = a;
    return this;
  }
  rect(x, y, w, h, c) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, c);
    return this;
  }
  hline(x, y, w, c) {
    return this.rect(x, y, w, 1, c);
  }
  vline(x, y, h, c) {
    return this.rect(x, y, 1, h, c);
  }
  /** Filled rect with a 1px outline. */
  box(x, y, w, h, fill, outline) {
    this.rect(x, y, w, h, outline);
    return this.rect(x + 1, y + 1, w - 2, h - 2, fill);
  }
  /** Checkerboard dither of `c` over a rect (every other pixel). */
  dither(x, y, w, h, c, phase = 0) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) if ((i + j + phase) % 2 === 0) this.px(i, j, c);
    return this;
  }
  /** Draw text in a 3×5 pixel font. */
  text(x, y, str, c) {
    let cx = x;
    for (const ch of str.toUpperCase()) {
      const g = FONT[ch];
      if (g) g.forEach((row, ry) => [...row].forEach((b, rx) => b === '1' && this.px(cx + rx, y + ry, c)));
      cx += 4;
    }
    return this;
  }
  textWidth(str) {
    return str.length * 4 - 1;
  }
  isSet(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.data[(y * this.w + x) * 4 + 3] > 0;
  }
  /** Add a 1px outline around every opaque pixel (outside the shape). */
  outline(c) {
    const pts = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.isSet(x, y)) continue;
        if (this.isSet(x - 1, y) || this.isSet(x + 1, y) || this.isSet(x, y - 1) || this.isSet(x, y + 1)) pts.push([x, y]);
      }
    for (const [x, y] of pts) this.px(x, y, c);
    return this;
  }
  copy() {
    const s = new Sprite(this.w, this.h);
    s.data.set(this.data);
    return s;
  }
  toPng() {
    const png = new PNG({ width: this.w, height: this.h });
    png.data.set(this.data);
    return PNG.sync.write(png);
  }
}

/** 3×5 uppercase font for signage. */
const FONT = {
  A: ['111', '101', '111', '101', '101'],
  B: ['110', '101', '110', '101', '110'],
  C: ['111', '100', '100', '100', '111'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
  F: ['111', '100', '110', '100', '100'],
  G: ['111', '100', '101', '101', '111'],
  H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  K: ['101', '101', '110', '101', '101'],
  L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'],
  N: ['111', '101', '101', '101', '101'],
  O: ['111', '101', '101', '101', '111'],
  P: ['111', '101', '111', '100', '100'],
  Q: ['111', '101', '101', '111', '001'],
  R: ['111', '101', '110', '101', '101'],
  S: ['111', '100', '111', '001', '111'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'],
  W: ['101', '101', '111', '111', '101'],
  Y: ['101', '101', '010', '010', '010'],
  Z: ['111', '001', '010', '100', '111'],
  ' ': ['000', '000', '000', '000', '000'],
};

/** Deterministic PRNG so regenerated art is byte-identical. */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 0x100000000);
}

function writeFile(rel, buf) {
  const out = path.join(ASSETS, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  return out;
}

/** Write a furniture folder: manifest + each named sprite (file = `${name}.png`). */
function writeFurniture(id, manifest, sprites) {
  const dir = path.join('furniture', id);
  for (const [name, sprite] of Object.entries(sprites)) writeFile(path.join(dir, `${name}.png`), sprite.toPng());
  writeFile(path.join(dir, 'manifest.json'), Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
}

/** Simple single-sprite asset manifest. */
function simpleManifest(id, name, category, sprite, backgroundTiles = 0, extra = {}) {
  return {
    id,
    name,
    category,
    type: 'asset',
    canPlaceOnWalls: false,
    canPlaceOnSurfaces: false,
    backgroundTiles,
    width: sprite.w,
    height: sprite.h,
    footprintW: sprite.w / 16,
    footprintH: sprite.h / 16,
    ...extra,
  };
}

/** Always-on animated decor (frames cycle with the furniture animation timer). */
function animatedManifest(id, name, category, frames, backgroundTiles = 0) {
  const f0 = frames[0];
  return {
    id,
    name,
    category,
    type: 'group',
    groupType: 'animation',
    canPlaceOnWalls: false,
    canPlaceOnSurfaces: false,
    backgroundTiles,
    members: frames.map((s, i) => ({
      type: 'asset',
      id: `${id}_${i + 1}`,
      file: `${id}_${i + 1}.png`,
      width: f0.w,
      height: f0.h,
      footprintW: f0.w / 16,
      footprintH: f0.h / 16,
      frame: i,
    })),
  };
}

function writeFloor(n, sprite) {
  return writeFile(path.join('floors', `floor_${n}.png`), sprite.toPng());
}

module.exports = { Sprite, rng, writeFurniture, simpleManifest, animatedManifest, writeFloor, ASSETS };
