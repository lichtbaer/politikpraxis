import { describe, it, expect } from 'vitest';
import { berechneEffektiveBTStimmen } from './parliament';
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
