# ADR-0015: Resolve editable catalogs through explicit scoped runtime context

[ADR index](README.md) · [Catalog guide](../RULE_CATALOG_STUDIO.md)

- Status: Accepted
- Recorded: 2026-11-21
- Decision date: 2026-11-21
- Origin: New implementation decision
- Supersedes: None
- Superseded by: None

## Context

Editing forms cannot provide real overrides while command, AI, stats, inventory and learning functions continue reading global module tables. Global mutation would leak one project into other previews and the normal game. Current artwork, saved IDs and fixed mechanics also depend on a bounded known content set.

## Decision

Add an optional project rules catalog for existing job, ability and gear identities. Validate fields, bounds, effect-kind combinations and acyclic job prerequisites. Compile it into an optional battle rules context. Pass that context through stat, availability, command, AI, presentation, purchase, equip, deployment, unlock, training and mastery functions. Normal calls without context use current shipped defaults. Add optional actor loadouts and validate them against the selected catalog before committing.

## Alternatives considered

| Alternative | Tradeoff |
| --- | --- |
| Mutate imported globals during editing | Changes unrelated previews and makes replay/state isolation unreliable |
| Give each UI its own copied damage or price math | Forms and runtime can disagree; AI and saves bypass edits |
| Copy the catalog into every unit | Bloats battle serialization and complicates ownership |
| Add arbitrary string IDs immediately | Requires coordinated migrations, artwork/effect binding, references and variable roster contracts |

## Consequences

A single explicit context supports real data overrides while preserving baseline calls. Player/battle source validation checks optional catalogs and scoped equipment rules. UI labels/targeting and shared campaign functions receive the same definitions. Catalog removal rejects incompatible actor equipment instead of silently losing source. Formula constants and new mechanics remain separate future work, and a complete project-to-game artifact is still required for all editor domains to become a distributable campaign.

## Evidence and verification

[Catalog schema](../../src/studio-rules.ts), [engine](../../src/engine.ts), [campaign](../../src/campaign.ts), [project compiler](../../src/studio-project.ts), [forms](../../src/RulesEditor.tsx) and [tests](../../src/studio-rules.test.ts) implement and verify the current contract. Tests exercise actual commands and AI, gear/economy/learning operations, invalid-source rejection, source isolation and compatible round trips.

## Revisit conditions

Introduce new identity sets, formula languages, support catalogs or a complete game compiler only with explicit migrations, reference/asset validation, runtime parity and round-trip proof. Keep the coverage audit honest about those boundaries.

## Related records

- [ADR-0002](0002-deterministic-simulation-boundary.md)
- [ADR-0011](0011-proposed-editable-game-project-and-build-artifacts.md)
- [ADR-0014](0014-existing-game-source-adapters.md)
