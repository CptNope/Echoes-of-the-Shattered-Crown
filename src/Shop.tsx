import React, { useState, type Dispatch, type SetStateAction } from "react";
import { equipment as shippedGear, type GearSlot } from "./equipment";
import { items as shippedItems, sellValue } from "./items";
import {
  purchase,
  sellGear,
  tradeSupply,
  allocated,
  type Expedition,
} from "./campaign";
import { jobs } from "./data";
export function Shop({
  game,
  setGame,
}: {
  game: Expedition;
  setGame: Dispatch<SetStateAction<Expedition>>;
}) {
  const [category, setCategory] = useState("all"),
    [search, setSearch] = useState(""),
    [quantity, setQuantity] = useState(1),
    [message, setMessage] = useState("");
  const gear = game.battle.rules?.gear ?? shippedGear,
    supplies = game.battle.rules?.items ?? shippedItems;
  const catalogJobs = game.battle.rules?.jobs ?? jobs;
  const rows = [
    ...Object.values(gear).map((item) => ({
      item,
      kind: item.slot as GearSlot | "supplies",
    })),
    ...Object.values(supplies).map((item) => ({
      item,
      kind: "supplies" as const,
    })),
  ].filter(
    (r) =>
      (category === "all" || category === r.kind) &&
      (r.item.name + " " + r.item.description)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const validQuantity =
    Number.isInteger(quantity) && quantity >= 1 && quantity <= 99;
  function trade(fn: (g: Expedition) => Expedition, label: string) {
    const next = fn(game);
    if (next === game) {
      setMessage("Trade unavailable. Check quantity, spare copies and gold.");
      return;
    }
    setGame((g) => (g === game ? next : fn(g)));
    setMessage(label);
  }
  return (
    <section className="camp-section" aria-label="Company shop">
      <div className="camp-title">
        <div>
          <p className="camp-eyebrow">The travelling outfitter</p>
          <h2>Provision the company</h2>
        </div>
        <span>{game.company.gold} gold available</span>
      </div>
      <p className="camp-lead">
        Buy equipment and battle supplies. Sell spare copies for the displayed
        value; equipped gear and reward-only relics are protected. Equip
        purchases in Company. Each supply use spends one copy and an action.
      </p>
      <div className="shop-filters">
        <label>
          Shop category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {["all", "weapon", "armor", "relic", "supplies"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Search stock
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label>
          Trade quantity
          <input
            type="number"
            min="1"
            max="99"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </label>
      </div>
      {!validQuantity && (
        <p role="alert">Choose a whole quantity from 1 to 99.</p>
      )}
      <p role="status">{message}</p>
      {!rows.length && <p>No stock matches this search.</p>}
      <div className="outfitter-list">
        {rows.map(({ item, kind }) => {
          const isSupply = kind === "supplies",
            id = item.id;
          const owned = isSupply
            ? (game.company.supplies?.[id as keyof typeof supplies] ?? 0)
            : (game.company.inventory[id as keyof typeof gear] ?? 0);
          const worn = isSupply
              ? 0
              : allocated(game.company, id as keyof typeof gear),
            spare = owned - worn;
          const rewardOnly = "rewardOnly" in item && item.rewardOnly;
          const resale = sellValue(item);
          return (
            <article key={kind + id}>
              <div>
                <h3>
                  {item.name}
                  <small>{kind}</small>
                </h3>
                <p>{item.description}</p>
                {"bonuses" in item && (
                  <span>
                    {Object.entries(item.bonuses)
                      .map(([k, v]) => `${k} ${Number(v) >= 0 ? "+" : ""}${v}`)
                      .join(" · ")}
                  </span>
                )}
                {"jobs" in item && item.jobs && (
                  <small className="gear-proficiency">
                    {item.jobs.map((id) => catalogJobs[id].name).join(" · ")}
                  </small>
                )}
                <p>
                  {rewardOnly
                    ? "Contract reward · cannot be bought or sold"
                    : `Buy ${item.price} / sell ${resale} gold per copy`}
                </p>
              </div>
              <div className="gear-stock">
                <span>{owned} owned</span>
                <small>
                  {worn} equipped · {spare} spare
                </small>
              </div>
              <div className="shop-trade-actions">
                <button
                  aria-label={`Buy ${item.name}`}
                  disabled={
                    !validQuantity ||
                    rewardOnly ||
                    game.company.gold < item.price * quantity ||
                    owned + quantity > 99
                  }
                  onClick={() =>
                    trade(
                      (g) =>
                        isSupply
                          ? tradeSupply(
                              g,
                              id as keyof typeof supplies,
                              "buy",
                              quantity,
                            )
                          : purchase(g, id as keyof typeof gear, quantity),
                      `Bought ${quantity} × ${item.name}.`,
                    )
                  }
                >
                  Buy {validQuantity ? quantity : "—"} ·{" "}
                  {validQuantity ? item.price * quantity : "—"} gold
                </button>
                <button
                  aria-label={`Sell ${item.name}`}
                  disabled={
                    !validQuantity ||
                    rewardOnly ||
                    resale <= 0 ||
                    spare < quantity
                  }
                  onClick={() =>
                    trade(
                      (g) =>
                        isSupply
                          ? tradeSupply(
                              g,
                              id as keyof typeof supplies,
                              "sell",
                              quantity,
                            )
                          : sellGear(g, id as keyof typeof gear, quantity),
                      `Sold ${quantity} × ${item.name}.`,
                    )
                  }
                >
                  Sell {validQuantity ? quantity : "—"} ·{" "}
                  {validQuantity ? resale * quantity : "—"} gold
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
