import React, { useEffect, useRef, useState } from "react";
import { GearIcon } from "./GearIcon";
import {
  gearArtwork,
  gearPixels,
  gearIconSources,
  paintGearPixel,
  validateGearArtwork,
  type GearArtwork,
  type IllustratedItem,
} from "./gear-art";
export function GearArtEditor({
  item,
  change,
}: {
  item: IllustratedItem & { name: string };
  change: (art: GearArtwork | undefined) => void;
}) {
  const art = gearArtwork(item),
    ref = useRef<HTMLCanvasElement>(null),
    live = useRef(item.id),
    currentArt = useRef(art);
  live.current = item.id;
  currentArt.current = art;
  const [color, setColor] = useState("#dcad54"),
    [erase, setErase] = useState(false),
    [cursor, setCursor] = useState({ x: 32, y: 32 }),
    [past, setPast] = useState<GearArtwork[]>([]),
    [future, setFuture] = useState<GearArtwork[]>([]),
    [message, setMessage] = useState("");
  useEffect(() => {
    setPast([]);
    setFuture([]);
    setMessage("");
  }, [item.id]);
  useEffect(() => {
    ref.current
      ?.getContext("2d")
      ?.putImageData(new ImageData(gearPixels(art), 64, 64), 0, 0);
  }, [item]);
  function edit(next: GearArtwork) {
    setPast((p) => [...p.slice(-31), structuredClone(art)]);
    setFuture([]);
    change(next);
  }
  function paint(x: number, y: number) {
    if (!erase && !/^#[\da-f]{6}$/i.test(color)) {
      setMessage("Enter a six-digit hex color such as #47c5b4.");
      return;
    }
    setCursor({ x, y });
    edit(paintGearPixel(art, y * 64 + x, erase ? null : color + "ff"));
  }
  return (
    <details className="gear-art-editor">
      <summary>Artwork · {item.name}</summary>
      <p>
        Edit the actual 64 × 64 inventory icon. Changes appear in shops,
        loadouts and supply commands after Apply catalog overrides. Battle
        character outfits are separate.
      </p>
      <div className="gear-art-workspace">
        <div>
          <canvas
            ref={ref}
            width={64}
            height={64}
            tabIndex={0}
            role="application"
            aria-label={`Paint ${item.name} icon. Arrow keys select a pixel; Space paints. Current pixel ${cursor.x}, ${cursor.y}.`}
            onPointerDown={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              paint(
                Math.min(
                  63,
                  Math.max(
                    0,
                    Math.floor(((e.clientX - r.left) * 64) / r.width),
                  ),
                ),
                Math.min(
                  63,
                  Math.max(
                    0,
                    Math.floor(((e.clientY - r.top) * 64) / r.height),
                  ),
                ),
              );
            }}
            onKeyDown={(e) => {
              if (
                [
                  "ArrowUp",
                  "ArrowDown",
                  "ArrowLeft",
                  "ArrowRight",
                  " ",
                ].includes(e.key)
              ) {
                e.preventDefault();
                if (e.key === " ") paint(cursor.x, cursor.y);
                else
                  setCursor((p) => ({
                    x: Math.max(
                      0,
                      Math.min(
                        63,
                        p.x +
                          (e.key === "ArrowRight"
                            ? 1
                            : e.key === "ArrowLeft"
                              ? -1
                              : 0),
                      ),
                    ),
                    y: Math.max(
                      0,
                      Math.min(
                        63,
                        p.y +
                          (e.key === "ArrowDown"
                            ? 1
                            : e.key === "ArrowUp"
                              ? -1
                              : 0),
                      ),
                    ),
                  }));
              }
            }}
          />
          <p>
            Pixel {cursor.x}, {cursor.y} · {art.patches.length} edits
          </p>
        </div>
        <div>
          <GearIcon item={item} />
          <label>
            Artwork source
            <select
              value={art.source}
              onChange={(e) => edit({ source: e.target.value, patches: [] })}
            >
              {Object.entries(gearIconSources).map(([id, s]) => (
                <option value={id} key={id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Pixel color
            <input
              type="color"
              value={/^#[\da-f]{6}$/i.test(color) ? color : "#dcad54"}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>
          <label>
            Pixel hex color
            <input
              type="text"
              value={color}
              maxLength={7}
              spellCheck={false}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={erase}
              onChange={(e) => setErase(e.target.checked)}
            />{" "}
            Restore source pixel
          </label>
          <div className="actions">
            <button
              disabled={!past.length}
              onClick={() => {
                setFuture((f) => [structuredClone(art), ...f]);
                change(past[past.length - 1]);
                setPast((p) => p.slice(0, -1));
              }}
            >
              Undo artwork
            </button>
            <button
              disabled={!future.length}
              onClick={() => {
                setPast((p) => [...p, structuredClone(art)]);
                change(future[0]);
                setFuture((f) => f.slice(1));
              }}
            >
              Redo artwork
            </button>
            <button
              disabled={!item.icon}
              onClick={() => {
                setPast([]);
                setFuture([]);
                change(undefined);
              }}
            >
              Reset item artwork
            </button>
            <button
              onClick={() => {
                const c = document.createElement("canvas");
                c.width = c.height = 64;
                c.getContext("2d")!.putImageData(
                  new ImageData(gearPixels(art), 64, 64),
                  0,
                  0,
                );
                c.toBlob((b) => {
                  if (!b) return;
                  const url = URL.createObjectURL(b),
                    a = document.createElement("a");
                  a.href = url;
                  a.download = item.id + "-icon.png";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                });
              }}
            >
              Export icon PNG
            </button>
          </div>
          <label>
            Import 64 × 64 PNG
            <input
              type="file"
              accept="image/png"
              onChange={async (e) => {
                const f = e.target.files?.[0],
                  id = item.id,
                  snapshot = JSON.stringify(art);
                e.target.value = "";
                if (!f) return;
                try {
                  if (f.size > 256 * 1024)
                    throw Error("Use a PNG under 256 KB.");
                  const bytes = new Uint8Array(await f.arrayBuffer());
                  if (
                    ![137, 80, 78, 71, 13, 10, 26, 10].every(
                      (v, i) => bytes[i] === v,
                    )
                  )
                    throw Error("Choose a PNG image.");
                  const b = await createImageBitmap(f);
                  try {
                    if (b.width !== 64 || b.height !== 64)
                      throw Error("Use exactly 64 × 64 pixels.");
                    const c = document.createElement("canvas");
                    c.width = c.height = 64;
                    c.getContext("2d")!.drawImage(b, 0, 0);
                    const data = c
                      .getContext("2d")!
                      .getImageData(0, 0, 64, 64).data;
                    const patches: [number, string][] = [];
                    for (let i = 0; i < 4096; i++)
                      patches.push([
                        i,
                        "#" +
                          Array.from(data.slice(i * 4, i * 4 + 4))
                            .map((n) => n.toString(16).padStart(2, "0"))
                            .join(""),
                      ]);
                    if (
                      live.current === id &&
                      JSON.stringify(currentArt.current) === snapshot
                    ) {
                      edit(
                        validateGearArtwork({ source: art.source, patches }),
                      );
                      setMessage(
                        "PNG imported into the catalog draft. Apply overrides to keep it.",
                      );
                    }
                  } finally {
                    b.close();
                  }
                } catch (err) {
                  setMessage(
                    err instanceof Error ? err.message : "PNG import failed.",
                  );
                }
              }}
            />
          </label>
        </div>
      </div>
      <p role="status">{message}</p>
    </details>
  );
}
