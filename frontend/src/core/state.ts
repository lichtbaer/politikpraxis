import type { GameState, ContentBundle } from './types';

/**
 * Erstellt den initialen Spielzustand.
 * @param content Content-Bundle (Chars, Gesetze, Events, …)
 * @param complexity Komplexitätsstufe (1–4). Chars mit min_complexity > complexity werden ausgeblendet.
 */
export function createInitialState(content: ContentBundle, complexity: number = 4): GameState {
  const fraktionen = content.bundesratFraktionen ?? [];
  const activeChars = content.characters.filter(
    (c) => (c.min_complexity ?? 1) <= complexity
  );

  return {
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
  };
}
