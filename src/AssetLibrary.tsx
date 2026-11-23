import type { ValidationFocusRequest } from "./studio-validation";
import { ArtworkInspector } from "./ArtworkInspector";
import { AbilityEffectPreview } from "./AbilityEffectPreview";
import { PARTICLE_KINDS, type EffectStyle } from "./effect-style";
import { resolveEffectRecipe } from "./combat-effects";
import React, { useEffect, useState } from "react";
import { skills, baseSkillId, type SkillId, type BuiltinSkillId } from "./data";
import { SOUND_EVENTS, type SoundEvent } from "./studio-sfx";
import {
  nativeSources,
  validateAbilityCues,
  type AbilityCue,
  type AbilityCues,
} from "./studio-assets";
import type { LevelProject, ProjectEdit } from "./studio-project";
export function AssetLibrary({
  project,
  apply,
  onDirty,
  editSprite,
  blocked,
  openActor,
  openEditor,
  focusRequest,
}: {
  project: LevelProject;
  focusRequest?: ValidationFocusRequest;
  apply: (edits: ProjectEdit[]) => boolean;
  onDirty: (dirty: boolean) => void;
  editSprite: (id: string) => void;
  blocked: boolean;
  openActor: (id: string) => void;
  openEditor: (
    area:
      | "rules"
      | "content"
      | "terrain"
      | "game-audio"
      | "sounds"
      | "music"
      | "map",
  ) => void;
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
  const recipe = resolveEffectRecipe(effect, binding?.style);
  const changeBinding = (patch: Partial<AbilityCue>) =>
    setDraft({
      ...draft,
      [selected]: { effect, sound, ...binding, ...patch },
    });
  const changeStyle = (name: keyof EffectStyle, value: string | number) =>
    changeBinding({ style: { ...binding?.style, [name]: value } });
  let error = "";
  try {
    validateAbilityCues(draft, project.rules);
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid feedback.";
  }
  const sheets = nativeSources(project);
  return (
    <section aria-label="Asset library">
      <a href="#ability-feedback">Edit ability visuals and sound</a>
      <ArtworkInspector
        focusRequest={focusRequest}
        project={project}
        apply={apply}
        blocked={blocked}
        openActor={openActor}
        openEditor={openEditor}
      />
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
      <h2 id="ability-feedback">Ability visuals and sound</h2>
      <p>
        Edit each ability’s effect family, tint, size, timing and particles, and
        pair it with an editable sound-bank cue. Costs, range, damage and
        statuses keep their gameplay definitions. Misses retain the Miss cue.
        Sound cues are shared across abilities; edit their layers under Sound
        effects.
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
              changeBinding({ effect: e.target.value as BuiltinSkillId })
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
              changeBinding({ sound: e.target.value as SoundEvent })
            }
          >
            {SOUND_EVENTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <fieldset aria-label="Ability effect settings">
        <legend>Effect appearance and timing</legend>
        <div className="content-fields">
          <label>
            Effect tint
            <input
              type="text"
              maxLength={7}
              spellCheck={false}
              value={binding?.style?.tint ?? "#ffffff"}
              onChange={(e) => changeStyle("tint", e.target.value)}
            />
          </label>
          <label>
            Particle color
            <input
              type="text"
              maxLength={7}
              spellCheck={false}
              value={
                binding?.style?.particleColor ??
                "#" + recipe.color.toString(16).padStart(6, "0")
              }
              onChange={(e) => changeStyle("particleColor", e.target.value)}
            />
          </label>
          <label>
            Effect size (tiles)
            <input
              type="number"
              min="0.5"
              max="4"
              step="0.05"
              value={recipe.size}
              onChange={(e) => changeStyle("size", Number(e.target.value))}
            />
          </label>
          <label>
            Effect frame duration (ms)
            <input
              type="number"
              min="30"
              max="250"
              step="1"
              value={recipe.frameMs}
              onChange={(e) => changeStyle("frameMs", Number(e.target.value))}
            />
          </label>
          <label>
            Effect travel duration (ms)
            <input
              type="number"
              min="0"
              max="1500"
              step="1"
              value={recipe.travelMs}
              onChange={(e) => changeStyle("travelMs", Number(e.target.value))}
            />
          </label>
          <label>
            Effect opacity
            <input
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={recipe.opacity}
              onChange={(e) => changeStyle("opacity", Number(e.target.value))}
            />
          </label>
          <label>
            Particle motion
            <select
              value={recipe.particle}
              onChange={(e) => changeStyle("particle", e.target.value)}
            >
              {PARTICLE_KINDS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Particle density
            <input
              type="number"
              min="0"
              max="2"
              step="0.25"
              value={recipe.particles}
              onChange={(e) => changeStyle("particles", Number(e.target.value))}
            />
          </label>
        </div>
        <button
          onClick={() => setDraft({ ...draft, [selected]: { effect, sound } })}
        >
          Reset effect appearance
        </button>
      </fieldset>
      <AbilityEffectPreview
        family={effect}
        style={error ? undefined : binding?.style}
      />
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
