import {
  createCatalogRecord,
  createEnemyTemplate,
  spawnEnemy,
} from "./studio-authoring";
import { gameRules, validateRules } from "./studio-rules";
import { gameContent, validateGameContent } from "./studio-content";
import { emptyLoadout } from "./equipment";
import type { LevelProject } from "./studio-project";
export type EmberMissionId = "ashen-weir" | "cinder-archive";

/** Authored standalone missions using supported combat rules and native artwork. */
export function buildEmberMission(
  project: LevelProject,
  id: EmberMissionId,
): LevelProject {
  const archive = id === "cinder-archive";
  const p = structuredClone(project);
  let rules = gameRules();
  for (const [key, base, name, power, cost, range, description] of [
    [
      "custom-ashfall",
      "ember",
      "Ashfall",
      24,
      8,
      4,
      "A lighter cross of fire. Burns enemies and ignites grass; water remains a safer approach. Trades damage for a lower energy cost.",
    ],
    [
      "custom-hearthguard",
      "aegis",
      "Hearthguard",
      0,
      6,
      2,
      "Guard one nearby ally and cleanse burn until their next activation. Cheaper than Oathguard, with shorter reach.",
    ],
    [
      "custom-cinderstep",
      "haste",
      "Cinderstep",
      0,
      7,
      3,
      "Advance one ally by 35 timeline ticks. Costs one less energy than Borrowed dawn; does not grant a lasting speed status.",
    ],
    [
      "custom-kindlethread",
      "mend",
      "Kindlethread",
      26,
      6,
      3,
      "Restore an ally or revive a fallen companion using the existing healing rule. Lower cost, power and reach than Thread of life.",
    ],
  ] as const) {
    rules = createCatalogRecord(rules, "skills", key, base);
    Object.assign(rules.skills[key], { name, power, cost, range, description });
  }
  rules = createCatalogRecord(
    rules,
    "jobs",
    "custom-emberwarden",
    "runewarden",
  );
  Object.assign(rules.jobs["custom-emberwarden"], {
    name: "Emberwarden",
    role: "Close support / controlled fire",
    color: "#b5603c",
    move: 4,
    speed: 11,
    attack: 7,
    armor: 7,
    magic: 7,
    skills: [
      "custom-ashfall",
      "custom-hearthguard",
      "custom-cinderstep",
      "custom-kindlethread",
    ],
    requires: {},
  });
  for (const [key, base, name, bonuses, price, description] of [
    [
      "custom-coalbrand",
      "ironblade",
      "Coalbrand",
      { attack: 4, magic: 3 },
      95,
      "A furnace-tempered blade for an Emberwarden or Runewarden. Balanced physical and magical pressure.",
    ],
    [
      "custom-kilncoat",
      "leather",
      "Kilncoat",
      { armor: 3, hp: 14 },
      85,
      "A padded workshop coat. Adds health and armor; grants no fire immunity.",
    ],
    [
      "custom-emberglass",
      "copperfocus",
      "Emberglass lens",
      { magic: 3, speed: 1 },
      90,
      "A soot-dark lens that focuses magic without slowing the bearer.",
    ],
    [
      "custom-ashrunner-blades",
      "twinsteel",
      "Ashrunner blades",
      { attack: 4, speed: 1 },
      90,
      "Light blades for the company's flanker.",
    ],
    [
      "custom-weir-token",
      "watchcharm",
      "Weirkeeper's token",
      { armor: 2, hp: 12 },
      0,
      "First-clear keepsake from the Ashen Weir. A defensive relic, with no scripted interaction.",
    ],
    [
      "custom-archive-lantern",
      "copperfocus",
      "Archive lantern",
      { magic: 4, hp: 8 },
      0,
      "First-clear keepsake from the Cinder Archive. Its light carries no new targeting rule.",
    ],
  ] as const) {
    rules = createCatalogRecord(rules, "gear", key, base);
    Object.assign(rules.gear[key], {
      name,
      bonuses: { ...bonuses },
      price,
      description,
    });
    delete rules.gear[key].jobs;
  }
  rules.gear["custom-coalbrand"].jobs = ["custom-emberwarden", "runewarden"];
  rules.gear["custom-weir-token"].rewardOnly = true;
  rules.gear["custom-archive-lantern"].rewardOnly = true;
  let content = gameContent("redoubt");
  content.enemyTemplates = [];
  const defs = [
    [
      "enemy-kiln-warden",
      "Kiln Warden",
      "runewarden",
      "vanguard",
      95,
      28,
      ["cleave"],
    ],
    [
      "enemy-ash-sentry",
      "Ash Sentry",
      "vanguard",
      "custom-emberwarden",
      78,
      24,
      ["custom-hearthguard"],
    ],
    [
      "enemy-ember-scholar",
      "Ember Scholar",
      "arcanist",
      "custom-emberwarden",
      65,
      32,
      ["custom-ashfall"],
    ],
    [
      "enemy-coal-runner",
      "Coal Runner",
      "dancer",
      "vanguard",
      68,
      24,
      ["cleave"],
    ],
    [
      "enemy-lantern-mender",
      "Lantern Mender",
      "lifebinder",
      "custom-emberwarden",
      65,
      32,
      ["custom-hearthguard"],
    ],
    [
      "enemy-cinder-clock",
      "Cinder Clockkeeper",
      "chronoweaver",
      "arcanist",
      68,
      32,
      ["frost"],
    ],
  ] as const;
  for (const [key, name, job, secondary, baseHp, maxMp, learned] of defs) {
    content = createEnemyTemplate(content, "sera", key, rules);
    Object.assign(
      content.enemyTemplates!.find((t) => t.id === key)!,
      {
        name,
        job,
        secondary,
        baseHp,
        maxMp,
        learned: [...learned],
        jp: { [job]: 0 },
        equipment: emptyLoadout(),
      },
    );
  }
  content.actors = content.actors.filter((a) =>
    ["sera", "ilya", "corin", "mae"].includes(a.id),
  );
  const sera = content.actors.find((a) => a.id === "sera")!;
  Object.assign(sera, {
    job: "custom-emberwarden",
    secondary: "vanguard",
    learned: ["cleave"],
    jp: { "custom-emberwarden": 0 },
    equipment: {
      weapon: "custom-coalbrand",
      armor: "custom-kilncoat",
      relic: "custom-emberglass",
    },
  });
  content.actors.find((a) => a.id === "corin")!.equipment = {
    weapon: "custom-ashrunner-blades",
    armor: null,
    relic: null,
  };
  let placements = [
    { id: "sera", x: 4, z: 7 },
    { id: "ilya", x: 3, z: 6 },
    { id: "corin", x: 4, z: 9 },
    { id: "mae", x: 3, z: 8 },
  ];
  const positions = archive
    ? [
        [12, 7],
        [11, 10],
        [16, 5],
        [13, 12],
        [17, 9],
        [18, 12],
      ]
    : [
        [11, 7],
        [11, 10],
        [14, 4],
        [12, 12],
        [15, 9],
        [15, 12],
      ];
  for (let i = 0; i < defs.length; i++) {
    const key = defs[i][0],
      [x, z] = positions[i];
    const out = spawnEnemy(
      content,
      placements,
      key,
      key + "-" + id,
      x,
      z,
      rules,
    );
    content = out.content;
    placements = out.placements;
  }
  const name = archive ? "The Cinder Archive" : "The Ashen Weir";
  Object.assign(content.contracts.redoubt, {
    name,
    subtitle: archive
      ? "Emberwarden mission / The names we keep"
      : "Emberwarden mission / A borrowed flame",
    description: archive
      ? "The archive wardens guard the surviving flood records. Climb the terraces, separate their healer from the line, and defeat all six defenders. Shelves and lanterns are scenery."
      : "The weir's keepers have barred the old road. Two open approaches divide their formation. Defeat all six defenders; the gate and waterworks are scenery.",
    objective: "Defeat all six defenders",
    reward: archive ? 180 : 150,
    requires: "causeway",
    firstClearRelic: archive ? "custom-archive-lantern" : "custom-weir-token",
  });
  content.victoryJP = archive ? 85 : 75;
  content.dialogue.redoubt = archive
    ? [
        {
          id: "archive-arrival",
          speaker: "narrator",
          text: "Beyond the weir, the Cinder Archive rises in three stone terraces. The last flood records lie behind the wardens' line.",
        },
        {
          id: "archive-demand",
          speaker: "enemy-cinder-clock-cinder-archive",
          text: "Every name in these books paid for its place. Why should yours be different?",
        },
        {
          id: "archive-sera",
          speaker: "sera",
          text: "We came for the names the river took. The terraces give them height, so take one step at a time.",
        },
        {
          id: "archive-corin",
          speaker: "corin",
          text: "I'll draw the runner south. Keep their mender from patching the whole line.",
        },
        {
          id: "archive-mae",
          speaker: "mae",
          text: "Hearthguard cleanses burn. Save an action to protect whoever crosses the last stair.",
        },
      ]
    : [
        {
          id: "weir-arrival",
          speaker: "narrator",
          text: "Greybank's winter road ends at the Ashen Weir. Old furnace walls split the approach, but both passages remain open.",
        },
        {
          id: "weir-warning",
          speaker: "enemy-kiln-warden-ashen-weir",
          text: "We kept this bank standing when the crown forgot it. Take another road.",
        },
        {
          id: "weir-sera",
          speaker: "sera",
          text: "Then let us through together. If you will not, we break the line without burning the bank.",
        },
        {
          id: "weir-ilya",
          speaker: "ilya",
          text: "Ashfall spreads across grass. Water and stone give us safer places to regroup; Hearthguard will clear a burn.",
        },
        {
          id: "weir-mae",
          speaker: "mae",
          text: "Kindlethread reaches less far than my Thread of life. Stay close enough to bring each other back.",
        },
      ];
  const width = archive ? 24 : 20,
    height = archive ? 18 : 16;
  p.name = name;
  p.encounter = "redoubt";
  p.dimensions = { width, height };
  p.tiles = [];
  for (let z = 0; z < height; z++)
    for (let x = 0; x < width; x++) {
      const pool = archive
        ? (z === 3 || z === 14) && x >= 8 && x <= 11
        : (z === 3 || z === 13) && x >= 6 && x <= 9;
      const wall = archive
        ? x === 14 && [3, 4, 11, 12, 13, 14].includes(z)
        : x === 9 && z >= 4 && z <= 12 && z !== 7 && z !== 10;
      p.tiles.push({
        x,
        z,
        h: archive
          ? x >= 16
            ? 2
            : x >= 10
              ? 1
              : 0
          : x >= 12 && z <= 6
            ? 1
            : 0,
        terrain: pool
          ? "water"
          : archive || z === 7 || z === 10
            ? "stone"
            : "grass",
        blocked: wall,
      });
    }
  p.placements = placements;
  p.rules = validateRules(rules);
  p.content = validateGameContent(content, p.rules);
  return p;
}
