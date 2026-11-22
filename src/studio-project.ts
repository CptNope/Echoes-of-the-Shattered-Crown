import { buildExpansion } from "./studio-authoring";
import {
  mapDimensions,
  validMapDimensions,
  type MapDimensions,
} from "./map-layout";
import { validateRules, type RuleCatalog } from "./studio-rules";
import { encounters, type EncounterId } from "./encounters";
import {
  gameContent,
  validateGameContent,
  type GameContent,
} from "./studio-content";
import { validateMaterials, type TerrainMaterials } from "./studio-materials";
import { validateGameAudio, type GameAudio } from "./game-audio";
import { createBattle, unitStats, type Battle, type Tile } from "./engine";
import { validateSoundBank, type SoundBank } from "./studio-sfx";
import { validateMusicPattern, type MusicPattern } from "./studio-music";
import { validatePixelClip, type PixelClip } from "./studio-pixels";
import {
  validateNativeSprite,
  type NativeSprite,
} from "./studio-native-sprites";

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
  sounds?: SoundBank;
  music?: MusicPattern;
  pixels?: PixelClip;
  nativeSprite?: NativeSprite;
  encounter?: EncounterId;
  content?: GameContent;
  materials?: TerrainMaterials;
  gameAudio?: GameAudio;
  rules?: RuleCatalog;
  dimensions?: MapDimensions;
}
export const PROJECT_LIMIT = 128 * 1024;
export const LARGE_PROJECT_LIMIT = 512 * 1024;
export const NATIVE_PROJECT_LIMIT = 8 * 1024 * 1024;
const LEGACY_PROJECT_LIMIT = PROJECT_LIMIT;
const template = createBattle();
export function createLevelProject(
  encounter: EncounterId = "shrine",
): LevelProject {
  const baseline = createBattle(74319, encounter);
  return {
    format: "echoes-level-project",
    version: 1,
    id: crypto.randomUUID(),
    revision: 0,
    name:
      encounter === "shrine"
        ? "Veyr — field study"
        : encounters[encounter].name,
    ...(encounter !== "shrine" ? { encounter } : {}),
    seed: 74319,
    tiles: baseline.tiles.map(({ x, z, h, terrain, blocked }) => ({
      x,
      z,
      h,
      terrain,
      blocked,
    })),
    placements: baseline.units.map(({ id, x, z }) => ({ id, x, z })),
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
    "sounds",
    "music",
    "pixels",
    "nativeSprite",
    "encounter",
    "content",
    "materials",
    "gameAudio",
    "rules",
    "dimensions",
  ]);
  if (raw.format !== "echoes-level-project" || raw.version !== 1)
    fail(
      "Unsupported format. Import a level project v1, not a player save or studio proposal.",
    );
  if (
    raw.encounter !== undefined &&
    (typeof raw.encounter !== "string" ||
      !Object.hasOwn(encounters, raw.encounter))
  )
    fail("Unknown source encounter.");
  const rules = raw.rules === undefined ? undefined : validateRules(raw.rules);
  if (raw.content !== undefined) validateGameContent(raw.content, rules);
  if (raw.materials !== undefined) validateMaterials(raw.materials);
  if (raw.gameAudio !== undefined) validateGameAudio(raw.gameAudio);
  if (raw.sounds !== undefined) validateSoundBank(raw.sounds);
  if (raw.music !== undefined) validateMusicPattern(raw.music);
  if (raw.pixels !== undefined) validatePixelClip(raw.pixels);
  if (raw.nativeSprite !== undefined) validateNativeSprite(raw.nativeSprite);
  if (typeof raw.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(raw.id))
    fail("Invalid project identity.");
  if (typeof raw.name !== "string" || !raw.name.trim() || raw.name.length > 80)
    fail("Project name must contain 1–80 characters.");
  if (
    !int(raw.revision, 0, Number.MAX_SAFE_INTEGER - 1) ||
    !int(raw.seed, 0, 0xffffffff)
  )
    fail("Invalid revision or seed.");
  if (raw.dimensions !== undefined && !validMapDimensions(raw.dimensions))
    fail("Map width and height must be whole numbers from 9 to 32.");
  const dimensions = mapDimensions(raw as unknown as LevelProject);
  if (
    !Array.isArray(raw.tiles) ||
    raw.tiles.length !== dimensions.width * dimensions.height
  )
    fail("Map needs exactly one tile for each coordinate in its dimensions.");
  const cells = new Set<string>();
  for (const t of raw.tiles) {
    if (!record(t)) fail("Invalid tile.");
    fields(t, ["x", "z", "h", "terrain", "blocked"]);
    if (
      !int(t.x, 0, dimensions.width - 1) ||
      !int(t.z, 0, dimensions.height - 1) ||
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
  const roster = raw.content
    ? validateGameContent(raw.content, rules).actors
    : template.units;
  if (!Array.isArray(raw.placements) || raw.placements.length !== roster.length)
    fail("Place every roster actor exactly once.");
  const actors = new Set<string>(),
    occupied = new Set<string>();
  for (const p of raw.placements) {
    if (!record(p)) fail("Invalid actor placement.");
    fields(p, ["id", "x", "z"]);
    if (
      !roster.some((u) => u.id === p.id) ||
      actors.has(String(p.id)) ||
      !int(p.x, 0, dimensions.width - 1) ||
      !int(p.z, 0, dimensions.height - 1)
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
  if (new TextEncoder().encode(text).length > NATIVE_PROJECT_LIMIT)
    fail(
      "Project exceeds the 128 KiB legacy / 512 KiB expanded-map / 8 MiB native import limit.",
    );
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    if (new TextEncoder().encode(text).length > LEGACY_PROJECT_LIMIT)
      fail(
        "Project exceeds the 128 KiB legacy import limit; larger imports require native sprite source.",
      );
    fail("Invalid JSON. Choose an exported level project.");
  }
  const project = validateLevelProject(raw);
  if (
    !project.nativeSprite &&
    new TextEncoder().encode(text).length >
      (project.dimensions ? LARGE_PROJECT_LIMIT : LEGACY_PROJECT_LIMIT)
  )
    fail(
      "Project exceeds the 128 KiB legacy / 512 KiB expanded-map import limit.",
    );
  return project;
}
export function exportLevelProject(project: LevelProject): string {
  const p = validateLevelProject(project),
    pretty = JSON.stringify(p, null, 2) + "\n";
  const limit = p.nativeSprite
    ? NATIVE_PROJECT_LIMIT
    : p.dimensions
      ? LARGE_PROJECT_LIMIT
      : LEGACY_PROJECT_LIMIT;
  if (new TextEncoder().encode(pretty).length <= limit) return pretty;
  const compact = JSON.stringify(p) + "\n";
  if (new TextEncoder().encode(compact).length > limit)
    fail(
      "Project exceeds the 128 KiB legacy / 512 KiB expanded-map / 8 MiB native export limit.",
    );
  return compact;
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
  | { type: "resize"; width: number; height: number; terrain: Tile["terrain"] }
  | { type: "place"; id: string; x: number; z: number }
  | { type: "metadata"; name: string; seed: number }
  | { type: "sounds"; bank: SoundBank }
  | { type: "music"; pattern: MusicPattern }
  | { type: "pixels"; clip: PixelClip }
  | { type: "native-sprite"; sprite: NativeSprite }
  | { type: "load-encounter"; encounter: EncounterId }
  | { type: "content"; content: GameContent }
  | { type: "materials"; materials: TerrainMaterials }
  | { type: "game-audio"; audio: GameAudio }
  | { type: "rules"; rules: RuleCatalog | null }
  | {
      type: "roster";
      content: GameContent;
      placements: LevelProject["placements"];
    }
  | { type: "expansion" };
/** Atomic batch: reject every operation if any resulting invariant fails. */
export function editProject(
  project: LevelProject,
  expectedRevision: number,
  edits: ProjectEdit[],
): LevelProject {
  if (project.revision !== expectedRevision)
    fail("Stale revision. Reopen the current project before editing.");
  if (!edits.length || edits.length > 1024)
    fail("Use a batch of 1–1024 edits.");
  const next = structuredClone(project);
  for (const e of edits) {
    if (e.type === "expansion") Object.assign(next, buildExpansion(next));
    else if (e.type === "roster") {
      next.content = validateGameContent(e.content, next.rules);
      next.placements = structuredClone(e.placements);
    } else if (e.type === "resize") {
      const dimensions = { width: e.width, height: e.height };
      if (!validMapDimensions(dimensions))
        fail("Map width and height must be whole numbers from 9 to 32.");
      if (!["grass", "stone", "water", "ice"].includes(e.terrain))
        fail("Invalid expansion terrain.");
      if (next.placements.some((p) => p.x >= e.width || p.z >= e.height))
        fail("Move actors inside the new boundaries before shrinking the map.");
      const old = new Map(next.tiles.map((t) => [t.x + "," + t.z, t]));
      next.tiles = [];
      for (let z = 0; z < e.height; z++)
        for (let x = 0; x < e.width; x++)
          next.tiles.push(
            old.get(x + "," + z) ?? {
              x,
              z,
              h: 0,
              terrain: e.terrain,
              blocked: false,
            },
          );
      next.dimensions = dimensions;
    } else if (e.type === "load-encounter") {
      if (!Object.hasOwn(encounters, e.encounter))
        fail("Unknown source encounter.");
      const source = createLevelProject(e.encounter),
        existing = next.content;
      next.encounter = e.encounter;
      next.name = encounters[e.encounter].name;
      delete next.dimensions;
      next.tiles = source.tiles;
      next.placements = source.placements;
      next.content = {
        ...(existing ?? gameContent(e.encounter)),
        actors: gameContent(e.encounter).actors,
      };
    } else if (e.type === "rules") {
      if (e.rules === null) delete next.rules;
      else next.rules = validateRules(e.rules);
    } else if (e.type === "content")
      next.content = validateGameContent(e.content, next.rules);
    else if (e.type === "materials")
      next.materials = validateMaterials(e.materials);
    else if (e.type === "game-audio")
      next.gameAudio = validateGameAudio(e.audio);
    else if (e.type === "tile") {
      const tile = next.tiles.find((t) => t.x === e.x && t.z === e.z);
      if (!tile) fail("Tile outside the current map.");
      if (e.terrain !== undefined) tile.terrain = e.terrain;
      if (e.h !== undefined) tile.h = e.h;
      if (e.blocked !== undefined) tile.blocked = e.blocked;
    } else if (e.type === "place") {
      const actor = next.placements.find((p) => p.id === e.id);
      if (!actor) fail("Unknown actor.");
      actor.x = e.x;
      actor.z = e.z;
    } else if (e.type === "native-sprite") {
      next.nativeSprite = validateNativeSprite(e.sprite);
    } else if (e.type === "pixels") {
      next.pixels = validatePixelClip(e.clip);
    } else if (e.type === "music") {
      next.music = validateMusicPattern(e.pattern);
    } else if (e.type === "sounds") {
      next.sounds = validateSoundBank(e.bank);
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
    battle = createBattle(p.seed, p.encounter ?? "shrine");
  if (p.dimensions) battle.dimensions = structuredClone(p.dimensions);
  if (p.rules) battle.rules = structuredClone(p.rules);
  battle.tiles = p.tiles.map((t) => ({ ...t, burn: 0 }));
  if (p.content) {
    battle.victoryJP = p.content.victoryJP;
    const baseline = battle.units;
    battle.units = p.content.actors.map((source, i) => {
      const original =
        baseline.find((u) => u.id === source.id) ??
        baseline.find((u) => u.team === "enemy")!;
      const u = structuredClone(original);
      Object.assign(
        u,
        structuredClone(source),
        p.placements.find((x) => x.id === source.id)!,
      );
      u.team = ["sera", "ilya", "corin", "mae"].includes(u.id)
        ? "ally"
        : "enemy";
      if (!baseline.some((v) => v.id === source.id)) {
        u.next = 12 + i;
        u.jpSpent = {};
      }
      u.maxHp = unitStats(u, battle.rules).hp;
      u.hp = u.maxHp;
      u.mp = u.maxMp;
      return u;
    });
  } else
    for (const u of battle.units)
      Object.assign(
        u,
        p.placements.find((x) => x.id === u.id)!,
      );
  battle.log = [
    p.name +
      " · preview revision " +
      p.revision +
      ". " +
      (p.content?.contracts[battle.encounter].objective ??
        encounters[battle.encounter].objective) +
      ". Isolated project preview.",
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
        project: parseLevelProject(hydrateCheckpoint(storage, text)),
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
  const exported = exportLevelProject(project);
  let text = exported;
  if (project.nativeSprite) {
    const assetKey = STUDIO_STORAGE + ".native." + project.nativeSprite.sha256;
    const existing = storage.getItem(assetKey);
    if (existing && existing !== project.nativeSprite.image)
      fail(
        "Conflicting native image digest. Export the project before continuing.",
      );
    if (!existing) storage.setItem(assetKey, project.nativeSprite.image);
    text =
      JSON.stringify({
        ...project,
        nativeSprite: {
          ...project.nativeSprite,
          image: "asset:" + project.nativeSprite.sha256,
        },
      }) + "\n";
  }
  if (current) {
    let valid = false;
    try {
      parseLevelProject(hydrateCheckpoint(storage, current));
      valid = true;
    } catch {
      /* Keep valid backup. */
    }
    if (valid) storage.setItem(STUDIO_STORAGE + ".backup", current);
  }
  storage.setItem(STUDIO_STORAGE, text);
  return text;
}

function hydrateCheckpoint(storage: StudioStorage, text: string): string {
  const raw = JSON.parse(text);
  if (
    raw?.nativeSprite &&
    typeof raw.nativeSprite.image === "string" &&
    raw.nativeSprite.image === "asset:" + raw.nativeSprite.sha256
  ) {
    const image = storage.getItem(
      STUDIO_STORAGE + ".native." + raw.nativeSprite.sha256,
    );
    if (!image) throw Error("Native checkpoint image is missing.");
    raw.nativeSprite.image = image;
    return JSON.stringify(raw);
  }
  return text;
}
