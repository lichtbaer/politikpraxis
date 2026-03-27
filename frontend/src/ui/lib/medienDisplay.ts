/**
 * SMA-410: Einheitliche Ganzzahl-Anzeige für Medienklima und Akteur-Stimmung
 * (vermeidet Float-Artefakte aus der Simulation)
 */
export function formatMedienklima(wert: number): string {
  return Math.round(wert).toString();
}

export function formatStimmung(wert: number): string {
  return Math.round(wert).toString();
}
