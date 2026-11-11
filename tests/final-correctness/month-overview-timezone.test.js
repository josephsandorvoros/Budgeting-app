import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleUrl = pathToFileURL(
  path.resolve(here, '../../src/components/UiShellBudgetSelection.js'),
).href;

const script = `
import { computeMonthOverview } from ${JSON.stringify(moduleUrl)};

const overview = computeMonthOverview({
  categories: { Income: ['Salary'] },
  budget: { Income: { Salary: Array(12).fill(1000) } },
  transactions: [
    { id: 'nov1', date: '2026-11-01', type: 'income', amount: 1000 },
    { id: 'novMid', date: '2026-11-15T12:00:00', type: 'income', amount: 15 },
    { id: 'novEnd', date: '2026-11-30', type: 'income', amount: 30 },
    { id: 'oct', date: '2026-10-31', type: 'income', amount: 999 },
    { id: 'dec', date: '2026-12-01', type: 'income', amount: 888 },
    { id: 'bad', date: 'not-a-date', type: 'income', amount: 777 },
  ],
  bills: [],
  year: 2026,
  monthIndex: 10,
});

process.stdout.write(JSON.stringify(overview));
`;

function runInTimezone(timezone) {
  const result = spawnSync(globalThis.process.execPath, ['--input-type=module', '--eval', script], {
    cwd: path.resolve(here, '../..'),
    env: { ...globalThis.process.env, TZ: timezone },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${timezone} child failed: ${result.stderr}`);
  return JSON.parse(result.stdout);
}

for (const timezone of ['UTC', 'Etc/GMT+6']) {
  test(`computeMonthOverview keeps date-only November 1 in November under TZ=${timezone}`, () => {
    const overview = runInTimezone(timezone);
    assert.equal(overview.incomeActual, 1045);
    assert.equal(overview.transactionCount, 3);
    assert.equal(overview.hasTransactions, true);
  });
}
