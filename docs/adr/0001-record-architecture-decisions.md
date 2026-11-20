# ADR-0001: Record architecture decisions in the repository

[ADR index](README.md) · [Architecture](../ARCHITECTURE.md)

- Status: Accepted
- Recorded: 2026-11-19
- Decision date: 2026-11-19
- Origin: New documentation convention
- Supersedes: None
- Superseded by: None

## Context

Expansion now spans rules, persistence, content, rendering and delivery. The roadmap contains sixteen open design questions, but a planning recommendation is different from an adopted architectural choice. A durable record should explain why a cross-cutting choice exists and when to revisit it.

## Decision

Maintain numbered Markdown ADRs in docs/adr. Each record captures context, one decision, alternatives, consequences, evidence and revisit conditions. Keep Proposed records distinct from Accepted choices. Supersede an accepted record with a new numbered record when the decision changes materially; retain the old record and reciprocal links.

## Alternatives considered

| Alternative | Tradeoff |
| --- | --- |
| Only commit/PR history | Useful implementation evidence, but rationale is difficult to discover across changes. |
| Only the roadmap decision register | Good for open questions; insufficient as the history of adopted architecture. |
| External decision service | Adds another access and maintenance surface without a present need. |

## Consequences

A contributor can find decisions next to code and link them from designs or reviews. Records need maintenance when choices change. Routine bug fixes, balancing edits and every asset do not require their own ADR; use one for persistent, consequential contracts.

## Evidence and verification

The existing [architecture guide](../ARCHITECTURE.md), [roadmap decision register](../roadmap/DECISION_REGISTER.md) and [contribution guide](../../CONTRIBUTING.md) provide the implementation and planning context. The ADR index and verification script make records discoverable and check basic integrity.

## Revisit conditions

Revisit if numbering, review workflow or record fields become a practical obstacle. Changing these conventions should not rewrite historical context or invent original approval dates.

## Related records

- [ADR-0002](0002-deterministic-simulation-boundary.md)
- [ADR-0010](0010-proposed-variable-board-and-roster-contract.md)

