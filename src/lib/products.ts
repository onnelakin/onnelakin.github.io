import fs from 'node:fs';
import path from 'node:path';

const appsContentDir = path.resolve(process.cwd(), 'src/content/apps');

export type Locale = 'en' | 'ko';

export type ProductMeta = {
  title: string;
  status: string;
  platforms: string[];
  appstore: string;
  googleplay?: string;
  privacy: string;
  supportEmail: string;
  icon: string;
  accent?: ProductAccent;
};

export type PlatformCopy = {
  name?: string;
  shortDescription?: string;
  subtitle?: string;
  promo?: string;
  landingDescription?: string;
  description: string;
  keywords?: string;
};

export type ProductCopy = {
  locale: Locale;
  android: PlatformCopy;
  ios: PlatformCopy;
};

export type ProductSource = {
  slug: string;
  contentDir: string;
  meta: ProductMeta;
};

export type ProductPageData = {
  locale: Locale;
  source: ProductSource;
  meta: ProductMeta;
  copy: ProductCopy;
  canonicalPath: string;
  alternatePath: string;
  seoTitle: string;
  seoDescription: string;
  iconPath: string;
  accent: ProductAccent;
};

export type ProductIndexItem = {
  slug: string;
  title: string;
  status: string;
  platforms: string[];
  description: string;
  iconPath: string;
  href: string;
  privacy: string;
  accent: ProductAccent;
};

export type ProductAccent = {
  border: string;
  background: string;
  text: string;
};

const accentPalette: ProductAccent[] = [
  { border: '#cfd8cc', background: '#f3f6ef', text: '#4d6248' },
  { border: '#d9cfc7', background: '#f7f1ec', text: '#6a5548' },
  { border: '#d5d1c4', background: '#f6f3ea', text: '#635d48' },
  { border: '#cbd6d7', background: '#eef5f5', text: '#486163' },
  { border: '#d7cfdb', background: '#f4eff5', text: '#614f68' },
  { border: '#cdd3dc', background: '#f0f3f7', text: '#4b5b70' },
  { border: '#d8d0c5', background: '#f7f2eb', text: '#665846' },
  { border: '#d2d6c7', background: '#f4f6ed', text: '#5a6246' }
];

const fieldLabels = {
  name: '앱 이름:',
  shortDescription: '간단한 설명:',
  detailedDescription: '자세한 설명:',
  landingDescription: '랜딩 페이지:',
  landingDescriptionEn: 'Landing page:',
  subtitle: '부제:',
  promo: '프로모션 텍스트:',
  description: '설명:',
  keywords: '키워드:'
};

export function getProductSources(): ProductSource[] {
  if (!fs.existsSync(appsContentDir)) return [];
  return fs
    .readdirSync(appsContentDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const contentDir = path.join(appsContentDir, entry.name);
      return {
        slug: entry.name,
        contentDir,
        meta: readProductMeta(contentDir)
      };
    })
    .sort((a, b) => a.meta.title.localeCompare(b.meta.title));
}

export function getProductPageData(slug: string, locale: Locale): ProductPageData {
  const source = getProductSource(slug);
  const copy = readProductCopy(source.contentDir, locale);
  const seoDescription = pageDescription(copy);
  const canonicalPath = locale === 'en' ? `/apps/${source.slug}/` : `/apps/${source.slug}/ko/`;
  return {
    locale,
    source,
    meta: source.meta,
    copy,
    canonicalPath,
    alternatePath: locale === 'en' ? `/apps/${source.slug}/ko/` : `/apps/${source.slug}/`,
    seoTitle: source.meta.title,
    seoDescription,
    iconPath: getIconRoutePath(source),
    accent: productAccent(source)
  };
}

export function getProductIndexItems(locale: Locale): ProductIndexItem[] {
  return getProductSources().map((source) => {
    const copy = readProductCopy(source.contentDir, locale);
    return {
      slug: source.slug,
      title: source.meta.title,
      status: source.meta.status,
      platforms: source.meta.platforms,
      description: pageDescription(copy),
      iconPath: getIconRoutePath(source),
      href: locale === 'en' ? `/apps/${source.slug}/` : `/apps/${source.slug}/ko/`,
      privacy: source.meta.privacy,
      accent: productAccent(source)
    };
  });
}

export function productAccent(source: ProductSource): ProductAccent {
  return source.meta.accent ?? accentPalette[hashSlug(source.slug) % accentPalette.length];
}

export function pageBodyDescription(copy: ProductCopy): string {
  return (
    copy.android.landingDescription ||
    copy.ios.landingDescription ||
    copy.android.description ||
    copy.ios.description
  );
}

export function getProductSource(slug: string): ProductSource {
  const source = getProductSources().find((item) => item.slug === slug);
  if (!source) throw new Error(`Unknown product slug: ${slug}`);
  return source;
}

export function getAllProductPages(): ProductPageData[] {
  return getProductSources().flatMap((source) =>
    (['en', 'ko'] as const).map((locale) => getProductPageData(source.slug, locale))
  );
}

export function getIconRoutePath(source: ProductSource): string {
  return `/app-assets/${source.slug}/${normalizeDocPath(source.meta.icon)}`;
}

export function getIconFilePath(source: ProductSource): string {
  return path.resolve(source.contentDir, normalizeDocPath(source.meta.icon));
}

export function getIconAssets(): Array<{ routePath: string; filePath: string }> {
  return getProductSources().map((source) => ({
    routePath: getIconRoutePath(source).replace(/^\/+/, ''),
    filePath: getIconFilePath(source)
  }));
}

export function renderBlocks(text: string): Array<{ type: 'p' | 'h' | 'ul'; value: string | string[] }> {
  const blocks: Array<{ type: 'p' | 'h' | 'ul'; value: string | string[] }> = [];
  const lines = text.split(/\r?\n/);
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const value = paragraph.join(' ').trim();
    if (value) blocks.push({ type: 'p', value });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length === 0) return;
    blocks.push({ type: 'ul', value: list });
    list = [];
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }
    if (trimmed.startsWith('•') || trimmed.startsWith('* ')) {
      flushParagraph();
      list.push(trimmed.replace(/^(?:•|\*)\s*/, '').trim());
      continue;
    }
    if (trimmed.includes(' * ')) {
      const [first, ...items] = trimmed.split(/\s+\*\s+/);
      if (first.trim()) {
        flushList();
        paragraph.push(first.trim());
        flushParagraph();
      } else {
        flushParagraph();
      }
      list.push(...items.map((item) => item.trim()).filter(Boolean));
      continue;
    }
    flushList();
    if (isSectionHeading(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'h', value: trimmed.replace(/:$/, '') });
      continue;
    }
    paragraph.push(trimmed);
  }
  flushParagraph();
  flushList();
  return blocks;
}

function readProductMeta(contentDir: string): ProductMeta {
  const raw = fs.readFileSync(path.join(contentDir, 'app.md'), 'utf8');
  const lines = raw.split(/\r?\n/);
  const values = new Map<string, string>();
  const platforms: string[] = [];
  let currentList: string | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.endsWith(':') && !trimmed.startsWith('-')) {
      currentList = trimmed.slice(0, -1);
      continue;
    }
    if (trimmed.startsWith('- ') && currentList === 'platforms') {
      platforms.push(trimmed.slice(2).trim());
      continue;
    }
    const index = trimmed.indexOf(':');
    if (index <= 0) continue;
    currentList = null;
    values.set(trimmed.slice(0, index).trim(), trimmed.slice(index + 1).trim());
  }
  return {
    title: required(values, 'title'),
    status: required(values, 'status'),
    platforms,
    appstore: required(values, 'appstore'),
    googleplay: values.get('googleplay'),
    privacy: required(values, 'privacy'),
    supportEmail: required(values, 'supportEmail'),
    icon: required(values, 'icon'),
    accent: optionalAccent(values.get('accent'))
  };
}

function readProductCopy(contentDir: string, locale: Locale): ProductCopy {
  const fileName = locale === 'en' ? 'description-en.md' : 'description-ko.md';
  const raw = fs.readFileSync(path.join(contentDir, fileName), 'utf8');
  return {
    locale,
    android: parsePlatformCopy(section(raw, 'Android')),
    ios: parsePlatformCopy(section(raw, 'ios'))
  };
}

function parsePlatformCopy(text: string): PlatformCopy {
  return {
    name: field(text, fieldLabels.name),
    shortDescription: field(text, fieldLabels.shortDescription),
    subtitle: field(text, fieldLabels.subtitle),
    promo: field(text, fieldLabels.promo),
    landingDescription:
      field(text, fieldLabels.landingDescription) ?? field(text, fieldLabels.landingDescriptionEn),
    description:
      field(text, fieldLabels.detailedDescription) ?? field(text, fieldLabels.description) ?? '',
    keywords: field(text, fieldLabels.keywords)
  };
}

function pageDescription(copy: ProductCopy): string {
  return (
    copy.android.shortDescription ??
    copy.ios.subtitle ??
    copy.ios.promo ??
    firstParagraph(pageBodyDescription(copy))
  );
}

function section(raw: string, marker: string): string {
  const normalizedMarker = marker.toLowerCase();
  const lines = raw.split(/\r?\n/);
  const start = lines.findIndex(
    (line) => line.trim().toLowerCase() === normalizedMarker
  );
  if (start < 0) return '';
  const end = lines.findIndex((line, index) => {
    if (index <= start) return false;
    const value = line.trim().toLowerCase();
    return value === 'android' || value === 'ios';
  });
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n').trim();
}

function field(text: string, label: string): string | undefined {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === label);
  if (start < 0) return undefined;
  const end = lines.findIndex((line, index) => {
    if (index <= start) return false;
    return Object.values(fieldLabels).includes(line.trim());
  });
  const value = lines
    .slice(start + 1, end < 0 ? undefined : end)
    .join('\n')
    .trim();
  return value || undefined;
}

function isSectionHeading(value: string): boolean {
  if (value.endsWith(':')) return true;
  if (value.includes('.') || value.includes('!') || value.includes('?')) return false;
  return value.length <= 44;
}

function firstParagraph(text: string): string {
  return text.split(/\n\s*\n/)[0]?.replace(/\s+/g, ' ').trim() ?? '';
}

function required(values: Map<string, string>, key: string): string {
  const value = values.get(key);
  if (!value) throw new Error(`Missing app.md field: ${key}`);
  return value;
}

function normalizeDocPath(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\/+/, '');
}

function optionalAccent(value: string | undefined): ProductAccent | undefined {
  if (!value) return undefined;
  const [border, background, text] = value.split(',').map((item) => item.trim());
  if (!border || !background || !text) return undefined;
  if (![border, background, text].every((item) => /^#[0-9a-fA-F]{6}$/.test(item))) return undefined;
  return { border, background, text };
}

function hashSlug(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}
