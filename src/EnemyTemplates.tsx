import { MISSION_PRESETS, type MissionPresetId } from "./mission-presets";
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
  applyEnemyTemplate,
  templateDifferences,
  TEMPLATE_FIELDS,
  TEMPLATE_FIELD_LABELS,
  type TemplateField,
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
    [preset, setPreset] = useState<MissionPresetId>(
      project.encounter ?? "shrine",
    ),
    [selected, setSelected] = useState(baseline.enemyTemplates?.[0]?.id ?? ""),
    [origin, setOrigin] = useState("sentinel"),
    [newId, setNewId] = useState("enemy-new-template"),
    [instanceId, setInstanceId] = useState("enemy-new-instance"),
    [x, setX] = useState(10),
    [z, setZ] = useState(5),
    [removeId, setRemoveId] = useState(""),
    [message, setMessage] = useState(""),
    [targets, setTargets] = useState<string[]>([]),
    [transferFields, setTransferFields] = useState<TemplateField[]>([
      "baseHp",
      "maxMp",
    ]);
  useEffect(() => {
    setDraft(baseline);
    setTargets([]);
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
  const appliedTemplate = baseline.enemyTemplates?.find(
    (t) => t.id === selected,
  );
  const transfer = useMemo(() => {
    if (!targets.length || !transferFields.length || !appliedTemplate)
      return { content: null, error: "" };
    try {
      return {
        content: applyEnemyTemplate(
          baseline,
          selected,
          targets,
          transferFields,
          project.rules,
        ),
        error: "",
      };
    } catch (e) {
      return {
        content: null,
        error: e instanceof Error ? e.message : "Invalid template update.",
      };
    }
  }, [
    baseline,
    selected,
    targets,
    transferFields,
    project.rules,
    appliedTemplate,
  ]);
  const changedTargets = transfer.content
    ? targets.filter((id) =>
        templateDifferences(
          baseline.actors.find((a) => a.id === id)!,
          appliedTemplate!,
        ).some((f) => transferFields.includes(f)),
      ).length
    : 0;
  const describe = (a: ActorSource, f: TemplateField): string => {
    if (f === "job" || f === "secondary") return jc[a[f]].name;
    if (f === "learned")
      return a.learned.map((id) => sc[id].name).join(", ") || "None";
    if (f === "jp")
      return (
        Object.entries(a.jp)
          .map(([id, n]) => `${jc[id as JobId].name}: ${n}`)
          .join(", ") || "None"
      );
    if (f === "equipment")
      return Object.values(a.equipment ?? emptyLoadout())
        .map((id) => (id ? gc[id as GearId].name : "None"))
        .join(" / ");
    return String(a[f]);
  };
  return (
    <section className="enemy-templates" aria-label="Enemy template editor">
      <p>
        Templates are reusable spawn snapshots. Template edits affect future
        spawns. Compare and explicitly update selected instances below, or edit
        individual instances under NPCs, dialogue & progression. The four
        company heroes remain fixed; each level supports up to twenty enemies
        and 32 templates.
      </p>
      <details>
        <summary>Playable mission presets</summary>
        <label>
          Mission preset
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as MissionPresetId)}
          >
            {MISSION_PRESETS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <p>{MISSION_PRESETS.find((m) => m.id === preset)!.summary}</p>
        <p>
          Loads balanced combat catalogs, map, actors, enemy templates, contract
          data and briefing. Preserves artwork, audio and project identity.
          Replaces current mission edits; Undo restores the previous source. The
          four original missions keep their maps, stats, progression and boss
          identities.
        </p>
        <div className="actions">
          <button
            disabled={blocked}
            onClick={() => apply([{ type: "mission-preset", preset }])}
          >
            Load mission preset
          </button>
          <a
            href={`${import.meta.env.BASE_URL}missions/${preset}.json`}
            download={`${preset}-mission.json`}
          >
            Download editable mission JSON
          </a>
        </div>
      </details>
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
      <section
        className="record-authoring"
        aria-label="Template comparison and updates"
      >
        <h2>Compare and update placed enemies</h2>
        <p>
          Choose an applied template above, then select enemies and fields to
          copy. Unchecked fields, stable IDs, teams, dialogue and map positions
          stay intact. This is a one-time update; future template edits do not
          propagate.
        </p>
        {!appliedTemplate ? (
          <p>
            Create and apply an enemy template to compare it with placed
            enemies.
          </p>
        ) : (
          <>
            <p>
              Applied template: {appliedTemplate.name} / {appliedTemplate.id}
            </p>
            <fieldset>
              <legend>Enemies to compare</legend>
              {enemies.map((a) => (
                <label key={a.id}>
                  <input
                    type="checkbox"
                    checked={targets.includes(a.id)}
                    onChange={(e) =>
                      setTargets(
                        e.target.checked
                          ? [...targets, a.id]
                          : targets.filter((id) => id !== a.id),
                      )
                    }
                  />
                  {a.name} / {a.id}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Fields to copy</legend>
              {TEMPLATE_FIELDS.map((f) => (
                <label key={f}>
                  <input
                    type="checkbox"
                    checked={transferFields.includes(f)}
                    onChange={(e) =>
                      setTransferFields(
                        e.target.checked
                          ? [...transferFields, f]
                          : transferFields.filter((v) => v !== f),
                      )
                    }
                  />
                  {TEMPLATE_FIELD_LABELS[f]}
                </label>
              ))}
            </fieldset>
            {targets.length > 0 && (
              <div
                className="template-comparison"
                role="region"
                aria-label="Template differences"
                tabIndex={0}
              >
                <table>
                  <caption>
                    Differences from {appliedTemplate.name}. Only checked fields
                    will be copied.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Enemy</th>
                      <th scope="col">Field</th>
                      <th scope="col">Placed value</th>
                      <th scope="col">Template value</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enemies
                      .filter((a) => targets.includes(a.id))
                      .map((a) => {
                        const differences = templateDifferences(
                          a,
                          appliedTemplate,
                        );
                        return differences.length ? (
                          differences.map((f) => (
                            <tr key={a.id + f}>
                              <th scope="row">
                                {a.name} / {a.id}
                              </th>
                              <td>{TEMPLATE_FIELD_LABELS[f]}</td>
                              <td>{describe(a, f)}</td>
                              <td>{describe(appliedTemplate, f)}</td>
                              <td>
                                {transferFields.includes(f) ? "Copy" : "Keep"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr key={a.id}>
                            <th scope="row">
                              {a.name} / {a.id}
                            </th>
                            <td colSpan={4}>All template fields match.</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
            {transfer.error && (
              <p role="alert">
                {transfer.error} Adjust the selected fields or loadouts; no
                instances have changed.
              </p>
            )}
            <p>
              {targets.length} {targets.length === 1 ? "enemy" : "enemies"}{" "}
              selected / {changedTargets} will change.{" "}
              {changed || blocked
                ? "Apply or discard drafts before updating instances."
                : "Review the differences before applying."}
            </p>
            <button
              disabled={
                blocked || changed || !transfer.content || changedTargets === 0
              }
              onClick={() => {
                if (
                  transfer.content &&
                  apply([{ type: "content", content: transfer.content }])
                )
                  setMessage(
                    `Updated ${changedTargets} enemy instances. Undo restores their previous fields.`,
                  );
              }}
            >
              Apply selected template fields
            </button>
          </>
        )}
      </section>
      <p role="status">{message}</p>
    </section>
  );
}
