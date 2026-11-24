import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  gearIconSources,
  gearArtwork,
  gearPixels,
  paintGearPixel,
  validateGearArtwork,
} from "./gear-art";
import { equipment } from "./equipment";
import { items, validateItemCatalog } from "./items";
import { gameRules, validateRules } from "./studio-rules";
import {
  createLevelProject,
  editProject,
  exportLevelProject,
  parseLevelProject,
  compileLevelProject,
} from "./studio-project";
import {
  createExpedition,
  purchase,
  sellGear,
  validateExpedition,
} from "./campaign";

test("all 28 real gear and supply IDs resolve distinct transparent editable sources", () => {
  const catalog = { ...equipment, ...items };
  assert.equal(Object.keys(gearIconSources).length, 28);
  for (const item of Object.values(catalog)) {
    const a = gearArtwork(item),
      s = gearIconSources[a.source],
      p = gearPixels(a);
    assert.equal(a.source, item.id);
    assert.equal(s.name, item.name);
    assert.equal(s.pixels.length, 4096);
    assert.equal(p.length, 16384);
    assert.ok(p.some((n, i) => i % 4 === 3 && n > 0));
    assert.equal(p[3], 0);
    assert.ok(
      s.pixels.every(
        (i) => Number.isInteger(i) && i >= 0 && i < s.palette.length,
      ),
    );
  }
});
test("source and runtime gear atlases match committed digests and bounded dimensions", () => {
  const m = JSON.parse(readFileSync("public/art/gear/manifest.json", "utf8"));
  for (const [file, hash] of [
    ["gear-master-v1.png", m.masterSha256],
    ["gear-icons-v1.png", m.atlasSha256],
  ]) {
    const b = readFileSync("public/art/gear/" + file);
    assert.equal(createHash("sha256").update(b).digest("hex"), hash);
    assert.equal(b[25], 6);
    if (file === "gear-icons-v1.png") {
      assert.equal(b.readUInt32BE(16), 448);
      assert.equal(b.readUInt32BE(20), 256);
    }
  }
  assert.deepEqual(m.ids, Object.keys(gearIconSources));
});
test("pixel painting is immutable, preserves alpha and restores exact shipped bytes", () => {
  const a = gearArtwork(equipment.ironblade),
    base = gearPixels(a),
    b = paintGearPixel(a, 0, "#12345678");
  assert.deepEqual(a.patches, []);
  assert.deepEqual([...gearPixels(b).slice(0, 4)], [18, 52, 86, 120]);
  assert.deepEqual(gearPixels(paintGearPixel(b, 0, null)), base);
});
test("strict artwork rejects invalid source, duplicate/out-of-range pixels and extra payloads", () => {
  for (const v of [
    { source: "__proto__", patches: [] },
    { source: "ironblade", patches: [[4096, "#ffffffff"]] },
    { source: "ironblade", patches: [[0, "red"]] },
    {
      source: "ironblade",
      patches: [
        [0, "#ffffffff"],
        [0, "#00000000"],
      ],
    },
    { source: "ironblade", patches: [], image: "https://example.com" },
  ])
    assert.throws(() => validateGearArtwork(v));
  const r = gameRules();
  r.gear.ironblade.icon = { source: "missing", patches: [] };
  assert.throws(() => validateRules(r));
  const i = structuredClone(items);
  i["field-tonic"].icon = { source: "ironblade", patches: [[0, "bad"]] };
  assert.throws(() => validateItemCatalog(i));
});
test("legacy catalogs remain unchanged and custom records have type-aware fallback artwork", () => {
  const r = gameRules();
  assert.deepEqual(validateRules(r), r);
  assert.equal(r.gear.ironblade.icon, undefined);
  assert.equal(
    gearArtwork({ id: "custom-robe", slot: "armor" }).source,
    "leather",
  );
  assert.equal(
    gearArtwork({ id: "custom-energy", effect: "energy" }).source,
    "ether-draught",
  );
});
test("fully imported icon survives project export, validation and battle compilation", () => {
  const p = createLevelProject(),
    r = gameRules();
  r.gear.ironblade.icon = {
    source: "ironblade",
    patches: Array.from({ length: 4096 }, (_, i) => [
      i,
      i % 2 ? "#112233ff" : "#00000000",
    ]),
  };
  r.items!["field-tonic"].icon = {
    source: "vital-tonic",
    patches: [[32, "#abcdef80"]],
  };
  const next = editProject(p, p.revision, [{ type: "rules", rules: r }]);
  const restored = parseLevelProject(exportLevelProject(next));
  assert.deepEqual(restored.rules, r);
  assert.deepEqual(
    compileLevelProject(restored).rules?.gear.ironblade.icon,
    r.gear.ironblade.icon,
  );
  assert.equal(p.rules, undefined);
});
test("art changes do not alter commerce gold or ownership and survive validated campaign state", () => {
  const g = createExpedition();
  g.battle.rules = gameRules();
  g.battle.rules.gear.ironblade.icon = paintGearPixel(
    gearArtwork(equipment.ironblade),
    50,
    "#ff00ffff",
  );
  const bought = purchase(g, "ironblade");
  assert.equal(bought.company.gold, g.company.gold - 60);
  const sold = sellGear(bought, "ironblade");
  assert.equal(sold.company.gold, g.company.gold - 30);
  assert.deepEqual(
    sold.battle.rules?.gear.ironblade.icon,
    g.battle.rules.gear.ironblade.icon,
  );
  assert.ok(validateExpedition(sold));
});
