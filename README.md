This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Things navigation

See [Things navigation and image motion](docs/things-navigation.md) for route ownership, history behavior, animation lifecycle, responsive layout, and verification commands.

## World-view image preparation

The `/things` world view displays small stippled previews of published items. Every image sits in a fixed tile, but the visible object does not necessarily fill its image file: a jacket might occupy most of the canvas while a wallet has broad transparent margins. Equal CSS image sizes would therefore make the objects look unequal in size or misaligned. The layout uses the object's visible bounds to choose a scale and align it across the world, region, and focused views. It measures the first **original photo**, so the presentation remains stable while the gallery changes photos and when the stippled preview gives way to the color photo. File width and height alone cannot tell us where the nontransparent pixels are.

Older Everyday carry items have hand-recorded alignment values. For other catalog photos, the browser previously had to download and decode each full-size original photo, scan its alpha channel, and then reveal the small preview. That made Things for you tiles appear one by one even though their previews were small. We now do that scan during image preparation and save the results; the page only has to read four numbers per photo. This removes the full-photo measurement from the world view's critical loading path.

Run this after publishing an item or replacing its first photo or stippled image:

```bash
node --env-file=.env.local scripts/generate-world-thumbnails.mjs
```

The script reads the published catalog and private Blob images using `DATABASE_URL_UNPOOLED` (or `DATABASE_URL`) and `BLOB_READ_WRITE_TOKEN`. It does **not** change the database or Blob storage. Commit its generated files with the related catalog change:

- `app/loadout/world-photo-bounds.json` maps each first photo's URL to `left`, `top`, `width`, and `height`, measured as percentages of the source image. The bounds come from pixels whose alpha is at least 16 after sampling the image at up to 256 pixels on its longest side.
- `app/loadout/world-thumbnails.json` maps full stippled image URLs to the smaller local previews generated in `public/loadout/world-thumbnails/`.

`LoadoutWorld` imports the bounds and thumbnails. It uses the bounds to position each item at any viewport size and shows the small preview without waiting for the full photo. When an image has no saved bounds, the browser falls back to measuring it after it loads; that item may appear later. The full stippled images are preloaded at low priority after the initial world-view paint for the region transition. This removes a loading dependency, but any LCP improvement should be checked with a cold-load performance recording.
