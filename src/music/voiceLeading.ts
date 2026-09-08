export function voiceDistance(a: number[], b: number[]) {
  if (!a.length || !b.length) return 0;
  const x = [...a].sort((m, n) => m - n),
    y = [...b].sort((m, n) => m - n);
  let total = 0;
  for (let i = 0; i < Math.max(x.length, y.length); i++)
    total += Math.abs(x[Math.min(i, x.length - 1)] - y[Math.min(i, y.length - 1)]);
  return total / Math.max(x.length, y.length);
}
export const voiceScore = (movement: number): 'Excellent' | 'Good' | 'Moderate' =>
  movement <= 2 ? 'Excellent' : movement <= 4 ? 'Good' : 'Moderate';
