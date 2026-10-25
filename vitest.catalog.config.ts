import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},test:{include:['tests/catalog-admin.test.ts','tests/storefront-flow.test.ts','tests/storefront-webhook.test.ts'],testTimeout:30000,hookTimeout:30000}});
