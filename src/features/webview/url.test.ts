/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeWebViewUrl } from './url.ts';

test('keeps a full https URL', () => {
  assert.equal(normalizeWebViewUrl('https://expo.dev'), 'https://expo.dev');
  assert.equal(
    normalizeWebViewUrl('https://example.com/path?q=1#top'),
    'https://example.com/path?q=1#top',
  );
});

test('adds the https scheme to a bare host', () => {
  assert.equal(normalizeWebViewUrl('example.com'), 'https://example.com');
  assert.equal(normalizeWebViewUrl('  localhost:8000  '), 'https://localhost:8000');
  assert.equal(normalizeWebViewUrl('127.0.0.1:8080'), 'https://127.0.0.1:8080');
});

test('rejects empty, malformed and non-http addresses', () => {
  assert.equal(normalizeWebViewUrl(''), null);
  assert.equal(normalizeWebViewUrl('   '), null);
  assert.equal(normalizeWebViewUrl('not a url'), null);
  assert.equal(normalizeWebViewUrl('ftp://example.com'), null);
  assert.equal(normalizeWebViewUrl('javascript:alert(1)'), null);
  assert.equal(normalizeWebViewUrl('https://'), null);
  assert.equal(normalizeWebViewUrl('https://expo'), null);
});
