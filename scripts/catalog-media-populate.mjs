// Stable paths are portable; existence is checked against the configured store,
// never inferred from a manifest produced against another environment.
export async function populateCatalogMedia(manifest, { head, put, readSource, isNotFound }) {
  for (const [source, mediaUrl] of Object.entries(manifest)) {
    const pathname = new URL(mediaUrl, 'http://catalog.local').searchParams.get('pathname');
    if (!pathname) throw new Error(`Missing Blob pathname for ${source}`);
    try {
      await head(pathname);
      continue;
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
    const filename = source.split('/').at(-1);
    const extension = filename.split('.').at(-1).toLowerCase();
    const contentType = ['jpg', 'jpeg'].includes(extension) ? 'image/jpeg' : `image/${extension}`;
    await put(pathname, await readSource(filename), {
      access: 'private', addRandomSuffix: false, contentType,
    });
  }
}
