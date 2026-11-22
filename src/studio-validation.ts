import { jobs, skills, type JobId } from "./data";
import { equipment, canEquip } from "./equipment";
import { encounters } from "./encounters";
import {
  compileLevelProject,
  validateLevelProject,
  exportLevelProject,
  parseLevelProject,
  NATIVE_PROJECT_LIMIT,
} from "./studio-project";
import {
  createBattle,
  availableSkills,
  validateSave,
  type Tile,
} from "./engine";
export type ValidationTarget =
  | { area: "map"; x: number; z: number }
  | {
      area: "content";
      section: "actors" | "dialogue" | "progression";
      id: string;
      line?: string;
    }
  | { area: "rules"; section: "skills" | "jobs" | "gear"; id: string }
  | { area: "project" };
export interface ValidationFocusRequest {
  serial: number;
  target: ValidationTarget;
}
export interface ProjectFinding {
  id: string;
  severity: "error" | "warning";
  title: string;
  detail: string;
  fix: string;
  path: string;
  target: ValidationTarget;
}
export interface ProjectValidation {
  version: 1;
  revision: number | null;
  findings: ProjectFinding[];
  errors: number;
  warnings: number;
  canPlaytest: boolean;
  checks: string[];
}
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const message = (e: unknown) =>
  e instanceof Error ? e.message : "Invalid source.";
export function analyzeProject(raw: unknown): ProjectValidation {
  const findings: ProjectFinding[] = [],
    checks: string[] = [];
  const findingIds = new Set<string>();
  const add = (
    id: string,
    severity: ProjectFinding["severity"],
    title: string,
    detail: string,
    fix: string,
    path: string,
    target: ValidationTarget,
  ) => {
    if (!findingIds.has(id)) {
      findingIds.add(id);
      findings.push({ id, severity, title, detail, fix, path, target });
    }
  };
  const finish = (): ProjectValidation => {
    const ordered = [
      ...findings.filter((f) => f.severity === "error"),
      ...findings.filter((f) => f.severity === "warning"),
    ];
    const errors = ordered.filter((f) => f.severity === "error").length;
    return {
      version: 1,
      revision:
        record(raw) && Number.isInteger(raw.revision)
          ? (raw.revision as number)
          : null,
      findings: ordered,
      errors,
      warnings: ordered.length - errors,
      canPlaytest: errors === 0,
      checks,
    };
  };
  // Collect useful record addresses before the authoritative whole-document validator.
  if (record(raw)) {
    const rules = record(raw.rules) ? raw.rules : null,
      content = record(raw.content) ? raw.content : null;
    const jobCatalog = rules && record(rules.jobs) ? rules.jobs : jobs;
    const skillCatalog = rules && record(rules.skills) ? rules.skills : skills;
    const gearCatalog = rules && record(rules.gear) ? rules.gear : equipment;
    const actorIds = new Set(createBattle().units.map((u) => u.id));
    if (
      Array.isArray(raw.placements) &&
      Array.isArray(raw.tiles) &&
      raw.tiles.length <= 1024
    ) {
      const cells = new Map(
          raw.tiles.filter(record).map((t) => [t.x + "," + t.z, t]),
        ),
        occupied = new Set<string>();
      for (const p of raw.placements.slice(0, 64).filter(record)) {
        const path = `placements.${String(p.id)}`,
          target: ValidationTarget =
            Number.isInteger(p.x) && Number.isInteger(p.z)
              ? { area: "map", x: p.x as number, z: p.z as number }
              : { area: "project" };
        const key = p.x + "," + p.z,
          t = cells.get(key);
        if (!actorIds.has(String(p.id)))
          add(
            "actor-reference:" + path,
            "error",
            "Unknown placed actor",
            `Placement refers to ${String(p.id)}.`,
            "Use one of the eight existing actor identities.",
            path,
            target,
          );
        if (
          !t ||
          t.blocked === true ||
          t.terrain === "water" ||
          occupied.has(key)
        )
          add(
            "placement:" + path,
            "error",
            "Actor needs an open deployment tile",
            `Actor ${String(p.id)} has a missing, blocked, water or overlapping tile.`,
            "Move the actor to a distinct open land or ice tile inside the map.",
            path,
            target,
          );
        occupied.add(key);
      }
    }
    if (content && Array.isArray(content.actors))
      for (const a of content.actors.slice(0, 64).filter(record)) {
        const path = `content.actors.${String(a.id)}`,
          target: ValidationTarget = {
            area: "content",
            section: "actors",
            id: String(a.id),
          };
        for (const field of ["job", "secondary"])
          if (
            typeof a[field] !== "string" ||
            !Object.hasOwn(jobCatalog, a[field] as string)
          )
            add(
              "job-reference:" + path + "." + field,
              "error",
              "Unknown actor job",
              `${String(a.name ?? a.id)} references ${String(a[field])}.`,
              "Choose an existing primary and secondary job.",
              path + "." + field,
              target,
            );
        if (Array.isArray(a.learned))
          for (const id of a.learned.slice(0, 32))
            if (typeof id !== "string" || !Object.hasOwn(skillCatalog, id))
              add(
                "skill-reference:" + path + ":" + String(id),
                "error",
                "Unknown learned ability",
                `${String(a.name ?? a.id)} references ${String(id)}.`,
                "Remove the missing learned ability or choose an existing ability.",
                path + ".learned",
                target,
              );
        if (record(a.equipment))
          for (const slot of ["weapon", "armor", "relic"]) {
            const id = a.equipment[slot];
            if (id === null) continue;
            const gear =
              typeof id === "string"
                ? gearCatalog[id as keyof typeof gearCatalog]
                : null;
            if (
              !record(gear) ||
              gear.slot !== slot ||
              (!Array.isArray(gear.jobs) && gear.jobs !== undefined) ||
              (Array.isArray(gear.jobs) && !gear.jobs.includes(a.job))
            )
              add(
                "equipment:" + path + ":" + slot,
                "error",
                "Incompatible starting equipment",
                `${String(a.name ?? a.id)} cannot use ${String(id)} in the ${slot} slot.`,
                "Unequip this item, choose compatible gear, or change its slot/job restrictions in the catalog.",
                path + ".equipment." + slot,
                target,
              );
          }
      }
    if (content && record(content.dialogue))
      for (const [id, list] of Object.entries(content.dialogue))
        if (Array.isArray(list))
          for (const line of list.slice(0, 32).filter(record))
            if (
              line.speaker !== "narrator" &&
              !actorIds.has(String(line.speaker))
            )
              add(
                "speaker:" + id + ":" + String(line.id),
                "error",
                "Unknown dialogue speaker",
                `Line ${String(line.id)} references ${String(line.speaker)}.`,
                "Choose Narrator or an existing actor for this line.",
                `content.dialogue.${id}.${String(line.id)}`,
                {
                  area: "content",
                  section: "dialogue",
                  id,
                  line: String(line.id),
                },
              );
    if (content && record(content.contracts))
      for (const [id, c] of Object.entries(content.contracts))
        if (record(c)) {
          if (
            c.requires !== null &&
            (typeof c.requires !== "string" ||
              !Object.hasOwn(encounters, c.requires))
          )
            add(
              "contract-reference:" + id,
              "error",
              "Missing prerequisite contract",
              `${String(c.name ?? id)} references ${String(c.requires)}.`,
              "Choose an existing prerequisite contract or None.",
              `content.contracts.${id}.requires`,
              { area: "content", section: "progression", id },
            );
          if (
            c.firstClearRelic !== undefined &&
            (typeof c.firstClearRelic !== "string" ||
              !Object.hasOwn(gearCatalog, c.firstClearRelic))
          )
            add(
              "reward-reference:" + id,
              "error",
              "Missing reward item",
              `${String(c.name ?? id)} references ${String(c.firstClearRelic)}.`,
              "Choose an existing first-clear item or None.",
              `content.contracts.${id}.firstClearRelic`,
              { area: "content", section: "progression", id },
            );
        }
  }
  let project: ReturnType<typeof validateLevelProject>;
  try {
    project = validateLevelProject(raw);
    checks.push("source-schema-and-references");
  } catch (e) {
    // Keep the schema message even when a more precise reference finding was collected.
    add(
      "source-invalid",
      "error",
      "Source failed validation",
      message(e),
      "Correct the indicated source field. Rejected imports do not replace the open project.",
      "project",
      { area: "project" },
    );
    return finish();
  }
  try {
    exportLevelProject(project);
    checks.push("editable-export-budget");
  } catch (e) {
    add(
      "export-budget",
      "error",
      "Project cannot be exported",
      message(e),
      "Reduce dialogue text, animation frames or native pixel edits before playtesting so this revision can be saved and exported.",
      "project",
      { area: "project" },
    );
  }
  const battle = compileLevelProject(project),
    catalog = project.rules?.skills ?? skills,
    jobCatalog = project.rules?.jobs ?? jobs,
    gearCatalog = project.rules?.gear ?? equipment;
  if (!validateSave(battle))
    add(
      "runtime-invalid",
      "error",
      "Compiled battle failed validation",
      "The source compiled to a battle the runtime cannot safely reload.",
      "Review actor resources, equipment and catalog overrides before playtesting.",
      "project",
      { area: "project" },
    );
  else checks.push("compiled-battle");
  // Static ground connectivity: no occupancy, movement budgets, ranged targeting or skill simulation.
  const ground = new Map(
    battle.tiles
      .filter((t) => !t.blocked && t.terrain !== "water")
      .map((t) => [t.x + "," + t.z, t]),
  );
  const region = new Map<string, number>(),
    regions: Tile[][] = [];
  for (const [key, start] of ground) {
    if (region.has(key)) continue;
    const id = regions.length,
      queue = [start];
    region.set(key, id);
    for (let index = 0; index < queue.length; index++) {
      const from = queue[index];
      for (const [dx, dz] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const k = from.x + dx + "," + (from.z + dz),
          to = ground.get(k);
        if (to && !region.has(k) && Math.abs(to.h - from.h) <= 1) {
          region.set(k, id);
          queue.push(to);
        }
      }
    }
    regions.push(queue);
  }
  const allies = battle.units.filter((u) => u.team === "ally"),
    allyRegions = new Set(allies.map((u) => region.get(u.x + "," + u.z))),
    occupiedRegions = new Set(
      battle.units.map((u) => region.get(u.x + "," + u.z)),
    );
  for (const u of battle.units) {
    const id = region.get(u.x + "," + u.z)!,
      target: ValidationTarget = { area: "map", x: u.x, z: u.z };
    if (regions[id].length === 1)
      add(
        "trapped:" + u.id,
        "warning",
        `${u.name} has no ground exit`,
        `The spawn at ${u.x}, ${u.z} has no adjacent open tile within one elevation step.`,
        "Open a neighboring tile, reduce the elevation gap, or move the actor. Ranged abilities may still work.",
        "placements." + u.id,
        target,
      );
    else if (u.team === "enemy" && !allyRegions.has(id))
      add(
        "unreachable:" + u.id,
        "warning",
        `${u.name} is separated from every ally`,
        "No continuous ground route connects this enemy to an allied spawn; the current objective requires defeating all enemies.",
        "Inspect water, collision and elevation barriers. Add a route or verify ranged/terrain-changing abilities in playtest.",
        "placements." + u.id,
        target,
      );
    else if (
      u.team === "ally" &&
      allies.filter((a) => region.get(a.x + "," + a.z) === id).length === 1
    )
      add(
        "isolated:" + u.id,
        "warning",
        `${u.name} starts apart from the company`,
        "No continuous ground route connects this ally to another allied spawn.",
        "Join the regions or confirm that this split deployment is intentional.",
        "placements." + u.id,
        target,
      );
    const list = availableSkills(u, battle.rules);
    const noDamage = !list.some(
      (id) =>
        catalog[id].kind === "damage" &&
        catalog[id].power > 0 &&
        catalog[id].cost <= u.maxMp,
    );
    if (u.team === "ally" && noDamage)
      add(
        "no-offense:" + u.id,
        "warning",
        `${u.name} has no affordable damaging ability`,
        "No available direct-damage ability has positive power and a cost within this actor's maximum energy.",
        "Review the actor's jobs/learning, energy capacity or ability definitions. Reactions and ally support are not simulated by this check.",
        "content.actors." + u.id,
        { area: "content", section: "actors", id: u.id },
      );
    const secondary = jobCatalog[u.secondary].skills;
    const unused = u.learned.filter(
      (id) =>
        !secondary.includes(id) &&
        !jobCatalog[u.job].skills.includes(id) &&
        id !== "strike" &&
        id !== "rally",
    );
    if (unused.length)
      add(
        "inactive-learning:" + u.id,
        "warning",
        `${u.name} has inactive learned abilities`,
        unused.map((id) => catalog[id].name).join(", ") +
          " are not available through the current primary/secondary job pairing.",
        "Choose the matching secondary job or keep these lessons intentionally for a later job change.",
        "content.actors." + u.id + ".learned",
        { area: "content", section: "actors", id: u.id },
      );
  }
  const unused = regions.filter((_, id) => !occupiedRegions.has(id));
  if (unused.length) {
    const at = unused[0][0],
      emptyTileCount = unused.reduce((n, r) => n + r.length, 0);
    add(
      "empty-regions",
      "warning",
      `${unused.length} ground region${unused.length === 1 ? " has" : "s have"} no actor spawn`,
      `${emptyTileCount} open ${emptyTileCount === 1 ? "tile lies" : "tiles lie"} in disconnected regions without a spawn.`,
      "Inspect whether these islands are intentional scenery or need a bridge, elevation step or deployment point.",
      "tiles",
      { area: "map", x: at.x, z: at.z },
    );
  }
  checks.push("static-ground-connectivity");
  for (const sk of Object.values(catalog)) {
    const users = battle.units.filter((u) =>
      availableSkills(u, battle.rules).includes(sk.id),
    );
    const underpowered = users.filter((u) => u.maxMp < sk.cost);
    if (underpowered.length)
      add(
        "energy:" + sk.id,
        "warning",
        `${sk.name} exceeds some actors' energy capacity`,
        underpowered.map((u) => u.name).join(", ") +
          ` cannot pay its ${sk.cost} energy cost even at full energy.`,
        "Lower the ability cost or increase the affected actors' energy capacity; this may be intentional.",
        "rules.skills." + sk.id,
        { area: "rules", section: "skills", id: sk.id },
      );
    if (
      (sk.kind === "damage" || sk.kind === "heal") &&
      sk.power === 0 &&
      !sk.effect
    )
      add(
        "zero-power:" + sk.id,
        "warning",
        `${sk.name} has zero power`,
        "This damage/heal definition has no positive power or named effect. Stats may still contribute to its result.",
        "Review its power, kind and effect in the ability catalog; playtest intentional utility actions.",
        "rules.skills." + sk.id,
        { area: "rules", section: "skills", id: sk.id },
      );
  }
  for (const [id, c] of Object.entries(
    project.content?.contracts ?? encounters,
  ))
    if (c.firstClearRelic) {
      const gear = gearCatalog[c.firstClearRelic];
      if (
        !Object.keys(jobCatalog).some((j) =>
          canEquip(j as JobId, gear.id, gearCatalog),
        )
      )
        add(
          "unusable-reward:" + id,
          "warning",
          `${c.name} rewards unusable gear`,
          `${gear.name} is restricted away from every existing job.`,
          "Allow at least one job for this gear or choose a different first-clear reward.",
          "rules.gear." + gear.id,
          { area: "rules", section: "gear", id: gear.id },
        );
    }
  checks.push("actor-abilities-and-reward-compatibility");
  return finish();
}
/** Same bounded parser used by import; failure reports never become applied source. */
export function analyzeProjectText(text: string): ProjectValidation {
  try {
    return analyzeProject(parseLevelProject(text));
  } catch (e) {
    let report: ProjectValidation | undefined;
    if (new TextEncoder().encode(text).length <= NATIVE_PROJECT_LIMIT)
      try {
        report = analyzeProject(JSON.parse(text));
      } catch {
        /* malformed JSON */
      }
    const finding: ProjectFinding = {
      id: "import-invalid",
      severity: "error",
      title: "Import rejected",
      detail: message(e),
      fix: "Correct the JSON or import a compatible exported level project. The open project is unchanged.",
      path: "project",
      target: { area: "project" },
    };
    const findings = [finding, ...(report?.findings ?? [])];
    return {
      version: 1,
      revision: report?.revision ?? null,
      findings,
      errors: 1 + (report?.errors ?? 0),
      warnings: report?.warnings ?? 0,
      canPlaytest: false,
      checks: report?.checks ?? [],
    };
  }
}
export function exportValidationReport(report: ProjectValidation): string {
  return JSON.stringify(report, null, 2) + "\n";
}
