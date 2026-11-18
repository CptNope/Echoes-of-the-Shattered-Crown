import { test } from "node:test";
import assert from "node:assert/strict";
import { createExpedition, depart, decodeSave } from "./campaign";
import {
  encodeBackup,
  parseBackup,
  backupFilename,
  maxBackupBytes,
} from "./portable";
test("portable backup round-trips a complete company with explicit format metadata", () => {
  const g = createExpedition(),
    stamp = new Date("2026-11-18T06:00:00Z"),
    text = encodeBackup(g, stamp),
    record = JSON.parse(text);
  assert.equal(record.format, "echoes-crown-save");
  assert.equal(record.version, 1);
  assert.equal(record.exportedAt, stamp.toISOString());
  const parsed = parseBackup(text);
  assert.deepEqual(parsed.game, JSON.parse(JSON.stringify(g)));
  assert(!parsed.migrated);
  assert.equal(parsed.exportedAt, stamp.toISOString());
  assert(decodeSave({ game: parsed.game }));
});
test("active combat resources, readiness, status, support slots and RNG survive export/import", () => {
  const g = depart(createExpedition(), "shrine");
  g.battle.turn = 9;
  g.battle.seed = 81;
  g.battle.units[0].hp = 31;
  g.battle.units[0].mp = 13;
  g.battle.units[0].next = 223;
  g.battle.units[0].status.soaked = 2;
  g.battle.units[0].learnedSupport = ["bulwark"];
  g.battle.units[0].supportSlots = {
    passive: "bulwark",
    reaction: null,
    movement: null,
  };
  const parsed = parseBackup(encodeBackup(g));
  assert.deepEqual(parsed.game, JSON.parse(JSON.stringify(g)));
  parsed.game.battle.units[0].hp = 1;
  assert.equal(g.battle.units[0].hp, 31);
});
test("native v2 records and supported legacy battle records can be imported", () => {
  const g = createExpedition();
  assert.deepEqual(
    parseBackup(JSON.stringify({ game: g })).game,
    JSON.parse(JSON.stringify(g)),
  );
  const old: any = structuredClone(g.battle);
  old.version = 1;
  delete old.encounter;
  old.units.forEach((u: any) => {
    delete u.baseHp;
    delete u.equipment;
    delete u.learned;
    delete u.jpSpent;
  });
  old.units[0].hp = 41;
  const parsed = parseBackup(JSON.stringify({ battle: old }));
  assert(parsed.migrated);
  assert.equal(parsed.game.battle.units[0].hp, 41);
  assert.equal(parsed.game.stage, "battle");
  assert.equal(old.version, 1);
});
test("malformed or unsupported backups reject without changing the source company", () => {
  const g = createExpedition(),
    copy = structuredClone(g);
  for (const text of [
    "nope",
    "null",
    "[]",
    JSON.stringify({ format: "different", version: 1, game: g }),
    JSON.stringify({ format: "echoes-crown-save", version: 99, game: g }),
    JSON.stringify({ game: { ...g, version: 99 } }),
  ])
    assert.throws(() => parseBackup(text));
  const bad = structuredClone(g);
  bad.company.inventory.leather = 0;
  assert.throws(() => parseBackup(JSON.stringify({ game: bad })));
  assert.throws(() => encodeBackup(bad));
  assert.deepEqual(g, copy);
});
test("backup limits count UTF-8 bytes and apply to export as well as import", () => {
  assert.throws(
    () => parseBackup("é".repeat(maxBackupBytes / 2 + 1)),
    /too large/,
  );
  const huge = createExpedition();
  huge.company.members[0].name = "x".repeat(maxBackupBytes);
  assert.throws(() => encodeBackup(huge), /limit/);
});
test("download names are safe and missing or invalid timestamps do not prevent valid recovery", () => {
  assert.equal(
    backupFilename(new Date("2026-11-18T06:00:00Z")),
    "echoes-company-2026-11-18T06-00-00-000Z.json",
  );
  assert.equal(
    parseBackup(
      JSON.stringify({ game: createExpedition(), exportedAt: "invalid" }),
    ).exportedAt,
    null,
  );
});
