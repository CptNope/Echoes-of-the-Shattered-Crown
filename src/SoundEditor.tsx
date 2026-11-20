import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SOUND_EVENTS,
  SFX_RATE,
  cueFor,
  renderSound,
  soundWav,
  StudioSfxPlayer,
  validateSoundBank,
  type SoundBank,
  type SoundEvent,
  type SoundLayer,
} from "./studio-sfx";

export function SoundEditor({
  bank,
  apply,
  onDirty,
  active,
}: {
  bank: SoundBank;
  apply: (bank: SoundBank) => boolean;
  onDirty: (dirty: boolean) => void;
  active: boolean;
}) {
  const [draft, setDraft] = useState(() => structuredClone(bank));
  const [event, setEvent] = useState<SoundEvent>("hit"),
    [selected, setSelected] = useState(0),
    [message, setMessage] = useState("");
  const player = useRef<StudioSfxPlayer | null>(null);
  const auditionGeneration = useRef(0);
  function stop() {
    auditionGeneration.current++;
    player.current?.stop();
  }
  useEffect(() => {
    if (!active) stop();
  }, [active]);
  const source = JSON.stringify(bank),
    dirty = JSON.stringify(draft) !== source;
  useEffect(() => {
    setDraft(JSON.parse(source));
  }, [source]);
  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  useEffect(
    () => () => {
      auditionGeneration.current++;
      player.current?.dispose();
    },
    [],
  );
  const cue = cueFor(draft, event),
    index = Math.min(selected, cue.layers.length - 1),
    layer = cue.layers[index];
  const rendered = useMemo(() => {
    try {
      return { pcm: renderSound(draft, event), error: "" };
    } catch (e) {
      return {
        pcm: null,
        error: e instanceof Error ? e.message : "Invalid sound source.",
      };
    }
  }, [draft, event]);
  function change(patch: Partial<SoundLayer>) {
    setDraft((b) => {
      const next = structuredClone(b);
      Object.assign(cueFor(next, event).layers[index], patch);
      return next;
    });
  }
  async function audition() {
    const generation = ++auditionGeneration.current;
    try {
      validateSoundBank(draft);
      player.current ??= new StudioSfxPlayer();
      await player.current.unlock();
      if (generation !== auditionGeneration.current) return;
      if (player.current.play(draft, event))
        setMessage(
          "Playing " + event + " draft through the shared PCM renderer.",
        );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Audio unavailable.");
    }
  }
  const pcm = rendered.pcm,
    peak = pcm ? pcm.reduce((m, v) => Math.max(m, Math.abs(v)), 0) : 0;
  const wave = pcm
    ? Array.from({ length: 120 }, (_, i) => {
        const start = Math.floor((i * pcm.length) / 120),
          end = Math.max(start + 1, Math.floor(((i + 1) * pcm.length) / 120));
        let p = 0;
        for (let n = start; n < end; n++)
          p = Math.max(p, Math.abs(pcm[n] ?? 0));
        return p;
      })
    : [];
  const numeric = (
    label: string,
    key:
      | "frequency"
      | "endFrequency"
      | "durationMs"
      | "delayMs"
      | "attackMs"
      | "gain",
    min: number,
    max: number,
    step = 1,
  ) => (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isNaN(layer[key]) ? "" : layer[key]}
        disabled={
          layer.waveform === "noise" &&
          (key === "frequency" || key === "endFrequency")
        }
        onChange={(e) =>
          change({
            [key]: e.target.value === "" ? NaN : Number(e.target.value),
          })
        }
      />
    </label>
  );
  return (
    <section className="sound-editor" aria-label="Sound effect source editor">
      <div className="section-heading">
        <div>
          <h2>Combat sound effects</h2>
          <p>Layer original sounds, then apply them to this project.</p>
        </div>
        <span>{dirty ? "Unapplied draft" : "Project source"}</span>
      </div>
      <div className="sound-layout">
        <aside className="sound-bindings">
          <h3>Resolved event</h3>
          <div className="tool-list">
            {SOUND_EVENTS.map((id) => (
              <button
                key={id}
                aria-pressed={event === id}
                onClick={() => {
                  stop();
                  setEvent(id);
                  setSelected(0);
                }}
              >
                {id.charAt(0).toUpperCase() + id.slice(1)}{" "}
                <span>{cueFor(draft, id).layers.length} layers</span>
              </button>
            ))}
          </div>
          <label>
            Master gain
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
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
            Noise seed
            <input
              type="number"
              min="0"
              max="4294967295"
              value={Number.isNaN(cue.seed) ? "" : cue.seed}
              onChange={(e) =>
                setDraft((b) => {
                  const next = structuredClone(b);
                  cueFor(next, event).seed =
                    e.target.value === "" ? NaN : Number(e.target.value);
                  return next;
                })
              }
            />
          </label>
          <p>
            Tones use a linear pitch sweep. Noise uses the saved seed; its pitch
            fields are inactive.
          </p>
        </aside>
        <div>
          <figure className="sound-wave">
            <svg
              viewBox="0 0 600 140"
              role="img"
              aria-label={
                event +
                " sound amplitude over time, scale minus one to plus one"
              }
            >
              <line x1="0" y1="70" x2="600" y2="70" stroke="#bdc8b8" />
              {wave.map((p, i) => (
                <line
                  key={i}
                  x1={i * 5 + 2}
                  x2={i * 5 + 2}
                  y1={70 - p * 65}
                  y2={70 + p * 65}
                  stroke="#426f58"
                  strokeWidth="3"
                />
              ))}
            </svg>
            <figcaption>
              {pcm ? Math.round((pcm.length / SFX_RATE) * 1000) : "—"} ms ·{" "}
              {SFX_RATE.toLocaleString()} Hz · Peak {peak.toFixed(3)} / 1
            </figcaption>
          </figure>
          <div className="actions sound-audition">
            <button onClick={() => void audition()} disabled={!pcm}>
              Audition draft
            </button>
            <button
              onClick={() => {
                stop();
                setMessage("Playback stopped.");
              }}
            >
              Stop sound
            </button>
            <button
              disabled={!pcm}
              onClick={() => {
                if (!pcm) return;
                const wav = soundWav(pcm),
                  url = URL.createObjectURL(
                    new Blob([wav as BlobPart], { type: "audio/wav" }),
                  ),
                  a = document.createElement("a");
                a.href = url;
                a.download = "echoes-" + event + ".wav";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                setMessage(
                  "WAV exported from the current draft. Project JSON retains its editable layers.",
                );
              }}
            >
              Export draft WAV
            </button>
          </div>
          <div className="section-heading layer-heading">
            <h3>Sound layers</h3>
            <div className="actions">
              <button
                disabled={cue.layers.length >= 4}
                onClick={() => {
                  const next = structuredClone(draft),
                    layers = cueFor(next, event).layers;
                  let n = 1;
                  while (layers.some((l) => l.id === "layer-" + n)) n++;
                  layers.push({
                    id: "layer-" + n,
                    waveform: "sine",
                    frequency: 440,
                    endFrequency: 220,
                    durationMs: 180,
                    delayMs: 0,
                    attackMs: 5,
                    gain: 0.2,
                    enabled: true,
                  });
                  setDraft(next);
                  setSelected(layers.length - 1);
                }}
              >
                Add layer
              </button>
              <button
                disabled={cue.layers.length <= 1}
                onClick={() => {
                  const next = structuredClone(draft);
                  cueFor(next, event).layers.splice(index, 1);
                  setDraft(next);
                  setSelected(0);
                }}
              >
                Remove layer
              </button>
            </div>
          </div>
          <div className="actions layer-tabs">
            {cue.layers.map((l, i) => (
              <button
                key={l.id}
                aria-pressed={i === index}
                onClick={() => setSelected(i)}
              >
                {l.id}
                {l.enabled ? "" : " · muted"}
              </button>
            ))}
          </div>
          <div className="sound-fields">
            <label>
              Waveform
              <select
                value={layer.waveform}
                onChange={(e) =>
                  change({ waveform: e.target.value as SoundLayer["waveform"] })
                }
              >
                {["sine", "triangle", "square", "noise"].map((w) => (
                  <option key={w}>{w}</option>
                ))}
              </select>
            </label>
            <label>
              Layer playback
              <select
                value={layer.enabled ? "on" : "muted"}
                onChange={(e) => change({ enabled: e.target.value === "on" })}
              >
                <option value="on">Enabled</option>
                <option value="muted">Muted</option>
              </select>
            </label>
            {numeric("Start pitch (Hz)", "frequency", 40, 2400)}
            {numeric("End pitch (Hz)", "endFrequency", 40, 2400)}
            {numeric("Duration (ms)", "durationMs", 20, 1200)}
            {numeric("Delay (ms)", "delayMs", 0, 400)}
            {numeric("Attack (ms)", "attackMs", 1, 100)}
            {numeric("Layer gain", "gain", 0, 0.8, 0.05)}
          </div>
          {rendered.error && (
            <p className="error" role="alert">
              {rendered.error}
            </p>
          )}
          <div className="actions">
            <button
              disabled={!pcm || !dirty}
              onClick={() => {
                if (apply(validateSoundBank(draft)))
                  setMessage(
                    "Sound source applied. Save or export the project to keep it.",
                  );
                else
                  setMessage(
                    "Sound edits were not applied. See the project error above.",
                  );
              }}
            >
              Apply sound edits
            </button>
            <button
              disabled={!dirty}
              onClick={() => {
                stop();
                setDraft(structuredClone(bank));
                setMessage("Draft discarded. Project source restored.");
              }}
            >
              Discard sound draft
            </button>
          </div>
          <p role="status">{message}</p>
          <p className="sound-limits">
            Apply or discard the draft before playtesting. The preview is muted
            until you enable sound. WAV is a rendered sound; project JSON
            preserves the editable source.
          </p>
        </div>
      </div>
    </section>
  );
}
