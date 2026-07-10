import fs from 'node:fs';
import path from 'node:path';

import type { Locale } from './products';

const blogContentDir = path.resolve(process.cwd(), 'src/content/blog');

export type BlogPostMeta = {
  title: string;
  cardTitle: string;
  slug: string;
  category: string;
  language: Locale;
  description: string;
  shortAnswer?: string;
  publishedAt?: string;
  updatedAt?: string;
  tags: string[];
  relatedApps: string[];
  relatedArticles: string[];
  relatedGuides: string[];
  imageSpecs: string[];
};

export type BlogPost = {
  meta: BlogPostMeta;
  sourcePath: string;
  body: string;
  href: string;
};

export type MarkdownBlock =
  | { type: 'p' | 'h2' | 'h3' | 'blockquote' | 'code' | 'image'; value: string; alt?: string; src?: string; caption?: string }
  | { type: 'ul' | 'ol'; value: string[] }
  | { type: 'table'; value: { headers: string[]; rows: string[][] } };

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

export function renderMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.split(/\r?\n/);
  let paragraph: string[] = [];
  let unordered: string[] = [];
  let ordered: string[] = [];
  let blockquote: string[] = [];
  let code: string[] = [];
  let inCodeBlock = false;

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
  const flushBlockquote = () => {
    if (!blockquote.length) return;
    blocks.push({ type: 'blockquote', value: blockquote.join(' ') });
    blockquote = [];
  };
  const flushCode = () => {
    blocks.push({ type: 'code', value: code.join('\n') });
    code = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushLists();
    flushBlockquote();
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        flushAll();
        inCodeBlock = true;
        code = [];
      }
      continue;
    }
    if (inCodeBlock) {
      code.push(line);
      continue;
    }
    if (!trimmed) {
      flushAll();
      continue;
    }
    const h2 = trimmed.match(/^##\s+(.+)$/);
    const h3 = trimmed.match(/^###\s+(.+)$/);
    const ul = trimmed.match(/^-\s+(.+)$/);
    const ol = trimmed.match(/^\d+\.\s+(.+)$/);
    const quote = trimmed.match(/^>\s?(.+)$/);
    const image = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)$/);
    if (h2) {
      flushAll();
      blocks.push({ type: 'h2', value: h2[1] });
    } else if (h3) {
      flushAll();
      blocks.push({ type: 'h3', value: h3[1] });
    } else if (image) {
      flushAll();
      blocks.push({ type: 'image', value: image[2], alt: image[1], src: image[2], caption: image[3] || image[1] });
    } else if (isTableStart(lines, index)) {
      flushAll();
      const table = readTable(lines, index);
      blocks.push({ type: 'table', value: table.value });
      index = table.endIndex;
    } else if (quote) {
      flushParagraph();
      flushLists();
      blockquote.push(quote[1]);
    } else if (ul) {
      flushParagraph();
      flushBlockquote();
      if (ordered.length) flushLists();
      unordered.push(ul[1]);
    } else if (ol) {
      flushParagraph();
      flushBlockquote();
      if (unordered.length) flushLists();
      ordered.push(ol[1]);
    } else if (!trimmed.startsWith('# ')) {
      flushLists();
      flushBlockquote();
      paragraph.push(trimmed);
    }
  }

  if (inCodeBlock) flushCode();
  flushAll();
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
    cardTitle: frontmatter.card_title || frontmatter.cardTitle || frontmatter.title || slug,
    slug,
    category: frontmatter.category || 'general',
    language,
    description: frontmatter.description || firstParagraph(body) || frontmatter.title || slug,
    shortAnswer: frontmatter.short_answer || frontmatter.shortAnswer || extractSection(body, 'Short Answer') || undefined,
    publishedAt: frontmatter.published_at || frontmatter.publishedAt || undefined,
    updatedAt: frontmatter.updated_at || frontmatter.updatedAt || undefined,
    tags: splitList(frontmatter.tags),
    relatedApps: splitList(frontmatter.related_apps || frontmatter.relatedApps),
    relatedArticles: splitList(frontmatter.related_articles || frontmatter.relatedArticles),
    relatedGuides: splitList(frontmatter.related_guides || frontmatter.relatedGuides),
    imageSpecs: splitList(frontmatter.image_specs || frontmatter.imageSpecs)
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

function isTableStart(lines: string[], index: number): boolean {
  const header = lines[index]?.trim();
  const separator = lines[index + 1]?.trim();
  return Boolean(
    header?.startsWith('|') &&
      header.endsWith('|') &&
      separator?.startsWith('|') &&
      separator.endsWith('|') &&
      /^(\|\s*:?-{3,}:?\s*)+\|$/.test(separator)
  );
}

function readTable(lines: string[], startIndex: number): { value: { headers: string[]; rows: string[][] }; endIndex: number } {
  const headers = splitTableRow(lines[startIndex]);
  const rows: string[][] = [];
  let index = startIndex + 2;
  for (; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.startsWith('|') || !line.endsWith('|')) break;
    rows.push(splitTableRow(line));
  }
  return { value: { headers, rows }, endIndex: index - 1 };
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}

function firstParagraph(markdown: string): string {
  for (const block of markdown.split(/\n\s*\n/)) {
    const trimmed = block.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-')) return trimmed.replace(/\s+/g, ' ');
  }
  return '';
}

function extractSection(markdown: string, heading: string): string {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start === -1) return '';
  const section: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s+/.test(line.trim())) break;
    const trimmed = line.trim();
    if (trimmed) section.push(trimmed);
  }
  return section.join(' ').replace(/\s+/g, ' ').trim();
}

function postDateValue(post: BlogPost): string {
  return post.meta.publishedAt || post.meta.updatedAt || '';
}
