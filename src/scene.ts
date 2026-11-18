import * as THREE from "three";
import {
  type Battle,
  type Unit,
  key,
  reachable,
  activeUnit,
  canTarget,
  tileAt,
} from "./engine";
import { jobs, skills, type SkillId } from "./data";
export type Mode = "inspect" | "move" | SkillId;
const palette = {
  grass: [0x7d9161, 0x879b6c, 0x74895d, 0x8b9a6a],
  stone: [0xa1a58d, 0xabad96, 0x999e88],
  water: [0x548e91, 0x5e9899, 0x659da0],
};
export function spriteCanvas(
  job: Unit["job"],
  enemy = false,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 42;
  const p = c.getContext("2d")!;
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    p.fillStyle = color;
    p.fillRect(x, y, w, h);
  };
  const ink = "#29352f",
    skin = "#e6bb8d",
    shade = "#b47f5c",
    cloth = enemy ? "#b26854" : jobs[job].color;
  rect(10, 35, 5, 5, ink);
  rect(19, 35, 5, 5, ink);
  rect(10, 34, 5, 3, "#766953");
  rect(19, 34, 5, 3, "#766953");
  rect(9, 20, 16, 15, ink);
  rect(10, 21, 14, 12, cloth);
  rect(11, 27, 12, 4, enemy ? "#7d443e" : "#576d5b");
  rect(11, 31, 5, 5, cloth);
  rect(19, 31, 4, 5, cloth);
  rect(6, 22, 5, 10, ink);
  rect(7, 23, 4, 7, cloth);
  rect(8, 30, 3, 3, skin);
  rect(24, 22, 4, 9, ink);
  rect(24, 23, 3, 6, cloth);
  rect(24, 29, 3, 3, skin);
  rect(10, 7, 14, 14, ink);
  rect(11, 8, 12, 12, skin);
  rect(11, 8, 12, 4, "#5d4939");
  rect(10, 10, 3, 7, "#5d4939");
  rect(21, 10, 3, 5, "#5d4939");
  rect(14, 14, 2, 2, ink);
  rect(20, 14, 2, 2, ink);
  rect(17, 17, 3, 2, shade);
  rect(14, 20, 7, 2, "#f1d7ae");
  rect(13, 22, 2, 8, "#e1d2a1");
  rect(21, 22, 2, 8, "#e1d2a1");
  rect(11, 29, 12, 2, "#574b3b");
  rect(16, 29, 3, 2, "#e6c66e");
  if (job === "vanguard" || job === "runewarden") {
    rect(9, 7, 16, 5, "#8a958b");
    rect(11, 5, 12, 3, "#b2b9a5");
    rect(10, 10, 3, 8, "#8a958b");
    rect(23, 10, 2, 8, "#8a958b");
    rect(15, 6, 3, 5, "#ece5cb");
    rect(5, 23, 9, 12, "#4e6259");
    rect(6, 24, 7, 9, cloth);
    rect(9, 24, 1, 9, "#f6da8c");
    rect(27, 15, 2, 15, "#d9e0cc");
    rect(26, 28, 4, 2, "#b49c60");
    rect(27, 30, 2, 4, "#786142");
  } else if (
    job === "arcanist" ||
    job === "stormherald" ||
    job === "chronoweaver"
  ) {
    rect(9, 19, 17, 4, cloth);
    rect(10, 21, 3, 10, cloth);
    rect(8, 7, 18, 3, ink);
    rect(10, 5, 14, 3, cloth);
    rect(12, 2, 9, 4, cloth);
    rect(14, 0, 5, 3, cloth);
    rect(11, 6, 11, 2, "#f0d49b");
    rect(27, 13, 2, 23, "#75664d");
    rect(25, 10, 6, 5, ink);
    rect(26, 9, 4, 5, enemy ? "#e49466" : "#a9e4d2");
    rect(27, 9, 2, 2, "#f5f3c9");
    rect(12, 33, 12, 4, cloth);
  } else if (job === "lifebinder") {
    rect(10, 5, 14, 5, "#d1d2ad");
    rect(8, 8, 4, 12, cloth);
    rect(23, 8, 3, 12, cloth);
    rect(10, 32, 15, 6, cloth);
    rect(16, 23, 3, 6, "#f8e7ac");
    rect(14, 25, 7, 2, "#f8e7ac");
    rect(27, 13, 2, 23, "#8c7957");
    rect(25, 12, 6, 3, "#d5dfae");
    rect(27, 9, 2, 8, "#d5dfae");
  } else {
    rect(10, 6, 14, 5, cloth);
    rect(9, 11, 3, 9, cloth);
    rect(11, 17, 12, 3, cloth);
    rect(23, 5, 4, 7, cloth);
    rect(27, 23, 2, 9, "#d6dfcf");
    rect(26, 31, 4, 2, "#a68a58");
    rect(5, 26, 2, 7, "#d6dfcf");
  }
  return c;
}
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
  actors = new Map<string, { sprite: THREE.Sprite; bar: THREE.Sprite }>();
  effects = new THREE.Group();
  angle = Math.PI / 4;
  targetAngle = Math.PI / 4;
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
  constructor(
    public host: HTMLElement,
    state: Battle,
    onSelect: (x: number, z: number) => void,
    onHover: (x: number, z: number) => void,
  ) {
    this.state = state;
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
    this.camera = new THREE.OrthographicCamera(-8, 8, 7, -7, 0.1, 100);
    this.scene.fog = new THREE.Fog(0xdce1d0, 24, 48);
    this.scene.add(this.root, this.markers, this.effects);
    this.scene.add(new THREE.HemisphereLight(0xecf5ef, 0x50644f, 2.2));
    const sun = new THREE.DirectionalLight(0xfff4e3, 2.2);
    sun.position.set(-5, 16, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -10,
      right: 10,
      top: 10,
      bottom: -10,
      far: 40,
    });
    sun.shadow.bias = -0.001;
    this.scene.add(sun);
    this.buildTerrain();
    this.buildActors();
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
      const color =
        t.terrain === "water"
          ? palette.water[n]
          : t.terrain === "stone"
            ? palette.stone[n]
            : palette.grass[(t.x * 3 + t.z) % 4];
      const top = this.box(0.975, 0.12, 0.975, color, x, y, z);
      top.userData = { x: t.x, z: t.z };
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
        for (let i = 0; i < 4; i++) {
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
    this.box(9.05, 0.22, 9.05, 0x555e4f, 0, -1.3, 0);
    this.box(8.6, 0.26, 8.6, 0x7d8068, 0, -1.53, 0);
    this.box(8.2, 0.32, 8.2, 0x626b58, 0, -1.8, 0);
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
      const t = texture(spriteCanvas(u.job, u.team === "enemy"));
      this.resources.push(t);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: t,
          transparent: true,
          depthTest: true,
        }),
      );
      sprite.scale.set(0.83, 1.09, 1);
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
      this.scene.add(sprite, bar);
      this.actors.set(u.id, { sprite, bar });
    }
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
        canTarget(state, u, skills[mode], t.x, t.z)
      )
        color = skills[mode].kind === "damage" ? 0xe4ae76 : 0x8dc7ac;
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
      if (t.terrain === "ice")
        (mesh.material as THREE.MeshStandardMaterial).color.set(0xb8d8cc);
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
      if (old.units.find((o) => o.id === v.id)?.job !== v.job) {
        const map = texture(spriteCanvas(v.job, v.team === "enemy"));
        this.resources.push(map);
        actor.sprite.material.map = map;
        actor.sprite.material.needsUpdate = true;
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
      actor.sprite.material.opacity = v.hp > 0 ? 1 : 0.26;
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
      1.65,
    );
  }
  private resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    const aspect = w / h,
      extent = Math.max(aspect > 1.5 ? 6 : 6.9, 6.9 / aspect);
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
      Math.sin(this.angle) * 15,
      14,
      Math.cos(this.angle) * 15,
    );
    this.camera.lookAt(0, 0.1, 0);
    this.camera.updateProjectionMatrix();
    for (const u of this.state.units) {
      const a = this.actors.get(u.id)!,
        t = tileAt(this.state, u.x, u.z)!;
      a.sprite.position.lerp(
        new THREE.Vector3(
          u.x - 4,
          t.h * 0.43 +
            0.08 +
            (this.reduced ? 0 : Math.sin(time * 0.002 + u.x) * 0.018),
          u.z - 4,
        ),
        this.reduced ? 1 : 0.13,
      );
      a.sprite.material.rotation = u.hp > 0 ? 0 : Math.PI / 2;
      a.bar.position.copy(a.sprite.position).add(new THREE.Vector3(0, 1.32, 0));
    }
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
