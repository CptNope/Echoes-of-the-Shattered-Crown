import { openDB } from "idb";
import { decodeSave, type Expedition } from "./campaign";

const db = () =>
  openDB("echoes-crown", 1, {
    upgrade(d) {
      d.createObjectStore("saves");
    },
  });
export async function saveGame(game: Expedition) {
  const d = await db();
  try {
    const tx = d.transaction("saves", "readwrite"),
      old = await tx.store.get("manual");
    if (decodeSave(old)) await tx.store.put(old, "backup");
    await tx.store.put({ game, savedAt: new Date().toISOString() }, "manual");
    await tx.done;
  } finally {
    d.close();
  }
}
export async function loadGame(): Promise<{
  game: Expedition;
  recovered: boolean;
  migrated: boolean;
}> {
  const d = await db();
  try {
    for (const slot of ["manual", "backup"]) {
      const decoded = decodeSave(await d.get("saves", slot));
      if (decoded) return { ...decoded, recovered: slot === "backup" };
    }
    throw new Error("No valid save was found. Save your company first.");
  } finally {
    d.close();
  }
}
