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

export interface RecoveryRecord {
  game: Expedition;
  savedAt: string | null;
  recovered: boolean;
}
let recoveryQueue: Promise<void> = Promise.resolve();
export function saveRecovery(game: Expedition): Promise<void> {
  const snapshot = structuredClone(game),
    savedAt = new Date().toISOString();
  recoveryQueue = recoveryQueue
    .catch(() => {})
    .then(async () => {
      const d = await db();
      try {
        const tx = d.transaction("saves", "readwrite"),
          old = await tx.store.get("recovery");
        if (decodeSave(old)) await tx.store.put(old, "recovery-backup");
        await tx.store.put({ game: snapshot, savedAt }, "recovery");
        await tx.done;
      } finally {
        d.close();
      }
    });
  return recoveryQueue;
}
export async function loadRecovery(): Promise<RecoveryRecord | null> {
  await recoveryQueue.catch(() => {});
  const d = await db();
  try {
    for (const slot of ["recovery", "recovery-backup"]) {
      const raw = await d.get("saves", slot),
        decoded = decodeSave(raw);
      if (decoded)
        return {
          game: decoded.game,
          savedAt: typeof raw.savedAt === "string" ? raw.savedAt : null,
          recovered: slot === "recovery-backup",
        };
    }
    return null;
  } finally {
    d.close();
  }
}
