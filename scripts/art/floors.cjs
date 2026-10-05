#!/usr/bin/env node
// City floor patterns (grayscale; colourised per tile in the editor/layout).
//   floor_9  → tile 10: grass speckle
//   floor_10 → tile 11: boardwalk planks
//   floor_11 → tile 12: water ripple
const { Sprite, rng, writeFloor } = require('./lib.cjs');

const MID = '#a6a6a6';
const LO = '#8c8c8c';
const LO2 = '#787878';
const HI = '#bdbdbd';
const HI2 = '#d0d0d0';

// Grass: mid tone, scattered blades (dark below, light tip) that tile seamlessly.
{
  const s = new Sprite(16, 16).rect(0, 0, 16, 16, MID);
  const r = rng(11);
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(r() * 16);
    const y = Math.floor(r() * 16);
    s.px(x, y, LO).px(x, (y + 1) % 16, LO2);
    if (r() > 0.5) s.px((x + 1) % 16, y, HI);
  }
  for (let i = 0; i < 6; i++) s.px(Math.floor(r() * 16), Math.floor(r() * 16), HI2);
  writeFloor(9, s);
}

// Boardwalk: 4px horizontal planks, staggered seams, nail dots, grain.
{
  const s = new Sprite(16, 16).rect(0, 0, 16, 16, MID);
  for (let p = 0; p < 4; p++) {
    const y = p * 4;
    s.hline(0, y, 16, HI);
    s.hline(0, y + 3, 16, LO2);
    const seam = (p % 2) * 8 + 3;
    s.vline(seam, y, 3, LO2);
    s.px(seam + 2, y + 1, LO).px((seam + 10) % 16, y + 2, LO);
    s.px((seam + 5) % 16, y + 1, HI2);
  }
  writeFloor(10, s);
}

// Water: mid tone with two rows of short ripple highlights (seam-free).
{
  const s = new Sprite(16, 16).rect(0, 0, 16, 16, LO);
  s.hline(2, 3, 4, HI).hline(3, 2, 2, HI2);
  s.hline(10, 7, 5, HI).hline(11, 6, 3, HI2);
  s.hline(0, 12, 3, HI).hline(13, 12, 3, HI);
  s.hline(6, 13, 3, MID);
  s.px(8, 1, MID).px(1, 9, MID).px(14, 15, MID);
  writeFloor(11, s);
}
console.log('wrote floor_9 (grass), floor_10 (boardwalk), floor_11 (water)');
