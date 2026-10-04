/**
 * Pure rules for the city theme: Area kinds, idle wandering, travel modes and
 * island edges. DOM-free and side-effect-free so the Node test runner covers it.
 */
import { BIKE_SPEED_MULT, BOAT_SPEED_MULT } from '../../constants.js';
import type { AreaKind, OfficeLayout, TileType as TileTypeVal, TravelMode } from '../types.js';
import { TileType } from '../types.js';

type Tile = { col: number; row: number };

/** Per-tile Area kind (row-major, `cols` wide). null = no Area, or an Area without a kind. */
export function buildAreaKindGrid(layout: OfficeLayout): Array<AreaKind | null> {
  const size = layout.cols * layout.rows;
  const grid: Array<AreaKind | null> = new Array(size).fill(null);
  const tiles = layout.areaTiles;
  if (!tiles || !layout.areas) return grid;
  const kindByLabel = new Map<string, AreaKind>();
  for (const a of layout.areas) if (a.kind) kindByLabel.set(a.label, a.kind);
  for (let i = 0; i < size; i++) {
    const label = tiles[i];
    if (label) grid[i] = kindByLabel.get(label) ?? null;
  }
  return grid;
}

/** Walkable tiles that sit inside a `leisure` Area. */
export function leisureTilesOf(
  walkable: Tile[],
  kinds: Array<AreaKind | null>,
  cols: number,
): Tile[] {
  return walkable.filter((t) => kinds[t.row * cols + t.col] === 'leisure');
}

/** Next idle wander target: a leisure tile with probability `bias`, else any walkable tile. */
export function pickWanderTarget(
  walkable: Tile[],
  leisure: Tile[],
  bias: number,
  rng: () => number = Math.random,
): Tile | null {
  if (leisure.length > 0 && rng() < bias) {
    return leisure[Math.floor(rng() * leisure.length)];
  }
  if (walkable.length === 0) return null;
  return walkable[Math.floor(rng() * walkable.length)];
}

/** Travel mode on a tile: bike on bike-lane tiles, boat on ferry tiles, walk elsewhere. */
export function travelModeAt(
  col: number,
  row: number,
  kinds: Array<AreaKind | null>,
  cols: number,
): TravelMode {
  if (col < 0 || row < 0 || col >= cols) return 'walk';
  const kind = kinds[row * cols + col];
  if (kind === 'bikeLane') return 'bike';
  if (kind === 'ferry') return 'boat';
  return 'walk';
}

export function speedMultiplier(mode: TravelMode): number {
  if (mode === 'bike') return BIKE_SPEED_MULT;
  if (mode === 'boat') return BOAT_SPEED_MULT;
  return 1;
}

/** Ground tile whose south neighbour is water (VOID or ferry) or off the map. Draws an island side. */
export function isIslandEdgeTile(
  tileMap: TileTypeVal[][],
  kinds: Array<AreaKind | null>,
  col: number,
  row: number,
): boolean {
  const cols = tileMap[0]?.length ?? 0;
  const tile = tileMap[row]?.[col];
  if (tile === undefined || tile === TileType.VOID) return false;
  if (kinds[row * cols + col] === 'ferry') return false;
  const below = tileMap[row + 1]?.[col];
  if (below === undefined || below === TileType.VOID) return true;
  return kinds[(row + 1) * cols + col] === 'ferry';
}
