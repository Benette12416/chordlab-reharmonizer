import type { SongLine, ChordEvent, Settings } from '../types/music';
export function chartRows(lines: SongLine[], events: ChordEvent[]) {
  const rows: string[] = [];
  for (const line of lines) {
    if (line.heading) {
      rows.push('', `[${line.section}]`);
      continue;
    }
    const at = events.filter((e) => e.lineId === line.id).sort((a, b) => a.column - b.column);
    let chordRow = '',
      lyricRow = '',
      cursor = 0;
    for (const e of at) {
      const col = Math.min(line.lyric.length, Math.floor(e.column));
      const chunk = line.lyric.slice(cursor, col);
      lyricRow += chunk;
      chordRow = chordRow.padEnd(lyricRow.length, ' ');
      if (chordRow.length > lyricRow.length) lyricRow = lyricRow.padEnd(chordRow.length, ' ');
      chordRow += e.symbol + ' ';
      cursor = col;
    }
    lyricRow += line.lyric.slice(cursor);
    if (chordRow) rows.push(chordRow.trimEnd());
    rows.push(lyricRow);
  }
  return rows;
}
export function inlineSource(lines: SongLine[], events: ChordEvent[]) {
  return lines
    .map((l) => {
      if (l.heading) return `[${l.section}]`;
      let text = '',
        cursor = 0;
      for (const e of events.filter((e) => e.lineId === l.id).sort((a, b) => a.column - b.column)) {
        const col = Math.min(l.lyric.length, Math.floor(e.column));
        text += l.lyric.slice(cursor, col) + `[${e.symbol}]`;
        cursor = col;
      }
      return text + l.lyric.slice(cursor);
    })
    .join('\n');
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const filename = (s: Settings) =>
  (s.title || 'ChordLab song').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'ChordLab-song';
export function exportText(s: Settings, lines: SongLine[], events: ChordEvent[]) {
  download(
    new Blob(
      [
        `${s.title}\n${s.artist}\nKey: ${s.key} | BPM: ${s.bpm}\n\n${chartRows(lines, events).join('\n')}`,
      ],
      { type: 'text/plain;charset=utf-8' },
    ),
    filename(s) + '.txt',
  );
}
export function exportChordPro(s: Settings, lines: SongLine[], events: ChordEvent[]) {
  download(
    new Blob(
      [
        `{title: ${s.title}}\n{artist: ${s.artist}}\n{key: ${s.key}}\n{tempo: ${s.bpm}}\n\n${inlineSource(lines, events)}`,
      ],
      { type: 'text/plain;charset=utf-8' },
    ),
    filename(s) + '.cho',
  );
}
export async function exportPdf(s: Settings, lines: SongLine[], events: ChordEvent[]) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const response = await fetch(`${import.meta.env.BASE_URL}fonts/DejaVuSansMono.ttf`);
  if (!response.ok) throw new Error('Chart font could not load. Try TXT or print.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  doc.addFileToVFS('ChartMono.ttf', btoa(binary));
  doc.addFont('ChartMono.ttf', 'ChartMono', 'normal');
  doc.setFont('ChartMono');
  doc.setFontSize(17);
  let y = 20;
  const titleLines = doc.splitTextToSize(s.title || 'Untitled song', 176);
  doc.text(titleLines, 17, y);
  y += titleLines.length * 7 + 3;
  doc.setFontSize(10);
  const meta = doc.splitTextToSize(
    `${s.artist ? `${s.artist} | ` : ''}Key: ${s.key} | ${s.bpm} BPM`,
    176,
  );
  doc.text(meta, 17, y);
  y += meta.length * 5 + 8;
  const page = () => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
  };
  for (const line of lines) {
    if (line.heading) {
      y += 5;
      page();
      doc.setTextColor(30, 80, 70);
      doc.text(`[${line.section}]`, 17, y);
      y += 7;
      continue;
    }
    const eventsHere = events
      .filter((e) => e.lineId === line.id)
      .sort((a, b) => a.column - b.column);
    const anchors = Array.from(
      new Set([0, ...eventsHere.map((e) => Math.min(line.lyric.length, Math.floor(e.column)))]),
    );
    let chordRow = '',
      lyricRow = '';
    const flush = () => {
      page();
      doc.setTextColor(20, 75, 65);
      if (chordRow.trim()) {
        doc.text(chordRow, 17, y);
        y += 5;
        page();
      }
      doc.setTextColor(30, 30, 30);
      doc.text(lyricRow || ' ', 17, y);
      y += 7;
      chordRow = '';
      lyricRow = '';
    };
    for (let i = 0; i < anchors.length; i++) {
      const col = anchors[i],
        symbols = eventsHere
          .filter((e) => Math.min(line.lyric.length, Math.floor(e.column)) === col)
          .map((e) => e.symbol)
          .join(' ');
      let lyric = line.lyric.slice(col, anchors[i + 1] ?? line.lyric.length);
      const width = Math.max(symbols.length + 1, lyric.length);
      if (lyricRow.length + width > 80 && lyricRow.length) flush();
      while (lyric.length > 80) {
        if (symbols && !chordRow) chordRow = symbols;
        lyricRow = lyric.slice(0, 80);
        flush();
        lyric = lyric.slice(80);
      }
      const start = Math.max(chordRow.length, lyricRow.length);
      chordRow = chordRow.padEnd(start, ' ') + symbols;
      lyricRow = lyricRow.padEnd(start, ' ') + lyric;
      const end = Math.max(chordRow.length + 1, lyricRow.length);
      chordRow = chordRow.padEnd(end, ' ');
      lyricRow = lyricRow.padEnd(end, ' ');
    }
    flush();
  }
  const pages = doc.getNumberOfPages();
  for (let n = 1; n <= pages; n++) {
    doc.setPage(n);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`ChordLab Reharmonizer | ${n} / ${pages}`, 17, 288);
  }
  doc.save(filename(s) + '.pdf');
}
