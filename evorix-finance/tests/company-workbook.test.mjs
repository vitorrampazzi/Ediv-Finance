import test from 'node:test';
import assert from 'node:assert/strict';
import { dividendColumns, dividendValue, formatDividendValue } from '../dividend-analysis.mjs';

test('ranking follows the eleven visible workbook columns; details retain all twenty-one', () => {
  assert.equal(dividendColumns.length, 21);
  assert.equal(new Set(dividendColumns.map(column => column.key)).size, 21);
  assert.deepEqual(dividendColumns.filter(column => column.ranking).map(column => column.key), [
    'companyName', 'ticker', 'sector', 'totalShares', 'marketValue', 'estimatedNetIncome',
    'projectedPE', 'referencePrice', 'ceilingPrice', 'safetyMargin', 'announcementMonths',
  ]);
  const ceiling = dividendColumns.find(column => column.key === 'ceilingPrice');
  assert.match(ceiling.label, /6,81%.*2037/);
});

test('workbook fractions, negative values and payout above one retain their meaning', () => {
  assert.equal(formatDividendValue('0.115', 'percent'), '11,50%');
  assert.equal(formatDividendValue('-0.467', 'percent'), '-46,70%');
  assert.equal(formatDividendValue('1.06', 'percent'), '106,00%');
  assert.equal(formatDividendValue('0.41', 'percentInteger'), '41%');
  assert.equal(formatDividendValue('-1.68', 'number'), '-1,68');
  assert.equal(formatDividendValue('2376775554', 'quantity'), '2.376.775.554,00');
  assert.equal(formatDividendValue('104995666.67', 'quantity'), '104.995.666,67');
  assert.equal(formatDividendValue('2026-10-20', 'date'), '20/10/2026');
  assert.equal(formatDividendValue('mar abr jun set dez', 'text'), 'mar abr jun set dez');
});

test('missing values never become zero or a fabricated potential', () => {
  for (const missing of [null, undefined, '', ' '])
    assert.equal(formatDividendValue(missing, 'percent'), 'Não informado');
  assert.equal(formatDividendValue('0', 'percent'), '0,00%');
  const entry = { companyName: 'Tim', ticker: 'TIMS3', sector: 'Telecomunicações',
    dividendAnalysis: { referencePrice: '19.37', ceilingPrice: '32.74', safetyMargin: '0.41' } };
  assert.equal(dividendValue(entry, 'companyName'), 'Tim');
  assert.equal(dividendValue(entry, 'ceilingPrice'), '32.74');
  assert.equal(dividendValue(entry, 'estimatedNetIncome'), undefined);
  assert.equal(entry.expectedReturnPercent, undefined);
  assert.equal(entry.targetPrice, undefined);
});
