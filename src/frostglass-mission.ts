import { buildEnvoyMission } from "./envoy-mission";
import { createCatalogRecord } from "./studio-authoring";
import { validateRules } from "./studio-rules";
import { validateGameContent } from "./studio-content";
import type { LevelProject } from "./studio-project";
/** Four named playable profiles, using the existing company slots. */
export function buildFrostglassMission(project: LevelProject): LevelProject {
  const p = buildEnvoyMission(project);
  let r = p.rules!;
  for (const [id, base, name, cost, range, power, description] of [
    [
      "custom-rimeward",
      "aegis",
      "Rimeward",
      7,
      2,
      0,
      "Shield one living ally with guard and cleanse burn. Short-range protection, not ice immunity.",
    ],
    [
      "custom-frostline",
      "frost",
      "Frostline",
      7,
      3,
      18,
      "Freeze a cross of water into traversable ice and slow enemies for two activations. Lower reach than Stillwater.",
    ],
    [
      "custom-winters-mercy",
      "mend",
      "Winter's mercy",
      7,
      2,
      28,
      "Heal a nearby ally and cleanse burn, or revive at the existing fixed 24 health. Close support rather than long-range recovery.",
    ],
    [
      "custom-sunlit-pursuit",
      "gloam",
      "Sunlit pursuit",
      8,
      2,
      28,
      "Physical pursuit that consumes exposure on a successful hit. An exposed target takes the existing twelve-point pursuit bonus.",
    ],
    [
      "custom-dawn-cut",
      "cleave",
      "Dawn cut",
      7,
      1,
      26,
      "A close cross-shaped saber attack. Allies are spared; costs the same energy as Sundering arc with lower power.",
    ],
    [
      "custom-daybreak-feint",
      "veil",
      "Daybreak feint",
      5,
      3,
      12,
      "Spirit damage that exposes an enemy for two activations on a hit. Shorter reach and lower cost than Dusk needle.",
    ],
  ] as const) {
    r = createCatalogRecord(r, "skills", id, base);
    Object.assign(r.skills[id], { name, cost, range, power, description });
  }
  for (const [
    id,
    base,
    name,
    role,
    color,
    move,
    speed,
    attack,
    armor,
    magic,
    skills,
  ] of [
    [
      "custom-frost-sentinel",
      "runewarden",
      "Frost Sentinel",
      "Guard / ice crossing / close recovery",
      "#658eac",
      4,
      10,
      6,
      9,
      6,
      ["custom-rimeward", "custom-frostline", "custom-winters-mercy"],
    ],
    [
      "custom-dawn-duelist",
      "dancer",
      "Dawn Duelist",
      "Mobile exposure / pursuit",
      "#c0974e",
      5,
      14,
      9,
      4,
      2,
      ["custom-sunlit-pursuit", "custom-dawn-cut", "custom-daybreak-feint"],
    ],
  ] as const) {
    r = createCatalogRecord(r, "jobs", id, base);
    Object.assign(r.jobs[id], {
      name,
      role,
      color,
      move,
      speed,
      attack,
      armor,
      magic,
      skills: [...skills],
      requires: {},
    });
  }
  for (const [id, base, name, bonuses, price, description] of [
    [
      "custom-rime-spear",
      "ironblade",
      "Rimeglass spear",
      { attack: 4, magic: 2 },
      95,
      "A short spear for Frost Sentinels. Its name grants no additional attack range.",
    ],
    [
      "custom-dawn-saber",
      "twinsteel",
      "Dawnsteel saber",
      { attack: 5, speed: 1 },
      100,
      "A balanced saber for Dawn Duelists. Existing class and exposure rules determine its strikes.",
    ],
    [
      "custom-vigil-compass",
      "watchcharm",
      "Vigil compass",
      { armor: 1, move: 1 },
      0,
      "First-clear relic of the Frostglass Vigil. Keeps the company moving through winter roads.",
    ],
  ] as const) {
    r = createCatalogRecord(r, "gear", id, base);
    Object.assign(r.gear[id], {
      name,
      bonuses: { ...bonuses },
      price,
      description,
    });
    delete r.gear[id].jobs;
  }
  r = createCatalogRecord(r, "gear", "custom-rimeplate", "lamellar");
  Object.assign(r.gear["custom-rimeplate"], {
    name: "Rimeplate",
    price: 105,
    jobs: ["custom-frost-sentinel"],
    bonuses: { armor: 4, hp: 16, move: -1 },
    description:
      "Frost Sentinel plate. More protection at the cost of one movement; grants no ice immunity.",
  });
  r.gear["custom-rime-spear"].jobs = ["custom-frost-sentinel"];
  r.gear["custom-dawn-saber"].jobs = ["custom-dawn-duelist"];
  r.gear["custom-vigil-compass"].rewardOnly = true;
  const c = p.content!,
    nera = c.actors.find((a) => a.id === "mae")!,
    joren = c.actors.find((a) => a.id === "corin")!;
  Object.assign(nera, {
    name: "Nera Coldmere",
    job: "custom-frost-sentinel",
    secondary: "vanguard",
    baseHp: 118,
    maxMp: 36,
    learned: ["cleave"],
    jp: { "custom-frost-sentinel": 0 },
    equipment: {
      weapon: "custom-rime-spear",
      armor: "custom-rimeplate",
      relic: "watchcharm",
    },
  });
  Object.assign(joren, {
    name: "Joren Ashbrook",
    job: "custom-dawn-duelist",
    secondary: "shadowrunner",
    baseHp: 102,
    maxMp: 32,
    learned: ["gloam"],
    jp: { "custom-dawn-duelist": 0 },
    equipment: {
      weapon: "custom-dawn-saber",
      armor: "leather",
      relic: "wayboots",
    },
  });
  for (const [templateId, name, job, secondary, baseHp, maxMp, learned] of [
    [
      "enemy-kiln-warden",
      "Captain Ysra",
      "custom-frost-sentinel",
      "vanguard",
      94,
      30,
      ["cleave"],
    ],
    [
      "enemy-coal-runner",
      "Darian Sunscar",
      "custom-dawn-duelist",
      "shadowrunner",
      78,
      30,
      ["gloam"],
    ],
  ] as const) {
    const template = c.enemyTemplates!.find((t) => t.id === templateId)!;
    Object.assign(template, {
      name,
      job,
      secondary,
      baseHp,
      maxMp,
      learned: [...learned],
      jp: { [job]: 0 },
    });
    const actor = c.actors.find((a) => a.id === templateId + "-ashen-weir")!;
    Object.assign(actor, structuredClone(template), { id: actor.id });
  }
  // Keep this mixed-party introduction less durable than the rival-only Parley.
  for (const [templateId, hp] of [
    ["enemy-ash-sentry", 64],
    ["enemy-ember-scholar", 64],
    ["enemy-lantern-mender", 54],
    ["enemy-cinder-clock", 66],
  ] as const) {
    c.enemyTemplates!.find((t) => t.id === templateId)!.baseHp = hp;
    c.actors.find((a) => a.id === templateId + "-ashen-weir")!.baseHp = hp;
  }
  p.name = "The Frostglass Vigil";
  p.dimensions = { width: 22, height: 18 };
  p.tiles = [];
  for (let z = 0; z < 18; z++)
    for (let x = 0; x < 22; x++) {
      const pool =
        (z === 3 || z === 4 || z === 13 || z === 14) && x >= 7 && x <= 10;
      p.tiles.push({
        x,
        z,
        h: x >= 16 ? 1 : 0,
        terrain: pool
          ? "water"
          : (z >= 7 && z <= 10) || x >= 15
            ? "stone"
            : "grass",
        blocked: false,
      });
    }
  const positions = [
    ["sera", 5, 8],
    ["ilya", 4, 7],
    ["corin", 5, 10],
    ["mae", 5, 6],
    ["enemy-kiln-warden-ashen-weir", 12, 8],
    ["enemy-ash-sentry-ashen-weir", 12, 10],
    ["enemy-ember-scholar-ashen-weir", 15, 5],
    ["enemy-coal-runner-ashen-weir", 13, 12],
    ["enemy-lantern-mender-ashen-weir", 16, 9],
    ["enemy-cinder-clock-ashen-weir", 16, 12],
  ] as const;
  p.placements = positions.map(([id, x, z]) => ({ id, x, z }));
  Object.assign(c.contracts.redoubt, {
    name: p.name,
    subtitle: "Four envoys / The winter road",
    description:
      "Tamsin and Orris join Nera and Joren at a frozen-road outpost. Ysra and Darian guard the eastern terrace. Defeat all six enemies; frozen crossings are tactical terrain, not extraction objectives.",
    objective: "Defeat Ysra, Darian and all four wardens",
    reward: 165,
    firstClearRelic: "custom-vigil-compass",
  });
  c.victoryJP = 80;
  c.dialogue.redoubt = [
    {
      id: "vigil-arrival",
      speaker: "narrator",
      text: "The winter road bends around still pools below the eastern watch. Four envoys arrive before Captain Ysra closes the route.",
    },
    {
      id: "vigil-nera",
      speaker: "mae",
      text: "I kept these crossings open before the crown had a name for them. Frostline can make us another path, but the stone road is clear.",
    },
    {
      id: "vigil-joren",
      speaker: "corin",
      text: "Tamsin, mark their lead fighter. I can turn an exposed guard into an opening.",
    },
    {
      id: "vigil-ysra",
      speaker: "enemy-kiln-warden-ashen-weir",
      text: "Coldmere. You always mistook keeping a road for owning it.",
    },
    {
      id: "vigil-darian",
      speaker: "enemy-coal-runner-ashen-weir",
      text: "And you, Ashbrook. Show me whether your dawn reaches this far.",
    },
    {
      id: "vigil-orris",
      speaker: "ilya",
      text: "Stay within Nera's reach if you need recovery. My lantern can protect the advance and delay their support.",
    },
  ];
  p.rules = validateRules(r);
  p.content = validateGameContent(c, p.rules);
  return p;
}
