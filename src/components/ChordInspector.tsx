import { Headphones, Bookmark, RotateCcw, ArrowRight } from 'lucide-react';
import type { ChordEvent, Voicing } from '../types/music';
import { parseChord, midiName, preferFlats } from '../music/chordTheory';
import { analyzeChord } from '../music/romanNumerals';
import { alternatives } from '../music/substitutions';
export function ChordInspector({
  event,
  next,
  voicing,
  songKey,
  onAlternative,
  onFavorite,
  onRegenerate,
  onBeats,
  explain,
  onReplay,
}: {
  event?: ChordEvent;
  next?: ChordEvent;
  voicing?: Voicing;
  songKey: string;
  onAlternative: (symbols: string[], reason: string) => void;
  onFavorite: () => void;
  onRegenerate: () => void;
  onBeats: (beats: number) => void;
  explain: boolean;
  onReplay: () => void;
}) {
  if (!event || !voicing)
    return (
      <aside className="inspector">
        <div className="panel-heading">
          <h2>Chord inspector</h2>
        </div>
        <p className="muted">Analyze a song, then select a chord to see its notes and voicing.</p>
      </aside>
    );
  const c = parseChord(event.symbol)!;
  const a = analyzeChord(event.symbol, songKey, next?.symbol);
  const flat = preferFlats(songKey);
  const opts = alternatives(event.symbol, songKey, next?.symbol);
  return (
    <aside className="inspector">
      <div className="panel-heading">
        <h2>
          <Headphones size={16} /> Chord inspector
        </h2>
        <span className="live-label">SELECTED</span>
      </div>
      <div className="inspector-chord">
        <button onClick={onReplay} title="Play selected chord">
          {event.symbol}
        </button>
        <span className="function-badge">
          {a.roman} · {a.function}
        </span>
      </div>
      <div className="note-pills">
        {c.notes.map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
      <div className="inspector-facts">
        <div>
          <span>Bass</span>
          <b>{c.bass ?? c.root}</b>
        </div>
        <div>
          <span>Extensions</span>
          <b>{[...c.extensions, ...c.alterations].join(' · ') || 'Triad'}</b>
        </div>
        <div>
          <span>Next chord</span>
          <b>{next?.symbol ?? 'End of progression'}</b>
        </div>
        <label>
          Beats
          <input
            aria-label="Selected chord beats"
            type="number"
            min={0.25}
            max={16}
            step={0.25}
            value={Number(event.beats.toFixed(2))}
            onChange={(e) => onBeats(Math.max(0.25, Math.min(16, +e.target.value || 1)))}
          />
        </label>
      </div>
      <div className="voicing-card">
        <div className="subheading">
          <h3>Piano voicing</h3>
          <span className={`score ${voicing.score.toLowerCase()}`}>{voicing.score}</span>
        </div>
        <div className="hand-row">
          <span className="hand-tag lh">LH</span>
          <div>
            {voicing.lh.map((n) => (
              <b key={n}>{midiName(n, flat)}</b>
            ))}
          </div>
        </div>
        <div className="hand-row">
          <span className="hand-tag rh">RH</span>
          <div>
            {voicing.rh.map((n) => (
              <b key={n}>{midiName(n, flat)}</b>
            ))}
          </div>
        </div>
        <p className="hint">
          Voice leading · {voicing.movement.toFixed(1)} semitones / upper voice
        </p>
        <button className="save-voicing" onClick={onFavorite}>
          <Bookmark size={14} /> Save voicing
        </button>
      </div>
      {explain && (
        <div className="harmony-explanation">
          <h3>Why it works</h3>
          <p>
            {event.explanation} {a.explanation}
          </p>
        </div>
      )}
      <div className="subheading">
        <h3>Alternative chords</h3>
        <button
          className="icon-button"
          onClick={onRegenerate}
          aria-label="Regenerate selected chord"
        >
          <RotateCcw size={14} />
        </button>
      </div>
      <div className="alternatives">
        {opts.map((o) => (
          <button key={o.symbols.join(' ')} onClick={() => onAlternative(o.symbols, o.reason)}>
            <span>
              {o.symbols.join(' → ')}
              <ArrowRight size={14} />
            </span>
            <small>{o.reason}</small>
          </button>
        ))}
      </div>
      <p className="hint">Click an alternative to apply it. Undo is always available.</p>
    </aside>
  );
}
