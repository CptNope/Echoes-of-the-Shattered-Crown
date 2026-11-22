import React, { useEffect, useMemo, useRef, useState } from "react";
import { gameAudio, validateGameAudio, type GameAudio } from "./game-audio";
import { AudioScore } from "./audio";
export function GameAudioEditor({
  source,
  apply,
  onDirty,
  active,
}: {
  source: GameAudio | undefined;
  apply: (s: GameAudio) => boolean;
  onDirty: (d: boolean) => void;
  active: boolean;
}) {
  const baseline = useMemo(() => source ?? gameAudio(), [source]),
    [draft, setDraft] = useState(baseline),
    [message, setMessage] = useState(""),
    [playing, setPlaying] = useState(false),
    player = useRef<AudioScore | null>(null),
    generation = useRef(0);
  const changed = JSON.stringify(draft) !== JSON.stringify(baseline);
  const error = useMemo(() => {
    try {
      validateGameAudio(draft);
      return "";
    } catch (e) {
      return e instanceof Error ? e.message : "Invalid game score.";
    }
  }, [draft]);
  function stop() {
    generation.current++;
    player.current?.dispose();
    player.current = null;
    setPlaying(false);
  }
  useEffect(() => {
    setDraft(baseline);
  }, [baseline]);
  useEffect(() => onDirty(changed), [changed, onDirty]);
  useEffect(() => {
    stop();
  }, [active, draft]);
  useEffect(
    () => () => {
      generation.current++;
      player.current?.dispose();
    },
    [],
  );
  return (
    <section aria-label="Existing game audio editor">
      <p className="source-caption">
        Source: the original sixteen-note glass-and-strings score and 440/280 Hz
        command feedback used by the main game. This shares AudioScore and its
        source defaults with the runtime.
      </p>
      <div className="content-fields">
        {(
          [
            ["stepMs", "Note spacing (ms)", 100, 2000],
            ["noteMs", "Lead duration (ms)", 40, 5000],
            ["bassMs", "Bass duration (ms)", 40, 6000],
            ["volume", "Master volume", 0, 1],
            ["leadGain", "Lead gain", 0, 1],
            ["bassGain", "Bass gain", 0, 1],
            ["skillHz", "Skill feedback (Hz)", 40, 2000],
            ["moveHz", "Move/end feedback (Hz)", 40, 2000],
            ["feedbackMs", "Feedback duration (ms)", 40, 1000],
            ["feedbackGain", "Feedback gain", 0, 1],
          ] as const
        ).map(([field, label, min, max]) => (
          <label key={field}>
            {label}
            <input
              type="number"
              min={min}
              max={max}
              step={max === 1 ? 0.01 : 1}
              value={draft[field]}
              onChange={(e) =>
                setDraft((p) => ({ ...p, [field]: Number(e.target.value) }))
              }
            />
          </label>
        ))}
        <label>
          Lead waveform
          <select
            value={draft.waveform}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                waveform: e.target.value as GameAudio["waveform"],
              }))
            }
          >
            {["triangle", "sine", "square"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Preview score
          <select
            value={draft.enabled ? "on" : "off"}
            onChange={(e) =>
              setDraft((p) => ({ ...p, enabled: e.target.value === "on" }))
            }
          >
            <option value="on">Use existing-game score</option>
            <option value="off">Use applied pattern sketch instead</option>
          </select>
        </label>
      </div>
      <div className="music-step-grid">
        {draft.notes.map((n, i) => (
          <label key={i}>
            Game score note {i + 1} (Hz)
            <input
              type="number"
              step="0.01"
              min="40"
              max="2000"
              value={n}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  notes: p.notes.map((n, j) =>
                    j === i ? Number(e.target.value) : n,
                  ),
                }))
              }
            />
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="actions">
        <button
          disabled={!!error || !draft.enabled}
          onClick={async () => {
            stop();
            const id = ++generation.current;
            try {
              const next = new AudioScore(validateGameAudio(draft));
              player.current = next;
              await next.start();
              if (id !== generation.current) {
                next.dispose();
                return;
              }
              setPlaying(true);
              setMessage("Playing the existing-game score with this source.");
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Audio unavailable.");
            }
          }}
        >
          Audition game score
        </button>
        <button
          disabled={!playing}
          onClick={() => {
            stop();
            setMessage("Game score stopped.");
          }}
        >
          Stop game score
        </button>
        <button
          disabled={!playing}
          onClick={() => player.current?.feedback("skill")}
        >
          Audition skill feedback
        </button>
        <button
          disabled={!playing}
          onClick={() => player.current?.feedback("move")}
        >
          Audition move feedback
        </button>
      </div>
      <div className="actions">
        <button
          disabled={!!error || (!!source && !changed)}
          onClick={() => {
            stop();
            if (apply(validateGameAudio(draft)))
              setMessage("Existing game audio source applied to playtest.");
          }}
        >
          Apply game audio
        </button>
        <button
          disabled={!changed}
          onClick={() => {
            stop();
            setDraft(baseline);
          }}
        >
          Discard game audio draft
        </button>
      </div>
      <p role="status">{message}</p>
      <p>
        Existing score takes precedence over the separate one-bar pattern when
        enabled. Layered outcome SFX remain an additional project bank; the main
        game originally has two command tones rather than four outcome cues.
        Project JSON preserves this source; WAV export remains available for
        pattern sketches and layered SFX.
      </p>
    </section>
  );
}
