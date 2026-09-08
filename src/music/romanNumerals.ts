import { parseChord, pc, mod, scalePcs } from './chordTheory';
export function analyzeChord(symbol: string, key: string, next?: string) {
  const c = parseChord(symbol);
  if (!c)
    return {
      roman: '?',
      nashville: '?',
      function: 'Unrecognized',
      explanation: 'Check chord spelling.',
    };
  const degree = mod(pc(c.root) - pc(key));
  const numerals: Record<number, string> = {
    0: 'I',
    1: 'bII',
    2: 'II',
    3: 'bIII',
    4: 'III',
    5: 'IV',
    6: '#IV',
    7: 'V',
    8: 'bVI',
    9: 'VI',
    10: 'bVII',
    11: 'VII',
  };
  let roman = numerals[degree];
  if (c.quality === 'minor' || c.quality === 'diminished') roman = roman.toLowerCase();
  const suffix = c.symbol.slice(c.root.length).split('/')[0];
  const romanSuffix = suffix.replace(/^m(?!aj)/, '').replace(/^dim/, '°');
  let fn = [0, 4, 9].includes(degree)
    ? 'Tonic'
    : [2, 5].includes(degree)
      ? 'Predominant'
      : [7, 11].includes(degree)
        ? 'Dominant'
        : 'Modal interchange';
  if (degree !== 7 && c.notes.slice(0, 3).some((note) => !scalePcs(key).includes(pc(note))))
    fn = 'Modal interchange';
  let explanation = `${roman} ${fn.toLowerCase()} harmony in ${key} major.`;
  roman += romanSuffix;
  const n = next ? parseChord(next) : null;
  const isDom = c.intervals.includes(10) && c.intervals.includes(4);
  if (isDom && n && mod(pc(n.root) - pc(c.root)) === 5 && degree !== 7) {
    fn = 'Secondary dominant';
    const target = analyzeChord(n.symbol, key).roman;
    roman = `V${romanSuffix}/${target.replace(/(?:maj|m)?\d.*$/, '')}`;
    explanation = `${c.symbol} is the secondary dominant of ${n.symbol}, creating a clear pull into the next chord.`;
  } else if (isDom && n && mod(pc(c.root) - pc(n.root)) === 1) {
    fn = 'Passing harmony';
    explanation = `${c.symbol} is a tritone-substitute dominant approaching ${n.symbol} by half step.`;
  } else if (c.quality === 'diminished' && n) {
    fn = 'Passing harmony';
    explanation = `${c.symbol} connects into ${n.symbol} through shared tones and chromatic movement.`;
  }

  const nums: Record<number, string> = {
    0: '1',
    1: 'b2',
    2: '2',
    3: 'b3',
    4: '3',
    5: '4',
    6: '#4',
    7: '5',
    8: 'b6',
    9: '6',
    10: 'b7',
    11: '7',
  };
  return {
    roman,
    nashville:
      nums[degree] +
      (c.quality === 'minor' ? 'm' : c.quality === 'diminished' ? '°' : '') +
      romanSuffix.replace('°', ''),
    function: fn,
    explanation,
  };
}
