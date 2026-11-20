# ADR-0010: Propose shared variable-board and roster contracts

[ADR index](README.md) · [Architecture](../ARCHITECTURE.md)

- Status: Proposed
- Recorded: 2026-11-19
- Decision date: Not decided
- Origin: Roadmap proposal
- Supersedes: None
- Superseded by: None

## Context

Current creation, validation, input and presentation assume 9×9 maps, eight field units and four known companions. The next mission/recruit blueprints need a shared contract rather than selective relaxation of these checks.

## Decision

Proposed direction: define validated map dimensions and roster/deployment identity with explicit simulation order; share bounds and tile-to-world transforms across engine, input, camera and effects. Preserve current fixtures and supported saves before enabling alternate shapes. This record does not select a final schema, roster cap, save version or migration policy.

## Alternatives considered

| Alternative | Tradeoff |
| --- | --- |
| Replace every matching numeric literal | Confuses unrelated damage caps, sampling counts and board dimensions. |
| Relax validators before changing consumers | Can accept states the renderer, input or campaign cannot handle. |
| Add only one special-case larger encounter | Leaves the same cross-module coupling for later missions. |

## Consequences

If accepted, this enables alternate map sizes and recruitment while preserving determinism. It also touches current bounds, coordinate transforms, IDs, validation and migration. No current format or runtime content changes while this ADR remains Proposed.

## Evidence and verification

The [slice audit](../roadmap/PRODUCTION_SLICES.md#slice-a--safe-expansion-seam), [engine plan](../roadmap/ENGINE_AND_SYSTEMS.md), [technical examples](../roadmap/TECHNICAL_CONTRACTS.md) and [decision register](../roadmap/DECISION_REGISTER.md) record the observed assumptions and open D-01/D-02/D-12 questions.

## Revisit conditions

Accept only after those decisions resolve, 9×9 and proposed 12×8 fixtures pass, current/legacy active saves preserve resources/order/seed, and UI/world/effect corner targeting agrees. Update this proposal or create a successor if another model is selected.

## Related records

- [ADR-0002](0002-deterministic-simulation-boundary.md)
- [ADR-0004](0004-separate-company-and-battle-state.md)
- [ADR-0006](0006-local-versioned-saves-and-recovery.md)

