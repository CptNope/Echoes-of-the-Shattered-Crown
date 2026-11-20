# ADR-0007: Drive cosmetic feedback from resolved results with bounded resources

[ADR index](README.md) · [Architecture](../ARCHITECTURE.md)

- Status: Accepted
- Recorded: 2026-11-19
- Decision date: Not recorded; reconstructed from current v0.8 implementation
- Origin: Retrospective
- Supersedes: None
- Superseded by: None

This is a retrospective record of the implemented baseline. The alternatives and rationale are present-day analysis, not a transcript of an earlier approval or an invented original date.

## Context

Attack/cast clips, projectile travel and particles need resolved targets and hit/miss facts. Cosmetic timing can outlast the authoritative action and must survive interruption without altering the game.

## Decision

Consume optional resolved action cues for character and effect feedback. Do not replay an old cue on initial load or repeated snapshots. Use shared atlas sources, UV playback and bounded effect pools with explicit teardown. Reduced-motion mode uses stable poses and suppresses moving particle/projectile feedback. Art failures retain procedural fallback behavior.

## Alternatives considered

| Alternative | Tradeoff |
| --- | --- |
| Infer hits from log strings or HP changes alone | Cannot reliably distinguish miss, heal, buff and repeated snapshots. |
| Wait for animation completion before applying damage | Makes rules depend on renderer timing and view lifetime. |
| Create unlimited particles/textures per action/frame | Allows cosmetic load to accumulate without a resource ceiling. |

## Consequences

The current latest-action cue is deliberately limited; it is not an ordered event history for every future reaction/objective. Extreme bursts may recycle older visuals, preserving authoritative outcomes. New effects need fallback, reduced-motion and disposal checks.

## Evidence and verification

[animation.ts](../../src/animation.ts), [scene.ts](../../src/scene.ts), [combat-effects.ts](../../src/combat-effects.ts), [effect-renderer.ts](../../src/effect-renderer.ts) and [combat-effects.test.ts](../../src/combat-effects.test.ts) show the implementation. See [combat effects](../COMBAT_EFFECTS.md).

## Revisit conditions

D-05/VFX-01 propose a deduplicable ordered result batch. Keep that proposal open until multi-event ordering, persistence and consumer cursors are demonstrated.

## Related records

- [ADR-0002](0002-deterministic-simulation-boundary.md)
- [ADR-0008](0008-art-manifests-and-provenance.md)

