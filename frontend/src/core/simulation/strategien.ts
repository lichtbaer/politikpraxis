/**
 * Balance-Test-Strategien für Monte-Carlo-Simulation.
 * Port der Python-Strategien aus backend/tests/simulation/strategien.py
 * auf die echte TypeScript-Engine.
 */
import type { GameState, ContentBundle, Law } from '../types';

export type StrategyAction =
  | { typ: 'einbringen'; gesetzId: string }
  | { typ: 'lobbying'; gesetzId: string }
  | { typ: 'pressemitteilung' }
  | { typ: 'koalitionsrunde' }
  | { typ: 'nichts' };

export type Strategy = (state: GameState, content: ContentBundle, complexity: number) => StrategyAction;

/** Verfügbare Gesetze: Entwurf-Status, nicht event-locked */
function verfuegbareGesetze(state: GameState): Law[] {
  return state.gesetze.filter(
    g => g.status === 'entwurf' && !g.locked_until_event
  );
}

/** Kongruenz-Score Gesetz vs. Partei (vereinfacht) */
function kongruenz(law: Law, partei: 'sdp' | 'cdp'): number {
  const ideo = law.ideologie;
  if (!ideo) return 0;
  const score = ideo.wirtschaft * 0.4 + ideo.gesellschaft * 0.35 + ideo.staat * 0.25;
  return partei === 'sdp' ? score : -score;
}

// =============================================================================
// Basis-Strategien
// =============================================================================

/** Wählt zufällig eine Aktion */
export function strategieRandom(state: GameState): StrategyAction {
  const aktionen = ['nichts', 'einbringen', 'lobbying', 'pressemitteilung'] as const;
  const a = aktionen[Math.floor(Math.random() * aktionen.length)];

  if (a === 'einbringen') {
    const gesetze = verfuegbareGesetze(state);
    if (gesetze.length > 0 && state.pk >= 15) {
      const g = gesetze[Math.floor(Math.random() * gesetze.length)];
      return { typ: 'einbringen', gesetzId: g.id };
    }
    return { typ: 'nichts' };
  }
  if (a === 'lobbying') {
    const eingebrachte = state.gesetze.filter(g => g.status === 'eingebracht' || g.status === 'entwurf');
    if (eingebrachte.length > 0 && state.pk >= 12) {
      return { typ: 'lobbying', gesetzId: eingebrachte[0].id };
    }
    return { typ: 'nichts' };
  }
  if (a === 'pressemitteilung') return { typ: 'pressemitteilung' };
  return { typ: 'nichts' };
}

/** Bringt immer das erste verfügbare Gesetz ein */
export function strategieImmerEinbringen(state: GameState): StrategyAction {
  const gesetze = verfuegbareGesetze(state);
  if (gesetze.length > 0 && state.pk >= 15) {
    return { typ: 'einbringen', gesetzId: gesetze[0].id };
  }
  return { typ: 'nichts' };
}

/** Bringt nur Spargesetze ein (pflichtausgaben_delta < 0) */
export function strategieNurSparen(state: GameState): StrategyAction {
  const spargesetze = verfuegbareGesetze(state).filter(
    g => (g.pflichtausgaben_delta ?? 0) < 0
  );
  if (spargesetze.length > 0 && state.pk >= 15) {
    return { typ: 'einbringen', gesetzId: spargesetze[0].id };
  }
  return { typ: 'nichts' };
}

/** Bringt nur teure Ausgaben-Gesetze ein */
export function strategieNurAusgaben(state: GameState): StrategyAction {
  const ausgaben = verfuegbareGesetze(state)
    .filter(g => (g.kosten_laufend ?? 0) > 2 || (g.effekte.hh ?? 0) < -0.3)
    .sort((a, b) => {
      const scoreA = (a.kosten_laufend ?? 0) * 12 + ((a.effekte.hh ?? 0) * 10);
      const scoreB = (b.kosten_laufend ?? 0) * 12 + ((b.effekte.hh ?? 0) * 10);
      return scoreA - scoreB;
    });
  if (ausgaben.length > 0 && state.pk >= 15) {
    return { typ: 'einbringen', gesetzId: ausgaben[0].id };
  }
  return { typ: 'nichts' };
}

/** Gibt nie PK aus */
export function strategiePkHorten(): StrategyAction {
  return { typ: 'nichts' };
}

/** Ideologisch kongruent für SDP (links) */
export function strategieIdeologischSdp(state: GameState): StrategyAction {
  const gesetze = verfuegbareGesetze(state);
  if (gesetze.length === 0 || state.pk < 15) return { typ: 'nichts' };
  const passend = [...gesetze].sort((a, b) => kongruenz(b, 'sdp') - kongruenz(a, 'sdp'));
  return { typ: 'einbringen', gesetzId: passend[0].id };
}

/** Ideologisch kongruent für CDP (rechts) */
export function strategieIdeologischCdp(state: GameState): StrategyAction {
  const gesetze = verfuegbareGesetze(state);
  if (gesetze.length === 0 || state.pk < 15) return { typ: 'nichts' };
  const passend = [...gesetze].sort((a, b) => kongruenz(b, 'cdp') - kongruenz(a, 'cdp'));
  return { typ: 'einbringen', gesetzId: passend[0].id };
}

// =============================================================================
// Scripted Scenarios (SMA-334)
// =============================================================================

/** Szenario 1: Musterschüler — 1 Gesetz pro Quartal, ideologisch kohärent, pflegt Koalition */
export function strategieMusterschueler(state: GameState): StrategyAction {
  if (state.pk < 15) return { typ: 'nichts' };

  const quartal = Math.floor((state.month - 1) / 3);
  const gesetzeErwartet = quartal + 1;
  const bereitsGebracht = state.gesetze.filter(
    g => g.status !== 'entwurf' || g.locked_until_event
  ).length - (state.gesetze.filter(g => g.locked_until_event).length);

  if (bereitsGebracht < gesetzeErwartet) {
    const gesetze = verfuegbareGesetze(state);
    if (gesetze.length > 0) {
      const passend = [...gesetze].sort((a, b) => kongruenz(b, 'sdp') - kongruenz(a, 'sdp'));
      return { typ: 'einbringen', gesetzId: passend[0].id };
    }
  }

  // Zwischen Gesetzen: abwechselnd Lobbying und Pressemitteilung
  if (state.pk >= 15 && state.coalition < 60) {
    return { typ: 'koalitionsrunde' };
  }
  if (state.pk >= 12 && Math.random() < 0.5) {
    const eingebrachte = state.gesetze.filter(g => g.status === 'eingebracht');
    if (eingebrachte.length > 0) {
      return { typ: 'lobbying', gesetzId: eingebrachte[0].id };
    }
  }
  if (state.pk >= 5) return { typ: 'pressemitteilung' };

  return { typ: 'nichts' };
}

/** Szenario 2: Sparkommissar — nur Spargesetze */
export function strategieSparkommissar(state: GameState): StrategyAction {
  return strategieNurSparen(state);
}

/** Szenario 4: Koalitionsbrecher — Gesetze die dem Partner widersprechen, nie Koalitionsrunde */
export function strategieKoalitionsbrecher(state: GameState): StrategyAction {
  if (state.pk < 15) return { typ: 'nichts' };
  const gesetze = verfuegbareGesetze(state);
  if (gesetze.length === 0) return { typ: 'nichts' };
  // Gesetze mit niedrigster CDP-Kongruenz (widerspricht Partner)
  const widersprechend = [...gesetze].sort((a, b) => kongruenz(a, 'cdp') - kongruenz(b, 'cdp'));
  return { typ: 'einbringen', gesetzId: widersprechend[0].id };
}

/** Szenario 5: Medienmogul — maximiert Lobbying und Pressemitteilungen */
export function strategieMedienmogul(state: GameState): StrategyAction {
  if (state.pk >= 12) {
    const gesetze = state.gesetze.filter(g => g.status === 'eingebracht' || g.status === 'entwurf');
    if (gesetze.length > 0) return { typ: 'lobbying', gesetzId: gesetze[0].id };
  }
  if (state.pk >= 5) return { typ: 'pressemitteilung' };
  return { typ: 'nichts' };
}

/** Szenario 6: Verbands-Freund — Gesetze mit höchstem zf + gi Score */
export function strategieVerbandsFreund(state: GameState): StrategyAction {
  const gesetze = verfuegbareGesetze(state);
  if (gesetze.length === 0 || state.pk < 15) return { typ: 'nichts' };
  const best = [...gesetze].sort((a, b) => {
    const scoreA = (a.effekte.zf ?? 0) + (a.effekte.gi ?? 0) * 0.5;
    const scoreB = (b.effekte.zf ?? 0) + (b.effekte.gi ?? 0) * 0.5;
    return scoreB - scoreA;
  });
  return { typ: 'einbringen', gesetzId: best[0].id };
}

/** Szenario 8: Speed-Runner — so viele Gesetze wie möglich so früh wie möglich */
export function strategieSpeedRunner(state: GameState): StrategyAction {
  const gesetze = verfuegbareGesetze(state);
  if (gesetze.length > 0 && state.pk >= 15) {
    return { typ: 'einbringen', gesetzId: gesetze[0].id };
  }
  return { typ: 'nichts' };
}

/** Alle Strategien */
export function alleStrategien(): Record<string, Strategy> {
  return {
    random: strategieRandom,
    immer_einbringen: strategieImmerEinbringen,
    nur_sparen: strategieNurSparen,
    nur_ausgaben: strategieNurAusgaben,
    pk_horten: strategiePkHorten,
    ideologisch_sdp: strategieIdeologischSdp,
    ideologisch_cdp: strategieIdeologischCdp,
    musterschueler: strategieMusterschueler,
    sparkommissar: strategieSparkommissar,
    koalitionsbrecher: strategieKoalitionsbrecher,
    medienmogul: strategieMedienmogul,
    verbands_freund: strategieVerbandsFreund,
    speed_runner: strategieSpeedRunner,
  };
}
