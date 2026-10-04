/**
 * Placeholder travel overlays drawn with characters on bike-lane / ferry tiles.
 * Drawn on top of the character's lower body, anchored bottom-centre like the
 * character sprite. Replaced by final art in Phase 2.
 */
import type { SpriteData } from '../types.js';

const _ = '';
const K = '#0d0a18'; // outline
const T = '#4b4b55'; // tyre
const R = '#e2533d'; // frame
const W = '#f3efe3'; // hull
const D = '#c0392b'; // hull stripe
const A = '#a9c4ee'; // wake

/** 16×10 bike, side view. */
export const BIKE_SPRITE: SpriteData = [
  [_, _, _, _, _, _, _, _, _, _, _, K, K, K, _, _],
  [_, _, _, _, _, R, R, R, R, R, R, R, _, _, _, _],
  [_, _, _, _, R, _, _, _, _, _, R, _, _, _, _, _],
  [_, _, K, K, R, K, _, _, _, K, R, K, K, _, _, _],
  [_, K, T, T, R, T, K, _, K, T, R, T, T, K, _, _],
  [K, T, _, _, R, R, R, R, R, R, R, _, _, T, K, _],
  [K, T, _, _, _, _, T, K, K, T, _, _, _, T, K, _],
  [_, K, T, T, T, T, K, _, _, K, T, T, T, K, _, _],
  [_, _, K, K, K, K, _, _, _, _, K, K, K, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
];

/** 20×8 rowboat hull with wake. */
export const BOAT_SPRITE: SpriteData = [
  [_, K, K, K, K, K, K, K, K, K, K, K, K, K, K, K, K, K, _, _],
  [_, K, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, K, K, _],
  [_, K, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, K, _],
  [_, _, K, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, K, _],
  [_, _, _, K, D, D, D, D, D, D, D, D, D, D, D, D, D, K, _, _],
  [_, _, _, _, K, K, K, K, K, K, K, K, K, K, K, K, K, _, _, _],
  [A, A, _, A, A, _, _, _, _, _, _, _, _, _, _, _, A, A, _, A],
  [_, A, A, _, _, _, _, _, _, _, _, _, _, _, _, _, _, A, A, _],
];
