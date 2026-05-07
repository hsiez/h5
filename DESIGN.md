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

## Primitives — checklist

Primitives live in `app/_components/`, one file per primitive.

### Structural rules

- **Semantic root.** `<button>` for buttons, `<a>` for links, real heading levels. Never `<div onClick>`.
- **`className` passthrough.** Merge via `cn()` so callers can extend without overriding intent.
- **Spread `...props`** to the root element so native attributes (`aria-*`, `data-*`, `onClick`) just work.
- **No layout opinions on the outside.** Primitives don't set `margin`, `position`, or `width: 100%`. Parent decides placement.
- **Add `forwardRef` only when a consumer actually needs the ref** (focus management, form libraries, measurement). Don't sprinkle it preemptively.

### Variant pattern — lookup objects (no library)

```tsx
const base = "inline-flex items-center justify-center font-medium";

const intents = {
  primary:   "bg-accent-500 text-text-on-accent hover:bg-accent-600",
  secondary: "border border-[--color-border-strong] text-text-primary hover:bg-surface-muted",
  ghost:     "text-text-primary hover:bg-surface-muted",
};

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-base",
  lg: "h-12 px-6 text-base",
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  intent?: keyof typeof intents;
  size?: keyof typeof sizes;
};

export function Button({ intent = "primary", size = "md", className, ...props }: Props) {
  return <button className={cn(base, intents[intent], sizes[size], className)} {...props} />;
}
```

Each axis of variation is a plain object. `keyof typeof` gives autocomplete. Defaults live on the destructured props. No library needed — swap to CVA the day you need compound variants.

### Styling rules

- **Tokens only.** No raw hex, no arbitrary px outside the 4px scale, no magic radii. If you reach for `[#hexvalue]` or `p-[7px]`, the token system is missing something — fix `globals.css`, not the component.
- **Borders always alpha-blended.** Use `--color-border`, `--color-border-strong`, or `--color-border-subtle`. Never solid grey.

### Accessibility rules

- **Focus-visible** styled explicitly using `--color-border-strong` or `--color-accent-500` ring. Never rely on the browser default.
- **`prefers-reduced-motion`** respected on any animation longer than a hover color change.
- **Touch target ≥ 32px** for anything interactive (matches `--icon-bound`).
- **Disabled** state must be visually distinct *and* set `aria-disabled` or native `disabled`. No click handler fires when disabled.
- **Loading** state (where relevant) blocks interaction and announces via `aria-busy`.
- **Controlled + uncontrolled** for stateful primitives (e.g. audio player). Accept `value`/`defaultValue` + `onChange`. Don't force one mode.
- **Keyboard parity.** Anything you can do with a mouse must work with the keyboard. Tab to reach, Space/Enter to activate, Esc to dismiss.

### Reusing styles without a component

Export the variant lookup so callers can apply styles to any element:

```tsx
// A Next.js Link that looks like a primary button
<Link href="/papers/foo" className={cn(base, intents.primary, sizes.md)}>
  Read paper
</Link>
```

When a component and a bare style application are both common, export both the component and the lookup objects.

## Where things live

- Tokens: `app/globals.css` (`@theme` block).
- Geist fonts: `app/layout.tsx` (already wired via `next/font/google`).
- Body defaults (font, color, background): bottom of `app/globals.css`.
- Primitives: `app/_components/`, one file per component.
