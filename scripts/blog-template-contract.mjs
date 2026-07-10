import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const fixtureDir = path.join(root, 'src/content/blog/en');
const fixturePath = path.join(fixtureDir, 'template-contract.md');
const outputPath = path.join(root, 'dist/blog/en/template-contract/index.html');

after(() => {
  fs.rmSync(fixturePath, { force: true });
  execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'pipe' });
});

test('blog article template renders publishing metadata without committing sample posts', () => {
  fs.mkdirSync(fixtureDir, { recursive: true });
  fs.writeFileSync(
    fixturePath,
    `---
title: "How to Keep a Very Long ONNELLAB Workflow Article Title Readable on Mobile and Desktop"
slug: "template-contract"
category: "productivity"
language: "en"
description: "A template contract fixture used only during tests with a deliberately long supporting sentence that checks whether the header remains readable without swallowing the article body."
short_answer: "Use a concise answer block, restrained metadata, related recommendations, readable tables, calm callouts, code examples, and image captions before the body becomes dense."
published_at: "2026-07-11"
updated_at: "2026-07-12"
tags: "workflow|template"
related_apps: "VaultXT|ClipNest"
related_articles: "How to plan offline text workflows|How to structure clipboard notes"
related_guides: "Large text editing guide|Clipboard workflow guide"
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
- Link to the matching ONNELLAB application.

> Keep the callout short enough to scan before the reader reaches the detailed workflow.

| Element | Purpose |
| --- | --- |
| Summary | Answers the core question quickly |
| Related apps | Connects the workflow to a concrete ONNELLAB utility |

\`\`\`
topics.csv -> markdown draft -> image_spec.json -> published page
\`\`\`

![Workflow placeholder](/app-assets/vaultxt/assets/screenshots/en/1.png "Caption text for a future generated workflow image")
`,
    'utf-8'
  );

  execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'pipe' });

  const html = fs.readFileSync(outputPath, 'utf-8');
  assert.match(html, /How to Keep a Very Long ONNELLAB Workflow Article Title/);
  assert.match(html, /Use a concise answer block/);
  assert.match(html, /Related articles/);
  assert.match(html, /Related guides/);
  assert.match(html, /Image plan/);
  assert.match(html, /Workflow diagram for the full process/);
  assert.match(html, /<blockquote\b/);
  assert.match(html, /<table\b/);
  assert.match(html, /topics.csv -&gt; markdown draft/);
  assert.match(html, /Caption text for a future generated workflow image/);
  assert.doesNotMatch(html, />Short Answer</);
});
