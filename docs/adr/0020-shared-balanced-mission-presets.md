# ADR-0020: Load canonical balanced missions through one preset factory

- Status: Accepted
- Recorded: 2026-11-22
- Decision date: 2026-11-22
- Origin: New implementation decision
- Supersedes: None
- Superseded by: None

## Context

Greybank had a dedicated loader while original encounter adapters retained authored catalogs. Loading those paths sequentially could mix experimental stats, rewards and dialogue with a different map. Existing battle IDs also carry compatibility and boss-phase meaning.

## Decision

Introduce a shared preset registry and factory for all four originals and Greybank. A typed project edit performs a complete combat/map/content reset while preserving document identity, seed and cosmetic/audio sources. Generate public editable JSON from the same factory. Keep original instance IDs and derive separate template snapshots. Preserve progression and stats; explicitly block three isolated unused scenery corners in the migrated sources. Keep the legacy source adapter distinct and document its retention semantics.

## Alternatives considered

- Retaining arbitrary overrides on every load hides balance assumptions and can leave dangling references.
- Replacing original enemy IDs with template IDs would break identity-sensitive behavior such as Orren's awakening.
- A general campaign-package migration adds ownership and save contracts beyond this compatibility pass.

## Consequences

Loading is explicit and reversible, and fixture parity is testable. Existing JSON and the shipped main campaign remain compatible. Presets are isolated authoring sources, not a multi-mission campaign package. Template edits remain snapshots. This decision does not certify difficulty or guarantee an AI-policy win.

## Evidence and verification

[Mission library](../MISSION_LIBRARY.md) records migration scope, geometry repairs and outcomes. [Factory](../../src/mission-presets.ts) and [ten cases](../../src/mission-presets.test.ts) cover parity, history, fixtures, rewards, terminal saves and the boss phase. The full suite has 202 tests. Original content adapters reuse supplied unit data instead of generating the baseline twice.

## Revisit conditions

Revisit for multiple missions in one project, arbitrary mission identities, carried custom progression, automatic override reconciliation or new boss programs.

## Related records

[ADR-0014](0014-existing-game-source-adapters.md) remains applicable to legacy source adaptation. [ADR-0019](0019-bounded-custom-records-and-enemy-templates.md) defines snapshot templates. [ADR-0011](0011-proposed-editable-game-project-and-build-artifacts.md) remains Proposed for full project packaging.
