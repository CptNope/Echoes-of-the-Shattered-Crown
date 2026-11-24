# ADR-0024: Store inventory artwork as shipped sources and bounded RGBA patches

- Status: Accepted
- Recorded: 2026-11-23
- Decision date: 2026-11-23
- Origin: New implementation decision
- Supersedes: None
- Superseded by: None

## Context

Equipment and supplies need recognizable artwork, and Studio must edit the same images used by commerce and battle commands. Animated actors already have class-specific sheets whose weapon poses do not support arbitrary equipment swapping.

## Decision

Ship 28 distinct transparent inventory icons with stable record identities. Derive indexed 64px runtime sources from a retained generated master. Optional gear/item icon definitions reference those sources and bounded unique RGBA pixel patches. Use the same resolver in the editor, shop, loadout and supply controls. PNG imports are exact-size, bounded and stored as pixels rather than URLs. Explicit icon sources qualify projects for the existing 8 MiB source budget; legacy limits remain unchanged for sources without art.

## Alternatives considered

- Replacing every battle sheet now would require per-pose alignment across all animation states and actor overrides.
- External image URLs would add network dependencies and mutable source content to portable projects.
- Base64 PNG-only storage would make pixel edits and strict per-pixel validation harder to inspect.

## Consequences

All current gear and supplies have editable inventory illustrations without changing combat/economy behavior. New record IDs have sensible defaults. Older sources need no mutation. PNG import/export supports external art tools. Full actor equipment skins remain a separate animation/art-direction task, and large authored campaign catalogs still respect existing company backup limits.

## Evidence and verification

Seven regressions validate source coverage, atlas hashes, patch bounds/alpha, legacy fallback, source roundtrip and commerce isolation. The full suite has 292 tests.

## Revisit conditions

Revisit when gear needs battle equipment skins, arbitrary icon dimensions, animated inventory artwork or larger campaign source budgets.

## Related records

- [Gear artwork guide](../GEAR_ARTWORK.md)
- [Supply ledgers and trades](0023-supply-ledgers-and-camp-trades.md)
