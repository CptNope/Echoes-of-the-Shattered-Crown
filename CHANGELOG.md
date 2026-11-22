# Changelog

## Unreleased

### Added

- Added scoped overrides for all 13 current abilities, 8 jobs and 10 gear definitions, plus existing actor weapon/armor/relic loadouts.
- Combat, AI, movement, initiative, animation/effect footprint, shop/equip/deployment and learning/unlock/mastery resolve the same catalog context; legacy callers keep shipped defaults and module globals remain immutable.
- Added typed catalog forms, isolated real-shop trials, source validation/removal and ten parity tests (134 total). Updated coverage and added Accepted ADR-0015. New IDs, support/formula/AI-program editors and complete-game packaging remain planned.

- Added real encounter loading for all four existing maps, preserving authored art/audio and copying the actual roster, map cells and encounter identity.
- Added shared-source terrain materials with painted top textures, current character/enemy editing, linear dialogue seeded from existing briefings, contract prerequisites/rewards/items and victory JP, plus a real isolated progression settlement.
- Added original-game audio editing with shared source defaults/player; separate pattern and layered-SFX pilots remain available. Added ten integration tests (124 total), an implementation coverage audit and Accepted ADR-0014.

- Added native-resolution editing of all eight shipped character sheets: 887 × 1774 assets, 32 frames across eight states, original RGBA and foot registration, zoom, brush sizes, erase, exact fill, eyedropper, draft history and source-time audition.
- Embedded original image bytes plus sparse edits preserve source without palette reduction; full 4 × 8 PNG export and state-driven native actor playtests use the edited source. Native projects allow up to 8 MiB; legacy-only projects retain 128 KiB. Checkpoints deduplicate embedded originals and preserve backup recovery.
- Added eight native-source tests (114 total), native editor guide and Accepted ADR-0013.

- Added source-layer flood fill and eyedropper, horizontal/vertical flips, cropped one-pixel nudges and palette-aware cel copy/paste across action frames. Changed operations are undoable draft edits; hidden-layer writes and incompatible palette pastes reject.
- Added six pose-tool tests (106 total), tool behavior tables and an edit-flow diagram. Pixel/project source formats remain unchanged.

- Added independent Idle/Walk/Attack/Cast authoring with explicit source-preserving conversion, owned frame editing and up to sixteen packed frames.
- Custom actor playback follows real movement and physical/magical actions, with authored one-shot timing and a state inspector. Older shared-loop sources retain their behavior.
- Added eight action-clip tests (100 total) and compact source-preserving exports when pretty JSON exceeds the existing 128 KiB limit.

- Added a working pixel/animation pilot: 16×24 indexed art, two layers, brush/eraser strokes, draft undo/redo, palette edits, visibility/order, up to four frames, timing, pivot, onion skin, playback and PNG sheet export.
- Applied clips share project history/checkpoints/JSON and replace one selected actor in the existing studio playtest renderer. Added eight pixel tests (92 total). Full state/direction clips, arbitrary image import and complete-game packaging remain planned.

- Added a working music-pattern editor: sixteen notes/rests, tempo, instrument, gain, gate, loop audition/stop, one-bar WAV export and source-preserving project/history integration.
- Studio preview can loop applied music alongside authored SFX after explicit sound opt-in; restart/mute/exit clean up playback. Added six music tests (84 total).

- Implemented the studio's layered sound-effects editor: four combat outcome bindings, tone/noise sources, pitch sweeps, envelopes, gains, mute/add/remove layers, waveform inspection, audition/stop and mono PCM16 WAV export.
- Applied sound banks share project undo/redo, checkpoints and JSON export/import. Studio playtests use the same PCM renderer for resolved outcomes, with explicit audio opt-in and bounded voice cleanup.
- Added eight sound tests (78 total); old level-project v1 files remain valid without the new optional sounds field. Music, recording/sampling, full DSP graphs and complete-game packaging remain planned.

- Implemented a level-studio pilot with terrain, elevation, collision and eight-actor placement tools on the fixed 9×9 shrine board.
- Added atomic revisioned edits, undo/redo, project metadata, isolated seeded combat previews, restart, strict level-project JSON export/staged import and explicit local checkpoints with prior-valid fallback.
- Added eight project tests (70 total) and Pages checks for the new studio entry. Full pixel/audio/rule authoring and playable-plus-editable bundle export remain planned.

### Documentation

- Added five advanced authoring blueprints for rules/AI, campaign/economy/UI, VFX/material/environment, project versioning/merges and five toolkit release gates.
- Added four proposal examples and CI checks for formula answers, branch routes, economy arithmetic, typed conflicts, migration edges and presentation references. These are design checks; no editor, migration runner or renderer is implemented.

- Added six detailed studio blueprints for editor interaction, pixels/animation, levels/rules, audio nodes/cues, import/export conformance and prototype implementation slices.
- Added six proposal-only JSON examples and checks for their source identities, pixel/timeline data, audio/music ports/clocks, map/objective references, edit addresses and complete-bundle membership. No editors, audio renders or game bundles are claimed by these checks.

- Added an eight-guide complete game-authoring studio plan with twenty-four requirements, eighty tooling work items, ten gates and thirty-two acceptance scenarios.
- Specified level/rule/campaign/UI editing, layered pixel art and animation, environment/VFX, agent/source extensions, music composition, original SFX synthesis/sampling/recording, ambience/voice and mixer/cue tools.
- Defined default playable-plus-editable Complete game bundles, separate artifact profiles and clean source-preserving reimport gates; added two Proposed studio ADRs and planning coverage checks.

- Added docs/adr with an index, reusable template, record lifecycle and ten initial ADRs: nine Accepted records (eight retrospective implementation records) and one Proposed variable-board/roster contract.
- Linked ADR history to architecture, contribution guidance and the open roadmap decision register; added metadata/index/supersession integrity checks to docs:verify.

- Expanded the design library with three production slices/eighteen acceptance scenarios, sixteen open decisions, six mission blueprints, twelve proposed jobs/36 prototype abilities, a convergent campaign/quest outline and technical contract examples.
- Added a proposal-only planning manifest and integrity check for references, prerequisite graphs, mutually exclusive approaches, four chapter routes and JSON examples. No gameplay content or save schema changed.

- Rebuilt the expansion roadmap around the current v0.8 baseline, M0–M12 gates, scope options and next increments.
- Added a 160-item backlog across sixteen tracks with stable IDs, priorities, relative sizes, dependencies and acceptance evidence.
- Added engine, campaign/content, art/audio and release/quality plans, including tables, dependency graphs and production arithmetic.
- Added an end-to-end current systems guide and source-generated catalog for jobs, abilities, supports, equipment, contracts, clips, effects and assets.
- Updated README/navigation, architecture, data, development, testing and contribution guides.
- Added reproducible documentation/catalog checks to GitHub Actions. Gameplay and save format remain v0.8 / Expedition v2.

## [0.8.0] — 2026-11-18

### Added

- Three generated transparent effect atlases: 96 frames across twelve weapon, elemental and support sequences, mapped to all thirteen abilities.
- Cast/travel/contact phases, outcome-aware hit particles, and bounded pools of 24 effect sprites and 256 particles.
- Reduced-motion contact poses, procedural fallback rings, shared atlas textures and explicit teardown.
- Ability contact sheets, miss/fallback/held-pose previews, burst stress check and thirteen-ability WebM recording in the art workbench.
- Seven effect tests (62 total), reproducible effect asset build/verification and live Pages checksum checks.

### Changed

- Valid skill cues include optional target coordinates and resolved hit/miss/heal/buff outcomes. Older v2 saves remain supported; combat RNG and timing rules are unchanged.

## [0.7.0] — 2026-11-18

### Added

- Eight generated RGBA character sheets: 256 frames across idle, walk, attack, cast, hurt, guard, victory and downed clips.
- Production WebP assets, registration manifest, source hashes, full generation prompts and reproducible art build/verification scripts.
- Lazy animation loading, independent UV playback, shared job textures, final downed holds and reduced-motion poses.
- Isolated animation workbench with clip stepping, battlefield fixtures and twelve-second WebM recording.
- Six animation tests; 55 total tests. Pages checks all deployed animation assets by checksum.

### Changed

- Valid combat actions record an optional cosmetic cue; older v2 saves remain supported. Original portrait atlas and loading fallback remain available.

Changes are grouped by player/developer impact. Dates below use **America/New_York**; GitHub commit timestamps may show the following UTC date. Package version `0.1.0` identifies the initial development baseline; this changelog does not imply a published package, GitHub release or version tag.

## Unreleased

Further milestones are tracked in [the roadmap](docs/ROADMAP.md).

## 0.6.0 — 2026-11-18

### Added

- Automatic company/battle recovery with serialized current/previous IndexedDB snapshots, startup review and enemy/input pause until a recovery choice. Manual saves remain separate.
- Portable JSON export/import, company/progress/turn preview, explicit restore, native/legacy compatibility and a 1 MiB UTF-8 limit. Invalid files leave the session unchanged.
- Backups controls in camp and battle, automatic-storage status, focus handling and file download names.
- Six backup tests (49 total), actual browser download/import/reopen checks, real IndexedDB queue/fallback/manual-isolation checks, a guide and Mermaid recovery diagram.

### Limits

- Browser clearing and abrupt interruption of a pending write can still lose local recovery. No cloud sync, checksum/encryption or multi-tab merge; exported files provide an independent copy.

## 0.5.0 — 2026-11-18

### Added

- Gloam pursuit (Shadowrunner), Oathguard (Runewarden), Rain of glass (Storm Herald) and Stolen hour (Chronoweaver); thirteen active abilities total.
- Conditional exposure finishers, living-ally guard/burn cleansing, cross-shaped soak setup and surviving-target readiness delay.
- Enemy ranged positioning and scoring for rain setup, timeline effects and defensive ally protection.
- Target status/guard labels and buff-specific previews; self-cast guard survives end turn.
- Six tests (43 total), advanced ability guide, updated numeric references, save/mastery notes and Mermaid resolution diagram.

### Compatibility

- Retains expedition v2; old learned collections/supports remain valid. Newly added native skills count toward derived mastery; previously learned supports remain effective. New companies and v1 migrations use current starter secondary definitions.

## 0.4.0 — 2026-11-18

### Added

- Derived job mastery: unlocked job, 240 lifetime JP and every native skill permanently learned.
- Eight permanent support lessons at 120 spendable job JP each, with one passive, reaction and movement slot per companion. Supports retain their effects across primary-job changes.
- Equipment-stacking stat supports, energy-consuming Second wind recovery and nonrecursive Close reprisal retaliation, including safe turn advancement after a lethal counter.
- Training lesson/slot controls and equipped-support names in the battle HUD.
- Optional v2 support fields with ownership/slot validation and old-save compatibility; six new test cases (37 total), guide, reference tables and Mermaid progression diagram.

### Limits

- One support lesson per existing job; more active job skills, the remaining roster and refunds remain future work. Hit previews do not include the full reaction exchange.

## 0.3.0 — 2026-11-18

### Added

- Detailed, original AI-generated artwork for all eight jobs, shared between battlefield sprites and closer roster/turn-order portraits. Transparent atlas, cached loading, procedural fallback, enemy mirroring/tint and faction ground markers.
- The silent belfry: a fourth gated 9×9 contract with a raised courtyard, bell scenery, named boss Orren and three advanced-job retainers.
- One-time half-health awakening: cleanses burn/slow, restores energy, adds two speed, advances readiness by 25 ticks and braces until the next activation. The phase persists in saves.
- Bellkeeper’s seal: first-clear relic (+2 armor, +3 magic); replay gold/JP remain repeatable while the relic cannot be purchased or duplicated by settlement.
- Attack lean and damage tint with reduced-motion handling, boss health/phase information, and atlas checks in local/live Pages verification.
- Three new tests (31 total), deterministic battles on all four maps, boss/reward docs and recorded generation provenance/prompt.

### Compatibility

- Keeps expedition format v2; 0.2 saves load without migration. Older builds do not recognize the new encounter or item IDs.
- Artwork currently has one ready pose per job. Full directional/action frame sets, unique personal costumes and gear appearance remain future work.

## 0.2.0 — 2026-11-17

### Added

- Functional company camp with contracts, roster/job loadouts, permanent skill training, outfitter and shared treasury.
- Three sequential, replayable Veyr contracts with distinct crossing/cover arrangements and enemy compositions, including advanced-job opposition.
- Lifetime versus spent JP, 60-JP permanent learning, learned-only secondary skills and preserved starter ability sets.
- Nine pieces of equipment, three slots, proficiency rules, copy reservation and derived stats used by movement, damage and initiative.
- Carried progression, one-time result settlement, repeatable bounties, defeat recovery and an explicit pre-deployment retry baseline.
- Version 2 expedition snapshots, lossless active-combat migration from supported v1 saves and atomic manual/backup writes.
- Eleven new progression tests (28 total), including full deterministic battles on all three boards.

### Changed

- New sessions begin at camp; victory/defeat results return to camp instead of resetting progression.
- Secondary skill sets require permanent learning. Primary skills remain native; starter secondaries stay learned for compatibility.
- Updated documentation to distinguish the new company loop from the still-planned world-map/story campaign and mastery systems.

## Documentation expansion — 2026-11-17

- Added twelve implementation guides, nine Mermaid diagrams, 43 tables, contribution guidance and history-based release notes. All 130 local links/anchors and reference numbers were checked; all diagrams rendered on GitHub.

## 0.1.0 baseline — 2026-11-17

### Added: playable Veyr slice

- Original 9×9 shrine battlefield with four companions and four AI-controlled Oathless.
- Pure TypeScript battle snapshots, validated commands, seeded hit/critical rolls and speed-based initiative.
- Elevation-aware movement, facing bonuses, sampled line of sight, guarding, formation defense, riposte, area damage, revival and terminal outcomes.
- Eight job definitions, four starting jobs, primary/secondary loadouts, JP and prerequisite display.
- Nine abilities covering fire, ice, lightning, spirit, physical attacks, restoration and readiness support.
- Grass ignition, frozen routes, status counters, lightning/soaked interaction and shared momentum.
- Orthographic Three.js battlefield, smooth quarter-turn camera, zoom, original pixel sprites and procedural score sketch.
- React HUD, chronicle, company management, settings, input adapters, targeting confirmation and responsive layouts.
- IndexedDB manual snapshots, previous-save backup, validation and fallback recovery.
- Seventeen automated rules/scenario tests, design documentation and historical validation notes.

Implementation: [`e7652a3`](https://github.com/CptNope/Echoes-of-the-Shattered-Crown/commit/e7652a30199dc13e52163aa0aabda9a73f0d5f07).

### Added: GitHub Pages automation

- Vite `BASE_PATH` configuration for the repository's Pages subdirectory while retaining root-path defaults on other hosts.
- Actions validation on pull requests; automatic deployment for `main` pushes and manual runs on `main`.
- Locked dependency installation, engine tests, production compilation, local asset-path checks, Pages artifact deployment and a live HTML/JS/CSS verification job.
- Least-needed job permissions for checkout and Pages/OIDC deployment without personal access tokens.

Implementation: [`f120bf4`](https://github.com/CptNope/Echoes-of-the-Shattered-Crown/commit/f120bf42133086b4582a77ed1a09e6a1e76f5d23). Initial successful deployment: [Actions run 44233777082](https://github.com/CptNope/Echoes-of-the-Shattered-Crown/actions/runs/44233777082).

### Preserved and limited

- Preserved the original repository README as `PROJECT_BRIEF.md` when adding the playable source.
- Full campaign, permanent purchased skills, equipment, crafting, multi-encounter progression, full animations, PWA/offline and release certification remain future milestones; see [roadmap](docs/ROADMAP.md).

## Project inception — 2026-11-17

- Created the repository and recorded the full original RPG vision and development strategy.

History: [initial commit](https://github.com/CptNope/Echoes-of-the-Shattered-Crown/commit/215c2f37af8fe386439689a5078b8db1b56adf1e), [project brief](https://github.com/CptNope/Echoes-of-the-Shattered-Crown/commit/14868a5e6c21ea013e664d56335d79298de05167).
