# Graphite Stippling Effect

This document describes the procedural image treatment used for the Loadout item hover state. The effect reconstructs each transparent product photograph from irregular graphite-like marks, then pre-renders the result as a transparent PNG for inexpensive browser compositing.

## Design goal

The target is a graphite drawing rather than uniform image noise:

- Highlights should be nearly empty.
- Midtones should contain sparse graphite dust.
- Shadows should become black through overlapping marks.
- Fine changes in the source image should remain visible.
- The generated image must align exactly with the normalized source PNG.
- No source photograph should be required underneath the final effect.

The central rule is:

> Brightness controls how much graphite accumulates, not merely the color of a uniformly distributed particle.

## Inputs and outputs

Each source item is a transparent PNG normalized onto the same `1090 × 1210` canvas. The procedure produces another transparent PNG with the same dimensions and alignment.

The browser stacks the original and generated assets in the same positioned container. On hover or keyboard focus, it crossfades from the photograph to the graphite image using only opacity and transform changes.

## Pipeline overview

```text
Normalized transparent PNG
        ↓
Downsample to an analysis grid
        ↓
Measure alpha and perceived luminance
        ↓
Normalize contrast for this specific object
        ↓
Enhance local contrast
        ↓
Convert darkness to nonlinear particle density
        ↓
Generate deterministic irregular graphite marks
        ↓
Render once to a transparent PNG
```

## 1. Analysis grid

The source is downsampled to a grid that is 200 cells wide while preserving its aspect ratio:

```ts
const columns = 200;
const rows = Math.round(columns * sourceHeight / sourceWidth);
```

This grid is used only for analysis and mark placement. The final output is rendered at the full normalized source dimensions.

For each cell, record alpha and perceived luminance:

```ts
const luminance =
  red   * 0.2126 +
  green * 0.7152 +
  blue  * 0.0722;
```

Cells with alpha below `0.06` are ignored. This prevents marks from appearing outside the item while retaining soft source edges.

## 2. Object-specific contrast normalization

Different products can occupy very different brightness ranges. Black loafers may contain useful detail entirely between luminance values `0.03` and `0.20`, while a red coat may occupy a broader and brighter range.

Collect luminance values from cells with alpha greater than `0.12`, sort them, and calculate:

```ts
const darkPoint = percentile(values, 0.025);
const lightPoint = percentile(values, 0.965);
const range = Math.max(0.04, lightPoint - darkPoint);
```

The percentile limits discard a small number of extreme pixels. The minimum range prevents unstable amplification when a source is nearly flat.

Normalize each luminance value within that object-specific range:

```ts
const normalized = clamp(
  (enhancedLuminance - darkPoint) / range,
  0,
  1,
);
```

This step is essential for recovering detail in dark objects.

## 3. Local contrast enhancement

Calculate the mean luminance of the valid cells in a `3 × 3` neighborhood. Increase the difference between the center cell and that local mean:

```ts
const enhancedLuminance = clamp(
  luminance + (luminance - neighborhoodAverage) * 1.35,
  0,
  1,
);
```

This behaves like a small unsharp mask. It helps preserve seams, creases, pockets, leather highlights, and material boundaries without applying a global edge outline.

## 4. Nonlinear graphite density

Convert normalized brightness to darkness:

```ts
const darkness = 1 - normalized;
```

Then apply a nonlinear density curve:

```ts
const density = darkness ** 2.15;
```

The exponent suppresses particles in highlights while increasing accumulation rapidly in shadows. This is the main difference between a graphite appearance and uniform static.

The expected particle count for one analysis cell is:

```ts
const expectedParticles = density * 8.5;
```

Use stochastic rounding for fractional counts:

```ts
let particles = Math.floor(expectedParticles);

if (random() < expectedParticles % 1) {
  particles += 1;
}
```

As a result, highlights commonly receive no particles, midtones receive a few, and deep shadows receive many overlapping particles.

## 5. Particle construction

Each graphite mark is a small ellipse placed randomly inside its analysis cell. Its shape is intentionally irregular rather than circular.

First derive a softer shadow control value:

```ts
const shadowStrength = darkness ** 0.68;
```

Then vary each particle's position, width, height, opacity, and rotation:

```ts
const x = randomPositionWithinCell();
const y = randomPositionWithinCell();

const radiusX = randomWidth(shadowStrength);
const radiusY = randomHeight(shadowStrength);

const opacity = clamp(
  randomBetween(0.22, 0.48) + shadowStrength * 0.46,
  0,
  0.96,
) * alphaInfluence;

const rotation = randomBetween(-50, 50);
```

Particles become slightly larger and darker in shadows. The deep blacks are produced by many translucent particles overlapping, not by filling a cell with a single solid tone.

## 6. Deterministic randomness

The pseudo-random number generator is seeded from the item name. The exact generator currently uses a 32-bit linear congruential sequence:

```ts
state = state * 1664525 + 1013904223;
```

Deterministic randomness provides three benefits:

- The same input always produces the same drawing.
- Parameter changes can be compared without unrelated particle movement.
- The image never shimmers or changes between builds.

## 7. Rendering

The procedure initially describes every particle as an SVG ellipse. The SVG is rendered once at the full source dimensions and saved as a transparent PNG.

Typical item outputs contain approximately 35,000–61,000 marks. Pre-rendering keeps that complexity out of the runtime DOM. During interaction, the browser composites only two raster layers:

```text
source PNG opacity:   1 → 0
graphite PNG opacity: 0 → 1
```

The normalized source and generated image share the same dimensions, transparency, and object alignment, so the crossfade does not move or resize the item.

## Current parameters

| Parameter | Value |
| --- | ---: |
| Analysis width | `200` cells |
| Alpha inclusion threshold | `0.06` |
| Percentile sample alpha | `0.12` |
| Dark percentile | `2.5%` |
| Light percentile | `96.5%` |
| Minimum tonal range | `0.04` |
| Local contrast multiplier | `1.35` |
| Density exponent | `2.15` |
| Maximum expected particles per cell | `8.5` |
| Shadow-size exponent | `0.68` |
| Maximum particle opacity | `0.96` |
| Particle rotation | `-50°` to `50°` |

## Tuning guide

If the result resembles static:

- Remove any baseline particle count.
- Increase the density exponent.
- Lower particle opacity in highlights.
- Confirm that empty highlight cells are possible.

If shadows are too weak:

- Increase the maximum expected particles per cell.
- Increase shadow particle opacity modestly.
- Increase particle size in high-darkness cells.

If detail is missing:

- Increase the analysis-grid resolution.
- Increase local contrast slightly.
- Tighten the percentile range for low-contrast source images.
- Avoid adding uniform noise, which reduces perceived detail.

If the image is too harsh:

- Reduce the local contrast multiplier.
- Reduce the density exponent.
- Reduce particle opacity before reducing grid resolution.

## Runtime behavior

The Graphite asset is responsive in the same way as its source PNG. Both use the same normalized canvas and `object-fit: contain`. Particle size therefore scales proportionally with the item:

- Smaller in the world and 3-column views.
- Larger in the focused 1-column view.
- Proportional on narrower viewports.

The generated PNG is 1090 pixels wide, which is sufficient for the current focused desktop width of up to 760 pixels. If the design later allows enlargement beyond the source resolution, the procedural SVG can be retained or regenerated at a larger raster size.
