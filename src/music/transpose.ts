import { parseChord, pc, noteName, preferFlats } from './chordTheory';
import type { ChordEvent } from '../types/music';
export function transposeChord(symbol: string, semitones: number, targetKey: string) {
  const c = parseChord(symbol);
  if (!c) return symbol;
  const suffix = c.symbol.slice(c.root.length).split('/')[0];
  return (
    noteName(pc(c.root) + semitones, preferFlats(targetKey)) +
    suffix +
    (c.bass ? '/' + noteName(pc(c.bass) + semitones, preferFlats(targetKey)) : '')
  );
}
export const transposeEvents = (events: ChordEvent[], from: string, to: string) =>
  events.map((e) => ({
    ...e,
    symbol: transposeChord(e.symbol, pc(to) - pc(from), to),
    explanation: undefined,
  }));
