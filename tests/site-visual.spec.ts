import { expect, test } from '@playwright/test';

const pages = ['/', '/ko/', '/apps/', '/apps/ko/', '/apps/tagweaver/', '/apps/tagweaver/ko/'];

test.describe('site layout', () => {
  for (const path of pages) {
    test(`${path} renders without broken screenshots`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('body')).toBeVisible();

      const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(horizontalOverflow).toBe(false);

      const brokenImages = await page.evaluate(() =>
        Array.from(document.images)
          .filter((image) => !image.closest('details:not([open])'))
          .filter((image) => image.naturalWidth === 0 || image.naturalHeight === 0)
          .map((image) => image.getAttribute('src') ?? '')
      );
      expect(brokenImages).toEqual([]);

      const visibleText = await page.locator('main').innerText();
      expect(visibleText.trim().length).toBeGreaterThan(40);
    });
  }

  test('product hero title and task summary do not overlap', async ({ page }) => {
    await page.goto('/apps/tagweaver/');
    await expect(page.locator('.download-band .button.primary').first()).toBeVisible();
    const titleBox = await page.locator('#product-title').boundingBox();
    const summaryBox = await page.locator('.task-preview').boundingBox();

    expect(titleBox).not.toBeNull();
    expect(summaryBox).not.toBeNull();
    if (!titleBox || !summaryBox) return;

    const overlaps =
      titleBox.x < summaryBox.x + summaryBox.width &&
      titleBox.x + titleBox.width > summaryBox.x &&
      titleBox.y < summaryBox.y + summaryBox.height &&
      titleBox.y + titleBox.height > summaryBox.y;
    expect(overlaps).toBe(false);
  });
});
