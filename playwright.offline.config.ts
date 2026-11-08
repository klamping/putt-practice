import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/offline.spec.ts', timeout: 30000,
  use: { viewport: { width: 390, height: 844 }, trace: 'retain-on-failure' },
});
