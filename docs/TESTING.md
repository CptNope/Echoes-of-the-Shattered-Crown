# Testing and verification

[Documentation index](README.md) · [Test source](../src/engine.test.ts) · [Deployment](DEPLOYMENT.md)

## Automated rules coverage

Run `npm test`. The script uses `tsx --test src/engine.test.ts src/campaign.test.ts src/supports.test.ts src/advanced.test.ts src/portable.test.ts` and Node's built-in test runner. The current suite has 49 tests; this count is an inventory, not a coverage percentage or balance certification.

| Area             | Assertions represented                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| Movement         | Water, obstacles, occupancy, climb costs, once-per-turn move, illegal action identity                         |
| Resolution       | Deterministic replay, source immutability, basic damage, spent action                                         |
| Positioning      | Facing/flank, guard and elevation preview; formation reduction is implemented but lacks an isolated assertion |
| Targeting        | Range, blocked LOS and unavailable energy                                                                     |
| Terrain          | Water-to-ice and grass ignition                                                                               |
| Healing          | Revival amount, health cap, burn clearing                                                                     |
| Status/timeline  | Burn damage, counter decrement, slow readiness penalty, next actor                                            |
| Progression      | JP level calculation, combined prerequisites, retained progress, initial-turn job gate                        |
| Momentum/outcome | Concord gate, victory reward once, burn-triggered defeat, terminal rejection                                  |
| Save validation  | Versions, finite values, record counts, known jobs, null entries, missing counters                            |
| Integration      | Repeated scored-AI battle reaches an outcome within 400 activations and replays identically                   |
| Regressions      | Soaked lightning, lethal riposte turn advancement, allied area immunity, fallen tile occupancy                |

The integration test temporarily reverses team labels to apply the enemy planner as a symmetric player policy. It checks a legal deterministic simulation outcome, not a human strategy, a balanced encounter or real UI interaction.

## Build and hosting checks

| Check               | Entry point                                         | Boundary                                                         |
| ------------------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| Strict TypeScript   | `npm run build`                                     | `src/` file set; not a separate lint command                     |
| Production bundling | Vite in the same build command                      | Module/CSS compilation; not a frame-rate test                    |
| Local Pages assets  | `node scripts/verify-pages.mjs` after a Pages build | Paths and real nonempty files                                    |
| Live assets         | `PAGES_URL` plus verifier `--live`                  | HTTPS HTML/JS/CSS and RGBA atlas responses; no browser execution |
| CI                  | [Pages workflow](../.github/workflows/pages.yml)    | PR validation; main deployment and live verification             |

Vite currently warns about a JavaScript chunk above its default 500 kB threshold. The initial compiled bundle was roughly 764 kB, about 212 kB gzip, dominated by the renderer and UI libraries. A warning is not an exception, but optimization and device profiling remain roadmap work; future builds may differ.

## Browser smoke checklist

Use a clean, disposable in-memory battle and avoid overwriting a save you want to keep.

| Step                     | Expected observation                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Load game                | Board, original sprites, HUD and timeline render; no WebGL failure notice                 |
| Rotate and zoom          | Camera changes; actors remain readable; grid selection still matches                      |
| Move then confirm        | Preview cost matches; destination updates; Move becomes unavailable                       |
| Select/cancel ability    | Legal range appears; cancellation spends no resources                                     |
| Cast Stillwater on water | Energy decreases, action is spent and water becomes ice                                   |
| End allied turns         | AI runs automatically, then returns control to an allied activation                       |
| Heal/revive              | Health is capped; a fallen companion returns to the timeline                              |
| Change a starter loadout | Job label, sprite and skills update while activation count is 1                           |
| Save/change/load         | Saved resources, seed, terrain and turn are restored                                      |
| Win/lose                 | Result overlay appears and ordinary commands stop                                         |
| Resize                   | No document-level horizontal overflow; internal command/timeline scrolling remains usable |
| Settings                 | Text changes size; reduced motion removes easing; sound follows user activation           |

A complete manual victory/defeat playthrough has not been recorded as certified browser coverage; those terminal rules have automated engine tests. Keep that distinction in review notes.

## Evidence and gaps

Historical Phase 1 checks are in [VALIDATION.md](../VALIDATION.md). Browser layout review used 1440×900, 768×1024 and 390×844 viewports. Live Pages movement, turn advancement and a console warning/error check passed. Physical Android/iOS devices, Safari, gamepad hardware, installed PWA behavior, accessibility certification and desktop 60 FPS performance remain unverified.

The separate automated visual inspector could not launch its Windows Chrome process; manual screenshot review supplied layout QA. There is no configured visual regression suite, browser E2E suite, measured code coverage or storage integration-test suite. Add these intentionally when their maintenance cost serves a concrete risk.

## Version 0.2 validation

Eleven new campaign tests cover legal starter inventory/contract gates, permanent learning and preserved levels, unlearned secondary rejection, copy/proficiency restrictions, purchases, actual gear effects, one-time settlement, defeat/retry behavior, legacy migration, invalid progression data, and deterministic completed simulations for all three distinct boards.

Browser checks on an isolated localhost origin verified buying Bronze lamellar, the resulting armor/movement/HP change, save/reset/load restoration, a migrated v1 snapshot retaining 87 HP and 19 energy, victory settlement from 140 to 200 gold, learning Sundering arc and using it as an Arcanist/Vanguard in the second contract. Legacy and completed-battle inputs were supplied through a disposable local fixture page, removed before commit; this is not a claim of a full manual four-contract playthrough. Phone overflow checks at 390 pixels found no document-level horizontal overflow. Physical-device and full controller/accessibility certification remain outstanding.

## Version 0.3 coverage

Three new tests cover belfry gating and first-clear reward deduplication, the one-time half-health awakening and saved phase, and lethal-hit/older-v2-save compatibility. The deterministic complete-battle scenario now runs all four maps.

Browser QA used a disposable localhost fixture to show all eight normalized characters, load a half-health Orren, trigger the real end-turn awakening, and perform the real finishing attack before returning to camp to inspect the relic. This is targeted state coverage, not a manual full-campaign playthrough. The fixture was removed. This pass inspected 1280px and 914px viewports. The requested phone override did not take effect in this browser session; earlier 0.2 phone checks remain historical evidence. Physical-device performance remains unverified.

## Version 0.4 validation

Six new cases bring the suite to 37 tests. They cover mastery prerequisites/spending, owned and correctly typed slots, cross-job and actual stat effects, Second wind costs/survival, lethal Close reprisal turn advancement, and backward-compatible or malformed saves. A disposable localhost fixture seeded only JP; real UI actions learned the native skill, unlocked the support lesson, purchased/equipped Steadfast, saved, cleared the slot, loaded to restore it, then deployed with the support visible in combat. The fixture was removed. This targeted check is not a complete manual campaign or physical-device test.

## Version 0.5 validation

Six new cases bring the suite to 43 tests: Gloam preview/hit/miss consumption, Oathguard ally/self targeting and expiry, rain area/soak/friendly immunity, deterministic Stolen hour timing, camp learning/old v2 collections, and AI defensive casting. Existing complete-battle simulations still terminate on all four maps. Browser QA performed an actual opening-turn move and rain cast, checked the 11-damage preview against the captain’s 100→89 HP, and used a disposable local Runewarden save to check the 45% Oathguard preview and guard feedback. The fixture was removed.

## Version 0.6 validation

Six new pure backup cases bring the suite to 49 tests: complete-company and active-battle round trips, legacy/native imports, malformed/unsupported data, UTF-8 limits, safe download names and timestamp handling. Actual browser/IndexedDB checks downloaded a JSON file, rejected an invalid file without changing gold, reviewed and restored the download, and then loaded the unchanged manual checkpoint. A real turn-two battle was closed and resumed. A disposable local harness verified queued writes (latest 72 gold), corrupt-current fallback (previous 71), manual isolation (45), and an enemy-turn recovery that remained unchanged across a second close before Resume. Separate 390px and 768px nested viewport checks showed no horizontal overflow in backup access/header layouts; the phone recovery dialog was visually inspected. The harnesses were removed; these storage/browser checks are not part of the Node suite or physical-device certification.
