# Documentation

[Play](https://cptnope.github.io/Echoes-of-the-Shattered-Crown/) · [Project README](../README.md) · [Changelog](../CHANGELOG.md) · [Expansion roadmap](ROADMAP.md)

The game baseline is **v0.8.0**. Current implementation guides and future expansion plans are distinct. This index links the complete maintained documentation; historical design material stays preserved.

## Start with a player path

| Goal | Start here | Continue with |
| --- | --- | --- |
| Play a first contract | [Player guide](PLAYER_GUIDE.md) | [Combat rules](COMBAT.md), [company](COMPANY_AND_PROGRESSION.md) |
| Understand everything implemented | [System flows](SYSTEMS_GUIDE.md) | [Source-derived catalog](REFERENCE_CATALOG.md), [architecture](ARCHITECTURE.md) |
| Plan expansion | [Master roadmap](ROADMAP.md) | [160-item backlog](roadmap/BACKLOG.md), [roadmap library](roadmap/README.md) |
| Design missions and story | [Content plan](roadmap/CONTENT_PLAN.md) | [Engine contracts](roadmap/ENGINE_AND_SYSTEMS.md), [quality gates](roadmap/RELEASE_AND_QUALITY.md) |
| Make sprites, effects or audio | [Art/audio](ART_AND_AUDIO.md) | [Animation](ANIMATION_PIPELINE.md), [effects](COMBAT_EFFECTS.md), [production plan](roadmap/ART_AUDIO_PRODUCTION.md) |
| Contribute code/content | [Development](DEVELOPMENT.md) | [Contributing](../CONTRIBUTING.md), [testing](TESTING.md) |
| Recover or move progress | [Backups/recovery](BACKUPS_AND_RECOVERY.md) | [Data/saves](DATA_AND_SAVES.md), [troubleshooting](TROUBLESHOOTING.md) |
| Publish a change | [Deployment](DEPLOYMENT.md) | [Quality/release](roadmap/RELEASE_AND_QUALITY.md) |

## Current game reference

[Asset library and ability feedback](ASSET_LIBRARY.md): multiple native sprite assignments and cosmetic per-ability VFX/sound pairs.

[Mission preset library](MISSION_LIBRARY.md): migrated original missions, shared loading semantics, template identities and regression evidence.

[The Sluice at Greybank](GREYBANK_MISSION.md): complete editable Tidewarden mission, tactics, rewards and balance evidence.

[Custom content authoring](CUSTOM_CONTENT_AUTHORING.md): create and duplicate classes, abilities and gear, build enemy templates, spawn hostile actors and play Saltglass Crossing.

[Large-map editing](LARGE_MAP_STUDIO.md): rectangular levels up to 32×32, reversible resize, area brushes, coordinate navigation and camera tools.

[Gear, ability and job catalog editor](RULE_CATALOG_STUDIO.md): existing definitions, actor equipment and scoped engine/AI/campaign overrides.

[Existing-game editor audit and guide](EXISTING_GAME_EDITORS.md): exact current coverage for levels, terrain textures, characters, dialogue, progression, audio and remaining toolkit gaps.

[Native game-sprite editor](NATIVE_SPRITE_STUDIO.md): edit the eight shipped character sheets at their existing resolution, preserve all eight states and export the complete PNG plus editable project.

[Action-clip editor](ACTION_CLIP_STUDIO.md): independent idle/walk/attack/cast frames and real-action playback, with legacy source compatibility.

[Working pixel-animation editor](PIXEL_ANIMATION_STUDIO.md): layered brush/eraser art, frames/timing/pivot, PNG export and actor playback.

[Working music-pattern editor](MUSIC_PATTERN_STUDIO.md): compose sixteen notes/rests, audition/export a bar and loop it with SFX in preview.

[Working sound-effects editor](SOUND_EFFECTS_STUDIO.md): layer, audition and export original combat SFX, then hear applied sources in preview.

[Working level studio](LEVEL_STUDIO.md): edit the battlefield, playtest a revision, and export/import its editable JSON.

| Guide | Scope |
| --- | --- |
| [How the game works](SYSTEMS_GUIDE.md) | Runtime ownership and complete company/combat/AI/save/render/delivery flows |
| [Generated catalog](REFERENCE_CATALOG.md) | Every current job, active skill, support, item, contract, clip, effect recipe and art file |
| [Player guide](PLAYER_GUIDE.md) | Controls, menus, first battle and current device limits |
| [Company and progression](COMPANY_AND_PROGRESSION.md) | Contract loop, learning, shared gear, economy and settlement |
| [Jobs and abilities](JOBS_AND_ABILITIES.md) | Eight jobs, thirteen active abilities and current unlocks |
| [Mastery and supports](MASTERY_AND_SUPPORTS.md) | Mastery, learned support lessons and three equipped slots |
| [Combat](COMBAT.md) | Movement, damage, targeting, initiative, statuses, reactions and AI |
| [Advanced abilities](ADVANCED_ABILITIES.md) | Distinct advanced-job skills and tactical interactions |
| [The silent belfry](THE_SILENT_BELFRY.md) | Orren's persistent phase and first-clear relic |
| [Art and audio](ART_AND_AUDIO.md) | Visual identity, current audio and ownership boundaries |
| [Portrait sprite pipeline](SPRITE_ART.md) | Original ready-pose atlas, normalization and prompt |
| [Character animation](ANIMATION_PIPELINE.md) | 256 frames, state precedence, registration and runtime clips |
| [Combat effects](COMBAT_EFFECTS.md) | 96 effect frames, resolved cues, particles, limits and workbench |

## Engineering and operations

| Guide | Scope |
| --- | --- |
| [Architecture](ARCHITECTURE.md) | Current module ownership and rule/presentation boundary |
| [Architecture decisions](adr/README.md) | Accepted baseline rationale, proposals, template and supersession history |
| [Data and saves](DATA_AND_SAVES.md) | Current serialized records, validation, supported migration and origin limits |
| [Backups and recovery](BACKUPS_AND_RECOVERY.md) | Automatic recovery, manual isolation, portable files and restore flow |
| [Development](DEVELOPMENT.md) | Setup, extension patterns and documentation generation |
| [Testing](TESTING.md) | Current 62-test suite, browser observations, integrity checks and gaps |
| [Deployment](DEPLOYMENT.md) | Actions, Pages subpath, asset verification and permissions |
| [Troubleshooting](TROUBLESHOOTING.md) | Runtime, storage, input and hosting failure recovery |
| [Contributing](../CONTRIBUTING.md) | Scope, evidence, review and provenance requirements |

## Expansion library

| Guide | Planning artifact |
| --- | --- |
| [Master roadmap](ROADMAP.md) | Current baseline, M0–M12 gates, next increments, dependencies and scope envelopes |
| [Roadmap index](roadmap/README.md) | Planning vocabulary and reading paths |
| [Backlog](roadmap/BACKLOG.md) | 160 planned work items in sixteen tracks |
| [Engine and systems](roadmap/ENGINE_AND_SYSTEMS.md) | Proposed maps, rosters, events, objectives, transactions and migrations |
| [Content and campaign](roadmap/CONTENT_PLAN.md) | Twenty-job planning roster, regions, missions, recruits, factions and endings |
| [Art/audio production](roadmap/ART_AUDIO_PRODUCTION.md) | Frame arithmetic, directional pilot, kits, effects, soundtrack and budgets |
| [Release/quality](roadmap/RELEASE_AND_QUALITY.md) | Regression/device/accessibility matrix, balance, risks and release gates |

Proposed job unlocks, regions and content totals are design candidates. Only the current catalog and implementation guides claim shipped behavior.

## Detailed expansion briefs

| Guide | Specific design coverage |
| --- | --- |
| [Production slices](roadmap/PRODUCTION_SLICES.md) | Fixed-assumption audit, next three increments and acceptance scenarios |
| [Decision register](roadmap/DECISION_REGISTER.md) | Open architecture/content choices with options and evidence |
| [Encounters](roadmap/ENCOUNTER_BLUEPRINTS.md) | Six proposed defend/escort/breach/survival/interact/escape missions |
| [Jobs and abilities](roadmap/JOB_ABILITY_BLUEPRINTS.md) | Twelve future job identities and 36 prototype skills |
| [Campaign and quests](roadmap/CAMPAIGN_QUEST_BLUEPRINTS.md) | Chapter choices, convergence, recruit/service settlement and recovery |
| [Technical contracts](roadmap/TECHNICAL_CONTRACTS.md) | Proposed schemas and rule/event/settlement ownership |
| [Planning manifest](roadmap/specs/plan.json) | Machine-readable design references and route combinations |

## Complete game-authoring studio plan

These tools are proposed; the present game remains v0.8.

| Guide | Coverage |
| --- | --- |
| [Studio index](studio/README.md) | Full-editability requirements, artifact guarantees and open decisions |
| [Editor workflows](studio/AUTHORING_WORKFLOWS.md) | Maps, rules, actors, campaign, art, animation, UI, controls and source tools |
| [Music and sound effects](studio/AUDIO_STUDIO.md) | Composition, synthesis, sampling, recording, ambience/voice, mix and cues |
| [Project format](studio/PROJECT_FORMAT.md) | Lossless sources, identities, schemas and complete/play-only export distinctions |
| [Build/export](studio/RUNTIME_BUILD_EXPORT.md) | Shared preview runtime, compilation, launch, packaging and reimport |
| [Automation/extensions](studio/AUTOMATION_AND_EXTENSION_API.md) | Agent/UI/CLI command parity and custom engine/source editing |
| [Tooling roadmap](studio/STUDIO_ROADMAP.md) | Eighty work items across ten studio tracks/gates |
| [Acceptance](studio/ACCEPTANCE_AND_ROUNDTRIP.md) | Thirty-two planned scenarios and full-game golden-project round trip |

The [detailed studio blueprint library](studio/blueprints/README.md) specifies interaction/history, pixel timelines, level/rule inspectors, music/SFX ports/clocks, import/export conformance and six prototype slices, with checked proposal examples.

## Source-of-truth map

| Topic | Source | Maintained reference |
| --- | --- | --- |
| Jobs / skills | [data.ts](../src/data.ts) | [Generated catalog](REFERENCE_CATALOG.md), [jobs](JOBS_AND_ABILITIES.md) |
| Rules / AI | [engine.ts](../src/engine.ts) | [Combat](COMBAT.md), [system flows](SYSTEMS_GUIDE.md) |
| Company / settlement | [campaign.ts](../src/campaign.ts), [Camp.tsx](../src/Camp.tsx) | [Company](COMPANY_AND_PROGRESSION.md) |
| Gear / contracts / supports | [equipment.ts](../src/equipment.ts), [encounters.ts](../src/encounters.ts), [supports.ts](../src/supports.ts) | [Generated catalog](REFERENCE_CATALOG.md) |
| Save decoding / storage | [campaign.ts](../src/campaign.ts), [storage.ts](../src/storage.ts), [portable.ts](../src/portable.ts) | [Data/saves](DATA_AND_SAVES.md), [recovery](BACKUPS_AND_RECOVERY.md) |
| HUD / inputs / file review | [main.tsx](../src/main.tsx), [BackupDialog.tsx](../src/BackupDialog.tsx) | [Player guide](PLAYER_GUIDE.md) |
| Characters / rendering | [scene.ts](../src/scene.ts), [animation.ts](../src/animation.ts), [animation-art.ts](../src/animation-art.ts) | [Animation](ANIMATION_PIPELINE.md) |
| Effects / particles | [combat-effects.ts](../src/combat-effects.ts), [effect-renderer.ts](../src/effect-renderer.ts), [effect-art.ts](../src/effect-art.ts) | [Combat effects](COMBAT_EFFECTS.md) |
| Audio | [audio.ts](../src/audio.ts) | [Art/audio](ART_AND_AUDIO.md) |
| Hosting / asset checks | [workflow](../.github/workflows/pages.yml), [verify-pages](../scripts/verify-pages.mjs) | [Deployment](DEPLOYMENT.md) |
| Documentation integrity | [verify-docs](../scripts/verify-docs.mjs), [catalog generator](../scripts/generate-reference.ts) | [Testing](TESTING.md#documentation-validation) |

## Historical and provenance material

| Resource | Purpose |
| --- | --- |
| [Original project brief](../PROJECT_BRIEF.md) | Preserved initial requirements and long-term ambition |
| [Initial design](../DESIGN.md) | Early design and staged plan; not current implementation certification |
| [Phase 1 validation](../VALIDATION.md) | Historical evidence with its original scope |
| [Changelog](../CHANGELOG.md) | Human-readable shipped changes and pending documentation updates |
| [Character prompts](animation-prompts.json) | Exact generation prompts for the eight current animation sheets |
| [Effect prompts](effect-prompts.json) | Exact generation prompts for the three current VFX sheets |

## Maintaining diagrams and tables

Mermaid blocks render in GitHub's Markdown viewer. Prose and tables state the same critical rules for viewers that cannot display diagrams. No separate diagram service or Figma file is required.

Run npm run docs:catalog when content or art manifests change. Run npm run docs:verify for recursive local links/anchors, tables, fenced diagram structure, backlog identity/dependency checks, catalog freshness, planning-manifest references/routes and ADR metadata/history. The checker deliberately distinguishes structural checks from full Mermaid parsing and from artistic/device review. See [documentation validation](TESTING.md#documentation-validation).

When code and a guide disagree, inspect the implementation and fix the mismatch. Move a proposed feature into the current reference only after it actually works.

The [advanced authoring contracts](studio/specs/advanced-blueprints.json) deepen rules/AI, campaign/economy/UI, VFX/environment, project versioning/merges and toolkit release evidence. Eleven blueprints and ten illustrative examples now form the studio implementation handoff. All editor contracts remain proposed.

[Project validation panel](PROJECT_VALIDATION.md): blocking source checks, advisory map/content findings, record navigation and downloadable diagnostic reports.

[Connectivity overlays and grouped findings](CONNECTIVITY_OVERLAYS.md): derived map overview, matching grid highlights, affected actors and barrier inspection.

[Emberwarden mission pack](EMBER_MISSIONS.md): play the 20 by 16 Ashen Weir and 24 by 18 Cinder Archive with an editable class variant, four abilities, six gear pieces and six enemy templates. Select either in the studio mission library.

[Glass and ash character pack](CHARACTER_CLASS_PACK.md): Tamsin the Glass Ranger, Orris the Ash Cantor, two named rivals, six abilities, dedicated editable 32-frame sheets and The Lantern Parley showcase mission.

[Frostglass Vigil content pack](FROSTGLASS_CONTENT.md): Nera the Frost Sentinel and Joren the Dawn Duelist join Tamsin and Orris in a 22 by 18 mission, with six more abilities, four gear pieces and two editable 32-frame sheets.

[Artwork consistency and editable sources](ARTWORK_SYNC.md): inspect each actor's actual sprite, repair mixed-resolution overrides reversibly, open the matching editor and audit all ten mission sources against compiled content.

[Briar Resonance content pack](BRIAR_CONTENT.md): Rowan the Thorn Warden and Edrin the Resonant Smith, two named rivals, six abilities, five gear pieces, two editable 32-frame sheets and a 24 by 20 standalone mission.

[Content playability and editor audit](CONTENT_READINESS.md): ten validated missions, thirty terminal simulations, 190 executable ability cases, editable effect appearance and particle settings, and measured AI target pruning. The guide lists the remaining visual-editor gaps explicitly.
