import { createExpedition, type Expedition } from "./campaign";
import type { Battle } from "./engine";
import {
  jobs,
  skills,
  baseJobId,
  baseSkillId,
  type JobId,
  type SkillId,
} from "./data";
import { equipment, type GearId, emptyLoadout } from "./equipment";
import { gameRules, validateRules, type RuleCatalog } from "./studio-rules";
import {
  gameContent,
  validateGameContent,
  type GameContent,
  type ActorSource,
} from "./studio-content";
import type { LevelProject } from "./studio-project";
export type RecordSection = "jobs" | "skills" | "gear";
export function createCatalogRecord(
  source: RuleCatalog,
  section: RecordSection,
  id: string,
  from?: string,
): RuleCatalog {
  if (!/^custom-[a-z][a-z0-9-]{0,39}$/.test(id))
    throw Error(
      "Use custom- followed by a lowercase letter and up to 39 letters, digits or hyphens.",
    );
  if (Object.hasOwn(source[section], id))
    throw Error("This record ID already exists.");
  const baseline =
      section === "jobs"
        ? "vanguard"
        : section === "skills"
          ? "strike"
          : "ironblade",
    origin = from ?? baseline;
  if (!Object.hasOwn(source[section], origin))
    throw Error("Missing copy source.");
  const next = structuredClone(source),
    table = next[section] as Record<string, any>;
  table[id] = {
    ...structuredClone((source[section] as Record<string, any>)[origin]),
    id,
    name:
      (source[section] as Record<string, any>)[origin].name.slice(0, 75) +
      " copy",
  };
  if (section === "jobs")
    table[id].baseJob = baseJobId(origin as JobId, source.jobs);
  if (section === "skills")
    table[id].baseSkill = baseSkillId(origin as SkillId, source.skills);
  return validateRules(next);
}
export function recordReferences(
  rules: RuleCatalog,
  section: RecordSection,
  id: string,
  content?: GameContent,
): string[] {
  const refs: string[] = [];
  for (const j of Object.values(rules.jobs)) {
    if (section === "skills" && j.skills.includes(id as SkillId))
      refs.push("Class: " + j.name);
    if (section === "jobs" && Object.hasOwn(j.requires, id))
      refs.push("Prerequisite: " + j.name);
  }
  for (const g of Object.values(rules.gear))
    if (section === "jobs" && g.jobs?.includes(id as JobId))
      refs.push("Gear proficiency: " + g.name);
  for (const a of [
    ...(content?.actors ?? []),
    ...(content?.enemyTemplates ?? []),
  ])
    if (
      (section === "jobs" && (a.job === id || a.secondary === id)) ||
      (section === "skills" && a.learned.includes(id as SkillId)) ||
      (section === "gear" &&
        a.equipment &&
        Object.values(a.equipment).includes(id as GearId))
    )
      refs.push("Actor/template: " + a.name);
  if (section === "gear")
    for (const c of Object.values(content?.contracts ?? {}))
      if (c.firstClearRelic === id) refs.push("Reward: " + c.name);
  return refs;
}
export function deleteCatalogRecord(
  source: RuleCatalog,
  section: RecordSection,
  id: string,
  content?: GameContent,
) {
  if (!id.startsWith("custom-") || !Object.hasOwn(source[section], id))
    throw Error("Only custom records can be deleted.");
  const refs = recordReferences(source, section, id, content);
  if (refs.length) throw Error("Record is in use: " + refs.join("; "));
  const next = structuredClone(source);
  delete (next[section] as Record<string, unknown>)[id];
  return validateRules(next);
}
export function createEnemyTemplate(
  content: GameContent,
  sourceId: string,
  id: string,
  rules?: RuleCatalog,
): GameContent {
  if (!/^enemy-[a-z][a-z0-9-]{0,55}$/.test(id))
    throw Error(
      "Enemy template IDs must start with enemy- and use lowercase letters, digits or hyphens.",
    );
  const source = [...content.actors, ...(content.enemyTemplates ?? [])].find(
    (a) => a.id === sourceId,
  );
  if (!source) throw Error("Choose an existing actor or template to copy.");
  const next = structuredClone(content);
  next.enemyTemplates ??= [];
  next.enemyTemplates.push({
    ...structuredClone(source),
    id,
    team: "enemy",
    name: source.name.slice(0, 75) + " copy",
  });
  return validateGameContent(next, rules);
}
export function spawnEnemy(
  content: GameContent,
  placements: LevelProject["placements"],
  templateId: string,
  id: string,
  x: number,
  z: number,
  rules?: RuleCatalog,
) {
  const template = content.enemyTemplates?.find((t) => t.id === templateId);
  if (!template) throw Error("Missing enemy template.");
  const next = structuredClone(content);
  next.actors.push({ ...structuredClone(template), id, team: "enemy" });
  return {
    content: validateGameContent(next, rules),
    placements: [...structuredClone(placements), { id, x, z }],
  };
}
export function removeEnemy(
  content: GameContent,
  placements: LevelProject["placements"],
  id: string,
  rules?: RuleCatalog,
) {
  if (["sera", "ilya", "corin", "mae"].includes(id))
    throw Error("Company heroes cannot be removed.");
  const next = structuredClone(content);
  next.actors = next.actors.filter((a) => a.id !== id);
  return {
    content: validateGameContent(next, rules),
    placements: placements.filter((p) => p.id !== id),
  };
}
/** Guided example uses the same create/copy/template helpers as the forms. */
export function buildExpansion(project: LevelProject): LevelProject {
  const p = structuredClone(project);
  let rules = p.rules ?? gameRules();
  const abilityDefs = [
    ["custom-brine-lance", "raincall", "Brine lance", 22, 8, 4],
    ["custom-glacial-chain", "frost", "Glacial chain", 21, 8, 4],
    ["custom-tidal-ward", "aegis", "Tidal ward", 0, 7, 3],
    ["custom-ebb-hour", "delay", "Ebb hour", 16, 9, 4],
  ] as const;
  if (Object.hasOwn(rules.jobs, "custom-tidewarden"))
    throw Error(
      "Expansion IDs already exist. Duplicate/edit the existing records or undo the earlier expansion.",
    );
  for (const [id, from, name, power, cost, range] of abilityDefs) {
    rules = createCatalogRecord(rules, "skills", id, from);
    Object.assign(rules.skills[id], { name, power, cost, range });
  }
  rules = createCatalogRecord(rules, "jobs", "custom-tidewarden", "runewarden");
  Object.assign(rules.jobs["custom-tidewarden"], {
    name: "Tidewarden",
    role: "River control · protective rites",
    move: 4,
    speed: 11,
    attack: 6,
    armor: 8,
    magic: 8,
    skills: abilityDefs.map((a) => a[0]),
    requires: {},
  });
  const gearDefs = [
    [
      "custom-tidal-trident",
      "ironblade",
      "Tidal trident",
      { attack: 3, magic: 6, hp: 10 },
    ],
    [
      "custom-saltglass-coat",
      "leather",
      "Saltglass coat",
      { armor: 3, hp: 18 },
    ],
    [
      "custom-pearl-focus",
      "copperfocus",
      "Pearl focus",
      { magic: 4, speed: 1 },
    ],
    ["custom-breakwater-spear", "ironblade", "Breakwater spear", { attack: 7 }],
    ["custom-rune-mantle", "lamellar", "Rune mantle", { armor: 5, magic: 2 }],
    ["custom-waystone", "wayboots", "Waystone", { move: 1, speed: 1 }],
  ] as const;
  for (const [id, from, name, bonuses] of gearDefs) {
    rules = createCatalogRecord(rules, "gear", id, from);
    Object.assign(rules.gear[id], {
      name,
      bonuses: { ...bonuses },
      price: 90,
      description:
        "Saltglass Crossing equipment. Edit bonuses, price and proficiencies in the gear catalog.",
    });
    delete rules.gear[id].jobs;
  }
  rules.gear["custom-tidal-trident"].jobs = ["custom-tidewarden", "runewarden"];
  let content = structuredClone(p.content ?? gameContent(p.encounter));
  content.enemyTemplates ??= [];
  for (const [id, from, name, job, secondary, health, energy, learned] of [
    [
      "enemy-brineguard",
      "sentinel",
      "Brineguard",
      "custom-tidewarden",
      "vanguard",
      125,
      40,
      ["cleave"],
    ],
    [
      "enemy-rimeweaver",
      "cinder",
      "Rimeweaver",
      "arcanist",
      "custom-tidewarden",
      85,
      64,
      ["custom-brine-lance", "custom-glacial-chain"],
    ],
    [
      "enemy-tide-cantor",
      "cantor",
      "Tide Cantor",
      "chronoweaver",
      "custom-tidewarden",
      92,
      60,
      ["custom-tidal-ward", "custom-ebb-hour"],
    ],
  ] as const) {
    const origin = content.actors.some((a) => a.id === from)
      ? from
      : content.actors[0].id;
    content = createEnemyTemplate(content, origin, id, rules);
    Object.assign(
      content.enemyTemplates!.find((t) => t.id === id)!,
      {
        name,
        job,
        secondary,
        baseHp: health,
        maxMp: energy,
        learned: [...learned],
        equipment: emptyLoadout(),
        jp: { [job]: 0 },
      },
    );
  }
  content.actors = content.actors.filter((a) =>
    ["sera", "ilya", "corin", "mae"].includes(a.id),
  );
  const sera = content.actors.find((a) => a.id === "sera")!;
  sera.job = "custom-tidewarden";
  sera.secondary = "lifebinder";
  sera.learned = ["mend"];
  sera.equipment = {
    weapon: "custom-tidal-trident",
    armor: "custom-saltglass-coat",
    relic: "custom-pearl-focus",
  };
  let placements = [
    { id: "sera", x: 3, z: 4 },
    { id: "ilya", x: 2, z: 5 },
    { id: "corin", x: 3, z: 6 },
    { id: "mae", x: 2, z: 7 },
  ];
  for (const [templateId, x, z] of [
    ["enemy-brineguard", 11, 4],
    ["enemy-rimeweaver", 12, 6],
    ["enemy-tide-cantor", 10, 8],
  ] as const) {
    const result = spawnEnemy(
      content,
      placements,
      templateId,
      templateId + "-1",
      x,
      z,
      rules,
    );
    content = result.content;
    placements = result.placements;
  }
  Object.assign(content.contracts.causeway, {
    name: "The Saltglass Crossing",
    objective: "Defeat the three tidebound defenders.",
    description:
      "The Tidewarden company must cross the broken river road and scatter three specialist defenders.",
  });
  content.dialogue.causeway = [
    {
      id: "saltglass-intro",
      speaker: "narrator",
      text: "The river carries splinters of the shattered crown. A narrow crossing is the only ground route.",
    },
    {
      id: "saltglass-sera",
      speaker: "sera",
      text: "Hold the bridge. Break their formation, then bring everyone across.",
    },
  ];
  p.name = "The Saltglass Crossing";
  p.encounter = "causeway";
  p.dimensions = { width: 16, height: 12 };
  p.tiles = [];
  for (let z = 0; z < 12; z++)
    for (let x = 0; x < 16; x++)
      p.tiles.push({
        x,
        z,
        h: 0,
        blocked: false,
        terrain:
          (x === 7 || x === 8) && !(z === 5 || z === 6)
            ? "water"
            : z === 5 || z === 6
              ? "stone"
              : "grass",
      });
  p.rules = validateRules(rules);
  p.content = validateGameContent(content, p.rules);
  p.placements = placements;
  return p;
}

/** Isolated preview stock owns authored loadouts, without writing player progress. */
export function previewExpedition(battle: Battle): Expedition {
  const game = createExpedition();
  game.stage = "battle";
  game.company.deployments = 1;
  game.battle = structuredClone(battle);
  const counts: Record<string, number> = {};
  for (const u of battle.units.filter((u) => u.team === "ally"))
    for (const id of Object.values(u.equipment))
      if (id) counts[id] = (counts[id] ?? 0) + 1;
  for (const [id, count] of Object.entries(counts))
    game.company.inventory[id as GearId] = Math.max(
      game.company.inventory[id as GearId] ?? 0,
      count,
    );
  return game;
}
