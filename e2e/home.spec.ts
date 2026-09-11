import { test, expect } from '@playwright/test';

test('the explanatory home page is readable without an account', async ({ page }) => {
  await page.goto('/pl');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('the language switch reaches the English home page', async ({ page }) => {
  await page.goto('/pl');
  await page.getByRole('link', { name: /EN/ }).click();
  await expect(page).toHaveURL(/\/en$/);
});
