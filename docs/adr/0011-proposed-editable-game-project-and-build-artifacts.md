# ADR-0011: Propose canonical editable projects and complete-game exports

[ADR index](README.md) · [Studio plan](../studio/README.md)

- Status: Proposed
- Recorded: 2026-11-19
- Decision date: Not decided
- Origin: Studio planning proposal
- Supersedes: None
- Superseded by: None

## Context

The planned studio must edit every game-authoring domain and export/import a fully playable result. Current player-save backups, runtime assets and repository builds do not preserve a complete layered/timeline/audio-graph authoring workspace.

## Decision

Proposed direction: use a versioned canonical project with stable IDs, rich source documents, code/extensions and engine/source locks. Compile preview and exported gameplay through the same runtime build pipeline. Default Complete game exports include both a playable web build and the editable project/source payload. Keep project, runtime-only, asset-pack, player-save and source artifacts distinct.

## Alternatives considered

| Alternative | Tradeoff |
| --- | --- |
| Runtime-only ZIP as the only export | Smaller but loses editable layers, notes, SFX graphs and source code. |
| A project file that depends on the original editor cache | Cannot prove independent clean-studio reimport. |
| Separate preview and distribution engines | Can diverge on rules, collisions, audio and rendering. |

## Consequences

If adopted, game handoff supports full editing and reproducible builds, with a larger default artifact and explicit source-distribution review. Runtime-only export remains useful but carries reduced editability guarantees. Project/engine/build/save versions and migrations need separate contracts.

## Evidence and verification

The [studio plan](../studio/README.md), [project/artifact contract](../studio/PROJECT_FORMAT.md), [build pipeline](../studio/RUNTIME_BUILD_EXPORT.md) and [round-trip acceptance](../studio/ACCEPTANCE_AND_ROUNDTRIP.md) define the proposed behavior. SD-01/SD-02/SD-03/SD-05/SD-08 remain open. No editor or new project import is implemented by this record.

## Revisit conditions

Accept only after current-game template equivalence, a cross-domain edit pilot, default complete export, clean-studio reimport/re-edit and supported launch/save compatibility evidence. Revisit artifact membership if sources, engine overrides or required dependencies cannot be reproduced.

## Related records

- [ADR-0002](0002-deterministic-simulation-boundary.md)
- [ADR-0006](0006-local-versioned-saves-and-recovery.md)
- [ADR-0008](0008-art-manifests-and-provenance.md)
- [ADR-0010](0010-proposed-variable-board-and-roster-contract.md)

