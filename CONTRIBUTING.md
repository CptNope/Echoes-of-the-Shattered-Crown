# Contributing

Start with the [README](README.md), [architecture](docs/ARCHITECTURE.md), [development guide](docs/DEVELOPMENT.md) and [current roadmap](docs/ROADMAP.md).

## Scope a change

For a bug, describe a reproducible fresh-battle sequence and the expected rule. For expansion work, reference a stable ID from the [160-item backlog](docs/roadmap/BACKLOG.md) or explain a new proposal. For a substantial feature, explain the player path, affected state, save compatibility and milestone it serves before expanding the interface. Do not imply planned systems are implemented just by adding buttons or data names.

| Kind of change  | Expected evidence                                                                 |
| --------------- | --------------------------------------------------------------------------------- |
| Simulation rule | Deterministic regression test and relevant suite results                          |
| Content balance | Reason for the numbers, affected builds and scenario observations                 |
| UI/input        | Working controls, focus/disabled states, desktop and narrow-viewport review       |
| Rendering/audio | Original or properly licensed material, reduced-motion behavior, resource cleanup |
| Persistence     | Format/version decision, invalid-data behavior and recovery checks                |
| Hosting         | Project-subpath build, Pages asset checks and deployment outcome                  |
| Documentation   | Valid links/tables, renderable diagrams and agreement with source                 |

## Local checks

```sh
npm ci
npm run docs:verify
npm test
npm run build
```

For hosting changes, also reproduce the [Pages build](docs/DEPLOYMENT.md#base-path). For presentation changes, use the [browser smoke checklist](docs/TESTING.md#browser-smoke-checklist). The repository has no configured lint script or coverage threshold; do not report a check that was not run.

## Review expectations

Keep engine transitions independent of the DOM and renderer. Preserve the original snapshot on rejected commands, route randomness through the battle seed, and keep previews consistent with resolution. Treat job IDs and state fields as persistence contracts.

Describe the problem and resulting behavior in the PR, then summarize checks and remaining risks. Update relevant reference tables and the Unreleased changelog when behavior changes. Preserve `PROJECT_BRIEF.md` as the original brief rather than silently rewriting its scope.

Do not commit `node_modules/`, `dist/`, private hosting bindings, browser saves, credentials or logs with personal information. Keep required generated lockfile updates when dependency inputs change.

## Ownership

No project-wide license or contributor agreement has been selected. Do not add an arbitrary license or infer reuse permission from dependencies. External assets need documented provenance and terms; see [art and audio](docs/ART_AND_AUDIO.md#ownership-and-licenses).

For source content changes, regenerate docs/REFERENCE_CATALOG.md with npm run docs:catalog. Keep implementation facts in current guides and future proposals in docs/roadmap. Do not mark a gate complete without its stated evidence.

For design-only changes, keep stable blueprint/decision IDs and update docs/roadmap/specs/plan.json. Run npm run docs:plan to check references and route coverage. A recommended option is not an approved rule; record actual decision evidence before changing the implementation reference.
