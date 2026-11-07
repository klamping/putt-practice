import { test, expect, type Page } from '@playwright/test';
async function miss(page: Page, n: number) { await page.getByRole('button', { name: `${n} misses`, exact: true }).click(); }
test('records 72 putts, resumes, undoes, and retains read-only history', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  for (let n = 0; n <= 8; n++) await expect(page.getByRole('button', { name: `${n} misses`, exact: true })).toBeVisible();
  await miss(page, 0); await miss(page, 1); await page.reload();
  await expect(page.getByText('Batch 3 of 3', { exact: false })).toBeVisible();
  await miss(page, 1);
  await expect(page.getByRole('heading', { name: '25 ft', exact: true })).toBeVisible();
  for (const n of [2, 3, 3]) await miss(page, n);
  await expect(page.getByRole('heading', { name: '30 ft', exact: true })).toBeVisible();
  for (const n of [4, 4, 4]) await miss(page, n);
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible();
  for (const [ft, made, pct] of [[20, 22, 92], [25, 16, 67], [30, 12, 50]]) {
    const row = page.getByRole('row').filter({ hasText: `${ft} ft` });
    await expect(row).toContainText(`${made} / 24`); await expect(row).toContainText(`${pct}%`);
  }
  await expect(page.getByText('69%', { exact: true })).toBeVisible();
  await expect(page.getByText('50 / 72 made')).toBeVisible();
  await page.getByRole('button', { name: 'Undo last batch' }).click();
  await expect(page.getByRole('heading', { name: '30 ft', exact: true })).toBeVisible();
  await miss(page, 4);
  await page.getByRole('button', { name: 'New session' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByText('1 session', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /View session/ }).click();
  await expect(page.getByRole('button', { name: 'Undo last batch' })).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('putt-practice:v1')!));
  expect(stored.sessions).toHaveLength(2);
  expect(stored.sessions.filter((s: { misses: number[] }) => s.misses.length < 9)).toHaveLength(1);
});
test('retains unsaved progress and retries writes', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await page.evaluate(() => { (window as any).originalSet = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('Quota'); }; });
  await miss(page, 2);
  await expect(page.getByRole('alert')).toContainText('not saved');
  await expect(page.getByText('8 / 72 putts')).toBeVisible();
  await page.evaluate(() => { Storage.prototype.setItem = (window as any).originalSet; });
  await page.getByRole('button', { name: 'Retry save' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.reload(); await expect(page.getByText('8 / 72 putts')).toBeVisible();
});
test('shows local dates and fits small screens with reachable buttons', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('putt-practice:v1', JSON.stringify({ version: 1, sessions: [{ id: 'past', startedAt: '2026-11-08T01:00:00.000Z', misses: [0,0,0,0,0,0,0,0,0] }] })));
  await page.reload(); await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByRole('button', { name: /View session/ })).toContainText('Nov 7, 2026');
  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const box = await page.getByRole('button', { name: '0 misses', exact: true }).boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(48); expect(box!.height).toBeGreaterThanOrEqual(48);
  await page.getByRole('button', { name: '0 misses', exact: true }).focus();
  await page.keyboard.press('Enter'); await expect(page.getByText('8 / 72 putts')).toBeVisible();
});
