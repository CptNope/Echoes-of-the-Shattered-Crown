import { GearIcon } from "./GearIcon";
import React from "react";
import type { Battle } from "./engine";
import { items, type ItemMode } from "./items";
export function ItemCommands({
  battle,
  enabled,
  mode,
  choose,
}: {
  battle: Battle;
  enabled: boolean;
  mode: string;
  choose: (mode: ItemMode) => void;
}) {
  const catalog = battle.rules?.items ?? items,
    stock = Object.values(catalog).filter(
      (i) => (battle.supplies?.[i.id] ?? 0) > 0,
    );
  return (
    <details className="battle-supplies">
      <summary>
        Items · {stock.reduce((n, i) => n + (battle.supplies?.[i.id] ?? 0), 0)}{" "}
        remaining
      </summary>
      <p>
        Uses one copy and your action. Choose an item, then a highlighted allied
        tile. Move remains separate.
      </p>
      <div className="supply-actions">
        {stock.map((i) => (
          <button
            key={i.id}
            disabled={!enabled}
            aria-pressed={mode === `item:${i.id}`}
            onClick={() => choose(`item:${i.id}`)}
            title={i.description}
          >
            <GearIcon item={i} size={32} /> {i.name} · {battle.supplies?.[i.id]}{" "}
            left · reach {i.range}
          </button>
        ))}
      </div>
      {!stock.length && (
        <p>
          No supplies. Buy items from the camp outfitter or edit starting
          quantities in Studio.
        </p>
      )}
    </details>
  );
}
