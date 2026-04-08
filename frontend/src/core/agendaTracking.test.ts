import { describe, expect, it } from 'vitest';
import type { AgendaZielContent, ContentBundle, GameState, KoalitionsZielContent } from './types';
import { buildAgendaSidebarRows } from './agendaTracking';

const minimalState = (): GameState =>
  ({
    month: 5,
    speed: 1,
    pk: 50,
    view: 'agenda',
    kpi: { al: 5, hh: 0, gi: 50, zf: 50 },
    kpiPrev: null,
    tickLog: [],
    zust: { g: 45, arbeit: 45, mitte: 45, prog: 45 },
    coalition: 70,
    chars: [
      { id: 'm1', name: 'A', role: 'x', initials: 'A', color: '#000', mood: 3, loyalty: 80, bio: '', interests: [], bonus: { trigger: '', desc: '', applies: '' }, ultimatum: { moodThresh: 0, event: '' } },
      { id: 'm2', name: 'B', role: 'y', initials: 'B', color: '#000', mood: 3, loyalty: 80, bio: '', interests: [], bonus: { trigger: '', desc: '', applies: '' }, ultimatum: { moodThresh: 0, event: '' } },
    ],
    gesetze: [],
    bundesrat: [],
    bundesratFraktionen: [],
    activeEvent: null,
    firedEvents: [],
    firedCharEvents: [],
    firedBundesratEvents: [],
    pending: [],
    log: [],
    ticker: '',
    rngSeed: 1,
    gameOver: false,
    won: false,
  }) as unknown as GameState;

describe('buildAgendaSidebarRows', () => {
  it('Spieler: Gesetz-Anzahl und Ampel', () => {
    const z: AgendaZielContent = {
      id: 'ag_test',
      kategorie: 'gesetzgebung',
      schwierigkeit: 2,
      partei_filter: null,
      min_complexity: 1,
      bedingung_typ: 'gesetz_anzahl_beschlossen',
      bedingung_param: { min_beschlossen: 2 },
      titel: 'Zwei Gesetze',
      beschreibung: '',
    };
    const state = minimalState();
    state.spielerAgenda = ['ag_test'];
    state.gesetze = [
      { id: 'a', titel: '', kurz: '', desc: '', tags: ['bund'], status: 'beschlossen', ja: 0, nein: 0, effekte: {}, lag: 1, expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null },
      { id: 'b', titel: '', kurz: '', desc: '', tags: ['bund'], status: 'entwurf', ja: 0, nein: 0, effekte: {}, lag: 1, expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null },
    ] as GameState['gesetze'];
    const content = { agendaZiele: [z], koalitionsZiele: [] } as unknown as ContentBundle;
    const rows = buildAgendaSidebarRows(state, content);
    expect(rows).toHaveLength(1);
    expect(rows[0].erfuellt).toBe(false);
    expect(rows[0].ampel).toBe('yellow');
    expect(rows[0].source).toBe('spieler');
  });

  it('Spieler: Milieu-Ziel erfüllt wenn Legislatur-Min ≥ Schwelle', () => {
    const z: AgendaZielContent = {
      id: 'ag_m',
      kategorie: 'milieu',
      schwierigkeit: 2,
      partei_filter: null,
      min_complexity: 1,
      bedingung_typ: 'milieu_zustimmung_min',
      bedingung_param: { milieu_id: 'soziale_mitte', min_pct: 48 },
      titel: 'Mitte halten',
      beschreibung: '',
    };
    const state = minimalState();
    state.spielerAgenda = ['ag_m'];
    state.milieuZustimmung = { soziale_mitte: 40 };
    state.milieuHistory = { soziale_mitte: { min: 48, max: 55, sum: 500, months: 10 } };
    const content = { agendaZiele: [z], koalitionsZiele: [] } as unknown as ContentBundle;
    const rows = buildAgendaSidebarRows(state, content);
    expect(rows[0].erfuellt).toBe(true);
    expect(rows[0].ampel).toBe('red');
  });

  it('Koalition: Politikfeld-Gesetze offen', () => {
    const z: KoalitionsZielContent = {
      id: 'kz_umwelt',
      partner_profil: 'gp',
      kategorie: 'gesetzgebung',
      min_complexity: 1,
      bedingung_typ: 'gesetz_politikfeld',
      bedingung_param: { politikfeld_id: 'umwelt_energie', min_beschlossen: 1 },
      beziehung_malus: 5,
      titel: 'Umweltgesetz',
      beschreibung: '',
    };
    const state = minimalState();
    state.koalitionsAgenda = ['kz_umwelt'];
    const content = { agendaZiele: [], koalitionsZiele: [z] } as unknown as ContentBundle;
    const rows = buildAgendaSidebarRows(state, content);
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe('koalition');
    expect(rows[0].erfuellt).toBe(false);
    expect(rows[0].subtitle.key).toContain('koalitionGesetzOffen');
  });
});
