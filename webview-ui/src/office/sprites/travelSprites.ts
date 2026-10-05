/**
 * Travel overlays drawn with characters on bike-lane / ferry tiles, one view
 * per facing: side (RIGHT; LEFT is the side view mirrored at render time),
 * front (DOWN) and back (UP). Anchored bottom-centre like the character sprite
 * and drawn over the lower body; riders use the seated pose
 * (`getCharacterSprite`), so the hull hides their legs.
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
  B: '#7a5236', // gunwale trim
  b: '#5a3b26', // gunwale shade
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

// Boats are wide and deep enough to seat a rider: the gunwale sits at the
// character's waist, so only the torso and head show above the hull.
const BOAT_SIDE = fromRows(
  [
    '.KBBBBBBBBBBBBBBBBBBBBBBBBBBBBBK',
    '.KbbbbbbbbbbbbbbbbbbbbbbbbbbbbbK',
    '.KWWWWWWSWWWWWWSWWWWWWSWWWWWWWK.',
    '.KWWWWWWWWWWWWWWWWWWWWWWWWWWWWK.',
    '.KDDDDDDDDDDDDDDDDDDDDDDDDDDDDK.',
    '.KWWWWWWWWWWWWWWWWWWWWWWWWWWK...',
    '.KWWWWWWWWWWWWWWWWWWWWWWWWK.....',
    '..KwwwwwwwwwwwwwwwwwwwwwK.......',
    '...KwwwwwwwwwwwwwwwwwwK.........',
    '....KwwwwwwwwwwwwwwwK...........',
    '.....KKKKKKKKKKKKKK.............',
    'AA.AA......................AA.A.',
    '.AA.......................A..A.A',
  ],
  PAL,
);

const BOAT_FRONT = fromRows(
  [
    '.KBBBBBBBBBBBBBBBBBBBBK.',
    '.KbbbbbbbbbbbbbbbbbbbbK.',
    '.KWWWWWWWWWWWWWWWWWWWWK.',
    '.KWWWWWWWWWKKWWWWWWWWWK.',
    '.KDDDDDDDDDKKDDDDDDDDDK.',
    '.KWWWWWWWWWKKWWWWWWWWWK.',
    '..KWWWWWWWWKKWWWWWWWWK..',
    '...KwwwwwwwKKwwwwwwwK...',
    '....KwwwwwwKKwwwwwwK....',
    '.....KwwwwwKKwwwwwK.....',
    '......KKKKKKKKKKKK......',
    '..AA..A..........A..AA..',
    'AA..AA............AA..AA',
  ],
  PAL,
);

const BOAT_BACK = fromRows(
  [
    '.KBBBBBBBBBBBBBBBBBBBBK.',
    '.KbbbbbbbbbbbbbbbbbbbbK.',
    '.KWWWWWWWWWWWWWWWWWWWWK.',
    '.KWWWWWWWWWWWWWWWWWWWWK.',
    '.KDDDDDDDDDDDDDDDDDDDDK.',
    '.KWWWWWWWWKKKKWWWWWWWWK.',
    '..KWWWWWWWKTTKWWWWWWWK..',
    '...KwwwwwwKTTKwwwwwwK...',
    '....KwwwwwKTTKwwwwwK....',
    '.....KwwwwKSSKwwwwK.....',
    '......KKKKKKKKKKKK......',
    '...AA...AAAAAAAA...AA...',
    '.AA...AA........AA...AA.',
  ],
  PAL,
);

/**
 * Sprite pixels the overlay's bottom edge sits below the character's feet:
 * the bike's wheels touch the ground; the boat rides lower so its gunwale
 * meets the rider's shoulders.
 */
const DROP = { bike: 2, boat: 5 } as const;

/** Overlay sprite for a travel mode + facing, whether to mirror it, and its anchor drop. */
export function getTravelSprite(
  mode: 'bike' | 'boat',
  dir: Direction,
): { sprite: SpriteData; mirrored: boolean; drop: number } {
  const side = mode === 'bike' ? BIKE_SIDE : BOAT_SIDE;
  const drop = DROP[mode];
  if (dir === Direction.DOWN)
    return { sprite: mode === 'bike' ? BIKE_FRONT : BOAT_FRONT, mirrored: false, drop };
  if (dir === Direction.UP)
    return { sprite: mode === 'bike' ? BIKE_BACK : BOAT_BACK, mirrored: false, drop };
  return { sprite: side, mirrored: dir === Direction.LEFT, drop };
}
