# Development

[Documentation index](README.md) · [Architecture](ARCHITECTURE.md) · [Contributing](../CONTRIBUTING.md)

## Environment and commands

Use Node.js 24 and the committed `package-lock.json`, matching the Pages workflow. Install with `npm ci`. No backend, credentials or environment file are required for gameplay. Vite can select another port if one is occupied; a permission-denied port may require explicitly choosing another port.

```sh
npm ci
npm run dev -- --port 4187
```

Before submitting a simulation change:

```sh
npm test
npm run build
```

Preview the production output with `npx vite preview --host 127.0.0.1 --port 4187`. The browser must receive JavaScript and CSS from HTTP, not from directly opening the source HTML.

The repository currently defines `dev`, `build` and `test` scripts only. There is no configured `npm run lint`, `npm run preview`, docs site generator or test-coverage threshold. Prettier is installed as a development dependency and can be invoked explicitly. `tsconfig.json` checks `src/`; the Vite config is loaded by Vite during the build, not included in that TypeScript file set.

## Working with the engine

This example uses no browser or renderer:

```ts
import { createBattle, command, activeUnit } from "./src/engine";

const initial = createBattle(74319);
const moved = command(initial, { type: "move", x: 3, z: 5 });
const next = command(moved, { type: "end" });

console.log(initial.units[0].x); // 2: source snapshot was not mutated
console.log(moved.units[0].x); // 3
console.log(activeUnit(next).id); // corin
```

Use `tsx` to execute TypeScript scripts. A rejected command returns the same state object; check identity when testing invalid input. Browser UI gating is not a substitute for engine validation. Keep query functions such as previews aligned with the actual resolution formula.

## Extension recipes

| Change                 | Required edits                                                       | Verification                                                |
| ---------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| Tune an existing skill | `data.ts`; update numeric reference tables                           | Relevant damage/targeting tests and a preview check         |
| Add a skill            | `SkillId`, `skills`, a job's skills; engine effect if new            | Availability, resources, targets, status/terrain timing     |
| Add a job              | `JobId`, `jobs`, prerequisites, sprite handling as needed            | Unlocks, JP retention, primary versus secondary tradeoff    |
| Add a status           | `Unit.status`, initialization, resolution/expiry and save validation | Application, expiry, malformed-save and replay cases        |
| Add a map              | Encounter factory plus renderer, inputs and save-count assumptions   | Paths, elevations, LOS, spawn legality and complete outcome |
| Change save shape      | Engine types/validator and storage migration or rejection policy     | Old format, invalid records, fallback slot behavior         |
| Change controls        | UI input adapter, HUD guidance and help table                        | Keyboard focus, touch targeting and cancellation            |
| Add an asset atlas     | Rendering texture/frame adapter                                      | Nearest filtering, alpha, camera rotation and cleanup       |

### Adding an ability

1. Give it a stable ID and a complete typed definition in `data.ts`.
2. Decide whether existing damage/heal/buff handling is enough. Add an engine rule only when the semantics require it.
3. Assign it to a job and check that primary/secondary skill merging de-duplicates it.
4. Cover cost, range, hit/miss behavior and relevant terrain/status effects with meaningful assertions.
5. Verify that `preview()` and actual resolution agree apart from documented critical randomness.
6. Update the [ability table](JOBS_AND_ABILITIES.md), [combat rules](COMBAT.md), and changelog.

Adding only a data row does not create a new animation, UI icon, purchase tree, AI strategy or permanent learned ability. Follow the relevant extension boundaries rather than introducing a disconnected button.

### Expanding encounters

`createBattle(seed, encounterId)` owns the four Veyr map variants and rosters; `encounters.ts` supplies contract metadata and gates. Optional dimensions now support rectangular 9–32-side maps across source validation, battle save validation, keyboard/gamepad cursor clamps and renderer framing. Missing dimensions retain 9×9 compatibility; the roster still expects eight units. See [large maps](LARGE_MAP_STUDIO.md). Keep decorative scenery separate from authoritative terrain, and update tests for the new movement and LOS geometry.

## Code conventions

Keep authoritative rules in the engine, content values in `data.ts`, and browser lifecycles in their adapters. Do not introduce renderer objects into a save or call wall-clock/random APIs for combat resolution. Use the state's seed for new random mechanics. Avoid mutating input snapshots or relying on animation completion to apply damage.

Favor a regression case that can fail for a real reason: a blocked climb, a lethal counter, a revived unit re-entering the timeline, a status expiring at the correct ending. Do not replace assertions with snapshots of the implementation's own intermediate calculations.

Class, skill, gear and encounter IDs are persistence keys. Renames need a compatibility decision, not just a UI label change. The current project is small and modular, but not a plugin framework; discuss larger content-system or campaign changes against the [roadmap](ROADMAP.md).

## Documentation maintenance

Use relative Markdown links, descriptive headings, valid table separators, and simple fenced Mermaid. Keep requirements in `PROJECT_BRIEF.md` preserved; update current guides when behavior changes. Historical `DESIGN.md` and `VALIDATION.md` should retain their original context or receive clearly labeled addenda. Do not add planned mechanics to the implemented-feature table until a functional, validated path exists.

Pages deploys the game artifact, not this documentation directory. GitHub renders the README, Markdown tables and Mermaid diagrams directly in the repository.

## Progression work

Use the pure `campaign.ts` transitions for camp changes. Keep lifetime JP separate from spending; preserve shared-copy reservation and proficiency checks. Battle units carry field gains while the Company record stays the retry baseline until settlement. Schema changes must cover both current game validation and the supported v1 migration. `npm test` runs `engine.test.ts` and `campaign.test.ts`.

## Extending combat effects

Add a recipe in src/combat-effects.ts for each SkillId and update the matching atlas/manifest together. Keep pure planning separate from src/effect-renderer.ts and consume resolved cue outcomes. The [effects guide](COMBAT_EFFECTS.md) describes particle caps, compatibility and build commands. Never consume the combat RNG for particles or gate a command on effect completion.

## Documentation workflow

Run npm run docs:catalog after source content or art-manifest changes. Run npm run docs:verify to validate Markdown links/anchors, table shape, fenced diagram structure, all 160 backlog IDs/dependencies and generated-catalog freshness. The command runs in the build job before gameplay tests. It does not claim full Mermaid syntax/rendering validation; see [documentation testing](TESTING.md#documentation-validation).

Choose expansion work from the [master roadmap](ROADMAP.md) and [stable backlog](roadmap/BACKLOG.md). Use the [systems guide](SYSTEMS_GUIDE.md) to locate the current owner before changing a rule or serialized record.

Planning metadata in docs/roadmap/specs/plan.json is intentionally separate from the source-derived catalog. Update it when revising blueprint IDs/references and run npm run docs:plan. Keep all experimental schemas and numeric prototypes labeled as proposals until implementation and acceptance evidence exist.

## Architecture decision records

Create a record for a durable cross-module, persistence, platform or delivery choice using [the ADR template](adr/template.md). Link relevant source/evidence and roadmap questions. Retrospective records identify unknown original dates. Material replacement uses a new ID with reciprocal supersession links. Routine bug fixes and ordinary content additions do not require separate ADRs. Run npm run docs:adr or the full documentation command.

## Authoring toolkit planning

Use [docs/studio](studio/README.md) for the canonical-project, editor/agent transaction, music/SFX graph and complete-game round-trip direction. Keep studio STU/STREQ/SD/STAC identities in docs/studio/specs/studio-plan.json and run npm run docs:studio after revisions. Source-derived runtime references remain separate.

Detailed studio contracts live under docs/studio/blueprints, with proposal-only examples under docs/studio/specs/examples. Keep blueprint/index references synchronized and run npm run docs:studio:examples after changes. Prototype implementation exits remain separate from documentation validation.

Advanced contracts and fixtures live in docs/studio/specs/advanced-blueprints.json and docs/studio/specs/advanced. Run npm run docs:studio:advanced after changing typed rule examples, campaign/UI references, migration/merge cases or presentation constraints. Keep computed example answers separate from runtime integration and release evidence in the [toolkit release plan](studio/blueprints/TOOLKIT_RELEASE_PLAN.md).

## Working level-studio pilot

Open studio.html during Vite development. src/studio-project.ts owns the implemented level-project v1 source, validation, atomic edits, history, checkpoint helpers and runtime compiler. src/studio.tsx uses these functions for all editing controls and runs fresh Battle snapshots through the existing engine/scene. Keep this source distinct from player saves and the proposed complete-project schema; see the [pilot guide](LEVEL_STUDIO.md).

The [sound-effects pilot](SOUND_EFFECTS_STUDIO.md) uses studio-sfx.ts for source validation, deterministic PCM/WAV rendering, outcome bindings and the browser audio player. SoundEditor.tsx stages drafts; a sounds edit applies them through the existing project transaction/history path. Preserve optional-source compatibility and avoid consuming combat RNG.

The [music pilot](MUSIC_PATTERN_STUDIO.md) uses studio-music.ts for strict source validation and a deterministic one-bar renderer, MusicEditor.tsx for staged composition, and the shared studio audio player for a single loop beside SFX. Music is optional source in level-project v1; tests cover old projects without it.

The [pixel pilot](PIXEL_ANIMATION_STUDIO.md) uses studio-pixels.ts for typed source edits, validation, composition, packing and source-time frame selection. PixelEditor.tsx owns local drafts/strokes. scene.ts accepts an optional clip for one actor; async production-art loading must never overwrite that actor texture. The normal game passes no custom clip.

Action clips bind stable frame IDs to four states in studio-pixels.ts. Keep atlas order separate from playback order; use pixelStateFrame/pixelClipDuration in the renderer. Custom animation callbacks are presentation diagnostics only. Preserve the shared-loop path when clips are absent, and ensure exported projects pass import-size checks. See [action clips](ACTION_CLIP_STUDIO.md).


The [native sprite mode](NATIVE_SPRITE_STUDIO.md) uses studio-native-sprites.ts for strict metadata, frame rects, sparse RGBA edits and state timing; studio-native-art.ts handles verified image loading/decoding and canvas compilation. NativeSpriteEditor.tsx uses a zoomable canvas rather than one DOM node per pixel. The project embeds the original WebP and sparse overrides. Checkpoints deduplicate original bytes by digest; exports always hydrate/embed them. scene.ts reuses original UVs, scale and per-frame feet registration, with native source durations. See [ADR-0013](adr/0013-native-sprite-sources-and-overrides.md).


Existing game source adapters live in studio-content.ts, studio-materials.ts and game-audio.ts. ContentEditor, TerrainEditor and GameAudioEditor stage source rather than mutate module globals. The engine accepts bounded optional victoryJP, campaign gate/settlement functions accept a catalog for isolated previews, and AudioScore consumes the same default source as the game-audio editor. See [coverage/contracts](EXISTING_GAME_EDITORS.md) and [ADR-0014](adr/0014-existing-game-source-adapters.md).


The scoped catalog source lives in studio-rules.ts and optional project/battle rules. Never mutate imported defaults or mirror engine formulas in forms. Pass rules into unitStats/availableSkills, use the scoped skill table for targeting/commands/AI, and preserve the same gear/job context in campaign operations and display labels. See [catalog ownership](RULE_CATALOG_STUDIO.md) and [ADR-0015](adr/0015-scoped-rule-catalogs.md).

Authoring diagnostics live in [studio-validation.ts](../src/studio-validation.ts). Keep structural/runtime failures blocking and heuristic gameplay checks advisory. Findings carry typed source addresses; navigation must not edit data. See [validation ownership](PROJECT_VALIDATION.md) and ADR-0017.

Static connectivity geometry is centralized in [studio-connectivity.ts](../src/studio-connectivity.ts). Keep region ordering canonical and view selection derived from current findings. Never persist overlay arrays in editable source; see [the overlay guide](CONNECTIVITY_OVERLAYS.md).
