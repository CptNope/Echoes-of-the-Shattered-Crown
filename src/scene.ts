import type { AbilityCues } from "./studio-assets";
import { baseJobId } from "./data";
import { mapDimensions, mapFrame } from "./map-layout";
import {
  terrainColor,
  terrainRgba,
  type TerrainMaterials,
  type TerrainId,
} from "./studio-materials";
import { loadNativeSheet } from "./studio-native-art";
import {
  nativeDuration,
  nativeFrameAt,
  type NativeSprite,
} from "./studio-native-sprites";
import * as THREE from "three";
import {
  type Battle,
  type Unit,
  type Tile,
  key,
  reachable,
  activeUnit,
  canTarget,
  tileAt,
} from "./engine";
import { jobs, skills, type SkillId } from "./data";
import { spriteCanvas, loadSpriteArt } from "./sprites";
import {
  animationFrame,
  chooseAnimation,
  clipDuration,
  actionClip,
  actionCueChanged,
  type AnimationState,
} from "./animation";
import { loadAnimationSheet, type LoadedAnimationSheet } from "./animation-art";
import { CombatEffects } from "./effect-renderer";
import type { ActionCue } from "./animation";
import {
  compilePixelSheet,
  pixelStateFrame,
  pixelClipDuration,
  type PixelClip,
} from "./studio-pixels";
function pixelCanvas(clip: PixelClip): HTMLCanvasElement {
  const sheet = compilePixelSheet(clip),
    canvas = document.createElement("canvas");
  canvas.width = sheet.width;
  canvas.height = sheet.height;
  canvas
    .getContext("2d")!
    .putImageData(new ImageData(sheet.pixels, sheet.width, sheet.height), 0, 0);
  return canvas;
}
export type Mode = "inspect" | "move" | SkillId;
function texture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export class Battlefield {
  scene = new THREE.Scene();
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  root = new THREE.Group();
  tiles: THREE.Mesh[] = [];
  markers = new THREE.Group();
  actors = new Map<
    string,
    {
      sprite: THREE.Sprite;
      bar: THREE.Sprite;
      base: THREE.Mesh;
      hurtUntil: number;
      attackUntil: number;
      sheet: LoadedAnimationSheet | null;
      custom: PixelClip | null;
      native: NativeSprite | null;
      customState: string | null;
      artJob: Unit["job"];
      artFrame: number;
      action: {
        clip: "attack" | "cast";
        start: number | null;
        cue?: ActionCue;
      } | null;
      idleStart: number;
      walkStart: number;
      downStart: number | null;
      outcomeStart: number;
    }
  >();
  effects = new THREE.Group();
  combatEffects: CombatEffects;
  angle = Math.PI / 4;
  targetAngle = Math.PI / 4;
  focus = { x: 0, z: 0 };
  zoom = 1;
  targetZoom = 1;
  state: Battle;
  mode: Mode = "inspect";
  selected: { x: number; z: number } | null = null;
  hover: { x: number; z: number } | null = null;
  ray = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  frame = 0;
  disposed = false;
  observer: ResizeObserver;
  reduced = false;
  onHover: (x: number, z: number) => void;
  onSelect: (x: number, z: number) => void;
  private last = 0;
  private resources: THREE.Texture[] = [];
  private terrainTextures = new Map<TerrainId, THREE.Texture>();
  private animationSources = new Map<Unit["job"], THREE.Texture>();
  constructor(
    public host: HTMLElement,
    state: Battle,
    onSelect: (x: number, z: number) => void,
    onHover: (x: number, z: number) => void,
    private pixelClip?: PixelClip,
    private onCustomAnimation?: (state: string) => void,
    private nativeSprite?: NativeSprite | NativeSprite[],
    private materials?: TerrainMaterials,
    private abilityCues?: AbilityCues,
  ) {
    this.state = state;
    this.focus = mapFrame(mapDimensions(state));
    this.onSelect = onSelect;
    this.onHover = onHover;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0xdce1d0);
    this.host.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Isometric battlefield. Use arrow keys to select tiles and Enter to inspect.",
    );
    this.camera = new THREE.OrthographicCamera(-8, 8, 7, -7, 0.1, 300);
    const frame = mapFrame(mapDimensions(state));
    this.scene.fog = new THREE.Fog(
      0xdce1d0,
      24 * frame.scale,
      48 * frame.scale,
    );
    this.scene.add(this.root, this.markers, this.effects);
    this.scene.add(new THREE.HemisphereLight(0xecf5ef, 0x50644f, 2.2));
    const sun = new THREE.DirectionalLight(0xfff4e3, 2.2);
    sun.position.set(
      frame.x - 5 * frame.scale,
      16 * frame.scale,
      frame.z + 8 * frame.scale,
    );
    sun.target.position.set(frame.x, 0, frame.z);
    this.scene.add(sun.target);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -10 * frame.scale,
      right: 10 * frame.scale,
      top: 10 * frame.scale,
      bottom: -10 * frame.scale,
      far: 100 * frame.scale,
    });
    sun.shadow.bias = -0.001;
    this.scene.add(sun);
    this.buildTerrain();
    this.buildActors();
    this.combatEffects = new CombatEffects(
      this.scene,
      (x, z) => tileAt(this.state, Math.round(x), Math.round(z))!.h * 0.43,
      this.abilityCues,
    );
    for (const u of state.units) this.requestAnimationArt(u);
    void loadSpriteArt().then((ready) => {
      if (!ready || this.disposed) return;
      for (const u of this.state.units)
        if (!this.actors.get(u.id)?.sheet) this.refreshSprite(u);
    });
    this.update(state, "inspect", null);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    this.renderer.domElement.addEventListener("pointermove", this.pointerMove);
    this.renderer.domElement.addEventListener(
      "pointerleave",
      this.pointerLeave,
    );
    this.renderer.domElement.addEventListener("click", this.click);
    this.renderer.domElement.addEventListener("wheel", this.wheel, {
      passive: false,
    });
    this.animate(0);
  }
  private box(
    w: number,
    h: number,
    d: number,
    color: number,
    x: number,
    y: number,
    z: number,
  ) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 1 }),
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    this.root.add(m);
    return m;
  }
  private applyTerrain(mesh: THREE.Mesh, t: Tile) {
    const id = t.terrain,
      color = terrainColor(id, t.x, t.z, this.materials),
      surface = this.materials?.surfaces[id];
    const original = (
      Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    ) as THREE.MeshStandardMaterial;
    let list: Array<THREE.MeshStandardMaterial>;
    if (Array.isArray(mesh.material))
      list = mesh.material as THREE.MeshStandardMaterial[];
    else {
      list = Array.from({ length: 6 }, (_, i) =>
        i === 2 ? original.clone() : original,
      );
      mesh.material = list;
    }
    for (const mat of list) mat.color.set(color);
    const top = list[2];
    top.map = null;
    if (surface?.painted) {
      let map = this.terrainTextures.get(id);
      if (!map) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 16;
        canvas
          .getContext("2d")!
          .putImageData(
            new ImageData(terrainRgba(this.materials!, id), 16, 16),
            0,
            0,
          );
        map = texture(canvas);
        this.terrainTextures.set(id, map);
        this.resources.push(map);
      }
      top.color.set(0xffffff);
      top.map = map;
    }
    top.needsUpdate = true;
    mesh.userData.appearanceTerrain = id;
  }
  private buildTerrain() {
    for (const t of this.state.tiles) {
      const x = t.x - 4,
        z = t.z - 4,
        y = t.h * 0.43;
      const n = (t.x * 17 + t.z * 29) % 3;
      this.box(
        0.985,
        1.25 + y,
        0.985,
        [0x626956, 0x6c715d, 0x75765f][n],
        x,
        (y - 1.25) / 2 - 0.07,
        z,
      );
      const color = terrainColor(t.terrain, t.x, t.z, this.materials);
      const top = this.box(0.975, 0.12, 0.975, color, x, y, z);
      top.userData = { x: t.x, z: t.z };
      this.applyTerrain(top, t);
      this.tiles.push(top);
      if (t.terrain === "water") {
        for (let i = 0; i < 2; i++)
          this.box(
            0.3,
            0.012,
            0.025,
            0xa2c5bb,
            x + (((t.z + i) % 3) - 1) * 0.2,
            y + 0.068,
            z + (i - 0.5) * 0.4,
          );
      } else if (t.terrain === "grass" && !t.blocked) {
        for (let i = 0; i < (this.state.tiles.length > 256 ? 1 : 4); i++) {
          const px = x + (((t.x * 7 + i * 13) % 17) / 20 - 0.4),
            pz = z + (((t.z * 11 + i * 7) % 17) / 20 - 0.4);
          this.box(
            0.035,
            0.06 + (i % 2) * 0.05,
            0.04,
            0xa9b983,
            px,
            y + 0.09,
            pz,
          );
          if ((t.x + t.z + i) % 9 === 0)
            this.box(0.06, 0.025, 0.06, 0xe2cc90, px, y + 0.17, pz);
        }
      } else if (t.terrain === "stone") {
        this.box(0.88, 0.005, 0.012, 0x858c78, x, y + 0.064, z + 0.24);
        this.box(0.012, 0.005, 0.24, 0x858c78, x + 0.18, y + 0.064, z + 0.36);
      }
      if (t.blocked) {
        if (t.x < 3 || t.z > 5) this.tree(x, y, z, t.x + t.z);
        else this.column(x, y, z);
      }
    }
    // Broken shrine: columns and lintels sit outside the playable squares.
    for (const x of [1.4, 3.9]) {
      this.column(x, 1, -4.55);
      this.box(0.78, 0.18, 0.78, 0xc2c0a0, x, 3.15, -4.55);
    }
    this.box(3.3, 0.35, 0.7, 0xb6b79a, 2.65, 3.36, -4.55);
    this.box(1.1, 0.15, 0.86, 0xd0c9a6, 1.55, 3.61, -4.55);
    if (this.state.encounter === "bellkeeper") {
      const profile = [
        [0.04, 0],
        [0.43, 0],
        [0.46, 0.1],
        [0.32, 0.18],
        [0.24, 0.55],
        [0.12, 0.67],
      ].map(([x, y]) => new THREE.Vector2(x, y));
      const bell = new THREE.Mesh(
        new THREE.LatheGeometry(profile, 20),
        new THREE.MeshStandardMaterial({
          color: 0x9c8854,
          metalness: 0.55,
          roughness: 0.6,
          side: THREE.DoubleSide,
        }),
      );
      bell.position.set(2.65, 2.38, -4.55);
      bell.castShadow = true;
      this.root.add(bell);
      this.box(0.07, 0.32, 0.07, 0x574e3b, 2.65, 3.12, -4.55);
      this.box(0.11, 0.23, 0.11, 0x574e3b, 2.65, 2.37, -4.55);
    }
    for (let i = 0; i < 7; i++)
      this.box(
        0.24 + (i % 3) * 0.12,
        0.15,
        0.3,
        0x8c967e,
        2 + (i % 3) * 0.7,
        0.99,
        -3.8 + Math.floor(i / 3) * 0.28,
      );
    this.box(1.1, 0.22, 0.9, 0x848d78, 3, 1.05, -1);
    this.box(0.8, 0.18, 0.7, 0xb4b99b, 3, 1.24, -1);
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.26),
      new THREE.MeshStandardMaterial({
        color: 0xc8e4c5,
        emissive: 0x649d82,
        emissiveIntensity: 0.45,
        roughness: 0.3,
      }),
    );
    gem.position.set(3, 1.95, -1);
    this.effects.add(gem);
    // Foundation strata make the battlefield a suspended fragment of Veyr.
    const d = mapDimensions(this.state),
      center = mapFrame(d);
    this.box(
      d.width + 0.05,
      0.22,
      d.height + 0.05,
      0x555e4f,
      center.x,
      -1.3,
      center.z,
    );
    this.box(
      d.width - 0.4,
      0.26,
      d.height - 0.4,
      0x7d8068,
      center.x,
      -1.53,
      center.z,
    );
    this.box(
      d.width - 0.8,
      0.32,
      d.height - 0.8,
      0x626b58,
      center.x,
      -1.8,
      center.z,
    );
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0xcbd3bf, roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.1;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }
  private tree(x: number, y: number, z: number, seed: number) {
    this.box(0.16, 1.1, 0.16, 0x5c634b, x, y + 0.55, z);
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.55 + (i % 2) * 0.12, 0),
        new THREE.MeshStandardMaterial({
          color: [0x425e48, 0x526e4e, 0x6e885c][i % 3],
          flatShading: true,
        }),
      );
      m.scale.set(1, 1.1, 1);
      m.position.set(
        x + Math.sin(i * 2 + seed) * 0.3,
        y + 1.05 + (i % 3) * 0.31,
        z + Math.cos(i * 2) * 0.3,
      );
      m.castShadow = true;
      this.root.add(m);
    }
  }
  private column(x: number, y: number, z: number) {
    this.box(0.64, 0.18, 0.64, 0x939b80, x, y + 0.12, z);
    this.box(0.4, 1.25, 0.4, 0xa9ad91, x, y + 0.82, z);
    this.box(0.52, 0.16, 0.52, 0xc0bfa0, x, y + 1.5, z);
    this.box(0.045, 0.8, 0.03, 0x778971, x - 0.21, y + 0.8, z + 0.1);
  }
  private buildActors() {
    for (const u of this.state.units) {
      const custom =
        this.pixelClip?.enabled && this.pixelClip.actorId === u.id
          ? this.pixelClip
          : null;
      const t = texture(
        custom
          ? pixelCanvas(custom)
          : spriteCanvas(
              baseJobId(u.job, this.state.rules?.jobs),
              u.team === "enemy",
            ),
      );
      t.minFilter = t.magFilter = custom
        ? THREE.NearestFilter
        : THREE.LinearFilter;
      if (custom) t.repeat.set(1 / custom.frames.length, 1);
      this.resources.push(t);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: t,
          transparent: true,
          depthTest: true,
        }),
      );
      sprite.scale.set(1.15, 1.53, 1);
      sprite.material.alphaTest = 0.08;
      sprite.material.depthWrite = false;
      sprite.material.toneMapped = false;
      sprite.center.set(0.5, 0);
      sprite.renderOrder = 2;
      const c = document.createElement("canvas");
      c.width = 128;
      c.height = 36;
      const bt = texture(c);
      this.resources.push(bt);
      const bar = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: bt, depthTest: false }),
      );
      bar.scale.set(1.1, 0.31, 1);
      bar.renderOrder = 9;
      const base = new THREE.Mesh(
        u.team === "ally"
          ? new THREE.RingGeometry(0.21, 0.28, 32)
          : new THREE.RingGeometry(0.23, 0.32, 4),
        new THREE.MeshBasicMaterial({
          color: u.team === "ally" ? 0x527a65 : 0xa95845,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      base.rotation.x = -Math.PI / 2;
      this.scene.add(sprite, bar, base);
      this.actors.set(u.id, {
        sprite,
        bar,
        base,
        hurtUntil: 0,
        attackUntil: 0,
        sheet: null,
        custom,
        native:
          (Array.isArray(this.nativeSprite)
            ? this.nativeSprite
            : this.nativeSprite
              ? [this.nativeSprite]
              : []
          ).find((s) => s.enabled && s.actorId === u.id) ?? null,
        customState: null,
        artJob: u.job,
        artFrame: -1,
        action: null,
        idleStart: performance.now(),
        walkStart: performance.now(),
        downStart:
          u.hp <= 0 ? performance.now() - clipDuration("downed") : null,
        outcomeStart: performance.now(),
      });
    }
  }
  private refreshSprite(u: Unit) {
    const actor = this.actors.get(u.id)!;
    if (actor.custom) return;
    actor.sheet = null;
    actor.artJob = u.job;
    actor.artFrame = -1;
    actor.sprite.scale.set(1.15, 1.53, 1);
    actor.sprite.center.set(0.5, 0);
    const map = texture(
      spriteCanvas(
        baseJobId(u.job, this.state.rules?.jobs),
        u.team === "enemy",
      ),
    );
    map.minFilter = map.magFilter = THREE.LinearFilter;
    actor.sprite.material.map?.dispose();
    this.resources.push(map);
    actor.sprite.material.map = map;
    actor.sprite.material.needsUpdate = true;
    this.requestAnimationArt(u);
  }
  private requestAnimationArt(u: Unit) {
    if (this.actors.get(u.id)?.custom) return;
    const native = this.actors.get(u.id)?.native;
    void (
      native
        ? loadNativeSheet(native).catch(() => null)
        : loadAnimationSheet(baseJobId(u.job, this.state.rules?.jobs))
    ).then((sheet) => {
      if (!sheet || this.disposed) {
        if (native && !this.disposed)
          this.onCustomAnimation?.("Native image unavailable");
        return;
      }
      const current = this.state.units.find((v) => v.id === u.id),
        actor = this.actors.get(u.id);
      if (
        !actor ||
        current?.job !== u.job ||
        actor.artJob !== u.job ||
        actor.sheet ||
        actor.custom
      )
        return;
      let source = native
        ? undefined
        : this.animationSources.get(baseJobId(u.job, this.state.rules?.jobs));
      if (!source) {
        source = new THREE.Texture(sheet.image);
        source.colorSpace = THREE.SRGBColorSpace;
        source.minFilter = source.magFilter = THREE.LinearFilter;
        source.generateMipmaps = false;
        if (!native)
          this.animationSources.set(
            baseJobId(u.job, this.state.rules?.jobs),
            source,
          );
        this.resources.push(source);
      }
      const map = source.clone();
      map.needsUpdate = true;
      actor.sprite.material.map?.dispose();
      this.resources.push(map);
      actor.sprite.material.map = map;
      actor.sprite.material.needsUpdate = true;
      actor.sheet = sheet;
      actor.artFrame = -1;
    });
  }
  private clearMarkers() {
    for (const child of [...this.markers.children]) {
      this.markers.remove(child);
      const m = child as THREE.Mesh;
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
  }
  update(state: Battle, mode: Mode, selected: { x: number; z: number } | null) {
    const old = this.state;
    this.state = state;
    this.mode = mode;
    this.selected = selected;
    this.clearMarkers();
    const u = activeUnit(state),
      moves = reachable(state, u);
    for (const t of state.tiles) {
      let color: number | undefined,
        opacity = 0.32;
      if (mode === "move" && moves.has(key(t.x, t.z)) && !u.moved)
        color = 0x77c8b3;
      else if (
        mode !== "inspect" &&
        mode !== "move" &&
        canTarget(state, u, (state.rules?.skills ?? skills)[mode], t.x, t.z)
      )
        color =
          (state.rules?.skills ?? skills)[mode].kind === "damage"
            ? 0xe4ae76
            : 0x8dc7ac;
      if (selected?.x === t.x && selected.z === t.z) {
        color = 0xf9e1a1;
        opacity = 0.7;
      }
      if (t.burn > 0) {
        color = 0xe8844b;
        opacity = 0.5;
      }
      if (color !== undefined) {
        const m = new THREE.Mesh(
          new THREE.PlaneGeometry(0.87, 0.87),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        m.rotation.x = -Math.PI / 2;
        m.position.set(t.x - 4, t.h * 0.43 + 0.071, t.z - 4);
        this.markers.add(m);
      }
      const mesh = this.tiles.find(
        (m) => m.userData.x === t.x && m.userData.z === t.z,
      )!;
      if (mesh.userData.appearanceTerrain !== t.terrain)
        this.applyTerrain(mesh, t);
    }
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.4, 4),
      new THREE.MeshBasicMaterial({ color: 0xf3d28b, side: THREE.DoubleSide }),
    );
    ring.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
    ring.position.set(
      u.x - 4,
      tileAt(state, u.x, u.z)!.h * 0.43 + 0.09,
      u.z - 4,
    );
    this.markers.add(ring);
    for (const v of state.units) {
      const actor = this.actors.get(v.id)!;
      const previous = old.units.find((o) => o.id === v.id);
      if (previous?.job !== v.job) this.refreshSprite(v);
      const now = performance.now();
      if (previous && (v.x !== previous.x || v.z !== previous.z))
        actor.walkStart = now;
      if (previous && v.hp < previous.hp)
        actor.hurtUntil = now + clipDuration("hurt");
      if (previous && previous.hp > 0 && v.hp <= 0) {
        actor.downStart = now;
        actor.action = null;
      }
      if (previous && previous.hp <= 0 && v.hp > 0) {
        actor.downStart = null;
        actor.action = null;
      }
      if (old.result !== state.result) actor.outcomeStart = now;
      const event = state.lastAction,
        oldEvent = old.lastAction;
      if (event && event.unit === v.id && actionCueChanged(oldEvent, event)) {
        const clip = actionClip(event.skill, state.rules?.skills);
        actor.action = { clip, start: null, cue: event };
        actor.attackUntil = now + clipDuration(clip);
      }
      const ctx = (
        actor.bar.material.map!.image as HTMLCanvasElement
      ).getContext("2d")!;
      ctx.clearRect(0, 0, 128, 36);
      ctx.fillStyle = "#253b31";
      ctx.fillRect(10, 21, 108, 9);
      ctx.fillStyle = v.team === "ally" ? "#a6d2ae" : "#d68d77";
      ctx.fillRect(12, 23, (104 * v.hp) / v.maxHp, 5);
      ctx.fillStyle = "#263b30";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `${v.team === "enemy" ? "◆" : "●"} ${v.name.split(" ")[0]}`,
        64,
        14,
      );
      actor.bar.material.map!.needsUpdate = true;
      actor.sprite.material.opacity = v.hp > 0 ? 1 : 0.6;
      actor.bar.visible = v.hp > 0;
      if (this.last === 0) {
        actor.sprite.position.set(
          v.x - 4,
          tileAt(state, v.x, v.z)!.h * 0.43 + 0.08,
          v.z - 4,
        );
      }
    }
  }
  rotate(direction: number) {
    this.targetAngle += (direction * Math.PI) / 2;
  }
  setZoom(delta: number) {
    this.targetZoom = THREE.MathUtils.clamp(
      this.targetZoom + delta,
      0.65,
      Math.max(1.65, mapFrame(mapDimensions(this.state)).scale * 1.65),
    );
  }
  fitMap() {
    this.focus = mapFrame(mapDimensions(this.state));
    this.targetZoom = 1;
  }
  focusActor() {
    const u = activeUnit(this.state);
    this.focus = { x: u.x - 4, z: u.z - 4 };
    this.targetZoom = mapFrame(mapDimensions(this.state)).scale;
  }
  private resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    const aspect = w / h,
      extent =
        Math.max(aspect > 1.5 ? 6 : 6.9, 6.9 / aspect) *
        mapFrame(mapDimensions(this.state)).scale;
    this.camera.left = -extent * aspect;
    this.camera.right = extent * aspect;
    this.camera.top = extent;
    this.camera.bottom = -extent;
    this.camera.updateProjectionMatrix();
  }
  private hit(e: PointerEvent | MouseEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    this.ray.setFromCamera(this.pointer, this.camera);
    return this.ray.intersectObjects(this.tiles)[0]?.object.userData as
      { x: number; z: number } | undefined;
  }
  private pointerMove = (e: PointerEvent) => {
    const p = this.hit(e);
    if (p && (p.x !== this.hover?.x || p.z !== this.hover?.z)) {
      this.hover = p;
      this.onHover(p.x, p.z);
      this.renderer.domElement.style.cursor = "pointer";
    }
  };
  private pointerLeave = () => {
    this.hover = null;
  };
  private click = (e: MouseEvent) => {
    const p = this.hit(e);
    if (p) this.onSelect(p.x, p.z);
  };
  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    this.setZoom(e.deltaY > 0 ? -0.08 : 0.08);
  };
  private animate = (time: number) => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    const delta = Math.min(50, time - this.last || 16);
    this.last = time;
    const smooth = this.reduced ? 1 : 1 - Math.exp(-delta / 140);
    this.angle += (this.targetAngle - this.angle) * smooth;
    this.zoom += (this.targetZoom - this.zoom) * smooth;
    this.camera.zoom = this.zoom;
    this.camera.position.set(
      this.focus.x +
        Math.sin(this.angle) * 15 * mapFrame(mapDimensions(this.state)).scale,
      14 * mapFrame(mapDimensions(this.state)).scale,
      this.focus.z +
        Math.cos(this.angle) * 15 * mapFrame(mapDimensions(this.state)).scale,
    );
    this.camera.lookAt(this.focus.x, 0.1, this.focus.z);
    this.camera.updateProjectionMatrix();
    for (const u of this.state.units) {
      const a = this.actors.get(u.id)!,
        t = tileAt(this.state, u.x, u.z)!;
      const walking =
        Math.hypot(
          a.sprite.position.x - (u.x - 4),
          a.sprite.position.z - (u.z - 4),
        ) > 0.04;
      a.sprite.position.lerp(
        new THREE.Vector3(
          u.x - 4,
          t.h * 0.43 +
            0.08 +
            (this.reduced || a.sheet || a.custom
              ? 0
              : Math.sin(time * 0.002 + u.x) * 0.018),
          u.z - 4,
        ),
        this.reduced ? 1 : 1 - Math.exp(-delta / 100),
      );
      if (a.action && !walking) {
        if (a.action.start === null) {
          a.action.start = time;
          if (a.action.cue)
            this.combatEffects.emit(
              a.action.cue,
              this.state,
              time,
              this.reduced,
            );
        }
        if (
          time - a.action.start >=
          (a.native
            ? nativeDuration(a.native, a.action.clip)
            : a.custom?.clips
              ? pixelClipDuration(a.custom, a.action.clip)
              : clipDuration(a.action.clip))
        )
          a.action = null;
      }
      if (a.custom) {
        const state = chooseAnimation({
          hp: u.hp,
          walking: walking && !this.reduced,
          hurt: time < a.hurtUntil,
          action: a.action?.clip ?? null,
          result: this.state.result,
          team: u.team,
          guard: u.guard,
        });
        const start =
          state === "walk"
            ? a.walkStart
            : state === "attack" || state === "cast"
              ? (a.action?.start ?? time)
              : a.idleStart;
        const frame = pixelStateFrame(
          a.custom,
          state,
          time - start,
          this.reduced,
        );
        const label = a.custom.clips ? state : "shared loop";
        if (a.customState !== label) {
          a.customState = label;
          this.onCustomAnimation?.(label);
        }
        const map = a.sprite.material.map!;
        map.repeat.set(1 / a.custom.frames.length, 1);
        map.offset.set(frame / a.custom.frames.length, 0);
        a.sprite.center.set(a.custom.pivot.x / 16, 1 - a.custom.pivot.y / 24);
        a.sprite.scale.set(1.02, 1.53, 1);
        a.sprite.material.rotation = u.hp <= 0 ? Math.PI / 2 : 0;
        a.sprite.material.color.set(time < a.hurtUntil ? 0xffb9a6 : 0xffffff);
        a.artFrame = frame;
      } else if (a.sheet) {
        const state = chooseAnimation({
          hp: u.hp,
          walking: walking && !this.reduced,
          hurt: time < a.hurtUntil,
          action: a.action?.clip ?? null,
          result: this.state.result,
          team: u.team,
          guard: u.guard,
        });
        const starts: Record<AnimationState, number> = {
          idle: a.idleStart,
          walk: a.walkStart,
          attack: a.action?.start ?? time,
          cast: a.action?.start ?? time,
          hurt: a.hurtUntil - clipDuration("hurt"),
          guard: a.idleStart,
          victory: a.outcomeStart,
          downed: a.downStart ?? time,
        };
        const frame = a.native
          ? nativeFrameAt(a.native, state, time - starts[state], this.reduced)
          : animationFrame(state, time - starts[state], this.reduced);
        if (a.native && a.customState !== state) {
          a.customState = state;
          this.onCustomAnimation?.(state);
        }
        if (frame !== a.artFrame) {
          const map = a.sprite.material.map!,
            col = frame % 4,
            row = Math.floor(frame / 4);
          map.repeat.set(u.team === "enemy" ? -0.25 : 0.25, 0.125);
          map.offset.set(
            (col + (u.team === "enemy" ? 1 : 0)) / 4,
            1 - (row + 1) / 8,
          );
          a.sprite.center.set(
            0.5,
            1 - Math.max(0, Math.min(1, a.sheet.metadata.ground[frame])),
          );
          a.artFrame = frame;
        }
        const h = 1.46 / a.sheet.metadata.idleHeight,
          ratio = a.sheet.metadata.width / 4 / (a.sheet.metadata.height / 8);
        a.sprite.scale.set(h * ratio, h, 1);
        a.sprite.material.rotation = 0;
        a.sprite.material.color.set(u.team === "enemy" ? 0xdab7a8 : 0xffffff);
      } else {
        const attacking = !this.reduced && time < a.attackUntil,
          hurting = !this.reduced && time < a.hurtUntil;
        a.sprite.material.rotation =
          u.hp > 0
            ? attacking
              ? Math.sin(((a.attackUntil - time) / 300) * Math.PI) *
                0.14 *
                (u.team === "ally" ? -1 : 1)
              : 0
            : Math.PI / 2;
        a.sprite.material.color.set(hurting ? 0xffb9a6 : 0xffffff);
      }
      a.base.visible = u.hp > 0;
      a.base.position.set(
        a.sprite.position.x,
        t.h * 0.43 + 0.075,
        a.sprite.position.z,
      );
      a.bar.position.copy(a.sprite.position).add(new THREE.Vector3(0, 1.63, 0));
    }
    this.combatEffects.update(time, this.reduced);
    const gem = this.effects.children[0];
    if (gem) {
      gem.rotation.y = this.reduced ? 0 : time * 0.0006;
      gem.position.y =
        1.95 + (this.reduced ? 0 : Math.sin(time * 0.0015) * 0.1);
    }
    // Tall scenery becomes translucent from the near side to preserve unit readability.
    for (const m of this.root.children) {
      const mesh = m as THREE.Mesh;
      if (mesh.position.y > 1.3) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.transparent = true;
        mat.opacity =
          mesh.position.x * Math.sin(this.angle) +
            mesh.position.z * Math.cos(this.angle) >
          1.5
            ? 0.4
            : 1;
      }
    }
    this.renderer.render(this.scene, this.camera);
  };
  dispose() {
    this.disposed = true;
    this.combatEffects.dispose();
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.renderer.domElement.removeEventListener(
      "pointermove",
      this.pointerMove,
    );
    this.renderer.domElement.removeEventListener(
      "pointerleave",
      this.pointerLeave,
    );
    this.renderer.domElement.removeEventListener("click", this.click);
    this.renderer.domElement.removeEventListener("wheel", this.wheel);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      if (m.material) {
        const materials = Array.isArray(m.material) ? m.material : [m.material];
        materials.forEach((v) => v.dispose());
      }
    });
    this.resources.forEach((t) => t.dispose());
    this.renderer.dispose();
    this.host.replaceChildren();
  }
}
