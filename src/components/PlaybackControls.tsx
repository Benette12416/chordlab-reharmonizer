import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Repeat2,
  Volume2,
  RotateCcw,
} from 'lucide-react';
export function PlaybackControls(p: {
  playing: boolean;
  paused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onReplay: () => void;
  loop: boolean;
  onLoop: () => void;
  volume: number;
  onVolume: (n: number) => void;
  sustain: boolean;
  onSustain: (v: boolean) => void;
  arpeggiate: boolean;
  onArpeggiate: (v: boolean) => void;
  bpm: number;
  onBpm: (v: number) => void;
  progress: number;
  count: number;
  disabled: boolean;
}) {
  return (
    <div className="playback-controls">
      <div className="transport">
        <button
          className="icon-button"
          onClick={p.onPrevious}
          disabled={p.disabled}
          aria-label="Previous chord"
        >
          <SkipBack size={18} />
        </button>
        <button
          className="transport-play"
          onClick={p.playing ? p.onPause : p.onPlay}
          disabled={p.disabled}
          aria-label={
            p.playing ? 'Pause progression' : p.paused ? 'Resume progression' : 'Play progression'
          }
        >
          {p.playing ? (
            <Pause size={21} fill="currentColor" />
          ) : (
            <Play size={21} fill="currentColor" />
          )}
        </button>
        <button className="icon-button" onClick={p.onStop} aria-label="Stop">
          <Square size={17} />
        </button>
        <button
          className="icon-button"
          onClick={p.onNext}
          disabled={p.disabled}
          aria-label="Next chord"
        >
          <SkipForward size={18} />
        </button>
        <button
          className={`icon-button ${p.loop ? 'on' : ''}`}
          onClick={p.onLoop}
          aria-label="Loop progression"
          aria-pressed={p.loop}
        >
          <Repeat2 size={18} />
        </button>
        <button
          className="icon-button"
          onClick={p.onReplay}
          disabled={p.disabled}
          aria-label="Replay chord"
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <div className="transport-position">
        <b>{String(p.progress).padStart(2, '0')}</b>
        <span>/ {String(p.count).padStart(2, '0')} chords</span>
      </div>
      <label className="tempo">
        <input
          aria-label="Playback BPM"
          type="number"
          min={30}
          max={240}
          value={p.bpm}
          onChange={(e) => p.onBpm(Math.min(240, Math.max(30, +e.target.value || 68)))}
        />{' '}
        <span>BPM</span>
      </label>
      <div className="sound-controls">
        <label className="volume">
          <Volume2 size={17} />
          <input
            aria-label="Volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={p.volume}
            onChange={(e) => p.onVolume(+e.target.value)}
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={p.sustain}
            onChange={(e) => p.onSustain(e.target.checked)}
          />
          Sustain
        </label>
        <select
          aria-label="Chord playback style"
          value={p.arpeggiate ? 'Arpeggio' : 'Block chord'}
          onChange={(e) => p.onArpeggiate(e.target.value === 'Arpeggio')}
        >
          <option>Block chord</option>
          <option>Arpeggio</option>
        </select>
      </div>
    </div>
  );
}
