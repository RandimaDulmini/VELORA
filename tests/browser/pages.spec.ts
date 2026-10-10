import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';

const products = JSON.parse(readFileSync('src/data/products.json', 'utf8')) as {
  slug: string;
  name: string;
}[];

async function checkPage(page: Page, route: string, testInfo: TestInfo, screenshot = false) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto(route);
  expect(response?.status(), `HTTP status for ${route}`).toBe(200);
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();

  // A full-page screenshot otherwise captures blank off-screen lazy-loaded images.
  await page.locator('img').evaluateAll(async (images) => {
    const photos = images as HTMLImageElement[];
    photos.forEach((image) => {
      image.loading = 'eager';
    });
    await Promise.all(photos.map((image) => image.decode()));
  });
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    `Horizontal overflow on ${route}`,
  ).toBeTruthy();
  expect(errors, `Browser errors on ${route}`).toEqual([]);

  if (screenshot) {
    const path = testInfo.outputPath('full-page.png');
    await page.screenshot({ path, fullPage: true, scale: 'css' });
    await testInfo.attach('Full page', { path, contentType: 'image/png' });
  }
}

for (const route of [
  '/',
  '/shop',
  '/wishlist',
  '/bag',
  '/auth',
  '/auth?mode=forgot',
  '/info/delivery',
  '/info/size-guide',
  '/info/contact',
  '/info/privacy',
  '/info/terms',
]) {
  test(`full page: ${route}`, async ({ page }, testInfo) => {
    await checkPage(page, route, testInfo, true);
  });
}

for (const category of ['new', 'women', 'men', 'teen', 'kids', 'accessories', 'sale']) {
  test(`category page: ${category}`, async ({ page }, testInfo) => {
    await checkPage(page, `/shop?category=${category}`, testInfo);
    await expect(page.locator('.catalogue-count')).not.toHaveText('0 products');
    await expect(page.locator('.product-card').first()).toBeVisible();
  });
}

for (const product of products) {
  test(`product page: ${product.slug}`, async ({ page }, testInfo) => {
    await checkPage(
      page,
      `/product/${product.slug}`,
      testInfo,
      product.slug === 'rose-satin-wrap-dress',
    );
    await expect(
      page.getByRole('heading', { name: product.name, exact: true, level: 1 }),
    ).toBeVisible();
  });
}

test('account, checkout and every admin page require sign-in', async ({ page }) => {
  const orderId = '20000000-0000-4000-8000-000000000001';
  for (const route of [
    '/account',
    `/account/orders/${orderId}`,
    '/checkout',
    '/admin',
    '/admin/products',
    '/admin/products/new',
    '/admin/products/00000000-0000-4000-8000-000000000001',
    '/admin/orders',
    `/admin/orders/${orderId}`,
    '/admin/team',
    '/admin/settings',
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/auth(?:\?|$)/);
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  }
});

test('unknown pages and products return a helpful 404', async ({ page }) => {
  for (const route of ['/page-that-does-not-exist', '/product/product-that-does-not-exist']) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'This piece is out of sight.' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Explore the collection', exact: true }),
    ).toBeVisible();
  }
});
