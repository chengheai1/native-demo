import assert from 'node:assert/strict';
import test from 'node:test';

import { getSwipeVisuals } from './swipeVisuals.ts';

test('closed swipe keeps copy crisp and hides the shadow', () => {
  assert.deepEqual(getSwipeVisuals(0), {
    textProgress: 0,
    timeOpacity: 1,
    shadowOpacity: 0,
  });
});

test('partial swipe progresses copy and shadow together', () => {
  const visuals = getSwipeVisuals(24);

  assert.equal(visuals.textProgress, 0.5);
  assert.equal(visuals.timeOpacity, 0.8);
  assert.ok(Math.abs(visuals.shadowOpacity - 0.075) < 0.000001);
});

test('fully open swipe settles copy and shadow', () => {
  assert.deepEqual(getSwipeVisuals(172), {
    textProgress: 1,
    timeOpacity: 0.6,
    shadowOpacity: 0.1,
  });
});

test('visual details stay clamped outside the swipe range', () => {
  assert.deepEqual(getSwipeVisuals(-20), getSwipeVisuals(0));
  assert.deepEqual(getSwipeVisuals(220), getSwipeVisuals(172));
});
