/**
 * SMA-407: Medien-Highlights aus Spieler-Perspektive (Regierung).
 * Roh-Delta (Stimmung/Reichweite) ist nicht gleich „gut/schlecht“ für den Spieler.
 */
import type { MedienAkteurTyp } from '../data/defaults/medienAkteure';

export type MedienSpielerPerspektive = 'positiv' | 'negativ';

/**
 * @param typ — Medienakteur-Typ aus Content
 * @param delta — gemessenes Delta (Stimmung oder Reichweite, je nach Highlight)
 */
export function berechneMedienSpielerPerspektive(
  typ: MedienAkteurTyp | string,
  delta: number,
): MedienSpielerPerspektive {
  if (typ === 'alternativ') {
    // Anti-Establishment wächst = immer belastend für die Regierung (auch bei „+“ im Rohwert)
    return delta > 0 ? 'negativ' : 'positiv';
  }
  if (typ === 'konservativ' && delta > 0) {
    return 'negativ';
  }
  if (typ === 'konservativ' && delta < 0) {
    return 'positiv';
  }
  // Boulevard, öffentlich, Qualität, Social: höhere Stimmung/Reichweite = eher hilfreich
  return delta > 0 ? 'positiv' : 'negativ';
}
