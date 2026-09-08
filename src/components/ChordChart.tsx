import { Plus } from 'lucide-react';
import type { SongLine, ChordEvent } from '../types/music';
import { ChordButton } from './ChordButton';
export function ChordChart({
  lines,
  events,
  selected,
  onSelect,
  onGap,
  songKey,
  notation,
  original = false,
  onSection,
}: {
  lines: SongLine[];
  events: ChordEvent[];
  selected: string;
  onSelect: (id: string) => void;
  onGap?: (id: string) => void;
  songKey: string;
  notation: string;
  original?: boolean;
  onSection?: (lineId: string, section: string) => void;
}) {
  return (
    <div className={`chord-chart ${original ? 'original-chart' : ''}`}>
      {lines.map((line, index) => {
        if (line.heading)
          return (
            <div key={line.id} className="section-heading">
              <span>{line.section}</span>
              {onSection && (
                <select
                  aria-label={`Assign section ${line.section}`}
                  value={line.section}
                  onChange={(e) => onSection(line.id, e.target.value)}
                >
                  {Array.from(
                    new Set([
                      line.section,
                      'Intro',
                      'Verse',
                      'Pre-Chorus',
                      'Chorus',
                      'Bridge',
                      'Instrumental',
                      'Final Chorus',
                      'Outro',
                    ]),
                  ).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>
          );
        const chords = events
          .filter((e) => e.lineId === line.id)
          .sort((a, b) => a.column - b.column);
        const anchors = Array.from(
          new Set([
            0,
            ...chords.map((e) => Math.max(0, Math.min(line.lyric.length, Math.floor(e.column)))),
          ]),
        );
        if (!line.lyric && !chords.length) return <div className="blank-line" key={line.id} />;
        return (
          <div className="chart-line" key={line.id}>
            <span className="line-number">{String(index + 1).padStart(2, '0')}</span>
            <div className="lyric-segments">
              {anchors.map((col, i) => {
                const at = chords.filter(
                  (e) => Math.max(0, Math.min(line.lyric.length, Math.floor(e.column))) === col,
                );
                return (
                  <div className="lyric-segment" key={col}>
                    <div className="chord-slot">
                      {at.map((e) => (
                        <div className="chord-with-gap" key={e.id}>
                          <ChordButton
                            event={e}
                            selected={selected === e.id}
                            onClick={() => onSelect(e.id)}
                            songKey={songKey}
                            notation={notation}
                          />
                          {onGap && events.findIndex((x) => x.id === e.id) < events.length - 1 && (
                            <button
                              className="gap-button"
                              onClick={() => onGap(e.id)}
                              title={`Add passing chords after ${e.symbol}`}
                              aria-label={`Add passing chords after ${e.symbol}`}
                            >
                              <Plus size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="lyric-text">
                      {line.lyric.slice(col, anchors[i + 1] ?? line.lyric.length)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
