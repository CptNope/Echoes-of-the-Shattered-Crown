import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
const root = process.cwd(),
  files = [
    "README.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "DESIGN.md",
    "PROJECT_BRIEF.md",
    "VALIDATION.md",
  ],
  errors = [],
  diagrams = [],
  cache = new Map();
async function walk(dir) {
  for (const e of await readdir(path.join(root, dir), {
    withFileTypes: true,
  })) {
    const p = path.posix.join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (e.name.endsWith(".md")) files.push(p);
  }
}
await walk("docs");
async function document(file) {
  if (cache.has(file)) return cache.get(file);
  const text = await readFile(file, "utf8"),
    anchors = new Set(),
    counts = new Map();
  let fenced = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const h = line.match(/^#{1,6}\s+(.+?)\s*#*$/);
    if (h) {
      const slug = h[1]
          .toLowerCase()
          .replace(/[^\p{L}\p{N}_\- ]/gu, "")
          .replace(/ /g, "-"),
        n = counts.get(slug) ?? 0;
      anchors.add(slug + (n ? "-" + n : ""));
      counts.set(slug, n + 1);
    }
  }
  const result = { text, anchors };
  cache.set(file, result);
  return result;
}
let tables = 0,
  links = 0;
for (const rel of files) {
  const file = path.join(root, rel),
    { text } = await document(file);
  let fence = null,
    body = [],
    width = null,
    rows = 0;
  for (const [i, line] of text.split(/\r?\n/).entries()) {
    const marker = line.match(/^\s*```(\S*)/);
    if (marker) {
      if (fence !== null) {
        if (fence === "mermaid")
          diagrams.push({ file: rel, line: i + 1, source: body.join("\n") });
        fence = null;
        body = [];
      } else fence = marker[1];
      width = null;
      continue;
    }
    if (fence !== null) {
      if (fence === "mermaid") body.push(line);
      continue;
    }
    if (line.startsWith("|")) {
      const n = (line.match(/(?<!\\)\|/g) ?? []).length - 1;
      if (width === null) {
        width = n;
        tables++;
        rows = 0;
      }
      if (n !== width)
        errors.push(rel + ":" + (i + 1) + " inconsistent table width");
      if (rows === 1 && !/^\|(?:\s*:?-+:?\s*\|)+$/.test(line))
        errors.push(rel + ":" + (i + 1) + " missing table header separator");
      rows++;
    } else width = null;
    for (const m of line.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = m[1].replace(/^<|>$/g, "");
      if (/^(?:https?:|mailto:|data:)/.test(target)) continue;
      links++;
      const [part, fragment] = target.split("#"),
        dest = path.resolve(
          path.dirname(file),
          decodeURIComponent(part || path.basename(file)),
        );
      try {
        await stat(dest);
        if (
          fragment &&
          dest.endsWith(".md") &&
          !(await document(dest)).anchors.has(decodeURIComponent(fragment))
        )
          errors.push(rel + ":" + (i + 1) + " missing anchor " + target);
      } catch {
        errors.push(rel + ":" + (i + 1) + " missing link " + target);
      }
    }
  }
  if (fence !== null) errors.push(rel + ": unclosed fence");
}
for (const d of diagrams)
  if (
    !/^(flowchart (?:LR|TD|TB)|sequenceDiagram|stateDiagram-v2)/.test(
      d.source.trim(),
    )
  )
    errors.push(d.file + ": unsupported/empty Mermaid block");
const backlog = await readFile("docs/roadmap/BACKLOG.md", "utf8"),
  ids = new Set(),
  dependencies = new Map();
for (const line of backlog.split("\n")) {
  const m = line.match(/^\| ([A-Z]{2,3}-\d{2}) \|/);
  if (!m) continue;
  const cells = line
      .split("|")
      .slice(1, -1)
      .map((x) => x.trim()),
    id = m[1];
  if (ids.has(id)) errors.push("Duplicate backlog ID " + id);
  ids.add(id);
  dependencies.set(id, cells[3] === "—" ? [] : cells[3].split(", "));
  if (cells.length !== 5 || !/^P[0-3] \/ [SML]$/.test(cells[1]) || !cells[4])
    errors.push("Incomplete backlog row " + id);
}
if (ids.size !== 160)
  errors.push("Expected 160 stable backlog IDs, found " + ids.size);
const done = new Set(),
  visiting = new Set();
function visit(id) {
  if (visiting.has(id)) {
    errors.push("Backlog dependency cycle " + id);
    return;
  }
  if (done.has(id)) return;
  if (!ids.has(id)) {
    errors.push("Unknown backlog dependency " + id);
    return;
  }
  visiting.add(id);
  for (const d of dependencies.get(id) ?? []) visit(d);
  visiting.delete(id);
  done.add(id);
}
for (const id of ids) visit(id);
console.log(
  JSON.stringify(
    {
      markdownFiles: files.length,
      localLinks: links,
      tables,
      mermaidDiagrams: diagrams.length,
      backlogItems: ids.size,
      errors,
    },
    null,
    2,
  ),
);
if (errors.length) process.exitCode = 1;
