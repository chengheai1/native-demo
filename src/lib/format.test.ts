/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { firstName, formatDateLabel, formatTaskTime, shortTitle } from './format.ts';

test('formats the Chinese date label', () => {
  assert.equal(formatDateLabel(new Date(2026, 9, 28, 12, 0, 0)), '10月28日 · 星期三');
});

test('extracts a friendly first name', () => {
  assert.equal(firstName('体验用户'), '体验用户');
  assert.equal(firstName('Cheng He'), 'Cheng');
  assert.equal(firstName('   '), '朋友');
});

test('formats relative task time', () => {
  const now = new Date();
  now.setHours(9, 5, 0, 0);
  assert.equal(formatTaskTime(now.toISOString()), '今天 09:05');
});

test('truncates long titles for toasts', () => {
  assert.equal(shortTitle('1234567890', 5), '12345…');
  assert.equal(shortTitle('短标题', 5), '短标题');
});
