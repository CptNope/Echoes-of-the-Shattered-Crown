import {
  buildExpansion,
  createEnemyTemplate,
  spawnEnemy,
} from "./studio-authoring";
import { gameRules, validateRules } from "./studio-rules";
import { gameContent, validateGameContent } from "./studio-content";
import { emptyLoadout } from "./equipment";
import type { LevelProject } from "./studio-project";

/** Complete, balanced mission preset. Cosmetic project sources are preserved. */
export function buildGreybank(project: LevelProject): LevelProject {
  const p = buildExpansion({
    ...structuredClone(project),
    rules: gameRules(),
    content: gameContent("causeway"),
  });
  const content = p.content!,
    rules = p.rules!;
  rules.skills["custom-glacial-chain"].description =
    "Freeze a cross of river water and slow enemies caught in it. Creates an alternate crossing at Greybank.";
  rules.gear["custom-waystone"].name = "Sluicekeeper's waystone";
  rules.gear["custom-waystone"].description =
    "Greybank's first-clear relic. A worn route-stone grants one movement and one speed.";
  rules.gear["custom-waystone"].rewardOnly = true;
  rules.gear["custom-waystone"].price = 0;
  const guard = content.enemyTemplates!.find(
    (t) => t.id === "enemy-brineguard",
  )!;
  guard.name = "Sluicekeeper Venn";
  guard.baseHp = 115;
  guard.maxMp = 32;
  guard.equipment = emptyLoadout();
  const rime = content.enemyTemplates!.find(
    (t) => t.id === "enemy-rimeweaver",
  )!;
  rime.name = "North-bank Rimeweaver";
  rime.baseHp = 78;
  rime.maxMp = 40;
  const cantor = content.enemyTemplates!.find(
    (t) => t.id === "enemy-tide-cantor",
  )!;
  cantor.name = "Reed Cantor";
  cantor.baseHp = 82;
  cantor.maxMp = 40;
  const copied = createEnemyTemplate(
    content,
    "corin",
    "enemy-sluice-outrider",
    rules,
  );
  Object.assign(
    copied.enemyTemplates!.find((t) => t.id === "enemy-sluice-outrider")!,
    {
      name: "South-bank Outrider",
      job: "dancer",
      secondary: "vanguard",
      baseHp: 82,
      maxMp: 24,
      learned: ["cleave"],
      jp: { dancer: 0 },
      equipment: emptyLoadout(),
    },
  );
  copied.actors = copied.actors.filter((a) =>
    ["sera", "ilya", "corin", "mae"].includes(a.id),
  );
  let placements = [
    { id: "sera", x: 5, z: 6 },
    { id: "ilya", x: 4, z: 5 },
    { id: "corin", x: 5, z: 8 },
    { id: "mae", x: 4, z: 7 },
  ];
  let roster = copied;
  for (const [id, x, z] of [
    ["enemy-brineguard", 11, 6],
    ["enemy-rimeweaver", 13, 3],
    ["enemy-tide-cantor", 13, 9],
    ["enemy-sluice-outrider", 10, 10],
  ] as const) {
    const out = spawnEnemy(
      roster,
      placements,
      id,
      id + "-greybank",
      x,
      z,
      rules,
    );
    roster = out.content;
    placements = out.placements;
  }
  Object.assign(roster.contracts.causeway, {
    name: "The Sluice at Greybank",
    subtitle: "Tidewarden mission / A road of winter",
    description:
      "Greybank's toll-keepers hold both bridges. Freeze a shorter crossing or use the bank paths to separate their defenders. Defeat all four enemies; the sluice is scenery, not an interactable objective.",
    objective: "Defeat Venn and all three bank defenders",
    reward: 120,
    requires: "shrine",
    firstClearRelic: "custom-waystone",
  });
  roster.victoryJP = 70;
  roster.dialogue.causeway = [
    {
      id: "greybank-river",
      speaker: "narrator",
      text: "Two bridges flank Greybank's broken sluice. Rimeweavers watch the northern terrace; an outrider patrols the low southern road.",
    },
    {
      id: "greybank-venn",
      speaker: "enemy-brineguard-greybank",
      text: "Every road here pays its toll. The river will take what you refuse.",
    },
    {
      id: "greybank-sera",
      speaker: "sera",
      text: "Then we make another road. Glacial Chain can freeze a cross of river tiles. Guard whoever leads, and keep Maelis within reach.",
    },
    {
      id: "greybank-ilya",
      speaker: "ilya",
      text: "Brine Lance soaks them. My Glasslight Bolt can turn that into an opening. Or we split their line at the bridges.",
    },
  ];
  p.name = "The Sluice at Greybank";
  p.dimensions = { width: 18, height: 14 };
  p.tiles = [];
  for (let z = 0; z < 14; z++)
    for (let x = 0; x < 18; x++) {
      const river = x === 8 || x === 9,
        bridge = z === 3 || z === 10;
      const terrace =
        x >= 11 && x <= 15 && ((z >= 2 && z <= 4) || (z >= 10 && z <= 11));
      p.tiles.push({
        x,
        z,
        h: terrace ? 1 : 0,
        terrain:
          river && !bridge
            ? "water"
            : bridge || (x >= 11 && z >= 5 && z <= 8)
              ? "stone"
              : "grass",
        blocked: [
          [12, 5],
          [13, 5],
          [12, 6],
          [4, 9],
          [3, 9],
        ].some(([a, b]) => a === x && b === z),
      });
    }
  p.placements = placements;
  p.rules = validateRules(rules);
  p.content = validateGameContent(roster, p.rules);
  return p;
}
