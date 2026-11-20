# ADR-0004: Separate persistent company profiles from encounter snapshots

[ADR index](README.md) · [Architecture](../ARCHITECTURE.md)

- Status: Accepted
- Recorded: 2026-11-19
- Decision date: Not recorded; reconstructed from current v0.8 implementation
- Origin: Retrospective
- Supersedes: None
- Superseded by: None

This is a retrospective record of the implemented baseline. The alternatives and rationale are present-day analysis, not a transcript of an earlier approval or an invented original date.

## Context

Builds, inventory and route completion persist between contracts, while coordinates, HP, statuses and readiness belong to an encounter. Retry and settlement require an unambiguous pre-deployment baseline.

## Decision

Store an Expedition containing stage, Company and Battle. Project member profiles into fresh field units on deployment. Keep the company profile as the attempt baseline during combat. Terminal return copies approved field progression and pays campaign rewards; retry redeploys the pre-deployment baseline without settling that attempt.

## Alternatives considered

| Alternative | Tradeoff |
| --- | --- |
| Use the active field units as the only company record | Loses a clear retry baseline and mixes persistent identity with temporary combat state. |
| Copy every battle field into profiles | Carries statuses/readiness into camp and complicates future recruitment. |
| Pay campaign rewards only in presentation callbacks | Risks duplicates or missing settlement after close/reload. |

## Consequences

Recovery includes both baseline and active state. Reward and retry invariants belong to campaign operations. Future reserve rosters, quest state and settlement ledgers must extend this separation rather than bypass it.

## Evidence and verification

[campaign.ts](../../src/campaign.ts) defines Member, Company, Expedition, depart, returnToCamp and retryContract. [campaign.test.ts](../../src/campaign.test.ts) covers progression, retries and settlement. [Data and saves](../DATA_AND_SAVES.md) explains field/profile ownership.

## Revisit conditions

Recruitment, reserves, injuries and alternate objectives need new explicit policies. They do not authorize changing existing retry behavior silently.

## Related records

- [ADR-0002](0002-deterministic-simulation-boundary.md)
- [ADR-0006](0006-local-versioned-saves-and-recovery.md)
- [ADR-0010](0010-proposed-variable-board-and-roster-contract.md)

