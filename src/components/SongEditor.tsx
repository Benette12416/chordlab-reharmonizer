import { ClipboardPaste, FileMusic, X } from 'lucide-react';
export function SongEditor({
  source,
  onChange,
  onAnalyze,
  onClose,
  onPaste,
}: {
  source: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  onClose: () => void;
  onPaste: () => void;
}) {
  return (
    <div className="editor">
      <div className="panel-heading">
        <div>
          <h2>Lyrics & original chords</h2>
          <p>Put chords above lyrics, or use [G] inline chords.</p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close editor">
          <X size={20} />
        </button>
      </div>
      <textarea
        autoFocus
        spellCheck={false}
        aria-label="Song lyrics and chords"
        value={source}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          '[Verse]\nG              C\nYour lyrics stay exactly here\n\n[G]Or use [C]inline chords'
        }
      />
      <div className="editor-footer">
        <button onClick={onPaste}>
          <ClipboardPaste size={16} /> Paste clipboard
        </button>
        <span>Use [A] and [Am] inline to avoid confusing them with lyric words.</span>
        <button className="primary" onClick={onAnalyze}>
          <FileMusic size={16} /> Analyze song
        </button>
      </div>
    </div>
  );
}
