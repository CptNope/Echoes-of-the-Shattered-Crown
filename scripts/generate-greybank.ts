import { mkdirSync, writeFileSync } from "node:fs";
import {
  createLevelProject,
  editProject,
  exportLevelProject,
} from "../src/studio-project";
const p = editProject(createLevelProject(), 0, [{ type: "greybank" }]);
p.id = "greybank-mission";
p.seed = 74319;
mkdirSync("public/missions", { recursive: true });
writeFileSync("public/missions/greybank.json", exportLevelProject(p));
console.log("Generated editable Greybank mission");
