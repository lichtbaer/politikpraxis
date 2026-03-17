import type { GameState, ContentBundle } from './types';
import { featureActive } from './systems/features';
import { getKoalitionspartner, berechneKoalitionsvertragProfil } from './systems/koalition';
import { initEUKlima } from './systems/eu';
import { createInitialHaushalt } from './systems/haushalt';
import type { Ausrichtung } from './systems/ausrichtung';
import { recalcApproval } from './systems/economy';

/** Milieu → zust-Feld für initiale Zustimmung (SMA-264) */
const MILIEU_TO_ZUST: Record<string, keyof GameState['zust']> = {
  postmaterielle: 'prog',
  soziale_mitte: 'arbeit',
  prekaere: 'arbeit',
  buergerliche_mitte: 'mitte',
  leistungstraeger: 'mitte',
  etablierte: 'mitte',
  traditionelle: 'mitte',
};

/**
 * Erstellt den initialen Spielzustand.
 * @param content Content-Bundle (Chars, Gesetze, Events, …)
 * @param complexity Komplexitätsstufe (1–4). Chars mit min_complexity > complexity werden ausgeblendet.
 * @param ausrichtung Optionale Spieler-Ausrichtung für Koalitionsvertrag-Profil (bei init)
 */
export function createInitialState(
  content: ContentBundle,
  complexity: number = 4,
  ausrichtung?: Ausrichtung,
): GameState {
  const fraktionen = content.bundesratFraktionen ?? [];
  const activeChars = content.characters.filter(
    (c) => (c.min_complexity ?? 1) <= complexity
  );

  const partner = content.koalitionspartner ? getKoalitionspartner(content) : null;
  const hasKoalition = featureActive(complexity, 'koalitionspartner') && partner;

  const base: GameState = {
    month: content.scenario.startMonth,
    speed: 0,
    pk: content.scenario.startPK,
    view: 'agenda',

    kpi: { ...content.scenario.startKPI },
    kpiPrev: null,
    zust: { g: 52, arbeit: 58, mitte: 54, prog: 44 },
    coalition: content.scenario.startCoalition,

    chars: activeChars.map((c) => ({ ...c })),
    gesetze: content.laws.map(g => ({ ...g, expanded: false, route: null, rprog: 0, rdur: 0, blockiert: null })),
    bundesrat: content.bundesrat.map(b => ({ ...b })),
    bundesratFraktionen: fraktionen.map(f => ({
      ...f,
      tradeoffPool: f.tradeoffPool.map(t => ({ ...t })),
    })),

    activeEvent: null,
    firedEvents: [],
    firedCharEvents: [],
    firedBundesratEvents: [],
    firedKommunalEvents: [],

    pending: [],

    log: [],
    ticker: 'Neue Legislaturperiode. Koalitionsvertrag unterzeichnet.',

    gameOver: false,
    won: false,

    milieuZustimmung: {},
    verbandsBeziehungen: (() => {
      const bez: Record<string, number> = {};
      for (const v of content.verbaende ?? []) {
        bez[v.id] = v.beziehung_start;
      }
      return bez;
    })(),
    politikfeldDruck: {},
    politikfeldLetzterBeschluss: {},
  };

  if (featureActive(complexity, 'milieus_voll') && (content.milieus?.length ?? 0) > 0) {
    const zust = recalcApproval(content.scenario.startKPI, base.zust);
    const milieuZustimmung: Record<string, number> = {};
    for (const m of content.milieus!) {
      if (m.min_complexity <= complexity) {
        milieuZustimmung[m.id] = zust[MILIEU_TO_ZUST[m.id] ?? 'mitte'] ?? 50;
      }
    }
    base.milieuZustimmung = milieuZustimmung;
  }

  function applyEUKlimaAndRatsvorsitz(result: GameState): GameState {
    let r = initEUKlima(result, content, complexity);
    if (r.eu && featureActive(complexity, 'eu_ratsvorsitz')) {
      r = {
        ...r,
        eu: { ...r.eu, ratsvorsitzStartMonat: Math.random() < 0.5 ? 6 : 30 },
      };
    }
    if (featureActive(complexity, 'medienklima')) {
      r = {
        ...r,
        medienKlima: 55,
        letzterSkandal: 0,
        letztesPressemitteilungMonat: 0,
        opposition: featureActive(complexity, 'opposition')
          ? { staerke: 40, aktivesThema: null, letzterAngriff: 0 }
          : undefined,
      };
    }
    return r;
  }

  if (featureActive(complexity, 'haushaltsdebatte')) {
    const withHaushalt = { ...base, haushalt: createInitialHaushalt(base) };
    if (hasKoalition && partner) {
      return applyEUKlimaAndRatsvorsitz({
        ...withHaushalt,
        koalitionspartner: {
          id: partner.id,
          beziehung: partner.beziehung_start,
          koalitionsvertragScore: 0,
          schluesselthemenErfuellt: [],
        },
        koalitionsvertragProfil: berechneKoalitionsvertragProfil(ausrichtung ?? { wirtschaft: 0, gesellschaft: 0, staat: 0 }, partner),
        verbandsBeziehungen: { uvb: 50, bvd: 50, ...withHaushalt.verbandsBeziehungen },
      });
    }
    return applyEUKlimaAndRatsvorsitz(withHaushalt);
  }

  if (hasKoalition && partner) {
    const ideologie = ausrichtung ?? { wirtschaft: 0, gesellschaft: 0, staat: 0 };
    const verbandsBeziehungen = { ...base.verbandsBeziehungen };
    verbandsBeziehungen['uvb'] = 50;
    verbandsBeziehungen['bvd'] = 50;
    return applyEUKlimaAndRatsvorsitz({
      ...base,
      koalitionspartner: {
        id: partner.id,
        beziehung: partner.beziehung_start,
        koalitionsvertragScore: 0,
        schluesselthemenErfuellt: [],
      },
      koalitionsvertragProfil: berechneKoalitionsvertragProfil(ideologie, partner),
      verbandsBeziehungen,
    });
  }

  return applyEUKlimaAndRatsvorsitz(base);
}

/**
 * Migriert ältere Spielstände: zust.arbeit/mitte/prog → milieuZustimmung.
 * arbeit → soziale_mitte, prekaere; mitte → buergerliche_mitte, leistungstraeger; prog → postmaterielle
 */
export function migrateGameState(state: GameState): GameState {
  let result = state;
  if (!state.milieuZustimmung || Object.keys(state.milieuZustimmung).length === 0) {
    const zust = state.zust;
    const milieuZustimmung: Record<string, number> = {};
    milieuZustimmung['soziale_mitte'] = zust.arbeit;
    milieuZustimmung['prekaere'] = zust.arbeit;
    milieuZustimmung['buergerliche_mitte'] = zust.mitte;
    milieuZustimmung['leistungstraeger'] = zust.mitte;
    milieuZustimmung['postmaterielle'] = zust.prog;
    milieuZustimmung['etablierte'] = zust.mitte;
    milieuZustimmung['traditionelle'] = zust.mitte;
    result = {
      ...state,
      milieuZustimmung,
      verbandsBeziehungen: state.verbandsBeziehungen ?? {},
      politikfeldDruck: state.politikfeldDruck ?? {},
      politikfeldLetzterBeschluss: state.politikfeldLetzterBeschluss ?? {},
      ministerialCooldowns: state.ministerialCooldowns ?? {},
      aktiveMinisterialInitiative: state.aktiveMinisterialInitiative ?? null,
      eu: state.eu ?? undefined,
    };
  }
  if (!result.haushalt) {
    result = { ...result, haushalt: createInitialHaushalt(result) };
  }
  if (result.medienKlima == null) {
    result = {
      ...result,
      medienKlima: 55,
      letzterSkandal: result.letzterSkandal ?? 0,
      letztesPressemitteilungMonat: result.letztesPressemitteilungMonat ?? 0,
      opposition: result.opposition ?? { staerke: 40, aktivesThema: null, letzterAngriff: 0 },
    };
  }
  return result;
}
