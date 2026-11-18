# Changelog

Changes are grouped by player/developer impact. Dates below use **America/New_York**; GitHub commit timestamps may show the following UTC date. Package version `0.1.0` identifies the initial development baseline; this changelog does not imply a published package, GitHub release or version tag.

## Unreleased

### Documentation

- Expanded the README with a playable link, workflow badge, original battlefield capture, setup commands, feature boundaries, module map and documentation navigation.
- Added player, exact combat, job/ability, architecture, save-format, development, testing, deployment, art/audio, roadmap and troubleshooting guides.
- Added Mermaid state/flow/sequence diagrams, numeric reference tables and contribution guidance.
- Recorded starter-secondary exceptions, primary-only stat rules, manual-save/origin limits, session-only settings, current test boundaries and licensing status.

No combat rules, dependencies or deployment permissions are changed by this documentation update.

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
