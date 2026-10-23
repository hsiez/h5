# Storefront button exploration

The local design preview keeps two versions of the primary action at `/things-for-you/design`. The default is `button=layered`; add `?button=overlay` to revisit the earlier Cofounder-inspired treatment. The preview navigation also switches between them. The live storefront uses the default layered version.

## Earlier overlay (`button=overlay`)

- An 8px button with a 1px translucent dark border holds the `neutral-800` to `neutral-600` face gradient and outer shadow.
- An absolutely positioned overlay uses a transparent 1px border, 7px radius, 16px backdrop blur, a 16% to 8% white gradient, a white top inset highlight, and two dark bottom inset shadows.
- The text sits above the overlay. The overlay has no pointer events.

The broad dark rim gave the highlight contrast, but the border, overlay border, blur, and inset shadows were hard to align. At high zoom the corners appeared non-concentric and the side rims looked uneven. Keep this version as a visual reference, not the default.

## Current layered version (`button=layered`)

The 8px outer shape holds a 2px rim. A gradient face and highlight overlay share a 2px inset and 6px radius, making their geometry explicit and concentric. A static 2× grayscale grain tile sits over the highlight and beneath the label at 24% opacity with overlay blending. `scripts/generate-button-grain.py` regenerates it. Stippling remains reserved for the sending state.
