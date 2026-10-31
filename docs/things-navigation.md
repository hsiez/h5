# Things navigation and image motion

## Ownership

The Next router owns location and browser history. `/things` is world,
`/things?region=edc` is a region grid, and `/things/item/wallet` is an item.
Clicking a region or item pushes one route. Browser Back/Forward traverses those
entries without an application popstate interceptor. A direct item URL does not
invent a previous region entry. Legacy `?region=…&item=…` links redirect to the
item route.

`LoadoutWorld` derives its mode from the server page's initial selection. Item
pages render only the selected item, rather than transforming the region into
a scrollable column. Mobile and desktop share this navigation behavior; CSS
controls their different layouts.

## Animation lifecycle

`ThingsMotion` is a persistent provider in the Things layout. Each rendered view
registers its image positions with `useThingsMotion`. The provider remembers the
last visible image rectangles and sources. World previews also register the same catalog slugs, so world/region navigation
uses this controller too. The visible shared images move together (four on mobile, six on desktop); unrelated
previews fade in place. No new alpha scans or image requests are introduced by
the animation. On a world/region or grid/item route change:

1. Cancel obsolete animations and restore any hidden destination image.
2. Match the selected image by its stable catalog slug.
3. Place a temporary, noninteractive image over the destination and animate its
   translation and scale from the outgoing rectangle to the incoming rectangle.
4. Hide the destination image while the temporary image moves, then restore it.
5. Fade peripheral images in place. They never fly into a column.

The animation does not push, replace, or delay history. Navigating away during
motion cancels it. Reduced motion bypasses image movement. Refresh/direct entry
has no outgoing image and therefore no fabricated transition.

Snapshots are updated while a route is active, not just on unmount: incoming
layout effects can run before outgoing cleanup. Replaying an effect for the
same route must not cancel its existing animation. This matters in development
Strict Mode, which replays effects and previously canceled the animation
immediately after starting it.

## Dials

`app/globals.css` defines the durations consumed by the motion controller:

- `--motion-things-focus-duration`: 620ms.
- `--motion-things-grid-duration`: 400ms. The 10-second diagnostic was confirmed on an iPhone
  and then removed.
- `--motion-things-fade-duration`: 180ms.
- `--motion-things-focus-easing`: cubic-bezier(.2, .72, .16, 1).

The layout retains a React ViewTransition wrapper scoped only to explicit
`claim-forward` and `claim-back` types, with default motion disabled. It preserves
the existing claim-screen slide without owning grid/item movement.

There are no Things view-transition pseudo-element classes competing with this
controller. Duration parsing accepts milliseconds and seconds: production CSS optimization
can rewrite `620ms` as `0.62s`. Treating both as raw numbers makes production
animation 1000 times too fast. The component measures
rendered geometry, so responsive layout does not need a second motion system.

## Removed paths

Removed native history mutation, popstate interception/replay, grid-to-column
translation, density/pinch navigation flags, and the unused Things React/native
view-transition styling. These paths previously competed over the displayed
mode and animation lifetime.

## Verification

Run `node scripts/tests/things-navigation.mjs` against the local server. It uses
Chrome at desktop and mobile widths and observes actual running image
animations, not merely CSS declarations. It checks the history sequence,
repeated Back/Forward, leaving mid-animation, and reduced motion.

Chrome and WebKit runtime checks pass at 390px and 1440px, including three additional
Back/Forward cycles and leaving during animation.
`node scripts/tests/things-geometry.mjs` checks the overlay destination against
the rendered image (within 1px) at 390px, 900px, and 1440px, and ensures refresh
does not animate stale geometry. These checks pass in development and in an optimized production build.
For production verification, run `npm run build`, start it on another port, and
set `THINGS_TEST_URL=http://localhost:3100` before either test command. Real iOS edge-swipe uses browser-owned interactive behavior and needs
physical-device verification; desktop mobile emulation is not evidence of that.

`THINGS_BROWSER=webkit` selects WebKit instead of Chrome for the test scripts.
`things-layout-audit.mjs` additionally covers hat, coat, wallet, and the storefront
work jacket, including initial text-column position, scrolling before Back,
completion, and restoration of the real image. All pass at 390px and 1440px.

The focus layout now has one wide branch (`min-width: 1101px`) and one narrow
branch (`max-width: 1100px`). Removed 760px/960px legacy overrides and merged
the later fixed-to-relative correction into the wide branch itself. Title and
review share the same horizontal calculation from their first render.

## Second-row landing stability

Grid items must not use `content-visibility: auto` with an estimated intrinsic
height: the first row can initially occupy the estimate, then grow after motion
has measured the second row. Grid geometry is now laid out before measurement.
Next can also restore scroll after layout effects, so the motion controller
tracks the live destination during its existing animation and updates the
landing keyframes without restarting its clock. Tracking ends on completion or
cancellation. `things-grid-return.mjs` checks this on the storefront second row.

`things-world-motion.mjs` checks all visible shared images on world/region entry
and return for EDC and Things for you at mobile and desktop widths.

## Mobile overview and drawing timing

At widths up to 700px, world previews show a 2×2 subset and region grids use
two columns. Wider screens retain 3×2 previews and three-column region grids.
During world-to-region entrance, every item remains stippled, including items
that were absent from the preview. All reveal color after movement completes.
Region-to-world uses the destination drawing immediately.

## Development-session limitation

A reported desktop URL/view mismatch coincided with Next Fast Refresh throwing
“Router action dispatched before initialization.” Rapid-history and delayed
response tests did not reproduce it in fresh sessions. Restarting with a fresh
dev cache recovered testing; the underlying HMR trigger remains unconfirmed.
Do not treat preload/LCP warnings as evidence of animation cancellation failure.
