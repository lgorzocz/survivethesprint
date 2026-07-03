/**
 * LaneSystem — the three lanes are three lines of code (CLAUDE.md §3, §4).
 *
 * Pure geometry + a validated lane index. It owns no game objects; entities ask
 * it where a lane sits on screen, and the scene asks it to clamp lane moves.
 */
import { LANES, SCORING } from "../config/balance.ts";

export class LaneSystem {
  readonly count = LANES.count;

  /** Centre Y (px) of a lane, 0 = top lane. */
  laneY(index: number): number {
    return LANES.topY + this.clamp(index) * LANES.gap;
  }

  /** Editor line number displayed in the gutter for a lane, given scroll distance. */
  lineNumber(index: number, linesScrolled: number): number {
    return SCORING.lineStart + Math.floor(linesScrolled) + this.clamp(index);
  }

  clamp(index: number): number {
    if (index < 0) return 0;
    if (index > this.count - 1) return this.count - 1;
    return index;
  }

  /** Move `from` by `delta` (−1 up / +1 down), clamped to valid lanes. */
  move(from: number, delta: number): number {
    return this.clamp(from + delta);
  }
}
