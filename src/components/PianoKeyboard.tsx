import { midiName, mod } from '../music/chordTheory';
export function PianoKeyboard({
  lh,
  rh,
  onNote,
}: {
  lh: number[];
  rh: number[];
  onNote: (midi: number) => void;
}) {
  const all = Array.from({ length: 61 }, (_, i) => i + 36);
  const white = all.filter((n) => ![1, 3, 6, 8, 10].includes(mod(n)));
  let previousWhites = 0;
  return (
    <div className="piano-scroll">
      <div className="piano-keys" role="group" aria-label="Interactive piano C2 through C7">
        {all.map((midi) => {
          const black = [1, 3, 6, 8, 10].includes(mod(midi));
          const position = black ? previousWhites - 0.32 : previousWhites++;
          const left = lh.includes(midi),
            right = rh.includes(midi);
          return (
            <button
              key={midi}
              className={`piano-key ${black ? 'black' : 'white'} ${left ? 'left-active' : right ? 'right-active' : ''}`}
              style={{
                left: `${(position / white.length) * 100}%`,
                width: `${((black ? 0.64 : 1) / white.length) * 100}%`,
              }}
              onClick={() => onNote(midi)}
              aria-label={`${midiName(midi)}${left ? ' left hand' : right ? ' right hand' : ''}`}
              aria-pressed={left || right}
            >
              <span>{left || right || mod(midi) === 0 ? midiName(midi) : ''}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
