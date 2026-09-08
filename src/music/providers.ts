import type { ChordEvent, ReharmContext, ReharmonizationProvider } from '../types/music';
import { parseChord } from './chordTheory';
export { RuleBasedProvider, ruleBasedProvider } from './reharmonizer';
/** Future remote transport adapter. The UI uses RuleBasedProvider without network access.
 * Supply a server endpoint callback here when adding an AI service; never embed API keys.
 * The provider can return only harmony events. It cannot replace the song's lyric lines.
 */
export class AIProvider implements ReharmonizationProvider {
  constructor(private request: (context: ReharmContext) => Promise<ChordEvent[]>) {}
  async generate(context: ReharmContext): Promise<ChordEvent[]> {
    const result = await this.request(context);
    const lineIds = new Set(context.lines.map((l) => l.id));
    const sourceIds = new Set(context.original.map((e) => e.sourceId));
    if (
      !Array.isArray(result) ||
      !result.length ||
      new Set(result.map((e) => e.id)).size !== result.length ||
      result.some(
        (e) =>
          !parseChord(e.symbol) ||
          !lineIds.has(e.lineId) ||
          !sourceIds.has(e.sourceId) ||
          !Number.isFinite(e.beats) ||
          e.beats <= 0 ||
          !Number.isFinite(e.column) ||
          e.column < 0,
      )
    )
      throw new Error('The harmony provider returned an invalid arrangement.');
    return result;
  }
}
