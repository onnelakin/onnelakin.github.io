import fs from 'node:fs';
import path from 'node:path';

import type { Locale } from './products';

const blogContentDir = path.resolve(process.cwd(), 'src/content/blog');

export type BlogPostMeta = {
  title: string;
  slug: string;
  category: string;
  language: Locale;
  description: string;
  publishedAt?: string;
  updatedAt?: string;
  tags: string[];
  relatedApps: string[];
};

export type BlogPost = {
  meta: BlogPostMeta;
  sourcePath: string;
  body: string;
  href: string;
};

export function getBlogPosts(locale?: Locale): BlogPost[] {
  if (!fs.existsSync(blogContentDir)) return [];
  const locales = locale ? [locale] : (['en', 'ko'] as const);
  return locales
    .flatMap((language) => readLocalePosts(language))
    .sort((a, b) => postDateValue(b).localeCompare(postDateValue(a)) || a.meta.title.localeCompare(b.meta.title));
}

export function getBlogPost(slug: string, locale: Locale): BlogPost {
  const post = getBlogPosts(locale).find((item) => item.meta.slug === slug);
  if (!post) throw new Error(`Unknown blog post: ${locale}/${slug}`);
  return post;
}

export function getAllBlogPages(): BlogPost[] {
  return getBlogPosts();
}

export function renderMarkdownBlocks(markdown: string): Array<{ type: 'p' | 'h2' | 'h3' | 'ul' | 'ol'; value: string | string[] }> {
  const blocks: Array<{ type: 'p' | 'h2' | 'h3' | 'ul' | 'ol'; value: string | string[] }> = [];
  const lines = markdown.split(/\r?\n/);
  let paragraph: string[] = [];
  let unordered: string[] = [];
  let ordered: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: 'p', value: paragraph.join(' ') });
    paragraph = [];
  };
  const flushLists = () => {
    if (unordered.length) blocks.push({ type: 'ul', value: unordered });
    if (ordered.length) blocks.push({ type: 'ol', value: ordered });
    unordered = [];
    ordered = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushLists();
      continue;
    }
    const h2 = trimmed.match(/^##\s+(.+)$/);
    const h3 = trimmed.match(/^###\s+(.+)$/);
    const ul = trimmed.match(/^-\s+(.+)$/);
    const ol = trimmed.match(/^\d+\.\s+(.+)$/);
    if (h2) {
      flushParagraph();
      flushLists();
      blocks.push({ type: 'h2', value: h2[1] });
    } else if (h3) {
      flushParagraph();
      flushLists();
      blocks.push({ type: 'h3', value: h3[1] });
    } else if (ul) {
      flushParagraph();
      if (ordered.length) flushLists();
      unordered.push(ul[1]);
    } else if (ol) {
      flushParagraph();
      if (unordered.length) flushLists();
      ordered.push(ol[1]);
    } else if (!trimmed.startsWith('# ')) {
      flushLists();
      paragraph.push(trimmed);
    }
  }

  flushParagraph();
  flushLists();
  return blocks;
}

function readLocalePosts(locale: Locale): BlogPost[] {
  const localeDir = path.join(blogContentDir, locale);
  if (!fs.existsSync(localeDir)) return [];
  return fs
    .readdirSync(localeDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => readPost(path.join(localeDir, entry.name), locale));
}

function readPost(filePath: string, fallbackLanguage: Locale): BlogPost {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(raw);
  const slug = frontmatter.slug || path.basename(filePath, '.md');
  const language = frontmatter.language === 'ko' ? 'ko' : frontmatter.language === 'en' ? 'en' : fallbackLanguage;
  const meta: BlogPostMeta = {
    title: frontmatter.title || slug,
    slug,
    category: frontmatter.category || 'general',
    language,
    description: frontmatter.description || firstParagraph(body) || frontmatter.title || slug,
    publishedAt: frontmatter.published_at || frontmatter.publishedAt || undefined,
    updatedAt: frontmatter.updated_at || frontmatter.updatedAt || undefined,
    tags: splitList(frontmatter.tags),
    relatedApps: splitList(frontmatter.related_apps || frontmatter.relatedApps)
  };
  return {
    meta,
    sourcePath: filePath,
    body,
    href: language === 'ko' ? `/blog/ko/${slug}/` : `/blog/en/${slug}/`
  };
}

function parseFrontmatter(raw: string): { frontmatter: Record<string, string>; body: string } {
  if (!raw.startsWith('---\n')) return { frontmatter: {}, body: raw };
  const end = raw.indexOf('\n---\n', 4);
  if (end === -1) return { frontmatter: {}, body: raw };
  const frontmatter: Record<string, string> = {};
  for (const line of raw.slice(4, end).split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['\"]|['\"]$/g, '');
    frontmatter[key] = value;
  }
  return { frontmatter, body: raw.slice(end + 5).trim() };
}

function splitList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstParagraph(markdown: string): string {
  for (const block of markdown.split(/\n\s*\n/)) {
    const trimmed = block.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-')) return trimmed.replace(/\s+/g, ' ');
  }
  return '';
}

function postDateValue(post: BlogPost): string {
  return post.meta.publishedAt || post.meta.updatedAt || '';
}
