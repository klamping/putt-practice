import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const date = '2026-11-07T12:00:00.000Z';
const fixture = { version: 1, exportedAt: date, sessions: [{ id: 'complete', startedAt: date, misses: [0,1,1,2,3,3,4,4,4] }, { id: 'draft', startedAt: date, misses: [2] }] };
async function backup(page: Page) { await page.getByRole('button', { name: 'Backup', exact: true }).click(); }
async function upload(page: Page, contents: unknown) {
  await page.getByLabel('Restore backup file').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(typeof contents === 'string' ? contents : JSON.stringify(contents)) });
}
async function exported(page: Page, name = 'Export backup') {
  const waiting = page.waitForEvent('download'); await page.getByRole('button', { name, exact: true }).click();
  const file = await waiting; return readFile((await file.path())!, 'utf8');
}
test('previews, cancels, restores and exports complete and draft sessions', async ({ page }) => {
  await page.goto('/'); await backup(page); await upload(page, fixture);
  await expect(page.getByText('1 completed · 1 unfinished', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel restore' }).click();
  expect(await page.evaluate(() => localStorage.getItem('putt-practice:v1'))).toBeNull();
  await upload(page, fixture); await page.getByRole('button', { name: 'Replace data and restore' }).click();
  const saved = JSON.parse(await exported(page));
  expect(saved.sessions).toEqual(fixture.sessions); expect(saved.version).toBe(1); expect(Date.parse(saved.exportedAt)).not.toBeNaN();
  await page.evaluate(() => localStorage.clear()); await page.reload(); await backup(page);
  await upload(page, saved); await page.getByRole('button', { name: 'Replace data and restore' }).click();
  await page.getByRole('button', { name: 'Practice', exact: true }).click(); await expect(page.getByText('8 / 72 putts')).toBeVisible();
});
test('invalid and unsupported backups do not change existing data', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Start session', exact: true }).click();
  const previous = await page.evaluate(() => localStorage.getItem('putt-practice:v1'));
  await backup(page);
  for (const file of ['{broken', { ...fixture, version: 100 }]) {
    await upload(page, file); await expect(page.getByRole('alert')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('putt-practice:v1'))).toBe(previous);
    await expect(page.getByRole('button', { name: 'Replace data and restore' })).toHaveCount(0);
  }
});
test('failed restore preserves memory and stored data; unsaved entries remain exportable', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Start session', exact: true }).click();
  const previous = await page.evaluate(() => localStorage.getItem('putt-practice:v1'));
  await page.evaluate(() => { (window as any).originalSet = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('Quota'); }; });
  await page.getByRole('button', { name: '2 misses', exact: true }).click();
  await backup(page); await upload(page, fixture); await page.getByRole('button', { name: 'Replace data and restore' }).click();
  await expect(page.getByText(/Restore failed/)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('putt-practice:v1'))).toBe(previous);
  const saved = JSON.parse(await exported(page)); expect(saved.sessions).toHaveLength(1); expect(saved.sessions[0].misses).toEqual([2]);
  await page.evaluate(() => { Storage.prototype.setItem = (window as any).originalSet; });
  await page.getByRole('button', { name: 'Replace data and restore' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
test('corrupt data is preserved and downloadable before a confirmed reset', async ({ page }) => {
  await page.goto('/'); await page.evaluate(() => localStorage.setItem('putt-practice:v1', '{broken'));
  await page.reload(); await expect(page.getByRole('alert')).toContainText('could not be read');
  expect(await exported(page, 'Download original data')).toBe('{broken');
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start session', exact: true })).toHaveCount(0);
  page.once('dialog', dialog => dialog.dismiss()); await page.getByRole('button', { name: 'Reset local data' }).click();
  expect(await page.evaluate(() => localStorage.getItem('putt-practice:v1'))).toBe('{broken');
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Reset local data' }).click();
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start session', exact: true })).toBeVisible();
});
test('restores corrupt data safely and treats imported IDs as text', async ({ page }) => {
  await page.goto('/'); await page.evaluate(() => localStorage.setItem('putt-practice:v1', 'invalid')); await page.reload();
  await upload(page, { ...fixture, sessions: [{ ...fixture.sessions[0], id: '<img src=x onerror=alert(1)>' }] });
  let dialogCount = 0; page.on('dialog', async dialog => { dialogCount++; await dialog.dismiss(); });
  await page.getByRole('button', { name: 'Replace data and restore' }).click();
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page.getByRole('button', { name: /View session/ }).click();
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible();
  await expect(page.locator('img')).toHaveCount(0); expect(dialogCount).toBe(0);
  await expect(page.getByRole('button', { name: 'Undo last batch' })).toHaveCount(0);
});
test('storage getter denial still allows practice and backup', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('Denied'); } }));
  await page.goto('/'); await expect(page.getByRole('alert')).toContainText('unavailable');
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await page.getByRole('button', { name: '3 misses', exact: true }).click();
  await backup(page); const data = JSON.parse(await exported(page)); expect(data.sessions[0].misses).toEqual([3]);
});
test('stale restore cannot erase another tab and local progress remains exportable', async ({ page, context }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Start session', exact: true }).click();
  const stale = await context.newPage(); await stale.goto('/');
  await page.getByRole('button', { name: '2 misses', exact: true }).click();
  await stale.getByRole('button', { name: '3 misses', exact: true }).click();
  await backup(stale); await upload(stale, fixture); await stale.getByRole('button', { name: 'Replace data and restore' }).click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('putt-practice:v1')!));
  expect(stored.sessions).toHaveLength(1); expect(stored.sessions[0].misses).toEqual([2]);
  const local = JSON.parse(await exported(stale)); expect(local.sessions[0].misses).toEqual([3]);
});
