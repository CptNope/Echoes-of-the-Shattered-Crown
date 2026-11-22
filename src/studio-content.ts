import type { RuleCatalog } from "./studio-rules";
import { canEquip, type Loadout } from "./equipment";
import { createBattle, type Unit } from "./engine";
import {
  encounters,
  encounterOpening,
  type EncounterId,
  type Encounter,
} from "./encounters";
import { jobs, skills, type JobId } from "./data";
import { equipment } from "./equipment";
export const ENCOUNTER_IDS = Object.keys(encounters) as EncounterId[];
export interface DialogueLine {
  id: string;
  speaker: string;
  text: string;
}
export type ActorSource = Pick<
  Unit,
  "id" | "name" | "job" | "secondary" | "baseHp" | "maxMp" | "learned" | "jp"
> & { equipment?: Loadout; team?: "enemy" };
export interface GameContent {
  version: 1;
  contracts: Record<EncounterId, Encounter>;
  actors: ActorSource[];
  enemyTemplates?: ActorSource[];
  dialogue: Record<EncounterId, DialogueLine[]>;
  victoryJP: number;
}
export function gameContent(
  encounter: EncounterId = "shrine",
  units?: readonly Unit[],
): GameContent {
  return {
    version: 1,
    contracts: structuredClone(encounters),
    actors: (units ?? createBattle(74319, encounter).units).map(
      ({ id, name, job, secondary, baseHp, maxMp, learned, jp }) => ({
        id,
        name,
        job,
        secondary,
        baseHp,
        maxMp,
        learned: [...learned],
        jp: { ...jp },
      }),
    ),
    dialogue: Object.fromEntries(
      ENCOUNTER_IDS.map((id) => [
        id,
        [
          {
            id: "briefing",
            speaker: "narrator",
            text: encounters[id].description,
          },
          {
            id: "opening",
            speaker: encounterOpening.speaker,
            text: encounterOpening.text,
          },
        ],
      ]),
    ) as Record<EncounterId, DialogueLine[]>,
    victoryJP: 60,
  };
}
function check(v: unknown, m: string): asserts v {
  if (!v) throw Error(m);
}
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
function fields(v: object, allowed: string[]) {
  check(
    Object.keys(v).every((k) => allowed.includes(k)),
    "Unsupported game-content field.",
  );
}
const text = (v: unknown, max: number) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const int = (v: unknown, min: number, max: number) =>
  Number.isInteger(v) && Number(v) >= min && Number(v) <= max;
export function validateGameContent(
  raw: unknown,
  rules?: RuleCatalog,
): GameContent {
  check(obj(raw), "Expected game content.");
  fields(raw, [
    "version",
    "contracts",
    "actors",
    "dialogue",
    "victoryJP",
    "enemyTemplates",
  ]);
  check(
    raw.version === 1 && int(raw.victoryJP, 0, 999),
    "Invalid content version or victory JP.",
  );
  check(
    obj(raw.contracts) && Object.keys(raw.contracts).length === 4,
    "Keep all four existing contracts.",
  );
  for (const id of ENCOUNTER_IDS) {
    const c = raw.contracts[id];
    check(obj(c), "Missing contract.");
    fields(c, [
      "id",
      "name",
      "subtitle",
      "description",
      "objective",
      "reward",
      "requires",
      "firstClearRelic",
    ]);
    check(
      c.id === id &&
        text(c.name, 80) &&
        text(c.subtitle, 120) &&
        text(c.description, 2000) &&
        text(c.objective, 160) &&
        int(c.reward, 0, 9999),
      "Invalid contract fields.",
    );
    check(
      c.requires === null ||
        (typeof c.requires === "string" &&
          ENCOUNTER_IDS.includes(c.requires as EncounterId) &&
          c.requires !== id),
      "Invalid contract prerequisite.",
    );
    check(
      c.firstClearRelic === undefined ||
        (typeof c.firstClearRelic === "string" &&
          Object.hasOwn(rules?.gear ?? equipment, c.firstClearRelic)),
      "Unknown first-clear item.",
    );
    const visited = new Set<string>([id]);
    let at: unknown = c.requires;
    while (at !== null) {
      check(
        typeof at === "string" && !visited.has(at),
        "Contract prerequisite cycle.",
      );
      visited.add(at);
      const parent = raw.contracts[at];
      check(obj(parent), "Missing prerequisite contract.");
      at = parent.requires;
    }
  }
  const builtin = createBattle().units.map((u) => u.id);
  const jobCatalog = rules?.jobs ?? jobs,
    skillCatalog = rules?.skills ?? skills;
  check(
    Array.isArray(raw.actors) &&
      raw.actors.length >= 4 &&
      raw.actors.length <= 24 &&
      ["sera", "ilya", "corin", "mae"].every((id) =>
        (raw.actors as unknown[]).some((a) => obj(a) && a.id === id),
      ),
    "Keep the four company heroes and up to twenty enemies.",
  );
  check(
    raw.enemyTemplates === undefined ||
      (Array.isArray(raw.enemyTemplates) && raw.enemyTemplates.length <= 32),
    "Use at most 32 enemy templates.",
  );
  for (const t of (raw.enemyTemplates as unknown[]) ?? [])
    check(
      obj(t) &&
        typeof t.id === "string" &&
        /^enemy-[a-z][a-z0-9-]{0,55}$/.test(t.id) &&
        t.team === "enemy",
      "Invalid enemy template identity.",
    );
  const ids = raw.actors.filter(obj).map((a) => String(a.id));
  const used = new Set();
  for (const a of [
    ...raw.actors,
    ...((raw.enemyTemplates as unknown[]) ?? []),
  ]) {
    check(obj(a), "Invalid actor source.");
    fields(a, [
      "id",
      "name",
      "job",
      "secondary",
      "baseHp",
      "maxMp",
      "learned",
      "jp",
      "equipment",
      "team",
    ]);
    check(
      typeof a.id === "string" &&
        (builtin.includes(a.id) || /^enemy-[a-z][a-z0-9-]{0,55}$/.test(a.id)) &&
        (builtin.includes(a.id)
          ? a.team === undefined ||
            (a.team === "enemy" &&
              !["sera", "ilya", "corin", "mae"].includes(a.id))
          : a.team === "enemy") &&
        !used.has(a.id) &&
        text(a.name, 80) &&
        typeof a.job === "string" &&
        Object.hasOwn(jobCatalog, a.job) &&
        typeof a.secondary === "string" &&
        Object.hasOwn(jobCatalog, a.secondary) &&
        int(a.baseHp, 1, 999) &&
        int(a.maxMp, 0, 999),
      "Invalid actor fields.",
    );
    if (a.equipment !== undefined) {
      check(
        obj(a.equipment) && Object.keys(a.equipment).length === 3,
        "Keep weapon, armor and relic loadout slots.",
      );
      for (const slot of ["weapon", "armor", "relic"]) {
        const item = a.equipment[slot],
          catalog = rules?.gear ?? equipment;
        check(
          item === null ||
            (typeof item === "string" &&
              Object.hasOwn(catalog, item) &&
              catalog[item as keyof typeof catalog].slot === slot &&
              canEquip(a.job as JobId, item as keyof typeof catalog, catalog)),
          "Actor gear must match its slot and job proficiency.",
        );
      }
    }
    used.add(a.id);
    check(
      Array.isArray(a.learned) &&
        new Set(a.learned).size === a.learned.length &&
        a.learned.every(
          (s) => typeof s === "string" && Object.hasOwn(skillCatalog, s),
        ),
      "Unknown or duplicate learned skill.",
    );
    check(
      obj(a.jp) &&
        Object.entries(a.jp).every(
          ([job, jp]) => Object.hasOwn(jobCatalog, job) && int(jp, 0, 9999),
        ),
      "Invalid starting job points.",
    );
  }
  check(
    obj(raw.dialogue) && Object.keys(raw.dialogue).length === 4,
    "Keep dialogue for all four contracts.",
  );
  for (const id of ENCOUNTER_IDS) {
    const lines = raw.dialogue[id];
    check(
      Array.isArray(lines) && lines.length <= 32,
      "Use up to 32 dialogue lines per contract.",
    );
    const seen = new Set();
    for (const l of lines) {
      check(obj(l), "Invalid dialogue line.");
      fields(l, ["id", "speaker", "text"]);
      check(
        typeof l.id === "string" &&
          /^[a-zA-Z0-9_-]{1,40}$/.test(l.id) &&
          !seen.has(l.id) &&
          typeof l.speaker === "string" &&
          ["narrator", ...ids].includes(l.speaker) &&
          text(l.text, 2000),
        "Invalid dialogue identity, speaker or text.",
      );
      seen.add(l.id);
    }
  }
  return structuredClone(raw) as unknown as GameContent;
}
