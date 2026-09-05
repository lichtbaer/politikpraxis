/**
 * #282: „Weiter bis zum nächsten Ereignis" — beschleunigter Vorlauf, der automatisch
 * anhält, sobald der Spieler wieder gebraucht wird.
 *
 * Event-Pausen (Choices, TV-Duell, Verfassungsgericht, …) laufen bereits über die
 * bestehende Auto-Pause (eventPause.ts) und schlagen sich in `next.speed === 0`
 * nieder. Die übrigen drei AC-Stopp-Kriterien (anstehende BR-Abstimmung,
 * Misstrauensvotum-Warnung, Monatszusammenfassung) werden hier anhand von
 * Vorher-/Nachher-State erkannt.
 */
import type { GameState } from './types';

export type FastForwardStopReason = 'event' | 'abstimmung' | 'warnung' | 'monatszusammenfassung';

export interface FastForwardStopOptions {
  /** Spieler-Einstellung „Monatszusammenfassung automatisch anzeigen" (SMA-396). */
  monatszusammenfassungEnabled: boolean;
}

/**
 * Liefert den Grund, warum der Vorlauf nach diesem Tick anhalten soll, oder
 * `null`, wenn weitergelaufen werden kann.
 */
export function getFastForwardStopReason(
  prev: GameState,
  next: GameState,
  options: FastForwardStopOptions,
): FastForwardStopReason | null {
  if (next.speed === 0) return 'event';

  const prevLow = prev.lowApprovalMonths ?? 0;
  const nextLow = next.lowApprovalMonths ?? 0;
  if (prevLow < 3 && nextLow >= 3) return 'warnung';

  const prevBtPassed = new Set(
    prev.gesetze.filter((g) => g.status === 'bt_passed').map((g) => g.id),
  );
  if (next.gesetze.some((g) => prevBtPassed.has(g.id) && g.status !== 'bt_passed')) {
    return 'abstimmung';
  }

  if (options.monatszusammenfassungEnabled && next.month > prev.month) {
    return 'monatszusammenfassung';
  }

  return null;
}
