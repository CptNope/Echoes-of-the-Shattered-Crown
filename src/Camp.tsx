import { Shop } from "./Shop";
import {
  supports,
  mastered,
  masteryJP,
  supportCost,
  type SupportId,
  type SupportSlot,
} from "./supports";
import { learnSupport, setSupport } from "./campaign";
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  jobs as baselineJobs,
  skills as baselineSkills,
  jobLevel,
  unlocked,
  type JobId,
} from "./data";
import { createBattle, unitStats, availableSkills } from "./engine";
import { encounters, type EncounterId } from "./encounters";
import {
  equipment as baselineEquipment,
  canEquip,
  type GearId,
  type GearSlot,
} from "./equipment";
import {
  type Expedition,
  createExpedition,
  depart,
  setMemberJob,
  train,
  equip,
  purchase,
  allocated,
  contractOpen,
  memberUnit,
  spendableJP,
  learningCost,
} from "./campaign";
import { Portrait } from "./Portrait";
import "./camp.css";

function MapPreview({ id }: { id: EncounterId }) {
  const b = useMemo(() => createBattle(74319, id), [id]);
  const point = (x: number, z: number, h: number) => [
    155 + (x - z) * 14,
    23 + (x + z) * 7 - h * 5,
  ];
  return (
    <svg
      viewBox="0 0 310 165"
      role="img"
      aria-label={`${encounters[id].name} terrain and deployment preview`}
      className="contract-map"
    >
      {b.tiles.map((t) => {
        const [x, y] = point(t.x, t.z, t.h);
        return (
          <polygon
            key={`${t.x},${t.z}`}
            points={`${x},${y} ${x + 14},${y + 7} ${x},${y + 14} ${x - 14},${y + 7}`}
            fill={
              t.blocked
                ? "#526d4e"
                : t.terrain === "water"
                  ? "#8db5b3"
                  : t.terrain === "stone"
                    ? "#b9bea3"
                    : "#a3b58c"
            }
            stroke="#f2f4e7"
            strokeWidth=".5"
          />
        );
      })}
      {b.units.map((u) => {
        const t = b.tiles.find((t) => t.x === u.x && t.z === u.z)!,
          [x, y] = point(u.x, u.z, t.h);
        return (
          <g key={u.id}>
            <circle
              cx={x}
              cy={y + 7}
              r="4.3"
              fill={u.team === "ally" ? "#34583f" : "#a25943"}
              stroke="#f5f2d9"
              strokeWidth="1.3"
            />
            {u.team === "enemy" && (
              <path d={`M${x - 2},${y + 7}h4`} stroke="#fff5df" />
            )}
          </g>
        );
      })}
    </svg>
  );
}
const gearDescription = (id: GearId, catalog = baselineEquipment) =>
  Object.entries(catalog[id].bonuses)
    .map(([k, v]) => `${v > 0 ? "+" : ""}${v} ${k === "hp" ? "HP" : k}`)
    .join(" · ");

export function Camp({
  game,
  setGame,
  onSave,
  onLoad,
  onBackups,
  busy,
  notice,
  dismiss,
}: {
  game: Expedition;
  setGame: Dispatch<SetStateAction<Expedition>>;
  onSave: () => void;
  onLoad: () => void;
  onBackups: () => void;
  busy: boolean;
  notice: string;
  dismiss: () => void;
}) {
  const jobs = game.battle.rules?.jobs ?? baselineJobs,
    skills = game.battle.rules?.skills ?? baselineSkills,
    equipment = game.battle.rules?.gear ?? baselineEquipment;
  const [tab, setTab] = useState<
    "contracts" | "company" | "training" | "outfitter"
  >("contracts");
  const [selected, setSelected] = useState(game.company.members[0].id);
  const [contract, setContract] = useState<EncounterId>(
    () =>
      Object.values(encounters).find(
        (e) =>
          contractOpen(game.company, e.id) &&
          !game.company.completed.includes(e.id),
      )?.id ?? "shrine",
  );
  const [school, setSchool] = useState<JobId>(game.company.members[0].job),
    [reset, setReset] = useState(false),
    [message, setMessage] = useState("");
  const c = game.company,
    m = c.members.find((m) => m.id === selected) ?? c.members[0],
    u = memberUnit(m, game.battle.rules),
    stats = unitStats(u, game.battle.rules),
    mission = encounters[contract];
  useEffect(() => {
    setSchool(m.job);
  }, [m.id, m.job]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    setMessage("");
  }, [notice]);
  const selectMember = (id: string) => {
    setSelected(id);
    if (tab === "contracts") setTab("company");
  };
  const slots: GearSlot[] = ["weapon", "armor", "relic"];
  const completedKey = c.completed.join(",");
  useEffect(() => {
    setContract(
      Object.values(encounters).find(
        (e) => contractOpen(c, e.id) && !c.completed.includes(e.id),
      )?.id ?? "shrine",
    );
  }, [completedKey]);
  useEffect(() => {
    if (!reset) return;
    const previous = document.activeElement as HTMLElement | null;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReset(false);
      if (e.key !== "Tab") return;
      const buttons = [
          ...document.querySelectorAll<HTMLButtonElement>(
            '[role="dialog"] button',
          ),
        ],
        first = buttons[0],
        last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [reset]);
  return (
    <div className="camp-app">
      <header className="camp-header">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("contracts");
          }}
          className="camp-brand"
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 32 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="m4 10 6 6 6-11 6 11 6-6-3 15H7zM7 28h18M17 4l-4 13 6 2-4 10" />
          </svg>
          <span>
            Echoes<small>of the Shattered Crown</small>
          </span>
        </a>
        <span className="camp-header-location">Veyr region · Company camp</span>
        <div className="camp-save">
          <a href="studio.html">Level studio</a>
          <button disabled={busy} onClick={onSave}>
            Save company
          </button>
          <button disabled={busy} onClick={onLoad}>
            Load save
          </button>
          <button onClick={onBackups}>Backups</button>
        </div>
      </header>
      <div className="camp-shell">
        <aside className="camp-roster">
          <p className="camp-eyebrow">The Lantern Company</p>
          <h1>
            A moment
            <br /> before dawn.
          </h1>
          <p className="camp-intro">
            Rest, learn, and choose the road ahead. Every oath leaves a mark.
          </p>
          <div className="company-funds">
            <span>Company treasury</span>
            <strong>
              {c.gold} <small>gold</small>
            </strong>
            <span>
              {c.victories} victories · {c.completed.length} /{" "}
              {Object.keys(encounters).length} contracts cleared
            </span>
          </div>
          <h2>Companions</h2>
          <div className="camp-members">
            {c.members.map((member) => (
              <button
                key={member.id}
                className={m.id === member.id ? "active" : ""}
                onClick={() => selectMember(member.id)}
              >
                <Portrait u={memberUnit(member, game.battle.rules)} size={46} />
                <span>
                  <b>{member.name}</b>
                  <small>
                    {jobs[member.job].name} · Lv.{" "}
                    {jobLevel(member.jp[member.job] ?? 0)}
                  </small>
                </span>
                <span className="member-chevron">›</span>
              </button>
            ))}
          </div>
          <p className="camp-rest">
            All companions recover health and energy before deployment.
          </p>
          <div className="camp-rules">
            <b>Your progress travels with you.</b>
            <p>
              Lifetime JP unlocks jobs. Spendable JP learns permanent secondary
              skills. Equipment is shared across the company.
            </p>
          </div>
          <button className="camp-new" onClick={() => setReset(true)}>
            Start a new company
          </button>
        </aside>
        <main className="camp-sheet">
          <nav className="camp-tabs" aria-label="Camp sections">
            {(["contracts", "company", "training", "outfitter"] as const).map(
              (name) => (
                <button
                  key={name}
                  className={tab === name ? "active" : ""}
                  aria-current={tab === name ? "page" : undefined}
                  onClick={() => setTab(name)}
                >
                  {
                    {
                      contracts: "Contracts",
                      company: "Company",
                      training: "Training",
                      outfitter: "Outfitter",
                    }[name]
                  }
                </button>
              ),
            )}
          </nav>
          {tab === "contracts" && (
            <section className="camp-section">
              <div className="camp-title">
                <div>
                  <p className="camp-eyebrow">The roads out of Veyr</p>
                  <h2>Choose your next contract</h2>
                </div>
                <span>
                  {c.completed.length === Object.keys(encounters).length
                    ? "All contracts secured"
                    : "Four battles. One company."}
                </span>
              </div>
              <div className="contract-layout">
                <div className="contract-list">
                  {Object.values(encounters).map((e, i) => {
                    const open = contractOpen(c, e.id),
                      done = c.completed.includes(e.id);
                    return (
                      <button
                        key={e.id}
                        className={contract === e.id ? "selected" : ""}
                        onClick={() => setContract(e.id)}
                      >
                        <span className="contract-index">{i + 1}</span>
                        <span>
                          <b>{e.name}</b>
                          <small>
                            {done
                              ? "Secured · replay available"
                              : open
                                ? "Available for deployment"
                                : `Clear ${encounters[e.requires!].name} first`}
                          </small>
                        </span>
                        <span className="contract-bounty">
                          {e.reward}
                          <small>gold</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <article className="contract-detail">
                  <MapPreview id={contract} />
                  <span className="camp-eyebrow">{mission.subtitle}</span>
                  <h3>{mission.name}</h3>
                  <p>{mission.description}</p>
                  <dl>
                    <div>
                      <dt>Objective</dt>
                      <dd>{mission.objective}</dd>
                    </div>
                    <div>
                      <dt>Company</dt>
                      <dd>4 companions · 4 enemies</dd>
                    </div>
                    <div>
                      <dt>Victory reward</dt>
                      <dd>
                        {mission.reward} gold + 60 JP each
                        {mission.firstClearRelic
                          ? " · First clear: Bellkeeper’s seal"
                          : ""}
                      </dd>
                    </div>
                  </dl>
                  <button
                    className="confirm"
                    disabled={!contractOpen(c, contract)}
                    onClick={() => setGame((g) => depart(g, contract))}
                  >
                    {contractOpen(c, contract)
                      ? "Deploy company →"
                      : "Complete the previous contract"}
                  </button>
                </article>
              </div>
              <div className="camp-fieldnote">
                <b>A road can be made.</b>
                <p>
                  Freeze a crossing with Stillwater. Strike soaked enemies with
                  lightning. Use the camp to turn earned JP and gold into a
                  different approach.
                </p>
              </div>
            </section>
          )}
          {tab === "company" && (
            <section className="camp-section">
              <div className="camp-title">
                <div>
                  <p className="camp-eyebrow">Companion dossier</p>
                  <h2>{m.name}</h2>
                </div>
                <Portrait u={u} size={70} />
              </div>
              <div className="camp-statline">
                {Object.entries({
                  HP: stats.hp,
                  Attack: stats.attack,
                  Magic: stats.magic,
                  Armor: stats.armor,
                  Speed: stats.speed,
                  Move: stats.move,
                }).map(([key, value]) => (
                  <div key={key}>
                    <span>{key}</span>
                    <b>{value}</b>
                  </div>
                ))}
              </div>
              <div className="camp-two-columns">
                <article className="camp-panel">
                  <h3>Job loadout</h3>
                  <p>
                    The primary job supplies stats and native abilities. The
                    secondary supplies permanently learned skills.
                  </p>
                  <label>
                    Primary job
                    <select
                      aria-label="Primary job"
                      value={m.job}
                      onChange={(e) => {
                        setGame((g) =>
                          setMemberJob(
                            g,
                            m.id,
                            e.target.value as JobId,
                            m.secondary,
                          ),
                        );
                        setMessage(
                          "Job changed. Incompatible equipment returns to shared inventory.",
                        );
                      }}
                    >
                      {Object.values(jobs).map((j) => (
                        <option
                          key={j.id}
                          value={j.id}
                          disabled={!unlocked(j.id, m.jp, jobs)}
                        >
                          {j.name}
                          {unlocked(j.id, m.jp, jobs) ? "" : " · locked"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Secondary skill set
                    <select
                      aria-label="Secondary skill set"
                      value={m.secondary}
                      onChange={(e) =>
                        setGame((g) =>
                          setMemberJob(g, m.id, m.job, e.target.value as JobId),
                        )
                      }
                    >
                      {Object.values(jobs).map((j) => (
                        <option
                          key={j.id}
                          value={j.id}
                          disabled={
                            j.id !== m.secondary && !unlocked(j.id, m.jp, jobs)
                          }
                        >
                          {j.name} ·{" "}
                          {j.skills.filter((s) => m.learned.includes(s)).length}{" "}
                          learned
                        </option>
                      ))}
                    </select>
                  </label>
                  <h4>Available in battle</h4>
                  <ul className="camp-skill-list">
                    {availableSkills(u, game.battle.rules).map((id) => (
                      <li key={id}>
                        <span>{skills[id].name}</span>
                        <small>
                          {id === "rally"
                            ? "3 momentum"
                            : `${skills[id].cost} EN`}
                        </small>
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="camp-panel">
                  <h3>Equipment</h3>
                  <p>
                    Equipped copies are reserved from shared inventory. Changes
                    take effect when you deploy.
                  </p>
                  {slots.map((slot) => (
                    <label key={slot}>
                      {slot[0].toUpperCase() + slot.slice(1)}
                      <select
                        aria-label={`${slot} equipment`}
                        value={m.equipment[slot] ?? ""}
                        onChange={(e) =>
                          setGame((g) =>
                            equip(
                              g,
                              m.id,
                              slot,
                              (e.target.value || null) as GearId | null,
                            ),
                          )
                        }
                      >
                        <option value="">None</option>
                        {Object.values(equipment)
                          .filter(
                            (item) =>
                              item.slot === slot &&
                              (c.inventory[item.id] ?? 0) > 0,
                          )
                          .map((item) => (
                            <option
                              key={item.id}
                              value={item.id}
                              disabled={
                                !canEquip(m.job, item.id, equipment) ||
                                (m.equipment[slot] !== item.id &&
                                  allocated(c, item.id) >=
                                    (c.inventory[item.id] ?? 0))
                              }
                            >
                              {item.name}
                              {!canEquip(m.job, item.id, equipment)
                                ? " · incompatible"
                                : m.equipment[slot] !== item.id &&
                                    allocated(c, item.id) >=
                                      (c.inventory[item.id] ?? 0)
                                  ? " · in use"
                                  : ""}
                            </option>
                          ))}
                      </select>
                      {m.equipment[slot] && (
                        <small>
                          {gearDescription(m.equipment[slot]!, equipment)}
                        </small>
                      )}
                    </label>
                  ))}
                  <button
                    className="camp-link"
                    onClick={() => setTab("outfitter")}
                  >
                    Visit the outfitter →
                  </button>
                </article>
              </div>
            </section>
          )}
          {tab === "training" && (
            <section className="camp-section">
              <div className="camp-title">
                <div>
                  <p className="camp-eyebrow">Permanent learning · {m.name}</p>
                  <h2>Carry a skill beyond its job</h2>
                </div>
              </div>
              <p className="camp-lead">
                Primary abilities are native. Learn them for {learningCost} JP
                to use them through that job's secondary set. Spending JP
                preserves lifetime levels and unlocks.
              </p>
              <div className="training-layout">
                <div className="training-jobs">
                  {Object.values(jobs).map((j) => {
                    const open = unlocked(j.id, m.jp, jobs);
                    return (
                      <button
                        key={j.id}
                        className={school === j.id ? "active" : ""}
                        onClick={() => setSchool(j.id)}
                      >
                        <span>
                          <b>{j.name}</b>
                          <small>
                            {open
                              ? `Lv. ${jobLevel(m.jp[j.id] ?? 0)} · ${m.jp[j.id] ?? 0} lifetime JP`
                              : "Locked"}
                          </small>
                        </span>
                        <span>
                          {spendableJP(m, j.id)}
                          <small>JP</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <article className="camp-panel training-detail">
                  <div className="training-heading">
                    <h3>{jobs[school].name}</h3>
                    <span>{spendableJP(m, school)} spendable JP</span>
                  </div>
                  <p>{jobs[school].role}</p>
                  {!unlocked(school, m.jp, jobs) && (
                    <p className="training-lock">
                      Requires{" "}
                      {Object.entries(jobs[school].requires)
                        .map(([id, n]) => `${jobs[id as JobId].name} ${n}`)
                        .join(" + ")}
                    </p>
                  )}
                  {jobs[school].skills.map((id) => {
                    const known = m.learned.includes(id);
                    return (
                      <div key={id} className="training-skill">
                        <div>
                          <h4>{skills[id].name}</h4>
                          <p>{skills[id].description}</p>
                          <small>
                            {skills[id].cost} energy · range {skills[id].range}{" "}
                            · {skills[id].radius ? "cross area" : "single tile"}
                          </small>
                        </div>
                        <button
                          disabled={
                            known ||
                            !unlocked(school, m.jp, jobs) ||
                            spendableJP(m, school) < learningCost
                          }
                          onClick={() => {
                            setGame((g) => train(g, m.id, school, id));
                            setMessage(
                              `${m.name} permanently learned ${skills[id].name}.`,
                            );
                          }}
                        >
                          {known ? "Learned" : `Learn · ${learningCost} JP`}
                        </button>
                      </div>
                    );
                  })}
                  <div className="mastery-board">
                    <h4>
                      {mastered(m, school, jobs)
                        ? "Job mastered"
                        : "Path to mastery"}
                    </h4>
                    <p>
                      Earn {masteryJP} lifetime JP and permanently learn every
                      native skill in this job. Mastery unlocks its support
                      lesson; learning costs {supportCost} spendable JP.
                    </p>
                    {Object.values(supports)
                      .filter((item) => item.job === school)
                      .map((item) => (
                        <div key={item.id} className="training-skill">
                          <div>
                            <h4>
                              {item.name} · {item.slot}
                            </h4>
                            <p>{item.description}</p>
                          </div>
                          <button
                            disabled={
                              (m.learnedSupport ?? []).includes(item.id) ||
                              !mastered(m, school, jobs) ||
                              spendableJP(m, school) < supportCost
                            }
                            onClick={() => {
                              setGame((g) => learnSupport(g, m.id, item.id));
                              setMessage(
                                item.name +
                                  " learned. Equip it in the support slots below.",
                              );
                            }}
                          >
                            {(m.learnedSupport ?? []).includes(item.id)
                              ? "Learned"
                              : "Learn · " + supportCost + " JP"}
                          </button>
                        </div>
                      ))}
                    <h4>Equipped support abilities</h4>
                    <p>
                      One per slot. Learned supports work across primary jobs;
                      changing jobs preserves the loadout.
                    </p>
                    {(["passive", "reaction", "movement"] as SupportSlot[]).map(
                      (slot) => (
                        <label className="support-slot" key={slot}>
                          {slot}
                          <select
                            aria-label={slot + " support"}
                            value={m.supportSlots?.[slot] ?? ""}
                            onChange={(e) =>
                              setGame((g) =>
                                setSupport(
                                  g,
                                  m.id,
                                  slot,
                                  (e.target.value || null) as SupportId | null,
                                ),
                              )
                            }
                          >
                            <option value="">None</option>
                            {(m.learnedSupport ?? [])
                              .filter((id) => supports[id].slot === slot)
                              .map((id) => (
                                <option key={id} value={id}>
                                  {supports[id].name}
                                </option>
                              ))}
                          </select>
                          <small>
                            {m.supportSlots?.[slot]
                              ? supports[m.supportSlots[slot]!].description
                              : "No support equipped"}
                          </small>
                        </label>
                      ),
                    )}
                  </div>
                  <p className="camp-note">
                    Skills earn 10 lifetime JP per valid use; victory adds 60.
                    Each job tracks its own spending. Learned skills stay
                    learned when jobs change.
                  </p>
                </article>
              </div>
            </section>
          )}
          {tab === "outfitter" && <Shop game={game} setGame={setGame} />}
        </main>
      </div>
      <footer className="camp-footer">
        <span>Phase 2 · The silent belfry</span>
        <span>
          Manual saves include the company, inventory, learned skills and active
          contract.
        </span>
      </footer>
      {tab === "contracts" && !reset && (
        <button
          className="mobile-deploy"
          disabled={!contractOpen(c, contract)}
          onClick={() => setGame((g) => depart(g, contract))}
        >
          {contractOpen(c, contract)
            ? `Deploy · ${mission.name}`
            : "Complete the previous contract"}
        </button>
      )}
      {(notice || message) && (
        <div className="toast" role="status">
          {message || notice}
          <button
            aria-label="Dismiss notice"
            onClick={() => {
              setMessage("");
              dismiss();
            }}
          >
            ×
          </button>
        </div>
      )}
      {reset && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-company-title"
          >
            <div className="modal-header">
              <h2 id="reset-company-title">Start a new company?</h2>
              <button
                autoFocus
                aria-label="Cancel new company"
                onClick={() => setReset(false)}
              >
                ×
              </button>
            </div>
            <p>
              This resets unsaved JP, learned skills, equipment, gold and
              contracts. Your manual save stays available.
            </p>
            <button
              className="confirm"
              onClick={() => {
                setGame(createExpedition());
                setReset(false);
                setTab("contracts");
                setSelected("sera");
                setContract("shrine");
                setMessage("A new Lantern Company is ready.");
              }}
            >
              Start new company
            </button>
            <button
              className="modal-close-bottom"
              onClick={() => setReset(false)}
            >
              Keep this company
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
