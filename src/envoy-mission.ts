import { buildEmberMission } from "./ember-missions";
import { createCatalogRecord } from "./studio-authoring";
import { validateRules } from "./studio-rules";
import { validateGameContent } from "./studio-content";
import type { LevelProject } from "./studio-project";
/** Playable character presets occupy existing company slots; no recruit state is added. */
export function buildEnvoyMission(project: LevelProject): LevelProject {
  const p = buildEmberMission(project, "ashen-weir");
  let rules = p.rules!;
  for (const [id, base, name, cost, range, power, description] of [
    [
      "custom-glass-shot",
      "strike",
      "Glass shot",
      4,
      4,
      19,
      "A physical bow shot. Trades energy and lower power for four-tile reach; does not add a new projectile collision rule.",
    ],
    [
      "custom-shard-volley",
      "cleave",
      "Shard volley",
      8,
      4,
      17,
      "A cross-shaped physical volley. Spares allies, with lower power than a close Sundering arc.",
    ],
    [
      "custom-facet-mark",
      "veil",
      "Facet mark",
      6,
      4,
      14,
      "A spirit shot that exposes an enemy for two activations on a successful hit. Uses Dusk needle's existing exposure rule.",
    ],
    [
      "custom-cinder-hymn",
      "ember",
      "Cinder hymn",
      8,
      4,
      22,
      "A cross of flame. Burns enemies and ignites grass; lower power and cost than Cinder bloom.",
    ],
    [
      "custom-ashen-shelter",
      "aegis",
      "Ashen shelter",
      8,
      3,
      0,
      "Protect one living ally with guard and cleanse burn. This is an immediate rite, not a sustained chant.",
    ],
    [
      "custom-mourning-bell",
      "delay",
      "Mourning bell",
      9,
      4,
      15,
      "Spirit damage and a 30-tick delay to a surviving enemy on a successful hit. Does not silence or interrupt.",
    ],
  ] as const) {
    rules = createCatalogRecord(rules, "skills", id, base);
    Object.assign(rules.skills[id], { name, cost, range, power, description });
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
      "custom-glass-ranger",
      "shadowrunner",
      "Glass Ranger",
      "Ranged physical pressure / exposure",
      "#397b80",
      5,
      13,
      7,
      3,
      3,
      ["custom-glass-shot", "custom-shard-volley", "custom-facet-mark"],
    ],
    [
      "custom-ash-cantor",
      "lifebinder",
      "Ash Cantor",
      "Fire rites / guard / timeline pressure",
      "#a55a45",
      4,
      10,
      2,
      4,
      9,
      ["custom-cinder-hymn", "custom-ashen-shelter", "custom-mourning-bell"],
    ],
  ] as const) {
    rules = createCatalogRecord(rules, "jobs", id, base);
    Object.assign(rules.jobs[id], {
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
  for (const [id, base, name, bonuses, job] of [
    [
      "custom-glass-bow",
      "ironblade",
      "Wayfarer's glass bow",
      { attack: 5 },
      "custom-glass-ranger",
    ],
    [
      "custom-cantor-lantern",
      "cedarrod",
      "Ashwood lantern staff",
      { magic: 4 },
      "custom-ash-cantor",
    ],
  ] as const) {
    rules = createCatalogRecord(rules, "gear", id, base);
    Object.assign(rules.gear[id], {
      name,
      bonuses: { ...bonuses },
      jobs: [job],
      price: 90,
      description:
        "Lantern envoys equipment. Editable class proficiency and bonuses; no additional weapon mechanic.",
    });
  }
  const c = p.content!,
    tamsin = c.actors.find((a) => a.id === "sera")!,
    orris = c.actors.find((a) => a.id === "ilya")!;
  Object.assign(tamsin, {
    name: "Tamsin Valehart",
    job: "custom-glass-ranger",
    secondary: "shadowrunner",
    baseHp: 98,
    maxMp: 36,
    learned: ["gloam"],
    jp: { "custom-glass-ranger": 0 },
    equipment: {
      weapon: "custom-glass-bow",
      armor: "leather",
      relic: "wayboots",
    },
  });
  Object.assign(orris, {
    name: "Orris Fen",
    job: "custom-ash-cantor",
    secondary: "lifebinder",
    baseHp: 88,
    maxMp: 44,
    learned: ["mend"],
    jp: { "custom-ash-cantor": 0 },
    equipment: {
      weapon: "custom-cantor-lantern",
      armor: "leather",
      relic: "copperfocus",
    },
  });
  const rivals = [
    [
      "enemy-ember-scholar",
      "Vessa Flintglass",
      "custom-glass-ranger",
      "shadowrunner",
      72,
      28,
      ["gloam"],
    ],
    [
      "enemy-cinder-clock",
      "Brother Caldrin",
      "custom-ash-cantor",
      "lifebinder",
      76,
      36,
      ["mend"],
    ],
  ] as const;
  for (const [
    templateId,
    name,
    job,
    secondary,
    baseHp,
    maxMp,
    learned,
  ] of rivals) {
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
  // Open the ruined wall for a ranged showcase; prevent passive AI stalemates at its corners.
  p.tiles.forEach((t) => {
    t.blocked = false;
  });
  p.name = "The Lantern Parley";
  Object.assign(c.contracts.redoubt, {
    name: p.name,
    subtitle: "Character showcase / Glass and ash",
    description:
      "Tamsin and Orris meet the wardens carrying the archive's missing names. Vessa and Caldrin refuse passage. Defeat all six defenders; the parley is a linear briefing, not a dialogue choice.",
    objective: "Defeat Vessa, Caldrin and all four wardens",
    reward: 155,
  });
  c.dialogue.redoubt = [
    {
      id: "parley-arrival",
      speaker: "narrator",
      text: "At the ruined waystation, Tamsin Valehart and Orris Fen join Corin and Maelis. Two rival envoys wait behind the wardens.",
    },
    {
      id: "parley-tamsin",
      speaker: "sera",
      text: "Vessa, you taught me to read a road before I drew a bow. This one leads to names they meant to bury.",
    },
    {
      id: "parley-vessa",
      speaker: "enemy-ember-scholar-ashen-weir",
      text: "Then read it carefully. My arrows can reach beyond that broken wall too.",
    },
    {
      id: "parley-orris",
      speaker: "ilya",
      text: "Caldrin, the lantern was meant to guide the lost, not keep them outside.",
    },
    {
      id: "parley-caldrin",
      speaker: "enemy-cinder-clock-ashen-weir",
      text: "A borrowed flame still burns. Bring your company forward if you must.",
    },
    {
      id: "parley-mae",
      speaker: "mae",
      text: "Tamsin marks a target; Corin can pursue the opening. Orris can guard us and delay their next attack.",
    },
  ];
  p.rules = validateRules(rules);
  p.content = validateGameContent(c, p.rules);
  return p;
}
