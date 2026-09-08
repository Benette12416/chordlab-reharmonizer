export type Style = 'Worship' | 'Gospel' | 'Jazz' | 'Neo-Soul';
export type VoicingMode = 'Simple' | Style;
export interface Chord {
  symbol: string;
  root: string;
  quality: string;
  extensions: string[];
  alterations: string[];
  bass?: string;
  notes: string[];
  intervals: number[];
  romanNumeral?: string;
  function?: string;
}
export interface SongLine {
  id: string;
  lyric: string;
  section: string;
  heading?: boolean;
}
export interface ChordEvent {
  id: string;
  lineId: string;
  column: number;
  symbol: string;
  beats: number;
  sourceId: string;
  inserted?: boolean;
  explanation?: string;
}
export interface ParsedSong {
  lines: SongLine[];
  chords: ChordEvent[];
  title?: string;
  key?: string;
  warnings: string[];
}
export interface Settings {
  title: string;
  artist: string;
  key: string;
  bpm: number;
  level: number;
  style: Style;
  density: number;
  frequency: string;
  beats: number;
  notes: string;
  voicingMode: VoicingMode;
}
export interface Voicing {
  lh: number[];
  rh: number[];
  movement: number;
  score: 'Excellent' | 'Good' | 'Moderate';
}
export interface MelodyNote {
  sourceId: string;
  pitch: number;
  sustained: boolean;
}
export interface ReharmContext {
  original: ChordEvent[];
  lines: SongLine[];
  settings: Settings;
  seed: number;
  preserveHarmony?: boolean;
  melody?: MelodyNote[];
}
export interface ReharmonizationProvider {
  generate(context: ReharmContext): ChordEvent[] | Promise<ChordEvent[]>;
}
export interface SavedSong {
  id: string;
  savedAt: string;
  settings: Settings;
  source: string;
  lines: SongLine[];
  original: ChordEvent[];
  generated: ChordEvent[];
}
export interface FavoriteVoicing {
  id: string;
  symbol: string;
  lh: number[];
  rh: number[];
}
