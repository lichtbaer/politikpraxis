import { describe, expect, it } from 'vitest';
import {
  berechneIdeologieMalus,
  getGesetzIdeologieWert,
  getIdeologieMalusFuerBt,
  getKoalitionIdeologieSkalar,
  pruefePartnerWiderstand,
} from './ideologiePartner';
import type { Law } from '../types';

describe('ideologiePartner (SMA-403)', () => {
  it('berechneIdeologieMalus Stufen', () => {
    expect(berechneIdeologieMalus(0)).toBe(0);
    expect(berechneIdeologieMalus(19)).toBe(0);
    expect(berechneIdeologieMalus(25)).toBe(-5);
    expect(berechneIdeologieMalus(45)).toBe(-15);
    expect(berechneIdeologieMalus(65)).toBe(-25);
    expect(berechneIdeologieMalus(90)).toBe(-40);
  });

  it('getGesetzIdeologieWert: ideologie_wert hat Vorrang', () => {
    const law = {
      id: 'x',
      ideologie_wert: 40,
      ideologie: { wirtschaft: -100, gesellschaft: -100, staat: -100 },
    } as Law;
    expect(getGesetzIdeologieWert(law)).toBe(40);
  });

  it('getKoalitionIdeologieSkalar: Mittelwert Spieler + Partner', () => {
    expect(getKoalitionIdeologieSkalar('sdp', 'gp')).toBe(Math.round((-30 + -40) / 2));
    expect(getKoalitionIdeologieSkalar('cdp', 'ldp')).toBe(Math.round((30 + 20) / 2));
  });

  it('getIdeologieMalusFuerBt bei großem Abstand', () => {
    const law = { id: 'm', ideologie_wert: 80 } as Law;
    const m = getIdeologieMalusFuerBt(law, 'gp', 'sdp');
    expect(m).toBeLessThanOrEqual(-25);
  });

  it('pruefePartnerWiderstand: ohne Kernthema null', () => {
    const law = {
      id: 'n',
      politikfeldId: 'digital_infrastruktur',
      ideologie_wert: 90,
    } as Law;
    expect(pruefePartnerWiderstand(law, 'sdp', 4)).toBeNull();
  });

  it('pruefePartnerWiderstand: Veto bei großem Abstand + Kernthema (Stufe 4)', () => {
    const law = {
      id: 'kohle',
      politikfeldId: 'umwelt_energie',
      ideologie_wert: 85,
    } as Law;
    const r = pruefePartnerWiderstand(law, 'gp', 4);
    expect(r?.intensitaet).toBe('veto');
  });

  it('pruefePartnerWiderstand: Stufe 3 cappt Veto auf widerstand', () => {
    const law = {
      id: 'kohle',
      politikfeldId: 'umwelt_energie',
      ideologie_wert: 85,
    } as Law;
    const r = pruefePartnerWiderstand(law, 'gp', 3);
    expect(r?.intensitaet).toBe('widerstand');
  });
});
