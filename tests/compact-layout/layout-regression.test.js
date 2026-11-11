import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CSS_PATH = fileURLToPath(new URL('../../src/App.css', import.meta.url));

function extractAtRules(source, name) {
  const rules = [];
  const marker = `@${name}`;
  let from = 0;

  while (from < source.length) {
    const start = source.indexOf(marker, from);
    if (start === -1) break;

    const brace = source.indexOf('{', start);
    if (brace === -1) break;

    let depth = 0;
    for (let i = brace; i < source.length; i += 1) {
      if (source[i] === '{') depth += 1;
      if (source[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          rules.push(source.slice(start, i + 1));
          from = i + 1;
          break;
        }
      }
    }
  }

  return rules;
}

function ruleBody(source, selector) {
  const start = source.indexOf(selector);
  if (start === -1) return '';
  const open = source.indexOf('{', start);
  const close = source.indexOf('}', open);
  if (open === -1 || close === -1) return '';
  return source.slice(open + 1, close);
}

test('section blocks use content-width container queries instead of viewport-only breakpoints', () => {
  const css = readFileSync(CSS_PATH, 'utf8');
  const sectionBlock = ruleBody(css, '.section-block');

  assert.match(sectionBlock, /container-type:\s*inline-size/, 'section blocks should establish an inline-size container');

  const containerRules = extractAtRules(css, 'container');
  assert.ok(containerRules.length > 0, 'expected a content-width @container rule');

  const compactRule = containerRules.find((rule) => (
    rule.includes('.section-body') &&
    rule.includes('.section-split-grid') &&
    rule.includes('.section-chart-grid')
  ));
  assert.ok(compactRule, 'compact container rule should collapse section body, split grid, and chart grid');

  assert.match(compactRule, /\.section-body\s*\{[^}]*grid-template-columns:\s*1fr/, 'section body should stack');
  assert.match(compactRule, /\.section-split-grid[\s\S]*?grid-template-columns:\s*1fr/, 'split grid should stack');
  assert.match(compactRule, /\.section-chart-grid[\s\S]*?grid-template-columns:\s*1fr/, 'chart grid should stack');
});

test('Monthly View inline two-column rows are also collapsed by the container rule', () => {
  const css = readFileSync(CSS_PATH, 'utf8');
  const containerRules = extractAtRules(css, 'container');
  const compactRule = containerRules.find((rule) => rule.includes('.section-body'));

  assert.ok(compactRule, 'expected a compact container rule');
  assert.match(
    compactRule,
    /\.section-body\s*>\s*div:last-child\s*>\s*div\s*\{[^}]*grid-template-columns:\s*1fr\s*!important/,
    'Monthly View rows with inline grid templates must be overridden without changing its markup',
  );
});

test('old viewport thresholds no longer own the section layout', () => {
  const css = readFileSync(CSS_PATH, 'utf8');
  const mediaRules = extractAtRules(css, 'media');

  assert.equal(
    mediaRules.some((rule) => /max-width:\s*1000px/.test(rule) && rule.includes('.section-body')),
    false,
    'section-body should not keep a viewport-only 1000px collapse',
  );
  assert.equal(
    mediaRules.some((rule) => /max-width:\s*900px/.test(rule) && rule.includes('.section-split-grid')),
    false,
    'section grids should not keep viewport-only 900px collapse rules',
  );
});
