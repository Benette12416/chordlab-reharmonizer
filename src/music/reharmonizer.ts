import type { ChordEvent, ReharmContext, ReharmonizationProvider } from '../types/music';
import { parseChord, pc, scalePcs, mod } from './chordTheory';
import { alternatives } from './substitutions';
import { passingOptions } from './passingChords';
import { generateVoicing } from './voicingGenerator';
import { voiceDistance } from './voiceLeading';
import { analyzeChord } from './romanNumerals';
const random = (seed: number, index: number) => {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
export class RuleBasedProvider implements ReharmonizationProvider {
  generate(ctx: ReharmContext): ChordEvent[] {
    const { original, settings: s, lines, seed, melody = [] } = ctx;
    const result: ChordEvent[] = [];
    const scale = scalePcs(s.key);
    original.forEach((event, i) => {
      const c = parseChord(event.symbol);
      if (!c) {
        result.push({ ...event });
        return;
      }
      const line = lines.find((l) => l.id === event.lineId);
      const section = line?.section.toLowerCase() ?? 'verse';
      const sectionWeight = /bridge|final/.test(section)
        ? 1.25
        : /chorus|instrumental/.test(section)
          ? 1.1
          : 0.75;
      const next = original[i + 1],
        last = result.at(-1);
      const fn = analyzeChord(c.symbol, s.key, next?.symbol);
      const maxTension = s.level === 1 ? 1 : s.level === 2 ? 2 : s.level === 3 ? 3 : 4;
      const opts = [
        {
          symbols: [event.symbol],
          tension: 0,
          reason: 'Keep the original harmony and leave space.',
        },
        ...alternatives(event.symbol, s.key, next?.symbol).filter(
          (o) => o.symbols.length === 1 && o.tension <= maxTension,
        ),
      ];
      const previous = last ? generateVoicing(last.symbol, s.voicingMode) : undefined;
      const candidates = opts
        .map((o, j) => {
          const chord = parseChord(o.symbols[0])!;
          const pitches = chord.notes.map(pc);
          const originalPcs = c.notes.map(pc);
          const retained =
            originalPcs.filter((n) => pitches.includes(n)).length / originalPcs.length;
          const outside = pitches.filter((n) => !scale.includes(n)).length;
          const movement = previous
            ? voiceDistance(previous.rh, generateVoicing(chord.symbol, s.voicingMode, previous).rh)
            : 0;
          const clash = melody
            .filter((m) => m.sourceId === event.sourceId && m.sustained)
            .some(
              (m) =>
                !pitches.includes(mod(m.pitch)) &&
                pitches.some((n) => [1, 11].includes(mod(n - m.pitch))),
            );
          const desired = s.level === 1 ? 1 : s.level === 2 ? 1.6 : 2.2;
          const styleFit =
            s.style === 'Worship'
              ? /add9|sus/.test(chord.symbol)
                ? 1.7
                : 0
              : s.style === 'Jazz'
                ? /9|13/.test(chord.symbol)
                  ? 1.5
                  : 0
                : s.style === 'Neo-Soul'
                  ? /maj9|m9|m11/.test(chord.symbol)
                    ? 1.6
                    : 0
                  : /9|7|13/.test(chord.symbol)
                    ? 1
                    : 0;
          // Alterations already present in the source are respected; new tensions remain bounded.
          let score =
            retained * 4 -
            outside * 0.7 -
            movement * 0.23 -
            Math.abs(o.tension - desired) * 0.6 +
            styleFit +
            (j ? 0.8 : 0) -
            (clash ? 100 : 0) +
            random(seed, i * 19 + j) * 1.8;
          if (
            i === original.length - 1 &&
            fn.function === 'Tonic' &&
            /maj|add9|6/.test(chord.symbol)
          )
            score += 0.8;
          if (c.bass && chord.bass !== c.bass) score -= 4;
          return { ...o, score };
        })
        .sort((a, b) => b.score - a.score);
      const choice = ctx.preserveHarmony ? opts[0] : candidates[0];
      const baseBeats = s.frequency === 'Auto' ? event.beats : 4 / Number(s.frequency);
      const selected: ChordEvent = {
        ...event,
        symbol: choice.symbols[0],
        beats: baseBeats,
        explanation: choice.reason,
      };
      result.push(selected);
      if (!next || s.density === 1 || baseBeats < 2) return;
      const nextLine = lines.find((l) => l.id === next.lineId);
      if (nextLine?.section !== line?.section) return;
      const threshold = ((s.density - 1) / 5) * sectionWeight * (s.level === 1 ? 0.6 : 1);
      if (random(seed + 7, i) > threshold) return;
      const passes = passingOptions(selected.symbol, next.symbol, s.key, s.level).filter(
        (o) => o.tension <= maxTension && o.symbols.length + 1 <= baseBeats,
      );
      if (!passes.length) return;
      const targetVoicing = generateVoicing(next.symbol, s.voicingMode);
      const currentVoicing = generateVoicing(selected.symbol, s.voicingMode, previous);
      const scored = passes
        .map((o, j) => {
          let prev = currentVoicing;
          let motion = 0;
          for (const symbol of o.symbols) {
            const v = generateVoicing(symbol, s.voicingMode, prev);
            motion += v.movement;
            prev = v;
          }
          motion += voiceDistance(prev.rh, targetVoicing.rh);
          return {
            ...o,
            score: 5 - motion * 0.2 - o.tension * 0.3 + random(seed + 3, i * 11 + j) * 1.3,
          };
        })
        .sort((a, b) => b.score - a.score);
      const pass = scored[0];
      // With supplied melody, never insert a connector conflicting with a sustained pitch.
      if (
        melody.some(
          (m) =>
            m.sourceId === event.sourceId &&
            m.sustained &&
            pass.symbols.some((symbol) => {
              const notes = parseChord(symbol)!.notes.map(pc);
              return (
                !notes.includes(mod(m.pitch)) &&
                notes.some((n) => [1, 11].includes(mod(n - m.pitch)))
              );
            }),
        )
      )
        return;
      const unit = baseBeats / (pass.symbols.length + 1);
      selected.beats = unit;
      const end =
        next.lineId === event.lineId
          ? next.column
          : Math.max(event.column + 8, line?.lyric.length ?? 0);
      pass.symbols.forEach((symbol, j) =>
        result.push({
          id: `pass-${event.id}-${j}`,
          sourceId: event.sourceId,
          lineId: event.lineId,
          column: event.column + ((end - event.column) * (j + 1)) / (pass.symbols.length + 1),
          symbol,
          beats: unit,
          inserted: true,
          explanation: pass.reason,
        }),
      );
    });
    return result;
  }
}
export const ruleBasedProvider = new RuleBasedProvider();
// Implement this interface server-side for an AI provider. Keep API keys off the client.
export type { ReharmonizationProvider } from '../types/music';
