# Roadmap

[Documentation index](README.md) · [Original brief](../PROJECT_BRIEF.md) · [Initial design](../DESIGN.md)

This is a milestone plan, not a delivery-date commitment. The full commercial-quality campaign is larger than the current playable slice.

```mermaid
flowchart LR
    P1[Phase 1: Veyr battle] --> P2[Phase 2: Job and character systems]
    P2 --> P3[Phase 3: Campaign foundation]
    P3 --> P4[Phase 4: Advanced gameplay]
    P4 --> P5[Phase 5: Release polish]
```

## Milestone acceptance

| Phase                          | Status                                                    | Remaining acceptance work                                                                                                                                                                                                                                      |
| ------------------------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Functional vertical slice  | Playable, with documented presentation/input limits       | Continue validating the single battle and regressions; expand browser scenario coverage                                                                                                                                                                        |
| 2 — Jobs and character systems | Company loop implemented; Phase 2 remains partial         | Further skill-board depth and the remaining job roster; 0.5 adds four distinct advanced active abilities; 0.4 supplies mastery and eight support lessons across passive/reaction/movement slots, alongside learning, equipment and carried progression         |
| 3 — Campaign foundation        | Not implemented as a campaign                             | World map, 3D town/hub, recruitment, branching quests/dialogue and authored music; the four-contract camp/outfitter loop is already present                                                                                                                    |
| 4 — Advanced gameplay          | Ice, ignition, momentum and a lightning combination exist | Broader terrain manipulation, destructible objects, summons, factions, crafting and optional encounters; 0.3 supplies a named boss with a persistent phase                                                                                                     |
| 5 — Release                    | Not release-certified                                     | Directional views and longer cycles beyond the current 256-frame, eight-job action set, PWA/offline, broader migration coverage beyond existing v1 import/v2 JSON export, input remapping, accessibility review, mobile profiling, compatibility matrix and balance work |

Each milestone should have a working player path, an explicit state/data model, appropriate tests, browser validation and updated limitations. Additional menu mockups do not satisfy a gameplay milestone.

## Twenty-job planning roster

The first eight have typed definitions today; four are starter jobs and four begin locked. Each advanced job adds a distinct active ability alongside shared skills. The other twelve and their prerequisites below are design proposals, not code-level unlocks.

| Job               | Identity                       | Prerequisite                             | Implementation                                     |
| ----------------- | ------------------------------ | ---------------------------------------- | -------------------------------------------------- |
| Vanguard          | Armored protection             | None                                     | Starter definition and rules                       |
| Blade Dancer      | Mobile flanking/riposte        | None                                     | Starter definition and rules                       |
| Arcanist          | Elemental areas and terrain    | None                                     | Starter definition and rules                       |
| Lifebinder        | Healing and revival            | None                                     | Starter definition and rules                       |
| Shadowrunner      | Fast exposure attacks          | Blade Dancer 3                           | Locked definition                                  |
| Runewarden        | Armored elemental hybrid       | Vanguard 3 + Arcanist 2                  | Locked definition                                  |
| Storm Herald      | Water/lightning combinations   | Arcanist 3                               | Locked definition; starter secondary exception     |
| Chronoweaver      | Readiness manipulation         | Arcanist 2 + Lifebinder 3                | Locked definition                                  |
| Beastcaller       | Summoned companions            | Proposed: Lifebinder 3 + wildlife pact   | Planned                                            |
| Spellblade        | Infused melee                  | Proposed: Vanguard 2 + Arcanist 3        | Planned                                            |
| Alchemist         | Mixtures and surfaces          | Proposed: Arcanist 2 + crafting quest    | Planned                                            |
| Soulkeeper        | Spirit transfer and risk       | Proposed: Lifebinder 4 + shrine quest    | Planned                                            |
| Rift Cartographer | Route manipulation             | Proposed: Chronoweaver 4 + exploration   | Planned                                            |
| Thorn Marshal     | Summoned formation cover       | Proposed: Vanguard 4 + Beastcaller 3     | Planned                                            |
| Ash Cantor        | Sustained area chanting        | Proposed: Soulkeeper 3 + Arcanist 4      | Planned; an enemy name does not implement this job |
| Glass Ranger      | Refracted shots and mixtures   | Proposed: Shadowrunner 3 + Alchemist 3   | Planned                                            |
| Tidemason         | Water and terrain construction | Proposed: Runewarden 4 + Storm Herald 3  | Planned                                            |
| Oathbreaker       | Disruption at defensive cost   | Proposed: Blade Dancer 4 + moral choice  | Planned                                            |
| Star Shepherd     | Celestial summons              | Proposed: Beastcaller 5 + Chronoweaver 4 | Planned                                            |
| Crownless         | Coordinated leadership         | Proposed: three advanced masteries       | Planned                                            |

## Dependencies before expansion

| Work                      | Prerequisite decision                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| Multiple maps             | Generalize board dimensions, spawn data, input clamps, scenery and save validation together |
| Campaign progression      | Separate persistent company state from an encounter snapshot; define rewards and carried JP |
| Purchased skills/mastery  | Define ability ownership, spendable versus cumulative JP, slots and respecialization        |
| Inventory                 | Define equipment restrictions, stat derivation and save compatibility                       |
| More complex AI           | Establish encounter objectives and useful scenario tests before adding scoring dimensions   |
| Full animation production | Extend the implemented atlas/event contract with directional views and longer cycles                  |
| Offline/PWA               | Define cache update policy and safe behavior around saved-state versions                    |
| Release                   | Profile actual devices and complete the compatibility/accessibility matrix                  |

The original design avoids permanently punishing class experimentation. Future stat growth and equipment systems should preserve that principle rather than retroactively locking a character into an early choice.
