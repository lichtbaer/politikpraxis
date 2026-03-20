import { describe, it, expect } from 'vitest';
import { featureActive } from './features';

describe('featureActive', () => {
  it('bundesrat_sichtbar aktiv ab Stufe 2', () => {
    expect(featureActive(1, 'bundesrat_sichtbar')).toBe(false);
    expect(featureActive(2, 'bundesrat_sichtbar')).toBe(true);
    expect(featureActive(3, 'bundesrat_sichtbar')).toBe(true);
    expect(featureActive(4, 'bundesrat_sichtbar')).toBe(true);
  });

  it('bundesrat_detail aktiv ab Stufe 3', () => {
    expect(featureActive(2, 'bundesrat_detail')).toBe(false);
    expect(featureActive(3, 'bundesrat_detail')).toBe(true);
  });

  it('eu_events aktiv ab Stufe 4', () => {
    expect(featureActive(3, 'eu_events')).toBe(false);
    expect(featureActive(4, 'eu_events')).toBe(true);
  });

  it('wahlkampf aktiv ab Stufe 1', () => {
    expect(featureActive(1, 'wahlkampf')).toBe(true);
  });

  it('unbekanntes Feature: aktiv ab Stufe 1 (default minLevel 1)', () => {
    expect(featureActive(1, 'does_not_exist')).toBe(true);
  });

  it('politikfeld_druck aktiv ab Stufe 3', () => {
    expect(featureActive(2, 'politikfeld_druck')).toBe(false);
    expect(featureActive(3, 'politikfeld_druck')).toBe(true);
  });

  it('kommunal_pilot aktiv ab Stufe 2', () => {
    expect(featureActive(1, 'kommunal_pilot')).toBe(false);
    expect(featureActive(2, 'kommunal_pilot')).toBe(true);
  });

  it('bundestag_detail aktiv ab Stufe 2', () => {
    expect(featureActive(1, 'bundestag_detail')).toBe(false);
    expect(featureActive(2, 'bundestag_detail')).toBe(true);
  });

  it('extremismus_eskalation aktiv ab Stufe 2', () => {
    expect(featureActive(1, 'extremismus_eskalation')).toBe(false);
    expect(featureActive(2, 'extremismus_eskalation')).toBe(true);
  });
});
