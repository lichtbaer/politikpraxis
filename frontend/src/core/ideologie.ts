import type { Ideologie as IdeologieType, Law, Milieu } from './types';

const DEFAULT_IDEOLOGIE: IdeologieType = { wirtschaft: 0, gesellschaft: 0, staat: 0 };

/**
 * Berechnet die Kongruenz zwischen zwei Ideologie-Profilen.
 * Gewichtung: Wirtschaft 40%, Gesellschaft 35%, Staat 25%.
 * @returns Kongruenz-Score 0–100 (100 = identisch)
 */
export function berechneKongruenz(profil1: IdeologieType, profil2: IdeologieType): number {
  const p1 = profil1 ?? DEFAULT_IDEOLOGIE;
  const p2 = profil2 ?? DEFAULT_IDEOLOGIE;
  const distanz =
    (Math.abs(p1.wirtschaft - p2.wirtschaft) * 0.4 +
      Math.abs(p1.gesellschaft - p2.gesellschaft) * 0.35 +
      Math.abs(p1.staat - p2.staat) * 0.25) /
    2;
  return Math.round(100 - distanz);
}

/** Kongruenz Spieler (Ausrichtung) ↔ Gesetz */
export function gesetzKongruenz(
  spielerIdeologie: IdeologieType,
  gesetz: Law | undefined,
): number {
  if (!gesetz?.ideologie) return 50; // Neutral bei fehlendem Profil
  return berechneKongruenz(spielerIdeologie, gesetz.ideologie);
}

/** Kongruenz Milieu ↔ Gesetz (für Milieu-Reaktion) */
export function milieuGesetzKongruenz(milieu: Milieu, gesetz: Law): number {
  return berechneKongruenz(milieu.ideologie, gesetz.ideologie ?? DEFAULT_IDEOLOGIE);
}
