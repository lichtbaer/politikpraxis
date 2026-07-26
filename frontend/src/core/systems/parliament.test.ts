import { describe, it, expect } from 'vitest';
import { berechneEffektiveBTStimmen, berechneJaBreakdown, resolveEingebrachteAbstimmung } from './parliament';
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

/** Ideologisch neutrales Gesetz — löst weder den NF-Overton-Effekt noch Ideologie-Malus aus. */
function neutralesGesetz(): Law {
  return { ...eeGesetz(), id: 'neutral', kurz: 'NG', ideologie: { wirtschaft: 0, gesellschaft: 0, staat: 0 } };
}

describe('berechneJaBreakdown (Issue #270)', () => {
  it('liefert nur die Basis, wenn kein Modifikator aktiv ist', () => {
    const law = neutralesGesetz();
    const state = makeState({ gesetze: [law] });
    const breakdown = berechneJaBreakdown(state, law, law.id, 1, { complexity: 1, milieus: [] });
    expect(breakdown.basis).toBe(law.ja);
    expect(breakdown.modifikatoren).toEqual([]);
    expect(breakdown.effectiveJa).toBe(law.ja);
    expect(breakdown.abweichlerRisiko).toBe(0);
  });

  it('führt Koalitions-Priorität und Vorstufen-Bonus als eigene Zeilen auf und summiert korrekt', () => {
    const law = neutralesGesetz();
    const state = makeState({
      gesetze: [law],
      koalitionspartner: { id: 'gp' as const, beziehung: 60, koalitionsvertragScore: 50, schluesselthemenErfuellt: [] },
      partnerPrioGesetz: { gesetzId: law.id, bisMonat: 10 },
      gesetzProjekte: { [law.id]: { gesetzId: law.id, status: 'bundesebene', aktiveVorstufen: [], boni: { pkKostenRabatt: 0, btStimmenBonus: 8, bundesratBonus: 0, kofinanzierung: 0, medienRueckhalt: 0 } } },
      month: 1,
    });
    const breakdown = berechneJaBreakdown(state, law, law.id, 1, { complexity: 1, milieus: [] });
    expect(breakdown.modifikatoren).toEqual(
      expect.arrayContaining([
        { key: 'koalitionsPrioritaet', delta: 5 },
        { key: 'vorstufenBoni', delta: 8 },
      ]),
    );
    expect(breakdown.effectiveJa).toBe(Math.min(95, law.ja + 5 + 8));
  });

  it('zeigt ein Abweichler-Risiko > 0 bei ideologisch fernem Gesetz ab Stufe 2, halbiert nach Fraktionssitzung', () => {
    const law: Law = {
      ...eeGesetz(),
      id: 'entferntes_gesetz',
      ideologie: { wirtschaft: 90, gesellschaft: 90, staat: 90 },
    };
    const state = makeState({
      gesetze: [law],
      koalitionsvertragProfil: { wirtschaft: -50, gesellschaft: -50, staat: -50 },
    });
    const ohneSitzung = berechneJaBreakdown(state, law, law.id, 2, { complexity: 2, milieus: [] });
    expect(ohneSitzung.abweichlerRisiko).toBeGreaterThan(0);

    const stateMitSitzung = makeState({
      gesetze: [law],
      koalitionsvertragProfil: { wirtschaft: -50, gesellschaft: -50, staat: -50 },
      eingebrachteGesetze: [{ gesetzId: law.id, abstimmungMonat: 5, eingebrachtMonat: 3, lagMonths: 2, fraktionssitzungGehalten: true }],
    });
    const mitSitzung = berechneJaBreakdown(stateMitSitzung, law, law.id, 2, { complexity: 2, milieus: [] });
    expect(mitSitzung.abweichlerRisiko).toBe(Math.round(ohneSitzung.abweichlerRisiko / 2));
  });

  it('zeigt kein Abweichler-Risiko auf Stufe 1 (Feature erst ab Stufe 2 aktiv)', () => {
    const law: Law = {
      ...eeGesetz(),
      ideologie: { wirtschaft: 90, gesellschaft: 90, staat: 90 },
    };
    const state = makeState({ gesetze: [law], koalitionsvertragProfil: { wirtschaft: -50, gesellschaft: -50, staat: -50 } });
    const breakdown = berechneJaBreakdown(state, law, law.id, 1, { complexity: 1, milieus: [] });
    expect(breakdown.abweichlerRisiko).toBe(0);
  });
});
