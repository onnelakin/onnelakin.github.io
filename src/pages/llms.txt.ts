import {
  getProductPageData,
  getProductSources,
  landingSubtitle,
  pageBodyDescription,
  renderBlocks
} from '../lib/products';

const siteUrl = 'https://onnelakin.github.io';

export function GET() {
  const apps = getProductSources().map((source) => getProductPageData(source.slug, 'en'));
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
    ...apps.flatMap((app) => {
      const bodyBlocks = renderBlocks(pageBodyDescription(app.copy));
      const firstParagraph = bodyBlocks.find((block) => block.type === 'p')?.value as string | undefined;
      const tasks = bodyBlocks.find((block) => block.type === 'ul')?.value as string[] | undefined;
      const taskLines = (tasks ?? []).slice(0, 4).map((task) => `- ${task}`);
      return [
        `### ${app.meta.title}`,
        '',
        landingSubtitle(app.copy),
        '',
        firstParagraph ?? app.seoDescription,
        '',
        'Key tasks:',
        ...taskLines,
        '',
        `- Landing page: ${new URL(app.canonicalPath, siteUrl).toString()}`,
        `- Korean page: ${new URL(app.alternatePath, siteUrl).toString()}`,
        `- Privacy policy: ${app.meta.privacy}`,
        `- Platforms: ${app.meta.platforms.join(', ')}`,
        ...(app.meta.pricing ? [`- Pricing: ${app.meta.pricing}`] : []),
        ''
      ];
    }),
    '## Contact',
    '',
    '- Support: onnellab.app@gmail.com'
  ];
  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}
