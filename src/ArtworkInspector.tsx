import type { ValidationFocusRequest } from "./studio-validation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  projectArtwork,
  useClassArtwork,
  type ActorArtwork,
} from "./artwork-sync";
import { CHARACTER_ART } from "./character-art";
import { jobs, skills } from "./data";
import { equipment } from "./equipment";
import { loadAnimationSheet } from "./animation-art";
import { loadNativeSheet } from "./studio-native-art";
import { renderPixelFrame, pixelStateFrame } from "./studio-pixels";
import type { LevelProject, ProjectEdit } from "./studio-project";
function ArtworkThumbnail({ art, name }: { art: ActorArtwork; name: string }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setError("");
    const c = canvas.current!,
      ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, 72, 80);
    if (art.kind === "indexed") {
      const raw = document.createElement("canvas");
      raw.width = 16;
      raw.height = 24;
      raw
        .getContext("2d")!
        .putImageData(
          new ImageData(
            renderPixelFrame(
              art.source,
              pixelStateFrame(art.source, "idle", 0),
            ),
            16,
            24,
          ),
          0,
          0,
        );
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        raw,
        36 - art.source.pivot.x * 2.5,
        74 - art.source.pivot.y * 2.5,
        40,
        60,
      );
      return;
    }
    void (
      art.kind === "native"
        ? loadNativeSheet(art.source)
        : loadAnimationSheet(art.artId)
    )
      .then((sheet) => {
        if (cancelled) return;
        if (!sheet) throw Error("Artwork unavailable");
        const m = sheet.metadata,
          h = 64 / m.idleHeight;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(
          sheet.image,
          0,
          0,
          m.width / 4,
          m.height / 8,
          36 - h / 2,
          74 - h * m.ground[0],
          h,
          h,
        );
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Artwork unavailable. Open the sprite editor to inspect its source.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [art]);
  return (
    <div className="artwork-thumbnail">
      <canvas
        ref={canvas}
        width={72}
        height={80}
        role="img"
        aria-label={"Artwork preview for " + name}
      />
      {error && <small role="status">{error}</small>}
    </div>
  );
}
export function ArtworkInspector({
  project,
  apply,
  openActor,
  openEditor,
  blocked,
  focusRequest,
}: {
  project: LevelProject;
  focusRequest?: ValidationFocusRequest;
  apply: (edits: ProjectEdit[]) => boolean;
  openActor: (id: string) => void;
  openEditor: (
    area:
      | "rules"
      | "content"
      | "terrain"
      | "game-audio"
      | "sounds"
      | "music"
      | "map",
  ) => void;
  blocked: boolean;
}) {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const target = focusRequest?.target;
    if (target?.area !== "assets") return;
    const row = Array.from(
      section.current?.querySelectorAll<HTMLElement>("[data-actor-art]") ?? [],
    ).find((n) => n.dataset.actorArt === target.id);
    row?.scrollIntoView({ block: "center" });
    row?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [focusRequest]);
  const rows = useMemo(() => projectArtwork(project), [project]),
    catalog = project.rules?.jobs ?? jobs;
  const repairs = useClassArtwork(
    project,
    rows.map((r) => r.actor.id),
  );
  return (
    <section ref={section} aria-label="Current cast artwork">
      <h2>Current cast artwork</h2>
      <p>
        These are the same sources used by this playtest. Native overrides take
        priority, followed by indexed clips, then the current class sheet.
        Low-resolution clips and deliberate cross-class skins are identified
        below.
      </p>
      <div className="actions">
        <button
          disabled={blocked || !repairs.length}
          onClick={() => apply(repairs)}
        >
          Use class art for current cast
        </button>
      </div>
      <p>
        Switching to class art disables overrides and keeps their pixels and
        timing. Undo restores the previous appearance.
      </p>
      <ul className="artwork-cast">
        {rows.map(({ actor, art }) => (
          <li key={actor.id} data-actor-art={actor.id}>
            <ArtworkThumbnail art={art} name={actor.name} />
            <div>
              <strong>{actor.name}</strong>
              <p>
                {catalog[actor.job]?.name ?? actor.job} / {actor.id}
              </p>
              <p>
                {art.kind === "class"
                  ? "Class sheet: " + CHARACTER_ART[art.artId]
                  : art.kind === "indexed"
                    ? "Indexed override: 16 by 24 / " +
                      art.source.frames.length +
                      " frames"
                    : "Native override: " +
                      CHARACTER_ART[art.source.job] +
                      " / " +
                      art.source.width +
                      " by " +
                      art.source.height}
              </p>
              {art.kind === "indexed" && (
                <p className="artwork-note">
                  Low-resolution artwork can look different from the painted
                  class sheets.
                </p>
              )}
              {art.kind === "native" && art.source.job !== art.artId && (
                <p className="artwork-note">
                  This skin differs from the current class sheet (
                  {CHARACTER_ART[art.artId]}).
                </p>
              )}
              <div className="actions">
                <button disabled={blocked} onClick={() => openActor(actor.id)}>
                  Edit sprite for {actor.id}
                </button>
                {art.kind !== "class" && (
                  <button
                    disabled={blocked}
                    onClick={() => apply(useClassArtwork(project, [actor.id]))}
                  >
                    Use class art for {actor.id}
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <details>
        <summary>Editable project sources</summary>
        <p>
          All editors below use this open project revision. Apply drafts before
          changing sources or playtesting.
        </p>
        <ul className="asset-assignments">
          <li>
            {project.tiles.length} terrain tiles and {project.placements.length}{" "}
            placements{" "}
            <button disabled={blocked} onClick={() => openEditor("map")}>
              Open battlefield
            </button>
          </li>
          <li>
            {rows.length} actors, {project.content?.enemyTemplates?.length ?? 0}{" "}
            reusable enemy templates{" "}
            <button disabled={blocked} onClick={() => openEditor("content")}>
              Open actors and dialogue
            </button>
          </li>
          <li>
            {Object.keys(project.rules?.jobs ?? jobs).length} classes,{" "}
            {project.rules
              ? Object.keys(project.rules.skills).length
              : "shipped"}{" "}
            abilities and {Object.keys(project.rules?.gear ?? equipment).length}{" "}
            gear records{" "}
            <button disabled={blocked} onClick={() => openEditor("rules")}>
              Open gameplay catalogs
            </button>
          </li>
          <li>
            Terrain palettes and top-face textures{" "}
            <button disabled={blocked} onClick={() => openEditor("terrain")}>
              Open terrain textures
            </button>
          </li>
          <li>
            Original score and movement/command feedback{" "}
            <button disabled={blocked} onClick={() => openEditor("game-audio")}>
              Open game audio
            </button>
          </li>
          <li>
            Layered combat sound cues{" "}
            <button disabled={blocked} onClick={() => openEditor("sounds")}>
              Open sound effects
            </button>
          </li>
          <li>
            Authored music pattern{" "}
            <button disabled={blocked} onClick={() => openEditor("music")}>
              Open music
            </button>
          </li>
        </ul>
        <p>
          Scenery geometry, new VFX bitmap atlases, sampled audio and full
          campaign packaging still require source-code work. They are not
          exposed as complete visual editors.
        </p>
      </details>
    </section>
  );
}
