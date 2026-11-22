import React, { useEffect, useState } from "react";
import { skills, baseSkillId, type SkillId, type BuiltinSkillId } from "./data";
import { SOUND_EVENTS, type SoundEvent } from "./studio-sfx";
import {
  nativeSources,
  validateAbilityCues,
  type AbilityCues,
} from "./studio-assets";
import type { LevelProject, ProjectEdit } from "./studio-project";
export function AssetLibrary({
  project,
  apply,
  onDirty,
  editSprite,
  blocked,
}: {
  project: LevelProject;
  apply: (edits: ProjectEdit[]) => boolean;
  onDirty: (dirty: boolean) => void;
  editSprite: (id: string) => void;
  blocked: boolean;
}) {
  const [draft, setDraft] = useState<AbilityCues>(project.abilityCues ?? {}),
    [selected, setSelected] = useState<SkillId>("strike");
  useEffect(() => setDraft(project.abilityCues ?? {}), [project.abilityCues]);
  const catalog = project.rules?.skills ?? skills,
    changed =
      JSON.stringify(draft) !== JSON.stringify(project.abilityCues ?? {});
  useEffect(() => onDirty(changed), [changed, onDirty]);
  useEffect(() => {
    if (!catalog[selected]) setSelected("strike");
  }, [catalog, selected]);
  const binding = draft[selected],
    effect = binding?.effect ?? baseSkillId(selected, catalog),
    sound =
      binding?.sound ??
      (catalog[selected]?.kind === "heal"
        ? "heal"
        : catalog[selected]?.kind === "buff"
          ? "buff"
          : "hit");
  let error = "";
  try {
    validateAbilityCues(draft, project.rules);
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid feedback.";
  }
  const sheets = nativeSources(project);
  return (
    <section aria-label="Asset library">
      <h2>Character sheet assignments</h2>
      <p>
        Keep up to 24 native sheet assignments. Each actor keeps independent
        pixels and timings; shared original images are stored once in local
        checkpoints. Unplaced assignments stay available when switching
        missions.
      </p>
      {sheets.length ? (
        <ul className="asset-assignments">
          {sheets.map((s) => (
            <li key={s.actorId}>
              <div>
                <strong>{s.actorId}</strong> / {s.job} / {s.width} by {s.height}{" "}
                / 32 frames / {s.enabled ? "Enabled" : "Disabled"}
              </div>
              <div className="actions">
                <button
                  disabled={blocked}
                  onClick={() => editSprite(s.actorId)}
                >
                  Edit sheet for {s.actorId}
                </button>
                <button
                  disabled={blocked}
                  onClick={() =>
                    apply([
                      {
                        type: "native-library",
                        sprites: sheets.map((a) =>
                          a.actorId === s.actorId
                            ? { ...a, enabled: !a.enabled }
                            : a,
                        ),
                      },
                    ])
                  }
                >
                  {s.enabled ? "Disable" : "Enable"} sheet for {s.actorId}
                </button>
                <button
                  disabled={blocked}
                  onClick={() =>
                    apply([
                      {
                        type: "native-library",
                        sprites: sheets.filter((a) => a.actorId !== s.actorId),
                      },
                    ])
                  }
                >
                  Remove sheet for {s.actorId}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No native sheets assigned. Add one from the Pixels editor.</p>
      )}
      <button disabled={blocked} onClick={() => editSprite("")}>
        Add character sheet
      </button>
      <h2>Ability visuals and sound</h2>
      <p>
        Bind an existing VFX family and an editable sound-bank cue to each
        ability. Costs, range, damage and statuses keep their gameplay
        definitions. Misses retain the Miss cue. Sound cues are shared across
        abilities; edit their layers under Sound effects.
      </p>
      <label>
        Feedback ability
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value as SkillId)}
        >
          {Object.values(catalog).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} / {s.id}
            </option>
          ))}
        </select>
      </label>
      <div className="content-fields">
        <label>
          Visual effect family
          <select
            value={effect}
            onChange={(e) =>
              setDraft({
                ...draft,
                [selected]: { effect: e.target.value as BuiltinSkillId, sound },
              })
            }
          >
            {Object.values(skills).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ability sound cue
          <select
            value={sound}
            onChange={(e) =>
              setDraft({
                ...draft,
                [selected]: { effect, sound: e.target.value as SoundEvent },
              })
            }
          >
            {SOUND_EVENTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <p>
        {binding
          ? "Explicit paired feedback binding"
          : "Automatic gameplay-derived feedback"}
        . Applied source works in isolated studio playtests.
      </p>
      <button
        onClick={() => {
          const next = { ...draft };
          delete next[selected];
          setDraft(next);
        }}
      >
        Use automatic feedback
      </button>
      {error && <p role="alert">{error}</p>}
      <div className="actions">
        <button
          disabled={!changed || !!error}
          onClick={() =>
            apply([
              {
                type: "ability-cues",
                cues: validateAbilityCues(draft, project.rules),
              },
            ])
          }
        >
          Apply ability feedback
        </button>
        <button
          disabled={!changed}
          onClick={() => setDraft(project.abilityCues ?? {})}
        >
          Discard feedback draft
        </button>
      </div>
    </section>
  );
}
