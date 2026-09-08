import { parseChord, pc, noteName, mod, preferFlats } from './chordTheory';
export interface HarmonyOption {
  symbols: string[];
  reason: string;
  tension: number;
}
export function alternatives(symbol: string, key: string, next?: string): HarmonyOption[] {
  const c = parseChord(symbol);
  if (!c) return [];
  const r = c.root,
    flat = preferFlats(key),
    n = next ? parseChord(next) : null;
  const opts: HarmonyOption[] = [];
  if (c.quality === 'minor')
    opts.push(
      { symbols: [r + 'm7'], reason: 'Keep the minor function with a gentle seventh.', tension: 1 },
      {
        symbols: [r + 'm9'],
        reason: 'Add an upper ninth while keeping the minor foundation.',
        tension: 2,
      },
      {
        symbols: [r + 'm11'],
        reason: 'An open minor-eleven color; check the melody against the fourth.',
        tension: 3,
      },
    );
  else if (c.quality === 'diminished')
    opts.push(
      {
        symbols: [r + 'dim7'],
        reason: 'A symmetrical connector that resolves in small steps.',
        tension: 3,
      },
      { symbols: [r + 'm7b5'], reason: 'A softer half-diminished predominant color.', tension: 2 },
    );
  else if (mod(pc(r) - pc(key)) === 7 || c.intervals.includes(10)) {
    opts.push(
      { symbols: [r + '7'], reason: 'A clear dominant with less harmonic density.', tension: 1 },
      { symbols: [r + '9'], reason: 'A ninth gives the dominant a warmer color.', tension: 2 },
      {
        symbols: [r + '13sus4'],
        reason: 'Suspend the third for an open worship-style dominant.',
        tension: 2,
      },
      {
        symbols: [r + '13'],
        reason: 'The third and seventh establish the dominant; the thirteenth adds warmth.',
        tension: 3,
      },
    );
    if (n && mod(pc(n.root) - pc(r)) === 5)
      opts.push(
        {
          symbols: [noteName(pc(r) + 6, flat) + '7'],
          reason:
            'Tritone substitution retains the dominant guide tones and approaches the destination chromatically. Audition with the melody.',
          tension: 4,
        },
        {
          symbols: [noteName(pc(r) + 7, flat) + 'm9', r + '13'],
          reason: 'Expand the dominant into a local ii–V leading to the destination.',
          tension: 3,
        },
        {
          symbols: [r + '7(b9)'],
          reason: 'A flat ninth strengthens dominant tension; use where the melody allows.',
          tension: 4,
        },
      );
  } else
    opts.push(
      {
        symbols: [r + 'add9'],
        reason: 'Retain the major triad with a spacious added ninth.',
        tension: 1,
      },
      {
        symbols: [r + 'maj7'],
        reason: 'A major seventh softens the original major harmony.',
        tension: 1,
      },
      {
        symbols: [r + 'maj9'],
        reason: 'Keep the major function with a seventh and upper ninth.',
        tension: 2,
      },
      {
        symbols: [r + '/' + noteName(pc(r) + 4, flat)],
        reason: 'First inversion connects the bass with less movement.',
        tension: 1,
      },
      {
        symbols: [r + '6'],
        reason: 'A sixth offers a warm alternative to a major seventh.',
        tension: 1,
      },
    );
  if (c.quality === 'major' && mod(pc(r) - pc(key)) === 5 && n && mod(pc(n.root) - pc(key)) === 0)
    opts.push({
      symbols: [r + 'm6'],
      reason:
        'Borrow the minor iv from the parallel minor. Its lowered third falls into the tonic for a tender plagal resolution; check the melody.',
      tension: 3,
    });
  if (n && c.quality === 'major' && mod(pc(r) - pc(key)) === 0 && mod(pc(n.root) - pc(key)) === 5)
    opts.push({
      symbols: [r + '7'],
      reason: 'Turn the tonic into V7 of IV to pull toward the next predominant chord.',
      tension: 2,
    });
  if (c.quality === 'major' && mod(pc(r) - pc(key)) === 0 && n && mod(pc(n.root) - pc(key)) === 7)
    opts.push({
      symbols: [noteName(pc(key) + 8, flat) + 'maj7'],
      reason:
        'A chromatic-mediant bVImaj7 shares two tonic tones, then moves down a half step toward V. A colorful, melody-dependent option.',
      tension: 4,
    });
  return opts.filter((o) => o.symbols.join(' ') !== symbol);
}
