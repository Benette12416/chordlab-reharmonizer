import { useState, useMemo, useRef, useEffect } from 'react';
import {
  AudioLines,
  Music2,
  FolderOpen,
  Save,
  Download,
  ChevronDown,
  Undo2,
  Redo2,
  ClipboardPaste,
  Sparkles,
  Play,
  ArrowLeftRight,
  BookOpen,
  GraduationCap,
  Plus,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  Settings,
  ChordEvent,
  SongLine,
  SavedSong,
  FavoriteVoicing,
  Voicing,
} from './types/music';
import { parseSong } from './music/chordParser';
import { detectKey } from './music/keyAnalysis';
import { ruleBasedProvider } from './music/reharmonizer';
import { voiceProgression, generateVoicing } from './music/voicingGenerator';
import { pianoAudio } from './music/playback';
import { transposeEvents } from './music/transpose';
import { passingOptions } from './music/passingChords';
import { alternatives } from './music/substitutions';
import { KEYS, midiName, preferFlats } from './music/chordTheory';
import { exportText, exportChordPro, exportPdf, inlineSource } from './music/export';
import { songRepository, favoriteRepository, readLocal } from './storage/songRepository';
import { ChordChart } from './components/ChordChart';
import { ChordButton } from './components/ChordButton';
import { PianoKeyboard } from './components/PianoKeyboard';
import { SongEditor } from './components/SongEditor';
import { ReharmonizationControls } from './components/ReharmonizationControls';
import { PlaybackControls } from './components/PlaybackControls';
import { ChordInspector } from './components/ChordInspector';
import { SongLibrary } from './components/SongLibrary';
const SAMPLE =
  "Title: Goodness of God\nKey: G\n\n[Verse]\nG\nI love You Lord\nC\nOh Your mercy never fails me\nG\nAll my days\nEm        D\nI've been held in Your hands";
const DEFAULT: Settings = {
  title: 'Goodness of God',
  artist: '',
  key: 'G',
  bpm: 68,
  level: 3,
  style: 'Gospel',
  density: 3,
  frequency: 'Auto',
  beats: 4,
  voicingMode: 'Gospel',
  notes: '',
};
interface Snapshot {
  source: string;
  settings: Settings;
  lines: SongLine[];
  original: ChordEvent[];
  generated: ChordEvent[];
  songId: string;
}
function initial(): Snapshot {
  const saved = readLocal<Snapshot | null>('chordlab:draft:v1', null);
  if (
    saved?.settings &&
    Array.isArray(saved.lines) &&
    Array.isArray(saved.original) &&
    Array.isArray(saved.generated) &&
    typeof saved.source === 'string'
  )
    return { ...saved, settings: { ...DEFAULT, ...saved.settings } };
  const parsed = parseSong(SAMPLE);
  return {
    source: SAMPLE,
    settings: DEFAULT,
    lines: parsed.lines,
    original: parsed.chords,
    generated: ruleBasedProvider.generate({
      original: parsed.chords,
      lines: parsed.lines,
      settings: DEFAULT,
      seed: 1,
    }),
    songId: crypto.randomUUID(),
  };
}
export default function App() {
  const [data, setData] = useState<Snapshot>(initial);
  const { settings: s, source, lines, original, generated } = data;
  const [view, setView] = useState<'studio' | 'library'>('studio'),
    [editor, setEditor] = useState(false),
    [buffer, setBuffer] = useState(source),
    [selected, setSelected] = useState(generated[0]?.id ?? ''),
    [compare, setCompare] = useState(false),
    [practice, setPractice] = useState(false),
    [explain, setExplain] = useState(true),
    [notation, setNotation] = useState('Chords'),
    [settingsOpen, setSettingsOpen] = useState(false);
  const [past, setPast] = useState<Snapshot[]>([]),
    [future, setFuture] = useState<Snapshot[]>([]),
    [toast, setToast] = useState(''),
    [warning, setWarning] = useState(''),
    [exportOpen, setExportOpen] = useState(false),
    [transposeOpen, setTransposeOpen] = useState(false),
    [targetKey, setTargetKey] = useState(s.key),
    [gap, setGap] = useState<string | null>(null),
    [gapRotation, setGapRotation] = useState(0);
  const [songs, setSongs] = useState(songRepository.list),
    [favorites, setFavorites] = useState(favoriteRepository.list),
    [favoritePreview, setFavoritePreview] = useState<{ symbol: string; v: Voicing } | null>(null),
    [singleNote, setSingleNote] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false),
    [paused, setPaused] = useState(false),
    [loop, setLoop] = useState(false),
    [volume, setVolume] = useState(0.65),
    [sustain, setSustain] = useState(true),
    [arpeggiate, setArpeggiate] = useState(false);
  const seed = useRef(1),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    deadline = useRef(0),
    remaining = useRef(0),
    playIndex = useRef(0),
    playingRef = useRef(false),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voices = useMemo(
    () => voiceProgression(generated, s.voicingMode),
    [generated, s.voicingMode],
  );
  const originalVoices = useMemo(
    () => voiceProgression(original, s.voicingMode),
    [original, s.voicingMode],
  );
  const index = generated.findIndex((e) => e.id === selected),
    originalIndex = original.findIndex((e) => e.id === selected.replace(/^source:/, ''));
  const current = index >= 0 ? generated[index] : original[originalIndex];
  const currentVoice = index >= 0 ? voices[index] : originalVoices[originalIndex];
  const next = index >= 0 ? generated[index + 1] : original[originalIndex + 1];
  const detected = useMemo(() => detectKey(original), [original]);
  const selectedSection = lines.find((l) => l.id === current?.lineId)?.section ?? 'Verse';
  const latest = useRef({ generated, voices, bpm: s.bpm, loop });
  latest.current = { generated, voices, bpm: s.bpm, loop };
  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4500);
  }
  function stop(reset = false) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    playingRef.current = false;
    setPlaying(false);
    setPaused(false);
    remaining.current = 0;
    pianoAudio.stop();
    if (reset) {
      playIndex.current = 0;
      setSelected(generated[0]?.id ?? '');
    }
  }
  function commit(nextData: Snapshot) {
    stop();
    setPast((p) => [...p.slice(-79), data]);
    setFuture([]);
    setData(nextData);
    setFavoritePreview(null);
    setSingleNote(null);
  }
  function patchSettings(patch: Partial<Settings>) {
    stop();
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
    setFuture([]);
  }
  function undo() {
    if (!past.length) return;
    stop();
    const previous = past.at(-1)!;
    setFuture((f) => [data, ...f]);
    setPast((p) => p.slice(0, -1));
    setData(previous);
    setSelected(previous.generated[0]?.id ?? '');
  }
  function redo() {
    if (!future.length) return;
    stop();
    const nextData = future[0];
    setPast((p) => [...p, data]);
    setFuture((f) => f.slice(1));
    setData(nextData);
    setSelected(nextData.generated[0]?.id ?? '');
  }
  useEffect(() => {
    try {
      localStorage.setItem('chordlab:draft:v1', JSON.stringify(data));
    } catch {
      setWarning('Autosave is unavailable. Export your chart to keep a copy.');
    }
  }, [data]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      pianoAudio.stop();
    },
    [],
  );
  useEffect(() => {
    pianoAudio.setVolume(volume);
    pianoAudio.sustain = sustain;
    pianoAudio.arpeggiate = arpeggiate;
  }, [volume, sustain, arpeggiate]);
  async function sound(v: Voicing, duration = 1.8) {
    try {
      await pianoAudio.play([...v.lh, ...v.rh], duration);
    } catch {
      stop();
      notify('Audio could not start. Check your browser sound permissions, then try Play again.');
    }
  }
  function select(id: string) {
    stop();
    setSingleNote(null);
    setFavoritePreview(null);
    setSelected(id);
    const i = generated.findIndex((e) => e.id === id),
      oi = original.findIndex((e) => e.id === id.replace(/^source:/, ''));
    const v = i >= 0 ? voices[i] : originalVoices[oi];
    if (v) void sound(v);
  }
  function replay() {
    if (currentVoice) {
      stop();
      setSingleNote(null);
      setFavoritePreview(null);
      void sound(currentVoice);
    }
  }
  function step(delta: number) {
    const start = index >= 0 ? index : 0;
    select(generated[Math.max(0, Math.min(generated.length - 1, start + delta))]?.id ?? '');
  }
  function tick(i: number, resumeMs = 0) {
    const state = latest.current;
    if (!playingRef.current || !state.generated.length) return;
    if (i >= state.generated.length) {
      if (state.loop) i = 0;
      else {
        stop();
        return;
      }
    }
    playIndex.current = i;
    const e = state.generated[i],
      v = state.voices[i];
    setSelected(e.id);
    setSingleNote(null);
    setFavoritePreview(null);
    const duration = (e.beats * 60) / state.bpm;
    const ms = resumeMs || duration * 1000;
    deadline.current = performance.now() + ms;
    void sound(v, ms / 1000);
    timer.current = setTimeout(() => tick(i + 1), ms);
  }
  function play() {
    if (!generated.length) return;
    if (timer.current) clearTimeout(timer.current);
    playingRef.current = true;
    setPlaying(true);
    setPaused(false);
    tick(paused ? playIndex.current : Math.max(0, index), paused ? remaining.current : 0);
    remaining.current = 0;
  }
  function pause() {
    if (timer.current) clearTimeout(timer.current);
    remaining.current = Math.max(1, deadline.current - performance.now());
    playingRef.current = false;
    setPlaying(false);
    setPaused(true);
    pianoAudio.stop();
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (
        ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(el.tagName) ||
        el.isContentEditable ||
        editor ||
        gap ||
        transposeOpen
      )
        return;
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        step(-1);
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        step(1);
      }
      if (e.code === 'Space') {
        e.preventDefault();
        replay();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
  async function pasteClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) throw new Error();
      setBuffer(text);
      setEditor(true);
    } catch {
      setEditor(true);
      notify('Paste your song into the editor using Ctrl+V, Cmd+V, or long-press Paste.');
    }
  }
  function analyze() {
    const parsed = parseSong(buffer, s.beats);
    if (!parsed.chords.length) {
      setWarning(parsed.warnings.join(' '));
      return;
    }
    const key = parsed.key && KEYS.includes(parsed.key) ? parsed.key : s.key;
    const settings = { ...s, key, title: parsed.title || s.title };
    const reharm = ruleBasedProvider.generate({
      original: parsed.chords,
      lines: parsed.lines,
      settings,
      seed: ++seed.current,
    });
    commit({
      ...data,
      source: buffer,
      lines: parsed.lines,
      original: parsed.chords,
      generated: reharm,
      settings,
    });
    setSelected(reharm[0]?.id ?? '');
    setWarning(parsed.warnings.join(' '));
    setEditor(false);
    notify(`Analyzed ${parsed.chords.length} chords. Lyrics preserved.`);
  }
  function regenerate(scope: 'song' | 'section' | 'passing' = 'song') {
    if (!original.length) {
      setEditor(true);
      return;
    }
    let result: ChordEvent[];
    if (scope === 'passing') {
      const base = generated
        .filter((e) => !e.inserted)
        .map((e) => ({
          ...e,
          beats: generated
            .filter((x) => x.sourceId === e.sourceId)
            .reduce((sum, x) => sum + x.beats, 0),
        }));
      const fresh = ruleBasedProvider.generate({
        original: base,
        lines,
        settings: { ...s, frequency: 'Auto' },
        seed: ++seed.current,
        preserveHarmony: true,
      });
      result = fresh.map((e) =>
        e.inserted ? e : { ...e, symbol: base.find((x) => x.id === e.id)?.symbol ?? e.symbol },
      );
    } else {
      const fresh = ruleBasedProvider.generate({
        original,
        lines,
        settings: s,
        seed: ++seed.current,
      });
      if (scope === 'section') {
        const at = lines.findIndex((l) => l.id === current?.lineId);
        let start = Math.max(0, at),
          end = lines.length;
        while (start > 0 && !lines[start].heading) start--;
        for (let j = Math.max(0, at) + 1; j < lines.length; j++) {
          if (lines[j].heading) {
            end = j;
            break;
          }
        }
        const ids = new Set(lines.slice(start, end).map((l) => l.id));
        result = lines.flatMap((l) =>
          (ids.has(l.id) ? fresh : generated).filter((e) => e.lineId === l.id),
        );
      } else result = fresh;
    }
    commit({ ...data, generated: result });
    setSelected(result.find((e) => e.id === selected)?.id ?? result[0]?.id ?? '');
    notify(
      scope === 'section'
        ? `${selectedSection} reharmonized.`
        : scope === 'passing'
          ? 'Passing harmony regenerated.'
          : 'New harmony, same lyrics.',
    );
  }
  function replaceSelected(symbols: string[], reason: string) {
    if (index < 0) {
      notify('Select a chord in the reharmonized chart first.');
      return;
    }
    const e = generated[index];
    const replacements = symbols.map((symbol, j) => ({
      ...e,
      id: j ? crypto.randomUUID() : e.id,
      symbol,
      beats: e.beats / symbols.length,
      inserted: j > 0 || e.inserted,
      column: e.column + j * 2,
      explanation: reason,
    }));
    commit({
      ...data,
      generated: [...generated.slice(0, index), ...replacements, ...generated.slice(index + 1)],
    });
    setSelected(replacements[0].id);
    notify('Alternative applied.');
  }
  function regenerateSelected() {
    if (!current) return;
    const options = alternatives(current.symbol, s.key, next?.symbol).filter(
      (o) => o.tension <= s.level,
    );
    if (options.length) {
      const option = options[++seed.current % options.length];
      replaceSelected(option.symbols, option.reason);
    }
  }
  function addPassing(symbols: string[], reason: string) {
    const i = generated.findIndex((e) => e.id === gap);
    if (i < 0) return;
    const e = generated[i],
      n = generated[i + 1];
    const unit = e.beats / (symbols.length + 1);
    const end =
      n?.lineId === e.lineId
        ? n.column
        : Math.max(e.column + 8, lines.find((l) => l.id === e.lineId)?.lyric.length ?? 0);
    const inserts = symbols.map((symbol, j) => ({
      ...e,
      id: crypto.randomUUID(),
      symbol,
      beats: unit,
      column: e.column + ((end - e.column) * (j + 1)) / (symbols.length + 1),
      inserted: true,
      explanation: reason,
    }));
    commit({
      ...data,
      generated: [
        ...generated.slice(0, i),
        { ...e, beats: unit },
        ...inserts,
        ...generated.slice(i + 1),
      ],
    });
    setGap(null);
    notify('Passing chords inserted within the existing duration.');
  }
  function transpose(key: string) {
    if (key === s.key) {
      setTransposeOpen(false);
      return;
    }
    const org = transposeEvents(original, s.key, key),
      gen = transposeEvents(generated, s.key, key);
    commit({
      ...data,
      settings: { ...s, key },
      original: org,
      generated: gen,
      source: `Title: ${s.title}\nKey: ${key}\n` + inlineSource(lines, org),
    });
    setTransposeOpen(false);
    notify(`Transposed from ${s.key} to ${key}.`);
  }
  function save() {
    try {
      const song: SavedSong = { ...data, id: data.songId, savedAt: new Date().toISOString() };
      songRepository.save(song);
      setSongs(songRepository.list());
      notify('Song saved on this device.');
    } catch {
      notify('Could not save. Your device storage may be full. Export a copy.');
    }
  }
  function newSong() {
    const empty = { ...DEFAULT, title: 'Untitled song', key: s.key, bpm: s.bpm };
    commit({
      source: '',
      settings: empty,
      lines: [],
      original: [],
      generated: [],
      songId: crypto.randomUUID(),
    });
    setBuffer('');
    setSelected('');
    setEditor(true);
    setView('studio');
    setWarning('');
    notify('New song ready. Previous work is available with Undo.');
  }
  function load(song: SavedSong) {
    commit({
      source: song.source,
      settings: { ...DEFAULT, ...song.settings },
      lines: song.lines,
      original: song.original,
      generated: song.generated,
      songId: song.id,
    });
    setSelected(song.generated[0]?.id ?? '');
    setView('studio');
    setBuffer(song.source);
    setWarning('');
    notify(`Opened ${song.settings.title}.`);
  }
  function saveFavorite() {
    if (!current || !currentVoice) return;
    try {
      favoriteRepository.save({
        id: current.symbol + ':' + [...currentVoice.lh, ...currentVoice.rh].join(','),
        symbol: current.symbol,
        lh: currentVoice.lh,
        rh: currentVoice.rh,
      });
      setFavorites(favoriteRepository.list());
      notify('Voicing saved to your collection.');
    } catch {
      notify('Could not save this voicing. Check device storage.');
    }
  }
  function assignSection(lineId: string, section: string) {
    const pos = lines.findIndex((l) => l.id === lineId);
    let active = true;
    const updated = lines.map((l, i) => {
      if (i < pos) return l;
      if (i > pos && l.heading) active = false;
      return active ? { ...l, section } : l;
    });
    if (pos >= 0 && !lines[pos].heading)
      updated.splice(pos, 0, { id: crypto.randomUUID(), lyric: section, section, heading: true });
    commit({ ...data, lines: updated });
  }
  useEffect(() => {
    if (!gap && !transposeOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGap(null);
        setTransposeOpen(false);
      }
      if (e.key === 'Tab') {
        const nodes = Array.from(
          document.querySelectorAll<HTMLElement>(
            '.modal button:not(:disabled), .modal select, .modal input',
          ),
        );
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handle);
    return () => {
      document.removeEventListener('keydown', handle);
      previous?.focus();
    };
  }, [gap, transposeOpen]);
  const gapIndex = generated.findIndex((e) => e.id === gap);
  const gapOptions =
    gapIndex >= 0 && generated[gapIndex + 1]
      ? passingOptions(generated[gapIndex].symbol, generated[gapIndex + 1].symbol, s.key, s.level)
      : [];
  const rotatedGap = gapOptions.map((_, i) => gapOptions[(i + gapRotation) % gapOptions.length]);
  const displayVoice =
    singleNote !== null
      ? { lh: [], rh: [singleNote] }
      : (favoritePreview?.v ?? currentVoice ?? { lh: [], rh: [] });
  const average =
    voices.slice(1).reduce((sum, v) => sum + v.movement, 0) / Math.max(1, voices.length - 1);
  const totalBeats = generated.reduce((sum, e) => sum + e.beats, 0);
  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView('studio');
          }}
        >
          <span className="brand-icon">
            <AudioLines size={23} />
          </span>
          <span>
            chordlab<span className="brand-dot">.</span>
            <small>REHARMONIZER</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <button className={view === 'studio' ? 'active' : ''} onClick={() => setView('studio')}>
            <Music2 size={16} /> Studio
          </button>
          <button
            className={view === 'library' ? 'active' : ''}
            onClick={() => {
              stop();
              setView('library');
            }}
          >
            <FolderOpen size={16} /> My library <span>{songs.length}</span>
          </button>
        </nav>
        <div className="topbar-actions">
          <span className="local-label">
            <span /> Local workspace
          </span>
          <button onClick={save}>
            <Save size={15} /> <span>Save song</span>
          </button>
          <div className="dropdown-anchor">
            <button
              className="export-button"
              onClick={() => setExportOpen(!exportOpen)}
              aria-expanded={exportOpen}
            >
              <Download size={15} />
              <span>Export</span>
              <ChevronDown size={14} />
            </button>
            {exportOpen && (
              <div className="dropdown-menu">
                <button
                  onClick={() => {
                    exportText(s, lines, generated);
                    setExportOpen(false);
                  }}
                >
                  Export TXT
                </button>
                <button
                  onClick={() => {
                    exportChordPro(s, lines, generated);
                    setExportOpen(false);
                  }}
                >
                  Export chord chart (.cho)
                </button>
                <button
                  onClick={() => {
                    setExportOpen(false);
                    void exportPdf(s, lines, generated).catch(() =>
                      notify('PDF export failed. Try Print → Save as PDF or export TXT.'),
                    );
                  }}
                >
                  Export PDF
                </button>
                <button
                  onClick={() => {
                    setExportOpen(false);
                    window.print();
                  }}
                >
                  Print chart
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      {view === 'library' ? (
        <SongLibrary
          onNew={newSong}
          songs={songs}
          favorites={favorites}
          onLoad={load}
          onDelete={(id) => {
            if (!window.confirm('Delete this saved song from this device?')) return;
            try {
              songRepository.remove(id);
              setSongs(songRepository.list());
              notify('Saved song deleted.');
            } catch {
              notify('Could not delete song.');
            }
          }}
          onPlayFavorite={(v) => {
            stop();
            setSingleNote(null);
            const voice = { lh: v.lh, rh: v.rh, movement: 0, score: 'Excellent' as const };
            setFavoritePreview({ symbol: v.symbol, v: voice });
            void sound(voice);
          }}
          onDeleteFavorite={(id) => {
            try {
              favoriteRepository.remove(id);
              setFavorites(favoriteRepository.list());
            } catch {
              notify('Could not delete voicing.');
            }
          }}
        />
      ) : (
        <>
          <div className="workspace-intro">
            <div>
              <span className="eyebrow">THE REHARMONIZATION STUDIO</span>
              <h1>
                Make room for a little more color<span>.</span>
              </h1>
            </div>
            <div className="intro-actions">
              <button title="Start a new song" onClick={newSong}>
                <Plus size={16} /> New song
              </button>
              <button className="mobile-settings" onClick={() => setSettingsOpen(!settingsOpen)}>
                <SlidersHorizontal size={16} /> Settings
              </button>
              <button
                onClick={() => {
                  setBuffer(source);
                  setEditor(true);
                }}
              >
                <ClipboardPaste size={16} /> Paste song
              </button>
            </div>
          </div>
          <main className={`studio-grid ${settingsOpen ? 'show-settings' : ''}`}>
            <ReharmonizationControls
              settings={s}
              onChange={patchSettings}
              onGenerate={() => regenerate()}
              detected={detected.key}
              onDetect={() => {
                patchSettings({ key: detected.key });
                notify(
                  `${detected.key} major · ${detected.confidence.toLowerCase()} estimate. Check the song's tonal center.`,
                );
              }}
              onTranspose={transpose}
            />
            <section className="chart-panel">
              <div className="chart-topline">
                <div className="view-tabs">
                  <button
                    className={!compare && !practice ? 'active' : ''}
                    onClick={() => {
                      setCompare(false);
                      setPractice(false);
                    }}
                  >
                    Chord chart
                  </button>
                  <button
                    className={compare ? 'active' : ''}
                    onClick={() => {
                      setCompare(!compare);
                      setPractice(false);
                    }}
                  >
                    <ArrowLeftRight size={14} /> Compare
                  </button>
                  <button
                    className={practice ? 'active' : ''}
                    onClick={() => {
                      setPractice(!practice);
                      setCompare(false);
                    }}
                  >
                    <GraduationCap size={15} /> Practice
                  </button>
                </div>
                <div className="history-actions">
                  <button
                    className="icon-button"
                    onClick={undo}
                    disabled={!past.length}
                    aria-label="Undo reharmonization"
                  >
                    <Undo2 size={17} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={redo}
                    disabled={!future.length}
                    aria-label="Redo"
                  >
                    <Redo2 size={17} />
                  </button>
                </div>
              </div>
              <div className="chart-title">
                <div>
                  <div className="eyebrow">
                    {compare
                      ? 'SIDE BY SIDE'
                      : practice
                        ? 'SLOW DOWN. LISTEN. PLAY.'
                        : 'YOUR ARRANGEMENT'}
                  </div>
                  <h2>{s.title || 'Untitled song'}</h2>
                  <p>
                    {s.artist && (
                      <span>
                        {s.artist} <span className="dot-separator">·</span>{' '}
                      </span>
                    )}
                    <span>
                      Key of <b>{s.key}</b>
                    </span>
                    <span className="dot-separator">·</span>
                    <span>{s.bpm} BPM</span>
                    <span className="dot-separator">·</span>
                    <span>4/4</span>
                  </p>
                </div>
                <button
                  className="subtle-button"
                  onClick={() => {
                    setTargetKey(s.key);
                    setTransposeOpen(true);
                  }}
                >
                  <ArrowLeftRight size={14} /> Transpose
                </button>
              </div>
              <div className="chart-options">
                <span className="arrangement-badge">
                  <Sparkles size={12} />
                  {s.style} · Level {s.level}
                </span>
                <div>
                  <button
                    className={`explain-toggle ${explain ? 'on' : ''}`}
                    onClick={() => setExplain(!explain)}
                    aria-pressed={explain}
                  >
                    <BookOpen size={14} /> Explain
                  </button>
                  <select
                    aria-label="Chord notation"
                    value={notation}
                    onChange={(e) => setNotation(e.target.value)}
                  >
                    <option>Chords</option>
                    <option>Roman</option>
                    <option>Nashville</option>
                  </select>
                </div>
              </div>
              {warning && (
                <div className="warning" role="status">
                  {warning}
                  <button onClick={() => setWarning('')} aria-label="Dismiss warning">
                    <X size={14} />
                  </button>
                </div>
              )}
              {editor ? (
                <SongEditor
                  source={buffer}
                  onChange={setBuffer}
                  onAnalyze={analyze}
                  onClose={() => setEditor(false)}
                  onPaste={() => void pasteClipboard()}
                />
              ) : practice ? (
                <div className="practice-view">
                  <span className="eyebrow">
                    {selectedSection} · CHORD {Math.max(1, index + 1)} OF {generated.length}
                  </span>
                  <div className="practice-current">{current?.symbol ?? 'Select a chord'}</div>
                  <div className="practice-neighbors">
                    <button onClick={() => step(-1)} disabled={index <= 0}>
                      <ChevronLeft size={18} />
                      <span>
                        Previous<strong>{generated[index - 1]?.symbol ?? 'Start'}</strong>
                      </span>
                    </button>
                    <button className="primary" onClick={replay}>
                      <Play size={18} /> Play chord
                    </button>
                    <button onClick={() => step(1)} disabled={index === generated.length - 1}>
                      <span>
                        Next<strong>{next?.symbol ?? 'End'}</strong>
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  <p>Left / right arrows to move · Space to play</p>
                  <div className="practice-voicing">
                    <span>
                      LH{' '}
                      <b>
                        {currentVoice?.lh.map((n) => midiName(n, preferFlats(s.key))).join(' · ')}
                      </b>
                    </span>
                    <span>
                      RH{' '}
                      <b>
                        {currentVoice?.rh.map((n) => midiName(n, preferFlats(s.key))).join(' · ')}
                      </b>
                    </span>
                  </div>
                  <p className="hint">
                    Suggested fingering: LH 5–1 for a two-note spread; RH use comfortable adjacent
                    fingers. Redistribute wide shapes between hands.
                  </p>
                </div>
              ) : (
                <div className={compare ? 'compare-grid' : 'chart-scroll'}>
                  {compare && (
                    <div>
                      <div className="compare-label">ORIGINAL</div>
                      <ChordChart
                        lines={lines}
                        events={original}
                        selected={selected.replace(/^source:/, '')}
                        onSelect={(id) => select('source:' + id)}
                        songKey={s.key}
                        notation={notation}
                        original
                      />
                    </div>
                  )}
                  <div>
                    {compare && <div className="compare-label accent">REHARMONIZED</div>}
                    <ChordChart
                      lines={lines}
                      events={generated}
                      selected={selected}
                      onSelect={select}
                      onGap={(id) => {
                        stop();
                        setGap(id);
                        setGapRotation(0);
                      }}
                      songKey={s.key}
                      notation={notation}
                      onSection={assignSection}
                    />
                  </div>
                </div>
              )}
              <div className="section-assignment">
                <label>
                  Selected section
                  <select
                    aria-label="Assign selected phrase to a section"
                    value={selectedSection}
                    onChange={(e) => {
                      if (current) assignSection(current.lineId, e.target.value);
                    }}
                  >
                    {Array.from(
                      new Set([
                        selectedSection,
                        'Intro',
                        'Verse',
                        'Pre-Chorus',
                        'Chorus',
                        'Bridge',
                        'Instrumental',
                        'Final Chorus',
                        'Outro',
                      ]),
                    ).map((section) => (
                      <option key={section}>{section}</option>
                    ))}
                  </select>
                </label>
                <span>Applies from the selected line to the next heading.</span>
              </div>
              <div className="chart-bottom-actions">
                <button
                  className="text-button"
                  onClick={() => {
                    setBuffer(source);
                    setEditor(!editor);
                  }}
                >
                  <Plus size={15} /> Edit lyrics & chords
                </button>
                <div className="dropdown-anchor">
                  <details>
                    <summary>
                      <RotateCcw size={14} /> Regenerate <ChevronDown size={12} />
                    </summary>
                    <div className="dropdown-menu regenerate-menu">
                      <button onClick={() => regenerate()}>Entire song</button>
                      <button onClick={() => regenerate('section')}>
                        {selectedSection} section
                      </button>
                      <button onClick={regenerateSelected}>Selected chord</button>
                      <button onClick={() => regenerate('passing')}>Passing chords</button>
                    </div>
                  </details>
                </div>
              </div>
              <div className="chart-footer">
                <span>
                  <i className="legend-original" /> Main harmony
                </span>
                <span>
                  <i className="legend-passing" /> Passing chord
                </span>
                <span className="lyrics-lock">
                  <Check size={12} /> Lyrics preserved
                </span>
              </div>
            </section>
            <ChordInspector
              event={current}
              next={next}
              voicing={currentVoice}
              songKey={s.key}
              onAlternative={replaceSelected}
              onFavorite={saveFavorite}
              onRegenerate={regenerateSelected}
              onBeats={(beats) => {
                if (index < 0) return;
                commit({
                  ...data,
                  generated: generated.map((e) => (e.id === selected ? { ...e, beats } : e)),
                });
              }}
              explain={explain}
              onReplay={replay}
            />
          </main>
          <section className="timeline-panel">
            <div className="timeline-label">
              <AudioLines size={17} />
              <h2>Progression</h2>
              <span>
                {generated.length} chords · {Number(totalBeats.toFixed(1))} beats
              </span>
              <span className="voice-leading-summary">
                Voice leading{' '}
                <b>{average <= 2 ? 'Excellent' : average <= 4 ? 'Good' : 'Moderate'}</b>
              </span>
            </div>
            <div className="timeline">
              {generated.map((e, i) => (
                <div key={e.id} className="timeline-item">
                  <span className="timeline-number">{String(i + 1).padStart(2, '0')}</span>
                  <ChordButton
                    event={e}
                    selected={selected === e.id}
                    onClick={() => select(e.id)}
                    songKey={s.key}
                    notation={notation}
                    small
                  />
                  {i < generated.length - 1 && (
                    <button
                      className="timeline-gap"
                      aria-label={`Add passing chords after timeline chord ${i + 1}`}
                      onClick={() => {
                        stop();
                        setGap(e.id);
                      }}
                    >
                      +
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      <section className="piano-panel">
        <PlaybackControls
          playing={playing}
          paused={paused}
          onPlay={play}
          onPause={pause}
          onStop={() => stop(true)}
          onPrevious={() => step(-1)}
          onNext={() => step(1)}
          onReplay={replay}
          loop={loop}
          onLoop={() => setLoop(!loop)}
          volume={volume}
          onVolume={setVolume}
          sustain={sustain}
          onSustain={setSustain}
          arpeggiate={arpeggiate}
          onArpeggiate={setArpeggiate}
          bpm={s.bpm}
          onBpm={(bpm) => patchSettings({ bpm })}
          progress={Math.max(0, index + 1)}
          count={generated.length}
          disabled={!generated.length}
        />
        <div className="piano-heading">
          <div>
            <span className="piano-model">STUDIO GRAND</span>
            <span className="piano-selected">
              {singleNote !== null
                ? midiName(singleNote)
                : (favoritePreview?.symbol ?? current?.symbol ?? 'Ready to play')}
            </span>
          </div>
          <div className="hand-legend">
            <span>
              <i className="lh-dot" />
              Left hand
            </span>
            <span>
              <i className="rh-dot" />
              Right hand
            </span>
            <span className="piano-range">C2 — C7</span>
          </div>
        </div>
        <PianoKeyboard
          lh={displayVoice.lh}
          rh={displayVoice.rh}
          onNote={(midi) => {
            stop();
            setSingleNote(midi);
            void sound({ lh: [], rh: [midi], movement: 0, score: 'Excellent' });
          }}
        />
        <div className="piano-footer">
          <span>Click a chord to hear its voicing. Click a key to explore.</span>
          <span>
            ← → Navigate <kbd>space</kbd> Play chord
          </span>
        </div>
      </section>
      <footer className="app-footer">
        <span>
          chordlab. <span>Made for the moments between chords.</span>
        </span>
        <span>Local rule-based harmony · No API required</span>
      </footer>
      {transposeOpen && (
        <div className="modal-backdrop" onClick={() => setTransposeOpen(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transpose-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-heading">
              <h2 id="transpose-title">Transpose song</h2>
              <button
                className="icon-button"
                aria-label="Close transpose"
                onClick={() => setTransposeOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p>
              Move original and generated harmony, bass notes, and voicings together. Lyrics stay
              the same.
            </p>
            <label>
              New key
              <select autoFocus value={targetKey} onChange={(e) => setTargetKey(e.target.value)}>
                {KEYS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <button className="primary" onClick={() => transpose(targetKey)}>
              Transpose {s.key} → {targetKey}
            </button>
          </section>
        </div>
      )}
      {gap && (
        <div className="modal-backdrop" onClick={() => setGap(null)}>
          <section
            className="modal passing-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="passing-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-heading">
              <h2 id="passing-title">Find a way between</h2>
              <button
                autoFocus
                className="icon-button"
                aria-label="Close passing chords"
                onClick={() => setGap(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="passing-destination">
              {generated[gapIndex]?.symbol} <span>→</span> {generated[gapIndex + 1]?.symbol}
            </div>
            <p>
              Choose a connection. It shares the outgoing chord’s duration, so the phrase stays in
              time.
            </p>
            <div className="passing-options">
              {rotatedGap.map((o) => (
                <button key={o.symbols.join(' ')} onClick={() => addPassing(o.symbols, o.reason)}>
                  <strong>
                    {o.symbols.join(' → ')}
                    <Plus size={17} />
                  </strong>
                  <span>{o.reason}</span>
                  <small>
                    {o.tension >= 4
                      ? 'Colorful · check the melody'
                      : o.tension >= 3
                        ? 'Gospel / jazz movement'
                        : 'Gentle connection'}
                  </small>
                </button>
              ))}
            </div>
            <button onClick={() => setGapRotation((n) => n + 1)}>
              <RotateCcw size={15} /> Rotate suggestions
            </button>
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={14} />
          </button>
        </div>
      )}
      <div className="print-only">
        <h1>{s.title}</h1>
        <p>
          {s.artist} · Key {s.key} · {s.bpm} BPM
        </p>
        <ChordChart
          lines={lines}
          events={generated}
          selected=""
          onSelect={() => {}}
          songKey={s.key}
          notation="Chords"
        />
      </div>
    </div>
  );
}
