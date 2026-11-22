# ADR-0014: Adapt existing encounter, material and audio sources into project previews

[ADR index](README.md) · [Coverage audit](../EXISTING_GAME_EDITORS.md)

- Status: Accepted
- Recorded: 2026-11-21
- Decision date: 2026-11-21
- Origin: New implementation decision
- Supersedes: None
- Superseded by: None

## Context

Independent starter sketches are useful for authoring pilots but do not establish editing of shipped game content. The existing game has four encounters, procedural terrain colors, eight current actor identities per encounter, contract prerequisites/rewards and a procedural score. It does not yet have a branching dialogue or neutral-NPC runtime to import.

## Decision

Add optional encounter/content/material/gameAudio fields to level-project v1. Copy map and actor sources from the actual engine; share procedural palette and original score defaults with the renderer/player. Keep current IDs and validate bounded overrides, dialogue speakers and acyclic prerequisites. Compile actors and victory JP into the existing battle path; use existing campaign gate/settlement functions for isolated progression verification. Present source-backed linear briefings before combat. Preserve source through existing atomic edits/history/checkpoints and portable JSON.

## Alternatives considered

| Alternative | Tradeoff |
| --- | --- |
| More unrelated templates | Does not fulfill editing of existing game data |
| Mutate imported global catalogs during preview | Leaks changes between projects and ordinary gameplay |
| Serialize ongoing battle/player saves as authoring source | Mixes depleted resources and transient progression with editable content |
| Claim full quest/NPC/campaign tools from simple forms | Misstates implementation and hides missing runtime contracts |

## Consequences

The current studio now edits meaningful existing data while keeping previews isolated. A project still has one level open and a fixed roster/board, with the contract/dialogue catalog alongside it. Procedural props and formulas remain in code. Pattern sketches, layered SFX and indexed sprites remain distinct from the native game sources. The source/UI coverage audit records the exact boundary instead of marking the full toolkit complete.

## Evidence and verification

[Source adapters](../../src/studio-content.ts), [terrain source](../../src/studio-materials.ts), [audio source](../../src/game-audio.ts), [project compiler](../../src/studio-project.ts) and [ten tests](../../src/studio-existing-data.test.ts) verify source identity, immutable edits, actual runtime behavior and compatible round trips. Native sheet ownership remains defined by ADR-0013.

## Revisit conditions

Introduce a broader canonical game project when multiple editable levels, neutral NPC interactions, branching dialogue/quests, rule catalogs and complete playable exports are implemented. Revisit palette/texture sizes and actor identities through explicit migrations and dependency validation.

## Related records

- [ADR-0002](0002-deterministic-simulation-boundary.md)
- [ADR-0011](0011-proposed-editable-game-project-and-build-artifacts.md)
- [ADR-0013](0013-native-sprite-sources-and-overrides.md)
