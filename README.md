# ChordLab Reharmonizer

A complete React + TypeScript + Vite + Tailwind CSS application for original gospel/jazz reharmonization, clickable chord charts, smooth piano voicings, and local song management. It works without an AI API, account, or backend.

## Run locally

Install Node.js 22.12+ (or Node.js 24). Extract this project, open Terminal in its folder, then run:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. Use the browser, rather than opening `index.html` directly. On Windows the same commands work in PowerShell. On macOS, drag the extracted folder into Terminal after typing `cd ` if its path contains spaces.

The development server binds to your local network so a phone/tablet on the same Wi-Fi can open the Network URL that Vite prints. Clipboard access may be unavailable on an unencrypted network URL; use the text editor's normal Paste gesture instead. Browser audio starts after clicking a chord or Play. No piano samples are downloaded.

## Production

```bash
npm run build
npm run preview
```

The `dist/` folder contains the production site. Upload all its contents to a static host, retaining `assets/` and `fonts/`. This application assumes deployment at the domain root. To deploy under a subdirectory, set Vite's `base`; the PDF font URL follows `import.meta.env.BASE_URL`.

The project includes a production build for convenience; rebuild whenever source files change. Hosting does not provide cross-device storage: songs remain in each browser's localStorage until a cloud repository is added.

## First arrangement

1. Click **Paste song** to open the editor.
2. Paste lyrics with chord-only lines above them, or use explicit inline `[G]` notation.
3. Set the correct song key, or use **Detect key** for a major-key estimate.
4. Click **Analyze song**. The chart opens with a first reharmonization.
5. Choose level, style, and density, then click **Reharmonize**.
6. Click a chord to hear it and inspect its pitch classes, bass, LH/RH octave-specific voicing, harmonic function, and voice-leading score.
7. Use the transport's Play button for the full progression. Pause, Stop, Previous, Next, Replay, Loop, BPM, volume, sustain, and block/arpeggio controls are functional.
8. Click `+` between chords to insert a passing-chord option, or click an alternative in the inspector to replace the selected chord.
9. Use **Save song** to store the arrangement on this browser. Open **My library** to search, reopen, or delete it.

Use **New song** before starting another library entry. **Save song** updates the currently open entry.

### Input formats and lyric preservation

Chord-only line:

```text
Title: My Song
Key: G

[Verse]
G              C
Your exact lyric words here
Em       D
Another line, with punctuation!
```

Explicit inline chords:

```text
[Verse]
[G]Your exact [C]lyric words here
[Em]Another line, [D]with punctuation!
```

Leading chord prefixes such as `G I love You Lord` are also accepted. Use brackets for inline `A` and `Am`, which are also ordinary lyric words. Unrecognized bracketed chord text is retained with a warning. Brackets are strongly recommended if a lyric line consists entirely of chord-like words. Chord-only rows without a following lyric row remain instrumental rows.

Lyrics are stored independently from harmony, including punctuation and repeated spaces. Generation and transposition do not edit this lyric data. The chart anchors chords to character offsets; when long symbols collide, visual spacing expands to keep the chord labels legible. Passing-chord positions are interpolated estimates, not recovered syllable or melody timing. A chord that was originally beyond the end of a lyric is displayed after that lyric.

### Timing

Without explicit bars, **Auto** preserves the input event durations (four beats per chord by default). Chord text alone cannot reveal actual timing. Select a chord and edit **Beats** in the inspector for an accurate performance.

Explicit `| G C | Em D |` chord rows split each indicated bar into four beats, giving each of these chords two beats. Bars are currently interpreted in 4/4. The **1 / 2 / 4 chords per bar** setting assigns 4 / 2 / 1 beats per source chord on the next generation. Passing chords divide the outgoing chord's existing duration instead of adding time.

The default beats-per-chord control applies when analyzing input. Playback uses each event's actual duration. Pause retains the remaining duration and reattacks the selected voicing on resume. Changing BPM or arrangement settings stops playback for a clean restart. A desktop browser in the foreground provides the most stable scheduling; this version is not a sample-accurate backing-track player.

## Features

- Four reharmonization levels: Clean Worship, Gospel, Gospel/Jazz, Advanced.
- Worship, Gospel, Jazz, and Neo-Soul harmonic preferences.
- Harmonic density, phrase/section awareness, automatic section recognition, and manual section assignment.
- Major-key detection and manual key selection; Roman numeral and Nashville displays.
- Chord parsing: triads, sevenths, sixths, ninths, elevenths, thirteenths, add9, sus2/sus4, diminished, augmented, altered dominants, half-diminished, accidentals, and slash basses.
- Safe extensions, secondary dominants, ii–V approaches, leading-tone diminished chords, tritone substitutes, descending and ascending bass connections, borrowed minor iv, a conditional chromatic-mediant alternative, and longer nested ii–V options at Level 4.
- Section-sensitive density: verses are more spacious, choruses stronger, bridges/final choruses richer.
- Exact chord pitch names plus playable LH/RH MIDI-note voicings with octave names.
- Greedy sequential voice-leading optimization with a movement score.
- Clickable C2–C7 piano with independent LH/RH colors; scrolls on small screens.
- Offline additive piano-like audio with decaying overtones, hammer-like attack, short ambience, and output compression.
- Progression playback, pause/resume, stop, loop, replay, previous/next, tempo, sustain, volume, and arpeggiation.
- Original/reharmonized side-by-side comparison; original chord clicks audition the original harmony.
- Practice mode with previous/current/next chords and arrow/Space navigation.
- Song, section, selected-chord, and passing-harmony regeneration.
- Up to 80 session undo snapshots, redo, and automatic draft recovery.
- Local song library searchable by title, artist, and key; favorite voicings with playback.
- TXT, ChordPro `.cho`, print, and direct paginated PDF exports.
- Responsive dark studio interface and print-specific layout.

## Reharmonization algorithm

### 1. Parse and preserve

`chordParser.ts` separates lyric lines from chord events, retaining source identifiers, character positions, section names, and durations. `chordTheory.ts` parses symbols into roots, qualities, intervals, extensions, alterations, bass notes, and spelled chord tones. It handles enharmonic pitch classes and double-flat spellings for diminished chords such as C–Eb–Gb–Bbb.

### 2. Establish harmonic context

`keyAnalysis.ts` scores major-key candidates using chord tones, tonic presence, first/last roots, and dominant evidence. `romanNumerals.ts` maps every chord relative to the selected key. It identifies tonic, predominant, dominant, secondary dominant, modal-interchange, and passing functions, with destination-aware explanations.

The app's displayed key system is major-based. Relative-minor material can be explored against its parent major, but complete minor-key mode detection, harmonic/melodic-minor analysis, and ambiguous modulations belong in Version 2. Key detection is a heuristic, not a promise of the original song's key.

### 3. Generate and score candidates

For each source chord, `reharmonizer.ts` gathers reusable alternatives, not hard-coded songs. It considers the previous choice, the current chord, the next destination, source bass, the selected major scale, section, phrase end, level, style, and density.

Candidate scores reward retained source tones, appropriate style, controlled complexity, and small upper-voice movement. They penalize out-of-key tones, avoidable movement, source bass changes, and explicit sustained-melody conflicts. A seeded variation term lets Regenerate explore different scored options while remaining reproducible for the same context and seed. The input chord is always a candidate.

Tension is bounded by level. Modal-interchange and chromatic-mediant candidates are conditional on their destinations; they are not scattered randomly through the song. Lower-density arrangements retain space. Some advanced alternatives intentionally require the player to check the melody.

### 4. Connect destinations

`passingChords.ts` derives local dominant, diminished, ii–V, tritone, and inversion connections from arbitrary destination roots. Generation limits tension and available duration, then scores the connection's voice movement. Automatic connectors stay inside the section and preserve the outgoing chord's total duration. The manual `+` chooser shows up to five options with explanations and can insert richer connections at your discretion.

### 5. Voice the entire progression

`voicingGenerator.ts` builds allowed LH bass/fifth or octave shapes and enumerates RH registral/inversion candidates. The fifth follows the actual chord quality, including diminished and augmented fifths. Worship opens the texture; Gospel/Jazz may omit a doubled root or fifth; Neo-Soul favors compact upper structures. An explicit slash bass is retained.

Each RH candidate is compared with the actual previously chosen RH voicing, favoring retained tones and smaller movement. This is a bounded, greedy sequential optimizer, not a global search over the entire song. It keeps generated notes within the displayed keyboard range and avoids crossing the LH where the candidate range allows.

The displayed score measures average semitone movement per aligned upper voice: **Excellent ≤ 2**, **Good ≤ 4**, otherwise **Moderate**. The first chord has no previous voicing, so its movement is zero. This is a movement metric, not an objective rating of the music.

### Melody safety

Version 1 does not know the tune from lyrics. It cannot guarantee melody compatibility, and it does not infer an existing pianist's arrangement. It prioritizes retained chord tones and conservative extensions by default. Audition the result while singing, especially borrowed chords and altered dominants.

The `MelodyNote` type and `ReharmContext.melody` provide a future integration point. Supplied sustained notes penalize semitone conflicts and can block conflicting automatic passing chords. A melody editor and audio/MIDI transcription are not part of this version.

## Storage and future providers

`storage/songRepository.ts` is the localStorage adapter implementing `SongRepository`. It saves title, artist, key, BPM, source lyrics/chords, structured original/generated events, style, level, voicing mode, timing, density, and notes. Replace this adapter with a Supabase implementation when adding authentication and synchronization. For an asynchronous repository, update the UI callers to await its operations and add loading/error states. Browser storage can be cleared by the user or unavailable in private browsing; export important arrangements.

`music/providers.ts` exports the working `RuleBasedProvider` and an optional `AIProvider` transport adapter. The latter accepts your future server callback and validates returned chord events. No remote request occurs in the current UI. An external provider may return harmony events only; it cannot overwrite lyric lines. Add a server with authentication and validation before connecting a model, and keep API keys off the client.

All arrangements are generated from general harmonic rules. No copied pianist arrangements are bundled.

## Source structure

```text
chordlab-reharmonizer/
├── README.md
├── VALIDATION.md
├── THIRD_PARTY_NOTICES.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── .gitignore
├── .prettierrc.json
├── public/
│   └── fonts/
│       ├── DejaVuSansMono.ttf
│       └── LICENSE.txt
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── types/
│   │   └── music.ts
│   ├── components/
│   │   ├── SongEditor.tsx
│   │   ├── ChordChart.tsx
│   │   ├── ChordButton.tsx
│   │   ├── PianoKeyboard.tsx
│   │   ├── ChordInspector.tsx
│   │   ├── PlaybackControls.tsx
│   │   ├── ReharmonizationControls.tsx
│   │   └── SongLibrary.tsx
│   ├── music/
│   │   ├── chordParser.ts
│   │   ├── chordTheory.ts
│   │   ├── keyAnalysis.ts
│   │   ├── romanNumerals.ts
│   │   ├── substitutions.ts
│   │   ├── passingChords.ts
│   │   ├── reharmonizer.ts
│   │   ├── voicingGenerator.ts
│   │   ├── voiceLeading.ts
│   │   ├── transpose.ts
│   │   ├── playback.ts
│   │   ├── providers.ts
│   │   └── export.ts
│   └── storage/
│       └── songRepository.ts
├── tests/
│   ├── music.test.ts
│   └── render.test.ts
└── dist/                  # Included production build
```

## Verification commands

```bash
npm test
npm run build
npm run format
```

`npm test` uses Node's test runner with TypeScript loading. `npm run build` type-checks the application and produces the Vite bundle. See `VALIDATION.md` for the checks actually performed and the limits of that verification.

## Version 2 suggestions

1. Melody entry on the piano, MIDI melody import, and sustained-note-aware substitutions.
2. Minor modes, modulations, cadence detection, and editable 3/4, 6/8, and irregular meters.
3. Global dynamic-programming voice-leading, voice locks, adjustable hand span, and personalized fingering.
4. Recorded multi-velocity piano samples, sample-accurate scheduling, and audio/MIDI export.
5. Supabase login, cloud song sync, arrangement version history, and setlists.
6. A secure optional AI provider using the same lyric-preserving event format.
7. Web MIDI input, chord recognition, practice scoring, and synchronized lyrics.
8. Print setlists as one PDF with each song beginning on a new page.

## Notes on the piano and PDF

The included piano is a synthesized approximation, not a sampled concert grand. Its harmonically decaying partials are intentionally more detailed than a single oscillator. Background tabs and mobile power saving can affect timer-based playback.

PDF export embeds DejaVu Sans Mono for readable aligned charts, including many accented characters. It does not provide full CJK or emoji font coverage. TXT preserves the original Unicode characters. The bundled font's license is included in `public/fonts/LICENSE.txt`.
