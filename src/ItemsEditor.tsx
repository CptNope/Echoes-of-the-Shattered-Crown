import { GearArtEditor } from "./GearArtEditor";
import React, { useState } from "react";
import {
  items,
  sellValue,
  validateItemCatalog,
  type ItemId,
  type SupplyItem,
  type SupplyInventory,
} from "./items";
export function ItemsEditor({
  catalog,
  change,
  supplies,
  changeSupplies,
}: {
  catalog: Record<ItemId, SupplyItem>;
  change: (table: Record<ItemId, SupplyItem>) => void;
  supplies: SupplyInventory;
  changeSupplies: (stock: SupplyInventory) => void;
}) {
  const [selected, setSelected] = useState<ItemId>("field-tonic"),
    [newId, setNewId] = useState("custom-new-item"),
    [message, setMessage] = useState("");
  const item = catalog[selected] ?? catalog["field-tonic"],
    id = item.id;
  const edit = (patch: Partial<SupplyItem>) =>
    change({ ...catalog, [id]: { ...item, ...patch } });
  return (
    <section aria-label="Consumable item editor">
      <p>
        These are the real shop and battle definitions. Starting quantities
        belong to this Studio project; they do not change an existing company's
        inventory. Apply the catalog before playtesting.
      </p>
      <label>
        Existing item
        <select
          value={id}
          onChange={(e) => setSelected(e.target.value as ItemId)}
        >
          {Object.values(catalog).map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} · {i.id}
            </option>
          ))}
        </select>
      </label>
      <GearArtEditor
        key={id}
        item={item}
        change={(icon) => {
          const next = { ...item };
          if (icon) next.icon = icon;
          else delete next.icon;
          change({ ...catalog, [id]: next });
        }}
      />
      <div className="content-fields">
        <label>
          Item name
          <input
            value={item.name}
            maxLength={80}
            onChange={(e) => edit({ name: e.target.value })}
          />
        </label>
        <label>
          Item effect
          <select
            value={item.effect}
            onChange={(e) =>
              edit({
                effect: e.target.value as SupplyItem["effect"],
                range:
                  e.target.value === "revive"
                    ? Math.max(1, item.range)
                    : item.range,
                power:
                  e.target.value === "cleanse" ? 0 : Math.max(1, item.power),
              })
            }
          >
            {["heal", "energy", "cleanse", "revive"].map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
        <label>
          Item power
          <input
            type="number"
            min={item.effect === "cleanse" ? 0 : 1}
            max="250"
            disabled={item.effect === "cleanse"}
            value={item.power}
            onChange={(e) => edit({ power: Number(e.target.value) })}
          />
        </label>
        <label>
          Item reach
          <input
            type="number"
            min={item.effect === "revive" ? 1 : 0}
            max="3"
            value={item.range}
            onChange={(e) => edit({ range: Number(e.target.value) })}
          />
        </label>
        <label>
          Item buy price
          <input
            type="number"
            min="0"
            max="9999"
            value={item.price}
            onChange={(e) => edit({ price: Number(e.target.value) })}
          />
        </label>
        <label>
          Item sell price
          <input
            type="number"
            min="0"
            max={item.price}
            value={sellValue(item)}
            onChange={(e) => edit({ sellPrice: Number(e.target.value) })}
          />
        </label>
        <label>
          Starting item quantity
          <input
            type="number"
            min="0"
            max="99"
            value={supplies[id] ?? 0}
            onChange={(e) =>
              changeSupplies({ ...supplies, [id]: Number(e.target.value) })
            }
          />
        </label>
        <label className="full-field">
          Item description
          <textarea
            maxLength={2000}
            value={item.description}
            onChange={(e) => edit({ description: e.target.value })}
          />
        </label>
      </div>
      <button
        disabled={item.sellPrice === undefined}
        onClick={() => {
          const next = { ...item };
          delete next.sellPrice;
          change({ ...catalog, [id]: next });
        }}
      >
        Use automatic item resale
      </button>
      <label>
        New item ID
        <input
          value={newId}
          maxLength={47}
          onChange={(e) => setNewId(e.target.value)}
        />
      </label>
      <div className="actions">
        <button
          onClick={() => {
            try {
              if (
                !/^custom-[a-z][a-z0-9-]{0,39}$/.test(newId) ||
                Object.hasOwn(catalog, newId)
              )
                throw Error("Use an unused bounded custom- item ID.");
              const next = validateItemCatalog({
                ...catalog,
                [newId]: {
                  ...item,
                  id: newId,
                  name: item.name.slice(0, 75) + " copy",
                },
              });
              change(next);
              setSelected(newId as ItemId);
              setMessage("Item draft created. Apply the catalog to keep it.");
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : "Item creation failed.",
              );
            }
          }}
        >
          Duplicate item
        </button>
        <button
          disabled={Object.hasOwn(items, id) || (supplies[id] ?? 0) > 0}
          onClick={() => {
            const next = { ...catalog },
              counts = { ...supplies };
            delete next[id];
            delete counts[id];
            change(next);
            changeSupplies(counts);
            setSelected("field-tonic");
          }}
        >
          Delete custom item
        </button>
      </div>
      <p>
        Empty this item's starting stock before deleting it. Shipped identities
        stay available for old saves. Selling cannot pay more than buying costs.
      </p>
      <p role="status">{message}</p>
    </section>
  );
}
