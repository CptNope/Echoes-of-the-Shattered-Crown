import type { Battle, Tile, Unit } from "./engine";
import type { ProjectFinding } from "./studio-validation";
export interface OverlayCell {
  x: number;
  z: number;
}
export type BarrierReason = "water" | "collision" | "elevation";
export interface BarrierCell extends OverlayCell {
  reasons: BarrierReason[];
}
export type OverlayActor = Pick<Unit, "id" | "name" | "team" | "x" | "z">;
export interface ConnectivityOverlay {
  affectedCells: OverlayCell[];
  referenceCells: OverlayCell[];
  barriers: BarrierCell[];
  affectedActors: OverlayActor[];
  referenceActors: OverlayActor[];
}
const key = (p: OverlayCell) => p.x + "," + p.z;
const ordered = <T extends OverlayCell>(cells: T[]) =>
  [...cells].sort((a, b) => a.z - b.z || a.x - b.x);
const point = ({ x, z }: OverlayCell): OverlayCell => ({ x, z });
const actor = ({ id, name, team, x, z }: Unit): OverlayActor => ({
  id,
  name,
  team,
  x,
  z,
});
const neighbors = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
/** Operates on a validated compiled battle; no occupancy or ability simulation. */
export function connectivityFindings(battle: Battle): ProjectFinding[] {
  const tiles = ordered(battle.tiles),
    all = new Map(tiles.map((t) => [key(t), t]));
  const ground = new Map(
    tiles
      .filter((t) => !t.blocked && t.terrain !== "water")
      .map((t) => [key(t), t]),
  );
  const region = new Map<string, number>(),
    regions: Tile[][] = [];
  for (const [k, start] of ground) {
    if (region.has(k)) continue;
    const id = regions.length,
      queue = [start];
    region.set(k, id);
    for (let index = 0; index < queue.length; index++) {
      const from = queue[index];
      for (const [dx, dz] of neighbors) {
        const k = from.x + dx + "," + (from.z + dz),
          to = ground.get(k);
        if (to && !region.has(k) && Math.abs(to.h - from.h) <= 1) {
          region.set(k, id);
          queue.push(to);
        }
      }
    }
    regions.push(ordered(queue));
  }
  const units = ordered(battle.units),
    allies = units.filter((u) => u.team === "ally");
  const regionOf = (u: Unit) => region.get(key(u))!;
  const allyRegions = new Set(allies.map(regionOf)),
    occupiedRegions = new Set(units.map(regionOf));
  function overlay(ids: Set<number>, references: Unit[]): ConnectivityOverlay {
    const affected = ordered([...ids].flatMap((id) => regions[id]));
    const referenceIds = new Set(
      references.map(regionOf).filter((id) => !ids.has(id)),
    );
    const barriers = new Map<string, BarrierCell>();
    for (const from of affected)
      for (const [dx, dz] of neighbors) {
        const to = all.get(from.x + dx + "," + (from.z + dz));
        if (!to) continue;
        const reasons: BarrierReason[] = [];
        if (to.terrain === "water") reasons.push("water");
        if (to.blocked) reasons.push("collision");
        if (Math.abs(to.h - from.h) > 1) reasons.push("elevation");
        if (!reasons.length) continue;
        const k = key(to),
          old = barriers.get(k);
        barriers.set(k, {
          ...point(to),
          reasons: [...new Set([...(old?.reasons ?? []), ...reasons])].sort(),
        });
      }
    return {
      affectedCells: affected.map(point),
      referenceCells: ordered(
        [...referenceIds].flatMap((id) => regions[id]),
      ).map(point),
      barriers: ordered([...barriers.values()]),
      affectedActors: units.filter((u) => ids.has(regionOf(u))).map(actor),
      referenceActors: references
        .filter((u) => !ids.has(regionOf(u)))
        .map(actor),
    };
  }
  const findings: ProjectFinding[] = [];
  function add(
    id: string,
    title: string,
    detail: string,
    fix: string,
    regionIds: Set<number>,
    references: Unit[],
    at: OverlayCell,
    path: string,
  ) {
    findings.push({
      id,
      severity: "warning",
      title,
      detail,
      fix,
      path,
      target: { area: "map", ...point(at) },
      mapOverlay: overlay(regionIds, references),
    });
  }
  for (let id = 0; id < regions.length; id++) {
    const cells = regions[id],
      members = units.filter((u) => regionOf(u) === id),
      first = members[0],
      set = new Set([id]),
      anchor = key(cells[0]);
    if (!first) continue;
    if (cells.length === 1) {
      add(
        "trapped:" + first.id,
        `${first.name} has no ground exit`,
        `The spawn at ${first.x}, ${first.z} has no adjacent open tile within one elevation step.`,
        "Inspect the marked barrier edges. Open a neighboring tile, reduce the elevation gap, or move the actor. Ranged abilities may still work.",
        set,
        allies.filter((u) => u.id !== first.id),
        first,
        "placements." + first.id,
      );
    } else if (!allyRegions.has(id)) {
      const enemies = members.filter((u) => u.team === "enemy");
      if (!enemies.length) continue;
      add(
        "disconnected-enemies:" + anchor,
        `${enemies.length} ${enemies.length === 1 ? "enemy occupies" : "enemies share"} a separated ground region`,
        `${enemies.map((u) => u.name).join(", ")} ${enemies.length === 1 ? "has" : "have"} no continuous ground route from any allied spawn. This groups actors in the same region; it does not identify a single causal obstacle.`,
        "Inspect the affected and allied ground plus adjacent water, collision and elevation edges. Add a route or verify ranged/terrain-changing abilities in playtest.",
        set,
        allies,
        enemies[0],
        "tiles",
      );
    } else {
      const localAllies = members.filter((u) => u.team === "ally");
      if (localAllies.length === 1 && allies.length > 1) {
        const u = localAllies[0];
        add(
          "isolated:" + u.id,
          `${u.name} starts apart from the company`,
          "No continuous ground route connects this ally to another allied spawn.",
          "Inspect both ground regions. Join them or confirm that split deployment is intentional.",
          set,
          allies.filter((a) => a.id !== u.id),
          u,
          "placements." + u.id,
        );
      }
    }
  }
  const unused = regions
    .map((_, id) => id)
    .filter((id) => !occupiedRegions.has(id));
  if (unused.length) {
    const n = unused.reduce((sum, id) => sum + regions[id].length, 0),
      at = regions[unused[0]][0];
    add(
      "empty-regions",
      `${unused.length} ground region${unused.length === 1 ? " has" : "s have"} no actor spawn`,
      `${n} open ${n === 1 ? "tile lies" : "tiles lie"} in disconnected regions without a spawn.`,
      "Inspect the marked islands and their surrounding barrier edges. Keep intentional scenery, or add a route/deployment point.",
      new Set(unused),
      units,
      at,
      "tiles",
    );
  }
  return findings;
}
/** Resolve from the current report only; never retain geometry from an older revision. */
export function activeConnectivityFinding(
  findings: ProjectFinding[],
  id: string | null,
): ProjectFinding | undefined {
  return id ? findings.find((f) => f.id === id && f.mapOverlay) : undefined;
}
export interface OverlayCellInfo {
  affected: boolean;
  reference: boolean;
  reasons: BarrierReason[];
  role: string;
  description: string;
}
export function overlayCellIndex(
  overlay?: ConnectivityOverlay,
): Map<string, OverlayCellInfo> {
  const index = new Map<string, OverlayCellInfo>();
  const entry = (p: OverlayCell) => {
    const k = key(p);
    let info = index.get(k);
    if (!info) {
      info = {
        affected: false,
        reference: false,
        reasons: [],
        role: "",
        description: "",
      };
      index.set(k, info);
    }
    return info;
  };
  for (const p of overlay?.affectedCells ?? []) entry(p).affected = true;
  for (const p of overlay?.referenceCells ?? []) entry(p).reference = true;
  for (const p of overlay?.barriers ?? []) entry(p).reasons = [...p.reasons];
  for (const info of index.values()) {
    info.role = info.reasons.length
      ? "barrier"
      : info.affected
        ? "affected"
        : "reference";
    info.description = [
      info.affected ? "affected ground" : "",
      info.reference ? "reference ground" : "",
      info.reasons.length ? "barrier edge: " + info.reasons.join(" and ") : "",
    ]
      .filter(Boolean)
      .join("; ");
  }
  return index;
}
