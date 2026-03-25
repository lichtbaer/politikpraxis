import { describe, it, expect } from 'vitest';
import { entlasseMinister } from './kabinett';
import { makeState, makeChar } from '../test-helpers';

describe('entlasseMinister', () => {
  it('entlässt Minister und zieht 20 PK ab', () => {
    const minister = makeChar({ id: 'minister_a', name: 'Anna', ressort: 'arbeit', pool_partei: 'sdp' });
    const kanzler = makeChar({ id: 'kanzler', ist_kanzler: true, pool_partei: 'sdp' });
    const state = makeState({
      pk: 50,
      chars: [kanzler, minister],
      spielerPartei: { id: 'sdp', kuerzel: 'SDP', farbe: '#e30', name: 'SDP' },
    });
    const contentChars = [kanzler, minister, makeChar({ id: 'ersatz', pool_partei: 'sdp', ressort: 'arbeit' })];
    const result = entlasseMinister(state, 'minister_a', 4, contentChars);
    expect(result.pk).toBe(30);
    expect(result.chars.find(c => c.id === 'minister_a')).toBeUndefined();
  });

  it('verweigert Entlassung bei zu wenig PK', () => {
    const minister = makeChar({ id: 'minister_a', ressort: 'arbeit', pool_partei: 'sdp' });
    const state = makeState({
      pk: 10,
      chars: [makeChar({ id: 'kanzler', ist_kanzler: true }), minister],
    });
    const result = entlasseMinister(state, 'minister_a', 4, []);
    expect(result.pk).toBe(10); // Unverändert
  });

  it('verweigert Entlassung des Kanzlers', () => {
    const kanzler = makeChar({ id: 'kanzler', ist_kanzler: true, pool_partei: 'sdp' });
    const state = makeState({ pk: 50, chars: [kanzler] });
    const result = entlasseMinister(state, 'kanzler', 4, []);
    expect(result.chars).toHaveLength(1);
    expect(result.pk).toBe(50);
  });

  it('verweigert Entlassung bei niedriger Komplexität', () => {
    const minister = makeChar({ id: 'minister_a', ressort: 'arbeit', pool_partei: 'sdp' });
    const state = makeState({
      pk: 50,
      chars: [makeChar({ id: 'kanzler', ist_kanzler: true }), minister],
    });
    const result = entlasseMinister(state, 'minister_a', 1, []);
    expect(result.pk).toBe(50); // Unverändert — Feature nicht aktiv
  });

  it('senkt Koalitions-Beziehung bei Partner-Minister', () => {
    const partnerMinister = makeChar({
      id: 'partner_m',
      name: 'Partner',
      ressort: 'umwelt',
      pool_partei: 'gp',
    });
    const state = makeState({
      pk: 50,
      chars: [makeChar({ id: 'kanzler', ist_kanzler: true, pool_partei: 'sdp' }), partnerMinister],
      spielerPartei: { id: 'sdp', kuerzel: 'SDP', farbe: '#e30', name: 'SDP' },
      koalitionspartner: {
        id: 'gp',
        beziehung: 60,
        koalitionsvertragScore: 0,
        schluesselthemenErfuellt: [],
      },
    });
    const result = entlasseMinister(state, 'partner_m', 4, [partnerMinister]);
    expect(result.koalitionspartner!.beziehung).toBe(45); // 60 - 15
  });

  it('gibt unveränderten State zurück bei unbekanntem Char', () => {
    const state = makeState({
      pk: 50,
      chars: [makeChar({ id: 'kanzler', ist_kanzler: true })],
    });
    const result = entlasseMinister(state, 'nicht_vorhanden', 4, []);
    expect(result).toEqual(state);
  });
});
