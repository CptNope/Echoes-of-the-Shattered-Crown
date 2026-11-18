# Echoes of the Shattered Crown — Veyr

A playable Phase 1 vertical slice of an original browser tactical RPG. The original project brief is preserved in [PROJECT_BRIEF.md](PROJECT_BRIEF.md). See [DESIGN.md](DESIGN.md) for the design, architecture, 20-job roadmap, initial progression matrix, combat specification, art direction and milestones.

## Run

Requires Node 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev
npm test
npm run build
```

Open the Local URL printed by Vite. Production output is `dist/`; serve it over HTTP using any static host. Gameplay has no backend dependency. Fonts load from Google Fonts with local serif/sans fallbacks. PWA installation and offline caching are not implemented.

## Play

Defeat all four Oathless. Each character can move once and use an ability once per turn, in either order. Click Move or an ability, select a highlighted tile and confirm. End without using an ability to defend. Empty tile spells are valid and spend the action. Use the company window before the first turn ends to change primary and secondary jobs.

| Input | Action |
| --- | --- |
| Click / tap | Select a tile, menu or command |
| Q / E | Rotate camera 90 degrees smoothly |
| Mouse wheel / + / − | Zoom |
| Arrow keys | Move tile cursor |
| Enter | Confirm selected action |
| M / 1 | Select Move / weapon strike |
| Space | Defend or end turn |
| Escape | Cancel targeting or close a menu |
| Standard gamepad | D-pad/stick: select tile; X: Move; A: confirm; B: cancel; Y: end; LB/RB: rotate |

On-screen camera and confirmation buttons support touch. Company, Chronicle, Settings and Field guide all open functional menus. Settings offers reduced motion, enemy delay, larger text and music volume. Sound starts only after a user interaction. Menus pause enemy turns.

## Saves

Manual save/load uses the `echoes-crown` IndexedDB database, schema version 1, object store `saves`. `manual` contains `{battle, savedAt}`; `backup` retains the previous valid manual snapshot. Battle version 1 stores tiles, units (including job JP), RNG seed, readiness ticks, active ID, momentum, log and terminal result. Load validates data and falls back to backup. No cloud sync. Clearing browser data deletes saves. A new battle resets roster and JP but does not overwrite the manual save. Save migrations and portable export/import are future work.

## Extension points

- Content: add typed skills/jobs in `src/data.ts`; add mechanics in the pure engine, never the renderer.
- Encounters: replace the map and roster factory in `createBattle()`. The current renderer assumes a 9×9 map; generalizing map dimensions is a future change.
- AI: extend action and position scoring in `aiTurn()` and add deterministic scenario tests.
- Visuals: replace `spriteCanvas()` with an original licensed atlas and preserve the simulation/render separation.
- Input: translate controls to `Command`; `command()` remains the authority that rejects illegal actions.

## Implemented scope and limits

One complete battle with four allies and four AI enemies. Orthographic Three.js board, smooth quarter-turn rotation and zoom, original pixel sprites, terrain elevation, path previews, attack previews, physical/magical area skills, guard, formation protection, riposte, burn, slow, exposure, healing/revival, ice conversion, grass fire, momentum, timeline and victory/defeat. Eight job definitions and a prerequisite interface exist; four starting jobs are available. Individual JP and cross-class loadouts persist with a saved battle. This is not the full multi-phase commercial RPG described in the brief.

Remaining: full purchased/mastered ability system, equipment/inventory, persistent multi-battle progression, free continuous camera/pan/tracking, explicit facing selection, detailed action animation/effects, destructible obstacles, weather, full elemental resistance tables, configurable permadeath, campaign maps/dialogue choices/hub/recruitment, game modes, authored orchestral score, PWA/offline, save migration/export and device-specific performance certification. Current line-of-sight is a discrete tile sampling approximation. Scenery fading is view-based, rather than exact per-character occlusion. The procedural music is a sketch, and sprite animations cover idle/travel/fallen rather than all requested states. Accessibility includes keyboard and touch commands, reduced motion, larger text and shape-based team markers; remapping and screen-reader battlefield navigation remain future work. No 60 FPS claim has been certified.

All artwork and musical notes are authored for this project. React, Three.js, Vite and other dependencies retain their respective open-source licenses. Google Fonts are external optional type assets (Cormorant Garamond and DM Sans, SIL Open Font License).

## GitHub Pages via Actions

Play at [CptNope.github.io/Echoes-of-the-Shattered-Crown](https://cptnope.github.io/Echoes-of-the-Shattered-Crown/).

The [Pages workflow](.github/workflows/pages.yml) runs `npm ci`, all combat tests, the TypeScript/Vite build, and an asset-path check. Pushes to `main` and manual runs publish `dist/` using GitHub's Pages artifact deployment. Pull requests run validation without deployment. A final job checks the published HTML, JavaScript and CSS over HTTPS.

Repository Settings → Pages → Build and deployment → Source must be **GitHub Actions**. No personal access token or custom secrets are needed; deployment uses the workflow's short-lived GitHub token and OIDC identity.

Vite uses `BASE_PATH` for project hosting. The workflow sets it to `/Echoes-of-the-Shattered-Crown/`; local development and other hosts default to `/`. If the repository is renamed or a custom domain is added, update the workflow's `BASE_PATH` accordingly.

Reproduce the Pages build in PowerShell:

```powershell
$env:BASE_PATH = '/Echoes-of-the-Shattered-Crown/'
npm run build
node scripts/verify-pages.mjs
Remove-Item Env:BASE_PATH
```

Browser saves are specific to their origin. Saves from the private Site do not transfer automatically to the GitHub Pages origin.
