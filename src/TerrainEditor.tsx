import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  gameMaterials,
  TERRAIN_IDS,
  terrainRgba,
  validateMaterials,
  type TerrainId,
  type TerrainMaterials,
} from "./studio-materials";
export function TerrainEditor({
  source,
  apply,
  onDirty,
  active,
}: {
  source: TerrainMaterials | undefined;
  active: boolean;
  apply: (s: TerrainMaterials) => boolean;
  onDirty: (d: boolean) => void;
}) {
  const baseline = useMemo(() => source ?? gameMaterials(), [source]),
    [draft, setDraft] = useState(baseline),
    [terrain, setTerrain] = useState<TerrainId>("stone"),
    [ink, setInk] = useState(1),
    [past, setPast] = useState<TerrainMaterials[]>([]),
    [future, setFuture] = useState<TerrainMaterials[]>([]),
    [message, setMessage] = useState(""),
    [cursor, setCursor] = useState(0);
  const stroke = useRef<TerrainMaterials | null>(null),
    live = useRef(draft),
    grid = useRef<HTMLDivElement>(null);
  live.current = draft;
  useEffect(() => {
    setDraft(baseline);
    setPast([]);
    setFuture([]);
  }, [baseline]);
  const changed = JSON.stringify(draft) !== JSON.stringify(baseline);
  useEffect(() => onDirty(changed), [changed, onDirty]);
  const surface = draft.surfaces[terrain],
    color = Math.min(ink, surface.colors.length - 1);
  function update(next: TerrainMaterials) {
    if (JSON.stringify(next) === JSON.stringify(draft)) return;
    setPast((p) => [...p, draft].slice(-30));
    setFuture([]);
    setDraft(next);
  }
  function paint(index: number, continuous = false) {
    const p = live.current,
      next = structuredClone(p);
    next.surfaces[terrain].pixels[index] = color;
    if (continuous) {
      live.current = next;
      setDraft(next);
    } else update(next);
    setCursor(index);
  }
  function finish(cancel = false) {
    const before = stroke.current;
    stroke.current = null;
    if (!before) return;
    if (cancel) setDraft(before);
    else if (JSON.stringify(before) !== JSON.stringify(live.current)) {
      setPast((p) => [...p, before].slice(-30));
      setFuture([]);
    }
  }
  useEffect(() => {
    if (!active) finish(true);
  }, [active]);
  function at(e: React.PointerEvent) {
    const rect = grid.current!.getBoundingClientRect(),
      x = Math.floor(((e.clientX - rect.left) / rect.width) * 16),
      y = Math.floor(((e.clientY - rect.top) / rect.height) * 16);
    return x >= 0 && x < 16 && y >= 0 && y < 16 ? y * 16 + x : null;
  }
  return (
    <section aria-label="Terrain material and texture editor">
      <p className="source-caption">
        Source: the actual grass, stone, water and ice colors used by the game
        renderer. The shipped terrain has procedural geometry and colors, with
        no texture files to import.
      </p>
      <div className="native-settings">
        <label>
          Terrain material
          <select
            value={terrain}
            onChange={(e) => {
              finish(true);
              setTerrain(e.target.value as TerrainId);
              setInk(0);
            }}
          >
            {TERRAIN_IDS.map((id) => (
              <option key={id}>{id}</option>
            ))}
          </select>
        </label>
        <label>
          Top surface rendering
          <select
            value={surface.painted ? "painted" : "procedural"}
            onChange={(e) => {
              const next = structuredClone(draft);
              next.surfaces[terrain].painted = e.target.value === "painted";
              update(next);
            }}
          >
            <option value="procedural">Existing procedural palette</option>
            <option value="painted">Painted 16 × 16 top texture</option>
          </select>
        </label>
      </div>
      <div className="content-layout">
        <div>
          <h2>{terrain} palette</h2>
          <div className="pixel-palette">
            {surface.colors.map((c, i) => (
              <button
                key={i}
                aria-label={"Terrain color " + (i + 1) + " " + c}
                aria-pressed={color === i}
                style={{ background: c, color: "#10251b" }}
                onClick={() => setInk(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <label>
            Selected terrain color
            <input
              type="color"
              value={surface.colors[color]}
              onChange={(e) => {
                const next = structuredClone(draft);
                next.surfaces[terrain].colors[color] = e.target.value;
                update(next);
              }}
            />
          </label>
          <p>
            Palette edits update the existing material variants. Choose Painted
            top texture to use the authored pixels on the tile’s upper face.
            Side walls and level props retain their existing geometry.
          </p>
          <div className="actions">
            <button
              disabled={!past.length}
              onClick={() => {
                setFuture((f) => [...f, draft]);
                setDraft(past.at(-1)!);
                setPast((p) => p.slice(0, -1));
              }}
            >
              Undo terrain draft
            </button>
            <button
              disabled={!future.length}
              onClick={() => {
                setPast((p) => [...p, draft]);
                setDraft(future.at(-1)!);
                setFuture((f) => f.slice(0, -1));
              }}
            >
              Redo terrain draft
            </button>
          </div>
          <button
            onClick={() => {
              const next = structuredClone(draft);
              next.surfaces[terrain] = gameMaterials().surfaces[terrain];
              update(next);
            }}
          >
            Reset selected material to game source
          </button>
        </div>
        <div>
          <div className="pixel-canvas-well">
            <div
              className="pixel-grid"
              aria-label="Terrain texture canvas"
              ref={grid}
              onPointerDown={(e) => {
                e.preventDefault();
                stroke.current = draft;
                e.currentTarget.setPointerCapture(e.pointerId);
                const index = at(e);
                if (index !== null) paint(index, true);
              }}
              onPointerMove={(e) => {
                if (stroke.current) {
                  const index = at(e);
                  if (index !== null) paint(index, true);
                }
              }}
              onPointerUp={() => finish()}
              onPointerCancel={() => finish(true)}
              onLostPointerCapture={() => finish()}
            >
              {surface.pixels.map((n, i) => (
                <button
                  key={i}
                  data-terrain-pixel={i}
                  tabIndex={cursor === i ? 0 : -1}
                  aria-label={
                    "Texture pixel " + (i % 16) + ", " + Math.floor(i / 16)
                  }
                  style={{ background: surface.colors[n] }}
                  onClick={(e) => {
                    if (e.detail === 0) paint(i);
                  }}
                  onKeyDown={(e) => {
                    const step: Record<string, number> = {
                      ArrowLeft: -1,
                      ArrowRight: 1,
                      ArrowUp: -16,
                      ArrowDown: 16,
                    };
                    if (step[e.key]) {
                      e.preventDefault();
                      const next = Math.max(0, Math.min(255, i + step[e.key]));
                      setCursor(next);
                      grid.current
                        ?.querySelector<HTMLButtonElement>(
                          '[data-terrain-pixel="' + next + '"]',
                        )
                        ?.focus();
                    }
                  }}
                />
              ))}
            </div>
          </div>
          <p>
            16 × 16 source pixels; click/drag, or arrows and Space. One stroke
            is one terrain undo step. Enable Painted top texture to see it on
            the battlefield.
          </p>
        </div>
      </div>
      <div className="actions">
        <button
          disabled={!!source && !changed}
          onClick={() => {
            if (apply(validateMaterials(draft)))
              setMessage("Terrain appearance applied to the project playtest.");
          }}
        >
          Apply terrain appearance
        </button>
        <button
          disabled={!changed}
          onClick={() => {
            setDraft(baseline);
            setPast([]);
            setFuture([]);
          }}
        >
          Discard terrain draft
        </button>
        <button
          onClick={() => {
            const c = document.createElement("canvas");
            c.width = c.height = 16;
            c.getContext("2d")!.putImageData(
              new ImageData(terrainRgba(draft, terrain), 16, 16),
              0,
              0,
            );
            c.toBlob((blob) => {
              if (!blob) return;
              const url = URL.createObjectURL(blob),
                a = document.createElement("a");
              a.href = url;
              a.download = terrain + "-top-texture.png";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              setMessage(
                "Terrain PNG exported. Project JSON retains palette and source pixels.",
              );
            });
          }}
        >
          Export terrain PNG
        </button>
      </div>
      <p role="status">{message}</p>
    </section>
  );
}
