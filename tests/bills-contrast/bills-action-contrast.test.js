import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CSS_PATH = fileURLToPath(new URL('../../src/App.css', import.meta.url));

function ruleBody(source, selector) {
  const start = source.indexOf(selector);
  if (start === -1) return '';
  const open = source.indexOf('{', start);
  const close = source.indexOf('}', open);
  if (open === -1 || close === -1) return '';
  return source.slice(open + 1, close);
}

function ruleSelector(source, selector) {
  const start = source.indexOf(selector);
  if (start === -1) return '';
  const open = source.indexOf('{', start);
  if (open === -1) return '';
  return source.slice(start, open).trim();
}

test('bills action buttons set an explicit theme text color in their default state', () => {
  const css = readFileSync(CSS_PATH, 'utf8');
  const body = ruleBody(css, '.bills-action-btn');

  assert.ok(body, 'expected a .bills-action-btn rule');
  assert.match(
    body,
    /color:\s*var\(--(?:muted|text|danger)\)/,
    'labeled Edit/Delete bill actions must not fall back to UA-default rgb(0,0,0) on dark bill rows',
  );
});

test('bills action hover and focus states keep the ordinary action readable', () => {
  const css = readFileSync(CSS_PATH, 'utf8');

  const hoverBody = ruleBody(css, '.bills-action-btn:hover');
  assert.ok(hoverBody, 'expected a .bills-action-btn:hover rule');
  assert.match(hoverBody, /color:\s*var\(--text\)/, 'hover state should use the theme text color');

  const focusBody = ruleBody(css, '.bills-action-btn:focus');
  assert.ok(focusBody, 'expected a .bills-action-btn:focus rule');
  assert.match(focusBody, /color:\s*var\(--text\)/, 'focus state should use the theme text color');
});

test('labeled bills actions must not inherit the .icon-btn 0.6 opacity in their default state', () => {
  const css = readFileSync(CSS_PATH, 'utf8');
  const body = ruleBody(css, '.bills-action-btn');

  assert.ok(body, 'expected a .bills-action-btn rule');
  assert.match(
    body,
    /opacity:\s*1\b/,
    'labeled Edit/Delete bill actions inherit .icon-btn opacity 0.6, dimming rgb(148,163,184) text on rgb(26,31,46) rows to an effective rgb(99,110,129) contrast of 3.19:1 (required: at least 4.5:1)',
  );
});

test('delete action keeps its semantic danger color on hover and focus despite the bills rule cascade', () => {
  const css = readFileSync(CSS_PATH, 'utf8');

  const hoverSelector = ruleSelector(css, '.bills-action-btn.icon-btn-danger:hover');
  assert.ok(hoverSelector, 'expected a compound .bills-action-btn.icon-btn-danger:hover rule');
  assert.match(
    hoverSelector,
    /\.bills-action-btn\.icon-btn-danger(?::hover|:focus)/,
    'danger rules must combine both classes in one compound selector so they outrank the later-in-source .bills-action-btn:hover and the existing .icon-btn-danger:hover',
  );

  assert.match(
    ruleBody(css, '.bills-action-btn.icon-btn-danger:hover'),
    /color:\s*var\(--danger\)/,
    'delete hover state should use the theme danger color',
  );
  assert.match(
    ruleBody(css, '.bills-action-btn.icon-btn-danger:focus'),
    /color:\s*var\(--danger\)/,
    'delete focus state should use the theme danger color',
  );
});
