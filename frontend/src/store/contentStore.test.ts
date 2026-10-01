/**
 * Offline-Fallback: Wenn das Backend komplett nicht erreichbar ist, muss das
 * Spiel mit gebündeltem Fallback-Content starten statt im Fehlerscreen zu enden.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../services/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../services/api';
import {
  useContentStore,
  getContentBundle,
  istContentVersionAbweichend,
  OFFLINE_CONTENT_VERSION,
} from './contentStore';
import { createInitialState } from '../core/state';

const apiFetchMock = vi.mocked(apiFetch);

describe('contentStore Offline-Fallback', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('startet bei komplettem API-Ausfall im Offline-Modus mit Fallback-Content', async () => {
    apiFetchMock.mockRejectedValue(new Error('network down'));

    await useContentStore.getState().load('de');

    const s = useContentStore.getState();
    expect(s.offline).toBe(true);
    expect(s.loaded).toBe(true);
    expect(s.error).toBeNull();
    expect(s.chars.length).toBeGreaterThan(0);
    expect(s.gesetze.length).toBeGreaterThan(0);
    expect(s.events.length).toBeGreaterThan(0);
    expect(s.bundesratFraktionen.length).toBeGreaterThan(0);
  });

  it('SMA-279: Fallback-Kabinett trägt eine symmetrische Beziehungsmatrix', async () => {
    apiFetchMock.mockRejectedValue(new Error('network down'));

    await useContentStore.getState().load('de');
    const s = useContentStore.getState();

    const kanzler = s.chars.find((c) => c.id === 'kanzler');
    expect(kanzler?.relationships).toEqual(
      expect.arrayContaining([{ target: 'im', type: 'verfeindet', staerke: 2 }]),
    );

    const byId = new Map(s.chars.map((c) => [c.id, c]));
    for (const char of s.chars) {
      for (const rel of char.relationships ?? []) {
        const mirror = byId.get(rel.target)?.relationships?.find((r) => r.target === char.id);
        expect(mirror).toBeDefined();
        expect(mirror?.type).toBe(rel.type);
      }
    }
  });

  it('Fallback-Content überlebt createInitialState (Smoke-Test, alle Stufen)', async () => {
    apiFetchMock.mockRejectedValue(new Error('network down'));

    await useContentStore.getState().load('de');
    const bundle = getContentBundle();

    for (const complexity of [1, 2, 3, 4]) {
      const state = createInitialState(bundle, complexity);
      expect(state.month).toBe(1);
      expect(state.chars.length).toBeGreaterThan(0);
      expect(state.gesetze.length).toBeGreaterThan(0);
    }
  });

  it('Fallback-Fraktionen decken alle 16 Länder ab', async () => {
    apiFetchMock.mockRejectedValue(new Error('network down'));

    await useContentStore.getState().load('de');
    const s = useContentStore.getState();
    const laender = s.bundesratFraktionen.flatMap((f) => f.laender);
    expect(new Set(laender).size).toBe(16);
  });

  it('Teilausfall kritischer Endpoints bleibt ein harter Fehler (kein Mischzustand)', async () => {
    apiFetchMock.mockImplementation((path: string) => {
      if (path.startsWith('/content/chars')) return Promise.resolve([]);
      return Promise.reject(new Error('network down'));
    });

    await useContentStore.getState().load('de');

    const s = useContentStore.getState();
    expect(s.offline).toBe(false);
    expect(s.loaded).toBe(false);
    expect(s.error).not.toBeNull();
  });
});

describe('contentStore: Zufalls-Pool und EU-Events aus der API', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  function apiEvent(id: string, event_type: string, extra: Record<string, unknown> = {}) {
    return { id, event_type, type_label: '', title: id, quote: '', context: '', ticker: '', choices: [], ...extra };
  }

  const EVENTS = [
    apiEvent('haushalt', 'random'),
    apiEvent('naturkatastrophe', 'danger'),
    apiEvent('beraterskandal_enthuellung', 'danger', { arc_id: 'beraterskandal', arc_stage: 1 }),
    apiEvent('beraterskandal_leak', 'danger', { arc_id: 'beraterskandal', arc_stage: 2 }),
    apiEvent('ruestungsexport_kontrollgesetz', 'primary', { arc_id: 'ruestungsexport', arc_stage: 3 }),
    apiEvent('foederalismusgipfel', 'bundesrat'),
    apiEvent('dyn_rezession_eintritt', 'dynamic'),
    apiEvent('fm_ultimatum', 'char_ultimatum'),
    apiEvent('steuerstreit_koalition', 'conditional'),
  ];

  const EU_EVENTS = [
    {
      id: 'eu_rl_mindestlohn',
      event_type: 'reaktiv_richtlinie',
      politikfeld_id: 'arbeit_soziales',
      trigger_klima_min: 45,
      trigger_monat: null,
      min_complexity: 3,
      title: 'EU-Mindestlohn-Richtlinie',
      quote: 'Brüssel verlangt Standards.',
      context: 'Kontext',
      ticker: 'Ticker',
      choices: [
        { key: 'sofort_umsetzen', cost_pk: 0, effekte: { al: 0, hh: 0, gi: 0, zf: 0 }, eu_klima_delta: 8, kofinanzierung: 0.2, label: 'Sofort', desc: '', log_msg: 'umgesetzt' },
        { key: 'minimal_umsetzen', cost_pk: 0, effekte: { al: 0, hh: 0, gi: 0, zf: 0 }, eu_klima_delta: 0, kofinanzierung: 0.1, label: 'Minimal', desc: '', log_msg: 'minimal' },
        { key: 'klagen', cost_pk: 0, effekte: { al: 0, hh: 0, gi: 0, zf: 0 }, eu_klima_delta: 0, kofinanzierung: 0, label: 'Klagen', desc: '', log_msg: 'geklagt' },
      ],
    },
  ];

  async function ladeMitApi() {
    apiFetchMock.mockImplementation((path: string) => {
      if (path.startsWith('/content/events')) return Promise.resolve(EVENTS);
      if (path.startsWith('/content/eu-events')) return Promise.resolve(EU_EVENTS);
      return Promise.resolve([]);
    });
    await useContentStore.getState().load('de');
    return useContentStore.getState();
  }

  it('nimmt Story-Arcs und nachgeseedete Events in den Pool, Spezialkategorien nicht', async () => {
    const s = await ladeMitApi();
    expect(s.error).toBeNull();
    expect(s.events.map(e => e.id).sort()).toEqual([
      'beraterskandal_enthuellung',
      'beraterskandal_leak',
      'haushalt',
      'naturkatastrophe',
      'ruestungsexport_kontrollgesetz',
    ]);
  });

  it('lädt EU-Events als spielbare Ereignisse mit EU-Klima-Wirkung', async () => {
    const s = await ladeMitApi();
    expect(s.euEvents).toHaveLength(1);
    const eu = s.euEvents[0];
    expect(eu).toMatchObject({ id: 'eu_rl_mindestlohn', politikfeld_id: 'arbeit_soziales', trigger_klima_min: 45, min_complexity: 3, event_type: 'reaktiv_richtlinie' });
    expect(eu.event?.title).toBe('EU-Mindestlohn-Richtlinie');
    expect(eu.event?.choices.map(c => c.type)).toEqual(['primary', 'safe', 'danger']);
    expect(eu.event?.choices[0]).toMatchObject({ key: 'sofort_umsetzen', euKlima: { feldId: 'arbeit_soziales', delta: 8 }, kofinanzierung: 0.2, log: 'umgesetzt' });
    expect(eu.event?.choices[2].euKlima).toBeUndefined();
    expect(getContentBundle().euEvents).toHaveLength(1);
  });
});

describe('contentStore: Content-Version (#244)', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    useContentStore.setState({ contentVersion: null });
  });

  function mockApi(version: () => Promise<unknown>) {
    apiFetchMock.mockImplementation((path: string) => {
      if (path.startsWith('/content/version')) return version();
      return Promise.resolve([]);
    });
  }

  it('lädt die Content-Version sprachunabhängig und speichert sie', async () => {
    mockApi(() => Promise.resolve({ content_version: '0123456789abcdef' }));

    await useContentStore.getState().load('en');

    const s = useContentStore.getState();
    expect(s.loaded).toBe(true);
    expect(s.contentVersion).toBe('0123456789abcdef');
    // Kein locale-Parameter: die Version darf nicht von der Spielsprache abhängen
    expect(apiFetchMock).toHaveBeenCalledWith('/content/version');
  });

  it('Ausfall des Version-Endpoints ist nicht kritisch (Content lädt, Version null)', async () => {
    mockApi(() => Promise.reject(new Error('404')));

    await useContentStore.getState().load('de');

    const s = useContentStore.getState();
    expect(s.loaded).toBe(true);
    expect(s.error).toBeNull();
    expect(s.contentVersion).toBeNull();
  });

  it('ignoriert eine unerwartete Antwortform', async () => {
    mockApi(() => Promise.resolve([]));
    await useContentStore.getState().load('de');
    expect(useContentStore.getState().contentVersion).toBeNull();
  });

  it("Offline-Fallback trägt die Version 'offline'", async () => {
    apiFetchMock.mockRejectedValue(new Error('network down'));
    await useContentStore.getState().load('de');
    expect(useContentStore.getState().offline).toBe(true);
    expect(useContentStore.getState().contentVersion).toBe(OFFLINE_CONTENT_VERSION);
  });

  it('istContentVersionAbweichend vergleicht nur echte Versionen', () => {
    expect(istContentVersionAbweichend('aaa', 'bbb')).toBe(true);
    expect(istContentVersionAbweichend('aaa', 'aaa')).toBe(false);
    expect(istContentVersionAbweichend(undefined, 'aaa')).toBe(false);
    expect(istContentVersionAbweichend('aaa', null)).toBe(false);
    expect(istContentVersionAbweichend(OFFLINE_CONTENT_VERSION, 'aaa')).toBe(false);
    expect(istContentVersionAbweichend('aaa', OFFLINE_CONTENT_VERSION)).toBe(false);
  });
});
