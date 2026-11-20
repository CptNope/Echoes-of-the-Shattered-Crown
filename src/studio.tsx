import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  activeUnit,
  availableSkills,
  command,
  aiTurn,
  reachable,
  canTarget,
  type Battle,
} from "./engine";
import { jobs, skills } from "./data";
import { Battlefield, type Mode } from "./scene";
import { SoundEditor } from "./SoundEditor";
import {
  defaultSoundBank,
  resolvedSoundEvents,
  StudioSfxPlayer,
} from "./studio-sfx";
import {
  createLevelProject,
  applyProjectEdits,
  travelProjectHistory,
  compileLevelProject,
  parseLevelProject,
  exportLevelProject,
  loadProjectCheckpoint,
  saveProjectCheckpoint,
  PROJECT_LIMIT,
  type LevelProject,
  type ProjectHistory,
  type ProjectEdit,
} from "./studio-project";
import "./studio.css";

const actors = compileLevelProject(createLevelProject()).units;
const terrains = ["grass", "stone", "water", "ice"] as const;
type Cell = { x: number; z: number };
function Board({
  tiles,
  placements,
  select,
  chosen,
  allowed,
}: {
  tiles: LevelProject["tiles"];
  placements: LevelProject["placements"];
  select: (x: number, z: number) => void;
  chosen: Cell;
  allowed?: Set<string>;
}) {
  return (
    <div className="tile-grid" aria-label="Battlefield tiles">
      {[...tiles]
        .sort((a, b) => a.z - b.z || a.x - b.x)
        .map((t) => {
          const actor = placements.find((p) => p.x === t.x && p.z === t.z);
          const unit = actors.find((u) => u.id === actor?.id);
          return (
            <button
              key={t.x + "," + t.z}
              className={
                "tile " +
                t.terrain +
                (t.blocked ? " blocked" : "") +
                (unit ? " " + unit.team : "")
              }
              aria-label={
                "Tile " +
                t.x +
                ", " +
                t.z +
                ", " +
                t.terrain +
                ", elevation " +
                t.h +
                (t.blocked ? ", blocked" : "") +
                (unit ? ", " + unit.name : "")
              }
              aria-pressed={chosen.x === t.x && chosen.z === t.z}
              data-allowed={allowed?.has(t.x + "," + t.z)}
              onKeyDown={(e) => {
                const step: Record<string, number> = {
                  ArrowLeft: -1,
                  ArrowRight: 1,
                  ArrowUp: -9,
                  ArrowDown: 9,
                };
                if (!(e.key in step)) return;
                e.preventDefault();
                const buttons =
                  e.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>(
                    "button",
                  );
                buttons[
                  Math.max(0, Math.min(80, t.z * 9 + t.x + step[e.key]))
                ]?.focus();
              }}
              onClick={() => select(t.x, t.z)}
            >
              <span>
                {unit
                  ? unit.name.split(" ")[0].slice(0, 3)
                  : t.blocked
                    ? "×"
                    : ""}
              </span>
              <small>{t.h}</small>
            </button>
          );
        })}
    </div>
  );
}
function Preview({
  project,
  close,
}: {
  project: LevelProject;
  close: () => void;
}) {
  const [battle, setBattle] = useState(() => compileLevelProject(project));
  const [mode, setMode] = useState<Mode>("inspect"),
    [selected, setSelected] = useState<Cell>({ x: 2, z: 5 });
  const [notice, setNotice] = useState(
    "Choose Move or an ability, then select a tile.",
  );
  const [renderError, setRenderError] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(false),
    [soundNotice, setSoundNotice] = useState("Preview sound is muted.");
  const soundPlayer = useRef<StudioSfxPlayer | null>(null),
    previousCue = useRef(battle.lastAction);
  useEffect(
    () => () => {
      soundPlayer.current?.dispose();
    },
    [],
  );
  useEffect(() => {
    const events = resolvedSoundEvents(previousCue.current, battle.lastAction);
    previousCue.current = battle.lastAction;
    if (!soundEnabled) return;
    for (const event of events) {
      const played = soundPlayer.current?.play(
        project.sounds ?? defaultSoundBank(),
        event,
      );
      setSoundNotice(
        played
          ? "Last sound: " + event + " · project revision " + project.revision
          : "Audio is suspended. Mute and enable sound again.",
      );
    }
  }, [battle.lastAction, soundEnabled, project]);
  const host = useRef<HTMLDivElement>(null),
    view = useRef<Battlefield | null>(null);
  const latest = useRef({ battle, mode });
  latest.current = { battle, mode };
  const select = (x: number, z: number) => {
    setSelected({ x, z });
    const current = latest.current;
    if (
      current.battle.result !== "playing" ||
      activeUnit(current.battle).team !== "ally" ||
      current.mode === "inspect"
    )
      return;
    const next = command(
      current.battle,
      current.mode === "move"
        ? { type: "move", x, z }
        : { type: "skill", skill: current.mode, x, z },
    );
    if (next === current.battle)
      setNotice(
        "That action is not legal. Select a highlighted tile or another action.",
      );
    else {
      setBattle(next);
      setMode("inspect");
      setNotice(next.log.at(-1)!);
    }
  };
  const click = useRef(select);
  click.current = select;
  useEffect(() => {
    try {
      const scene = new Battlefield(
        host.current!,
        compileLevelProject(project),
        (x, z) => click.current(x, z),
        () => {},
      );
      scene.renderer.domElement.setAttribute(
        "aria-label",
        "Isometric playtest. Use the tactical tile controls below for keyboard play.",
      );
      scene.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      view.current = scene;
      return () => {
        scene.dispose();
        view.current = null;
      };
    } catch {
      setRenderError(
        "3D preview is unavailable. Use the tactical tile controls below to play.",
      );
    }
  }, [project]);
  useEffect(() => {
    view.current?.update(battle, mode, selected);
  }, [battle, mode, selected]);
  useEffect(() => {
    if (battle.result !== "playing" || activeUnit(battle).team !== "enemy")
      return;
    const timer = setTimeout(() => {
      setBattle((b) => aiTurn(b));
      setMode("inspect");
    }, 450);
    return () => clearTimeout(timer);
  }, [battle]);
  const active = activeUnit(battle),
    enabled = battle.result === "playing" && active.team === "ally";
  const allowed = new Set(
    battle.tiles
      .filter((t) =>
        mode === "move"
          ? reachable(battle, active).has(t.x + "," + t.z)
          : mode !== "inspect" &&
            canTarget(battle, active, skills[mode], t.x, t.z),
      )
      .map((t) => t.x + "," + t.z),
  );
  return (
    <section className="preview">
      <div className="section-heading">
        <div>
          <h1>Playtest · {project.name}</h1>
          <p>
            Revision {project.revision} · Seed {project.seed} · Isolated battle,
            no company rewards
          </p>
        </div>
        <div className="actions">
          <button
            onClick={() => {
              soundPlayer.current?.stop();
              setBattle(compileLevelProject(project));
              setMode("inspect");
              setNotice("Preview restarted from the source revision.");
            }}
          >
            Restart preview
          </button>
          <button onClick={close}>Return to editor</button>
        </div>
      </div>
      <div className="preview-layout">
        <div>
          <div className="scene-host" ref={host} />
          {renderError && <p role="status">{renderError}</p>}
          <details open={!!renderError}>
            <summary>Tactical tile controls · keyboard accessible</summary>
            <Board
              tiles={battle.tiles}
              placements={battle.units.filter((u) => u.hp > 0)}
              select={select}
              chosen={selected}
              allowed={allowed}
            />
          </details>
        </div>
        <aside className="play-controls">
          <button
            aria-pressed={soundEnabled}
            onClick={async () => {
              if (soundEnabled) {
                soundPlayer.current?.stop();
                setSoundEnabled(false);
                setSoundNotice("Preview sound is muted.");
                return;
              }
              try {
                soundPlayer.current ??= new StudioSfxPlayer();
                await soundPlayer.current.unlock();
                setSoundEnabled(true);
                setSoundNotice(
                  "Preview sound enabled. Waiting for a resolved combat event.",
                );
              } catch (e) {
                setSoundNotice(
                  e instanceof Error ? e.message : "Audio unavailable.",
                );
              }
            }}
          >
            {soundEnabled ? "Mute preview sound" : "Enable preview sound"}
          </button>
          <p role="status">{soundNotice}</p>
          <h2>
            {battle.result === "playing"
              ? active.name
              : battle.result === "victory"
                ? "Victory"
                : "Defeat"}
          </h2>
          <p>
            Turn {battle.turn} ·{" "}
            {battle.result === "playing"
              ? active.team === "enemy"
                ? "Enemy is acting…"
                : "Your activation"
              : "Restart to try the same source again."}
          </p>
          <p>
            {active.hp}/{active.maxHp} HP · {active.mp} energy
          </p>
          <div className="ability-list">
            <button
              disabled={!enabled}
              aria-pressed={mode === "move"}
              onClick={() => setMode("move")}
            >
              Move
            </button>
            {availableSkills(active).map((id) => (
              <button
                key={id}
                disabled={
                  !enabled || active.acted || active.mp < skills[id].cost
                }
                aria-pressed={mode === id}
                onClick={() => setMode(id)}
              >
                {skills[id].name} <span>{skills[id].cost} energy</span>
              </button>
            ))}
            <button
              disabled={!enabled}
              onClick={() => {
                setBattle((b) => command(b, { type: "end" }));
                setMode("inspect");
              }}
            >
              End activation
            </button>
          </div>
          <p role="status">{notice}</p>
          <h2>Battle log</h2>
          <ol className="battle-log">
            {battle.log.slice(-6).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  );
}
function initial() {
  try {
    const value = loadProjectCheckpoint(localStorage);
    return { ...value, project: value.project ?? createLevelProject() };
  } catch {
    return {
      project: createLevelProject(),
      token: null,
      message:
        "Local storage unavailable. Export project files to keep your work.",
    };
  }
}
function Studio() {
  const [opened] = useState(initial);
  const [history, setHistory] = useState<ProjectHistory>({
    project: opened.project,
    past: [],
    future: [],
  });
  const project = history.project;
  const [message, setMessage] = useState(opened.message),
    [error, setError] = useState("");
  const [saved, setSaved] = useState<number | null>(() =>
      opened.token === exportLevelProject(opened.project)
        ? opened.project.revision
        : null,
    ),
    token = useRef(opened.token);
  const [secured, setSecured] = useState(opened.project.revision);
  const [panel, setPanel] = useState<"map" | "sounds">("map"),
    [soundDraftDirty, setSoundDraftDirty] = useState(false);
  const bank = useMemo(
    () => project.sounds ?? defaultSoundBank(),
    [project.sounds],
  );
  const [toolsOpen, setToolsOpen] = useState(false);
  const [cell, setCell] = useState<Cell>({ x: 3, z: 4 }),
    [tool, setTool] = useState("inspect");
  const [terrain, setTerrain] = useState<(typeof terrains)[number]>("grass"),
    [height, setHeight] = useState(0);
  const [actor, setActor] = useState("sera"),
    [preview, setPreview] = useState<LevelProject | null>(null);
  const [name, setName] = useState(project.name),
    [seed, setSeed] = useState(String(project.seed));
  const [source, setSource] = useState(""),
    [staged, setStaged] = useState<LevelProject | null>(null);
  const importDialog = useRef<HTMLDialogElement>(null);
  const dirty = secured !== project.revision || soundDraftDirty;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [preview]);
  useEffect(() => {
    setName(project.name);
    setSeed(String(project.seed));
  }, [project.name, project.seed]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (staged) importDialog.current?.showModal();
  }, [staged]);
  function attempt(fn: () => void) {
    try {
      fn();
      setError("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed.");
      return false;
    }
  }
  function edit(edits: ProjectEdit[]) {
    return attempt(() => {
      const next = applyProjectEdits(history, edits);
      setHistory(next);
      setMessage(
        "Revision " +
          next.project.revision +
          " · edit applied. Save locally or export to keep it.",
      );
    });
  }
  function choose(x: number, z: number) {
    setCell({ x, z });
    if (tool === "terrain") edit([{ type: "tile", x, z, terrain }]);
    if (tool === "height") edit([{ type: "tile", x, z, h: height }]);
    if (tool === "block")
      edit([
        {
          type: "tile",
          x,
          z,
          blocked: !project.tiles.find((t) => t.x === x && t.z === z)!.blocked,
        },
      ]);
    if (tool === "actor") edit([{ type: "place", id: actor, x, z }]);
  }
  function stage(text: string) {
    attempt(() => {
      if (soundDraftDirty)
        throw new Error(
          "Apply or discard sound edits before importing another project.",
        );
      setStaged(parseLevelProject(text));
    });
  }
  const tile = project.tiles.find((t) => t.x === cell.x && t.z === cell.z)!;
  const placed = project.placements.find(
    (p) => p.x === cell.x && p.z === cell.z,
  );
  return (
    <>
      <header className="studio-header">
        <a className="studio-brand" href="./">
          <svg
            viewBox="0 0 32 32"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="m4 10 6 6 6-11 6 11 6-6-3 15H7zM7 28h18M17 4l-4 13 6 2-4 10" />
          </svg>
          <span>
            Echoes <small>Level studio</small>
          </span>
        </a>
        <span className="project-identity">
          {project.name} · r{project.revision}
        </span>
        <a href="./">Back to game</a>
      </header>
      {preview ? (
        <main className="studio-sheet">
          <Preview project={preview} close={() => setPreview(null)} />
        </main>
      ) : (
        <div className="studio-shell">
          <aside className={"tool-panel" + (toolsOpen ? " tools-open" : "")}>
            <button
              className="palette-toggle"
              aria-expanded={toolsOpen}
              onClick={() => setToolsOpen(!toolsOpen)}
            >
              {toolsOpen ? "Hide battlefield tools" : "Show battlefield tools"}
            </button>
            <div hidden={panel !== "map"}>
              <h2>Battlefield tools</h2>
              <p>9 × 9 · shrine template</p>
              <div className="tool-list">
                {[
                  ["inspect", "Inspect tile"],
                  ["terrain", "Paint terrain"],
                  ["height", "Set elevation"],
                  ["block", "Toggle collision"],
                  ["actor", "Place actor"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    aria-pressed={tool === id}
                    onClick={() => setTool(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {tool === "terrain" && (
                <label>
                  Terrain
                  <select
                    value={terrain}
                    onChange={(e) =>
                      setTerrain(e.target.value as typeof terrain)
                    }
                  >
                    {terrains.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
              )}
              {tool === "height" && (
                <label>
                  Elevation
                  <select
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                  >
                    {[0, 1, 2].map((h) => (
                      <option key={h} value={h}>
                        {h} step{h === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {tool === "actor" && (
                <label>
                  Actor
                  <select
                    value={actor}
                    onChange={(e) => setActor(e.target.value)}
                  >
                    {actors.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p className="tool-help">
                {tool === "inspect"
                  ? "Select a tile to inspect its source."
                  : "Select a tile to apply this tool. Each click is one undoable edit."}
              </p>
            </div>
            <div hidden={panel !== "sounds"}>
              <h2>Sound workspace</h2>
              <p>Four combat bindings · Up to four layers per cue</p>
              <p>
                Audition the draft, apply it to your project, then enable sound
                in the playtest.
              </p>
              <p>
                Source layers stay editable in project JSON. WAV export creates
                a rendered sound.
              </p>
            </div>
            <details className="project-details">
              <summary>Project details</summary>
              <label>
                Name
                <input
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                Battle seed
                <input
                  type="number"
                  min="0"
                  max="4294967295"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                />
              </label>
              <button
                onClick={() =>
                  edit([
                    {
                      type: "metadata",
                      name,
                      seed: seed.trim() ? Number(seed) : NaN,
                    },
                  ])
                }
              >
                Apply project details
              </button>
            </details>
            <p className="scope-note">
              Pilot: fixed board, roster and combat rules. Layered combat SFX
              are editable. Pixel, music and full-game packaging tools remain
              planned.
            </p>
          </aside>
          <main className="studio-sheet">
            <div className="section-heading">
              <div>
                <h1>
                  {panel === "map"
                    ? "Battlefield editor"
                    : "Sound effects editor"}
                </h1>
                <p>
                  {soundDraftDirty
                    ? "Apply or discard sound edits before playtesting."
                    : "Shape the battlefield and its sounds, then play your revision."}
                </p>
              </div>
              <button
                className="primary"
                disabled={soundDraftDirty}
                onClick={() =>
                  attempt(() => setPreview(structuredClone(project)))
                }
              >
                Playtest revision {project.revision}
              </button>
            </div>
            <div className="editor-tabs" aria-label="Studio editors">
              <button
                aria-pressed={panel === "map"}
                onClick={() => setPanel("map")}
              >
                Battlefield
              </button>
              <button
                aria-pressed={panel === "sounds"}
                onClick={() => setPanel("sounds")}
              >
                Sound effects
              </button>
            </div>
            <div className="editor-toolbar">
              <div className="actions">
                <button
                  disabled={!history.past.length}
                  onClick={() =>
                    attempt(() => {
                      setHistory(travelProjectHistory(history, "undo"));
                      setMessage("Undo applied as a new revision.");
                    })
                  }
                >
                  Undo
                </button>
                <button
                  disabled={!history.future.length}
                  onClick={() =>
                    attempt(() => {
                      setHistory(travelProjectHistory(history, "redo"));
                      setMessage("Redo applied as a new revision.");
                    })
                  }
                >
                  Redo
                </button>
              </div>
              <span>
                {project.tiles.filter((t) => t.blocked).length} blocked ·{" "}
                {project.placements.length} actors ·{" "}
                {saved === project.revision
                  ? "Saved locally"
                  : "Unsaved revision"}
              </span>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div hidden={panel !== "sounds"}>
              <SoundEditor
                active={panel === "sounds"}
                bank={bank}
                apply={(bank) => edit([{ type: "sounds", bank }])}
                onDirty={setSoundDraftDirty}
              />
            </div>
            <div className="map-layout" hidden={panel !== "map"}>
              <section className="map-well">
                <Board
                  tiles={project.tiles}
                  placements={project.placements}
                  select={choose}
                  chosen={cell}
                />
                <p className="map-caption">
                  North ↑ · Coordinates start at 0 · Tile numbers show elevation
                </p>
              </section>
              <aside className="inspector">
                <h2>
                  Tile {cell.x}, {cell.z}
                </h2>
                <dl>
                  <div>
                    <dt>Terrain</dt>
                    <dd>{tile.terrain}</dd>
                  </div>
                  <div>
                    <dt>Elevation</dt>
                    <dd>{tile.h} steps</dd>
                  </div>
                  <div>
                    <dt>Collision</dt>
                    <dd>{tile.blocked ? "Blocked" : "Open"}</dd>
                  </div>
                  <div>
                    <dt>Actor</dt>
                    <dd>
                      {actors.find((u) => u.id === placed?.id)?.name ?? "—"}
                    </dd>
                  </div>
                </dl>
                <h2>Reading the map</h2>
                <p>
                  Green: grass · Grey: stone
                  <br />
                  Blue: water · Pale blue: ice
                </p>
                <p>
                  × blocks movement. Water is impassable until frozen. Movement
                  can climb one elevation step.
                </p>
                <p>
                  All eight actors need separate, unblocked land or ice tiles.
                </p>
                <a href="animation-review.html">Open animation workbench ↗</a>
              </aside>
            </div>
            <section className="project-files">
              <div className="section-heading">
                <h2>Project files</h2>
                <div className="actions">
                  <button
                    disabled={soundDraftDirty}
                    onClick={() =>
                      attempt(() => {
                        token.current = saveProjectCheckpoint(
                          localStorage,
                          project,
                          token.current,
                        );
                        setSaved(project.revision);
                        setSecured(project.revision);
                        setMessage(
                          "Revision " + project.revision + " saved locally.",
                        );
                      })
                    }
                  >
                    Save locally
                  </button>
                  <button
                    disabled={soundDraftDirty}
                    onClick={() =>
                      attempt(() => {
                        const text = exportLevelProject(project);
                        setSource(text);
                        setSecured(project.revision);
                        const url = URL.createObjectURL(
                            new Blob([text], { type: "application/json" }),
                          ),
                          a = document.createElement("a");
                        a.href = url;
                        a.download = "echoes-level-project.json";
                        a.click();
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                        setMessage(
                          "Level project exported. It can be reopened in this studio.",
                        );
                      })
                    }
                  >
                    Export project
                  </button>
                  <label className="file-button">
                    Import project
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        if (file.size > PROJECT_LIMIT) {
                          setError("Project exceeds the 128 KiB import limit.");
                          return;
                        }
                        void file
                          .text()
                          .then(stage)
                          .catch(() => setError("Could not read that file."));
                      }}
                    />
                  </label>
                </div>
              </div>
              <p role="status">{message}</p>
              <details>
                <summary>Inspect or paste project JSON</summary>
                <label>
                  Level project JSON
                  <textarea
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    spellCheck={false}
                  />
                </label>
                <div className="actions">
                  <button
                    onClick={() => setSource(exportLevelProject(project))}
                  >
                    Show current source
                  </button>
                  <button onClick={() => stage(source)}>
                    Validate pasted JSON
                  </button>
                </div>
              </details>
            </section>
          </main>
        </div>
      )}
      <dialog ref={importDialog} onCancel={() => setStaged(null)}>
        <h2>Open imported project?</h2>
        {staged && (
          <p>
            {staged.name} · Revision {staged.revision}
            <br />
            81 tiles · 8 actors · Seed {staged.seed}
          </p>
        )}
        <p>
          This replaces the open project and clears undo history. Export unsaved
          work before continuing.
        </p>
        <div className="actions">
          <button
            onClick={() => {
              importDialog.current?.close();
              setStaged(null);
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!staged) return;
              setHistory({ project: staged, past: [], future: [] });
              setSaved(null);
              setMessage(
                "Imported project opened. Local checkpoint is unchanged until you save.",
              );
              importDialog.current?.close();
              setStaged(null);
            }}
          >
            Open project
          </button>
        </div>
      </dialog>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Studio />);
