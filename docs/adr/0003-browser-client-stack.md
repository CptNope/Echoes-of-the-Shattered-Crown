# ADR-0003: Use React, Three.js and Vite for the browser client

[ADR index](README.md) · [Architecture](../ARCHITECTURE.md)

- Status: Accepted
- Recorded: 2026-11-19
- Decision date: Not recorded; reconstructed from current v0.8 implementation
- Origin: Retrospective
- Supersedes: None
- Superseded by: None

This is a retrospective record of the implemented baseline. The alternatives and rationale are present-day analysis, not a transcript of an earlier approval or an invented original date.

## Context

The game combines menu-heavy company management with an isometric battlefield and browser-local storage. Its present delivery target is a static browser application.

## Decision

Use TypeScript for application/rule code, React for camp/HUD/dialogs, Three.js for the orthographic battlefield, and Vite for development and production builds. Keep the current game playable without an application backend; local persistence and asset loading use browser facilities.

## Alternatives considered

| Alternative | Tradeoff |
| --- | --- |
| One UI framework owns all scene rendering | Would replace the existing scene boundary and rendering/resource lifecycle. |
| A different full game engine | Could provide tools, but requires a separate migration and deployment decision. |
| A mandatory backend for the current slice | Adds authentication, operations and offline/conflict concerns not required by present gameplay. |

## Consequences

The repository deploys static assets and can test simulation separately. WebGL/browser differences, scene teardown and UI/renderer synchronization remain explicit responsibilities. PWA, cloud sync and native packaging are not implied by this stack.

## Evidence and verification

[package.json](../../package.json), [main.tsx](../../src/main.tsx), [Camp.tsx](../../src/Camp.tsx), [scene.ts](../../src/scene.ts) and [vite.config.ts](../../vite.config.ts) show the current stack. [Deployment](../DEPLOYMENT.md) documents static publishing.

## Revisit conditions

Revisit for a demonstrated tooling/platform constraint or an explicitly chosen backend feature. Evaluate measured cost and save compatibility before changing engines.

## Related records

- [ADR-0002](0002-deterministic-simulation-boundary.md)
- [ADR-0009](0009-publish-static-builds-through-actions.md)

