import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BANNER_PATH = fileURLToPath(new URL('../../src/components/UiShellDemoBanner.jsx', import.meta.url));

test('demo banner copy does not claim changes stay only in this session', () => {
  const source = readFileSync(BANNER_PATH, 'utf8');

  assert.doesNotMatch(source, /this session/i);
  assert.doesNotMatch(source, /not saved/i);
});

test('demo banner copy says changes persist only in isolated demo data', () => {
  const source = readFileSync(BANNER_PATH, 'utf8');

  assert.match(source, /isolated demo data/i);
  assert.match(source, /never/i);
  assert.match(source, /real budgets/i);
});
