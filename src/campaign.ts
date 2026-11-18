import { jobs, skills, unlocked, type JobId, type SkillId } from "./data";
import {
  createBattle,
  unitStats,
  validateSave,
  type Battle,
  type Unit,
} from "./engine";
import { encounters, type EncounterId } from "./encounters";
import {
  equipment,
  emptyLoadout,
  canEquip,
  type GearId,
  type GearSlot,
} from "./equipment";

export type Member = Pick<
  Unit,
  | "id"
  | "name"
  | "job"
  | "secondary"
  | "baseHp"
  | "maxMp"
  | "jp"
  | "jpSpent"
  | "learned"
  | "equipment"
>;
export interface Company {
  members: Member[];
  gold: number;
  inventory: Partial<Record<GearId, number>>;
  completed: EncounterId[];
  victories: number;
  deployments: number;
}
export interface Expedition {
  version: 2;
  stage: "camp" | "battle";
  company: Company;
  battle: Battle;
}
export const learningCost = 60;
export const toMember = (u: Unit): Member =>
  structuredClone({
    id: u.id,
    name: u.name,
    job: u.job,
    secondary: u.secondary,
    baseHp: u.baseHp,
    maxMp: u.maxMp,
    jp: u.jp,
    jpSpent: u.jpSpent,
    learned: u.learned,
    equipment: u.equipment,
  });
export const spendableJP = (m: Member, job: JobId) =>
  (m.jp[job] ?? 0) - (m.jpSpent[job] ?? 0);
export const allocated = (c: Company, id: GearId) =>
  c.members.filter((m) => Object.values(m.equipment).includes(id)).length;
export const contractOpen = (c: Company, id: EncounterId) =>
  !encounters[id].requires || c.completed.includes(encounters[id].requires!);

export function memberUnit(m: Member): Unit {
  const u: Unit = {
    ...structuredClone(m),
    team: "ally",
    x: 0,
    z: 0,
    hp: m.baseHp,
    maxHp: m.baseHp,
    mp: m.maxMp,
    next: 0,
    facing: [1, 0],
    guard: false,
    moved: false,
    acted: false,
    status: { burn: 0, slow: 0, exposed: 0, soaked: 0 },
  };
  u.maxHp = unitStats(u).hp;
  u.hp = u.maxHp;
  return u;
}
export function createExpedition(): Expedition {
  const battle = createBattle();
  const members = battle.units.filter((u) => u.team === "ally").map(toMember);
  members.forEach((m, i) => {
    m.equipment = {
      weapon: (
        ["ironblade", "cedarrod", "twinsteel", "willowstaff"] as GearId[]
      )[i],
      armor: "leather",
      relic: null,
    };
  });
  return {
    version: 2,
    stage: "camp",
    battle,
    company: {
      members,
      gold: 140,
      inventory: {
        ironblade: 1,
        cedarrod: 1,
        twinsteel: 1,
        willowstaff: 1,
        leather: 4,
        wayboots: 1,
        copperfocus: 1,
      },
      completed: [],
      victories: 0,
      deployments: 0,
    },
  };
}
export function depart(game: Expedition, id: EncounterId): Expedition {
  if (game.stage !== "camp" || !contractOpen(game.company, id)) return game;
  const next = structuredClone(game),
    battle = createBattle(74319 + game.company.deployments * 97, id);
  battle.units = battle.units.map((u) => {
    if (u.team !== "ally") return u;
    const m = next.company.members.find((m) => m.id === u.id)!;
    return { ...memberUnit(m), x: u.x, z: u.z, next: u.next, facing: u.facing };
  });
  next.company.deployments++;
  next.battle = battle;
  next.stage = "battle";
  return next;
}
export function returnToCamp(game: Expedition): Expedition {
  if (game.stage !== "battle" || game.battle.result === "playing") return game;
  const next = structuredClone(game);
  next.company.members = next.battle.units
    .filter((u) => u.team === "ally")
    .map(toMember);
  if (game.battle.result === "victory") {
    next.company.gold += encounters[game.battle.encounter].reward;
    next.company.victories++;
    if (!next.company.completed.includes(game.battle.encounter))
      next.company.completed.push(game.battle.encounter);
  }
  next.stage = "camp";
  return next;
}
export function retryContract(game: Expedition): Expedition {
  if (game.stage !== "battle") return game;
  // A retry restores the pre-deployment company, so it cannot duplicate earned JP.
  return depart(
    { ...structuredClone(game), stage: "camp" },
    game.battle.encounter,
  );
}
export function train(
  game: Expedition,
  memberId: string,
  job: JobId,
  skill: SkillId,
): Expedition {
  const m = game.company.members.find((m) => m.id === memberId);
  if (
    game.stage !== "camp" ||
    !m ||
    !unlocked(job, m.jp) ||
    !jobs[job].skills.includes(skill) ||
    m.learned.includes(skill) ||
    spendableJP(m, job) < learningCost
  )
    return game;
  const next = structuredClone(game),
    target = next.company.members.find((m) => m.id === memberId)!;
  target.jpSpent[job] = (target.jpSpent[job] ?? 0) + learningCost;
  target.learned.push(skill);
  return next;
}
export function setMemberJob(
  game: Expedition,
  memberId: string,
  job: JobId,
  secondary: JobId,
): Expedition {
  const m = game.company.members.find((m) => m.id === memberId);
  if (
    game.stage !== "camp" ||
    !m ||
    !unlocked(job, m.jp) ||
    (secondary !== m.secondary && !unlocked(secondary, m.jp))
  )
    return game;
  const next = structuredClone(game),
    target = next.company.members.find((m) => m.id === memberId)!;
  target.job = job;
  target.secondary = secondary;
  for (const slot of ["weapon", "armor", "relic"] as const) {
    const item = target.equipment[slot];
    if (item && !canEquip(job, item)) target.equipment[slot] = null;
  }
  return next;
}
export function equip(
  game: Expedition,
  memberId: string,
  slot: GearSlot,
  item: GearId | null,
): Expedition {
  const m = game.company.members.find((m) => m.id === memberId);
  if (game.stage !== "camp" || !m || m.equipment[slot] === item) return game;
  if (
    item &&
    (equipment[item].slot !== slot ||
      !canEquip(m.job, item) ||
      allocated(game.company, item) >= (game.company.inventory[item] ?? 0))
  )
    return game;
  const next = structuredClone(game);
  next.company.members.find((m) => m.id === memberId)!.equipment[slot] = item;
  return next;
}
export function purchase(game: Expedition, item: GearId): Expedition {
  if (
    game.stage !== "camp" ||
    game.company.gold < equipment[item].price ||
    (game.company.inventory[item] ?? 0) >= 99
  )
    return game;
  const next = structuredClone(game);
  next.company.gold -= equipment[item].price;
  next.company.inventory[item] = (next.company.inventory[item] ?? 0) + 1;
  return next;
}

export function validateExpedition(raw: unknown): raw is Expedition {
  try {
    const g = raw as Expedition;
    if (
      !g ||
      g.version !== 2 ||
      !["camp", "battle"].includes(g.stage) ||
      !validateSave(g.battle)
    )
      return false;
    const c = g.company;
    if (
      !c ||
      !Number.isInteger(c.gold) ||
      c.gold < 0 ||
      !Number.isInteger(c.victories) ||
      c.victories < 0 ||
      !Number.isInteger(c.deployments) ||
      c.deployments < c.victories ||
      !Array.isArray(c.completed) ||
      !c.completed.every((id) => Object.hasOwn(encounters, id)) ||
      new Set(c.completed).size !== c.completed.length ||
      !c.inventory ||
      !Object.entries(c.inventory).every(
        ([id, n]) =>
          Object.hasOwn(equipment, id) &&
          Number.isInteger(n) &&
          n! >= 0 &&
          n! <= 99,
      )
    )
      return false;
    if (
      !Array.isArray(c.members) ||
      c.members.length !== 4 ||
      new Set(c.members.map((m) => m.id)).size !== 4
    )
      return false;
    const ids = ["sera", "ilya", "corin", "mae"];
    for (const m of c.members) {
      if (!ids.includes(m.id)) return false;
      const probe = createBattle();
      probe.units[ids.indexOf(m.id)] = {
        ...memberUnit(m),
        x: probe.units[ids.indexOf(m.id)].x,
        z: probe.units[ids.indexOf(m.id)].z,
      };
      if (!validateSave(probe)) return false;
    }
    for (const item of Object.keys(equipment) as GearId[])
      if (allocated(c, item) > (c.inventory[item] ?? 0)) return false;
    // A restored battle may have dropped incompatible equipment after a job swap,
    // but it cannot introduce equipment the company did not own at deployment.
    const fieldMembers = g.battle.units.filter((u) => u.team === "ally");
    if (
      fieldMembers.length !== 4 ||
      !ids.every((id) => fieldMembers.some((u) => u.id === id))
    )
      return false;
    for (const item of Object.keys(equipment) as GearId[])
      if (
        fieldMembers.filter((u) => Object.values(u.equipment).includes(item))
          .length > (c.inventory[item] ?? 0)
      )
        return false;
    return true;
  } catch {
    return false;
  }
}

export function migrateLegacyBattle(raw: unknown): Expedition | null {
  try {
    const battle = structuredClone(raw) as Battle;
    if (
      (raw as { version?: number })?.version !== 1 ||
      !Array.isArray(battle.units)
    )
      return null;
    battle.version = 2;
    battle.encounter = "shrine";
    battle.units.forEach((u) => {
      u.baseHp = u.maxHp;
      u.equipment = emptyLoadout();
      u.jpSpent = {};
      u.learned = [...jobs[u.secondary].skills];
    });
    if (!validateSave(battle)) return null;
    const g = createExpedition();
    g.stage = "battle";
    g.battle = battle;
    g.company.members = battle.units
      .filter((u) => u.team === "ally")
      .map(toMember);
    g.company.deployments = 1;
    return validateExpedition(g) ? g : null;
  } catch {
    return null;
  }
}
export function decodeSave(
  record: unknown,
): { game: Expedition; migrated: boolean } | null {
  if (!record || typeof record !== "object") return null;
  const value = record as { game?: unknown; battle?: unknown };
  if (validateExpedition(value.game))
    return { game: value.game, migrated: false };
  const migrated = migrateLegacyBattle(value.battle);
  return migrated ? { game: migrated, migrated: true } : null;
}
