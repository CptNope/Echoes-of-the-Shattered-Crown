import React, { useEffect, useMemo, useRef, useState } from "react";
import { jobs, type JobId } from "./data";
import { animationStates, type AnimationState } from "./animation";
import { PIXEL_ACTORS } from "./studio-pixels";
import {
  applyNativePatches,
  nativeFill,
  nativeBrushPoints,
  nativeFrameAt,
  nativeFrameRect,
  nativePaint,
  nativePixelIndex,
  renderNativeFrame,
  rgbaHex,
  validateNativeSprite,
  type NativeSprite,
} from "./studio-native-sprites";
import {
  decodeNativeSprite,
  importGameSprite,
  nativeCanvas,
} from "./studio-native-art";
export function NativeSpriteEditor({
  source,
  apply,
  onDirty,
  active,
  actors,
}: {
  source: NativeSprite | undefined;
  apply: (s: NativeSprite) => boolean;
  onDirty: (d: boolean) => void;
  active: boolean;
  actors?: { id: string; name: string }[];
}) {
  const [draft, setDraft] = useState(source),
    [base, setBase] = useState<Uint8ClampedArray | null>(null);
  const [job, setJob] = useState<JobId>(source?.job ?? "vanguard"),
    [actor, setActor] = useState(source?.actorId ?? "sera");
  const [state, setState] = useState<AnimationState>("idle"),
    [column, setColumn] = useState(0),
    [zoom, setZoom] = useState(2);
  const [tool, setTool] = useState<"brush" | "erase" | "fill" | "pick">(
      "brush",
    ),
    [color, setColor] = useState("#ffcc66"),
    [alpha, setAlpha] = useState(255),
    [size, setSize] = useState(1);
  const [past, setPast] = useState<NativeSprite[]>([]),
    [future, setFuture] = useState<NativeSprite[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0 }),
    [playing, setPlaying] = useState(false),
    [playFrame, setPlayFrame] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null),
    preview = useRef<HTMLCanvasElement>(null),
    stroke = useRef<NativeSprite | null>(null),
    strokePoint = useRef<{ x: number; y: number } | null>(null),
    live = useRef(draft),
    generation = useRef(0);
  live.current = draft;
  const sourceKey = useMemo(() => JSON.stringify(source ?? null), [source]),
    draftKey = useMemo(() => JSON.stringify(draft ?? null), [draft]),
    changed = draftKey !== sourceKey;
  useEffect(() => {
    setDraft(source);
    if (source) {
      setJob(source.job);
      setActor(source.actorId);
    }
    setPast([]);
    setFuture([]);
    setPlaying(false);
    generation.current++;
  }, [sourceKey]);
  useEffect(() => {
    onDirty(changed || busy);
  }, [changed, busy, onDirty]);
  useEffect(() => {
    let cancelled = false;
    setBase(null);
    if (draft)
      void decodeNativeSprite(draft)
        .then((data) => {
          if (!cancelled) setBase(data);
        })
        .catch((e) => {
          if (!cancelled) setMessage(e.message);
        });
    return () => {
      cancelled = true;
    };
  }, [draft?.image]);
  useEffect(() => {
    if (!active) {
      setPlaying(false);
      if (stroke.current) {
        setDraft(stroke.current);
        stroke.current = null;
      }
    }
  }, [active]);
  const frame = animationStates.indexOf(state) * 4 + column,
    rect = draft
      ? nativeFrameRect(draft, frame)
      : { width: 222, height: 222, x: 0, y: 0 };
  const rendered = useMemo(
    () => (draft && base ? renderNativeFrame(base, draft, frame) : null),
    [draft, base, frame],
  );
  useEffect(() => {
    if (!rendered || !canvas.current) return;
    canvas.current.width = rect.width;
    canvas.current.height = rect.height;
    canvas.current
      .getContext("2d")!
      .putImageData(
        new ImageData(rendered.pixels, rect.width, rect.height),
        0,
        0,
      );
  }, [rendered]);
  useEffect(() => {
    if (!draft || !base || !preview.current) return;
    const f = playing ? playFrame : frame,
      r = renderNativeFrame(base, draft, f);
    preview.current.width = r.width;
    preview.current.height = r.height;
    preview.current
      .getContext("2d")!
      .putImageData(new ImageData(r.pixels, r.width, r.height), 0, 0);
  }, [draft, base, frame, playFrame, playing]);
  useEffect(() => {
    if (!playing || !draft || !active) return;
    const start = performance.now();
    let id = 0;
    const tick = (now: number) => {
      setPlayFrame(nativeFrameAt(draft, state, now - start));
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, state, draft, active]);
  function update(next: NativeSprite) {
    if (JSON.stringify(next) === JSON.stringify(draft)) return;
    if (draft) setPast((p) => [...p, draft].slice(-30));
    setFuture([]);
    setDraft(next);
    setPlaying(false);
    setMessage("");
  }
  function usePixel(x: number, y: number, continuous = false) {
    const p = live.current;
    if (!p || !base) return;
    setCursor({ x, y });
    try {
      const ink =
        tool === "erase"
          ? "#00000000"
          : color + alpha.toString(16).padStart(2, "0");
      if (tool === "pick") {
        const at = nativePixelIndex(p, frame, x, y),
          picked = p.patches[at] ?? rgbaHex(base, at * 4);
        setColor(picked.slice(0, 7));
        setAlpha(parseInt(picked.slice(7), 16));
        setMessage(
          "Picked " + picked + " from source pixel " + x + ", " + y + ".",
        );
        return;
      }
      const points = nativeBrushPoints(
        p,
        frame,
        continuous ? (strokePoint.current ?? { x, y }) : { x, y },
        { x, y },
        size,
        ink,
      );
      if (continuous) strokePoint.current = { x, y };
      const next =
        tool === "fill"
          ? nativeFill(p, frame, applyNativePatches(base, p), x, y, ink)
          : nativePaint(p, frame, points);
      if (continuous) {
        live.current = next;
        setDraft(next);
        setPlaying(false);
      } else update(next);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Native edit rejected.");
    }
  }
  function finish(cancel = false) {
    const before = stroke.current;
    stroke.current = null;
    strokePoint.current = null;
    if (!before) return;
    if (cancel) {
      live.current = before;
      setDraft(before);
    } else if (
      JSON.stringify(before.patches) !== JSON.stringify(live.current?.patches)
    ) {
      setPast((p) => [...p, before].slice(-30));
      setFuture([]);
    }
  }
  function at(e: React.PointerEvent<HTMLCanvasElement>) {
    const box = e.currentTarget.getBoundingClientRect(),
      x = Math.floor(((e.clientX - box.left) / box.width) * rect.width),
      y = Math.floor(((e.clientY - box.top) / box.height) * rect.height);
    return x >= 0 && y >= 0 && x < rect.width && y < rect.height
      ? { x, y }
      : null;
  }
  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="native-editor" aria-label="Game sprite editor">
      <details className="native-library" open={!draft}>
        <summary>
          Game sheet library
          {draft
            ? " · " + jobs[draft.job].name + " / " + draft.actorId
            : " · choose original artwork"}
        </summary>
        <div className="native-load">
          <label>
            Game character sheet
            <select
              disabled={busy}
              value={job}
              onChange={(e) => setJob(e.target.value as JobId)}
            >
              {Object.keys(jobs).map((j) => (
                <option key={j} value={j}>
                  {jobs[j as JobId].name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Preview actor
            <select
              disabled={busy}
              value={actor}
              onChange={(e) => {
                setActor(e.target.value);
                if (draft) update({ ...draft, actorId: e.target.value });
              }}
            >
              {(actors ?? PIXEL_ACTORS.map((id) => ({ id, name: id }))).map(
                ({ id, name }) => (
                  <option key={id} value={id}>
                    {name} / {id}
                  </option>
                ),
              )}
              {actors && !actors.some((a) => a.id === actor) && (
                <option value={actor}>{actor} / not placed</option>
              )}
            </select>
          </label>
          <button
            disabled={busy || changed}
            onClick={async () => {
              const token = ++generation.current;
              setBusy(true);
              setMessage("Loading original game sheet…");
              try {
                const p = await importGameSprite(job, actor);
                await decodeNativeSprite(p);
                if (generation.current !== token) return;
                update(p);
                setState("idle");
                setColumn(0);
                setCursor({ x: 0, y: 0 });
                setMessage(
                  "Loaded all 32 frames at original resolution. Apply or discard this draft before loading another sheet.",
                );
              } catch (e) {
                if (generation.current === token)
                  setMessage(
                    e instanceof Error ? e.message : "Sheet load failed.",
                  );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Loading sheet…" : "Load game sheet"}
          </button>
        </div>
        <p className="pixel-help">
          Load a shipped character sheet, then edit its actual pixels. All eight
          states and the original transparency are retained. Loading creates a
          draft; Apply updates this actor’s assignment and keeps the other sheets.
        </p>
      </details>
      {draft && (
        <>
          <div className="section-heading">
            <p>
              {changed
                ? "Unapplied native sprite draft"
                : "Applied native sprite"}{" "}
              · {jobs[draft.job].name} · {draft.width} × {draft.height} sheet ·
              32 frames
            </p>
            <div className="actions">
              <button
                disabled={!past.length || busy}
                onClick={() => {
                  const p = past.at(-1)!;
                  setFuture((f) => [...f, draft]);
                  setPast((v) => v.slice(0, -1));
                  setDraft(p);
                  setPlaying(false);
                }}
              >
                Undo native draft
              </button>
              <button
                disabled={!future.length || busy}
                onClick={() => {
                  setPast((p) => [...p, draft]);
                  setDraft(future.at(-1)!);
                  setFuture((f) => f.slice(0, -1));
                  setPlaying(false);
                }}
              >
                Redo native draft
              </button>
            </div>
          </div>
          <div className="native-settings">
            <label>
              Animation state
              <select
                value={state}
                onChange={(e) => {
                  finish(true);
                  setState(e.target.value as AnimationState);
                  setColumn(0);
                  setCursor({ x: 0, y: 0 });
                  setPlaying(false);
                }}
              >
                {animationStates.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Zoom
              <select
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              >
                {[1, 2, 4, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}× native pixels
                  </option>
                ))}
              </select>
            </label>
            <label>
              Brush size
              <select
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              >
                {[1, 3, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} × {n} pixels
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div
            className="pixel-timeline"
            style={{ "--frame-count": 4 } as React.CSSProperties}
          >
            {[0, 1, 2, 3].map((n) => (
              <button
                key={n}
                aria-pressed={column === n}
                onClick={() => {
                  finish(true);
                  setColumn(n);
                  setCursor({ x: 0, y: 0 });
                  setPlaying(false);
                }}
              >
                Native frame {n + 1} ·{" "}
                {draft.durations[animationStates.indexOf(state) * 4 + n]} ms
              </button>
            ))}
          </div>
          <div
            className="pixel-tools"
            role="group"
            aria-label="Native pixel tools"
          >
            {(["brush", "erase", "fill", "pick"] as const).map((t) => (
              <button
                key={t}
                aria-pressed={tool === t}
                onClick={() => {
                  finish(true);
                  setTool(t);
                }}
              >
                {t === "pick"
                  ? "Eyedropper"
                  : t === "fill"
                    ? "Flood fill"
                    : t === "erase"
                      ? "Eraser"
                      : "Brush"}
              </button>
            ))}
          </div>
          <div className="native-layout">
            <div>
              <div className="native-colors">
                <label>
                  Paint color
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </label>
                <label>
                  Alpha (0–255)
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={alpha}
                    onChange={(e) =>
                      setAlpha(
                        Math.max(
                          0,
                          Math.min(255, Math.round(Number(e.target.value))),
                        ),
                      )
                    }
                  />
                </label>
              </div>
              <div className="native-canvas-scroll">
                <canvas
                  ref={canvas}
                  style={{
                    width: rect.width * zoom,
                    height: rect.height * zoom,
                  }}
                  tabIndex={0}
                  role="application"
                  aria-label="Native sprite canvas. Arrow keys move cursor; Space paints selected pixel."
                  onPointerDown={(e) => {
                    if (!base || busy) return;
                    const p = at(e);
                    if (!p) return;
                    e.preventDefault();
                    e.currentTarget.focus();
                    if (tool === "brush" || tool === "erase") {
                      stroke.current = draft;
                      strokePoint.current = null;
                      e.currentTarget.setPointerCapture(e.pointerId);
                      usePixel(p.x, p.y, true);
                    } else usePixel(p.x, p.y);
                  }}
                  onPointerMove={(e) => {
                    const p = at(e);
                    if (p && stroke.current) usePixel(p.x, p.y, true);
                  }}
                  onPointerUp={() => finish()}
                  onPointerCancel={() => finish(true)}
                  onLostPointerCapture={() => finish()}
                  onKeyDown={(e) => {
                    const step: Record<string, [number, number]> = {
                      ArrowLeft: [-1, 0],
                      ArrowRight: [1, 0],
                      ArrowUp: [0, -1],
                      ArrowDown: [0, 1],
                    };
                    if (step[e.key]) {
                      e.preventDefault();
                      setCursor((p) => ({
                        x: Math.max(
                          0,
                          Math.min(rect.width - 1, p.x + step[e.key][0]),
                        ),
                        y: Math.max(
                          0,
                          Math.min(rect.height - 1, p.y + step[e.key][1]),
                        ),
                      }));
                    }
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      usePixel(cursor.x, cursor.y);
                    }
                  }}
                />
              </div>
              <p className="pixel-help">
                {rect.width} × {rect.height} source pixels · Cursor {cursor.x},{" "}
                {cursor.y} · Brush/eraser drag; fill stays in this frame. Zoom
                scrolls inside the canvas. Native alpha is preserved.
              </p>
              <div className="native-coordinate">
                <label>
                  Pixel x
                  <input
                    type="number"
                    min="0"
                    max={rect.width - 1}
                    value={cursor.x}
                    onChange={(e) =>
                      setCursor((p) => ({
                        ...p,
                        x: Math.max(
                          0,
                          Math.min(
                            rect.width - 1,
                            Math.round(Number(e.target.value)),
                          ),
                        ),
                      }))
                    }
                  />
                </label>
                <label>
                  Pixel y
                  <input
                    type="number"
                    min="0"
                    max={rect.height - 1}
                    value={cursor.y}
                    onChange={(e) =>
                      setCursor((p) => ({
                        ...p,
                        y: Math.max(
                          0,
                          Math.min(
                            rect.height - 1,
                            Math.round(Number(e.target.value)),
                          ),
                        ),
                      }))
                    }
                  />
                </label>
                <button
                  disabled={!base || busy}
                  onClick={() => usePixel(cursor.x, cursor.y)}
                >
                  Use native tool at cursor
                </button>
              </div>
            </div>
            <aside className="pixel-inspector">
              <canvas
                ref={preview}
                className="native-preview"
                role="img"
                aria-label="Native animation preview"
              />
              <p>
                {state} ·{" "}
                {playing
                  ? "Frame " +
                    ((playFrame % 4) + 1) +
                    " / 4 · Playing source timing"
                  : "Selected frame " + (column + 1)}
              </p>
              <div className="actions">
                <button
                  disabled={!base || busy}
                  onClick={() => setPlaying((p) => !p)}
                >
                  {playing ? "Pause native clip" : "Play native clip"}
                </button>
              </div>
              <label>
                Native frame duration (ms)
                <input
                  type="number"
                  min="40"
                  max="1000"
                  value={draft.durations[frame]}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isInteger(n) && n >= 40 && n <= 1000) {
                      const durations = [...draft.durations];
                      durations[frame] = n;
                      update({ ...draft, durations });
                    }
                  }}
                />
              </label>
              <label>
                Native override
                <select
                  value={draft.enabled ? "on" : "off"}
                  onChange={(e) =>
                    update({ ...draft, enabled: e.target.value === "on" })
                  }
                >
                  <option value="on">Use native artwork in playtest</option>
                  <option value="off">
                    Keep source, use original game art
                  </option>
                </select>
              </label>
              <p className="pixel-help">
                Original foot registration and display scale are retained for
                every state. Edits belong to {draft.actorId}; other actors keep
                their own assigned or original artwork.
              </p>
            </aside>
          </div>
          <div className="actions">
            <button
              disabled={!base || !changed || busy}
              onClick={() => {
                try {
                  if (apply(validateNativeSprite(draft)))
                    setMessage(
                      "Native sprite applied. Save or export the project to keep it.",
                    );
                } catch (e) {
                  setMessage(e instanceof Error ? e.message : "Apply failed.");
                }
              }}
            >
              Apply native sprite edits
            </button>
            <button
              disabled={!changed || busy}
              onClick={() => {
                setDraft(source);
                setPast([]);
                setFuture([]);
                setPlaying(false);
                setMessage("Native draft discarded.");
              }}
            >
              Discard native draft
            </button>
            <button
              disabled={!base || busy}
              onClick={() => {
                const c = nativeCanvas(draft, base!);
                c.toBlob((blob) => {
                  if (blob) {
                    download(blob, draft.job + "-edited-native.png");
                    setMessage(
                      "Full-resolution 4 × 8 PNG exported. Keep project JSON for editable source and timings.",
                    );
                  } else setMessage("PNG export failed.");
                }, "image/png");
              }}
            >
              Export native PNG sheet
            </button>
          </div>
        </>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
