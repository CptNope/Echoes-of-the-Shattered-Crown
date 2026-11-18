# Troubleshooting

[Documentation index](README.md) · [Deployment](DEPLOYMENT.md) · [Data and saves](DATA_AND_SAVES.md)

| Symptom                                    | Check                                                | Next step                                                                                        |
| ------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Development server cannot bind a port      | Printed Vite error                                   | Try `npm run dev -- --port 4187`; use the actual printed URL                                     |
| Install fails or runtime is unsupported    | Node version, npm log, lockfile                      | Match CI's Node 24; use `npm ci`; preserve the error for review                                  |
| Page shows HTML but no game                | Browser asset requests and console                   | Confirm repository base path and deployed `dist/` artifact                                       |
| WebGL failure notice or no board           | Browser WebGL support and graphics policy            | Try a supported browser/device with WebGL available; do not infer an asset issue from this alone |
| Sound does not start                       | User interaction, Sound state and volume             | Click Sound after interacting with the page; check browser mute policy                           |
| No valid save found                        | Origin/profile and whether Save completed            | Use the original browser/origin; the loader automatically tries backup                           |
| Loaded progress seems older                | Recovery notice or prior manual snapshot             | Backup may have been restored; saving is manual, not continuous                                  |
| Progress disappears on replay              | New-battle reset                                     | Expected: fresh replay resets JP; load the saved snapshot if needed                              |
| A job is locked                            | Required job levels and initial-turn gate            | Check the unlock table; starter Ilya has a secondary exception                                   |
| Cannot change a job                        | Activation counter above 1                           | Loadouts lock after the first turn ends                                                          |
| Unit cannot cross water or ledge           | Terrain, height difference, costs, occupants         | Freeze water; climb in single-elevation steps; fallen units also block                           |
| Skill cannot target                        | Energy, spent action, range, center LOS, target team | Choose a legal center; look for blocked terrain or a missing ally                                |
| Spell spent energy but hit nobody          | Target center and footprint                          | Damage skills can target empty terrain; confirmation commits them                                |
| Enemy seems paused                         | Open dialog or normal presentation delay             | Close dialogs; consider Fast enemy turns in Settings                                             |
| Arrow directions feel wrong after rotation | Map-relative input                                   | Arrow controls follow x/z, not camera screen directions                                          |
| Gamepad is ignored                         | First pad, standard mapping, browser support         | Activate the pad and inspect device support; hardware certification is pending                   |
| Small-screen commands require scrolling    | Quick commands/timeline versus page                  | Use internal quick-command scrolling or the full command rail below the board                    |
| Pages CI fails                             | First red job/step                                   | Follow [deployment recovery](DEPLOYMENT.md#recovery); don't re-run blindly                       |

## Known scope limits

There is one map and no campaign navigation, inventory, shops, crafting or New Game Plus. The job framework lacks permanent purchased skills and mastery slots. Current animations cover idle, travel and falling rather than full combat sets. Terrain editing is limited to ice and ignition. Weather, destructible obstacles, resistance tables and configurable permadeath remain planned.

Saves have validation and previous-slot recovery but no migration/import/export or conflict resolution. Settings are not saved. There is no service worker, offline cache or PWA installation manifest. Performance targets and full accessibility support require further work; viewport responsiveness is not physical-device certification.

## Reporting a problem

Provide the URL/origin, browser and OS, steps from a fresh battle, active unit, chosen ability, target coordinate, expected result and observed result. Include console errors or failed network status codes if available, with private information removed. For rules bugs, a seed and command sequence make a deterministic regression case. Do not clear site data or overwrite a wanted save merely to produce a report.
