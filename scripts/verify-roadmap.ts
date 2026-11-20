import { readFile, stat } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
import { jobs as currentJobs } from "../src/data";
import { encounters } from "../src/encounters";
const p = JSON.parse(await readFile("docs/roadmap/specs/plan.json", "utf8"));
assert.equal(p.format, "echoes-design-plan");
assert.equal(p.version, 1);
assert.equal(p.status, "proposal");
assert.equal(p.runtimeCompatible, false);
const backlog = new Set(
  [
    ...(await readFile("docs/roadmap/BACKLOG.md", "utf8")).matchAll(
      /^\| ([A-Z]{2,3}-\d{2}) \|/gm,
    ),
  ].map((m) => m[1]),
);
const unique = (rows: any[], label: string) => {
  const ids = new Set(rows.map((r) => r.id));
  assert.equal(ids.size, rows.length, label + " duplicate IDs");
  return ids;
};
const decisionIds = unique(p.decisions, "decision"),
  missionIds = unique(p.missions, "mission"),
  jobIds = unique(p.jobs, "job");
unique(p.abilities, "ability");
unique(p.slices, "slice");
unique(p.chapter.routes, "route");
assert.equal(p.documents.length, 6);
for (const doc of p.documents) {
  assert(doc.startsWith("docs/roadmap/") && !doc.includes(".."));
  await stat(doc);
}
const checkRefs = (items: any[]) => {
  for (const item of items) {
    for (const id of item.backlog ?? [])
      assert(backlog.has(id), item.id + " unknown backlog " + id);
    for (const id of item.decisions ?? [])
      assert(decisionIds.has(id), item.id + " unknown decision " + id);
  }
};
checkRefs([...p.decisions, ...p.slices, ...p.missions, ...p.jobs]);
assert(p.decisions.every((d: any) => d.status === "open"));
assert.equal(p.decisions.length, 16);
const sliceText = await readFile("docs/roadmap/PRODUCTION_SLICES.md", "utf8"),
  decisionText = await readFile("docs/roadmap/DECISION_REGISTER.md", "utf8"),
  missionText = await readFile("docs/roadmap/ENCOUNTER_BLUEPRINTS.md", "utf8"),
  jobText = await readFile("docs/roadmap/JOB_ABILITY_BLUEPRINTS.md", "utf8");
for (const d of p.decisions)
  assert(
    decisionText.includes("| " + d.id + " |"),
    d.id + " absent from decision register",
  );
const acceptance = new Set<string>();
for (const s of p.slices) {
  assert.equal(s.status, "proposed");
  assert(sliceText.includes(s.id));
  assert.equal(s.acceptance.length, 6);
  for (const id of s.acceptance) {
    assert(!acceptance.has(id), "Duplicate acceptance ID " + id);
    acceptance.add(id);
    assert(
      sliceText.includes("| " + id + " |"),
      id + " absent from slice document",
    );
  }
}
const missionMap = new Map<string, any>(p.missions.map((m: any) => [m.id, m]));
for (const m of p.missions) {
  assert.equal(m.status, "proposed");
  assert(missionText.includes("## " + m.id + " — " + m.name));
  assert.equal(m.board.length, 2);
  assert(m.board.every((n: number) => Number.isInteger(n) && n > 0));
  for (const id of [...m.requiresAll, ...m.requiresAny])
    assert(
      missionIds.has(id) || Object.hasOwn(encounters, id),
      m.id + " unknown mission dependency " + id,
    );
}
const acyclic = (ids: Set<unknown>, edges: (id: string) => string[]) => {
  const visited = new Set<string>(),
    active = new Set<string>();
  function visit(id: string) {
    if (!ids.has(id)) return;
    assert(!active.has(id), "Dependency cycle " + id);
    if (visited.has(id)) return;
    active.add(id);
    for (const x of edges(id)) visit(x);
    active.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(String(id));
};
acyclic(missionIds, (id) => {
  const m = missionMap.get(id);
  return [...m.requiresAll, ...m.requiresAny];
});
const jobMap = new Map<string, any>(p.jobs.map((j: any) => [j.id, j]));
assert.equal(p.jobs.length, 12);
assert.equal(p.abilities.length, 36);
for (const j of p.jobs) {
  assert.equal(j.status, "proposed");
  assert(
    !Object.hasOwn(currentJobs, j.id),
    j.id + " is already current; update planning status",
  );
  assert(jobText.includes("### " + j.name));
  for (const id of j.requiresJobs)
    assert(
      jobIds.has(id) || Object.hasOwn(currentJobs, id),
      j.id + " unknown job prerequisite " + id,
    );
  assert.equal(
    p.abilities.filter((a: any) => a.job === j.id).length,
    3,
    j.id + " must have three prototype abilities",
  );
}
acyclic(jobIds, (id) => jobMap.get(id).requiresJobs);
for (const a of p.abilities) {
  assert.equal(a.status, "proposed");
  assert(jobIds.has(a.job));
  assert(
    jobText.includes("| " + a.id + " / " + a.name + " | " + a.cost + " |"),
    a.id + " catalog mismatch",
  );
  assert(a.target && a.intent && a.counterplay);
}
assert.equal(p.missions.length, 6);
assert.equal(p.chapter.routes.length, 4);
assert(Object.hasOwn(encounters, p.chapter.entryCompletion));
assert(missionIds.has(p.chapter.finale));
const combinations = new Set<string>();
for (const route of p.chapter.routes) {
  assert(["rescue", "breach"].includes(route.approach));
  assert(["testimony", "crown-records"].includes(route.archiveRecord));
  combinations.add(route.approach + ":" + route.archiveRecord);
  const completed = new Set([p.chapter.entryCompletion]),
    groups = new Set<string>();
  for (const id of route.missions) {
    const m = missionMap.get(id);
    assert(m, "Unknown route mission " + id);
    assert(!completed.has(id), "Repeated route mission " + id);
    assert(
      m.requiresAll.every((x: string) => completed.has(x)),
      route.id + " missing prerequisite for " + id,
    );
    assert(
      !m.requiresAny.length ||
        m.requiresAny.some((x: string) => completed.has(x)),
      route.id + " requires one approach",
    );
    if (m.choiceGroup) {
      assert(
        !groups.has(m.choiceGroup),
        route.id + " takes both exclusive approaches",
      );
      groups.add(m.choiceGroup);
    }
    completed.add(id);
  }
  assert(
    completed.has(p.chapter.finale),
    route.id + " does not reach the finale",
  );
  const selected = p.chapter.approachGroup.filter((id: string) =>
    completed.has(id),
  );
  assert.equal(selected.length, 1);
  assert.equal(
    selected[0],
    route.approach === "rescue" ? "MISS-02" : "MISS-03",
  );
}
assert.equal(combinations.size, 4, "Missing approach/archive combination");
let jsonExamples = 0;
for (const doc of p.documents) {
  const text = await readFile(doc, "utf8");
  for (const m of text.matchAll(
    /\x60\x60\x60json\r?\n([\s\S]*?)\x60\x60\x60/g,
  )) {
    JSON.parse(m[1]);
    jsonExamples++;
  }
}
console.log(
  JSON.stringify(
    {
      planningOnly: true,
      documents: p.documents.length,
      decisions: p.decisions.length,
      slices: p.slices.length,
      acceptanceScenarios: acceptance.size,
      missions: p.missions.length,
      proposedJobs: p.jobs.length,
      prototypeAbilities: p.abilities.length,
      chapterRoutes: p.chapter.routes.length,
      jsonExamples,
      referenceAndGraphChecks: "passed",
    },
    null,
    2,
  ),
);
