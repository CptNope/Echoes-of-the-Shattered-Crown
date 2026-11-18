# PROJECT: ECHOES OF THE SHATTERED CROWN
### An Original Isometric Tactical RPG

## 1. Project Vision

Create a completely original, polished, fully playable tactical role-playing game inspired by the strategic depth and character customization of classic games such as Final Fantasy Tactics, Tactics Ogre, and other iconic tactical RPGs.

**This must be an original intellectual property**, featuring a unique world, original characters, factions, lore, artwork, music, class names, abilities, narrative, and gameplay innovations.

The goal is not to reproduce another game, but to build a modern tactical RPG that captures the satisfying complexity of classic grid-based strategy games while introducing new mechanics and modern usability.

The final game should feel like a complete commercial-quality indie RPG, not a technical demonstration.

## 2. Technology and Architecture

Build using a modern browser-based game architecture.

**Preferred technologies:**
- TypeScript for all gameplay systems.
- Three.js for isometric 3D environments and camera movement.
- Custom pixel-art character sprites rendered in a 3D environment.
- React for menus, HUD, inventory, and character-management interfaces where appropriate.
- Zustand or an equivalent state-management solution.
- Vite for building and development.
- IndexedDB for local save files.
- PWA support for installation and offline gameplay.
- Gamepad, keyboard, mouse, and touchscreen support.

Use a modular, data-driven architecture so combat, classes, abilities, items, characters, enemies, maps, and story events can be expanded without rewriting core systems.

Separate game simulation from rendering. Combat outcomes must be deterministic and testable independently of the graphical engine.

## 3. Isometric World and Camera

Implement a beautiful isometric battlefield with a freely rotatable camera.

**Required features:**
- Four primary camera orientations with smooth 90-degree rotation.
- Optional continuous camera rotation.
- Adjustable zoom.
- Orthographic projection for a classic tactical appearance.
- Terrain height differences and multi-level environments.
- Smooth camera tracking.
- Transparent or faded foreground objects when they obstruct characters.
- Clear indicators for movement, attacks, spells, and abilities.
- Terrain highlighting and tile selection.
- Visually distinct elevations, obstacles, ramps, and ledges.

Maps should include forests, villages, castles, ruins, caves, mountains, deserts, and supernatural environments.

Support destructible obstacles, environmental hazards, weather, and dynamic battlefield elements.

Characters must remain visually readable from every camera orientation.

## 4. Tactical Combat Engine

Create a deep turn-based, grid-based tactical combat system.

### Essential mechanics

- Individual character turns governed by speed and an action timeline.
- Grid-based movement using terrain-aware pathfinding.
- Movement distance determined by character stats, equipment, and abilities.
- Height and elevation affecting combat.
- Directional attacks and positioning bonuses.
- Physical and magical attacks.
- Area-of-effect skills.
- Elemental strengths, weaknesses, and resistances.
- Status effects, buffs, and debuffs.
- Critical hits and counterattacks.
- Line-of-sight and ranged attack calculations.
- Movement and action previews.
- Reaction abilities and defensive positioning.
- Character incapacitation, revival, and configurable permadeath.
- Victory, defeat, and optional objectives.

### Advanced mechanics

Introduce original features such as:

**Terrain Manipulation:** Certain abilities can alter battlefield tiles, raise barriers, freeze water, ignite vegetation, or create hazardous surfaces.

**Ability Combinations:** Skills can interact. For example, water-soaked enemies become more vulnerable to lightning, while certain terrain effects amplify elemental spells.

**Momentum System:** Strategic actions generate momentum that can unlock special coordinated attacks.

**Formation Synergy:** Nearby allies can provide defensive, offensive, or magical bonuses based on their classes and abilities.

Combat must reward clever positioning and creative strategies rather than simply grinding levels.

## 5. Deep Job and Class System

This is one of the most important systems in the entire game.

Every playable character must be able to access multiple job classes, level those classes individually, learn permanent abilities, and combine skills from different jobs.

### Core requirements

Each character has:

- An overall character level.
- A current primary job.
- A secondary job ability set.
- Individually tracked job levels.
- Job experience points (JP).
- Learned abilities from previously mastered jobs.
- Passive ability slots.
- Reaction ability slots.
- Movement ability slots.
- Equipment proficiencies.
- Character-specific attributes and affinities.

### Example original job classes

| Job | Combat identity |
|---|---|
| Vanguard | Heavy armor, protection, defensive formations |
| Blade Dancer | Mobile melee attacks and counterattacks |
| Arcanist | Elemental spellcasting |
| Lifebinder | Healing, cleansing, and support |
| Shadowrunner | Stealth, flanking, and critical attacks |
| Runewarden | Defensive magic and enchanted equipment |
| Beastcaller | Summons and companion creatures |
| Chronoweaver | Turn-order and temporal manipulation |
| Spellblade | Weapons enhanced through magic |
| Storm Herald | Weather and electrical attacks |
| Alchemist | Potions, bombs, and battlefield concoctions |
| Soulkeeper | Spirit magic, resurrection, and sacrifice |

Design at least 20 meaningful jobs over the full development roadmap, with 8–12 implemented in the first substantial playable version.

### Job progression

Jobs must have unlock requirements based on other job levels, achievements, narrative progress, or exploration.

Example:

- Vanguard level 3 + Arcanist level 2 unlocks Runewarden.
- Blade Dancer level 4 + Shadowrunner level 3 unlocks a specialized hybrid job.
- Mastering combinations of advanced jobs unlocks rare legendary professions.

Make these requirements data-driven and clearly visible in a job-unlock interface.

### Cross-class customization

Players should be able to create combinations such as:

- A heavily armored tank who can heal allies.
- A stealth assassin with elemental spells.
- A mage who can equip powerful melee weapons.
- A summoner with temporal manipulation abilities.
- A ranged fighter specializing in alchemical effects.

Changing jobs must preserve learned abilities and individual job progress.

Balance the system through ability slots, resource costs, equipment restrictions, and meaningful tradeoffs so no combination automatically dominates.

## 6. Character Growth and Equipment

Implement comprehensive character progression.

Each character should have primary attributes such as:

- Health
- Energy / Mana
- Strength
- Vitality
- Intelligence
- Spirit
- Dexterity
- Agility
- Speed
- Luck

Growth rates can vary by job, but avoid mechanics that permanently punish players for experimenting with different classes.

Implement:

- Weapons and armor.
- Accessories and magical relics.
- Equipment rarity and unique properties.
- Crafting and upgrading.
- Character affinities.
- Skill trees or job-specific skill boards.
- Respecialization options.
- Unique character abilities.
- Recruitable allies and optional characters.

Equipment should visibly influence gameplay and, where practical, character appearance.

## 7. Custom Pixel Art and Visual Identity

Create an entirely original visual identity combining beautiful pixel-art characters with atmospheric 3D isometric environments.

### Art direction

- High-quality original pixel art.
- Detailed fantasy character silhouettes.
- Expressive attack and casting animations.
- Unique class-specific costumes and equipment.
- Rich environmental colors.
- Dynamic lighting and shadows.
- Animated environmental effects.
- Strong visual readability on small screens.

Characters should appear as detailed pixel-art sprites integrated into 3D environments.

### Animation requirements

Produce character animation sets for:

- Idle
- Walking
- Running
- Attacking
- Casting
- Taking damage
- Defending
- Using items
- Victory
- Incapacitation

Support directional sprites or another consistent technique that preserves character readability when rotating the camera.

Use original assets. Do not extract, trace, recolor, or redistribute existing commercial game artwork.

Create a reusable asset pipeline for importing sprite sheets, tiles, effects, and character animations.

## 8. World, Story, and Exploration

Develop an original high-fantasy world set centuries after a mysterious celestial event fractured reality into competing territories.

The shattered remnants of an ancient crown are believed to control the stability of the world. Several factions seek these fragments for conflicting reasons.

The player commands a small mercenary company gradually drawn into political intrigue, forgotten history, supernatural conflicts, and difficult moral choices.

### Narrative requirements

- Original setting and world history.
- Several major political factions.
- Memorable protagonists and antagonists.
- Branching story decisions.
- Character relationships.
- Optional conversations.
- Side quests.
- Multiple endings.
- A central hub for managing the party.
- World map navigation.
- Towns, merchants, crafting, and recruitment.

Storytelling should be mature, character-driven, and emotionally engaging.

Avoid copying the characters, plot structure, named locations, factions, or iconic story elements of existing RPG franchises.

## 9. Enemy AI

Develop a modular tactical AI system capable of:

- Evaluating advantageous positions.
- Prioritizing threats and objectives.
- Healing vulnerable allies.
- Exploiting elemental weaknesses.
- Using terrain and elevation.
- Protecting key units.
- Coordinating group attacks.
- Retreating when appropriate.
- Applying status effects intelligently.

Support multiple AI personalities, including aggressive, defensive, opportunistic, support-oriented, and boss-specific behaviors.

Difficulty should scale through tactical decision quality, encounter design, and unit composition, not simply inflated enemy statistics.

## 10. Menus and User Experience

Create polished, intuitive interfaces for:

- Main menu.
- Save/load system.
- Party management.
- Job selection and progression.
- Ability selection.
- Equipment and inventory.
- World map.
- Quest journal.
- Combat timeline.
- Combat command menu.
- Battle results and rewards.
- Settings and accessibility.

Include tooltips, clear ability descriptions, comparisons, combat previews, and confirmation prompts.

Provide optional battle animation speed controls, reduced motion, adjustable UI scaling, colorblind-friendly indicators, and configurable controls.

## 11. Sound and Music

Establish an original atmospheric audio identity.

Support:

- Original orchestral-inspired fantasy music.
- Dynamic battle music.
- Distinct sound effects for weapon types.
- Unique magical effects.
- Ambient environmental audio.
- Menu and interface sounds.
- Volume controls for each audio category.

Use only properly licensed or original audio assets.

## 12. Game Modes and Replayability

Implement a campaign with optional content and expandable systems for:

- Story battles.
- Random encounters.
- Challenge missions.
- Arena battles.
- Optional bosses.
- New Game Plus.
- Advanced difficulty settings.
- Rare job unlocks.
- Recruitable characters.
- Procedurally assembled optional encounters.

Provide enough build variety that players can complete campaigns using significantly different strategies.

## 13. Performance and Compatibility

The game must work smoothly on:

- Windows desktop browsers.
- macOS browsers.
- Android devices.
- iPhones and iPads.
- Installed PWA environments.

Target 60 FPS on supported desktop hardware, with adaptive graphical settings for mobile devices.

Optimize sprite batching, textures, lighting, map geometry, memory allocation, and AI calculations.

Save data must be versioned and recoverable without relying on a backend server.

## 14. Development Strategy

Do not attempt to generate the entire game in one enormous, untested implementation.

Develop it in clearly defined phases.

### Phase 1: Functional Vertical Slice

Deliver:

- One fully playable tactical battle.
- A functioning isometric, rotatable camera.
- Original pixel-art character assets.
- At least four distinct character classes.
- Movement and elevation.
- Attacks and abilities.
- Turn-order system.
- Enemy AI.
- Victory and defeat states.
- Functional combat HUD.

### Phase 2: Job and Character Systems

Implement:

- Eight to twelve job classes.
- Job experience and mastery.
- Cross-class skill customization.
- Equipment and inventory.
- Character progression.
- Job unlock trees.
- Party management.
- Persistent save files.

### Phase 3: Campaign Foundation

Implement:

- World map.
- Story introduction.
- Hub environment.
- Recruitment.
- Shops.
- Multiple battle maps.
- Quests.
- Character dialogue.
- Original music and effects.

### Phase 4: Advanced Gameplay

Implement:

- Expanded job roster.
- Advanced enemy AI.
- Terrain manipulation.
- Combination abilities.
- Additional factions.
- Optional encounters.
- Boss mechanics.
- Crafting and rare equipment.

### Phase 5: Polish and Release

Implement:

- Full accessibility controls.
- Mobile optimization.
- PWA functionality.
- Save migration and recovery.
- Performance optimization.
- Automated testing.
- Game balancing.
- Final artwork and animations.

## 15. Engineering and Quality Requirements

Use clean, maintainable, production-oriented code.

Requirements:

- Strong TypeScript typing.
- Reusable and composable systems.
- Data-driven class and ability definitions.
- Deterministic combat simulations.
- Unit tests for damage, accuracy, pathfinding, job progression, and status effects.
- Integration tests for complete battle scenarios.
- Automated build validation.
- No placeholder buttons that appear functional but do nothing.
- No unhandled application crashes.
- No knowingly broken features left undocumented.

Document architectural decisions, asset requirements, controls, save structures, and extension points.

## 16. Instructions for the AI Development Agent

Begin by examining the existing repository if one is provided. Preserve working code and adopt established conventions where appropriate.

First produce:

1. A concise game design document.
2. A proposed technical architecture.
3. A project file and folder structure.
4. A detailed initial job/class progression matrix.
5. A combat rules specification.
6. An original art-direction specification.
7. A milestone-based implementation plan.

Then proceed directly into implementing Phase 1.

Create functional systems rather than only generating mockups, static screens, or disconnected proof-of-concept components.

At every implementation milestone:

- Run the application.
- Validate functionality.
- Run relevant tests.
- Fix discovered errors.
- Document what has actually been implemented.
- Identify remaining limitations.
- Continue toward the next milestone.

**The most important priorities are tactical depth, a genuinely flexible job system, satisfying combat, smooth camera controls, distinctive original pixel art, and a foundation capable of supporting a complete RPG.**

Build a game that feels rewarding to master and offers meaningful strategic freedom.
