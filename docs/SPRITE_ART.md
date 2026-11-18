# Character art pipeline

[Documentation index](README.md) · [Art and audio](ART_AND_AUDIO.md) · [Sprite loader](../src/sprites.ts)

Version 0.3 replaces the visible placeholder characters with an original, AI-generated fantasy atlas. The built-in OpenAI image-generation tool produced the final PNG on 2026-11-18. No external game art was used as a reference. This records production provenance; it is not a repository license grant.

## Asset contract

| Property        | Value                                                                  |
| --------------- | ---------------------------------------------------------------------- |
| Runtime file    | `public/art/company-atlas.png`                                         |
| Image           | 1536 × 1024 PNG, RGBA transparency, approximately 2.7 MB               |
| Layout          | Four columns × two rows; cells are 384 × 512                           |
| Top row         | Vanguard, Blade Dancer, Arcanist, Lifebinder                           |
| Bottom row      | Shadowrunner, Runewarden, Storm Herald, Chronoweaver                   |
| Runtime output  | Alpha-bounded characters fitted into 192 × 256 transparent canvases    |
| Baseline        | Three pixels above the canvas bottom, with weapon padding preserved    |
| Portraits       | Closer square crops from the same normalized artwork                   |
| Enemy treatment | Mirrored, desaturated and subtly rust tinted; diamond ground marker    |
| Ally treatment  | Original palette; circular ground marker                               |
| Sampling        | Linear filtering for character billboards; health bars remain separate |
| Fallback        | Original procedural characters if the image cannot load                |

The atlas loads once per page and caches normalized canvases per job/team. Camp portraits redraw when loading completes; active battle textures refresh without rebuilding the simulation. The URL uses Vite's base URL, including the GitHub Pages repository subpath. No CDN or runtime image-generation service is required.

The current art supplies one ready pose per job. Idle bob, travel interpolation, attack lean, damage tint and fallen rotation are renderer feedback. They are not a multi-frame walk or attack atlas. Reduced-motion mode suppresses animated feedback. Appearance follows the primary job; gear and secondary jobs do not change the costume. Characters sharing a job share artwork.

## Replacement checklist

Keep the cell order, transparent background, complete silhouettes and shared scale. Update the declared dimensions and Pages verifier together if changing atlas dimensions. Inspect all eight characters on a pale background and at battlefield scale. Preserve team markers and accessible job names. Keep combat outcomes independent from animation timing.

Both the local and live Pages verifier check that the image is a PNG with the expected dimensions and RGBA format. Browser checks establish that the transparent asset renders correctly; header checks alone cannot establish artistic quality.

## Final generation prompt

The production prompt below was sent to the built-in image-generation tool with `transparent_background: true`.

```text
Use case: stylized-concept.
Asset type: production tactical RPG character sprite atlas for Echoes of the Shattered Crown.
Create ONE transparent RGBA sprite sheet, exactly 4 equal columns by 2 equal rows, 1536x1024 landscape. Eight separate full-body characters, one centered in each 384x512 cell. ALL characters same scale: soles at 90% cell height, top at 12%, transparent padding on all sides. No characters or weapons crossing cell boundaries. No text, labels, grid lines, shadows on the ground, scenery, or decorative elements outside the characters.
Style: exquisite restrained hand-painted pixel-art tactical fantasy sprites, 3/4 front-facing looking toward lower right, slightly elevated camera, readable 4-head-tall proportions, crisp pixel clusters and fine dark outlines, nuanced fabric folds, warm skin, expressive little faces, beautiful hair, metal highlights. A coherent original art direction, muted sage, parchment, worn brass, ash and teal. Anatomically clear hands, boots, recognizable carried weapons. NOT crude block figures, NOT photoreal, no blurry strokes.
Top row left to right:
1 Vanguard: female knight, short silver hair, brass and blue-steel plate armor, cream tabard, sturdy shield in left hand and long steel sword in right, deep olive cape.
2 Blade Dancer: agile androgynous fighter, swept dark chestnut hair, flowing desaturated teal sash and layered light leather clothing, two slender curved blades.
3 Arcanist: young woman, wavy auburn hair, wine and charcoal robes, broad soft mage hat, brass-tipped wooden staff with small amber crystal.
4 Lifebinder: mature dark-skinned woman, braided dark hair, ivory hood folded behind head, sage and cream embroidered robes, living willow staff with a restrained green gem, small herb satchel.
Bottom row left to right:
5 Shadowrunner: slim hooded scout, charcoal leather, muted plum scarf covering mouth, visible eyes, twin daggers, asymmetrical cloak.
6 Runewarden: imposing armored knight, steel helmet with visible face, pale stone armor with narrow cyan rune inlays, heavy sword and tall angular shield, deep blue cape.
7 Storm Herald: silver-haired robed mage, flowing slate-blue coat with dull gold piping, forked brass staff carrying a small cyan lightning crystal, wind-tossed long scarf.
8 Chronoweaver: elderly scholarly mage, swept white hair, dusky violet and cream robes, circular brass astrolabe held in one hand, thin staff in other, subtle gold clockwork details.
Every figure alive and in a ready combat stance. Actual transparent background; keep all equipment fully inside its cell. Consistent illumination from upper left. Production art with meticulous costume silhouette differences.
```
