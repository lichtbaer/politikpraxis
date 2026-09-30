import type { GameEvent } from '../../types';
import { nextRandom } from '../../rng';
import { fortsetzungsZiele, istEigenstaendigesEvent } from './eventUtils';

/** Anteil der Events die pro Durchlauf ausgewählt werden */
const POOL_RATIO = 0.65;

/**
 * Wählt einen zufälligen Subset der verfügbaren Events für diesen Durchlauf.
 * Events mit `always_include: true` sind immer im Pool.
 * Restliche Events werden zufällig gewählt (~65% des Pools).
 */
export function selectEventPool(events: GameEvent[]): string[] {
  const alwaysInclude = events.filter(e => e.always_include);
  const optional = events.filter(e => !e.always_include);

  // Fisher-Yates Shuffle
  const shuffled = [...optional];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const count = Math.ceil(optional.length * POOL_RATIO);
  const selected = shuffled.slice(0, count);

  return [
    ...alwaysInclude.map(e => e.id),
    ...selected.map(e => e.id),
  ];
}

/**
 * Nur Events, die eigenständig gezogen werden können. Fortsetzungen (Arc-Stufen,
 * Follow-up-Ziele) gehören nicht in die Pool-Auswahl — sonst belegten sie Plätze
 * im 65-%-Subset, ohne je ziehbar zu sein; erreicht werden sie über den Follow-up.
 */
export function eigenstaendigeEvents(events: GameEvent[]): GameEvent[] {
  const ziele = fortsetzungsZiele(events);
  return events.filter(e => istEigenstaendigesEvent(e, ziele));
}
