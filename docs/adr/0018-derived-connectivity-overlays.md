# ADR-0018: Derive grouped connectivity overlays from the current validation report

[ADR index](README.md) · [Overlay guide](../CONNECTIVITY_OVERLAYS.md)

- Status: Accepted
- Recorded: 2026-11-22
- Decision date: 2026-11-22
- Origin: New implementation decision
- Supersedes: None
- Superseded by: None

## Context

Per-enemy connectivity warnings repeat a shared region problem, while jumping to one spawn does not explain the map geometry. Persisting a selected overlay's cells would risk showing stale geometry after edits or undo. Boundary candidates do not prove which terrain change would solve a mission.

## Decision

Extract canonical static connectivity analysis. Group disconnected enemies by component and add derived affected/reference cells, in-bounds adjacent barrier reasons and actor lists to diagnostic findings. Render a read-only full-map overview and matching editable-grid roles. Store selection as a finding ID and resolve it from the current report; clear when no matching finding exists. Keep view selection/geometry out of source and saves. Preserve advisory severity and explicit limitations on causality and repair.

## Alternatives considered

| Alternative | Tradeoff |
| --- | --- |
| Keep one warning per enemy | Repeats the same region problem and hides the shared geometry |
| Merge all disconnected enemies globally | Conflates separate regions and potentially unrelated obstacles |
| Persist selected cell arrays in level source | Adds view-only data and can show stale overlays after map edits |
| Auto-open the first barrier candidate | A wider obstacle or elevation chain may remain; a candidate is not a proven repair |

## Consequences

Authors can inspect the whole map relationship before editing. Canonical coordinate order makes groups, actor lists and geometry deterministic. Group IDs can change when topology changes. One barrier may carry multiple reasons or overlap reference ground; accessible labels retain that detail. Existing project files and gameplay behavior remain compatible. Diagnostic exports gain optional derived geometry without becoming editable project files.

## Evidence and verification

[Connectivity analysis](../../src/studio-connectivity.ts), [overview](../../src/ConnectivityOverlay.tsx), [studio grid integration](../../src/studio.tsx) and [ten tests](../../src/studio-connectivity.test.ts) verify grouping, exact cells, barriers, source isolation, topology refresh, undo, order independence and maximum maps. Browser acceptance checks shared-region lists, matching overview/grid roles, focus navigation, clear/repair/undo, exports and responsive layouts.

## Revisit conditions

Revisit grouping and geometry when adding richer traversal rules, scripted objectives, variable rosters, causal repair analysis, automatic fixes or 3D gameplay overlays. Upgrade report versioning if consumers require incompatible fields rather than optional derived data.

## Related records

- [ADR-0016](0016-bounded-rectangular-maps.md)
- [ADR-0017](0017-authoring-validation-and-navigation.md)
