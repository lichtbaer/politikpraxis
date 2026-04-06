import type { GameState, ContentBundle, LegislaturBilanz, Ideologie } from '../types';
import { addLog } from '../engine';
import { withPause, getAutoPauseLevel } from '../eventPause';
import { featureActive } from './features';
import { getKoalitionspartner } from './koalition';
import { berechneWahlprognose } from './wahlprognose';
import { berechneKongruenz } from '../ideologie';
import { verbrauchePK } from '../pk';
import { nextRandom } from '../rng';
import {
  DEFAULT_ELECTION_THRESHOLD,
  PK_WAHLKAMPF_REDE,
  PK_WAHLKAMPF_KOALITION,
  PK_WAHLKAMPF_MEDIENOFFENSIVE,
} from '../constants';

/** Opposition-Stärke aus Bundesrat (Anteil Opposition-Stimmen in %) */
function berechneOppositionStaerke(state: GameState): number {
  const total = state.bundesrat.reduce((s, l) => s + l.votes, 0);
  if (total === 0) return 0;
  const opposition = state.bundesrat
    .filter(l => l.alignment === 'opposition')
    .reduce((s, l) => s + l.votes, 0);
  return Math.round((opposition / total) * 100);
}

/** Koalitionsvertrag-Erfüllung 0–1 (aus koalitionsvertragScore) */
function berechneKVErfuellung(state: GameState): number {
  const kp = state.koalitionspartner;
  if (!kp) return 1;
  return Math.max(0, Math.min(1, kp.koalitionsvertragScore / 100));
}

/** Kernthemen (Politikfelder mit meisten Beschlüssen) */
function berechneKernthemen(state: GameState, _content: ContentBundle): string[] {
  const beschlossen = state.gesetze.filter(g => g.status === 'beschlossen');
  const feldCount: Record<string, number> = {};
  for (const g of beschlossen) {
    const feld = g.politikfeldId ?? 'sonstiges';
    feldCount[feld] = (feldCount[feld] ?? 0) + 1;
  }
  return Object.entries(feldCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
}

/** Schwachstellen (Politikfelder mit Druck, aber wenig Beschlüssen) */
function berechneSchwachstellen(state: GameState, _content: ContentBundle): string[] {
  const druck = state.politikfeldDruck ?? {};
  const beschlossen = state.gesetze.filter(g => g.status === 'beschlossen');
  const feldCount: Record<string, number> = {};
  for (const g of beschlossen) {
    const feld = g.politikfeldId ?? 'sonstiges';
    feldCount[feld] = (feldCount[feld] ?? 0) + 1;
  }
  return Object.entries(druck)
    .filter(([, v]) => v >= 40)
    .filter(([id]) => (feldCount[id] ?? 0) < 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
}

/** Legislatur-Bilanz berechnen (Monat 43) */
export function berechneLegislaturBilanz(
  state: GameState,
  content: ContentBundle,
): LegislaturBilanz {
  const beschlossen = state.gesetze.filter(g => g.status === 'beschlossen');
  const felder = new Set(
    beschlossen.map(g => g.politikfeldId ?? 'sonstiges').filter(Boolean),
  ).size;
  const kvErfuellt = berechneKVErfuellung(state);
  const history = state.medienKlimaHistory ?? [];
  const medienDurchschnitt =
    history.length > 0 ? history.reduce((a, b) => a + b, 0) / history.length : 50;

  const haushaltsaldo = state.haushalt?.saldoKumulativ ?? 0;
  const arbeitslosigkeit = state.kpi.al;
  const kpBeziehung = state.koalitionspartner?.beziehung ?? 50;

  return {
    gesetzeBeschlossen: beschlossen.length,
    politikfelderAbgedeckt: felder,
    haushaltsaldo,
    koalitionsvertragErfuellt: kvErfuellt,
    reformStaerke:
      beschlossen.length >= 8 ? 'stark' : beschlossen.length >= 4 ? 'moderat' : 'schwach',
    stabilitaet:
      kpBeziehung >= 50 ? 'stabil' : kpBeziehung >= 25 ? 'turbulent' : 'krise',
    wirtschaftsBilanz:
      arbeitslosigkeit < 5 ? 'positiv' : arbeitslosigkeit > 7 ? 'negativ' : 'neutral',
    medienbilanz:
      medienDurchschnitt > 55 ? 'gut' : medienDurchschnitt > 35 ? 'gemischt' : 'schlecht',
    kernthemen: berechneKernthemen(state, content),
    schwachstellen: berechneSchwachstellen(state, content),
    glaubwuerdigkeitsBonus: kvErfuellt >= 0.8 ? 3 : 0,
  };
}

/** Wahlkampf-Beginn prüfen (Monat 43) */
export function checkWahlkampfBeginn(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'wahlkampf')) return state;
  if (state.month !== 43) return state;
  if (state.wahlkampfAktiv) return state;

  const legislaturBilanz = berechneLegislaturBilanz(state, content);

  let next: GameState = {
    ...state,
    wahlkampfAktiv: true,
    legislaturBilanz,
    wahlkampfAktionenGenutzt: 0,
    tvDuellAbgehalten: false,
    tvDuellGewonnen: null,
  };

  // Medienklima initialisieren falls nicht vorhanden
  if (next.medienKlima == null) {
    next = { ...next, medienKlima: 50, medienKlimaHistory: [50] };
  }
  if (next.wahlprognose == null) {
    next = {
      ...next,
      wahlprognose: berechneWahlprognose(
        { ...next, zust: { ...next.zust, g: berechneWahlprognose(next, content, complexity) },
        },
        content,
        complexity,
      ),
    };
  }

  next = addLog(next, 'Wahlkampf beginnt — noch 6 Monate bis zur Wahl.', 'g');

  const ev = content.events?.find(e => e.id === 'wahlkampf_beginn');
  if (ev) {
    next = { ...next, activeEvent: ev, ...withPause(next, getAutoPauseLevel(ev)) };
  }

  return next;
}

/** Wahlkampf-Rede: 8 PK → +5 Milieu-Zustimmung, ggf. +3 Medienklima */
export function wahlkampfRede(
  state: GameState,
  milieuId: string,
  content: ContentBundle,
  ausrichtung: Ideologie,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'wahlkampf')) return state;
  if (!state.wahlkampfAktiv) return state;
  if ((state.wahlkampfAktionenGenutzt ?? 0) >= 2) return state;

  const next = verbrauchePK(state, PK_WAHLKAMPF_REDE);
  if (!next) return state;

  const milieu = content.milieus?.find(m => m.id === milieuId);
  if (!milieu) return state;

  const current = next.milieuZustimmung?.[milieuId] ?? 50;
  const milieuZustimmung = { ...(next.milieuZustimmung ?? {}), [milieuId]: Math.min(100, current + 5) };

  let medienKlima = next.medienKlima ?? 50;
  const kongruenz = berechneKongruenz(ausrichtung, milieu.ideologie);
  if (kongruenz > 60) {
    medienKlima = Math.min(100, medienKlima + 3);
  }

  return addLog(
    {
      ...next,
      milieuZustimmung,
      medienKlima,
      wahlkampfAktionenGenutzt: (next.wahlkampfAktionenGenutzt ?? 0) + 1,
    },
    `Wahlkampf-Rede: ${milieuId} +5%`,
    'g',
  );
}

/** Wahlkampf-Koalition: 12 PK → Partner-Kernmilieus +4, Medien +5, Beziehung +8 */
export function wahlkampfKoalition(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'wahlkampf')) return state;
  if (!state.wahlkampfAktiv) return state;
  if ((state.wahlkampfAktionenGenutzt ?? 0) >= 2) return state;

  const kp = state.koalitionspartner;
  if (!kp || kp.beziehung < 50) return state;

  const next = verbrauchePK(state, PK_WAHLKAMPF_KOALITION);
  if (!next) return state;

  const partner = getKoalitionspartner(content, state);
  const milieuZustimmung = { ...(next.milieuZustimmung ?? {}) };
  for (const milieuId of partner.kernmilieus) {
    const current = milieuZustimmung[milieuId] ?? 50;
    milieuZustimmung[milieuId] = Math.min(100, current + 4);
  }

  const medienKlima = Math.min(100, (next.medienKlima ?? 50) + 5);
  const newBeziehung = Math.min(100, kp.beziehung + 8);

  return addLog(
    {
      ...next,
      milieuZustimmung,
      medienKlima,
      koalitionspartner: { ...kp, beziehung: newBeziehung },
      wahlkampfAktionenGenutzt: (next.wahlkampfAktionenGenutzt ?? 0) + 1,
    },
    'Wahlkampf-Koalition: Partner-Kernmilieus +4, Medien +5',
    'g',
  );
}

/** Medienoffensive: 15 PK, einmalig → Medien +10, Wahlprognose +2 */
export function wahlkampfMedienoffensive(
  state: GameState,
  _content: ContentBundle,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'wahlkampf')) return state;
  if (!state.wahlkampfAktiv) return state;
  if (state.medienoffensiveGenutzt) return state;

  const next = verbrauchePK(state, PK_WAHLKAMPF_MEDIENOFFENSIVE);
  if (!next) return state;

  const medienKlima = Math.min(100, (next.medienKlima ?? 50) + 10);
  const wahlprognose = Math.min(100, (next.wahlprognose ?? next.zust.g) + 2);

  return addLog(
    {
      ...next,
      medienKlima,
      wahlprognose,
      medienoffensiveGenutzt: true,
      wahlkampfAktionenGenutzt: (next.wahlkampfAktionenGenutzt ?? 0) + 1,
    },
    'Medienoffensive: Medienklima +10, Wahlprognose +2',
    'g',
  );
}

/** TV-Duell prüfen (Monat 45 oder 46) */
export function checkTVDuell(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'tv_duell')) return state;
  if (!state.wahlkampfAktiv) return state;
  if (state.tvDuellAbgehalten) return state;
  if (state.month !== 45 && state.month !== 46) return state;

  const ev = content.events?.find(e => e.id === 'tv_duell');
  if (ev) {
    return { ...state, activeEvent: ev, ...withPause(state, getAutoPauseLevel(ev)) };
  }
  return state;
}

/** TV-Duell auflösen (nach Spieler-Entscheidung) */
export function resolveTVDuell(
  state: GameState,
  vorbereitet: boolean,
): GameState {
  const medienKlima = state.medienKlima ?? 50;
  const wahlprognose = state.wahlprognose ?? state.zust.g;

  const basisChance =
    (medienKlima / 100) * 0.4 +
    (wahlprognose > 40 ? 0.3 : 0.15) +
    nextRandom() * 0.3;
  const chance = vorbereitet ? Math.min(0.85, basisChance + 0.2) : basisChance;

  const gewonnen = nextRandom() < chance;

  let next: GameState = {
    ...state,
    tvDuellAbgehalten: true,
    tvDuellGewonnen: gewonnen,
  };

  if (gewonnen) {
    const newMedien = Math.min(100, medienKlima + 12);
    const milieuZustimmung = { ...(next.milieuZustimmung ?? {}) };
    for (const id of Object.keys(milieuZustimmung)) {
      milieuZustimmung[id] = Math.min(100, (milieuZustimmung[id] ?? 50) + 3);
    }
    next = addLog(
      { ...next, medienKlima: newMedien, milieuZustimmung },
      'TV-Duell gewonnen — Rückenwind für die Schlussphase.',
      'g',
    );
  } else {
    const newMedien = Math.max(0, medienKlima - 8);
    const milieuZustimmung = { ...(next.milieuZustimmung ?? {}) };
    const bm = milieuZustimmung['buergerliche_mitte'] ?? 50;
    milieuZustimmung['buergerliche_mitte'] = Math.max(0, bm - 4);
    next = addLog(
      { ...next, medienKlima: newMedien, milieuZustimmung },
      'TV-Duell verloren.',
      'r',
    );
  }

  return next;
}

/**
 * Wahlkampf-Themenwahl prüfen (Monat 44, einmalig).
 * Löst das `wahlkampf_thema_wahl`-Event aus.
 */
export function checkWahlkampfThemaWahl(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'wahlkampf')) return state;
  if (!state.wahlkampfAktiv) return state;
  if (state.month !== 44) return state;
  if (state.firedEvents.includes('wahlkampf_thema_wahl')) return state;
  if (state.activeEvent) return state;

  const ev = content.events?.find(e => e.id === 'wahlkampf_thema_wahl');
  if (ev) {
    return {
      ...state,
      activeEvent: ev,
      firedEvents: [...state.firedEvents, 'wahlkampf_thema_wahl'],
      ...withPause(state, getAutoPauseLevel(ev)),
    };
  }
  return state;
}

/**
 * Wendet Milieu-Mobilisierung nach Themenwahl-Entscheidung an.
 * Wird aufgerufen wenn der Spieler das wahlkampf_thema_wahl-Event entscheidet.
 */
export function applyWahlkampfThema(
  state: GameState,
  choiceKey: string,
): GameState {
  const milieuZustimmung = { ...(state.milieuZustimmung ?? {}) };

  const THEMA_MILIEUS: Record<string, string[]> = {
    wirtschaft: ['soziale_mitte', 'arbeit', 'prekaere'],
    klima: ['postmaterielle', 'soziale_mitte'],
    sicherheit: ['buergerliche_mitte', 'traditionelle', 'leistungstraeger'],
  };

  const zielMilieus = THEMA_MILIEUS[choiceKey] ?? [];
  for (const mid of zielMilieus) {
    const current = milieuZustimmung[mid] ?? 50;
    milieuZustimmung[mid] = Math.min(100, current + 4);
  }

  return addLog(
    { ...state, milieuZustimmung },
    `Wahlkampfthema "${choiceKey}" mobilisiert Ziel-Milieus.`,
    'g',
  );
}

/**
 * Wahlkampf-Versprechen prüfen (Monat 47, einmalig).
 * Löst das `wahlkampf_versprechen`-Event aus.
 */
export function checkWahlkampfVersprechen(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'wahlkampf')) return state;
  if (!state.wahlkampfAktiv) return state;
  if (state.month !== 47) return state;
  if (state.firedEvents.includes('wahlkampf_versprechen')) return state;
  if (state.activeEvent) return state;

  const ev = content.events?.find(e => e.id === 'wahlkampf_versprechen');
  if (ev) {
    return {
      ...state,
      activeEvent: ev,
      firedEvents: [...state.firedEvents, 'wahlkampf_versprechen'],
      ...withPause(state, getAutoPauseLevel(ev)),
    };
  }
  return state;
}

/** Koalitionspartner-Alleingang (nur Stufe 4, Monat 43–48, 20% Chance) */
export function checkKoalitionspartnerAlleingang(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'koalitionspartner_alleingang')) return state;
  if (!state.wahlkampfAktiv) return state;
  if (state.month < 43 || state.month > 48) return state;
  const kp = state.koalitionspartner;
  if (!kp || kp.beziehung >= 50) return state;

  if (nextRandom() >= 0.2) return state;

  const ev = content.events?.find(e => e.id === 'koalitionspartner_alleingang');
  if (ev) {
    const medienKlima = Math.max(0, (state.medienKlima ?? 50) - 8);
    const newBeziehung = Math.max(0, kp.beziehung - 5);
    return addLog(
      {
        ...state,
        medienKlima,
        koalitionspartner: { ...kp, beziehung: newBeziehung },
        activeEvent: ev,
        ...withPause(state, getAutoPauseLevel(ev)),
      },
      'Koalitionspartner macht riskante öffentliche Aussage.',
      'r',
    );
  }

  return state;
}

/**
 * Zwischenbilanz-Event (Monat 45, einmalig) — füllt die Lücke wenn TV-Duell auf 46 fällt.
 */
export function checkWahlkampfZwischenbilanz(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'wahlkampf')) return state;
  if (!state.wahlkampfAktiv) return state;
  if (state.month !== 45) return state;
  if (state.firedEvents.includes('wahlkampf_zwischenbilanz')) return state;
  if (state.firedEvents.includes('tv_duell')) return state; // TV-Duell schon gelaufen
  if (state.activeEvent) return state;

  const ev = content.events?.find(e => e.id === 'wahlkampf_zwischenbilanz');
  if (ev) {
    return {
      ...state,
      activeEvent: ev,
      firedEvents: [...state.firedEvents, 'wahlkampf_zwischenbilanz'],
      ...withPause(state, getAutoPauseLevel(ev)),
    };
  }
  return state;
}

/**
 * Effekte der Wahlkampf-Zwischenbilanz-Entscheidung anwenden.
 * Wird in resolveEvent aufgerufen wenn wahlkampf_zwischenbilanz entschieden wird.
 */
export function applyWahlkampfZwischenbilanz(state: GameState, choiceKey: string): GameState {
  const milieuZustimmung = { ...(state.milieuZustimmung ?? {}) };
  let medienKlima = state.medienKlima ?? 50;

  if (choiceKey === 'schwache') {
    // Schwächste Milieus identifizieren und +3 geben
    const sorted = Object.entries(milieuZustimmung).sort((a, b) => a[1] - b[1]);
    for (const [mid] of sorted.slice(0, 2)) {
      milieuZustimmung[mid] = Math.min(100, (milieuZustimmung[mid] ?? 50) + 3);
    }
    medienKlima = Math.max(0, medienKlima - 5);
  } else if (choiceKey === 'medien') {
    // Alle Milieus +1, Medienklima +8
    for (const mid of Object.keys(milieuZustimmung)) {
      milieuZustimmung[mid] = Math.min(100, (milieuZustimmung[mid] ?? 50) + 1);
    }
    medienKlima = Math.min(100, medienKlima + 8);
  }
  // 'sparen': keine Effekte

  return addLog(
    { ...state, milieuZustimmung, medienKlima },
    `Wahlkampf-Halbzeit: Strategie "${choiceKey}" gewählt.`,
    'g',
  );
}

/** Wahlprognose monatlich aktualisieren (aus Milieu-Zustimmung) */
export function tickWahlkampfPrognose(
  state: GameState,
  content: ContentBundle,
  _complexity: number,
): GameState {
  if (!state.wahlkampfAktiv) return state;

  const prognose = berechneWahlprognose(state, content, _complexity);
  return { ...state, wahlprognose: prognose };
}

/** Finales Wahlergebnis berechnen (Monat 48) */
export function berechneWahlergebnis(state: GameState): number {
  let ergebnis = state.wahlprognose ?? state.zust.g;

  const bilanz = state.legislaturBilanz;
  if (bilanz) {
    if (bilanz.reformStaerke === 'stark') ergebnis += 2;
    if (bilanz.stabilitaet === 'krise') ergebnis -= 3;
    if (bilanz.wirtschaftsBilanz === 'positiv') ergebnis += 1;
    if (bilanz.wirtschaftsBilanz === 'negativ') ergebnis -= 2;
    ergebnis += bilanz.glaubwuerdigkeitsBonus;
  }

  const kp = state.koalitionspartner;
  if (kp && kp.koalitionsvertragScore >= 80) ergebnis += 2;

  const medienKlima = state.medienKlima ?? 50;
  if (medienKlima > 65) ergebnis += 2;
  else if (medienKlima < 25) ergebnis -= 3;

  const oppositionStaerke = berechneOppositionStaerke(state);
  if (oppositionStaerke > 70) ergebnis -= 2;

  if (state.tvDuellGewonnen === true) ergebnis += 1;
  if (state.tvDuellGewonnen === false) ergebnis -= 1;

  return Math.round(ergebnis * 10) / 10;
}

/** Wahlnacht-Trigger (Monat 48) — berechnet Wahlergebnis und setzt Spielende */
export function triggerWahlnacht(state: GameState, _complexity: number): GameState {
  if (state.month !== 48) return state;
  if (state.gameOver) return state;

  const wahlergebnis = state.wahlkampfAktiv
    ? berechneWahlergebnis(state)
    : (state.wahlprognose ?? state.zust.g);
  const threshold = state.electionThreshold ?? DEFAULT_ELECTION_THRESHOLD;
  const won = wahlergebnis >= threshold;

  return {
    ...state,
    wahlergebnis,
    gameOver: true,
    won,
    speed: 0,
  };
}
