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

  test('product screenshots open in an in-page viewer', async ({ page }) => {
    await page.goto('/apps/tagweaver/');
    await page.locator('.screens-band summary').click();
    await page.locator('[data-screenshot-link]').first().click();

    const viewer = page.locator('.screenshot-viewer');
    await expect(viewer).toBeVisible();
    await expect(page.locator('[data-viewer-image]')).toHaveAttribute('src', /tagweaver\/assets\/screenshots\/en\/1\.png/);
    await expect(page.locator('[data-viewer-thumb]').first()).toHaveAttribute('aria-current', 'true');

    const viewerImage = page.locator('[data-viewer-image]');
    const stageBox = await page.locator('[data-viewer-stage]').boundingBox();
    expect(stageBox).not.toBeNull();
    if (!stageBox) return;
    await page.mouse.click(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
    await expect(page.locator('[data-viewer-image]')).toHaveAttribute('data-zoomed', 'true');

    await page.mouse.click(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
    await expect(page.locator('[data-viewer-image]')).toHaveAttribute('data-zoomed', 'false');

    await page.mouse.click(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
    await expect(page.locator('[data-viewer-image]')).toHaveAttribute('data-zoomed', 'true');
    const zoomedTransform = await viewerImage.evaluate((image) => getComputedStyle(image).transform);
    await page.mouse.move(stageBox.x + stageBox.width / 2 + 80, stageBox.y + stageBox.height / 2 + 48);
    expect(await viewerImage.evaluate((image) => getComputedStyle(image).transform)).toBe(zoomedTransform);

    await viewerImage.dispatchEvent('mousedown', {
      clientX: stageBox.x + stageBox.width / 2,
      clientY: stageBox.y + stageBox.height / 2,
      button: 0,
      buttons: 1,
      bubbles: true,
      cancelable: true
    });
    await page.evaluate(
      ({ x, y }) => {
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, buttons: 1, bubbles: true }));
        document.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, buttons: 0, bubbles: true }));
      },
      {
        x: stageBox.x + stageBox.width / 2 + 80,
        y: stageBox.y + stageBox.height / 2 + 48
      }
    );
    expect(await viewerImage.evaluate((image) => getComputedStyle(image).transform)).not.toBe(zoomedTransform);

    await page.locator('[data-viewer-next]').click();
    await expect(page.locator('[data-viewer-image]')).toHaveAttribute('src', /tagweaver\/assets\/screenshots\/en\/2\.png/);
    await expect(page.locator('[data-viewer-thumb]').nth(1)).toHaveAttribute('aria-current', 'true');

    await page.locator('[data-viewer-thumb]').nth(2).click();
    await expect(page.locator('[data-viewer-image]')).toHaveAttribute('src', /tagweaver\/assets\/screenshots\/en\/3\.png/);
    await expect(page.locator('[data-viewer-thumb]').nth(2)).toHaveAttribute('aria-current', 'true');

    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('[data-viewer-image]')).toHaveAttribute('src', /tagweaver\/assets\/screenshots\/en\/2\.png/);

    await page.locator('[data-viewer-close]').click();
    await expect(viewer).not.toBeVisible();
  });
});
