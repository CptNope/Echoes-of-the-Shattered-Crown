# ADR-0017: Separate blocking source validation from advisory authoring checks

[ADR index](README.md) · [Validation guide](../PROJECT_VALIDATION.md)

- Status: Accepted
- Recorded: 2026-11-22
- Decision date: 2026-11-22
- Origin: New implementation decision
- Supersedes: None
- Superseded by: None

## Context

Structural validators protect edits and imports, but authors also need explanations for unreachable ground, stranded spawns and ineffective content combinations. A graph disconnected by water is not proof of an impossible mission because ranged and terrain-changing abilities exist. Rejected imports must not contaminate the diagnosis of a different open project.

## Decision

Keep existing whole-document validators and parser budgets authoritative. Add deterministic read-only diagnostics over applied source, compiled-battle validity, static ground components, scoped ability availability and reward compatibility. Schema/runtime/export failures are errors; gameplay heuristics remain warnings. Gate preview on errors and preserve draft guards. Give findings stable IDs, source paths and typed navigation targets, then open the appropriate tile/record without applying an edit. Export reports independently from source. Display rejected-import findings separately and stage valid imports with their own report.

## Alternatives considered

| Alternative | Tradeoff |
| --- | --- |
| Make disconnected ground a hard error | Rejects intentional ranged/freeze/split-deployment maps without proving impossibility |
| Show only the first thrown validation message | Hides affected records and supplies no authoring review workflow |
| Automatically move actors or patch references | Changes source intent and can hide underlying design problems |
| Analyze unsaved drafts as if applied | Makes reports disagree with playtest/export revision and complicates cross-editor ownership |

## Consequences

Authors get actionable diagnostics and explicit boundaries. Warnings permit isolated playtesting; no mission-completion claim follows from a clean report. Source updates recompute counts and resolve findings; filtering does not alter blocking state. Finding navigation is a view change and leaves source/history intact. Larger maps remain bounded by the existing 32-side limit. Diagnostic reports are version 1 artifacts, separate from level-project v1 and player saves.

## Evidence and verification

[Analyzer](../../src/studio-validation.ts), [panel](../../src/ValidationPanel.tsx), [studio integration](../../src/studio.tsx) and [twelve tests](../../src/studio-validation.test.ts) verify actual source/runtime contracts, graph rules, scoped records, budget rejection, import isolation and deterministic round trips. Browser acceptance follows warnings to tiles/actors/abilities, repairs source, exercises rejected imports, downloads reports and reviews responsive layouts.

## Revisit conditions

Revisit when adding draft-wide diagnostics, incremental validation, scripts, variable rosters, branching quests, richer traversal rules or full campaign compilation. A reachability proof needs actual ability/mission semantics before changing warnings into errors.

## Related records

- [ADR-0002](0002-deterministic-simulation-boundary.md)
- [ADR-0011](0011-proposed-editable-game-project-and-build-artifacts.md)
- [ADR-0015](0015-scoped-rule-catalogs.md)
- [ADR-0016](0016-bounded-rectangular-maps.md)
