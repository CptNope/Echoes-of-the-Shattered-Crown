# Art and audio

[Documentation index](README.md) · [Renderer](../src/scene.ts) · [Audio source](../src/audio.ts)

## Visual identity

Veyr is a fragment of moss-covered limestone: a stream splits the battlefield, an eastern terrace carries a broken shrine, and a crown shard hangs above its plinth. Pale sage, dark foliage, faded cloth and bronze guide the field-ledger interface. Tactical overlays communicate state rather than decorate unrelated UI panels.

| Asset or system       | Current construction                                                                 | Extension boundary                                      |
| --------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Characters            | Generated eight-job RGBA atlas, normalized to 192×256 canvases                       | [Art contract and provenance](SPRITE_ART.md)            |
| Props and silhouettes | Distinct armor, robes, faces and weapons for all eight jobs                          | Characters sharing a primary job share the artwork      |
| Team treatment        | Allied original palette, mirrored rust-tinted enemies, circle/diamond ground markers | Keep both shape and color cues                          |
| Texture sampling      | Linear filtering for character art; nearest for health bars                          | Preserve transparent edges and small-scale readability  |
| Camera readability    | Camera-facing billboards                                                             | No directional animation atlas yet                      |
| Terrain               | Original boxes, angular foliage, engraved paving, columns and plinths                | Decoration does not replace authoritative blocked tiles |
| Lighting              | Hemisphere light, sunlight, shadows, filmic tone mapping                             | Profile before expanding expensive effects              |
| Motion                | Idle bob, interpolated travel, attack lean, damage tint, fallen pose, rotating shard | Full multi-frame animation sets remain planned          |
| Foreground visibility | Fade tall scenery from near camera orientations                                      | View-based approximation, not per-character occlusion   |

The screenshot in [the README](../README.md) shows the current Veyr implementation. It is a development capture, not evidence of the planned campaign environments.

## Future sprite-atlas contract

The current ready-pose atlas is documented in [the sprite pipeline](SPRITE_ART.md). A future multi-frame animation pipeline should record job/character identity, team palette, frame dimensions, animation state, facing convention, frame index and duration. Planned states include idle, walk, run, attack, cast, damage, defend, item, victory and incapacitated. These are asset requirements, not a currently implemented loader schema.

Animation must follow simulation outcomes. It must not decide when a hit succeeds, consume random rolls, or change turn order. Retain reduced-motion behavior, camera readability, transparent backgrounds and graphics-resource disposal.

## Audio

`AudioScore` uses Web Audio oscillators and gain envelopes, with no external recordings. A small original sequence plays on a 650 ms timer with a lower supporting tone every fourth step. The interface also requests short tones for commands. The score starts only after a user action and uses the same audio context/volume infrastructure; there are no separate music, ambient and effects mixers.

Sound and volume settings are session-only. The sketch does not yet implement orchestral arrangements, adaptive battle intensity, weapon-specific libraries, environmental ambience or a full soundtrack. Browser audio policy may require clicking Sound again after a suspended context.

## Ownership and licenses

The new character atlas was generated for this project with the built-in image-generation tool. The exact prompt and production dimensions are recorded in [SPRITE_ART.md](SPRITE_ART.md). Original procedural character drawing remains a loading-failure fallback. Terrain composition and synthesized music were authored for the project. No commercial game artwork was supplied as a reference. Third-party packages retain their respective licenses. Cormorant Garamond and DM Sans are optional external Google Fonts assets with local serif/sans fallbacks and their own font licenses.

There is no repository-level project license file. Do not describe the repository as MIT-licensed simply because a dependency is MIT-licensed. Before adding external assets, record the source, author, license, required attribution and commercial-usage conditions. The repository does not yet contain a formal third-party asset inventory; do not invent provenance or licensing assurances for future files.
