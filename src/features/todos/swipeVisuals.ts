export const ACTION_WIDTH = 172;

function clamp01(value: number) {
  'worklet';
  return Math.max(0, Math.min(1, value));
}

export function getSwipeVisuals(reveal: number) {
  'worklet';
  const textProgress = clamp01(reveal / 48);
  const earlyProgress = clamp01(reveal / 32);

  return {
    textProgress,
    timeOpacity: 1 - textProgress * 0.4,
    shadowOpacity: earlyProgress * 0.1,
  };
}
