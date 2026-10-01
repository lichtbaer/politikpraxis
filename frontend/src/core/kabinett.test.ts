import { describe, it, expect, vi } from 'vitest';
import { bildeKabinett, waehleMinisterAusPool, ALLE_RESSORTS, anzahlMinister } from './kabinett';
import { createInitialState } from './state';
import { echterContent } from './simulation/echterContent';
import { SPIELBARE_PARTEIEN } from '../data/defaults/parteien';

/** Kabinett-Größen laut KABINETT_GROESSE (inkl. Kanzler/in): 1→2, 2→5, 3→7, 4→8 */
const EXPECTED_GROESSE: Record<number, number> = { 1: 2, 2: 5, 3: 7, 4: 8 };

describe('bildeKabinett — ohne Koalitionspartner', () => {
  it('gibt nur spielerRessorts zurück, partnerRessorts ist leer', () => {
    const result = bildeKabinett('sdp', null, 4);
    expect(result.partnerRessorts).toHaveLength(0);
    expect(result.spielerRessorts.length).toBeGreaterThan(0);
  });

  it('Anzahl spielerRessorts entspricht der Kabinett-Größe (Stufe 4)', () => {
    const result = bildeKabinett('sdp', null, 4);
    expect(result.spielerRessorts.length).toBeLessThanOrEqual(EXPECTED_GROESSE[4]);
  });

  it('Stufe 1: maximal 2 Ressorts', () => {
    const result = bildeKabinett('lp', null, 1);
    expect(result.spielerRessorts.length).toBeLessThanOrEqual(EXPECTED_GROESSE[1]);
  });
});

describe('bildeKabinett — mit Koalitionspartner', () => {
  it('GP als Partner bekommt immer Umwelt', () => {
    const result = bildeKabinett('sdp', 'gp', 4);
    expect(result.partnerRessorts).toContain('umwelt');
  });

  it('keine Überlappung zwischen spieler- und partnerRessorts', () => {
    const result = bildeKabinett('lp', 'gp', 4);
    const overlap = result.spielerRessorts.filter((r) =>
      result.partnerRessorts.includes(r),
    );
    expect(overlap).toHaveLength(0);
  });

  it('alle Ressorts sind gültige ALLE_RESSORTS-Einträge', () => {
    const result = bildeKabinett('sdp', 'cdp', 3);
    for (const r of [...result.spielerRessorts, ...result.partnerRessorts]) {
      expect(ALLE_RESSORTS).toContain(r);
    }
  });

  it('Gesamtanzahl überschreitet nicht die Kabinett-Größe (Stufe 3)', () => {
    const result = bildeKabinett('sdp', 'gp', 3);
    const total = result.spielerRessorts.length + result.partnerRessorts.length;
    expect(total).toBeLessThanOrEqual(EXPECTED_GROESSE[3]);
  });

  it('Partner bekommt maximal 2 Ressorts', () => {
    const result = bildeKabinett('sdp', 'cdp', 4);
    expect(result.partnerRessorts.length).toBeLessThanOrEqual(2);
  });
});

describe('bildeKabinett — alle Complexity-Stufen', () => {
  for (const complexity of [1, 2, 3, 4]) {
    it(`Stufe ${complexity}: läuft ohne Fehler durch`, () => {
      expect(() => bildeKabinett('sdp', 'gp', complexity)).not.toThrow();
    });
  }
});

describe('waehleMinisterAusPool', () => {
  const pool = [
    { id: 'char_1', pool_partei: 'sdp', ressort: 'arbeit' },
    { id: 'char_2', pool_partei: 'sdp', ressort: 'finanzen' },
    { id: 'char_3', pool_partei: 'gp', ressort: 'umwelt' },
    { id: 'kanzler', pool_partei: 'sdp', ressort: 'arbeit', ist_kanzler: true },
  ];

  it('gibt passenden Charakter zurück', () => {
    const result = waehleMinisterAusPool(pool, 'sdp', 'arbeit');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('char_1');
  });

  it('gibt null zurück wenn kein passender Charakter vorhanden', () => {
    const result = waehleMinisterAusPool(pool, 'sdp', 'justiz');
    expect(result).toBeNull();
  });

  it('schließt Kanzler-Chars aus', () => {
    // Nur der Kanzler hat ressort=arbeit für sdp, char_1 kommt zuerst aber Kanzler soll ausgeschlossen sein
    const kanzlerOnly = [{ id: 'kanzler', pool_partei: 'sdp', ressort: 'arbeit', ist_kanzler: true }];
    const result = waehleMinisterAusPool(kanzlerOnly, 'sdp', 'arbeit');
    expect(result).toBeNull();
  });

  it('gibt null zurück bei leerem Pool', () => {
    expect(waehleMinisterAusPool([], 'sdp', 'arbeit')).toBeNull();
  });

  it('berücksichtigt ressort_partner', () => {
    const poolWithPartnerRessort = [
      { id: 'char_p', pool_partei: 'gp', ressort: 'umwelt', ressort_partner: 'wirtschaft' },
    ];
    const result = waehleMinisterAusPool(poolWithPartnerRessort, 'gp', 'wirtschaft');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('char_p');
  });
});

describe('bildeKabinett — Kabinettsgröße zählt die Kanzlerin/den Kanzler mit (#481)', () => {
  it('Minister = Größe − 1', () => {
    expect([1, 2, 3, 4].map(anzahlMinister)).toEqual([1, 4, 6, 7]);
  });

  it('Stufe 1 ohne Partner: genau ein Minister, das erste Präferenz-Ressort', () => {
    expect(bildeKabinett('sdp', null, 1)).toEqual({ spielerRessorts: ['arbeit'], partnerRessorts: [] });
  });

  it('überspringt Ressorts ohne Pool-Minister und füllt mit dem nächsten auf', () => {
    const ohneFinanzen = (_partei: string, ressort: string) => ressort !== 'finanzen';
    const result = bildeKabinett('sdp', null, 2, ohneFinanzen);
    expect(result.spielerRessorts).toEqual(['arbeit', 'innen', 'soziales', 'justiz']);
  });

  it('Partner übernimmt weitere Ressorts, wenn der Pool der Spieler-Partei erschöpft ist', () => {
    const nurArbeit = (partei: string, ressort: string) => partei === 'gp' || ressort === 'arbeit';
    const result = bildeKabinett('sdp', 'gp', 3, nurArbeit);
    expect(result.spielerRessorts).toEqual(['arbeit']);
    expect(result.partnerRessorts).toHaveLength(5);
  });
});

describe('createInitialState mit echtem Content: Kabinett je Stufe (#481)', () => {
  for (const partei of SPIELBARE_PARTEIEN) {
    it(`${partei.id}: Stufe 1 hat einen Pool-Minister, Stufe 2 fünf Personen, keine Fallback-Warnung`, () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const groessen = [1, 2, 3, 4].map((k) => {
        const state = createInitialState(echterContent(), k, undefined, {
          id: partei.id,
          kuerzel: partei.kuerzel,
          farbe: partei.farbe,
          name: partei.name,
        });
        return state.chars.length;
      });
      const kabinettWarnungen = warn.mock.calls.filter((args) => String(args[0]).startsWith('[state]'));
      warn.mockRestore();
      expect(kabinettWarnungen).toEqual([]);
      expect(groessen[0]).toBe(EXPECTED_GROESSE[1]);
      expect(groessen[1]).toBe(EXPECTED_GROESSE[2]);
      // Stufe 3/4: „bis zu“ 7/8 — die Pools mancher Parteien sind kleiner
      for (const [i, k] of [[2, 3], [3, 4]] as const) {
        expect(groessen[i]).toBeGreaterThanOrEqual(groessen[i - 1]);
        expect(groessen[i]).toBeLessThanOrEqual(EXPECTED_GROESSE[k]);
      }
    });
  }
});
