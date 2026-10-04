# Hudson Hex City — design

Status: draft for review · Fork-only (`bhargavgandhi/cc-agents`), never proposed upstream
Mockup: https://claude.ai/artifact/5qCYX7P2mQEKhaw3drheqL

## Goal

Replace the single office with a miniature city: hex-shaped islands floating on the Hudson, in front of the Jersey City and Manhattan skylines. Agents work at outdoor tables on _work_ hexes and walk to _leisure_ hexes (café, gym, arcade) when idle, so you can tell who is busy and who is waiting at a glance.

Everything stays 2D on the existing canvas renderer. A 3D renderer is out of scope (see Non-goals).

## Decisions already made

| Decision       | Choice                                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Setting        | NYC / NJ hex islands across the Hudson                                                                                     |
| Building style | **A — exterior**: roofs and façades are visible; agents work at outdoor stations                                           |
| Hex shape      | Stepped hex outline painted with square tiles; movement stays 4-directional on the square grid                             |
| Renderer       | Existing 2D canvas                                                                                                         |
| Art source     | Drawn as code-generated pixel art (committable; no third-party licence issue). Existing 6 character sheets are kept for v1 |
| Where it lives | Fork only, branch `feat/hudson-hex-city`                                                                                   |

## World structure

Five hexes in v1, each one an **Area**:

| Hex              | Side | Area kind | Contents                                                          |
| ---------------- | ---- | --------- | ----------------------------------------------------------------- |
| Waterfront Lofts | NJ   | `work`    | Loft + brownstone; plaza with 3 umbrella tables (6 seats)         |
| Midtown Plaza    | NYC  | `work`    | Office tower + brownstone; plaza with 3 umbrella tables (6 seats) |
| Corner Café      | NYC  | `leisure` | Café front, terrace tables, benches                               |
| Riverside Gym    | NJ   | `leisure` | Gym front, outdoor weights                                        |
| Neon Arcade      | NYC  | `leisure` | Arcade front, 3 sidewalk cabinets                                 |

- One hex ≈ 18 × 12 tiles. The full map is ≈ 72 × 40 tiles.
- A boardwalk bridge connects NJ and NYC. Short sidewalk paths connect the hexes on each side.
- The water is empty (VOID) space, so the backdrop shows through.
- **Seats:** at least 12 work seats, which is no fewer than today's default office (10 seat-providing items). The bundled-default e2e tests need these seats.

## How agents use the city

- **Working.** Seats come from chairs, as they do today. A stool next to an umbrella table (a desk) is a seat. The laptop on the table is an electronics item, so the existing auto-state switches it on while its agent works.
- **Repo to hex.** Repos map to hexes through the existing Area mapping. `findFreeSeat` already prefers seats inside the folder's mapped Areas.
- **Idle.** When an idle agent picks its next wander target, it chooses a tile inside a `leisure` Area with probability `LEISURE_WANDER_BIAS` (0.7). Otherwise it picks any walkable tile, as it does today. If the layout has no leisure Areas, behaviour is unchanged.
- **Bubbles and labels** are unchanged. Area labels act as hex signs and render as street-sign pills.

## Engine changes

All of these are webview-only. The protocol (`core/asyncapi.yaml`) and the server stay unchanged.

1. **Area kind.** Add `kind?: 'work' | 'leisure'` to `AreaDefinition` (optional, backward compatible; layouts without it behave exactly as today). The Areas editor gets a work/leisure toggle.
2. **Leisure-biased wandering.** In `characters.ts`, the wander target comes from a pure function `pickWanderTarget(walkable, leisureTiles, rng)` instead of the inline random pick.
3. **Backdrop layer.** The renderer draws a backdrop image before the tiles, anchored to the world with a parallax factor (sky and skyline 0.3, water 1.0). The layout names it with an optional `backdrop?: string`. The image is a bundled webview asset loaded through Vite (`new URL(..., import.meta.url)`). That works under the merged CSP (`img-src` = `cspSource` / `'self'`) without a new message type. The engine only draws it to the canvas, never reads its pixels, so the cross-origin restriction on reading VS Code resource images doesn't matter.
4. **Island sides.** For every non-VOID tile whose south neighbour is VOID, draw a side face below it: a darker shade of the tile colour (`ISLAND_SIDE_PX` = 8), plus a faint shadow on the water. This is a pure render pass with no new tile type.
5. **Bigger grid.** Raise `MAX_COLS` / `MAX_ROWS` from 64 to 96. Check frame time on the 72 × 40 map (target: no frame over 16 ms on a mid-range laptop at default zoom).
6. **Theme tokens.** Retune `index.css` `:root` and the canvas colours in `constants.ts` to the Hudson dusk palette. Add `:focus-visible` outlines and `prefers-reduced-motion` handling, both missing today.

## Art (v1)

All art is drawn as code (`scripts/art/*.cjs` → PNG). It follows the existing manifest format, so it loads through the normal asset pipeline.

| Group                                               | Items                                                                              | Size / footprint              |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------- |
| Buildings (non-walkable, with background roof rows) | Office tower, café, gym, arcade, loft, brownstone ×2 colours                       | 64–80 px wide, 64–100 px tall |
| Work spots                                          | Umbrella table (desk), stool (chair, 4 orientations), laptop (electronics, on/off) | 32×16, 16×16, 16×16           |
| Leisure props                                       | Arcade cabinet (on/off, animated screen), weight rack, terrace table               | 16×32, 32×16, 16×16           |
| Street                                              | Street lamp, cherry tree, green tree, bench, planter                               | 16×32 or smaller              |
| Floors (grayscale patterns, colourised)             | Sidewalk paver, plaza tile, grass, boardwalk                                       | 16×16                         |
| Backdrop                                            | Dusk sky + NJ skyline + NYC skyline + water                                        | ~1600×640                     |

Characters keep the existing six sheets in v1. Restyling them is a follow-up.

**Constraint:** the skylines are generic towers. They must not include any real company's logo or signage.

## Layout and defaults

- The city ships as `default-layout-2.json` with `layoutRevision: 2`. On first run this replaces an existing `~/.pixel-agents/layout.json`, so the release note must tell users to **Export Layout** first.
- The current office is kept as `assets/layouts/classic-office.json`, which can be loaded with Import Layout.

## Testing

- **Webview unit tests (Node runner):**
  - `pickWanderTarget` (bias, no-leisure fallback, empty lists);
  - island-side detection;
  - `AreaDefinition.kind` round-trip through layout migration.
- **Server tests:** unchanged. The protocol doesn't change.
- **E2E:** the full suite must pass with the new default layout. Specs that seed their own layout are unaffected. Specs on the bundled default need ≥ 12 reachable seats.
- **Manual:**
  - F5 and standalone, in a CSP-clean console;
  - frame time on the full map;
  - the idle agent visibly walks to a leisure hex;
  - the laptop switches on at a working seat.

## Delivery order

1. **Engine:** Area kind, leisure wandering, backdrop layer, island sides, grid cap. Uses placeholder art.
2. **Art:** floors, work spots, props, buildings, backdrop. Each batch is previewed before commit.
3. **City layout and theme tokens:** `default-layout-2.json`, the classic-office export, UI palette, a11y fixes.
4. **Follow-ups (not v1):** restyled characters, day/night tint, ambient townspeople and cars, more hexes.

## Non-goals (v1)

- True hex movement or a hex grid model.
- A 3D renderer (React Three Fiber). It can be revisited as an alternative renderer on the same `OfficeState`.
- Background townspeople, traffic, and text chatter bubbles.
- New character art.
- Any upstream PR.

## Risks

- **E2E coupling to the default layout.** Mitigation: keep seat count ≥ the old default, and run the full suite before the layout swap merges.
- **Frame time on a 72 × 40 map.** Mitigation: the backdrop is cached per zoom, and the island-side pass is cached with the tile layer.
- **Layout reset on upgrade.** Mitigation: an Export Layout reminder, and the classic office shipped as an importable file.
- **Fork divergence.** Engine changes are small and additive. Art and layouts are new files. `webview-ui` merges from upstream should stay mostly conflict-free.
