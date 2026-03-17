/**
 * SMA-293: Tests für Politikfeld-Clustering und Kongruenz-Sortierung
 */
import { describe, it, expect } from 'vitest';
import {
  gruppiereNachPolitikfeld,
  getTop3Empfohlen,
  POLITIKFELD_ICONS,
} from './gesetzAgenda';
import type { Law, Ideologie, Politikfeld } from './types';

const MOCK_POLITIKFELDER: Politikfeld[] = [
  { id: 'wirtschaft_finanzen', verbandId: null, druckEventId: null },
  { id: 'umwelt_energie', verbandId: null, druckEventId: null },
  { id: 'innere_sicherheit', verbandId: null, druckEventId: null },
];

function mockLaw(
  id: string,
  politikfeldId: string,
  ideologie: Ideologie,
  status: Law['status'] = 'entwurf',
): Law {
  return {
    id,
    titel: id,
    kurz: id,
    desc: '',
    tags: ['bund'],
    status,
    ja: 50,
    nein: 50,
    effekte: {},
    lag: 4,
    expanded: false,
    route: null,
    rprog: 0,
    rdur: 0,
    blockiert: null,
    ideologie,
    politikfeldId,
  };
}

describe('gruppiereNachPolitikfeld', () => {
  it('gruppiert Gesetze nach Politikfeld', () => {
    const sdp: Ideologie = { wirtschaft: -40, gesellschaft: -20, staat: -40 };
    const gesetze: Law[] = [
      mockLaw('ee', 'umwelt_energie', { wirtschaft: -60, gesellschaft: -70, staat: -20 }),
      mockLaw('sr', 'wirtschaft_finanzen', { wirtschaft: 70, gesellschaft: 0, staat: 40 }),
      mockLaw('ki', 'wirtschaft_finanzen', { wirtschaft: -30, gesellschaft: -40, staat: -10 }),
    ];
    const clusters = gruppiereNachPolitikfeld(gesetze, MOCK_POLITIKFELDER, sdp);
    expect(clusters).toHaveLength(2);
    const umwelt = clusters.find((c) => c.feldId === 'umwelt_energie');
    const wirtschaft = clusters.find((c) => c.feldId === 'wirtschaft_finanzen');
    expect(umwelt?.gesetze).toHaveLength(1);
    expect(umwelt?.gesetze[0].id).toBe('ee');
    expect(wirtschaft?.gesetze).toHaveLength(2);
    expect(wirtschaft?.gesetze[0].id).toBe('ki');
    expect(wirtschaft?.gesetze[1].id).toBe('sr');
  });

  it('sortiert Politikfelder nach durchschnittlicher Kongruenz', () => {
    const sdp: Ideologie = { wirtschaft: -40, gesellschaft: -20, staat: -40 };
    const gesetze: Law[] = [
      mockLaw('ee', 'umwelt_energie', { wirtschaft: -60, gesellschaft: -70, staat: -20 }),
      mockLaw('sr', 'wirtschaft_finanzen', { wirtschaft: 70, gesellschaft: 0, staat: 40 }),
    ];
    const clusters = gruppiereNachPolitikfeld(gesetze, MOCK_POLITIKFELDER, sdp);
    expect(clusters[0].feldId).toBe('umwelt_energie');
    expect(clusters[1].feldId).toBe('wirtschaft_finanzen');
  });
});

describe('getTop3Empfohlen', () => {
  it('gibt Top-3 Gesetze nach Kongruenz zurück', () => {
    const sdp: Ideologie = { wirtschaft: -40, gesellschaft: -20, staat: -40 };
    const gesetze: Law[] = [
      mockLaw('ee', 'umwelt_energie', { wirtschaft: -60, gesellschaft: -70, staat: -20 }),
      mockLaw('sr', 'wirtschaft_finanzen', { wirtschaft: 70, gesellschaft: 0, staat: 40 }),
      mockLaw('ki', 'wirtschaft_finanzen', { wirtschaft: -30, gesellschaft: -40, staat: -10 }),
    ];
    const top3 = getTop3Empfohlen(gesetze, sdp);
    expect(top3.has('ee')).toBe(true);
    expect(top3.has('ki')).toBe(true);
    expect(top3.size).toBeLessThanOrEqual(3);
  });
});

describe('POLITIKFELD_ICONS', () => {
  it('enthält alle 8 Politikfelder', () => {
    const ids = [
      'wirtschaft_finanzen',
      'arbeit_soziales',
      'umwelt_energie',
      'innere_sicherheit',
      'bildung_forschung',
      'gesundheit_pflege',
      'digital_infrastruktur',
      'landwirtschaft',
    ];
    for (const id of ids) {
      expect(POLITIKFELD_ICONS[id]).toBeDefined();
    }
  });
});
