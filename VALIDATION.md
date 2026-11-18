# Validation — Phase 1

Validated on November 17, 2026 (America/New_York).

- Production: TypeScript strict check and Vite production compilation pass.
- Rules: 17 Node/tsx tests pass. These cover movement costs and blocked tiles; move/action limits; immutable deterministic attack replay; elevation, facing and guard; range/line-of-sight; freezing/ignition; healing/revival; burn and slow expiry; job requirements and retained JP; momentum/rewards; defeat; save validation; a complete deterministic scored-AI battle; lightning/soaked combinations; lethal riposte recovery; malformed save safety; allied area immunity and fallen tile occupancy.
- Browser: the application ran in the Codex in-app browser without captured console warnings or errors. Confirmed a legal move, keyboard tile selection, command confirmation, once-per-turn movement lock, turn advancement, automatic enemy action/damage, water changing to ice, energy consumption, manual save and restore, primary job change, sprite/HUD update and 90-degree camera rotation.
- Layout: visually inspected at 1440×900, 768×1024 and 390×844. Fixed tablet board clipping with an aspect-aware orthographic frustum. Added phone quick commands, fixed the phone header, increased small interface labels, and compressed the desktop rail so save controls remain visible. Phone DOM width check found no document-level horizontal overflow; timeline and quick commands intentionally scroll within their frames.
- Design lint: 0 failures. Remaining warnings refer to actual mechanics terminology (job unlocks and formation synergy), an in-world story about shadows, and shadows used only on floating selection panels, toasts, dialogs and the result overlay. These are intentional.
- Automated visual inspector could not launch its separate Chrome process: the Windows crash server terminated during startup. Manual browser screenshot review supplied the layout check; automated contrast/layout metrics are unverified.
- Bundle: approximately 764 kB JavaScript before gzip, approximately 212 kB gzip, dominated by Three.js and React. Vite reports its default large-chunk warning. No FPS or real-device performance certification has been made.

Not tested on physical Android/iOS devices, Safari, installed PWA, or a physical gamepad. Standard gamepad mapping is implemented but device compatibility remains unverified. Full campaign, release accessibility, PWA and migration acceptance belong to future milestones in DESIGN.md.
