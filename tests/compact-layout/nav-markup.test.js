import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const NAV_PATH = fileURLToPath(new URL('../../src/components/NavBar.jsx', import.meta.url));

function findNestedButtons(source) {
  const nested = [];
  let depth = 0;
  let cursor = 0;

  while (cursor < source.length) {
    const open = source.indexOf('<button', cursor);
    const close = source.indexOf('</button', cursor);
    if (open === -1 && close === -1) break;

    const nextOpen = open === -1 ? Number.POSITIVE_INFINITY : open;
    const nextClose = close === -1 ? Number.POSITIVE_INFINITY : close;

    if (nextOpen < nextClose) {
      if (depth > 0) nested.push(source.slice(nextOpen, nextOpen + 60));

      let index = nextOpen + '<button'.length;
      let braces = 0;
      let quote = null;

      for (; index < source.length; index += 1) {
        const char = source[index];
        if (quote) {
          if (char === '\\') index += 1;
          else if (char === quote) quote = null;
          continue;
        }
        if (char === '"' || char === "'" || char === '`') {
          quote = char;
        } else if (char === '{') {
          braces += 1;
        } else if (char === '}') {
          braces -= 1;
        } else if (char === '>' && braces === 0) {
          break;
        }
      }

      const selfClosing = source[index - 1] === '/';
      if (!selfClosing) depth += 1;
      cursor = index + 1;
    } else {
      depth = Math.max(0, depth - 1);
      cursor = nextClose + '</button'.length;
    }
  }

  return nested;
}

test('sidebar section headers do not nest interactive buttons', () => {
  const source = readFileSync(NAV_PATH, 'utf8');
  const nested = findNestedButtons(source);

  assert.deepEqual(nested, [], `found nested <button> markup: ${nested.join(' | ')}`);
});

test('personal and business sections keep separate toggle and action controls', () => {
  const source = readFileSync(NAV_PATH, 'utf8');

  assert.ok(
    (source.match(/className="sidebar-section-toggle"/g) || []).length >= 2,
    'expected keyboard-operable section toggle buttons',
  );
  assert.match(source, /aria-label="Manage personal budgets"/);
  assert.match(source, /aria-label="Manage business budgets"/);
  assert.match(source, /aria-label="New personal budget"/);
  assert.match(source, /aria-label="New business budget"/);
  assert.match(source, /setPersonalOpen/);
  assert.match(source, /setBusinessOpen/);
  assert.match(source, /onManageBudgets/);
});

test('active budgets expose destinations by default while preserving explicit collapse choices', () => {
  const source = readFileSync(NAV_PATH, 'utf8');

  assert.match(source, /expanded=\{expandedPersonal\[b\.id\] \?\? \(currentId === b\.id\)\}/);
  assert.match(source, /expanded=\{expandedBiz\[b\.id\] \?\? \(currentId === b\.id\)\}/);
  assert.equal((source.match(/!\(prev\[id\] \?\? \(id === currentId\)\)/g) || []).length, 2);
  assert.match(source, /title=\{b\.name\}/);
});

test('transaction sorting and filtering expose keyboard controls and state', () => {
  const source = readFileSync(new URL('../../src/pages/Expenses.jsx', import.meta.url), 'utf8');
  const sortHeader = source.slice(source.indexOf('function SortTh('), source.indexOf('export default function Expenses('));

  assert.match(sortHeader, /<button[\s\S]*?type="button"[\s\S]*?onClick=\{\(\) => onSort\(col\)\}/);
  assert.match(sortHeader, /scope="col"/);
  assert.match(sortHeader, /aria-sort=/);
  assert.match(source, /aria-label="Transaction period"/);
  assert.match(source, /aria-label="Transaction category"/);
  assert.match(source, /aria-label="Search transactions"/);
  assert.match(source, /aria-pressed=\{typeFilter === v\}/);
  assert.match(source, /aria-label="Transactions table" tabIndex=\{0\}/);
});
