import { describe, it, expect } from 'vitest';
import { berechneEffektiveBTStimmen, berechneJaQuoteBreakdown, resolveEingebrachteAbstimmung } from './parliament';
import { makeState } from '../test-helpers';
import type { Law } from '../types';

function eeGesetz(): Law {
  return {
    id: 'ee',
    titel: 'EE-Beschleunigung',
    kurz: 'EE',
    desc: '',
    tags: ['bund'],
    status: 'entwurf',
    ja: 50,
    nein: 50,
    effekte: {},
    lag: 4,
    expanded: false,
    route: null,
    rprog: 0,
    rdur: 0,
    blockiert: null,
    ideologie: { wirtschaft: -60, gesellschaft: -70, staat: -20 },
  };
}

function sicherheitspaketGesetz(): Law {
  return {
    id: 'sicherheit_paket',
    titel: 'Sicherheitspaket',
    kurz: 'ISSG',
    desc: '',
    tags: ['bund'],
    status: 'entwurf',
    ja: 52,
    nein: 48,
    effekte: {},
    lag: 3,
    expanded: false,
    route: null,
    rprog: 0,
    rdur: 0,
    blockiert: null,
    ideologie: { wirtschaft: 10, gesellschaft: 65, staat: 25 },
  };
}

describe('berechneEffektiveBTStimmen', () => {
  it('GP+SDP: EE-Gesetz hat >55% Mehrheit', () => {
    const ee = eeGesetz();
    const gp = { wirtschaft: -50, gesellschaft: -70, staat: -20 };
    const sdp = { wirtschaft: -40, gesellschaft: -20, staat: -40 };
    const effektiv = berechneEffektiveBTStimmen(ee, 50, gp, sdp);
    expect(effektiv).toBeGreaterThan(55);
  });

  it('CDP+LDP: EE-Gesetz hat geringere Mehrheit als GP+SDP', () => {
    const ee = eeGesetz();
    const cdp = { wirtschaft: 20, gesellschaft: 30, staat: 20 };
    const ldp = { wirtschaft: 60, gesellschaft: -10, staat: 60 };
    const gp = { wirtschaft: -50, gesellschaft: -70, staat: -20 };
    const sdp = { wirtschaft: -40, gesellschaft: -20, staat: -40 };
    const cdpLdp = berechneEffektiveBTStimmen(ee, 50, cdp, ldp);
    const gpSdp = berechneEffektiveBTStimmen(ee, 50, gp, sdp);
    expect(cdpLdp).toBeLessThan(gpSdp);
    expect(gpSdp).toBeGreaterThan(55);
  });

  it('CDP+LDP: Sicherheitspaket hat >55% Mehrheit', () => {
    const gesetz = sicherheitspaketGesetz();
    const cdp = { wirtschaft: 20, gesellschaft: 30, staat: 20 };
    const ldp = { wirtschaft: 60, gesellschaft: -10, staat: 60 };
    const effektiv = berechneEffektiveBTStimmen(gesetz, 52, cdp, ldp);
    expect(effektiv).toBeGreaterThan(55);
  });

  it('SDP+GP: Sicherheitspaket hat geringere Mehrheit als CDP+LDP', () => {
    const gesetz = sicherheitspaketGesetz();
    const sdp = { wirtschaft: -40, gesellschaft: -20, staat: -40 };
    const gp = { wirtschaft: -50, gesellschaft: -70, staat: -20 };
    const cdp = { wirtschaft: 20, gesellschaft: 30, staat: 20 };
    const ldp = { wirtschaft: 60, gesellschaft: -10, staat: 60 };
    const sdpGp = berechneEffektiveBTStimmen(gesetz, 52, sdp, gp);
    const cdpLdp = berechneEffektiveBTStimmen(gesetz, 52, cdp, ldp);
    expect(sdpGp).toBeLessThan(cdpLdp);
    expect(cdpLdp).toBeGreaterThan(55);
  });

  it('clamp auf 20-90%', () => {
    const ee = eeGesetz();
    const extrem = { wirtschaft: 100, gesellschaft: 100, staat: 100 };
    const effektiv = berechneEffektiveBTStimmen(ee, 50, extrem, extrem);
    expect(effektiv).toBeLessThanOrEqual(90);
    expect(effektiv).toBeGreaterThanOrEqual(20);
  });
});

describe('resolveEingebrachteAbstimmung — Ideologie-Malus-Transparenz', () => {
  it('loggt einen Hinweis wenn der ideologische Abstand ≥15% Ja-Stimmen kostet', () => {
    // Koalition SDP+GP (Skalar −35) vs. stark rechtes Gesetz (+85) → Abstand 120 → Malus −40
    const law: Law = {
      ...eeGesetz(),
      id: 'hartes_gesetz',
      kurz: 'HG',
      status: 'eingebracht',
      ja: 80,
      ideologie: { wirtschaft: 85, gesellschaft: 85, staat: 85 },
      ideologie_wert: 85,
    };
    const base = makeState({
      gesetze: [law],
      eingebrachteGesetze: [{ gesetzId: 'hartes_gesetz', abstimmungMonat: 5, eingebrachtMonat: 3, lagMonths: 2 }],
      month: 5,
    });
    const state = {
      ...base,
      spielerPartei: { id: 'sdp' as const, kuerzel: 'SDP', farbe: '#c00', name: 'SDP' },
      koalitionspartner: { id: 'gp' as const, beziehung: 60, koalitionsvertragScore: 50, schluesselthemenErfuellt: [] },
    };
    const result = resolveEingebrachteAbstimmung(state, { gesetzId: 'hartes_gesetz' }, { complexity: 2, milieus: [] });
    expect(result.log.some((l) => l.msg.includes('Koalitionsfraktionen murren'))).toBe(true);
  });

  it('loggt nichts bei ideologisch passendem Gesetz', () => {
    const law: Law = {
      ...eeGesetz(),
      id: 'passendes_gesetz',
      kurz: 'PG',
      status: 'eingebracht',
      ja: 80,
      ideologie_wert: -35,
    };
    const base = makeState({
      gesetze: [law],
      eingebrachteGesetze: [{ gesetzId: 'passendes_gesetz', abstimmungMonat: 5, eingebrachtMonat: 3, lagMonths: 2 }],
      month: 5,
    });
    const state = {
      ...base,
      spielerPartei: { id: 'sdp' as const, kuerzel: 'SDP', farbe: '#c00', name: 'SDP' },
      koalitionspartner: { id: 'gp' as const, beziehung: 60, koalitionsvertragScore: 50, schluesselthemenErfuellt: [] },
    };
    const result = resolveEingebrachteAbstimmung(state, { gesetzId: 'passendes_gesetz' }, { complexity: 2, milieus: [] });
    expect(result.log.some((l) => l.msg.includes('Koalitionsfraktionen murren'))).toBe(false);
  });
});

describe('berechneJaQuoteBreakdown (#270)', () => {
  function neutralesGesetz(): Law {
    // Ideologisch neutral, damit der Overton-Modifikator (meinungsklima) inaktiv bleibt (0).
    return { ...eeGesetz(), id: 'neutrales_gesetz', ideologie: { wirtschaft: 0, gesellschaft: 0, staat: 0 } };
  }

  it('ohne aktive Modifikatoren: nur Basis, leere Modifikatorliste, gesamt = basis', () => {
    const law = { ...neutralesGesetz(), status: 'aktiv' as const, ja: 55 };
    const state = makeState({ gesetze: [law] });
    const breakdown = berechneJaQuoteBreakdown(state, law, 4);
    expect(breakdown.basis).toBe(55);
    expect(breakdown.modifikatoren).toEqual([]);
    expect(breakdown.gesamt).toBe(55);
  });

  it('Koalitionspartner-Priorität erscheint als eigene Zeile und erhöht die Gesamtsumme', () => {
    const law = { ...neutralesGesetz(), id: 'prio_gesetz', status: 'aktiv' as const, ja: 55 };
    const state = makeState({
      gesetze: [law],
      month: 3,
      koalitionspartner: { id: 'gp' as const, beziehung: 60, koalitionsvertragScore: 50, schluesselthemenErfuellt: [] },
      partnerPrioGesetz: { gesetzId: 'prio_gesetz', bisMonat: 6 },
    });
    // Stufe 1: 'ideologie_bt_malus' (minLevel 2) inaktiv, damit nur der Partner-Bonus isoliert getestet wird.
    const breakdown = berechneJaQuoteBreakdown(state, law, 1);
    expect(breakdown.modifikatoren).toEqual([{ key: 'partnerPrioritaet', wert: 5 }]);
    expect(breakdown.gesamt).toBe(60);
  });

  it('ideologischer Abstand zur Koalition erscheint als negative Zeile; gesamt = Basis + Summe aller Modifikatoren', () => {
    const law: Law = {
      ...eeGesetz(),
      id: 'hartes_gesetz',
      status: 'aktiv',
      ja: 80,
      ideologie: { wirtschaft: 85, gesellschaft: 85, staat: 85 },
      ideologie_wert: 85,
    };
    const state = {
      ...makeState({ gesetze: [law], month: 5 }),
      spielerPartei: { id: 'sdp' as const, kuerzel: 'SDP', farbe: '#c00', name: 'SDP' },
      koalitionspartner: { id: 'gp' as const, beziehung: 60, koalitionsvertragScore: 50, schluesselthemenErfuellt: [] },
    };
    const breakdown = berechneJaQuoteBreakdown(state, law, 2);
    const ideologieZeile = breakdown.modifikatoren.find((m) => m.key === 'ideologieAbstand');
    expect(ideologieZeile).toBeDefined();
    expect(ideologieZeile!.wert).toBeLessThan(0);
    const summe = breakdown.modifikatoren.reduce((sum, m) => sum + m.wert, 0);
    expect(breakdown.gesamt).toBe(80 + summe);
  });

  it('Gesamtsumme wird bei 95% gekappt', () => {
    const law = { ...neutralesGesetz(), id: 'prio_gesetz', status: 'aktiv' as const, ja: 92 };
    const state = makeState({
      gesetze: [law],
      month: 3,
      koalitionspartner: { id: 'gp' as const, beziehung: 60, koalitionsvertragScore: 50, schluesselthemenErfuellt: [] },
      partnerPrioGesetz: { gesetzId: 'prio_gesetz', bisMonat: 6 },
    });
    const breakdown = berechneJaQuoteBreakdown(state, law, 1);
    expect(breakdown.gesamt).toBe(95);
  });
});
