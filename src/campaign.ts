import type { RuleCatalog } from "./studio-rules";
import {
  items,
  starterSupplies,
  validateSupplies,
  sellValue,
  type ItemId,
  type SupplyInventory,
} from "./items";
import {
  supports,
  mastered,
  supportCost,
  emptySupports,
  type SupportId,
  type SupportSlot,
} from "./supports";
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
  | "learnedSupport"
  | "supportSlots"
>;
export interface Company {
  members: Member[];
  gold: number;
  inventory: Partial<Record<GearId, number>>;
  supplies?: SupplyInventory;
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
    learnedSupport: u.learnedSupport,
    supportSlots: u.supportSlots,
  });
export const spendableJP = (m: Member, job: JobId) =>
  (m.jp[job] ?? 0) - (m.jpSpent[job] ?? 0);
export const allocated = (c: Company, id: GearId) =>
  c.members.filter((m) => Object.values(m.equipment).includes(id)).length;
export const contractOpen = (
  c: Company,
  id: EncounterId,
  catalog = encounters,
) => !catalog[id].requires || c.completed.includes(catalog[id].requires!);

export function memberUnit(m: Member, rules?: RuleCatalog): Unit {
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
  u.maxHp = unitStats(u, rules).hp;
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
      supplies: starterSupplies(),
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
  if (game.battle.rules) battle.rules = structuredClone(game.battle.rules);
  battle.supplies = structuredClone(game.company.supplies ?? {});
  battle.units = battle.units.map((u) => {
    if (u.team !== "ally") return u;
    const m = next.company.members.find((m) => m.id === u.id)!;
    return {
      ...memberUnit(m, battle.rules),
      x: u.x,
      z: u.z,
      next: u.next,
      facing: u.facing,
    };
  });
  next.company.deployments++;
  next.battle = battle;
  next.stage = "battle";
  return next;
}
export function returnToCamp(
  game: Expedition,
  catalog = encounters,
): Expedition {
  if (game.stage !== "battle" || game.battle.result === "playing") return game;
  const next = structuredClone(game);
  next.company.supplies = structuredClone(
    game.battle.supplies ?? game.company.supplies ?? {},
  );
  next.company.members = next.battle.units
    .filter((u) => u.team === "ally")
    .map(toMember);
  if (game.battle.result === "victory") {
    next.company.gold += catalog[game.battle.encounter].reward;
    next.company.victories++;
    if (!next.company.completed.includes(game.battle.encounter)) {
      const relic = catalog[game.battle.encounter].firstClearRelic;
      if (relic)
        next.company.inventory[relic] = Math.min(
          99,
          (next.company.inventory[relic] ?? 0) + 1,
        );
      next.company.completed.push(game.battle.encounter);
    }
  }
  next.stage = "camp";
  return next;
}
export function retryContract(game: Expedition): Expedition {
  if (game.stage !== "battle") return game;
  // A retry restores the pre-deployment company, so it cannot duplicate earned JP.
  const retry = structuredClone(game);
  retry.company.supplies = structuredClone(
    game.battle.supplies ?? game.company.supplies ?? {},
  );
  return depart({ ...retry, stage: "camp" }, game.battle.encounter);
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
    !unlocked(job, m.jp, game.battle.rules?.jobs) ||
    !(game.battle.rules?.jobs ?? jobs)[job].skills.includes(skill) ||
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
    !unlocked(job, m.jp, game.battle.rules?.jobs) ||
    (secondary !== m.secondary &&
      !unlocked(secondary, m.jp, game.battle.rules?.jobs))
  )
    return game;
  const next = structuredClone(game),
    target = next.company.members.find((m) => m.id === memberId)!;
  target.job = job;
  target.secondary = secondary;
  for (const slot of ["weapon", "armor", "relic"] as const) {
    const item = target.equipment[slot];
    if (item && !canEquip(job, item, game.battle.rules?.gear))
      target.equipment[slot] = null;
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
    (!(game.battle.rules?.gear ?? equipment)[item] ||
      (game.battle.rules?.gear ?? equipment)[item].slot !== slot ||
      !canEquip(m.job, item, game.battle.rules?.gear) ||
      allocated(game.company, item) >= (game.company.inventory[item] ?? 0))
  )
    return game;
  const next = structuredClone(game);
  next.company.members.find((m) => m.id === memberId)!.equipment[slot] = item;
  return next;
}
export function purchase(
  game: Expedition,
  item: GearId,
  quantity = 1,
): Expedition {
  const gear = (game.battle.rules?.gear ?? equipment)[item];
  if (
    game.stage !== "camp" ||
    !gear ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 99 ||
    gear.rewardOnly ||
    game.company.gold < gear.price * quantity ||
    (game.company.inventory[item] ?? 0) + quantity > 99
  )
    return game;
  const next = structuredClone(game);
  next.company.gold -= gear.price * quantity;
  next.company.inventory[item] = (next.company.inventory[item] ?? 0) + quantity;
  return next;
}
export function sellGear(
  game: Expedition,
  id: GearId,
  quantity = 1,
): Expedition {
  const gear = (game.battle.rules?.gear ?? equipment)[id],
    value = gear && sellValue(gear);
  if (
    game.stage !== "camp" ||
    !gear ||
    !value ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 99 ||
    (game.company.inventory[id] ?? 0) - allocated(game.company, id) <
      quantity ||
    !Number.isSafeInteger(game.company.gold + value * quantity)
  )
    return game;
  const next = structuredClone(game);
  next.company.inventory[id] = (next.company.inventory[id] ?? 0) - quantity;
  next.company.gold += value * quantity;
  return next;
}
export function tradeSupply(
  game: Expedition,
  id: ItemId,
  direction: "buy" | "sell",
  quantity = 1,
): Expedition {
  const item = (game.battle.rules?.items ?? items)[id],
    owned = game.company.supplies?.[id] ?? 0;
  if (
    game.stage !== "camp" ||
    !item ||
    !["buy", "sell"].includes(direction) ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 99
  )
    return game;
  const delta =
    direction === "buy" ? -item.price * quantity : sellValue(item) * quantity;
  if (
    direction === "buy"
      ? owned + quantity > 99 || game.company.gold + delta < 0
      : owned < quantity || sellValue(item) <= 0
  )
    return game;
  if (!Number.isSafeInteger(game.company.gold + delta)) return game;
  const next = structuredClone(game);
  next.company.gold += delta;
  next.company.supplies = {
    ...next.company.supplies,
    [id]: owned + (direction === "buy" ? quantity : -quantity),
  };
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
      !Number.isSafeInteger(c.gold) ||
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
          Object.hasOwn(g.battle.rules?.gear ?? equipment, id) &&
          Number.isInteger(n) &&
          n! >= 0 &&
          n! <= 99,
      )
    )
      return false;
    if (c.supplies !== undefined)
      validateSupplies(c.supplies, g.battle.rules?.items ?? items);
    if (
      g.stage === "battle" &&
      Object.entries(g.battle.supplies ?? {}).some(
        ([id, n]) => n! > (c.supplies?.[id as ItemId] ?? 0),
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
      if (g.battle.rules) probe.rules = g.battle.rules;
      probe.units[ids.indexOf(m.id)] = {
        ...memberUnit(m, g.battle.rules),
        x: probe.units[ids.indexOf(m.id)].x,
        z: probe.units[ids.indexOf(m.id)].z,
      };
      if (!validateSave(probe)) return false;
    }
    for (const item of Object.keys(
      g.battle.rules?.gear ?? equipment,
    ) as GearId[])
      if (allocated(c, item) > (c.inventory[item] ?? 0)) return false;
    // A restored battle may have dropped incompatible equipment after a job swap,
    // but it cannot introduce equipment the company did not own at deployment.
    const fieldMembers = g.battle.units.filter((u) => u.team === "ally");
    if (
      fieldMembers.length !== 4 ||
      !ids.every((id) => fieldMembers.some((u) => u.id === id))
    )
      return false;
    for (const item of Object.keys(
      g.battle.rules?.gear ?? equipment,
    ) as GearId[])
      if (
        g.stage === "battle" &&
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
    g.company.supplies = {};
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

export function learnSupport(
  game: Expedition,
  memberId: string,
  id: SupportId,
): Expedition {
  const m = game.company.members.find((m) => m.id === memberId),
    item = supports[id];
  if (
    game.stage !== "camp" ||
    !m ||
    !mastered(m, item.job, game.battle.rules?.jobs) ||
    (m.learnedSupport ?? []).includes(id) ||
    spendableJP(m, item.job) < supportCost
  )
    return game;
  const next = structuredClone(game),
    target = next.company.members.find((m) => m.id === memberId)!;
  target.learnedSupport = [...(target.learnedSupport ?? []), id];
  target.supportSlots ??= emptySupports();
  target.jpSpent[item.job] = (target.jpSpent[item.job] ?? 0) + supportCost;
  return next;
}
export function setSupport(
  game: Expedition,
  memberId: string,
  slot: SupportSlot,
  id: SupportId | null,
): Expedition {
  const m = game.company.members.find((m) => m.id === memberId);
  if (
    game.stage !== "camp" ||
    !m ||
    (id &&
      (!(m.learnedSupport ?? []).includes(id) || supports[id].slot !== slot))
  )
    return game;
  const next = structuredClone(game),
    target = next.company.members.find((m) => m.id === memberId)!;
  target.learnedSupport ??= [];
  target.supportSlots ??= emptySupports();
  target.supportSlots[slot] = id;
  return next;
}
