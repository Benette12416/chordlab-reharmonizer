import type { ChordEvent, Voicing, VoicingMode } from '../types/music';
import { parseChord, pc, mod } from './chordTheory';
import { voiceDistance, voiceScore } from './voiceLeading';
export function generateVoicing(
  symbol: string,
  mode: VoicingMode = 'Gospel',
  previous?: Voicing,
): Voicing {
  const c = parseChord(symbol);
  if (!c) return { lh: [], rh: [], movement: 0, score: 'Excellent' };
  const root = pc(c.root),
    bass = pc(c.bass ?? c.root);
  const base = 36 + bass;
  const lh = [base];
  if (mode === 'Worship' || mode === 'Simple') lh.push(base + 12);
  else if (!c.bass) lh.push(36 + root + (c.intervals.find((n) => [6, 7, 8].includes(n)) ?? 7));
  let tones = c.notes.map(pc);
  if (mode !== 'Simple' && tones.length > 4)
    tones = tones.filter(
      (n, i) => (i !== 0 || !!c.bass) && !(mod(n - root) === 7 && tones.length > 5),
    );
  const candidates: number[][] = [];
  for (let start = 48; start <= 65; start++) {
    let notes = tones.map((n) => start + mod(n - start)).sort((a, b) => a - b);
    if (mode === 'Worship' && notes.length > 3) notes = [notes[0] - 12, ...notes.slice(1)];
    if (mode === 'Jazz' && notes.length > 4) notes = notes.filter((n) => mod(n - root) !== 7);
    if (mode === 'Neo-Soul' && notes.length < 4) notes = [...notes, notes[0] + 12];
    if (
      notes.every((n) => n >= Math.max(48, Math.max(...lh) + 1) && n <= 84) &&
      Math.max(...notes) - Math.min(...notes) <= 19
    )
      candidates.push(notes);
  }
  const rh =
    candidates.sort((a, b) => cost(a) - cost(b))[0] ??
    tones.map((n) => 60 + n).sort((a, b) => a - b);
  function cost(n: number[]) {
    return (
      (previous
        ? voiceDistance(previous.rh, n) * 3
        : Math.abs(n.reduce((a, b) => a + b, 0) / n.length - 65)) +
      (Math.max(...n) - Math.min(...n) > 12 ? 0.7 : 0) +
      (mode === 'Neo-Soul' ? (Math.max(...n) - Math.min(...n)) * 0.08 : 0)
    );
  }
  const movement = previous ? voiceDistance(previous.rh, rh) : 0;
  return { lh, rh, movement, score: voiceScore(movement) };
}
export function voiceProgression(events: ChordEvent[], mode: VoicingMode) {
  const result: Voicing[] = [];
  for (const e of events) result.push(generateVoicing(e.symbol, mode, result.at(-1)));
  return result;
}
