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
  pricing?: string;
  price?: number;
  priceCurrency?: string;
  accent?: ProductAccent;
};

export type PlatformCopy = {
  name?: string;
  shortDescription?: string;
  subtitle?: string;
  promo?: string;
  landingSubtitle?: string;
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
  screenshotPaths: string[];
  accent: ProductAccent;
};

export type ProductIndexItem = {
  slug: string;
  title: string;
  status: string;
  platforms: string[];
  description: string;
  iconPath: string;
  screenshotPath?: string;
  href: string;
  privacy: string;
  hasStoreListing: boolean;
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
  { border: '#d2d6c7', background: '#f4f6ed', text: '#5a6246' },
  { border: '#d6c9c9', background: '#f7efef', text: '#6b4f4f' },
  { border: '#c8d6cf', background: '#eef6f2', text: '#4a6357' },
  { border: '#d8d4c9', background: '#f7f4ec', text: '#655f4d' },
  { border: '#cfd2dc', background: '#f1f3f8', text: '#505b73' },
  { border: '#d6cdd2', background: '#f7f0f3', text: '#674f5b' }
];

const appAccentOverrides: Record<string, ProductAccent> = {
  tagweaver: { border: '#ded2b5', background: '#fbf7ec', text: '#6a5a2e' },
  vaultxt: { border: '#c8d6cf', background: '#eef6f2', text: '#4a6357' },
  clipnest: { border: '#d6c9c9', background: '#f7efef', text: '#6b4f4f' }
};

const fieldLabels = {
  name: '앱 이름:',
  landingSubtitle: '랜딩 부제:',
  landingSubtitleEn: 'Landing subtitle:',
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
  const seoDescription = seoPageDescription(source, copy);
  const canonicalPath = locale === 'en' ? `/apps/${source.slug}/` : `/apps/${source.slug}/ko/`;
  return {
    locale,
    source,
    meta: source.meta,
    copy,
    canonicalPath,
    alternatePath: locale === 'en' ? `/apps/${source.slug}/ko/` : `/apps/${source.slug}/`,
    seoTitle: productSeoTitle(source, copy),
    seoDescription,
    iconPath: getIconRoutePath(source),
    screenshotPaths: getScreenshotRoutePaths(source, locale),
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
      description: landingSubtitle(copy),
      iconPath: getIconRoutePath(source),
      screenshotPath: getScreenshotRoutePaths(source, locale)[0],
      href: locale === 'en' ? `/apps/${source.slug}/` : `/apps/${source.slug}/ko/`,
      privacy: source.meta.privacy,
      hasStoreListing: Boolean(source.meta.appstore || source.meta.googleplay),
      accent: productAccent(source)
    };
  });
}

export function productAccent(source: ProductSource): ProductAccent {
  return (
    source.meta.accent ??
    appAccentOverrides[source.slug] ??
    accentPalette[hashSlug(source.slug) % accentPalette.length]
  );
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

export function getAppAssets(): Array<{ routePath: string; filePath: string }> {
  return [
    ...getIconAssets(),
    ...getScreenshotAssets()
  ];
}

function getScreenshotRoutePaths(source: ProductSource, locale: Locale): string[] {
  const screenshotDir = path.resolve(source.contentDir, 'assets/screenshots', locale);
  if (!fs.existsSync(screenshotDir)) return [];
  return fs
    .readdirSync(screenshotDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:png|jpg|jpeg|webp)$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((fileName) => `/app-assets/${source.slug}/assets/screenshots/${locale}/${fileName}`);
}

function getScreenshotAssets(): Array<{ routePath: string; filePath: string }> {
  return getProductSources().flatMap((source) =>
    (['en', 'ko'] as const).flatMap((locale) =>
      getScreenshotRoutePaths(source, locale).map((routePath) => ({
        routePath: routePath.replace(/^\/+/, ''),
        filePath: path.resolve(source.contentDir, routePath.replace(`/app-assets/${source.slug}/`, ''))
      }))
    )
  );
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
    pricing: values.get('pricing'),
    price: optionalNumber(values.get('price')),
    priceCurrency: values.get('priceCurrency'),
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
    landingSubtitle:
      field(text, fieldLabels.landingSubtitle) ?? field(text, fieldLabels.landingSubtitleEn),
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

function seoPageDescription(source: ProductSource, copy: ProductCopy): string {
  const summary = pageDescription(copy).replace(/\s+/g, ' ').trim();
  const platforms = copy.locale === 'ko'
    ? source.meta.platforms.join('/')
    : source.meta.platforms.join(' and ');
  const category = landingSubtitle(copy);
  if (copy.locale === 'ko') {
    return `${source.meta.title}는 ${platforms}용 ${category}입니다. ${summary}`;
  }
  return `${source.meta.title} is ${indefiniteArticle(category)} ${category} for ${platforms}. ${summary}`;
}

function productSeoTitle(source: ProductSource, copy: ProductCopy): string {
  const subtitle = landingSubtitle(copy).replace(/\s+/g, ' ').trim();
  if (!subtitle || subtitle.toLowerCase() === source.meta.title.toLowerCase()) {
    return source.meta.title;
  }
  return `${source.meta.title} - ${subtitle}`;
}

function indefiniteArticle(value: string): 'a' | 'an' {
  if (/^MP3\b/.test(value)) return 'an';
  return /^[aeiou]/i.test(value) ? 'an' : 'a';
}

export function landingSubtitle(copy: ProductCopy): string {
  return (
    copy.android.landingSubtitle ??
    copy.ios.landingSubtitle ??
    pageDescription(copy)
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

function optionalNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function hashSlug(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}
