import { parseChord } from './chordTheory';
import type { ParsedSong, ChordEvent } from '../types/music';
export function parseSong(source: string, beats = 4): ParsedSong {
  const lines: ParsedSong['lines'] = [],
    chords: ChordEvent[] = [],
    warnings: string[] = [];
  let section = 'Verse',
    pending: { symbol: string; column: number; beats?: number }[] = [];
  let title: string | undefined, key: string | undefined;
  const add = (
    lyric: string,
    tokens: { symbol: string; column: number; beats?: number }[],
    heading = false,
  ) => {
    const id = `line-${lines.length}`;
    lines.push({ id, lyric, section, heading });
    tokens.forEach((t) => {
      const cid = `original-${chords.length}`;
      chords.push({ ...t, id: cid, sourceId: cid, lineId: id, beats: t.beats ?? beats });
    });
  };
  const flush = () => {
    if (pending.length) {
      add('', pending);
      pending = [];
    }
  };
  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^Title:\s*/i.test(raw)) {
      flush();
      const metadata = /^Title:\s*(.*?)(?:\s+Key:\s*([A-G][b#]?))?\s*$/i.exec(raw);
      title = metadata?.[1];
      if (metadata?.[2]) key = metadata[2];
      continue;
    }
    if (/^Key:\s*[A-G][b#]?\s*$/i.test(raw)) {
      flush();
      key = raw.replace(/^Key:\s*/i, '').trim();
      continue;
    }
    const header =
      /^\s*(?:\[)?((?:Final\s+)?(?:Intro|Verse|Pre[- ]?Chorus|Chorus|Bridge|Instrumental|Outro)(?:\s+\d+)?)(?:\])?\s*:?[ \t]*$/i.exec(
        raw,
      );
    if (header) {
      flush();
      section = header[1];
      add(section, [], true);
      continue;
    }
    const tokens = [...raw.replace(/\|/g, ' ').matchAll(/\S+/g)];
    if (tokens.length && tokens.every((m) => !!parseChord(m[0]))) {
      flush();
      pending = tokens.map((m) => {
        const start = raw.lastIndexOf('|', m.index!) + 1;
        const nextBar = raw.indexOf('|', m.index!);
        const end = nextBar < 0 ? raw.length : nextBar;
        const count = tokens.filter((t) => t.index! >= start && t.index! < end).length;
        return { symbol: m[0], column: m.index!, beats: raw.includes('|') ? 4 / count : beats };
      });
      continue;
    }
    if (/\[[A-G][^\]]*\]/.test(raw)) {
      flush();
      let lyric = '',
        last = 0;
      const found: { symbol: string; column: number; beats?: number }[] = [];
      for (const m of raw.matchAll(/\[([^\]]+)\]/g)) {
        lyric += raw.slice(last, m.index);
        if (parseChord(m[1])) found.push({ symbol: m[1], column: lyric.length });
        else {
          lyric += m[0];
          warnings.push(`Unrecognized chord ${m[0]} was kept as text.`);
        }
        last = m.index! + m[0].length;
      }
      lyric += raw.slice(last);
      add(lyric, found);
      continue;
    }
    if (pending.length) {
      add(raw, pending);
      pending = [];
      continue;
    }
    // A chord prefix is accepted only before actual lyric text; bracket notation is unambiguous.
    const prefix = /^([A-G](?:#|b)?\S*)[ \t]+(.+)$/.exec(raw);
    if (prefix && parseChord(prefix[1]) && prefix[1] !== 'A' && prefix[1] !== 'Am')
      add(prefix[2], [{ symbol: prefix[1], column: 0 }]);
    else if (
      prefix &&
      parseChord(prefix[1]) &&
      (prefix[1] === 'A' || prefix[1] === 'Am') &&
      /^\s*\[[^\]]+\]/.test(prefix[2])
    )
      add(prefix[2], [{ symbol: prefix[1], column: 0 }]);
    else add(raw, []);
  }
  flush();
  if (!chords.length)
    warnings.push('No chords found. Put chords on a separate line or use [G] inline notation.');
  return { lines, chords, title, key, warnings };
}
