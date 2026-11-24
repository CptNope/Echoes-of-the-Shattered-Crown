import { GearArtEditor } from "./GearArtEditor";
import { ItemsEditor } from "./ItemsEditor";
import { ShopTrial } from "./ShopTrial";
import {
  items,
  sellValue,
  validateSupplies,
  type SupplyInventory,
} from "./items";
import { equipment as marketEquipment } from "./equipment";
import {
  createCatalogRecord,
  deleteCatalogRecord,
  recordReferences,
  type RecordSection,
} from "./studio-authoring";
import type { GameContent } from "./studio-content";
import { jobs as shippedJobs, skills as shippedSkills } from "./data";
import type { ValidationFocusRequest } from "./studio-validation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { gameRules, validateRules, type RuleCatalog } from "./studio-rules";
import type { Skill, SkillId, Job, JobId } from "./data";
import { canEquip, type Gear, GearId } from "./equipment";
import { createExpedition, purchase } from "./campaign";
export function RulesEditor({
  source,
  supplies,
  apply,
  onDirty,
  focusRequest,
  content,
}: {
  source: RuleCatalog | undefined;
  supplies?: SupplyInventory;
  content?: GameContent;
  focusRequest?: ValidationFocusRequest;
  apply: (s: RuleCatalog | null, stock?: SupplyInventory) => boolean;
  onDirty: (d: boolean) => void;
}) {
  const baselineSupplies = useMemo(() => supplies ?? {}, [supplies]);
  const [supplyDraft, setSupplyDraft] = useState(baselineSupplies);
  useEffect(() => setSupplyDraft(baselineSupplies), [baselineSupplies]);
  const [recordId, setRecordId] = useState("custom-new-record");
  const sectionRef = useRef<HTMLElement>(null);
  const baseline = useMemo(
      () => ({ ...(source ?? gameRules()), items: source?.items ?? items }),
      [source],
    ),
    [draft, setDraft] = useState<RuleCatalog>(baseline),
    [tab, setTab] = useState("skills"),
    [skillId, setSkillId] = useState<SkillId>("strike"),
    [jobId, setJobId] = useState<JobId>("vanguard"),
    [gearId, setGearId] = useState<GearId>("ironblade"),
    [message, setMessage] = useState(""),
    [gold, setGold] = useState(140);
  useEffect(() => {
    setDraft(baseline);
    if (!Object.hasOwn(baseline.skills, skillId)) setSkillId("strike");
    if (!Object.hasOwn(baseline.jobs, jobId)) setJobId("vanguard");
    if (!Object.hasOwn(baseline.gear, gearId)) setGearId("ironblade");
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
  const changed =
    JSON.stringify(draft) !== JSON.stringify(baseline) ||
    JSON.stringify(supplyDraft) !== JSON.stringify(baselineSupplies);
  useEffect(() => onDirty(changed), [changed, onDirty]);
  const error = useMemo(() => {
    try {
      validateRules(draft);
      validateSupplies(supplyDraft, draft.items);
      return "";
    } catch (e) {
      return e instanceof Error ? e.message : "Invalid catalog.";
    }
  }, [draft, supplyDraft]);
  const skill = draft.skills[skillId] ?? draft.skills.strike,
    job = draft.jobs[jobId] ?? draft.jobs.vanguard,
    gear = draft.gear[gearId] ?? draft.gear.ironblade;
  const selected = tab === "skills" ? skillId : tab === "jobs" ? jobId : gearId;
  const references = recordReferences(
    draft,
    tab as RecordSection,
    selected,
    content,
  );
  function selectRecord(id: string) {
    if (tab === "skills") setSkillId(id as SkillId);
    else if (tab === "jobs") setJobId(id as JobId);
    else setGearId(id as GearId);
  }
  function createRecord(copy: boolean) {
    try {
      const next = createCatalogRecord(
        draft,
        tab as RecordSection,
        recordId,
        copy ? selected : undefined,
      );
      setDraft(next);
      selectRecord(recordId);
      setMessage(
        "Custom draft created. Edit its fields, then Apply catalog overrides.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Creation failed.");
    }
  }

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
        {Object.keys(draft.jobs).length} classes ·{" "}
        {Object.keys(draft.skills).length} abilities ·{" "}
        {Object.keys(draft.gear).length} gear records ·{" "}
        {Object.keys(draft.items ?? items).length} item records. Custom records
        use stable IDs and shipped mechanics/art archetypes.
      </p>
      <button
        onClick={() => {
          setDraft({
            ...draft,
            gear: { ...structuredClone(marketEquipment), ...draft.gear },
          });
          setMessage(
            "Current shop stock added to the draft; existing overrides are kept.",
          );
        }}
      >
        Add current shop stock
      </button>
      <div className="pixel-tools" role="group" aria-label="Catalog sections">
        {[
          ["skills", "Abilities"],
          ["gear", "Gear"],
          ["jobs", "Jobs"],
          ["items", "Items & supplies"],
        ].map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <div
        hidden={tab === "items"}
        className="record-authoring"
        aria-label="Record creation"
      >
        <label>
          New record ID
          <input
            value={recordId}
            maxLength={47}
            onChange={(e) => setRecordId(e.target.value)}
          />
        </label>
        <div className="actions">
          <button onClick={() => createRecord(false)}>Create new record</button>
          <button onClick={() => createRecord(true)}>
            Duplicate selected record
          </button>
          <button
            disabled={
              !selected.startsWith("custom-") ||
              references.length > 0 ||
              (tab === "gear" && Object.hasOwn(marketEquipment, selected))
            }
            onClick={() => {
              try {
                setDraft(
                  deleteCatalogRecord(
                    draft,
                    tab as RecordSection,
                    selected,
                    content,
                  ),
                );
                selectRecord(
                  tab === "skills"
                    ? "strike"
                    : tab === "jobs"
                      ? "vanguard"
                      : "ironblade",
                );
                setMessage(
                  "Custom record removed from the draft. Apply to commit.",
                );
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Delete failed.");
              }
            }}
          >
            Delete custom record
          </button>
        </div>
        <p>
          IDs stay fixed after creation; names remain editable. Delete is
          available only when no class, actor, template, proficiency or reward
          references this record.
        </p>
        <details>
          <summary>Record references ({references.length})</summary>
          {references.length ? (
            <ul>
              {references.map((ref, i) => (
                <li key={i}>{ref}</li>
              ))}
            </ul>
          ) : (
            <p>No current references.</p>
          )}
        </details>
      </div>
      {tab === "items" ? (
        <ItemsEditor
          catalog={draft.items ?? items}
          change={(table) => setDraft({ ...draft, items: table })}
          supplies={supplyDraft}
          changeSupplies={setSupplyDraft}
        />
      ) : tab === "skills" ? (
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
            {skillId.startsWith("custom-") && (
              <label>
                Ability mechanics and VFX base
                <select
                  value={skill.baseSkill}
                  onChange={(e) =>
                    editSkill({ baseSkill: e.target.value as any })
                  }
                >
                  {Object.values(shippedSkills).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
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
          <GearArtEditor
            key={gear.id}
            item={gear}
            change={(icon) => {
              const next = { ...gear };
              if (icon) next.icon = icon;
              else delete next.icon;
              setDraft((p) => ({ ...p, gear: { ...p.gear, [gear.id]: next } }));
            }}
          />
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
            <label>
              Gear sell price
              <input
                type="number"
                min="0"
                max={gear.price}
                value={sellValue(gear)}
                disabled={!!gear.rewardOnly}
                onChange={(e) =>
                  editGear({ sellPrice: Number(e.target.value) })
                }
              />
            </label>
            <button
              disabled={gear.sellPrice === undefined}
              onClick={() =>
                setDraft((p) => {
                  const next = structuredClone(p);
                  delete next.gear[gearId].sellPrice;
                  return next;
                })
              }
            >
              Use automatic gear resale
            </button>
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
            {jobId.startsWith("custom-") && (
              <label>
                Class archetype and sprite
                <select
                  value={job.baseJob}
                  onChange={(e) => editJob({ baseJob: e.target.value as any })}
                >
                  {Object.values(shippedJobs).map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
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
      <ShopTrial rules={draft} supplies={supplyDraft} valid={!error} />
      <div className="actions">
        <button
          disabled={!!error || (!!source && !changed)}
          onClick={() => {
            if (
              apply(
                validateRules(draft),
                validateSupplies(supplyDraft, draft.items),
              )
            )
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
            setSupplyDraft(baselineSupplies);
            setMessage("Catalog draft discarded.");
          }}
        >
          Discard catalog draft
        </button>
        <button
          disabled={!source || changed}
          onClick={() => {
            if (
              apply(
                null,
                Object.fromEntries(
                  Object.entries(supplyDraft).filter(([id]) =>
                    Object.hasOwn(items, id),
                  ),
                ),
              )
            )
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
        that item first. Custom IDs are supported; arbitrary scripts, new art
        programs and complete-game packaging remain future work.
      </p>
    </section>
  );
}
