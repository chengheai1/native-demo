import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveWebViewTitle } from './pageTitle.ts';

test('uses the page title when the WebView provides one', () => {
  assert.equal(resolveWebViewTitle('Bonus Center | LBank'), 'Bonus Center | LBank');
});

test('trims whitespace around the page title', () => {
  assert.equal(resolveWebViewTitle('  Example page  '), 'Example page');
});

test('keeps the title empty when the page does not provide one', () => {
  assert.equal(resolveWebViewTitle(), '');
  assert.equal(resolveWebViewTitle('   '), '');
});
