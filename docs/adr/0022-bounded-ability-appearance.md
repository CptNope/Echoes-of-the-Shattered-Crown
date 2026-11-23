# ADR-0022: Store bounded ability appearance outside authoritative combat state

- Status: Accepted
- Recorded: 2026-11-22
- Decision date: 2026-11-22
- Origin: New implementation decision
- Supersedes: None
- Superseded by: None

## Context

Custom classes reused existing effect families without independent tint, timing, scale or particles. Duplicating large bitmap atlases for every new ability would increase download size without adding mechanics. Existing cue pairs and project histories must remain readable.

## Decision

Extend an ability cue with an optional strictly bounded style object. Snapshot the resolved recipe when constructing a cosmetic effect plan. Keep mechanics, outcomes, RNG, range and area authoritative in the existing battle state. Use the same style in the atlas preview and production effect renderer. Preserve legacy pairs and reject malformed appearance fields atomically. Version both effect and character resources by content digest.

## Alternatives considered

- Duplicated sheets increase transfer and maintenance costs for cosmetic variations.
- Storing presentation in battle rules couples art edits to combat saves.
- Arbitrary scripts, particle graphs and bitmap painting require broader authoring and packaging contracts.

## Consequences

Every current catalog ability can customize existing atlas appearance and shared sound pairing. Styles remain portable and reversible through the project history. Existing effect pool caps and reduced-motion behavior apply. Direct VFX bitmap editing and sampled audio remain separate source workflows. Older application builds reject the optional style field instead of silently dropping it.

## Evidence and verification

[Readiness guide](../CONTENT_READINESS.md), [schema](../../src/effect-style.ts), [regressions](../../src/content-readiness.test.ts) and [generated playability results](../PLAYABILITY_REPORT.json) cover all ten canonical sources, thirty terminal simulations and 190 isolated ability commands. Local/live Pages verification ties compiled cache revisions to release manifests.

## Revisit conditions

Revisit for custom bitmap clips, arbitrary particle graphs, independently owned audio samples or full campaign packages. New combat mechanics still require explicit engine contracts and tests.

## Related records

[ADR-0021](0021-multiple-native-assets-and-cosmetic-cues.md) defines cue ownership and shared sound banks. [ADR-0005](0005-typed-content-and-stable-identifiers.md) defines typed content identities. [ADR-0020](0020-shared-balanced-mission-presets.md) defines canonical source loading.
