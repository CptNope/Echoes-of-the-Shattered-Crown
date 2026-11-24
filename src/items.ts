export type ItemId =
  | "field-tonic"
  | "vital-tonic"
  | "ether-draught"
  | "deep-ether"
  | "cleansing-salts"
  | "phoenix-seed"
  | `custom-${string}`;
export type SupplyInventory = Partial<Record<ItemId, number>>;
export interface SupplyItem {
  id: ItemId;
  name: string;
  description: string;
  price: number;
  sellPrice?: number;
  effect: "heal" | "energy" | "cleanse" | "revive";
  power: number;
  range: number;
}
export const items: Record<ItemId, SupplyItem> = {
  "field-tonic": {
    id: "field-tonic",
    name: "Field tonic",
    description:
      "Restore 35 HP to a living ally. Uses the active ally's action; does not revive or cleanse.",
    price: 25,
    effect: "heal",
    power: 35,
    range: 1,
  },
  "vital-tonic": {
    id: "vital-tonic",
    name: "Vital tonic",
    description:
      "Restore 70 HP to a living ally. Stronger medicine at a higher price.",
    price: 55,
    effect: "heal",
    power: 70,
    range: 1,
  },
  "ether-draught": {
    id: "ether-draught",
    name: "Ether draught",
    description:
      "Restore 18 energy to a living ally. Uses an action and cannot exceed maximum energy.",
    price: 40,
    effect: "energy",
    power: 18,
    range: 1,
  },
  "deep-ether": {
    id: "deep-ether",
    name: "Deep ether",
    description: "Restore 32 energy to a living ally. Uses an action.",
    price: 75,
    effect: "energy",
    power: 32,
    range: 1,
  },
  "cleansing-salts": {
    id: "cleansing-salts",
    name: "Cleansing salts",
    description:
      "Clear burn, slow, exposure and soaking from a living ally. Does not heal or grant guard.",
    price: 30,
    effect: "cleanse",
    power: 0,
    range: 1,
  },
  "phoenix-seed": {
    id: "phoenix-seed",
    name: "Phoenix seed",
    description:
      "Revive a fallen ally at 30 HP, capped by maximum health. Uses an action; statuses are unchanged.",
    price: 110,
    effect: "revive",
    power: 30,
    range: 1,
  },
};
export const starterSupplies = (): SupplyInventory => ({
  "field-tonic": 3,
  "ether-draught": 1,
  "cleansing-salts": 1,
});
export const sellValue = (item: {
  price: number;
  sellPrice?: number;
  rewardOnly?: boolean;
}) => (item.rewardOnly ? 0 : (item.sellPrice ?? Math.floor(item.price / 2)));
export function validateItemCatalog(raw: unknown): Record<ItemId, SupplyItem> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw Error("Expected an item catalog.");
  const table = raw as Record<string, SupplyItem>;
  if (
    Object.keys(table).length > 128 ||
    Object.keys(items).some((id) => !Object.hasOwn(table, id))
  )
    throw Error("Keep the six shipped item identities; use at most 128 items.");
  for (const [id, item] of Object.entries(table)) {
    if (
      (!Object.hasOwn(items, id) &&
        !/^custom-[a-z][a-z0-9-]{0,39}$/.test(id)) ||
      !item ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      Object.keys(item).some(
        (k) =>
          ![
            "id",
            "name",
            "description",
            "price",
            "sellPrice",
            "effect",
            "power",
            "range",
          ].includes(k),
      ) ||
      item.id !== id ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      item.name.length > 80 ||
      typeof item.description !== "string" ||
      !item.description.trim() ||
      item.description.length > 2000 ||
      !Number.isInteger(item.price) ||
      item.price < 0 ||
      item.price > 9999 ||
      (item.sellPrice !== undefined &&
        (!Number.isInteger(item.sellPrice) ||
          item.sellPrice < 0 ||
          item.sellPrice > item.price)) ||
      !["heal", "energy", "cleanse", "revive"].includes(item.effect) ||
      !Number.isInteger(item.power) ||
      item.power < 0 ||
      item.power > 250 ||
      (item.effect !== "cleanse" && item.power === 0) ||
      (item.effect === "cleanse" && item.power !== 0) ||
      !Number.isInteger(item.range) ||
      item.range < 0 ||
      item.range > 3 || (item.effect === "revive" && item.range === 0)
    )
      throw Error("Invalid item definition: " + id);
  }
  return structuredClone(table) as Record<ItemId, SupplyItem>;
}
export function validateSupplies(
  raw: unknown,
  catalog = items,
): SupplyInventory {
  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    Object.keys(raw).length > 128
  )
    throw Error("Expected bounded supply quantities.");
  for (const [id, n] of Object.entries(raw))
    if (
      !Object.hasOwn(catalog, id) ||
      !Number.isInteger(n) ||
      Number(n) < 0 ||
      Number(n) > 99
    )
      throw Error("Supplies must reference known items with 0–99 copies.");
  return { ...raw } as SupplyInventory;
}
export type ItemMode = `item:${ItemId}`;
export const isItemMode = (mode: string): mode is ItemMode =>
  mode.startsWith("item:");
export const modeItem = (mode: ItemMode): ItemId => mode.slice(5) as ItemId;
