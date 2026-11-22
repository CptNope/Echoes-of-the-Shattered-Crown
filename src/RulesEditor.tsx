import type { ValidationFocusRequest } from "./studio-validation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { gameRules, validateRules, type RuleCatalog } from "./studio-rules";
import type { Skill, SkillId, Job, JobId } from "./data";
import { canEquip, type Gear, GearId } from "./equipment";
import { createExpedition, purchase } from "./campaign";
export function RulesEditor({
  source,
  apply,
  onDirty,
  focusRequest,
}: {
  source: RuleCatalog | undefined;
  focusRequest?: ValidationFocusRequest;
  apply: (s: RuleCatalog | null) => boolean;
  onDirty: (d: boolean) => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const baseline = useMemo(() => source ?? gameRules(), [source]),
    [draft, setDraft] = useState(baseline),
    [tab, setTab] = useState("skills"),
    [skillId, setSkillId] = useState<SkillId>("strike"),
    [jobId, setJobId] = useState<JobId>("vanguard"),
    [gearId, setGearId] = useState<GearId>("ironblade"),
    [message, setMessage] = useState(""),
    [gold, setGold] = useState(140);
  useEffect(() => {
    setDraft(baseline);
  }, [baseline]);
  useEffect(() => {
    const target = focusRequest?.target;
    if (target?.area !== "rules") return;
    setTab(target.section);
    if (target.section === "skills" && Object.hasOwn(draft.skills, target.id))
      setSkillId(target.id as SkillId);
    if (target.section === "jobs" && Object.hasOwn(draft.jobs, target.id))
      setJobId(target.id as JobId);
    if (target.section === "gear" && Object.hasOwn(draft.gear, target.id))
      setGearId(target.id as GearId);
  }, [focusRequest]);
  useEffect(() => {
    if (focusRequest?.target.area === "rules")
      sectionRef.current?.querySelector<HTMLSelectElement>("select")?.focus();
  }, [focusRequest, tab, skillId, jobId, gearId]);
  const changed = JSON.stringify(draft) !== JSON.stringify(baseline);
  useEffect(() => onDirty(changed), [changed, onDirty]);
  const error = useMemo(() => {
    try {
      validateRules(draft);
      return "";
    } catch (e) {
      return e instanceof Error ? e.message : "Invalid catalog.";
    }
  }, [draft]);
  const skill = draft.skills[skillId],
    job = draft.jobs[jobId],
    gear = draft.gear[gearId];
  function editSkill(patch: Partial<Skill>) {
    setDraft((p) => ({
      ...p,
      skills: { ...p.skills, [skillId]: { ...p.skills[skillId], ...patch } },
    }));
  }
  function editJob(patch: Partial<Job>) {
    setDraft((p) => ({
      ...p,
      jobs: { ...p.jobs, [jobId]: { ...p.jobs[jobId], ...patch } },
    }));
  }
  function editGear(patch: Partial<Gear>) {
    setDraft((p) => ({
      ...p,
      gear: { ...p.gear, [gearId]: { ...p.gear[gearId], ...patch } },
    }));
  }
  return (
    <section
      ref={sectionRef}
      className="catalog-editor"
      aria-label="Gear abilities and job catalog editor"
    >
      <p className="source-caption">
        Source: all 13 shipped abilities, 8 jobs and 10 gear entries. Applied
        definitions drive combat, movement, AI, learning, gear bonuses and shop
        prices through the shared runtime.
      </p>
      <div className="pixel-tools" role="group" aria-label="Catalog sections">
        {[
          ["skills", "Abilities"],
          ["gear", "Gear"],
          ["jobs", "Jobs"],
        ].map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "skills" ? (
        <>
          <label className="contract-selector">
            Existing ability
            <select
              value={skillId}
              onChange={(e) => setSkillId(e.target.value as SkillId)}
            >
              {Object.values(draft.skills).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.id}
                </option>
              ))}
            </select>
          </label>
          <div className="content-fields">
            <label>
              Ability name
              <input
                maxLength={80}
                value={skill.name}
                onChange={(e) => editSkill({ name: e.target.value })}
              />
            </label>
            <label>
              Ability kind
              <select
                value={skill.kind}
                onChange={(e) =>
                  editSkill({ kind: e.target.value as Skill["kind"] })
                }
              >
                {["damage", "heal", "buff"].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            {(
              [
                ["cost", "Energy cost", 0, 99],
                ["range", "Target range", 0, 16],
                ["power", "Ability power", 0, 250],
                ["radius", "Area radius", 0, 4],
              ] as const
            ).map(([key, label, min, max]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={skill[key]}
                  onChange={(e) => editSkill({ [key]: Number(e.target.value) })}
                />
              </label>
            ))}
            <label>
              Element
              <select
                value={skill.element}
                onChange={(e) =>
                  editSkill({ element: e.target.value as Skill["element"] })
                }
              >
                {["physical", "fire", "ice", "lightning", "spirit"].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label>
              Existing effect
              <select
                value={skill.effect ?? ""}
                onChange={(e) =>
                  setDraft((p) => {
                    const next = structuredClone(p);
                    if (e.target.value)
                      next.skills[skillId].effect = e.target
                        .value as Skill["effect"];
                    else delete next.skills[skillId].effect;
                    return next;
                  })
                }
              >
                <option value="">None</option>
                {["consumeExposure", "aegis", "soak", "delay"].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="full-field">
              Ability description
              <textarea
                rows={3}
                maxLength={2000}
                value={skill.description}
                onChange={(e) => editSkill({ description: e.target.value })}
              />
            </label>
          </div>
          <p>
            Existing effect names select implemented behavior. This edits data
            within the current mechanics; new effect programs, formulas and VFX
            bindings require future tools. Strike and Concord retain their
            built-in availability and momentum conventions.
          </p>
        </>
      ) : tab === "gear" ? (
        <>
          <label className="contract-selector">
            Existing gear
            <select
              value={gearId}
              onChange={(e) => setGearId(e.target.value as GearId)}
            >
              {Object.values(draft.gear).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} · {g.id}
                </option>
              ))}
            </select>
          </label>
          <div className="content-fields">
            <label>
              Gear name
              <input
                maxLength={80}
                value={gear.name}
                onChange={(e) => editGear({ name: e.target.value })}
              />
            </label>
            <label>
              Equipment slot
              <select
                value={gear.slot}
                onChange={(e) =>
                  editGear({ slot: e.target.value as Gear["slot"] })
                }
              >
                {["weapon", "armor", "relic"].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label>
              Shop price
              <input
                type="number"
                min="0"
                max="9999"
                value={gear.price}
                onChange={(e) => editGear({ price: Number(e.target.value) })}
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={!!gear.rewardOnly}
                onChange={(e) => editGear({ rewardOnly: e.target.checked })}
              />
              Reward only
            </label>
            {(["attack", "armor", "magic", "speed", "move", "hp"] as const).map(
              (stat) => (
                <label key={stat}>
                  {"Gear " + stat + " bonus"}
                  <input
                    type="number"
                    min={stat === "hp" ? -100 : stat === "move" ? -8 : -99}
                    max={stat === "hp" ? 500 : stat === "move" ? 8 : 99}
                    value={gear.bonuses[stat] ?? 0}
                    onChange={(e) => {
                      const bonuses = { ...gear.bonuses },
                        n = Number(e.target.value);
                      if (n === 0) delete bonuses[stat];
                      else bonuses[stat] = n;
                      editGear({ bonuses });
                    }}
                  />
                </label>
              ),
            )}
            <label className="full-field">
              Gear description
              <textarea
                rows={3}
                maxLength={2000}
                value={gear.description}
                onChange={(e) => editGear({ description: e.target.value })}
              />
            </label>
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={gear.jobs === undefined}
              onChange={(e) =>
                setDraft((p) => {
                  const next = structuredClone(p);
                  if (e.target.checked) delete next.gear[gearId].jobs;
                  else next.gear[gearId].jobs = [];
                  return next;
                })
              }
            />
            Allow every job
          </label>
          {gear.jobs !== undefined && (
            <div className="completed-options">
              {Object.values(draft.jobs).map((j) => (
                <label className="check-row" key={j.id}>
                  <input
                    type="checkbox"
                    checked={gear.jobs!.includes(j.id)}
                    onChange={(e) =>
                      editGear({
                        jobs: e.target.checked
                          ? [...gear.jobs!, j.id]
                          : gear.jobs!.filter((id) => id !== j.id),
                      })
                    }
                  />
                  {j.name}
                </label>
              ))}
            </div>
          )}
          <details>
            <summary>Try the real shop purchase function</summary>
            <p>
              Runs an isolated company fixture with this draft catalog.
              Inventory and gold here are a test result, not a saved player or
              project economy.
            </p>
            <label>
              Trial starting gold
              <input
                type="number"
                min="0"
                max="9999"
                value={gold}
                onChange={(e) => setGold(Number(e.target.value))}
              />
            </label>
            <button
              disabled={
                !!error || !Number.isInteger(gold) || gold < 0 || gold > 9999
              }
              onClick={() => {
                const game = createExpedition();
                game.battle.rules = validateRules(draft);
                game.company.gold = gold;
                for (const member of game.company.members)
                  for (const slot of ["weapon", "armor", "relic"] as const) {
                    const id = member.equipment[slot];
                    if (
                      id &&
                      (draft.gear[id].slot !== slot ||
                        !canEquip(member.job, id, draft.gear))
                    )
                      member.equipment[slot] = null;
                  }
                const next = purchase(game, gearId);
                setMessage(
                  next === game
                    ? "Purchase rejected by the real shop rules."
                    : "Purchase result: " +
                        next.company.gold +
                        " gold remaining; " +
                        next.company.inventory[gearId] +
                        " owned.",
                );
              }}
            >
              Try gear purchase
            </button>
          </details>
        </>
      ) : (
        <>
          <label className="contract-selector">
            Existing job
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value as JobId)}
            >
              {Object.values(draft.jobs).map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name} · {j.id}
                </option>
              ))}
            </select>
          </label>
          <div className="content-fields">
            <label>
              Job name
              <input
                value={job.name}
                maxLength={80}
                onChange={(e) => editJob({ name: e.target.value })}
              />
            </label>
            <label>
              Job role
              <input
                value={job.role}
                maxLength={160}
                onChange={(e) => editJob({ role: e.target.value })}
              />
            </label>
            <label>
              Job accent color
              <input
                type="color"
                value={job.color}
                onChange={(e) => editJob({ color: e.target.value })}
              />
            </label>
            {(["move", "speed", "attack", "armor", "magic"] as const).map(
              (stat) => (
                <label key={stat}>
                  {"Job " + stat}
                  <input
                    type="number"
                    min={stat === "move" || stat === "speed" ? 1 : 0}
                    max={stat === "move" ? 8 : 99}
                    value={job[stat]}
                    onChange={(e) =>
                      editJob({ [stat]: Number(e.target.value) })
                    }
                  />
                </label>
              ),
            )}
          </div>
          <h2>Native abilities</h2>
          <div className="completed-options">
            {Object.values(draft.skills).map((s) => (
              <label className="check-row" key={s.id}>
                <input
                  type="checkbox"
                  checked={job.skills.includes(s.id)}
                  onChange={(e) =>
                    editJob({
                      skills: e.target.checked
                        ? [...job.skills, s.id]
                        : job.skills.filter((id) => id !== s.id),
                    })
                  }
                />
                {s.name}
              </label>
            ))}
          </div>
          <h2>Job prerequisites</h2>
          <div className="content-fields">
            {Object.values(draft.jobs)
              .filter((j) => j.id !== jobId)
              .map((j) => (
                <label key={j.id}>
                  {j.name + " required level (0 = none)"}
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={job.requires[j.id] ?? 0}
                    onChange={(e) => {
                      const requires = { ...job.requires },
                        n = Number(e.target.value);
                      if (n === 0) delete requires[j.id];
                      else requires[j.id] = n;
                      editJob({ requires });
                    }}
                  />
                </label>
              ))}
          </div>
          <p>
            Prerequisites use the real job-unlock rule. Cycles and missing
            references reject. Job-level curves and support formulas still use
            the current game mechanics.
          </p>
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
            if (apply(validateRules(draft)))
              setMessage(
                "Catalog overrides applied. Playtest the same project revision to use them.",
              );
          }}
        >
          Apply catalog overrides
        </button>
        <button
          disabled={!changed}
          onClick={() => {
            setDraft(baseline);
            setMessage("Catalog draft discarded.");
          }}
        >
          Discard catalog draft
        </button>
        <button
          disabled={!source || changed}
          onClick={() => {
            if (apply(null))
              setMessage(
                "Catalog overrides removed. Game defaults are active.",
              );
          }}
        >
          Use shipped catalog defaults
        </button>
      </div>
      <p role="status">{message}</p>
      <p>
        Stable IDs and existing animation bindings are preserved. Changing a
        gear slot/proficiency can conflict with a current actor loadout; unequip
        that item first. New IDs, arbitrary scripts and complete-game packaging
        remain future work.
      </p>
    </section>
  );
}
