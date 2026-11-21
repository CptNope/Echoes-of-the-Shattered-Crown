# ADR-0013: Preserve native sprite originals with sparse RGBA overrides

[ADR index](README.md) · [Native editor](../NATIVE_SPRITE_STUDIO.md)

- Status: Accepted
- Recorded: 2026-11-21
- Decision date: 2026-11-21
- Origin: New implementation decision
- Supersedes: None
- Superseded by: None

## Context

The small indexed pilot cannot represent the game's 887 × 1774 character sheets without destroying resolution, colors, partial alpha or half of the existing states. Expanding a button-per-pixel DOM grid to native size would create roughly fifty thousand controls per frame. Embedding repeated image data in every checkpoint would also consume browser quota unnecessarily.

## Decision

Add an optional nativeSprite project source alongside the existing indexed source. Embed the original verified WebP once in portable source, preserve the original atlas and registration, and store exact sparse RGBA replacements without a palette conversion. Use a zoomable canvas with keyboard/coordinate controls, fixed state/frame identities and editable timing. Native mode uses the existing renderer's sheet path, with a scoped actor override. Local primary/backup checkpoints share original bytes by digest; exported projects always embed them.

## Alternatives considered

| Alternative | Tradeoff |
| --- | --- |
| Downsample and quantize into the indexed pilot | Discards the artwork the user requested to edit |
| Replace every source cel with uncompressed RGBA arrays | Large project/history/storage costs even before editing |
| Keep only a path to repository art | Imported projects could change or stop working when the asset changes |
| Mutate bundled character files during browser editing | Static Pages has no filesystem commit path; global art changes also need review |

## Consequences

Native and indexed sources coexist, with native precedence for the same actor. Native source is flattened runtime art, not reconstructed master layers. Sparse edits make ordinary changes compact but can grow large under full-sheet repainting; native JSON has an explicit 8 MiB bound and storage errors preserve the prior source. Cached originals are not automatically purged. Production company saves and original assets remain separate.

## Evidence and verification

[Native source model](../../src/studio-native-sprites.ts), [image loader/compiler](../../src/studio-native-art.ts), [native editor](../../src/NativeSpriteEditor.tsx) and [tests](../../src/studio-native-sprites.test.ts) implement the contract. Tests check every shipped original, rounded frame geometry, all decoded channels, exact edits and alpha, state timing, export/history and checkpoint recovery. Browser integration checks remain necessary for pointer interaction, audition and scene rendering.

## Revisit conditions

Revisit representation/storage when multi-actor projects, full-sheet repainting, layer stacks or batch production assets exceed the explicit source/quota bounds. Add region transforms, new atlas layouts or production-art commits through separate tested contracts.

## Related records

- [ADR-0006](0006-local-versioned-saves-and-recovery.md)
- [ADR-0008](0008-art-manifests-and-provenance.md)
- [ADR-0011](0011-proposed-editable-game-project-and-build-artifacts.md)
