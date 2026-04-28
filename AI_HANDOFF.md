# AI Handoff: Phoenix Grove

Last updated: 2026-04-28

This document is the handoff for the next AI agent. It summarizes the current codebase, implemented features, architecture, important constants, operational commands, and known gaps so the next agent can start making changes without re-analyzing the project from scratch.

## Project Summary

Phoenix Grove is an offline Next.js + Phaser 3 habit-tracking game prototype. The app has two layers:

1. A React HUD rendered by Next.js App Router.
2. A Phaser WebGL canvas that renders either the Shrine scene or the Forest scene.

State is centralized in Zustand at `store/useGameStore.ts`. React and Phaser communicate through that store only.

The intended loop from `prompt.md` is:

- Maintain an abstinence streak.
- A Phoenix matures as the streak grows.
- The active streak generates coins at a compounding idle rate.
- Coins buy permanent forest objects.
- Relapse resets only the active Phoenix streak/rate; coins and forest objects remain.

This repo is Phase 1 only. There is no backend, auth, database, network sync, or persistence beyond the in-memory Zustand state for the current browser session.

## Tech Stack

- Next.js 14 App Router
- React 18
- TypeScript strict mode
- Phaser 3.80
- Zustand 4 with `subscribeWithSelector`
- Tailwind CSS 3
- Vercel deployment config

## Important Commands

- `npm run dev`: start local Next dev server.
- `npm run build`: production Next build. Verified passing locally.
- `npm run typecheck`: TypeScript check. Verified passing locally.
- `npm run lint`: currently opens Next's ESLint setup prompt and exits instead of linting, because there is no ESLint config file checked in.

## Deployment

`vercel.json` exists to prevent Vercel from using a stale dashboard Output Directory of `public`.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "outputDirectory": null
}
```

For this normal Next.js app, Vercel should auto-detect output rather than look for a generated `public` directory.

## File Map

- `prompt.md`: Original system/project prompt that describes the desired prototype.
- `package.json`: Scripts and dependencies.
- `next.config.mjs`: Empty Next config.
- `tailwind.config.ts`: Tailwind scans `app`, `components`, `game`, and `store`.
- `tsconfig.json`: Strict TypeScript, path alias `@/*`.
- `postcss.config.mjs`: Tailwind + autoprefixer.
- `vercel.json`: Vercel framework/output override.
- `app/layout.tsx`: Root metadata and layout.
- `app/page.tsx`: Client page that renders `PhaserGame` and `GameHud`.
- `app/globals.css`: Tailwind imports and global dark base styling.
- `components/ui/GameHud.tsx`: React overlay for scene tabs, readouts, build menu, relapse button, and economy ticker.
- `store/useGameStore.ts`: Zustand state, economy math, Phoenix stages, build catalog, purchases, relapse.
- `game/PhaserGame.tsx`: Client-only Phaser boot wrapper, dynamic Phaser imports, cleanup, scene switching bridge.
- `game/scenes/BootScene.ts`: Generates placeholder runtime textures and starts the initial scene.
- `game/scenes/PhoenixScene.ts`: Shrine scene with Phoenix visuals, embers, stage sync, bloom/vignette.
- `game/scenes/ForestScene.ts`: Forest grid scene with tilemap, object rendering, drag pan, zoom, and placement.

## Runtime Structure

`app/page.tsx` renders:

- `<PhaserGame />` as an absolute full-screen canvas host.
- `<GameHud />` as an absolute overlay with `pointer-events-none`; interactive controls opt back in with `pointer-events-auto`.

`PhaserGame` dynamically imports Phaser and scenes in a client `useEffect`. This avoids server-side Phaser access during Next rendering. It destroys the Phaser instance and clears the container on unmount to prevent duplicate canvases during React remounts.

Scene keys:

- Store view `"shrine"` maps to Phaser scene `"PhoenixScene"`.
- Store view `"forest"` maps to Phaser scene `"ForestScene"`.

`PhaserGame` subscribes to `activeScene` and starts/stops the corresponding Phaser scene.

## Zustand Store

Main file: `store/useGameStore.ts`

State shape:

- `activeScene: "shrine" | "forest"`
- `currentStreakStartTime: number`
- `lastEconomyUpdateAt: number`
- `highestStreak: number`
- `coinBalance: number`
- `forestGrid: ForestGridObject[]`
- `selectedBuildItem: ForestObjectType`

Actions:

- `setActiveScene(scene)`: switches HUD and Phaser scene.
- `setSelectedBuildItem(objectType)`: changes active build menu item.
- `tick(now?)`: accrues idle coins and updates `highestStreak`.
- `relapse(now?)`: resets current streak start and last economy update, updates best streak, preserves coins and forest.
- `purchaseObject(x, y, objectType, cost?)`: validates and places an object if affordable.
- `buyAndPlaceObject(...)`: alias for `purchaseObject(...)`.

Exported helpers:

- `getElapsedStreakMs(startTime, now?)`
- `getPhoenixStage(streakElapsedMs)`
- `calculateCoinRate(streakElapsedMs)`
- `calculateIdleCoinAccrual(startElapsedMs, endElapsedMs)`

## Economy Details

Constants:

- `BASE_COINS_PER_SECOND = 0.12`
- `HOURLY_COMPOUND_FACTOR = 1.012`
- `MAX_RATE_MULTIPLIER = 60`
- `HATCHLING_STREAK_MS = 1 day`
- `MAJESTIC_STREAK_MS = 7 days`

Instantaneous coin rate:

```ts
rate = BASE_COINS_PER_SECOND * min(
  HOURLY_COMPOUND_FACTOR ** elapsedHours,
  MAX_RATE_MULTIPLIER
)
```

`calculateIdleCoinAccrual` integrates the exponential rate over a time interval instead of multiplying only by the current rate. Once the cap is reached, accrual becomes linear at `BASE_COINS_PER_SECOND * MAX_RATE_MULTIPLIER`.

The HUD ticker calls `useGameStore.getState().tick()` roughly every 250 ms from `requestAnimationFrame`.

## Phoenix/Streak Features

Phoenix stages:

- `egg`: active streak under 1 day.
- `hatchling`: active streak from 1 day through under 7 days.
- `majestic`: active streak at least 7 days.

Relapse behavior:

- Resets `currentStreakStartTime` to now.
- Resets `lastEconomyUpdateAt` to now.
- Updates `highestStreak`.
- Does not remove coins.
- Does not remove forest objects.
- Does not change selected scene or selected build item.

`PhoenixScene` syncs its texture/scale to the current stage:

- Uses generated textures `phoenix-egg`, `phoenix-hatchling`, `phoenix-majestic`.
- Runs a breathing tween on the Phoenix container.
- Runs a pulsing aura tween.
- Rechecks stage once per second and also on `currentStreakStartTime` changes.

Shrine visual features:

- Dark red/brown background.
- Lower ground band and ellipse glow.
- Pillar silhouettes.
- Ember particle emitter using additive blend.
- Optional camera bloom and vignette via Phaser `postFX` if available.

## Forest Builder Features

Grid constants:

- `TILE_SIZE = 32`
- `FOREST_GRID_WIDTH = 48`
- `FOREST_GRID_HEIGHT = 48`
- World size is `1536 x 1536` pixels.

Build catalog:

- `pine_tree`: label `Pine`, cost `15`, green swatch.
- `oak_tree`: label `Oak`, cost `24`, green swatch.
- `fence`: label `Fence`, cost `6`, brown swatch.
- `lantern`: label `Lantern`, cost `18`, gold swatch.
- `flower_patch`: label `Flowers`, cost `9`, pink swatch.

Purchase validation:

- Rejects unknown object type.
- Rejects invalid coordinates.
- Rejects invalid negative/non-finite cost.
- Rejects occupied tiles.
- Rejects insufficient funds.
- On success, deducts coins and appends a `ForestGridObject`.

`ForestGridObject`:

```ts
{
  id: string;
  type: ForestObjectType;
  x: number;
  y: number;
  placedAt: number;
}
```

Forest scene features:

- Phaser tilemap filled with generated `forest-tile` texture.
- Visible grid lines.
- Hover tile rectangle.
- Click/tap places the selected item.
- Drag-to-pan camera.
- Mouse wheel zoom from `0.65` to `2.25`.
- Initial camera centered on the world at zoom `1.2`.
- Object depth is `10 + object.y` to give simple front/back ordering.
- Forest scene subscribes to `forestGrid` and fully re-renders object sprites on every grid change.

## HUD Features

`components/ui/GameHud.tsx` contains all React controls:

- Scene tabs: `Shrine`, `Forest`.
- Readouts: coins, current coin rate, active streak duration, best streak duration.
- Forest build menu, shown only when `activeScene === "forest"`.
- Relapse button with `window.confirm`.

Formatting:

- Coins show one decimal under 10,000 and integer locale formatting at 10,000+.
- Durations display as seconds/minutes, hours/minutes, or days/hours.

The HUD starts the economy ticker via `useEconomyTicker`.

## Assets

There are no external image/sprite assets in the repo. `BootScene` generates all current textures at runtime using Phaser graphics:

- `ember`
- `phoenix-egg`
- `phoenix-hatchling`
- `phoenix-majestic`
- `forest-tile`
- `pine_tree-sprite`
- `oak_tree-sprite`
- `fence-sprite`
- `lantern-sprite`
- `flower_patch-sprite`

This makes the prototype self-contained but visually placeholder-grade.

## Current Feature Coverage

Implemented:

- Offline-only Next app.
- Full-screen Phaser WebGL canvas.
- React HUD overlay.
- Scene switching between Shrine and Forest.
- Idle coin accrual with compounding rate and cap.
- Current streak and highest streak tracking.
- Relapse reset that preserves coins and forest.
- Phoenix stage transitions based on streak length.
- Phoenix breathing/aura/ember effects.
- Runtime-generated placeholder textures.
- Forest tile grid.
- Forest panning and zooming.
- Build menu selection.
- Purchase validation.
- One object per tile.
- Store-to-Phaser forest render subscription.
- Local TypeScript build/typecheck.
- Vercel config override for Next output detection.

Not implemented:

- Browser persistence via `localStorage` or IndexedDB.
- Backend/database/auth/sync.
- Real sprite sheets or audio.
- Save/load/import/export.
- Object deletion, movement, rotation, or refund.
- Purchase failure feedback in the HUD.
- Explicit touch gesture polish beyond Phaser pointer basics.
- Accessibility beyond normal HTML buttons in the HUD.
- Automated tests.
- ESLint config.

## Important Caveats For Future Work

- State resets on page reload. The prompt describes the forest as permanent, but the current implementation only preserves it across relapse within the same session.
- `purchaseObject` accepts an optional `cost` parameter. Existing calls pass catalog cost. Be careful if adding external callers because a caller could pass `0` and place free objects.
- `ForestScene.renderForestObjects` clears and recreates all object sprites whenever `forestGrid` changes. This is fine for the prototype, but large forests may need incremental diffing.
- `PhoenixScene` subscribes only to `currentStreakStartTime` and otherwise polls every second for stage changes. This is intentional because stage changes depend on time, not only direct state changes.
- `PhaserGame` subscribes to scene changes after boot. `BootScene` starts the initial scene based on the store's current `activeScene`.
- `next lint` is not usable until an ESLint config is added.
- The current visuals are generated in code; replacing them with asset files means updating `BootScene.preload`, texture keys, and likely `.gitignore`/public asset layout.

## Suggested Next Agent Starting Points

For persistence:

- Add Zustand `persist` middleware or explicit localStorage hydration.
- Version the stored shape because `forestGrid` will likely evolve.
- Avoid persisting `lastEconomyUpdateAt` incorrectly; offline accrual should intentionally compute from the saved timestamp on load.

For better forest UX:

- Add HUD feedback for `PurchaseResult.reason`.
- Add delete/move mode.
- Add occupied-tile hover state.
- Disable or visually mark unaffordable build menu items.

For production quality:

- Add ESLint config compatible with Next 14.
- Add unit tests for economy math and purchase validation.
- Add a small Playwright or component smoke test for page boot.
- Add real assets and preload them in `BootScene`.

For economy balancing:

- Edit constants in `store/useGameStore.ts`.
- Unit test `calculateIdleCoinAccrual` before changing the formula.
- Remember that changing `HOURLY_COMPOUND_FACTOR` also changes time-to-cap.

