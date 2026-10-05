import assert from 'node:assert/strict';

import { afterEach, test } from 'vitest';

import { advanceMatrixEffect, startMatrixEffect } from '../src/office/engine/matrixEffectState.js';
import type { Character } from '../src/office/types.js';
import { prefersReducedMotion } from '../src/reducedMotion.js';

const g = globalThis as { matchMedia?: (q: string) => { matches: boolean } };
const stubMatchMedia = (matches: boolean) => {
  g.matchMedia = (q: string) => ({ matches: matches && q.includes('reduce') });
};
afterEach(() => {
  delete g.matchMedia;
});

const fresh = () =>
  ({ matrixEffect: null, matrixEffectTimer: 0, matrixEffectSeeds: [] }) as unknown as Character;

test('no matchMedia (Node) means no reduced motion', () => {
  assert.equal(prefersReducedMotion(), false);
});

test('a spawn effect runs for its duration by default', () => {
  stubMatchMedia(false);
  const ch = fresh();
  startMatrixEffect(ch, 'spawn');
  assert.equal(advanceMatrixEffect(ch, 0.016), 'running');
});

test('with reduced motion the spawn and despawn effects finish on the first tick', () => {
  stubMatchMedia(true);
  const spawn = fresh();
  startMatrixEffect(spawn, 'spawn');
  assert.equal(advanceMatrixEffect(spawn, 0.016), 'spawned');
  const despawn = fresh();
  startMatrixEffect(despawn, 'despawn');
  assert.equal(advanceMatrixEffect(despawn, 0.016), 'despawned');
});
