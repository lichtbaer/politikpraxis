/**
 * Der gebündelte Offline-Fallback muss das Onboarding auf jeder Komplexitätsstufe
 * abschließbar halten.
 *
 * Regression: Der Fallback enthielt 2 Agendaziele, das Onboarding verlangte ab Stufe 3
 * aber 3 — der Bestätigen-Button blieb dauerhaft deaktiviert und das Spiel war ohne
 * erreichbares Backend ab Stufe 3 nicht startbar.
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_CONTENT } from './scenarios';
import { spielerAgendaZielAnzahl, koalitionsAgendaZielAnzahl } from '../../core/onboardingAgenda';

const STUFEN = [1, 2, 3, 4];

/** Spiegelt den Filter aus WahlnachtOnboarding (ohne Partei-Filter, der nur einschränkt). */
function poolFuerStufe(complexity: number) {
  return (DEFAULT_CONTENT.agendaZiele ?? []).filter((z) => z.min_complexity <= complexity);
}

describe('Offline-Fallback: Agendaziele', () => {
  it.each(STUFEN)('Stufe %i bietet genug Ziele, um das Onboarding abzuschließen', (complexity) => {
    const pool = poolFuerStufe(complexity);
    const gefordert = spielerAgendaZielAnzahl(complexity, pool.length);
    const sollOhneDeckel = complexity === 2 ? 2 : complexity >= 3 ? 3 : 0;

    // Der Deckel ist die Notbremse — der Content soll die Vorgabe von sich aus erfüllen.
    expect(pool.length).toBeGreaterThanOrEqual(sollOhneDeckel);
    expect(gefordert).toBe(sollOhneDeckel);
  });

  it('deckelt die Vorgabe, wenn der Content zu wenig Ziele liefert', () => {
    expect(spielerAgendaZielAnzahl(4, 2)).toBe(2);
    expect(spielerAgendaZielAnzahl(3, 0)).toBe(0);
    expect(spielerAgendaZielAnzahl(1, 0)).toBe(0);
  });

  it('vergibt eindeutige IDs', () => {
    const ids = (DEFAULT_CONTENT.agendaZiele ?? []).map((z) => z.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('deckt mehrere Kategorien ab, damit die Auswahl eine echte Entscheidung ist', () => {
    const kategorien = new Set((DEFAULT_CONTENT.agendaZiele ?? []).map((z) => z.kategorie));
    expect(kategorien.size).toBeGreaterThanOrEqual(3);
  });

  it.each(STUFEN)('Stufe %i hat genug Koalitionsziele je Partnerprofil', (complexity) => {
    const gefordert = koalitionsAgendaZielAnzahl(complexity);
    if (gefordert === 0) return;
    const profile = new Set((DEFAULT_CONTENT.koalitionsZiele ?? []).map((z) => z.partner_profil));
    for (const profil of profile) {
      const pool = (DEFAULT_CONTENT.koalitionsZiele ?? []).filter(
        (z) => z.partner_profil === profil && z.min_complexity <= complexity,
      );
      // Koalitionsziele sind nicht wählbar — zu wenige blockieren nichts, aber ein
      // leerer Pool wäre ein Content-Fehler.
      expect(pool.length).toBeGreaterThan(0);
    }
  });
});
