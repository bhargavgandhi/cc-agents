import assert from 'node:assert/strict';

import { test } from 'vitest';

import { FURNITURE_ANIM_INTERVAL_SEC } from '../src/constants.js';
import { OfficeState } from '../src/office/engine/officeState.js';
import { buildDynamicCatalog } from '../src/office/layout/furnitureCatalog.js';
import type { OfficeLayout, SpriteData } from '../src/office/types.js';
import { TileType } from '../src/office/types.js';

/** 16×16 sprite filled with one marker value so frames are distinguishable. */
const frame = (marker: string): SpriteData =>
  Array.from({ length: 16 }, () => Array(16).fill(marker));
const F1 = frame('frame-1');
const F2 = frame('frame-2');

test('decor with animation frames cycles on its own, without an agent', () => {
  const entry = (id: string, f: number) => ({
    id,
    label: 'Cabinet',
    category: 'decor',
    width: 16,
    height: 16,
    footprintW: 1,
    footprintH: 1,
    isDesk: false,
    groupId: 'CAB',
    animationGroup: 'CAB__',
    frame: f,
  });
  assert.ok(
    buildDynamicCatalog({
      catalog: [entry('CAB_1', 0), entry('CAB_2', 1)],
      sprites: { CAB_1: F1, CAB_2: F2 },
    }),
  );
  const layout: OfficeLayout = {
    version: 1,
    cols: 3,
    rows: 3,
    tiles: new Array(9).fill(TileType.FLOOR_1),
    furniture: [{ uid: 'c1', type: 'CAB_1', col: 1, row: 1 }],
  };
  const os = new OfficeState(layout);
  const sprites = new Set<SpriteData>();
  for (let i = 0; i < 4; i++) {
    os.update(FURNITURE_ANIM_INTERVAL_SEC + 0.001);
    sprites.add(os.furniture[0].sprite);
  }
  assert.ok(sprites.has(F1) && sprites.has(F2), 'both frames shown over time');
});
