# Changelog

Changes are grouped by player/developer impact. Dates below use **America/New_York**; GitHub commit timestamps may show the following UTC date. Package version `0.1.0` identifies the initial development baseline; this changelog does not imply a published package, GitHub release or version tag.

## Unreleased

Further milestones are tracked in [the roadmap](docs/ROADMAP.md).

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
