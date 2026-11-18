# Echoes of the Shattered Crown

## Concise game design

An original tactical RPG about the price of restoring a fractured world. The player leads the Lantern Company, four mercenaries whose contract at the ruined shrine of Veyr uncovers a crown shard. The world broke when the star Avel fell: geography, memory, and even seasons now disagree. Crown fragments can restore continuity, but restoration may erase people born in the fractures.

Sera Vale, a former oathguard, values promises more than kings. Ilya Wren studies impossible histories. Corin Ash survives through movement and humor. Maelis Reed treats wounds in people and landscapes alike. Their opponents at Veyr are the Oathless, who believe silencing the shards is the only defense against another Sundering. Future factions include the Meridian Compact (restoration at any cost) and the Verdant Witness (let the new world grow). Campaign choices will balance restoration against the lives that depend on the fractures; this is a future narrative system, not a branching campaign in this version.

The play loop is inspect timeline → position a companion → preview an ability → act or defend → respond to the opposition. Each unit can move and act once in either order. Cross-class skills, the stream crossing, elevation, revival, terrain spells, and momentum make positioning matter more than grinding.

## Technical architecture

TypeScript and Vite; React owns menus and HUD. Three.js owns the orthographic battlefield. React state is sufficient for the current bounded battle; the pure simulation owns all authoritative gameplay. No Three.js or DOM types enter the simulation. Input adapters translate pointer, keyboard, touchscreen, and standard gamepad input into the same validated command union. A seeded linear congruential generator supplies deterministic accuracy and critical rolls.

`data.ts` defines jobs, skills, costs, prerequisites and progression. `engine.ts` defines units, terrain, state transitions, validation, path costs, attack previews, and scored AI. `scene.ts` draws state and never decides outcomes. `storage.ts` stores versioned snapshots in IndexedDB and retains a previous valid manual save. `audio.ts` synthesizes an original small musical sketch with Web Audio. UI animation time never advances game simulation. AI runs one bounded full turn after a cancellable delay; menus pause that delay.

## Project structure

```text
echoes-of-the-shattered-crown/
  index.html
  package.json / package-lock.json
  tsconfig.json
  DESIGN.md                 design, rules, jobs, art, milestones
  README.md                 run, controls, extension guide, limitations
  src/
    data.ts                 content definitions and progression
    engine.ts               deterministic simulation and AI
    engine.test.ts          rules and battle integration tests
    scene.ts                3D terrain and original pixel sprites
    main.tsx                HUD, menus, input adapters
    storage.ts              IndexedDB snapshots and backup recovery
    audio.ts                original procedural score sketch
    style.css               responsive field-command interface
  .openai/hosting.json       private Site configuration
  dist/                     generated production build
```

## Initial progression matrix

Every 60 JP increases that individual job by one level, starting at level 1. A valid skill use grants 10 JP to the primary job. A battle victory grants 60 JP to every companion. Job changes preserve all job JP. Starting jobs are open; advanced jobs require the listed levels. Secondary skills use the primary job’s stats and armor: durability, range, energy, and speed remain tradeoffs.

| Job | Prerequisites | Identity | Move / speed | Primary abilities | State |
| --- | --- | --- | --- | --- | --- |
| Vanguard | None | Armored protector, adjacency defense | 3 / 10 | Sundering arc | Implemented |
| Blade Dancer | None | Fast flanker, automatic melee riposte | 5 / 14 | Dusk needle | Implemented |
| Arcanist | None | Elemental terrain and area control | 3 / 10 | Cinder bloom, Stillwater | Implemented |
| Lifebinder | None | Ranged healing and revival | 4 / 11 | Thread of life | Implemented |
| Shadowrunner | Blade Dancer 3 | Quick ranged exposure | 5 / 15 | Dusk needle | Implemented definition |
| Runewarden | Vanguard 3 + Arcanist 2 | Defensive elemental hybrid | 3 / 9 | Stillwater | Implemented definition |
| Storm Herald | Arcanist 3 | Lightning and frost | 4 / 12 | Glasslight bolt, Stillwater | Implemented definition |
| Chronoweaver | Arcanist 2 + Lifebinder 3 | Advance ally timeline | 4 / 13 | Borrowed dawn, Thread of life | Implemented definition |
| Beastcaller | Lifebinder 3 + wildlife pact | Summoned companions | Planned | Briar familiar, Recall | Phase 2 |
| Spellblade | Vanguard 2 + Arcanist 3 | Element-infused melee | Planned | Ember edge, Rune lunge | Phase 2 |
| Alchemist | Arcanist 2 + crafting quest | Consumables and surface reactions | Planned | Dew flask, Volatile seed | Phase 2 |
| Soulkeeper | Lifebinder 4 + shrine quest | Risk, revival, spirit transfer | Planned | Lend breath, Soul lantern | Phase 2 |
| Rift Cartographer | Chronoweaver 4 + exploration | Spatial route manipulation | Planned | Fold road, Anchor | Phase 4 |
| Thorn Marshal | Vanguard 4 + Beastcaller 3 | Formation and summoned cover | Planned | Living bastion | Phase 4 |
| Ash Cantor | Soulkeeper 3 + Arcanist 4 | Sustain through area chanting | Planned | Refrain of ash | Phase 4 |
| Glass Ranger | Shadowrunner 3 + Alchemist 3 | Refracted shots, mixtures | Planned | Prism volley | Phase 4 |
| Tidemason | Runewarden 4 + Storm Herald 3 | Water and terrain construction | Planned | Raise causeway | Phase 4 |
| Oathbreaker | Blade Dancer 4 + moral choice | Sacrifice defense for disruption | Planned | Sever promise | Phase 4 |
| Star Shepherd | Beastcaller 5 + Chronoweaver 4 | Celestial summons | Planned | Call lost star | Phase 4 |
| Crownless | Three advanced job masteries | Rare coordinated leadership | Planned | Unwritten oath | Phase 4 |

The first playable version exposes eight job definitions. Four are available immediately, four are prerequisite-locked. The single encounter supplies limited JP; persistent multi-battle progression, permanent purchased skills, mastery passives, reaction/movement slots, equipment restrictions and the remaining jobs belong to Phase 2 onward. The initial four companions carry starter secondary sets (including Ilya’s Storm Herald set) to demonstrate cross-class builds. New secondary changes enforce unlock requirements. A fresh replay currently resets JP; a saved snapshot retains it.

## Combat rules

- Board: 9×9, four cardinal neighbors, elevation 0–2. Water and obstacles block movement. Ice is walkable. A step can climb or descend one elevation; climbing adds one movement cost. Occupied living units block paths. Fallen units retain their tile until revived, preventing overlapping occupants.
- Reachability uses a uniform-priority cost search. Movement is atomic at the chosen destination; rendering interpolates it. Preview the cost and confirm before committing. No movement undo after confirmation.
- Timeline: units begin with staggered readiness ticks. After a turn, readiness increases by `round(1000 / job speed)`, plus slow penalty. Lowest readiness acts next, ties broken by stable unit ID. Movement and action each happen at most once; either order is valid. Each new turn restores 3 energy, capped at 32.
- Base damage: skill power + primary job attack (physical) or magic − target armor − adjacent allied Vanguard formation defense (4), plus height (4 per elevation, bounded −6/+8), flanking (6), exposure (7). Guard multiplies damage by .55. Minimum rounded damage 1. Critical chance 10%, critical multiplier 1.5. Accuracy `clamp(94 + flank 6 + height*2, max 100)`. Preview gives non-critical damage and exact hit chance; critical rolls are not revealed.
- Facing is a cardinal vector; an attacker behind the defender earns the flank bonus. Taking a movement or action updates facing. Defending is the default when ending without using an ability; it lasts until that unit’s next activation.
- Ranged abilities sample intervening cells for obstacle and height line-of-sight. This is a discrete grid approximation, not ray intersection with decorative scenery. Full tile columns are the occluders.
- Area skills affect the target plus four cardinal neighbors. Damage spares allies. Spells can target empty terrain; they still consume energy and the action.
- Cinder bloom burns enemies for 6 damage at their next two turn endings and ignites grass. Burning terrain deals 4 extra damage at a turn ending; it decays once per eight individual activations. Stillwater freezes water, slows enemies and soaks them for two turns. Glasslight bolt deals 50% more damage to soaked targets. Dusk needle exposes a target to +7 damage. A Blade Dancer automatically counters an adjacent basic strike for 9 damage if it survives.
- Thread of life restores 36 health, capped at max, or revives at 24; it also removes burn. A unit at 0 health cannot act and is omitted from the timeline until revived. No permanent death in this slice.
- Each successful allied hit generates one company momentum, capped at 5. Lantern concord spends 3 for a spirit area attack. Nearby Vanguard protection and the concord demonstrate formation and coordinated play.
- Victory: no living enemies. Defeat: no living allies. Terminal states reject commands; victory rewards are applied once. Manual save is separate from a new-battle reset.
- Enemy AI scores reachable positions by preferred attack distance, height, move cost, and hazards, then scores legal actions by effective damage, kills, missing allied health and revival value. Different jobs favor melee or ranged distance. Full boss personalities, objective coordination, retreat and difficulty tiers remain planned.

## Original art direction and asset pipeline

Veyr is a moss-colored island of broken stone, split by a cold stream, suspended over a quiet ground of pale sage. Honey limestone, weathered bronze, faded cloth and dark tree shadows form the material palette. The UI resembles a company's field ledger, with a tinted frame and a light inset battlefield sheet. The largest region always answers “where should this unit act?” rather than presenting a decorative landing page. Its own signature is the fractured shrine and the company momentum strip. Color belongs primarily to actual terrain, sprites and tactical overlays.

Characters are authored directly as 32×42 transparent pixel canvases: dark contours, two-tone skin, layered tunics, readable heads and class-specific props. Vanguard has a helmet, shield and sword; Arcanist a crooked cap and glass staff; Lifebinder a pale hood and branching staff; Blade Dancer twin blades and a face wrap. Enemies use rust cloth. Nearest-neighbor sampling preserves pixel edges; camera-facing billboards preserve readability through rotation. This is original code-authored pixel artwork; it uses no commercial game assets. Current art includes idle bob, positional travel, and fallen pose, rather than the full requested ten-state animation library.

Terrain is original procedural Three.js geometry: individually colored cliff blocks, engraved paving, layered plinths, angular foliage, broken shrine columns and a rotating crown shard. Soft sunlight and shadows provide atmosphere. Foreground tall scenery fades from near camera orientations. Mint means movement, sand means attack range, gold means selected tile, and unit markers combine circle/diamond shapes with team color. The same commands work on touch.

Extension: replace `spriteCanvas()` with an imported sprite atlas while retaining the billboard material contract. Future asset manifest should provide job, team palette, frame size, state, direction and frame durations. Atlas animation must follow simulation events, never use animation frames to determine damage. The current procedural approach provides a reproducible asset baseline; a full illustrated sprite production pipeline remains planned.

## Milestones and acceptance

1. **Rules foundation:** pure typed state and commands; pathfinding, elevation, deterministic attacks, AI and outcome tests. Accepted when a complete simulated scenario terminates and invalid commands preserve state.
2. **Phase 1 vertical slice:** Veyr map, 4 companions / 4 enemies, 4 starter jobs, rotatable orthographic camera, terrain highlights, preview/confirmation, movement, attacks, spells, status, timeline, AI, victory/defeat, original pixel art and usable HUD. Run production build, browser smoke test and engine suite; document limits in README.
3. **Phase 2 progression:** expand to 12 complete jobs, permanent purchased skills, mastery passives and reaction/movement slots, inventory/equipment, meaningful unlock boards and carried progression. Current eight definitions, secondary loadouts, JP and manual IndexedDB saves are early foundations, not a completed phase.
4. **Phase 3 campaign:** hub, world map, branching dialogue, recruitment, shops, quest state, several encounters and authored orchestral music. Author a campaign state machine before adding screens.
5. **Phase 4 advanced systems:** grow to the 20-job roster above, destructible/raised terrain, elemental interactions, summons, boss behaviors, crafting and challenge missions. Balance through encounter tests and build diversity.
6. **Phase 5 release:** complete sprite animation sets, PWA install/offline cache, version migrations, save export/import, scalable quality settings, remapping, accessibility review, mobile device and browser matrix, 60 FPS profiling and content QA. Commercial-quality completion requires these future milestones and authored campaign content.
