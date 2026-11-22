import { createBattle } from "./engine";
import { encounters, type EncounterId } from "./encounters";
import { gameContent, validateGameContent } from "./studio-content";
import { gameRules } from "./studio-rules";
import { buildGreybank } from "./greybank";
import type { LevelProject } from "./studio-project";
export type MissionPresetId = EncounterId | "greybank";
export const MISSION_PRESETS: {
  id: MissionPresetId;
  name: string;
  summary: string;
}[] = [
  {
    id: "shrine",
    name: "The Shrine of Veyr",
    summary:
      "9 by 9 / introductory crossing, elemental terrain and four Oathless defenders.",
  },
  {
    id: "causeway",
    name: "The Drowned Causeway",
    summary:
      "9 by 9 / flooded road, mobile outriders and elevated caster support.",
  },
  {
    id: "redoubt",
    name: "The Oathless Redoubt",
    summary:
      "9 by 9 / armored formation, advanced classes and a narrow approach.",
  },
  {
    id: "bellkeeper",
    name: "The Silent Belfry",
    summary:
      "9 by 9 / raised courtyard and Orren's existing half-health awakening.",
  },
  {
    id: "greybank",
    name: "The Sluice at Greybank",
    summary:
      "18 by 14 / Tidewarden, two bridges, a shortcut to freeze and four specialists.",
  },
];
const hints: Record<EncounterId, { speaker: string; text: string }[]> = {
  shrine: [
    {
      speaker: "ilya",
      text: "Stone is the safe crossing. Stillwater can freeze river tiles if we need another route; height and flanking also affect our attacks.",
    },
    {
      speaker: "mae",
      text: "Stay within healing reach. We must defeat all four defenders, not merely reach the shrine.",
    },
  ],
  causeway: [
    {
      speaker: "corin",
      text: "The outriders can close quickly. Let them leave their support behind before we commit to the far bank.",
    },
    {
      speaker: "ilya",
      text: "A frozen crossing can bypass the flooded road. Watch the caster's raised position.",
    },
  ],
  redoubt: [
    {
      speaker: "sera",
      text: "The warden holds the approach while their specialists work behind it. Guard the lead fighter and find a flank.",
    },
    {
      speaker: "mae",
      text: "The healer of hours can undo our pressure. We need an opening, not four isolated duels.",
    },
  ],
  bellkeeper: [
    {
      speaker: "sentinel",
      text: "This seal is the last oath I have left. You will not take it quietly.",
    },
    {
      speaker: "sera",
      text: "Orren changes the fight at half health. Keep energy and healing in reserve when we break his guard.",
    },
  ],
};
/** One explicit balanced preset transaction; cosmetic sources and document identity survive. */
export function loadMissionPreset(
  project: LevelProject,
  id: MissionPresetId,
): LevelProject {
  if (!MISSION_PRESETS.some((p) => p.id === id))
    throw Error("Unknown mission preset.");
  if (id === "greybank") return buildGreybank(project);
  const battle = createBattle(project.seed, id),
    content = gameContent(id, battle.units);
  content.enemyTemplates = content.actors
    .filter((a) => !["sera", "ilya", "corin", "mae"].includes(a.id))
    .map((a) => ({
      ...structuredClone(a),
      id: `enemy-${id}-${a.id}-template`,
      team: "enemy" as const,
    }));
  content.dialogue[id].push(
    ...hints[id].map((h, i) => ({ id: `${id}-tactics-${i + 1}`, ...h })),
  );
  return {
    ...structuredClone(project),
    name: encounters[id].name,
    encounter: id,
    dimensions: { width: 9, height: 9 },
    tiles: battle.tiles.map(({ x, z, h, terrain, blocked }) => ({
      x,
      z,
      h,
      terrain,
      // The shipped corner is isolated by two collision tiles; make its scenery explicit.
      blocked: blocked || (id !== "bellkeeper" && x === 8 && z === 8),
    })),
    placements: battle.units.map(({ id, x, z }) => ({ id, x, z })),
    rules: gameRules(),
    content: validateGameContent(content),
  };
}
