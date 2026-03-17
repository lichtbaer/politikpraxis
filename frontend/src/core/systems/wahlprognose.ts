import type { GameState, ContentBundle } from '../types';
import { featureActive } from './features';

/** Milieu → zust-Feld für initiale Zustimmung */
const MILIEU_TO_ZUST: Record<string, keyof GameState['zust']> = {
  postmaterielle: 'prog',
  soziale_mitte: 'arbeit',
  prekaere: 'arbeit',
  buergerliche_mitte: 'mitte',
  leistungstraeger: 'mitte',
  etablierte: 'mitte',
  traditionelle: 'mitte',
};

/**
 * Berechnet Wahlprognose (zust.g) aus gewichteter Milieu-Zustimmung.
 * Stufe 1: alte Formel (zust.arbeit/mitte/prog) — wird von recalcApproval geliefert.
 * Stufe 2+: gewichtete Milieu-Zustimmung mit Gewicht × Basisbeteiligung.
 */
export function berechneWahlprognose(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): number {
  const milieus = content.milieus ?? [];
  if (!featureActive(complexity, 'milieus_voll') || milieus.length === 0) {
    return state.zust.g;
  }

  const visibleMilieus = milieus.filter((m) => m.min_complexity <= complexity);
  if (visibleMilieus.length === 0) return state.zust.g;

  let summe = 0;
  let gewichtGesamt = 0;

  for (const m of visibleMilieus) {
    const zustimmung = state.milieuZustimmung?.[m.id] ?? state.zust[MILIEU_TO_ZUST[m.id] ?? 'mitte'] ?? 50;
    const gewicht = (m.gewicht ?? 14) / 100;
    const mobilisierung = (m.basisbeteiligung ?? 70) / 100;
    const w = gewicht * mobilisierung;
    summe += zustimmung * w;
    gewichtGesamt += w;
  }

  if (gewichtGesamt <= 0) return state.zust.g;
  return Math.round(Math.max(0, Math.min(100, summe / gewichtGesamt)));
}
