import { test, expect } from '@playwright/test';

test('confirms each entry immediately, including repeated values and the final batch', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  const enter = () => page.getByRole('button', { name: '6 makes', exact: true }).click();
  await enter();
  await expect(page.getByText('✓ 6/8 made', { exact: true })).toBeVisible();
  await expect(page.getByText('Batch 2 of 3 · 8 putts')).toBeVisible();
  await enter();
  await expect(page.getByText('✓ 6/8 made', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Batch 3 of 3 · 8 putts')).toBeVisible();
  await expect(page.getByText('✓ 6/8 made', { exact: true })).toHaveCount(0, { timeout: 3000 });
  for (let i = 0; i < 7; i++) await enter();
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible();
  await expect(page.getByText('✓ 6/8 made', { exact: true })).toBeVisible();
  await expect(page.getByText('54 / 72 made')).toBeVisible();
  await expect(page.getByText('✓ 6/8 made', { exact: true })).toHaveCount(0, { timeout: 3000 });
});
