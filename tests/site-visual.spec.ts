import { expect, test } from '@playwright/test';

const pages = [
  '/',
  '/ko/',
  '/apps/',
  '/apps/ko/',
  '/apps/tagweaver/',
  '/apps/tagweaver/ko/',
  '/privacy/',
  '/privacy/ko/'
];

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

  test('korean privacy heading keeps a readable mobile block', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/privacy/ko/');
    const headingBox = await page.locator('h1').boundingBox();

    expect(headingBox).not.toBeNull();
    if (!headingBox) return;
    expect(headingBox.width).toBeLessThanOrEqual(362);
    expect(headingBox.height).toBeLessThan(112);
  });

  test('privacy app search filters policy rows', async ({ page }) => {
    await page.goto('/privacy/ko/');
    await page.locator('[data-policy-search]').fill('tag');
    await expect(page.locator('[data-policy-row]:visible')).toHaveCount(1);
    await expect(page.locator('[data-policy-row]:visible h2')).toHaveText('TagWeaver');
  });

  test('korean browser language redirects default pages to korean pages', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko'] });
      Object.defineProperty(navigator, 'language', { get: () => 'ko-KR' });
    });

    await page.goto('/');
    await expect(page).toHaveURL(/\/ko\/$/);

    await page.goto('/apps/tagweaver/');
    await expect(page).toHaveURL(/\/apps\/tagweaver\/ko\/$/);
  });

  test('manual language choice prevents automatic korean redirect', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('onnellab.locale', 'en');
      Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko'] });
      Object.defineProperty(navigator, 'language', { get: () => 'ko-KR' });
    });

    await page.goto('/');
    await expect.poll(() => new URL(page.url()).pathname).toBe('/');
  });

  test('product store links match page locale', async ({ page }) => {
    await page.goto('/apps/tagweaver/');
    await expect(page.locator('.hero .button.primary').first()).toHaveAttribute(
      'href',
      /https:\/\/apps\.apple\.com\/us\/app\/id6759609875\?l=en-US/
    );
    await expect(page.locator('.hero .button.primary').nth(1)).toHaveAttribute(
      'href',
      /https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.onnellab\.tagweaver2&hl=en&gl=US/
    );

    await page.goto('/apps/tagweaver/ko/');
    await expect(page.locator('.hero .button.primary').first()).toHaveAttribute(
      'href',
      /https:\/\/apps\.apple\.com\/kr\/app\/id6759609875\?l=ko/
    );
    await expect(page.locator('.hero .button.primary').nth(1)).toHaveAttribute(
      'href',
      /https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.onnellab\.tagweaver2&hl=ko&gl=KR/
    );
  });

  test('product seo metadata remains crawlable', async ({ page }) => {
    await page.goto('/apps/tagweaver/');

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://onnelakin.github.io/apps/tagweaver/'
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'TagWeaver');
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);

    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLd).not.toBeNull();
    const structuredData = JSON.parse(jsonLd ?? '{}');
    expect(structuredData['@type']).toBe('SoftwareApplication');
    expect(structuredData.name).toBe('TagWeaver');
    expect(structuredData.applicationCategory).toBe('UtilitiesApplication');
    expect(structuredData.screenshot.length).toBeGreaterThan(0);
    expect(structuredData.installUrl).toContain('https://apps.apple.com/us/app/id6759609875?l=en-US');
    expect(structuredData.privacyPolicy).toBe('https://onnelakin.github.io/tagweaver-privacy-policy/');
    expect(structuredData.publisher.name).toBe('ONNELLAB');

    const sitemapResponse = await page.request.get('/sitemap.xml');
    expect(sitemapResponse.ok()).toBe(true);
    expect(sitemapResponse.headers()['content-type']).toMatch(/(?:application|text)\/xml/);
    expect(await sitemapResponse.text()).toContain('https://onnelakin.github.io/apps/tagweaver/');

    const robotsResponse = await page.request.get('/robots.txt');
    expect(robotsResponse.ok()).toBe(true);
    expect(await robotsResponse.text()).toContain('Sitemap: https://onnelakin.github.io/sitemap.xml');
  });

  test('site and collection schema remain crawlable', async ({ page }) => {
    await page.goto('/');
    const homeSchemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    const homeTypes = homeSchemas.map((schema) => JSON.parse(schema)['@type']);
    expect(homeTypes).toEqual(['Organization', 'WebSite']);

    await page.goto('/apps/');
    const appsSchema = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}');
    expect(appsSchema['@type']).toBe('CollectionPage');
    expect(appsSchema.mainEntity['@type']).toBe('ItemList');
    expect(appsSchema.mainEntity.itemListElement.length).toBeGreaterThan(5);

    await page.goto('/privacy/');
    const privacySchema = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}');
    expect(privacySchema['@type']).toBe('CollectionPage');
    expect(privacySchema['@id']).toBe('https://onnelakin.github.io/privacy/#privacy-policies');
    expect(privacySchema.mainEntity.itemListElement.length).toBeGreaterThan(5);
  });

  test('single store download action is centered', async ({ page }) => {
    await page.goto('/apps/clipnest/');
    const downloadBand = page.locator('.download-band');
    const button = downloadBand.locator('.button.primary');
    await expect(button).toHaveCount(1);

    const bandBox = await downloadBand.boundingBox();
    const buttonBox = await button.boundingBox();
    expect(bandBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();
    if (!bandBox || !buttonBox) return;

    const bandCenter = bandBox.x + bandBox.width / 2;
    const buttonCenter = buttonBox.x + buttonBox.width / 2;
    expect(Math.abs(bandCenter - buttonCenter)).toBeLessThan(1);

    const footer = page.locator('footer');
    const footerBox = await footer.boundingBox();
    expect(footerBox).not.toBeNull();
    if (!footerBox) return;

    const footerCenter = footerBox.x + footerBox.width / 2;
    for (const item of await footer.locator('> *').all()) {
      const itemBox = await item.boundingBox();
      expect(itemBox).not.toBeNull();
      if (!itemBox) continue;
      const itemCenter = itemBox.x + itemBox.width / 2;
      expect(Math.abs(footerCenter - itemCenter)).toBeLessThan(1);
    }
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
    const imageBox = await viewerImage.boundingBox();
    expect(stageBox).not.toBeNull();
    expect(imageBox).not.toBeNull();
    if (!stageBox || !imageBox) return;
    await page.mouse.click(imageBox.x + imageBox.width * 0.25, imageBox.y + imageBox.height * 0.3);
    await expect(page.locator('[data-viewer-image]')).toHaveAttribute('data-zoomed', 'true');
    const focusedTransform = await viewerImage.evaluate((image) => getComputedStyle(image).transform);
    const focusedMatrix = await viewerImage.evaluate((image) => {
      const transform = getComputedStyle(image).transform;
      const matrix = transform === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(transform);
      return { a: matrix.a, e: matrix.e, f: matrix.f };
    });
    expect(focusedMatrix.a).toBe(1.15);
    expect(Math.abs(focusedMatrix.e)).toBeGreaterThan(20);
    expect(Math.abs(focusedMatrix.f)).toBeGreaterThan(20);

    await page.mouse.click(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
    await expect(page.locator('[data-viewer-image]')).toHaveAttribute('data-zoomed', 'false');

    await page.mouse.click(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
    await expect(page.locator('[data-viewer-image]')).toHaveAttribute('data-zoomed', 'true');
    const zoomedTransform = await viewerImage.evaluate((image) => getComputedStyle(image).transform);
    expect(zoomedTransform).not.toBe(focusedTransform);
    await page.mouse.move(stageBox.x + stageBox.width / 2 + 80, stageBox.y + stageBox.height / 2 + 48);
    expect(await viewerImage.evaluate((image) => getComputedStyle(image).transform)).toBe(zoomedTransform);

    await page.locator('[data-viewer-stage]').dispatchEvent('wheel', {
      deltaY: -120,
      clientX: stageBox.x + stageBox.width / 2,
      clientY: stageBox.y + stageBox.height / 2,
      bubbles: true,
      cancelable: true
    });
    const wheelZoomTransform = await viewerImage.evaluate((image) => getComputedStyle(image).transform);
    expect(wheelZoomTransform).not.toBe(zoomedTransform);
    const wheelZoomScale = await viewerImage.evaluate((image) => {
      const transform = getComputedStyle(image).transform;
      return transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).a;
    });
    expect(wheelZoomScale).toBeCloseTo(1.25, 5);

    for (let index = 0; index < 8; index += 1) {
      await page.locator('[data-viewer-stage]').dispatchEvent('wheel', {
        deltaY: 120,
        clientX: stageBox.x + stageBox.width / 2,
        clientY: stageBox.y + stageBox.height / 2,
        bubbles: true,
        cancelable: true
      });
    }
    const reducedWheelScale = await viewerImage.evaluate((image) => {
      const transform = getComputedStyle(image).transform;
      return transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).a;
    });
    expect(reducedWheelScale).toBe(1);
    await expect(page.locator('[data-viewer-image]')).toHaveAttribute('data-zoomed', 'false');

    await page.locator('[data-viewer-stage]').evaluate((stage, box) => {
      const target = stage as HTMLElement;
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      const createTouch = (identifier: number, x: number, y: number) =>
        new Touch({ identifier, target, clientX: x, clientY: y });
      const dispatchTouch = (type: string, points: Array<[number, number, number]>) => {
        const touches = points.map(([identifier, x, y]) => createTouch(identifier, x, y));
        target.dispatchEvent(
          new TouchEvent(type, {
            touches,
            targetTouches: touches,
            changedTouches: touches,
            bubbles: true,
            cancelable: true
          })
        );
      };
      dispatchTouch('touchstart', [
        [1, centerX - 32, centerY],
        [2, centerX + 32, centerY]
      ]);
      dispatchTouch('touchmove', [
        [1, centerX - 48, centerY],
        [2, centerX + 48, centerY]
      ]);
      dispatchTouch('touchend', []);
    }, stageBox);
    const pinchZoomScale = await viewerImage.evaluate((image) => {
      const transform = getComputedStyle(image).transform;
      return transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).a;
    });
    expect(pinchZoomScale).toBeCloseTo(1.5, 5);
    await expect(page.locator('[data-viewer-image]')).toHaveAttribute('data-zoomed', 'true');
    await page.locator('[data-viewer-stage]').dispatchEvent('wheel', {
      deltaY: 120,
      clientX: stageBox.x + stageBox.width / 2,
      clientY: stageBox.y + stageBox.height / 2,
      bubbles: true,
      cancelable: true
    });
    await page.locator('[data-viewer-stage]').dispatchEvent('wheel', {
      deltaY: 120,
      clientX: stageBox.x + stageBox.width / 2,
      clientY: stageBox.y + stageBox.height / 2,
      bubbles: true,
      cancelable: true
    });
    await page.locator('[data-viewer-stage]').dispatchEvent('wheel', {
      deltaY: 120,
      clientX: stageBox.x + stageBox.width / 2,
      clientY: stageBox.y + stageBox.height / 2,
      bubbles: true,
      cancelable: true
    });
    await page.locator('[data-viewer-stage]').dispatchEvent('wheel', {
      deltaY: 120,
      clientX: stageBox.x + stageBox.width / 2,
      clientY: stageBox.y + stageBox.height / 2,
      bubbles: true,
      cancelable: true
    });
    await page.locator('[data-viewer-stage]').dispatchEvent('wheel', {
      deltaY: 120,
      clientX: stageBox.x + stageBox.width / 2,
      clientY: stageBox.y + stageBox.height / 2,
      bubbles: true,
      cancelable: true
    });
    await expect(page.locator('[data-viewer-image]')).toHaveAttribute('data-zoomed', 'false');

    await page.mouse.click(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
    await expect(page.locator('[data-viewer-image]')).toHaveAttribute('data-zoomed', 'true');
    const dragStartTransform = await viewerImage.evaluate((image) => getComputedStyle(image).transform);

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
    expect(await viewerImage.evaluate((image) => getComputedStyle(image).transform)).not.toBe(dragStartTransform);

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
