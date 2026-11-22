import { ConnectivityMap } from "./ConnectivityOverlay";
import {
  activeConnectivityFinding,
  overlayCellIndex,
  type ConnectivityOverlay,
} from "./studio-connectivity";
import { ValidationPanel } from "./ValidationPanel";
import {
  analyzeProject,
  analyzeProjectText,
  type ProjectValidation,
  type ProjectFinding,
  type ValidationFocusRequest,
  type ValidationTarget,
} from "./studio-validation";
import { mapDimensions, adjacentCell, brushCells } from "./map-layout";
import { RulesEditor } from "./RulesEditor";
import { ContentEditor } from "./ContentEditor";
import { TerrainEditor } from "./TerrainEditor";
import { GameAudioEditor } from "./GameAudioEditor";
import { AudioScore } from "./audio";
import { encounters, type EncounterId } from "./encounters";
import {
  createExpedition,
  returnToCamp,
  contractOpen,
  type Expedition,
} from "./campaign";
import { gameContent } from "./studio-content";
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
import { MusicEditor } from "./MusicEditor";
import { NativeSpriteEditor } from "./NativeSpriteEditor";
import { PixelEditor } from "./PixelEditor";
import { renderMusic } from "./studio-music";
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
  NATIVE_PROJECT_LIMIT,
  type LevelProject,
  type ProjectHistory,
  type ProjectEdit,
} from "./studio-project";
import "./studio.css";

const defaultActors = compileLevelProject(createLevelProject()).units;
const terrains = ["grass", "stone", "water", "ice"] as const;
type Cell = { x: number; z: number };
function Board({
  tiles,
  placements,
  select,
  chosen,
  allowed,
  actorSources,
  focusRequest,
  connectivity,
}: {
  tiles: LevelProject["tiles"];
  placements: LevelProject["placements"];
  select: (x: number, z: number) => void;
  chosen: Cell;
  allowed?: Set<string>;
  actorSources?: { id: string; name: string; team: "ally" | "enemy" }[];
  focusRequest?: ValidationFocusRequest;
  connectivity?: ConnectivityOverlay;
}) {
  const actors = actorSources ?? defaultActors;
  const overlayIndex = useMemo(
    () => overlayCellIndex(connectivity),
    [connectivity],
  );
  const dimensions = {
    width: Math.max(...tiles.map((t) => t.x)) + 1,
    height: Math.max(...tiles.map((t) => t.z)) + 1,
  };
  const [tileSize, setTileSize] = useState(36),
    [jumpX, setJumpX] = useState("0"),
    [jumpZ, setJumpZ] = useState("0");
  const boardRef = useRef<HTMLDivElement>(null);
  function focusTile(x: number, z: number) {
    boardRef.current
      ?.querySelector<HTMLButtonElement>(`[data-cell="${x},${z}"]`)
      ?.focus();
  }

  useEffect(() => {
    if (focusRequest?.target.area === "map")
      focusTile(focusRequest.target.x, focusRequest.target.z);
  }, [focusRequest]);
  return (
    <div className="board-workspace">
      <div className="map-navigation">
        <label>
          Tile size
          <select
            value={tileSize}
            onChange={(e) => setTileSize(Number(e.target.value))}
          >
            <option value={24}>Small</option>
            <option value={36}>Medium</option>
            <option value={48}>Large</option>
          </select>
        </label>
        <label>
          Go to column
          <input
            type="number"
            min={0}
            max={dimensions.width - 1}
            value={jumpX}
            onChange={(e) => setJumpX(e.target.value)}
          />
        </label>
        <label>
          Go to row
          <input
            type="number"
            min={0}
            max={dimensions.height - 1}
            value={jumpZ}
            onChange={(e) => setJumpZ(e.target.value)}
          />
        </label>
        <button
          onClick={() =>
            focusTile(
              Math.max(0, Math.min(dimensions.width - 1, Number(jumpX) || 0)),
              Math.max(0, Math.min(dimensions.height - 1, Number(jumpZ) || 0)),
            )
          }
        >
          Find tile
        </button>
        <span>
          {dimensions.width} × {dimensions.height} · {tiles.length} tiles
        </span>
      </div>
      <div className="board-scroll" ref={boardRef}>
        <div
          className="tile-grid"
          style={{
            gridTemplateColumns: `repeat(${dimensions.width}, ${tileSize}px)`,
            width: dimensions.width * (tileSize + 3) - 3,
          }}
          aria-label="Battlefield tiles"
        >
          {[...tiles]
            .sort((a, b) => a.z - b.z || a.x - b.x)
            .map((t) => {
              const overlayInfo = overlayIndex.get(t.x + "," + t.z);
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
                    (unit ? ", " + unit.name : "") +
                    (overlayInfo?.description
                      ? ", " + overlayInfo.description
                      : "")
                  }
                  aria-pressed={chosen.x === t.x && chosen.z === t.z}
                  data-connectivity={overlayInfo?.role ?? undefined}
                  title={overlayInfo?.description || undefined}
                  data-cell={t.x + "," + t.z}
                  data-allowed={allowed?.has(t.x + "," + t.z)}
                  onKeyDown={(e) => {
                    const next = adjacentCell(t.x, t.z, e.key, dimensions);
                    if (!next) return;
                    e.preventDefault();
                    focusTile(next.x, next.z);
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
      </div>
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
  const lines = project.content?.dialogue[project.encounter ?? "shrine"] ?? [];
  const [briefing, setBriefing] = useState(0),
    [settled, setSettled] = useState<Expedition | null>(null);
  const briefingOpen = briefing < lines.length;
  const nativeScore = useRef<AudioScore | null>(null);
  useEffect(
    () => () => {
      nativeScore.current?.dispose();
    },
    [],
  );
  const [mode, setMode] = useState<Mode>("inspect"),
    [selected, setSelected] = useState<Cell>({ x: 2, z: 5 });
  const [notice, setNotice] = useState(
    "Choose Move or an ability, then select a tile.",
  );
  const [renderError, setRenderError] = useState("");
  const [sceneVersion, setSceneVersion] = useState(0);
  const [customAnimation, setCustomAnimation] = useState("idle"),
    [lastCustomAnimation, setLastCustomAnimation] = useState("none");
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
    if (!soundEnabled || (project.gameAudio?.enabled && !project.sounds))
      return;
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
    if (briefingOpen) return;
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
      if (soundEnabled)
        nativeScore.current?.feedback(
          current.mode === "move" ? "move" : "skill",
        );
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
        project.nativeSprite?.enabled &&
          project.nativeSprite.actorId === project.pixels?.actorId
          ? undefined
          : project.pixels,
        (state) => {
          setCustomAnimation(state);
          if (["walk", "attack", "cast"].includes(state))
            setLastCustomAnimation(state);
        },
        project.nativeSprite,
        project.materials,
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
  }, [project, sceneVersion]);
  useEffect(() => {
    view.current?.update(battle, mode, selected);
  }, [battle, mode, selected]);
  useEffect(() => {
    if (
      briefingOpen ||
      battle.result !== "playing" ||
      activeUnit(battle).team !== "enemy"
    )
      return;
    const timer = setTimeout(() => {
      setBattle((b) => aiTurn(b));
      setMode("inspect");
    }, 450);
    return () => clearTimeout(timer);
  }, [battle, briefingOpen]);
  const skillCatalog = battle.rules?.skills ?? skills;
  const active = activeUnit(battle),
    enabled =
      !briefingOpen && battle.result === "playing" && active.team === "ally";
  const allowed = new Set(
    battle.tiles
      .filter((t) =>
        mode === "move"
          ? reachable(battle, active).has(t.x + "," + t.z)
          : mode !== "inspect" &&
            canTarget(
              battle,
              active,
              (battle.rules?.skills ?? skills)[mode],
              t.x,
              t.z,
            ),
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
              nativeScore.current?.dispose();
              nativeScore.current = null;
              if (soundEnabled && project.gameAudio?.enabled) {
                nativeScore.current = new AudioScore(project.gameAudio);
                void nativeScore.current
                  .start()
                  .catch(() => setSoundNotice("Audio restart unavailable."));
              }
              soundPlayer.current?.stop();
              if (
                soundEnabled &&
                !project.gameAudio?.enabled &&
                project.music?.enabled
              )
                soundPlayer.current?.playLoop(renderMusic(project.music));
              setBriefing(0);
              setSettled(null);
              setBattle(compileLevelProject(project));
              setSceneVersion((v) => v + 1);
              setCustomAnimation("idle");
              setLastCustomAnimation("none");
              setMode("inspect");
              setNotice("Preview restarted from the source revision.");
            }}
          >
            Restart preview
          </button>
          <button onClick={close}>Return to editor</button>
        </div>
      </div>
      {briefingOpen && (
        <section className="briefing-panel" aria-label="Project dialogue">
          <p>
            Briefing {briefing + 1} / {lines.length} ·{" "}
            {project.content?.contracts[battle.encounter].name}
          </p>
          <h2>
            {lines[briefing].speaker === "narrator"
              ? "Narrator"
              : project.content?.actors.find(
                  (a) => a.id === lines[briefing].speaker,
                )?.name}
          </h2>
          <p>{lines[briefing].text}</p>
          <div className="actions">
            <button onClick={() => setBriefing((n) => n + 1)}>
              {briefing === lines.length - 1
                ? "Begin battle"
                : "Next dialogue line"}
            </button>
            <button onClick={() => setBriefing(lines.length)}>
              Skip briefing
            </button>
          </div>
        </section>
      )}
      <div className="preview-layout">
        <div>
          <div
            className="camera-tools"
            role="group"
            aria-label="Preview camera"
          >
            <button onClick={() => view.current?.fitMap()}>Fit map</button>
            <button onClick={() => view.current?.focusActor()}>
              Focus active actor
            </button>
            <button onClick={() => view.current?.rotate(-1)}>
              Rotate left
            </button>
            <button onClick={() => view.current?.rotate(1)}>
              Rotate right
            </button>
            <button onClick={() => view.current?.setZoom(0.25)}>Zoom in</button>
            <button onClick={() => view.current?.setZoom(-0.25)}>
              Zoom out
            </button>
          </div>
          <div className="scene-host" ref={host} />
          {renderError && <p role="status">{renderError}</p>}
          <details open={!!renderError}>
            <summary>Tactical tile controls · keyboard accessible</summary>
            <Board
              tiles={battle.tiles}
              actorSources={battle.units}
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
                nativeScore.current?.dispose();
                nativeScore.current = null;
                soundPlayer.current?.stop();
                setSoundEnabled(false);
                setSoundNotice("Preview sound is muted.");
                return;
              }
              try {
                soundPlayer.current ??= new StudioSfxPlayer();
                await soundPlayer.current.unlock();
                if (project.gameAudio?.enabled) {
                  nativeScore.current = new AudioScore(project.gameAudio);
                  await nativeScore.current.start();
                } else if (project.music?.enabled)
                  soundPlayer.current.playLoop(renderMusic(project.music));
                setSoundEnabled(true);
                setSoundNotice(
                  project.gameAudio?.enabled
                    ? "Preview uses the existing-game score and command tones."
                    : project.music?.enabled
                      ? "Preview sound enabled. Project music is looping."
                      : "Preview sound enabled. Waiting for a resolved combat event.",
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
          {project.gameAudio?.enabled && (
            <p>
              Game score: {project.gameAudio.stepMs} ms per note · source audio
            </p>
          )}
          {project.music && !project.gameAudio?.enabled && (
            <p>
              Project music: {project.music.tempo} BPM /{" "}
              {project.music.enabled ? "included" : "omitted"}
            </p>
          )}
          {project.pixels?.enabled &&
            !(
              project.nativeSprite?.enabled &&
              project.nativeSprite.actorId === project.pixels.actorId
            ) && (
              <p>
                Custom pixel clip: {project.pixels.actorId} /{" "}
                {project.pixels.frames.length} frames
              </p>
            )}
          {(project.pixels?.enabled || project.nativeSprite?.enabled) && (
            <p>
              Custom animation: {customAnimation} / Last active clip:{" "}
              {lastCustomAnimation}
            </p>
          )}
          {project.nativeSprite?.enabled && (
            <p>
              Native sprite: {project.nativeSprite.job} /{" "}
              {project.nativeSprite.actorId} / {project.nativeSprite.width} ×{" "}
              {project.nativeSprite.height} / 32 frames
            </p>
          )}
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
              disabled={!enabled || active.moved}
              aria-pressed={mode === "move"}
              onClick={() => setMode("move")}
            >
              Move
            </button>
            {availableSkills(active, battle.rules).map((id) => (
              <button
                key={id}
                disabled={
                  !enabled || active.acted || active.mp < skillCatalog[id].cost
                }
                aria-pressed={mode === id}
                onClick={() => setMode(id)}
              >
                {skillCatalog[id].name}{" "}
                <span>{skillCatalog[id].cost} energy</span>
              </button>
            ))}
            <button
              disabled={!enabled}
              onClick={() => {
                if (soundEnabled) nativeScore.current?.feedback("move");
                setBattle((b) => command(b, { type: "end" }));
                setMode("inspect");
              }}
            >
              End activation
            </button>
          </div>
          <p role="status">{notice}</p>
          {project.content && battle.result === "victory" && (
            <section aria-label="Preview progression settlement">
              <button
                disabled={!!settled}
                onClick={() =>
                  setSettled(
                    returnToCamp(
                      {
                        ...createExpedition(),
                        stage: "battle",
                        battle: structuredClone(battle),
                      },
                      project.content!.contracts,
                    ),
                  )
                }
              >
                Settle preview victory
              </button>
              {settled && (
                <>
                  <p>
                    Preview treasury: {settled.company.gold} gold ·{" "}
                    {settled.company.completed.join(", ")} cleared
                  </p>
                  <ul>
                    {Object.keys(project.content.contracts).map((id) => (
                      <li key={id}>
                        {project.content!.contracts[id as EncounterId].name}:{" "}
                        {contractOpen(
                          settled.company,
                          id as EncounterId,
                          project.content!.contracts,
                        )
                          ? "Open"
                          : "Locked"}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}
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
  const validation = useMemo(() => analyzeProject(project), [project]);
  const [focusRequest, setFocusRequest] = useState<ValidationFocusRequest>();
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    null,
  );
  const [overlayFocusSerial, setOverlayFocusSerial] = useState(0);
  const activeFinding = activeConnectivityFinding(
    validation.findings,
    selectedFindingId,
  );
  useEffect(() => {
    if (selectedFindingId && !activeFinding) setSelectedFindingId(null);
  }, [selectedFindingId, activeFinding]);
  const [rejectedReport, setRejectedReport] =
    useState<ProjectValidation | null>(null);
  const dimensions = mapDimensions(project);
  const [mapWidth, setMapWidth] = useState(String(dimensions.width)),
    [mapHeight, setMapHeight] = useState(String(dimensions.height)),
    [expansionTerrain, setExpansionTerrain] =
      useState<(typeof terrains)[number]>("grass"),
    [brush, setBrush] = useState<1 | 3 | 5>(1);
  useEffect(() => {
    setMapWidth(String(dimensions.width));
    setMapHeight(String(dimensions.height));
    setCell((c) => ({
      x: Math.min(c.x, dimensions.width - 1),
      z: Math.min(c.z, dimensions.height - 1),
    }));
  }, [dimensions.width, dimensions.height]);
  const [message, setMessage] = useState(opened.message),
    [error, setError] = useState("");
  const [saved, setSaved] = useState<number | null>(() =>
      opened.message === "Local checkpoint opened."
        ? opened.project.revision
        : null,
    ),
    token = useRef(opened.token);
  const [secured, setSecured] = useState(opened.project.revision);
  const [panel, setPanel] = useState<
      | "map"
      | "sounds"
      | "music"
      | "pixels"
      | "terrain"
      | "content"
      | "game-audio"
      | "rules"
    >("map"),
    [soundDraftDirty, setSoundDraftDirty] = useState(false);
  const [musicDraftDirty, setMusicDraftDirty] = useState(false);
  const [pixelDraftDirty, setPixelDraftDirty] = useState(false);
  const [nativeDraftDirty, setNativeDraftDirty] = useState(false);
  const [pixelMode, setPixelMode] = useState<"native" | "indexed">("native");
  const [contentDirty, setContentDirty] = useState(false),
    [terrainDirty, setTerrainDirty] = useState(false),
    [gameAudioDirty, setGameAudioDirty] = useState(false);
  const actors = useMemo(() => compileLevelProject(project).units, [project]);
  const [loadEncounter, setLoadEncounter] = useState<EncounterId>(
    project.encounter ?? "shrine",
  );
  const [rulesDirty, setRulesDirty] = useState(false);
  const hasDraft =
    rulesDirty ||
    contentDirty ||
    terrainDirty ||
    gameAudioDirty ||
    soundDraftDirty ||
    musicDraftDirty ||
    pixelDraftDirty ||
    nativeDraftDirty;
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
  const stagedValidation = useMemo(
    () => (staged ? analyzeProject(staged) : null),
    [staged],
  );
  const dirty = secured !== project.revision || hasDraft;
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
    const cells = brushCells(x, z, brush, dimensions);
    if (tool === "terrain")
      edit(cells.map((p) => ({ type: "tile", ...p, terrain })));
    if (tool === "height")
      edit(cells.map((p) => ({ type: "tile", ...p, h: height })));
    if (tool === "block") {
      const blocked = !project.tiles.find((t) => t.x === x && t.z === z)!
        .blocked;
      edit(cells.map((p) => ({ type: "tile", ...p, blocked })));
    }
    if (tool === "actor") edit([{ type: "place", id: actor, x, z }]);
  }
  function inspectOverlayCell(x: number, z: number) {
    if (hasDraft) return;
    setPanel("map");
    setTool("inspect");
    setCell({ x, z });
    setFocusRequest((previous) => ({
      serial: (previous?.serial ?? 0) + 1,
      target: { area: "map", x, z },
    }));
  }
  function inspectFinding(target: ValidationTarget, finding?: ProjectFinding) {
    if (hasDraft) return;
    setSelectedFindingId(finding?.mapOverlay ? finding.id : null);
    if (finding?.mapOverlay) {
      setOverlayFocusSerial((n) => n + 1);
      setFocusRequest(undefined);
      setPanel("map");
      setTool("inspect");
      if (target.area === "map") setCell({ x: target.x, z: target.z });
      return;
    }
    if (target.area === "map") {
      setPanel("map");
      setTool("inspect");
      setCell({ x: target.x, z: target.z });
    } else if (target.area === "content" || target.area === "rules")
      setPanel(target.area);
    else {
      const details = document.getElementById(
        "project-source",
      ) as HTMLDetailsElement | null;
      if (details) {
        details.open = true;
        details.querySelector("textarea")?.focus();
      }
    }
    setFocusRequest((previous) => ({
      serial: (previous?.serial ?? 0) + 1,
      target,
    }));
  }
  function stage(text: string) {
    attempt(() => {
      if (hasDraft)
        throw new Error(
          "Apply or discard source drafts before importing another project.",
        );
      const report = analyzeProjectText(text);
      if (report.errors) {
        setRejectedReport(report);
        throw new Error(
          "Import rejected. Review the import validation findings; your open project is unchanged.",
        );
      }
      setRejectedReport(null);
      setStaged(parseLevelProject(text));
    });
  }
  const tile =
    project.tiles.find((t) => t.x === cell.x && t.z === cell.z) ??
    project.tiles[0];
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
              {panel !== "map"
                ? toolsOpen
                  ? "Hide project controls"
                  : "Show project controls"
                : toolsOpen
                  ? "Hide battlefield tools"
                  : "Show battlefield tools"}
            </button>
            <div hidden={panel !== "map"}>
              <h2>Battlefield tools</h2>
              <p>
                {dimensions.width} × {dimensions.height} ·{" "}
                {project.encounter ?? "shrine"} source
              </p>
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
              {["terrain", "height", "block"].includes(tool) && (
                <label>
                  Brush size
                  <select
                    value={brush}
                    onChange={(e) =>
                      setBrush(Number(e.target.value) as 1 | 3 | 5)
                    }
                  >
                    {[1, 3, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} × {n}
                      </option>
                    ))}
                  </select>
                </label>
              )}
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
            <div
              hidden={
                !["terrain", "content", "game-audio", "rules"].includes(panel)
              }
            >
              <h2>Existing game sources</h2>
              <p>
                Four encounters, native terrain colors, actor rosters,
                briefings, reward gates and original score parameters.
              </p>
              <p>
                Apply source edits, then playtest the same project revision.
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
            <div hidden={panel !== "music"}>
              <h2>Music workspace</h2>
              <p>One bar / Sixteen sixteenth-note steps / One instrument</p>
              <p>
                Edit notes and tempo, audition the loop, then apply it to your
                project.
              </p>
            </div>
            <div hidden={panel !== "pixels"}>
              <h2>Pixel workspace</h2>
              <p>Native game sheets or 16 × 24 indexed source</p>
              <p>
                {pixelMode === "native"
                  ? "Edit original game artwork at native resolution, then playtest the character."
                  : "Paint source pixels, edit timing and pivot, then apply the clip to one actor."}
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
              Project edits feed isolated playtests. Load existing encounters,
              materials, characters, briefings, contract rewards and source
              audio. Override gear, abilities and jobs. Full campaign packaging,
              new rule mechanics and branching quests remain planned.
            </p>
          </aside>
          <main className="studio-sheet">
            <div className="section-heading">
              <div>
                <h1>
                  {panel === "map"
                    ? "Battlefield editor"
                    : panel === "rules"
                      ? "Gear, ability and job overrides"
                      : panel === "terrain"
                        ? "Terrain appearance editor"
                        : panel === "content"
                          ? "Game content editor"
                          : panel === "game-audio"
                            ? "Existing game audio"
                            : panel === "sounds"
                              ? "Sound effects editor"
                              : panel === "music"
                                ? "Music pattern editor"
                                : "Pixel animation editor"}
                </h1>
                <p>
                  {hasDraft
                    ? "Apply or discard source drafts before playtesting."
                    : panel === "rules"
                      ? "Override the shipped gear, abilities and job definitions."
                      : panel === "terrain"
                        ? "Edit existing terrain palettes and painted top surfaces."
                        : panel === "content"
                          ? "Edit current actors, briefings, contract gates and rewards."
                          : panel === "game-audio"
                            ? "Edit the existing game score and command feedback."
                            : panel === "sounds"
                              ? "Edit, audition and apply combat sounds."
                              : panel === "music"
                                ? "Compose a four-beat loop for your battlefield."
                                : panel === "pixels"
                                  ? "Paint source pixels, time frames and play your clip."
                                  : "Shape the battlefield and its sounds, then play your revision."}
                </p>
              </div>
              <button
                className="primary"
                disabled={hasDraft || !validation.canPlaytest}
                onClick={() =>
                  attempt(() => {
                    if (!validation.canPlaytest)
                      throw Error(
                        "Resolve project validation errors before playtesting.",
                      );
                    setPreview(structuredClone(project));
                  })
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
              {(
                [
                  ["rules", "Gear, abilities & jobs"],
                  ["terrain", "Terrain textures"],
                  ["content", "NPCs, dialogue & progression"],
                  ["game-audio", "Game audio"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={panel === id}
                  onClick={() => setPanel(id)}
                >
                  {label}
                </button>
              ))}
              <button
                aria-pressed={panel === "sounds"}
                onClick={() => setPanel("sounds")}
              >
                Sound effects
              </button>
              <button
                aria-pressed={panel === "music"}
                onClick={() => setPanel("music")}
              >
                Music
              </button>
              <button
                aria-pressed={panel === "pixels"}
                onClick={() => setPanel("pixels")}
              >
                Pixels
              </button>
            </div>
            <div className="editor-toolbar">
              <div className="actions">
                <button
                  disabled={!history.past.length || hasDraft}
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
                  disabled={!history.future.length || hasDraft}
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
            <ValidationPanel
              report={validation}
              onInspect={inspectFinding}
              disabled={hasDraft}
              pending={hasDraft}
            />
            {rejectedReport && (
              <ValidationPanel
                title="Import validation"
                report={rejectedReport}
                onDismiss={() => {
                  setRejectedReport(null);
                  setError("");
                }}
              />
            )}
            <div hidden={panel !== "rules"}>
              <RulesEditor
                source={project.rules}
                focusRequest={focusRequest}
                apply={(rules) => edit([{ type: "rules", rules }])}
                onDirty={setRulesDirty}
              />
            </div>
            <div hidden={panel !== "terrain"}>
              <TerrainEditor
                source={project.materials}
                apply={(materials) => edit([{ type: "materials", materials }])}
                onDirty={setTerrainDirty}
                active={panel === "terrain"}
              />
            </div>
            <div hidden={panel !== "content"}>
              <ContentEditor
                source={project.content}
                focusRequest={focusRequest}
                rules={project.rules}
                encounter={project.encounter ?? "shrine"}
                apply={(content) => edit([{ type: "content", content }])}
                onDirty={setContentDirty}
              />
            </div>
            <div hidden={panel !== "game-audio"}>
              <GameAudioEditor
                source={project.gameAudio}
                apply={(audio) => edit([{ type: "game-audio", audio }])}
                onDirty={setGameAudioDirty}
                active={panel === "game-audio"}
              />
            </div>
            <div hidden={panel !== "sounds"}>
              <SoundEditor
                active={panel === "sounds"}
                bank={bank}
                apply={(bank) => edit([{ type: "sounds", bank }])}
                onDirty={setSoundDraftDirty}
              />
            </div>
            <div hidden={panel !== "music"}>
              <MusicEditor
                pattern={project.music}
                apply={(pattern) => edit([{ type: "music", pattern }])}
                onDirty={setMusicDraftDirty}
                active={panel === "music"}
              />
            </div>
            <div hidden={panel !== "pixels"}>
              <div
                className="pixel-tools"
                role="group"
                aria-label="Sprite editor mode"
              >
                <button
                  aria-pressed={pixelMode === "native"}
                  onClick={() => setPixelMode("native")}
                >
                  Game sprites · native resolution
                </button>
                <button
                  aria-pressed={pixelMode === "indexed"}
                  onClick={() => setPixelMode("indexed")}
                >
                  Small indexed sprite
                </button>
              </div>
              <div hidden={pixelMode !== "native"}>
                <NativeSpriteEditor
                  source={project.nativeSprite}
                  apply={(sprite) => edit([{ type: "native-sprite", sprite }])}
                  onDirty={setNativeDraftDirty}
                  active={panel === "pixels" && pixelMode === "native"}
                />
              </div>
              <div hidden={pixelMode !== "indexed"}>
                <PixelEditor
                  clip={project.pixels}
                  apply={(clip) => edit([{ type: "pixels", clip }])}
                  onDirty={setPixelDraftDirty}
                  active={panel === "pixels" && pixelMode === "indexed"}
                />
              </div>
            </div>
            {panel === "map" && (
              <section className="encounter-source">
                <label>
                  Existing game encounter
                  <select
                    value={loadEncounter}
                    onChange={(e) =>
                      setLoadEncounter(e.target.value as EncounterId)
                    }
                  >
                    {Object.entries(encounters).map(([id, c]) => (
                      <option key={id} value={id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  disabled={hasDraft}
                  onClick={() =>
                    edit([{ type: "load-encounter", encounter: loadEncounter }])
                  }
                >
                  Load existing encounter
                </button>
                <p>
                  Loads actual tiles, heights and the encounter’s actor data.
                  Replaces this level source; art/audio and the contract catalog
                  stay in the project. Undo restores the previous level.
                </p>
              </section>
            )}
            <div className="map-layout" hidden={panel !== "map"}>
              <section className="map-well">
                <section className="map-dimensions" aria-label="Map dimensions">
                  <h2>Map dimensions</h2>
                  <div className="map-navigation">
                    <label>
                      Map width
                      <input
                        type="number"
                        min={9}
                        max={32}
                        value={mapWidth}
                        onChange={(e) => setMapWidth(e.target.value)}
                      />
                    </label>
                    <label>
                      Map height
                      <input
                        type="number"
                        min={9}
                        max={32}
                        value={mapHeight}
                        onChange={(e) => setMapHeight(e.target.value)}
                      />
                    </label>
                    <label>
                      New tile terrain
                      <select
                        value={expansionTerrain}
                        onChange={(e) =>
                          setExpansionTerrain(
                            e.target.value as typeof expansionTerrain,
                          )
                        }
                      >
                        {terrains.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      disabled={
                        hasDraft ||
                        (Number(mapWidth) === dimensions.width &&
                          Number(mapHeight) === dimensions.height)
                      }
                      onClick={() =>
                        edit([
                          {
                            type: "resize",
                            width: Number(mapWidth),
                            height: Number(mapHeight),
                            terrain: expansionTerrain,
                          },
                        ])
                      }
                    >
                      Resize map
                    </button>
                  </div>
                  <p>
                    9–32 tiles per side. Existing coordinates stay fixed at the
                    northwest corner. Added tiles start flat and open; shrinking
                    removes outer terrain. Move actors inside the new boundaries
                    first. Undo restores the full map.
                  </p>
                </section>
                {activeFinding && (
                  <ConnectivityMap
                    finding={activeFinding}
                    focusSerial={overlayFocusSerial}
                    disabled={hasDraft}
                    project={project}
                    onInspect={inspectOverlayCell}
                    onClear={() => {
                      setSelectedFindingId(null);
                      if (!hasDraft) inspectOverlayCell(cell.x, cell.z);
                    }}
                  />
                )}
                <Board
                  connectivity={activeFinding?.mapOverlay}
                  tiles={project.tiles}
                  actorSources={actors}
                  placements={project.placements}
                  select={choose}
                  chosen={cell}
                  focusRequest={focusRequest}
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
                    disabled={hasDraft}
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
                    disabled={hasDraft}
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
                        if (file.size > NATIVE_PROJECT_LIMIT) {
                          setError(
                            "Project exceeds the 8 MiB native import limit (512 KiB expanded maps / 128 KiB legacy maps).",
                          );
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
              <details id="project-source">
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
                    onClick={() =>
                      attempt(() =>
                        setSource(JSON.stringify(project, null, 2) + "\n"),
                      )
                    }
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
            {staged.tiles.length} tiles · {staged.placements.length} actors ·
            Seed {staged.seed}
          </p>
        )}
        {stagedValidation && (
          <ValidationPanel
            title="Imported project validation"
            report={stagedValidation}
          />
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
            disabled={!staged || !!stagedValidation?.errors}
            onClick={() => {
              if (!staged || stagedValidation?.errors) return;
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
