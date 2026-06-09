import { expect, test } from '@playwright/test';

const isLandingOnly = process.env.VITE_LANDING_ONLY === 'true';

test('marketing home renders', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Awards/i);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  if (isLandingOnly) {
    await expect(page.getByRole('link', { name: 'View on GitHub' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get Started' })).toHaveCount(0);
  } else {
    await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
  }
});

test('dashboard route is blocked in landing-only mode', async ({ page }) => {
  test.skip(!isLandingOnly, 'Only applies when VITE_LANDING_ONLY=true');
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/');
});

test('public demo loads without login redirect', async ({ page }) => {
  test.skip(isLandingOnly, 'Demo is disabled in landing-only mode');
  await page.goto('/demo?autoplay=1');
  await expect(page).toHaveURL(/\/demo/);
  await expect(page.getByText('Live Demo')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Innovation Awards 2026')).toBeVisible();
});

test('exit demo returns to home', async ({ page }) => {
  test.skip(isLandingOnly, 'Demo is disabled in landing-only mode');
  await page.goto('/demo?autoplay=1');
  await expect(page.getByRole('button', { name: 'Exit live demo' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Exit live demo' }).click();
  await expect(page).toHaveURL('/');
});
