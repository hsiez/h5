# Design System — Cheat Sheet

White background. Geist sans. 4px spacing rule. `#141414` darkest neutral.
All tokens live in `app/globals.css` under `@theme`. Edit values there, not in components.

## Typography

| Use                       | Class                          | Size / weight        |
|---------------------------|--------------------------------|----------------------|
| Body (default)            | inherited                      | Geist 16 / 400       |
| Secondary body, labels    | `text-sm font-medium`          | Geist 14 / 500       |
| Caption / meta            | `text-xs text-(--color-text-tertiary)` | Geist 12 / 400 |
| Card title                | `text-xl font-semibold`        | Geist 20 / 600       |
| Section head              | `text-2xl font-semibold tracking-tight` | Geist 24 / 600 |
| Page title                | `text-3xl font-semibold tracking-tight` | Geist 32 / 600 |
| Hero                      | `text-4xl font-semibold tracking-tight` | Geist 48 / 600 |

Three weights only: `font-normal` (400), `font-medium` (500), `font-semibold` (600).
**Emphasize with weight or color, never with a slightly bigger size.**
**De-emphasize with `text-secondary` / `text-tertiary` color, not lighter weight.**

## Spacing — 4px rule, no exceptions

| Token | px  | Use                                     |
|-------|-----|-----------------------------------------|
| `1`   | 4   | tight inline gaps                       |
| `2`   | 8   | icon-to-label, input internal padding   |
| `3`   | 12  | compact element padding                 |
| `4`   | 16  | default element padding                 |
| `6`   | 24  | card padding, related group gaps        |
| `8`   | 32  | section gaps                            |
| `12`  | 48  | major section separation                |
| `16`  | 64  | page-level breathing room               |
| `24`  | 96  | hero whitespace                         |
| `32`  | 128 | dramatic, top-of-page                   |

`p-`, `px-`, `gap-`, `mt-`, etc. all use these values. If you reach for `p-5` (20px), pick `p-4` or `p-6` instead — there's no `p-5` in the system.

## Colors

**Text hierarchy — pick from these three for 95% of cases.**
- `text-(--color-text-primary)` — `#141414`, headings, key content.
- `text-(--color-text-secondary)` — `#4f4f4f`, supporting text.
- `text-(--color-text-tertiary)` — `#a1a1a1`, metadata, placeholders.

**Surfaces.** `bg-(--color-background)` (white) by default. `bg-(--color-surface-muted)` for nested cards. `bg-(--color-surface-sunken)` for inset wells.

**Borders — always alpha-blended, never flat neutrals.** `border-(--color-border)` (`rgba(20,20,20,0.08)`) for default 1px hairlines, `border-(--color-border-strong)` (`0.16`) when the line gets visually lost (secondary buttons, focus rings), `border-(--color-border-subtle)` (`0.04`) for floating cards / popovers / modals. Solid greys look pasted-on the moment a surface sits over content; opacity blends with whatever is behind. (System is white-only — opacity strokes would vanish on dark surfaces.)

**Accent.** Use `bg-accent-500` for one primary action per view. Hover `bg-accent-600`, active `bg-accent-700`.

**Never use pure grey text on a colored background.** Pick a tinted neutral closer to the background hue.

## Radius — 8 → 40px

`rounded-sm` 8 · `rounded-md` 12 · `rounded-lg` 16 · `rounded-xl` 24 · `rounded-2xl` 32 · `rounded-3xl` 40 · `rounded-full` for pills/avatars.

Pick one direction per surface. Don't mix sharp cards with pill buttons.

## Icons — 20px / 1.5 stroke / 32px touch target

Wrap any SVG in `<span class="icon">…</span>`. The wrapper enforces a 32×32 bounding box (touch target); the SVG inside renders at 20×20 with `stroke-width: 1.5`.

When an icon next to text feels too heavy, reduce **its color contrast** (e.g. `text-(--color-text-secondary)`), not its size.

## Actions

- **Primary** — `bg-accent-500 text-(--color-text-on-accent) font-semibold rounded-md`. One per view.
- **Secondary** — `border border-(--color-border-strong) text-(--color-text-primary) rounded-md`. Outline uses the alpha-blended stroke, never a flat neutral.
- **Tertiary** — styled as a link: `text-accent-600 underline-offset-2 hover:underline`.
- **Destructive** — secondary styling by default. Promote to bold red **only at the confirmation step**.

Button height should follow the 4px rule (`h-8` 32, `h-10` 40, `h-12` 48). Padding scales non-linearly: small buttons get tighter padding, large buttons get more generous padding than a linear scale would suggest.

## Layout principles

- Start with more whitespace than you think you need; reduce until it clicks.
- No two spacing values within ~25% of each other in the same view.
- Cap content with `max-w-(--container-content)` (768) or `max-w-(--container-wide)` (1024). Only shrink below when the viewport forces it.
- When a single column feels cramped, **split into columns before shrinking type**.
- On small screens, flatten the size hierarchy — large things shrink faster than small things.

## Where things live

- Tokens: `app/globals.css` (`@theme` block).
- Geist fonts: `app/layout.tsx` (already wired via `next/font/google`).
- Body defaults (font, color, background): bottom of `app/globals.css`.
