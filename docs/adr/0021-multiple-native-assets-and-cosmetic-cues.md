# ADR-0021: Store multiple native assignments and cosmetic ability cue pairs

- Status: Accepted
- Recorded: 2026-11-22
- Decision date: 2026-11-22
- Origin: New implementation decision
- Supersedes: None
- Superseded by: None

## Context

One native sheet override could not retain distinct art for several actors. Skill mechanics bases also controlled presentation, preventing an independent cosmetic VFX/sound choice. Checkpoint storage must not duplicate originals for each actor sharing a sheet.

## Decision

Add an optional bounded nativeSprites array, exclusive with the legacy nativeSprite source. Preserve independent actor pixels/timing and share original checkpoint images by digest. Keep portable arrays self-contained with a 32 MiB limit. Add optional scoped abilityCues pairing a shipped VFX family with a shared editable bank event. Pass presentation choices into renderer/audio paths, outside authoritative battle state. Preserve legacy inputs and reject invalid new sources atomically.

## Alternatives considered

- Overwriting the single assignment loses earlier actor edits.
- Changing mechanics bases to obtain a visual also changes special gameplay conventions.
- A general external asset database and arbitrary audio/VFX graphs require ownership, packaging and migration contracts beyond this iteration.

## Consequences

Multiple actors, including custom enemies, can keep distinct edited sheets. Checkpoints share originals while exports may repeat image bytes. Browser quota and decoded/GPU memory remain finite. Cue banks remain shared across abilities. This is project preview authoring, not production campaign publishing or unrestricted sample/VFX editing.

## Evidence and verification

[Asset guide](../ASSET_LIBRARY.md), [source helpers](../../src/studio-assets.ts) and [ten regression cases](../../src/studio-assets.test.ts) document validation, storage, history, legacy migration, custom references and presentation isolation. The full suite has 212 tests. Renderer/audio integration is verified separately in deployed playtests.

## Revisit conditions

Revisit for independently identified external assets, portable image deduplication, per-ability clip storage, sampled audio, VFX painting, multi-track arrangement or full game packages.

## Related records

[ADR-0013](0013-native-sprite-sources-and-overrides.md) preserves original pixels and registration. [ADR-0019](0019-bounded-custom-records-and-enemy-templates.md) defines custom IDs. [ADR-0020](0020-shared-balanced-mission-presets.md) defines preset ownership. [ADR-0012](0012-proposed-shared-music-and-sfx-graphs.md) remains Proposed for broader audio graphs.
