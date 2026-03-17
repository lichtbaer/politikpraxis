import type { GameState, ContentBundle, Haushalt, SchuldenbremsenStatus } from '../types';
import { featureActive } from './features';

const EINNAHMEN_BASIS = 350;
const PFLICHTAUSGABEN_BASIS = 220;

/** Erstellt initiales Haushalt-Objekt */
export function createInitialHaushalt(state: GameState): Haushalt {
  const einnahmen = berechneEinnahmen(state);
  const pflichtausgaben = berechnePflichtausgaben(state);
  const spielraum = einnahmen - pflichtausgaben;
  const saldo = spielraum; // laufendeAusgaben startet bei 0
  return {
    einnahmen,
    pflichtausgaben,
    laufendeAusgaben: 0,
    spielraum,
    saldo,
    saldoKumulativ: 0,
    konjunkturIndex: 0,
    steuerpolitikModifikator: 1.0,
    investitionsquote: 0,
    schuldenbremseAktiv: true,
    haushaltsplanMonat: 10,
    haushaltsplanBeschlossen: false,
    planPrioritaeten: [],
  };
}

/** Berechnet Einnahmen (jährlich, konjunkturabhängig) */
export function berechneEinnahmen(state: GameState): number {
  const haushalt = state.haushalt;
  if (!haushalt) return EINNAHMEN_BASIS;

  const alFaktor = 1 - (state.kpi.al - 5) * 0.015;
  const wirtFaktor = 1 + haushalt.konjunkturIndex * 0.02;
  const steuerpolitikFaktor = haushalt.steuerpolitikModifikator;

  return Math.round(EINNAHMEN_BASIS * alFaktor * wirtFaktor * steuerpolitikFaktor);
}

/** Berechnet Pflichtausgaben (steigen bei AL > 6%) */
function berechnePflichtausgaben(state: GameState): number {
  const basis = PFLICHTAUSGABEN_BASIS;
  if (state.kpi.al > 6) {
    const zuschlag = (state.kpi.al - 6) * 2;
    return Math.round(basis + zuschlag);
  }
  return basis;
}

/** Wendet Gesetz-Kosten bei Beschluss an */
export function applyGesetzKosten(state: GameState, gesetzId: string): GameState {
  const haushalt = state.haushalt;
  if (!haushalt) return state;

  const gesetz = state.gesetze.find((g) => g.id === gesetzId);
  if (!gesetz) return state;

  const kostenEinmalig = gesetz.kosten_einmalig ?? 0;
  const kostenLaufend = gesetz.kosten_laufend ?? 0;
  const einnahmeEffekt = gesetz.einnahmeeffekt ?? 0;

  const einnahmeProz = einnahmeEffekt / EINNAHMEN_BASIS;
  const neuerSteuerpolitikModifikator = haushalt.steuerpolitikModifikator + einnahmeProz;

  const neuerHaushalt: Haushalt = {
    ...haushalt,
    saldoKumulativ: haushalt.saldoKumulativ - kostenEinmalig,
    laufendeAusgaben: haushalt.laufendeAusgaben + kostenLaufend,
    steuerpolitikModifikator: neuerSteuerpolitikModifikator,
    spielraum: haushalt.einnahmen - haushalt.pflichtausgaben,
    saldo: haushalt.einnahmen - haushalt.pflichtausgaben - (haushalt.laufendeAusgaben + kostenLaufend),
  };

  return { ...state, haushalt: neuerHaushalt };
}

/** Konjunkturindex-Drift (monatlich), jährliche Einnahmen-Neuberechnung */
export function tickKonjunktur(state: GameState, complexity: number): GameState {
  const haushalt = state.haushalt;
  if (!haushalt) return state;

  let neuerHaushalt = { ...haushalt };

  if (featureActive(complexity, 'konjunkturindex')) {
    const drift = (Math.random() - 0.5) * 0.4;
    neuerHaushalt = {
      ...neuerHaushalt,
      konjunkturIndex: Math.max(-3, Math.min(3, haushalt.konjunkturIndex + drift)),
    };
  }

  if (state.month % 12 === 0) {
    const pflichtausgaben = berechnePflichtausgaben(state);
    const einnahmen = berechneEinnahmen({ ...state, haushalt: neuerHaushalt });
    const spielraum = einnahmen - pflichtausgaben;
    const saldo = spielraum - neuerHaushalt.laufendeAusgaben;
    neuerHaushalt = {
      ...neuerHaushalt,
      einnahmen,
      pflichtausgaben,
      spielraum,
      saldo,
      saldoKumulativ: neuerHaushalt.saldoKumulativ + saldo,
    };
  }

  return { ...state, haushalt: neuerHaushalt };
}

/** Schuldenbremsen-Check */
export function checkSchuldenbremse(state: GameState, complexity: number): SchuldenbremsenStatus {
  if (!featureActive(complexity, 'schuldenbremse')) return 'inaktiv';
  const haushalt = state.haushalt;
  if (!haushalt) return 'inaktiv';

  const defizit = haushalt.saldo;
  if (defizit > 0) return 'ausgeglichen';
  if (defizit >= -12) return 'grenzwertig';
  if (defizit >= -18) return 'verletzt_mild';
  return 'verletzt_stark';
}

/** Wendet Schuldenbremsen-Effekte an (Lehmann-Mood, BDI, Event) */
export function applySchuldenbremsenEffekte(
  state: GameState,
  complexity: number,
  content: ContentBundle,
): GameState {
  const status = checkSchuldenbremse(state, complexity);
  if (status === 'inaktiv') return state;

  const haushalt = state.haushalt;
  if (!haushalt) return state;

  const chars = state.chars.map((c) => ({ ...c }));
  const lehmann = chars.find((c) => c.id === 'fm');
  if (!lehmann) return state;

  let newState = state;
  const verbandsBeziehungen = { ...(state.verbandsBeziehungen ?? {}) };

  if (status === 'ausgeglichen') {
    lehmann.mood = Math.min(4, lehmann.mood + 0.1);
  } else if (status === 'verletzt_mild') {
    lehmann.mood = Math.max(0, lehmann.mood - 1);
    verbandsBeziehungen['bdi'] = Math.max(0, (verbandsBeziehungen['bdi'] ?? 50) - 5);
  } else if (status === 'verletzt_stark') {
    newState = { ...newState, lehmannUltimatumBeschleunigt: true };
    verbandsBeziehungen['bdi'] = Math.max(0, (verbandsBeziehungen['bdi'] ?? 50) - 10);
    if (!state.firedEvents.includes('schuldenbremse_verletzt')) {
      const event = [...(content.events ?? []), ...Object.values(content.charEvents ?? {})].find(
        (e) => e.id === 'schuldenbremse_verletzt',
      );
      if (event) {
        newState = {
          ...newState,
          activeEvent: event,
          firedEvents: [...state.firedEvents, 'schuldenbremse_verletzt'],
          speed: 0,
        };
      } else {
        newState = {
          ...newState,
          firedEvents: [...state.firedEvents, 'schuldenbremse_verletzt'],
        };
      }
    }
  }

  return {
    ...newState,
    chars,
    verbandsBeziehungen,
  };
}

/** Lehmann-Sparvorschlag bei Saldo < -15 Mrd. */
export function checkLehmannSparvorschlag(state: GameState, complexity: number): GameState {
  const haushalt = state.haushalt;
  if (!haushalt || state.lehmannSparvorschlagAktiv || state.aktiveMinisterialInitiative) {
    return state;
  }
  if (!featureActive(complexity, 'schuldenbremse')) return state;

  if (haushalt.saldo < -15) {
    return {
      ...state,
      lehmannSparvorschlagAktiv: true,
      aktiveMinisterialInitiative: {
        initId: 'fm_sparpaket',
        charId: 'fm',
        gesetzId: 'sparpaket_intern',
      },
    };
  }
  return state;
}

/** Triggert Haushaltsdebatte in Monat 10/22/34 (Oktober) */
export function triggerHaushaltsdebatte(
  state: GameState,
  complexity: number,
  politikfelder: { id: string }[],
): GameState {
  if (!featureActive(complexity, 'haushaltsdebatte')) return state;
  if (state.aktivesStrukturEvent) return state;

  const monatInJahr = ((state.month - 1) % 12) + 1;
  if (monatInJahr !== 10) return state;

  const haushalt = state.haushalt;
  const saldo = haushalt?.saldo ?? 0;
  const ausgangslage: 'ueberschuss' | 'ausgeglichen' | 'defizit' =
    saldo > 5 ? 'ueberschuss' : saldo > -5 ? 'ausgeglichen' : 'defizit';

  return {
    ...state,
    speed: 0,
    aktivesStrukturEvent: {
      type: 'haushaltsdebatte',
      ausgangslage,
      phase: 1,
      verfuegbarePrioritaeten: politikfelder.map((f) => f.id),
      gewaehlePrioritaeten: [],
    },
  };
}

/** Phase 2: Prioritäten setzen (2 Politikfelder) */
export function setHaushaltsdebattePrioritaeten(
  state: GameState,
  feldIds: string[],
): GameState {
  const ev = state.aktivesStrukturEvent;
  if (!ev || ev.type !== 'haushaltsdebatte' || ev.phase !== 2) return state;
  if (feldIds.length !== 2) return state;

  const valid = feldIds.every((id) => ev.verfuegbarePrioritaeten.includes(id));
  if (!valid) return state;

  return {
    ...state,
    aktivesStrukturEvent: { ...ev, gewaehlePrioritaeten: feldIds },
  };
}

/** Nächste Phase der Haushaltsdebatte */
export function advanceHaushaltsdebattePhase(state: GameState): GameState {
  const ev = state.aktivesStrukturEvent;
  if (!ev || ev.type !== 'haushaltsdebatte') return state;

  if (ev.phase < 4) {
    return {
      ...state,
      aktivesStrukturEvent: { ...ev, phase: (ev.phase + 1) as 1 | 2 | 3 | 4 },
    };
  }
  return state;
}

/** Haushaltsdebatte abschließen: Plan beschlossen, +10 Mrd. pro Priorität */
export function schliessenHaushaltsdebatte(state: GameState): GameState {
  const ev = state.aktivesStrukturEvent;
  if (!ev || ev.type !== 'haushaltsdebatte') return state;

  const haushalt = state.haushalt;
  if (!haushalt) {
    return {
      ...state,
      aktivesStrukturEvent: null,
      speed: 1,
    };
  }

  const mehrausgaben = ev.gewaehlePrioritaeten.length * 10;
  const neuerHaushalt: Haushalt = {
    ...haushalt,
    laufendeAusgaben: haushalt.laufendeAusgaben + mehrausgaben,
    saldo: haushalt.einnahmen - haushalt.pflichtausgaben - (haushalt.laufendeAusgaben + mehrausgaben),
    haushaltsplanBeschlossen: true,
    planPrioritaeten: ev.gewaehlePrioritaeten,
  };

  return {
    ...state,
    haushalt: neuerHaushalt,
    aktivesStrukturEvent: null,
    speed: 1,
  };
}

/** Aktualisiert jährlich Pflichtausgaben (bei AL-Änderung) */
export function updateHaushaltPflichtausgaben(state: GameState): GameState {
  const haushalt = state.haushalt;
  if (!haushalt) return state;

  if (state.month % 12 === 0) {
    const pflichtausgaben = berechnePflichtausgaben(state);
    const spielraum = haushalt.einnahmen - pflichtausgaben;
    const saldo = spielraum - haushalt.laufendeAusgaben;
    return {
      ...state,
      haushalt: {
        ...haushalt,
        pflichtausgaben,
        spielraum,
        saldo,
      },
    };
  }
  return state;
}
