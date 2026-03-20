import { describe, it, expect } from 'vitest';
import { berechneSitzverteilung, BUNDESTAG_SITZE_GESAMT } from './bundestag';

describe('berechneSitzverteilung', () => {
  it('summiert auf 600 Sitze', () => {
    const f = berechneSitzverteilung('SDP', 'GP', 0.53, 'sdp');
    const sum = f.reduce((s, x) => s + x.sitze, 0);
    expect(sum).toBe(BUNDESTAG_SITZE_GESAMT);
  });

  it('NF hat fix ~12 %', () => {
    const f = berechneSitzverteilung('SDP', 'GP', 0.53, 'sdp');
    const nf = f.find((x) => x.id === 'nf');
    expect(nf?.sitze).toBe(Math.round(BUNDESTAG_SITZE_GESAMT * 0.12));
    expect(nf?.passiv).toBe(true);
  });
});
