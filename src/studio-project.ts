import { createBattle, type Battle, type Tile } from "./engine";

/** Implemented pilot format; deliberately separate from the proposed full studio schema. */
export interface LevelProject {
  format: "echoes-level-project";
  version: 1;
  id: string;
  revision: number;
  name: string;
  seed: number;
  tiles: Pick<Tile, "x" | "z" | "h" | "terrain" | "blocked">[];
  placements: { id: string; x: number; z: number }[];
}
export const PROJECT_LIMIT = 128 * 1024;
const template = createBattle();
export function createLevelProject(): LevelProject {
  return {
    format: "echoes-level-project",
    version: 1,
    id: crypto.randomUUID(),
    revision: 0,
    name: "Veyr — field study",
    seed: 74319,
    tiles: template.tiles.map(({ x, z, h, terrain, blocked }) => ({
      x,
      z,
      h,
      terrain,
      blocked,
    })),
    placements: template.units.map(({ id, x, z }) => ({ id, x, z })),
  };
}
function fail(message: string): never {
  throw new Error(message);
}
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const int = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && Number(v) >= min && Number(v) <= max;
function fields(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((k) => !allowed.includes(k)))
    fail("Unsupported project field. This pilot cannot preserve it.");
}
export function validateLevelProject(raw: unknown): LevelProject {
  if (!record(raw)) fail("Expected a level project object.");
  fields(raw, [
    "format",
    "version",
    "id",
    "revision",
    "name",
    "seed",
    "tiles",
    "placements",
  ]);
  if (raw.format !== "echoes-level-project" || raw.version !== 1)
    fail(
      "Unsupported format. Import a level project v1, not a player save or studio proposal.",
    );
  if (typeof raw.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(raw.id))
    fail("Invalid project identity.");
  if (typeof raw.name !== "string" || !raw.name.trim() || raw.name.length > 80)
    fail("Project name must contain 1–80 characters.");
  if (
    !int(raw.revision, 0, Number.MAX_SAFE_INTEGER - 1) ||
    !int(raw.seed, 0, 0xffffffff)
  )
    fail("Invalid revision or seed.");
  if (!Array.isArray(raw.tiles) || raw.tiles.length !== 81)
    fail("The pilot requires exactly 81 tiles.");
  const cells = new Set<string>();
  for (const t of raw.tiles) {
    if (!record(t)) fail("Invalid tile.");
    fields(t, ["x", "z", "h", "terrain", "blocked"]);
    if (
      !int(t.x, 0, 8) ||
      !int(t.z, 0, 8) ||
      !int(t.h, 0, 2) ||
      typeof t.terrain !== "string" ||
      !["grass", "stone", "water", "ice"].includes(t.terrain) ||
      typeof t.blocked !== "boolean"
    )
      fail("Tile coordinates, terrain or elevation are invalid.");
    const k = t.x + "," + t.z;
    if (cells.has(k)) fail("Duplicate tile.");
    cells.add(k);
  }
  if (!Array.isArray(raw.placements) || raw.placements.length !== 8)
    fail("Keep all eight template actors.");
  const actors = new Set<string>(),
    occupied = new Set<string>();
  for (const p of raw.placements) {
    if (!record(p)) fail("Invalid actor placement.");
    fields(p, ["id", "x", "z"]);
    if (
      !template.units.some((u) => u.id === p.id) ||
      actors.has(String(p.id)) ||
      !int(p.x, 0, 8) ||
      !int(p.z, 0, 8)
    )
      fail("Invalid or duplicate actor.");
    const k = p.x + "," + p.z,
      tile = raw.tiles.find((t) => t.x === p.x && t.z === p.z)!;
    if (occupied.has(k) || tile.blocked || tile.terrain === "water")
      fail("Actors need separate, unblocked land or ice tiles.");
    occupied.add(k);
    actors.add(String(p.id));
  }
  return structuredClone(raw) as unknown as LevelProject;
}
export function parseLevelProject(text: string): LevelProject {
  if (new TextEncoder().encode(text).length > PROJECT_LIMIT)
    fail("Project exceeds the 128 KiB import limit.");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    fail("Invalid JSON. Choose an exported level project.");
  }
  return validateLevelProject(raw);
}
export function exportLevelProject(project: LevelProject): string {
  return JSON.stringify(validateLevelProject(project), null, 2) + "\n";
}
export type ProjectEdit =
  | {
      type: "tile";
      x: number;
      z: number;
      terrain?: Tile["terrain"];
      h?: number;
      blocked?: boolean;
    }
  | { type: "place"; id: string; x: number; z: number }
  | { type: "metadata"; name: string; seed: number };
/** Atomic batch: reject every operation if any resulting invariant fails. */
export function editProject(
  project: LevelProject,
  expectedRevision: number,
  edits: ProjectEdit[],
): LevelProject {
  if (project.revision !== expectedRevision)
    fail("Stale revision. Reopen the current project before editing.");
  if (!edits.length || edits.length > 81) fail("Use a batch of 1–81 edits.");
  const next = structuredClone(project);
  for (const e of edits) {
    if (e.type === "tile") {
      const tile = next.tiles.find((t) => t.x === e.x && t.z === e.z);
      if (!tile) fail("Tile outside the 9×9 board.");
      if (e.terrain !== undefined) tile.terrain = e.terrain;
      if (e.h !== undefined) tile.h = e.h;
      if (e.blocked !== undefined) tile.blocked = e.blocked;
    } else if (e.type === "place") {
      const actor = next.placements.find((p) => p.id === e.id);
      if (!actor) fail("Unknown actor.");
      actor.x = e.x;
      actor.z = e.z;
    } else if (e.type === "metadata") {
      next.name = e.name;
      next.seed = e.seed;
    } else fail("Unsupported edit.");
  }
  next.revision++;
  return validateLevelProject(next);
}
export interface ProjectHistory {
  project: LevelProject;
  past: LevelProject[];
  future: LevelProject[];
}
export function applyProjectEdits(
  state: ProjectHistory,
  edits: ProjectEdit[],
): ProjectHistory {
  const project = editProject(state.project, state.project.revision, edits);
  return {
    project,
    past: [...state.past, state.project].slice(-50),
    future: [],
  };
}
export function travelProjectHistory(
  state: ProjectHistory,
  direction: "undo" | "redo",
): ProjectHistory {
  const stack = direction === "undo" ? state.past : state.future;
  if (!stack.length) return state;
  const project = validateLevelProject({
    ...stack[stack.length - 1],
    revision: state.project.revision + 1,
  });
  return direction === "undo"
    ? {
        project,
        past: stack.slice(0, -1),
        future: [...state.future, state.project],
      }
    : {
        project,
        past: [...state.past, state.project],
        future: stack.slice(0, -1),
      };
}
/** Fresh isolated battle; authoring data never receives combat mutations/rewards. */
export function compileLevelProject(project: LevelProject): Battle {
  const p = validateLevelProject(project),
    battle = createBattle(p.seed);
  battle.tiles = p.tiles.map((t) => ({ ...t, burn: 0 }));
  for (const u of battle.units)
    Object.assign(
      u,
      p.placements.find((x) => x.id === u.id)!,
    );
  battle.log = [
    p.name +
      " · preview revision " +
      p.revision +
      ". Defeat all enemies. No campaign rewards.",
  ];
  return battle;
}
export const STUDIO_STORAGE = "echoes.level-studio.v1";
export interface StudioStorage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}
export function loadProjectCheckpoint(storage: StudioStorage): {
  project: LevelProject | null;
  message: string;
  token: string | null;
} {
  const token = storage.getItem(STUDIO_STORAGE);
  const backup = storage.getItem(STUDIO_STORAGE + ".backup");
  for (const [text, recovered] of [
    [token, false],
    [backup, true],
  ] as const) {
    if (!text) continue;
    try {
      return {
        project: parseLevelProject(text),
        message: recovered
          ? "Recovered previous valid checkpoint."
          : "Local checkpoint opened.",
        token,
      };
    } catch {
      /* Try the previous valid source, never partially import. */
    }
  }
  return {
    project: null,
    token,
    message:
      token || backup
        ? "Local checkpoint is unreadable. Template opened; export your work before saving."
        : "Template opened. Save locally or export a project to keep edits.",
  };
}
export function saveProjectCheckpoint(
  storage: StudioStorage,
  project: LevelProject,
  expectedToken: string | null,
): string {
  const current = storage.getItem(STUDIO_STORAGE);
  if (current !== expectedToken)
    fail(
      "Another tab saved this project. Export your edits, then reload before saving.",
    );
  const text = exportLevelProject(project);
  if (current) {
    let valid = false;
    try {
      parseLevelProject(current);
      valid = true;
    } catch {
      /* Keep valid backup. */
    }
    if (valid) storage.setItem(STUDIO_STORAGE + ".backup", current);
  }
  storage.setItem(STUDIO_STORAGE, text);
  return text;
}
