import { getBlogPosts } from '../lib/blog';
import { getProductIndexItems } from '../lib/products';

const siteUrl = 'https://onnelakin.github.io';

type FeedItem = {
  title: string;
  href: string;
  description: string;
  pubDate?: string;
};

export function GET() {
  const appItems: FeedItem[] = getProductIndexItems('en').map((item) => ({
    title: item.title,
    href: item.href,
    description: item.description
  }));
  const blogItems: FeedItem[] = getBlogPosts().map((post) => ({
    title: post.meta.title,
    href: post.href,
    description: post.meta.description,
    pubDate: post.meta.publishedAt || post.meta.updatedAt
  }));
  const items = [...blogItems, ...appItems];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>ONNELLAB RSS</title>
    <link>${siteUrl}/</link>
    <description>ONNELLAB application pages and blog articles</description>
${items
  .map(
    (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${new URL(item.href, siteUrl).toString()}</link>
      <guid>${new URL(item.href, siteUrl).toString()}</guid>
      <description>${escapeXml(item.description)}</description>${item.pubDate ? `
      <pubDate>${new Date(item.pubDate).toUTCString()}</pubDate>` : ''}
    </item>`
  )
  .join('\n')}
  </channel>
</rss>
`;
  return new Response(body, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' }
  });
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;')
    .replaceAll("'", '&apos;');
}
