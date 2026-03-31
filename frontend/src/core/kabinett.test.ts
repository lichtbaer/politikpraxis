import { describe, it, expect } from 'vitest';
import { bildeKabinett, waehleMinisterAusPool, ALLE_RESSORTS } from './kabinett';

/** Kabinett-Größen laut KABINETT_GROESSE: 1→2, 2→5, 3→7, 4→8 */
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
