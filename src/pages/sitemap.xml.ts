import fs from 'node:fs';
import path from 'node:path';

import { getProductSources } from '../lib/products';

type SitemapEntry = {
  path: string;
  lastmod: string;
  alternates?: Array<{ lang: string; path: string }>;
};

const siteUrl = 'https://onnelakin.github.io';

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
