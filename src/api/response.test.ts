/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { unwrapApiResponse } from './response.ts';

test('unwraps the data field from a standard API response', () => {
  const payload = {
    code: 200,
    data: { user: { id: 7, name: '体验用户' } },
    message: 'success',
  };

  assert.deepEqual(unwrapApiResponse(payload), {
    user: { id: 7, name: '体验用户' },
  });
});

test('preserves falsy response data', () => {
  assert.equal(unwrapApiResponse({ code: 200, data: 0, message: 'success' }), 0);
  assert.equal(unwrapApiResponse({ code: 200, data: false, message: 'success' }), false);
  assert.equal(unwrapApiResponse({ code: 200, data: null, message: 'success' }), null);
});
