import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  calculateBir,
  calculateCareUnemployed,
  calculateCareWorking,
  calculateUnified,
  parseCount,
  parseMoney,
} from '../site/js/calc.js';
import { formatMoney, formatPercent } from '../site/js/format.js';

const fixtures = JSON.parse(
  readFileSync(new URL('./fixtures.json', import.meta.url), 'utf8'),
);

const NUMERIC = /^-?\d+(?:\.\d+)?$/;

function assertClose(actual, expected, message) {
  assert.ok(
    Math.abs(actual - Number(expected)) <= 0.005,
    `${message}: получено ${actual}, ожидалось ${expected}`,
  );
}

for (const item of fixtures) {
  test(`эталон: ${item.id}`, () => {
    const result = {
      calculateBir,
      calculateCareWorking,
      calculateCareUnemployed,
      calculateUnified,
    }[item.kind](item.input);

    for (const [key, expected] of Object.entries(item.expected)) {
      if (expected === null) {
        assert.equal(result[key], null, key);
      } else if (typeof expected === 'boolean') {
        assert.equal(result[key], expected, key);
      } else if (typeof expected === 'string' && NUMERIC.test(expected)) {
        assertClose(result[key], expected, key);
      } else {
        assert.equal(result[key], expected, key);
      }
    }
  });
}

test('parseMoney понимает пробелы, запятую и знак рубля', () => {
  assert.equal(parseMoney('1 000 000'), 1000000);
  assert.equal(parseMoney('1\u00a0000\u00a0000'), 1000000);
  assert.equal(parseMoney('35 000,50 ₽'), 35000.5);
  assert.equal(parseMoney('0'), 0);
});

test('parseMoney отклоняет мусор и отрицательные суммы', () => {
  for (const value of ['', 'abc', '-100', '1,2,3', '1.000.000']) {
    assert.equal(parseMoney(value), null, value);
  }
});

test('parseCount принимает только целые в диапазоне', () => {
  assert.equal(parseCount('2'), 2);
  assert.equal(parseCount('0'), null);
  assert.equal(parseCount('2,5'), null);
  assert.equal(parseCount('21'), null);
});

test('formatMoney и formatPercent в русском формате', () => {
  assert.equal(formatMoney(383562.2).replace(/\u00a0/g, ' '), '383 562,20 ₽');
  assert.equal(formatPercent(1), '100 %');
  assert.equal(formatPercent(0.75), '75 %');
});

test('БиР: неверная длительность отпуска — ошибка', () => {
  assert.throws(() => calculateBir({ days: 100 }), /140, 156 or 194/);
});

test('Единое пособие: доход ровно на уровне ПМ — отказ', () => {
  const result = calculateUnified({ income12m: 909072, familySize: 4, children: 1 });
  assert.equal(result.eligible, false);
  assert.equal(result.rate, null);
});

test('Единое пособие: причина отказа про нулевой доход', () => {
  const result = calculateUnified({
    income12m: 300000,
    familySize: 4,
    children: 1,
    zeroIncomeOk: false,
  });
  assert.equal(result.eligible, false);
  assert.match(result.reasons.join(' '), /нулевого дохода/);
});

test('Уход: двое детей на минимальных выплатах', () => {
  const result = calculateCareWorking({ children: 2 });
  assertClose(result.monthly, '21674.40', 'monthly');
  assert.equal(result.cappedByEarnings, true);
});

test('Уход: неработающий родитель получает фиксированную сумму', () => {
  const result = calculateCareUnemployed({ children: 2 });
  assertClose(result.monthly, '21339.28', 'monthly');
});
