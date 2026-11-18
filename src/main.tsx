import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  jobs,
  skills,
  jobLevel,
  unlocked,
  type JobId,
  type SkillId,
} from "./data";
import {
  unitStats,
  activeUnit,
  living,
  reachable,
  key,
  tileAt,
  command,
  aiTurn,
  preview,
  canTarget,
  availableSkills,
  changeJob,
  distance,
  type Battle,
  type Unit,
} from "./engine";
import { Battlefield, type Mode } from "./scene";
import { saveGame, loadGame } from "./storage";
import { Camp } from "./Camp";
import { Portrait } from "./Portrait";
import { supports } from "./supports";
import { createExpedition, returnToCamp, retryContract } from "./campaign";
import { encounters } from "./encounters";
import { AudioScore } from "./audio";
import "./style.css";
const Mark = () => (
  <svg
    width="31"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="m4 10 6 6 6-11 6 11 6-6-3 15H7L4 10Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="m17 4-4 13 6 2-4 10M7 28h18"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);
const Glyph = ({ kind }: { kind: "settings" | "sound" | "magic" }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    {kind === "settings" ? (
      <>
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2" />
      </>
    ) : kind === "sound" ? (
      <>
        <path d="M4 9h4l5-4v14l-5-4H4zM17 8q5 4 0 8" />
      </>
    ) : (
      <>
        <path d="m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3z" />
        <path d="M18 3v4M16 5h4" />
      </>
    )}
  </svg>
);
function App() {
  const [game, setGame] = useState(createExpedition);
  const battle = game.battle;
  const mission = encounters[battle.encounter];
  const boss =
    battle.encounter === "bellkeeper"
      ? battle.units.find((u) => u.id === "sentinel")
      : undefined;
  const [sceneRevision, setSceneRevision] = useState(0);
  const setBattle = (update: React.SetStateAction<Battle>) =>
    setGame((g) => ({
      ...g,
      battle: typeof update === "function" ? update(g.battle) : update,
    }));
  const [mode, setMode] = useState<Mode>("inspect");
  const [selected, setSelected] = useState<{ x: number; z: number } | null>(
    null,
  );
  const [hover, setHover] = useState({ x: 2, z: 5 });
  const [modal, setModal] = useState<
    "company" | "journal" | "settings" | "help" | "restart" | null
  >(null);
  const [member, setMember] = useState("sera");
  const [notice, setNotice] = useState("");
  const [sound, setSound] = useState(false);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [fast, setFast] = useState(false);
  const [uiScale, setUiScale] = useState(100);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [game.stage]);
  const host = useRef<HTMLDivElement>(null),
    view = useRef<Battlefield | null>(null),
    score = useRef<AudioScore | null>(null),
    latest = useRef({ battle, mode, modal, stage: game.stage });
  latest.current = { battle, mode, modal, stage: game.stage };
  const selectRef = useRef<(x: number, z: number) => void>(() => {});
  const actor = activeUnit(battle),
    isPlayer =
      game.stage === "battle" &&
      actor.team === "ally" &&
      battle.result === "playing",
    target = selected
      ? battle.units.find((u) => u.x === selected.x && u.z === selected.z)
      : undefined;
  const inspected = target ?? actor;
  const chosen = mode !== "inspect" && mode !== "move" ? skills[mode] : null;
  const send = (c: Parameters<typeof command>[1]) => {
    if (!isPlayer || modal) return;
    const next = command(battle, c);
    if (next === battle) {
      setNotice(
        "That action is unavailable. Check range, energy, and terrain.",
      );
      return;
    }
    setBattle(next);
    setSelected(null);
    setMode("inspect");
    score.current?.tone(c.type === "skill" ? 440 : 280, 0.15, "triangle", 0.5);
  };
  selectRef.current = (x, z) => {
    setSelected({ x, z });
    setHover({ x, z });
  };
  useEffect(() => {
    if (game.stage !== "battle" || !host.current) return;
    score.current = new AudioScore();
    try {
      view.current = new Battlefield(
        host.current!,
        latest.current.battle,
        (x, z) => selectRef.current(x, z),
        (x, z) => setHover({ x, z }),
      );
    } catch (e) {
      setNotice(
        `The 3D battlefield could not start: ${e instanceof Error ? e.message : "WebGL unavailable"}. Try a browser with WebGL enabled.`,
      );
    }
    return () => {
      view.current?.dispose();
      score.current?.dispose();
      view.current = null;
      score.current = null;
      setSound(false);
    };
  }, [game.stage, game.company.deployments, battle.encounter, sceneRevision]);
  useEffect(() => {
    view.current?.update(battle, mode, selected);
  }, [battle, mode, selected]);
  useEffect(() => {
    if (view.current) view.current.reduced = reduced;
  }, [reduced]);
  useEffect(() => {
    if (
      game.stage !== "battle" ||
      battle.result !== "playing" ||
      actor.team !== "enemy" ||
      modal
    )
      return;
    const timer = setTimeout(
      () => {
        setBattle((b) => aiTurn(b));
        setMode("inspect");
        setSelected(null);
      },
      fast ? 250 : 1000,
    );
    return () => clearTimeout(timer);
  }, [battle, modal, fast, game.stage]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (game.stage !== "battle") return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (modal) {
        if (e.key === "Escape") setModal(null);
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "q") view.current?.rotate(-1);
      if (k === "e") view.current?.rotate(1);
      if (k === "+" || k === "=") view.current?.setZoom(0.1);
      if (k === "-") view.current?.setZoom(-0.1);
      if (k === "m" && isPlayer && !actor.moved) {
        setMode("move");
        setSelected(null);
      }
      if (k === "1" && isPlayer) {
        setMode("strike");
        setSelected(null);
      }
      if (k === "escape") {
        setMode("inspect");
        setSelected(null);
      }
      if (k === " " && isPlayer) {
        e.preventDefault();
        send({ type: "end" });
      }
      const d: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      if (d[e.key]) {
        e.preventDefault();
        const [dx, dz] = d[e.key];
        setHover((p) => {
          const v = {
            x: Math.max(0, Math.min(8, p.x + dx)),
            z: Math.max(0, Math.min(8, p.z + dz)),
          };
          setSelected(v);
          return v;
        });
      }
      if (k === "enter" && selected) {
        e.preventDefault();
        confirmAction();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  useEffect(() => {
    let raf = 0,
      last = 0;
    const loop = (time: number) => {
      const g = navigator.getGamepads?.()[0];
      if (
        g &&
        time - last > 210 &&
        !latest.current.modal &&
        latest.current.stage === "battle"
      ) {
        if (g.buttons[4]?.pressed) view.current?.rotate(-1);
        if (g.buttons[5]?.pressed) view.current?.rotate(1);
        const dx =
          Math.abs(g.axes[0]) > 0.5
            ? Math.sign(g.axes[0])
            : g.buttons[15]?.pressed
              ? 1
              : g.buttons[14]?.pressed
                ? -1
                : 0;
        const dz =
          Math.abs(g.axes[1]) > 0.5
            ? Math.sign(g.axes[1])
            : g.buttons[13]?.pressed
              ? 1
              : g.buttons[12]?.pressed
                ? -1
                : 0;
        if (dx || dz)
          setHover((p) => {
            const v = {
              x: Math.max(0, Math.min(8, p.x + dx)),
              z: Math.max(0, Math.min(8, p.z + dz)),
            };
            setSelected(v);
            return v;
          });
        if (g.buttons[0]?.pressed)
          document.getElementById("confirm-action")?.click();
        if (g.buttons[1]?.pressed) {
          setMode("inspect");
          setSelected(null);
        }
        if (g.buttons[2]?.pressed)
          document.getElementById("move-command")?.click();
        if (g.buttons[3]?.pressed) document.getElementById("end-turn")?.click();
        last = time;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const trap = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setModal(null);
      }
      if (e.key !== "Tab" || !dialog) return;
      const focusable = [
        ...dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input, select, a[href]",
        ),
      ];
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [modal]);
  function confirmAction() {
    if (!selected || !isPlayer) return;
    if (mode === "move") send({ type: "move", ...selected });
    else if (chosen) send({ type: "skill", skill: chosen.id, ...selected });
  }
  function choose(m: Mode) {
    setMode(m);
    setSelected(null);
    setNotice(
      m === "move"
        ? "Choose a highlighted tile, then confirm movement."
        : m === "inspect"
          ? "Select a unit to inspect it."
          : skills[m].description,
    );
  }
  const canConfirm =
    !!selected &&
    isPlayer &&
    (mode === "move"
      ? !actor.moved &&
        reachable(battle, actor).has(key(selected.x, selected.z)) &&
        distance(actor, selected) > 0
      : chosen
        ? canTarget(battle, actor, chosen, selected.x, selected.z)
        : false);
  const tile = tileAt(battle, hover.x, hover.z)!;
  const timeline = living(battle).sort(
    (a, b) => a.next - b.next || a.id.localeCompare(b.id),
  );
  const company = battle.units.filter((u) => u.team === "ally");
  const m = battle.units.find((u) => u.id === member)!;
  async function persist(load = false) {
    setBusy(true);
    try {
      if (load) {
        const v = await loadGame();
        setGame(v.game);
        setSceneRevision((n) => n + 1);
        setMode("inspect");
        setSelected(null);
        setNotice(
          v.recovered
            ? "Recovered the previous valid save."
            : v.migrated
              ? "Legacy battle migrated. Your company and battle are ready."
              : "Company and contract restored.",
        );
      } else {
        await saveGame(game);
        setNotice(
          "Company and contract saved on this device. The previous save is kept as a backup.",
        );
      }
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "Storage is unavailable in this browser.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (game.stage === "camp")
    return (
      <Camp
        game={game}
        setGame={setGame}
        onSave={() => void persist()}
        onLoad={() => void persist(true)}
        busy={busy}
        notice={notice}
        dismiss={() => setNotice("")}
      />
    );
  return (
    <div
      className="app"
      style={{ "--ui-scale": uiScale / 100 } as React.CSSProperties}
    >
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setModal("journal");
          }}
        >
          <Mark />
          <span>
            Echoes<span className="brand-sub">of the Shattered Crown</span>
          </span>
        </a>
        <nav aria-label="Game menus">
          <button
            className={!modal ? "nav-active" : ""}
            onClick={() => setModal(null)}
          >
            Battle
          </button>
          <button onClick={() => setModal("company")}>Company</button>
          <button onClick={() => setModal("journal")}>Chronicle</button>
        </nav>
        <div className="header-actions">
          <button
            className="sound"
            title="Toggle original procedural music"
            aria-label={sound ? "Sound on" : "Sound off"}
            aria-pressed={sound}
            onClick={async () => {
              try {
                if (sound) score.current?.stop();
                else await score.current?.start();
                setSound(!sound);
              } catch {
                setNotice(
                  "Audio could not start. Try again after interacting with the page.",
                );
              }
            }}
          >
            <Glyph kind="sound" />
            <span>{sound ? "Sound on" : "Sound off"}</span>
          </button>
          <button
            onClick={() => setModal("settings")}
            title="Settings"
            aria-label="Settings"
          >
            <Glyph kind="settings" />
          </button>
          <button onClick={() => setModal("help")} aria-label="How to play">
            ?
          </button>
        </div>
      </header>
      <main className="game-layout">
        <aside className="command-rail">
          <div className="chapter">{mission.subtitle}</div>
          <h1>{mission.name}</h1>
          <p className="mission-copy">
            {boss ? (
              "The last bell has no voice. Its keeper still answers."
            ) : (
              <>
                A forgotten oath.
                <br />A fragment that still remembers.
              </>
            )}
          </p>
          {boss && (
            <section className="boss-brief" aria-label="Bellkeeper encounter">
              <div>
                <b>Orren, Bellkeeper</b>
                <span>
                  {boss.hp} / {boss.maxHp} HP
                </span>
              </div>
              <progress
                aria-label="Orren health"
                value={boss.hp}
                max={boss.maxHp}
              />
              <strong>
                {boss.hp === 0
                  ? "The last oath is broken"
                  : battle.bossAwakened
                    ? "Oathbroken · +2 speed"
                    : "Oathbound · awakens at 50% HP"}
              </strong>
              <p>
                {battle.bossAwakened
                  ? "His awakening has restored energy and advanced his next action. Keep the company together."
                  : "At half health: cleanses burn and slow, restores energy, braces, and advances 25 ticks."}
              </p>
            </section>
          )}
          <div className="objective">
            <span className="objective-mark">◇</span>
            <div>
              <b>{mission.objective}</b>
              <span>
                Defeat all Oathless ·{" "}
                {
                  battle.units.filter((u) => u.team === "enemy" && u.hp <= 0)
                    .length
                }{" "}
                / 4
              </span>
            </div>
          </div>
          <div className="rail-divider" />
          <div className="turn-label">
            <span className={isPlayer ? "status-dot" : "status-dot enemy"} />
            {battle.result !== "playing"
              ? "Battle resolved"
              : isPlayer
                ? "Your turn"
                : "Enemy turn"}
            <span>Turn {battle.turn}</span>
          </div>
          <div className="active-character">
            <div className="portrait-well">
              <Portrait u={actor} size={66} />
            </div>
            <div>
              <h2>{actor.name}</h2>
              <span>
                {jobs[actor.job].name} · Lv.{" "}
                {jobLevel(actor.jp[actor.job] ?? 0)}
              </span>
              {actor.supportSlots && (
                <small className="active-supports">
                  {Object.values(actor.supportSlots)
                    .filter((id) => id !== null)
                    .map((id) => supports[id!].name)
                    .join(" · ") || "No supports equipped"}
                </small>
              )}
              <div className="meter">
                <i style={{ width: `${(actor.hp / actor.maxHp) * 100}%` }} />
              </div>
              <div className="stat-line">
                <b>
                  {actor.hp}
                  <small> / {actor.maxHp} HP</small>
                </b>
                <span>
                  {actor.mp} <small>EN</small>
                </span>
              </div>
            </div>
          </div>
          <div className="command-heading">
            Commands{" "}
            <span>
              {actor.moved ? "Move spent" : "Move ready"} ·{" "}
              {actor.acted ? "Act spent" : "Act ready"}
            </span>
          </div>
          <div className="commands">
            <button
              id="move-command"
              className={mode === "move" ? "command selected" : "command"}
              disabled={!isPlayer || actor.moved}
              onClick={() => choose("move")}
            >
              <span className="command-symbol">↗</span>
              <span>
                Move<small>{unitStats(actor).move} movement · climb 1</small>
              </span>
              <kbd>M</kbd>
            </button>
            {availableSkills(actor)
              .filter((id) => id !== "rally")
              .map((id, i) => (
                <button
                  key={id}
                  className={mode === id ? "command selected" : "command"}
                  disabled={
                    !isPlayer || actor.acted || actor.mp < skills[id].cost
                  }
                  onClick={() => choose(id)}
                  title={skills[id].description}
                >
                  <span className="command-symbol">
                    {id === "strike" ? (
                      "†"
                    ) : skills[id].kind === "heal" ? (
                      "+"
                    ) : skills[id].kind === "buff" ? (
                      "◷"
                    ) : (
                      <Glyph kind="magic" />
                    )}
                  </span>
                  <span>
                    {skills[id].name}
                    <small>
                      {id === "strike"
                        ? "Physical · adjacent"
                        : `${skills[id].cost} energy · range ${skills[id].range}`}
                    </small>
                  </span>
                  <span className="command-cost">
                    {i === 0 ? <kbd>1</kbd> : skills[id].cost}
                  </span>
                </button>
              ))}
          </div>
          <button
            className="concord"
            disabled={!isPlayer || actor.acted || battle.momentum < 3}
            onClick={() => choose("rally")}
            title={skills.rally.description}
          >
            <span>◇ Lantern concord</span>
            <span>3 momentum</span>
          </button>
          <button
            id="end-turn"
            className="end-turn"
            disabled={!isPlayer}
            onClick={() => send({ type: "end" })}
          >
            {actor.acted ? "End turn" : "Defend & end turn"}
            <span>→</span>
          </button>
          <p className="defend-note">
            Defending reduces incoming damage by 45%.
          </p>
          <div className="rail-bottom">
            <span>Lantern Company</span>
            <div className="party-mini">
              {company.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setMember(u.id);
                    setModal("company");
                  }}
                  aria-label={`Inspect ${u.name}`}
                >
                  <Portrait u={u} size={29} />
                  <i style={{ width: `${(u.hp / u.maxHp) * 100}%` }} />
                </button>
              ))}
            </div>
            <div className="save-row">
              <button disabled={busy} onClick={() => persist()}>
                Save battle
              </button>
              <button disabled={busy} onClick={() => persist(true)}>
                Load save
              </button>
            </div>
          </div>
        </aside>
        <section className="battle-sheet" aria-label="Battlefield and timeline">
          <div className="battle-top">
            <div>
              <span className="location-symbol">⌖</span> Veyr, the eastern
              fracture{" "}
              <span className="weather">
                Clear skies · high ground +4 damage
              </span>
            </div>
            <button className="text-button" onClick={() => setModal("journal")}>
              Battle briefing ↗
            </button>
          </div>
          <div className="mobile-commands" aria-label="Quick battle commands">
            <button
              disabled={!isPlayer || actor.moved}
              className={mode === "move" ? "active" : ""}
              onClick={() => choose("move")}
            >
              Move
            </button>
            {availableSkills(actor).map((id) => (
              <button
                key={id}
                className={mode === id ? "active" : ""}
                disabled={
                  !isPlayer ||
                  actor.acted ||
                  actor.mp < skills[id].cost ||
                  (id === "rally" && battle.momentum < 3)
                }
                onClick={() => choose(id)}
              >
                {skills[id].name}
              </button>
            ))}
            <button disabled={!isPlayer} onClick={() => send({ type: "end" })}>
              End turn
            </button>
          </div>
          <div className="battle-canvas">
            <div ref={host} className="scene" />
            <div className="map-caption">
              <span>The first crownfall</span>
              <b>
                VEY R<span>{boss ? "THE SILENT BELFRY" : "SHRINE RUINS"}</span>
              </b>
            </div>
            <div className="momentum">
              <div>
                <span>Company momentum</span>
                <strong>
                  {battle.momentum}
                  <small>/ 5</small>
                </strong>
              </div>
              <div className="momentum-pips">
                {Array.from({ length: 5 }, (_, i) => (
                  <i key={i} className={i < battle.momentum ? "filled" : ""} />
                ))}
              </div>
              <small>Land attacks to awaken the concord.</small>
            </div>
            <div className="tile-readout">
              <b>
                {String.fromCharCode(65 + hover.x)}
                {hover.z + 1}
              </b>
              <span>
                {tile.blocked
                  ? "Obstructed"
                  : tile.burn
                    ? "Burning"
                    : tile.terrain}{" "}
                <small>Elevation {tile.h}</small>
              </span>
            </div>
            <div className="camera-controls">
              <button
                aria-label="Rotate camera left"
                title="Rotate left (Q)"
                onClick={() => view.current?.rotate(-1)}
              >
                ↶
              </button>
              <span>Q / E</span>
              <button
                aria-label="Rotate camera right"
                title="Rotate right (E)"
                onClick={() => view.current?.rotate(1)}
              >
                ↷
              </button>
              <i />
              <button
                aria-label="Zoom out"
                onClick={() => view.current?.setZoom(-0.12)}
              >
                −
              </button>
              <button
                aria-label="Zoom in"
                onClick={() => view.current?.setZoom(0.12)}
              >
                +
              </button>
            </div>
            {selected && (
              <div className="selection-panel">
                <div className="selection-title">
                  <b>
                    {target
                      ? target.name
                      : `Tile ${String.fromCharCode(65 + selected.x)}${selected.z + 1}`}
                  </b>
                  <button
                    aria-label="Clear selection"
                    onClick={() => setSelected(null)}
                  >
                    ×
                  </button>
                </div>
                <p>
                  {chosen
                    ? chosen.description
                    : mode === "move"
                      ? `Movement cost: ${reachable(battle, actor).get(key(selected.x, selected.z)) ?? "unreachable"}`
                      : target
                        ? `${jobs[target.job].name} · ${target.hp}/${target.maxHp} HP · ${target.mp} energy`
                        : "Choose Move or a skill to act on this tile."}
                </p>
                {chosen && target && canConfirm && (
                  <div className="preview-numbers">
                    <b>
                      {chosen.kind === "heal" ? "+" : ""}
                      {chosen.kind === "buff"
                        ? 35
                        : preview(battle, actor, target, chosen).amount}{" "}
                      <small>
                        {chosen.kind === "heal"
                          ? "healing"
                          : chosen.kind === "buff"
                            ? "timeline effect"
                            : "damage"}
                      </small>
                    </b>
                    <span>
                      {preview(battle, actor, target, chosen).hit}% hit
                    </span>
                    {preview(battle, actor, target, chosen).flank && (
                      <span>Flanking</span>
                    )}
                  </div>
                )}
                {chosen && selected && (
                  <small className="affected">
                    Area:{" "}
                    {chosen.radius === 0 ? "single tile" : "cross · 5 tiles"} ·
                    allies spared
                  </small>
                )}
                {mode !== "inspect" && (
                  <button
                    id="confirm-action"
                    className="confirm"
                    disabled={!canConfirm}
                    onClick={confirmAction}
                  >
                    {canConfirm
                      ? mode === "move"
                        ? "Confirm movement"
                        : `Use ${chosen?.name}`
                      : "Out of range or unavailable"}
                  </button>
                )}
              </div>
            )}
            {battle.result !== "playing" && (
              <div className="result-overlay">
                <Mark />
                <span>
                  {battle.result === "victory"
                    ? "The promise endures"
                    : "The lanterns go dark"}
                </span>
                <h2>
                  {battle.result === "victory"
                    ? `${mission.name} is secure.`
                    : "Company defeated."}
                </h2>
                <p>
                  {battle.result === "victory"
                    ? `The company has secured the contract. Each companion earned 60 JP. Return to camp to collect ${mission.reward} gold${mission.firstClearRelic && !game.company.completed.includes(battle.encounter) ? " and the Bellkeeper’s seal" : ""}, train skills, and prepare the next deployment.`
                    : "The Oathless reclaim the shrine. Reposition carefully, use Maelis to revive allies, and control the causeway."}
                </p>
                <button
                  className="confirm"
                  onClick={() => {
                    setGame((g) => returnToCamp(g));
                    setMode("inspect");
                    setSelected(null);
                    setModal(null);
                  }}
                >
                  Return to company camp
                </button>
                <button
                  className="text-button"
                  onClick={() => setModal("company")}
                >
                  Review company progression
                </button>
              </div>
            )}
          </div>
          <div className="battle-bottom">
            <div className="timeline-heading">
              <span>Turn order</span>
              <small>Speed determines the next action</small>
            </div>
            <div className="timeline">
              {timeline.map((u, i) => (
                <button
                  key={u.id}
                  className={`timeline-unit ${u.id === actor.id ? "current" : ""} ${u.team}`}
                  onClick={() => {
                    setSelected({ x: u.x, z: u.z });
                    setHover({ x: u.x, z: u.z });
                  }}
                >
                  <span className="timeline-order">
                    {i === 0 ? "Now" : String(i + 1)}
                  </span>
                  <Portrait u={u} size={29} />
                  <div>
                    <b>{u.name.split(" ")[0]}</b>
                    <span>{jobs[u.job].name}</span>
                  </div>
                  {i === 0 && <span className="timeline-arrow">›</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="battle-log" aria-live="polite">
            <span className="log-symbol">≋</span>
            <span>{battle.log[battle.log.length - 1]}</span>
            <button onClick={() => setModal("journal")}>History ↗</button>
          </div>
        </section>
      </main>
      <footer className="footer">
        <span>
          ◆ <b>Veyr</b> · Company foundations
        </span>
        <span className="control-hint">
          Click a tile to inspect · Q E rotate · Scroll to zoom · Space end turn
        </span>
        <button onClick={() => setModal("help")}>
          Field guide <kbd>?</kbd>
        </button>
      </footer>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <section
            className={`modal ${modal === "company" ? "wide" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <div className="modal-header">
              <h2 id="dialog-title">
                {
                  {
                    company: "The Lantern Company",
                    journal: "The chronicle of Veyr",
                    settings: "Settings",
                    help: "Field guide",
                    restart: "Retry this contract?",
                  }[modal]
                }
              </h2>
              <button
                autoFocus
                aria-label="Close dialog"
                onClick={() => setModal(null)}
              >
                ×
              </button>
            </div>
            {modal === "company" && (
              <>
                <p>
                  Jobs preserve their own JP. Choose a primary role and a
                  secondary set until the first turn ends. Only permanently
                  learned skills are available through the secondary set. Train
                  at camp; lifetime job levels unlock advanced jobs.
                </p>
                <div className="member-tabs">
                  {company.map((u) => (
                    <button
                      className={member === u.id ? "active" : ""}
                      key={u.id}
                      onClick={() => setMember(u.id)}
                    >
                      {u.name.split(" ")[0]}{" "}
                      <small>
                        {u.hp}/{u.maxHp} HP
                      </small>
                    </button>
                  ))}
                </div>
                <div className="member-summary">
                  <Portrait u={m} size={54} />
                  <div>
                    <h3>{m.name}</h3>
                    <p>{jobs[m.job].role}</p>
                    <b>
                      Primary: {jobs[m.job].name} · Secondary:{" "}
                      {jobs[m.secondary].name}
                    </b>
                  </div>
                </div>
                <div className="job-grid">
                  {Object.values(jobs).map((j) => {
                    const open = unlocked(j.id, m.jp);
                    return (
                      <article
                        key={j.id}
                        className={m.job === j.id ? "job equipped" : "job"}
                      >
                        <h3>
                          {j.name}
                          <small>{open ? "Available" : "Locked"}</small>
                        </h3>
                        <p>{j.role}</p>
                        <div className="job-progress">
                          <span>Lv. {jobLevel(m.jp[j.id] ?? 0)}</span>
                          <span>{m.jp[j.id] ?? 0} JP</span>
                        </div>
                        <progress max="60" value={(m.jp[j.id] ?? 0) % 60} />
                        <p className="job-requirements">
                          {Object.entries(j.requires).length
                            ? Object.entries(j.requires)
                                .map(
                                  ([id, n]) => `${jobs[id as JobId].name} ${n}`,
                                )
                                .join(" + ")
                            : "Foundation job · no prerequisites"}
                        </p>
                        <div className="job-buttons">
                          <button
                            disabled={
                              !open || battle.turn !== 1 || m.job === j.id
                            }
                            onClick={() => {
                              setBattle((b) =>
                                changeJob(b, m.id, j.id, m.secondary),
                              );
                              setNotice(
                                `${m.name} takes up the ${j.name} mantle.`,
                              );
                            }}
                          >
                            Primary
                          </button>
                          <button
                            disabled={
                              !open || battle.turn !== 1 || m.secondary === j.id
                            }
                            onClick={() =>
                              setBattle((b) => changeJob(b, m.id, m.job, j.id))
                            }
                          >
                            Secondary
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <p className="modal-note">
                  {battle.turn === 1
                    ? "Loadouts can be changed until the first turn ends."
                    : "Loadouts are fixed until the company returns to camp."}{" "}
                  Skills earn 10 JP per use; victory awards 60 JP. Every 60 JP
                  grants one job level. Progress is stored with a manual battle
                  save.
                </p>
              </>
            )}
            {modal === "journal" && (
              <>
                <div className="journal-art">
                  <Mark />
                  <span>In the year 312 after the Sundering</span>
                </div>
                <h3>A crown is only a promise.</h3>
                <p>
                  When the star Avel fell, the kingdoms did not burn. They
                  forgot how to remain whole. Roads ended in foreign seasons.
                  Cities woke beneath unfamiliar skies.
                </p>
                <p>
                  Three centuries later, the Lantern Company escorts a nameless
                  scholar to Veyr. Beneath its shrine lies a crown shard,
                  humming with the voices of people who never existed.
                </p>
                <p>
                  The Oathless want to silence it. The Meridian Compact would
                  bind the fractures together, whatever the cost. The Verdant
                  Witness believes the broken world deserves to grow into
                  something new.
                </p>
                <blockquote>
                  “If this little piece can mend a road, imagine what it could
                  do to a person.” <cite>— Maelis Reed</cite>
                </blockquote>
                <h3>Battle orders</h3>
                <p>
                  Defeat the four Oathless. Take the stone crossing to reach the
                  eastern terrace; elevation grants damage. Cinder bloom ignites
                  grass, Stillwater freezes water, and Thread of life revives
                  fallen companions. Build 3 momentum to use Lantern concord.
                </p>
                <h3>Field record</h3>
                <ol className="history">
                  {battle.log.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ol>
                <p className="modal-note">
                  This expedition contains four linked contracts. Branching
                  quests, exploration, recruitment, and campaign endings are
                  planned for later milestones.
                </p>
              </>
            )}
            {modal === "settings" && (
              <>
                <label className="setting">
                  Reduced motion{" "}
                  <input
                    type="checkbox"
                    checked={reduced}
                    onChange={(e) => setReduced(e.target.checked)}
                  />
                </label>
                <label className="setting">
                  Fast enemy turns{" "}
                  <input
                    type="checkbox"
                    checked={fast}
                    onChange={(e) => setFast(e.target.checked)}
                  />
                </label>
                <label className="setting">
                  Interface text size{" "}
                  <select
                    value={uiScale}
                    onChange={(e) => setUiScale(Number(e.target.value))}
                  >
                    <option value="100">Standard</option>
                    <option value="112">Large</option>
                    <option value="124">Extra large</option>
                  </select>
                </label>
                <label className="setting">
                  Music volume{" "}
                  <input
                    type="range"
                    aria-label="Music volume"
                    min="0"
                    max="100"
                    defaultValue="35"
                    onChange={(e) => {
                      if (score.current)
                        score.current.volume =
                          (Number(e.target.value) / 100) * 0.35;
                    }}
                  />
                </label>
                <p>
                  Allied and enemy markers use both shapes and color. The
                  soundtrack is an original procedural sketch; enable it with
                  the Sound control.
                </p>
                <button className="danger" onClick={() => setModal("restart")}>
                  Restart battle
                </button>
              </>
            )}
            {modal === "help" && (
              <>
                <p>
                  <b>
                    Each turn: move once and use one ability, in either order.
                  </b>{" "}
                  Ending without an ability defends. End your turn to advance
                  the timeline.
                </p>
                <ol className="help-steps">
                  <li>
                    Select Move, choose a mint tile, then confirm movement.
                  </li>
                  <li>
                    Choose a skill, select a highlighted tile, then confirm.
                    Preview damage and hit chance before spending energy.
                  </li>
                  <li>
                    Take high ground, strike from behind, and stay next to a
                    Vanguard for protection.
                  </li>
                  <li>
                    Keep Maelis safe. Thread of life can heal or revive any ally
                    within range.
                  </li>
                </ol>
                <table>
                  <tbody>
                    {[
                      ["Q / E", "Rotate by 90°"],
                      ["+ / − or scroll", "Zoom"],
                      ["Arrows / Enter", "Select tile / confirm action"],
                      ["M / 1", "Move / weapon strike"],
                      ["Space / Escape", "End turn / cancel selection"],
                      [
                        "Gamepad",
                        "D-pad: tile · X: Move · A: confirm · Y: end · B: cancel · LB/RB: rotate",
                      ],
                    ].map(([k, v]) => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p>
                  Touch: tap commands and tiles, then Confirm. Use the camera
                  buttons to rotate and zoom. Save manually to retain the battle
                  on this browser.
                </p>
              </>
            )}
            {modal === "restart" && (
              <>
                <p>
                  Retry with the company loadout from deployment. JP earned
                  during this attempt will be discarded. Your manual save
                  remains available.
                </p>
                <button
                  className="confirm"
                  onClick={() => {
                    setGame((g) => retryContract(g));
                    setMode("inspect");
                    setSelected(null);
                    setModal(null);
                    setNotice(
                      "The company returns to its deployment position.",
                    );
                  }}
                >
                  Retry contract
                </button>
                <button className="text-button" onClick={() => setModal(null)}>
                  Keep playing
                </button>
              </>
            )}
            <button
              className="modal-close-bottom"
              onClick={() => setModal(null)}
            >
              Return to battle
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
