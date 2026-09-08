import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChord, pc, mod, KEYS } from '../src/music/chordTheory';
import { parseSong } from '../src/music/chordParser';
import { detectKey } from '../src/music/keyAnalysis';
import { analyzeChord } from '../src/music/romanNumerals';
import { transposeChord, transposeEvents } from '../src/music/transpose';
import { voiceProgression, generateVoicing } from '../src/music/voicingGenerator';
import { ruleBasedProvider } from '../src/music/reharmonizer';
import { passingOptions } from '../src/music/passingChords';
import { inlineSource } from '../src/music/export';
import type { Settings } from '../src/types/music';
const settings: Settings = {
  title: 'Test',
  artist: '',
  key: 'G',
  bpm: 68,
  level: 3,
  style: 'Gospel',
  density: 5,
  frequency: 'Auto',
  beats: 4,
  notes: '',
  voicingMode: 'Gospel',
};
const symbols = [
  'C',
  'Cm',
  'C7',
  'Cmaj7',
  'Cm7',
  'C9',
  'Cm9',
  'Cmaj9',
  'C11',
  'C13',
  'C6',
  'Cm6',
  'Cadd9',
  'Csus2',
  'Csus4',
  'Cdim',
  'Cdim7',
  'Caug',
  'C7b9',
  'C7#9',
  'C7#5',
  'C7b5',
  'Cm7b5',
  'C/G',
  'Cmaj9/E',
  'F#dim7',
  'Bbmaj9',
  'D13sus',
  'B7(b9)',
];
test('all requested chord spellings parse and invalid text is rejected', () => {
  for (const s of symbols) {
    const c = parseChord(s);
    assert.ok(c, s);
    assert.ok(c.notes.length >= 3, s);
  }
  for (const s of ['Hello', 'Cmystery', 'Cgarbage', 'H7', 'Amazing'])
    assert.equal(parseChord(s), null, s);
});
test('extensions, alterations, suspended and diminished tones are correct', () => {
  const expected: Record<string, string[]> = {
    Cmaj9: ['C', 'E', 'G', 'B', 'D'],
    Cdim7: ['C', 'Eb', 'Gb', 'Bbb'],
    Cm7b5: ['C', 'Eb', 'Gb', 'Bb'],
    C7b9: ['C', 'E', 'G', 'Bb', 'Db'],
    'C7#9': ['C', 'E', 'G', 'Bb', 'D#'],
    C13: ['C', 'E', 'G', 'Bb', 'D', 'A'],
    Csus2: ['C', 'D', 'G'],
    Csus4: ['C', 'F', 'G'],
    'F#dim7': ['F#', 'A', 'C', 'Eb'],
  };
  for (const [s, n] of Object.entries(expected)) assert.deepEqual(parseChord(s)!.notes, n, s);
});
test('lyrics, whitespace and anchor columns are retained', () => {
  const parsed = parseSong('[Verse]\nG         C\nI  love   You Lord\n\n[Em]Hold me [D]close!');
  assert.equal(parsed.lines[1].lyric, 'I  love   You Lord');
  assert.equal(parsed.lines[3].lyric, 'Hold me close!');
  assert.equal(parsed.chords[1].column, 10);
  assert.equal(parsed.chords[3].column, 8);
  assert.deepEqual(
    parsed.chords.map((c) => c.symbol),
    ['G', 'C', 'Em', 'D'],
  );
});
test('inline prefixes and metadata are understood', () => {
  const p = parseSong('Title: Song\nKey: G\nG I love You Lord\nC Oh Your mercy never fails me');
  assert.equal(p.title, 'Song');
  assert.equal(p.key, 'G');
  assert.deepEqual(
    p.lines.map((l) => l.lyric),
    ['I love You Lord', 'Oh Your mercy never fails me'],
  );
});
test('key estimate and dominant destinations', () => {
  const p = parseSong('G C G Em Am D G');
  assert.equal(detectKey(p.chords).key, 'G');
  assert.equal(analyzeChord('B7(b9)', 'G', 'Em9').function, 'Secondary dominant');
  assert.equal(analyzeChord('Ab7', 'G', 'Gmaj9').function, 'Passing harmony');
  assert.equal(analyzeChord('D13', 'G', 'Gmaj9').roman, 'V13');
});
test('transpose round trips all supported chords and keys by pitch', () => {
  for (const s of symbols)
    for (const key of KEYS) {
      const result = transposeChord(s, pc(key), key);
      assert.ok(parseChord(result), result);
      assert.deepEqual(
        parseChord(result)!.notes.map((n) => mod(pc(n) - pc(key))),
        parseChord(s)!.notes.map(pc),
        result,
      );
    }
});
test('generated notes must belong to the chord or its explicit bass', () => {
  for (const s of symbols)
    for (const mode of ['Simple', 'Worship', 'Gospel', 'Jazz', 'Neo-Soul'] as const) {
      const c = parseChord(s)!;
      const allowed = c.notes.map(pc).concat(c.bass ? [pc(c.bass)] : []);
      const v = generateVoicing(s, mode);
      for (const n of [...v.lh, ...v.rh])
        assert.ok(allowed.includes(mod(n)), `${s} ${mode}: extra pitch ${n}`);
      assert.ok([...v.lh, ...v.rh].every((n) => n >= 36 && n <= 96));
    }
});
test('sequence engine preserves lyrics, anchor chords, timing and valid voicings in every key and level', () => {
  for (const key of KEYS)
    for (const level of [1, 2, 3, 4]) {
      const parsed = parseSong(
        '[Verse]\nG       C\nOne  unchanged line\nG Em Am D G\n[Bridge]\nC D Em G\nAnother lyric',
      );
      const org = transposeEvents(parsed.chords, 'G', key);
      const before = JSON.stringify(parsed.lines);
      const result = ruleBasedProvider.generate({
        original: org,
        lines: parsed.lines,
        settings: { ...settings, key, level },
        seed: 5,
      });
      assert.equal(JSON.stringify(parsed.lines), before);
      assert.equal(result.filter((e) => !e.inserted).length, org.length);
      assert.ok(
        Math.abs(
          result.reduce((sum, e) => sum + e.beats, 0) - org.reduce((sum, e) => sum + e.beats, 0),
        ) < 0.0001,
      );
      for (const e of result) {
        assert.ok(parseChord(e.symbol), e.symbol);
        assert.ok(e.beats > 0);
      }
      assert.equal(new Set(result.map((e) => e.id)).size, result.length);
      const voices = voiceProgression(result, 'Gospel');
      assert.ok(voices.every((v) => v.rh.length >= 3));
    }
});
test('sustained melody guard and same-seed reproducibility', () => {
  const p = parseSong('[Verse]\nG Em C D G');
  const context = { original: p.chords, lines: p.lines, settings, seed: 42 };
  assert.deepEqual(ruleBasedProvider.generate(context), ruleBasedProvider.generate(context));
  const result = ruleBasedProvider.generate({
    ...context,
    melody: [{ sourceId: p.chords[0].sourceId, pitch: 71, sustained: true }],
  });
  assert.ok(result.length >= p.chords.length);
});
test('passing options target arbitrary destinations and parse correctly', () => {
  for (const target of symbols) {
    const options = passingOptions('Gmaj9', target, 'G');
    assert.ok(options.length >= 2 && options.length <= 5);
    for (const o of options) for (const c of o.symbols) assert.ok(parseChord(c), c);
  }
});
test('editable source export roundtrip keeps exact lyrics and chord anchors', () => {
  const p = parseSong('[Verse]\nG       C\nA  lyric, with spaces!\n\n[Em]Held [D]in Your hands');
  const exported = inlineSource(p.lines, p.chords);
  const again = parseSong(exported);
  assert.deepEqual(
    again.lines.map((l) => l.lyric),
    p.lines.map((l) => l.lyric),
  );
  assert.deepEqual(
    again.chords.map((e) => [e.symbol, e.column]),
    p.chords.map((e) => [e.symbol, e.column]),
  );
});
test('explicit bar lines share a four-beat bar without changing anchors', () => {
  const p = parseSong('| G C | Em D |\nEvery word stays');
  assert.deepEqual(
    p.chords.map((e) => e.beats),
    [2, 2, 2, 2],
  );
  assert.equal(p.lines[0].lyric, 'Every word stays');
  assert.deepEqual(
    p.chords.map((e) => e.column),
    [2, 4, 8, 11],
  );
});
test('metadata on a single title/key line', () => {
  const p = parseSong('Title: Goodness of God Key: G\nG\nI love You Lord');
  assert.equal(p.title, 'Goodness of God');
  assert.equal(p.key, 'G');
});
test('borrowed harmony and passing chord Roman labels retain their quality', () => {
  assert.equal(analyzeChord('Cm6', 'G', 'Gmaj9').function, 'Modal interchange');
  assert.equal(analyzeChord('Ab7', 'G', 'Gmaj9').roman, 'bII7');
  assert.equal(analyzeChord('C#dim7', 'G', 'D13').roman, '#iv°7');
});
test('passing-only generation preserves chosen main symbols', () => {
  const p = parseSong('[Chorus]\nGadd9 B7b9 Em9 D13');
  const result = ruleBasedProvider.generate({
    original: p.chords,
    lines: p.lines,
    settings,
    seed: 7,
    preserveHarmony: true,
  });
  assert.deepEqual(
    result.filter((e) => !e.inserted).map((e) => e.symbol),
    p.chords.map((e) => e.symbol),
  );
});
