import { useEffect, useRef, useState } from "react";
import type { Expedition } from "./campaign";
import { encounters } from "./encounters";
import {
  encodeBackup,
  parseBackup,
  backupFilename,
  maxBackupBytes,
} from "./portable";
import { loadRecovery, type RecoveryRecord } from "./storage";
interface Candidate {
  game: Expedition;
  exportedAt: string | null;
  migrated: boolean;
  source: string;
}
export function BackupDialog({
  game,
  recovery,
  startup,
  status,
  onRestore,
  onClose,
}: {
  game: Expedition;
  recovery: RecoveryRecord | null;
  startup: boolean;
  status: string;
  onRestore: (game: Expedition) => void;
  onClose: () => void;
}) {
  const [candidate, setCandidate] = useState<Candidate | null>(() =>
    recovery
      ? {
          game: recovery.game,
          exportedAt: recovery.savedAt,
          migrated: false,
          source: recovery.recovered
            ? "Previous automatic recovery"
            : "Automatic recovery",
        }
      : null,
  );
  const [message, setMessage] = useState(""),
    [reading, setReading] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !startup) {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        const nodes = [
            ...ref.current!.querySelectorAll<HTMLElement>(
              "button:not(:disabled),input:not(:disabled)",
            ),
          ],
          first = nodes[0],
          last = nodes[nodes.length - 1];
        if (!nodes.length) return;
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  function download(value: Expedition) {
    try {
      const text = encodeBackup(value),
        url = URL.createObjectURL(
          new Blob([text], { type: "application/json" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = backupFilename();
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        "Backup download requested. Keep the JSON file somewhere you can find it.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Backup export failed.");
    }
  }
  async function readFile(file: File | undefined) {
    if (!file) return;
    setReading(true);
    setCandidate(null);
    setMessage("");
    try {
      if (file.size > maxBackupBytes)
        throw new Error("Backup is too large. Maximum size is 1 MiB.");
      const parsed = parseBackup(await file.text());
      setCandidate({ ...parsed, source: file.name });
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not read this backup.",
      );
    } finally {
      setReading(false);
    }
  }
  return (
    <div className="modal-backdrop backup-backdrop">
      <section
        ref={ref}
        tabIndex={-1}
        className="modal backup-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-title"
      >
        <div className="modal-header">
          <h2 id="backup-title">
            {startup ? "Resume your company?" : "Company backups"}
          </h2>
          {!startup && (
            <button aria-label="Close backups" onClick={onClose}>
              ×
            </button>
          )}
        </div>
        <p>
          {startup
            ? "An automatic recovery was found on this browser. Review it before choosing how to continue."
            : "Export a portable JSON file or review a backup before restoring it. Files are processed on your device."}
        </p>
        <p className="backup-status" role="status">
          Automatic recovery: {status}
        </p>
        <button
          className="backup-action"
          onClick={() => download(startup && candidate ? candidate.game : game)}
        >
          {startup ? "Export recovery backup" : "Export current company"}
        </button>
        {!startup && (
          <>
            <label className="backup-file">
              Import a backup
              <input
                type="file"
                accept=".json,application/json"
                disabled={reading}
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  e.currentTarget.value = "";
                  void readFile(file);
                }}
              />
            </label>
            <button
              className="backup-action"
              disabled={reading}
              onClick={async () => {
                setReading(true);
                setMessage("");
                try {
                  const r = await loadRecovery();
                  if (!r)
                    throw new Error(
                      "No valid automatic recovery is available.",
                    );
                  setCandidate({
                    game: r.game,
                    exportedAt: r.savedAt,
                    migrated: false,
                    source: r.recovered
                      ? "Previous automatic recovery"
                      : "Automatic recovery",
                  });
                } catch (e) {
                  setMessage(
                    e instanceof Error
                      ? e.message
                      : "Recovery could not be read.",
                  );
                } finally {
                  setReading(false);
                }
              }}
            >
              Review latest automatic recovery
            </button>
          </>
        )}
        {reading && <p role="status">Reading backup…</p>}
        {candidate && (
          <div className="backup-review">
            <h3>{candidate.source}</h3>
            <dl>
              <dt>Company</dt>
              <dd>
                {candidate.game.company.members.map((m) => m.name).join(", ")}
              </dd>
              <dt>Progress</dt>
              <dd>
                {candidate.game.company.gold} gold ·{" "}
                {candidate.game.company.completed.length} /{" "}
                {Object.keys(encounters).length} contracts ·{" "}
                {candidate.game.company.victories} victories
              </dd>
              <dt>Position</dt>
              <dd>
                {candidate.game.stage === "camp"
                  ? "Company camp"
                  : encounters[candidate.game.battle.encounter].name +
                    " · Turn " +
                    candidate.game.battle.turn +
                    " · " +
                    candidate.game.battle.result}
              </dd>
              <dt>Backup time</dt>
              <dd>
                {candidate.exportedAt
                  ? new Date(candidate.exportedAt).toLocaleString()
                  : "Not recorded"}
              </dd>
            </dl>
            {candidate.migrated && (
              <p>
                Legacy battle will be migrated to the current company format.
              </p>
            )}
            <p>
              Restoring replaces your current session and updates automatic
              recovery. Your manual save remains available until you save over
              it.
            </p>
            <button
              className="confirm"
              disabled={reading}
              onClick={() => onRestore(structuredClone(candidate.game))}
            >
              {startup ? "Resume recovery" : "Restore reviewed backup"}
            </button>
            {!startup && (
              <button
                className="backup-action"
                onClick={() => setCandidate(null)}
              >
                Cancel preview
              </button>
            )}
          </div>
        )}
        {message && (
          <p role="status" className="backup-message">
            {message}
          </p>
        )}
        <p className="backup-note">
          Automatic recovery follows company and battle changes while this page
          is open. Abrupt closure can lose a write still in progress. Keep a
          file backup for browser data clearing or another device.
        </p>
        <button className="backup-action" onClick={onClose}>
          {startup ? "Start a new company" : "Return to game"}
        </button>
      </section>
    </div>
  );
}
