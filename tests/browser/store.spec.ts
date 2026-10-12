import { test, expect } from '@playwright/test';
test('home renders original branding and working collection links', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Soft colours, made to be worn.' })).toBeVisible();
  await expect(page.getByText('Store preview · Sample catalogue')).toBeVisible();
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: 'Size guide' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'My orders' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Contact us' })).toBeVisible();
  await page.getByRole('link', { name: 'Shop new arrivals' }).click();
  await expect(page).toHaveURL(/shop\?category=new/);
  await expect(page.locator('.product-card').first()).toBeVisible();
  expect(errors).toEqual([]);
});
test('catalogue filters, price sorting and empty state work', async ({ page }) => {
  await page.goto('/shop');
  const search = page.getByRole('textbox', { name: 'Search products' });
  await search.fill('Rose Satin');
  await expect(page.locator('.product-card')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Rose Satin Wrap Dress' })).toBeVisible();
  await search.fill('no-such-piece-123');
  await expect(page.getByText('No pieces match these filters.')).toBeVisible();
  await page.getByRole('button', { name: 'Explore all pieces' }).click();
  await page.getByLabel('Sort products').selectOption('low');
  await expect(page.locator('.product-card').first()).toContainText('Silk Hair Scrunchie Trio');
  await page.getByLabel('Items per page').selectOption('8');
  await expect(page.locator('.product-card')).toHaveCount(8);
  await page.getByRole('textbox', { name: 'Search the store', exact: true }).fill('Rose Satin');
  await page.getByRole('button', { name: 'Submit search' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.product-card')).toHaveCount(1);
  const card = page.locator('.product-card');
  await card.getByRole('button', { name: 'Add to bag' }).click();
  await expect(card.getByRole('alert')).toContainText('Please choose a size first.');
  await card.getByRole('button', { name: 'M', exact: true }).click();
  await card.getByRole('button', { name: 'Add to bag' }).click();
  await page.getByRole('link', { name: 'Shopping bag, 1 items' }).click();
  await expect(page.locator('.bag-row')).toContainText('Rose Satin Wrap Dress');
});
test('choose size, persist bag, adjust quantity and require login for checkout', async ({
  page,
}) => {
  await page.goto('/product/rose-satin-wrap-dress');
  await page.locator('.detail-actions').getByRole('button', { name: 'Add to bag' }).click();
  await expect(page.getByText('Please choose your size first.')).toBeVisible();
  await page.locator('.detail-copy').getByRole('button', { name: 'M', exact: true }).click();
  await page.locator('.detail-actions').getByRole('button', { name: 'Add to bag' }).click();
  await page.getByRole('link', { name: 'View your bag' }).click();
  await expect(page.locator('.bag-row')).toContainText('Rose Satin Wrap Dress');
  await page.reload();
  await expect(page.locator('.bag-row')).toContainText('Size: M');
  await page.getByRole('button', { name: 'Increase quantity of Rose Satin Wrap Dress' }).click();
  await expect(page.locator('.summary-line.total')).toContainText('17,800');
  await expect(page.locator('.summary-line').filter({ hasText: 'Delivery' })).toContainText(
    'Complimentary',
  );
  await page.getByRole('link', { name: 'Proceed to checkout' }).click();
  await expect(page).toHaveURL(/auth\?next=/);
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
});
test('wishlist persists and removal works', async ({ page }) => {
  await page.goto('/product/rose-satin-wrap-dress');
  await page.getByRole('button', { name: 'Save to wishlist' }).click();
  await page.goto('/wishlist');
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.getByRole('button', { name: /Remove Rose Satin Wrap Dress from wishlist/ }).click();
  await expect(page.getByRole('heading', { name: 'Keep your favourites close.' })).toBeVisible();
});
test('admin routes require authentication and preview never fakes sign-in', async ({ page }) => {
  await page.goto('/admin/team');
  await expect(page).toHaveURL(/auth/);
  await page.getByRole('textbox', { name: 'Email address' }).fill('sample@example.com');
  const password = page.getByLabel('Password', { exact: true });
  await password.fill('not-a-real-password');
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(password).toHaveValue('not-a-real-password');
  await page.getByRole('button', { name: 'Hide password' }).click();
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.form-error[role="alert"]')).toContainText('connected to Supabase');
});
test('main pages fit the viewport and photographs load', async ({ page }, info) => {
  for (const route of [
    '/',
    '/shop',
    '/product/rose-satin-wrap-dress',
    '/auth',
    '/bag',
    '/info/delivery',
  ]) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      `Overflow on ${route}`,
    ).toBeTruthy();
    expect(
      await page
        .locator('img')
        .evaluateAll(
          (imgs) =>
            imgs.filter(
              (img) =>
                (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth === 0,
            ).length,
        ),
      `Broken images on ${route}`,
    ).toBe(0);
  }
  await page.goto('/');
  // Load off-screen images before capturing the entire catalogue for visual review.
  await page.locator('img').evaluateAll(async (images) => {
    const photos = images as HTMLImageElement[];
    photos.forEach((image) => {
      image.loading = 'eager';
    });
    await Promise.all(photos.map((image) => image.decode()));
  });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `test-results/velora-home-${info.project.name}.png`,
    fullPage: true,
    scale: 'css',
  });
});
