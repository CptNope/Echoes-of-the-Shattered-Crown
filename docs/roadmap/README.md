# Roadmap library

[Master roadmap](../ROADMAP.md) · [Current systems](../SYSTEMS_GUIDE.md) · [Documentation index](../README.md)

Everything proposed here is planned unless explicitly identified as current. There are no delivery dates, staffing assumptions or implied external-service commitments.

| Guide | Purpose | Main artifacts |
| --- | --- | --- |
| [Master roadmap](../ROADMAP.md) | Scope and order | Baseline, M0–M12 gates, dependency graph, next increments |
| [Backlog](BACKLOG.md) | Select concrete work | 160 stable IDs, priorities, dependencies and acceptance evidence |
| [Engine and systems](ENGINE_AND_SYSTEMS.md) | Prepare code changes | Board abstractions, events, objectives and save seams |
| [Content plan](CONTENT_PLAN.md) | World and progression | Twenty jobs, regions, objectives and narrative rules |
| [Art and audio](ART_AUDIO_PRODUCTION.md) | Production planning | Frame arithmetic, asset families, budgets and review gates |
| [Release and quality](RELEASE_AND_QUALITY.md) | Prove completeness | Test matrix, accessibility, balance, risks and rollback |

## Vocabulary

| Label | Meaning |
| --- | --- |
| Current | Evidence exists in v0.8 source and implementation docs |
| Planned | Proposed change, no implementation claim |
| Candidate | Option requiring a decision before scheduling |
| Deferred | Outside the chosen milestone |
| P0 | Blocks safe expansion, integrity or a release gate |
| P1 | Core to the selected player path |
| P2 | Useful after the core path works |
| P3 | Optional or stretch; cut first |
| S / M / L | Relative scope; no conversion to days or staffing |
| Dependency | Finish the prerequisite contract/evidence before relying on it |
| Gate | Demonstrated acceptance condition, not a calendar date |

Select a small set of IDs producing one playable result. Dependencies provide a safe ordering, not a demand to finish every optional feature. Scope cuts update release criteria and guides together.

Use the [contribution guide](../../CONTRIBUTING.md) and [quality plan](RELEASE_AND_QUALITY.md). Proposed schemas are conceptual; current serialized records remain those in [data and saves](../DATA_AND_SAVES.md).

