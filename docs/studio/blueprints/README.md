# Detailed studio editor blueprints

[Studio plan](../README.md) · [Tooling backlog](../STUDIO_ROADMAP.md) · [Acceptance scenarios](../ACCEPTANCE_AND_ROUNDTRIP.md)

**Planning specifications, not implemented editing tools.** This layer makes the existing twenty-four requirements and eighty tooling tasks more concrete. It adds no runtime format, playable content or accepted architecture decision.

| Blueprint | Concrete contract |
| --- | --- |
| [Editor shell and interaction](EDITOR_SHELL_AND_INTERACTION.md) | Tool discovery, inspectors, selection, transactions, undo, focus and diagnostics |
| [Pixel and animation editor](PIXEL_ANIMATION_EDITOR.md) | Layer/cel data, palettes, tools, directions, registration and timeline operations |
| [Level and game-system editors](LEVEL_AND_RULES_EDITORS.md) | Maps, deployment, objectives, rules, actors, AI, progression, economy and campaign |
| [Audio nodes and cue editing](AUDIO_NODE_AND_CUE_SPEC.md) | Music/SFX graph ports, clocks, envelopes, sampling, mixer/cue policy and errors |
| [Import/export conformance](IMPORT_EXPORT_CONFORMANCE.md) | Artifact membership, staging, source preservation, launch and failure diagnostics |
| [Implementation slices](IMPLEMENTATION_SLICES.md) | Six bounded prototype slices with concrete entry/exit evidence |

## Machine-readable design examples

[Blueprint index](../specs/blueprints.json) links six illustrative JSON examples: project header, layered pixels/animation, audio/music/cues, level/objective, cross-domain transaction and complete-bundle manifest.

The checker verifies their internal references and declared constraints. It does not render audio/art, build an executable game, implement transactions or certify an editor. A bundle member list is an example contract, not evidence that an archive was built.

## Relationship to existing plans

The [studio plan manifest](../specs/studio-plan.json) remains the requirement/backlog/gate authority. Blueprint IDs provide deeper specifications and reuse its STREQ, STU and STAC identities. [ADR-0011](../../adr/0011-proposed-editable-game-project-and-build-artifacts.md) and [ADR-0012](../../adr/0012-proposed-shared-music-and-sfx-graphs.md) remain Proposed.

A future prototype should implement one bounded slice and supply the stated evidence. Adding a schema example or a passing documentation check does not finish a tooling backlog item.

