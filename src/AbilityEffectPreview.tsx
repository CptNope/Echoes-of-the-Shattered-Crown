import React, { useEffect, useMemo, useRef, useState } from "react";
import { loadEffectAtlas, type EffectArt } from "./effect-art";
import { resolveEffectRecipe } from "./combat-effects";
import type { BuiltinSkillId } from "./data";
import type { EffectStyle } from "./effect-style";

export function AbilityEffectPreview({
  family,
  style,
}: {
  family: BuiltinSkillId;
  style?: EffectStyle;
}) {
  const recipe = useMemo(
    () => resolveEffectRecipe(family, style),
    [family, style],
  );
  const canvas = useRef<HTMLCanvasElement>(null);
  const [art, setArt] = useState<EffectArt | null>(null),
    [loading, setLoading] = useState(true);
  const [frame, setFrame] = useState(0),
    [playing, setPlaying] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setArt(null);
    void loadEffectAtlas(recipe.atlas).then((a) => {
      if (!cancelled) {
        setArt(a);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [recipe.atlas]);
  useEffect(() => {
    setFrame(0);
    setPlaying(false);
  }, [family]);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(
      () => setFrame((f) => (f + 1) % 8),
      recipe.frameMs,
    );
    return () => window.clearInterval(id);
  }, [playing, recipe.frameMs]);
  useEffect(() => {
    const c = canvas.current!,
      ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    if (!art) return;
    const cell = document.createElement("canvas"),
      w = art.width / 4,
      h = art.height / 8;
    cell.width = Math.ceil(w);
    cell.height = Math.ceil(h);
    const p = cell.getContext("2d")!,
      index = recipe.clip * 8 + frame;
    const draw = () =>
      p.drawImage(
        art.image,
        (index % 4) * w,
        Math.floor(index / 4) * h,
        w,
        h,
        0,
        0,
        cell.width,
        cell.height,
      );
    draw();
    if (recipe.tint !== 0xffffff) {
      p.globalCompositeOperation = "multiply";
      p.fillStyle = "#" + recipe.tint.toString(16).padStart(6, "0");
      p.fillRect(0, 0, cell.width, cell.height);
      p.globalCompositeOperation = "destination-in";
      draw();
    }
    const size = recipe.size * 48,
      ratio = w / h;
    ctx.globalAlpha = recipe.opacity;
    ctx.drawImage(
      cell,
      (c.width - size * ratio) / 2,
      (c.height - size) / 2,
      size * ratio,
      size,
    );
    ctx.globalAlpha = 1;
  }, [art, recipe, frame]);
  return (
    <section
      aria-label="Ability atlas preview"
      className="ability-effect-preview"
    >
      <canvas
        ref={canvas}
        width={320}
        height={220}
        role="img"
        aria-label={`Effect atlas frame ${frame + 1} of 8`}
      />
      <div>
        <p>
          {loading
            ? "Loading existing effect artwork…"
            : art
              ? `Frame ${frame + 1} / 8 · ${recipe.frameMs} ms per frame`
              : "Effect artwork unavailable. Battle uses its fallback ring."}
        </p>
        <div className="actions" aria-label="Effect atlas frames">
          {Array.from({ length: 8 }, (_, i) => (
            <button
              key={i}
              aria-label={`Effect frame ${i + 1}`}
              aria-pressed={frame === i}
              onClick={() => {
                setPlaying(false);
                setFrame(i);
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button disabled={!art} onClick={() => setPlaying(!playing)}>
          {playing ? "Pause effect preview" : "Play effect preview"}
        </button>
        <p>
          Existing atlas frames with your tint, scale and opacity. Particle
          motion and travel appear in playtests. Previewing leaves combat
          unchanged.
        </p>
      </div>
    </section>
  );
}
