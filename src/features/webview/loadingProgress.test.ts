import assert from 'node:assert/strict';
import test from 'node:test';

import { visibleWebViewProgress } from './loadingProgress.ts';

test('keeps a small visible indicator when loading starts', () => {
  assert.equal(visibleWebViewProgress(0), 0.08);
});

test('uses the native loading progress while the page loads', () => {
  assert.equal(visibleWebViewProgress(0.45), 0.45);
});

test('hides the progress indicator when loading completes', () => {
  assert.equal(visibleWebViewProgress(1), null);
  assert.equal(visibleWebViewProgress(1.1), null);
});
