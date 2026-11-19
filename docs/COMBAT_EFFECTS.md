# Combat effects and particles

[Documentation index](README.md) · [Character animation](ANIMATION_PIPELINE.md) · [Exact generation prompts](effect-prompts.json) · [Live effect workbench](https://cptnope.github.io/Echoes-of-the-Shattered-Crown/animation-review.html#spellcraft)

Version 0.8 adds **96 effect frames**: twelve eight-frame sequences across three transparent atlases. These supplement the 256 character animation frames. All thirteen current abilities have an effect recipe; Borrowed dawn and Stolen hour share the time sequence.

## Ability table

Each sequence occupies two consecutive rows of a four-column, eight-row atlas. Row indices below are zero based.

| Ability | Atlas / rows | Particle treatment | Travel |
| --- | --- | --- | --- |
| Weapon strike | martial / 0–1 | Brass contact sparks | None |
| Sundering arc | martial / 2–3 | Broad golden sparks | None |
| Gloam pursuit | martial / 4–5 | Violet shadow fragments | 100 ms |
| Lantern concord | martial / 6–7 | Warm gathering motes | 200 ms |
| Cinder bloom | elements / 0–1 | Rising embers | 280 ms |
| Stillwater | elements / 2–3 | Scattered ice fragments | 230 ms |
| Glasslight bolt | elements / 4–5 | Cyan electric sparks | 100 ms |
| Rain of glass | elements / 6–7 | Falling drops | 260 ms |
| Thread of life | support / 0–1 | Rising green healing motes | 260 ms |
| Oathguard | support / 2–3 | Warm protective motes | 180 ms |
| Borrowed dawn | support / 4–5 | Amber time particles | 200 ms |
| Stolen hour | support / 4–5 | Lavender time particles | 220 ms |
| Dusk needle | support / 6–7 | Purple shadow motes | 240 ms |

Recipes in [combat-effects.ts](../src/combat-effects.ts) define frame duration, scale, travel and particle color. Clips use 60–95 ms per frame and stop after eight frames. There are no screen shakes, full-screen flashes or animation-dependent damage delays.

## Cue and outcome contract

A valid command records optional Battle.lastAction.target and outcomes in addition to unit, skill and turn. Each resolved target is marked hit, miss, heal or buff by the existing command path. No additional combat RNG rolls are consumed. The renderer uses these facts; it does not infer successful hits from a log string.

Old v2 saves can omit target and outcomes. Such historical cues do not create target effects. Loading a snapshot does not replay its last action. Validation rejects malformed coordinates, unknown units, duplicate outcome units and unknown outcome types.

```mermaid
sequenceDiagram
    participant Rules as Combat rules
    participant Cue as Resolved action cue
    participant Actor as Character renderer
    participant FX as Effect renderer
    Rules->>Rules: Resolve costs, hit rolls, damage and statuses
    Rules->>Cue: Record target and per-unit outcomes
    Cue->>Actor: Queue attack or cast
    Actor->>Actor: Finish position interpolation
    Actor->>FX: Emit cosmetic effect
    FX->>FX: Cast motes and optional travel
    FX->>FX: Eight-frame target sequence
    FX->>FX: Successful outcome particles only
    FX->>FX: Recycle slots and expire particles
```

Area effects follow the same Manhattan-distance cross as the ability radius and clip to existing board tiles. The spell itself appears on affected terrain even if a unit evades. Successful-hit particles are absent for misses; cast/travel motes remain. Heal and buff targets receive their matching motes. Empty-terrain casts still show their selected area.

AI snapshots can combine movement and damage. The character renderer starts the effect after that actor's interpolation, while authoritative damage and target recoil remain immediate. Effects do not change turn order, RNG, HP, statuses, rewards or save timing.

## Rendering and resource limits

| Resource | Limit / behavior |
| --- | --- |
| Effect sprite slots | 24; recycle oldest slots under pressure |
| Particle slots | 256; ring-buffer replacement |
| Particle draw | One Points geometry with shared shader |
| Atlas images | Three cached images; lazy load when a battlefield is created |
| UV playback | Reuses texture sources and changes UVs; no per-frame texture creation |
| Depth | Transparent, depth-tested overlays; no depth writes |
| Failed art request | Colored ground rings and particles |
| Reduced motion | Stable contact pose for 400 ms, no moving projectiles or particles |
| Teardown | Remove effect group; dispose pooled maps/materials, geometry and atlas textures |

Particle seeds derive from action identity and target coordinates. Cosmetic variation also uses a renderer-local emission counter. Neither consumes the combat seed. Local browser observations confirm bounded counts and cleanup; this is not GPU profiling or a frame-rate guarantee across devices.

## Assets, provenance and build

The built-in OpenAI image-generation tool produced three new RGBA PNGs with transparent backgrounds and no supplied reference images. Full final prompts are saved in [effect-prompts.json](effect-prompts.json). They request four columns and eight rows; the actual outputs are 1254 × 1254 pixels. Cells are therefore 313.5 × 156.75. The renderer preserves this aspect ratio and uses a one-pixel inset to reduce neighboring-cell sampling.

Masters are delivered in echoes-effect-masters.zip as martial.png, elements.png and support.png, plus the prompt file. Runtime WebP files live in public/art/effects and total **2,033,246 bytes**. The manifest records dimensions, layout, clip names, source and runtime SHA-256 hashes, decoded per-cell hashes and high-alpha pixel counts.

```sh
npm ci
npm run effects:build -- ../echoes-effect-masters
npm run effects:verify
npm test
npm run build
```

Sharp performs WebP encoding (quality 92, alpha quality 100) and read-only metadata derivation. Raw generated masters are preserved. The build does not synthesize or redraw artwork. Commit the three runtime files and manifest together. Both local and deployed Pages verification include these assets; local checks also decode all 96 cells.

## Review and validation

The animation workbench includes an ability selector and eight contact-sheet frames. Preview ability uses the production renderer with isolated visual cues; it does not change saved companies. Hold contact pose freezes effect review. Preview miss removes successful-hit motes. Preview fallback substitutes rings. Burst stress check emits fifty cues to inspect the pool caps. Record spell reel cycles through all thirteen abilities and downloads a WebM where supported.

The pure suite has 62 tests, including seven effect cases covering recipe coverage, eight-frame/reduced playback, cross geometry, misses, real command outcomes/RNG, save compatibility and deterministic particle sampling.

Browser checks rendered all thirteen ability previews and recorded their reel without console errors. A held fifty-cast check stayed within 24 sprite and 256 particle slots, then returned to zero active effects after release. A Cinder bloom miss showed 16 cast/travel particles instead of 40 for two successful targets. Procedural fallback rendered rings; reduced motion removed all particles. A normal-game Arcanist moved and cast Cinder bloom, spending nine energy and resolving damage through the regular UI.

## Boundaries

These are compact stylized effects with eight frames per sequence. Time abilities share artwork with different particle palettes. Weapon-specific attacks, directional spell views, persistent status auras, boss-exclusive spells and bespoke sound effects remain future work. Pools can drop older visuals during extreme bursts; authoritative combat results are unchanged.

