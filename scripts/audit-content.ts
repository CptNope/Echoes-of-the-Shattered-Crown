import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { MISSION_PRESETS } from "../src/mission-presets";
import {
  createLevelProject,
  editProject,
  parseLevelProject,
  exportLevelProject,
  compileLevelProject,
} from "../src/studio-project";
import { analyzeProject } from "../src/studio-validation";
import { projectArtwork } from "../src/artwork-sync";
import { baseSkillId } from "../src/data";
import { resolveEffectRecipe } from "../src/combat-effects";
import { CHARACTER_ART } from "../src/character-art";
const manifest = JSON.parse(
  readFileSync("public/art/animations/manifest.json", "utf8"),
);
assert.deepEqual(
  Object.keys(manifest.sheets).sort(),
  Object.keys(CHARACTER_ART).sort(),
);
const missions = MISSION_PRESETS.map((preset) => {
  const p = editProject(createLevelProject(), 0, [
    { type: "mission-preset", preset: preset.id },
  ]);
  p.id = preset.id + "-mission";
  assert.deepEqual(
    parseLevelProject(
      readFileSync(`public/missions/${preset.id}.json`, "utf8"),
    ),
    p,
  );
  const validation = analyzeProject(p);
  assert.equal(validation.errors, 0, preset.id);
  assert.equal(validation.warnings, 0, preset.id);
  const battle = compileLevelProject(p),
    rows = projectArtwork(p);
  assert.deepEqual(
    rows.map((r) => r.actor.id),
    battle.units.map((u) => u.id),
  );
  for (const row of rows) {
    assert.equal(row.art.kind, "class");
    assert(manifest.sheets[row.art.artId], row.actor.name);
  }
  assert.deepEqual(parseLevelProject(exportLevelProject(p)), p);
  return {
    id: preset.id,
    name: p.name,
    dimensions: p.dimensions,
    tiles: p.tiles.length,
    actors: rows.length,
    enemyTemplates: p.content!.enemyTemplates!.length,
    jobs: Object.keys(p.rules!.jobs).length,
    abilities: Object.keys(p.rules!.skills).length,
    gear: Object.keys(p.rules!.gear).length,
    items: Object.keys(p.rules!.items ?? {}).length,
    startingSupplies: p.supplies ?? {},
    briefingLines: p.content!.dialogue[p.encounter!].length,
    abilityFeedback: Object.values(p.rules!.skills).map((skill) => {
      const cue = p.abilityCues?.[skill.id],
        family = cue?.effect ?? baseSkillId(skill.id, p.rules!.skills);
      const recipe = resolveEffectRecipe(family, cue?.style);
      return {
        id: skill.id,
        family,
        atlas: recipe.atlas,
        frames: 8,
        editable: true,
        appearanceOverride: !!cue?.style,
      };
    }),
    actorArtwork: rows.map((r) => ({
      actor: r.actor.id,
      name: r.actor.name,
      job: r.actor.job,
      sheet: r.art.artId,
      editable: true,
    })),
    errors: validation.errors,
    warnings: validation.warnings,
  };
});
const report = {
  version: 1,
  scope:
    "Canonical studio projects; isolated playtests do not modify main-campaign saves",
  missionCount: missions.length,
  sheetCount: Object.keys(manifest.sheets).length,
  frameCount: Object.keys(manifest.sheets).length * 32,
  editorDomains: [
    "terrain and collision",
    "actor placement and loadouts",
    "classes abilities and gear",
    "consumable definitions, prices and starting supplies",
    "isolated project buy and sell trials",
    "enemy templates",
    "linear briefing and contract rewards",
    "native sprite pixels and timing",
    "indexed sprite pixels and timing",
    "terrain palettes and top textures",
    "original procedural game score",
    "layered sound cues",
    "music pattern",
    "ability VFX family, tint, scale, timing, particles and sound bindings",
  ],
  notVisualEditors: [
    "scenery geometry",
    "VFX bitmap atlases",
    "sampled audio",
    "full campaign packaging",
  ],
  missions,
};
const text = JSON.stringify(report, null, 2) + "\n",
  path = "docs/CONTENT_SYNC_REPORT.json";
if (process.argv.includes("--check"))
  assert.equal(
    readFileSync(path, "utf8"),
    text,
    "Content synchronization report is stale; run npm run content:audit",
  );
else writeFileSync(path, text);
console.log(
  `Verified ${report.missionCount} missions, ${report.sheetCount} editable class sheets and ${report.frameCount} frames; all canonical sources agree`,
);
