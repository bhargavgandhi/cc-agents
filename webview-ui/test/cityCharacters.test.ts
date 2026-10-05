import assert from 'node:assert/strict';

import { test } from 'vitest';

import { AREA_DEFAULT_COLORS } from '../src/constants.js';
import type { CityNav } from '../src/office/engine/characters.js';
import {
  createCharacter,
  getCharacterSprite,
  updateCharacter,
} from '../src/office/engine/characters.js';
import { buildAreaKindGrid } from '../src/office/engine/cityRules.js';
import type { CharacterSprites } from '../src/office/sprites/spriteData.js';
import type { OfficeLayout, SpriteData, TileType as TileTypeVal } from '../src/office/types.js';
import { CharacterState, TileType } from '../src/office/types.js';

const AREA_COLOR = AREA_DEFAULT_COLORS[0];

const F = TileType.FLOOR_1;

/** 4×1 strip: tiles 1–2 are a bike lane. */
function strip(): { tileMap: TileTypeVal[][]; nav: CityNav } {
  const layout: OfficeLayout = {
    version: 1,
    cols: 4,
    rows: 1,
    tiles: [F, F, F, F],
    furniture: [],
    areas: [{ label: 'Bridge', color: AREA_COLOR, kind: 'bikeLane' }],
    areaTiles: [null, 'Bridge', 'Bridge', null],
  };
  return {
    tileMap: [[F, F, F, F]],
    nav: { kinds: buildAreaKindGrid(layout), cols: 4, leisureTiles: [] },
  };
}

function walker(col: number, path: Array<{ col: number; row: number }>) {
  const ch = createCharacter(1, 0, null, null);
  ch.tileCol = col;
  ch.tileRow = 0;
  ch.x = col * 16 + 8;
  ch.y = 8;
  ch.isActive = false;
  ch.state = CharacterState.WALK;
  ch.path = path;
  ch.moveProgress = 0;
  return ch;
}

test('a character on a bike-lane tile moves twice as far per tick and is marked as biking', () => {
  const { tileMap, nav } = strip();
  const onLane = walker(1, [{ col: 2, row: 0 }]);
  const offLane = walker(0, [{ col: 1, row: 0 }]);
  updateCharacter(onLane, 0.1, [], new Map(), tileMap, new Set(), nav);
  updateCharacter(offLane, 0.1, [], new Map(), tileMap, new Set(), nav);
  assert.ok(Math.abs(onLane.moveProgress - offLane.moveProgress * 2) < 1e-9);
  assert.equal(onLane.travelMode, 'bike');
  assert.equal(offLane.travelMode, undefined);
});

test('travelMode clears once the character stops walking', () => {
  const { tileMap, nav } = strip();
  const ch = walker(1, []);
  ch.travelMode = 'bike';
  updateCharacter(ch, 0.1, [], new Map(), tileMap, new Set(), nav);
  assert.equal(ch.state, CharacterState.IDLE);
  assert.equal(ch.travelMode, undefined);
});

test('without CityNav the FSM behaves exactly as before (no travelMode)', () => {
  const { tileMap } = strip();
  const ch = walker(1, [{ col: 2, row: 0 }]);
  updateCharacter(ch, 0.1, [], new Map(), tileMap, new Set());
  assert.equal(ch.travelMode, undefined);
});

test('an idle character heads for a leisure tile when the city nav offers one', () => {
  const { tileMap, nav } = strip();
  nav.leisureTiles = [{ col: 3, row: 0 }];
  const ch = walker(0, []);
  ch.state = CharacterState.IDLE;
  ch.wanderTimer = 0;
  ch.wanderCount = 0;
  ch.wanderLimit = 99;
  const walkable = [{ col: 1, row: 0 }];
  const orig = Math.random;
  Math.random = () => 0; // roll under the bias, first leisure tile
  try {
    updateCharacter(ch, 0.1, walkable, new Map(), tileMap, new Set(), nav);
  } finally {
    Math.random = orig;
  }
  assert.equal(ch.state, CharacterState.WALK);
  assert.deepEqual(ch.path[ch.path.length - 1], { col: 3, row: 0 });
});

test('riders sit still: a walker on a bike or boat uses the seated frame', () => {
  const tag = (name: string): SpriteData => [[name]];
  const four = (k: string) => [0, 1, 2, 3].map((i) => tag(`${k}${i}`));
  const byDir = <T>(make: () => T) => ({ 0: make(), 1: make(), 2: make(), 3: make() });
  const sprites = {
    walk: byDir(() => four('walk')),
    typing: byDir(() => [tag('seat0'), tag('seat1')]),
    reading: byDir(() => [tag('read0'), tag('read1')]),
  } as unknown as CharacterSprites;
  const ch = walker(1, []);
  ch.state = CharacterState.WALK;
  ch.frame = 2;
  assert.equal(getCharacterSprite(ch, sprites)[0][0], 'walk2');
  for (const mode of ['bike', 'boat'] as const) {
    ch.travelMode = mode;
    for (const frame of [0, 1, 2, 3]) {
      ch.frame = frame;
      assert.equal(getCharacterSprite(ch, sprites)[0][0], 'seat0');
    }
  }
});
