# Expansion backlog

[Master roadmap](../ROADMAP.md) · [Roadmap library](README.md) · [Quality gates](RELEASE_AND_QUALITY.md)

**All 160 items below are planned.** Existing behavior is documented in the [systems guide](../SYSTEMS_GUIDE.md); an item here describes expansion or stronger evidence. IDs are stable search/reference keys, not created GitHub issues.

Priority: P0 blocks safe expansion or a release gate; P1 is core; P2 follows the core; P3 is stretch. S/M/L are relative scope, not time estimates. A dependency on an optional feature applies only if that feature is included in the chosen scope. Resolve an excluded dependency explicitly; never mark it silently complete.

Acceptance includes the stated evidence plus updated source-derived catalog, affected guide, save decision and changelog where relevant. Milestones are proposed target gates; work can be split without reusing an existing ID.

## Track index

| Track | Items | Target gate |
| --- | --- | --- |
| [FND — Architecture and tools](#fnd) | 10 | M1 |
| [MAP — Maps and deployment](#map) | 10 | M3 |
| [CBT — Combat rules](#cbt) | 10 | M2 |
| [OBJ — Objectives and rewards](#obj) | 10 | M3 |
| [AI — Enemy behavior](#ai) | 10 | M3 |
| [JOB — Jobs and ability boards](#job) | 10 | M4 |
| [CMP — Company and recruitment](#cmp) | 10 | M4 |
| [NAR — Narrative and campaign](#nar) | 10 | M5 |
| [ECO — Inventory and economy](#eco) | 10 | M6 |
| [WRL — Towns and world systems](#wrl) | 10 | M6 |
| [ART — Characters and environments](#art) | 10 | M9 |
| [VFX — Effects and presentation events](#vfx) | 10 | M9 |
| [AUD — Audio and music](#aud) | 10 | M9 |
| [UX — Input and accessibility](#ux) | 10 | M2 |
| [SAV — Persistence and portability](#sav) | 10 | M1 |
| [QA — Verification and release](#qa) | 10 | M1 |

## FND

Architecture and tools. Proposed primary gate: M1.

| ID | Priority / size | Work | Dependencies | Acceptance and evidence |
| --- | --- | --- | --- | --- |
| FND-01 | P0 / S | Audit fixed assumptions | — | Inventory every board, unit-count, companion-ID and viewport clamp; link each to a change owner. |
| FND-02 | P0 / M | Centralize board and roster limits | FND-01 | One rules contract replaces scattered limits without changing the four baseline battles. |
| FND-03 | P0 / M | Deterministic replay fixtures | QA-01 | A seed and legal command stream reproduce terminal state and RNG consumption. |
| FND-04 | P0 / M | Validate content references | FND-02 | Reject unknown skill, item, encounter and prerequisite IDs with an actionable location. |
| FND-05 | P1 / M | Stable simulation event vocabulary | FND-03 | Specify ordered resolution records, identity and legacy cue handling; snapshots stay authoritative. |
| FND-06 | P0 / S | Rule/presentation boundary audit | FND-05 | Renderer, audio and input cannot spend resources or change initiative in a fixture. |
| FND-07 | P2 / L | Content-authoring import seam | FND-04 | Load one authored content package through validation with equivalent runtime definitions. |
| FND-08 | P1 / M | Developer scenario workbench | FND-03 | Select a seed/map/loadout and export a replay without touching player saves. |
| FND-09 | P1 / M | Module performance baselines | FND-08 | Record command, AI, build and rendering measurements with device and scene metadata. |
| FND-10 | P1 / S | Extension decision records | FND-01 | Keep accepted schema/objective/summon decisions and rejected alternatives discoverable. |

## MAP

Maps and deployment. Proposed primary gate: M3.

| ID | Priority / size | Work | Dependencies | Acceptance and evidence |
| --- | --- | --- | --- | --- |
| MAP-01 | P0 / M | Map definition schema | FND-01 | Specify dimensions, tiles, elevations, deployment zones and content IDs independently of meshes. |
| MAP-02 | P0 / L | Dimension-aware board rules | MAP-01, FND-02, SAV-01 | A 9×9 and a 12×8 fixture pass bounds, path, targeting and save checks. |
| MAP-03 | P1 / L | Dimension-aware battlefield view | MAP-02 | Camera fit, raycasting, labels and keyboard clamps agree at both board sizes. |
| MAP-04 | P0 / L | Variable combat roster | MAP-02, CMP-01 | Support alternate allied/enemy counts without relying on array positions for identity. |
| MAP-05 | P1 / M | Pre-battle deployment | MAP-04, UX-02 | Select legal units and starting cells; cancel and resume preserve the roster. |
| MAP-06 | P1 / L | Reusable environment kits | MAP-03, ART-05 | Terrain visuals cannot introduce an invisible obstacle or hide an occupied tile. |
| MAP-07 | P1 / M | Map validation tooling | MAP-01, FND-04 | Flag missing cells, invalid heights, unreachable required zones and illegal spawns. |
| MAP-08 | P2 / L | Interactive props | MAP-02, OBJ-01 | A door or destructible barrier has rules state, preview, occupancy and saved destruction. |
| MAP-09 | P2 / L | Hazard and weather hooks | MAP-08, CBT-06 | One chosen environmental rule uses explicit timing and survives resume. |
| MAP-10 | P1 / M | Mission authoring checklist | MAP-05, MAP-07, OBJ-02 | A contributor can produce one validated alternate-objective mission with review evidence. |

## CBT

Combat rules. Proposed primary gate: M2.

| ID | Priority / size | Work | Dependencies | Acceptance and evidence |
| --- | --- | --- | --- | --- |
| CBT-01 | P1 / M | Explain preview arithmetic | FND-03 | Show relevant height, guard, exposure, formation and synergy contributions matching resolution. |
| CBT-02 | P1 / M | Target/area explanations | CBT-01, UX-01 | Explain illegal centers and affected cells; empty-terrain and friendly-sparing rules stay clear. |
| CBT-03 | P2 / S | Facing selection decision | FND-10 | Approve explicit final-facing rules, cancellation, controller input and save impact before implementation. |
| CBT-04 | P2 / L | Resistance and affinity model | FND-04, CBT-01 | One resistance interaction has matching preview, AI value and migration defaults. |
| CBT-05 | P1 / L | Status timing registry | FND-05 | Record duration unit, stacking, cleansing and expiration for old and one new status. |
| CBT-06 | P1 / L | Terrain interaction ordering | CBT-05, MAP-02 | Freeze, ignite, extinguish and entry/end hazards have a documented deterministic order. |
| CBT-07 | P0 / L | Bounded reaction resolution | CBT-05, FND-05 | Counter/guard/heal chains have explicit order and recursion limits with lethal cases. |
| CBT-08 | P2 / L | Summon action contract | CBT-07, MAP-04 | Choose owner, slot cap, initiative, occupancy, dismissal and reward rules with fixtures. |
| CBT-09 | P2 / M | Momentum and formation depth | CBT-01, JOB-01 | Add one alternate spending choice without infinite generation or a mandatory build. |
| CBT-10 | P2 / L | Difficulty rule profiles | QA-05, CBT-04 | Selectable profiles disclose numeric changes, preserve seeds and support resume/retry. |

## OBJ

Objectives and rewards. Proposed primary gate: M3.

| ID | Priority / size | Work | Dependencies | Acceptance and evidence |
| --- | --- | --- | --- | --- |
| OBJ-01 | P0 / M | Objective state contract | FND-05 | Define progress, failure, success and simultaneous-result precedence; current elimination stays identical. |
| OBJ-02 | P1 / L | One alternate objective mission | OBJ-01, MAP-03 | A defend-or-escape fixture supports preview, terminal result, retry and settlement. |
| OBJ-03 | P1 / L | Interact/activate command | OBJ-01, MAP-08 | One objective interaction checks actor, range, action cost and repeated use. |
| OBJ-04 | P2 / L | Escort and neutral units | OBJ-02, MAP-04, AI-03 | A named escort can progress, fail and resume without bypassing roster validation. |
| OBJ-05 | P1 / M | Optional objective rewards | OBJ-02, ECO-01 | Secondary rewards settle once, show unmet conditions and cannot be farmed by reloading. |
| OBJ-06 | P2 / L | Survival and reinforcement waves | OBJ-01, MAP-04 | Explicit activation/wave counters avoid ambiguous rounds and duplicate spawns on reload. |
| OBJ-07 | P1 / L | Boss phase framework | OBJ-01, CBT-05 | Generalize one boss phase with saved triggers and clear lethal/simultaneous behavior. |
| OBJ-08 | P1 / M | Victory/defeat UX | OBJ-02, UX-01 | Explain which objective resolved and show retry, keep-progress and return consequences. |
| OBJ-09 | P0 / L | Settlement transaction ledger | SAV-02, ECO-01 | Replay terminal settlement cannot duplicate gold, recruits, items or quest flags. |
| OBJ-10 | P1 / M | Objective content validator | OBJ-03, OBJ-06, FND-04 | Reject unresolvable target references, missing exits and impossible required counters. |

## AI

Enemy behavior. Proposed primary gate: M3.

| ID | Priority / size | Work | Dependencies | Acceptance and evidence |
| --- | --- | --- | --- | --- |
| AI-01 | P1 / M | AI score diagnostics | FND-08 | Show candidate score factors and chosen legal action for the current planner. |
| AI-02 | P1 / L | Objective-aware scoring | OBJ-02, AI-01 | An enemy can contest or defend the actual objective instead of only approaching damage. |
| AI-03 | P1 / M | Role-based behavior profiles | AI-01, FND-04 | Melee, ranged, healer and escort profiles share legality checks and fixed tie-breaking. |
| AI-04 | P1 / M | Hazard and resistance valuation | CBT-04, CBT-06, AI-03 | Avoid known lethal terrain and evaluate resisted damage without hidden rules. |
| AI-05 | P2 / L | Combo and support planning | AI-03, CBT-09 | One setup/payoff pair improves a scenario without adding random planning choices. |
| AI-06 | P2 / L | Summon-aware planning | CBT-08, AI-03 | Spawns respect caps and the AI can value occupying, supporting or removing a summon. |
| AI-07 | P1 / L | Boss tactic profiles | OBJ-07, AI-03 | Telegraphed phase choices remain legal after interruption, death or save/resume. |
| AI-08 | P3 / L | Budgeted lookahead spike | FND-09, AI-02 | Compare one-ply alternatives on known fixtures; keep the simpler planner if gains do not justify cost. |
| AI-09 | P1 / M | AI scenario library | AI-04, QA-02 | Include escort, hazard, revive, no-target and lethal-retaliation regressions. |
| AI-10 | P1 / S | Difficulty transparency | CBT-10, AI-09 | Document which behavior or stats differ; do not describe undisclosed bonuses as better tactics. |

## JOB

Jobs and ability boards. Proposed primary gate: M4.

| ID | Priority / size | Work | Dependencies | Acceptance and evidence |
| --- | --- | --- | --- | --- |
| JOB-01 | P1 / M | Eight-job identity audit | FND-04 | List shared versus distinct skills and a useful alternative decision for each job. |
| JOB-02 | P0 / M | Skill-board data contract | JOB-01, SAV-01 | Define nodes, costs, prerequisites, ownership and learned/available distinction. |
| JOB-03 | P1 / L | Skill-board UI | JOB-02, UX-02 | Preview a node, its unlock cost and resulting secondary loadout through keyboard and pointer. |
| JOB-04 | P2 / M | Respecialization policy | JOB-02, ECO-01 | Choose costs/refunds and retain lifetime unlock JP; test equipment and support validity. |
| JOB-05 | P1 / L | Two complete new jobs | JOB-03, CBT-08, ART-01 | Deliver Beastcaller/Spellblade candidates only after rules, art, AI and save gates all pass. |
| JOB-06 | P1 / M | Hybrid job prerequisite review | JOB-02, JOB-05 | No circular prerequisite graph or campaign-locked prerequisite without an alternate path. |
| JOB-07 | P2 / L | Remaining job rollout | JOB-06, QA-05 | Expand toward twenty in validated pairs; each has a distinct decision and complete assets. |
| JOB-08 | P2 / M | Character affinity policy | CMP-02, JOB-01 | Optional affinities encourage identity without trapping early class experimentation. |
| JOB-09 | P2 / M | Build comparison tooling | JOB-03, FND-08 | Compare stats, skill access and resource costs without making unsupported win-rate claims. |
| JOB-10 | P0 / S | Job integration checklist | JOB-01, FND-04 | Every job covers learning, equipment, AI, preview, save/import, art, effects and accessibility. |

## CMP

Company and recruitment. Proposed primary gate: M4.

| ID | Priority / size | Work | Dependencies | Acceptance and evidence |
| --- | --- | --- | --- | --- |
| CMP-01 | P0 / L | Variable company schema | FND-02, SAV-01 | Replace four fixed profile IDs with validated stable members and deployment constraints. |
| CMP-02 | P1 / L | Recruitment event contract | CMP-01, OBJ-09 | Recruit once with stable identity, initial gear and route flag; repeated settlement is harmless. |
| CMP-03 | P1 / M | Reserve roster and deployment | CMP-01, MAP-04 | Bench/deploy choices preserve builds and reject duplicate or over-cap selections. |
| CMP-04 | P2 / M | Companion biography panels | CMP-02, NAR-01 | Read background and relationship state without exposing unearned story information. |
| CMP-05 | P2 / L | Relationship progression | CMP-02, NAR-02 | One relationship changes through explicit events with no duplicate gain on reload. |
| CMP-06 | P2 / S | Overall level decision | JOB-01, QA-05 | Approve or defer character-level growth after analyzing job freedom and difficulty curves. |
| CMP-07 | P2 / L | Injury and loss policy | CMP-01, SAV-02 | Define default recoverability and any opt-in permadeath consequences before adding penalties. |
| CMP-08 | P2 / M | Loadout presets | CMP-03, JOB-03 | Apply a preset only when proficiency, ownership and shared copies remain valid. |
| CMP-09 | P2 / M | Company records | OBJ-09, NAR-02 | Track meaningful mission outcomes and recruit history without duplicating mutable battle state. |
| CMP-10 | P1 / L | Companion route coverage | CMP-05, NAR-07 | Every recruit route has a recovery path and cannot silently remove the last viable deployment. |

## NAR

Narrative and campaign. Proposed primary gate: M5.

| ID | Priority / size | Work | Dependencies | Acceptance and evidence |
| --- | --- | --- | --- | --- |
| NAR-01 | P0 / M | Narrative state vocabulary | FND-04, SAV-01 | Define typed flags, quest IDs, choice IDs and authored text ownership. |
| NAR-02 | P0 / L | Quest reducer and validation | NAR-01, FND-05 | Advance one quest once; reject unknown transitions and missing references. |
| NAR-03 | P1 / L | Dialogue schema and player | NAR-01, UX-02 | Choices, speaker, conditions and resume points are keyboard accessible and saved. |
| NAR-04 | P1 / L | Campaign map route | NAR-02, OBJ-02, MAP-05 | Travel to one unlocked mission, return and reveal a consequence without a disconnected menu. |
| NAR-05 | P1 / L | First chapter vertical slice | NAR-03, NAR-04, CMP-02 | Complete an introduction, two missions, one recruit and one consequential choice end to end. |
| NAR-06 | P2 / L | Faction consequence model | NAR-02, ECO-01 | A choice affects a service or mission visibly; no hidden permanent progression softlock. |
| NAR-07 | P1 / M | Branch convergence rules | NAR-05 | Define where branches rejoin and verify both sides can reach required content. |
| NAR-08 | P2 / L | Chapter expansion | NAR-07, MAP-10, ART-05 | Add approved regions using a complete route checklist rather than isolated dialogue dumps. |
| NAR-09 | P1 / L | Ending state evaluation | NAR-08, OBJ-09 | An ending follows saved choices; required flags and invalid combinations have fixtures. |
| NAR-10 | P1 / M | Story continuity and localization | NAR-03, NAR-09 | Glossary, speaker identities, text keys and branch review stay consistent across routes. |

## ECO

Inventory and economy. Proposed primary gate: M6.

| ID | Priority / size | Work | Dependencies | Acceptance and evidence |
| --- | --- | --- | --- | --- |
| ECO-01 | P0 / M | Economy invariants and ledger | FND-03 | Document sources/sinks, item caps, copy ownership and exactly-once transaction requirements. |
| ECO-02 | P1 / L | Item/consumable schema | ECO-01, CBT-05 | Separate equipment from consumables; define stack limits, use targets and battle costs. |
| ECO-03 | P1 / L | Use-item command | ECO-02, OBJ-03 | Consume exactly one owned item after a legal target; rejected uses change nothing. |
| ECO-04 | P1 / M | Curated gear expansion | JOB-01, ECO-01 | Each new item has a purpose, proficiency, price, acquisition path and balance scenario. |
| ECO-05 | P2 / M | Selling/buyback policy | ECO-01, SAV-02 | Cannot sell allocated or quest-critical gear into a progression deadlock; rounding is explicit. |
| ECO-06 | P2 / L | Crafting recipe system | ECO-02, FND-04 | Recipe costs and output commit atomically; insufficient materials leave state unchanged. |
| ECO-07 | P2 / L | Upgrade policy | ECO-04, ECO-06 | Distinguish item identity from upgrade state and avoid duplicating shared-copy bonuses. |
| ECO-08 | P2 / M | Shop stock and faction access | NAR-06, ECO-05 | Stock and prices use saved conditions; required progression retains a viable alternative. |
| ECO-09 | P1 / M | Reward curve simulation | ECO-04, QA-05 | Compare first clears, repeats and failure paths for shortages and runaway grinding incentives. |
| ECO-10 | P0 / L | Exploit and softlock review | ECO-03, ECO-06, OBJ-09 | Repeat import, retry, sell, craft and settlement sequences preserve all ledger invariants. |

## WRL

Towns and world systems. Proposed primary gate: M6.

| ID | Priority / size | Work | Dependencies | Acceptance and evidence |
| --- | --- | --- | --- | --- |
| WRL-01 | P1 / M | Hub interaction model | NAR-04, UX-02 | Town services expose complete inputs/results and remain usable without 3D navigation. |
| WRL-02 | P1 / L | First town/hub slice | WRL-01, NAR-05 | Enter, talk, buy/train, accept one quest, leave and reload with consistent state. |
| WRL-03 | P1 / M | Travel and route conditions | NAR-04, NAR-06 | Route restrictions explain their cause and cannot strand a company without recovery. |
| WRL-04 | P2 / M | Faction service consequences | WRL-02, NAR-06, ECO-08 | One visible service change has a saved cause and an alternate acquisition path. |
| WRL-05 | P2 / L | Destructible environment slice | MAP-08, CBT-06 | Destroy one barrier with explicit collision, pathing, objective and save consequences. |
| WRL-06 | P2 / L | Summoned companion slice | CBT-08, AI-06, ART-06 | Spawn, act, expire/dismiss and resume one summon without reward or occupancy duplication. |
| WRL-07 | P2 / L | Weather rule slice | MAP-09, AI-04 | One chosen weather interaction is telegraphed, deterministic and optional by encounter. |
| WRL-08 | P2 / L | Optional contracts and exploration | OBJ-05, WRL-03 | Optional content rewards discovery without becoming a mandatory resource grind. |
| WRL-09 | P2 / M | Codex and discovered lore | NAR-10, WRL-02 | Unlock entries through saved discovery flags; search and read without spoilers. |
| WRL-10 | P3 / L | Postgame challenge policy | NAR-09, QA-05 | Define scaling, reward caps and completion behavior without overwriting campaign outcomes. |

## ART

Characters and environments. Proposed primary gate: M9.

| ID | Priority / size | Work | Dependencies | Acceptance and evidence |
| --- | --- | --- | --- | --- |
| ART-01 | P0 / M | Facing and registration prototype | FND-09 | One current job supports approved directions at stable feet, scale and weapon padding. |
| ART-02 | P1 / M | Animation state specification | ART-01, CBT-05 | Document states, timing, transition priority and interrupt/down/revive behavior. |
| ART-03 | P1 / L | Directional character pilot | ART-02, VFX-01 | Render one eight-direction set through all camera orientations and reduced motion. |
| ART-04 | P2 / L | Twenty-job asset rollout | ART-03, JOB-10 | Complete assets in approved job pairs; no definition ships with an unintended placeholder. |
| ART-05 | P1 / L | Environment kit pilot | MAP-03, ART-01 | Build one new regional kit with elevation, ramps, blockers and foreground readability. |
| ART-06 | P2 / L | Creature and summon sheets | CBT-08, ART-02 | One creature fits occupancy, silhouette, hit/down states and owner readability. |
| ART-07 | P2 / L | Portrait/identity expansion | CMP-02, NAR-03 | Recruits keep consistent faces/costumes across portraits, jobs and dialogue. |
| ART-08 | P1 / L | Atlas packing and LOD | ART-03, FND-09 | Compare bandwidth/GPU memory with mip/filter choices and visible quality evidence. |
| ART-09 | P0 / M | Asset provenance inventory | FND-04 | Every shipped image/font/audio family has a source, rights note and reproducible processing entry. |
| ART-10 | P1 / M | Art acceptance and regression | ART-05, ART-08, ART-09 | Review silhouettes, seams, faction cues and missing assets at game scale on target devices. |

## VFX

Effects and presentation events. Proposed primary gate: M9.

| ID | Priority / size | Work | Dependencies | Acceptance and evidence |
| --- | --- | --- | --- | --- |
| VFX-01 | P1 / L | Ordered presentation queue | FND-05 | Multiple results, counters and boss events preserve order without delaying rules. |
| VFX-02 | P1 / M | Target anchoring and camera review | VFX-01, ART-01 | Projectiles/contact cues remain correctly placed after movement and camera rotation. |
| VFX-03 | P2 / M | Persistent status auras | CBT-05, VFX-02 | One aura follows status lifetime, clears on cleanse/revive and respects reduced motion. |
| VFX-04 | P2 / L | New ability effect families | JOB-05, VFX-01 | Reuse suitable motifs; unique skills receive registered clips, recipes and fallback. |
| VFX-05 | P1 / L | Boss telegraph vocabulary | OBJ-07, AI-07, VFX-01 | Distinguish warning area from resolved damage without leaking misleading hit certainty. |
| VFX-06 | P1 / M | Effect budget profiles | FND-09, VFX-02 | Low/high profiles bound sprites, particles and atlas bytes with explicit measured tradeoffs. |
| VFX-07 | P1 / M | Combat result readability | CBT-01, VFX-01 | Miss, block, heal, resist and interrupt have text/shape cues without duplicate damage indicators. |
| VFX-08 | P1 / M | Accessible intensity controls | UX-03, VFX-06 | Particles, trails, flashes and screen movement can be reduced independently where applicable. |
| VFX-09 | P0 / M | Asset failure and teardown tests | VFX-06, QA-04 | Missing atlas, rapid mission switch and disposal leave no blocking errors or growing live pools. |
| VFX-10 | P2 / M | Effect workbench expansion | FND-08, VFX-04 | Preview phase timing, outcomes, camera changes and recording for every shipped recipe. |

## AUD

Audio and music. Proposed primary gate: M9.

| ID | Priority / size | Work | Dependencies | Acceptance and evidence |
| --- | --- | --- | --- | --- |
| AUD-01 | P1 / M | Audio direction and motifs | NAR-05 | Approve original regional/character motifs and a bounded cue list before full composition. |
| AUD-02 | P1 / M | Music/SFX/ambience mixers | UX-03 | Independent persisted levels, mute and suspended-context recovery work after user gesture. |
| AUD-03 | P1 / M | Weapon and spell cue pilot | AUD-02, VFX-01 | One impact family follows resolved events, never repeats on load, and respects mute. |
| AUD-04 | P2 / M | Regional ambience kit | AUD-01, ART-05 | One region loops seamlessly with measured bytes and no gameplay-information dependency. |
| AUD-05 | P1 / L | Battle music arrangement | AUD-01, AUD-02 | One original battle track supports a clean transition and loop without clipping. |
| AUD-06 | P2 / M | Town and narrative cues | NAR-03, AUD-04 | Dialogue and hub transitions duck/mix consistently without mandatory audio-only prompts. |
| AUD-07 | P2 / L | Boss phase music transitions | OBJ-07, AUD-05 | A saved phase selects the right music without replaying the transition sting on resume. |
| AUD-08 | P3 / S | Voice policy decision | NAR-10, ART-09 | Choose text-only or a limited original voice scope with rights and localization cost recorded. |
| AUD-09 | P1 / M | Audio cache and device review | AUD-03, FND-09 | Test background/resume, headphones and unavailable audio; memory stays bounded. |
| AUD-10 | P0 / M | Audio provenance and mix sign-off | AUD-05, AUD-09, ART-09 | Every shipped cue has rights/source notes and reviewed volume/loop behavior. |

## UX

Input and accessibility. Proposed primary gate: M2.

| ID | Priority / size | Work | Dependencies | Acceptance and evidence |
| --- | --- | --- | --- | --- |
| UX-01 | P1 / M | Tactical explanation pass | CBT-01 | Legal/illegal target reasons, costs and objective progress are readable without color alone. |
| UX-02 | P0 / M | Focus and navigation map | FND-01 | Keyboard order covers camp, battle, dialogs, backup review and target confirmation. |
| UX-03 | P1 / M | Persisted settings | SAV-01, UX-02 | Text size, contrast, motion and audio preferences restore independently of campaign saves. |
| UX-04 | P2 / L | Input remapping contract | UX-02 | Detect conflicts, provide defaults/reset and keep a recovery path for all bindings. |
| UX-05 | P1 / L | Controller-complete player path | UX-04, MAP-05 | Physical controller covers camp to settlement, focus restoration and disconnect recovery. |
| UX-06 | P1 / L | Touch target and camera pass | MAP-03, UX-02 | Narrow layouts distinguish pan/zoom/target/confirm without accidental actions. |
| UX-07 | P1 / L | Nonvisual tactical interface spike | OBJ-01, UX-01 | Evaluate an accessible tile/unit list with actions, targeting and clear scope limits. |
| UX-08 | P1 / L | Tutorial and field guide | NAR-05, UX-01 | Teach move/act/end, previews, jobs and recovery with skippable repeatable steps. |
| UX-09 | P2 / L | Localization-ready UI | NAR-10, UX-03 | Text keys, variable substitution and long-string layouts avoid concatenated rule messages. |
| UX-10 | P0 / L | Accessibility acceptance audit | UX-05, UX-06, UX-07 | Record actual keyboard, contrast, text-scale and assistive-technology results with unresolved gaps. |

## SAV

Persistence and portability. Proposed primary gate: M1.

| ID | Priority / size | Work | Dependencies | Acceptance and evidence |
| --- | --- | --- | --- | --- |
| SAV-01 | P0 / M | Versioning and migration policy | FND-01 | Distinguish DB schema, serialized expedition and export envelope versions; define supported upgrade paths. |
| SAV-02 | P0 / M | Migration fixture library | SAV-01, FND-03 | Archive minimal supported-version fixtures and verify resources, RNG, IDs and settlement state. |
| SAV-03 | P0 / L | Expanded roster/map migration | SAV-02, MAP-02, CMP-01 | Convert current fixed saves without losing active coordinates or original companion progression. |
| SAV-04 | P0 / L | Campaign quest persistence | SAV-02, NAR-02 | Resume choices, quest progress, recruits and first-clear ledgers at each chapter boundary. |
| SAV-05 | P1 / L | Multi-tab write conflict policy | SAV-02 | Detect competing revisions; resolve or refuse stale writes without silent overwrite. |
| SAV-06 | P1 / M | Autosave/checkpoint policy | OBJ-09, SAV-04 | Define safe points and failure notices; manual checkpoints remain independent. |
| SAV-07 | P0 / L | Portable export evolution | SAV-03, SAV-04 | Review/import a supported future envelope atomically with accurate size/version errors. |
| SAV-08 | P0 / L | Offline/update compatibility | SAV-06, QA-06 | Choose cache activation and rollback behavior that cannot strand a save on an incompatible build. |
| SAV-09 | P3 / M | Cloud sync decision | SAV-05, SAV-07 | Explicitly accept or defer accounts, conflicts, privacy, cost and offline behavior before any service integration. |
| SAV-10 | P0 / L | Restore and downgrade rehearsal | SAV-07, SAV-08 | Test upgrade, interrupted write, unsupported downgrade and previous-build recovery with published limits. |

## QA

Verification and release. Proposed primary gate: M1.

| ID | Priority / size | Work | Dependencies | Acceptance and evidence |
| --- | --- | --- | --- | --- |
| QA-01 | P0 / M | Baseline fixture inventory | FND-01 | Retain all four map completions, economic invariants, legacy saves and current art checks. |
| QA-02 | P0 / L | Objective/map regression matrix | OBJ-02, MAP-03 | Test win, fail, retry, import and resume for alternate sizes and objectives. |
| QA-03 | P0 / L | Content graph validation | FND-04, NAR-02 | Catch cyclic prerequisites, unreachable required flags and missing content/art references. |
| QA-04 | P1 / L | Rendering/resource harness | FND-09, ART-03 | Measure texture/particle lifetimes through scene changes, failure fallback and reduced motion. |
| QA-05 | P1 / L | Balance scenario suite | JOB-01, ECO-01 | Compare diverse viable builds, resource paths and bounded complete fights; retain scenario context. |
| QA-06 | P0 / L | Browser/device support matrix | UX-02, FND-09 | Record tested versions, real input hardware, viewport/device details and unsupported cases. |
| QA-07 | P0 / L | Route and narrative coverage | NAR-07, SAV-04 | Exercise every required branch, recruit condition and ending prerequisite through restore checkpoints. |
| QA-08 | P0 / M | Distribution and rights checklist | ART-09, AUD-10 | Resolve project licensing, required notices, release artifacts and support policy before distribution claims. |
| QA-09 | P0 / L | Beta triage and release lock | QA-05, QA-06, QA-07 | Classify blockers, freeze IDs/strings/content and document explicit deferrals with exit criteria. |
| QA-10 | P0 / L | Release/rollback drill | QA-08, QA-09, SAV-10 | Publish a candidate, verify assets and save recovery, rehearse rollback and tag only approved scope. |

## Moving an item to implementation

1. Link its ID in the change proposal and state the exact player path.
2. Resolve dependencies and name any deliberately deferred scope.
3. Specify authoritative state, invalid-command behavior and save compatibility.
4. Implement the smallest complete result, with meaningful rule/content/browser evidence.
5. Update the current guides only after behavior exists. Preserve the proposal as history when superseded.

Do not use a passing unit count as proof of full route balance, accessible play or physical-device support. The [release plan](RELEASE_AND_QUALITY.md) defines those separate gates.

