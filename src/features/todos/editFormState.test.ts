import assert from 'node:assert/strict';
import test from 'node:test';

import { isSaveButtonActive } from './editFormState.ts';

test('save button keeps its active background while saving', () => {
  assert.equal(isSaveButtonActive({ canSave: false, saving: true }), true);
});

test('save button remains disabled when unchanged and not saving', () => {
  assert.equal(isSaveButtonActive({ canSave: false, saving: false }), false);
});

test('save button is active when the edited title can be saved', () => {
  assert.equal(isSaveButtonActive({ canSave: true, saving: false }), true);
});
