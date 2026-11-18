# Development

[Documentation index](README.md) · [Architecture](ARCHITECTURE.md) · [Contributing](../CONTRIBUTING.md)

## Environment and commands

Use Node.js 24 and the committed `package-lock.json`, matching the Pages workflow. Install with `npm ci`. No backend, credentials or environment file are required for gameplay. Vite can select another port if one is occupied; a permission-denied port may require explicitly choosing another port.

```sh
npm ci
npm run dev -- --port 4187
```

Before submitting a simulation change:

```sh
npm test
npm run build
```

Preview the production output with `npx vite preview --host 127.0.0.1 --port 4187`. The browser must receive JavaScript and CSS from HTTP, not from directly opening the source HTML.

The repository currently defines `dev`, `build` and `test` scripts only. There is no configured `npm run lint`, `npm run preview`, docs site generator or test-coverage threshold. Prettier is installed as a development dependency and can be invoked explicitly. `tsconfig.json` checks `src/`; the Vite config is loaded by Vite during the build, not included in that TypeScript file set.

## Working with the engine

This example uses no browser or renderer:

```ts
import { createBattle, command, activeUnit } from "./src/engine";

const initial = createBattle(74319);
const moved = command(initial, { type: "move", x: 3, z: 5 });
const next = command(moved, { type: "end" });

console.log(initial.units[0].x); // 2: source snapshot was not mutated
console.log(moved.units[0].x); // 3
console.log(activeUnit(next).id); // corin
```

Use `tsx` to execute TypeScript scripts. A rejected command returns the same state object; check identity when testing invalid input. Browser UI gating is not a substitute for engine validation. Keep query functions such as previews aligned with the actual resolution formula.

## Extension recipes

| Change                 | Required edits                                                       | Verification                                                |
| ---------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| Tune an existing skill | `data.ts`; update numeric reference tables                           | Relevant damage/targeting tests and a preview check         |
| Add a skill            | `SkillId`, `skills`, a job's skills; engine effect if new            | Availability, resources, targets, status/terrain timing     |
| Add a job              | `JobId`, `jobs`, prerequisites, sprite handling as needed            | Unlocks, JP retention, primary versus secondary tradeoff    |
| Add a status           | `Unit.status`, initialization, resolution/expiry and save validation | Application, expiry, malformed-save and replay cases        |
| Add a map              | Encounter factory plus renderer, inputs and save-count assumptions   | Paths, elevations, LOS, spawn legality and complete outcome |
| Change save shape      | Engine types/validator and storage migration or rejection policy     | Old format, invalid records, fallback slot behavior         |
| Change controls        | UI input adapter, HUD guidance and help table                        | Keyboard focus, touch targeting and cancellation            |
| Add an asset atlas     | Rendering texture/frame adapter                                      | Nearest filtering, alpha, camera rotation and cleanup       |

### Adding an ability

1. Give it a stable ID and a complete typed definition in `data.ts`.
2. Decide whether existing damage/heal/buff handling is enough. Add an engine rule only when the semantics require it.
3. Assign it to a job and check that primary/secondary skill merging de-duplicates it.
4. Cover cost, range, hit/miss behavior and relevant terrain/status effects with meaningful assertions.
5. Verify that `preview()` and actual resolution agree apart from documented critical randomness.
6. Update the [ability table](JOBS_AND_ABILITIES.md), [combat rules](COMBAT.md), and changelog.

Adding only a data row does not create a new animation, UI icon, purchase tree, AI strategy or permanent learned ability. Follow the relevant extension boundaries rather than introducing a disconnected button.

### Expanding encounters

`createBattle()` owns Veyr's map and roster. The renderer, cursor clamps and save validator also assume dimensions 9×9, and save validation expects eight units. Generalize those together before accepting arbitrary maps. Keep decorative scenery separate from authoritative terrain, and update tests for the new movement and LOS geometry.

## Code conventions

Keep authoritative rules in the engine, content values in `data.ts`, and browser lifecycles in their adapters. Do not introduce renderer objects into a save or call wall-clock/random APIs for combat resolution. Use the state's seed for new random mechanics. Avoid mutating input snapshots or relying on animation completion to apply damage.

Favor a regression case that can fail for a real reason: a blocked climb, a lethal counter, a revived unit re-entering the timeline, a status expiring at the correct ending. Do not replace assertions with snapshots of the implementation's own intermediate calculations.

Class and skill IDs are persistence keys. Renames need a compatibility decision, not just a UI label change. The current project is small and modular, but not a plugin framework; discuss larger content-system or campaign changes against the [roadmap](ROADMAP.md).

## Documentation maintenance

Use relative Markdown links, descriptive headings, valid table separators, and simple fenced Mermaid. Keep requirements in `PROJECT_BRIEF.md` preserved; update current guides when behavior changes. Historical `DESIGN.md` and `VALIDATION.md` should retain their original context or receive clearly labeled addenda. Do not add planned mechanics to the implemented-feature table until a functional, validated path exists.

Pages deploys the game artifact, not this documentation directory. GitHub renders the README, Markdown tables and Mermaid diagrams directly in the repository.
