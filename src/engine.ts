import { validateRules, type RuleCatalog } from "./studio-rules";
import {
  supportBonuses,
  hasSupport,
  validSupports,
  type SupportId,
  type SupportSlots,
} from "./supports";
import {
  jobs,
  skills,
  type JobId,
  type SkillId,
  type Skill,
  jobLevel,
  unlocked,
} from "./data";
import {
  equipment,
  emptyLoadout,
  gearBonuses,
  canEquip,
  type Loadout,
} from "./equipment";
import { encounters, encounterOpening, type EncounterId } from "./encounters";
export interface Tile {
  x: number;
  z: number;
  h: number;
  terrain: "grass" | "stone" | "water" | "ice";
  blocked: boolean;
  burn: number;
}
export interface Unit {
  id: string;
  name: string;
  job: JobId;
  secondary: JobId;
  team: "ally" | "enemy";
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  baseHp: number;
  equipment: Loadout;
  learned: SkillId[];
  jpSpent: Partial<Record<JobId, number>>;
  learnedSupport?: SupportId[];
  supportSlots?: SupportSlots;
  mp: number;
  maxMp: number;
  next: number;
  facing: [number, number];
  guard: boolean;
  moved: boolean;
  acted: boolean;
  status: { burn: number; slow: number; exposed: number; soaked: number };
  jp: Partial<Record<JobId, number>>;
}
export interface Battle {
  version: 2;
  encounter: EncounterId;
  seed: number;
  tiles: Tile[];
  units: Unit[];
  active: string;
  turn: number;
  momentum: number;
  result: "playing" | "victory" | "defeat";
  log: string[];
  rewarded: boolean;
  victoryJP?: number;
  rules?: RuleCatalog;
  bossAwakened?: boolean;
  lastAction?: {
    unit: string;
    skill: SkillId;
    turn: number;
    target?: { x: number; z: number };
    outcomes?: { unit: string; result: "hit" | "miss" | "heal" | "buff" }[];
  };
}
export type Command =
  | { type: "move"; x: number; z: number }
  | { type: "skill"; skill: SkillId; x: number; z: number }
  | { type: "end" };
export const key = (x: number, z: number) => `${x},${z}`;
export const distance = (
  a: { x: number; z: number },
  b: { x: number; z: number },
) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
export const tileAt = (s: Battle, x: number, z: number) =>
  s.tiles.find((t) => t.x === x && t.z === z);
export const activeUnit = (s: Battle) =>
  s.units.find((u) => u.id === s.active)!;
export const living = (s: Battle) => s.units.filter((u) => u.hp > 0);
export function unitStats(u: Unit, rules?: RuleCatalog) {
  const j = (rules?.jobs ?? jobs)[u.job],
    b = gearBonuses(u.equipment, rules?.gear),
    p = supportBonuses(u);
  return {
    move: Math.max(1, j.move + b.move + p.move),
    speed: Math.max(1, j.speed + b.speed + p.speed),
    attack: Math.max(0, j.attack + b.attack + p.attack),
    armor: Math.max(0, j.armor + b.armor + p.armor),
    magic: Math.max(0, j.magic + b.magic + p.magic),
    hp: Math.max(1, u.baseHp + b.hp + p.hp),
  };
}
export function createBattle(
  seed = 74319,
  encounter: EncounterId = "shrine",
): Battle {
  const tiles: Tile[] = [];
  for (let z = 0; z < 9; z++)
    for (let x = 0; x < 9; x++) {
      const water = x === 4 && z !== 4 && z !== 5;
      const h = water ? 0 : x >= 6 && z <= 5 ? 2 : x >= 5 || z <= 1 ? 1 : 0;
      tiles.push({
        x,
        z,
        h,
        terrain: water
          ? "water"
          : z === 4 || z === 5 || (x >= 6 && z < 5)
            ? "stone"
            : "grass",
        blocked: [
          [0, 1],
          [1, 1],
          [8, 0],
          [8, 7],
          [7, 8],
          [0, 7],
          [2, 2],
          [6, 0],
        ].some((p) => p[0] === x && p[1] === z),
        burn: 0,
      });
    }
  const make = (
    id: string,
    name: string,
    job: JobId,
    team: Unit["team"],
    x: number,
    z: number,
    hp: number,
    next: number,
  ): Unit => ({
    id,
    name,
    job,
    secondary:
      job === "vanguard"
        ? "lifebinder"
        : job === "arcanist"
          ? "stormherald"
          : job === "dancer"
            ? "vanguard"
            : "arcanist",
    team,
    x,
    z,
    hp,
    maxHp: hp,
    baseHp: hp,
    equipment: emptyLoadout(),
    learned: [
      ...jobs[
        job === "vanguard"
          ? "lifebinder"
          : job === "arcanist"
            ? "stormherald"
            : job === "dancer"
              ? "vanguard"
              : "arcanist"
      ].skills,
    ],
    jpSpent: {},
    mp: 32,
    maxMp: 32,
    next,
    facing: team === "ally" ? [1, 0] : [-1, 0],
    guard: false,
    moved: false,
    acted: false,
    status: { burn: 0, slow: 0, exposed: 0, soaked: 0 },
    jp: { [job]: 0 },
  });
  const units = [
    make("sera", "Sera Vale", "vanguard", "ally", 2, 5, 112, 0),
    make("ilya", "Ilya Wren", "arcanist", "ally", 1, 4, 78, 8),
    make("corin", "Corin Ash", "dancer", "ally", 2, 6, 88, 4),
    make("mae", "Maelis Reed", "lifebinder", "ally", 1, 6, 84, 12),
    make("sentinel", "Oathless captain", "vanguard", "enemy", 6, 4, 100, 16),
    make("cinder", "Cinder acolyte", "arcanist", "enemy", 7, 2, 70, 20),
    make("wraith", "Hollow outrider", "dancer", "enemy", 6, 6, 74, 24),
    make("cantor", "Ash cantor", "lifebinder", "enemy", 7, 4, 72, 28),
  ];
  if (encounter !== "shrine") {
    // Keep the 9x9 region readable while changing routes, cover and opposition.
    for (const t of tiles) {
      if (t.x === 4) {
        t.terrain =
          t.z === (encounter === "causeway" ? 3 : 5) ? "stone" : "water";
        t.h = 0;
      }
      if (t.x === 5 && t.z >= 2 && t.z <= 6) {
        t.h = 1;
        t.terrain = "stone";
      }
      if (t.x === 2 && t.z === 2) t.blocked = false;
    }
    if (encounter === "causeway") {
      units[4].job = "dancer";
      units[4].secondary = "vanguard";
      units[4].learned = ["cleave"];
      units[4].name = "River outrider";
      units[4].x = 6;
      units[4].z = 3;
      units[6].x = 5;
      units[6].z = 6;
    } else {
      const roles: JobId[] = [
        "runewarden",
        "stormherald",
        "shadowrunner",
        "chronoweaver",
      ];
      units.slice(4).forEach((u, i) => {
        u.job = roles[i];
        u.hp = u.maxHp = u.baseHp += i === 0 ? 24 : 6;
      });
      units[4].name = "Warden of the broken oath";
      units[4].x = 6;
      units[4].z = 5;
    }
  }
  if (encounter === "bellkeeper") {
    for (const t of tiles) {
      t.terrain =
        (t.x >= 3 && t.z >= 2 && t.z <= 6) || t.z === 4 ? "stone" : "grass";
      t.h = t.x >= 5 ? 1 : 0;
      t.blocked = [
        [0, 1],
        [0, 7],
        [8, 0],
        [8, 8],
        [3, 2],
        [3, 6],
        [6, 1],
        [6, 7],
      ].some(([x, z]) => t.x === x && t.z === z);
    }
    units[4].name = "Orren, Bellkeeper";
    units[4].job = "runewarden";
    units[4].secondary = "chronoweaver";
    units[4].learned = ["haste"];
    units[4].hp = units[4].maxHp = units[4].baseHp = 168;
    units[4].x = 7;
    units[4].z = 4;
    units[4].mp = units[4].maxMp = 48;
    units[5].name = "Bellstorm adept";
    units[5].x = 6;
    units[5].z = 2;
    units[6].name = "Silent blade";
    units[6].x = 5;
    units[6].z = 5;
    units[7].name = "Keeper of hours";
    units[7].x = 7;
    units[7].z = 6;
  }
  return {
    version: 2,
    encounter,
    seed,
    tiles,
    units,
    active: "sera",
    turn: 1,
    momentum: 0,
    result: "playing",
    log: [
      `${encounters[encounter].name}: ${encounters[encounter].objective}.`,
      `Sera: “${encounterOpening.text}”`,
    ],
    rewarded: false,
  };
}
export function reachable(s: Battle, u: Unit): Map<string, number> {
  const costs = new Map<string, number>([[key(u.x, u.z), 0]]);
  const open = [{ x: u.x, z: u.z }];
  if (u.moved || u.hp <= 0) return costs;
  while (open.length) {
    open.sort((a, b) => costs.get(key(a.x, a.z))! - costs.get(key(b.x, b.z))!);
    const p = open.shift()!,
      from = tileAt(s, p.x, p.z)!;
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const t = tileAt(s, p.x + dx, p.z + dz);
      if (
        !t ||
        t.blocked ||
        t.terrain === "water" ||
        Math.abs(t.h - from.h) > 1 ||
        s.units.some((v) => v.id !== u.id && v.x === t.x && v.z === t.z)
      )
        continue;
      const c = costs.get(key(p.x, p.z))! + 1 + (t.h > from.h ? 1 : 0);
      if (
        c <= unitStats(u, s.rules).move &&
        (costs.get(key(t.x, t.z)) ?? Infinity) > c
      ) {
        costs.set(key(t.x, t.z), c);
        open.push(t);
      }
    }
  }
  return costs;
}
export function lineOfSight(
  s: Battle,
  a: { x: number; z: number },
  b: { x: number; z: number },
): boolean {
  const n = Math.max(Math.abs(b.x - a.x), Math.abs(b.z - a.z));
  const ah = tileAt(s, a.x, a.z)!.h + 1,
    bh = tileAt(s, b.x, b.z)!.h + 1;
  for (let i = 1; i < n; i++) {
    const f = i / n,
      t = tileAt(
        s,
        Math.round(a.x + (b.x - a.x) * f),
        Math.round(a.z + (b.z - a.z) * f),
      );
    if (t && (t.blocked || t.h > ah + (bh - ah) * f)) return false;
  }
  return true;
}
export function availableSkills(u: Unit, rules?: RuleCatalog): SkillId[] {
  const catalog = rules?.jobs ?? jobs;
  return [
    ...new Set<SkillId>([
      "strike",
      ...catalog[u.job].skills,
      ...catalog[u.secondary].skills.filter((id) => u.learned.includes(id)),
      "rally",
    ]),
  ];
}
export function canTarget(
  s: Battle,
  u: Unit,
  sk: Skill,
  x: number,
  z: number,
): boolean {
  const t = tileAt(s, x, z);
  if (
    !t ||
    t.blocked ||
    u.acted ||
    u.mp < sk.cost ||
    (sk.id === "rally" && s.momentum < 3) ||
    distance(u, t) > sk.range ||
    !lineOfSight(s, u, t)
  )
    return false;
  if (sk.kind !== "damage")
    return s.units.some(
      (v) =>
        v.team === u.team &&
        v.x === x &&
        v.z === z &&
        (sk.kind === "heal" || v.hp > 0),
    );
  return true;
}
export function preview(
  s: Battle,
  a: Unit,
  b: Unit,
  sk: Skill,
): {
  amount: number;
  hit: number;
  flank: boolean;
  height: number;
  synergy: boolean;
} {
  const height = tileAt(s, a.x, a.z)!.h - tileAt(s, b.x, b.z)!.h;
  const flank =
    sk.kind === "damage" &&
    (a.x - b.x) * b.facing[0] + (a.z - b.z) * b.facing[1] < 0;
  const formation = living(s).some(
    (v) =>
      v.id !== b.id &&
      v.team === b.team &&
      v.job === "vanguard" &&
      distance(v, b) <= 1,
  )
    ? 4
    : 0;
  const synergy =
    sk.element === "lightning" &&
    (tileAt(s, b.x, b.z)!.terrain === "water" || b.status.soaked > 0);
  const physical = sk.element === "physical";
  let amount =
    sk.power +
    (physical ? unitStats(a, s.rules).attack : unitStats(a, s.rules).magic) -
    unitStats(b, s.rules).armor -
    formation +
    Math.max(-6, Math.min(8, height * 4)) +
    (flank ? 6 : 0) +
    (b.status.exposed ? 7 : 0);
  if (sk.effect === "consumeExposure" && b.status.exposed > 0) amount += 12;
  if (b.guard) amount *= 0.55;
  if (synergy) amount *= 1.5;
  if (sk.kind === "heal")
    amount = b.hp <= 0 ? 24 : Math.min(b.maxHp - b.hp, sk.power);
  if (sk.kind === "buff") amount = sk.effect === "aegis" ? 0 : 35;
  return {
    amount: Math.max(sk.kind === "damage" ? 1 : 0, Math.round(amount)),
    hit:
      sk.kind === "heal" || sk.kind === "buff"
        ? 100
        : Math.min(100, 94 + (flank ? 6 : 0) + height * 2),
    flank,
    height,
    synergy,
  };
}
function rng(s: Battle) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
function note(s: Battle, t: string) {
  s.log = [...s.log.slice(-39), t];
}
function result(s: Battle) {
  const boss =
    s.encounter === "bellkeeper"
      ? s.units.find((u) => u.id === "sentinel")
      : undefined;
  if (
    boss &&
    boss.hp > 0 &&
    boss.hp <= boss.maxHp / 2 &&
    !s.bossAwakened &&
    living(s).some((u) => u.team === "ally")
  ) {
    s.bossAwakened = true;
    boss.status.burn = 0;
    boss.status.slow = 0;
    boss.mp = boss.maxMp;
    boss.next = Math.max(0, boss.next - 25);
    boss.guard = true;
    boss.equipment.relic = "watchcharm";
    note(
      s,
      "Orren breaks his last oath: burn and slow cleansed, energy restored, +2 speed, next action advanced by 25 ticks. Guard lasts until his next activation.",
    );
  }
  if (!living(s).some((u) => u.team === "enemy")) s.result = "victory";
  else if (!living(s).some((u) => u.team === "ally")) s.result = "defeat";
  if (s.result === "victory" && !s.rewarded) {
    s.rewarded = true;
    s.units
      .filter((u) => u.team === "ally")
      .forEach((u) => {
        u.jp[u.job] = (u.jp[u.job] ?? 0) + (s.victoryJP ?? 60);
      });
    note(
      s,
      `Veyr is secure. Each companion earns ${s.victoryJP ?? 60} JP. The shard answers with a heartbeat.`,
    );
  }
}
export function command(state: Battle, c: Command): Battle {
  if (state.result !== "playing") return state;
  const s = structuredClone(state),
    u = activeUnit(s);
  if (u.hp <= 0 && c.type !== "end") return state;
  if (c.type === "move") {
    if (
      u.moved ||
      !reachable(s, u).has(key(c.x, c.z)) ||
      (u.x === c.x && u.z === c.z)
    )
      return state;
    u.facing =
      Math.abs(c.x - u.x) >= Math.abs(c.z - u.z)
        ? [Math.sign(c.x - u.x), 0]
        : [0, Math.sign(c.z - u.z)];
    u.x = c.x;
    u.z = c.z;
    u.moved = true;
    note(s, `${u.name} repositions.`);
  } else if (c.type === "skill") {
    const sk = (s.rules?.skills ?? skills)[c.skill];
    if (
      !availableSkills(u, s.rules).includes(c.skill) ||
      !canTarget(s, u, sk, c.x, c.z)
    )
      return state;
    u.mp -= sk.cost;
    s.lastAction = {
      unit: u.id,
      skill: sk.id,
      turn: s.turn,
      target: { x: c.x, z: c.z },
      outcomes: [],
    };
    u.acted = true;
    if (c.skill === "rally") s.momentum -= 3;
    u.facing =
      Math.abs(c.x - u.x) >= Math.abs(c.z - u.z)
        ? [Math.sign(c.x - u.x) || u.facing[0], 0]
        : [0, Math.sign(c.z - u.z)];
    const targets = s.units.filter(
      (v) =>
        distance(v, { x: c.x, z: c.z }) <= sk.radius &&
        (sk.kind === "damage"
          ? v.team !== u.team && v.hp > 0
          : v.team === u.team),
    );
    for (const v of targets) {
      const p = preview(s, u, v, sk);
      if (sk.kind === "heal") {
        s.lastAction.outcomes!.push({ unit: v.id, result: "heal" });
        v.hp = Math.min(v.maxHp, v.hp + p.amount);
        v.status.burn = 0;
        note(s, `${u.name} → ${v.name}: +${p.amount} health.`);
      } else if (sk.kind === "buff") {
        s.lastAction.outcomes!.push({ unit: v.id, result: "buff" });
        if (sk.effect === "aegis") {
          v.guard = true;
          v.status.burn = 0;
          note(
            s,
            `${u.name} protects ${v.name} with Oathguard: 45% reduction until their next activation; burn cleansed.`,
          );
        } else {
          v.next = Math.max(0, v.next - 35);
          note(s, `${v.name} borrows 35 timeline ticks.`);
        }
      } else if (rng(s) * 100 > p.hit) {
        s.lastAction.outcomes!.push({ unit: v.id, result: "miss" });
        note(s, `${v.name} evades ${sk.name}.`);
      } else {
        s.lastAction.outcomes!.push({ unit: v.id, result: "hit" });
        const crit = rng(s) < 0.1,
          damage = Math.round(p.amount * (crit ? 1.5 : 1));
        v.hp = Math.max(0, v.hp - damage);
        if (sk.element === "fire") v.status.burn = 2;
        if (sk.element === "ice") {
          v.status.slow = 2;
          v.status.soaked = 2;
        }
        if (sk.id === "veil") v.status.exposed = 2;
        if (sk.effect === "consumeExposure") v.status.exposed = 0;
        if (sk.effect === "soak") v.status.soaked = 3;
        if (sk.effect === "delay" && v.hp > 0) {
          v.next += 30;
          note(s, `${v.name} loses 30 timeline ticks to Stolen hour.`);
        }
        note(
          s,
          `${u.name} → ${v.name}: ${damage}${crit ? " critical" : ""} damage${v.hp === 0 ? " · fallen" : ""}.`,
        );
        if (v.hp > 0 && hasSupport(v, "secondwind") && v.mp >= 2) {
          v.mp -= 2;
          const recovered = Math.min(4, v.maxHp - v.hp);
          v.hp += recovered;
          note(
            s,
            v.name + " uses Second wind: +" + recovered + " health, -2 energy.",
          );
        }
        if (
          v.hp > 0 &&
          u.hp > 0 &&
          sk.id === "strike" &&
          distance(u, v) <= 1 &&
          hasSupport(v, "reprisal")
        ) {
          u.hp = Math.max(0, u.hp - 5);
          note(s, v.name + " retaliates with Close reprisal for 5 damage.");
        }
        if (u.team === "ally") s.momentum = Math.min(5, s.momentum + 1);
        if (
          sk.id === "strike" &&
          u.hp > 0 &&
          v.hp > 0 &&
          v.job === "dancer" &&
          distance(u, v) <= 1
        ) {
          u.hp = Math.max(0, u.hp - 9);
          note(s, `${v.name} ripostes for 9 damage.`);
        }
      }
    }
    if (!targets.length) note(s, `${u.name} uses ${sk.name} on the terrain.`);
    s.tiles
      .filter((t) => distance(t, { x: c.x, z: c.z }) <= sk.radius)
      .forEach((t) => {
        if (sk.element === "ice" && t.terrain === "water") t.terrain = "ice";
        if (sk.element === "fire" && t.terrain === "grass") t.burn = 3;
      });
    u.jp[u.job] = (u.jp[u.job] ?? 0) + 10;
    result(s);
    if (u.hp === 0 && s.result === "playing")
      return command(s, { type: "end" });
  } else {
    u.guard = u.guard || !u.acted;
    if (u.guard) note(s, `${u.name} braces: incoming damage reduced by 45%.`);
    if (u.status.burn > 0) {
      u.hp = Math.max(0, u.hp - 6);
      note(s, `${u.name} suffers 6 burn damage.`);
    }
    if (tileAt(s, u.x, u.z)!.burn > 0) u.hp = Math.max(0, u.hp - 4);
    Object.keys(u.status).forEach((k) => {
      const st = k as keyof Unit["status"];
      u.status[st] = Math.max(0, u.status[st] - 1);
    });
    u.next +=
      Math.round(1000 / unitStats(u, s.rules).speed) + (u.status.slow ? 30 : 0);
    result(s);
    if (s.result === "playing") {
      const next = living(s).sort(
        (a, b) => a.next - b.next || a.id.localeCompare(b.id),
      )[0];
      s.active = next.id;
      next.moved = false;
      next.acted = false;
      next.guard = false;
      next.mp = Math.min(next.maxMp, next.mp + 3);
      s.turn++;
      if (s.turn % 8 === 0)
        s.tiles.forEach((t) => (t.burn = Math.max(0, t.burn - 1)));
    }
  }
  return s;
}
export function aiTurn(state: Battle): Battle {
  if (state.result !== "playing" || activeUnit(state).team !== "enemy")
    return state;
  let s = state;
  let u = activeUnit(s);
  const enemies = living(s).filter((v) => v.team !== u.team);
  let best: { x: number; z: number; score: number } = {
    x: u.x,
    z: u.z,
    score: -Infinity,
  };
  for (const [k, cost] of reachable(s, u)) {
    const [x, z] = k.split(",").map(Number),
      p = { x, z };
    const near = Math.min(...enemies.map((v) => distance(p, v)));
    const range = [
      "arcanist",
      "lifebinder",
      "stormherald",
      "chronoweaver",
    ].includes(u.job)
      ? 3
      : 1;
    const score =
      -Math.abs(near - range) * 5 +
      tileAt(s, x, z)!.h * 1.5 -
      cost * 0.25 -
      tileAt(s, x, z)!.burn * 4;
    if (score > best.score) best = { x, z, score };
  }
  s = command(s, { type: "move", x: best.x, z: best.z });
  u = activeUnit(s);
  let action:
    { skill: SkillId; x: number; z: number; score: number } | undefined;
  for (const id of availableSkills(u, s.rules).filter((id) => id !== "rally")) {
    const sk = (s.rules?.skills ?? skills)[id];
    for (const t of s.tiles) {
      if (!canTarget(s, u, sk, t.x, t.z)) continue;
      let score = 0;
      for (const v of s.units.filter((v) => distance(v, t) <= sk.radius)) {
        if (sk.kind === "damage" && v.team !== u.team && v.hp > 0) {
          const p = preview(s, u, v, sk);
          score += Math.min(v.hp, p.amount) + (v.hp <= p.amount ? 22 : 0);
          if (sk.effect === "delay" && v.hp > p.amount) score += 7;
          if (
            sk.effect === "soak" &&
            v.status.soaked === 0 &&
            living(s).some(
              (a) =>
                a.team === u.team &&
                a.mp >= (s.rules?.skills ?? skills).surge.cost &&
                availableSkills(a, s.rules).includes("surge") &&
                distance(a, v) <= (s.rules?.skills ?? skills).surge.range,
            )
          )
            score += 6;
        } else if (sk.kind === "buff" && v.team === u.team && v.hp > 0) {
          if (
            sk.effect === "aegis" &&
            !v.guard &&
            enemies.some((e) => distance(e, v) <= 3) &&
            v.next > u.next + 15
          )
            score += 9 + (v.maxHp - v.hp) * 0.08;
          if (sk.effect !== "aegis" && v.id !== u.id && v.next > u.next + 40)
            score += Math.min(14, (v.next - u.next) * 0.12);
        } else if (sk.kind === "heal" && v.team === u.team)
          score += preview(s, u, v, sk).amount * (v.hp === 0 ? 1.8 : 1);
      }
      score -= sk.cost * 0.2;
      if (score > 0 && (!action || score > action.score))
        action = { skill: id, x: t.x, z: t.z, score };
    }
  }
  if (action) s = command(s, { type: "skill", ...action });
  if (s.result === "playing") s = command(s, { type: "end" });
  return s;
}
export function changeJob(
  state: Battle,
  id: string,
  job: JobId,
  secondary: JobId,
): Battle {
  const s = structuredClone(state),
    u = s.units.find((v) => v.id === id);
  if (
    !u ||
    u.team !== "ally" ||
    state.turn !== 1 ||
    !unlocked(job, u.jp, s.rules?.jobs) ||
    (secondary !== u.secondary && !unlocked(secondary, u.jp, s.rules?.jobs))
  )
    return state;
  u.job = job;
  u.secondary = secondary;
  for (const slot of ["weapon", "armor", "relic"] as const) {
    const item = u.equipment[slot];
    if (item && !canEquip(job, item, s.rules?.gear)) u.equipment[slot] = null;
  }
  u.maxHp = unitStats(u, s.rules).hp;
  u.hp = Math.min(u.hp, u.maxHp);
  return s;
}
export function validateSave(raw: unknown): raw is Battle {
  try {
    return validBattle(raw);
  } catch {
    return false;
  }
}
function validBattle(raw: unknown): raw is Battle {
  if (!raw || typeof raw !== "object") return false;
  const s = raw as Battle;
  if (s.rules !== undefined) validateRules(s.rules);
  if (
    s.victoryJP !== undefined &&
    (!Number.isInteger(s.victoryJP) || s.victoryJP < 0 || s.victoryJP > 999)
  )
    return false;
  if (
    s.version !== 2 ||
    !Object.hasOwn(encounters, s.encounter) ||
    (s.lastAction !== undefined &&
      (!s.lastAction ||
        !Object.hasOwn(skills, s.lastAction.skill) ||
        !Number.isInteger(s.lastAction.turn) ||
        s.lastAction.turn < 1 ||
        s.lastAction.turn > s.turn ||
        (s.lastAction.target !== undefined &&
          (!s.lastAction.target ||
            ![s.lastAction.target.x, s.lastAction.target.z].every(
              (n) => Number.isInteger(n) && n >= 0 && n <= 8,
            ))) ||
        (s.lastAction.outcomes !== undefined &&
          (!Array.isArray(s.lastAction.outcomes) ||
            s.lastAction.outcomes.length > 8 ||
            new Set(s.lastAction.outcomes.map((o) => o.unit)).size !==
              s.lastAction.outcomes.length ||
            s.lastAction.outcomes.some(
              (o) =>
                !o ||
                !["hit", "miss", "heal", "buff"].includes(o.result) ||
                !s.units?.some((u) => u.id === o.unit),
            ))) ||
        !s.units?.some((u) => u.id === s.lastAction!.unit))) ||
    (s.bossAwakened !== undefined && typeof s.bossAwakened !== "boolean") ||
    !Number.isInteger(s.seed) ||
    !Number.isInteger(s.turn) ||
    s.turn < 1 ||
    !Number.isFinite(s.momentum) ||
    s.momentum < 0 ||
    s.momentum > 5 ||
    !["playing", "victory", "defeat"].includes(s.result) ||
    !Array.isArray(s.tiles) ||
    s.tiles.length !== 81 ||
    !Array.isArray(s.units) ||
    s.units.length !== 8 ||
    !Array.isArray(s.log) ||
    !s.log.every((v) => typeof v === "string")
  )
    return false;
  if (
    !s.tiles.every(
      (t) =>
        Number.isInteger(t.x) &&
        t.x >= 0 &&
        t.x < 9 &&
        Number.isInteger(t.z) &&
        t.z >= 0 &&
        t.z < 9 &&
        Number.isFinite(t.h) &&
        ["grass", "stone", "water", "ice"].includes(t.terrain) &&
        typeof t.blocked === "boolean" &&
        Number.isFinite(t.burn),
    ) ||
    new Set(s.tiles.map((t) => key(t.x, t.z))).size !== 81
  )
    return false;
  return (
    new Set(s.units.map((u) => u.id)).size === 8 &&
    s.units.some(
      (u) => u.id === s.active && (u.hp > 0 || s.result !== "playing"),
    ) &&
    s.units.every(
      (u) =>
        typeof u.id === "string" &&
        u.id.length > 0 &&
        typeof u.name === "string" &&
        Object.hasOwn(jobs, u.job) &&
        Object.hasOwn(jobs, u.secondary) &&
        validSupports(u) &&
        Number.isFinite(u.baseHp) &&
        u.baseHp > 0 &&
        Array.isArray(u.learned) &&
        u.learned.every((id) => Object.hasOwn(skills, id)) &&
        new Set(u.learned).size === u.learned.length &&
        u.jpSpent &&
        Object.entries(u.jpSpent).every(
          ([j, n]) =>
            Object.hasOwn(jobs, j) &&
            Number.isFinite(n) &&
            n! >= 0 &&
            n! <= (u.jp[j as JobId] ?? 0),
        ) &&
        u.equipment &&
        (["weapon", "armor", "relic"] as const).every((slot) => {
          const id = u.equipment[slot];
          return (
            id === null ||
            (Object.hasOwn(equipment, id) &&
              (s.rules?.gear ?? equipment)[id].slot === slot &&
              canEquip(u.job, id, s.rules?.gear))
          );
        }) &&
        ["ally", "enemy"].includes(u.team) &&
        Number.isInteger(u.x) &&
        u.x >= 0 &&
        u.x < 9 &&
        Number.isInteger(u.z) &&
        u.z >= 0 &&
        u.z < 9 &&
        Number.isFinite(u.hp) &&
        u.hp >= 0 &&
        u.hp <= u.maxHp &&
        Number.isFinite(u.maxHp) &&
        u.maxHp > 0 &&
        Number.isFinite(u.mp) &&
        u.mp >= 0 &&
        u.mp <= u.maxMp &&
        Number.isFinite(u.maxMp) &&
        Number.isFinite(u.next) &&
        typeof u.guard === "boolean" &&
        typeof u.moved === "boolean" &&
        typeof u.acted === "boolean" &&
        Array.isArray(u.facing) &&
        u.facing.length === 2 &&
        u.facing.every(Number.isFinite) &&
        u.status &&
        (["burn", "slow", "exposed", "soaked"] as const).every(
          (k) => Number.isFinite(u.status[k]) && u.status[k] >= 0,
        ) &&
        u.jp &&
        Object.entries(u.jp).every(
          ([k, v]) => Object.hasOwn(jobs, k) && Number.isFinite(v) && v! >= 0,
        ),
    )
  );
}
