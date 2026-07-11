import {
  getProductPageData,
  getProductSources,
  landingSubtitle,
  pageBodyDescription,
  renderBlocks
} from '../lib/products';
import { getBlogPosts, renderMarkdownBlocks, type BlogPost } from '../lib/blog';

const siteUrl = 'https://onnelakin.github.io';

function articleQuestion(post: BlogPost): string {
  const blocks = renderMarkdownBlocks(post.body);
  const questionHeadingIndex = blocks.findIndex(
    (block) => block.type === 'h2' && ['question', '질문'].includes(String(block.value).trim().toLowerCase())
  );
  if (questionHeadingIndex === -1) return post.meta.title;
  const answerBlock = blocks.slice(questionHeadingIndex + 1).find((block) => block.type === 'p');
  return answerBlock?.type === 'p' ? String(answerBlock.value) : post.meta.title;
}

export function GET() {
  const sources = getProductSources();
  const apps = sources.map((source) => getProductPageData(source.slug, 'en'));
  const koreanApps = sources.map((source) => getProductPageData(source.slug, 'ko'));
  const blogPosts = getBlogPosts();
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
    `- Privacy policies: ${siteUrl}/privacy/`,
    `- Korean privacy policies: ${siteUrl}/privacy/ko/`,
    `- Blog: ${siteUrl}/blog/`,
    `- Korean blog: ${siteUrl}/blog/ko/`,
    `- RSS: ${siteUrl}/rss.xml`,
    `- Sitemap: ${siteUrl}/sitemap.xml`,
    '',
    '## Blog Articles',
    '',
    ...blogPosts.flatMap((post) => [
      `### ${post.meta.title}`,
      '',
      post.meta.description,
      '',
      `- Primary question: ${articleQuestion(post)}`,
      `- Short answer: ${post.meta.shortAnswer || post.meta.description}`,
      `- Language: ${post.meta.language}`,
      `- Category: ${post.meta.category}`,
      `- Search intent: ${post.meta.language === 'ko' ? 'problem solving guide in Korean' : 'problem-solving guide'}`,
      `- Article: ${new URL(post.href, siteUrl).toString()}`,
      ...(post.meta.relatedApps.length ? [`- Related apps: ${post.meta.relatedApps.join(', ')}`] : []),
      ...(post.meta.tags.length ? [`- Tags: ${post.meta.tags.join(', ')}`] : []),
      ''
    ]),
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
    '## Korean App Summaries',
    '',
    ...koreanApps.flatMap((app) => {
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
        '주요 작업:',
        ...taskLines,
        '',
        `- 한국어 랜딩 페이지: ${new URL(app.canonicalPath, siteUrl).toString()}`,
        `- 영어 페이지: ${new URL(app.alternatePath, siteUrl).toString()}`,
        `- 개인정보 처리방침: ${app.meta.privacy}`,
        `- 지원 플랫폼: ${app.meta.platforms.join(', ')}`,
        ...(app.meta.pricing ? [`- 가격: ${app.meta.pricing}`] : []),
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
