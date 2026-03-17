import type { GameState, ContentBundle } from './types';
import { featureActive } from './systems/features';
import { getKoalitionspartner, berechneKoalitionsvertragProfil } from './systems/koalition';
import { initEUKlima } from './systems/eu';
import type { Ausrichtung } from './systems/ausrichtung';

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

    pending: [],

    log: [],
    ticker: 'Neue Legislaturperiode. Koalitionsvertrag unterzeichnet.',

    gameOver: false,
    won: false,

    milieuZustimmung: {},
    verbandsBeziehungen: {},
    politikfeldDruck: {},
    politikfeldLetzterBeschluss: {},
  };

  let result: GameState = base;
  if (hasKoalition && partner) {
    const ideologie = ausrichtung ?? { wirtschaft: 0, gesellschaft: 0, staat: 0 };
    result = {
      ...base,
      koalitionspartner: {
        id: partner.id,
        beziehung: partner.beziehung_start,
        koalitionsvertragScore: 0,
        schluesselthemenErfuellt: [],
      },
      koalitionsvertragProfil: berechneKoalitionsvertragProfil(ideologie, partner),
      verbandsBeziehungen: { uvb: 50, bvd: 50 },
    };
  }

  result = initEUKlima(result, content, complexity);
  if (result.eu && featureActive(complexity, 'eu_ratsvorsitz')) {
    result = {
      ...result,
      eu: {
        ...result.eu,
        ratsvorsitzStartMonat: Math.random() < 0.5 ? 6 : 30,
      },
    };
  }

  return result;
}

/**
 * Migriert ältere Spielstände: zust.arbeit/mitte/prog → milieuZustimmung.
 * arbeit → soziale_mitte, prekaere; mitte → buergerliche_mitte, leistungstraeger; prog → postmaterielle
 */
export function migrateGameState(state: GameState): GameState {
  if (state.milieuZustimmung && Object.keys(state.milieuZustimmung).length > 0) {
    return state;
  }
  const zust = state.zust;
  const milieuZustimmung: Record<string, number> = {};
  milieuZustimmung['soziale_mitte'] = zust.arbeit;
  milieuZustimmung['prekaere'] = zust.arbeit;
  milieuZustimmung['buergerliche_mitte'] = zust.mitte;
  milieuZustimmung['leistungstraeger'] = zust.mitte;
  milieuZustimmung['postmaterielle'] = zust.prog;
  milieuZustimmung['etablierte'] = zust.mitte;
  milieuZustimmung['traditionelle'] = zust.mitte;
  return {
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
