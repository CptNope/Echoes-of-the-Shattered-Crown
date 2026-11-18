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
import { encounters, type EncounterId } from "./encounters";
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
export function unitStats(u: Unit) {
  const j = jobs[u.job],
    b = gearBonuses(u.equipment);
  return {
    move: Math.max(1, j.move + b.move),
    speed: Math.max(1, j.speed + b.speed),
    attack: Math.max(0, j.attack + b.attack),
    armor: Math.max(0, j.armor + b.armor),
    magic: Math.max(0, j.magic + b.magic),
    hp: u.baseHp + b.hp,
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
      "Sera: “A crown is only a promise. Let’s see who it was made to.”",
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
        c <= unitStats(u).move &&
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
export function availableSkills(u: Unit): SkillId[] {
  return [
    ...new Set<SkillId>([
      "strike",
      ...jobs[u.job].skills,
      ...jobs[u.secondary].skills.filter((id) => u.learned.includes(id)),
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
  const flank = (a.x - b.x) * b.facing[0] + (a.z - b.z) * b.facing[1] < 0;
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
    (physical ? unitStats(a).attack : unitStats(a).magic) -
    unitStats(b).armor -
    formation +
    Math.max(-6, Math.min(8, height * 4)) +
    (flank ? 6 : 0) +
    (b.status.exposed ? 7 : 0);
  if (b.guard) amount *= 0.55;
  if (synergy) amount *= 1.5;
  if (sk.kind === "heal")
    amount = b.hp <= 0 ? 24 : Math.min(b.maxHp - b.hp, sk.power);
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
  if (!living(s).some((u) => u.team === "enemy")) s.result = "victory";
  else if (!living(s).some((u) => u.team === "ally")) s.result = "defeat";
  if (s.result === "victory" && !s.rewarded) {
    s.rewarded = true;
    s.units
      .filter((u) => u.team === "ally")
      .forEach((u) => {
        u.jp[u.job] = (u.jp[u.job] ?? 0) + 60;
      });
    note(
      s,
      "Veyr is secure. Each companion earns 60 JP. The shard answers with a heartbeat.",
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
    const sk = skills[c.skill];
    if (!availableSkills(u).includes(c.skill) || !canTarget(s, u, sk, c.x, c.z))
      return state;
    u.mp -= sk.cost;
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
        v.hp = Math.min(v.maxHp, v.hp + p.amount);
        v.status.burn = 0;
        note(s, `${u.name} → ${v.name}: +${p.amount} health.`);
      } else if (sk.kind === "buff") {
        v.next = Math.max(0, v.next - 35);
        note(s, `${v.name} borrows 35 timeline ticks.`);
      } else if (rng(s) * 100 > p.hit) note(s, `${v.name} evades ${sk.name}.`);
      else {
        const crit = rng(s) < 0.1,
          damage = Math.round(p.amount * (crit ? 1.5 : 1));
        v.hp = Math.max(0, v.hp - damage);
        if (sk.element === "fire") v.status.burn = 2;
        if (sk.element === "ice") {
          v.status.slow = 2;
          v.status.soaked = 2;
        }
        if (sk.id === "veil") v.status.exposed = 2;
        note(
          s,
          `${u.name} → ${v.name}: ${damage}${crit ? " critical" : ""} damage${v.hp === 0 ? " · fallen" : ""}.`,
        );
        if (u.team === "ally") s.momentum = Math.min(5, s.momentum + 1);
        if (
          sk.id === "strike" &&
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
    u.guard = !u.acted;
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
    u.next += Math.round(1000 / unitStats(u).speed) + (u.status.slow ? 30 : 0);
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
    const range = u.job === "arcanist" || u.job === "lifebinder" ? 3 : 1;
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
  for (const id of availableSkills(u).filter((id) => id !== "rally")) {
    const sk = skills[id];
    for (const t of s.tiles) {
      if (!canTarget(s, u, sk, t.x, t.z)) continue;
      let score = 0;
      for (const v of s.units.filter((v) => distance(v, t) <= sk.radius)) {
        if (sk.kind === "damage" && v.team !== u.team && v.hp > 0) {
          const p = preview(s, u, v, sk);
          score += Math.min(v.hp, p.amount) + (v.hp <= p.amount ? 22 : 0);
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
    !unlocked(job, u.jp) ||
    (secondary !== u.secondary && !unlocked(secondary, u.jp))
  )
    return state;
  u.job = job;
  u.secondary = secondary;
  for (const slot of ["weapon", "armor", "relic"] as const) {
    const item = u.equipment[slot];
    if (item && !canEquip(job, item)) u.equipment[slot] = null;
  }
  u.maxHp = unitStats(u).hp;
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
  if (
    s.version !== 2 ||
    !Object.hasOwn(encounters, s.encounter) ||
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
              equipment[id].slot === slot &&
              canEquip(u.job, id))
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
