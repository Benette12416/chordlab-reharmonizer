import { parseChord, pc, noteName, preferFlats, mod } from './chordTheory';
import type { HarmonyOption } from './substitutions';
export function passingOptions(from: string, to: string, key: string, level = 3): HarmonyOption[] {
  const a = parseChord(from),
    b = parseChord(to);
  if (!a || !b) return [];
  const flat = preferFlats(key),
    target = pc(b.root),
    name = (n: number) => noteName(n, flat),
    dominant = name(target + 7),
    minor = b.quality === 'minor';
  const choices: HarmonyOption[] = [
    {
      symbols: [dominant + (minor ? '7(b9)' : '9')],
      reason: `A local V leads directly into ${to}${minor ? ' with a minor-key flat ninth' : ''}.`,
      tension: minor ? 3 : 2,
    },
    {
      symbols: [name(target - 1) + 'dim7'],
      reason: `A leading-tone diminished chord approaches ${b.root} by a half step.`,
      tension: 3,
    },
    {
      symbols: [name(target + 2) + (minor ? 'm7b5' : 'm9'), dominant + (minor ? '7(b9)' : '13')],
      reason: `A ${minor ? 'minor' : 'major'} ii–V briefly tonicizes ${to}.`,
      tension: 3,
    },
    {
      symbols: [name(target + 1) + '7'],
      reason: `A tritone substitute descends a half step into ${to}; audition against the melody.`,
      tension: 4,
    },
  ];
  if (a.quality === 'major' && mod(target - pc(a.root)) === 9)
    choices.unshift({
      symbols: [a.root + 'maj7/' + name(target + 2)],
      reason: `A descending bass line connects ${a.root} to ${b.root} through the major seventh.`,
      tension: 1,
    });
  if (a.quality === 'major' && mod(target - pc(a.root)) === 5)
    choices.unshift({
      symbols: [a.root + '/' + name(pc(a.root) + 4)],
      reason: `First-inversion ${a.root} walks the bass up into ${b.root}.`,
      tension: 1,
    });
  if (level >= 4) {
    choices.splice(Math.min(4, choices.length), 1, {
      symbols: [
        name(target + 4) + 'm7',
        name(target + 9) + '7',
        name(target + 2) + (minor ? 'm7b5' : 'm9'),
        dominant + (minor ? '7(b9)' : '13'),
      ],
      reason: `A chain of local ii–V movements creates a longer approach to ${to}. Best in a spacious instrumental or bridge.`,
      tension: 4,
    });
  }
  return choices.slice(0, 5);
}
