/**
 * ScoreSystem — thematic scoring, not meters (CLAUDE.md §2).
 *
 * Score = how long you lasted, expressed as: sprints survived, tickets closed,
 * and the current editor line number (`Ln 4312`). The `Ln` counter is also the
 * ambient distance metric shown in the gutter/status bar.
 */
import { SCORING } from "../config/balance.ts";

export interface RunSummary {
  lengthSec: number;
  sprints: number;
  line: number;
  tickets: number; // open tickets = current bug load, dramatised
  ticketsClosed: number; // pickups grabbed, dramatised
}

export class ScoreSystem {
  private elapsedSec = 0;
  private ticketsClosed = 0;

  update(dtSec: number): void {
    this.elapsedSec += dtSec;
  }

  /** Called when a pickup is grabbed — flavour "tickets closed". */
  onPickup(): void {
    this.ticketsClosed += 1;
  }

  /** How many code lines we've scrolled past (float). */
  linesScrolled(): number {
    return this.elapsedSec * SCORING.linesPerSec;
  }

  currentLine(): number {
    return SCORING.lineStart + Math.floor(this.linesScrolled());
  }

  sprints(): number {
    return Math.floor(this.linesScrolled() / SCORING.linesPerSprint);
  }

  /** `currentBugs` is read at death for the "buried under N tickets" line. */
  summary(currentBugs: number): RunSummary {
    return {
      lengthSec: this.elapsedSec,
      sprints: this.sprints(),
      line: this.currentLine(),
      tickets: Math.round(currentBugs * SCORING.ticketsPerBug),
      ticketsClosed: this.ticketsClosed,
    };
  }
}
