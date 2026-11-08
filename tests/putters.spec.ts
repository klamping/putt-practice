import { test, expect } from '@playwright/test';

test('rejects invalid setup counts without creating a session', async ({ page }) => {
  await page.goto('/');
  for (const value of ['', '0', '1.5', '101']) {
    await page.getByLabel('Number of putters').fill(value);
    await page.getByRole('button', { name: 'Start session', exact: true }).click();
    await expect(page.getByLabel('Number of putters')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('putt-practice:v1') ?? '{"sessions":[]}').sessions)).toHaveLength(0);
  }
});

test('remembers putters and records makes with correct totals after reload and undo', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Number of putters').fill('5');
  await page.getByLabel('Number of putters').press('Tab');
  await page.reload();
  await expect(page.getByLabel('Number of putters')).toHaveValue('5');
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await expect(page.getByRole('button', { name: '6 makes', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '4 makes', exact: true }).click();
  await page.reload();
  await expect(page.getByText('5 / 45 putts')).toBeVisible();
  await expect(page.getByText('Last batch: 4/5 made', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Undo last batch' }).click();
  for (let i = 0; i < 9; i++) await page.getByRole('button', { name: '3 makes', exact: true }).click();
  await expect(page.getByText('27 / 45 made')).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: '20 ft' })).toContainText('9 / 15');
  await page.getByRole('button', { name: 'New session' }).click();
  await expect(page.getByLabel('Number of putters')).toHaveValue('5');
});
