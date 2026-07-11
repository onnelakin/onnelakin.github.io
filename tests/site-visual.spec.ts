import { expect, test } from '@playwright/test';

const pages = [
  '/',
  '/ko/',
  '/apps/',
  '/apps/ko/',
  '/apps/tagweaver/',
  '/apps/tagweaver/ko/',
  '/blog/',
  '/blog/en/',
  '/blog/ko/',
  '/about/',
  '/about/ko/',
  '/privacy/',
  '/privacy/ko/'
];
const productPages = ['aligna', 'clipnest', 'quivra', 'segra', 'tagweaver', 'vaultxt'].flatMap((slug) => [
  `/apps/${slug}/`,
  `/apps/${slug}/ko/`
]);

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

  test('core product hero layouts remain readable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    for (const path of ['/apps/vaultxt/ko/', '/apps/clipnest/ko/', '/apps/segra/ko/']) {
      await page.goto(path);
      await expect(page.locator('#product-title')).toBeVisible();
      await expect(page.locator('.hero .button.primary').first()).toBeVisible();

      const titleBox = await page.locator('#product-title').boundingBox();
      const actionBox = await page.locator('.hero-actions').boundingBox();
      expect(titleBox).not.toBeNull();
      expect(actionBox).not.toBeNull();
      if (!titleBox || !actionBox) continue;
      expect(titleBox.y + titleBox.height).toBeLessThan(actionBox.y);
    }
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
    await page.locator('[data-policy-search]').fill('missing-app');
    await expect(page.locator('[data-policy-row]:visible')).toHaveCount(0);
    await expect(page.locator('[data-policy-empty]')).toBeVisible();
  });

  test('apps search filters app cards', async ({ page }) => {
    await page.goto('/apps/');
    await page.locator('[data-app-search]').fill('vault');
    await expect(page.locator('[data-app-row]:visible')).toHaveCount(1);
    await expect(page.locator('[data-app-row]:visible h2')).toHaveText('VaultXT');
    await page.locator('[data-app-search]').fill('missing-app');
    await expect(page.locator('[data-app-row]:visible')).toHaveCount(0);
    await expect(page.locator('[data-app-empty]')).toBeVisible();
  });

  test('home highlights featured app and four released apps', async ({ page }) => {
    await page.goto('/ko/');
    await expect(page.locator('.featured h2')).toHaveText('TagWeaver');
    await expect(page.locator('.product-card')).toHaveCount(4);
  });

  test('language switch uses full language labels', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main > .top-nav .language')).toHaveText('한국어');
    await expect(page.locator('main > .top-nav .language')).toHaveAttribute('aria-label', '한국어로 보기');

    await page.goto('/ko/');
    await expect(page.locator('main > .top-nav .language')).toHaveText('English');
    await expect(page.locator('main > .top-nav .language')).toHaveAttribute('aria-label', 'Switch to English');
  });

  test('home exposes blog navigation outside the footer', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main > .top-nav a[href="/blog/"]')).toBeVisible();

    await page.goto('/ko/');
    await expect(page.locator('main > .top-nav a[href="/blog/ko/"]')).toBeVisible();
  });

  test('mobile all apps link remains discoverable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/ko/');
    const allAppsLink = page.locator('.section-head a');
    await expect(allAppsLink).toBeVisible();
    await expect(allAppsLink).toHaveCSS('text-decoration-line', /underline/);
  });

  test('blog exposes apps navigation', async ({ page }) => {
    await page.goto('/blog/');
    await expect(page.locator('.top-nav a[href="/apps/"]')).toBeVisible();

    await page.goto('/blog/ko/');
    await expect(page.locator('.top-nav a[href="/apps/ko/"]')).toBeVisible();
  });

  test('blog pages present published posts or visitor-facing planned topics', async ({ page }) => {
    await page.goto('/blog/');
    await expect(page.locator('.post-card')).toContainText('Read Large TXT Files Without Lag');
    await expect(page.locator('.empty-state')).toHaveCount(0);
    await expect(page.locator('.category-preview article')).toHaveCount(4);

    await page.goto('/blog/ko/');
    await expect(page.locator('.post-card')).toContainText('대용량 TXT 파일 읽기');
    await expect(page.locator('.empty-state')).toHaveCount(0);
    await expect(page.locator('.category-preview article')).toHaveCount(4);
  });

  test('blog category filters prepare the post list for growth', async ({ page }) => {
    await page.goto('/blog/');
    await expect(page.locator('[data-blog-filter="all"]')).toHaveText('All');
    await expect(page.locator('[data-blog-filter="reading"]')).toHaveText('Reading');
    await page.locator('[data-blog-filter="reading"]').click();
    await expect(page.locator('[data-post-category="reading"]')).toBeVisible();
    await expect(page.locator('[data-blog-filter="reading"]')).toHaveAttribute('aria-pressed', 'true');

    await page.goto('/blog/ko/');
    await expect(page.locator('[data-blog-filter="all"]')).toHaveText('전체');
    await expect(page.locator('[data-blog-filter="reading"]')).toHaveText('읽기');
  });

  test('blog seo endpoints include blog routes', async ({ page }) => {
    const sitemapResponse = await page.request.get('/sitemap.xml');
    expect(sitemapResponse.ok()).toBe(true);
    const sitemap = await sitemapResponse.text();
    expect(sitemap).toContain('https://onnelakin.github.io/blog/');
    expect(sitemap).toContain('https://onnelakin.github.io/blog/ko/');
    expect(sitemap).toContain('https://onnelakin.github.io/blog/en/read-large-txt-files-without-lag/');
    expect(sitemap).toContain('hreflang="ko" href="https://onnelakin.github.io/blog/ko/read-large-txt-files-without-lag/"');

    const rssResponse = await page.request.get('/rss.xml');
    expect(rssResponse.ok()).toBe(true);
    expect(rssResponse.headers()['content-type']).toMatch(/(?:application|text)\/xml|rss\+xml/);
    expect(await rssResponse.text()).toContain('How to Read Large TXT Files Without Lag');

    const llmsResponse = await page.request.get('/llms.txt');
    expect(llmsResponse.ok()).toBe(true);
    const llms = await llmsResponse.text();
    expect(llms).toContain('## Blog Articles');
    expect(llms).toContain('https://onnelakin.github.io/blog/en/read-large-txt-files-without-lag/');
  });

  test('blog index exposes collection structured data', async ({ page }) => {
    await page.goto('/blog/');

    const jsonLd = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
      scripts.map((script) => script.textContent || '').join('\n')
    );
    expect(jsonLd).toContain('Blog');
    expect(jsonLd).toContain('CollectionPage');
    expect(jsonLd).toContain('ItemList');
    expect(jsonLd).toContain('Read Large TXT Files Without Lag');
  });

  test('blog article metadata remains crawlable and answer-friendly', async ({ page }) => {
    await page.goto('/blog/en/read-large-txt-files-without-lag/');

    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute(
      'content',
      '2026-07-11T00:00:00+09:00'
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://onnelakin.github.io/blog-assets/en/read-large-txt-files-without-lag/workflow-diagram.svg'
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    const jsonLd = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
      scripts.map((script) => script.textContent || '').join('\n')
    );
    expect(jsonLd).toContain('BlogPosting');
    expect(jsonLd).toContain('BreadcrumbList');
    expect(jsonLd).toContain('FAQPage');
  });

  test('blog article table of contents links to article sections', async ({ page }) => {
    const isMobile = (page.viewportSize()?.width ?? 0) <= 640;
    await page.goto('/blog/en/read-large-txt-files-without-lag/');

    await expect(page.locator('.toc-box')).toBeVisible();
    await expect(page.locator('.toc-box summary')).toHaveText('Contents');
    if (isMobile) {
      await expect(page.locator('.toc-box')).not.toHaveAttribute('open', '');
      await page.locator('.toc-box summary').click();
    }
    await expect(page.locator('.toc-box a[href="#recommended-workflow"]')).toContainText('Recommended Workflow');
    await expect(page.locator('#recommended-workflow')).toBeVisible();

    await page.goto('/blog/ko/read-large-txt-files-without-lag/');
    await expect(page.locator('.toc-box')).toBeVisible();
    await expect(page.locator('.toc-box summary')).toHaveText('목차');
    if (isMobile) {
      await expect(page.locator('.toc-box')).not.toHaveAttribute('open', '');
      await page.locator('.toc-box summary').click();
    }
    await expect(page.locator('.toc-box a[href="#권장-워크플로"]')).toContainText('권장 워크플로');
    await expect(page.locator('#권장-워크플로')).toBeVisible();
  });

  test('blog article related topics link to internal sections', async ({ page }) => {
    await page.goto('/blog/en/read-large-txt-files-without-lag/');
    await expect(page.locator('.topic-link-list a[href="#what-makes-a-txt-file-feel-slow"]')).toContainText(
      'Large text file performance'
    );
    await expect(page.locator('.topic-link-list a[href="#what-to-check-first"]')).toContainText(
      'TXT encoding and unreadable characters'
    );

    await page.goto('/blog/ko/read-large-txt-files-without-lag/');
    await expect(page.getByRole('link', { name: 'TXT 인코딩과 글자 깨짐' })).toHaveAttribute(
      'href',
      '#먼저-확인할-항목'
    );
    await expect(page.getByRole('link', { name: '일반 텍스트 읽기 워크플로' })).toHaveAttribute(
      'href',
      '#권장-워크플로'
    );
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

    await page.goto('/about/');
    await expect(page).toHaveURL(/\/about\/ko\/$/);

    await page.goto('/blog/');
    await expect(page).toHaveURL(/\/blog\/ko\/$/);
  });

  test('korean apps collection does not redirect as an app detail page', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko'] });
      Object.defineProperty(navigator, 'language', { get: () => 'ko-KR' });
    });

    await page.goto('/apps/ko/');
    await expect(page).toHaveURL(/\/apps\/ko\/$/);
  });

  test('legacy duplicated korean apps path redirects to the apps collection', async ({ page }) => {
    await page.goto('/apps/ko/ko/');
    await expect(page).toHaveURL(/\/apps\/ko\/$/);
  });

  test('legacy korean-prefixed collection paths redirect to canonical pages', async ({ page }) => {
    await page.goto('/ko/apps/');
    await expect(page).toHaveURL(/\/apps\/ko\/$/);

    await page.goto('/ko/privacy/');
    await expect(page).toHaveURL(/\/privacy\/ko\/$/);
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
    await expect(page.locator('.support-links a').first()).toHaveText('개인정보 처리방침');
    await expect(page.locator('.support-links a').first()).toHaveAttribute(
      'href',
      'https://onnelakin.github.io/tagweaver-privacy-policy/ko/'
    );
    await expect(page.locator('footer a').first()).toHaveText('개인정보 처리방침');
    await expect(page.locator('footer a').first()).toHaveAttribute(
      'href',
      'https://onnelakin.github.io/tagweaver-privacy-policy/ko/'
    );
  });

  test('product seo metadata remains crawlable', async ({ page }) => {
    await page.goto('/apps/tagweaver/');

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://onnelakin.github.io/apps/tagweaver/'
    );
    await expect(page).toHaveTitle('TagWeaver - Offline MP3/FLAC Tag Editor');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'TagWeaver - Offline MP3/FLAC Tag Editor'
    );
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      'href',
      'https://onnelakin.github.io/app-assets/tagweaver/assets/icon/tagweaver.png'
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      'https://onnelakin.github.io/app-assets/tagweaver/assets/icon/tagweaver.png'
    );
    const jsonLdItems = await page.locator('script[type="application/ld+json"]').allTextContents();
    const structuredDataItems = jsonLdItems.map((jsonLd) => JSON.parse(jsonLd));
    const structuredData = structuredDataItems.find((item) => item['@type'] === 'SoftwareApplication');
    const breadcrumbData = structuredDataItems.find((item) => item['@type'] === 'BreadcrumbList');
    const faqData = structuredDataItems.find((item) => item['@type'] === 'FAQPage');
    expect(structuredData).toBeDefined();
    expect(breadcrumbData).toBeDefined();
    expect(faqData).toBeDefined();
    expect(structuredData['@type']).toBe('SoftwareApplication');
    expect(structuredData.name).toBe('TagWeaver');
    expect(structuredData.mainEntityOfPage).toBe('https://onnelakin.github.io/apps/tagweaver/');
    expect(structuredData.applicationCategory).toBe('UtilitiesApplication');
    expect(structuredData.isAccessibleForFree).toBe(true);
    expect(structuredData.featureList.length).toBeGreaterThan(0);
    expect(structuredData.screenshot.length).toBeGreaterThan(0);
    expect(structuredData.installUrl).toContain('https://apps.apple.com/us/app/id6759609875?l=en-US');
    expect(structuredData.privacyPolicy).toBe('https://onnelakin.github.io/tagweaver-privacy-policy/');
    expect(structuredData.publisher.name).toBe('ONNELLAB');
    expect(breadcrumbData.itemListElement.map((item) => item.name)).toEqual([
      'ONNELLAB',
      'Download',
      'TagWeaver'
    ]);
    expect(breadcrumbData.itemListElement.at(-1).item).toBe('https://onnelakin.github.io/apps/tagweaver/');
    expect(faqData.mainEntity.map((item) => item.name)).toContain('Are files uploaded to a server?');
    await expect(page.locator('#use-cases-title')).toHaveText('Use cases');
    await expect(page.locator('#faq-title')).toHaveText('FAQ');
    await expect(page.locator('[data-store-link][data-store-position="hero"]')).toHaveCount(2);
    await expect(page.locator('[data-store-link][data-store-position="download"]')).toHaveCount(2);

    const sitemapResponse = await page.request.get('/sitemap.xml');
    expect(sitemapResponse.ok()).toBe(true);
    expect(sitemapResponse.headers()['content-type']).toMatch(/(?:application|text)\/xml/);
    expect(await sitemapResponse.text()).toContain('https://onnelakin.github.io/apps/tagweaver/');

    const robotsResponse = await page.request.get('/robots.txt');
    expect(robotsResponse.ok()).toBe(true);
    expect(await robotsResponse.text()).toContain('Sitemap: https://onnelakin.github.io/sitemap.xml');

    const llmsResponse = await page.request.get('/llms.txt');
    expect(llmsResponse.ok()).toBe(true);
    const llmsText = await llmsResponse.text();
    expect(llmsText).toContain('## Korean App Summaries');
    expect(llmsText).toContain('주요 작업:');
  });

  test('all product detail pages expose matching faq sections and structured data', async ({ page }) => {
    for (const path of productPages) {
      await page.goto(path);

      const isKo = path.endsWith('/ko/');
      await expect(page.locator('#faq-title')).toHaveText(isKo ? '자주 묻는 질문' : 'FAQ');
      await expect(page.locator('.faq-list details')).toHaveCount(3);

      const jsonLdItems = await page.locator('script[type="application/ld+json"]').allTextContents();
      const faqData = jsonLdItems.map((jsonLd) => JSON.parse(jsonLd)).find((item) => item['@type'] === 'FAQPage');
      expect(faqData).toBeDefined();
      expect(faqData.mainEntity).toHaveLength(3);
      expect(faqData['@id']).toContain(`${path}#faq`);
    }
  });

  test('product store click analytics include app locale store and position', async ({ page }) => {
    await page.goto('/apps/tagweaver/');
    await page.evaluate(() => {
      window.__onnellEvents = [];
      window.onnelTrack = (eventName, params = {}) => {
        window.__onnellEvents.push({ eventName, params });
      };
      document.addEventListener(
        'click',
        (event) => {
          if (event.target instanceof Element && event.target.closest('[data-store-link]')) {
            event.preventDefault();
          }
        },
        true
      );
    });

    await page.locator('[data-store-link][data-store-position="hero"][data-store="app_store"]').click();
    const event = await page.evaluate(() => window.__onnellEvents.at(-1));
    expect(event.eventName).toBe('store_click');
    expect(event.params).toMatchObject({
      app: 'tagweaver',
      locale: 'en',
      store: 'app_store',
      position: 'hero',
      page_path: '/apps/tagweaver/'
    });
  });

  test('site and collection schema remain crawlable', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      'href',
      'https://onnelakin.github.io/app-assets/quivra/assets/icon/quivra.png'
    );
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
    expect(privacySchema.mainEntity.itemListElement[0].url).not.toContain('/ko/');

    await page.goto('/privacy/ko/');
    const koreanPrivacySchema = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}'
    );
    expect(koreanPrivacySchema.mainEntity.itemListElement[0].url).toContain('/ko/');
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
    await expect(page.locator('.identity img')).toHaveAttribute('data-no-visual-search', 'true');
    await expect(page.locator('[data-screenshot-link] img').first()).toHaveAttribute('data-no-visual-search', 'true');
    await page.locator('[data-screenshot-link]').first().click();

    const viewer = page.locator('.screenshot-viewer');
    await expect(viewer).toBeVisible();
    await expect(page.locator('[data-viewer-image]')).toHaveAttribute('src', /tagweaver\/assets\/screenshots\/en\/1\.png/);
    await expect(page.locator('[data-viewer-image]')).toHaveAttribute('data-no-visual-search', 'true');
    await expect(page.locator('[data-viewer-thumb] img').first()).toHaveAttribute('data-no-visual-search', 'true');
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
    expect(focusedMatrix.a).toBe(1.65);
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
    expect(wheelZoomScale).toBeCloseTo(1.83, 5);

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
      const centerY = box.y + box.height / 2;
      const createTouch = (identifier: number, x: number, y: number) =>
        new Touch({ identifier, target, clientX: x, clientY: y });
      const dispatchTouch = (
        type: string,
        touches: Array<[number, number, number]>,
        changedTouches = touches
      ) => {
        const activeTouches = touches.map(([identifier, x, y]) => createTouch(identifier, x, y));
        const changed = changedTouches.map(([identifier, x, y]) => createTouch(identifier, x, y));
        target.dispatchEvent(
          new TouchEvent(type, {
            touches: activeTouches,
            targetTouches: activeTouches,
            changedTouches: changed,
            bubbles: true,
            cancelable: true
          })
        );
      };
      dispatchTouch('touchstart', [[1, box.x + box.width * 0.78, centerY]]);
      dispatchTouch('touchmove', [[1, box.x + box.width * 0.2, centerY]]);
      dispatchTouch('touchend', [], [[1, box.x + box.width * 0.2, centerY]]);
    }, stageBox);
    await expect(page.locator('[data-viewer-image]')).toHaveAttribute('src', /tagweaver\/assets\/screenshots\/en\/2\.png/);
    await expect(page.locator('[data-viewer-thumb]').nth(1)).toHaveAttribute('aria-current', 'true');

    await page.locator('[data-viewer-stage]').evaluate((stage, box) => {
      const target = stage as HTMLElement;
      const centerY = box.y + box.height / 2;
      const createTouch = (identifier: number, x: number, y: number) =>
        new Touch({ identifier, target, clientX: x, clientY: y });
      const dispatchTouch = (
        type: string,
        touches: Array<[number, number, number]>,
        changedTouches = touches
      ) => {
        const activeTouches = touches.map(([identifier, x, y]) => createTouch(identifier, x, y));
        const changed = changedTouches.map(([identifier, x, y]) => createTouch(identifier, x, y));
        target.dispatchEvent(
          new TouchEvent(type, {
            touches: activeTouches,
            targetTouches: activeTouches,
            changedTouches: changed,
            bubbles: true,
            cancelable: true
          })
        );
      };
      dispatchTouch('touchstart', [[1, box.x + box.width * 0.2, centerY]]);
      dispatchTouch('touchmove', [[1, box.x + box.width * 0.78, centerY]]);
      dispatchTouch('touchend', [], [[1, box.x + box.width * 0.78, centerY]]);
    }, stageBox);
    await expect(page.locator('[data-viewer-image]')).toHaveAttribute('src', /tagweaver\/assets\/screenshots\/en\/1\.png/);
    await expect(page.locator('[data-viewer-thumb]').first()).toHaveAttribute('aria-current', 'true');

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
    expect(pinchZoomScale).toBeCloseTo(1.24, 5);
    await expect(page.locator('[data-viewer-image]')).toHaveAttribute('data-zoomed', 'true');
    const closeBox = await page.locator('[data-viewer-close]').boundingBox();
    const viewport = page.viewportSize();
    expect(closeBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (!closeBox || !viewport) return;
    expect(closeBox.y).toBeGreaterThanOrEqual(0);
    expect(closeBox.y + closeBox.height).toBeLessThanOrEqual(viewport.height);
    expect(closeBox.x).toBeGreaterThanOrEqual(0);
    expect(closeBox.x + closeBox.width).toBeLessThanOrEqual(viewport.width);
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

  test('product screenshot gallery exposes all screenshots with page controls', async ({ page }) => {
    await page.goto('/apps/quivra/');
    await expect(page.locator('[data-screenshot-link]')).toHaveCount(4);
    await expect(page.locator('[data-screenshot-prev]')).toBeVisible();
    await expect(page.locator('[data-screenshot-next]')).toBeVisible();

    const initialScrollLeft = await page.locator('[data-screenshot-row]').evaluate((row) => row.scrollLeft);
    await page.locator('[data-screenshot-next]').click();
    await expect
      .poll(() => page.locator('[data-screenshot-row]').evaluate((row) => row.scrollLeft))
      .toBeGreaterThan(initialScrollLeft);
  });
});
