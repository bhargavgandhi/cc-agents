/**
 * Travel overlays drawn with characters on bike-lane / ferry tiles, one view
 * per facing: side (RIGHT; LEFT is the side view mirrored at render time),
 * front (DOWN) and back (UP). Anchored bottom-centre like the character sprite
 * and drawn over the lower body.
 */
import type { SpriteData } from '../types.js';
import { Direction } from '../types.js';

/** Build SpriteData from row strings; each char maps through `palette` ('.' = transparent). */
function fromRows(rows: string[], palette: Record<string, string>): SpriteData {
  return rows.map((row) => [...row].map((ch) => (ch === '.' ? '' : (palette[ch] ?? ''))));
}

const PAL: Record<string, string> = {
  K: '#0d0a18', // outline
  T: '#3a3a44', // tyre
  S: '#8c96a3', // spokes / chrome
  R: '#e2533d', // frame
  r: '#b23a2a', // frame shade
  W: '#f3efe3', // hull
  w: '#cfc8b8', // hull shade
  D: '#2f6fbf', // hull stripe
  A: '#a9c4ee', // wake
  B: '#7a5236', // oar / bench
};

const BIKE_SIDE = fromRows(
  [
    '..........KK....',
    '....rRRRRRRK....',
    '...R.....R......',
    '..KKKR...KRKK...',
    '.KTSTRK.KTSRTK..',
    'KTS.SRRRRRS.STK.',
    'KTS.S.TKKTS.STK.',
    '.KTSTK...KTSTK..',
    '..KKK.....KKK...',
  ],
  PAL,
);

const BIKE_FRONT = fromRows(
  [
    '...KKKKKKKK...',
    '..KSSRRRRSSK..',
    '......RR......',
    '......KK......',
    '.....KTTK.....',
    '.....KTSK.....',
    '.....KTTK.....',
    '.....KTSK.....',
    '......KK......',
  ],
  PAL,
);

const BIKE_BACK = fromRows(
  [
    '......RR......',
    '.....KRRK.....',
    '......KK......',
    '.....KTTK.....',
    '.....KTSK.....',
    '.....KTTK.....',
    '.....KTSK.....',
    '......KK......',
  ],
  PAL,
);

const BOAT_SIDE = fromRows(
  [
    '.KKKKKKKKKKKKKKKKK..',
    '.KWWWWWWWWWWWWWWWKK.',
    '.KWWBBWWWWWWWWBBWWK.',
    '..KDDDDDDDDDDDDDDDK.',
    '...KwwwwwwwwwwwwwK..',
    '....KKKKKKKKKKKKK...',
    'AA.AA...........AA.A',
    '.AA..............AA.',
  ],
  PAL,
);

const BOAT_FRONT = fromRows(
  [
    '..KKKKKKKKKKKK..',
    '.KWWWWWWWWWWWWK.',
    '.KWBBWWWWWWBBWK.',
    '..KDDDDDDDDDDK..',
    '...KwwwwwwwwK...',
    '....KKKKKKKK....',
    '.AA..........AA.',
    'AA............AA',
  ],
  PAL,
);

const BOAT_BACK = fromRows(
  [
    '..KKKKKKKKKKKK..',
    '.KwWWWWWWWWWWwK.',
    '.KWWWWWWWWWWWWK.',
    '..KDDDDDDDDDDK..',
    '...KwwwwwwwwK...',
    '....KKKKKKKK....',
    '...AA......AA...',
    '..A..AAAAAA..A..',
  ],
  PAL,
);

/** Overlay sprite for a travel mode + facing, and whether to mirror it horizontally. */
export function getTravelSprite(
  mode: 'bike' | 'boat',
  dir: Direction,
): { sprite: SpriteData; mirrored: boolean } {
  const side = mode === 'bike' ? BIKE_SIDE : BOAT_SIDE;
  if (dir === Direction.DOWN)
    return { sprite: mode === 'bike' ? BIKE_FRONT : BOAT_FRONT, mirrored: false };
  if (dir === Direction.UP)
    return { sprite: mode === 'bike' ? BIKE_BACK : BOAT_BACK, mirrored: false };
  return { sprite: side, mirrored: dir === Direction.LEFT };
}
