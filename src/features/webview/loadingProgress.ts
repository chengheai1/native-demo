export function visibleWebViewProgress(progress: number): number | null {
  if (progress >= 1) return null;
  return Math.min(0.98, Math.max(0.08, progress));
}
