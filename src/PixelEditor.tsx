import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  defaultPixelClip,
  validatePixelClip,
  editPixelClip,
  renderPixelFrame,
  compilePixelSheet,
  pixelFrameAt,
  PIXEL_ACTORS,
  type PixelClip,
  type PixelEdit,
} from "./studio-pixels";

function FrameCanvas({
  clip,
  frame,
  label,
}: {
  clip: PixelClip;
  frame: number;
  label: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    try {
      ref
        .current!.getContext("2d")!
        .putImageData(
          new ImageData(renderPixelFrame(clip, frame), 16, 24),
          0,
          0,
        );
    } catch {
      ref.current?.getContext("2d")?.clearRect(0, 0, 16, 24);
    }
  }, [clip, frame]);
  return (
    <canvas ref={ref} width="16" height="24" role="img" aria-label={label} />
  );
}
export function PixelEditor({
  clip,
  apply,
  onDirty,
  active,
}: {
  clip: PixelClip | undefined;
  apply: (p: PixelClip) => boolean;
  onDirty: (dirty: boolean) => void;
  active: boolean;
}) {
  const source = JSON.stringify(clip ?? defaultPixelClip()),
    [draft, setDraft] = useState<PixelClip>(() => JSON.parse(source));
  const [frameId, setFrameId] = useState("frame-1"),
    [layerId, setLayerId] = useState("detail"),
    [color, setColor] = useState(6);
  const [past, setPast] = useState<PixelClip[]>([]),
    [future, setFuture] = useState<PixelClip[]>([]),
    [message, setMessage] = useState("");
  const [playing, setPlaying] = useState(false),
    [previewFrame, setPreviewFrame] = useState(0),
    [onion, setOnion] = useState(false);
  const [reduced, setReduced] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [cursor, setCursor] = useState({ x: 0, y: 0 });
  const grid = useRef<HTMLDivElement>(null),
    stroke = useRef<PixelClip | null>(null),
    points = useRef(new Map<string, { x: number; y: number; color: number }>());
  const changed = JSON.stringify(draft) !== source;
  useEffect(() => {
    setDraft(JSON.parse(source));
    setPast([]);
    setFuture([]);
    setPlaying(false);
  }, [source]);
  useEffect(() => {
    onDirty(changed);
  }, [changed, onDirty]);
  useEffect(() => {
    if (!active) {
      setPlaying(false);
      finish(true);
    }
  }, [active]);
  const ink = Math.min(color, draft.palette.length - 1);
  const frameIndex = Math.max(
      0,
      draft.frames.findIndex((f) => f.id === frameId),
    ),
    frame = draft.frames[frameIndex];
  const layerIndex = Math.max(
      0,
      draft.layers.findIndex((l) => l.id === layerId),
    ),
    layer = draft.layers[layerIndex];
  const rendered = useMemo(() => {
    try {
      return { bytes: renderPixelFrame(draft, frameIndex), error: "" };
    } catch (e) {
      return {
        bytes: null,
        error: e instanceof Error ? e.message : "Invalid pixel source.",
      };
    }
  }, [draft, frameIndex]);
  const previous = useMemo(() => {
    try {
      return onion
        ? renderPixelFrame(
            draft,
            (frameIndex + draft.frames.length - 1) % draft.frames.length,
          )
        : null;
    } catch {
      return null;
    }
  }, [draft, frameIndex, onion]);
  useEffect(() => {
    if (!playing || !active || reduced || !rendered.bytes) {
      setPreviewFrame(reduced ? 0 : frameIndex);
      return;
    }
    const start = performance.now();
    let id = 0;
    const tick = (now: number) => {
      setPreviewFrame(pixelFrameAt(draft, now - start));
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, active, reduced, draft, frameIndex, !!rendered.bytes]);
  function update(next: PixelClip) {
    setPast((p) => [...p, draft].slice(-30));
    setFuture([]);
    setDraft(next);
    setPlaying(false);
  }
  function command(edit: PixelEdit) {
    try {
      update(editPixelClip(draft, edit));
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Edit rejected.");
    }
  }
  function paint(x: number, y: number, base = draft, continuous = false) {
    try {
      points.current.set(x + "," + y, { x, y, color: ink });
      const next = editPixelClip(base, {
        type: "paint",
        frameId: frame.id,
        layerId: layer.id,
        points: continuous
          ? [...points.current.values()]
          : [{ x, y, color: ink }],
      });
      if (continuous) {
        setDraft(next);
        setPlaying(false);
      } else update(next);
      setCursor({ x, y });
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Brush rejected.");
    }
  }
  function at(e: React.PointerEvent) {
    const rect = grid.current!.getBoundingClientRect(),
      x = Math.floor(((e.clientX - rect.left) / rect.width) * 16),
      y = Math.floor(((e.clientY - rect.top) / rect.height) * 24);
    return x >= 0 && x < 16 && y >= 0 && y < 24 ? { x, y } : null;
  }
  function finish(cancel = false) {
    const before = stroke.current;
    if (!before) return;
    if (cancel) setDraft(before);
    else if (points.current.size) {
      setPast((p) => [...p, before].slice(-30));
      setFuture([]);
    }
    stroke.current = null;
    points.current.clear();
  }
  return (
    <section className="pixel-editor" aria-label="Pixel animation editor">
      <div className="section-heading">
        <p>
          {clip
            ? "Applied pixel source"
            : "Starter lantern sprite - not yet applied"}{" "}
          · {draft.frames.length} frames · 16 x 24 pixels
        </p>
        <div className="actions">
          <button
            disabled={!past.length}
            onClick={() => {
              const next = past.at(-1)!;
              setFuture((f) => [...f, draft]);
              setPast((p) => p.slice(0, -1));
              setDraft(next);
              setPlaying(false);
            }}
          >
            Undo pixel draft
          </button>
          <button
            disabled={!future.length}
            onClick={() => {
              const next = future.at(-1)!;
              setPast((p) => [...p, draft]);
              setFuture((f) => f.slice(0, -1));
              setDraft(next);
              setPlaying(false);
            }}
          >
            Redo pixel draft
          </button>
        </div>
      </div>
      <div className="pixel-layout">
        <div>
          <div className="pixel-palette" aria-label="Palette colors">
            {draft.palette.map((c, i) => (
              <button
                key={i}
                aria-label={
                  i === 0 ? "Transparent eraser" : "Color " + i + " " + c
                }
                aria-pressed={ink === i}
                onClick={() => setColor(i)}
                style={{
                  background: i === 0 ? "#fff" : c.slice(0, 7),
                  color:
                    i === 0 ||
                    parseInt(c.slice(1, 3), 16) * 0.299 +
                      parseInt(c.slice(3, 5), 16) * 0.587 +
                      parseInt(c.slice(5, 7), 16) * 0.114 >
                      145
                      ? "#15271c"
                      : "#fff",
                }}
              >
                {i === 0 ? "Erase" : i}
              </button>
            ))}
          </div>
          {ink > 0 && (
            <label className="palette-color">
              Palette color {ink}
              <input
                type="color"
                aria-label="Selected palette color"
                value={draft.palette[ink].slice(0, 7)}
                onChange={(e) =>
                  command({
                    type: "palette",
                    index: ink,
                    color: e.target.value + "ff",
                  })
                }
              />
            </label>
          )}
          <div className="pixel-canvas-well">
            <div
              className="pixel-grid"
              ref={grid}
              aria-label="Pixel canvas"
              onPointerDown={(e) => {
                if (!rendered.bytes) return;
                if (!layer.visible) {
                  setMessage("Show the selected layer before painting.");
                  return;
                }
                e.preventDefault();
                const p = at(e);
                if (!p) return;
                stroke.current = draft;
                points.current.clear();
                e.currentTarget.setPointerCapture(e.pointerId);
                paint(p.x, p.y, stroke.current, true);
              }}
              onPointerMove={(e) => {
                if (!stroke.current) return;
                const p = at(e);
                if (p) paint(p.x, p.y, stroke.current, true);
              }}
              onPointerUp={() => finish()}
              onPointerCancel={() => finish(true)}
              onLostPointerCapture={() => finish()}
            >
              {Array.from({ length: 384 }, (_, i) => {
                const x = i % 16,
                  y = Math.floor(i / 16),
                  b = rendered.bytes,
                  visible = b && b[i * 4 + 3] > 0,
                  old = previous && previous[i * 4 + 3] > 0;
                const rgba = visible ? b : old ? previous : null;
                const background = rgba
                  ? "rgb(" +
                    rgba[i * 4] +
                    "," +
                    rgba[i * 4 + 1] +
                    "," +
                    rgba[i * 4 + 2] +
                    ")"
                  : "#fff";
                return (
                  <button
                    key={i}
                    data-pixel={i}
                    tabIndex={cursor.x === x && cursor.y === y ? 0 : -1}
                    aria-label={"Pixel " + x + ", " + y}
                    disabled={!b}
                    className={
                      draft.pivot.x === x && draft.pivot.y === y
                        ? "pivot-pixel"
                        : ""
                    }
                    style={{ background, opacity: !visible && old ? 0.3 : 1 }}
                    onClick={(e) => {
                      if (e.detail === 0) paint(x, y);
                    }}
                    onKeyDown={(e) => {
                      const move: Record<string, [number, number]> = {
                        ArrowLeft: [-1, 0],
                        ArrowRight: [1, 0],
                        ArrowUp: [0, -1],
                        ArrowDown: [0, 1],
                      };
                      if (!move[e.key]) return;
                      e.preventDefault();
                      const next = {
                        x: Math.max(0, Math.min(15, x + move[e.key][0])),
                        y: Math.max(0, Math.min(23, y + move[e.key][1])),
                      };
                      setCursor(next);
                      grid.current
                        ?.querySelector<HTMLButtonElement>(
                          '[data-pixel="' + (next.y * 16 + next.x) + '"]',
                        )
                        ?.focus();
                    }}
                  />
                );
              })}
            </div>
          </div>
          <p className="pixel-help">
            Paint or drag on the selected layer. Arrow keys move focus; Space
            paints. Pivot marker uses source coordinates.
          </p>
        </div>
        <aside className="pixel-inspector">
          <div className="pixel-live">
            <FrameCanvas
              clip={draft}
              frame={Math.min(previewFrame, draft.frames.length - 1)}
              label="Animation preview"
            />
            <div>
              <strong>Animation preview</strong>
              <p>
                Frame {Math.min(previewFrame, draft.frames.length - 1) + 1} /{" "}
                {draft.frames.length}
              </p>
            </div>
          </div>
          <div className="actions">
            <button
              disabled={!rendered.bytes || reduced}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? "Pause clip" : "Play clip"}
            </button>
            <button
              onClick={() => {
                setPlaying(false);
                setPreviewFrame(reduced ? 0 : frameIndex);
              }}
            >
              Show selected frame
            </button>
          </div>
          <label>
            Motion
            <select
              value={reduced ? "reduced" : "normal"}
              onChange={(e) => {
                setReduced(e.target.value === "reduced");
                setPlaying(false);
              }}
            >
              <option value="normal">Animate source timing</option>
              <option value="reduced">Reduced motion: hold frame 1</option>
            </select>
          </label>
          <label>
            Onion skin
            <select
              value={onion ? "on" : "off"}
              onChange={(e) => setOnion(e.target.value === "on")}
            >
              <option value="off">Off</option>
              <option value="on">Previous frame, preview only</option>
            </select>
          </label>
          <label>
            Source layer
            <select
              value={layer.id}
              onChange={(e) => setLayerId(e.target.value)}
            >
              {draft.layers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id}
                </option>
              ))}
            </select>
          </label>
          <div className="actions">
            <button
              onClick={() =>
                command({
                  type: "visible",
                  layerId: layer.id,
                  visible: !layer.visible,
                })
              }
            >
              {layer.visible ? "Hide selected layer" : "Show selected layer"}
            </button>
            <button onClick={() => command({ type: "swap-layers" })}>
              Swap layer order
            </button>
          </div>
          <label>
            Frame duration (ms)
            <input
              type="number"
              min="40"
              max="1000"
              value={Number.isNaN(frame.durationMs) ? "" : frame.durationMs}
              onChange={(e) => {
                const next = structuredClone(draft);
                next.frames[frameIndex].durationMs =
                  e.target.value === "" ? NaN : Number(e.target.value);
                update(next);
              }}
            />
          </label>
          <div className="pixel-pivots">
            {(["x", "y"] as const).map((axis) => (
              <label key={axis}>
                Pivot {axis}
                <input
                  type="number"
                  min="0"
                  max={axis === "x" ? 16 : 24}
                  value={
                    Number.isNaN(draft.pivot[axis]) ? "" : draft.pivot[axis]
                  }
                  onChange={(e) => {
                    const next = structuredClone(draft);
                    next.pivot[axis] =
                      e.target.value === "" ? NaN : Number(e.target.value);
                    update(next);
                  }}
                />
              </label>
            ))}
          </div>
        </aside>
      </div>
      <div className="pixel-timeline">
        {draft.frames.map((f, i) => (
          <button
            key={f.id}
            aria-pressed={frameIndex === i}
            onClick={() => {
              setFrameId(f.id);
              setPlaying(false);
              setPreviewFrame(i);
            }}
          >
            Frame {i + 1} · {f.durationMs} ms <small>{f.id}</small>
          </button>
        ))}
      </div>
      <div className="actions">
        <button
          disabled={draft.frames.length >= 4 || !rendered.bytes}
          onClick={() => command({ type: "duplicate", frameId: frame.id })}
        >
          Duplicate frame
        </button>
        <button
          disabled={draft.frames.length <= 1 || !rendered.bytes}
          onClick={() => command({ type: "delete", frameId: frame.id })}
        >
          Delete frame
        </button>
        <button
          disabled={frameIndex === 0 || !rendered.bytes}
          onClick={() =>
            command({ type: "move", frameId: frame.id, direction: -1 })
          }
        >
          Move frame earlier
        </button>
        <button
          disabled={frameIndex === draft.frames.length - 1 || !rendered.bytes}
          onClick={() =>
            command({ type: "move", frameId: frame.id, direction: 1 })
          }
        >
          Move frame later
        </button>
      </div>
      <div className="pixel-binding">
        <label>
          Preview actor
          <select
            value={draft.actorId}
            onChange={(e) =>
              command({
                type: "binding",
                actorId: e.target.value,
                enabled: draft.enabled,
              })
            }
          >
            {PIXEL_ACTORS.map((id) => (
              <option key={id}>{id}</option>
            ))}
          </select>
        </label>
        <label>
          Custom clip
          <select
            value={draft.enabled ? "on" : "off"}
            onChange={(e) =>
              command({
                type: "binding",
                actorId: draft.actorId,
                enabled: e.target.value === "on",
              })
            }
          >
            <option value="on">Use in studio playtest</option>
            <option value="off">Keep source, use original art</option>
          </select>
        </label>
      </div>
      {rendered.error && (
        <p className="error" role="alert">
          {rendered.error}
        </p>
      )}
      <div className="actions">
        <button
          disabled={!rendered.bytes || (!changed && !!clip)}
          onClick={() => {
            setPlaying(false);
            if (apply(validatePixelClip(draft)))
              setMessage(
                "Pixel source applied. Save or export the project to keep it.",
              );
          }}
        >
          Apply pixel edits
        </button>
        <button
          disabled={!changed}
          onClick={() => {
            setDraft(JSON.parse(source));
            setPast([]);
            setFuture([]);
            setPlaying(false);
            setMessage("Pixel draft discarded.");
          }}
        >
          Discard pixel draft
        </button>
        <button
          disabled={!rendered.bytes}
          onClick={async () => {
            try {
              const sheet = compilePixelSheet(draft),
                canvas = document.createElement("canvas");
              canvas.width = sheet.width;
              canvas.height = sheet.height;
              canvas
                .getContext("2d")!
                .putImageData(
                  new ImageData(sheet.pixels, sheet.width, sheet.height),
                  0,
                  0,
                );
              const blob = await new Promise<Blob>((resolve, reject) =>
                canvas.toBlob(
                  (b) => (b ? resolve(b) : reject(Error("PNG export failed."))),
                  "image/png",
                ),
              );
              const url = URL.createObjectURL(blob),
                a = document.createElement("a");
              a.href = url;
              a.download = "echoes-pixel-clip.png";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              setMessage(
                "PNG sheet exported. Project JSON retains layers, timing and pivot.",
              );
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "PNG export failed.");
            }
          }}
        >
          Export PNG sheet
        </button>
      </div>
      <p role="status">{message}</p>
      <p className="sound-limits">
        One custom loop replaces the selected actor's preview art across states;
        downed holds its last frame. Separate attack/cast clips, directions,
        resizing and image-file import remain planned. PNG is a flattened
        derivative; project JSON preserves the editable source.
      </p>
    </section>
  );
}
