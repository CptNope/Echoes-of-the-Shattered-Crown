import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  defaultMusicPattern,
  noteName,
  renderMusic,
  validateMusicPattern,
  MUSIC_RATE,
  type MusicPattern,
} from "./studio-music";
import { StudioSfxPlayer, soundWav } from "./studio-sfx";
export function MusicEditor({
  pattern,
  apply,
  onDirty,
  active,
}: {
  pattern: MusicPattern | undefined;
  apply: (p: MusicPattern) => boolean;
  onDirty: (dirty: boolean) => void;
  active: boolean;
}) {
  const source = JSON.stringify(pattern ?? defaultMusicPattern());
  const [draft, setDraft] = useState<MusicPattern>(() => JSON.parse(source)),
    [message, setMessage] = useState("");
  const player = useRef<StudioSfxPlayer | null>(null),
    generation = useRef(0);
  const dirty = JSON.stringify(draft) !== source || pattern === undefined;
  const stop = () => {
    generation.current++;
    player.current?.stop();
  };
  useEffect(() => {
    setDraft(JSON.parse(source));
  }, [source]);
  // An unopened default sketch is not an unsaved draft until edited or explicitly applied.
  const changed = JSON.stringify(draft) !== source;
  useEffect(() => {
    onDirty(changed);
  }, [changed, onDirty]);
  useEffect(() => {
    if (!active) stop();
  }, [active]);
  useEffect(
    () => () => {
      generation.current++;
      player.current?.dispose();
    },
    [],
  );
  const rendered = useMemo(() => {
    try {
      return { pcm: renderMusic(draft), error: "" };
    } catch (e) {
      return {
        pcm: null,
        error: e instanceof Error ? e.message : "Invalid pattern.",
      };
    }
  }, [draft]);
  const pcm = rendered.pcm;
  async function play() {
    const id = ++generation.current;
    try {
      const samples = renderMusic(draft);
      player.current ??= new StudioSfxPlayer();
      await player.current.unlock();
      if (id !== generation.current) return;
      if (player.current.playLoop(samples))
        setMessage("Looping this four-beat draft. Stop to end audition.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Audio unavailable.");
    }
  }
  return (
    <section aria-label="Music pattern editor" className="music-editor">
      <p>
        {pattern
          ? "Applied project pattern"
          : "Starter sketch · not yet part of the project"}{" "}
        · One bar, sixteen sixteenth-note steps
      </p>
      <div className="music-settings">
        <label>
          Tempo (BPM)
          <input
            type="number"
            min="60"
            max="180"
            value={Number.isNaN(draft.tempo) ? "" : draft.tempo}
            onChange={(e) =>
              setDraft({
                ...draft,
                tempo: e.target.value === "" ? NaN : Number(e.target.value),
              })
            }
          />
        </label>
        <label>
          Instrument
          <select
            value={draft.waveform}
            onChange={(e) =>
              setDraft({
                ...draft,
                waveform: e.target.value as MusicPattern["waveform"],
              })
            }
          >
            {["sine", "triangle", "square"].map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
        </label>
        <label>
          Music gain
          <input
            type="number"
            min="0"
            max="1"
            step=".05"
            value={Number.isNaN(draft.gain) ? "" : draft.gain}
            onChange={(e) =>
              setDraft({
                ...draft,
                gain: e.target.value === "" ? NaN : Number(e.target.value),
              })
            }
          />
        </label>
        <label>
          Note gate
          <input
            type="number"
            min=".2"
            max=".95"
            step=".05"
            value={Number.isNaN(draft.gate) ? "" : draft.gate}
            onChange={(e) =>
              setDraft({
                ...draft,
                gate: e.target.value === "" ? NaN : Number(e.target.value),
              })
            }
          />
        </label>
      </div>
      <div className="actions music-audition">
        <button disabled={!pcm} onClick={() => void play()}>
          Loop music draft
        </button>
        <button
          onClick={() => {
            stop();
            setMessage("Music stopped.");
          }}
        >
          Stop music
        </button>
        <button
          disabled={!pcm}
          onClick={() => {
            if (!pcm) return;
            const url = URL.createObjectURL(
                new Blob([soundWav(pcm) as BlobPart], { type: "audio/wav" }),
              ),
              a = document.createElement("a");
            a.href = url;
            a.download = "echoes-music-bar.wav";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setMessage(
              "One-bar WAV exported. Editable notes remain in project JSON.",
            );
          }}
        >
          Export music WAV
        </button>
      </div>
      <div className="music-step-grid">
        {draft.notes.map((note, index) => (
          <label key={index}>
            Step {index + 1}
            <select
              aria-label={"Step " + (index + 1) + " note"}
              value={note ?? "rest"}
              onChange={(e) => {
                const notes = [...draft.notes];
                notes[index] =
                  e.target.value === "rest" ? null : Number(e.target.value);
                setDraft({ ...draft, notes });
              }}
            >
              <option value="rest">Rest</option>
              {Array.from({ length: 37 }, (_, n) => n + 48).map((n) => (
                <option value={n} key={n}>
                  {noteName(n)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="actions">
        <button
          onClick={() => setDraft({ ...draft, notes: Array(16).fill(null) })}
        >
          Clear all notes
        </button>
        <button onClick={() => setDraft(defaultMusicPattern())}>
          Use starter sketch
        </button>
      </div>
      <p>
        {pcm ? (pcm.length / MUSIC_RATE).toFixed(3) : "—"} seconds per loop · 4
        beats · {draft.notes.filter((n) => n !== null).length} notes
      </p>
      <label className="music-binding">
        Preview music
        <select
          value={draft.enabled ? "on" : "off"}
          onChange={(e) =>
            setDraft({ ...draft, enabled: e.target.value === "on" })
          }
        >
          <option value="on">Include when preview sound is enabled</option>
          <option value="off">Keep source, omit from preview</option>
        </select>
      </label>
      {rendered.error && (
        <p className="error" role="alert">
          {rendered.error}
        </p>
      )}
      <div className="actions">
        <button
          disabled={!pcm || !dirty}
          onClick={() => {
            stop();
            if (apply(validateMusicPattern(draft)))
              setMessage(
                "Music pattern applied. Save or export the project to keep it.",
              );
          }}
        >
          Apply music edits
        </button>
        <button
          disabled={!changed}
          onClick={() => {
            stop();
            setDraft(JSON.parse(source));
            setMessage("Music draft discarded.");
          }}
        >
          Discard music draft
        </button>
      </div>
      <p role="status">{message}</p>
      <p className="sound-limits">
        Apply the pattern before playtesting. Music starts only after enabling
        preview sound. This pilot has one monophonic instrument; arrangements,
        tracks and recording remain planned.
      </p>
    </section>
  );
}
