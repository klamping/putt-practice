import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 15000, fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 390, height: 844 }, timezoneId: 'America/Los_Angeles', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
});
