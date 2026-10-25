import { test } from 'node:test';
import assert from 'node:assert/strict';
import { populateCatalogMedia } from '../scripts/catalog-media-populate.mjs';
const manifest = { '/loadout/shoe.png': '/api/catalog/media?pathname=catalog%2Fshoe.png' };
test('each target store is populated independently and reruns reuse its assets', async () => {
  for (const store of [new Set(), new Set()]) {
    let uploads = 0;
    const deps = {
      head: async path => { if (!store.has(path)) throw new Error('missing'); },
      isNotFound: error => error.message === 'missing',
      readSource: async name => { assert.equal(name, 'shoe.png'); return Buffer.from('original'); },
      put: async (path, bytes, options) => {
        assert.equal(path, 'catalog/shoe.png');
        assert.equal(bytes.toString(), 'original');
        assert.equal(options.addRandomSuffix, false);
        assert.equal(options.access, 'private');
        store.add(path); uploads++;
      },
    };
    await populateCatalogMedia(manifest, deps);
    await populateCatalogMedia(manifest, deps);
    assert.equal(uploads, 1);
  }
});
test('access failures stop migration instead of being treated as missing assets', async () => {
  await assert.rejects(populateCatalogMedia(manifest, {
    head: async () => { throw new Error('denied'); },
    isNotFound: () => false,
    readSource: () => assert.fail('must not read'),
    put: () => assert.fail('must not upload'),
  }), /denied/);
});
