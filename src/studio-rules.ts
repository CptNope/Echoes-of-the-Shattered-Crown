import {
  jobs,
  skills,
  type Job,
  type Skill,
  type JobId,
  type SkillId,
} from "./data";
import { equipment, type Gear, type GearId } from "./equipment";
import {
  items,
  validateItemCatalog,
  type ItemId,
  type SupplyItem,
} from "./items";
export interface RuleCatalog {
  version: 1;
  jobs: Record<JobId, Job>;
  skills: Record<SkillId, Skill>;
  gear: Record<GearId, Gear>;
  items?: Record<ItemId, SupplyItem>;
}
export function gameRules(): RuleCatalog {
  return {
    version: 1,
    jobs: structuredClone(jobs),
    skills: structuredClone(skills),
    gear: structuredClone(equipment),
    items: structuredClone(items),
  };
}
function check(v: unknown, m: string): asserts v {
  if (!v) throw Error(m);
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
function fields(v: object, names: string[]) {
  check(
    Object.keys(v).every((k) => names.includes(k)),
    "Unsupported catalog field.",
  );
}
const integer = (n: unknown, min: number, max: number) =>
  Number.isInteger(n) && Number(n) >= min && Number(n) <= max;
const text = (v: unknown, max: number) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
function identities(
  raw: unknown,
  base: object,
  name: string,
): asserts raw is Record<string, Record<string, unknown>> {
  check(
    object(raw) &&
      Object.keys(raw).length <= (name === "job" ? 48 : 128) &&
      Object.keys(base)
        .filter((k) => !k.startsWith("custom-"))
        .every((k) => Object.hasOwn(raw, k)) &&
      Object.keys(raw).every(
        (k) =>
          (Object.hasOwn(base, k) || /^custom-[a-z][a-z0-9-]{0,39}$/.test(k)) &&
          object(raw[k]),
      ),
    "Keep shipped identities and use bounded custom IDs for new " +
      name +
      " records.",
  );
}
export function validateRules(raw: unknown): RuleCatalog {
  check(object(raw), "Expected a rule catalog.");
  fields(raw, ["version", "jobs", "skills", "gear", "items"]);
  if (raw.items !== undefined) validateItemCatalog(raw.items);
  check(raw.version === 1, "Unsupported rule catalog version.");
  identities(raw.jobs, jobs, "job");
  identities(raw.skills, skills, "ability");
  identities(raw.gear, equipment, "gear");
  for (const [id, s] of Object.entries(raw.skills)) {
    fields(s, [
      "id",
      "name",
      "description",
      "cost",
      "range",
      "power",
      "radius",
      "element",
      "kind",
      "effect",
      "baseSkill",
    ]);
    check(
      s.baseSkill === undefined
        ? Object.hasOwn(skills, id)
        : typeof s.baseSkill === "string" && Object.hasOwn(skills, s.baseSkill),
      "Custom abilities need an existing baseSkill binding.",
    );
    check(
      s.id === id &&
        text(s.name, 80) &&
        text(s.description, 2000) &&
        integer(s.cost, 0, 99) &&
        integer(s.range, 0, 16) &&
        integer(s.power, 0, 250) &&
        integer(s.radius, 0, 4),
      "Invalid ability numbers or text: " + id + ".",
    );
    check(
      ["physical", "fire", "ice", "lightning", "spirit"].includes(
        String(s.element),
      ) &&
        typeof s.element === "string" &&
        ["damage", "heal", "buff"].includes(String(s.kind)) &&
        typeof s.kind === "string",
      "Unknown ability kind or element.",
    );
    check(
      s.effect === undefined ||
        (typeof s.effect === "string" &&
          ["consumeExposure", "aegis", "soak", "delay"].includes(s.effect)),
      "Unknown ability effect.",
    );
    check(
      s.effect === undefined ||
        (s.effect === "aegis" ? s.kind === "buff" : s.kind === "damage"),
      "Ability effect is incompatible with its kind.",
    );
  }
  for (const [id, j] of Object.entries(raw.jobs)) {
    fields(j, [
      "id",
      "name",
      "role",
      "color",
      "move",
      "speed",
      "attack",
      "armor",
      "magic",
      "skills",
      "requires",
      "baseJob",
    ]);
    check(
      j.baseJob === undefined
        ? Object.hasOwn(jobs, id)
        : typeof j.baseJob === "string" && Object.hasOwn(jobs, j.baseJob),
      "Custom classes need an existing baseJob binding.",
    );
    check(
      j.id === id &&
        text(j.name, 80) &&
        text(j.role, 160) &&
        typeof j.color === "string" &&
        /^#[a-f0-9]{6}$/i.test(j.color),
      "Invalid job identity, labels or color.",
    );
    check(
      integer(j.move, 1, 8) &&
        integer(j.speed, 1, 99) &&
        ["attack", "armor", "magic"].every((k) => integer(j[k], 0, 99)),
      "Invalid job stats.",
    );
    check(
      Array.isArray(j.skills) &&
        new Set(j.skills).size === j.skills.length &&
        j.skills.every(
          (s) =>
            typeof s === "string" && Object.hasOwn(raw.skills as object, s),
        ),
      "Job abilities must reference existing unique IDs.",
    );
    check(
      object(j.requires) &&
        Object.entries(j.requires).every(
          ([job, n]) =>
            Object.hasOwn(raw.jobs as object, job) &&
            job !== id &&
            integer(n, 1, 99),
        ),
      "Invalid job prerequisite.",
    );
  }
  const catalogJobs = raw.jobs;
  const visitedJobs = new Set<string>();
  function visit(id: string, trail: Set<string>) {
    if (visitedJobs.has(id)) return;
    check(!trail.has(id), "Job prerequisite cycle.");
    const next = new Set(trail).add(id);
    for (const parent of Object.keys(catalogJobs[id].requires as object))
      visit(parent, next);
    visitedJobs.add(id);
  }
  for (const id of Object.keys(raw.jobs)) visit(id, new Set());
  for (const [id, g] of Object.entries(raw.gear)) {
    fields(g, [
      "id",
      "name",
      "description",
      "slot",
      "price",
      "sellPrice",
      "rewardOnly",
      "jobs",
      "bonuses",
    ]);
    check(
      g.id === id &&
        text(g.name, 80) &&
        text(g.description, 2000) &&
        typeof g.slot === "string" &&
        ["weapon", "armor", "relic"].includes(g.slot) &&
        integer(g.price, 0, 9999) &&
        (g.rewardOnly === undefined || typeof g.rewardOnly === "boolean") &&
        (g.sellPrice === undefined || integer(g.sellPrice, 0, Number(g.price))),
      "Invalid gear fields.",
    );
    check(
      g.jobs === undefined ||
        (Array.isArray(g.jobs) &&
          new Set(g.jobs).size === g.jobs.length &&
          g.jobs.every(
            (j) =>
              typeof j === "string" && Object.hasOwn(raw.jobs as object, j),
          )),
      "Unknown or duplicate gear proficiency.",
    );
    check(object(g.bonuses), "Invalid gear bonuses.");
    fields(g.bonuses, ["attack", "armor", "magic", "speed", "move", "hp"]);
    for (const [stat, n] of Object.entries(g.bonuses))
      check(
        integer(
          n,
          stat === "hp" ? -100 : stat === "move" ? -8 : -99,
          stat === "hp" ? 500 : stat === "move" ? 8 : 99,
        ),
        "Invalid gear " + stat + " bonus.",
      );
  }
  return structuredClone(raw) as unknown as RuleCatalog;
}
