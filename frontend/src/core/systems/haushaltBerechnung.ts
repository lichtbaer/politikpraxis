/**
 * Reine Haushaltsberechnungen (ohne Seiteneffekte) — SMA-404: von wirtschaft.ts nutzbar ohne Zyklus zu haushalt.ts.
 */
import type { GameState } from '../types';
import {
  EINNAHMEN_BASIS,
  PFLICHTAUSGABEN_BASIS,
  EINNAHMEN_AL_REFERENZ,
  EINNAHMEN_AL_KOEFFIZIENT,
  EINNAHMEN_KONJUNKTUR_KOEFFIZIENT,
} from '../constants';

export function berechneEinnahmen(state: GameState): number {
  const haushalt = state.haushalt;
  if (!haushalt) return EINNAHMEN_BASIS;

  const alFaktor = 1 - (state.kpi.al - EINNAHMEN_AL_REFERENZ) * EINNAHMEN_AL_KOEFFIZIENT;
  const wirtFaktor = 1 + haushalt.konjunkturIndex * EINNAHMEN_KONJUNKTUR_KOEFFIZIENT;
  const steuerpolitikFaktor = haushalt.steuerpolitikModifikator;

  return Math.round(EINNAHMEN_BASIS * alFaktor * wirtFaktor * steuerpolitikFaktor);
}

export function berechnePflichtausgaben(state: GameState): number {
  let basis = PFLICHTAUSGABEN_BASIS;
  if (state.kpi.al > 6) {
    basis += (state.kpi.al - 6) * 2;
  }
  const beschlossen = state.gesetze.filter((g) => g.status === 'beschlossen');
  for (const g of beschlossen) {
    basis += g.pflichtausgaben_delta ?? 0;
  }
  return Math.round(basis);
}
