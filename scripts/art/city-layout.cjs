#!/usr/bin/env node
// Generates the importable placeholder Hudson Hex City layout (Phase 1).
// Five stepped-hex islands on VOID water, a bike-lane bridge, a ferry lane,
// typed Areas, and a backdrop. Uses only the existing bundled furniture.
const fs = require('fs');
const path = require('path');

const COLS = 76;
const ROWS = 44;
const VOID = 255;
const FLOOR = 1;
const tiles = new Array(COLS * ROWS).fill(VOID);
const tileColors = new Array(COLS * ROWS).fill(null);
const areaTiles = new Array(COLS * ROWS).fill(null);
const furniture = [];
let uidN = 0;
const idx = (c, r) => r * COLS + c;
const GRASS = { h: 100, s: 45, b: -10, c: 0 };
const PLAZA = { h: 40, s: 10, b: 15, c: 0 };
const WOOD = { h: 30, s: 45, b: -25, c: 0 };
const WATER = { h: 220, s: 55, b: -35, c: 0 };

function paint(c, r, color, area) {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
  tiles[idx(c, r)] = FLOOR;
  tileColors[idx(c, r)] = color;
  if (area !== undefined) areaTiles[idx(c, r)] = area;
}
/** Stepped hex: 18 wide at the middle, narrowing 1 tile per edge row. */
function hex(cx, cy, area) {
  for (let dr = -6; dr <= 5; dr++) {
    const inset = Math.max(0, Math.abs(dr + 0.5) - 3.5) | 0;
    for (let dc = -9 + inset; dc < 9 - inset; dc++) paint(cx + dc, cy + dr, GRASS, area);
  }
}
function place(type, col, row) {
  furniture.push({ uid: `city-${++uidN}`, type, col, row });
}
/** Desk (3x2) + PC on it + bench in front, copied from the default office's workstation. */
function workstation(c, r) {
  for (let dc = -1; dc <= 3; dc++)
    for (let dr = -1; dr <= 3; dr++) {
      if (areaTiles[idx(c + dc, r + dr)] !== null) tileColors[idx(c + dc, r + dr)] = PLAZA;
    }
  place('DESK_FRONT', c, r);
  place('PC_FRONT_OFF', c + 1, r);
  place('CUSHIONED_BENCH', c + 1, r + 2);
}

// Islands (centre col, centre row, Area label)
const H = {
  lofts: [12, 12, 'Waterfront Lofts'],
  gym: [12, 32, 'Riverside Gym'],
  plaza: [44, 12, 'Midtown Plaza'],
  cafe: [64, 12, 'Corner Cafe'],
  arcade: [54, 32, 'Neon Arcade'],
};
for (const [cx, cy, label] of Object.values(H)) hex(cx, cy, label);

// Same-side sidewalks (plain walkable, no Area)
for (let r = 18; r <= 26; r++) {
  paint(11, r, PLAZA, null);
  paint(12, r, PLAZA, null);
}
for (let c = 52; c <= 56; c++) {
  paint(c, 12, PLAZA, null);
  paint(c, 13, PLAZA, null);
}
for (let r = 12; r <= 26; r++) {
  paint(54, r, PLAZA, null);
  paint(55, r, PLAZA, null);
}

// Bike-lane bridge between the work hexes (NJ Lofts <-> NYC Plaza)
for (let c = 21; c <= 35; c++) {
  paint(c, 12, WOOD, 'Hudson Bridge');
  paint(c, 13, WOOD, 'Hudson Bridge');
}
// Ferry lane between the gym (NJ) and the arcade (NYC)
for (let c = 21; c <= 45; c++) {
  paint(c, 33, WATER, 'Hudson Ferry');
  paint(c, 34, WATER, 'Hudson Ferry');
}

// Work stations: 6 per work hex = 12 seats
for (const [cx, cy] of [H.lofts, H.plaza]) {
  for (const [dc, dr] of [
    [-7, -4],
    [-2, -4],
    [3, -4],
    [-7, 1],
    [-2, 1],
    [3, 1],
  ])
    workstation(cx + dc, cy + dr);
}
// Leisure decor
place('COFFEE', 62, 9);
place('COFFEE', 66, 9);
place('SOFA_FRONT', 61, 14);
place('SOFA_FRONT', 65, 14);
place('LARGE_PLANT', 6, 28);
place('PLANT', 16, 29);
place('PLANT', 18, 36);
place('PLANT', 50, 29);
place('LARGE_PLANT', 58, 28);
place('PLANT', 49, 36);

const layout = {
  version: 1,
  cols: COLS,
  rows: ROWS,
  layoutRevision: 9000,
  tiles,
  tileColors,
  furniture,
  pets: [],
  backdrop: { id: 'hudson', horizonRow: 5 },
  areas: [
    { label: 'Waterfront Lofts', color: '#4f7ac8', kind: 'work' },
    { label: 'Midtown Plaza', color: '#e2533d', kind: 'work' },
    { label: 'Corner Cafe', color: '#2f8f6f', kind: 'leisure' },
    { label: 'Riverside Gym', color: '#e0a23a', kind: 'leisure' },
    { label: 'Neon Arcade', color: '#ff3d9a', kind: 'leisure' },
    { label: 'Hudson Bridge', color: '#8b6a46', kind: 'bikeLane' },
    { label: 'Hudson Ferry', color: '#3c6fd1', kind: 'ferry' },
  ],
  areaTiles,
};
const out = path.join(__dirname, '../../webview-ui/public/assets/layouts/hudson-city-preview.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(layout));
console.log('wrote', path.relative(process.cwd(), out), `${COLS}x${ROWS}`, furniture.length, 'items');
