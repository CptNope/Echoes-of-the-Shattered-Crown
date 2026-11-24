import React, { useEffect, useState } from "react";
import { Shop } from "./Shop";
import {
  createExpedition,
  validateExpedition,
  type Expedition,
} from "./campaign";
import { canEquip } from "./equipment";
import { validateRules, type RuleCatalog } from "./studio-rules";
import { validateSupplies, type SupplyInventory } from "./items";
import "./camp.css";
export function ShopTrial({
  rules,
  supplies,
  valid,
}: {
  rules: RuleCatalog;
  supplies: SupplyInventory;
  valid: boolean;
}) {
  const [gold, setGold] = useState(500),
    [trial, setTrial] = useState<Expedition | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    setTrial(null);
    setError("");
  }, [rules, supplies]);
  return (
    <details>
      <summary>Try buying and selling in this project's shop</summary>
      <p>
        This isolated company uses the current draft's gear, item prices and
        starting supplies. Trial trades do not change the project or your saved
        campaign. Changing a source field resets the trial.
      </p>
      <label>
        Shop trial gold
        <input
          type="number"
          min="0"
          max="99999"
          value={gold}
          onChange={(e) => setGold(Number(e.target.value))}
        />
      </label>
      <button
        disabled={!valid || !Number.isInteger(gold) || gold < 0 || gold > 99999}
        onClick={() => {
          try {
            const game = createExpedition();
            game.battle.rules = validateRules(rules);
            game.company.gold = gold;
            game.company.supplies = validateSupplies(supplies, rules.items);
            for (const m of game.company.members)
              for (const slot of ["weapon", "armor", "relic"] as const) {
                const id = m.equipment[slot];
                if (
                  id &&
                  (rules.gear[id].slot !== slot ||
                    !canEquip(m.job, id, rules.gear))
                )
                  m.equipment[slot] = null;
              }
            if (!validateExpedition(game))
              throw Error(
                "This draft cannot form a valid trial company. Check the catalog overrides.",
              );
            setTrial(game);
            setError("");
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Shop trial unavailable.",
            );
          }
        }}
      >
        Start shop trial
      </button>
      {error && <p role="alert">{error}</p>}
      {trial && (
        <Shop
          game={trial}
          setGame={(update) =>
            setTrial((g) =>
              g ? (typeof update === "function" ? update(g) : update) : null,
            )
          }
        />
      )}
    </details>
  );
}
