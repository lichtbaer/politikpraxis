import { describe, expect, it } from 'vitest';
import type { ContentBundle, GameState } from './types';
import {
  koalitionsAgendaZielAnzahl,
  pickInitialKoalitionsAgenda,
  waehlbareSpielerAgendaZiele,
  withInitialKoalitionsAgenda,
} from './onboardingAgenda';

function minimalState(partnerId: string): GameState {
  return {
    month: 1,
    speed: 0,
    pk: 100,
    view: 'agenda',
    kpi: { al: 50, hh: 50, gi: 50, zf: 50 },
    kpiStart: { al: 50, hh: 50, gi: 50, zf: 50 },
    kpiPrev: null,
    tickLog: [],
    zust: { g: 50, arbeit: 50, mitte: 50, prog: 50 },
    coalition: 50,
    chars: [],
    gesetze: [],
    gesetzBTStimmen: {},
    bundesrat: [],
    activeEvent: null,
    firedEvents: [],
    ausgeloesteEvents: [],
    firedCharEvents: [],
    firedBundesratEvents: [],
    firedKommunalEvents: [],
    activeEventPool: [],
    unlockedLaws: [],
    pendingFollowups: [],
    pending: [],
    log: [],
    ticker: '',
    rngSeed: 1,
    gameOver: false,
    won: false,
    complexity: 3,
    milieuZustimmung: {},
    verbandsBeziehungen: {},
    politikfeldDruck: {},
    politikfeldLetzterBeschluss: {},
    medienKlima: 50,
    opposition: { staerke: 40, aktivesThema: null, letzterAngriff: 0 },
    koalitionspartner: { id: partnerId as 'gp', beziehung: 50, koalitionsvertragScore: 0, schluesselthemenErfuellt: [] },
    bundesratFraktionen: [],
  } as unknown as GameState;
}

describe('onboardingAgenda', () => {
  it('koalitionsAgendaZielAnzahl', () => {
    expect(koalitionsAgendaZielAnzahl(1)).toBe(0);
    expect(koalitionsAgendaZielAnzahl(2)).toBe(1);
    expect(koalitionsAgendaZielAnzahl(3)).toBe(2);
    expect(koalitionsAgendaZielAnzahl(4)).toBe(3);
  });

  it('pickInitialKoalitionsAgenda wählt nach Partner und sortiert', () => {
    const content = {
      koalitionsZiele: [
        { id: 'z_b', partner_profil: 'gp', kategorie: 'milieu', min_complexity: 1, bedingung_typ: 'x', bedingung_param: {}, beziehung_malus: 1, titel: '', beschreibung: '' },
        { id: 'z_a', partner_profil: 'gp', kategorie: 'gesetzgebung', min_complexity: 1, bedingung_typ: 'x', bedingung_param: {}, beziehung_malus: 1, titel: '', beschreibung: '' },
        { id: 'z_other', partner_profil: 'sdp', kategorie: 'milieu', min_complexity: 1, bedingung_typ: 'x', bedingung_param: {}, beziehung_malus: 1, titel: '', beschreibung: '' },
      ],
    };
    const st = minimalState('gp');
    expect(pickInitialKoalitionsAgenda(st, content as unknown as ContentBundle, 3)).toEqual(['z_a', 'z_b']);
  });

  it('pickInitialKoalitionsAgenda nimmt Gesetzesziele zuerst (#475)', () => {
    const z = (id: string, bedingung_typ: string) => ({
      id, partner_profil: 'gp', kategorie: 'x', min_complexity: 1, bedingung_typ, bedingung_param: {},
      beziehung_malus: 1, titel: '', beschreibung: '',
    });
    const content = {
      koalitionsZiele: [
        z('kz_a_milieu', 'milieu_zustimmung_steigern'),
        z('kz_b_verband', 'verband_beziehung_steigern'),
        z('kz_z_gesetz', 'gesetz_politikfeld'),
      ],
    } as unknown as ContentBundle;
    const st = minimalState('gp');
    expect(pickInitialKoalitionsAgenda(st, content, 2)).toEqual(['kz_z_gesetz']);
    expect(pickInitialKoalitionsAgenda(st, content, 4)).toEqual(['kz_z_gesetz', 'kz_a_milieu', 'kz_b_verband']);
  });

  it('waehlbareSpielerAgendaZiele filtert nach Stufe und Partei', () => {
    const z = (id: string, min_complexity: number, partei_filter: string[] | null) => ({
      id, kategorie: 'x', schwierigkeit: 1, partei_filter, min_complexity, bedingung_typ: 'x',
      bedingung_param: {}, titel: '', beschreibung: '',
    });
    const content = {
      agendaZiele: [z('alle_1', 1, null), z('sdp_1', 1, ['sdp']), z('cdp_1', 1, ['cdp']), z('alle_2', 2, null)],
    } as unknown as ContentBundle;
    expect(waehlbareSpielerAgendaZiele(content, 1, 'sdp').map((x) => x.id)).toEqual(['alle_1', 'sdp_1']);
    expect(waehlbareSpielerAgendaZiele(content, 2, 'cdp').map((x) => x.id)).toEqual(['alle_1', 'cdp_1', 'alle_2']);
  });

  it('withInitialKoalitionsAgenda mutiert State nur bei Treffern', () => {
    const base = minimalState('gp');
    const empty = withInitialKoalitionsAgenda(base, { koalitionsZiele: [] } as unknown as ContentBundle, 3);
    expect(empty).toBe(base);
    const filled = withInitialKoalitionsAgenda(base, {
      koalitionsZiele: [
        { id: 'only', partner_profil: 'gp', kategorie: 'milieu', min_complexity: 1, bedingung_typ: 'x', bedingung_param: {}, beziehung_malus: 1, titel: '', beschreibung: '' },
      ],
    } as unknown as ContentBundle, 2);
    expect(filled.koalitionsAgenda).toEqual(['only']);
  });
});
