import { buildFrostglassMission } from "./frostglass-mission";
import { createCatalogRecord } from "./studio-authoring";
import { validateRules } from "./studio-rules";
import { validateGameContent } from "./studio-content";
import type { LevelProject } from "./studio-project";

/** Standalone character pack; company slot IDs remain stable and overrides survive. */
export function buildBriarMission(project: LevelProject): LevelProject {
  const p = buildFrostglassMission(project);
  let r = p.rules!;
  for (const [id, base, name, cost, range, power, description] of [
    [
      "custom-briar-shelter",
      "aegis",
      "Briar shelter",
      6,
      2,
      0,
      "Guard one nearby living ally and cleanse burn until their next activation. The thorns do not retaliate or root enemies.",
    ],
    [
      "custom-dewfall",
      "raincall",
      "Dewfall",
      7,
      3,
      10,
      "A cross of spirit rain. Successful hits soak enemies for three activations, preparing lightning; allies and terrain remain unchanged.",
    ],
    [
      "custom-green-mending",
      "mend",
      "Green mending",
      7,
      3,
      26,
      "Restore health and cleanse burn, or revive a fallen ally at the existing fixed 24 health. No regeneration status is added.",
    ],
    [
      "custom-anvil-peal",
      "surge",
      "Anvil peal",
      8,
      3,
      25,
      "A single-target lightning strike. A soaked enemy takes the existing 1.5 damage multiplier; there is no stun or chain lightning.",
    ],
    [
      "custom-dissonant-strike",
      "delay",
      "Dissonant strike",
      7,
      2,
      13,
      "Spirit damage that delays a surviving enemy by 30 timeline ticks on a successful hit. Does not silence or interrupt.",
    ],
    [
      "custom-tempered-tempo",
      "haste",
      "Tempered tempo",
      7,
      2,
      0,
      "Advance one nearby ally by 35 timeline ticks. This is immediate timeline support, not a lasting speed bonus.",
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
      "custom-thorn-warden",
      "lifebinder",
      "Thorn Warden",
      "Guard / recovery / soaking setup",
      "#58714a",
      4,
      11,
      4,
      6,
      8,
      ["custom-briar-shelter", "custom-dewfall", "custom-green-mending"],
    ],
    [
      "custom-resonant-smith",
      "stormherald",
      "Resonant Smith",
      "Lightning payoff / timeline support",
      "#957042",
      4,
      10,
      6,
      5,
      9,
      ["custom-anvil-peal", "custom-dissonant-strike", "custom-tempered-tempo"],
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
      "custom-thornwood-staff",
      "cedarrod",
      "Thornwood staff-spear",
      { attack: 2, magic: 3 },
      90,
      "A Thorn Warden focus and walking spear. Weapon strikes retain their normal one-tile reach.",
    ],
    [
      "custom-resonant-hammer",
      "cedarrod",
      "Resonant forgehammer",
      { attack: 3, magic: 4 },
      105,
      "A Resonant Smith focus. Its visual ringing adds no extra damage or area to an ability.",
    ],
    [
      "custom-briarcoat",
      "leather",
      "Briarcoat",
      { armor: 3, hp: 12 },
      85,
      "Leather and bronze scales. Adds protection; grants no nature resistance or retaliation.",
    ],
    [
      "custom-forge-apron",
      "leather",
      "Forge apron",
      { armor: 3, hp: 8 },
      80,
      "A reinforced leather apron. Grants no fire immunity or crafting capability.",
    ],
    [
      "custom-resonance-seal",
      "watchcharm",
      "Resonance seal",
      { magic: 2, hp: 8 },
      0,
      "First-clear relic of the Briar Resonance. Existing equipment bonuses only.",
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
  r.gear["custom-thornwood-staff"].jobs = ["custom-thorn-warden"];
  r.gear["custom-resonant-hammer"].jobs = ["custom-resonant-smith"];
  r.gear["custom-resonance-seal"].rewardOnly = true;
  const c = p.content!;
  Object.assign(
    c.actors.find((a) => a.id === "sera")!,
    {
      name: "Rowan Briar",
      job: "custom-thorn-warden",
      secondary: "vanguard",
      baseHp: 104,
      maxMp: 42,
      learned: ["cleave"],
      jp: { "custom-thorn-warden": 0 },
      equipment: {
        weapon: "custom-thornwood-staff",
        armor: "custom-briarcoat",
        relic: "watchcharm",
      },
    },
  );
  Object.assign(
    c.actors.find((a) => a.id === "ilya")!,
    {
      name: "Edrin Bellforge",
      job: "custom-resonant-smith",
      secondary: "arcanist",
      baseHp: 94,
      maxMp: 42,
      learned: ["frost"],
      jp: { "custom-resonant-smith": 0 },
      equipment: {
        weapon: "custom-resonant-hammer",
        armor: "custom-forge-apron",
        relic: "copperfocus",
      },
    },
  );
  for (const [id, name, job, secondary, baseHp, maxMp, weapon, armor] of [
    [
      "enemy-ember-scholar",
      "Warden Senna Moss",
      "custom-thorn-warden",
      "vanguard",
      70,
      32,
      "custom-thornwood-staff",
      "custom-briarcoat",
    ],
    [
      "enemy-cinder-clock",
      "Foreman Garron Rusk",
      "custom-resonant-smith",
      "arcanist",
      76,
      36,
      "custom-resonant-hammer",
      "custom-forge-apron",
    ],
  ] as const) {
    const template = c.enemyTemplates!.find((t) => t.id === id)!;
    Object.assign(template, {
      name,
      job,
      secondary,
      baseHp,
      maxMp,
      learned: [],
      jp: { [job]: 0 },
      equipment: { weapon, armor, relic: null },
    });
    const actor = c.actors.find((a) => a.id === id + "-ashen-weir")!;
    Object.assign(actor, structuredClone(template), { id: actor.id });
  }
  // Introduce the support-heavy party without inheriting the Vigil's durability.
  for (const [id, baseHp] of [
    ["enemy-kiln-warden", 71],
    ["enemy-ash-sentry", 48],
    ["enemy-ember-scholar", 53],
    ["enemy-coal-runner", 59],
    ["enemy-lantern-mender", 41],
    ["enemy-cinder-clock", 57],
  ] as const) {
    c.enemyTemplates!.find((t) => t.id === id)!.baseHp = baseHp;
    c.actors.find((a) => a.id === id + "-ashen-weir")!.baseHp = baseHp;
  }
  p.name = "The Briar Resonance";
  p.dimensions = { width: 24, height: 20 };
  p.tiles = [];
  for (let z = 0; z < 20; z++)
    for (let x = 0; x < 24; x++) {
      const water =
        x >= 9 && x <= 11 && ((z >= 3 && z <= 6) || (z >= 13 && z <= 16));
      p.tiles.push({
        x,
        z,
        h: x >= 17 ? 1 : 0,
        terrain: water
          ? "water"
          : (z >= 8 && z <= 11) || x >= 16
            ? "stone"
            : "grass",
        blocked: false,
      });
    }
  p.placements = [
    ["sera", 6, 9],
    ["ilya", 5, 10],
    ["corin", 6, 11],
    ["mae", 5, 8],
    ["enemy-kiln-warden-ashen-weir", 13, 9],
    ["enemy-ash-sentry-ashen-weir", 13, 11],
    ["enemy-ember-scholar-ashen-weir", 16, 8],
    ["enemy-coal-runner-ashen-weir", 14, 13],
    ["enemy-lantern-mender-ashen-weir", 18, 10],
    ["enemy-cinder-clock-ashen-weir", 17, 12],
  ].map(([id, x, z]) => ({ id: String(id), x: Number(x), z: Number(z) }));
  Object.assign(c.contracts.redoubt, {
    name: p.name,
    subtitle: "The living road / The silent forge",
    description:
      "Rowan and Edrin join Nera and Joren at a foundry claimed by the watch. Defeat all six defenders. Soaking prepares lightning, while guards and healing protect either formation.",
    objective: "Defeat Senna, Garron and all four watch defenders",
    reward: 175,
    firstClearRelic: "custom-resonance-seal",
  });
  c.victoryJP = 85;
  c.dialogue.redoubt = [
    {
      id: "briar-arrival",
      speaker: "narrator",
      text: "Briar roots have split the old foundry road. Across the dew pools, the watch rings a stolen forge bell.",
    },
    {
      id: "briar-rowan",
      speaker: "sera",
      text: "I am Rowan Briar. Dewfall can soak their formation; Edrin, let your lightning follow. I can shelter our lead fighter.",
    },
    {
      id: "briar-edrin",
      speaker: "ilya",
      text: "That bell was my teacher's. Anvil peal strikes harder against soaked armor. Keep me close enough to answer.",
    },
    {
      id: "briar-senna",
      speaker: "enemy-ember-scholar-ashen-weir",
      text: "Roads need wardens, Rowan. I will shelter this watch as firmly as you shelter your friends.",
    },
    {
      id: "briar-garron",
      speaker: "enemy-cinder-clock-ashen-weir",
      text: "The forge belongs to whoever keeps it ringing. Your rain will conduct my answer just as well.",
    },
    {
      id: "briar-nera",
      speaker: "mae",
      text: "The central stone road is open. We can cross the pools with Frostline, but we still have to defeat every defender.",
    },
    {
      id: "briar-joren",
      speaker: "corin",
      text: "Then we move together. Guard the approach, turn their timing, and leave an opening for my saber.",
    },
  ];
  p.abilityCues = {
    ...p.abilityCues,
    "custom-briar-shelter": {
      effect: "aegis",
      sound: "buff",
      style: {
        tint: "#d5e4a6",
        particleColor: "#96bb70",
        particle: "motes",
        particles: 0.75,
      },
    },
    "custom-dewfall": {
      effect: "raincall",
      sound: "hit",
      style: {
        tint: "#b9e0cf",
        particleColor: "#9bcbb2",
        particle: "rain",
        particles: 1.25,
      },
    },
    "custom-green-mending": {
      effect: "mend",
      sound: "heal",
      style: {
        tint: "#d0e9b2",
        particleColor: "#a2c995",
        size: 1.6,
        frameMs: 100,
      },
    },
    "custom-anvil-peal": {
      effect: "surge",
      sound: "hit",
      style: {
        tint: "#e4efff",
        particleColor: "#e8b75d",
        particle: "electric",
        frameMs: 70,
        travelMs: 120,
      },
    },
    "custom-dissonant-strike": {
      effect: "delay",
      sound: "hit",
      style: {
        tint: "#e3d4bd",
        particleColor: "#cca779",
        particle: "time",
        particles: 0.75,
      },
    },
    "custom-tempered-tempo": {
      effect: "haste",
      sound: "buff",
      style: {
        tint: "#ffedc0",
        particleColor: "#dbb66d",
        particle: "time",
        size: 1.6,
      },
    },
  };
  p.rules = validateRules(r);
  p.content = validateGameContent(c, p.rules);
  return p;
}
