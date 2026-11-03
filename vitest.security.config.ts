import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},test:{include:['tests/security/storefront-adversarial.test.ts'],testTimeout:15000,hookTimeout:15000,fileParallelism:false}});
