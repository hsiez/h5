# Catalog admin

The admin panel lives at `/admin`. Items share one editor and one database record whether they belong to a review region or a storefront region. “Things for you” is a region in `/things`, selected with `?region=things-for-you`.

## Enable it

1. Use the database configured for the target environment. Apply the schema and import the existing six reviews:

   ```sh
   node --env-file=.env.local scripts/storefront-migrate.mjs
   ```

   This also preserves existing storefront items, requests, and handoffs. Re-running it does not overwrite edited reviews or region settings. Back up the database before a production migration.

   Run `node --env-file=.env.local scripts/catalog-media-migrate.mjs` against every target Blob store before serving the catalog, including a fresh preview or production store. It checks each manifest pathname in that store, uploads missing originals from `db/assets/catalog`, then updates legacy database references. The manifest defines stable paths, not migration completion: reruns check the target store again and reuse existing files. Authorization or network errors stop the migration before database changes. The retained source files are migration inputs only; site images are served through Blob.

2. Generate a password hash interactively:

   ```sh
   node scripts/admin-password.mjs
   ```

   Save the printed value as `ADMIN_PASSWORD_HASH` in `.env.local` and as a secret in the appropriate Vercel environments. Use the original password to sign in. Restart local development / redeploy after changing environment variables. Changing the hash invalidates existing sessions.

3. Keep `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` configured. The existing Cal, Resend, storefront-link, and cron variables remain necessary for adoption workflows. `CRON_SECRET` is no longer an admin login credential.

4. Open `/admin`. Sign-in lasts 12 hours. Production cookies are Secure, HttpOnly, and SameSite Strict. Mutations require the same origin and a valid session; repeated password guesses are rate limited.

## Editing

- **Items:** create a draft, choose a region, upload/reorder photos, enter size/condition/measurements, and write the review. Uploads accept JPEG, PNG, or WebP. The browser resizes each image to at most 2400 pixels and an 8 MB upload; images over 40 megapixels are rejected before conversion. The browser normalizes orientation, removes metadata, centers the visible item in a 2160 × 2400 transparent frame, and avoids enlarging sources that lack enough detail. It then sends the image directly to the existing private Vercel Blob store with a short-lived upload token. The app server only issues the token. Published photos are served through a constrained image route because private Blob URLs cannot be opened by visitors.
- **Review references:** add image/location references and place their `[[refN]]` markers in the relevant text. Existing inline entities are retained.
- **Save draft:** does not change the published item. **Preview** opens saved drafts privately using the real world layout; adoption submissions are simulated.
- **Publish:** updates the public item. A published region and at least one photo are required. Existing item URLs remain stable.
- **Regions:** add, rename, order, publish, or archive. Choose review or storefront behavior. Move items out before changing a region's type.
- **Requests:** review incoming Cal requests, accept/decline them, and complete a handoff with a photo, permission, owner's name, and coffee story. Notification subscriptions are shown as a count, not a waiting-order promise.
- **Operations:** existing paper generation controls remain available behind the same login.

Publication and availability are separate. Saving or publishing does not reset pending/reserved/claimed status. Resolve active bookings before moving or archiving an item or hiding its region. Moving an item preserves its ID, photos, review, and request history.

New photos use unguessable paths in the private Blob store and can be viewed through the image route, even before publishing the item. Removing a photo from an item does not delete the Blob, since it may also be used by an inline reference. Unused asset cleanup is a later task.

## Verification

```sh
node --env-file=.env.local scripts/catalog-test.mjs
npx tsc --noEmit
npm run build
```

The integration runner creates a random temporary schema, migrates/seeds it, runs catalog/auth and storefront webhook/flow tests, and drops the schema afterward. It prefers `TEST_DATABASE_URL`, then `DATABASE_URL_UNPOOLED`, then `DATABASE_URL`. Neon pooled URLs are converted to the corresponding direct connection for schema isolation. It does not modify live catalog rows.
