import { getAllProductPages } from '../lib/products';

export function GET() {
  const paths = [
    '/',
    '/ko/',
    '/apps/',
    '/apps/ko/',
    ...getAllProductPages().map((page) => page.canonicalPath),
  ];
  const uniquePaths = paths.filter((value, index, all) => all.indexOf(value) === index);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniquePaths
  .map((path) => `  <url><loc>${new URL(path, 'https://onnelakin.github.io').toString()}</loc></url>`)
  .join('\n')}
</urlset>
`;
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' }
  });
}
