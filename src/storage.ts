import { openDB } from "idb";
import { validateSave, type Battle } from "./engine";
const db = () =>
  openDB("echoes-crown", 1, {
    upgrade(d) {
      d.createObjectStore("saves");
    },
  });
export async function saveBattle(battle: Battle) {
  const d = await db();
  const old = await d.get("saves", "manual");
  if (old && validateSave(old.battle)) await d.put("saves", old, "backup");
  await d.put("saves", { battle, savedAt: new Date().toISOString() }, "manual");
  d.close();
}
export async function loadBattle(): Promise<{
  battle: Battle;
  recovered: boolean;
}> {
  const d = await db();
  try {
    for (const slot of ["manual", "backup"]) {
      const v = await d.get("saves", slot);
      if (v && validateSave(v.battle))
        return { battle: v.battle, recovered: slot === "backup" };
    }
    throw new Error("No valid save was found. Save a battle first.");
  } finally {
    d.close();
  }
}
