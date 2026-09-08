import type { Settings } from '../types/music';
import { KEYS } from '../music/chordTheory';
import { SlidersHorizontal, Sparkles } from 'lucide-react';
export function ReharmonizationControls({
  settings,
  onChange,
  onGenerate,
  onDetect,
  onTranspose,
  detected,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onGenerate: () => void;
  onDetect: () => void;
  onTranspose: (key: string) => void;
  detected: string;
}) {
  const s = settings;
  return (
    <aside className="settings-panel">
      <div className="panel-heading">
        <h2>
          <SlidersHorizontal size={16} /> Song settings
        </h2>
        <span className="tiny-label">01</span>
      </div>
      <label>
        Song title
        <input value={s.title} onChange={(e) => onChange({ title: e.target.value })} />
      </label>
      <label>
        Artist
        <input
          value={s.artist}
          placeholder="Add artist"
          onChange={(e) => onChange({ artist: e.target.value })}
        />
      </label>
      <div className="two-columns">
        <label>
          Song key
          <select value={s.key} onChange={(e) => onChange({ key: e.target.value })}>
            {KEYS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label>
          Tempo <span className="muted">BPM</span>
          <input
            type="number"
            min={30}
            max={240}
            value={s.bpm}
            onChange={(e) =>
              onChange({ bpm: Math.min(240, Math.max(30, Number(e.target.value) || 68)) })
            }
          />
        </label>
      </div>
      <button className="text-button detect" onClick={onDetect}>
        Detect key <span>{detected}</span>
      </button>
      <div className="settings-divider" />
      <label>Reharmonization level</label>
      <div className="level-buttons">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            className={s.level === n ? 'active' : ''}
            onClick={() => onChange({ level: n })}
            aria-pressed={s.level === n}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="level-description">
        <strong>
          {['Clean Worship', 'Gospel', 'Gospel / Jazz', 'Advanced Reharm'][s.level - 1]}
        </strong>
        <p>
          {
            [
              'Open, spacious harmony. Let the song breathe.',
              'Passing movement and a little gospel warmth.',
              'Rich extensions and intentional tension.',
              'Chromatic connections with a clear destination.',
            ][s.level - 1]
          }
        </p>
      </div>
      <label>
        Harmonic style
        <select
          value={s.style}
          onChange={(e) => onChange({ style: e.target.value as Settings['style'] })}
        >
          {['Worship', 'Gospel', 'Jazz', 'Neo-Soul'].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <label className="range-label">
        Harmonic density <span>{s.density} / 5</span>
        <input
          type="range"
          min={1}
          max={5}
          value={s.density}
          onChange={(e) => onChange({ density: +e.target.value })}
        />
        <div className="range-endpoints">
          <span>Spacious</span>
          <span>Colorful</span>
        </div>
      </label>
      <button className="primary generate-button" onClick={onGenerate}>
        <Sparkles size={17} /> Reharmonize <span>↗</span>
      </button>
      <p className="settings-note">Original lyrics. New possibilities.</p>
      <details className="advanced-settings">
        <summary>Timing & voicing</summary>
        <label>
          Chords per bar
          <select value={s.frequency} onChange={(e) => onChange({ frequency: e.target.value })}>
            {['Auto', '1', '2', '4'].map((n) => (
              <option key={n} value={n}>
                {n === 'Auto' ? 'Auto · preserve input timing' : `${n} per bar (4/4)`}
              </option>
            ))}
          </select>
        </label>
        <label>
          Default beats per chord
          <input
            type="number"
            value={s.beats}
            min={1}
            max={16}
            onChange={(e) => onChange({ beats: Math.max(1, Math.min(16, +e.target.value || 4)) })}
          />
        </label>
        <p className="hint">
          Analyze again to apply the default timing. Select any chord to edit its duration.
        </p>
        <label>
          Voicing mode
          <select
            value={s.voicingMode}
            onChange={(e) => onChange({ voicingMode: e.target.value as Settings['voicingMode'] })}
          >
            {['Simple', 'Worship', 'Gospel', 'Jazz', 'Neo-Soul'].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Transpose entire song
          <select
            aria-label="Transpose entire song"
            value={s.key}
            onChange={(e) => onTranspose(e.target.value)}
          >
            {KEYS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
      </details>
      <details className="advanced-settings">
        <summary>Song notes</summary>
        <textarea
          aria-label="Song notes"
          value={s.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Arrangement notes, cues, reminders…"
        />
      </details>
    </aside>
  );
}
