/**
 * SMA-332: Playtest-Konfiguration
 * Gesperrte Stufen werden im Onboarding ausgegraut und sind nicht wählbar.
 * Leeres Array = alle Stufen verfügbar.
 */
export const PLAYTEST_CONFIG = {
  /** Stufen 2 und 3 für Playtest gesperrt — nur 1 (Einstieg) und 4 (Vollständig) wählbar */
  gesperrte_stufen: [2, 3] as number[],
  /** Zeigt Feedback-Button prominent im Header */
  playtest_modus: true,
};

export function istStufeVerfuegbar(stufe: number): boolean {
  return !PLAYTEST_CONFIG.gesperrte_stufen.includes(stufe);
}
