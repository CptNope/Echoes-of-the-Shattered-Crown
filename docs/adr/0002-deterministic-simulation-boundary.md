# ADR-0002: Keep deterministic simulation independent of presentation

[ADR index](README.md) · [Architecture](../ARCHITECTURE.md)

- Status: Accepted
- Recorded: 2026-11-19
- Decision date: Not recorded; reconstructed from current v0.8 implementation
- Origin: Retrospective
- Supersedes: None
- Superseded by: None

This is a retrospective record of the implemented baseline. The alternatives and rationale are present-day analysis, not a transcript of an earlier approval or an invented original date.

## Context

Tactical outcomes must be reproducible for previews, AI, saves and regression cases. Rendering, input devices and audio have variable timing and availability.

## Decision

Keep authoritative command resolution in pure TypeScript battle operations. Legal transitions return a cloned snapshot; illegal or terminal commands return the original state. Route combat randomness through the battle seed. React, Three.js, audio and cosmetic particles consume results and never decide hits, resource spending, rewards or initiative.

## Alternatives considered

| Alternative | Tradeoff |
| --- | --- |
| Resolve gameplay in render callbacks | Couples results to frame rate, view lifetime and animation completion. |
| Separate player and AI rule implementations | Creates divergent legality, cost and damage behavior. |
| Mutable global battle state | Makes rejected actions and replay boundaries harder to verify. |

## Consequences

Rules can be exercised without WebGL and enemy actions use the same command path. Snapshot cloning and deterministic ordering must be maintained as content grows. Particle randomness must remain separate from combat RNG.

## Evidence and verification

[engine.ts](../../src/engine.ts) implements command, preview, seeded RNG and aiTurn. [engine.test.ts](../../src/engine.test.ts) covers deterministic scenarios and rejection; [combat-effects.test.ts](../../src/combat-effects.test.ts) checks that effect cues consume no additional combat rolls. See [system flows](../SYSTEMS_GUIDE.md).

## Revisit conditions

New objectives, reactions, summons or networking must preserve this boundary. A future event stream can describe resolution but must not become an alternate authority.

## Related records

- [ADR-0004](0004-separate-company-and-battle-state.md)
- [ADR-0007](0007-result-driven-bounded-presentation.md)

