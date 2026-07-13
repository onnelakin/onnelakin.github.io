import fs from 'node:fs';
import path from 'node:path';

import { getBlogPosts } from '../lib/blog';
import { getProductSources } from '../lib/products';
import { releaseNotePath, releaseNotes } from '../lib/releaseNotes';

type SitemapEntry = {
  path: string;
  lastmod: string;
  alternates?: Array<{ lang: string; path: string }>;
};

const siteUrl = 'https://onnellab.github.io';

export function GET() {
  const sourceLastmod = sourceFileLastmod();
  const productEntries = getProductSources().flatMap((source) => {
    const enPath = `/apps/${source.slug}/`;
    const koPath = `/apps/${source.slug}/ko/`;
    const lastmod = sourceLastmod(source.contentDir);
    const alternates = [
      { lang: 'en', path: enPath },
      { lang: 'ko', path: koPath },
      { lang: 'x-default', path: enPath }
    ];
    return [
      { path: enPath, lastmod, alternates },
      { path: koPath, lastmod, alternates }
    ];
  });
  const blogEntries = getBlogPosts().map((post) => ({
    path: post.href,
    lastmod: sourceLastmod(post.sourcePath),
    alternates: blogAlternates(post)
  }));
  const releaseNoteEntries = releaseNotes.map((note) => ({
    path: releaseNotePath(note),
    lastmod: sourceLastmod('src/lib/releaseNotes.ts')
  }));
  const entries: SitemapEntry[] = [
    {
      path: '/',
      lastmod: sourceLastmod('src/components/HomePage.astro'),
      alternates: [
        { lang: 'en', path: '/' },
        { lang: 'ko', path: '/ko/' },
        { lang: 'x-default', path: '/' }
      ]
    },
    {
      path: '/ko/',
      lastmod: sourceLastmod('src/components/HomePage.astro'),
      alternates: [
        { lang: 'en', path: '/' },
        { lang: 'ko', path: '/ko/' },
        { lang: 'x-default', path: '/' }
      ]
    },
    {
      path: '/apps/',
      lastmod: sourceLastmod('src/components/AppsIndex.astro'),
      alternates: [
        { lang: 'en', path: '/apps/' },
        { lang: 'ko', path: '/apps/ko/' },
        { lang: 'x-default', path: '/apps/' }
      ]
    },
    {
      path: '/apps/ko/',
      lastmod: sourceLastmod('src/components/AppsIndex.astro'),
      alternates: [
        { lang: 'en', path: '/apps/' },
        { lang: 'ko', path: '/apps/ko/' },
        { lang: 'x-default', path: '/apps/' }
      ]
    },
    {
      path: '/blog/',
      lastmod: sourceLastmod('src/pages/blog/index.astro'),
      alternates: [
        { lang: 'en', path: '/blog/' },
        { lang: 'ko', path: '/blog/ko/' },
        { lang: 'x-default', path: '/blog/' }
      ]
    },
    {
      path: '/blog/ko/',
      lastmod: sourceLastmod('src/pages/blog/ko/index.astro'),
      alternates: [
        { lang: 'en', path: '/blog/' },
        { lang: 'ko', path: '/blog/ko/' },
        { lang: 'x-default', path: '/blog/' }
      ]
    },
    ...blogEntries,
    {
      path: '/privacy/',
      lastmod: sourceLastmod('src/components/PrivacyIndex.astro'),
      alternates: [
        { lang: 'en', path: '/privacy/' },
        { lang: 'ko', path: '/privacy/ko/' },
        { lang: 'x-default', path: '/privacy/' }
      ]
    },
    {
      path: '/privacy/ko/',
      lastmod: sourceLastmod('src/components/PrivacyIndex.astro'),
      alternates: [
        { lang: 'en', path: '/privacy/' },
        { lang: 'ko', path: '/privacy/ko/' },
        { lang: 'x-default', path: '/privacy/' }
      ]
    },
    {
      path: '/terms/',
      lastmod: sourceLastmod('src/pages/terms/index.astro'),
      alternates: [
        { lang: 'en', path: '/terms/' },
        { lang: 'ko', path: '/terms/ko/' },
        { lang: 'x-default', path: '/terms/' }
      ]
    },
    {
      path: '/terms/ko/',
      lastmod: sourceLastmod('src/pages/terms/ko.astro'),
      alternates: [
        { lang: 'en', path: '/terms/' },
        { lang: 'ko', path: '/terms/ko/' },
        { lang: 'x-default', path: '/terms/' }
      ]
    },
    {
      path: '/oauth/x/callback/',
      lastmod: sourceLastmod('src/pages/oauth/x/callback/index.astro'),
      alternates: [
        { lang: 'en', path: '/oauth/x/callback/' },
        { lang: 'ko', path: '/oauth/x/callback/ko/' },
        { lang: 'x-default', path: '/oauth/x/callback/' }
      ]
    },
    {
      path: '/oauth/x/callback/ko/',
      lastmod: sourceLastmod('src/pages/oauth/x/callback/ko.astro'),
      alternates: [
        { lang: 'en', path: '/oauth/x/callback/' },
        { lang: 'ko', path: '/oauth/x/callback/ko/' },
        { lang: 'x-default', path: '/oauth/x/callback/' }
      ]
    },
    {
      path: '/melivra-privacy-policy/',
      lastmod: sourceLastmod('src/pages/melivra-privacy-policy/index.astro'),
      alternates: [
        { lang: 'en', path: '/melivra-privacy-policy/' },
        { lang: 'ko', path: '/melivra-privacy-policy/ko/' },
        { lang: 'x-default', path: '/melivra-privacy-policy/' }
      ]
    },
    {
      path: '/melivra-privacy-policy/ko/',
      lastmod: sourceLastmod('src/pages/melivra-privacy-policy/ko.astro'),
      alternates: [
        { lang: 'en', path: '/melivra-privacy-policy/' },
        { lang: 'ko', path: '/melivra-privacy-policy/ko/' },
        { lang: 'x-default', path: '/melivra-privacy-policy/' }
      ]
    },
    {
      path: '/about/',
      lastmod: sourceLastmod('src/components/AboutPage.astro'),
      alternates: [
        { lang: 'en', path: '/about/' },
        { lang: 'ko', path: '/about/ko/' },
        { lang: 'x-default', path: '/about/' }
      ]
    },
    {
      path: '/about/ko/',
      lastmod: sourceLastmod('src/components/AboutPage.astro'),
      alternates: [
        { lang: 'en', path: '/about/' },
        { lang: 'ko', path: '/about/ko/' },
        { lang: 'x-default', path: '/about/' }
      ]
    },
    ...releaseNoteEntries,
    ...productEntries
  ];
  const uniqueEntries = entries.filter(
    (entry, index, all) => all.findIndex((candidate) => candidate.path === entry.path) === index
  );
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${uniqueEntries
  .map((entry) => {
    const links =
      entry.alternates
        ?.map(
          (alternate) =>
            `    <xhtml:link rel="alternate" hreflang="${alternate.lang}" href="${new URL(alternate.path, siteUrl).toString()}" />`
        )
        .join('\n') ?? '';
    return `  <url>
    <loc>${new URL(entry.path, siteUrl).toString()}</loc>
    <lastmod>${entry.lastmod}</lastmod>
${links}
  </url>`;
  })
  .join('\n')}
</urlset>
`;
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
}

function sourceFileLastmod() {
  const cache = new Map<string, string>();
  return (sourcePath: string): string => {
    const absolutePath = path.resolve(process.cwd(), sourcePath);
    if (cache.has(absolutePath)) return cache.get(absolutePath) as string;
    const stat = fs.statSync(absolutePath);
    const newest = stat.isDirectory()
      ? newestFileMtime(absolutePath)
      : stat.mtime;
    const value = newest.toISOString().slice(0, 10);
    cache.set(absolutePath, value);
    return value;
  };
}

function newestFileMtime(dir: string): Date {
  let newest = fs.statSync(dir).mtime;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    const mtime = entry.isDirectory() ? newestFileMtime(entryPath) : fs.statSync(entryPath).mtime;
    if (mtime > newest) newest = mtime;
  }
  return newest;
}

function blogAlternates(post: ReturnType<typeof getBlogPosts>[number]): Array<{ lang: string; path: string }> | undefined {
  const alternate = getBlogPosts(post.meta.language === 'ko' ? 'en' : 'ko').find((item) => item.meta.slug === post.meta.slug);
  if (!alternate) return undefined;
  const enPath = post.meta.language === 'en' ? post.href : alternate.href;
  const koPath = post.meta.language === 'ko' ? post.href : alternate.href;
  return [
    { lang: 'en', path: enPath },
    { lang: 'ko', path: koPath },
    { lang: 'x-default', path: enPath }
  ];
}
