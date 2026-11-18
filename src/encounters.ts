export type EncounterId = "shrine" | "causeway" | "redoubt";
export interface Encounter {
  id: EncounterId;
  name: string;
  subtitle: string;
  description: string;
  reward: number;
  requires: EncounterId | null;
  objective: string;
}
export const encounters: Record<EncounterId, Encounter> = {
  shrine: {
    id: "shrine",
    name: "The shrine of Veyr",
    subtitle: "Contract I · The broken promise",
    description:
      "Secure the first shard from an Oathless patrol. The causeway offers the safest crossing; ice can open another route.",
    reward: 60,
    requires: null,
    objective: "Defeat the four Oathless",
  },
  causeway: {
    id: "causeway",
    name: "The drowned causeway",
    subtitle: "Contract II · A road beneath water",
    description:
      "The retreating patrol has flooded the lower crossing. Two mobile outriders screen an elemental caster and a healer across the stream.",
    reward: 85,
    requires: "shrine",
    objective: "Break the river blockade",
  },
  redoubt: {
    id: "redoubt",
    name: "The Oathless redoubt",
    subtitle: "Contract III · The unspoken oath",
    description:
      "An armored Runewarden holds the upper shrine with a Storm Herald, Chronoweaver and flanking Shadowrunner. Prepare your company before the assault.",
    reward: 110,
    requires: "causeway",
    objective: "Defeat the redoubt's defenders",
  },
};
