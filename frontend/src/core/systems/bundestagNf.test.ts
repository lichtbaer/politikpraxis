import { describe, it, expect } from 'vitest';
import { getNfBundestagBtModifikator, getNfBundestagMedienDelta } from './bundestagNf';
import type { Law } from '../types';
import { NF_IDEOLOGIE_REF } from '../../constants/bundestag';
import { berechneKongruenz } from '../ideologie';

function baseLaw(ideologie: Law['ideologie']): Law {
  return {
    id: 't',
    titel: 'T',
    kurz: 'T',
    desc: '',
    tags: ['bund'],
    status: 'entwurf',
    ja: 50,
    nein: 50,
    effekte: {},
    lag: 1,
    expanded: false,
    route: null,
    rprog: 0,
    rdur: 0,
    blockiert: null,
    ideologie,
  };
}

describe('bundestagNf', () => {
  it('Overton: progressiv → −2', () => {
    const law = baseLaw({ wirtschaft: -50, gesellschaft: -60, staat: -30 });
    expect(getNfBundestagBtModifikator(law)).toBe(-2);
  });

  it('Overton: konservativ → +2', () => {
    const law = baseLaw({ wirtschaft: 20, gesellschaft: 50, staat: 40 });
    expect(getNfBundestagBtModifikator(law)).toBe(2);
  });

  it('Medien: hohe Kongruenz mit NF → −3', () => {
    const law = baseLaw(NF_IDEOLOGIE_REF);
    expect(berechneKongruenz(NF_IDEOLOGIE_REF, law.ideologie!)).toBe(100);
    expect(getNfBundestagMedienDelta(law)).toBe(-3);
  });

  it('Medien: niedrige Kongruenz → 0', () => {
    const law = baseLaw({ wirtschaft: -80, gesellschaft: -80, staat: -80 });
    expect(getNfBundestagMedienDelta(law)).toBe(0);
  });
});
