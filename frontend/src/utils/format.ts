/**
 * SMA-317: Formatierungs-Utilities — -0 abfangen (Object.is-Problem in JavaScript)
 */

/** Normalisiert -0 zu 0 (toString/toFixed von -0 ergibt "-0" bzw. "-0.0") */
export function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

/**
 * Formatiert Milliarden-Beträge mit Vorzeichen.
 * -0 wird als 0 behandelt → "0,0 Mrd. €" statt "-0.0 Mrd."
 */
export function formatMrd(wert: number): string {
  const w = normalizeZero(wert);
  if (w === 0) return '0,0 Mrd. €';
  const prefix = w < 0 ? '−' : '+';
  return `${prefix}${Math.abs(w).toFixed(1)} Mrd. €`;
}

/**
 * Formatiert Haushaltssaldo in Mrd. (ohne €, für Panel/Screen-Anzeige)
 * @param decimals 1 = "0,0 Mrd.", 0 = "0 Mrd." (für Legislatur-Bilanz)
 */
export function formatMrdSaldo(wert: number, decimals?: number): string {
  const w = normalizeZero(wert);
  const d = decimals ?? 1;
  if (w === 0) return d === 0 ? '0 Mrd.' : '0,0 Mrd.';
  const prefix = w < 0 ? '−' : '+';
  return `${prefix}${Math.abs(w).toFixed(d)} Mrd.`;
}

/**
 * SMA-409: Medienklima 0–100 für UI (ganzzahlig, keine langen Floats).
 */
export function formatMedienklimaDisplay(wert: number): string {
  const w = normalizeZero(wert);
  if (!Number.isFinite(w)) return '0';
  return String(Math.round(Math.max(0, Math.min(100, w))));
}
