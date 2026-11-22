import React, { useEffect, useMemo, useState } from "react";
import {
  gameContent,
  validateGameContent,
  type ActorSource,
} from "./studio-content";
import {
  createEnemyTemplate,
  spawnEnemy,
  removeEnemy,
} from "./studio-authoring";
import { jobs, skills, type JobId } from "./data";
import { equipment, canEquip, emptyLoadout, type GearId } from "./equipment";
import type { LevelProject, ProjectEdit } from "./studio-project";
export function EnemyTemplates({
  project,
  apply,
  onDirty,
  blocked,
}: {
  project: LevelProject;
  apply: (edits: ProjectEdit[]) => boolean;
  onDirty: (dirty: boolean) => void;
  blocked: boolean;
}) {
  const baseline = useMemo(
    () => project.content ?? gameContent(project.encounter),
    [project.content, project.encounter],
  );
  const [draft, setDraft] = useState(baseline),
    [selected, setSelected] = useState(baseline.enemyTemplates?.[0]?.id ?? ""),
    [origin, setOrigin] = useState("sentinel"),
    [newId, setNewId] = useState("enemy-new-template"),
    [instanceId, setInstanceId] = useState("enemy-new-instance"),
    [x, setX] = useState(10),
    [z, setZ] = useState(5),
    [removeId, setRemoveId] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    setDraft(baseline);
    setSelected((old) =>
      baseline.enemyTemplates?.some((t) => t.id === old)
        ? old
        : (baseline.enemyTemplates?.[0]?.id ?? ""),
    );
    if (!baseline.actors.some((a) => a.id === origin))
      setOrigin(baseline.actors[0].id);
    if (!baseline.actors.some((a) => a.id === removeId)) setRemoveId("");
  }, [baseline]);
  const changed = JSON.stringify(draft) !== JSON.stringify(baseline);
  useEffect(() => onDirty(changed), [changed, onDirty]);
  const template = draft.enemyTemplates?.find((t) => t.id === selected),
    jc = project.rules?.jobs ?? jobs,
    sc = project.rules?.skills ?? skills,
    gc = project.rules?.gear ?? equipment;
  const error = useMemo(() => {
    try {
      validateGameContent(draft, project.rules);
      return "";
    } catch (e) {
      return e instanceof Error ? e.message : "Invalid template source.";
    }
  }, [draft, project.rules]);
  function attempt(action: () => void) {
    try {
      action();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Operation failed.");
    }
  }
  function patch(patch: Partial<ActorSource>) {
    setDraft((p) => ({
      ...p,
      enemyTemplates: p.enemyTemplates?.map((t) =>
        t.id === selected ? { ...t, ...patch } : t,
      ),
    }));
  }
  const enemies = baseline.actors.filter(
    (a) => !["sera", "ilya", "corin", "mae"].includes(a.id),
  );
  return (
    <section aria-label="Enemy template editor">
      <p>
        Templates are reusable spawn snapshots. Template edits affect future
        spawns; edit existing instances under Characters and NPCs. The four
        company heroes remain fixed; each level supports up to twenty enemies
        and 32 templates.
      </p>
      <details>
        <summary>Guided Saltglass expansion</summary>
        <p>
          Creates Tidewarden, four abilities, six gear pieces and three enemy
          templates, and replaces the level/active roster with a playable 16×12
          encounter in the causeway contract slot. Existing art/audio stay in
          the project. Undo restores the previous source.
        </p>
        <button
          disabled={blocked}
          onClick={() => apply([{ type: "expansion" }])}
        >
          Build Saltglass Crossing
        </button>
      </details>
      <div className="record-authoring">
        <label>
          Template copy source
          <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
            {[...draft.actors, ...(draft.enemyTemplates ?? [])].map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          New template ID
          <input
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            maxLength={62}
          />
        </label>
        <button
          onClick={() =>
            attempt(() => {
              setDraft(
                createEnemyTemplate(draft, origin, newId, project.rules),
              );
              setSelected(newId);
              setMessage(
                "Template draft created. Apply template edits before spawning.",
              );
            })
          }
        >
          Create enemy template
        </button>
      </div>
      {template ? (
        <>
          <label>
            Existing enemy template
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {draft.enemyTemplates?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.id}
                </option>
              ))}
            </select>
          </label>
          <div className="content-fields">
            <label>
              Template name
              <input
                value={template.name}
                onChange={(e) => patch({ name: e.target.value })}
                maxLength={80}
              />
            </label>
            {(["job", "secondary"] as const).map((field) => (
              <label key={field}>
                {field === "job"
                  ? "Template primary job"
                  : "Template secondary job"}
                <select
                  value={template[field]}
                  onChange={(e) => patch({ [field]: e.target.value as JobId })}
                >
                  {Object.values(jc).map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              Template health
              <input
                type="number"
                min={1}
                max={999}
                value={template.baseHp}
                onChange={(e) => patch({ baseHp: Number(e.target.value) })}
              />
            </label>
            <label>
              Template energy
              <input
                type="number"
                min={0}
                max={999}
                value={template.maxMp}
                onChange={(e) => patch({ maxMp: Number(e.target.value) })}
              />
            </label>
            {(["weapon", "armor", "relic"] as const).map((slot) => (
              <label key={slot}>
                Template {slot}
                <select
                  value={template.equipment?.[slot] ?? ""}
                  onChange={(e) =>
                    patch({
                      equipment: {
                        ...(template.equipment ?? emptyLoadout()),
                        [slot]: e.target.value || null,
                      },
                    })
                  }
                >
                  <option value="">None</option>
                  {Object.values(gc)
                    .filter((g) => g.slot === slot)
                    .map((g) => (
                      <option
                        key={g.id}
                        value={g.id}
                        disabled={!canEquip(template.job, g.id, gc)}
                      >
                        {g.name}
                      </option>
                    ))}
                </select>
              </label>
            ))}
          </div>
          <fieldset>
            <legend>Template learned abilities</legend>
            {Object.values(sc).map(({ id }) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={template.learned.includes(id)}
                  onChange={(e) =>
                    patch({
                      learned: e.target.checked
                        ? [...template.learned, id]
                        : template.learned.filter((s) => s !== id),
                    })
                  }
                />
                {sc[id].name}
              </label>
            ))}
          </fieldset>
          <button
            onClick={() => {
              setDraft({
                ...draft,
                enemyTemplates: draft.enemyTemplates?.filter(
                  (t) => t.id !== selected,
                ),
              });
              setSelected(
                draft.enemyTemplates?.find((t) => t.id !== selected)?.id ?? "",
              );
            }}
          >
            Delete template draft
          </button>
        </>
      ) : (
        <p>
          No enemy template selected. Copy an actor to create one, or build the
          guided expansion.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="actions">
        <button
          disabled={!changed || !!error}
          onClick={() => {
            if (
              apply([
                {
                  type: "content",
                  content: validateGameContent(draft, project.rules),
                },
              ])
            )
              setMessage("Enemy templates applied.");
          }}
        >
          Apply template edits
        </button>
        <button disabled={!changed} onClick={() => setDraft(baseline)}>
          Discard template draft
        </button>
      </div>
      <section className="record-authoring" aria-label="Enemy spawning">
        <h2>Spawn from applied template</h2>
        <label>
          Instance ID
          <input
            value={instanceId}
            onChange={(e) => setInstanceId(e.target.value)}
            maxLength={62}
          />
        </label>
        <div className="map-navigation">
          <label>
            Spawn column
            <input
              type="number"
              min={0}
              max={31}
              value={x}
              onChange={(e) => setX(Number(e.target.value))}
            />
          </label>
          <label>
            Spawn row
            <input
              type="number"
              min={0}
              max={31}
              value={z}
              onChange={(e) => setZ(Number(e.target.value))}
            />
          </label>
          <button
            disabled={
              blocked ||
              changed ||
              !baseline.enemyTemplates?.some((t) => t.id === selected)
            }
            onClick={() =>
              attempt(() => {
                const result = spawnEnemy(
                  baseline,
                  project.placements,
                  selected,
                  instanceId,
                  x,
                  z,
                  project.rules,
                );
                if (apply([{ type: "roster", ...result }]))
                  setMessage(
                    "Enemy instance spawned. Its snapshot can be edited under Characters and NPCs.",
                  );
              })
            }
          >
            Spawn enemy
          </button>
        </div>
        <label>
          Existing enemy instance
          <select
            value={removeId}
            onChange={(e) => setRemoveId(e.target.value)}
          >
            <option value="">Choose enemy</option>
            {enemies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.id}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={blocked || changed || !removeId}
          onClick={() =>
            attempt(() => {
              if (
                apply([
                  {
                    type: "roster",
                    ...removeEnemy(
                      baseline,
                      project.placements,
                      removeId,
                      project.rules,
                    ),
                  },
                ])
              ) {
                setRemoveId("");
                setMessage(
                  "Enemy removed. Dialogue references must be cleared before removal.",
                );
              }
            })
          }
        >
          Remove enemy instance
        </button>
      </section>
      <p role="status">{message}</p>
    </section>
  );
}
