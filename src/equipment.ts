import type { JobId } from "./data";

export type GearId =
  | "ironblade"
  | "twinsteel"
  | "cedarrod"
  | "willowstaff"
  | "leather"
  | "lamellar"
  | "wayboots"
  | "copperfocus"
  | "watchcharm";
export type GearSlot = "weapon" | "armor" | "relic";
export type Loadout = Record<GearSlot, GearId | null>;
export interface Bonuses {
  attack: number;
  armor: number;
  magic: number;
  speed: number;
  move: number;
  hp: number;
}
export interface Gear {
  id: GearId;
  name: string;
  slot: GearSlot;
  price: number;
  description: string;
  jobs?: JobId[];
  bonuses: Partial<Bonuses>;
}
const blades: JobId[] = ["vanguard", "dancer", "shadowrunner", "runewarden"];
const casters: JobId[] = [
  "arcanist",
  "lifebinder",
  "stormherald",
  "chronoweaver",
  "runewarden",
];
export const equipment: Record<GearId, Gear> = {
  ironblade: {
    id: "ironblade",
    name: "Oathsteel blade",
    slot: "weapon",
    price: 60,
    description: "A reliable edge for the company's front line.",
    jobs: blades,
    bonuses: { attack: 4 },
  },
  twinsteel: {
    id: "twinsteel",
    name: "Ashen twinblades",
    slot: "weapon",
    price: 75,
    description: "Light paired blades reward quick footwork.",
    jobs: blades,
    bonuses: { attack: 3, speed: 1 },
  },
  cedarrod: {
    id: "cedarrod",
    name: "Glass-tipped rod",
    slot: "weapon",
    price: 65,
    description: "A shard of river glass focuses elemental spells.",
    jobs: casters,
    bonuses: { magic: 4 },
  },
  willowstaff: {
    id: "willowstaff",
    name: "Living willow staff",
    slot: "weapon",
    price: 65,
    description: "A living branch lends resilience to its bearer.",
    jobs: casters,
    bonuses: { magic: 2, hp: 8 },
  },
  leather: {
    id: "leather",
    name: "Company leathers",
    slot: "armor",
    price: 35,
    description: "Flexible protection without a movement penalty.",
    bonuses: { armor: 1, hp: 4 },
  },
  lamellar: {
    id: "lamellar",
    name: "Bronze lamellar",
    slot: "armor",
    price: 95,
    description: "Strong protection at the cost of one movement.",
    jobs: ["vanguard", "runewarden"],
    bonuses: { armor: 4, hp: 15, move: -1 },
  },
  wayboots: {
    id: "wayboots",
    name: "Wayfarer's boots",
    slot: "relic",
    price: 80,
    description: "Reach one tile farther on every activation.",
    bonuses: { move: 1 },
  },
  copperfocus: {
    id: "copperfocus",
    name: "Copper focus",
    slot: "relic",
    price: 80,
    description: "A modest rune amplifies damaging magic.",
    bonuses: { magic: 3 },
  },
  watchcharm: {
    id: "watchcharm",
    name: "Dawnwatch charm",
    slot: "relic",
    price: 90,
    description: "An old watch charm grants quicker activations.",
    bonuses: { speed: 2 },
  },
};
export const emptyLoadout = (): Loadout => ({
  weapon: null,
  armor: null,
  relic: null,
});
export const canEquip = (job: JobId, id: GearId) =>
  !equipment[id].jobs || equipment[id].jobs!.includes(job);
export function gearBonuses(loadout: Loadout): Bonuses {
  const total: Bonuses = {
    attack: 0,
    armor: 0,
    magic: 0,
    speed: 0,
    move: 0,
    hp: 0,
  };
  for (const id of Object.values(loadout))
    if (id)
      for (const [stat, value] of Object.entries(equipment[id].bonuses))
        total[stat as keyof Bonuses] += value;
  return total;
}
