import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = async (p) => JSON.parse(await readFile(p, "utf8")),
  plan = await read("docs/studio/specs/studio-plan.json");
assert.equal(
  plan.advancedBlueprintIndex,
  "docs/studio/specs/advanced-blueprints.json",
);
const index = await read(plan.advancedBlueprintIndex);
assert.equal(index.format, "echoes-studio-advanced-blueprints");
assert.equal(index.status, "proposal");
assert.equal(index.implemented, false);
assert.equal(index.documents.length, 5);
assert.equal(index.examples.length, 4);
const unique = (rows) => {
    const s = new Set(rows.map((r) => r.id));
    assert.equal(s.size, rows.length, "Duplicate ID");
    return s;
  },
  req = unique(plan.requirements),
  work = unique(plan.workItems),
  cases = unique(plan.acceptanceCases),
  covered = new Set(),
  files = {};
unique(index.documents);
for (const e of index.examples) {
  assert(
    e.file.startsWith("docs/studio/specs/advanced/") && !e.file.includes(".."),
  );
  const x = await read(e.file);
  assert.equal(x.format, e.format);
  assert.equal(x.status, "proposal");
  assert.equal(x.runtimeCompatible, false);
  assert.equal(x.implemented, false);
  files[e.kind] = x;
}
let releaseText = "";
for (const d of index.documents) {
  assert.equal(d.status, "proposed");
  assert(
    d.file.startsWith("docs/studio/blueprints/") && !d.file.includes(".."),
  );
  const text = await readFile(d.file, "utf8");
  assert(text.includes(d.id));
  for (const id of d.requirements) {
    assert(req.has(id));
    covered.add(id);
  }
  for (const id of d.workItems) assert(work.has(id));
  for (const id of d.acceptance) assert(cases.has(id));
  for (const id of d.examples) assert(files[id]);
  if (d.id === "BP-RELEASE") releaseText = text;
}
assert.equal(covered.size, 24);
assert.equal(index.releaseLayers.length, 5);
for (const id of index.releaseLayers)
  assert(releaseText.includes("| " + id + " "));
const finite = (n) => typeof n === "number" && Number.isFinite(n),
  integer = (n) => Number.isInteger(n),
  range = (n, a, b) => finite(n) && n >= a && n <= b;
const dag = (map, label) => {
  const done = new Set(),
    active = new Set();
  function visit(id) {
    assert(map.has(id), label + " missing " + id);
    assert(!active.has(id), label + " cycle " + id);
    if (done.has(id)) return;
    active.add(id);
    for (const next of map.get(id)) visit(next);
    active.delete(id);
    done.add(id);
  }
  for (const id of map.keys()) visit(id);
};
const rules = files.rules,
  types = new Map(),
  active = new Set();
function exprType(x) {
  assert(x && typeof x === "object");
  if (x.op === "literal") {
    assert(["number", "boolean"].includes(typeof x.value));
    if (typeof x.value === "number") assert(finite(x.value));
    return typeof x.value;
  }
  if (x.op === "input") {
    assert(Object.hasOwn(rules.contextTypes, x.name), "Unknown rule input");
    return rules.contextTypes[x.name];
  }
  if (x.op === "ref") return namedType(x.name);
  assert(Array.isArray(x.args));
  const ts = x.args.map(exprType);
  if (x.op === "select") {
    assert.equal(ts.length, 3);
    assert.equal(ts[0], "boolean");
    assert.equal(ts[1], ts[2]);
    return ts[1];
  }
  if (x.op === "round") {
    assert.equal(ts.length, 1);
    assert.equal(ts[0], "number");
    return "number";
  }
  assert(
    ["add", "subtract", "multiply", "min", "max"].includes(x.op),
    "Unknown rule operation",
  );
  assert.equal(ts.length, 2);
  assert(
    ts.every((t) => t === "number"),
    "Rule type mismatch",
  );
  return "number";
}
function namedType(id) {
  assert(Object.hasOwn(rules.expressions, id), "Missing rule expression");
  assert(!active.has(id), "Rule expression cycle");
  if (types.has(id)) return types.get(id);
  active.add(id);
  const type = exprType(rules.expressions[id]);
  active.delete(id);
  types.set(id, type);
  return type;
}
for (const id of Object.keys(rules.expressions)) namedType(id);
for (const out of rules.outputs)
  assert.equal(namedType(out.expression), out.type);
function value(x, context) {
  if (x.op === "literal") return x.value;
  if (x.op === "input") {
    assert(Object.hasOwn(context, x.name), "Missing calculation input");
    assert.equal(typeof context[x.name], rules.contextTypes[x.name]);
    return context[x.name];
  }
  if (x.op === "ref") return value(rules.expressions[x.name], context);
  if (x.op === "select")
    return value(x.args[value(x.args[0], context) ? 1 : 2], context);
  const a = x.args.map((y) => value(y, context));
  return {
    add: () => a[0] + a[1],
    subtract: () => a[0] - a[1],
    multiply: () => a[0] * a[1],
    min: () => Math.min(...a),
    max: () => Math.max(...a),
    round: () => Math.round(a[0]),
  }[x.op]();
}
unique(rules.knownAnswers);
for (const c of rules.knownAnswers) {
  assert(types.has(c.expression));
  const actual = value(rules.expressions[c.expression], c.context);
  assert(
    finite(actual) && Math.abs(actual - c.expected) < 1e-9,
    "Known-answer formula mismatch " + c.id,
  );
}
unique(rules.statuses);
for (const s of rules.statuses)
  assert(
    s.clock === "actor-activation-end" &&
      integer(s.duration) &&
      s.duration > 0 &&
      s.stacking === "replace-with-max" &&
      finite(s.tick.amount) &&
      s.tick.amount > 0 &&
      s.reactionPolicy === "no-recursive-triggers",
  );
assert(
  integer(rules.reactionLimits.maxDepth) &&
    rules.reactionLimits.maxDepth > 0 &&
    integer(rules.reactionLimits.maxEvents) &&
    rules.reactionLimits.maxEvents > 0,
);
for (const a of rules.aiProfiles)
  assert(
    a.legalityAuthority === "shared-runtime" &&
      types.get(a.scoreExpression) === "number" &&
      integer(a.budget.candidates) &&
      a.budget.candidates > 0,
  );
const c = files["campaign-ui"],
  quests = unique(c.quests),
  choiceIds = unique(c.choices),
  items = unique(c.items),
  choiceMap = new Map(c.choices.map((x) => [x.id, x])),
  questMap = new Map(c.quests.map((q) => [q.id, q])),
  itemMap = new Map(c.items.map((i) => [i.id, i]));
for (const q of c.quests) {
  for (const id of [...q.requiresAll, ...q.requiresAny]) assert(quests.has(id));
  if (q.condition)
    assert(
      choiceIds.has(q.condition.choice) &&
        choiceMap.get(q.condition.choice).values.includes(q.condition.equals),
    );
}
dag(
  new Map(c.quests.map((q) => [q.id, [...q.requiresAll, ...q.requiresAny]])),
  "Quest",
);
unique(c.routes);
for (const route of c.routes) {
  const done = new Set();
  for (const id of route.quests) {
    assert(quests.has(id) && !done.has(id));
    const q = questMap.get(id);
    assert(
      q.requiresAll.every((x) => done.has(x)) &&
        (!q.requiresAny.length || q.requiresAny.some((x) => done.has(x))),
      "Route prerequisite missing",
    );
    if (q.condition)
      assert.equal(
        route.choice[q.condition.choice],
        q.condition.equals,
        "Branch choice mismatch",
      );
    done.add(id);
  }
  assert(done.has("q-finale"));
}
for (const i of c.items)
  assert(
    integer(i.maxStack) && i.maxStack > 0 && finite(i.price) && i.price >= 0,
  );
assert(integer(c.startingResources.gold) && c.startingResources.gold >= 0);
for (const [id, n] of Object.entries(c.startingResources.inventory))
  assert(items.has(id) && integer(n) && range(n, 0, itemMap.get(id).maxStack));
for (const shop of c.shops) assert(shop.offers.every((id) => items.has(id)));
const recipeMap = new Map(c.recipes.map((r) => [r.id, r]));
for (const r of c.recipes) {
  assert(r.goldCost >= 0);
  for (const [id, n] of Object.entries({ ...r.consume, ...r.grant }))
    assert(items.has(id) && integer(n) && n > 0);
}
unique(c.calculationCases);
for (const test of c.calculationCases) {
  const inv = structuredClone(c.startingResources.inventory);
  let gold = c.startingResources.gold;
  if (test.kind === "buy") {
    assert(
      items.has(test.itemId) && integer(test.quantity) && test.quantity > 0,
    );
    gold -= itemMap.get(test.itemId).price * test.quantity;
    inv[test.itemId] = (inv[test.itemId] ?? 0) + test.quantity;
    assert.equal(inv[test.itemId], test.expectedCount);
  } else {
    assert.equal(test.kind, "craft");
    const r = recipeMap.get(test.recipeId);
    assert(r);
    gold -= r.goldCost;
    for (const [id, n] of Object.entries(r.consume))
      inv[id] = (inv[id] ?? 0) - n;
    for (const [id, n] of Object.entries(r.grant)) inv[id] = (inv[id] ?? 0) + n;
    assert.deepEqual(inv, test.expectedInventory);
  }
  assert(gold >= 0);
  for (const [id, n] of Object.entries(inv))
    assert(range(n, 0, itemMap.get(id).maxStack));
  assert.equal(gold, test.expectedGold);
}
unique(c.settlements);
assert.equal(
  new Set(c.settlements.map((s) => s.onceKey)).size,
  c.settlements.length,
);
for (const s of c.settlements) {
  assert(s.grantGold >= 0);
  for (const [id, n] of Object.entries(s.grantItems))
    assert(items.has(id) && integer(n) && n > 0);
}
const baseKeys = Object.keys(c.strings.en).sort();
for (const text of Object.values(c.strings)) {
  assert.deepEqual(Object.keys(text).sort(), baseKeys);
  assert(Object.values(text).every((v) => typeof v === "string" && v.length));
}
const actions = new Set(c.actions);
assert.equal(actions.size, c.actions.length);
const audio = await read("docs/studio/specs/examples/audio.json"),
  buses = new Set(audio.buses.map((b) => b.id));
for (const s of Object.values(c.settings)) {
  if (s.type === "boolean") assert.equal(typeof s.default, "boolean");
  else assert(s.type === "number" && range(s.default, s.min, s.max));
  if (s.bus) assert(buses.has(s.bus));
}
unique(c.screens);
for (const screen of c.screens) {
  const ids = unique(screen.elements),
    focus = new Set(screen.focusOrder);
  assert.equal(focus.size, screen.focusOrder.length);
  for (const id of focus) assert(ids.has(id));
  for (const e of screen.elements) {
    assert(baseKeys.includes(e.textKey));
    if (e.action) assert(actions.has(e.action));
    if (e.settingId) assert(Object.hasOwn(c.settings, e.settingId));
    if (["button", "setting"].includes(e.kind)) assert(focus.has(e.id));
  }
}
for (const map of c.inputMaps) {
  assert.equal(
    new Set(map.bindings.map((b) => b.key)).size,
    map.bindings.length,
  );
  assert(map.bindings.every((b) => actions.has(b.action)));
}
const v = files["version-merge"];
assert.equal(v.migrationExecutionClaimed, false);
unique(v.migrations);
const migrationMap = new Map();
for (const m of v.migrations) {
  assert(Object.hasOwn(v.versionDomains, m.domain));
  assert(integer(m.from) && integer(m.to) && m.from > 0 && m.to > m.from);
  assert.equal(m.implemented, false);
  const key = m.domain + ":" + m.from;
  if (!migrationMap.has(key)) migrationMap.set(key, []);
  migrationMap.get(key).push(m.domain + ":" + m.to);
  if (!migrationMap.has(m.domain + ":" + m.to))
    migrationMap.set(m.domain + ":" + m.to, []);
}
dag(migrationMap, "Migration");
assert(
  v.unsupportedDowngrade.from > v.unsupportedDowngrade.to &&
    v.unsupportedDowngrade.expected === "reject-with-original-intact",
);
const merge = v.merge;
assert(
  merge.leftRevision > merge.baseRevision &&
    merge.rightRevision > merge.baseRevision,
);
const result = structuredClone(merge.base),
  conflicts = [];
for (const key of new Set([
  ...Object.keys(merge.left),
  ...Object.keys(merge.right),
])) {
  assert(Object.hasOwn(merge.base, key));
  const l = Object.hasOwn(merge.left, key),
    r = Object.hasOwn(merge.right, key);
  if (l && r && merge.left[key] !== merge.right[key]) conflicts.push(key);
  else result[key] = l ? merge.left[key] : merge.right[key];
}
assert.deepEqual(conflicts.sort(), [...merge.expectedConflicts].sort());
assert.equal(
  new Set(merge.resolutions.map((r) => r.path)).size,
  conflicts.length,
);
for (const r of merge.resolutions) {
  assert(
    conflicts.includes(r.path) && ["left", "right", "base"].includes(r.choice),
  );
  result[r.path] = merge[r.choice][r.path];
}
assert.deepEqual(result, merge.expectedMerged);
assert.equal(v.opaqueAssetConflict.preserveBoth, true);
assert.equal(v.opaqueAssetConflict.policy, "manual-source-selection");
const p = files.presentation,
  pixels = await read("docs/studio/specs/examples/pixels.json"),
  level = await read("docs/studio/specs/examples/level.json"),
  sourceIds = unique(p.sourceClips),
  anchors = unique(p.anchors),
  materialIds = unique(p.materials);
assert.equal(p.rendered, false);
for (const s of p.sourceClips)
  assert(
    s.documentId === pixels.id && pixels.clips.some((c) => c.id === s.clipId),
  );
for (const a of p.anchors)
  if (a.kind === "actor-attachment")
    assert(
      pixels.clips.some((c) =>
        c.attachments.some((x) => x.id === a.attachmentId),
      ),
    );
  else assert.equal(a.kind, "target-position");
const curve = (points, opacity) => {
  assert(points.length >= 2 && points[0].t === 0 && points.at(-1).t === 1);
  for (let i = 0; i < points.length; i++) {
    const q = points[i];
    assert(
      range(q.t, 0, 1) &&
        finite(q.value) &&
        q.value >= 0 &&
        (!i || q.t > points[i - 1].t),
    );
    if (opacity) assert(q.value <= 1);
  }
};
unique(p.emitters);
for (const e of p.emitters) {
  assert(sourceIds.has(e.sourceId) && anchors.has(e.anchorId));
  assert(
    integer(e.count) &&
      e.count > 0 &&
      integer(e.maxAlive) &&
      e.maxAlive >= e.count &&
      e.lifetimeMs > 0 &&
      finite(e.speed) &&
      finite(e.gravity) &&
      integer(e.seed),
  );
  assert(e.color.length === 4 && e.color.every((n) => range(n, 0, 1)));
  curve(e.scaleCurve, false);
  curve(e.opacityCurve, true);
}
unique(p.profiles);
for (const q of p.profiles) {
  assert(
    integer(q.maxSprites) &&
      q.maxSprites > 0 &&
      integer(q.maxParticles) &&
      q.maxParticles > 0 &&
      range(q.emissionScale, 0, 1),
  );
  assert(
    p.emitters.reduce(
      (n, e) => n + Math.ceil(e.maxAlive * q.emissionScale),
      0,
    ) <= q.maxParticles,
  );
}
assert(sourceIds.has(p.motionAlternatives.staticSourceId));
for (const m of p.materials)
  assert(
    /^#[a-f0-9]{8}$/i.test(m.baseColor) &&
      range(m.roughness, 0, 1) &&
      range(m.metalness, 0, 1) &&
      range(m.opacity, 0, 1),
  );
unique(p.prefabs);
for (const f of p.prefabs) {
  assert(
    materialIds.has(f.materialId) &&
      f.size.length === 3 &&
      f.size.every((n) => finite(n) && n > 0) &&
      f.placement.levelId === level.id,
  );
  for (const cell of f.collision.relativeCells) {
    const x = f.placement.x + cell.x,
      z = f.placement.z + cell.z;
    assert(
      integer(x) &&
        integer(z) &&
        range(x, 0, level.width - 1) &&
        range(z, 0, level.height - 1),
    );
    assert(
      !level.units.some((u) => u.x === x && u.z === z),
      "Prefab overlaps unit",
    );
  }
}
if (p.environment.ambienceCueId !== null)
  assert(audio.cues.some((c) => c.id === p.environment.ambienceCueId));
console.log(
  JSON.stringify(
    {
      advancedBlueprints: index.documents.length,
      requirementsLinked: covered.size,
      designExamples: index.examples.length,
      formulaAnswers: rules.knownAnswers.length,
      campaignRoutes: c.routes.length,
      economyCalculations: c.calculationCases.length,
      migrationEdges: v.migrations.length,
      explicitMergeConflicts: conflicts.length,
      presentationEmitters: p.emitters.length,
      releaseLayers: index.releaseLayers.length,
      checks: "passed",
      gameSimulationExecuted: false,
      audioOrImagesRendered: false,
      migrationsExecuted: false,
    },
    null,
    2,
  ),
);
