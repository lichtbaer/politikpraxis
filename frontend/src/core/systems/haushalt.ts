import type { GameState, ContentBundle, Haushalt, SchuldenbremsenStatus } from '../types';
import {
  EINNAHMEN_BASIS,
  SCHULDENBREMSE_SPIELRAUM_BASIS,
  SCHULDENBREMSE_VERBRAUCH_GRENZWERTIG_BIS,
  KONJUNKTUR_INDEX_MIN, KONJUNKTUR_INDEX_MAX,
  clamp,
} from '../constants';
import { berechneEinnahmen, berechnePflichtausgaben } from './haushaltBerechnung';
import { featureActive } from './features';
import { scheduleSektorEffekteFromGesetz } from './wirtschaft';
import { withPause, getAutoPauseLevel } from '../eventPause';
import { applyMedienHaushaltKrise } from './medienklima';
import { nextRandom } from '../rng';

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
    schuldenbremseSpielraum: SCHULDENBREMSE_SPIELRAUM_BASIS,
    einnahmen_basis: EINNAHMEN_BASIS,
  };
}

export { berechneEinnahmen, berechnePflichtausgaben } from './haushaltBerechnung';

/** Wendet Gesetz-Kosten bei Beschluss an */
export function applyGesetzKosten(state: GameState, gesetzId: string): GameState {
  const haushalt = state.haushalt;
  if (!haushalt) return state;

  const gesetz = state.gesetze.find((g) => g.id === gesetzId);
  if (!gesetz) return state;

  const kostenEinmalig = gesetz.kosten_einmalig ?? 0;
  const kostenLaufend = gesetz.kosten_laufend ?? 0;
  const einnahmeEffekt = gesetz.einnahmeeffekt ?? 0;
  const pflichtausgabenDelta = gesetz.pflichtausgaben_delta ?? 0;

  const einnahmeProz = einnahmeEffekt / EINNAHMEN_BASIS;
  const neuerSteuerpolitikModifikator = haushalt.steuerpolitikModifikator + einnahmeProz;

  // SMA-310: pflichtausgaben_delta sofort anwenden (negativ = Kürzung)
  const neuePflichtausgaben = haushalt.pflichtausgaben + pflichtausgabenDelta;
  const neueLaufendeAusgaben = haushalt.laufendeAusgaben + kostenLaufend;
  const spielraum = haushalt.einnahmen - neuePflichtausgaben;
  const saldo = spielraum - neueLaufendeAusgaben;

  // SMA-309: Schuldenbremse-Reform löst Lehmann-Ultimatum aus
  let newState = state;
  if (gesetzId === 'schuldenbremse_reform') {
    newState = { ...newState, lehmannUltimatumBeschleunigt: true };
  }

  // SMA-335: Monat des Beschlusses für Konjunktur-Lag
  const gesetzBeschlossenMonat = { ...(state.gesetzBeschlossenMonat ?? {}), [gesetzId]: state.month };
  newState = { ...newState, gesetzBeschlossenMonat };

  const neuerHaushalt: Haushalt = {
    ...haushalt,
    pflichtausgaben: neuePflichtausgaben,
    saldoKumulativ: haushalt.saldoKumulativ - kostenEinmalig,
    laufendeAusgaben: neueLaufendeAusgaben,
    steuerpolitikModifikator: neuerSteuerpolitikModifikator,
    spielraum,
    saldo,
  };

  const out: GameState = { ...newState, haushalt: neuerHaushalt };
  return scheduleSektorEffekteFromGesetz(out, gesetzId);
}

/** SMA-335: Wendet Konjunktur-Effekte aus beschlossenen Steuergesetzen an (mit Lag) */
function applyKonjunkturEffekteAusGesetzen(state: GameState): GameState {
  const haushalt = state.haushalt;
  if (!haushalt) return state;

  const beschlossenMonat = state.gesetzBeschlossenMonat ?? {};
  const bereitsAngewendet = state.konjunkturBereitsAngewendet ?? {};
  let konjunkturDelta = 0;

  for (const g of state.gesetze) {
    if (g.status !== 'beschlossen') continue;
    const lag = g.konjunktur_lag ?? 0;
    const effekt = g.konjunktur_effekt ?? 0;
    if (lag <= 0 || effekt === 0 || bereitsAngewendet[g.id]) continue;

    const monat = beschlossenMonat[g.id];
    if (monat == null || state.month < monat + lag) continue;

    konjunkturDelta += effekt;
  }

  if (konjunkturDelta === 0) return state;

  const neueKonjunktur = clamp(haushalt.konjunkturIndex + konjunkturDelta, KONJUNKTUR_INDEX_MIN, KONJUNKTUR_INDEX_MAX);
  const neuerHaushalt = { ...haushalt, konjunkturIndex: neueKonjunktur };

  const neueBereitsAngewendet = { ...bereitsAngewendet };
  for (const g of state.gesetze) {
    if (g.status !== 'beschlossen') continue;
    const lag = g.konjunktur_lag ?? 0;
    const effekt = g.konjunktur_effekt ?? 0;
    if (lag <= 0 || effekt === 0 || bereitsAngewendet[g.id]) continue;
    const monat = beschlossenMonat[g.id];
    if (monat != null && state.month >= monat + lag) {
      neueBereitsAngewendet[g.id] = true;
    }
  }

  return {
    ...state,
    haushalt: neuerHaushalt,
    konjunkturBereitsAngewendet: neueBereitsAngewendet,
  };
}

/** Konjunkturindex-Drift (monatlich), jährliche Einnahmen-Neuberechnung */
export function tickKonjunktur(state: GameState, complexity: number): GameState {
  let s = state;
  const haushalt = s.haushalt;
  if (!haushalt) return s;

  // SMA-335: Konjunktur-Effekte aus beschlossenen Steuergesetzen (mit Lag)
  s = applyKonjunkturEffekteAusGesetzen(s);
  const haushaltNachKonjunktur = s.haushalt!;

  let neuerHaushalt = { ...haushaltNachKonjunktur };

  // SMA-404: Bei Wirtschaftssektoren kommt der Konjunkturindex aus BIP (tickWirtschaft), kein Zufalls-Drift
  if (
    featureActive(complexity, 'konjunkturindex') &&
    !featureActive(complexity, 'wirtschaftssektoren')
  ) {
    const drift = (nextRandom() - 0.5) * 0.6; // SMA-309: ±0.3 statt ±0.2
    neuerHaushalt = {
      ...neuerHaushalt,
      konjunkturIndex: clamp(haushaltNachKonjunktur.konjunkturIndex + drift, KONJUNKTUR_INDEX_MIN, KONJUNKTUR_INDEX_MAX),
    };
  }

  // Jährliche Neuberechnung: Monat 12, 24, 36, 48 (1-indiziert → modulo auf month-1)
  // SMA-404: bei Wirtschaftssektoren übernimmt tickWirtschaft Einnahmen/Saldo + Kumulativ
  if (
    featureActive(complexity, 'wirtschaftssektoren') &&
    s.month > 1 &&
    (s.month - 1) % 12 === 0
  ) {
    return { ...s, haushalt: neuerHaushalt };
  }
  if (s.month > 1 && (s.month - 1) % 12 === 0) {
    const pflichtausgaben = berechnePflichtausgaben(s);
    const einnahmen = berechneEinnahmen({ ...s, haushalt: neuerHaushalt });
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

  return { ...s, haushalt: neuerHaushalt };
}

/**
 * Schuldenbremse-Verbrauch in Mrd. — eine gemeinsame Definition für UI und Regeln (SMA-397).
 * Entsteht nur durch explizite Schuldenaufnahme (Gegenfinanzierung etc.), nicht durch das strukturelle Startdefizit.
 */
export function berechneSchuldenbremseVerbrauchtMrd(haushalt: Haushalt): number {
  const erlaubt = SCHULDENBREMSE_SPIELRAUM_BASIS;
  const spielraumRest = haushalt.schuldenbremseSpielraum ?? erlaubt;
  return Math.max(0, erlaubt - spielraumRest);
}

/** Schuldenbremsen-Status — ausschließlich aus Schuldenbremse-Verbrauch (kein zweites Saldo-System) */
export function checkSchuldenbremse(state: GameState, complexity: number): SchuldenbremsenStatus {
  if (!featureActive(complexity, 'schuldenbremse')) return 'inaktiv';
  const haushalt = state.haushalt;
  if (!haushalt) return 'inaktiv';

  const erlaubt = SCHULDENBREMSE_SPIELRAUM_BASIS;
  const verbraucht = berechneSchuldenbremseVerbrauchtMrd(haushalt);

  if (verbraucht <= 0) return 'ausgeglichen';
  if (verbraucht <= SCHULDENBREMSE_VERBRAUCH_GRENZWERTIG_BIS) return 'grenzwertig';
  if (verbraucht < erlaubt) return 'verletzt_mild';
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
  // SMA-328: Lehmann = CDP Finanzminister (ressort+pool)
  const lehmann = chars.find((c) => (c.ressort === 'finanzen' && c.pool_partei === 'cdp') || c.id === 'fm');
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
          ...withPause(newState, getAutoPauseLevel(event)),
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
    const lehmann = state.chars.find((c) => (c.ressort === 'finanzen' && c.pool_partei === 'cdp') || c.id === 'fm');
    const charId = lehmann?.id ?? 'fm';
    return {
      ...state,
      lehmannSparvorschlagAktiv: true,
      aktiveMinisterialInitiative: {
        initId: 'fm_sparpaket',
        charId,
        gesetzId: 'sparpaket_intern',
      },
    };
  }
  return state;
}

/** SMA-310: Lehmann-Defizit-Startmemo in Monat 1 (auto_pause) */
export function checkLehmannDefizitStart(
  state: GameState,
  content: { charEvents?: Record<string, import('../types').GameEvent> },
  complexity: number,
): GameState {
  if (state.activeEvent) return state;
  if (state.month !== 1) return state;
  if (state.firedEvents.includes('lehmann_defizit_start')) return state;
  if (complexity < 2) return state;

  const ev = content.charEvents?.['lehmann_defizit_start'];
  if (!ev) return state;

  return {
    ...state,
    firedEvents: [...state.firedEvents, 'lehmann_defizit_start'],
    activeEvent: ev,
    ...withPause(state, getAutoPauseLevel(ev)),
  };
}

/** SMA-310: Haushaltskrise-Event bei Saldo < -30 (erzwungen) */
export function checkHaushaltskrise(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  if (state.activeEvent) return state;
  const haushalt = state.haushalt;
  if (!haushalt || haushalt.saldo >= -30) return state;
  if (state.firedEvents.includes('haushaltskrise')) return state;
  if (complexity < 2) return state;

  const ev = content.charEvents?.['haushaltskrise'];
  if (!ev) return state;

  const s = applyMedienHaushaltKrise(state, complexity, content);
  return {
    ...s,
    firedEvents: [...s.firedEvents, 'haushaltskrise'],
    activeEvent: ev,
    ...withPause(s, getAutoPauseLevel(ev)),
  };
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
    ...withPause(state),
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

/** SMA-323: Steuerquote-Regler — +2 oder -3 Mrd./Jahr, 1× pro Jahr, 15 PK. Verbands-Effekte: BdI, GBD. */
export function applySteuerquoteChange(
  state: GameState,
  deltaMrd: number,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'steuerquote')) return state;
  const haushalt = state.haushalt;
  if (!haushalt || state.pk < 15) return state;

  const currentJahr = Math.floor((state.month - 1) / 12) + 1;
  if (state.steuerquoteAktionJahr === currentJahr) return state;

  const deltaMod = deltaMrd / EINNAHMEN_BASIS;
  const neuerMod = Math.max(0.85, Math.min(1.15, haushalt.steuerpolitikModifikator + deltaMod));
  const neueEinnahmen = Math.round(
    haushalt.einnahmen * (neuerMod / haushalt.steuerpolitikModifikator),
  );
  const spielraum = neueEinnahmen - haushalt.pflichtausgaben;
  const saldo = spielraum - haushalt.laufendeAusgaben;

  const verbandsBeziehungen = { ...(state.verbandsBeziehungen ?? {}) };
  if (deltaMrd > 0) {
    verbandsBeziehungen['bdi'] = Math.max(0, Math.min(100, (verbandsBeziehungen['bdi'] ?? 50) - 8));
    verbandsBeziehungen['gbd'] = Math.max(0, Math.min(100, (verbandsBeziehungen['gbd'] ?? 50) + 5));
  } else {
    verbandsBeziehungen['bdi'] = Math.max(0, Math.min(100, (verbandsBeziehungen['bdi'] ?? 50) + 8));
    verbandsBeziehungen['gbd'] = Math.max(0, Math.min(100, (verbandsBeziehungen['gbd'] ?? 50) - 8));
  }

  return {
    ...state,
    pk: state.pk - 15,
    steuerquoteAktionJahr: currentJahr,
    verbandsBeziehungen,
    haushalt: {
      ...haushalt,
      steuerpolitikModifikator: neuerMod,
      einnahmen: neueEinnahmen,
      spielraum,
      saldo,
    },
  };
}

/** Aktualisiert jährlich Pflichtausgaben (bei AL-Änderung) */
export function updateHaushaltPflichtausgaben(state: GameState): GameState {
  const haushalt = state.haushalt;
  if (!haushalt) return state;

  // Jährliche Neuberechnung: Jahreswechsel bei 1-indizierten Monaten
  if (state.month > 1 && (state.month - 1) % 12 === 0) {
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
