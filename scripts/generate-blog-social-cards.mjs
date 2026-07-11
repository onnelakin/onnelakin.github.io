import fs from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';

const root = process.cwd();
const assetsRoot = path.join(root, 'public', 'blog-assets');
const expectedWidth = 1200;
const expectedHeight = 675;
const checkOnly = process.argv.includes('--check');

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findWorkflowDiagrams() {
  const entries = [];
  for (const locale of ['en', 'ko']) {
    const localeDir = path.join(assetsRoot, locale);
    if (!(await exists(localeDir))) continue;
    for (const slugEntry of await fs.readdir(localeDir, { withFileTypes: true })) {
      if (!slugEntry.isDirectory()) continue;
      const svgPath = path.join(localeDir, slugEntry.name, 'workflow-diagram.svg');
      if (await exists(svgPath)) entries.push({ locale, slug: slugEntry.name, svgPath });
    }
  }
  return entries;
}

async function pngDimensions(filePath) {
  const buffer = await fs.readFile(filePath);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error(`${filePath} is not a PNG file`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

async function assertFreshPng(svgPath, pngPath) {
  if (!(await exists(pngPath))) throw new Error(`missing social card: ${path.relative(root, pngPath)}`);
  const [svgStat, pngStat, dimensions] = await Promise.all([
    fs.stat(svgPath),
    fs.stat(pngPath),
    pngDimensions(pngPath)
  ]);
  if (pngStat.mtimeMs + 1000 < svgStat.mtimeMs) {
    throw new Error(`stale social card: ${path.relative(root, pngPath)}`);
  }
  if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) {
    throw new Error(
      `invalid social card size for ${path.relative(root, pngPath)}: ${dimensions.width}x${dimensions.height}`
    );
  }
}

async function renderCard(page, svgPath, pngPath) {
  const svg = await fs.readFile(svgPath, 'utf8');
  await page.setViewportSize({ width: expectedWidth, height: expectedHeight });
  await page.setContent(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      html,
      body {
        width: ${expectedWidth}px;
        height: ${expectedHeight}px;
        margin: 0;
        overflow: hidden;
        background: #fbf7ef;
      }
      svg {
        display: block;
        width: ${expectedWidth}px;
        height: ${expectedHeight}px;
      }
    </style>
  </head>
  <body>${svg}</body>
</html>`);
  await page.screenshot({
    path: pngPath,
    type: 'png',
    clip: { x: 0, y: 0, width: expectedWidth, height: expectedHeight }
  });
}

const diagrams = await findWorkflowDiagrams();
if (diagrams.length === 0) {
  console.log('No blog workflow diagrams found.');
  process.exit(0);
}

if (checkOnly) {
  for (const { svgPath } of diagrams) {
    await assertFreshPng(svgPath, path.join(path.dirname(svgPath), 'social-card.png'));
  }
  console.log(`Checked ${diagrams.length} blog social card${diagrams.length === 1 ? '' : 's'}.`);
  process.exit(0);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: expectedWidth, height: expectedHeight }, deviceScaleFactor: 1 });
  for (const { locale, slug, svgPath } of diagrams) {
    const pngPath = path.join(path.dirname(svgPath), 'social-card.png');
    await renderCard(page, svgPath, pngPath);
    await assertFreshPng(svgPath, pngPath);
    console.log(path.relative(root, pngPath));
  }
  await page.close();
} finally {
  await browser.close();
}
