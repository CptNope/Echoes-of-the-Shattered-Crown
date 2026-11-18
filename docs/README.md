# Documentation

[Project home](../README.md) · [Play](https://cptnope.github.io/Echoes-of-the-Shattered-Crown/) · [Changelog](../CHANGELOG.md)

These guides describe the current company-foundations implementation. Future work is explicitly labeled. Package version `0.2.0` is a development baseline, not a claim that the full-game brief is complete.

See [company and progression](COMPANY_AND_PROGRESSION.md) for the new 0.2 contract loop, permanent learning and equipment.

## Reading paths

| Goal                | Start here                         | Continue with                                                       |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| Play                | [Player guide](PLAYER_GUIDE.md)    | [Jobs](JOBS_AND_ABILITIES.md), [combat](COMBAT.md)                  |
| Understand the code | [Architecture](ARCHITECTURE.md)    | [Data and saves](DATA_AND_SAVES.md), [development](DEVELOPMENT.md)  |
| Contribute          | [Contributing](../CONTRIBUTING.md) | [Development](DEVELOPMENT.md), [testing](TESTING.md)                |
| Publish             | [Deployment](DEPLOYMENT.md)        | [Troubleshooting](TROUBLESHOOTING.md)                               |
| Create assets       | [Art and audio](ART_AND_AUDIO.md)  | [Architecture](ARCHITECTURE.md), [roadmap](ROADMAP.md)              |
| Review scope        | [Roadmap](ROADMAP.md)              | [Changelog](../CHANGELOG.md), [original brief](../PROJECT_BRIEF.md) |

## Source-of-truth map

| Topic                 | Implementation                                                                    | Reference                                   |
| --------------------- | --------------------------------------------------------------------------------- | ------------------------------------------- |
| Jobs and skills       | [`src/data.ts`](../src/data.ts)                                                   | [Jobs and abilities](JOBS_AND_ABILITIES.md) |
| Rules and AI          | [`src/engine.ts`](../src/engine.ts)                                               | [Combat](COMBAT.md)                         |
| Save persistence      | [`src/storage.ts`](../src/storage.ts), engine `validateSave()`                    | [Data and saves](DATA_AND_SAVES.md)         |
| Inputs and settings   | [`src/main.tsx`](../src/main.tsx)                                                 | [Player guide](PLAYER_GUIDE.md)             |
| Rendering and sprites | [`src/scene.ts`](../src/scene.ts)                                                 | [Art and audio](ART_AND_AUDIO.md)           |
| Sound                 | [`src/audio.ts`](../src/audio.ts)                                                 | [Art and audio](ART_AND_AUDIO.md)           |
| Hosting               | [`vite.config.ts`](../vite.config.ts), [workflow](../.github/workflows/pages.yml) | [Deployment](DEPLOYMENT.md)                 |
| Assertions            | [`src/engine.test.ts`](../src/engine.test.ts)                                     | [Testing](TESTING.md)                       |

If code and a guide disagree, report the mismatch and inspect the implementation before changing either. A roadmap entry is not evidence that a feature exists.

## Historical context

| Document                                | Purpose                                                     |
| --------------------------------------- | ----------------------------------------------------------- |
| [PROJECT_BRIEF.md](../PROJECT_BRIEF.md) | Original requirements, preserved from the initial README    |
| [DESIGN.md](../DESIGN.md)               | Initial design, architecture, art direction and staged plan |
| [VALIDATION.md](../VALIDATION.md)       | Historical Phase 1 verification and limits                  |
| [CHANGELOG.md](../CHANGELOG.md)         | Human-readable repository changes                           |

The guides here are the maintained implementation reference. Historical files retain their early planning context.

## Diagrams

Diagrams use fenced `mermaid` blocks for GitHub's Markdown viewer. Basic flowchart, sequence and state syntax keeps them portable. Tables and prose state the same important rules if your viewer cannot render Mermaid. A separate diagram service is not required.
