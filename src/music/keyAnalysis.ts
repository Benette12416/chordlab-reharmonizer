import { pc, parseChord, scalePcs, KEYS } from './chordTheory';
import type { ChordEvent } from '../types/music';
export function detectKey(chords: ChordEvent[]) {
  const candidates = KEYS.filter((k) => !['C#', 'Gb'].includes(k))
    .map((key) => {
      const scale = scalePcs(key);
      let score = 0;
      chords.forEach((e, i) => {
        const c = parseChord(e.symbol);
        if (!c) return;
        c.notes.forEach((n) => (score += scale.includes(pc(n)) ? 1 : -1.7));
        if (pc(c.root) === pc(key)) {
          score += 3;
          if (i === 0 || i === chords.length - 1) score += 4;
        }
        if (pc(c.root) === (pc(key) + 7) % 12 && c.quality === 'major') score += 2;
      });
      return { key, score };
    })
    .sort((a, b) => b.score - a.score);
  return {
    key: candidates[0]?.key ?? 'C',
    confidence:
      chords.length > 2 && candidates[0].score - candidates[1].score > 3 ? 'High' : 'Tentative',
    candidates: candidates.slice(0, 3),
  };
}
