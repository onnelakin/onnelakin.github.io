import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const fixtureDir = path.join(root, 'src/content/blog/en');
const fixturePath = path.join(fixtureDir, 'template-contract.md');
const relatedFixturePath = path.join(fixtureDir, 'template-contract-related.md');
const outputPath = path.join(root, 'dist/blog/en/template-contract/index.html');
const relatedOutputPath = path.join(root, 'dist/blog/en/template-contract-related/index.html');
const indexPath = path.join(root, 'dist/blog/en/index.html');

after(() => {
  fs.rmSync(fixturePath, { force: true });
  fs.rmSync(relatedFixturePath, { force: true });
  execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'pipe' });
});

test('blog article template renders publishing metadata without committing sample posts', () => {
  fs.mkdirSync(fixtureDir, { recursive: true });
  fs.writeFileSync(
    fixturePath,
    `---
title: "How to Keep a Very Long ONNELLAB Workflow Article Title Readable on Mobile and Desktop"
card_title: "Readable Workflow Article Title"
slug: "template-contract"
category: "productivity"
language: "en"
description: "A template contract fixture used only during tests with a deliberately long supporting sentence that checks whether the header remains readable without swallowing the article body."
short_answer: "Use a concise answer block, restrained metadata, related recommendations, readable tables, calm callouts, code examples, and image captions before the body becomes dense."
published_at: "2026-07-11"
updated_at: "2026-07-12"
tags: "workflow|template"
related_apps: "VaultXT|ClipNest"
related_articles: "How to plan offline text workflows => /blog/en/offline-text-workflows/|How to structure clipboard notes => /blog/en/clipboard-notes/"
related_guides: "Large text editing guide => /blog/en/large-text-editing/|Clipboard workflow guide => /blog/en/clipboard-workflow/"
image_specs: "Workflow diagram for the full process|Comparison diagram for tool choices"
---

# How to Keep a Very Long ONNELLAB Workflow Article Title Readable on Mobile and Desktop

## Question

How should this template organize a long article?

## Short Answer

This section should feed the summary box and should not appear again in the body.

## Recommended Workflow

- Start with the reader problem.
- Show the lowest-risk workflow.
- Link to the matching [ONNELLAB application](/apps/vaultxt/).

> Keep the callout short enough to scan before the reader reaches the detailed workflow.

| Element | Purpose |
| --- | --- |
| Summary | Answers the core question quickly |
| Related apps | Connects the workflow to a concrete ONNELLAB utility |

\`\`\`
topics.csv -> markdown draft -> image_spec.json -> published page
\`\`\`

![Workflow placeholder](/app-assets/vaultxt/assets/screenshots/en/1.png "Caption text for a future generated workflow image")

## FAQ

### Should FAQ answers be rendered as normal paragraphs?

No. FAQ questions should become collapsible details so long articles stay easy to scan.

### Can related recommendations include URLs?

Yes. The template should render recommendation metadata as links when a URL is provided.
`,
    'utf-8'
  );

  execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'pipe' });

  const html = fs.readFileSync(outputPath, 'utf-8');
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');
  assert.match(html, /How to Keep a Very Long ONNELLAB Workflow Article Title/);
  assert.ok(html.includes('href="https://onnelakin.github.io/favicon.svg?v=20260712-transparent"'));
  assert.ok(html.includes('href="https://onnelakin.github.io/favicon-32x32.png?v=20260712-transparent"'));
  assert.ok(html.includes('href="https://onnelakin.github.io/apple-touch-icon.png?v=20260712-transparent"'));
  assert.ok(html.includes('href="https://onnelakin.github.io/site.webmanifest?v=20260712-transparent"'));
  assert.match(html, /<meta name="theme-color" content="#f8f4ec">/);
  assert.match(indexHtml, /Readable Workflow Article Title/);
  assert.doesNotMatch(indexHtml, /How to Keep a Very Long ONNELLAB Workflow Article Title Readable on Mobile and Desktop/);
  assert.match(html, /Use a concise answer block/);
  assert.match(html, /Published 2026-07-11/);
  assert.match(html, /Updated 2026-07-12/);
  assert.match(html, /Next reading/);
  assert.match(html, /recommendation-card/);
  assert.match(html, /Related guides/);
  assert.doesNotMatch(html, /Image plan/);
  assert.doesNotMatch(html, /Workflow diagram for the full process/);
  assert.match(html, /<blockquote\b/);
  assert.match(html, /<table\b/);
  assert.match(html, /<details/);
  assert.match(html, /<summary[^>]*>Should FAQ answers be rendered as normal paragraphs\?/);
  assert.match(html, /href="\/blog\/en\/offline-text-workflows\/"/);
  assert.match(html, /href="\/apps\/vaultxt\/"[^>]*>ONNELLAB application/);
  assert.match(html, /article-image-viewer/);
  assert.match(html, /data-article-image-trigger/);
  assert.match(html, /topics.csv -&gt; markdown draft/);
  assert.match(html, /Caption text for a future generated workflow image/);
  assert.doesNotMatch(html, />Short Answer</);
});

test('blog article template renders next-reading cards when a public related post exists', () => {
  fs.mkdirSync(fixtureDir, { recursive: true });
  fs.writeFileSync(
    relatedFixturePath,
    `---
title: "Offline Text Workflow Guide"
card_title: "Offline Text Workflow Guide"
slug: "template-contract-related"
category: "reading"
language: "en"
description: "A related fixture that behaves like a second public article."
short_answer: "Keep the article available as a public related destination."
published_at: "2026-07-10"
updated_at: "2026-07-10"
tags: "reading|workflow"
---

# Offline Text Workflow Guide

## Question

How should a second public article behave?

## Short Answer

It should be available as a link target for the next-reading card test.
`,
    'utf-8'
  );
  fs.writeFileSync(
    fixturePath,
    `---
title: "Readable Public Article"
card_title: "Readable Public Article"
slug: "template-contract"
category: "reading"
language: "en"
description: "A fixture that verifies actual public related article cards."
short_answer: "Show a concrete next-reading card when related article metadata points at a public article."
published_at: "2026-07-11"
updated_at: "2026-07-11"
tags: "reading|workflow"
related_articles: "Offline Text Workflow Guide => /blog/en/template-contract-related/"
---

# Readable Public Article

## Question

How should related articles appear?

## Short Answer

They should appear as linked cards after the article body.
`,
    'utf-8'
  );

  execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'pipe' });

  const html = fs.readFileSync(outputPath, 'utf-8');
  const relatedHtml = fs.readFileSync(relatedOutputPath, 'utf-8');
  assert.match(relatedHtml, /Offline Text Workflow Guide/);
  assert.match(html, /Next reading/);
  assert.match(html, /recommendation-card/);
  assert.match(html, /href="\/blog\/en\/template-contract-related\/"/);
  assert.match(html, /Offline Text Workflow Guide/);
});
