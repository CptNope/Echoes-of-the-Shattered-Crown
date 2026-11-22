# ADR-0019: Bind custom records to shipped mechanics and spawn template snapshots

- Status: Accepted
- Recorded: 2026-11-22
- Decision date: 2026-11-22
- Origin: New implementation decision
- Supersedes: None
- Superseded by: None

## Context

The scoped catalog editor could change existing records but could not author a new class, ability or item identity. Fixed enemy identities prevented reusable variants and variable hostile encounters. General scripting and variable company membership would require broader contracts than this iteration.

## Decision

Keep shipped catalog IDs mandatory and allow bounded custom IDs in scoped rules. Require a shipped baseJob/baseSkill for custom class/ability behavior and presentation. Resolve catalog references through explicit runtime context, including save, campaign, combat, AI and render paths. Permit four required heroes plus up to twenty enemies. Store up to thirty-two editable enemy templates, with snapshot spawning and an atomic content/placement project edit. Protect deletion through references and preserve existing source/history boundaries. Use the same helpers to build Saltglass Crossing.

## Alternatives considered

- More shipped literal variants would add content without solving authoring.
- Arbitrary behavior scripts would require sandboxing, versioning and much larger compatibility work.
- Live template inheritance would require override provenance and migration rules; snapshots have explicit ownership.

## Consequences

New identities are editable and playable without mutating global defaults. Existing mechanics and sprite families constrain new content. Stable IDs cannot be renamed in place. Template updates do not rewrite existing actors. Neutral NPCs, new company members and arbitrary contract identities remain outside this decision. Optional version-one fields preserve old inputs in the current runtime; this is not backward compatibility with older builds.

## Evidence and verification

[Authoring guide](../CUSTOM_CONTENT_AUTHORING.md) describes bounds and UI flows. [Authoring helpers](../../src/studio-authoring.ts) and [fifteen tests](../../src/studio-authoring.test.ts) exercise reference safety, atomic edits, scoped runtime behavior, recovery and full deterministic battle settlement. The suite has 181 tests. Scoped validation remains the authoritative import/apply boundary; the authoring report remains derived.

## Revisit conditions

Revisit for arbitrary class passives/formulas, live prefab propagation, variable company membership, neutral actors, content migrations or full project packaging. Split those changes into explicit new decisions before changing ownership or compatibility guarantees.

## Related records

[ADR-0010](0010-proposed-variable-board-and-roster-contract.md) remains Proposed for broader engine contracts. [ADR-0015](0015-scoped-rule-catalogs.md), [ADR-0016](0016-bounded-rectangular-maps.md) and [ADR-0017](0017-authoring-validation-and-navigation.md) remain applicable.
