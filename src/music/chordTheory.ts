import type { Chord } from '../types/music';
export const KEYS = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export const mod = (n: number) => ((n % 12) + 12) % 12;
const BASE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const pc = (s: string) =>
  mod(BASE[s[0]] + [...s.slice(1)].reduce((n, c) => n + (c === '#' ? 1 : c === 'b' ? -1 : 0), 0));
export const preferFlats = (key: string) => ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(key);
export const noteName = (n: number, flat = false) =>
  (flat
    ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
    : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])[mod(n)];
export const midiName = (n: number, flat = false) => noteName(n, flat) + (Math.floor(n / 12) - 1);
function spell(root: string, interval: number, degree: number) {
  const letters = 'CDEFGAB';
  const letter = letters[(letters.indexOf(root[0]) + degree) % 7];
  let diff = mod(pc(root) + interval - BASE[letter]);
  if (diff > 6) diff -= 12;
  return letter + (diff > 0 ? '#'.repeat(diff) : 'b'.repeat(-diff));
}
export function parseChord(input: string): Chord | null {
  const symbol = input
    .trim()
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#')
    .replace(/Δ/g, 'maj')
    .replace(/ø/g, 'm7b5')
    .replace(/°/g, 'dim');
  const match = /^([A-G](?:#|b)?)([^/]*)(?:\/([A-G](?:#|b)?))?$/.exec(symbol);
  if (!match) return null;
  const [, root, raw, bass] = match;
  const suffix = raw.replace(/[()]/g, '');
  if (
    !/^(?:(?:maj|m|dim|aug|sus2|sus4|sus|add9|M|\+|-)?(?:13|11|9|7|6)?(?:maj7|maj9|add9|sus2|sus4|sus)?(?:b5|#5|b9|#9|#11|b13)*)$/.test(
      suffix,
    )
  )
    return null;
  const minor = /^(m(?!aj)|-)/.test(suffix),
    dim = suffix.startsWith('dim'),
    aug = /^(aug|\+)/.test(suffix),
    sus = /sus/.test(suffix);
  const quality = dim
    ? 'diminished'
    : aug
      ? 'augmented'
      : sus
        ? 'suspended'
        : minor
          ? 'minor'
          : 'major';
  const entries: { i: number; d: number }[] = [
    { i: 0, d: 0 },
    {
      i: dim || minor ? 3 : sus ? (suffix.includes('sus2') ? 2 : 5) : 4,
      d: sus ? (suffix.includes('sus2') ? 1 : 3) : 2,
    },
    { i: dim ? 6 : aug ? 8 : 7, d: 4 },
  ];
  const ext: string[] = [];
  const high = /(13|11|9|7)/.exec(
    suffix.replace(/add9/g, '').replace(/[b#](?:5|9|11|13)/g, ''),
  )?.[1];
  if (high) {
    entries.push({ i: dim ? 9 : /(maj|M)(7|9|11|13)/.test(suffix) ? 11 : 10, d: 6 });
    ext.push('7');
    if (+high >= 9) {
      entries.push({ i: 14, d: 1 });
      ext.push('9');
    }
    if (+high === 11) {
      entries.push({ i: 17, d: 3 });
      ext.push('11');
    }
    if (+high === 13) {
      entries.push({ i: 21, d: 5 });
      ext.push('13');
    }
  }
  if (/6/.test(suffix)) {
    entries.push({ i: 9, d: 5 });
    ext.push('6');
  }
  if (/add9/.test(suffix)) {
    entries.push({ i: 14, d: 1 });
    ext.push('9');
  }
  const alterations = [...suffix.matchAll(/([b#])(5|9|11|13)/g)].map((m) => m[0]);
  for (const a of alterations) {
    const d = +a.slice(1);
    const natural: Record<number, number> = { 5: 7, 9: 14, 11: 17, 13: 21 };
    const degree: Record<number, number> = { 5: 4, 9: 1, 11: 3, 13: 5 };
    const index = entries.findIndex((x) => x.d === degree[d]);
    const e = { i: natural[d] + (a[0] === 'b' ? -1 : 1), d: degree[d] };
    if (index >= 0) entries[index] = e;
    else entries.push(e);
  }
  const unique = entries.filter((x, i, a) => a.findIndex((y) => mod(y.i) === mod(x.i)) === i);
  return {
    symbol,
    root,
    quality,
    extensions: ext,
    alterations,
    bass,
    intervals: unique.map((x) => x.i),
    notes: unique.map((x) => spell(root, x.i, x.d)),
  };
}
export function chordPcs(symbol: string): number[] {
  return parseChord(symbol)?.notes.map(pc) ?? [];
}
export const scalePcs = (key: string) => [0, 2, 4, 5, 7, 9, 11].map((x) => mod(pc(key) + x));
