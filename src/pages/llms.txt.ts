import { getProductIndexItems } from '../lib/products';

const siteUrl = 'https://onnelakin.github.io';

export function GET() {
  const apps = getProductIndexItems('en');
  const lines = [
    '# ONNELLAB',
    '',
    'ONNELLAB is an independent software studio creating calm, structured apps for music, text, audio, files, and productivity.',
    '',
    '## Website',
    '',
    `- Home: ${siteUrl}/`,
    `- Korean home: ${siteUrl}/ko/`,
    `- Apps: ${siteUrl}/apps/`,
    `- RSS: ${siteUrl}/rss.xml`,
    `- Sitemap: ${siteUrl}/sitemap.xml`,
    '',
    '## Apps',
    '',
    ...apps.flatMap((app) => [
      `### ${app.title}`,
      '',
      app.description,
      '',
      `- Landing page: ${new URL(app.href, siteUrl).toString()}`,
      `- Privacy policy: ${app.privacy}`,
      `- Platforms: ${app.platforms.join(', ')}`,
      ''
    ]),
    '## Contact',
    '',
    '- Support: onnellab.app@gmail.com'
  ];
  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}
