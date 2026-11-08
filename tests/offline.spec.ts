import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { AddressInfo } from 'node:net';

let server: Server;
let origin: string;
let revision = 1;
let failPrecache = false;
let stylesheetRequests = 0;
let redirectIndex = false;

test.beforeAll(async () => {
  server = createServer(async (request, response) => {
    const path = new URL(request.url!, 'http://localhost').pathname;
    if (redirectIndex && path === '/index.html') {
      response.writeHead(301, { Location: '/' }); response.end(); return;
    }
    if (path.endsWith('.css') && ++stylesheetRequests > 1 && failPrecache) {
      response.writeHead(503); response.end(); return;
    }
    try {
      const file = path === '/' ? 'index.html' : path.slice(1);
      const content = await readFile(resolve('dist', file));
      response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
      response.setHeader('Cache-Control', 'no-store');
      response.end(file === 'sw.js' ? `${content.toString()}\n// revision ${revision}` : content);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
test.afterAll(async () => { await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done())); });
test.beforeEach(() => { failPrecache = false; stylesheetRequests = 0; redirectIndex = false; });

test('reopens offline, resumes practice, and uses history and backups without networking', async ({ page, context }) => {
  await page.goto(origin);
  await expect(page.getByText('Ready offline', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await page.getByRole('button', { name: '2 misses', exact: true }).click();
  await context.setOffline(true);
  await page.close();
  const offline = await context.newPage();
  await offline.goto(`${origin}/?offline=1`);
  await expect(offline.getByText('Ready offline', { exact: true })).toBeVisible();
  await expect(offline.getByText('8 / 72 putts')).toBeVisible();
  await offline.getByRole('button', { name: '2 misses', exact: true }).click();
  await offline.reload();
  await expect(offline.getByText('16 / 72 putts')).toBeVisible();
  for (let n = 0; n < 7; n++) await offline.getByRole('button', { name: '2 misses', exact: true }).click();
  await expect(offline.getByText('54 / 72 made')).toBeVisible();
  await offline.getByRole('button', { name: 'History', exact: true }).click();
  await expect(offline.getByText('1 session', { exact: true })).toBeVisible();
  await offline.getByRole('button', { name: 'Backup', exact: true }).click();
  const download = offline.waitForEvent('download'); await offline.getByRole('button', { name: 'Export backup', exact: true }).click();
  const backup = await readFile((await (await download).path())!, 'utf8');
  expect(JSON.parse(backup).sessions[0].misses).toEqual([2,2,2,2,2,2,2,2,2]);
  await offline.evaluate(() => localStorage.clear()); await offline.reload();
  await offline.getByRole('button', { name: 'Backup', exact: true }).click();
  await offline.getByLabel('Restore backup file').setInputFiles({ name: 'practice.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
  await offline.getByRole('button', { name: 'Replace data and restore' }).click();
  await offline.getByRole('button', { name: 'History', exact: true }).click();
  await expect(offline.getByText('1 session', { exact: true })).toBeVisible();
  expect(await offline.locator('body').evaluate(node => getComputedStyle(node).margin)).toBe('0px');
});

test('an available update waits without reloading or interrupting practice', async ({ page }) => {
  await page.goto(origin);
  await expect(page.getByText('Ready offline', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await page.getByRole('button', { name: '1 misses', exact: true }).click();
  await page.evaluate(() => { (window as any).sessionMarker = 'still-open'; });
  revision++;
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
  await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting)).toBe(true);
  expect(await page.evaluate(() => (window as any).sessionMarker)).toBe('still-open');
  await expect(page.getByText('8 / 72 putts')).toBeVisible();
  await page.getByRole('button', { name: '1 misses', exact: true }).click();
  await expect(page.getByText('16 / 72 putts')).toBeVisible();
});

test('does not claim offline readiness when an asset fails to cache, and retries on reload', async ({ page }) => {
  failPrecache = true;
  await page.goto(origin);
  await expect(page.getByText('Offline setup failed', { exact: true })).toBeVisible();
  await expect(page.getByText('Ready offline', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await page.getByRole('button', { name: '3 misses', exact: true }).click();
  failPrecache = false;
  await page.reload();
  await expect(page.getByText('Ready offline', { exact: true })).toBeVisible();
  await expect(page.getByText('8 / 72 putts')).toBeVisible();
});

test('reopens offline when the host redirects index.html to the root', async ({ page, context }) => {
  redirectIndex = true;
  await page.goto(origin);
  await expect(page.getByText('Ready offline', { exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Start session', exact: true })).toBeVisible();
});
