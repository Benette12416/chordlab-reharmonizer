import type { ChordEvent } from '../types/music';
import { analyzeChord } from '../music/romanNumerals';
export function ChordButton({
  event,
  selected,
  onClick,
  songKey,
  notation = 'Chords',
  small = false,
}: {
  event: ChordEvent;
  selected?: boolean;
  onClick: () => void;
  songKey: string;
  notation?: string;
  small?: boolean;
}) {
  const a = analyzeChord(event.symbol, songKey);
  return (
    <button
      title={`${event.symbol} · ${a.roman} · ${event.beats.toFixed(1)} beats`}
      aria-pressed={!!selected}
      onClick={onClick}
      className={`chord-button ${selected ? 'selected' : ''} ${event.inserted ? 'passing' : ''} ${small ? 'small' : ''}`}
    >
      <span>
        {notation === 'Roman' ? a.roman : notation === 'Nashville' ? a.nashville : event.symbol}
      </span>
      {!small && <small>{a.roman}</small>}
    </button>
  );
}
