# Art and audio

[Documentation index](README.md) · [Renderer](../src/scene.ts) · [Audio source](../src/audio.ts)

## Visual identity

Veyr is a fragment of moss-covered limestone: a stream splits the battlefield, an eastern terrace carries a broken shrine, and a crown shard hangs above its plinth. Pale sage, dark foliage, faded cloth and bronze guide the field-ledger interface. Tactical overlays communicate state rather than decorate unrelated UI panels.

| Asset or system       | Current construction                                                                 | Extension boundary                                      |
| --------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Characters            | Eight 32-frame job sheets, plus the original atlas for portraits/fallback                       | [Animation contract](ANIMATION_PIPELINE.md), [portraits](SPRITE_ART.md)            |
| Props and silhouettes | Distinct armor, robes, faces and weapons for all eight jobs                          | Characters sharing a primary job share the artwork      |
| Team treatment        | Allied original palette, mirrored rust-tinted enemies, circle/diamond ground markers | Keep both shape and color cues                          |
| Texture sampling      | Linear filtering for character art; nearest for health bars                          | Preserve transparent edges and small-scale readability  |
| Camera readability    | Camera-facing billboards                                                             | No directional animation atlas yet                      |
| Terrain               | Original boxes, angular foliage, engraved paving, columns and plinths                | Decoration does not replace authoritative blocked tiles |
| Lighting              | Hemisphere light, sunlight, shadows, filmic tone mapping                             | Profile before expanding expensive effects              |
| Motion                | Eight animation states, interpolated travel and rotating shard | Four frames per state; longer cycles remain planned          |
| Foreground visibility | Fade tall scenery from near camera orientations                                      | View-based approximation, not per-character occlusion   |

The screenshot in [the README](../README.md) shows the current Veyr implementation. It is a development capture, not evidence of the planned campaign environments.

## Animation contract

The current 256-frame animation set is documented in [the animation pipeline](ANIMATION_PIPELINE.md). The original ready-pose atlas remains in [the portrait pipeline](SPRITE_ART.md). Dedicated run, item and directional views remain planned.

Animation must follow simulation outcomes. It must not decide when a hit succeeds, consume random rolls, or change turn order. Retain reduced-motion behavior, camera readability, transparent backgrounds and graphics-resource disposal.

## Audio

`AudioScore` uses Web Audio oscillators and gain envelopes, with no external recordings. A small original sequence plays on a 650 ms timer with a lower supporting tone every fourth step. The interface also requests short tones for commands. The score starts only after a user action and uses the same audio context/volume infrastructure; there are no separate music, ambient and effects mixers.

Sound and volume settings are session-only. The sketch does not yet implement orchestral arrangements, adaptive battle intensity, weapon-specific libraries, environmental ambience or a full soundtrack. Browser audio policy may require clicking Sound again after a suspended context.

## Ownership and licenses

The new character atlas was generated for this project with the built-in image-generation tool. Original portrait provenance is recorded in [SPRITE_ART.md](SPRITE_ART.md); all eight animation prompts and delivered source dimensions are recorded in [the animation pipeline](ANIMATION_PIPELINE.md). Original procedural character drawing remains a loading-failure fallback. Terrain composition and synthesized music were authored for the project. No commercial game artwork was supplied as a reference. Third-party packages retain their respective licenses. Cormorant Garamond and DM Sans are optional external Google Fonts assets with local serif/sans fallbacks and their own font licenses.

There is no repository-level project license file. Do not describe the repository as MIT-licensed simply because a dependency is MIT-licensed. Before adding external assets, record the source, author, license, required attribution and commercial-usage conditions. The repository does not yet contain a formal third-party asset inventory; do not invent provenance or licensing assurances for future files.
