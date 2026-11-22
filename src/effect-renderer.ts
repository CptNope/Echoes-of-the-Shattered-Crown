import type { AbilityCues } from "./studio-assets";
import * as THREE from "three";
import type { Battle } from "./engine";
import { loadEffectAtlas } from "./effect-art";
import type { ActionCue } from "./animation";
import {
  effectRecipes,
  effectFrame,
  planCombatEffect,
  particleOffset,
  MAX_EFFECT_SPRITES,
  MAX_EFFECT_PARTICLES,
  type EffectPlan,
  type EffectAtlas,
  type GridPoint,
  type ParticleKind,
} from "./combat-effects";
type Slot = {
  sprite: THREE.Sprite;
  map: THREE.Texture;
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  plan: EffectPlan | null;
  born: number;
  delay: number;
  point: GridPoint;
  travel: boolean;
  source: EffectAtlas | null;
};
type Particle = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  born: number;
  life: number;
  gravity: number;
  color: THREE.Color;
};
export class CombatEffects {
  readonly group = new THREE.Group();
  private atlases = new Map<EffectAtlas, THREE.Texture>();
  private slots: Slot[] = [];
  private particles: (Particle | null)[] =
    Array(MAX_EFFECT_PARTICLES).fill(null);
  private particleCursor = 0;
  private geometry = new THREE.BufferGeometry();
  private positions = new Float32Array(MAX_EFFECT_PARTICLES * 3);
  private colors = new Float32Array(MAX_EFFECT_PARTICLES * 3);
  private alphas = new Float32Array(MAX_EFFECT_PARTICLES);
  private pointMaterial: THREE.ShaderMaterial;
  private ringGeometry = new THREE.RingGeometry(0.18, 0.23, 24);
  private disposed = false;
  public holdPreview = false;
  public fallbackPreview = false;
  private serial = 0;
  public stats = {
    atlases: 0,
    sprites: 0,
    particles: 0,
    casts: 0,
    recycled: 0,
  };
  constructor(
    scene: THREE.Scene,
    private height: (x: number, z: number) => number,
    private cues?: AbilityCues,
  ) {
    scene.add(this.group);
    this.group.name = "Combat effects";
    for (let i = 0; i < MAX_EFFECT_SPRITES; i++) {
      const map = new THREE.Texture();
      map.colorSpace = THREE.SRGBColorSpace;
      map.minFilter = map.magFilter = THREE.LinearFilter;
      map.generateMipmaps = false;
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map,
          transparent: true,
          depthWrite: false,
          alphaTest: 0.12,
          toneMapped: false,
          opacity: 0.78,
        }),
      );
      sprite.visible = false;
      sprite.renderOrder = 5;
      const ring = new THREE.Mesh(
        this.ringGeometry,
        new THREE.MeshBasicMaterial({
          color: 0xd1b57a,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      this.group.add(sprite, ring);
      this.slots.push({
        sprite,
        map,
        ring,
        plan: null,
        born: 0,
        delay: 0,
        point: { x: 0, z: 0 },
        travel: false,
        source: null,
      });
    }
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(this.colors, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this.geometry.setAttribute(
      "alpha",
      new THREE.BufferAttribute(this.alphas, 1).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this.pointMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      vertexShader:
        "attribute vec3 color; attribute float alpha; varying vec3 vColor; varying float vAlpha; void main(){vColor=color;vAlpha=alpha;vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=clamp(150.0/max(1.0,-p.z),2.0,8.0);}",
      fragmentShader:
        "varying vec3 vColor; varying float vAlpha; void main(){float d=length(gl_PointCoord-vec2(0.5));float a=(1.0-smoothstep(0.12,0.5,d))*vAlpha;if(a<0.01)discard;gl_FragColor=vec4(vColor,a);}",
    });
    const points = new THREE.Points(this.geometry, this.pointMaterial);
    points.frustumCulled = false;
    points.renderOrder = 6;
    this.group.add(points);
    void this.loadArt();
  }
  private async loadArt() {
    await Promise.allSettled(
      (["martial", "elements", "support"] as const).map(async (id) => {
        const art = await loadEffectAtlas(id);
        if (!art || this.disposed) return;
        const map = new THREE.Texture(art.image);
        map.colorSpace = THREE.SRGBColorSpace;
        map.minFilter = map.magFilter = THREE.LinearFilter;
        map.generateMipmaps = false;
        map.needsUpdate = true;
        this.atlases.set(id, map);
        this.stats.atlases = this.atlases.size;
      }),
    );
  }
  emit(cue: ActionCue, battle: Battle, now: number, reduced: boolean) {
    const plan = planCombatEffect(cue, battle, this.cues);
    if (!plan || this.disposed) return;
    this.serial++;
    this.stats.casts++;
    const r = effectRecipes[plan.skill],
      self = plan.origin.x === plan.target.x && plan.origin.z === plan.target.z;
    const travel = reduced ? 0 : self ? 0 : r.travelMs,
      delay = reduced ? 0 : 90 + travel;
    if (travel > 0) this.slot(plan, now, 90, plan.target, true);
    for (const p of plan.tiles) this.slot(plan, now, delay, p, false);
    if (reduced) return;
    this.motes(plan, plan.origin, now, 8, r.particle, 0.35);
    for (const p of plan.hits)
      this.motes(plan, p, now + delay, 12, r.particle, 1);
    // Trail motes are staggered along the route, even when a target evades.
    if (travel > 0)
      for (let i = 1; i <= 8; i++) {
        const t = i / 9,
          p = {
            x: plan.origin.x + (plan.target.x - plan.origin.x) * t,
            z: plan.origin.z + (plan.target.z - plan.origin.z) * t,
          };
        this.motes(plan, p, now + 90 + travel * t, 1, r.particle, 0.15);
      }
  }
  private slot(
    plan: EffectPlan,
    born: number,
    delay: number,
    point: GridPoint,
    travel: boolean,
  ) {
    let slot = this.slots.find((s) => !s.plan);
    if (!slot) {
      slot = this.slots.reduce((a, b) => (a.born < b.born ? a : b));
      this.stats.recycled++;
    }
    Object.assign(slot, { plan, born, delay, point, travel });
    slot.sprite.visible = false;
    slot.ring.visible = false;
  }
  private motes(
    plan: EffectPlan,
    p: GridPoint,
    born: number,
    count: number,
    kind: ParticleKind,
    power: number,
  ) {
    const r = effectRecipes[plan.skill],
      color = new THREE.Color(r.color),
      base = this.height(p.x, p.z) + 0.75;
    for (let i = 0; i < count; i++) {
      const seed = plan.seed ^ Math.imul(this.serial + i + 1, 31),
        angle = particleOffset(seed, i) * Math.PI * 2,
        speed = (0.3 + particleOffset(seed, i + 12)) * power;
      const rain = kind === "rain",
        rise = kind === "motes" || kind === "time",
        shadow = kind === "shadow";
      const particle: Particle = {
        x: p.x - 4 + (particleOffset(seed, i + 20) - 0.5) * 0.35,
        y: base + (rain ? 0.65 : 0),
        z: p.z - 4 + (particleOffset(seed, i + 30) - 0.5) * 0.35,
        vx: Math.cos(angle) * speed,
        vy: rain ? -2 : rise ? 0.8 : shadow ? 0.25 : 0.8 + speed,
        vz: Math.sin(angle) * speed,
        born,
        life: rain ? 500 : rise ? 850 : 650,
        gravity: rain ? -1 : rise ? 0 : -1.9,
        color,
      };
      this.particles[this.particleCursor] = particle;
      this.particleCursor = (this.particleCursor + 1) % MAX_EFFECT_PARTICLES;
    }
  }
  update(now: number, reduced: boolean) {
    let sprites = 0,
      particles = 0;
    for (const s of this.slots) {
      if (!s.plan) continue;
      const r = effectRecipes[s.plan.skill],
        age = this.holdPreview ? r.frameMs * 3 : now - s.born - s.delay,
        travelMs = r.travelMs;
      const life = reduced ? 400 : s.travel ? travelMs : r.frameMs * 8;
      if ((!this.holdPreview && age >= life) || (reduced && s.travel)) {
        s.plan = null;
        s.sprite.visible = s.ring.visible = false;
        continue;
      }
      if (this.holdPreview && s.travel) {
        s.sprite.visible = s.ring.visible = false;
        continue;
      }
      if (age < 0) {
        s.sprite.visible = s.ring.visible = false;
        continue;
      }
      const progress = s.travel ? Math.min(1, age / travelMs) : 0,
        p = s.travel
          ? {
              x: s.plan.origin.x + (s.point.x - s.plan.origin.x) * progress,
              z: s.plan.origin.z + (s.point.z - s.plan.origin.z) * progress,
            }
          : s.point;
      const y =
          this.height(p.x, p.z) +
          0.8 +
          (s.travel ? Math.sin(progress * Math.PI) * 0.35 : 0),
        source = this.fallbackPreview ? undefined : this.atlases.get(r.atlas);
      if (source) {
        if (s.source !== r.atlas) {
          s.map.source = source.source;
          s.map.needsUpdate = true;
          s.source = r.atlas;
        }
        const index = effectFrame(s.plan.skill, s.travel ? 0 : age, reduced),
          col = index % 4,
          row = Math.floor(index / 4);
        const image = source.image as HTMLImageElement,
          px = 1 / image.naturalWidth,
          py = 1 / image.naturalHeight;
        s.map.repeat.set(0.25 - 2 * px, 0.125 - 2 * py);
        s.map.offset.set(col / 4 + px, 1 - (row + 1) / 8 + py);
        const size = s.travel ? 0.5 : r.size,
          ratio = image.naturalWidth / 4 / (image.naturalHeight / 8);
        s.sprite.position.set(p.x - 4, y, p.z - 4);
        s.sprite.scale.set(size * ratio, size, 1);
        s.sprite.material.opacity = reduced
          ? 0.62
          : 0.78 * (s.travel ? 1 : Math.min(1, (life - age) / 160));
        s.sprite.visible = true;
        s.ring.visible = false;
      } else {
        s.sprite.visible = false;
        s.ring.visible = true;
        s.ring.material.color.set(r.color);
        s.ring.material.opacity = reduced ? 0.55 : 0.7 * (1 - age / life);
        s.ring.scale.setScalar(reduced ? 2 : 1 + (age / life) * 3);
        s.ring.position.set(p.x - 4, this.height(p.x, p.z) + 0.12, p.z - 4);
      }
      sprites++;
    }
    for (let i = 0; i < MAX_EFFECT_PARTICLES; i++) {
      const p = this.particles[i];
      this.alphas[i] = 0;
      if (!p) continue;
      const age = this.holdPreview ? 180 : now - p.born;
      if (reduced || age >= p.life) {
        this.particles[i] = null;
        continue;
      }
      if (age < 0) continue;
      const t = age / 1000;
      this.positions[i * 3] = p.x + p.vx * t;
      this.positions[i * 3 + 1] = p.y + p.vy * t + p.gravity * t * t * 0.5;
      this.positions[i * 3 + 2] = p.z + p.vz * t;
      this.colors[i * 3] = p.color.r;
      this.colors[i * 3 + 1] = p.color.g;
      this.colors[i * 3 + 2] = p.color.b;
      this.alphas[i] = 0.9 * (1 - age / p.life);
      particles++;
    }
    for (const name of ["position", "color", "alpha"])
      this.geometry.getAttribute(name).needsUpdate = true;
    this.stats.sprites = sprites;
    this.stats.particles = particles;
  }
  clear() {
    for (const s of this.slots) {
      s.plan = null;
      s.sprite.visible = s.ring.visible = false;
    }
    this.particles.fill(null);
    this.alphas.fill(0);
    this.geometry.getAttribute("alpha").needsUpdate = true;
    this.stats.sprites = this.stats.particles = 0;
  }
  dispose() {
    this.disposed = true;
    this.group.removeFromParent();
    for (const s of this.slots) {
      s.map.dispose();
      s.sprite.material.dispose();
      s.ring.material.dispose();
    }
    this.ringGeometry.dispose();
    this.geometry.dispose();
    this.pointMaterial.dispose();
    for (const t of this.atlases.values()) t.dispose();
    this.particles.fill(null);
  }
}
