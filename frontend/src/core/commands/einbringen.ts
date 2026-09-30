/**
 * Core-Commands für das Einbringen von Gesetzen.
 *
 * Kapselt die gesamte Einbringen-Logik (Gegenfinanzierung, Framing,
 * Partner-Widerstand) ohne UI-Abhängigkeiten. Sowohl der gameStore als
 * auch die Balance-Simulation nutzen dieselben Commands — divergente
 * Codepfade zwischen Browser und Simulation werden damit vermieden.
 */

import type { GameState, ContentBundle, Ideologie, Law } from '../types';
import type { GegenfinanzierungsOption } from '../systems/economics/gegenfinanzierung';
import {
  einbringen,
  isVerfassungsgerichtBlockiert,
  type EinbringenContext,
} from '../systems/parliament/parliament';
import {
  pruefePartnerWiderstand,
  type PartnerWiderstandErgebnis,
} from '../systems/parliament/ideologiePartner';
import { kannGesetzEingebracht } from '../gesetz';
import {
  brauchtGegenfinanzierung,
  berechneOptionen,
  gegenfinanzierungsBedarf,
  wendeGegenfinanzierungAn,
} from '../systems/economics/gegenfinanzierung';
import { applyKongruenzEffekte, getEinbringenPkKosten } from '../systems/parliament/kongruenz';
import { getMedienPkZusatzkosten } from '../systems/medien/medienAkteure';
import { getVorstufenBoni } from '../systems/legislation/gesetzLebenszyklus';
import { featureActive } from '../systems/features';
import { koalitionsrunde } from '../systems/koalition';

/** Toast-Feedback für Store-Aktionen — keine direkten UI-Importe in der Command-Schicht */
export type CommandEffect =
  | { type: 'toast'; message: string; variant: 'success' | 'info' | 'warning' | 'danger' }
  | { type: 'none' };

/**
 * PK-Kosten fürs Einbringen (Kongruenz, Vorstufen-Rabatt, Medienklima) — dieselbe Formel
 * wie `einbringen` in parliament.ts für den Aufruf mit Kontext.
 */
export function einbringenPkKosten(
  state: GameState,
  lawId: string,
  ausrichtung: Ideologie,
  complexity: number,
): number {
  const rabatt =
    featureActive(complexity, 'kommunal_pilot') || featureActive(complexity, 'laender_pilot')
      ? getVorstufenBoni(state, lawId).pkKostenRabatt
      : 0;
  const kongruenzEffekt = applyKongruenzEffekte(state, lawId, ausrichtung, complexity);
  const medienZusatz = featureActive(complexity, 'medienklima')
    ? getMedienPkZusatzkosten(state.medienKlima ?? 55)
    : 0;
  return Math.max(
    2,
    getEinbringenPkKosten(kongruenzEffekt.pkModifikator) - rabatt + medienZusatz,
  );
}

function pkZuWenig(benoetigt: number, vorhanden: number): CommandEffect {
  return {
    type: 'toast',
    message: `Nicht genug PK (${benoetigt} benötigt, ${vorhanden} vorhanden).`,
    variant: 'warning',
  };
}

/** Berechnet pendingGegenfinanzierung-State ohne Toast/Store-Zugriff */
function buildPendingGFState(
  state: GameState,
  lawId: string,
  ausrichtung: Ideologie,
  complexity: number,
  content: ContentBundle,
  opts?: {
    framingKey?: string | null;
    partnerWiderstandConfirmed?: boolean;
    partnerWiderstandKoalitionsMalus?: number;
  },
): GameState {
  const law = state.gesetze.find((g) => g.id === lawId);
  if (!law) return state;

  const optionen = berechneOptionen(state, law, content, complexity);
  const kosten = gegenfinanzierungsBedarf(law);
  const pkKosten = einbringenPkKosten(state, lawId, ausrichtung, complexity);

  return {
    ...state,
    pendingGegenfinanzierung: {
      gesetzId: lawId,
      optionen,
      kosten,
      pkKosten,
      ...(opts?.framingKey != null ? { framingKey: opts.framingKey } : {}),
      ...(opts?.partnerWiderstandConfirmed ? { partnerWiderstandConfirmed: true } : {}),
      ...(opts?.partnerWiderstandKoalitionsMalus !== undefined
        ? { partnerWiderstandKoalitionsMalus: opts.partnerWiderstandKoalitionsMalus }
        : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// EINBRINGEN
// ---------------------------------------------------------------------------

export interface EinbringenCommandInput {
  lawId: string;
  ausrichtung: Ideologie;
  complexity: number;
  content: ContentBundle;
  framingKey?: string | null;
  skipPartnerWiderstandCheck?: boolean;
  partnerWiderstandKoalitionsMalus?: number;
  fromPartnerWiderstandConfirm?: boolean;
}

export interface EinbringenResult {
  state: GameState;
  effect: CommandEffect;
}

/**
 * Offener Partner-Widerstand vor dem Einbringen (Stufe 3+) — null, wenn keiner besteht
 * oder eine Koalitionsrunde das Gesetz bereits freigegeben hat.
 */
function offenerPartnerWiderstand(
  state: GameState,
  law: Law,
  complexity: number,
): PartnerWiderstandErgebnis | null {
  if (!featureActive(complexity, 'koalitionspartner') || !featureActive(complexity, 'partner_widerstand')) {
    return null;
  }
  const partnerId = state.koalitionspartner?.id;
  if (!partnerId || state.partnerWiderstandVetoFreigabeGesetzId === law.id) return null;
  return pruefePartnerWiderstand(law, partnerId, complexity, { vetoErlaubt: complexity >= 4 });
}

/**
 * Bringt ein Gesetz ein — prüft Partner-Widerstand, Gegenfinanzierungspflicht und Framing
 * ohne Toast-Aufrufe oder Store-Zugriff.
 *
 * Reihenfolge: PK → Partner-Widerstand → Gegenfinanzierung → Einbringen. Die Gegenfinanzierung
 * kommt bewusst zuletzt: Sie wird sofort angewandt (Kürzung, Schulden, …); stünde der
 * Partner-Dialog danach, zahlte der Spieler bei „Abbrechen“ für ein nicht eingebrachtes Gesetz
 * und bei „Trotzdem“ ein zweites Mal.
 *
 * Mögliche Outcomes:
 * - `state.pendingPartnerWiderstand` gesetzt → Partner-Modal anzeigen
 * - `state.pendingGegenfinanzierung` gesetzt → GF-Modal anzeigen
 * - `effect.type === 'toast'` (success) → Gesetz eingebracht, Store zeigt den Toast
 * - `effect.type === 'toast'` (warning) → PK reicht nicht
 * - `effect.type === 'none'` ohne pending-State → Einbringen blockiert/noop
 */
export function einbringenCommand(
  state: GameState,
  input: EinbringenCommandInput,
): EinbringenResult {
  const {
    lawId,
    ausrichtung,
    complexity,
    content,
    framingKey,
    skipPartnerWiderstandCheck,
    partnerWiderstandKoalitionsMalus,
    fromPartnerWiderstandConfirm,
  } = input;

  const law = state.gesetze.find((g) => g.id === lawId);
  if (law && law.status === 'entwurf') {
    if (
      !kannGesetzEingebracht(state, lawId, content.gesetzRelationen) ||
      isVerfassungsgerichtBlockiert(state, law)
    ) {
      return { state, effect: { type: 'none' } };
    }
    const pkKosten = einbringenPkKosten(state, lawId, ausrichtung, complexity);
    if (state.pk < pkKosten) {
      return { state, effect: pkZuWenig(pkKosten, state.pk) };
    }
    if (!skipPartnerWiderstandCheck) {
      const widerstand = offenerPartnerWiderstand(state, law, complexity);
      if (widerstand) {
        return {
          state: {
            ...state,
            pendingPartnerWiderstand: {
              lawId,
              framingKey: framingKey ?? null,
              intensitaet: widerstand.intensitaet,
              koalitionsMalus: widerstand.intensitaet === 'veto' ? 0 : widerstand.koalitionsMalus,
              partnerId: widerstand.partnerId,
            },
          },
          effect: { type: 'none' },
        };
      }
    }
    if (featureActive(complexity, 'gegenfinanzierung') && brauchtGegenfinanzierung(law)) {
      return {
        state: buildPendingGFState(state, lawId, ausrichtung, complexity, content, {
          framingKey,
          partnerWiderstandConfirmed: skipPartnerWiderstandCheck === true,
          partnerWiderstandKoalitionsMalus,
        }),
        effect: { type: 'none' },
      };
    }
  }

  const ctx: EinbringenContext = {
    ausrichtung,
    complexity,
    framingKey: framingKey ?? undefined,
    gesetzRelationen: content.gesetzRelationen,
    content,
    skipPartnerWiderstandCheck,
    partnerWiderstandKoalitionsMalus,
    fromPartnerWiderstandConfirm,
  };
  const nextState = einbringen(state, lawId, ctx);
  const newLaw = nextState.gesetze.find((g) => g.id === lawId);
  if (newLaw && newLaw.status !== 'entwurf') {
    const pkUsed = state.pk - nextState.pk;
    return {
      state: nextState,
      effect: { type: 'toast', message: `${newLaw.kurz} eingebracht (−${pkUsed} PK)`, variant: 'success' },
    };
  }
  return { state: nextState, effect: { type: 'none' } };
}

// ---------------------------------------------------------------------------
// GEGENFINANZIERUNG AUSWAEHLEN
// ---------------------------------------------------------------------------

export interface GegenfinanzierungAuswaehlenInput {
  gesetzId: string;
  option: GegenfinanzierungsOption;
  subOption?: string;
  ausrichtung: Ideologie;
  complexity: number;
  content: ContentBundle;
}

/**
 * Verarbeitet die gewählte Gegenfinanzierungsoption und bringt das Gesetz danach ein.
 * Reicht das PK fürs Einbringen nicht (mehr), wird nichts angewandt — sonst trüge der
 * Spieler Kürzung/Schulden für ein Gesetz, das im Entwurf bleibt.
 */
export function gegenfinanzierungAuswaehlenCommand(
  state: GameState,
  input: GegenfinanzierungAuswaehlenInput,
): { state: GameState; effect: CommandEffect } {
  const { gesetzId, option, subOption, ausrichtung, complexity, content } = input;
  const { pendingGegenfinanzierung } = state;
  if (!pendingGegenfinanzierung || pendingGegenfinanzierung.gesetzId !== gesetzId) {
    return { state, effect: { type: 'none' } };
  }

  const law = state.gesetze.find((g) => g.id === gesetzId);
  if (!law) return { state, effect: { type: 'none' } };

  const pkKosten = einbringenPkKosten(state, gesetzId, ausrichtung, complexity);
  if (state.pk < pkKosten) {
    return { state: { ...state, pendingGegenfinanzierung: undefined }, effect: pkZuWenig(pkKosten, state.pk) };
  }

  const ctx: EinbringenContext = {
    ausrichtung,
    complexity,
    framingKey: pendingGegenfinanzierung.framingKey,
    gesetzRelationen: content.gesetzRelationen,
    content,
    skipPartnerWiderstandCheck: pendingGegenfinanzierung.partnerWiderstandConfirmed === true,
    partnerWiderstandKoalitionsMalus: pendingGegenfinanzierung.partnerWiderstandKoalitionsMalus,
    fromPartnerWiderstandConfirm: pendingGegenfinanzierung.partnerWiderstandConfirmed === true,
  };

  let s = wendeGegenfinanzierungAn(state, law, option, subOption, complexity, content);
  s = { ...s, pendingGegenfinanzierung: undefined };
  s = einbringen(s, gesetzId, ctx);
  const newLaw = s.gesetze.find((g) => g.id === gesetzId);
  if (newLaw && newLaw.status !== 'entwurf') {
    return {
      state: s,
      effect: {
        type: 'toast',
        message: `${newLaw.kurz} eingebracht (−${state.pk - s.pk} PK)`,
        variant: 'success',
      },
    };
  }
  return { state: s, effect: { type: 'none' } };
}

// ---------------------------------------------------------------------------
// PARTNER WIDERSTAND — TROTZDEM (hinweis / widerstand)
// ---------------------------------------------------------------------------

export interface PartnerWiderstandTrotzdemResult {
  state: GameState;
  effect: CommandEffect;
}

/**
 * Bringt ein Gesetz trotz Partner-Widerstand (nicht Veto) ein — mit Koalitions-Malus.
 * Leitet ggf. zur Gegenfinanzierungsauswahl weiter (der Malus wird erst beim Einbringen fällig).
 */
export function partnerWiderstandTrotzdemCommand(
  state: GameState,
  input: { ausrichtung: Ideologie; complexity: number; content: ContentBundle },
): PartnerWiderstandTrotzdemResult {
  const { ausrichtung, complexity, content } = input;
  const p = state.pendingPartnerWiderstand;
  if (!p || p.intensitaet === 'veto') return { state, effect: { type: 'none' } };

  return einbringenCommand(
    { ...state, pendingPartnerWiderstand: undefined },
    {
      lawId: p.lawId,
      ausrichtung,
      complexity,
      content,
      framingKey: p.framingKey,
      skipPartnerWiderstandCheck: true,
      partnerWiderstandKoalitionsMalus: p.koalitionsMalus,
      fromPartnerWiderstandConfirm: true,
    },
  );
}

// ---------------------------------------------------------------------------
// PARTNER WIDERSTAND — KOALITIONSVERHANDLUNG (Widerstand / Veto)
// ---------------------------------------------------------------------------

export interface PartnerWiderstandKoalitionsverhandlungResult {
  state: GameState;
  effect: CommandEffect;
}

/**
 * Räumt Partner-Widerstand oder ein Veto durch eine Koalitionsrunde (15 PK, Beziehung +8)
 * aus und bringt das Gesetz danach ohne Koalitions-Malus ein (bzw. öffnet die
 * Gegenfinanzierung). Bei Widerstand ist das die Alternative zu „Trotzdem“ (−15), beim Veto
 * der einzige Weg — ein Veto ist damit nie günstiger als Widerstand.
 */
export function partnerWiderstandKoalitionsverhandlungCommand(
  state: GameState,
  input: { ausrichtung: Ideologie; complexity: number; content: ContentBundle },
): PartnerWiderstandKoalitionsverhandlungResult {
  const { ausrichtung, complexity, content } = input;
  const p = state.pendingPartnerWiderstand;
  if (!p || p.intensitaet === 'hinweis') return { state, effect: { type: 'none' } };

  if (state.pk < 15) {
    return {
      state,
      effect: {
        type: 'toast',
        message: 'Nicht genug PK (15 für Koalitionsrunde).',
        variant: 'warning',
      },
    };
  }

  let s = koalitionsrunde(state, content, complexity);
  if (s.pk === state.pk) return { state, effect: { type: 'none' } };

  s = {
    ...s,
    partnerWiderstandVetoFreigabeGesetzId: p.lawId,
    pendingPartnerWiderstand: undefined,
  };

  const weiter = einbringenCommand(s, {
    lawId: p.lawId,
    ausrichtung,
    complexity,
    content,
    framingKey: p.framingKey,
  });
  if (weiter.effect.type === 'toast' && weiter.effect.variant === 'success') {
    return {
      state: weiter.state,
      effect: { ...weiter.effect, message: `Koalitionsrunde abgehalten — ${weiter.effect.message}` },
    };
  }
  if (weiter.state.pendingGegenfinanzierung) return { state: weiter.state, effect: { type: 'none' } };
  return {
    state: weiter.state,
    effect: {
      type: 'toast',
      message: 'Koalitionsrunde abgehalten — das Gesetz ist freigegeben, sobald das PK reicht.',
      variant: 'info',
    },
  };
}
