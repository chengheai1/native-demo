/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { getTodosRedirect } from './routing.ts';

test('does not leave todos while the session is restoring', () => {
  assert.equal(getTodosRedirect('loading'), null);
});

test('keeps signed-in users on todos', () => {
  assert.equal(getTodosRedirect('signedIn'), null);
});

test('redirects only resolved unauthenticated states to login', () => {
  assert.equal(getTodosRedirect('signedOut'), '/login');
  assert.equal(getTodosRedirect('error'), '/login');
});
