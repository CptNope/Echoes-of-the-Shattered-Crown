# Player guide

[Documentation index](README.md) · [Combat](COMBAT.md) · [Jobs and abilities](JOBS_AND_ABILITIES.md)

## The encounter

Lead the Lantern Company to Veyr and defeat four Oathless enemies. Victory means no enemy has health remaining; defeat means no companion has health remaining. The shrine shard is narrative scenery, not a capture interaction. There is no turn limit or optional objective.

After the star Avel fell, geography and memory fractured. Sera's company finds a crown shard that could restore what the world lost. The chronicle introduces the Oathless, Meridian Compact and Verdant Witness; branching faction consequences are future campaign work.

## Starting company

| Companion   | Primary      | Starter secondary |  HP | Energy | Role                                              |
| ----------- | ------------ | ----------------- | --: | -----: | ------------------------------------------------- |
| Sera Vale   | Vanguard     | Lifebinder        | 112 |     32 | Protect nearby allies and heal in an emergency    |
| Ilya Wren   | Arcanist     | Storm Herald      |  78 |     32 | Area magic, frozen routes, lightning combinations |
| Corin Ash   | Blade Dancer | Vanguard          |  88 |     32 | Flank, expose targets or cleave a group           |
| Maelis Reed | Lifebinder   | Arcanist          |  84 |     32 | Heal and revive with elemental options            |

Ilya's Storm Herald secondary is a starter exception, not a general unlock. A new secondary assignment must meet prerequisites. Changing primary jobs does not change stored maximum HP or energy in this version.

## Taking a turn

Each active unit can move once and use one ability, in either order. Choosing a command enters targeting mode. Select a tile, inspect the preview and confirm to spend it. A confirmed move cannot be undone. Acting leaves unused movement available.

End the turn explicitly. If no ability was used, ending grants guard until the unit's next activation: incoming attack damage is reduced by 45%. Burn, terrain hazards and the fixed Blade Dancer riposte bypass that reduction.

The timeline is speed-based. Its counter counts individual activations, not full rounds. A faster unit can act more frequently.

## Reading the field

| Indicator                     | Meaning                                       |
| ----------------------------- | --------------------------------------------- |
| Mint tiles                    | Reachable movement destinations               |
| Sand attack tiles             | Legal target centers for a damaging ability   |
| Support tint                  | Legal healing or timeline-support centers     |
| Gold tile                     | Selected tile; confirmation is still required |
| Active-unit ground marker     | Unit currently taking a turn                  |
| Circle / diamond unit markers | Ally / enemy, supplementing color             |
| Coordinate and elevation      | Position and height under the cursor          |
| HP bar                        | Current health; fallen sprites fade           |
| Momentum pips                 | Shared allied momentum, maximum 5             |

Empty tiles are legal damage targets, including Weapon strike. Confirming one can spend energy and the action without a hit. Use empty centers deliberately for area coverage or terrain changes.

The selected-unit preview shows non-critical damage and hit chance; it does not enumerate every victim of an area effect. Inspect the cross-shaped footprint yourself. Damaging abilities spare allies.

## Tactical starting points

| Situation                               | Response                                               |
| --------------------------------------- | ------------------------------------------------------ |
| Stream blocks a route                   | Stillwater turns water into walkable ice               |
| Enemy holds a terrace                   | Climb gradually; elevation changes damage and accuracy |
| Ally faces concentrated attacks         | Stay beside a living Vanguard and consider guard       |
| Companion falls                         | Thread of life revives at 24 HP within range           |
| Enemies stand together                  | Use Cinder bloom or Sundering arc's cross area         |
| Target is soaked                        | Follow Stillwater with Glasslight bolt                 |
| Momentum reaches 3                      | Consider Lantern concord before spending the action    |
| Adjacent enemy Blade Dancer may survive | Account for a 9-damage basic-strike riposte            |

Fire ignites grass even with an empty target center. Terrain damage triggers at turn ending, not along a movement path. See [combat](COMBAT.md) for timing.

## Menus and progression

| Control                        | Behavior                                                           |
| ------------------------------ | ------------------------------------------------------------------ |
| Company                        | Four companions, prerequisites, JP and primary/secondary selection |
| Chronicle / briefing / History | Original story, orders and recent log                              |
| Settings                       | Reduced motion, enemy delay, text size, volume and restart         |
| Field guide                    | In-game instructions                                               |
| Sound                          | Start/stop the procedural sketch                                   |
| Save battle / Load save        | Manual snapshot persistence                                        |

Job changes are accepted while `battle.turn === 1`, until the first turn ends. They preserve JP and do not reset spent moves or actions. Afterwards loadouts are fixed for the encounter. A valid skill use grants 10 primary-job JP; victory grants each companion 60. Fresh replays reset progress. A saved snapshot retains its recorded JP.

Dialogs pause the enemy delay. Chronicle retains up to 40 recent log entries rather than a full battle transcript.

## Controls and accessibility

| Device           | Controls                                     | Limit                                    |
| ---------------- | -------------------------------------------- | ---------------------------------------- |
| Pointer          | Commands, tiles, confirmation, scroll zoom   | No drag-to-pan camera                    |
| Touch            | Taps and on-screen camera; quick commands    | Device compatibility not certified       |
| Keyboard         | Arrows, Enter, M, 1, Space, Escape, Q/E, +/- | Arrow directions stay map-relative       |
| Standard gamepad | First pad; D-pad/stick, X/A/B/Y, LB/RB       | Physical-pad testing remains outstanding |

Settings offers Standard, Large and Extra large text. Reduced motion removes bobbing and easing. Fast enemy turns changes the delay from 1,000 ms to 250 ms, not decision quality. Settings are session-only.

Focus outlines, dialog focus trapping, keyboard shortcuts and shape-based team markers are present. Full screen-reader battlefield navigation, remapping and certified accessibility coverage remain planned.

## Saving before leaving

Wait for a save confirmation. Refresh or reopen starts a fresh battle until you use Load save. Clearing site data, private-browsing storage policies or another browser profile/origin can make snapshots unavailable. See [data and saves](DATA_AND_SAVES.md) before diagnosing a missing save.
