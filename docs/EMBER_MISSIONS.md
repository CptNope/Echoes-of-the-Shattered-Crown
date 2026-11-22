# Emberwarden mission pack

[Documentation](README.md) / [Mission library](MISSION_LIBRARY.md) / [Editable catalogs](RULE_CATALOG_STUDIO.md)

Two standalone studio missions extend the flooded-road story with a furnace weir and a surviving archive. Open **Enemy templates / Playable mission presets**, choose a mission, then **Load mission preset** and **Playtest revision**. The five-line briefing explains the approach. Defeat every defender; gates, shelves and waterworks are scenery.

These are authored project presets using existing mechanics and native Runewarden artwork. They do not add campaign chapters, new main-game unlocks, branching quests, interactable gates or a new objective type. Both use the existing `redoubt` contract slot in separate projects. Importing one replaces the current source; export your work first or use Undo. Artwork and audio survive preset loading.

## Missions and tactics

| Mission / editable source | Board | Roster | Tactical focus | Bounty / first-clear relic |
| --- | --- | --- | --- | --- |
| [The Ashen Weir](../public/missions/ashen-weir.json) | 20 by 16 / 320 tiles | Four heroes, six enemies | A furnace wall divides two direct approaches; wet pools and stone lanes provide ground that does not ignite | 150 / Weirkeeper's token |
| [The Cinder Archive](../public/missions/cinder-archive.json) | 24 by 18 / 432 tiles | Four heroes, six enemies | Three elevation bands, interrupted sightlines and a supporting mender; approach each stair together | 180 / Archive lantern |

The intended reading order is Greybank, Ashen Weir, Cinder Archive. This is narrative continuity in standalone briefings, not enforced campaign routing. Both source contracts require Causeway in their own catalog. The archive does not require an Ashen Weir clear because separate mission identities are not yet supported by the campaign.

The Emberwarden is a close support class variant. Sera begins with its four native abilities and Vanguard secondary Cleave. Ilya, Corin and Maelis retain their original roles. Corin receives Ashrunner blades. Guard and heal the leading fighter; use Ashfall against clustered enemies while keeping the company off burning grass. The archive's enemies gain elevation advantage: spread pressure between the front line and the mender rather than racing up the central lane alone.

## Emberwarden and abilities

`custom-emberwarden` binds to the native Runewarden model, animations and supported combat mechanics. It has move 4, speed 11, attack 7, armor 7 and magic 7. It is immediately available within these projects, with no new campaign unlock. Costs and restrictions remain editable in **Gear, abilities & jobs**.

| Stable ID / ability | Existing base | Energy / range | Behavior and tradeoff |
| --- | --- | --- | --- |
| `custom-ashfall` / Ashfall | Ember | 8 / 4 | Power 24, cross radius 1; burns enemies and ignites grass. Lower power and cost than Cinder bloom |
| `custom-hearthguard` / Hearthguard | Aegis | 6 / 2 | Guard one living ally, cleanse burn; 45% reduction until the recipient's next activation. Less reach than Oathguard |
| `custom-cinderstep` / Cinderstep | Haste | 7 / 3 | Advance a living ally by 35 timeline ticks. Costs one less energy than Borrowed dawn; no lasting haste status |
| `custom-kindlethread` / Kindlethread | Mend | 6 / 3 | Heal 26 HP and cleanse burn; revive at the existing fixed 24 HP. Less power and reach than Thread of life |

All four inherit existing effect and sound recipes. The asset library can override those cosmetic pairs independently. No new bitmap atlas or audio sample is required.

## Gear

| Stable ID / item | Slot | Bonuses | Price / acquisition |
| --- | --- | --- | --- |
| `custom-coalbrand` / Coalbrand | Weapon | Attack +4, magic +3 | 95; Sera equipped; Emberwarden or Runewarden |
| `custom-kilncoat` / Kilncoat | Armor | Armor +3, HP +14 | 85; Sera equipped; unrestricted |
| `custom-emberglass` / Emberglass lens | Relic | Magic +3, speed +1 | 90; Sera equipped; unrestricted |
| `custom-ashrunner-blades` / Ashrunner blades | Weapon | Attack +4, speed +1 | 90; Corin equipped; unrestricted |
| `custom-weir-token` / Weirkeeper's token | Relic | Armor +2, HP +12 | Reward only; Ashen Weir first clear |
| `custom-archive-lantern` / Archive lantern | Relic | Magic +4, HP +8 | Reward only; Cinder Archive first clear |

Prices and reward definitions participate in existing catalog/settlement rules. Studio playtests are isolated and do not grant company rewards. Settlement and once-only relic behavior are verified at the reducer level; no new reward screen is claimed.

## Enemy templates

Each mission contains six reusable template snapshots and six independently editable instances. Templates share stable IDs across the two presets; instances append the mission ID. Template updates affect placed instances only through the explicit compare/update controls.

| Template ID / role | Main / secondary | Base HP / energy | Pressure |
| --- | --- | --- | --- |
| `enemy-kiln-warden` / Kiln Warden | Runewarden / Vanguard | 95 / 28 | Armored approach and learned Cleave |
| `enemy-ash-sentry` / Ash Sentry | Vanguard / Emberwarden | 78 / 24 | Front line with learned Hearthguard |
| `enemy-ember-scholar` / Ember Scholar | Arcanist / Emberwarden | 65 / 32 | Elemental area pressure and learned Ashfall |
| `enemy-coal-runner` / Coal Runner | Blade Dancer / Vanguard | 68 / 24 | Mobile flank and learned Cleave |
| `enemy-lantern-mender` / Lantern Mender | Lifebinder / Emberwarden | 65 / 32 | Healing and learned Hearthguard |
| `enemy-cinder-clock` / Cinder Clockkeeper | Chronoweaver / Arcanist | 68 / 32 | Timeline disruption and learned Stillwater |

## Reproduction and evidence

Run `npm run mission:build` to regenerate all seven public mission JSON files. Fixture tests compare every published source with its canonical loader. Ten new tests cover clean compilation/connectivity, source/history recovery, first-clear settlement, seeded terminal runs and real guard/timeline/heal/revive/fire commands. All six simulations validate every intermediate save and leave the project source unchanged.

| Mission | Seed | AI-for-both-teams result | Activations | Surviving allies |
| --- | --- | --- | --- | --- |
| Ashen Weir | 74319 | Victory | 31 | 1 |
| Ashen Weir | 9001 | Victory | 29 | 1 |
| Ashen Weir | 42 | Victory | 41 | 1 |
| Cinder Archive | 74319 | Defeat | 31 | 0 |
| Cinder Archive | 9001 | Defeat | 30 | 0 |
| Cinder Archive | 42 | Defeat | 28 | 0 |

The existing AI policy is a regression and difficulty signal, not human balance certification. Archive is a harder tactical mission; all three automated losses are recorded. Human victory/defeat playthroughs and difficulty tuning remain follow-up work. Automated victory settlement tests use explicit terminal fixtures separately from the simulated outcomes.
