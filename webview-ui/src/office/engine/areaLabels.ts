import type { AreaDefinition } from '../types.js';

/**
 * Where an Area's name is drawn, in tile units.
 *
 * - `centroid`: plain text at the mean tile centre (office layouts, areas with
 *   no `kind`), as before.
 * - `sign`: a street-sign pill hung below the area's lowest row, horizontally
 *   centred on the centroid. City hexes use it so the name never sits on the
 *   tables and props inside the hex.
 *
 * Lane areas (`bikeLane`, `ferry`) get no label at all.
 */
export interface AreaLabelAnchor {
  label: string;
  style: 'centroid' | 'sign';
  /** Horizontal centre, in tiles (tile centre = col + 0.5). */
  x: number;
  /** `centroid`: vertical centre in tiles. `sign`: the top edge (the row below the area). */
  y: number;
}

export function areaLabelAnchors(
  areaTiles: Array<string | null> | undefined,
  areas: AreaDefinition[] | undefined,
  cols: number,
  rows: number,
): AreaLabelAnchor[] {
  if (!areaTiles || areaTiles.length === 0 || !areas || areas.length === 0) return [];
  const acc = new Map<string, { sumX: number; sumY: number; count: number; maxRow: number }>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const label = areaTiles[r * cols + c];
      if (!label) continue;
      const a = acc.get(label);
      if (a) {
        a.sumX += c;
        a.sumY += r;
        a.count += 1;
        a.maxRow = Math.max(a.maxRow, r);
      } else {
        acc.set(label, { sumX: c, sumY: r, count: 1, maxRow: r });
      }
    }
  }
  const anchors: AreaLabelAnchor[] = [];
  for (const [label, a] of acc) {
    const kind = areas.find((d) => d.label === label)?.kind;
    if (kind === 'bikeLane' || kind === 'ferry') continue;
    const x = a.sumX / a.count + 0.5;
    anchors.push(
      kind
        ? { label, style: 'sign', x, y: a.maxRow + 1 }
        : { label, style: 'centroid', x, y: a.sumY / a.count + 0.5 },
    );
  }
  return anchors;
}
