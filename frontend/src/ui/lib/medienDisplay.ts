/**
 * SMA-410 / SMA-409: Einheitliche Anzeige für Medienklima und Akteur-Stimmung
 * (vermeidet Float-Artefakte aus der Simulation)
 */
import { normalizeZero } from '../../utils/format';

/** Medienklima-Index 0–100, ganzzahlig (keine langen Floats in der UI). */
export function formatMedienklima(wert: number): string {
  const w = normalizeZero(wert);
  if (!Number.isFinite(w)) return '0';
  return String(Math.round(Math.max(0, Math.min(100, w))));
}

export function formatStimmung(wert: number): string {
  return Math.round(normalizeZero(wert)).toString();
}
