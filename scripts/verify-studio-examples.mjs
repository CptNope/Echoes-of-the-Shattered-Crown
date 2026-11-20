import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
const read = async (p) => JSON.parse(await readFile(p, "utf8")),
  plan = await read("docs/studio/specs/studio-plan.json");
assert.equal(plan.blueprintIndex, "docs/studio/specs/blueprints.json");
const idx = await read(plan.blueprintIndex);
assert.equal(idx.format, "echoes-studio-blueprint-index");
assert.equal(idx.status, "proposal");
assert.equal(idx.implemented, false);
assert.equal(idx.documents.length, 6);
assert.equal(idx.examples.length, 6);
const set = (rows, key = "id") => {
  const s = new Set(rows.map((r) => r[key]));
  assert.equal(s.size, rows.length, "Duplicate " + key);
  return s;
};
const req = set(plan.requirements),
  work = set(plan.workItems),
  accept = set(plan.acceptanceCases),
  blue = set(idx.documents),
  covered = new Set(),
  texts = new Map();
for (const d of idx.documents) {
  assert.equal(d.status, "proposed");
  assert(
    d.file.startsWith("docs/studio/blueprints/") && !d.file.includes(".."),
  );
  const t = (await readFile(d.file, "utf8")).replace(/\r\n/g, "\n");
  texts.set(d.id, t);
  assert(t.includes(d.id), "Blueprint ID missing " + d.id);
  for (const r of d.requirements) {
    assert(req.has(r));
    covered.add(r);
  }
  for (const w of d.workItems) assert(work.has(w));
  for (const a of d.acceptance) assert(accept.has(a));
}
assert.equal(covered.size, req.size);
set(idx.implementationSlices.map((id) => ({ id })));
assert.equal(idx.implementationSlices.length, 6);
for (const id of idx.implementationSlices)
  assert(texts.get("BP-SLICES").includes("| " + id + " |"));
const files = {};
for (const ex of idx.examples) {
  assert(
    ex.file.startsWith("docs/studio/specs/examples/") &&
      !ex.file.includes(".."),
  );
  const x = await read(ex.file);
  assert.equal(x.format, ex.format);
  assert.equal(x.status, "proposal");
  assert.equal(x.runtimeCompatible, false);
  files[ex.kind] = x;
}
const finite = (n) => typeof n === "number" && Number.isFinite(n),
  integer = (n) => Number.isInteger(n),
  range = (n, a, b) => finite(n) && n >= a && n <= b;
const acyclic = (ids, edges, label) => {
  const active = new Set(),
    done = new Set();
  function visit(id) {
    assert(ids.has(id), label + " unknown " + id);
    assert(!active.has(id), label + " cycle " + id);
    if (done.has(id)) return;
    active.add(id);
    for (const n of edges(id)) visit(n);
    active.delete(id);
    done.add(id);
  }
  for (const id of ids) visit(id);
};
const px = files.pixels;
assert(
  px.width > 0 && px.height > 0 && integer(px.width) && integer(px.height),
);
const layers = set(px.layers),
  frames = set(px.frames),
  clips = set(px.clips);
assert(px.palette.every((c) => /^#[0-9a-f]{8}$/i.test(c)));
assert(
  integer(px.transparentIndex) &&
    range(px.transparentIndex, 0, px.palette.length - 1),
);
assert(px.palette[px.transparentIndex].endsWith("00"));
for (const l of px.layers)
  assert(range(l.opacity, 0, 1) && typeof l.visible === "boolean");
for (const f of px.frames) {
  assert(finite(f.durationMs) && f.durationMs > 0);
  assert.equal(set(f.cels, "layerId").size, layers.size);
  for (const c of f.cels) {
    assert(layers.has(c.layerId));
    assert.equal(c.pixels.length, px.width * px.height);
    assert(
      c.pixels.every((n) => integer(n) && range(n, 0, px.palette.length - 1)),
    );
  }
}
for (const c of px.clips) {
  assert(c.frameIds.length && c.frameIds.every((id) => frames.has(id)));
  assert(px.directions.includes(c.direction));
  for (const p of [c.pivot, ...c.attachments])
    assert(range(p.x, 0, px.width - 1) && range(p.y, 0, px.height - 1));
}
for (const id of Object.values(px.stateBindings)) assert(clips.has(id));
const a = files.audio;
assert(integer(a.projectSampleRate) && a.projectSampleRate > 0);
assert.equal(a.render.rendered, false);
const buses = set(a.buses),
  graphs = set(a.graphs),
  samples = set(a.samples),
  instruments = set(a.instruments),
  patterns = set(a.music.patterns),
  arrangements = set(a.music.arrangements);
const busMap = new Map(a.buses.map((b) => [b.id, b]));
assert(busMap.has("master") && busMap.get("master").parent === null);
acyclic(
  buses,
  (id) => (busMap.get(id).parent ? [busMap.get(id).parent] : []),
  "Bus",
);
for (const b of a.buses) assert(range(b.gain, 0, 1));
const ports = {
  oscillator: { in: { pitch: "control" }, out: { audio: "audio" } },
  noise: { in: {}, out: { audio: "audio" } },
  sample: { in: { trigger: "control" }, out: { audio: "audio" } },
  envelope: { in: { gate: "control" }, out: { control: "control" } },
  gain: { in: { audio: "audio", gain: "control" }, out: { audio: "audio" } },
  mixer: { in: { a: "audio", b: "audio" }, out: { audio: "audio" } },
  output: { in: { audio: "audio" }, out: {} },
};
const sampleMap = new Map(a.samples.map((s) => [s.id, s]));
for (const s of a.samples) {
  assert(
    s.frames > 0 &&
      integer(s.frames) &&
      s.sampleRate > 0 &&
      integer(s.channels) &&
      s.channels > 0,
  );
  assert.equal(s.payloadAvailable, false);
  set(s.regions);
  for (const r of s.regions) {
    assert(
      integer(r.startFrame) &&
        integer(r.endFrame) &&
        r.startFrame >= 0 &&
        r.startFrame < r.endFrame &&
        r.endFrame <= s.frames,
    );
    if (r.loop)
      assert(
        r.loop.startFrame >= r.startFrame &&
          r.loop.startFrame < r.loop.endFrame &&
          r.loop.endFrame <= r.endFrame,
      );
  }
}
for (const g of a.graphs) {
  const ns = set(g.nodes),
    nodes = new Map(g.nodes.map((n) => [n.id, n])),
    incoming = new Set();
  assert.equal(g.nodes.filter((n) => n.type === "output").length, 1);
  for (const n of g.nodes) {
    assert(ports[n.type], "Unknown example node " + n.type);
    if (n.type === "oscillator")
      assert(
        ["sine", "triangle", "square", "sawtooth"].includes(n.params.wave) &&
          range(n.params.frequencyHz, 1, a.projectSampleRate / 2),
      );
    if (n.type === "envelope")
      assert(
        ["attackMs", "decayMs", "releaseMs"].every(
          (k) => finite(n.params[k]) && n.params[k] >= 0,
        ) && range(n.params.sustain, 0, 1),
      );
    if (n.type === "gain") assert(finite(n.params.gain) && n.params.gain >= 0);
    if (n.type === "output") assert(buses.has(n.params.bus));
    if (n.type === "sample")
      assert(
        samples.has(n.params.sampleId) &&
          sampleMap
            .get(n.params.sampleId)
            .regions.some((r) => r.id === n.params.regionId),
      );
  }
  for (const e of g.edges) {
    assert(ns.has(e.from) && ns.has(e.to));
    const from = ports[nodes.get(e.from).type].out[e.fromPort],
      to = ports[nodes.get(e.to).type].in[e.toPort];
    assert(from && to && from === to, "Audio port mismatch");
    const key = e.to + ":" + e.toPort;
    assert(!incoming.has(key), "Multiple example inputs " + key);
    incoming.add(key);
  }
  for (const node of g.nodes)
    for (const [port, kind] of Object.entries(ports[node.type].in))
      if (kind === "audio")
        assert(
          incoming.has(node.id + ":" + port),
          "Missing required audio input",
        );
  acyclic(
    ns,
    (id) => g.edges.filter((e) => e.from === id).map((e) => e.to),
    "Audio graph",
  );
}
for (const inst of a.instruments)
  assert(
    graphs.has(inst.graphId) &&
      integer(inst.rootMidi) &&
      range(inst.rootMidi, 0, 127),
  );
assert(a.music.ticksPerQuarter > 0 && integer(a.music.ticksPerQuarter));
const ordered = (rows, key) =>
  rows.every(
    (r, i) =>
      integer(r[key]) && r[key] >= 0 && (!i || r[key] > rows[i - 1][key]),
  );
assert(
  ordered(a.music.tempoMap, "tick") &&
    a.music.tempoMap.every((t) => finite(t.bpm) && t.bpm > 0),
);
assert(ordered(a.music.meterMap, "tick"));
for (const m of a.music.meterMap)
  assert(
    integer(m.numerator) &&
      m.numerator > 0 &&
      [1, 2, 4, 8, 16, 32].includes(m.denominator),
  );
const patternMap = new Map(a.music.patterns.map((p) => [p.id, p]));
for (const p of a.music.patterns) {
  assert(
    instruments.has(p.instrumentId) &&
      integer(p.lengthTicks) &&
      p.lengthTicks > 0,
  );
  set(p.notes);
  for (const n of p.notes)
    assert(
      integer(n.startTick) &&
        integer(n.lengthTicks) &&
        n.startTick >= 0 &&
        n.lengthTicks > 0 &&
        n.startTick + n.lengthTicks <= p.lengthTicks &&
        integer(n.pitch) &&
        range(n.pitch, 0, 127) &&
        range(n.velocity, 0, 1),
    );
}
for (const arr of a.music.arrangements) {
  assert(
    arr.lengthTicks > 0 &&
      arr.loop.startTick >= 0 &&
      arr.loop.startTick < arr.loop.endTick &&
      arr.loop.endTick <= arr.lengthTicks,
  );
  set(arr.clips);
  for (const c of arr.clips)
    assert(
      patterns.has(c.patternId) &&
        integer(c.startTick) &&
        c.startTick >= 0 &&
        integer(c.repeats) &&
        c.repeats > 0 &&
        c.startTick + patternMap.get(c.patternId).lengthTicks * c.repeats <=
          arr.lengthTicks,
    );
  for (const auto of arr.automation)
    assert(
      buses.has(auto.targetBus) &&
        auto.parameter === "gain" &&
        ordered(auto.points, "tick") &&
        auto.points.every(
          (p) => p.tick <= arr.lengthTicks && range(p.value, 0, 1),
        ),
    );
}
set(a.cues);
for (const c of a.cues) {
  assert(
    buses.has(c.bus) &&
      integer(c.maxVoices) &&
      c.maxVoices > 0 &&
      c.cooldownMs >= 0 &&
      finite(c.cooldownMs),
  );
  assert(
    c.source.kind === "graph"
      ? graphs.has(c.source.id)
      : c.source.kind === "arrangement" && arrangements.has(c.source.id),
  );
  assert(c.variants.length);
  set(c.variants);
  assert(
    c.variants.every(
      (v) =>
        v.weight > 0 && finite(v.weight) && v.pitchRatio > 0 && v.gain >= 0,
    ),
  );
  assert.equal(c.variationSeed, "cosmetic-event");
  if (c.kind === "one-shot") assert.equal(c.onLoad, "suppress-one-shot-replay");
  else assert(c.kind === "state" && c.onLoad === "restore-state");
}
const level = files.level,
  inside = (p) =>
    integer(p.x) &&
    integer(p.z) &&
    range(p.x, 0, level.width - 1) &&
    range(p.z, 0, level.height - 1),
  key = (p) => p.x + "," + p.z;
assert(
  integer(level.width) &&
    integer(level.height) &&
    level.width > 0 &&
    level.height > 0,
);
assert.equal(level.tiles.length, level.width * level.height);
assert.equal(new Set(level.tiles.map(key)).size, level.tiles.length);
for (const t of level.tiles)
  assert(
    inside(t) &&
      integer(t.height) &&
      t.height >= 0 &&
      ["grass", "stone", "water", "ice"].includes(t.terrain) &&
      typeof t.blocked === "boolean",
  );
const tiles = new Map(level.tiles.map((t) => [key(t), t])),
  templates = set(level.actorTemplates),
  units = set(level.units),
  zones = set(level.zones),
  props = set(level.props),
  objectives = set(level.objectives),
  triggers = set(level.triggers),
  positions = new Set();
for (const u of level.units) {
  assert(
    templates.has(u.templateId) &&
      inside(u) &&
      !tiles.get(key(u)).blocked &&
      !positions.has(key(u)),
  );
  positions.add(key(u));
}
assert.equal(new Set(level.simulationOrder).size, units.size);
assert.equal(level.simulationOrder.length, units.size);
assert(level.simulationOrder.every((id) => units.has(id)));
for (const z of level.zones) {
  assert(z.cells.length && z.cells.every(inside));
  assert.equal(new Set(z.cells.map(key)).size, z.cells.length);
}
for (const p of level.props)
  assert(inside(p) && typeof p.blocked === "boolean");
const propMap = new Map(level.props.map((p) => [p.id, p])),
  zoneMap = new Map(level.zones.map((z) => [z.id, z]));
for (const o of level.objectives)
  assert(
    o.kind === "interact" &&
      props.has(o.targetProp) &&
      zones.has(o.targetZone) &&
      zoneMap
        .get(o.targetZone)
        .cells.some((c) => key(c) === key(propMap.get(o.targetProp))) &&
      integer(o.interactionRange) &&
      o.interactionRange >= 0,
  );
const triggerMap = new Map(level.triggers.map((t) => [t.id, t]));
for (const t of level.triggers)
  assert(
    props.has(t.targetProp) &&
      objectives.has(t.action.objectiveId) &&
      t.once === true &&
      t.dependsOn.every((id) => triggers.has(id)),
  );
acyclic(triggers, (id) => triggerMap.get(id).dependsOn, "Trigger");
const start = level.units[0],
  reachable = new Set([key(start)]),
  queue = [start];
while (queue.length) {
  const p = queue.shift(),
    from = tiles.get(key(p));
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const n = { x: p.x + dx, z: p.z + dz },
      t = tiles.get(key(n));
    if (
      !t ||
      t.blocked ||
      t.terrain === "water" ||
      Math.abs(t.height - from.height) > 1 ||
      level.units.some((u) => u.id !== start.id && key(u) === key(n)) ||
      reachable.has(key(n))
    )
      continue;
    reachable.add(key(n));
    queue.push(n);
  }
}
assert(
  zoneMap.get("zone-control").cells.some((p) => reachable.has(key(p))),
  "Example objective zone unreachable",
);
const project = files.project,
  docs = set(project.documents);
assert(project.revision === 4 && project.id === "project-demo");
for (const d of project.documents) {
  const sourceKey = { pixel: "pixels", audio: "audio", level: "level" }[d.kind];
  assert(
    sourceKey && d.file === sourceKey + ".json",
    "Document kind/file mismatch",
  );
  assert.equal(files[sourceKey].id, d.id, "Document ID/file mismatch");
}
const tx = files.transaction;
assert.equal(tx.projectId, project.id);
assert.equal(tx.expectedRevision, project.revision);
assert.equal(tx.atomic, true);
assert.equal(tx.implemented, false);
function checkOperation(op) {
  assert(docs.has(op.documentId), "Unknown example command document");
  if (op.kind === "pixel.setPixel") {
    assert.equal(op.documentId, px.id);
    assert(
      frames.has(op.frameId) &&
        layers.has(op.layerId) &&
        integer(op.x) &&
        integer(op.y) &&
        range(op.x, 0, px.width - 1) &&
        range(op.y, 0, px.height - 1) &&
        integer(op.index) &&
        range(op.index, 0, px.palette.length - 1),
      "EDIT-VALUE",
    );
  } else if (op.kind === "animation.setDuration") {
    assert.equal(op.documentId, px.id);
    assert(clips.has(op.clipId) && frames.has(op.frameId) && op.durationMs > 0);
  } else if (op.kind === "music.setNote") {
    assert.equal(op.documentId, a.id);
    assert(
      patterns.has(op.patternId) &&
        patternMap.get(op.patternId).notes.some((n) => n.id === op.noteId) &&
        integer(op.pitch) &&
        range(op.pitch, 0, 127),
    );
  } else if (op.kind === "audio.setParam") {
    assert.equal(op.documentId, a.id);
    const g = a.graphs.find((g) => g.id === op.graphId),
      n = g?.nodes.find((n) => n.id === op.nodeId);
    assert(
      n?.type === "envelope" &&
        ["attackMs", "decayMs", "releaseMs"].includes(op.parameter) &&
        finite(op.value) &&
        op.value >= 0,
    );
  } else if (op.kind === "map.setTile") {
    assert.equal(op.documentId, level.id);
    assert(inside(op) && integer(op.height) && op.height >= 0);
  } else assert.fail("Unsupported example operation " + op.kind);
}
for (const op of tx.operations) checkOperation(op);
for (const bad of tx.invalidCases) {
  if (bad.expectedDiagnostic === "EDIT-REVISION")
    assert.notEqual(bad.expectedRevision, project.revision);
  else assert.throws(() => checkOperation(bad.operation), /EDIT-VALUE/);
}
const b = files.bundle;
assert.equal(b.profile, "complete-game");
assert.equal(b.buildStatus, "not-built-design-example");
assert.equal(b.payloadFilesPresent, false);
assert.equal(b.cleanReimportRequired, true);
assert.equal(b.projectId, project.id);
assert.equal(b.revision, project.revision);
const paths = new Set(),
  roles = new Set();
for (const m of b.members) {
  assert(
    m.path &&
      !m.path.includes("\\") &&
      !m.path.startsWith("/") &&
      !/^[a-z]:/i.test(m.path) &&
      !m.path.split("/").includes("..") &&
      path.posix.normalize(m.path) === m.path,
  );
  assert(!paths.has(m.path));
  paths.add(m.path);
  for (const r of m.roles) roles.add(r);
}
for (const r of plan.artifactProfiles.find((a) => a.id === "complete-game")
  .includes)
  assert(roles.has(r), "Missing example bundle role " + r);
assert(b.sourceComparison.length >= 8);
console.log(
  JSON.stringify(
    {
      blueprints: blue.size,
      requirementsLinked: covered.size,
      implementationSlices: idx.implementationSlices.length,
      designExamples: idx.examples.length,
      pixelCels: px.frames.reduce((n, f) => n + f.cels.length, 0),
      audioGraphs: a.graphs.length,
      musicPatterns: a.music.patterns.length,
      levelCells: level.tiles.length,
      exampleCommands: tx.operations.length,
      invalidExampleCases: tx.invalidCases.length,
      exampleChecks: "passed",
      runtimeOrAudioExecution: false,
      bundleBuilt: false,
    },
    null,
    2,
  ),
);
