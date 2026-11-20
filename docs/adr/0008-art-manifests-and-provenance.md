# ADR-0008: Ship processed art with manifests, provenance and reproducible checks

[ADR index](README.md) · [Architecture](../ARCHITECTURE.md)

- Status: Accepted
- Recorded: 2026-11-19
- Decision date: Not recorded; reconstructed from current v0.8 implementation
- Origin: Retrospective
- Supersedes: None
- Superseded by: None

This is a retrospective record of the implemented baseline. The alternatives and rationale are present-day analysis, not a transcript of an earlier approval or an invented original date.

## Context

Large animation/effect sheets need stable registration, layout and loading paths. A correct file format alone does not prove frame coverage, identity or artistic quality.

## Decision

Preserve generated source masters and exact prompts/provenance separately from optimized runtime art. Commit runtime WebP files with matching dimensions, layout, source/runtime hashes and per-cell metadata. Use reproducible processing scripts and validate both built and deployed assets. Review artwork directly at game scale in addition to checksum checks.

## Alternatives considered

| Alternative | Tradeoff |
| --- | --- |
| Only commit an opaque image with hard-coded layout | Makes accidental replacement and mismatched registration difficult to detect. |
| Load images from a generation service during play | Adds availability/cost/version concerns to ordinary runtime loading. |
| Treat matching hashes as visual approval | Confirms byte identity, not readability or coherent animation. |

## Consequences

Source and runtime contracts remain traceable, while lazy/cached loading and fallback keep gameplay independent of generation. Adding directions, jobs or new formats requires explicit loader/manifest/verifier changes and measured budgets. Provenance does not itself choose a repository license.

## Evidence and verification

[build-animation-art.mjs](../../scripts/build-animation-art.mjs), [build-effect-art.mjs](../../scripts/build-effect-art.mjs), [verify-animation-art.mjs](../../scripts/verify-animation-art.mjs), [verify-effect-art.mjs](../../scripts/verify-effect-art.mjs) and the [animation](../ANIMATION_PIPELINE.md)/[effects](../COMBAT_EFFECTS.md) guides define current processing.

## Revisit conditions

D-14/D-15 cover directional pilot and budgets. Change packing/compression only with registration, visual-quality, memory and deployment evidence.

## Related records

- [ADR-0005](0005-typed-content-and-stable-identifiers.md)
- [ADR-0007](0007-result-driven-bounded-presentation.md)
- [ADR-0009](0009-publish-static-builds-through-actions.md)

