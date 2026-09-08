import { Search, Music2, Trash2, FolderOpen, Plus } from 'lucide-react';
import { useState } from 'react';
import type { SavedSong, FavoriteVoicing } from '../types/music';
import { midiName } from '../music/chordTheory';
export function SongLibrary({
  onNew,
  songs,
  onLoad,
  onDelete,
  favorites,
  onPlayFavorite,
  onDeleteFavorite,
}: {
  onNew: () => void;
  songs: SavedSong[];
  onLoad: (s: SavedSong) => void;
  onDelete: (id: string) => void;
  favorites: FavoriteVoicing[];
  onPlayFavorite: (v: FavoriteVoicing) => void;
  onDeleteFavorite: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = songs.filter((s) =>
    `${s.settings.title} ${s.settings.artist} ${s.settings.key}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="library-view">
      <div className="library-title">
        <div>
          <span className="eyebrow">YOUR COLLECTION</span>
          <h1>Song library</h1>
          <p>Arrangements and voicings saved on this device.</p>
        </div>
        <button className="primary" onClick={onNew}>
          <Plus size={17} /> New song
        </button>
      </div>
      <label className="search-field">
        <Search size={18} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, artist or key"
          aria-label="Search songs"
        />
      </label>
      {!filtered.length && (
        <div className="empty-state">
          <Music2 size={32} />
          <h2>{songs.length ? 'No matching songs' : 'Your next arrangement starts here'}</h2>
          <p>
            {songs.length
              ? 'Try another title, artist or key.'
              : 'Save a song from the studio to keep it in your collection.'}
          </p>
        </div>
      )}
      <div className="song-grid">
        {filtered.map((s) => (
          <article className="song-card" key={s.id}>
            <span className="song-key">{s.settings.key}</span>
            <button className="song-load" onClick={() => onLoad(s)}>
              <h2>{s.settings.title || 'Untitled song'}</h2>
              <p>{s.settings.artist || 'Personal arrangement'}</p>
              <span>
                {s.settings.bpm} BPM · {s.settings.style} · Level {s.settings.level}
              </span>
              <small>
                {s.generated.length} chords · {new Date(s.savedAt).toLocaleDateString()}
              </small>
            </button>
            <button
              className="icon-button"
              aria-label={`Delete ${s.settings.title}`}
              onClick={() => onDelete(s.id)}
            >
              <Trash2 size={16} />
            </button>
          </article>
        ))}
      </div>
      <h2 className="favorite-heading">
        Favorite voicings <span>{favorites.length}</span>
      </h2>
      {!favorites.length && <p className="muted">Save a voicing from the chord inspector.</p>}
      <div className="favorite-grid">
        {favorites.map((v) => (
          <article className="favorite-card" key={v.id}>
            <button onClick={() => onPlayFavorite(v)}>
              <strong>{v.symbol}</strong>
              <span>LH {v.lh.map((n) => midiName(n)).join(' ')}</span>
              <span>RH {v.rh.map((n) => midiName(n)).join(' ')}</span>
            </button>
            <button
              className="icon-button"
              aria-label={`Delete ${v.symbol} voicing`}
              onClick={() => onDeleteFavorite(v.id)}
            >
              <Trash2 size={15} />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
