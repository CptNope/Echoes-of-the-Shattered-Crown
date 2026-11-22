import { CHARACTER_ART } from "./character-art";
import { skills, type JobId, type SkillId } from "./data";
import { effectRecipes } from "./combat-effects";
import { loadEffectAtlas } from "./effect-art";
import { animationStates, animationFrame } from "./animation";
import { loadAnimationSheet, type LoadedAnimationSheet } from "./animation-art";
import { Battlefield } from "./scene";
import { createBattle, command, type Battle } from "./engine";
const el = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const ids = Object.keys(CHARACTER_ART) as JobId[],
  select = el<HTMLSelectElement>("job"),
  reduced = el<HTMLInputElement>("reduced");
reduced.checked = matchMedia("(prefers-reduced-motion: reduce)").matches;
for (const id of ids) {
  const option = document.createElement("option");
  option.value = id;
  option.textContent = CHARACTER_ART[id];
  select.append(option);
}
const sheets = new Map<JobId, LoadedAnimationSheet>(),
  canvases: HTMLCanvasElement[] = [];
for (const state of animationStates) {
  const f = document.createElement("figure"),
    c = document.createElement("canvas"),
    caption = document.createElement("figcaption");
  c.width = 256;
  c.height = 256;
  c.setAttribute("aria-label", state + " animation");
  caption.textContent = state;
  f.append(c, caption);
  el("clips").append(f);
  canvases.push(c);
}
let playing = true,
  elapsed = 0,
  previous = performance.now(),
  step = 0,
  recording = false,
  recordStart = 0;
const recordedStates = new Set<string>();
el("play").onclick = () => {
  playing = !playing;
  el("play").textContent = playing ? "Pause clips" : "Play clips";
};
el("step").onclick = () => {
  playing = false;
  el("play").textContent = "Play clips";
  step = (step + 1) % 4;
  elapsed = step * 240;
  draw(performance.now());
};
select.onchange = () => {
  elapsed = 0;
  step = 0;
};
function paint(
  ctx: CanvasRenderingContext2D,
  s: LoadedAnimationSheet,
  index: number,
  x: number,
  y: number,
  size: number,
) {
  const { image, metadata: m } = s,
    cw = m.width / 4,
    ch = m.height / 8,
    h = (size * 0.71) / m.idleHeight;
  ctx.drawImage(
    image,
    (index % 4) * cw,
    Math.floor(index / 4) * ch,
    cw,
    ch,
    x + (size - h) / 2,
    y + size * 0.88 - h * Math.min(1, m.ground[index]),
    h,
    h,
  );
}
const show = el<HTMLCanvasElement>("showcase"),
  ctx = show.getContext("2d")!;
function draw(now: number) {
  if (recording) elapsed = Math.max(0, performance.now() - recordStart);
  else if (playing) elapsed += Math.max(0, Math.min(50, now - previous));
  previous = now;
  const sheet = sheets.get(select.value as JobId);
  canvases.forEach((c, i) => {
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, 256, 256);
    const frame =
      reduced.checked || playing
        ? animationFrame(animationStates[i], elapsed % 1500, reduced.checked)
        : i * 4 + step;
    if (sheet) paint(g, sheet, frame, 0, 0, 256);
    c.setAttribute(
      "aria-label",
      animationStates[i] + " frame " + ((frame % 4) + 1),
    );
  });
  ctx.fillStyle = "#e3e8d9";
  ctx.fillRect(0, 0, 1024, show.height);
  const state = animationStates[Math.floor(elapsed / 1500) % 8];
  if (recording) recordedStates.add(state);
  ctx.fillStyle = "#263b32";
  ctx.font = "26px Georgia";
  ctx.fillText("ECHOES / " + state.toUpperCase(), 28, 39);
  ids.forEach((id, i) => {
    const s = sheets.get(id),
      x = (i % 4) * 256,
      y = 60 + Math.floor(i / 4) * 345;
    if (s)
      paint(
        ctx,
        s,
        animationFrame(state, elapsed % 1500, reduced.checked),
        x,
        y,
        256,
      );
    ctx.font = "18px Georgia";
    ctx.fillStyle = "#263b32";
    ctx.fillText(CHARACTER_ART[id], x + 18, y + 285);
  });
  ctx.font = "16px system-ui";
  ctx.fillText(
    "10 sheets · 8 states · 4 frames per state / original generated artwork",
    28,
    show.height - 18,
  );
}
function loop(now: number) {
  draw(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
Promise.all(
  ids.map(async (id) => {
    const s = await loadAnimationSheet(id);
    if (s) sheets.set(id, s);
  }),
).then(() => {
  el("status").textContent =
    sheets.size + " / 8 sheets loaded · 256 frames · 887 × 1774 RGBA sources";
});
el("record").onclick = () => {
  if (recording || sheets.size !== 8) return;
  const mime = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ].find(
    (v) =>
      typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(v),
  );
  if (!mime) {
    el("record-status").textContent =
      "WebM recording is unavailable in this browser.";
    return;
  }
  const stream = show.captureStream(12),
    recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 2500000,
    }),
    chunks: BlobPart[] = [];
  const oldReduced = reduced.checked;
  reduced.checked = false;
  elapsed = 0;
  recordStart = performance.now();
  recordedStates.clear();
  recording = true;
  el<HTMLButtonElement>("record").disabled = true;
  el("record-status").textContent = "Recording eight animation states…";
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  recorder.onstop = () => {
    recording = false;
    reduced.checked = oldReduced;
    stream.getTracks().forEach((t) => t.stop());
    const a = el<HTMLAnchorElement>("download");
    if (a.href.startsWith("blob:")) URL.revokeObjectURL(a.href);
    a.href = URL.createObjectURL(new Blob(chunks, { type: "video/webm" }));
    a.download = "echoes-company-animations.webm";
    a.hidden = false;
    a.click();
    el<HTMLButtonElement>("record").disabled = false;
    el("record-status").textContent =
      "Preview ready: " +
      recordedStates.size +
      " / 8 states rendered, all eight jobs.";
  };
  recorder.start();
  setTimeout(() => recorder.stop(), 12000);
};
let state: Battle = createBattle(17);
const field = new Battlefield(
  el("field"),
  state,
  () => {},
  () => {},
);
function fixture(label: string, change: (s: Battle) => Battle) {
  const b = document.createElement("button");
  b.textContent = label;
  b.onclick = () => {
    state = change(structuredClone(state));
    field.update(state, "inspect", null);
  };
  el("fixtures").append(b);
}
fixture("Reset", () => createBattle(17));
fixture("Walk", (s) => {
  const u = s.units[0];
  u.x = u.x === 2 ? 3 : 2;
  return s;
});
fixture("Attack", (s) => {
  s.turn++;
  s.lastAction = { unit: s.units[0].id, skill: "strike", turn: s.turn };
  return s;
});
fixture("Cast", (s) => {
  s.turn++;
  s.lastAction = { unit: s.units[0].id, skill: "ember", turn: s.turn };
  return s;
});
fixture("Hurt", (s) => {
  s.units[0].hp = Math.max(1, s.units[0].hp - 10);
  return s;
});
fixture("Guard", (s) => {
  s.units[0].guard = !s.units[0].guard;
  return s;
});
fixture("Down / revive", (s) => {
  s.units[0].hp = s.units[0].hp ? 0 : 80;
  return s;
});
fixture("Victory", (s) => {
  s.result = s.result === "victory" ? "playing" : "victory";
  return s;
});
fixture("All jobs", (s) => {
  s.units.forEach((u, i) => (u.job = ids[i % ids.length]));
  return s;
});
reduced.onchange = () => {
  field.reduced = reduced.checked;
};
field.reduced = reduced.checked;
setInterval(() => {
  const loaded = [...field.actors.values()].filter((a) => a.sheet).length;
  el("field-status").textContent =
    loaded +
    " animated actors · " +
    field.renderer.info.memory.textures +
    " GPU textures · frames " +
    [...field.actors.values()].map((a) => a.artFrame).join(",") +
    " · effects " +
    field.combatEffects.stats.sprites +
    "/24 sprites, " +
    field.combatEffects.stats.particles +
    "/256 particles · " +
    field.combatEffects.stats.atlases +
    "/3 effect atlases · " +
    field.combatEffects.stats.casts +
    " casts · " +
    field.combatEffects.stats.recycled +
    " recycled";
}, 250);
window.addEventListener("pagehide", () => field.dispose(), { once: true });

// The spell review uses the same atlas cache and production effects renderer.
const effectSelect = el<HTMLSelectElement>("effect-skill"),
  effectMiss = el<HTMLInputElement>("effect-miss"),
  effectHold = el<HTMLInputElement>("effect-hold");
const effectIds = Object.keys(skills) as SkillId[],
  effectCanvases: HTMLCanvasElement[] = [];
for (const id of effectIds) {
  const option = document.createElement("option");
  option.value = id;
  option.textContent = skills[id].name;
  effectSelect.append(option);
}
effectSelect.value = "ember";
for (let i = 0; i < 8; i++) {
  const f = document.createElement("figure"),
    c = document.createElement("canvas"),
    caption = document.createElement("figcaption");
  c.width = 256;
  c.height = 160;
  c.setAttribute("aria-label", "Effect frame " + (i + 1));
  caption.textContent = "Frame " + (i + 1);
  f.append(c, caption);
  el("effect-frames").append(f);
  effectCanvases.push(c);
}
let effectView = 0;
async function showEffectFrames() {
  const id = effectSelect.value as SkillId,
    version = ++effectView,
    r = effectRecipes[id],
    art = await loadEffectAtlas(r.atlas);
  if (version !== effectView) return;
  effectCanvases.forEach((c, i) => {
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, c.width, c.height);
    if (art) {
      const frame = r.clip * 8 + i,
        cw = art.width / 4,
        ch = art.height / 8;
      g.drawImage(
        art.image,
        (frame % 4) * cw,
        Math.floor(frame / 4) * ch,
        cw,
        ch,
        0,
        0,
        c.width,
        c.height,
      );
    }
  });
  el("effect-status").textContent = art
    ? skills[id].name +
      " · 8 frames · " +
      r.particle +
      " particles · " +
      (r.travelMs ? r.travelMs + " ms travel" : "melee contact")
    : "Effect art unavailable; battlefield uses rings and particles.";
}
effectSelect.onchange = () => void showEffectFrames();
void showEffectFrames();
const effectJobs: Record<SkillId, JobId> = {
  strike: "vanguard",
  cleave: "vanguard",
  gloam: "shadowrunner",
  rally: "vanguard",
  ember: "arcanist",
  frost: "arcanist",
  surge: "stormherald",
  raincall: "stormherald",
  mend: "lifebinder",
  aegis: "runewarden",
  haste: "chronoweaver",
  delay: "chronoweaver",
  veil: "shadowrunner",
};
function previewAbility(scroll = true) {
  field.combatEffects.clear();
  const id = effectSelect.value as SkillId,
    turn = state.turn + 1;
  state = createBattle(17);
  state.turn = turn;
  state.units[0].job = effectJobs[id];
  const target = skills[id].kind === "damage" ? state.units[4] : state.units[3];
  const affected = state.units.filter(
    (u) =>
      Math.abs(u.x - target.x) + Math.abs(u.z - target.z) <=
        skills[id].radius &&
      (skills[id].kind === "damage" ? u.team === "enemy" : u.team === "ally"),
  );
  state.lastAction = {
    unit: state.units[0].id,
    skill: id,
    turn,
    target: { x: target.x, z: target.z },
    outcomes: affected.map((u) => ({
      unit: u.id,
      result:
        skills[id].kind === "damage"
          ? effectMiss.checked
            ? "miss"
            : "hit"
          : skills[id].kind === "heal"
            ? "heal"
            : "buff",
    })),
  };
  field.update(state, "inspect", null);
  if (scroll)
    el("field").scrollIntoView({
      behavior: reduced.checked ? "instant" : "smooth",
      block: "center",
    });
}
el("preview-effect").onclick = () => previewAbility();
effectHold.onchange = () => {
  field.combatEffects.holdPreview = effectHold.checked;
  if (effectHold.checked) previewAbility();
};
el<HTMLInputElement>("effect-fallback").onchange = () => {
  field.combatEffects.fallbackPreview =
    el<HTMLInputElement>("effect-fallback").checked;
  previewAbility();
};
el("effect-volley").onclick = () => {
  field.combatEffects.clear();
  const s = createBattle();
  for (let i = 0; i < 50; i++) {
    const id = effectIds[i % effectIds.length];
    field.combatEffects.emit(
      {
        unit: s.units[0].id,
        skill: id,
        turn: i + 1,
        target: { x: 6, z: 4 },
        outcomes: [{ unit: s.units[4].id, result: "hit" }],
      },
      s,
      performance.now(),
      reduced.checked,
    );
  }
  el("field").scrollIntoView({ behavior: "instant", block: "center" });
};
const effectRecord = document.createElement("button");
effectRecord.textContent = "Record spell reel";
el("fixtures").append(effectRecord);
const effectDownload = document.createElement("a");
effectDownload.hidden = true;
effectDownload.textContent = "Download spell reel";
el("fixtures").append(effectDownload);
const effectRecordStatus = document.createElement("output");
el("fixtures").append(effectRecordStatus);
effectRecord.onclick = () => {
  const mime = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ].find(
    (v) =>
      typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(v),
  );
  if (!mime) {
    effectRecordStatus.textContent = "WebM recording unavailable.";
    return;
  }
  effectHold.checked = false;
  field.combatEffects.holdPreview = false;
  effectMiss.checked = false;
  const oldReduced = reduced.checked;
  reduced.checked = false;
  field.reduced = false;
  const stream = field.renderer.domElement.captureStream(20),
    recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 3000000,
    }),
    chunks: BlobPart[] = [];
  let index = 0;
  const seen = new Set<SkillId>();
  effectRecord.disabled = true;
  const next = () => {
    const id = effectIds[index++];
    effectSelect.value = id;
    void showEffectFrames();
    previewAbility(false);
    seen.add(id);
    effectRecordStatus.textContent =
      "Recording " + skills[id].name + " (" + index + "/13)";
  };
  next();
  const interval = setInterval(() => {
    if (index >= effectIds.length) {
      clearInterval(interval);
      recorder.stop();
    } else next();
  }, 1400);
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  recorder.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    if (effectDownload.href.startsWith("blob:"))
      URL.revokeObjectURL(effectDownload.href);
    effectDownload.href = URL.createObjectURL(
      new Blob(chunks, { type: "video/webm" }),
    );
    effectDownload.download = "echoes-spells-and-steel.webm";
    effectDownload.hidden = false;
    effectDownload.click();
    effectRecord.disabled = false;
    reduced.checked = oldReduced;
    field.reduced = oldReduced;
    effectRecordStatus.textContent =
      "Reel ready: " + seen.size + " / 13 abilities.";
  };
  recorder.start();
  el("field").scrollIntoView({ behavior: "instant", block: "center" });
};
