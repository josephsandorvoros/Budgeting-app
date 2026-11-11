import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '../..');
const moduleUrl = pathToFileURL(
  path.resolve(projectRoot, 'src/components/UiShellBudgetSelection.js'),
).href;

const TIMEZONES = ['UTC', 'Etc/GMT+6', 'Pacific/Kiritimati'];

const TODAY = [2026, 10, 10, 12, 0];

const BILLS = [
  { id: 'nov-earlier', name: 'Earlier November', amount: 11, billType: 'expense', nextDueDate: '2026-11-01' },
  { id: 'nov-past', name: 'Yesterday', amount: 12, billType: 'expense', nextDueDate: '2026-11-09' },
  { id: 'nov-today', name: 'Today', amount: 80, billType: 'expense', nextDueDate: '2026-11-10' },
  { id: 'nov-future', name: 'Later November', amount: 65, billType: 'expense', nextDueDate: '2026-11-15' },
  { id: 'nov-income', name: 'Paycheck', amount: 4987, billType: 'income', nextDueDate: '2026-11-20' },
  { id: 'dec-first', name: 'December First', amount: 175, billType: 'expense', nextDueDate: '2026-12-01' },
  { id: 'dec-last', name: 'December Last', amount: 25.5, billType: 'expense', nextDueDate: '2026-12-31' },
  { id: 'jan-first', name: 'January First', amount: 1500, billType: 'expense', nextDueDate: '2027-01-01' },
  { id: 'invalid', name: 'Invalid', amount: 999, billType: 'expense', nextDueDate: 'not-a-date' },
  { id: 'null', name: 'Null', amount: 998, billType: 'expense', nextDueDate: null },
  { id: 'missing', name: 'Missing', amount: 997, billType: 'expense' },
  { id: 'blank', name: 'Blank', amount: 996, billType: 'expense', nextDueDate: '   ' },
];

const script = `
import { upcomingBillsForMonth } from ${JSON.stringify(moduleUrl)};

const scenario = JSON.parse(process.env.BILL_CALENDAR_SCENARIO);
const [year, month, day, hour, minute] = scenario.today;
const today = new Date(year, month, day, hour, minute, 0, 0);
const result = upcomingBillsForMonth(scenario.bills, scenario.year, scenario.monthIndex, today);
process.stdout.write(JSON.stringify(result));
`;

function runScenario(timezone, scenario) {
  const result = spawnSync(globalThis.process.execPath, ['--input-type=module', '--eval', script], {
    cwd: projectRoot,
    env: {
      ...globalThis.process.env,
      TZ: timezone,
      BILL_CALENDAR_SCENARIO: JSON.stringify(scenario),
    },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${timezone} child failed: ${result.stderr}`);
  return JSON.parse(result.stdout);
}

function upcoming(timezone, year, monthIndex, bills = BILLS) {
  return runScenario(timezone, { year, monthIndex, bills, today: TODAY });
}

for (const timezone of TIMEZONES) {
  test(`TZ=${timezone}: November bills keep membership, filtering, dates, and totals`, () => {
    const result = upcoming(timezone, 2026, 10);

    assert.deepEqual(result.bills.map((bill) => bill.id), ['nov-today', 'nov-future', 'nov-income']);
    assert.equal(result.count, 3);
    assert.equal(result.total, 145);
    assert.equal(result.nearest.id, 'nov-today');
    assert.equal(result.nearest.daysUntil, 0);
    assert.equal(result.bills[1].daysUntil, 5);
    assert.deepEqual(result.bills.map((bill) => bill.dueDate), ['2026-11-10', '2026-11-15', '2026-11-20']);
  });

  test(`TZ=${timezone}: December bills stay in December`, () => {
    const result = upcoming(timezone, 2026, 11);

    assert.deepEqual(result.bills.map((bill) => bill.id), ['dec-first', 'dec-last']);
    assert.equal(result.total, 200.5);
    assert.deepEqual(result.bills.map((bill) => bill.dueDate), ['2026-12-01', '2026-12-31']);
    assert.deepEqual(result.bills.map((bill) => bill.daysUntil), [21, 51]);
  });

  test(`TZ=${timezone}: January membership crosses the year boundary correctly`, () => {
    const result = upcoming(timezone, 2027, 0);

    assert.deepEqual(result.bills.map((bill) => bill.id), ['jan-first']);
    assert.equal(result.bills[0].dueDate, '2027-01-01');
    assert.equal(result.bills[0].daysUntil, 52);
  });

  test(`TZ=${timezone}: due today is included while past dates and invalid dates are rejected`, () => {
    const result = upcoming(timezone, 2026, 10);
    const ids = result.bills.map((bill) => bill.id);

    assert.ok(ids.includes('nov-today'));
    assert.ok(!ids.includes('nov-past'));
    assert.ok(!ids.includes('nov-earlier'));
    assert.deepEqual(ids.filter((id) => ['invalid', 'null', 'missing', 'blank'].includes(id)), []);
  });

  test(`TZ=${timezone}: all-invalid input is null-safe and produces an empty result`, () => {
    const invalidOnly = BILLS.filter((bill) => ['invalid', 'null', 'missing', 'blank'].includes(bill.id));
    const result = upcoming(timezone, 2026, 10, invalidOnly);

    assert.deepEqual(result.bills, []);
    assert.equal(result.count, 0);
    assert.equal(result.total, 0);
    assert.equal(result.nearest, null);
  });
}
