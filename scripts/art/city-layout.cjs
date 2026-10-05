#!/usr/bin/env node
// Generates the bundled default layout, Hudson Hex City (default-layout-2.json).
//
// Five flat-top stepped-hex islands (22×16) on VOID water under the Hudson
// skyline: two WORK hexes (umbrella tables + stools + laptops = 12 seats) and
// three LEISURE hexes (café, gym, arcade). A bike-lane bridge joins the work
// hexes, a ferry lane joins the gym and the arcade, sidewalks join the rest.
//
// The generator verifies its own output and exits non-zero on failure:
//   - no two items' blocking tiles overlap (laptops may sit on desk tiles)
//   - every seat and every Area is reachable once furniture blocking is applied
//   - exactly 12 seats (stools are the only chairs)
const fs = require('fs');
const path = require('path');

const FURN = path.join(__dirname, '../../webview-ui/public/assets/furniture');
const COLS = 90;
const ROWS = 52;
const VOID = 255;
const HORIZON_ROW = 12;

// Floor tile values (tile = pattern index + 1) and colours.
const T = { SIDEWALK: 4, PLAZA: 5, GRASS: 10, BOARDWALK: 11, WATER: 12 };
const C = {
  GRASS: { h: 100, s: 50, b: -8, c: 0 },
  RIM: { h: 30, s: 8, b: 22, c: 0 },
  PLAZA: { h: 35, s: 12, b: 12, c: 0 },
  SIDEWALK: { h: 30, s: 8, b: 18, c: 0 },
  BOARDWALK: { h: 28, s: 50, b: -12, c: 0 },
  WATER: { h: 215, s: 60, b: -22, c: 0 },
};

const tiles = new Array(COLS * ROWS).fill(VOID);
const tileColors = new Array(COLS * ROWS).fill(null);
const areaTiles = new Array(COLS * ROWS).fill(null);
const furniture = [];
const idx = (c, r) => r * COLS + c;
const inMap = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS;

function paint(c, r, tile, color, area) {
  if (!inMap(c, r)) return;
  tiles[idx(c, r)] = tile;
  tileColors[idx(c, r)] = color;
  if (area !== undefined) areaTiles[idx(c, r)] = area;
}

// ── Catalog (footprint + background rows + category) from the manifests ──
const catalog = new Map();
for (const dir of fs.readdirSync(FURN)) {
  const m = JSON.parse(fs.readFileSync(path.join(FURN, dir, 'manifest.json'), 'utf8'));
  const walk = (n, inh) => {
    if (n.type === 'asset')
      catalog.set(n.id, { w: n.footprintW, h: n.footprintH, bg: inh.bg, category: inh.category, surface: inh.surface });
    else for (const k of n.members) walk(k, inh);
  };
  walk(m, { bg: m.backgroundTiles ?? 0, category: m.category, surface: !!m.canPlaceOnSurfaces });
  if (m.type === 'asset') catalog.set(m.id, { w: m.footprintW, h: m.footprintH, bg: m.backgroundTiles ?? 0, category: m.category, surface: !!m.canPlaceOnSurfaces });
}

let uidN = 0;
function place(type, col, row) {
  if (!catalog.has(type)) throw new Error(`unknown furniture ${type}`);
  furniture.push({ uid: `city-${++uidN}`, type, col, row });
}

// ── Islands ──────────────────────────────────────────────────────────────
const HW = 22;
const HH = 16;
/** Columns covered by a flat-top hex row (dr = -8..7). */
function hexRowSpan(cx, dr) {
  const t = Math.abs(dr + 0.5) / (HH / 2);
  const inset = Math.round(t * (HW / 4));
  return [cx - HW / 2 + inset, cx + HW / 2 - 1 - inset];
}
function island(cx, cy, area) {
  const cells = [];
  for (let dr = -HH / 2; dr < HH / 2; dr++) {
    const [a, b] = hexRowSpan(cx, dr);
    for (let c = a; c <= b; c++) cells.push([c, cy + dr]);
  }
  const set = new Set(cells.map(([c, r]) => `${c},${r}`));
  for (const [c, r] of cells) {
    const rim = !set.has(`${c - 1},${r}`) || !set.has(`${c + 1},${r}`) || !set.has(`${c},${r - 1}`) || !set.has(`${c},${r + 1}`);
    if (rim) paint(c, r, T.SIDEWALK, C.RIM, area);
    else paint(c, r, T.GRASS, C.GRASS, area);
  }
}
function plaza(c0, r0, w, h) {
  for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) if (tiles[idx(c, r)] !== VOID) paint(c, r, T.PLAZA, C.PLAZA);
}
function walkway(c0, r0, w, h, tile, color, area) {
  for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) paint(c, r, tile, color, area);
}

const HEX = {
  lofts: { cx: 13, cy: 21, label: 'Waterfront Lofts' },
  plaza: { cx: 52, cy: 21, label: 'Midtown Plaza' },
  cafe: { cx: 77, cy: 21, label: 'Corner Cafe' },
  gym: { cx: 13, cy: 42, label: 'Riverside Gym' },
  arcade: { cx: 62, cy: 42, label: 'Neon Arcade' },
};
for (const h of Object.values(HEX)) island(h.cx, h.cy, h.label);

// Connections
walkway(24, 21, 17, 2, T.BOARDWALK, C.BOARDWALK, 'Hudson Bridge'); // NJ lofts ⇄ NYC plaza (bike lane)
walkway(63, 21, 3, 2, T.SIDEWALK, C.SIDEWALK, null); // plaza ⇄ café
walkway(12, 29, 2, 5, T.SIDEWALK, C.SIDEWALK, null); // lofts ⇄ gym
walkway(56, 29, 2, 5, T.SIDEWALK, C.SIDEWALK, null); // plaza ⇄ arcade
walkway(24, 43, 27, 2, T.WATER, C.WATER, 'Hudson Ferry'); // gym ⇄ arcade (ferry lane)
walkway(22, 43, 2, 2, T.BOARDWALK, C.BOARDWALK, 'Riverside Gym'); // NJ dock
walkway(51, 43, 2, 2, T.BOARDWALK, C.BOARDWALK, 'Neon Arcade'); // NYC dock

// ── Work hexes: buildings at the back, three umbrella tables (6 seats) ───
function workCluster(c, r) {
  // stool | umbrella table (2×3, desk row = r+2) | stool ; one laptop per seat
  place('CITY_UMBRELLA_TABLE', c + 1, r);
  place('CITY_STOOL', c, r + 2);
  place('CITY_STOOL', c + 3, r + 2);
  place('CITY_LAPTOP_OFF', c + 1, r + 2);
  place('CITY_LAPTOP_OFF', c + 2, r + 2);
}
{
  const { cx, cy } = HEX.lofts;
  place('CITY_LOFT', cx - 6, cy - 8);
  place('CITY_BROWNSTONE', cx - 1, cy - 7);
  place('CITY_TREE_CHERRY', cx + 3, cy - 6);
  plaza(cx - 9, cy - 1, 18, 5);
  for (const dc of [-9, -3, 3]) workCluster(cx + dc, cy - 1);
  place('CITY_LAMP', cx - 7, cy + 2);
  place('CITY_PLANTER', cx + 6, cy + 4);
  place('CITY_BENCH', cx - 4, cy + 5);
  place('CITY_HYDRANT', cx + 5, cy + 5);
  place('CITY_TREE_GREEN', cx - 7, cy + 3);
}
{
  const { cx, cy } = HEX.plaza;
  place('CITY_OFFICE_TOWER', cx - 6, cy - 8);
  place('CITY_BROWNSTONE', cx - 1, cy - 6);
  place('CITY_TREE_GREEN', cx + 3, cy - 6);
  plaza(cx - 9, cy - 1, 18, 5);
  for (const dc of [-9, -3, 3]) workCluster(cx + dc, cy - 1);
  place('CITY_LAMP', cx + 9, cy - 2);
  place('CITY_PLANTER', cx - 8, cy + 4);
  place('CITY_BENCH', cx - 1, cy + 5);
  place('CITY_TREE_CHERRY', cx + 4, cy + 3);
}

// ── Leisure hexes ────────────────────────────────────────────────────────
{
  const { cx, cy } = HEX.cafe;
  place('CITY_CAFE', cx - 6, cy - 7);
  place('CITY_BROWNSTONE', cx - 1, cy - 7);
  place('CITY_TREE_CHERRY', cx + 3, cy - 6);
  plaza(cx - 8, cy - 1, 12, 4);
  for (const [dc, dr] of [[-7, 0], [-4, 0], [-7, 2], [-4, 2]]) place('CITY_CAFE_TABLE', cx + dc, cy + dr);
  place('CITY_ESPRESSO_CART_1', cx + 1, cy - 1);
  place('CITY_BENCH', cx + 4, cy + 4);
  place('CITY_LAMP', cx - 9, cy + 1);
  place('CITY_PLANTER', cx + 7, cy + 1);
  place('CITY_TREE_GREEN', cx - 3, cy + 4);
}
{
  const { cx, cy } = HEX.gym;
  place('CITY_GYM', cx - 6, cy - 7);
  place('CITY_TREE_GREEN', cx + 1, cy - 6);
  place('CITY_TREE_GREEN', cx + 4, cy - 5);
  plaza(cx - 7, cy - 1, 14, 4);
  place('CITY_WEIGHT_RACK', cx - 7, cy - 1);
  place('CITY_WEIGHT_RACK', cx - 4, cy - 1);
  place('CITY_TREADMILL', cx + 1, cy - 1);
  place('CITY_TREADMILL', cx + 4, cy - 1);
  place('CITY_BENCH', cx - 3, cy + 4);
  place('CITY_HYDRANT', cx + 6, cy + 3);
  place('CITY_LAMP', cx - 8, cy + 2);
}
{
  const { cx, cy } = HEX.arcade;
  place('CITY_ARCADE', cx - 6, cy - 7);
  place('CITY_BROWNSTONE', cx - 1, cy - 7);
  place('CITY_TREE_CHERRY', cx + 3, cy - 6);
  plaza(cx - 7, cy - 1, 14, 4);
  for (const dc of [-6, -4, -2, 0]) place('CITY_ARCADE_CABINET_1', cx + dc, cy - 1);
  place('CITY_BENCH', cx + 3, cy);
  place('CITY_LAMP', cx + 8, cy + 1);
  place('CITY_PLANTER', cx - 8, cy + 3);
  place('CITY_TREE_GREEN', cx + 4, cy + 4);
}

// ── Self-checks ──────────────────────────────────────────────────────────
const fail = (msg) => {
  console.error('LAYOUT CHECK FAILED:', msg);
  process.exit(1);
};
const solid = new Map(); // "c,r" → uid of blocking item
const deskTiles = new Set();
for (const f of furniture) {
  const e = catalog.get(f.type);
  for (let dr = 0; dr < e.h; dr++)
    for (let dc = 0; dc < e.w; dc++) {
      const key = `${f.col + dc},${f.row + dr}`;
      if (e.category === 'desks') deskTiles.add(key);
      if (dr < e.bg) continue; // background rows don't block
      if (e.surface && deskTiles.has(key)) continue; // laptop on a table
      if (!inMap(f.col + dc, f.row + dr) || tiles[idx(f.col + dc, f.row + dr)] === VOID)
        fail(`${f.type} at ${f.col},${f.row} has a blocking tile on water/off-map (${key})`);
      if (solid.has(key)) fail(`${f.type} at ${f.col},${f.row} overlaps ${solid.get(key)} at ${key}`);
      solid.set(key, `${f.type}@${f.col},${f.row}`);
    }
}
const seats = furniture.filter((f) => catalog.get(f.type).category === 'chairs');
if (seats.length !== 12) fail(`expected 12 seats, found ${seats.length}`);
// Reachability: BFS over walkable tiles; seat tiles are enterable (their owner sits there).
const seatKeys = new Set(seats.map((f) => `${f.col},${f.row}`));
const walkable = (c, r) => inMap(c, r) && tiles[idx(c, r)] !== VOID && (!solid.has(`${c},${r}`) || seatKeys.has(`${c},${r}`));
const start = [HEX.lofts.cx, HEX.lofts.cy + 5];
if (!walkable(...start)) fail(`BFS start ${start} is not walkable`);
const seen = new Set([start.join(',')]);
const q = [start];
while (q.length) {
  const [c, r] = q.pop();
  if (seatKeys.has(`${c},${r}`)) continue; // can enter a seat, not walk through it
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const k = `${c + dc},${r + dr}`;
    if (!seen.has(k) && walkable(c + dc, r + dr)) {
      seen.add(k);
      q.push([c + dc, r + dr]);
    }
  }
}
for (const k of seatKeys) if (!seen.has(k)) fail(`seat ${k} is unreachable`);
const areas = [
  { label: 'Waterfront Lofts', color: '#4f7ac8', kind: 'work' },
  { label: 'Midtown Plaza', color: '#e2533d', kind: 'work' },
  { label: 'Corner Cafe', color: '#2f8f6f', kind: 'leisure' },
  { label: 'Riverside Gym', color: '#e0a23a', kind: 'leisure' },
  { label: 'Neon Arcade', color: '#ff3d9a', kind: 'leisure' },
  { label: 'Hudson Bridge', color: '#8b6a46', kind: 'bikeLane' },
  { label: 'Hudson Ferry', color: '#3c6fd1', kind: 'ferry' },
];
for (const a of areas) {
  let reachable = 0;
  areaTiles.forEach((l, i) => l === a.label && seen.has(`${i % COLS},${Math.floor(i / COLS)}`) && reachable++);
  if (reachable === 0) fail(`area ${a.label} has no reachable tile`);
}
const unreached = [...Array(COLS * ROWS).keys()].filter((i) => {
  const c = i % COLS, r = Math.floor(i / COLS);
  return walkable(c, r) && !seatKeys.has(`${c},${r}`) && !seen.has(`${c},${r}`);
});
if (unreached.length > 0) fail(`${unreached.length} walkable tiles are cut off, e.g. ${unreached.slice(0, 5).map((i) => `${i % COLS},${Math.floor(i / COLS)}`).join(' ')}`);

const layout = {
  version: 1,
  cols: COLS,
  rows: ROWS,
  // Bundled default revision: a saved layout below it is backed up and replaced on load.
  layoutRevision: 2,
  tiles,
  tileColors,
  furniture,
  pets: [],
  backdrop: { id: 'hudson', horizonRow: HORIZON_ROW },
  areas,
  areaTiles,
};
const out = path.join(__dirname, '../../webview-ui/public/assets/default-layout-2.json');
fs.writeFileSync(out, JSON.stringify(layout));
console.log(`wrote ${path.relative(process.cwd(), out)} ${COLS}x${ROWS}, ${furniture.length} items, ${seats.length} seats, ${seen.size} reachable tiles — all checks passed`);
