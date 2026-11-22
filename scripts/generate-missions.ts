import { mkdirSync, writeFileSync } from "node:fs";
import {
  createLevelProject,
  editProject,
  exportLevelProject,
} from "../src/studio-project";
import { MISSION_PRESETS } from "../src/mission-presets";
mkdirSync("public/missions", { recursive: true });
for (const preset of MISSION_PRESETS) {
  const p = editProject(createLevelProject(), 0, [
    { type: "mission-preset", preset: preset.id },
  ]);
  p.id = `${preset.id}-mission`;
  p.seed = 74319;
  writeFileSync(`public/missions/${preset.id}.json`, exportLevelProject(p));
}
console.log(`Generated ${MISSION_PRESETS.length} editable mission presets`);
