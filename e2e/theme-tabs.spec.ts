import { test, expect } from '@playwright/test';

const tabs = [
  'DASHBOARD',
  'TEST GEN',
  'EXAM GEN',
  'HOMEWORK GEN',
  'LESSON GEN',
  'SLIDES GEN',
  'MY CONTENT',
  'SETTINGS',
];

test('light and dark theme toggle works on every main tab', async ({ page }) => {
  await page.goto('/');

  for (const tab of tabs) {
    await page.getByRole('button', { name: new RegExp(`^${tab}$`, 'i') }).click();

    const themeToggle = page.getByRole('button', { name: /Switch to (dark|light) theme/i }).first();
    const before = await page.locator('html').getAttribute('data-theme');
    await themeToggle.click();
    const after = await page.locator('html').getAttribute('data-theme');

    expect(after, `${tab} should change the document theme`).not.toBe(before);
    expect(after).toMatch(/^(light|dark)$/);

    await page.getByRole('button', { name: /Switch to (dark|light) theme/i }).first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', before || 'light');
  }
});
