import type { ValidationFocusRequest } from "./studio-validation";
import type { RuleCatalog } from "./studio-rules";
import { canEquip, emptyLoadout, type Loadout } from "./equipment";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ENCOUNTER_IDS,
  gameContent,
  validateGameContent,
  type GameContent,
} from "./studio-content";
import { jobs, skills, type JobId } from "./data";
import { equipment, type GearId } from "./equipment";
import { contractOpen, createExpedition } from "./campaign";
import type { EncounterId } from "./encounters";
export function ContentEditor({
  source,
  encounter,
  apply,
  onDirty,
  rules,
  focusRequest,
}: {
  source: GameContent | undefined;
  rules?: RuleCatalog;
  focusRequest?: ValidationFocusRequest;
  encounter: EncounterId;
  apply: (p: GameContent) => boolean;
  onDirty: (d: boolean) => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const baseline = useMemo(
      () => source ?? gameContent(encounter),
      [source, encounter],
    ),
    [draft, setDraft] = useState(baseline),
    [tab, setTab] = useState("actors"),
    [actor, setActor] = useState("sentinel"),
    [contract, setContract] = useState<EncounterId>(encounter),
    [message, setMessage] = useState(""),
    [completed, setCompleted] = useState<EncounterId[]>([]);
  useEffect(() => {
    setDraft(baseline);
    setActor((old) =>
      baseline.actors.some((a) => a.id === old) ? old : baseline.actors[0].id,
    );
    setContract(encounter);
  }, [baseline, encounter]);
  useEffect(() => {
    const target = focusRequest?.target;
    if (target?.area !== "content") return;
    setTab(target.section);
    if (
      target.section === "actors" &&
      draft.actors.some((a) => a.id === target.id)
    )
      setActor(target.id);
    else if (Object.hasOwn(draft.contracts, target.id))
      setContract(target.id as EncounterId);
  }, [focusRequest]);
  useEffect(() => {
    if (focusRequest?.target.area === "content")
      sectionRef.current?.querySelector<HTMLSelectElement>("select")?.focus();
  }, [focusRequest, tab, actor, contract]);
  const changed = JSON.stringify(draft) !== JSON.stringify(baseline);
  useEffect(() => onDirty(changed), [changed, onDirty]);
  const error = useMemo(() => {
    try {
      validateGameContent(draft, rules);
      return "";
    } catch (e) {
      return e instanceof Error ? e.message : "Invalid content.";
    }
  }, [draft, rules]);
  const person = draft.actors.find((a) => a.id === actor) ?? draft.actors[0],
    c = draft.contracts[contract],
    lines = draft.dialogue[contract];
  function editActor(patch: Partial<typeof person>) {
    setDraft((p) => ({
      ...p,
      actors: p.actors.map((a) => (a.id === actor ? { ...a, ...patch } : a)),
    }));
  }
  function editContract(patch: Partial<typeof c>) {
    setDraft((p) => ({
      ...p,
      contracts: {
        ...p.contracts,
        [contract]: { ...p.contracts[contract], ...patch },
      },
    }));
  }
  function editLines(next: typeof lines) {
    setDraft((p) => ({ ...p, dialogue: { ...p.dialogue, [contract]: next } }));
  }
  const company = { ...createExpedition().company, completed };
  return (
    <section ref={sectionRef} aria-label="Existing game content editor">
      <p className="source-caption">
        Source: the four shipped contracts and the {encounter} encounter roster.
        Edits use the existing combat, contract-gate and reward functions.
      </p>
      <div className="pixel-tools" role="group" aria-label="Content sections">
        {[
          ["actors", "Characters and NPCs"],
          ["dialogue", "Dialogue"],
          ["progression", "Progression and contracts"],
        ].map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "actors" ? (
        <div className="content-layout">
          <div>
            <label>
              Encounter actor
              <select value={actor} onChange={(e) => setActor(e.target.value)}>
                {draft.actors.map((a) => (
                  <option value={a.id} key={a.id}>
                    {a.name} · {a.id}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Current roster actors retain their team and placement. Names,
              jobs, starting resources, learned secondary skills and job points
              compile into the playtest.
            </p>
          </div>
          <div className="content-fields">
            <label>
              Character name
              <input
                value={person.name}
                maxLength={80}
                onChange={(e) => editActor({ name: e.target.value })}
              />
            </label>
            {(["job", "secondary"] as const).map((field) => (
              <label key={field}>
                {field === "job" ? "Primary job" : "Secondary job"}
                <select
                  value={person[field]}
                  onChange={(e) =>
                    editActor({ [field]: e.target.value as JobId })
                  }
                >
                  {Object.entries(rules?.jobs ?? jobs).map(([id, j]) => (
                    <option key={id} value={id}>
                      {j.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              Base health
              <input
                type="number"
                min="1"
                max="999"
                value={person.baseHp}
                onChange={(e) => editActor({ baseHp: Number(e.target.value) })}
              />
            </label>
            <label>
              Maximum energy
              <input
                type="number"
                min="0"
                max="999"
                value={person.maxMp}
                onChange={(e) => editActor({ maxMp: Number(e.target.value) })}
              />
            </label>
            <label>
              Starting JP in primary job
              <input
                type="number"
                min="0"
                max="9999"
                value={person.jp[person.job] ?? 0}
                onChange={(e) =>
                  editActor({
                    jp: { ...person.jp, [person.job]: Number(e.target.value) },
                  })
                }
              />
            </label>
            {(["weapon", "armor", "relic"] as const).map((slot) => (
              <label key={slot}>
                Starting {slot}
                <select
                  value={person.equipment?.[slot] ?? ""}
                  onChange={(e) =>
                    editActor({
                      equipment: {
                        ...(person.equipment ?? emptyLoadout()),
                        [slot]: e.target.value || null,
                      } as Loadout,
                    })
                  }
                >
                  <option value="">None</option>
                  {Object.values(rules?.gear ?? equipment)
                    .filter((item) => item.slot === slot)
                    .map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                        disabled={!canEquip(person.job, item.id, rules?.gear)}
                      >
                        {item.name}
                        {canEquip(person.job, item.id, rules?.gear)
                          ? ""
                          : " · incompatible job"}
                      </option>
                    ))}
                </select>
              </label>
            ))}
            <details>
              <summary>Learned secondary abilities</summary>
              {Object.entries(rules?.skills ?? skills).map(([id, s]) => (
                <label className="check-row" key={id}>
                  <input
                    type="checkbox"
                    checked={person.learned.includes(id as any)}
                    onChange={(e) =>
                      editActor({
                        learned: e.target.checked
                          ? [...person.learned, id as any]
                          : person.learned.filter((s) => s !== id),
                      })
                    }
                  />
                  {s.name}
                </label>
              ))}
            </details>
          </div>
        </div>
      ) : (
        <>
          <label className="contract-selector">
            Existing contract
            <select
              value={contract}
              onChange={(e) => setContract(e.target.value as EncounterId)}
            >
              {ENCOUNTER_IDS.map((id) => (
                <option key={id} value={id}>
                  {draft.contracts[id].name}
                </option>
              ))}
            </select>
          </label>
          {tab === "dialogue" ? (
            <>
              <p>
                Starts from the shipped contract briefing and Sera’s existing
                opening line. The playtest presents this ordered conversation
                before combat. Speakers reference existing actors.
              </p>
              <div className="dialogue-lines">
                {lines.map((line, i) => (
                  <div key={line.id} className="dialogue-row">
                    <label>
                      Speaker {i + 1}
                      <select
                        value={line.speaker}
                        onChange={(e) =>
                          editLines(
                            lines.map((l) =>
                              l.id === line.id
                                ? { ...l, speaker: e.target.value }
                                : l,
                            ),
                          )
                        }
                      >
                        <option value="narrator">Narrator</option>
                        {draft.actors.map((a) => (
                          <option value={a.id} key={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Dialogue text {i + 1}
                      <textarea
                        rows={3}
                        maxLength={2000}
                        value={line.text}
                        onChange={(e) =>
                          editLines(
                            lines.map((l) =>
                              l.id === line.id
                                ? { ...l, text: e.target.value }
                                : l,
                            ),
                          )
                        }
                      />
                    </label>
                    <div className="actions">
                      <button
                        disabled={i === 0}
                        aria-label={"Move dialogue " + (i + 1) + " earlier"}
                        onClick={() => {
                          const next = [...lines];
                          [next[i], next[i - 1]] = [next[i - 1], next[i]];
                          editLines(next);
                        }}
                      >
                        Earlier
                      </button>
                      <button
                        disabled={i === lines.length - 1}
                        aria-label={"Move dialogue " + (i + 1) + " later"}
                        onClick={() => {
                          const next = [...lines];
                          [next[i], next[i + 1]] = [next[i + 1], next[i]];
                          editLines(next);
                        }}
                      >
                        Later
                      </button>
                      <button
                        aria-label={"Remove dialogue " + (i + 1)}
                        onClick={() =>
                          editLines(lines.filter((l) => l.id !== line.id))
                        }
                      >
                        Remove line
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                disabled={lines.length >= 32}
                onClick={() => {
                  let id = 1;
                  while (lines.some((l) => l.id === "line-" + id)) id++;
                  editLines([
                    ...lines,
                    {
                      id: "line-" + id,
                      speaker: "narrator",
                      text: "New dialogue line.",
                    },
                  ]);
                }}
              >
                Add dialogue line
              </button>
            </>
          ) : (
            <>
              <div className="content-fields">
                <label>
                  Contract name
                  <input
                    maxLength={80}
                    value={c.name}
                    onChange={(e) => editContract({ name: e.target.value })}
                  />
                </label>
                <label>
                  Contract subtitle
                  <input
                    maxLength={120}
                    value={c.subtitle}
                    onChange={(e) => editContract({ subtitle: e.target.value })}
                  />
                </label>
                <label className="full-field">
                  Contract description
                  <textarea
                    maxLength={2000}
                    rows={3}
                    value={c.description}
                    onChange={(e) =>
                      editContract({ description: e.target.value })
                    }
                  />
                </label>
                <label>
                  Objective label
                  <input
                    maxLength={160}
                    value={c.objective}
                    onChange={(e) =>
                      editContract({ objective: e.target.value })
                    }
                  />
                </label>
                <label>
                  Victory gold
                  <input
                    type="number"
                    min="0"
                    max="9999"
                    value={c.reward}
                    onChange={(e) =>
                      editContract({ reward: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Unlock prerequisite
                  <select
                    value={c.requires ?? ""}
                    onChange={(e) =>
                      editContract({
                        requires: e.target.value
                          ? (e.target.value as EncounterId)
                          : null,
                      })
                    }
                  >
                    <option value="">Open from the start</option>
                    {ENCOUNTER_IDS.filter((id) => id !== contract).map((id) => (
                      <option key={id} value={id}>
                        {draft.contracts[id].name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  First-clear item
                  <select
                    value={c.firstClearRelic ?? ""}
                    onChange={(e) => {
                      const next = { ...c };
                      if (e.target.value)
                        next.firstClearRelic = e.target.value as GearId;
                      else delete next.firstClearRelic;
                      editContract(next);
                      if (!e.target.value)
                        setDraft((p) => {
                          const clone = structuredClone(p);
                          delete clone.contracts[contract].firstClearRelic;
                          return clone;
                        });
                    }}
                  >
                    <option value="">None</option>
                    {Object.entries(rules?.gear ?? equipment).map(
                      ([id, item]) => (
                        <option key={id} value={id}>
                          {item.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  Victory JP per ally
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={draft.victoryJP}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        victoryJP: Number(e.target.value),
                      }))
                    }
                  />
                </label>
              </div>
              <details open>
                <summary>Test existing contract gates</summary>
                <p>
                  Choose cleared contracts for this isolated gate check. This
                  does not mark the project or a player company as completed.
                </p>
                <div className="completed-options">
                  {ENCOUNTER_IDS.map((id) => (
                    <label className="check-row" key={id}>
                      <input
                        type="checkbox"
                        checked={completed.includes(id)}
                        onChange={(e) =>
                          setCompleted((v) =>
                            e.target.checked
                              ? [...v, id]
                              : v.filter((x) => x !== id),
                          )
                        }
                      />
                      {id} cleared
                    </label>
                  ))}
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Contract</th>
                      <th>Requires</th>
                      <th>Gate</th>
                      <th>Gold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ENCOUNTER_IDS.map((id) => (
                      <tr key={id}>
                        <td>{draft.contracts[id].name}</td>
                        <td>{draft.contracts[id].requires ?? "None"}</td>
                        <td>
                          {contractOpen(company, id, draft.contracts)
                            ? "Open"
                            : "Locked"}
                        </td>
                        <td>{draft.contracts[id].reward}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
              <p>
                Gold and first-clear items use the real settlement function
                after a preview victory; JP uses the combat reward path.
                Objective text does not change the defeat-all rule. Job
                formulas, equipment catalogs and branching quests still require
                future tools.
              </p>
            </>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="actions">
        <button
          disabled={!!error || (!!source && !changed)}
          onClick={() => {
            if (apply(validateGameContent(draft, rules)))
              setMessage(
                "Existing game content applied. Save or export the project to keep it.",
              );
          }}
        >
          Apply game content
        </button>
        <button
          disabled={!changed}
          onClick={() => {
            setDraft(baseline);
            setMessage("Content draft discarded.");
          }}
        >
          Discard content draft
        </button>
      </div>
      <p role="status">{message}</p>
    </section>
  );
}
