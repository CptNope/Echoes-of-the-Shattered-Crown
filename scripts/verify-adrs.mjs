import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
const dir = "docs/adr",
  files = (await readdir(dir)).filter((f) => f.endsWith(".md")).sort(),
  records = new Map(),
  ids = new Set(),
  index = await readFile(dir + "/README.md", "utf8");
const statuses = new Set([
  "Proposed",
  "Accepted",
  "Rejected",
  "Deprecated",
  "Superseded",
]);
const sections = [
  "Context",
  "Decision",
  "Alternatives considered",
  "Consequences",
  "Evidence and verification",
  "Revisit conditions",
  "Related records",
];
for (const file of files) {
  if (["README.md", "template.md"].includes(file)) continue;
  const match = file.match(/^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/);
  assert(match, "Invalid ADR filename " + file);
  const id = match[1];
  assert(Number(id) > 0 && !ids.has(id), "Duplicate or invalid ADR ID " + id);
  ids.add(id);
  const body = await readFile(dir + "/" + file, "utf8");
  assert(body.startsWith("# ADR-" + id + ": "), "Title mismatch " + file);
  const meta = {};
  for (const key of [
    "Status",
    "Recorded",
    "Decision date",
    "Origin",
    "Supersedes",
    "Superseded by",
  ]) {
    const value = body.match(new RegExp("^- " + key + ": (.+)$", "m"))?.[1];
    assert(value, "Missing " + key + " in " + file);
    meta[key] = value;
  }
  assert(statuses.has(meta.Status), "Invalid status " + file);
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(meta.Recorded) &&
      !Number.isNaN(Date.parse(meta.Recorded)) &&
      new Date(meta.Recorded).toISOString().slice(0, 10) === meta.Recorded,
    "Invalid Recorded date " + file,
  );
  for (const title of sections)
    assert(
      body.includes("\n## " + title + "\n"),
      "Missing " + title + " in " + file,
    );
  const relation = (key) => {
    const value = meta[key];
    if (value === "None") return null;
    const target = value.match(/^\[ADR-(\d{4})\]\((\d{4}-[a-z0-9-]+\.md)\)$/);
    assert(
      target && target[1] === target[2].slice(0, 4),
      "Invalid " + key + " link " + file,
    );
    assert(target[2] !== file, "ADR supersedes itself " + file);
    return target[2];
  };
  records.set(file, {
    id,
    status: meta.Status,
    origin: meta.Origin,
    supersedes: relation("Supersedes"),
    supersededBy: relation("Superseded by"),
  });
}
const listed = new Set();
for (const line of index.split("\n")) {
  const row = line.match(/^\| \[ADR-(\d{4})\]\(([^)]+)\) \| ([^|]+) \|/);
  if (!row) continue;
  const [, id, file, status] = row,
    record = records.get(file);
  assert(record && record.id === id, "Unknown/mismatched index record " + file);
  assert(!listed.has(file), "Duplicate ADR index entry " + file);
  listed.add(file);
  assert.equal(status.trim(), record.status, "Index status mismatch " + file);
}
assert.equal(listed.size, records.size, "Every numbered ADR must be indexed");
for (const [file, r] of records) {
  if (r.supersedes) {
    const old = records.get(r.supersedes);
    assert(old, "Missing predecessor " + file);
    assert.equal(
      old.supersededBy,
      file,
      "Missing reciprocal successor link " + file,
    );
    assert.equal(
      old.status,
      "Superseded",
      "Predecessor must be Superseded " + file,
    );
  }
  if (r.supersededBy) {
    const next = records.get(r.supersededBy);
    assert(next, "Missing successor " + file);
    assert.equal(
      next.supersedes,
      file,
      "Missing reciprocal predecessor link " + file,
    );
    assert.equal(
      r.status,
      "Superseded",
      "Only Superseded records name a successor " + file,
    );
    assert(
      ["Accepted", "Deprecated", "Superseded"].includes(next.status),
      "Successor must be adopted " + file,
    );
  }
  if (r.status === "Superseded")
    assert(r.supersededBy, "Superseded record lacks successor " + file);
}
const visited = new Set(),
  active = new Set();
function visit(file) {
  assert(!active.has(file), "ADR supersession cycle " + file);
  if (visited.has(file)) return;
  active.add(file);
  const next = records.get(file).supersededBy;
  if (next) visit(next);
  active.delete(file);
  visited.add(file);
}
for (const file of records.keys()) visit(file);
assert(records.size > 0, "No ADRs found");
console.log(
  JSON.stringify(
    {
      architectureDecisionRecords: records.size,
      statuses: Object.fromEntries(
        [...statuses].map((s) => [
          s,
          [...records.values()].filter((r) => r.status === s).length,
        ]),
      ),
      indexAndHistory: "passed",
    },
    null,
    2,
  ),
);
