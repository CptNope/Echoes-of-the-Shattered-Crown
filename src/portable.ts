import { decodeSave, validateExpedition, type Expedition } from "./campaign";
export const maxBackupBytes = 1024 * 1024;
export function encodeBackup(game: Expedition, now = new Date()): string {
  if (!validateExpedition(game))
    throw new Error(
      "This company cannot be exported because its save data is invalid.",
    );
  const text = JSON.stringify(
    {
      format: "echoes-crown-save",
      version: 1,
      exportedAt: now.toISOString(),
      game,
    },
    null,
    2,
  );
  if (new TextEncoder().encode(text).length > maxBackupBytes)
    throw new Error("Backup exceeds the 1 MiB file limit.");
  return text;
}
export function parseBackup(text: string): {
  game: Expedition;
  migrated: boolean;
  exportedAt: string | null;
} {
  if (new TextEncoder().encode(text).length > maxBackupBytes)
    throw new Error(
      "Backup is too large. Choose a JSON file smaller than 1 MiB.",
    );
  let record: unknown;
  try {
    record = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON. Choose an Echoes backup.");
  }
  if (!record || typeof record !== "object")
    throw new Error("This file does not contain an Echoes company.");
  const r = record as {
    format?: unknown;
    version?: unknown;
    exportedAt?: unknown;
  };
  if (
    r.format !== undefined &&
    (r.format !== "echoes-crown-save" || r.version !== 1)
  )
    throw new Error("This backup format or version is not supported.");
  const decoded = decodeSave(record);
  if (!decoded)
    throw new Error(
      "The backup contains invalid or unsupported company data. Your current company has not changed.",
    );
  return {
    ...decoded,
    game: structuredClone(decoded.game),
    exportedAt:
      typeof r.exportedAt === "string" &&
      Number.isFinite(Date.parse(r.exportedAt))
        ? r.exportedAt
        : null,
  };
}
export function backupFilename(now = new Date()) {
  return "echoes-company-" + now.toISOString().replace(/[:.]/g, "-") + ".json";
}
