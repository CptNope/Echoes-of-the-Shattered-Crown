import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
const p = JSON.parse(
  await readFile("docs/studio/specs/studio-plan.json", "utf8"),
);
assert.equal(p.format, "echoes-studio-design-plan");
assert.equal(p.version, 1);
assert.equal(p.status, "proposal");
assert.equal(p.editorImplemented, false);
assert.equal(p.runtimeCompatible, false);
const ids = (rows, label) => {
  const set = new Set(rows.map((r) => r.id));
  assert.equal(set.size, rows.length, label + " duplicate IDs");
  return set;
};
const req = ids(p.requirements, "requirement"),
  work = ids(p.workItems, "studio item"),
  stage = ids(p.stages, "stage"),
  artifact = ids(p.artifactProfiles, "artifact"),
  cases = ids(p.acceptanceCases, "acceptance"),
  decisions = ids(p.decisions, "decision");
assert.equal(req.size, 24);
assert.equal(work.size, 80);
assert.equal(stage.size, 10);
assert.equal(artifact.size, 6);
assert.equal(cases.size, 32);
assert.equal(decisions.size, 8);
assert.equal(p.documents.length, 8);
assert(p.decisions.every((d) => d.status === "open"));
const old = new Map();
for (const line of (await readFile("docs/roadmap/BACKLOG.md", "utf8")).split(
  /\r?\n/,
)) {
  const m = line.match(/^\| ([A-Z]{2,3}-\d{2}) \|/);
  if (!m) continue;
  const cells = line
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());
  old.set(m[1], cells[3] === "—" ? [] : cells[3].split(", "));
}
const all = new Map(old),
  workById = new Map(p.workItems.map((w) => [w.id, w])),
  coveredByWork = new Set(),
  coveredByCase = new Set(),
  artifactCases = new Set();
const text = {};
for (const file of p.documents) {
  assert(file.startsWith("docs/studio/") && !file.includes(".."));
  await stat(file);
  text[file] = (await readFile(file, "utf8")).replace(/\r\n/g, "\n");
}
for (const r of p.requirements) {
  assert.equal(r.status, "planned");
  assert(
    text["docs/studio/README.md"].includes("| " + r.id + " |"),
    "Missing requirement row " + r.id,
  );
}
for (const w of p.workItems) {
  assert.equal(w.status, "planned");
  assert(stage.has(w.stage), "Unknown stage " + w.id);
  assert(w.acceptance && w.requirements.length);
  assert(
    text["docs/studio/STUDIO_ROADMAP.md"].includes("| " + w.id + " |"),
    "Missing tooling row " + w.id,
  );
  for (const r of w.requirements) {
    assert(req.has(r), "Unknown requirement " + r);
    coveredByWork.add(r);
  }
  all.set(w.id, w.dependsOn);
}
for (const [id, deps] of all)
  for (const dep of deps)
    assert(all.has(dep), id + " unknown dependency " + dep);
function acyclic(map, label) {
  const active = new Set(),
    done = new Set();
  function visit(id) {
    assert(!active.has(id), label + " cycle " + id);
    if (done.has(id)) return;
    active.add(id);
    for (const dep of map.get(id) ?? []) visit(dep);
    active.delete(id);
    done.add(id);
  }
  for (const id of map.keys()) visit(id);
}
acyclic(all, "Combined game/studio dependency");
const stageMap = new Map();
for (const s of p.stages) {
  assert.equal(s.status, "planned");
  assert(s.acceptance);
  for (const d of s.dependsOn) assert(stage.has(d), "Unknown gate " + d);
  for (const w of s.workItems)
    assert(
      work.has(w) && workById.get(w).stage === s.id,
      "Gate item mismatch " + w,
    );
  for (const c of s.acceptanceCases)
    assert(cases.has(c), "Unknown gate acceptance " + c);
  assert(s.workItems.length || s.acceptanceCases.length, "Empty stage " + s.id);
  stageMap.set(s.id, s.dependsOn);
}
acyclic(stageMap, "Stage");
const assigned = p.stages.flatMap((s) => s.workItems);
assert.equal(assigned.length, work.size);
assert.equal(new Set(assigned).size, work.size);
for (const a of p.acceptanceCases) {
  assert.equal(a.status, "planned");
  assert(a.action && a.expected);
  assert(
    text["docs/studio/ACCEPTANCE_AND_ROUNDTRIP.md"].includes(
      "| " + a.id + " |",
    ),
    "Missing acceptance row " + a.id,
  );
  for (const r of a.requirements) {
    assert(req.has(r));
    coveredByCase.add(r);
  }
  for (const id of a.artifacts) {
    assert(artifact.has(id));
    artifactCases.add(id);
  }
}
assert.equal(
  coveredByWork.size,
  req.size,
  "Requirements missing tooling coverage",
);
assert.equal(
  coveredByCase.size,
  req.size,
  "Requirements missing acceptance coverage",
);
assert.equal(
  artifactCases.size,
  artifact.size,
  "Artifact missing acceptance coverage",
);
const profiles = new Map(p.artifactProfiles.map((a) => [a.id, a]));
assert.equal(p.defaultExport, "complete-game");
const complete = profiles.get(p.defaultExport);
assert(complete.playable && complete.losslessAuthoring);
for (const content of [
  "runtime",
  "project-manifest",
  "source-assets",
  "graphs",
  "extensions",
  "engine-source",
  "build-report",
  "launch-instructions",
])
  assert(
    complete.includes.includes(content),
    "Default complete bundle missing " + content,
  );
assert(profiles.get("project").losslessAuthoring);
assert(profiles.get("source").losslessAuthoring);
assert(
  profiles.get("runtime-only").playable &&
    !profiles.get("runtime-only").losslessAuthoring,
);
assert(!profiles.get("player-save").losslessAuthoring);
const adrIds = new Set();
for (const a of p.relatedADRs) {
  assert(!adrIds.has(a.id));
  adrIds.add(a.id);
  assert.equal(a.status, "Proposed");
  const body = await readFile(a.file, "utf8");
  assert(body.startsWith("# " + a.id + ":"));
  assert(
    /^- Status: Proposed\r?$/m.test(body),
    "Studio ADR already changed; update planning status explicitly",
  );
}
assert.equal(adrIds.size, 2);
let jsonExamples = 0;
for (const body of Object.values(text)) {
  for (const m of body.matchAll(/\x60\x60\x60json\n([\s\S]*?)\x60\x60\x60/g)) {
    JSON.parse(m[1]);
    jsonExamples++;
  }
}
console.log(
  JSON.stringify(
    {
      studioPlanningOnly: true,
      documents: p.documents.length,
      requirements: req.size,
      toolingWorkItems: work.size,
      stages: stage.size,
      openDecisions: decisions.size,
      acceptanceScenarios: cases.size,
      artifactProfiles: artifact.size,
      proposedADRs: adrIds.size,
      jsonExamples,
      requirementAndArtifactCoverage: "complete",
      dependencyAndReferenceChecks: "passed",
    },
    null,
    2,
  ),
);
