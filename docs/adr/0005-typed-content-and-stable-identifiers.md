# ADR-0005: Use typed content records and stable persistent identifiers

[ADR index](README.md) · [Architecture](../ARCHITECTURE.md)

- Status: Accepted
- Recorded: 2026-11-19
- Decision date: Not recorded; reconstructed from current v0.8 implementation
- Origin: Retrospective
- Supersedes: None
- Superseded by: None

This is a retrospective record of the implemented baseline. The alternatives and rationale are present-day analysis, not a transcript of an earlier approval or an invented original date.

## Context

Jobs, skills, supports, gear and contracts are referenced by rules, UI, AI and saved progress. Their display names and descriptions may change independently of identity.

## Decision

Define current content as typed records keyed by stable IDs. Keep native versus learned skill ownership, proficiency and prerequisites in shared data/rule paths. Treat ID changes as persistence changes. Generate the current reference catalog from source and manifests rather than manually maintaining another numeric inventory.

## Alternatives considered

| Alternative | Tradeoff |
| --- | --- |
| Duplicate catalogs/formulas in UI and AI | Allows previews, costs and ownership rules to drift. |
| Use display names as save identifiers | Text edits/localization become compatibility changes. |
| Move immediately to a general content editor | Needs validated import and reference contracts that are still planned. |

## Consequences

Content changes are reviewable and source-derived documentation can detect drift. Type definitions alone do not validate arbitrary future authoring packages or prove balance. Old clients can reject saves containing newly introduced IDs.

## Evidence and verification

[data.ts](../../src/data.ts), [equipment.ts](../../src/equipment.ts), [supports.ts](../../src/supports.ts) and [encounters.ts](../../src/encounters.ts) contain the catalogs. [generate-reference.ts](../../scripts/generate-reference.ts) produces the [reference catalog](../REFERENCE_CATALOG.md).

## Revisit conditions

A future authoring format must validate IDs, graph references and migrations before replacing these records. Preserve stable identity even if content moves out of TypeScript.

## Related records

- [ADR-0004](0004-separate-company-and-battle-state.md)
- [ADR-0008](0008-art-manifests-and-provenance.md)

