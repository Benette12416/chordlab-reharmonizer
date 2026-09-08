import type { SavedSong, FavoriteVoicing } from '../types/music';
export interface SongRepository {
  list(): SavedSong[];
  save(song: SavedSong): void;
  remove(id: string): void;
}
export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
export const songRepository: SongRepository = {
  list: () => {
    const data = readLocal<unknown>('chordlab:songs:v1', []);
    return Array.isArray(data)
      ? data.filter(
          (s) =>
            s &&
            typeof s.id === 'string' &&
            s.settings &&
            Array.isArray(s.lines) &&
            Array.isArray(s.original) &&
            Array.isArray(s.generated),
        )
      : [];
  },
  save(song) {
    const all = this.list();
    localStorage.setItem(
      'chordlab:songs:v1',
      JSON.stringify([song, ...all.filter((s) => s.id !== song.id)]),
    );
  },
  remove(id) {
    localStorage.setItem(
      'chordlab:songs:v1',
      JSON.stringify(this.list().filter((s) => s.id !== id)),
    );
  },
};
export const favoriteRepository = {
  list: () => {
    const data = readLocal<unknown>('chordlab:voicings:v1', []);
    return Array.isArray(data)
      ? data.filter(
          (v) =>
            v &&
            typeof v.id === 'string' &&
            typeof v.symbol === 'string' &&
            Array.isArray(v.lh) &&
            Array.isArray(v.rh),
        )
      : ([] as FavoriteVoicing[]);
  },
  save(v: FavoriteVoicing) {
    localStorage.setItem(
      'chordlab:voicings:v1',
      JSON.stringify([v, ...this.list().filter((x) => x.id !== v.id)]),
    );
  },
  remove(id: string) {
    localStorage.setItem(
      'chordlab:voicings:v1',
      JSON.stringify(this.list().filter((v) => v.id !== id)),
    );
  },
};
// Replace this adapter with an authenticated Supabase repository; keep the music engine unchanged.
