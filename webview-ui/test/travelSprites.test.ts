import assert from 'node:assert/strict';

import { test } from 'vitest';

import { getTravelSprite } from '../src/office/sprites/travelSprites.js';
import { Direction } from '../src/office/types.js';

test('side view for RIGHT, mirrored side view for LEFT', () => {
  const right = getTravelSprite('bike', Direction.RIGHT);
  const left = getTravelSprite('bike', Direction.LEFT);
  assert.equal(right.mirrored, false);
  assert.equal(left.mirrored, true);
  assert.equal(left.sprite, right.sprite);
});

test('front and back views differ from the side view and are never mirrored', () => {
  for (const mode of ['bike', 'boat'] as const) {
    const side = getTravelSprite(mode, Direction.RIGHT).sprite;
    const down = getTravelSprite(mode, Direction.DOWN);
    const up = getTravelSprite(mode, Direction.UP);
    assert.notEqual(down.sprite, side);
    assert.notEqual(up.sprite, side);
    assert.notEqual(down.sprite, up.sprite);
    assert.equal(down.mirrored || up.mirrored, false);
  }
});

test('every row of every view has the same width', () => {
  for (const mode of ['bike', 'boat'] as const)
    for (const dir of [Direction.DOWN, Direction.LEFT, Direction.RIGHT, Direction.UP]) {
      const { sprite } = getTravelSprite(mode, dir);
      const widths = new Set(sprite.map((r) => r.length));
      assert.equal(widths.size, 1, `${mode} dir ${dir} has ragged rows`);
    }
});
