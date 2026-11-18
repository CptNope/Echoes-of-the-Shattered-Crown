# Art and audio

[Documentation index](README.md) · [Renderer](../src/scene.ts) · [Audio source](../src/audio.ts)

## Visual identity

Veyr is a fragment of moss-covered limestone: a stream splits the battlefield, an eastern terrace carries a broken shrine, and a crown shard hangs above its plinth. Pale sage, dark foliage, faded cloth and bronze guide the field-ledger interface. Tactical overlays communicate state rather than decorate unrelated UI panels.

| Asset or system       | Current construction                                                                 | Extension boundary                                                    |
| --------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Characters            | Original 32×42 transparent canvases from `spriteCanvas()`                            | Replace with an original/licensed atlas without changing engine rules |
| Props and silhouettes | Helmet/shield/sword, crooked cap/glass staff, hood/branching staff, face wrap/blades | Advanced jobs reuse parts of this visual language                     |
| Team treatment        | Allied job cloth versus enemy rust cloth; circle/diamond markers                     | Keep both shape and color cues                                        |
| Texture sampling      | Nearest-neighbor filtering                                                           | Preserve crisp pixels at scale                                        |
| Camera readability    | Camera-facing billboards                                                             | No directional animation atlas yet                                    |
| Terrain               | Original boxes, angular foliage, engraved paving, columns and plinths                | Decoration does not replace authoritative blocked tiles               |
| Lighting              | Hemisphere light, sunlight, shadows, filmic tone mapping                             | Profile before expanding expensive effects                            |
| Motion                | Idle bob, interpolated travel, fallen pose, rotating shard                           | Full attack/cast/damage/item/victory animations remain planned        |
| Foreground visibility | Fade tall scenery from near camera orientations                                      | View-based approximation, not per-character occlusion                 |

The screenshot in [the README](../README.md) shows the original Veyr implementation. It is a development capture, not evidence of the planned campaign environments.

## Future sprite-atlas contract

A production atlas pipeline should record job/character identity, team palette, frame dimensions, animation state, facing convention, frame index and duration. Planned states include idle, walk, run, attack, cast, damage, defend, item, victory and incapacitated. These are asset requirements, not a currently implemented loader schema.

Animation must follow simulation outcomes. It must not decide when a hit succeeds, consume random rolls, or change turn order. Retain reduced-motion behavior, camera readability, transparent backgrounds and graphics-resource disposal.

## Audio

`AudioScore` uses Web Audio oscillators and gain envelopes, with no external recordings. A small original sequence plays on a 650 ms timer with a lower supporting tone every fourth step. The interface also requests short tones for commands. The score starts only after a user action and uses the same audio context/volume infrastructure; there are no separate music, ambient and effects mixers.

Sound and volume settings are session-only. The sketch does not yet implement orchestral arrangements, adaptive battle intensity, weapon-specific libraries, environmental ambience or a full soundtrack. Browser audio policy may require clicking Sound again after a suspended context.

## Ownership and licenses

The pixel drawing code, terrain composition and synthesized musical material were authored for this project; no commercial game artwork was extracted, traced or recolored. Third-party packages retain their respective licenses. Cormorant Garamond and DM Sans are optional external Google Fonts assets with local serif/sans fallbacks and their own font licenses.

There is no repository-level project license file. Do not describe the repository as MIT-licensed simply because a dependency is MIT-licensed. Before adding external assets, record the source, author, license, required attribution and commercial-usage conditions. The repository does not yet contain a formal third-party asset inventory; do not invent provenance or licensing assurances for future files.
