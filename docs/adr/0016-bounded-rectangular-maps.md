# ADR-0016: Support bounded rectangular maps through optional dimensions

[ADR index](README.md) · [Large-map guide](../LARGE_MAP_STUDIO.md)

- Status: Accepted
- Recorded: 2026-11-22
- Decision date: 2026-11-22
- Origin: New implementation decision
- Supersedes: None
- Superseded by: None

## Context

Level source and battle validation previously required exactly 81 cells. Camera framing, foundations and cursor bounds also assumed 9×9. Changing only the editor grid would produce invalid saves and clipped scenes. Existing effect and sprite world coordinates must stay aligned.

## Decision

Add optional dimensions to level source and battle snapshots, defaulting to 9×9. Validate whole-number sides from 9 through 32 and exact rectangular cell coverage. Resize preserves northwest coordinates; reject actor clipping instead of relocating units silently. Retain eight actor identities. Use dimension-derived camera framing and foundation geometry while preserving x−4/z−4 world coordinates. Cache tile lookups by array identity. Give explicit-dimension source a 512 KiB JSON allowance; native projects retain the existing 8 MiB bound.

## Alternatives considered

| Alternative | Tradeoff |
| --- | --- |
| Change only the CSS columns | Rendering, action saves and movement interfaces disagree |
| Infer arbitrary geometry from maximum coordinates | Missing cells become ambiguous and malformed source can change inferred bounds |
| Center all world coordinates anew | Every particle, sprite and marker needs coordinated transforms; unnecessary migration risk |
| Unbounded maps and rosters immediately | Requires resource budgets, chunking, identity migrations and stronger balance/performance evidence |

## Consequences

Existing sources/saves without dimensions remain 9×9. Larger maps are explicit and bounded, preserve editor history and work in isolated previews. Older builds reject the new field. Default encounters and roster identities remain unchanged. The broader variable-board/roster proposal is still Proposed; this record adopts a narrower implemented rectangular-map slice.

## Evidence and verification

[Map helpers](../../src/map-layout.ts), [source/compiler](../../src/studio-project.ts), [engine/save validation](../../src/engine.ts), [renderer](../../src/scene.ts) and [ten tests](../../src/studio-large-maps.test.ts) exercise geometry, real actions outside old bounds, AI, saves, JSON, history and legacy defaults. Browser acceptance checks maximum-size rendering, editing, region brushes, camera controls and exported-source recovery. Performance measures are bounded implementation choices, not certified frame rates.

## Revisit conditions

Revisit dimensions, limits and format versions when adding smaller maps, irregular geometry, chunk streaming, arbitrary rosters, complete campaign builds or measured device performance requirements.

## Related records

- [ADR-0002](0002-deterministic-simulation-boundary.md)
- [ADR-0010](0010-proposed-variable-board-and-roster-contract.md)
- [ADR-0011](0011-proposed-editable-game-project-and-build-artifacts.md)
- [ADR-0015](0015-scoped-rule-catalogs.md)
