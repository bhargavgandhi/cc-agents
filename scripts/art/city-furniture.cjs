#!/usr/bin/env node
// City furniture for the Hudson Hex City theme. Every item is drawn in code
// (3/4 top-down: roof seen from above, then the facade) and written with its
// manifest into webview-ui/public/assets/furniture/CITY_*/.
//
// Category rules that matter here (see core/src/assets/manifestUtils.ts):
//   desks       → isDesk (surface items may overlap it, seats face it)
//   chairs      → every footprint tile becomes an agent SEAT
//   electronics → on/off state group switches on when its agent works
//   decor/misc  → scenery only (benches are decor on purpose: not seats)
const { Sprite, rng, writeFurniture, simpleManifest, animatedManifest } = require('./lib.cjs');

// ── Palette ──────────────────────────────────────────────────────────────
const OL = '#1b1626'; // outline
const SH = '#00000040'; // soft shadow
const GLASS = '#7fb6e0';
const GLASS_HI = '#c6e6fa';
const GLASS_LO = '#4d7fa8';
const WARM = '#ffd38a';
const WARM_HI = '#fff0c4';
const DOOR = '#3e2723';
const STEP = '#9a9a9a';
const LEAF = '#4f9a45';
const LEAF_HI = '#6fbf5a';
const LEAF_LO = '#356b31';
const BARK = '#6b4428';
const BLOSSOM = '#f0a7c6';
const BLOSSOM_HI = '#fbd0e1';
const BLOSSOM_LO = '#c97a9c';
const METAL = '#5b6470';
const METAL_HI = '#8c96a3';
const METAL_LO = '#3a4049';

const items = [];
function add(id, manifest, sprites) {
  writeFurniture(id, manifest, sprites);
  items.push(id);
}

// ── Building helpers ─────────────────────────────────────────────────────
/** Flat roof seen from above with a parapet lip, from y=0 to y=roofH. */
function flatRoof(s, x, w, roofH, roof, roofHi, roofLo, lip) {
  s.box(x, 0, w, roofH + 2, roof, OL);
  s.hline(x + 1, 1, w - 2, roofHi);
  s.rect(x + 1, roofH - 1, w - 2, 2, lip);
  s.hline(x + 1, roofH + 1, w - 2, roofLo);
  // tar-paper seams
  for (let y = 4; y < roofH - 2; y += 4) s.hline(x + 3, y, w - 6, roofLo);
}
/** Window with frame, warm/glass fill and a sill. */
function win(s, x, y, w, h, fill = WARM, hi = WARM_HI) {
  s.box(x, y, w, h, fill, OL);
  s.hline(x + 1, y + 1, w - 2, hi);
  s.hline(x - 1, y + h, w + 2, STEP);
}
function door(s, x, y, w, h, color = DOOR) {
  s.box(x, y, w, h, color, OL);
  s.rect(x + 2, y + 2, w - 4, Math.floor(h / 2) - 1, WARM);
  s.px(x + w - 3, y + Math.floor(h * 0.65), '#ffd23f');
}
function brickWall(s, x, y, w, h, base, mortar) {
  s.rect(x, y, w, h, base);
  for (let j = y + 2; j < y + h; j += 3) {
    s.hline(x, j, w, mortar);
    for (let i = x + ((j / 3) % 2 === 0 ? 1 : 4); i < x + w; i += 6) s.vline(i, j - 2, 2, mortar);
  }
}
function signBoard(s, cx, y, text, bg, fg, pad = 3) {
  const w = s.textWidth(text) + pad * 2;
  const x = Math.round(cx - w / 2);
  s.box(x, y, w, 9, bg, OL);
  s.text(x + pad, y + 2, text, fg);
}

// ── Buildings ────────────────────────────────────────────────────────────
// CITY_LOFT 80×96: converted brick warehouse, NYC rooftop water tower, fire escape.
{
  const s = new Sprite(80, 96);
  flatRoof(s, 0, 80, 30, '#6a5a52', '#857469', '#4e423c', '#9a5f45');
  // water tower on the roof
  s.vline(56, 12, 10, OL).vline(66, 12, 10, OL).vline(61, 12, 10, OL);
  s.box(53, 2, 17, 12, '#8b5a3c', OL).hline(54, 3, 15, '#a8714d').hline(54, 8, 15, '#6e4530').hline(54, 11, 15, '#6e4530');
  s.rect(55, 0, 13, 2, OL).rect(57, 0, 9, 1, '#5a3a28');
  // skylight
  s.box(10, 8, 18, 10, GLASS_LO, OL).dither(11, 9, 16, 8, GLASS);
  // facade
  s.rect(0, 32, 80, 64, OL);
  brickWall(s, 1, 33, 78, 62, '#a4553c', '#87432f');
  s.hline(1, 33, 78, '#c06a4c');
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) {
      const x = 6 + c * 18;
      const y = 38 + r * 16;
      if (r === 2 && (c === 1 || c === 2)) continue;
      win(s, x, y, 12, 11);
      s.vline(x + 6, y + 1, 9, OL).hline(x + 1, y + 5, 10, OL);
    }
  door(s, 31, 72, 18, 23, '#2f3b4a');
  s.rect(33, 74, 14, 9, GLASS).hline(33, 74, 14, GLASS_HI).vline(40, 74, 9, OL);
  s.rect(29, 94, 22, 2, STEP);
  // fire escape (left)
  for (let y = 46; y < 90; y += 16) {
    s.hline(1, y, 14, OL).hline(1, y + 1, 14, METAL);
    for (let i = 2; i < 15; i += 3) s.vline(i, y - 4, 4, METAL_LO);
  }
  s.vline(13, 46, 46, METAL_LO);
  add(
    'CITY_LOFT',
    simpleManifest('CITY_LOFT', 'Brick Loft', 'decor', s, 4),
    { CITY_LOFT: s },
  );
}

// CITY_OFFICE_TOWER 80×112: glass curtain wall with a setback crown.
{
  const s = new Sprite(80, 112);
  // crown (setback, seen from above)
  s.box(14, 0, 52, 14, '#4a5b70', OL).hline(15, 1, 50, '#6b7f96');
  s.box(30, 2, 20, 8, METAL, OL).rect(31, 3, 18, 2, METAL_HI);
  s.rect(38, 0, 4, 2, '#e2533d');
  flatRoof(s, 0, 80, 34, '#55677d', '#74879e', '#3d4b5c', '#8796a8');
  s.box(14, 4, 52, 14, '#4a5b70', OL).hline(15, 5, 50, '#6b7f96').rect(31, 8, 18, 6, METAL);
  // curtain wall
  s.rect(0, 36, 80, 76, OL);
  s.rect(1, 37, 78, 74, GLASS_LO);
  for (let y = 38; y < 96; y += 6)
    for (let x = 2; x < 78; x += 8) {
      s.rect(x, y, 7, 5, GLASS);
      s.hline(x, y, 7, GLASS_HI);
      if ((x * 7 + y * 3) % 11 < 3) s.rect(x + 1, y + 1, 5, 3, WARM);
    }
  // mullions
  for (let x = 1; x < 79; x += 16) s.vline(x, 37, 59, '#2e3e52');
  // lobby
  s.rect(1, 96, 78, 15, '#2e3e52');
  s.box(22, 97, 36, 15, GLASS, OL).vline(40, 98, 13, OL).hline(23, 98, 34, GLASS_HI);
  s.box(4, 99, 14, 7, '#1d2733', OL).text(6, 100, 'HQ', '#ffe2a0');
  s.rect(62, 100, 14, 9, '#3d4b5c').px(64, 103, '#7fb6e0').px(72, 103, '#7fb6e0');
  add('CITY_OFFICE_TOWER', simpleManifest('CITY_OFFICE_TOWER', 'Office Tower', 'decor', s, 5), {
    CITY_OFFICE_TOWER: s,
  });
}

// CITY_BROWNSTONE 48×80: stoop, cornice, tall windows.
{
  const s = new Sprite(48, 80);
  flatRoof(s, 0, 48, 24, '#5a4a40', '#73604f', '#43372f', '#3a2c25');
  s.box(30, 6, 8, 8, '#8d6e63', OL).rect(31, 4, 6, 2, '#5d4037'); // chimney
  s.rect(0, 26, 48, 54, OL);
  s.rect(1, 27, 46, 52, '#8a5a44');
  s.dither(1, 27, 46, 52, '#7c4f3b');
  s.rect(1, 27, 46, 3, '#c8b8a0').hline(1, 30, 46, '#9c8c76'); // cornice
  for (const y of [34, 50])
    for (const x of [5, 19, 33]) {
      win(s, x, y, 10, 12);
      s.hline(x - 1, y - 2, 12, '#c8b8a0');
    }
  door(s, 18, 64, 12, 15);
  s.rect(16, 62, 16, 2, '#c8b8a0');
  for (let i = 0; i < 3; i++) s.rect(14 - i * 2, 75 + i * 2 - 4, 20 + i * 4, 2, i % 2 ? '#8a8a8a' : STEP);
  s.vline(13, 66, 12, OL).vline(34, 66, 12, OL); // railings
  add('CITY_BROWNSTONE', simpleManifest('CITY_BROWNSTONE', 'Brownstone', 'decor', s, 3), {
    CITY_BROWNSTONE: s,
  });
}

// CITY_CAFE 64×80: brick front, green striped awning, CAFE sign, warm windows, planters.
{
  const s = new Sprite(64, 80);
  flatRoof(s, 0, 64, 24, '#6d4c41', '#8d6e63', '#4e342e', '#3e2723');
  s.box(46, 6, 10, 10, '#9e9e9e', OL).rect(47, 7, 8, 2, '#cfcfcf'); // vent
  s.rect(0, 26, 64, 54, OL);
  brickWall(s, 1, 27, 62, 52, '#b5563f', '#9c4533');
  signBoard(s, 32, 29, 'CAFE', '#1e3a34', '#f3e6cf', 6);
  s.px(14, 33, '#4fd1a5').px(49, 33, '#4fd1a5');
  // awning
  s.rect(2, 40, 60, 8, OL);
  for (let x = 3; x < 61; x++) s.vline(x, 41, 6, Math.floor((x - 3) / 6) % 2 ? '#f3e6cf' : '#2f8f6f');
  for (let x = 3; x < 61; x += 6) s.rect(x + 1, 47, 4, 1, '#2f8f6f');
  win(s, 5, 50, 16, 16);
  win(s, 43, 50, 16, 16);
  for (const x of [5, 43]) s.vline(x + 8, 51, 14, OL).rect(x + 2, 60, 4, 4, '#6d4c41').rect(x + 10, 61, 3, 3, '#4fd1a5');
  door(s, 26, 52, 12, 27, '#2f5a4a');
  s.rect(24, 78, 16, 2, STEP);
  // planters under the windows
  for (const x of [4, 42]) s.box(x, 68, 18, 6, '#6d4c41', OL).rect(x + 2, 66, 14, 3, LEAF).px(x + 4, 66, '#e2533d').px(x + 11, 66, '#ffd23f');
  add('CITY_CAFE', simpleManifest('CITY_CAFE', 'Corner Cafe', 'decor', s, 3), { CITY_CAFE: s });
}

// CITY_GYM 80×80: modern panel facade, red sign, big windows with equipment.
{
  const s = new Sprite(80, 80);
  flatRoof(s, 0, 80, 26, '#56606b', '#707b88', '#3e464f', '#2b3138');
  for (let x = 8; x < 72; x += 16) s.box(x, 6, 10, 6, '#3a6b8f', OL).hline(x + 1, 7, 8, '#6aa3cc'); // solar panels
  s.rect(0, 28, 80, 52, OL);
  s.rect(1, 29, 78, 50, '#d9dde2');
  for (let x = 1; x < 79; x += 13) s.vline(x, 29, 50, '#b9bfc7');
  signBoard(s, 40, 31, 'GYM', '#e2533d', '#ffffff', 10);
  for (let i = 0; i < 3; i++) {
    const x = 5 + i * 25;
    s.box(x, 44, 20, 20, GLASS, OL).hline(x + 1, 45, 18, GLASS_HI);
    // equipment silhouettes
    if (i === 0) s.hline(x + 3, 56, 14, METAL_LO).rect(x + 2, 53, 3, 7, METAL_LO).rect(x + 15, 53, 3, 7, METAL_LO);
    if (i === 2) s.rect(x + 4, 55, 12, 4, METAL_LO).vline(x + 14, 49, 6, METAL_LO);
  }
  door(s, 31, 64, 18, 15, '#3a4552');
  s.rect(33, 66, 14, 6, GLASS);
  s.rect(29, 78, 22, 2, STEP);
  add('CITY_GYM', simpleManifest('CITY_GYM', 'Riverside Gym', 'decor', s, 3), { CITY_GYM: s });
}

// CITY_ARCADE 80×80: dark front, neon ARCADE sign, marquee bulbs, game windows.
{
  const s = new Sprite(80, 80);
  flatRoof(s, 0, 80, 26, '#2a1d4a', '#3f2c6e', '#1a1230', '#120c22');
  s.box(26, 4, 28, 14, '#130c26', OL).rect(28, 6, 24, 2, '#ff3d9a').rect(28, 10, 24, 2, '#39e6ff'); // rooftop billboard
  s.rect(0, 28, 80, 52, OL);
  s.rect(1, 29, 78, 50, '#3a2d5e');
  s.dither(1, 29, 78, 50, '#33284f');
  // marquee with bulbs
  s.box(5, 30, 70, 14, '#130c26', OL);
  for (let x = 7; x < 74; x += 4) s.px(x, 31, '#ffd23f').px(x + 2, 42, '#ffd23f');
  const t = 'ARCADE';
  const tx = 40 - Math.floor(s.textWidth(t) / 2);
  s.text(tx + 1, 35, t, '#7a1a52');
  s.text(tx, 34, t, '#ff3d9a');
  s.hline(7, 45, 66, '#39e6ff').hline(7, 46, 66, '#ff3d9a');
  for (const [x, c] of [
    [5, '#ff3d9a'],
    [55, '#9cff57'],
  ]) {
    s.box(x, 49, 20, 20, '#130c26', OL);
    s.rect(x + 3, 52, 6, 5, c).rect(x + 11, 58, 6, 5, '#39e6ff');
  }
  door(s, 31, 52, 18, 27, '#1a1230');
  s.rect(33, 54, 14, 10, '#ff3d9a').rect(34, 55, 12, 8, '#4a1a3a');
  s.rect(29, 78, 22, 2, STEP);
  add('CITY_ARCADE', simpleManifest('CITY_ARCADE', 'Neon Arcade', 'decor', s, 3), { CITY_ARCADE: s });
}

// ── Work spots ───────────────────────────────────────────────────────────
// CITY_UMBRELLA_TABLE 32×48 desk: striped umbrella canopy (background rows) over a round table.
{
  const s = new Sprite(32, 48);
  // canopy (octagon-ish), red/white wedges
  const rows = [10, 18, 24, 28, 30, 30, 30, 28, 24];
  rows.forEach((w, i) => {
    const x0 = 16 - w / 2;
    for (let x = 0; x < w; x++) s.px(x0 + x, 4 + i, Math.floor((x0 + x) / 4) % 2 ? '#f3efe3' : '#e2533d');
  });
  s.outline(OL);
  s.hline(3, 13, 26, '#00000030');
  s.rect(15, 2, 2, 3, METAL_HI);
  // pole
  s.vline(15, 14, 22, METAL_LO).vline(16, 14, 22, METAL);
  // table top (round, seen from above) on the bottom footprint row
  s.box(3, 33, 26, 11, '#8b6a46', OL);
  s.hline(4, 34, 24, '#a8835a').hline(4, 42, 24, '#6b4f3a');
  s.rect(15, 44, 2, 3, METAL_LO);
  s.rect(6, 46, 20, 2, SH);
  add(
    'CITY_UMBRELLA_TABLE',
    simpleManifest('CITY_UMBRELLA_TABLE', 'Umbrella Table', 'desks', s, 2),
    { CITY_UMBRELLA_TABLE: s },
  );
}

// CITY_STOOL 16×16 chair (a seat): round cushioned top, chrome legs.
{
  const s = new Sprite(16, 16);
  s.rect(4, 13, 8, 2, SH);
  s.vline(5, 9, 5, METAL_LO).vline(10, 9, 5, METAL_LO).hline(5, 12, 6, METAL);
  s.box(3, 4, 10, 6, '#2f8f6f', OL).hline(4, 5, 8, '#4fd1a5');
  add('CITY_STOOL', simpleManifest('CITY_STOOL', 'Stool', 'chairs', s, 0), { CITY_STOOL: s });
}

// CITY_LAPTOP 16×16 electronics on a surface: off, and on with a 2-frame screen flicker.
{
  const base = () => {
    const s = new Sprite(16, 16);
    s.box(3, 9, 10, 4, '#b8bec7', OL).hline(4, 10, 8, '#d7dce2').hline(5, 11, 6, '#8c96a3');
    s.box(3, 3, 10, 7, '#2b3138', OL);
    return s;
  };
  const off = base().rect(4, 4, 8, 5, '#3a4049');
  const on1 = base().rect(4, 4, 8, 5, '#5fd0ff').hline(5, 5, 5, '#ffffff').hline(5, 7, 3, '#1aa7c4');
  const on2 = base().rect(4, 4, 8, 5, '#5fd0ff').hline(5, 5, 3, '#ffffff').hline(5, 7, 5, '#1aa7c4');
  const asset = (id, extra) => ({ type: 'asset', id, file: `${id}.png`, width: 16, height: 16, footprintW: 1, footprintH: 1, ...extra });
  const manifest = {
    id: 'CITY_LAPTOP',
    name: 'Laptop',
    category: 'electronics',
    type: 'group',
    groupType: 'state',
    canPlaceOnWalls: false,
    canPlaceOnSurfaces: true,
    backgroundTiles: 0,
    members: [
      {
        type: 'group',
        groupType: 'animation',
        state: 'on',
        members: [asset('CITY_LAPTOP_ON_1', { frame: 0 }), asset('CITY_LAPTOP_ON_2', { frame: 1 })],
      },
      asset('CITY_LAPTOP_OFF', { state: 'off' }),
    ],
  };
  add('CITY_LAPTOP', manifest, { CITY_LAPTOP_OFF: off, CITY_LAPTOP_ON_1: on1, CITY_LAPTOP_ON_2: on2 });
}

// ── Leisure props ────────────────────────────────────────────────────────
// CITY_ARCADE_CABINET 16×32 always-on animated cabinet.
{
  const screens = [
    ['#39e6ff', '#ff3d9a'],
    ['#9cff57', '#39e6ff'],
    ['#ff3d9a', '#ffd23f'],
  ];
  const frames = screens.map(([a, b], i) => {
    const s = new Sprite(16, 32);
    s.rect(3, 29, 11, 3, SH);
    s.box(2, 2, 12, 28, '#2a1d4a', OL);
    s.vline(3, 3, 26, '#3f2c6e');
    s.rect(3, 3, 10, 4, '#ff3d9a').hline(4, 4, 8, '#ffb3d9');
    s.box(3, 8, 10, 8, '#0b2a3a', OL);
    s.rect(4, 9, 8, 6, a).rect(5 + i, 11, 3, 2, b).px(10 - i, 10, '#ffffff');
    s.box(2, 17, 12, 4, '#4a3880', OL);
    s.px(5, 18, '#e2533d').px(8, 18, '#ffd23f').px(10, 18, '#39e6ff');
    s.box(6, 23, 4, 3, OL, OL).px(7, 24, '#ffd23f');
    return s;
  });
  const sprites = {};
  frames.forEach((f, i) => (sprites[`CITY_ARCADE_CABINET_${i + 1}`] = f));
  add('CITY_ARCADE_CABINET', animatedManifest('CITY_ARCADE_CABINET', 'Arcade Cabinet', 'decor', frames, 1), sprites);
}

// CITY_WEIGHT_RACK 32×32: dumbbell rack + barbell.
{
  const s = new Sprite(32, 32);
  s.rect(2, 28, 28, 3, SH);
  s.box(2, 12, 28, 16, '#3a4049', OL).rect(3, 13, 26, 2, METAL_HI);
  for (let i = 0; i < 4; i++) {
    const x = 5 + i * 6;
    s.rect(x, 16, 2, 4, '#1b1b1f').rect(x + 2, 17, 2, 2, METAL).rect(x + 4, 16, 1, 4, '#1b1b1f');
    s.rect(x, 22, 2, 4, '#e2533d').rect(x + 2, 23, 2, 2, METAL).rect(x + 4, 22, 1, 4, '#e2533d');
  }
  s.hline(1, 6, 30, METAL_HI).hline(1, 7, 30, METAL);
  s.box(0, 3, 4, 8, '#1b1b1f', OL).box(28, 3, 4, 8, '#1b1b1f', OL);
  add('CITY_WEIGHT_RACK', simpleManifest('CITY_WEIGHT_RACK', 'Weight Rack', 'decor', s, 1), { CITY_WEIGHT_RACK: s });
}

// CITY_TREADMILL 32×32.
{
  const s = new Sprite(32, 32);
  s.rect(3, 28, 26, 3, SH);
  s.box(3, 14, 26, 14, '#2b3138', OL).rect(5, 16, 22, 10, '#1b1b1f');
  for (let y = 17; y < 26; y += 2) s.hline(6, y, 20, '#2f343b');
  s.vline(6, 4, 11, METAL).vline(25, 4, 11, METAL);
  s.box(4, 2, 24, 6, '#3a4049', OL).rect(12, 3, 8, 3, '#5fd0ff').px(14, 4, '#ffffff');
  add('CITY_TREADMILL', simpleManifest('CITY_TREADMILL', 'Treadmill', 'decor', s, 1), { CITY_TREADMILL: s });
}

// CITY_ESPRESSO_CART 32×32 always-on animated (steam puffs).
{
  const frames = [0, 1].map((f) => {
    const s = new Sprite(32, 32);
    s.rect(4, 29, 24, 3, SH);
    s.box(3, 14, 26, 14, '#2f8f6f', OL).hline(4, 15, 24, '#4fd1a5');
    s.box(6, 6, 12, 9, METAL, OL).hline(7, 7, 10, METAL_HI).rect(9, 10, 6, 3, '#1b1b1f');
    s.box(20, 9, 6, 6, '#f3efe3', OL).rect(21, 12, 4, 2, '#6d4c41');
    s.box(4, 26, 5, 5, OL, OL).box(23, 26, 5, 5, OL, OL);
    s.text(8, 19, 'ESP', '#f3efe3');
    const puff = f === 0 ? [[10, 3], [12, 1]] : [[11, 2], [9, 0]];
    for (const [x, y] of puff) s.rect(x, y, 3, 2, '#e8e8f0b0');
    return s;
  });
  add('CITY_ESPRESSO_CART', animatedManifest('CITY_ESPRESSO_CART', 'Espresso Cart', 'decor', frames, 1), {
    CITY_ESPRESSO_CART_1: frames[0],
    CITY_ESPRESSO_CART_2: frames[1],
  });
}

// CITY_CAFE_TABLE 16×16 decor: bistro table with two cups.
{
  const s = new Sprite(16, 16);
  s.rect(4, 13, 8, 2, SH);
  s.vline(7, 9, 5, METAL_LO).hline(5, 13, 6, METAL);
  s.box(2, 4, 12, 6, '#f3efe3', OL).hline(3, 5, 10, '#ffffff');
  s.rect(4, 5, 2, 2, '#6d4c41').rect(10, 6, 2, 2, '#e2533d');
  add('CITY_CAFE_TABLE', simpleManifest('CITY_CAFE_TABLE', 'Bistro Table', 'decor', s, 0), { CITY_CAFE_TABLE: s });
}

// ── Street furniture ─────────────────────────────────────────────────────
// CITY_LAMP 16×48: cast-iron street lamp with a warm halo.
{
  const s = new Sprite(16, 48);
  s.rect(4, 4, 8, 8, '#ffd38a30').rect(3, 6, 10, 4, '#ffd38a30');
  s.rect(5, 45, 6, 3, SH);
  s.vline(7, 12, 33, '#2b2b33').vline(8, 12, 33, '#3a3a46');
  s.box(5, 42, 6, 4, '#2b2b33', OL);
  s.box(4, 5, 8, 8, '#ffd38a', OL).hline(5, 6, 6, WARM_HI);
  s.rect(4, 3, 8, 2, '#2b2b33').px(7, 2, '#2b2b33').px(8, 2, '#2b2b33');
  add('CITY_LAMP', simpleManifest('CITY_LAMP', 'Street Lamp', 'decor', s, 2), { CITY_LAMP: s });
}

// Trees 32×48: round canopy built from overlapping blobs, trunk on the bottom row.
function tree(lo, mid, hi, seed) {
  const s = new Sprite(32, 48);
  const r = rng(seed);
  s.rect(8, 44, 16, 3, SH);
  s.rect(14, 30, 4, 15, BARK).vline(14, 30, 15, '#4e3220');
  const blob = (cx, cy, rad, c) => {
    for (let y = -rad; y <= rad; y++)
      for (let x = -rad; x <= rad; x++) if (x * x + y * y <= rad * rad + rad) s.px(cx + x, cy + y, c);
  };
  blob(16, 20, 12, lo);
  blob(12, 16, 9, mid);
  blob(20, 16, 9, mid);
  blob(16, 12, 8, mid);
  blob(13, 11, 4, hi);
  for (let i = 0; i < 26; i++) s.px(6 + Math.floor(r() * 20), 6 + Math.floor(r() * 22), r() > 0.5 ? hi : lo);
  s.outline(OL);
  return s;
}
{
  const s = tree(BLOSSOM_LO, BLOSSOM, BLOSSOM_HI, 5);
  add('CITY_TREE_CHERRY', simpleManifest('CITY_TREE_CHERRY', 'Cherry Tree', 'decor', s, 2), { CITY_TREE_CHERRY: s });
}
{
  const s = tree(LEAF_LO, LEAF, LEAF_HI, 9);
  add('CITY_TREE_GREEN', simpleManifest('CITY_TREE_GREEN', 'Street Tree', 'decor', s, 2), { CITY_TREE_GREEN: s });
}

// CITY_BENCH 32×16 decor (deliberately NOT a chair: scenery, never an agent seat).
{
  const s = new Sprite(32, 16);
  s.rect(3, 13, 26, 3, SH);
  s.box(2, 2, 28, 5, '#7a5236', OL).hline(3, 3, 26, '#9b6a46');
  s.box(2, 7, 28, 4, '#6b4428', OL).hline(3, 8, 26, '#8b5a3c');
  s.rect(4, 11, 2, 3, '#2b2b33').rect(26, 11, 2, 3, '#2b2b33');
  add('CITY_BENCH', simpleManifest('CITY_BENCH', 'Park Bench', 'decor', s, 0), { CITY_BENCH: s });
}

// CITY_PLANTER 16×16: flower planter.
{
  const s = new Sprite(16, 16);
  s.rect(2, 14, 12, 2, SH);
  s.box(2, 8, 12, 6, '#8d6e63', OL).hline(3, 9, 10, '#a1887f');
  s.rect(3, 4, 10, 5, LEAF).dither(3, 4, 10, 5, LEAF_HI);
  for (const [x, y, c] of [
    [4, 4, '#e2533d'],
    [7, 3, '#ffd23f'],
    [10, 4, '#f0a7c6'],
    [6, 6, '#ffffff'],
    [11, 6, '#e2533d'],
  ])
    s.px(x, y, c);
  s.outline(OL);
  add('CITY_PLANTER', simpleManifest('CITY_PLANTER', 'Flower Planter', 'decor', s, 0), { CITY_PLANTER: s });
}

// CITY_HYDRANT 16×16: the NYC detail.
{
  const s = new Sprite(16, 16);
  s.rect(4, 14, 8, 2, SH);
  s.box(5, 4, 6, 10, '#d93a2f', OL).vline(6, 5, 8, '#f06a5a');
  s.box(4, 7, 8, 3, '#b52a22', OL);
  s.rect(6, 2, 4, 3, '#b52a22').px(7, 1, '#d93a2f').px(8, 1, '#d93a2f');
  s.box(4, 12, 8, 3, '#8a8a8a', OL);
  add('CITY_HYDRANT', simpleManifest('CITY_HYDRANT', 'Fire Hydrant', 'decor', s, 0), { CITY_HYDRANT: s });
}

console.log(`wrote ${items.length} city furniture items:\n  ${items.join('\n  ')}`);
