# ADR-0023: Separate equipment reservations from consumable battle ledgers

- Status: Accepted
- Recorded: 2026-11-23
- Decision date: 2026-11-23
- Origin: New implementation decision
- Supersedes: None
- Superseded by: None

## Context

The original shop bought equipment but could not sell spare copies or provision consumables. New commerce must preserve equipped copies, unique rewards, catalog overrides and legacy saves. Item usage must survive both defeat and retry without granting a fresh stock allocation.

## Decision

Keep equipment in the existing shared inventory, reserve current company allocations and trade only spare copies. Add bounded optional buybacks no greater than purchase price. Add an optional item catalog and supply quantities to project/company/battle sources. Deploy copies stock into an authoritative battle ledger; explicit item commands spend one copy and one action without skill XP or RNG. Reconcile remaining stock on settlement and retry. Missing legacy supply fields mean empty stock. New companies and canonical Studio sources opt into explicit starter quantities.

Camp snapshots of prior battles do not reserve equipment after a company member has unequipped it; active battles retain ownership checks. The isolated Studio shop trial shares the actual commerce component and pure functions, with no writes to player progress.

## Alternatives considered

- Treating supplies as equipment would mix consumable quantities with slot/proficiency allocation.
- Refilling on retry permits unlimited consumable reuse.
- Migrating old saves with free stock silently changes their economy.
- Unbounded buyback or partial fills complicate accounting and permit profit cycles.

## Consequences

Buying/selling is atomic and camp-only. Items use supported heal, energy, cleanse and revive effects; arbitrary scripts, offensive consumables and enemy stock logic remain outside this implementation. Existing appearance feedback is reused without pretending equipment changes character artwork. Optional new market records do not invalidate old explicit catalogs.

## Evidence and verification

[Shop guide](../SHOP_AND_ITEMS.md), [commerce functions](../../src/campaign.ts), [item schema](../../src/items.ts) and [fourteen regressions](../../src/shop-items.test.ts) cover protected allocations, caps, pricing, immutable transactions, command targeting, stock persistence, legacy sources and portable histories. The [playability report](../PLAYABILITY_REPORT.json) includes sixty real item-command cases across ten canonical sources.

## Revisit conditions

Revisit for vendor stock, reputation pricing, crafting, item-specific bitmap feedback, visible equipment layers, offensive items or linked campaign packages. Such features need explicit state ownership and save contracts.

## Related records

[ADR-0005](0005-typed-content-and-stable-identifiers.md) covers stable IDs; [ADR-0020](0020-shared-balanced-mission-presets.md) defines source ownership; [ADR-0022](0022-bounded-ability-appearance.md) keeps cosmetic presentation outside authoritative combat state.
