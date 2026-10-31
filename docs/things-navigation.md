# Things navigation and page appearance

## Ownership

The Next router owns location and browser history. `/things` is world,
`/things?region=edc` is a region grid, and `/things/wallet` is an item.
Selecting a region or opening focus pushes a route. Focus opens one history entry; there are no Previous/Next item controls. Browser Back/Forward traverses those
entries without an application popstate interceptor. Direct item URLs do not
invent a previous region entry. Legacy `?region=…&item=…` links redirect to the
item route.

`LoadoutWorld` derives its view from the server page's initial selection. Item
pages render only the selected item. Mobile and desktop share this navigation
behavior; CSS controls their different layouts.

## Retained region on item navigation

Client navigation to `/things/[slug]` uses the `@item/(.)[slug]`
intercepting route. The children slot retains the real region DOM, image elements,
and scroll position; a fixed, independently scrollable item layer covers it.
The background is inert and document scrolling is locked for the layer's lifetime.
Cleanup restores those settings and keyboard focus. Gallery and Escape return
through normal router history when a region is retained. A direct item visit
(or exploration begun from one) uses an explicit collection link instead. There is no exit delay: removing the layer reveals the
already-rendered grid immediately.

The slot has empty root, default, and catch-all pages so navigation to world,
region, or claim cannot leave an old item layer visible. Direct item links and
refresh use the ordinary standalone item route. The item view is shared between
both routes. Native iPhone swipe compositing still needs real-device validation.

`node scripts/tests/things-retained-region.mjs` verifies DOM/image identity,
scroll preservation, Back/Forward, and standalone refresh for EDC and storefront
items at mobile and desktop widths.

## Item identity and focus sessions

Existing catalog slugs identify items at `/things/<slug>`. The catalog supplies
content, collection membership, and sort order. `/things/item/...` routes were
removed outright. Claim routes remain `/things/claim/<slug>`.

The bottom navigation row exposes Back to gallery and, on mobile for available
storefront items, Claim. Back reuses the sign-up page's raised frame styling.
The row is portaled into the item layer's footer target (or the document body on
a standalone item page), and follows dynamic viewport height with safe-area
padding. Previous/Next item controls were removed. `things-focus-session.mjs`
verifies collection return, Forward, refresh, direct entry, and removed old paths.

## Page fade

Item pages and world/region headings use a **250ms ease-out opacity fade**,
defined on `.page` in `app/loadout/loadout.module.css`. There is no exit delay,
translation, scale, or image overlay. Grid containers remain fully opaque so returning
to a region does not make all its images blink. Reduced-motion preferences disable the
fade. Removing a page also removes its CSS animation; there are no animation
completion callbacks that can navigate or restore obsolete content.

The shared-image controller and the temporary `?motion=on/off` experiment have
been removed after real-device comparison favored the immediate navigation.
There are no shared-image geometry observers, tracking frames, history listeners,
or hidden-image overrides. Old motion query parameters and session-storage
preferences have no effect.

The Things layout retains the separate React ViewTransition wrapper for explicit
`claim-forward` and `claim-back` types. Its default is none; it does not animate
world/region/item navigation.

## Responsive layout

Up to 700px, world previews show a 2×2 subset and region grids use two columns.
Wider screens use 3×2 previews and three-column region grids. World shows drawings;
region shows color images directly. The focus layout has one wide branch from
1101px and one narrow branch through 1100px. Title and review share the same
horizontal calculation from first render.

## Verification

Build with `npm run build` and start a production server on a separate port.
Set `THINGS_TEST_URL=http://localhost:3130` for these scripts:

- `node scripts/tests/things-navigation.mjs`: world/region/item history,
  Back/Forward, actual incoming fade timing, and reduced motion at mobile and
  desktop widths.
- `node scripts/tests/things-mobile-interruption.mjs`: delayed route responses,
  repeated product selection/Back, competing selections, and interrupted return
  through region to world. History events are printed on failure.
- `node scripts/tests/things-layout-audit.mjs`: initial review-column alignment,
  scrolled return, and visible images on mobile and desktop.

Use `THINGS_BROWSER=webkit` to select WebKit instead of Chrome. Desktop mobile
emulation does not reproduce iPhone's interactive edge-swipe. Physical-device
verification remains necessary; passing automated history tests does not prove
that the reported missing-region history issue is resolved.

A previous development URL/view mismatch coincided with Next Fast Refresh's
“Router action dispatched before initialization.” Its underlying trigger remains
unconfirmed. Use the production build for phone comparisons to exclude HMR.
